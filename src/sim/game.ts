// src/sim/game.ts — OWNER: LEAD. Game creation, fixed step, phase machine (§6.7, §7.10, HENPOCALYPSE §5).
import type { Banner, DebugFlags, Difficulty, GameMode, GameState, InputFrame, Loadout, Phase, Vec2 } from './types';
import { clamp } from './math';
import { emit } from './events';
import { emptyWaveRuntime } from './waves.types';
import { createPlayer, updatePlayer } from './player';
import { updateWeapons } from './weapons';
import { updateMissile } from './missile';
import { updateProjectiles } from './projectiles';
import { updateEnemies } from './enemies';
import { isWaveComplete, startWave, updateWaveSpawner } from './waves';
import { currentWaveInfo, finalChapter, wavesInChapter } from './modes';
import { computeMods, DEFAULT_LOADOUT } from './mods';
import { enemyTimeScale, updateCombo, updatePowerups } from './powerups';
import { applyDraftChoice, openDraft } from './draft';
import { MAX_SHIELD } from './tuning/loadout';
import { updatePickups } from './pickups';
import { resolveCollisions } from './collisions';
import { addScore, computeChapterBonus, emptyStats } from './scoring';
import {
  EXTRA_LIFE_EVERY, PHASE_TIME, SHIP_MAX_X, SHIP_MAX_Y, SHIP_MIN_X, SHIP_MIN_Y, WAVES_PER_CHAPTER,
} from './tuning/core';

export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
  startChapter?: number;
  startWave?: number;
  debug?: Partial<DebugFlags>;
  mode?: GameMode;          // default 'campaign'
  loadout?: Loadout;        // default DEFAULT_LOADOUT (falcon, no upgrades, no mutators)
}

export const NEUTRAL_INPUT: InputFrame = Object.freeze({
  moveX: 0, moveY: 0, pointer: null, fire: false, missile: false, skip: false, overdrive: false,
});

const BANNER_TTL = {
  chapterStart: 2.5,
  wave: 2.0,
  boss: 3.0,
  waveCleared: 1.2,
  warp: 2.5,
  final: 999,
} as const;

const FIRE_PHASES: readonly Phase[] = ['wave_intro', 'boss_intro', 'wave_active', 'wave_clear'];

/** Summing DT drifts below exact multiples (120 × 1/60 < 2.0); this keeps phase lengths exact in ticks. */
const PHASE_EPS = 1e-6;

function after(t: number, seconds: number): boolean {
  return t >= seconds - PHASE_EPS;
}

export function createGame(opts: NewGameOptions): GameState {
  const loadout: Loadout = cloneLoadout(opts.loadout ?? DEFAULT_LOADOUT);
  const state: GameState = {
    seed: opts.seed >>> 0,
    tick: 0,
    time: 0,
    rng: { s: opts.seed >>> 0 },
    difficulty: opts.difficulty,
    endless: false,
    phase: 'wave_intro',
    phaseTimer: 0,
    chapter: Math.max(1, Math.floor(opts.startChapter ?? 1)),
    wave: Math.min(WAVES_PER_CHAPTER, Math.max(1, Math.floor(opts.startWave ?? 1))),
    chapterName: '',
    waveName: '',
    bossName: null,
    bossThresholds: [],
    score: 0,
    nextExtraLifeAt: EXTRA_LIFE_EVERY,
    player: createPlayer(opts.difficulty, loadout),
    enemies: [],
    projectiles: [],
    pickups: [],
    hazards: [],
    waveRt: emptyWaveRuntime(),
    banner: null,
    lastChapterBonus: null,
    chapterStats: emptyStats(),
    runStats: emptyStats(),
    events: [],
    nextId: 1,
    debug: { godMode: false, showHitboxes: false, infiniteMissiles: false, ...opts.debug },
    mode: opts.mode ?? 'campaign',
    loadout,
    mods: computeMods(loadout, {}),
    perks: {},
    draft: null,
    combo: { count: 0, timer: 0, mult: 1, best: 0 },
    corn: 0,
    waveCount: 0,
  };
  beginWave(state);
  return state;
}

function cloneLoadout(l: Loadout): Loadout {
  return { ship: l.ship, upgrades: { ...l.upgrades }, mutators: l.mutators.slice() };
}

