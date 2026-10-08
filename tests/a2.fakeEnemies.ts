// tests/a2.fakeEnemies.ts — OWNER: A2. Minimal stand-ins for A3's enemies.ts and waves.ts (not a test file).
// Used through vi.mock so A2's tests do not depend on A3's work in progress.
import type { Enemy, EnemyKind, GameState } from '../src/sim/types';
import type { BehaviorState } from '../src/sim/behaviors.types';
import { newId } from '../src/sim/ids';
import { MAX_ENEMIES } from '../src/sim/tuning/core';

interface FakeDef { radius: number; hp: number; points: number; eggRate: number; food: 'drumstick' | 'roast' | null; foodChance: number }
const BOSS: FakeDef = { radius: 100, hp: 1000, points: 10000, eggRate: 0, food: null, foodChance: 0 };

export const ENEMY_DEFS: Record<EnemyKind, FakeDef> = {
  chicken_basic:   { radius: 22, hp: 1, points: 100, eggRate: 0.05, food: 'drumstick', foodChance: 1 },
  chicken_red:     { radius: 24, hp: 3, points: 250, eggRate: 0.07, food: 'drumstick', foodChance: 1 },
  chicken_armored: { radius: 26, hp: 7, points: 500, eggRate: 0.08, food: 'roast', foodChance: 1 },
  chicken_ufo:     { radius: 30, hp: 5, points: 400, eggRate: 0.04, food: 'roast', foodChance: 1 },
  chick:           { radius: 14, hp: 1, points: 50, eggRate: 0, food: 'drumstick', foodChance: 0.2 },
  asteroid_l:      { radius: 40, hp: 8, points: 200, eggRate: 0, food: null, foodChance: 0 },
  asteroid_m:      { radius: 26, hp: 3, points: 100, eggRate: 0, food: null, foodChance: 0 },
  asteroid_s:      { radius: 14, hp: 1, points: 50, eggRate: 0, food: null, foodChance: 0 },
  boss_hen: BOSS, boss_carrier: BOSS, boss_rooster: BOSS, boss_dreadnought: BOSS,
};

/** The test sets hooks.updateBoss after importing the real bosses module (avoids an import cycle in the mock). */
export const hooks: { updateBoss: ((s: GameState, e: Enemy, dt: number) => void) | null } = { updateBoss: null };
export const killedLog: { id: number; byMissile: boolean }[] = [];

export function spawnEnemy(state: GameState, kind: EnemyKind, x: number, y: number, behavior: BehaviorState): Enemy | null {
  if (state.enemies.length >= MAX_ENEMIES) return null;
  const d = ENEMY_DEFS[kind];
  const e: Enemy = {
    id: newId(state), kind, pos: { x, y }, vel: { x: 0, y: 0 }, radius: d.radius, hp: d.hp, maxHp: d.hp,
    points: d.points, eggRate: d.eggRate, alive: true, age: 0, hitFlash: 0, invulnerable: false,
    canDropEggs: true, carries: null, rotation: 0, anim: 0, isBoss: kind.startsWith('boss_'), behavior,
  };
  state.enemies.push(e);
  return e;
}

export function updateEnemies(state: GameState, dt: number): void {
  const n = state.enemies.length;
  for (let i = 0; i < n; i++) {
    const e = state.enemies[i];
    if (!e.alive) continue;
    e.age += dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.isBoss && hooks.updateBoss) hooks.updateBoss(state, e, dt);
  }
}

export function onEnemyKilled(_state: GameState, e: Enemy, byMissile: boolean): void {
  killedLog.push({ id: e.id, byMissile });
}

export function dropEgg(): void {}

export const enemiesModule = { ENEMY_DEFS, spawnEnemy, updateEnemies, onEnemyKilled, dropEgg };

export const wavesModule = {
  startWave: (): void => {},
  updateWaveSpawner: (): void => {},
  isWaveComplete: (): boolean => false,
  waveInfo: (chapter: number, wave: number) => ({
    chapterName: 'Chapter ' + chapter, waveName: 'Wave ' + wave, isBoss: wave === 10, boss: null,
  }),
};
