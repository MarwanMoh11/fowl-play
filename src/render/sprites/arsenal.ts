// src/render/sprites/arsenal.ts — OWNER: H1. New ships, drone and the six new player projectiles (HENPOCALYPSE §H1).
// Ships point up with 3 engine-flame frames; projectiles point up and the renderer rotates them where needed.
import { blob, circ, poly, polyPath, paint, roundRect, glow, glowEllipse, line, mirrored, ell, rgba } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

const FLAME_OUTER = '#FF9F1C';
const FLAME_LEN = [5, 8, 11] as const;

/** One engine tongue with a glow: base at (x, base), length len, outer colour and bright core. */
function tongue(ctx: Ctx, x: number, base: number, len: number, outer: string, core: string, lw: number, glowR = 7): void {
  glow(ctx, x, base + 2, glowR, outer, 0.55);
  ctx.beginPath();
  ctx.moveTo(x - 3.5 * lw, base);
  ctx.quadraticCurveTo(x - 3 * lw, base + len * 0.6, x, base + len);
  ctx.quadraticCurveTo(x + 3 * lw, base + len * 0.6, x + 3.5 * lw, base);
  ctx.closePath();
  ctx.fillStyle = outer;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 1.8 * lw, base);
  ctx.quadraticCurveTo(x - 1.4 * lw, base + len * 0.45, x, base + len * 0.65);
  ctx.quadraticCurveTo(x + 1.4 * lw, base + len * 0.45, x + 1.8 * lw, base);
  ctx.closePath();
  ctx.fillStyle = core;
  ctx.fill();
}

// ---------------------------------------------------------------- ships
const BANTAM_HULL = '#B9FFD6';
const BANTAM_WING = '#1E9E57';

function drawBantam(ctx: Ctx, f: number): void {
  const w = 52;
  const len = [4, 7, 10][f];
  mirrored(ctx, w, () => tongue(ctx, 19, 37, len, PAL.shipThruster, PAL.flameCore, 1));
  mirrored(ctx, w, () => {
    poly(ctx, [30, 22, 48, 36, 46, 40, 33, 36], BANTAM_WING);
    roundRect(ctx, 44, 32, 4.5, 9, 1.5, PAL.steelDark, 1.5);
  });
  polyPath(ctx, [26, 2, 33, 16, 36, 30, 34, 42, 26, 37, 18, 42, 16, 30, 19, 16]);
  paint(ctx, BANTAM_HULL);
  line(ctx, [26, 9, 26, 32], rgba(PAL.white, 0.45), 1.2);
  blob(ctx, 26, 16, 3.5, 6.5, PAL.shipCockpit, 0, 1.5);
}

const BULWARK_HULL = '#FFC24B';
const BULWARK_ARMOR = '#C97A0A';

function drawBulwark(ctx: Ctx, f: number): void {
  const w = 74;
  const len = FLAME_LEN[f];
  for (const x of [22, 37, 52]) tongue(ctx, x, 55, len, FLAME_OUTER, PAL.flameCore, 1.2);
  mirrored(ctx, w, () => poly(ctx, [52, 30, 66, 42, 66, 52, 54, 46], BULWARK_ARMOR));
  mirrored(ctx, w, () => {
    roundRect(ctx, 8, 26, 11, 27, 4, PAL.steelDark, 2.5);
    roundRect(ctx, 11, 19, 4.5, 9, 1.5, PAL.steel, 1.5);
  });
  polyPath(ctx, [37, 3, 47, 14, 53, 28, 56, 50, 47, 58, 27, 58, 18, 50, 21, 28, 27, 14]);
  paint(ctx, BULWARK_HULL);
  line(ctx, [28, 32, 46, 32], rgba(PAL.outline, 0.5), 1.5);
  line(ctx, [30, 42, 44, 42], rgba(PAL.outline, 0.5), 1.5);
  blob(ctx, 37, 24, 5.5, 9, PAL.shipCockpit, 0, 2);
}

const PHOENIX_BODY = '#FF8A4C';

function drawPhoenix(ctx: Ctx, f: number): void {
  const w = 68;
  const len = [6, 10, 14][f];
  for (const x of [30, 34, 38]) tongue(ctx, x, 49, len * (x === 34 ? 1 : 0.7), '#FF5A1F', '#FFF1A8', 1.1);
  glow(ctx, 34, 46, 14, '#FF5A1F', 0.4);
  mirrored(ctx, w, () => {
    poly(ctx, [36, 22, 56, 36, 64, 58, 54, 52, 50, 60, 44, 48, 36, 44], '#FF5A1F');
    poly(ctx, [40, 30, 52, 40, 56, 50, 47, 45, 42, 40], '#FFB627', 1.8);
  });
  polyPath(ctx, [34, 2, 40, 16, 41, 36, 37, 50, 31, 50, 27, 36, 28, 16]);
  paint(ctx, PHOENIX_BODY);
  blob(ctx, 34, 20, 4, 8, '#FFF1A8', 0, 2);
}

