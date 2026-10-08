// src/render/sprites/hens.ts — OWNER: A5. Chicken enemies (basic, red, armored, dented) and the chick.
import { blob, circ, ell, line, paint, poly, polyPath, TAU } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

const BASE_W = 60;
const BASE_H = 56;

type Armor = 'none' | 'full' | 'dented';
interface HenStyle { w: number; h: number; body: string; wing: string; angry: boolean; armor: Armor }

export function drawEyes(ctx: Ctx, cx: number, y: number, spread: number, r: number, angry: boolean): void {
  for (const dx of [-spread, spread]) {
    circ(ctx, cx + dx, y, r, PAL.white, 1.8);
    ctx.beginPath();
    ctx.arc(cx + dx * 0.9, y + r * 0.25, r * 0.5, 0, TAU);
    ctx.fillStyle = PAL.outline;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + dx * 0.9 - r * 0.18, y - r * 0.05, r * 0.16, 0, TAU);
    ctx.fillStyle = PAL.white;
    ctx.fill();
  }
  if (angry) {
    line(ctx, [cx - spread - r, y - r - 1.5, cx - spread + r * 0.9, y - r * 0.2], PAL.outline, 3);
    line(ctx, [cx + spread + r, y - r - 1.5, cx + spread - r * 0.9, y - r * 0.2], PAL.outline, 3);
  }
}

export function drawBeak(ctx: Ctx, cx: number, y: number, size: number): void {
  poly(ctx, [cx - size * 0.5, y, cx + size * 0.5, y, cx, y + size * 0.85], PAL.beak, 2);
}

function drawWings(ctx: Ctx, frame: number, color: string): void {
  const y = BASE_H * 0.56;
  const cy = frame === 0 ? y - 5 : y + 4;
  const rot = frame === 0 ? -0.6 : 0.4;
  for (const side of [-1, 1]) {
    blob(ctx, BASE_W / 2 + side * 20.5, cy, 5.5, 10.5, color, -rot * side, 2.2);
  }
}

