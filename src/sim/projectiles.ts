// src/sim/projectiles.ts — OWNER: A2
// STUB(A1): owner A2 implements (§7.7)
import type { GameState, Projectile, ProjectileKind, Vec2, WeaponId } from './types';

/** Initial shape by A1; A2 may add optional fields. Omitted fields use per-kind defaults (§7.7). */
export interface ProjectileInit {
  kind: ProjectileKind;
  owner: 'player' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax?: number;
  ay?: number;
  maxSpeed?: number;
  radius?: number;
  damage?: number;
  pierce?: number;
  ttl?: number;
  weapon?: WeaponId | null;
}

export function spawnProjectile(_state: GameState, _init: ProjectileInit): Projectile | null {
  return null;
}

export function updateProjectiles(_state: GameState, _dt: number): void {}

export function clearEnemyProjectiles(_state: GameState, _center?: Vec2, _radius?: number): void {}

export function countEggs(_state: GameState): number {
  return 0;
}
