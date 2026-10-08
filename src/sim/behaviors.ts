// src/sim/behaviors.ts — OWNER: A3. Per-enemy movement dispatch (§7.11). Group anchors are updated by the wave spawner.
import type { Enemy, GameState } from './types';
import type { BehaviorState } from './behaviors.types';
import type { GroupRuntime } from './waves.types';
import { cubicBezier, deg, easeOutCubic, fromAngle, lerp } from './math';
import { rngRange } from './rng';
import { ASTEROIDS, BOUNCE, BOUNCE_WOBBLE, DIVERS, FORMATION_BOB, RING } from './tuning/enemies';
import { groupOf, moveTo } from './patterns/common';
import { updateLane, updateSeek, updateStream, updateSwarm } from './patterns/movers';

type Of<T extends BehaviorState['type']> = Extract<BehaviorState, { type: T }>;

/** World position of a ring member for the group's current state. */
export function ringPosition(g: GroupRuntime, b: Of<'ring'>): { x: number; y: number } {
  const entry = g.data.entry ?? 1;
  const radius = lerp(RING.entryRadius, b.radiusTarget, easeOutCubic(entry)) + (g.data.pulse ?? 0);
  const ang = (2 * Math.PI * b.index) / b.count + b.omega * g.t;
  return { x: g.anchor.x + Math.cos(ang) * radius, y: g.anchor.y + Math.sin(ang) * radius };
}

/** World position a formation slot currently occupies (no per-member bob). */
export function slotWorld(g: GroupRuntime, slot: { x: number; y: number }): { x: number; y: number } {
  return { x: g.anchor.x + slot.x, y: g.anchor.y + slot.y };
}

function formation(state: GameState, e: Enemy, b: Of<'formation'>, dt: number): void {
  const g = groupOf(state, b.group);
  if (!g) return;
  const bob = FORMATION_BOB.amp * Math.sin(FORMATION_BOB.freq * e.age + e.id);
  moveTo(e, g.anchor.x + b.slot.x, g.anchor.y + b.slot.y + bob, dt);
  e.canDropEggs = g.data.entered === 1;
}

function enterPath(e: Enemy, b: Of<'enter_path'>, dt: number): void {
  b.t += dt;
  const u = Math.min(1, b.t / b.duration);
  const p = cubicBezier(b.path, u);
  moveTo(e, p.x, p.y, dt);
  e.canDropEggs = false;
  if (u >= 1) e.behavior = { type: 'formation', group: b.group, slot: b.slot };
}

function dive(state: GameState, e: Enemy, b: Of<'dive'>, dt: number): void {
  b.t += dt;
  const u = Math.min(1, b.t / b.duration);
  const p = cubicBezier(b.path, u);
  moveTo(e, p.x, p.y, dt);
  e.canDropEggs = true;
  if (u < 1) return;
  const g = groupOf(state, b.group);
  const x = g ? g.anchor.x + b.slot.x : e.pos.x;
  e.pos.x = x;
  e.pos.y = DIVERS.reappearY;
  e.vel.x = 0;
  e.vel.y = 0;
  e.behavior = {
    type: 'return', from: { x, y: DIVERS.reappearY }, t: 0, duration: DIVERS.returnDuration, group: b.group, slot: b.slot,
  };
}

function returnToSlot(state: GameState, e: Enemy, b: Of<'return'>, dt: number): void {
  b.t += dt;
  const u = Math.min(1, b.t / b.duration);
  const g = groupOf(state, b.group);
  const target = g ? slotWorld(g, b.slot) : b.from;
  moveTo(e, lerp(b.from.x, target.x, u), lerp(b.from.y, target.y, u), dt);
  e.canDropEggs = false;
  if (u >= 1) e.behavior = { type: 'formation', group: b.group, slot: b.slot };
}

function ring(state: GameState, e: Enemy, b: Of<'ring'>, dt: number): void {
  const g = groupOf(state, b.group);
  if (!g) return;
  const p = ringPosition(g, b);
  moveTo(e, p.x, p.y, dt);
  e.canDropEggs = g.data.entered === 1;
}

function launchBouncer(state: GameState, e: Enemy, speedScale: number): void {
  const angle = deg(rngRange(state.rng, BOUNCE.angleMin, BOUNCE.angleMax));
  const v = fromAngle(angle, rngRange(state.rng, BOUNCE.speedMin, BOUNCE.speedMax) * speedScale);
  e.vel.x = v.x;
  e.vel.y = v.y;
}

function bounce(state: GameState, e: Enemy, b: Of<'bounce'>, dt: number, speedScale: number): void {
  e.rotation = BOUNCE_WOBBLE.amp * Math.sin(BOUNCE_WOBBLE.freq * e.age + e.id);
  if (b.entering) {
    e.vel.x = 0;
    e.vel.y = BOUNCE.enterSpeed * speedScale;
    e.pos.y += e.vel.y * dt;
    e.canDropEggs = false;
    if (e.pos.y > BOUNCE.ceilY + BOUNCE.activateOffset) {
      b.entering = false;
      launchBouncer(state, e, speedScale);
    }
    return;
  }
  e.canDropEggs = true;
  e.pos.x += e.vel.x * dt;
  e.pos.y += e.vel.y * dt;
  if (e.pos.x < BOUNCE.wallLeft) { e.pos.x = BOUNCE.wallLeft; e.vel.x = Math.abs(e.vel.x); }
  else if (e.pos.x > BOUNCE.wallRight) { e.pos.x = BOUNCE.wallRight; e.vel.x = -Math.abs(e.vel.x); }
  if (e.pos.y < BOUNCE.ceilY) { e.pos.y = BOUNCE.ceilY; e.vel.y = Math.abs(e.vel.y); }
  else if (e.pos.y > BOUNCE.floorY) { e.pos.y = BOUNCE.floorY; e.vel.y = -Math.abs(e.vel.y); }
}

function drift(e: Enemy, b: Of<'drift'>, dt: number): void {
  e.pos.x += e.vel.x * dt;
  e.pos.y += e.vel.y * dt;
  e.rotation += b.spin * dt;
  e.canDropEggs = false;
  const r = e.radius;
  const gone = (e.vel.x < 0 && e.pos.x < -r) || (e.vel.x > 0 && e.pos.x > ASTEROIDS.worldWidth + r)
    || e.pos.y > ASTEROIDS.worldHeight + r;
  if (gone) e.alive = false; // silent: no points, no drops
}

/** Moves one non-boss enemy for this tick and updates `vel`, `canDropEggs` and (for some) `rotation`. */
export function updateBehavior(state: GameState, e: Enemy, dt: number, speedScale: number): void {
  const b = e.behavior;
  switch (b.type) {
    case 'none':
    case 'boss':
      return;
    case 'formation': return formation(state, e, b, dt);
    case 'enter_path': return enterPath(e, b, dt);
    case 'dive': return dive(state, e, b, dt);
    case 'return': return returnToSlot(state, e, b, dt);
    case 'ring': return ring(state, e, b, dt);
    case 'bounce': return bounce(state, e, b, dt, speedScale);
    case 'drift': return drift(e, b, dt);
    case 'swarm': return updateSwarm(state, e, b, dt, speedScale);
    case 'seek': return updateSeek(state, e, b, dt);
    case 'stream': return updateStream(e, b, dt);
    case 'lane': return updateLane(state, e, b, dt);
  }
}
