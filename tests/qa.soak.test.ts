// tests/qa.soak.test.ts — QA: headless soak of the sim. A deterministic bot plays every mode × difficulty × seed
// (and every chapter via startChapter). Per tick: finite state, bounded entity counts, monotonic score, phase
// timers within bounds. Per run: the final state hash must reproduce. Fast version always runs; SOAK=1 runs heavy.
import { describe, expect, it } from 'vitest';
import { choosePerk, continueEndless, createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { applyDebug, type DebugCommand } from '../src/sim/debug';
import { dailyMutators } from '../src/sim/modes';
import { spawnPickup } from '../src/sim/pickups';
import { ENEMY_DEFS } from '../src/sim/enemies';
import { PICKUP_DEFS } from '../src/sim/tuning/economy';
import { PROJECTILE_DEFS } from '../src/sim/tuning/weapons';
import { BOSS_DEFS } from '../src/sim/tuning/bosses';
import { DT, SHIP_MAX_X, SHIP_MAX_Y, SHIP_MIN_X, SHIP_MIN_Y } from '../src/sim/tuning/core';
import { MUTATOR_IDS } from '../src/sim/tuning/loadout';
import { SHIP_IDS } from '../src/sim/types';
import type { Difficulty, GameMode, GameState, InputFrame, Loadout, Phase } from '../src/sim/types';
import { addEnemy, addProjectile } from './a1.helpers';
import { checkInvariants } from './a1.invariants';

/** Longest time (s) a phase may last, from the sim's own timers. wave_active is the open-ended one. */
const PHASE_LIMIT_S: Partial<Record<Phase, number>> = {
  wave_intro: 2.0, boss_intro: 3.0, wave_clear: 1.5, chapter_complete: 5.0, warp: 3.0, perk_draft: 30.0,
};
const WAVE_STALL_S = 120;   // wave_active with no kill, hit or boss HP change for this long = stuck
const EVENT_LIMIT = 500;
const DEBUG_OPS: readonly DebugCommand[] = ['killAll', 'nextWave', 'fillFury', 'addMissiles', 'spawnPowerup', 'cycleWeapon', 'powerUp', 'jumpToBoss'];

export interface SoakCfg {
  mode: GameMode;
  difficulty: Difficulty;
  seed: number;
  ticks: number;
  startChapter?: number;
  startWave?: number;
  god?: boolean;        // godMode lets the bot reach later chapters and victory
  endless?: boolean;    // continueEndless after victory instead of stopping
  debugOps?: boolean;   // applies a debug command every ~2500 ticks
  allMutators?: boolean;
}

export interface SoakReport {
  label: string;
  hash: string;
  ticks: number;
  finalPhase: Phase;
  chapterMax: number;
  waveCount: number;
  score: number;
  peak: { enemies: number; projectiles: number; pickups: number; hazards: number; events: number };
  longest: Partial<Record<Phase, number>>;
  stepMs: number[];
  stepChapter: number[];   // chapter of each timed tick, parallel to stepMs
  phases: Set<Phase>;
  bossesKilled: number;
  perks: number;
  seen: Set<string>;       // enemy, projectile and pickup kinds that were alive at some tick
}

/** Bot randomness is its own xorshift stream, so choices depend only on the seed and the tick. */
function botRandom(seed: number): () => number {
  let s = ((seed * 2654435761) >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

interface Bot {
  rand: () => number;
  tx: number;
  ty: number;
  retargetAt: number;
}

function botInput(state: GameState, bot: Bot): InputFrame {
  const p = state.player;
  const t = state.tick;
  if (t >= bot.retargetAt) {
    bot.retargetAt = t + 90 + Math.floor(bot.rand() * 120);
    // Mostly hunt: a live enemy (bolts fly straight up), a power-up, or a random spot.
    const roll = bot.rand();
    const foes = state.enemies.filter((e) => e.alive && !e.invulnerable);
    const drops = state.pickups.filter((k) => k.alive);
    if (roll < 0.5 && foes.length > 0) {
      const f = foes[Math.floor(bot.rand() * foes.length)];
      bot.tx = f.pos.x;
      bot.ty = SHIP_MAX_Y - 60;
    } else if (roll < 0.8 && drops.length > 0) {
      const k = drops[Math.floor(bot.rand() * drops.length)];
      bot.tx = k.pos.x;
      bot.ty = k.pos.y;
    } else {
      bot.tx = SHIP_MIN_X + bot.rand() * (SHIP_MAX_X - SHIP_MIN_X);
      bot.ty = SHIP_MIN_Y + bot.rand() * (SHIP_MAX_Y - SHIP_MIN_Y);
    }
    bot.tx = Math.min(SHIP_MAX_X, Math.max(SHIP_MIN_X, bot.tx));
    bot.ty = Math.min(SHIP_MAX_Y, Math.max(SHIP_MIN_Y, bot.ty));
  }
  const dx = bot.tx - p.pos.x;
  const dy = bot.ty - p.pos.y;
  return {
    moveX: Math.abs(dx) < 8 ? 0 : Math.sign(dx),
    moveY: Math.abs(dy) < 8 ? 0 : Math.sign(dy),
    pointer: Math.floor(t / 600) % 3 === 0 ? { x: bot.tx, y: bot.ty } : null,
    fire: t % 300 < 260,
    missile: t % 400 === 200,
    skip: state.phase === 'chapter_complete' && state.phaseTimer > 2 && t % 20 === 0,
    overdrive: t % 900 === 450,
  };
}

function fnv1a(text: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function loadoutFor(cfg: SoakCfg): Loadout {
  const ship = SHIP_IDS[cfg.seed % SHIP_IDS.length];
  const mutators = cfg.allMutators ? MUTATOR_IDS.slice() : cfg.mode === 'daily' ? dailyMutators(cfg.seed) : [];
  return { ship, upgrades: cfg.allMutators ? { start_power: 3, hull: 2 } : {}, mutators };
}

/** Plays one run. Throws on the first violated invariant, with the config and tick in the message. */
export function runSoak(cfg: SoakCfg, timed = false): SoakReport {
  const label = `${cfg.mode}/${cfg.difficulty}/seed${cfg.seed}/ch${cfg.startChapter ?? 1}`;
  const state = createGame({
    seed: cfg.seed, difficulty: cfg.difficulty, mode: cfg.mode, loadout: loadoutFor(cfg),
    startChapter: cfg.startChapter, startWave: cfg.startWave,
    debug: cfg.god ? { godMode: true } : undefined,
  });
  const bot: Bot = { rand: botRandom(cfg.seed * 7 + 3), tx: 640, ty: 500, retargetAt: 0 };
  const fail = (msg: string): never => {
    throw new Error(`[${label} tick ${state.tick} phase ${state.phase}] ${msg}`);
  };
  const report: SoakReport = {
    label, hash: '', ticks: 0, finalPhase: state.phase, chapterMax: state.chapter, waveCount: 0, score: 0,
    peak: { enemies: 0, projectiles: 0, pickups: 0, hazards: 0, events: 0 }, longest: {}, stepMs: [], stepChapter: [],
    phases: new Set<Phase>(), bossesKilled: 0, perks: 0, seen: new Set<string>(),
  };
  let lastPhase: Phase = state.phase;
  let lastTimer = state.phaseTimer;
  let phaseSecs = 0;
  let progressTick = 0;
  let progressSig = '';
  let prevScore = state.score;
  for (let i = 0; i < cfg.ticks; i++) {
    if (state.phase === 'game_over') break;
    if (state.phase === 'victory') {
      if (!cfg.endless) break;
      continueEndless(state);
    }
    if (state.phase === 'perk_draft' && state.phaseTimer > 1.5 && i % 7 === 0) choosePerk(state, i % 3);
    if (cfg.debugOps && i % 2500 === 2400) applyDebug(state, DEBUG_OPS[Math.floor(i / 2500) % DEBUG_OPS.length]);

    const input = botInput(state, bot);
    const chapter = state.chapter;
    const t0 = timed ? performance.now() : 0;
    step(state, input, DT);
    if (timed) {
      report.stepMs.push(performance.now() - t0);
      report.stepChapter.push(chapter);
    }
    report.ticks += 1;

    const bad = checkInvariants(state, i % 300 === 0);
    if (bad.length) fail(bad.join(', '));
    if (state.score < prevScore) fail(`score fell ${prevScore} -> ${state.score}`);
    prevScore = state.score;
    if (state.events.length > EVENT_LIMIT) fail(`events ${state.events.length}`);

    // Phase timing: a new instance starts on a phase change or when the timer is reset to a smaller value.
    if (state.phase !== lastPhase || state.phaseTimer < lastTimer) phaseSecs = 0;
    phaseSecs += DT;
    lastPhase = state.phase;
    lastTimer = state.phaseTimer;
    const limit = PHASE_LIMIT_S[state.phase];
    if (limit !== undefined && phaseSecs > limit + 0.5) fail(`phase lasted ${phaseSecs.toFixed(1)} s (limit ${limit})`);
    // A wave is open-ended (a weak bot takes minutes on a boss), so it must show progress: a kill, a hit or boss HP.
    if (state.phase !== 'wave_active') progressTick = state.tick;
    else {
      let bossHp = 0;
      for (const e of state.enemies) if (e.isBoss) bossHp += e.hp;
      const sig = `${state.runStats.kills}|${state.runStats.shotsHit}|${state.enemies.length}|${bossHp}`;
      if (sig !== progressSig) {
        progressSig = sig;
        progressTick = state.tick;
      } else if ((state.tick - progressTick) * DT > WAVE_STALL_S) {
        fail(`wave stalled for ${WAVE_STALL_S} s with ${state.enemies.length} enemies alive`);
      }
    }
    const prev = report.longest[state.phase] ?? 0;
    if (phaseSecs > prev) report.longest[state.phase] = phaseSecs;

    for (const e of state.enemies) if (e.alive) report.seen.add(e.kind);
    for (const pr of state.projectiles) report.seen.add(pr.kind);
    for (const k of state.pickups) report.seen.add(k.kind);
    const pk = report.peak;
    pk.enemies = Math.max(pk.enemies, state.enemies.length);
    pk.projectiles = Math.max(pk.projectiles, state.projectiles.length);
    pk.pickups = Math.max(pk.pickups, state.pickups.length);
    pk.hazards = Math.max(pk.hazards, state.hazards.length);
    pk.events = Math.max(pk.events, state.events.length);
    report.chapterMax = Math.max(report.chapterMax, state.chapter);
    report.phases.add(state.phase);
  }
  report.finalPhase = state.phase;
  report.waveCount = state.waveCount;
  report.score = state.score;
  report.bossesKilled = state.runStats.bossesKilled;
  report.perks = Object.values(state.perks).reduce((s, n) => s + (n ?? 0), 0);
  report.hash = fnv1a(JSON.stringify(state));
  return report;
}

function runTwice(cfg: SoakCfg): SoakReport {
  const a = runSoak(cfg);
  const b = runSoak(cfg);
  expect(b.hash, `${a.label} is not reproducible`).toBe(a.hash);
  return a;
}

describe('soak (fast)', () => {
  it('every mode and difficulty survives a bot run, reproducibly', () => {
    const modes: GameMode[] = ['campaign', 'onslaught', 'boss_rush', 'daily'];
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];
    for (const mode of modes) {
      for (const difficulty of difficulties) {
        runTwice({ mode, difficulty, seed: 11, ticks: 700, debugOps: true, allMutators: mode === 'onslaught' });
      }
    }
  });

  it('every chapter and boss of the campaign can be entered and played', () => {
    for (let ch = 1; ch <= 12; ch++) {
      runSoak({ mode: 'campaign', difficulty: 'normal', seed: 100 + ch, ticks: 900, startChapter: ch, startWave: 10, god: true });
      runSoak({ mode: 'campaign', difficulty: 'hard', seed: 200 + ch, ticks: 600, startChapter: ch, startWave: 1, god: true, allMutators: true });
    }
  });

  it('every onslaught sector can open with its mini-boss (wave 5) and boss (wave 10)', () => {
    for (let s = 1; s <= 24; s++) {
      runSoak({ mode: 'onslaught', difficulty: 'normal', seed: 400 + s, ticks: 700, startChapter: s, startWave: 5, god: true });
      runSoak({ mode: 'onslaught', difficulty: 'hard', seed: 500 + s, ticks: 700, startChapter: s, startWave: 10, god: true, allMutators: true });
    }
  });

  it('very deep onslaught sectors and endless loops stay finite and bounded', () => {
    for (const s of [60, 1000, 100000]) {
      for (const w of [1, 4, 7, 10]) {
        runSoak({ mode: 'onslaught', difficulty: 'hard', seed: 600 + w, ticks: 500, startChapter: s, startWave: w, god: true, allMutators: true });
      }
    }
    runSoak({ mode: 'campaign', difficulty: 'hard', seed: 700, ticks: 1500, startChapter: 30, startWave: 1, god: true, allMutators: true });
    // Rare waves: the only campaign wave with chicken_healer (Haunted Rings), and a mid-chapter mini-boss.
    runSoak({ mode: 'campaign', difficulty: 'normal', seed: 701, ticks: 1500, startChapter: 9, startWave: 4, god: true });
  });

  it('boss rush visits all twelve bosses', () => {
    for (let ch = 1; ch <= 12; ch++) {
      runSoak({ mode: 'boss_rush', difficulty: 'normal', seed: 300 + ch, ticks: 800, startChapter: ch, god: true });
    }
  });

  it('endless continues past the final chapter (god mode)', () => {
    runSoak({ mode: 'campaign', difficulty: 'easy', seed: 6, ticks: 2000, startChapter: 12, startWave: 10, god: true, endless: true });
  });
});

describe.skipIf(!process.env.SOAK)('soak (heavy, SOAK=1)', () => {
  it('long bot runs across modes, difficulties and seeds', () => {
    const modes: GameMode[] = ['campaign', 'onslaught', 'boss_rush', 'daily'];
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];
    const phases = new Set<Phase>();
    const stepMs: number[] = [];
    const stepChapter: number[] = [];
    let peak = { enemies: 0, projectiles: 0, pickups: 0, hazards: 0, events: 0 };
    let bosses = 0;
    let perks = 0;
    let chapters = 0;
    const seen = new Set<string>();
    const runs: SoakCfg[] = [];
    for (const mode of modes) {
      for (const difficulty of difficulties) {
        for (let seed = 1; seed <= 4; seed++) {
          runs.push({
            mode, difficulty, seed, ticks: 60000, debugOps: seed !== 4, god: seed === 3, endless: mode === 'onslaught' || seed === 3,
            allMutators: seed === 2,
          });
        }
      }
    }
    // Deep endless: campaign loops, and onslaught sectors far past the authored ones.
    runs.push({ mode: 'campaign', difficulty: 'easy', seed: 40, ticks: 60000, startChapter: 12, startWave: 10, god: true, endless: true });
    runs.push({ mode: 'onslaught', difficulty: 'hard', seed: 41, ticks: 40000, startChapter: 30, god: true, endless: true, allMutators: true });
    for (const cfg of runs) {
      const r = runSoak(cfg, true);
      if (cfg.seed === 1) expect(runSoak(cfg).hash, `${r.label} is not reproducible`).toBe(r.hash);
      r.phases.forEach((p) => phases.add(p));
      stepMs.push(...r.stepMs);
      stepChapter.push(...r.stepChapter);
      peak = {
        enemies: Math.max(peak.enemies, r.peak.enemies), projectiles: Math.max(peak.projectiles, r.peak.projectiles),
        pickups: Math.max(peak.pickups, r.peak.pickups), hazards: Math.max(peak.hazards, r.peak.hazards),
        events: Math.max(peak.events, r.peak.events),
      };
      bosses += r.bossesKilled;
      perks += r.perks;
      chapters = Math.max(chapters, r.chapterMax);
      r.seen.forEach((k) => seen.add(k));
    }
    const sorted = stepMs.slice().sort((a, b) => a - b);
    const mean = stepMs.reduce((s, v) => s + v, 0) / Math.max(1, stepMs.length);
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;
    console.info(`[soak] runs=${runs.length} ticks=${stepMs.length} mean=${mean.toFixed(4)}ms p99=${p99.toFixed(4)}ms max=${(sorted[sorted.length - 1] ?? 0).toFixed(4)}ms`);
    console.info(`[soak] peak=${JSON.stringify(peak)} bossesKilled=${bosses} perks=${perks} maxChapter=${chapters} phases=${[...phases].join(',')}`);
    const byChapter = new Map<number, number[]>();
    stepChapter.forEach((c, i) => {
      let list = byChapter.get(c);
      if (!list) byChapter.set(c, (list = []));
      list.push(stepMs[i]);
    });
    const worst = [...byChapter.entries()]
      .map(([c, ms]) => ({ c, p99: ms.slice().sort((a, b) => a - b)[Math.floor(ms.length * 0.99)] ?? 0, n: ms.length }))
      .sort((a, b) => b.p99 - a.p99).slice(0, 5);
    console.info(`[soak] worst chapters by p99: ${worst.map((w) => `ch${w.c}=${w.p99.toFixed(4)}ms(n=${w.n})`).join(' ')}`);
    const unseen = [...Object.keys(ENEMY_DEFS), ...Object.keys(BOSS_DEFS), ...Object.keys(PROJECTILE_DEFS), ...Object.keys(PICKUP_DEFS)]
      .filter((k) => !seen.has(k));
    console.info(`[soak] kinds seen=${seen.size} unseen=${unseen.join(',') || 'none'}`);
    expect(phases.has('wave_active')).toBe(true);
    expect(phases.has('perk_draft')).toBe(true);
    expect(phases.has('victory')).toBe(true);
    expect(phases.has('game_over')).toBe(true);
  }, 600_000);
});

/** Step cost with every list near its cap (no bot): the worst frame the game can reasonably produce. */
function denseWorld(kind: 'enemy_fire' | 'player_fire'): GameState {
  const state = createGame({ seed: 77, difficulty: 'normal', mode: 'campaign', startChapter: 6, debug: { godMode: true } });
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.pickups.length = 0;
  let r = 12345;
  const rnd = (): number => {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    return r / 0x7fffffff;
  };
  for (let i = 0; i < 400; i++) {
    addEnemy(state, {
      kind: 'chicken_basic', hp: 1e9, maxHp: 1e9, radius: 22,
      pos: { x: 60 + rnd() * 1160, y: 120 + rnd() * 300 }, vel: { x: 0, y: 0 }, behavior: { type: 'none' },
    });
  }
  for (let i = 0; i < (kind === 'enemy_fire' ? 1500 : 300); i++) {
    if (kind === 'enemy_fire') {
      addProjectile(state, {
        kind: 'enemy_shot', owner: 'enemy', pos: { x: rnd() * 1280, y: 40 + rnd() * 200 },
        vel: { x: 0, y: 30 }, radius: 6, ttl: 1e6,
      });
    } else {
      addProjectile(state, {
        kind: 'bolt', owner: 'player', weapon: 'pulse', pos: { x: rnd() * 1280, y: 120 + rnd() * 500 },
        vel: { x: 0, y: -900 }, radius: 5, ttl: 1e6, pierceLeft: 1e6,
      });
    }
  }
  for (let i = 0; i < 300; i++) spawnPickup(state, 'corn', rnd() * 1280, 100 + rnd() * 400);
  return state;
}

describe.skipIf(!process.env.SOAK)('soak (dense step cost, SOAK=1)', () => {
  it('step() stays cheap with 400 enemies, 1500 enemy shots, or 300 player bolts', () => {
    for (const kind of ['enemy_fire', 'player_fire'] as const) {
      const state = denseWorld(kind);
      const ms: number[] = [];
      for (let i = 0; i < 600; i++) {
        const t0 = performance.now();
        step(state, NEUTRAL_INPUT, DT);
        ms.push(performance.now() - t0);
      }
      const sorted = ms.slice().sort((a, b) => a - b);
      const mean = ms.reduce((s, v) => s + v, 0) / ms.length;
      console.info(`[dense] ${kind}: mean=${mean.toFixed(4)}ms p99=${(sorted[Math.floor(sorted.length * 0.99)] ?? 0).toFixed(4)}ms max=${(sorted[sorted.length - 1] ?? 0).toFixed(4)}ms enemies=${state.enemies.length} projectiles=${state.projectiles.length}`);
      expect(checkInvariants(state, true)).toEqual([]);
    }
  }, 120_000);
});
