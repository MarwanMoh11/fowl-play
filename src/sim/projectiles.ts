// src/sim/projectiles.ts — OWNER: H1 (was A2). Projectile spawning and motion (§7.7): gravity, homing,
// cluster-egg bursts, gear spin and sickle return.
import type { Enemy, GameState, Projectile, ProjectileKind, Vec2, WeaponId } from './types';
import { emit } from './events';
import { newId } from './ids';
import { DIFFICULTY } from './difficulty';
import { clamp, dist2 } from './math';
import { detonateMissile } from './missile';
import { enemyTimeScale } from './powerups';
import { GROUND_Y, MAX_PROJECTILES } from './tuning/core';
import {
  BOLT_MAX_X, BOLT_MIN_X, BOLT_MIN_Y, CLUSTER, EGG, ENEMY_PROJECTILE_BOUNDS, MISSILE, PROJECTILE_DEFS,
} from './tuning/weapons';

/** Gear spin rate (rad/s). */
const GEAR_SPIN = 6;
const TAU = Math.PI * 2;

/**
 * Only kind/owner/x/y/vx/vy are required. Omitted fields use the per-kind defaults of §7.7
 * (tuning/weapons.ts PROJECTILE_DEFS): velocities are used as given (callers apply shotSpeed),
 * eggs get accel (0, 420) and maxSpeed 420 × eggSpeed, `rotation` follows velocity for bolts,
 * missiles and feather knives (angleOf(vel) + π/2). Cluster eggs default to CLUSTER.fuse.
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
  homing?: number;         // turn rate rad/s (default 0)
  targetId?: number;       // default -1
  fuse?: number;           // default 0 (CLUSTER.fuse for cluster eggs)
}

export function spawnProjectile(state: GameState, init: ProjectileInit): Projectile | null {
  if (state.projectiles.length >= MAX_PROJECTILES) return null;
  const def = PROJECTILE_DEFS[init.kind];
  const isEgg = init.kind === 'egg';
  // Mutators/perks scale every enemy projectile's speed in one place.
  const sm = init.owner === 'enemy' ? state.mods.enemyShotSpeedMul : 1;
  const fuse = init.fuse ?? (init.kind === 'cluster_egg' ? CLUSTER.fuse : 0);
  const p: Projectile = {
    id: newId(state),
    kind: init.kind,
    owner: init.owner,
    weapon: init.weapon ?? null,
    pos: { x: init.x, y: init.y },
    vel: { x: init.vx * sm, y: init.vy * sm },
    accel: { x: init.ax ?? def.ax, y: init.ay ?? def.ay },
    maxSpeed: (init.maxSpeed ?? (isEgg ? EGG.maxSpeed * DIFFICULTY[state.difficulty].eggSpeed : 0)) * sm,
    radius: init.radius ?? def.radius,
    damage: init.damage ?? def.damage,
    pierceLeft: init.pierce ?? def.pierce,
    hitIds: [],
    ttl: init.ttl ?? def.ttl,
    alive: true,
    rotation: init.rotation ?? (def.rotateWithVelocity ? Math.atan2(init.vy, init.vx) + Math.PI / 2 : 0),
    homing: init.homing ?? 0,
    targetId: init.targetId ?? -1,
    fuse,
    age: 0,
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

/** Player target still worth chasing: alive and hittable. */
function validTarget(e: Enemy | undefined): e is Enemy {
  return e !== undefined && e.alive && !e.invulnerable;
}

/** Nearest alive, hittable enemy above the ship, measured from `from`. */
function nearestAboveShip(state: GameState, from: Vec2): Enemy | null {
  const limit = state.player.pos.y;
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.invulnerable || e.pos.y >= limit) continue;
    const d = dist2(e.pos, from);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/** Where a homing projectile wants to fly: its target (re-acquired when gone), or the player for enemy shots. */
function homingGoal(state: GameState, p: Projectile): Vec2 | null {
  if (p.owner === 'enemy') return state.player.alive ? state.player.pos : null;
  if (p.targetId >= 0) {
    const t = state.enemies.find((e) => e.id === p.targetId);
    if (validTarget(t)) return t.pos;
  }
  const next = nearestAboveShip(state, p.pos);
  p.targetId = next ? next.id : -1;
  return next ? next.pos : null;
}

/** Turns the velocity toward the goal by at most homing × dt radians, keeping the speed. */
function steerHoming(state: GameState, p: Projectile, dt: number): void {
  const goal = homingGoal(state, p);
  if (!goal) return;
  const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
  if (speed <= 0) return;
  const cur = Math.atan2(p.vel.y, p.vel.x);
  const want = Math.atan2(goal.y - p.pos.y, goal.x - p.pos.x);
  const diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
  const maxTurn = p.homing * dt;
  const a = cur + clamp(diff, -maxTurn, maxTurn);
  p.vel.x = Math.cos(a) * speed;
  p.vel.y = Math.sin(a) * speed;
}

/** Cluster egg fuse ran out: a ring of enemy shards, and the egg is gone. */
function burstCluster(state: GameState, p: Projectile): void {
  p.alive = false;
  emit(state, { type: 'projectile_burst', kind: p.kind, x: p.pos.x, y: p.pos.y });
  for (let k = 0; k < CLUSTER.shards; k++) {
    const a = Math.PI / 6 + (k * TAU) / CLUSTER.shards;
    spawnProjectile(state, {
      kind: 'shard', owner: 'enemy', x: p.pos.x, y: p.pos.y,
      vx: Math.cos(a) * CLUSTER.shardSpeed, vy: Math.sin(a) * CLUSTER.shardSpeed,
    });
  }
}

export function updateProjectiles(state: GameState, frameDt: number): void {
  const list = state.projectiles;
  const n = list.length;
  const enemyScale = enemyTimeScale(state);
  for (let i = 0; i < n; i++) {
    const p = list[i];
    if (!p.alive) continue;
    const dt = p.owner === 'enemy' ? frameDt * enemyScale : frameDt; // time warp slows enemy fire
    p.age += dt;
    if (p.kind === 'gear') p.rotation += GEAR_SPIN * dt;
    if (p.homing > 0) steerHoming(state, p, dt);
    p.vel.x += p.accel.x * dt;
    p.vel.y += p.accel.y * dt;
    // Sky sickle: the first tick it falls back, clear the hit list so the return trip hits again.
    if (p.kind === 'bolt' && p.weapon === 'sickle' && p.fuse > 0 && p.vel.y > 0) {
      p.fuse = 0;
      p.hitIds = [];
    }
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
    if (p.kind === 'cluster_egg' && p.fuse > 0) {
      p.fuse -= dt;
      if (p.fuse <= 0) {
        burstCluster(state, p);
        continue;
      }
    }
    if ((p.kind === 'egg' || p.kind === 'cluster_egg') && p.pos.y >= GROUND_Y) {
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
