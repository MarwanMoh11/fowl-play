// src/sim/bosses/common.ts — OWNER: A2. Shared helpers for boss behaviors (§7.13).
import type { Enemy, GameState, Hazard, Projectile, ProjectileKind, Vec2 } from '../types';
import type { BossRuntime } from '../bosses.types';
import { DIFFICULTY } from '../difficulty';
import { emit } from '../events';
import { newId } from '../ids';
import { spawnProjectile } from '../projectiles';
import { MAX_HAZARDS } from '../tuning/core';

export interface Ctx { state: GameState; e: Enemy; rt: BossRuntime; dt: number }

export interface BossBehavior {
  /** Called once per body at spawn; `index` is the body number (twin hens: 0 and 1). */
  init(rt: BossRuntime, index: number, home: Vec2): void;
  cycle(rt: BossRuntime): readonly string[];
  /** Pause between the end of an attack and the next one (before the generic gapMul). */
  gap(rt: BossRuntime): number;
  /** Runs one tick of the named attack (first call has rt.attackT === 0). Returns true when it has finished. */
  runAttack(c: Ctx, name: string): boolean;
  /** Positions the boss after entry. */
  move(c: Ctx): void;
  onPhase(c: Ctx, phase: number): void;
  anim(c: Ctx): number;
}

const ATTACK_KEY = 'a_';

export function clearAttackData(rt: BossRuntime): void {
  for (const k of Object.keys(rt.data)) if (k.startsWith(ATTACK_KEY)) delete rt.data[k];
}

/**
 * Counts how many of `max` evenly spaced events (the first at t = 0) became due by time `t`
 * and have not been reported yet. State lives in rt.data under an attack-scoped key.
 */
export function due(rt: BossRuntime, key: string, t: number, interval: number, max: number): number {
  const k = ATTACK_KEY + key;
  const should = Math.min(max, Math.floor(t / interval + 1e-9) + 1);
  const done = rt.data[k] ?? 0;
  if (should <= done) return 0;
  rt.data[k] = should;
  return should - done;
}

/** Attack-scoped scratch value (cleared when the next attack starts). */
export function attackVar(rt: BossRuntime, key: string, fallback = 0): number {
  return rt.data[ATTACK_KEY + key] ?? fallback;
}

export function setAttackVar(rt: BossRuntime, key: string, v: number): void {
  rt.data[ATTACK_KEY + key] = v;
}

export function shotSpeed(state: GameState, base: number, mul = 1): number {
  return base * DIFFICULTY[state.difficulty].shotSpeed * mul;
}

/** Angle from (x, y) to the player's current position; straight down (π/2) if the player is dead. */
export function aimAngle(state: GameState, x: number, y: number): number {
  const p = state.player;
  return p.alive ? Math.atan2(p.pos.y - y, p.pos.x - x) : Math.PI / 2;
}

export function fireAt(
  state: GameState, kind: ProjectileKind, x: number, y: number, angle: number, speed: number,
): Projectile | null {
  return spawnProjectile(state, {
    kind, owner: 'enemy', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
  });
}

/** Moves the boss to (x, y) and keeps vel in sync (render hint). */
export function setPos(e: Enemy, x: number, y: number, dt: number): void {
  e.vel.x = dt > 0 ? (x - e.pos.x) / dt : 0;
  e.vel.y = dt > 0 ? (y - e.pos.y) / dt : 0;
  e.pos.x = x;
  e.pos.y = y;
}

/** Telegraphs emit a `telegraph` event. Returns null when the hazard cap is reached. */
export function addHazard(
  state: GameState, e: Enemy, kind: 'telegraph' | 'beam', a: Vec2, b: Vec2, width: number, ttl: number,
): Hazard | null {
  if (state.hazards.length >= MAX_HAZARDS) return null;
  const h: Hazard = {
    id: newId(state), kind, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, width, ttl,
    lethal: kind === 'beam', alive: true, ownerId: e.id, power: 0,
  };
  state.hazards.push(h);
  if (kind === 'telegraph') emit(state, { type: 'telegraph', x: a.x, y: a.y });
  return h;
}

export function ownHazards(state: GameState, e: Enemy, kind?: 'telegraph' | 'beam'): Hazard[] {
  return state.hazards.filter((h) => h.alive && h.ownerId === e.id && (kind === undefined || h.kind === kind));
}

export function killHazards(state: GameState, ownerId?: number, kind?: 'telegraph' | 'beam'): void {
  for (const h of state.hazards) {
    if ((ownerId === undefined || h.ownerId === ownerId) && (kind === undefined || h.kind === kind)) h.alive = false;
  }
}

export function countEnemies(state: GameState, pred: (e: Enemy) => boolean): number {
  let n = 0;
  for (const e of state.enemies) if (e.alive && pred(e)) n++;
  return n;
}

export function isMinion(e: Enemy): boolean {
  const t = e.behavior.type;
  return !e.isBoss && (t === 'seek' || t === 'lane' || t === 'stream');
}

export function easeInQuad(t: number): number {
  return t * t;
}
