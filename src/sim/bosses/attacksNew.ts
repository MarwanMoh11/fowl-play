// src/sim/bosses/attacksNew.ts — OWNER: H2. Shared HENPOCALYPSE boss helpers: spirals, fans, rings, rain,
// summons, gravity wells and movement paths. Angles are degrees at call sites, radians inside.
import type { Enemy, EnemyKind, GameState, Hazard, ProjectileKind } from '../types';
import type { BehaviorState } from '../behaviors.types';
import { emit } from '../events';
import { spawnEnemy } from '../enemies';
import { deg, clamp } from '../math';
import { rngInt } from '../rng';
import { spawnProjectile } from '../projectiles';
import { BOSS_DEFS } from '../tuning/bosses';
import { EGG, PROJECTILE_DEFS } from '../tuning/weapons';
import {
  addHazard, aimAngle, attackVar, countEnemies, due, fireAt, setAttackVar, setPos, shotSpeed,
} from './common';
import type { Ctx } from './common';

const TAU = Math.PI * 2;

/** Fan of `count` shots spread evenly over ±half (radians) around `center` (radians). */
function fanShots(c: Ctx, kind: ProjectileKind, count: number, center: number, half: number, speed: number): void {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : -1 + (2 * i) / (count - 1);
    fireAt(c.state, kind, c.e.pos.x, c.e.pos.y, center + t * half, speed);
  }
}

export interface FanOpts { kind: ProjectileKind; count: number; volleys: number; interval: number; speed: number }

/** Aimed fan: `count` shots over ±halfSpreadDeg around the player, re-aimed at every volley. */
export function aimedFan(c: Ctx, o: FanOpts & { halfSpreadDeg: number }): boolean {
  const n = due(c.rt, 'aim', c.rt.attackT, o.interval, o.volleys);
  for (let v = 0; v < n; v++) {
    const aim = aimAngle(c.state, c.e.pos.x, c.e.pos.y);
    fanShots(c, o.kind, o.count, aim, deg(o.halfSpreadDeg), shotSpeed(c.state, o.speed));
  }
  return c.rt.attackT >= o.volleys * o.interval;
}

/** Fixed fan from fromDeg to toDeg (count shots), repeated `volleys` times. */
export function fixedFan(c: Ctx, o: FanOpts & { fromDeg: number; toDeg: number }): boolean {
  const n = due(c.rt, 'fan', c.rt.attackT, o.interval, o.volleys);
  for (let v = 0; v < n; v++) {
    const center = deg((o.fromDeg + o.toDeg) / 2);
    fanShots(c, o.kind, o.count, center, deg((o.toDeg - o.fromDeg) / 2), shotSpeed(c.state, o.speed));
  }
  return c.rt.attackT >= o.volleys * o.interval;
}

/** Rotating stream: each event fires one shot per arm, and the aim turns stepDeg per event. */
export interface SpiralOpts {
  kind: ProjectileKind; arms: number; eventsPerSec: number; duration: number; speed: number; startDeg: number; stepDeg: number;
}

export function spiralStream(c: Ctx, o: SpiralOpts): boolean {
  const n = due(c.rt, 'spiral', c.rt.attackT, 1 / o.eventsPerSec, Math.round(o.duration * o.eventsPerSec));
  const first = attackVar(c.rt, 'spiral') - n;
  const v = shotSpeed(c.state, o.speed);
  for (let j = 0; j < n; j++) {
    const base = o.startDeg + o.stepDeg * (first + j);
    for (let arm = 0; arm < o.arms; arm++) {
      fireAt(c.state, o.kind, c.e.pos.x, c.e.pos.y, deg(base + (360 * arm) / o.arms), v);
    }
  }
  return c.rt.attackT >= o.duration;
}

/** A ring of `count` shots plus a 2-slot gap at a random slot, so every ring can be dodged. */
export function fireRing(c: Ctx, kind: ProjectileKind, count: number, offsetDeg: number, speed: number): void {
  const slots = count + 2;
  const gapAt = rngInt(c.state.rng, 0, slots - 1);
  for (let i = 0; i < slots; i++) {
    if ((i - gapAt + slots) % slots < 2) continue;
    fireAt(c.state, kind, c.e.pos.x, c.e.pos.y, deg(offsetDeg + (360 * i) / slots), speed);
  }
}

export interface RingOpts {
  kind: ProjectileKind; count: number; rings: number; interval: number; speed: number; stepDeg: number; alternate?: boolean;
}

/** Repeated rings, each turned stepDeg from the last (odd rings half a slot further when `alternate`). */
export function ringBurst(c: Ctx, o: RingOpts): boolean {
  const n = due(c.rt, 'ring', c.rt.attackT, o.interval, o.rings);
  const first = attackVar(c.rt, 'ring') - n;
  for (let j = 0; j < n; j++) {
    const k = first + j;
    const half = o.alternate && k % 2 === 1 ? 180 / (o.count + 2) : 0;
    fireRing(c, o.kind, o.count, o.stepDeg * k + half, shotSpeed(c.state, o.speed));
  }
  return c.rt.attackT >= o.rings * o.interval;
}

/** `count` shots on a circle around the boss that move inward; a `gapSlots` gap sits on the player's side. */
export function inwardRing(c: Ctx, o: { kind: ProjectileKind; count: number; radius: number; speed: number; gapSlots: number }): void {
  const { state, e } = c;
  const slots = o.count + o.gapSlots;
  const aim = aimAngle(state, e.pos.x, e.pos.y);
  const step = TAU / slots;
  const gapAt = Math.round((((aim % TAU) + TAU) % TAU) / step) % slots;
  const half = Math.floor(o.gapSlots / 2);
  const v = shotSpeed(state, o.speed);
  for (let i = 0; i < slots; i++) {
    const rel = (i - gapAt + slots) % slots;
    if (Math.min(rel, slots - rel) <= half) continue;
    const cos = Math.cos(i * step);
    const sin = Math.sin(i * step);
    spawnProjectile(state, {
      kind: o.kind, owner: 'enemy', x: e.pos.x + cos * o.radius, y: e.pos.y + sin * o.radius, vx: -cos * v, vy: -sin * v,
    });
  }
}

