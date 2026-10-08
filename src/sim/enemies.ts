// src/sim/enemies.ts — OWNER: A3
// STUB(A1): owner A3 implements (§7.6)
import type { Enemy, EnemyKind, GameState, PickupKind } from './types';
import type { BehaviorState } from './behaviors.types';

/** Initial shape by A1 (A1's pickups.ts reads `food`/`foodChance`); A3 may add fields. */
export interface EnemyDef {
  radius: number;
  hp: number;
  points: number;
  eggRate: number;            // eggs per second
  food: PickupKind | null;    // food dropped on death
  foodChance: number;         // 0..1 probability of the food drop
}

const BOSS_PLACEHOLDER: EnemyDef = { radius: 100, hp: 1000, points: 10000, eggRate: 0, food: null, foodChance: 0 };

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  chicken_basic:   { radius: 22, hp: 1, points: 100, eggRate: 0.05, food: 'drumstick', foodChance: 1 },
  chicken_red:     { radius: 24, hp: 3, points: 250, eggRate: 0.07, food: 'drumstick', foodChance: 1 },
  chicken_armored: { radius: 26, hp: 7, points: 500, eggRate: 0.08, food: 'roast', foodChance: 1 },
  chicken_ufo:     { radius: 30, hp: 5, points: 400, eggRate: 0.04, food: 'roast', foodChance: 1 },
  chick:           { radius: 14, hp: 1, points: 50, eggRate: 0, food: 'drumstick', foodChance: 0.2 },
  asteroid_l:      { radius: 40, hp: 8, points: 200, eggRate: 0, food: null, foodChance: 0 },
  asteroid_m:      { radius: 26, hp: 3, points: 100, eggRate: 0, food: null, foodChance: 0 },
  asteroid_s:      { radius: 14, hp: 1, points: 50, eggRate: 0, food: null, foodChance: 0 },
  boss_hen: BOSS_PLACEHOLDER,
  boss_carrier: BOSS_PLACEHOLDER,
  boss_rooster: BOSS_PLACEHOLDER,
  boss_dreadnought: BOSS_PLACEHOLDER,
};

export function spawnEnemy(
  _state: GameState, _kind: EnemyKind, _x: number, _y: number, _behavior: BehaviorState,
): Enemy | null {
  return null;
}

export function updateEnemies(_state: GameState, _dt: number): void {}

export function onEnemyKilled(_state: GameState, _enemy: Enemy, _byMissile: boolean): void {}

export function dropEgg(_state: GameState, _enemy: Enemy): void {}
