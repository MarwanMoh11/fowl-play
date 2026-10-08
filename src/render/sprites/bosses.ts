// src/render/sprites/bosses.ts — OWNER: A5. Mother Hen and Rooster Commander bosses.
import { blob, circ, darken, ell, ellipsePath, lighten, line, mirrored, paint, poly, roundRect, star, strokeOutline, TAU } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

const SASH_RED = '#C0282F';
const GOGGLE_STRAP = '#5A3A22';
const GLASS = 'rgba(143,227,255,0.4)';

function drawMedal(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  poly(ctx, [x - r * 0.7, y, x - r * 0.1, y, x - r * 0.5, y + r * 1.9], '#2E86FF', 1.6);
  poly(ctx, [x + r * 0.1, y, x + r * 0.7, y, x + r * 0.5, y + r * 1.9], PAL.comb, 1.6);
  circ(ctx, x, y, r, color, 2);
  star(ctx, x, y, r * 0.7, r * 0.3, 5, PAL.comb, 0);
}

function drawHen(ctx: Ctx, frame: number): void {
  for (const dx of [-35, 35]) {
    ell(ctx, 120 + dx, 207, 17, 8, PAL.feet);
    for (const t of [-9, 0, 9]) line(ctx, [120 + dx + t, 207, 120 + dx + t * 1.3, 213], PAL.outline, 3);
  }
  const wy = frame === 0 ? 112 : 138;
  const rot = frame === 0 ? -0.5 : 0.35;
  mirrored(ctx, 240, () => {
    blob(ctx, 36, wy, 22, 52, PAL.henShade, rot);
    ctx.save();
    ctx.translate(36, wy);
    ctx.rotate(rot);
    for (const k of [-1, 0, 1]) line(ctx, [k * 9, 8 + Math.abs(k) * 2, k * 9, 36 - Math.abs(k) * 2], PAL.steelDark, 2);
    ctx.restore();
  });
  blob(ctx, 120, 138, 72, 66, PAL.henWhite);
  // sash clipped to the body
  ctx.save();
  ellipsePath(ctx, 120, 138, 71, 65);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(45.4, 90.4);
  ctx.lineTo(205.4, 180.4);
  ctx.lineTo(194.6, 199.6);
  ctx.lineTo(34.6, 109.6);
  ctx.closePath();
  ctx.fillStyle = SASH_RED;
  ctx.fill();
  line(ctx, [45.4, 90.4, 205.4, 180.4], PAL.outline, 2.2);
  line(ctx, [34.6, 109.6, 194.6, 199.6], PAL.outline, 2.2);
  line(ctx, [41, 100, 201, 190], PAL.gold, 2);
  ctx.restore();
  ellipsePath(ctx, 120, 138, 72, 66);
  strokeOutline(ctx);
  drawMedal(ctx, 96, 131, 9.5, PAL.gold);
  drawMedal(ctx, 130, 150, 6.5, PAL.steel);
  // head
  for (const [x, y, r] of [[98, 30, 14], [120, 21, 17], [142, 30, 14]]) circ(ctx, x, y, r, PAL.comb);
  blob(ctx, 120, 78, 50, 46, PAL.henWhite);
  ell(ctx, 120, 119, 8, 12, PAL.comb);
  poly(ctx, [100, 88, 140, 88, 120, 114], PAL.beak);
  line(ctx, [104, 92, 136, 92], darken(PAL.beak, 0.3), 2);
  // goggles
  roundRect(ctx, 68, 63, 104, 13, 5, GOGGLE_STRAP, 2.2);
  for (const dx of [-23, 23]) {
    circ(ctx, 120 + dx, 70, 19, PAL.steel);
    circ(ctx, 120 + dx, 70, 14, PAL.white, 1.8);
    circ(ctx, 120 + dx + dx * 0.04, 72, 7, PAL.outline, 0);
    circ(ctx, 120 + dx - 2, 69, 2.4, PAL.white, 0);
    ellipsePath(ctx, 120 + dx, 70, 14, 14);
    ctx.fillStyle = GLASS;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(120 + dx, 70, 10.5, Math.PI * 1.1, Math.PI * 1.55);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  line(ctx, [120 - 6, 70, 120 + 6, 70], PAL.steelDark, 5);
}

const RUST = '#D9582E';
const RUST_HEAD = '#EE7A45';
const CAP = '#2B3A8C';
const TAIL_COLORS = [PAL.comb, PAL.feet, '#39C98A', PAL.shipWing, '#9B5DE5'] as const;

function drawRooster(ctx: Ctx, frame: number): void {
  TAIL_COLORS.forEach((c, i) => {
    const a = (-170 + i * 35) * (Math.PI / 180);
    const cx = 115 + Math.cos(a) * 72;
    const cy = 125 + Math.sin(a) * 72;
    ell(ctx, cx, cy, 15, 38, c, a + Math.PI / 2);
    ell(ctx, 115 + Math.cos(a) * 92, 125 + Math.sin(a) * 92, 6, 8, lighten(c, 0.55), a + Math.PI / 2, 1.6);
  });
  for (const dx of [-20, 20]) {
    line(ctx, [115 + dx, 200, 115 + dx, 215], PAL.feet, 5);
    ell(ctx, 115 + dx, 218, 13, 6, PAL.feet, 0, 2.2);
  }
  mirrored(ctx, 230, () => blob(ctx, 60, 150, 14, 38, darken(RUST, 0.15), 0.12));
  blob(ctx, 115, 150, 50, 58, RUST);
  ell(ctx, 115, 162, 31, 40, '#F7D9A8', 0, 0);
  // epaulettes
  mirrored(ctx, 230, () => {
    ctx.save();
    ctx.translate(74, 114);
    ctx.rotate(-0.3);
    for (const k of [-10, -3, 4, 11]) line(ctx, [k, 6, k, 13], PAL.gold, 2.4);
    roundRect(ctx, -15, -7, 30, 14, 4, PAL.gold, 2.2);
    line(ctx, [-9, 0, 9, 0], darken(PAL.gold, 0.3), 2);
    ctx.restore();
  });
  // head
  blob(ctx, 115, 82, 36, 35, RUST_HEAD);
  ell(ctx, 115, 108, 7, 11, PAL.comb, 0, 2);
  for (const dx of [-17, 17]) {
    circ(ctx, 115 + dx * 0.95, 82, 8.2, PAL.white, 2);
    circ(ctx, 115 + dx * 0.8, 84, 4, PAL.outline, 0);
  }
  line(ctx, [90, 66, 108, 77], PAL.outline, 4);
  line(ctx, [140, 66, 122, 77], PAL.outline, 4);
  if (frame === 0) {
    poly(ctx, [100, 90, 130, 90, 115, 113], PAL.beak);
  } else {
    poly(ctx, [104, 111, 126, 111, 115, 124], PAL.beak);
    poly(ctx, [99, 88, 131, 88, 122, 111, 108, 111], PAL.outline, 0);
    ell(ctx, 115, 104, 6, 3.5, PAL.comb, 0, 0);
    poly(ctx, [100, 87, 130, 87, 115, 101], PAL.beak);
  }
  // officer cap
  ctx.beginPath();
  ctx.moveTo(81, 66);
  ctx.arc(115, 66, 34, Math.PI, TAU);
  ctx.closePath();
  paint(ctx, CAP);
  roundRect(ctx, 80, 60, 70, 10, 3, PAL.gold, 2);
  ell(ctx, 115, 71, 38, 6, darken(CAP, 0.35), 0, 2.2);
  star(ctx, 115, 49, 8, 3.6, 5, PAL.gold, 1.6);
  for (const [x, y, r] of [[104, 33, 7], [115, 28, 8.5], [126, 33, 7]]) circ(ctx, x, y, r, PAL.comb, 2);
}

export const BOSS_SPRITES: SpriteDef[] = [
  def({ key: 'boss_hen', w: 240, h: 220, frames: 2, draw: drawHen }),
  def({ key: 'boss_rooster', w: 230, h: 230, frames: 2, draw: drawRooster }),
];
