// src/sim/bosses.ts — OWNER: A2
// STUB(A1): owner A2 implements (§7.13)
import type { Enemy, GameState } from './types';
import type { BossId } from './bosses.types';

export function spawnBoss(_state: GameState, _id: BossId): void {}

export function updateBoss(_state: GameState, _enemy: Enemy, _dt: number): void {}

export function onBossDamaged(_state: GameState, _enemy: Enemy): void {}

export function onBossKilled(_state: GameState, _enemy: Enemy): void {}
