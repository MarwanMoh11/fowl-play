// src/sim/bosses/attacksShip.ts — OWNER: A2. Egg Carrier attack set: turret_burst, hatch, spiral (§7.13).
import { emit } from '../events';
import { spawnEnemy } from '../enemies';
import { deg } from '../math';
import { CARRIER, MINION } from '../tuning/bosses';
import {
  addHazard, aimAngle, attackVar, countEnemies, due, fireAt, ownHazards, setAttackVar, shotSpeed,
} from './common';
import type { Ctx } from './common';

export interface BurstOpts { turretDx: readonly number[]; turretDy: number; speedMul: number }

/** 5 bursts; every turret fires one aimed shot per burst. */
export function turretBurst(c: Ctx, o: BurstOpts): boolean {
  const b = CARRIER.burst;
  const bursts = due(c.rt, 'burst', c.rt.attackT, b.interval, b.count);
  for (let i = 0; i < bursts; i++) {
    for (const dx of o.turretDx) {
      const x = c.e.pos.x + dx;
      const y = c.e.pos.y + o.turretDy;
      fireAt(c.state, 'enemy_shot', x, y, aimAngle(c.state, x, y), shotSpeed(c.state, b.speed, o.speedMul));
      emit(c.state, { type: 'enemy_shot', x, y });
    }
  }
  return c.rt.attackT >= b.count * b.interval;
}

function isHatchling(e: { kind: string; behavior: { type: string } }): boolean {
  return e.kind === 'chicken_basic' && e.behavior.type === 'stream';
}

/** Telegraphs the hatch, then releases stream chickens one by one (skipped when too many are alive). */
export function hatch(c: Ctx, offsetY: number): boolean {
  const h = CARRIER.hatch;
  const { rt, e, state } = c;
  const x = e.pos.x;
  if (rt.attackT === 0) {
    const full = countEnemies(state, isHatchling) >= h.cap;
    setAttackVar(rt, 'skip', full ? 1 : 0);
    addHazard(state, e, 'telegraph', { x, y: e.pos.y + offsetY }, { x, y: e.pos.y + offsetY + h.telegraphLength }, h.telegraphWidth, h.telegraph);
  }
  for (const t of ownHazards(state, e, 'telegraph')) {
    t.a.x = x;
    t.b.x = x;
    t.a.y = e.pos.y + offsetY;
    t.b.y = e.pos.y + offsetY + h.telegraphLength;
  }
  if (rt.attackT >= h.telegraph && attackVar(rt, 'skip') === 0) {
    const n = due(rt, 'rel', rt.attackT - h.telegraph, h.releaseInterval, h.count);
    for (let i = 0; i < n; i++) {
      const k = rt.data.hatched ?? 0;
      rt.data.hatched = k + 1;
      const m = MINION.hatchling;
      spawnEnemy(state, 'chicken_basic', x, e.pos.y + offsetY, {
        type: 'stream', dir: k % 2 === 0 ? 1 : -1, speed: m.speed, baseY: m.baseY, amp: m.amp, freq: m.freq, phase: 0,
      });
    }
  }
  return rt.attackT >= h.telegraph + h.count * h.releaseInterval;
}

/** A rotating stream of shots from the hull center; two opposite arms when `arms` is 2. */
export function spiral(c: Ctx, arms: number, speedMul: number): boolean {
  const s = CARRIER.spiral;
  const interval = 1 / s.shotsPerSec;
  const total = Math.round(s.duration * s.shotsPerSec);
  const n = due(c.rt, 'spiral', c.rt.attackT, interval, total);
  const firedBefore = attackVar(c.rt, 'spiral') - n;
  for (let j = 0; j < n; j++) {
    const base = deg(s.startDeg + s.stepDeg * (firedBefore + j));
    for (let arm = 0; arm < arms; arm++) {
      fireAt(c.state, 'enemy_shot', c.e.pos.x, c.e.pos.y, base + arm * Math.PI, shotSpeed(c.state, s.speed, speedMul));
    }
  }
  return c.rt.attackT >= s.duration;
}
