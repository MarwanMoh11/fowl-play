// src/render/sprites/ship.ts — OWNER: A5. Player starfighter, shield bubble, mini-ship icon.
import { blob, glow, mirrored, paint, poly, polyPath, roundRect, rgba, TAU } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

export const SHIP_W = 64;
export const SHIP_H = 56;
const FLAME_LENGTHS = [5, 8, 11] as const;
const ENGINE_X = 23.5;
const ENGINE_BASE_Y = 45;

function flame(ctx: Ctx, x: number, len: number): void {
  glow(ctx, x, ENGINE_BASE_Y + 2, 9, PAL.shipThruster, 0.55);
  ctx.beginPath();
  ctx.moveTo(x - 4, ENGINE_BASE_Y);
  ctx.quadraticCurveTo(x - 3.5, ENGINE_BASE_Y + len * 0.65, x, ENGINE_BASE_Y + len);
  ctx.quadraticCurveTo(x + 3.5, ENGINE_BASE_Y + len * 0.65, x + 4, ENGINE_BASE_Y);
  ctx.closePath();
  ctx.fillStyle = PAL.shipThruster;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 2, ENGINE_BASE_Y);
  ctx.quadraticCurveTo(x - 1.6, ENGINE_BASE_Y + len * 0.45, x, ENGINE_BASE_Y + len * 0.65);
  ctx.quadraticCurveTo(x + 1.6, ENGINE_BASE_Y + len * 0.45, x + 2, ENGINE_BASE_Y);
  ctx.closePath();
  ctx.fillStyle = PAL.flameCore;
  ctx.fill();
}

/** Draws the ship in a 64x56 box. flameFrame < 0 hides the thruster flames. */
export function drawShip(ctx: Ctx, flameFrame: number): void {
  if (flameFrame >= 0) {
    const len = FLAME_LENGTHS[Math.min(flameFrame, FLAME_LENGTHS.length - 1)];
    mirrored(ctx, SHIP_W, () => flame(ctx, ENGINE_X, len));
  }
  mirrored(ctx, SHIP_W, () => {
    poly(ctx, [26, 20, 2, 42, 2, 49, 25, 41], PAL.shipWing);
    poly(ctx, [2, 42, 8, 36.5, 7.75, 47, 2, 49], PAL.enemyRed, 2);
    ctx.beginPath();
    ctx.moveTo(22, 30);
    ctx.lineTo(8, 41);
    ctx.strokeStyle = rgba(PAL.white, 0.55);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    roundRect(ctx, 20, 36, 7, 10, 2, PAL.steelDark);
  });
  polyPath(ctx, [32, 2, 38, 14, 41, 30, 39, 44, 25, 44, 23, 30, 26, 14]);
  paint(ctx, PAL.shipHull);
  ctx.beginPath();
  ctx.moveTo(32, 5);
  ctx.lineTo(32, 12);
  ctx.moveTo(26, 34);
  ctx.lineTo(38, 34);
  ctx.strokeStyle = rgba(PAL.shipWing, 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  blob(ctx, 32, 21, 4.8, 8.5, PAL.shipCockpit, 0, 2);
}

export function drawShield(ctx: Ctx): void {
  const c = 42;
  const g = ctx.createRadialGradient(c, c, 18, c, c, 39);
  g.addColorStop(0, 'rgba(127,231,255,0)');
  g.addColorStop(0.75, 'rgba(127,231,255,0.18)');
  g.addColorStop(1, 'rgba(127,231,255,0.45)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, 39, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, 37, 0, TAU);
  ctx.strokeStyle = rgba(PAL.shipCockpit, 0.9);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, 33, Math.PI * 1.1, Math.PI * 1.55);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function drawLifeIcon(ctx: Ctx): void {
  ctx.save();
  ctx.translate(0.2, 0);
  ctx.scale(0.4, 0.4);
  drawShip(ctx, -1);
  ctx.restore();
}

export const SHIP_SPRITES: SpriteDef[] = [
  def({ key: 'ship', w: SHIP_W, h: SHIP_H, frames: 3, pad: 4, draw: (ctx, f) => drawShip(ctx, f) }),
  def({ key: 'ship_shield', w: 84, h: 84, frames: 1, draw: (ctx) => drawShield(ctx) }),
  def({ key: 'icon_life', w: 26, h: 22, frames: 1, draw: (ctx) => drawLifeIcon(ctx) }),
];

