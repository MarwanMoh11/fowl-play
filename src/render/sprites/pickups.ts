// src/render/sprites/pickups.ts — OWNER: A5. Food, power core, gift boxes and weapon/HUD icons.
import { blob, circ, darken, ell, ellipsePath, glow, lighten, line, paint, poly, rgba, roundRect } from './draw';
import { drawMissile } from './projectiles';
import { FONT_FAMILY, PAL } from './palette';
import { WEAPON_INFO } from '../../shared/contracts';
import type { WeaponId } from '../../sim/types';
import { WEAPON_IDS } from '../../sim/types';
import { def, type Ctx, type SpriteDef } from './types';

export function drawDrumstick(ctx: Ctx): void {
  glow(ctx, 15, 15, 16, '#FFC24A', 0.35);
  line(ctx, [14, 17, 6, 25], PAL.outline, 7.5);
  line(ctx, [14, 17, 6, 25], PAL.bone, 4.5);
  circ(ctx, 3.8, 23.6, 3.2, PAL.bone, 1.8);
  circ(ctx, 6.6, 27, 3.2, PAL.bone, 1.8);
  blob(ctx, 19, 11.5, 10.5, 9, PAL.meat, -0.75);
  ell(ctx, 21, 8, 3, 1.6, 'rgba(255,230,180,0.8)', -0.7, 0);
}

function drawRoast(ctx: Ctx): void {
  glow(ctx, 20, 16, 19, '#FFC24A', 0.3);
  ell(ctx, 20, 28.5, 18, 3.2, PAL.steel, 0, 2);
  for (const side of [-1, 1]) {
    const x = 20 + side * 13;
    line(ctx, [x, 12, x + side * 3, 4.5], PAL.outline, 6);
    line(ctx, [x, 12, x + side * 3, 4.5], PAL.bone, 3.4);
    circ(ctx, x + side * 3.4, 3.8, 2.6, PAL.bone, 1.6);
    blob(ctx, x, 14.5, 5.5, 5.5, PAL.meat, 0, 2);
  }
  blob(ctx, 20, 19.5, 16, 10, PAL.meat);
  ell(ctx, 16, 15, 6, 2.2, 'rgba(255,225,170,0.85)', -0.2, 0);
  for (const [x, y] of [[26, 20], [21, 24], [13, 21]]) ell(ctx, x, y, 2.2, 1.4, darken(PAL.meat, 0.3), 0.3, 0);
}

function drawCore(ctx: Ctx, frame: number): void {
  const pulse = frame === 0 ? 0 : 1;
  glow(ctx, 15, 15, 15 + pulse * 2.5, PAL.core, 0.65 + pulse * 0.15);
  for (const rot of [0.55, -0.55]) {
    ellipsePath(ctx, 15, 15, 12.5, 4.6, rot);
    ctx.strokeStyle = rgba(lighten(PAL.core, 0.55), 0.95);
    ctx.lineWidth = 1.9;
    ctx.stroke();
  }
  circ(ctx, 15, 15, 7.2 + pulse * 0.6, PAL.core, 1.8);
  circ(ctx, 15, 15, 3.6, PAL.white, 0);
  for (const [x, y] of [[26, 19], [4, 11]]) circ(ctx, x, y, 1.8, PAL.white, 0);
}

function drawGift(ctx: Ctx, w: WeaponId): void {
  const info = WEAPON_INFO[w];
  glow(ctx, 17, 17, 21, info.color, 0.45);
  roundRect(ctx, 4, 15, 26, 17, 3, info.color);
  roundRect(ctx, 2, 10, 30, 8, 2.5, lighten(info.color, 0.25));
  poly(ctx, [15, 10, 19, 10, 19, 32, 15, 32], PAL.white, 1.8);
  poly(ctx, [2.8, 12.5, 31.2, 12.5, 31.2, 15.5, 2.8, 15.5], rgba(PAL.white, 0.9), 0);
  for (const side of [-1, 1]) {
    ellipsePath(ctx, 17 + side * 6, 6, 6, 3.6, side * -0.45);
    paint(ctx, PAL.white, 1.8);
  }
  circ(ctx, 17, 8, 3, PAL.white, 1.8);
  circ(ctx, 17, 25, 6.4, darken(info.color, 0.45), 1.6);
  ctx.font = `bold 10px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.white;
  ctx.fillText(info.letter, 17, 25.6);
}

function drawFoodIcon(ctx: Ctx): void {
  ctx.save();
  ctx.scale(22 / 30, 22 / 30);
  drawDrumstick(ctx);
  ctx.restore();
}

function drawMissileIcon(ctx: Ctx): void {
  ctx.save();
  ctx.translate(1.4, 0.6);
  ctx.scale(0.7, 0.7);
  drawMissile(ctx, 0);
  ctx.restore();
}

function strokeGlyph(ctx: Ctx, pts: readonly number[], color: string, lw: number): void {
  line(ctx, pts, PAL.outline, lw + 2.4);
  line(ctx, pts, color, lw);
}

function drawWeaponIcon(ctx: Ctx, w: WeaponId): void {
  const c = WEAPON_INFO[w].color;
  if (w === 'pulse') {
    for (const x of [3.5, 12, 20.5]) line(ctx, [12, 21, x, 4], PAL.outline, 5);
    for (const x of [3.5, 12, 20.5]) line(ctx, [12, 21, x, 4], c, 2.6);
  } else if (w === 'neutron') {
    glow(ctx, 12, 12, 12, c, 0.6);
    circ(ctx, 12, 12, 7.5, c, 1.8);
    circ(ctx, 12, 12, 3.2, PAL.white, 0);
  } else if (w === 'laser') {
    strokeGlyph(ctx, [12, 2.5, 12, 21.5], c, 4);
    line(ctx, [12, 4, 12, 20], PAL.white, 1.3);
  } else {
    strokeGlyph(ctx, [19.5, 2, 5, 11, 18.5, 12.5, 4.5, 22], c, 3);
    line(ctx, [19.5, 2, 5, 11, 18.5, 12.5, 4.5, 22], PAL.white, 0.9);
  }
}

const GIFTS: SpriteDef[] = WEAPON_IDS.map((w) =>
  def({ key: `pickup_gift_${w}`, w: 34, h: 34, frames: 1, pad: 5, draw: (ctx) => drawGift(ctx, w) }),
);
const WEAPON_ICONS: SpriteDef[] = WEAPON_IDS.map((w) =>
  def({ key: `icon_weapon_${w}`, w: 24, h: 24, frames: 1, draw: (ctx) => drawWeaponIcon(ctx, w) }),
);

export const PICKUP_SPRITES: SpriteDef[] = [
  def({ key: 'pickup_drumstick', w: 30, h: 30, frames: 1, pad: 3, draw: drawDrumstick }),
  def({ key: 'pickup_roast', w: 40, h: 32, frames: 1, pad: 4, draw: drawRoast }),
  def({ key: 'pickup_power_core', w: 30, h: 30, frames: 2, pad: 4, draw: drawCore }),
  ...GIFTS,
  def({ key: 'icon_missile', w: 14, h: 26, frames: 1, draw: drawMissileIcon }),
  def({ key: 'icon_food', w: 22, h: 22, frames: 1, draw: drawFoodIcon }),
  ...WEAPON_ICONS,
];