/** Fires one homing shot per angle (degrees) from the boss. */
export function homingShots(c: Ctx, kind: ProjectileKind, anglesDeg: readonly number[], speed: number, homing: number): void {
  const v = shotSpeed(c.state, speed);
  for (const a of anglesDeg) {
    spawnProjectile(c.state, {
      kind, owner: 'enemy', x: c.e.pos.x, y: c.e.pos.y, vx: Math.cos(deg(a)) * v, vy: Math.sin(deg(a)) * v, homing,
    });
  }
}

/** Falling eggs at `rate` per second; `xOf` gives each egg's x (null skips that egg). */
export function rain(c: Ctx, key: string, rate: number, xOf: () => number | null, y: number): void {
  const acc = attackVar(c.rt, key) + rate * c.dt;
  const n = Math.floor(acc);
  setAttackVar(c.rt, key, acc - n);
  for (let i = 0; i < n; i++) {
    const x = xOf();
    if (x === null) continue;
    spawnProjectile(c.state, { kind: 'egg', owner: 'enemy', x, y, vx: 0, vy: EGG.startVy });
    emit(c.state, { type: 'egg_dropped', x, y });
  }
}

/** Turns up to `max` enemy shots on screen (eggs excepted) into homing void orbs at `speed`. */
export function swallowShots(state: GameState, max: number, speed: number, homing: number): number {
  let n = 0;
  for (const p of state.projectiles) {
    if (n >= max) break;
    if (!p.alive || p.owner !== 'enemy' || p.kind === 'egg' || p.kind === 'void_orb') continue;
    if (p.pos.x < 0 || p.pos.x > 1280 || p.pos.y < 0 || p.pos.y > 720) continue;
    const sp = Math.hypot(p.vel.x, p.vel.y) || 1;
    p.kind = 'void_orb';
    p.radius = PROJECTILE_DEFS.void_orb.radius;
    p.homing = homing;
    p.vel.x = (p.vel.x / sp) * speed;
    p.vel.y = (p.vel.y / sp) * speed;
    n++;
  }
  return n;
}

/** Spawns a minion owned by `parent`; minions never count toward the wave spawn plan. */
export function spawnMinion(
  state: GameState, parent: Enemy, kind: EnemyKind, x: number, y: number, b: BehaviorState,
): Enemy | null {
  const m = spawnEnemy(state, kind, x, y, b, { counted: false });
  if (m) m.parentId = parent.id;
  return m;
}

export function countMinions(state: GameState, parent: Enemy, kind: EnemyKind): number {
  return countEnemies(state, (o) => o.kind === kind && o.parentId === parent.id);
}

/** Seeking chicks fanned out from the boss, at most `cap` alive per boss. */
export function summonSeekers(c: Ctx, count: number, cap: number, speed: number, turnRate: number): void {
  const n = Math.min(count, cap - countMinions(c.state, c.e, 'chick'));
  for (let i = 0; i < n; i++) {
    const x = c.e.pos.x + (i - (n - 1) / 2) * 30;
    spawnMinion(c.state, c.e, 'chick', x, c.e.pos.y + 40, { type: 'seek', speed, turnRate, heading: TAU / 4 });
  }
}

/** Keeps one gravity well on the boss: refreshes it when present, otherwise adds it. */
export function gravityWell(state: GameState, e: Enemy, radius: number, power: number, ttl: number): Hazard | null {
  const own = state.hazards.find((h) => h.alive && h.kind === 'gravity' && h.ownerId === e.id);
  if (own) {
    own.a.x = e.pos.x;
    own.a.y = e.pos.y;
    own.b.x = e.pos.x;
    own.b.y = e.pos.y;
    own.width = radius;
    own.power = power;
    own.ttl = ttl;
    return own;
  }
  return addHazard(state, e, 'gravity', e.pos, e.pos, radius, ttl, power);
}

/**
 * Figure path around (cx, cy), clocked from the end of entry so the boss starts at (cx, cy):
 * x = cx + ax sin(2πt/px), y = cy + ay sin(2πt/py).
 */
export function lissajou(c: Ctx, cx: number, cy: number, ax: number, px: number, ay: number, py: number): void {
  const t = c.rt.t - BOSS_DEFS[c.rt.id].entry;
  setPos(c.e, cx + ax * Math.sin((TAU * t) / px), cy + ay * Math.sin((TAU * t) / py), c.dt);
}

/** Bounces between minX and maxX at `speed` px/s, holding height y. */
export function patrol(c: Ctx, y: number, minX: number, maxX: number, speed: number): void {
  const { rt, e, dt } = c;
  let dir = rt.data.dx ?? 1;
  let x = e.pos.x + dir * speed * dt;
  if (x > maxX) {
    x = maxX;
    dir = -1;
  } else if (x < minX) {
    x = minX;
    dir = 1;
  }
  rt.data.dx = dir;
  setPos(e, clamp(x, minX, maxX), y, dt);
}

/** Radial burst of `count` shots, evenly spaced and turned by offsetDeg (no gap). */
export function radialBurst(c: Ctx, kind: ProjectileKind, count: number, offsetDeg: number, speed: number): void {
  for (let i = 0; i < count; i++) {
    fireAt(c.state, kind, c.e.pos.x, c.e.pos.y, deg(offsetDeg + (360 * i) / count), shotSpeed(c.state, speed));
  }
}
