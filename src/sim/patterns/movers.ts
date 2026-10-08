// src/sim/patterns/movers.ts — OWNER: A3. Free-flying behaviors: seek, stream, lane (UFO), swarm, aimed shots.
import type { Enemy, GameState } from '../types';
import type { BehaviorState } from '../behaviors.types';
import { emit } from '../events';
import { chapterScale, DIFFICULTY } from '../difficulty';
import { clamp, fromAngle, norm } from '../math';
import { rngRange } from '../rng';
import { spawnProjectile } from '../projectiles';
import { AIMED_SHOT, OFFSCREEN, STREAM, SWARM, UFO } from '../tuning/enemies';
import { groupOf, moveTo } from './common';

type Of<T extends BehaviorState['type']> = Extract<BehaviorState, { type: T }>;

/** Aimed `enemy_shot` at the player's current position (§7.6.2). No shot when the player is dead. */
export function fireAimedShot(state: GameState, e: Enemy): boolean {
  const pl = state.player;
  if (!pl.alive) return false;
  const d = norm({ x: pl.pos.x - e.pos.x, y: pl.pos.y - e.pos.y });
  const dir = d.x === 0 && d.y === 0 ? { x: 0, y: 1 } : d;
  const speed = AIMED_SHOT.speed * DIFFICULTY[state.difficulty].shotSpeed * chapterScale(state.chapter).speed;
  const p = spawnProjectile(state, {
    kind: 'enemy_shot', owner: 'enemy', x: e.pos.x, y: e.pos.y, vx: dir.x * speed, vy: dir.y * speed,
  });
  if (p) emit(state, { type: 'enemy_shot', x: e.pos.x, y: e.pos.y });
  return p !== null;
}

function onScreen(e: Enemy): boolean {
  const { x, y } = e.pos;
  return x >= AIMED_SHOT.screenMinX && x <= AIMED_SHOT.screenMaxX && y >= AIMED_SHOT.screenMinY && y <= AIMED_SHOT.screenMaxY;
}

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

/** Shared (A2 brood chicks): heading turns toward the player at turnRate; leaving the screen removes silently. */
export function updateSeek(state: GameState, e: Enemy, b: Of<'seek'>, dt: number): void {
  const pl = state.player;
  if (pl.alive) {
    const want = Math.atan2(pl.pos.y - e.pos.y, pl.pos.x - e.pos.x);
    const maxTurn = b.turnRate * dt;
    b.heading += clamp(wrapAngle(want - b.heading), -maxTurn, maxTurn);
  }
  const v = fromAngle(b.heading, b.speed);
  e.vel.x = v.x;
  e.vel.y = v.y;
  e.pos.x += v.x * dt;
  e.pos.y += v.y * dt;
  e.canDropEggs = false;
  const p = e.pos;
  if (p.x < OFFSCREEN.minX || p.x > OFFSCREEN.maxX || p.y < OFFSCREEN.minY || p.y > OFFSCREEN.maxY) e.alive = false;
}

/** Sine-wave stream (§7.11); also used by A2 hatchlings. Loops until killed. */
export function updateStream(e: Enemy, b: Of<'stream'>, dt: number): void {
  const x = e.pos.x + b.dir * b.speed * dt;
  const target = b.baseY + b.amp * Math.sin(b.freq * x + b.phase);
  const y = e.pos.y + clamp(target - e.pos.y, -STREAM.yFollow * dt, STREAM.yFollow * dt);
  moveTo(e, x, y, dt);
  e.canDropEggs = true;
  const past = b.dir === 1 ? x > STREAM.rightX : x < STREAM.leftX;
  if (past) {
    b.dir = b.dir === 1 ? -1 : 1;
    b.baseY += STREAM.rowStep;
    if (b.baseY > STREAM.maxBaseY) b.baseY = STREAM.resetBaseY;
  }
}

/** UFO lane patrol (§7.11); shared with A2 escorts. Ping-pongs between x = 80 and 1200 and shoots. */
export function updateLane(state: GameState, e: Enemy, b: Of<'lane'>, dt: number): void {
  b.shotTimer -= dt;
  if (b.shotTimer <= 0 && onScreen(e)) {
    fireAimedShot(state, e);
    b.shotTimer = rngRange(state.rng, AIMED_SHOT.gapMin, AIMED_SHOT.gapMax);
  }
  const x = e.pos.x + b.dir * b.speed * dt;
  if (b.dir === 1 && x >= UFO.maxX) b.dir = -1;
  else if (b.dir === -1 && x <= UFO.minX) b.dir = 1;
  const y = e.pos.y + clamp(b.laneY - e.pos.y, -UFO.laneFollow * dt, UFO.laneFollow * dt);
  moveTo(e, x, y, dt);
  e.canDropEggs = true;
}

/** Flock follow / kamikaze (§7.11). */
export function updateSwarm(state: GameState, e: Enemy, b: Of<'swarm'>, dt: number, speedScale: number): void {
  e.canDropEggs = false;
  if (b.mode === 'kamikaze') {
    const v = SWARM.kamikazeSpeed * speedScale;
    e.vel.x = b.dir.x * v;
    e.vel.y = b.dir.y * v;
    e.pos.x += e.vel.x * dt;
    e.pos.y += e.vel.y * dt;
    if (e.pos.y > SWARM.respawnBelowY || e.pos.x < OFFSCREEN.minX - 20 || e.pos.x > OFFSCREEN.maxX + 20) {
      e.pos.y = SWARM.spawnY;
      e.pos.x = clamp(e.pos.x, SWARM.spawnMinX, SWARM.spawnMaxX);
      e.vel.x = 0;
      e.vel.y = 0;
      b.mode = 'follow';
    }
    return;
  }
  const g = b.group === undefined ? undefined : groupOf(state, b.group);
  const t = g ? g.t : e.age;
  const L = SWARM.leader;
  const tx = L.x + L.xAmp * Math.sin(L.xFreq * t) + b.offset.x;
  const ty = L.y + L.yAmp * Math.sin(L.yFreq * t + L.yPhase) + b.offset.y;
  const to = { x: tx - e.pos.x, y: ty - e.pos.y };
  const dist = Math.hypot(to.x, to.y);
  const maxSpeed = SWARM.maxSpeed * speedScale;
  const want = Math.min(maxSpeed, dist * SWARM.arriveGain);
  const dir = norm(to);
  const dvx = dir.x * want - e.vel.x;
  const dvy = dir.y * want - e.vel.y;
  const dv = Math.hypot(dvx, dvy);
  const step = SWARM.maxAccel * speedScale * dt;
  const k = dv > step ? step / dv : 1;
  e.vel.x += dvx * k;
  e.vel.y += dvy * k;
  e.pos.x += e.vel.x * dt;
  e.pos.y += e.vel.y * dt;
}
