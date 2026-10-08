// src/render/sprites/draw.ts — OWNER: A5. Shared canvas drawing helpers (no module-level canvas use).
import { OUTLINE_WIDTH, PAL } from './palette';
import type { Ctx } from './types';

export const TAU = Math.PI * 2;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return (v < 16 ? '0' : '') + v.toString(16);
}

export function mixColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return '#' + toHex(ar + (br - ar) * t) + toHex(ag + (bg - ag) * t) + toHex(ab + (bb - ab) * t);
}

export const lighten = (c: string, t: number): string => mixColor(c, '#FFFFFF', t);
export const darken = (c: string, t: number): string => mixColor(c, '#000000', t);

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** mulberry32: tiny deterministic PRNG for procedural shapes. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function strokeOutline(ctx: Ctx, lw: number = OUTLINE_WIDTH, color: string = PAL.outline): void {
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Fills the current path, then draws the dark outline. */
export function paint(ctx: Ctx, fill: string, lw: number = OUTLINE_WIDTH): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) strokeOutline(ctx, lw);
}

export function ellipsePath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
}

/** Plain outlined ellipse. */
export function ell(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0, lw: number = OUTLINE_WIDTH): void {
  ellipsePath(ctx, cx, cy, rx, ry, rot);
  paint(ctx, fill, lw);
}

export function circ(ctx: Ctx, cx: number, cy: number, r: number, fill: string, lw: number = OUTLINE_WIDTH): void {
  ell(ctx, cx, cy, r, r, fill, 0, lw);
}

/** Shaded ellipse: one shadow crescent at the bottom, one highlight patch, then the outline. */
export function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0, lw: number = OUTLINE_WIDTH): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ellipsePath(ctx, 0, 0, rx, ry);
  ctx.fillStyle = darken(fill, 0.2);
  ctx.fill();
  ellipsePath(ctx, 0, -ry * 0.12, rx * 0.97, ry * 0.88);
  ctx.fillStyle = fill;
  ctx.fill();
  ellipsePath(ctx, -rx * 0.3, -ry * 0.45, rx * 0.3, ry * 0.15, -0.4);
  ctx.fillStyle = rgba(lighten(fill, 0.7), 0.75);
  ctx.fill();
  ellipsePath(ctx, 0, 0, rx, ry);
  if (lw > 0) strokeOutline(ctx, lw);
  ctx.restore();
}

export function polyPath(ctx: Ctx, pts: readonly number[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

export function poly(ctx: Ctx, pts: readonly number[], fill: string, lw: number = OUTLINE_WIDTH): void {
  polyPath(ctx, pts);
  paint(ctx, fill, lw);
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, lw: number = OUTLINE_WIDTH): void {
  roundRectPath(ctx, x, y, w, h, r);
  paint(ctx, fill, lw);
}

/** Soft radial glow baked into a sprite: color at alpha in the centre fading to 0 at radius r. */
export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.5, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Elongated glow (radii rx, ry), for bolts and beams. */
export function glowEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  glow(ctx, 0, 0, rx, color, alpha);
  ctx.restore();
}

/** Runs fn once as drawn, then again mirrored around the vertical line x = w / 2. */
export function mirrored(ctx: Ctx, w: number, fn: () => void): void {
  fn();
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  fn();
  ctx.restore();
}

export function line(ctx: Ctx, pts: readonly number[], color: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function star(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, points: number, fill: string, lw: number = 0): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * TAU - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  paint(ctx, fill, lw);
}