function rivets(ctx: Ctx, pts: readonly number[], skip: number): void {
  for (let i = 0; i < pts.length; i += 2) {
    if (i / 2 === skip) {
      ctx.beginPath();
      ctx.arc(pts[i], pts[i + 1], 1.5, 0, TAU);
      ctx.fillStyle = PAL.outline;
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.arc(pts[i], pts[i + 1], 1.3, 0, TAU);
    ctx.fillStyle = '#DCE4EE';
    ctx.fill();
  }
}

function drawArmor(ctx: Ctx, dented: boolean): void {
  ctx.save();
  ctx.translate(0, 2);
  const plate = dented ? '#7E8A9B' : PAL.steel;
  // chest plate
  ctx.beginPath();
  ctx.moveTo(19, 35);
  ctx.lineTo(41, 35);
  ctx.lineTo(38, 47);
  ctx.quadraticCurveTo(30, 52, 22, 47);
  ctx.closePath();
  paint(ctx, plate, 2.2);
  // helmet dome, brim and crest
  ctx.beginPath();
  ctx.moveTo(16, 16);
  ctx.arc(30, 16, 14, Math.PI, TAU);
  ctx.closePath();
  paint(ctx, plate, 2.2);
  polyPath(ctx, [28, 3, 32, 3, 33.5, 10, 26.5, 10]);
  paint(ctx, PAL.steelDark, 1.8);
  poly(ctx, [13, 15.5, 47, 15.5, 47, 19.5, 13, 19.5], PAL.steelDark, 2);
  rivets(ctx, [18, 17.5, 30, 17.5, 42, 17.5], -1);
  rivets(ctx, [23, 38.5, 37, 38.5, 30, 46], dented ? 0 : -1);
  if (dented) {
    // dents and cracks
    ctx.beginPath();
    ctx.arc(38, 9, 4.5, 0.2, 2.6);
    ctx.strokeStyle = PAL.steelDark;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    line(ctx, [33, 36, 31, 40, 34.5, 43, 32, 48], PAL.outline, 1.6);
    line(ctx, [34.5, 43, 38, 44.5], PAL.outline, 1.4);
    line(ctx, [22, 9, 25, 12, 23.5, 15], PAL.outline, 1.4);
    ctx.beginPath();
    ctx.ellipse(24, 43, 3.2, 2, 0.5, 0, TAU);
    ctx.fillStyle = 'rgba(27,16,48,0.35)';
    ctx.fill();
  }
  ctx.restore();
}

function drawHen(ctx: Ctx, frame: number, s: HenStyle): void {
  ctx.save();
  ctx.scale(s.w / BASE_W, s.h / BASE_H);
  const armored = s.armor !== 'none';
  for (const dx of [-8, 8]) ell(ctx, 30 + dx, 52, 5, 3, PAL.feet, 0, 2);
  drawWings(ctx, frame, s.wing);
  blob(ctx, 30, 36, 20, 16, s.body);
  if (!armored) {
    for (const [x, y, r] of [[22.5, 9.8, 4.8], [30, 7.2, 5.6], [37.5, 9.8, 4.8]]) circ(ctx, x, y, r, PAL.comb, 2.2);
  }
  blob(ctx, 30, 23.5, 14.5, 13.5, s.body);
  const eyeY = armored ? 24.5 : 22.5;
  ell(ctx, 30, eyeY + 13, 2.6, 3.6, PAL.comb, 0, 1.8);
  drawEyes(ctx, 30, eyeY, 6.2, 4.4, s.angry);
  drawBeak(ctx, 30, eyeY + 4.2, 8);
  if (armored) drawArmor(ctx, s.armor === 'dented');
  ctx.restore();
}

function drawChick(ctx: Ctx, frame: number): void {
  const flap = frame === 0 ? -0.7 : 0.5;
  for (const side of [-1, 1]) blob(ctx, 16 + side * 11.5, frame === 0 ? 15 : 19, 3.4, 6, PAL.chick, -flap * side, 1.8);
  for (const dx of [-3.5, 3.5]) line(ctx, [16 + dx, 27, 16 + dx, 29.2], PAL.feet, 2);
  blob(ctx, 16, 17, 11, 10.5, PAL.chick, 0, 2.2);
  line(ctx, [14, 6.5, 13.5, 3.5], PAL.chick, 2);
  line(ctx, [16, 6, 16.5, 2.5], PAL.chick, 2);
  line(ctx, [18, 6.5, 19.5, 3.8], PAL.chick, 2);
  for (const dx of [-3.8, 3.8]) {
    ctx.beginPath();
    ctx.arc(16 + dx, 15, 2.1, 0, TAU);
    ctx.fillStyle = PAL.outline;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16 + dx - 0.6, 14.3, 0.6, 0, TAU);
    ctx.fillStyle = PAL.white;
    ctx.fill();
  }
  poly(ctx, [14, 19, 18, 19, 16, 22.4], PAL.feet, 1.6);
}

const hen = (key: SpriteDef['key'], w: number, h: number, style: Omit<HenStyle, 'w' | 'h'>): SpriteDef =>
  def({ key, w, h, frames: 2, draw: (ctx, f) => drawHen(ctx, f, { w, h, ...style }) });

export const HEN_SPRITES: SpriteDef[] = [
  hen('enemy_chicken_basic', 60, 56, { body: PAL.henWhite, wing: PAL.henShade, angry: false, armor: 'none' }),
  hen('enemy_chicken_red', 62, 58, { body: PAL.redHen, wing: PAL.redWing, angry: true, armor: 'none' }),
  hen('enemy_chicken_armored', 64, 60, { body: PAL.henWhite, wing: PAL.henShade, angry: false, armor: 'full' }),
  hen('enemy_chicken_armored_dented', 64, 60, { body: PAL.henWhite, wing: PAL.henShade, angry: true, armor: 'dented' }),
  def({ key: 'enemy_chick', w: 32, h: 30, frames: 2, draw: drawChick }),
];
