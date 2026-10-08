// src/sim/game.ts — OWNER: A1. Game creation, fixed step, phase machine (§6.7, §7.10).
import type { Banner, DebugFlags, Difficulty, GameState, InputFrame, Phase } from './types';
import { emit } from './events';
import { emptyWaveRuntime } from './waves.types';
import { createPlayer, updatePlayer } from './player';
import { updateWeapons } from './weapons';
import { updateMissile } from './missile';
import { updateProjectiles } from './projectiles';
import { updateEnemies } from './enemies';
import { isWaveComplete, startWave, updateWaveSpawner, waveInfo } from './waves';
import { updatePickups } from './pickups';
import { resolveCollisions } from './collisions';
import { addScore, computeChapterBonus, emptyStats } from './scoring';
import { EXTRA_LIFE_EVERY, FINAL_CHAPTER, PHASE_TIME, WAVES_PER_CHAPTER } from './tuning/core';

export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
  startChapter?: number;
  startWave?: number;
  debug?: Partial<DebugFlags>;
}

export const NEUTRAL_INPUT: InputFrame = Object.freeze({
  moveX: 0, moveY: 0, pointer: null, fire: false, missile: false, skip: false,
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
    player: createPlayer(opts.difficulty),
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
  };
  beginWave(state);
  return state;
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
  if (state.phase === 'wave_intro' || state.phase === 'boss_intro' || state.phase === 'wave_active') {
    updateWaveSpawner(state, dt);           // A3
  }
  updateEnemies(state, dt);                 // A3 (calls A2 updateBoss for isBoss enemies)
  updateProjectiles(state, dt);             // A2
  updatePickups(state, dt);                 // A1
  updateHazards(state, dt);                 // A1
  resolveCollisions(state);                 // A1 — §7.6.4
  compact(state);                           // A1
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
  const info = waveInfo(state.chapter, state.wave);
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
  if (state.chapter === FINAL_CHAPTER && !state.endless) {
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
      if (state.wave < WAVES_PER_CHAPTER) {
        state.wave += 1;
        beginWave(state);
      } else {
        const bonus = computeChapterBonus(state);
        state.lastChapterBonus = bonus;
        addScore(state, bonus.total);
        emit(state, { type: 'chapter_complete', chapter: state.chapter, bonus });
        setPhase(state, 'chapter_complete');
      }
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
        beginWave(state);
      }
      break;
  }
}

function updateHazards(state: GameState, dt: number): void {
  for (const h of state.hazards) {
    if (!h.alive) continue;
    h.ttl -= dt;
    if (h.ttl <= 0) h.alive = false;
  }
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