// ---------------------------------------------------------------- drone
function drawDrone(ctx: Ctx, f: number): void {
  mirrored(ctx, 28, () => line(ctx, [6, 16, 2, 20], PAL.steelDark, 2));
  circ(ctx, 14, 14, 9, '#8FE3FF', 2);
  circ(ctx, 14, 15, 4.5, '#2E86FF', 1.5);
  circ(ctx, 11, 11, 1.8, rgba(PAL.white, 0.9), 0);
  glow(ctx, 14, 5, 6, '#FFFFFF', f === 0 ? 0.8 : 0.25);
  circ(ctx, 14, 5.5, 2, f === 0 ? PAL.white : '#5E6B7D', 1);
}

// ---------------------------------------------------------------- projectiles
function drawFlak(ctx: Ctx): void {
  circ(ctx, 5, 5, 3.4, '#FF9F1C', 1.2);
  circ(ctx, 4, 4, 1.1, '#FFE3B0', 0);
}

function drawFlame(ctx: Ctx, f: number): void {
  const grow = f === 0 ? 0 : 0.8;
  glow(ctx, 10, 10, 10, '#FF4D00', 0.9);
  blob(ctx, 10, 10.5, 6 + grow, 7.5 - grow, '#FF7A1A', 0, 1.2);
  blob(ctx, 10, 11, 3.8, 4.5, PAL.flameCore, 0, 0);
}

/** Cyan crescent blade: a thick outlined arc over the top of a circle, shimmering between frames. */
function drawSickle(ctx: Ctx, f: number): void {
  glow(ctx, 15, 15, 14, '#4CC9F0', 0.5);
  const a0 = Math.PI * (1.12 + f * 0.03);
  const a1 = Math.PI * (1.88 - f * 0.03);
  ctx.beginPath();
  ctx.arc(15, 16, 11, a0, a1);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = '#4CC9F0';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.strokeStyle = rgba(PAL.white, 0.85);
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function drawHoming(ctx: Ctx, f: number): void {
  const len = [3, 5][f];
  glow(ctx, 5, 16, 4, '#FFE66D', 0.6);
  tongue(ctx, 5, 15, len, '#FFE66D', '#FFFFFF', 0.5, 3.5);
  mirrored(ctx, 10, () => poly(ctx, [2, 13, 0.3, 17, 2.5, 17], '#6BA50F', 1));
  ell(ctx, 5, 10, 3, 6.5, '#B5E61D', 0, 1.2);
  poly(ctx, [5, 0.5, 8, 5, 2, 5], '#EAFF8A', 1.2);
}

function drawRail(ctx: Ctx): void {
  glowEllipse(ctx, 7, 20, 6, 20, '#7FE7FF', 0.6);
  roundRect(ctx, 5, 2, 4, 36, 2, '#E0FBFC', 1.2);
  line(ctx, [7, 4, 7, 36], PAL.white, 1);
  circ(ctx, 7, 2, 2.2, PAL.white, 0);
}

function drawPrism(ctx: Ctx): void {
  glow(ctx, 7, 11, 9, '#F72585', 0.35);
  poly(ctx, [7, 0.6, 13.2, 11, 7, 21.4, 0.8, 11], '#F72585', 1.2);
  poly(ctx, [7, 3.5, 10.2, 11, 7, 18.5, 3.8, 11], '#FF8FC7', 0);
  line(ctx, [7, 0.6, 7, 21.4], rgba(PAL.white, 0.6), 0.8);
}

export const ARSENAL_SPRITES: SpriteDef[] = [
  def({ key: 'ship_bantam', w: 52, h: 48, frames: 3, pad: 4, draw: (ctx, f) => drawBantam(ctx, f) }),
  def({ key: 'ship_bulwark', w: 74, h: 62, frames: 3, pad: 4, draw: (ctx, f) => drawBulwark(ctx, f) }),
  def({ key: 'ship_phoenix', w: 68, h: 60, frames: 3, pad: 4, draw: (ctx, f) => drawPhoenix(ctx, f) }),
  def({ key: 'drone', w: 28, h: 28, frames: 2, pad: 2, draw: (ctx, f) => drawDrone(ctx, f) }),
  def({ key: 'proj_flak', w: 10, h: 10, frames: 1, pad: 0, draw: (ctx) => drawFlak(ctx) }),
  def({ key: 'proj_flame', w: 20, h: 20, frames: 2, pad: 4, draw: (ctx, f) => drawFlame(ctx, f) }),
  def({ key: 'proj_sickle', w: 30, h: 30, frames: 2, pad: 4, draw: (ctx, f) => drawSickle(ctx, f) }),
  def({ key: 'proj_homing', w: 10, h: 22, frames: 2, pad: 3, draw: (ctx, f) => drawHoming(ctx, f) }),
  def({ key: 'proj_rail', w: 14, h: 40, frames: 1, pad: 4, draw: (ctx) => drawRail(ctx) }),
  def({ key: 'proj_prism', w: 14, h: 22, frames: 1, pad: 3, draw: (ctx) => drawPrism(ctx) }),
];
