// src/sim/projectiles.ts — OWNER: A2. Projectile spawning and motion (§7.7).
import type { GameState, Projectile, ProjectileKind, Vec2, WeaponId } from './types';
import { emit } from './events';
import { newId } from './ids';
import { DIFFICULTY } from './difficulty';
import { detonateMissile } from './missile';
import { GROUND_Y, MAX_PROJECTILES } from './tuning/core';
import {
  BOLT_MAX_X, BOLT_MIN_X, BOLT_MIN_Y, EGG, ENEMY_PROJECTILE_BOUNDS, MISSILE, PROJECTILE_DEFS,
} from './tuning/weapons';

/**
 * Only kind/owner/x/y/vx/vy are required. Omitted fields use the per-kind defaults of §7.7
 * (tuning/weapons.ts PROJECTILE_DEFS): velocities are used as given (callers apply shotSpeed),
 * eggs get accel (0, 420) and maxSpeed 420 × eggSpeed, `rotation` follows velocity for bolts,
 * missiles and feather knives (angleOf(vel) + π/2).
 */
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
  rotation?: number;
}

export function spawnProjectile(state: GameState, init: ProjectileInit): Projectile | null {
  if (state.projectiles.length >= MAX_PROJECTILES) return null;
  const def = PROJECTILE_DEFS[init.kind];
  const isEgg = init.kind === 'egg';
  const p: Projectile = {
    id: newId(state),
    kind: init.kind,
    owner: init.owner,
    weapon: init.weapon ?? null,
    pos: { x: init.x, y: init.y },
    vel: { x: init.vx, y: init.vy },
    accel: { x: init.ax ?? def.ax, y: init.ay ?? def.ay },
    maxSpeed: init.maxSpeed ?? (isEgg ? EGG.maxSpeed * DIFFICULTY[state.difficulty].eggSpeed : 0),
    radius: init.radius ?? def.radius,
    damage: init.damage ?? def.damage,
    pierceLeft: init.pierce ?? def.pierce,
    hitIds: [],
    ttl: init.ttl ?? def.ttl,
    alive: true,
    rotation: init.rotation ?? (def.rotateWithVelocity ? Math.atan2(init.vy, init.vx) + Math.PI / 2 : 0),
  };
  state.projectiles.push(p);
  return p;
}

function offScreen(p: Projectile): boolean {
  const { x, y } = p.pos;
  if (p.owner === 'player') return y < BOLT_MIN_Y || x < BOLT_MIN_X || x > BOLT_MAX_X;
  const b = ENEMY_PROJECTILE_BOUNDS;
  return x < b.minX || x > b.maxX || y < b.minY || y > b.maxY;
}

export function updateProjectiles(state: GameState, dt: number): void {
  const list = state.projectiles;
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const p = list[i];
    if (!p.alive) continue;
    p.vel.x += p.accel.x * dt;
    p.vel.y += p.accel.y * dt;
    if (p.maxSpeed > 0) {
      const sp = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
      if (sp > p.maxSpeed) {
        const k = p.maxSpeed / sp;
        p.vel.x *= k;
        p.vel.y *= k;
      }
    }
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.ttl -= dt;
    if (p.kind === 'egg' && p.pos.y >= GROUND_Y) {
      p.alive = false;
      emit(state, { type: 'egg_splat', x: p.pos.x, y: GROUND_Y });
    } else if (p.ttl <= 0) {
      p.alive = false;
      if (p.kind === 'missile') detonateMissile(state, MISSILE.target.x, MISSILE.target.y);
    } else if (offScreen(p)) {
      p.alive = false;
    }
  }
}

/** Kills enemy-owned projectiles (no splat events). With center + radius only those within the radius die. */
export function clearEnemyProjectiles(state: GameState, center?: Vec2, radius?: number): void {
  const r2 = center && radius !== undefined ? radius * radius : -1;
  for (const p of state.projectiles) {
    if (!p.alive || p.owner !== 'enemy') continue;
    if (r2 >= 0) {
      const dx = p.pos.x - (center as Vec2).x;
      const dy = p.pos.y - (center as Vec2).y;
      if (dx * dx + dy * dy > r2) continue;
    }
    p.alive = false;
  }
}

export function countEggs(state: GameState): number {
  let n = 0;
  for (const p of state.projectiles) if (p.alive && p.kind === 'egg') n++;
  return n;
}