export function step(state: GameState, input: InputFrame, dt: number): void {
  state.events.length = 0;
  state.tick += 1;
  state.time += dt;
  state.phaseTimer += dt;
  updatePhase(state, input, dt);            // A1 — §7.10
  updatePlayer(state, input, dt);           // A2
  updateWeapons(state, input, dt);          // A2
  updateMissile(state, input, dt);          // A2
  updatePowerups(state, input, dt, canFire(state)); // LEAD: power-up timers, fury → overdrive
  if (state.phase === 'wave_active') updateCombo(state, dt); // combos survive between waves
  const edt = dt * enemyTimeScale(state);   // time warp slows the whole armada
  if (state.phase === 'wave_intro' || state.phase === 'boss_intro' || state.phase === 'wave_active') {
    updateWaveSpawner(state, edt);          // H3
  }
  updateEnemies(state, edt);                // H3 (calls H2 updateBoss for isBoss enemies)
  updateProjectiles(state, dt);             // H1 (scales enemy-owned projectiles by enemyTimeScale itself)
  updatePickups(state, dt);                 // LEAD
  updateHazards(state, dt);                 // LEAD (gravity wells pull the ship)
  resolveCollisions(state);                 // LEAD — §7.6.4
  compact(state);                           // LEAD
}

export function canFire(state: GameState): boolean {
  return FIRE_PHASES.includes(state.phase);
}

export function continueEndless(state: GameState): void {
  state.endless = true;
  emit(state, { type: 'warp_start', nextChapter: state.chapter + 1 });
  setBanner(state, 'small', 'WARP TO CHAPTER ' + (state.chapter + 1), '', BANNER_TTL.warp);
  setPhase(state, 'warp');
}

export function setPhase(state: GameState, p: Phase): void {
  state.phase = p;
  state.phaseTimer = 0;
}

function setBanner(state: GameState, style: Banner['style'], title: string, subtitle: string, ttl: number): void {
  state.banner = { style, title, subtitle, ttl, total: ttl };
}

export function beginWave(state: GameState): void {
  state.waveCount += 1;
  const info = currentWaveInfo(state);
  state.chapterName = info.chapterName;
  state.waveName = info.waveName;
  state.bossName = null;
  state.bossThresholds = [];
  startWave(state);
  emit(state, { type: 'wave_start', chapter: state.chapter, wave: state.wave, name: info.waveName, isBoss: info.isBoss });
  if (info.isBoss) {
    const name = state.bossName ?? 'BOSS';
    setBanner(state, 'boss', 'WARNING', name + ' APPROACHING', BANNER_TTL.boss);
    emit(state, { type: 'boss_warning', name });
    setPhase(state, 'boss_intro');
  } else if (state.wave === 1) {
    const title = 'CHAPTER ' + state.chapter + ': ' + info.chapterName.toUpperCase();
    setBanner(state, 'wave', title, 'Wave 1 — ' + info.waveName, BANNER_TTL.chapterStart);
    setPhase(state, 'wave_intro');
  } else {
    setBanner(state, 'wave', 'WAVE ' + state.wave, info.waveName, BANNER_TTL.wave);
    setPhase(state, 'wave_intro');
  }
}

function updateBanner(state: GameState, dt: number): void {
  if (!state.banner) return;
  state.banner.ttl -= dt;
  if (state.banner.ttl <= 0) state.banner = null;
}

function finishChapterTally(state: GameState): void {
  if (state.chapter >= finalChapter(state) && !state.endless) {
    emit(state, { type: 'victory', score: state.score });
    setBanner(state, 'big', 'COOP LIBERATED!', '', BANNER_TTL.final);
    setPhase(state, 'victory');
  } else {
    emit(state, { type: 'warp_start', nextChapter: state.chapter + 1 });
    setBanner(state, 'small', 'WARP TO CHAPTER ' + (state.chapter + 1), '', BANNER_TTL.warp);
    setPhase(state, 'warp');
  }
}

