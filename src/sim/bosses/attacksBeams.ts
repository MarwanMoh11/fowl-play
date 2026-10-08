// src/sim/bosses/attacksBeams.ts — OWNER: H2. Telegraphed beams: full-height column strikes and angled lines
// that follow the boss and may sweep. Every beam is preceded by a telegraph of at least its own teleT.
import type { Hazard, Vec2 } from '../types';
import { deg } from '../math';
import { addHazard, attackVar, killHazards, ownHazards, setAttackVar } from './common';
import type { Ctx } from './common';

export const SCREEN_H = 720;

/** Start times `count` items spaced `spacing` apart, the first at 0. */
export function spaced(count: number, spacing: number): number[] {
  return Array.from({ length: count }, (_, i) => i * spacing);
}

export interface StrikeOpts { t0: readonly number[]; xOf: (i: number) => number; teleT: number; beamT: number; teleWidth: number; beamWidth: number }

/**
 * Full-height column strikes. Strike i starts at t0[i]: its x is taken from xOf when its telegraph starts
 * (and then locked), it shows a telegraph for teleT, then a lethal beam for beamT.
 */
export function strikeColumns(c: Ctx, o: StrikeOpts): boolean {
  const { rt, e, state } = c;
  let done = true;
  o.t0.forEach((t0, i) => {
    const stage = attackVar(rt, 'st' + i);
    if (stage === 0 && rt.attackT >= t0) {
      const x = o.xOf(i);
      setAttackVar(rt, 'x' + i, x);
      setAttackVar(rt, 'st' + i, 1);
      addHazard(state, e, 'telegraph', { x, y: 0 }, { x, y: SCREEN_H }, o.teleWidth, o.teleT);
    } else if (stage === 1 && rt.attackT >= t0 + o.teleT) {
      const x = attackVar(rt, 'x' + i);
      setAttackVar(rt, 'st' + i, 2);
      addHazard(state, e, 'beam', { x, y: 0 }, { x, y: SCREEN_H }, o.beamWidth, o.beamT);
    }
    if (rt.attackT < t0 + o.teleT + o.beamT) done = false;
  });
  return done;
}

export interface LineOpts {
  /** Start angles in degrees, one per line. */
  angles: readonly number[];
  /** Sweep speed in deg/s per line (default 0). */
  rates?: readonly number[];
  /** Optional full angle function (degrees) of line k at t seconds into the beam stage; replaces angles/rates. */
  angleAt?: (k: number, t: number) => number;
  length: number;
  /** Extra y offset of the origin from the boss centre. */
  dy?: number;
  teleT: number;
  beamT: number;
  teleWidth: number;
  beamWidth: number;
}

function endOf(from: Vec2, angleDeg: number, len: number): Vec2 {
  const a = deg(angleDeg);
  return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
}

function angleOf(o: LineOpts, k: number, t: number): number {
  if (o.angleAt) return o.angleAt(k, t);
  return o.angles[k] + (o.rates?.[k] ?? 0) * t;
}

function placeLines(hs: Hazard[], from: Vec2, o: LineOpts, t: number): void {
  hs.forEach((h, k) => {
    const end = endOf(from, angleOf(o, k, t), o.length);
    h.a.x = from.x;
    h.a.y = from.y;
    h.b.x = end.x;
    h.b.y = end.y;
  });
}

/**
 * Telegraph lines from the boss for teleT (they follow the boss), then lethal beams for beamT that sweep
 * by rates / angleAt. Returns true once the beam stage has finished.
 */
export function lineBeams(c: Ctx, o: LineOpts): boolean {
  const { rt, e, state } = c;
  const from = { x: e.pos.x, y: e.pos.y + (o.dy ?? 0) };
  const beaming = attackVar(rt, 'st') === 1;
  if (!beaming && rt.attackT < o.teleT) {
    if (rt.attackT === 0) {
      killHazards(state, e.id, 'telegraph');
      o.angles.forEach((_, k) => addHazard(state, e, 'telegraph', from, endOf(from, angleOf(o, k, 0), o.length), o.teleWidth, o.teleT));
    }
    placeLines(ownHazards(state, e, 'telegraph'), from, o, 0);
    return false;
  }
  if (!beaming) {
    setAttackVar(rt, 'st', 1);
    killHazards(state, e.id, 'telegraph');
    o.angles.forEach((_, k) => addHazard(state, e, 'beam', from, endOf(from, angleOf(o, k, 0), o.length), o.beamWidth, o.beamT));
  }
  placeLines(ownHazards(state, e, 'beam'), from, o, rt.attackT - o.teleT);
  return rt.attackT >= o.teleT + o.beamT;
}
