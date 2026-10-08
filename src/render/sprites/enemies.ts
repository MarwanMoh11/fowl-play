// src/render/sprites/enemies.ts — OWNER: A5. UFO chicken and asteroids.
import { blob, circ, darken, ell, ellipsePath, glow, lighten, paint, poly, polyPath, rgba, seededRandom, TAU } from './draw';
import { drawBeak } from './hens';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

const UFO_LIGHT_XS = [12, 25, 38, 51, 64] as const;
const UFO_DIM_LIGHT = '#8A7A1E';

function drawUfo(ctx: Ctx, frame: number): void {
  ell(ctx, 38, 47, 22, 9, darken(PAL.ufoHull, 0.35));
  // hen head seen through the dome
  for (const [x, y, r] of [[34, 14.5, 2.8], [38, 13, 3.2], [42, 14.5, 2.8]]) circ(ctx, x, y, r, PAL.comb, 1.4);
  blob(ctx, 38, 22.5, 9.5, 9, PAL.henWhite, 0, 1.6);
  for (const dx of [-3.6, 3.6]) {
    ctx.beginPath();
    ctx.arc(38 + dx, 21.5, 2.3, 0, TAU);
    ctx.fillStyle = PAL.white;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(38 + dx, 22, 1.2, 0, TAU);
    ctx.fillStyle = PAL.outline;
    ctx.fill();
  }
  drawBeak(ctx, 38, 24.5, 5);
  // glass dome
  ctx.beginPath();
  ctx.moveTo(19, 34);
  ctx.ellipse(38, 34, 19, 28, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fillStyle = rgba(PAL.ufoDome, 0.55);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(38, 34, 15, 23, 0, Math.PI * 1.1, Math.PI * 1.45);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(19, 34);
  ctx.ellipse(38, 34, 19, 28, 0, Math.PI, TAU);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // hull
  blob(ctx, 38, 41, 36, 13.5, PAL.ufoHull);
  ellipsePath(ctx, 38, 36, 24, 3.5);
  paint(ctx, PAL.steel, 1.6);
  UFO_LIGHT_XS.forEach((x, i) => {
    const y = 42 + 7 * Math.sqrt(1 - ((x - 38) / 36) ** 2);
    const lit = (i + frame) % 2 === 0;
    if (lit) glow(ctx, x, y, 7, PAL.ufoLights, 0.7);
    circ(ctx, x, y, 2.7, lit ? PAL.ufoLights : UFO_DIM_LIGHT, 1.5);
  });
}

interface RockSpec { size: number; verts: number; craters: number }
const ROCKS: Record<'l' | 'm' | 's', RockSpec> = {
  l: { size: 84, verts: 12, craters: 3 },
  m: { size: 56, verts: 10, craters: 2 },
  s: { size: 30, verts: 9, craters: 2 },
};

function drawRock(ctx: Ctx, frame: number, spec: RockSpec): void {
  const rnd = seededRandom(spec.size * 31 + frame * 977 + 5);
  const c = spec.size / 2;
  const rMax = c - 2.5;
  const pts: number[] = [];
  for (let i = 0; i < spec.verts; i++) {
    const a = (i / spec.verts) * TAU + (rnd() - 0.5) * 0.3;
    const anchor = i % Math.round(spec.verts / 4) === 0;
    const r = rMax * (anchor ? 0.97 + rnd() * 0.03 : 0.8 + rnd() * 0.2);
    pts.push(c + Math.cos(a) * r, c + Math.sin(a) * r);
  }
  const lw = spec.size < 40 ? 2 : 2.5;
  poly(ctx, pts, darken(PAL.rock, 0.12), lw);
  // lit face: the same polygon shrunk toward the upper-left
  const lit = pts.map((v, i) => c + (v - c) * 0.8 - spec.size * (i % 2 === 0 ? 0.04 : 0.05));
  polyPath(ctx, lit);
  ctx.fillStyle = PAL.rock;
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.35;
  polyPath(ctx, lit);
  ctx.clip();
  ellipsePath(ctx, c - spec.size * 0.18, c - spec.size * 0.22, spec.size * 0.22, spec.size * 0.14, -0.5);
  ctx.fillStyle = lighten(PAL.rock, 0.5);
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < spec.craters; i++) {
    const a = rnd() * TAU;
    const d = rnd() * rMax * 0.5;
    const rr = spec.size * (0.07 + rnd() * 0.07);
    const x = c + Math.cos(a) * d;
    const y = c + Math.sin(a) * d;
    ellipsePath(ctx, x, y + rr * 0.15, rr, rr * 0.8);
    ctx.fillStyle = lighten(PAL.rock, 0.25);
    ctx.fill();
    ellipsePath(ctx, x, y, rr, rr * 0.8);
    paint(ctx, PAL.crater, lw > 2 ? 1.4 : 1);
  }
}

export const ENEMY_SPRITES: SpriteDef[] = [
  def({ key: 'enemy_chicken_ufo', w: 76, h: 60, frames: 2, draw: drawUfo }),
  def({ key: 'enemy_asteroid_l', w: 84, h: 84, frames: 3, draw: (ctx, f) => drawRock(ctx, f, ROCKS.l) }),
  def({ key: 'enemy_asteroid_m', w: 56, h: 56, frames: 3, draw: (ctx, f) => drawRock(ctx, f, ROCKS.m) }),
  def({ key: 'enemy_asteroid_s', w: 30, h: 30, frames: 3, draw: (ctx, f) => drawRock(ctx, f, ROCKS.s) }),
];
