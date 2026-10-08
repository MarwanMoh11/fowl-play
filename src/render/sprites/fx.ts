// src/render/sprites/fx.ts — OWNER: A5. Egg splat decal and soft puff.
import { ell, glow, rgba } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

const YOLK = '#FFC21A';
const SPLAT_EDGE = '#CDBF9E';

function drawSplat(ctx: Ctx): void {
  ell(ctx, 22, 11.5, 20, 5.2, '#FFFFFF', 0, 0);
  for (const [x, y, rx, ry] of [[7, 10, 5, 3.2], [37, 10.5, 5.5, 3.4], [15, 7.5, 6, 3], [30, 7, 5.5, 3]]) ell(ctx, x, y, rx, ry, '#FFFFFF', 0, 0);
  ctx.beginPath();
  ctx.ellipse(22, 12, 21, 5.6, 0, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = rgba(SPLAT_EDGE, 0.9);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ell(ctx, 23, 10, 7.5, 4.2, YOLK, 0, 0);
  ell(ctx, 21, 8.6, 2.4, 1.2, 'rgba(255,255,255,0.85)', -0.2, 0);
  for (const [x, y, r] of [[2.5, 6.5, 1.8], [41.5, 6, 1.6], [34, 3.2, 1.4]]) ell(ctx, x, y, r, r, '#FFFFFF', 0, 0);
}

function drawPuff(ctx: Ctx): void {
  glow(ctx, 16, 16, 15, PAL.white, 0.95);
  glow(ctx, 9.5, 18, 9.5, PAL.white, 0.75);
  glow(ctx, 22.5, 17.5, 9.5, PAL.white, 0.75);
  glow(ctx, 16, 10, 9, PAL.white, 0.6);
}

export const FX_SPRITES: SpriteDef[] = [
  def({ key: 'fx_egg_splat', w: 44, h: 18, frames: 1, draw: drawSplat }),
  def({ key: 'fx_puff', w: 32, h: 32, frames: 1, draw: drawPuff }),
];
