// src/sim/math.ts — OWNER: A1. Pure math helpers. Angles in radians, y points down.
import type { Vec2 } from './types';
import type { CubicPath } from './behaviors.types';

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt(dist2(a, b));
}

export function len(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Unit vector; zero vector stays zero. */
export function norm(v: Vec2): Vec2 {
  const l = len(v);
  return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
}

export function angleOf(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

export function fromAngle(a: number, length: number): Vec2 {
  return { x: Math.cos(a) * length, y: Math.sin(a) * length };
}

/** Moves cur toward target by at most maxDelta (maxDelta ≥ 0). */
export function approach(cur: number, target: number, maxDelta: number): number {
  if (cur < target) return Math.min(cur + maxDelta, target);
  return Math.max(cur - maxDelta, target);
}

export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function cubicBezier(p: CubicPath, t: number): Vec2 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p.p0.x + b * p.p1.x + c * p.p2.x + d * p.p3.x,
    y: a * p.p0.y + b * p.p1.y + c * p.p2.y + d * p.p3.y,
  };
}

/** True if a circle (c, r) touches the thick segment a→b of half-width halfWidth. */
export function segmentCircleHit(a: Vec2, b: Vec2, halfWidth: number, c: Vec2, r: number): boolean {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  let t = l2 > 0 ? ((c.x - a.x) * abx + (c.y - a.y) * aby) / l2 : 0;
  t = clamp(t, 0, 1);
  const px = a.x + abx * t;
  const py = a.y + aby * t;
  const rr = halfWidth + r;
  const dx = c.x - px;
  const dy = c.y - py;
  return dx * dx + dy * dy <= rr * rr;
}

/** Degrees → radians (90° = straight down). */
export function deg(d: number): number {
  return (d * Math.PI) / 180;
}