export function updatePhase(state: GameState, input: InputFrame, dt: number): void {
  updateBanner(state, dt);
  if (state.phase === 'game_over' || state.phase === 'victory') return;

  const p = state.player;
  if (!p.alive && p.lives === 0 && p.respawnTimer <= 0) {
    emit(state, { type: 'game_over', score: state.score });
    setBanner(state, 'big', 'GAME OVER', '', BANNER_TTL.final);
    setPhase(state, 'game_over');
    return;
  }

  const t = state.phaseTimer;
  switch (state.phase) {
    case 'wave_intro':
      if (after(t, PHASE_TIME.waveIntro)) setPhase(state, 'wave_active');
      break;
    case 'boss_intro':
      if (after(t, PHASE_TIME.bossIntro)) setPhase(state, 'wave_active');
      break;
    case 'wave_active':
      if (isWaveComplete(state)) {
        emit(state, { type: 'wave_cleared', chapter: state.chapter, wave: state.wave });
        setBanner(state, 'small', 'WAVE CLEARED', '', BANNER_TTL.waveCleared);
        setPhase(state, 'wave_clear');
      }
      break;
    case 'wave_clear':
      if (!after(t, PHASE_TIME.waveClear)) break;
      if (currentWaveInfo(state).isBoss && openDraft(state)) {
        setPhase(state, 'perk_draft');
      } else {
        advanceAfterWave(state);
      }
      break;
    case 'perk_draft':
      if (after(t, PHASE_TIME.draftAuto)) choosePerk(state, 0);
      break;
    case 'chapter_complete':
      if (after(t, PHASE_TIME.chapterComplete) || (input.skip && after(t, PHASE_TIME.chapterCompleteSkippableAfter))) {
        finishChapterTally(state);
      }
      break;
    case 'warp':
      if (after(t, PHASE_TIME.warp)) {
        state.chapter += 1;
        state.wave = 1;
        state.chapterStats = emptyStats();
        const p = state.player;
        if (state.mods.shieldPerChapter > 0) p.shield = Math.min(MAX_SHIELD, p.shield + state.mods.shieldPerChapter);
        beginWave(state);
      }
      break;
  }
}

/** Next wave, or the chapter tally after the chapter's last wave. */
function advanceAfterWave(state: GameState): void {
  if (state.wave < wavesInChapter(state)) {
    state.wave += 1;
    beginWave(state);
  } else {
    const bonus = computeChapterBonus(state);
    state.lastChapterBonus = bonus;
    addScore(state, bonus.total);
    emit(state, { type: 'chapter_complete', chapter: state.chapter, bonus });
    setPhase(state, 'chapter_complete');
  }
}

/**
 * Perk draft choice (called by the app when the player picks a card, or by the auto timeout).
 * Applies perk `index` and continues the run. No-op outside the perk_draft phase.
 */
export function choosePerk(state: GameState, index: number): void {
  if (state.phase !== 'perk_draft') return;
  applyDraftChoice(state, index);
  advanceAfterWave(state);
}

function updateHazards(state: GameState, dt: number): void {
  const p = state.player;
  for (const h of state.hazards) {
    if (!h.alive) continue;
    h.ttl -= dt;
    if (h.ttl <= 0) h.alive = false;
    else if (h.kind === 'gravity' && p.alive) pullTowards(p.pos, h.a, h.width, h.power, dt);
  }
}

/** Gravity well: pull strength falls off linearly to 0 at `radius`; the ship stays inside its movement box. */
function pullTowards(pos: Vec2, c: Vec2, radius: number, power: number, dt: number): void {
  const dx = c.x - pos.x;
  const dy = c.y - pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1 || d >= radius) return;
  const step = Math.min(d, power * (1 - d / radius) * dt);
  pos.x = clamp(pos.x + (dx / d) * step, SHIP_MIN_X, SHIP_MAX_X);
  pos.y = clamp(pos.y + (dy / d) * step, SHIP_MIN_Y, SHIP_MAX_Y);
}

function compactList<T extends { alive: boolean }>(list: T[]): void {
  let w = 0;
  for (let r = 0; r < list.length; r++) {
    if (list[r].alive) list[w++] = list[r];
  }
  list.length = w;
}

/** Removes every entity with alive === false. */
export function compact(state: GameState): void {
  compactList(state.enemies);
  compactList(state.projectiles);
  compactList(state.pickups);
  compactList(state.hazards);
}
