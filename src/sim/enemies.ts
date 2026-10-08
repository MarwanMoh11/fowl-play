// src/sim/enemies.ts — OWNER: H3 (was A3). Enemy construction, per-tick update, egg dropping, asteroid splitting (§7.6).
import type { Enemy, EnemyKind, GameState } from './types';
import type { BehaviorState } from './behaviors.types';
import { emit } from './events';
import { newId } from './ids';
import { chapterScale, DIFFICULTY } from './difficulty';
import { clamp, fromAngle, angleOf, deg } from './math';
import { rngChance, rngRange } from './rng';
import { countEggs, spawnProjectile } from './projectiles';
import { updateBoss } from './bosses';
import { updateBehavior } from './behaviors';
import { mineBurst, updateAbility } from './abilities';
import { MAX_ENEMIES, EGG_DROP_MAX_Y } from './tuning/core';
import { ASTEROIDS, EGG, ENEMY_BASE, LOST_ENEMY, POINTS_ROUND_TO, TILT } from './tuning/enemies';
import type { EnemyDef } from './tuning/enemies';

export type { EnemyDef };
export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = ENEMY_BASE;

export function isBossKind(kind: EnemyKind): boolean {
  return kind.startsWith('boss_');
}

export interface SpawnOptions {
  /** Wave spawns consume the carry plan and count toward `spawnCounter`. Children (asteroid splits) pass false. */
  counted?: boolean;
}

/**
 * Builds an enemy from ENEMY_DEFS with difficulty/chapter scaling (§7.6.1) and pushes it.
 * Returns null at MAX_ENEMIES. Boss kinds get base values only (A2 overrides).
 */
export function spawnEnemy(
  state: GameState, kind: EnemyKind, x: number, y: number, behavior: BehaviorState, opts: SpawnOptions = {},
): Enemy | null {
  if (state.enemies.length >= MAX_ENEMIES) return null;
  const def = ENEMY_DEFS[kind];
  const boss = isBossKind(kind);
  const diff = DIFFICULTY[state.difficulty];
  const sc = chapterScale(state.chapter);
  const m = state.mods;
  const hp = boss ? def.hp : Math.max(1, Math.round(def.hp * diff.enemyHp * sc.hp * m.enemyHpMul));
  const points = boss ? def.points : Math.round((def.points * sc.points) / POINTS_ROUND_TO) * POINTS_ROUND_TO;
  const eggRate = boss ? 0 : def.eggRate * diff.eggRate * sc.eggRate * m.enemyEggRateMul;
  const shield = boss ? 0 : Math.round((def.shield ?? 0) * diff.enemyHp * sc.hp * m.enemyHpMul);
  const e: Enemy = {
    id: newId(state), kind, pos: { x, y }, vel: { x: 0, y: 0 }, radius: def.radius,
    hp, maxHp: hp, points, eggRate, alive: true, age: 0, hitFlash: 0,
    invulnerable: false, canDropEggs: false, carries: null, rotation: 0, anim: 0,
    isBoss: boss, behavior,
    shield, maxShield: shield, skillTimer: 0, skillState: 0, parentId: -1,
  };
  if (opts.counted !== false && !boss) e.carries = takeCarry(state);
  state.enemies.push(e);
  return e;
}

/** Consumes one wave-spawn index and returns the carried pickup planned for it, if any. */
function takeCarry(state: GameState): Enemy['carries'] {
  const rt = state.waveRt;
  const idx = rt.spawnCounter++;
  for (const c of rt.carryPlan) {
    if (c.spawnIndex === idx) return c.kind;
  }
  return null;
}

function inEggZone(e: Enemy): boolean {
  const { x, y } = e.pos;
  return y >= 0 && y <= EGG_DROP_MAX_Y && x >= EGG.zoneMinX && x <= EGG.zoneMaxX;
}

/** Drops one egg from the enemy (no cap or zone checks; callers decide). */
export function dropEgg(state: GameState, enemy: Enemy): void {
  const p = spawnProjectile(state, {
    kind: 'egg', owner: 'enemy', x: enemy.pos.x, y: enemy.pos.y + enemy.radius * EGG.spawnYFactor,
    vx: 0, vy: EGG.launchVy,
  });
  if (p) emit(state, { type: 'egg_dropped', x: p.pos.x, y: p.pos.y });
}

function maybeDropEgg(state: GameState, e: Enemy, dt: number): void {
  if (!e.canDropEggs || e.eggRate <= 0 || !inEggZone(e)) return;
  const mul = e.behavior.type === 'dive' ? EGG.diveRateMul : 1;
  if (!rngChance(state.rng, e.eggRate * mul * dt)) return;
  if (countEggs(state) >= DIFFICULTY[state.difficulty].eggCap) return;
  dropEgg(state, e);
}

function keepInBounds(state: GameState, e: Enemy, dt: number): void {
  const lost = (state.waveRt.lost ??= {});
  const { x, y } = e.pos;
  const out = x < LOST_ENEMY.minX || x > LOST_ENEMY.maxX || y < LOST_ENEMY.minY || y > LOST_ENEMY.maxY;
  if (!out) {
    if (lost[e.id] !== undefined) delete lost[e.id];
    return;
  }
  lost[e.id] = (lost[e.id] ?? 0) + dt;
  if (lost[e.id] > LOST_ENEMY.seconds) {
    e.alive = false;
    delete lost[e.id];
  }
}

function applyTilt(e: Enemy): void {
  const t = e.behavior.type;
  if (t === 'drift' || t === 'bounce') return; // asteroids spin, bouncers wobble (set by behaviors)
  e.rotation = clamp(e.vel.x / TILT.divisor, -TILT.max, TILT.max);
}

export function updateEnemies(state: GameState, dt: number): void {
  const list = state.enemies;
  const n = list.length; // enemies spawned by behaviors this tick start updating next tick
  const speed = chapterScale(state.chapter).speed * state.mods.enemySpeedMul;
  for (let i = 0; i < n; i++) {
    const e = list[i];
    if (!e.alive) continue;
    e.age += dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.isBoss) {
      updateBoss(state, e, dt);
      continue;
    }
    updateBehavior(state, e, dt, speed);
    if (!e.alive) continue;
    updateAbility(state, e, dt);
    if (!e.alive) continue;
    applyTilt(e);
    maybeDropEgg(state, e, dt);
    keepInBounds(state, e, dt);
  }
}

/** Asteroid splitting (§7.11): L → 2 M, M → 2 S; no split when killed by a missile. */
export function onEnemyKilled(state: GameState, enemy: Enemy, byMissile: boolean): void {
  if (state.waveRt.lost) delete state.waveRt.lost[enemy.id];
  if (enemy.kind === 'space_mine') mineBurst(state, enemy); // H3: a shot or missile sets the mine off too
  const child = ENEMY_DEFS[enemy.kind].splitInto;
  if (!child || byMissile) return;
  const heading = angleOf(enemy.vel);
  const speed = Math.hypot(enemy.vel.x, enemy.vel.y) * ASTEROIDS.splitSpeedMul;
  for (const side of [-1, 1]) {
    const v = fromAngle(heading + side * deg(ASTEROIDS.splitAngle), speed);
    const c = spawnEnemy(state, child, enemy.pos.x, enemy.pos.y,
      { type: 'drift', spin: rngRange(state.rng, -ASTEROIDS.spin, ASTEROIDS.spin) }, { counted: false });
    if (c) c.vel = v;
  }
}
