// src/sim/bosses/attacksRooster.ts — OWNER: A2. Rooster Commander attack set: dive, laser_sweep, feather_ring (§7.13).
import type { Hazard, Vec2 } from '../types';
import { deg, easeInOutSine, lerp } from '../math';
import { ROOSTER } from '../tuning/bosses';
import {
  addHazard, attackVar, due, easeInQuad, fireAt, ownHazards, setAttackVar, setPos, shotSpeed,
} from './common';
import type { Ctx } from './common';

/** Position on the idle figure-8 for path clock `pt`. */
export function roosterPath(pt: number): Vec2 {
  const p = ROOSTER.path;
  return { x: p.cx + p.ampX * Math.sin(p.freqX * pt), y: p.cy + p.ampY * Math.sin(p.freqY * pt) };
}

const DIVE_END = ROOSTER.dive.waitUntil + ROOSTER.dive.diveTime + ROOSTER.dive.hold + ROOSTER.dive.returnTime;

/** Dive attack: telegraph, slide over the player's column, wait, plunge, hold, return to the figure-8. */
export function dive(c: Ctx): boolean {
  const d = ROOSTER.dive;
  const { rt, e, state } = c;
  if (rt.attackT === 0) {
    const tx = state.player.pos.x;
    setAttackVar(rt, 'tx', tx);
    setAttackVar(rt, 'sx', e.pos.x);
    setAttackVar(rt, 'sy', e.pos.y);
    addHazard(state, e, 'telegraph', { x: tx, y: e.pos.y }, { x: tx, y: d.endY }, d.telegraphWidth, d.telegraphTtl);
  }
  return rt.attackT >= DIVE_END;
}

/** Boss position while the dive attack is running (called by the rooster's move). */
export function divePosition(c: Ctx): void {
  const d = ROOSTER.dive;
  const { rt, e, dt } = c;
  const t = rt.attackT;
  const tx = attackVar(rt, 'tx');
  const sx = attackVar(rt, 'sx');
  const sy = attackVar(rt, 'sy');
  const diveEnd = d.waitUntil + d.diveTime;
  const holdEnd = diveEnd + d.hold;
  if (t < d.slide) {
    setPos(e, lerp(sx, tx, easeInOutSine(t / d.slide)), sy, dt);
  } else if (t < d.waitUntil) {
    setPos(e, tx, sy, dt);
  } else if (t < diveEnd) {
    setPos(e, tx, lerp(sy, d.diveY, easeInQuad((t - d.waitUntil) / d.diveTime)), dt);
  } else if (t < holdEnd) {
    setPos(e, tx, d.diveY, dt);
  } else {
    rt.data.pt = (rt.data.pt ?? 0) + dt;                       // the figure-8 clock resumes during the return
    const u = easeInOutSine(Math.min(1, (t - holdEnd) / d.returnTime));
    const target = roosterPath(rt.data.pt);
    setPos(e, lerp(tx, target.x, u), lerp(d.diveY, target.y, u), dt);
  }
}

export interface SweepOpts { mirrored: boolean; beakDy: number }

function beamEnd(a: Vec2, angleDeg: number): Vec2 {
  const len = ROOSTER.sweep.beamLength;
  return { x: a.x + Math.cos(deg(angleDeg)) * len, y: a.y + Math.sin(deg(angleDeg)) * len };
}

function updateBeams(beams: Hazard[], beak: Vec2, u: number, dir: number): void {
  const s = ROOSTER.sweep;
  beams.forEach((h, k) => {
    const forward = (k === 0 ? dir : -dir) > 0;
    const angle = forward ? lerp(s.fromDeg, s.toDeg, u) : lerp(s.toDeg, s.fromDeg, u);
    h.a.x = beak.x;
    h.a.y = beak.y;
    const b = beamEnd(beak, angle);
    h.b.x = b.x;
    h.b.y = b.y;
  });
}

/** Thin telegraph, then a lethal beam (two mirrored beams when `mirrored`) sweeping 60° to 120°. */
export function laserSweep(c: Ctx, o: SweepOpts): boolean {
  const s = ROOSTER.sweep;
  const { rt, e, state } = c;
  const beak = { x: e.pos.x, y: e.pos.y + o.beakDy };
  if (rt.attackT === 0) {
    const dir = rt.data.sweepDir ?? 1;
    rt.data.sweepDir = -dir;                                    // alternate direction each time
    setAttackVar(rt, 'dir', dir);
    addHazard(state, e, 'telegraph', beak, beamEnd(beak, 90), s.telegraphWidth, s.telegraphTime);
  }
  if (rt.attackT >= s.telegraphTime) {
    if (attackVar(rt, 'beams') === 0) {
      setAttackVar(rt, 'beams', 1);
      const count = o.mirrored ? 2 : 1;
      for (let i = 0; i < count; i++) addHazard(state, e, 'beam', beak, beamEnd(beak, 90), s.beamWidth, s.duration);
    }
    const u = Math.min(1, (rt.attackT - s.telegraphTime) / s.duration);
    updateBeams(ownHazards(state, e, 'beam'), beak, u, attackVar(rt, 'dir', 1));
  }
  return rt.attackT >= s.telegraphTime + s.duration;
}

/** Rings of feather knives expanding from the boss, each ring rotated a little further. */
export function featherRing(c: Ctx, knives: number): boolean {
  const r = ROOSTER.ring;
  const first = attackVar(c.rt, 'ring');
  const n = due(c.rt, 'ring', c.rt.attackT, r.interval, r.rings);
  for (let j = 0; j < n; j++) {
    const ringIndex = first + j;
    for (let i = 0; i < knives; i++) {
      const a = deg((360 * i) / knives + r.stepDeg * ringIndex);
      fireAt(c.state, 'feather_knife', c.e.pos.x, c.e.pos.y, a, shotSpeed(c.state, r.speed));
    }
  }
  return c.rt.attackT >= r.rings * r.interval;
}
