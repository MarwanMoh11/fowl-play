// src/render/sprites/loot-hud.ts — OWNER: H5. Power-up capsules and their HUD icons, life-up, golden egg, corn, shield and fury icons.
import { blob, circ, darken, ellipsePath, glow, line, paint, poly, rgba, star } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

const WHITE = '#FFFFFF';
const EGG_GOLD = '#FFC93C';
type Glyph = (ctx: Ctx) => void;

function strokePath(ctx: Ctx, lw: number, color: string): void {
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Flame silhouette spanning about 21 px, shared by the fury icon and the flame weapon icon. */
export function flamePath(ctx: Ctx, x0 = 0, y0 = 0, s = 1): void {
  const p = (x: number, y: number): [number, number] => [x0 + x * s, y0 + y * s];
  const [sx, sy] = p(12, 1);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  let [cx, cy] = p(23, 9); let [ex, ey] = p(22, 16);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  [cx, cy] = p(20, 23); [ex, ey] = p(12, 23);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  [cx, cy] = p(4, 23); [ex, ey] = p(2, 16);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  [cx, cy] = p(1, 9); [ex, ey] = p(12, 1);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.closePath();
}

function glyphShield(ctx: Ctx): void {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push(16 + Math.cos(a) * 7.5, 16 + Math.sin(a) * 7.5);
  }
  poly(ctx, pts, WHITE, 1.5);
}

function glyphMagnet(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(9.5, 22);
  ctx.lineTo(9.5, 16.5);
  ctx.arc(16, 16.5, 6.5, Math.PI, 0);
  ctx.lineTo(22.5, 22);
  strokePath(ctx, 4.2, WHITE);
}

function glyphRapid(ctx: Ctx): void {
  for (const dx of [0, 6]) {
    ctx.beginPath();
    ctx.moveTo(10 + dx, 9.5);
    ctx.lineTo(16 + dx, 16);
    ctx.lineTo(10 + dx, 22.5);
    strokePath(ctx, 3, WHITE);
  }
}

function glyphDrones(ctx: Ctx): void {
  line(ctx, [16, 10.5, 11.5, 20, 20.5, 20, 16, 10.5], WHITE, 1.2);
  for (const [x, y] of [[16, 10.5], [11.5, 20], [20.5, 20]]) circ(ctx, x, y, 3.3, WHITE, 0);
}

function glyphTimewarp(ctx: Ctx): void {
  poly(ctx, [10.5, 9.5, 21.5, 9.5, 16, 16], WHITE, 1);
  poly(ctx, [10.5, 22.5, 21.5, 22.5, 16, 16], WHITE, 1);
}

function glyphDouble(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(9, 11);
  ctx.lineTo(14, 16);
  ctx.moveTo(14, 11);
  ctx.lineTo(9, 16);
  strokePath(ctx, 2.4, WHITE);
  ctx.beginPath();
  ctx.moveTo(17, 12.5);
  ctx.lineTo(19.5, 11);
  ctx.lineTo(21, 12);
  ctx.lineTo(21, 16.5);
  ctx.lineTo(17, 21);
  ctx.lineTo(22, 21);
  strokePath(ctx, 2.4, WHITE);
}

/** 32 px capsule: glowing body, dark rim, glyph, and a shimmer sheen that moves between the two frames. */
function capsule(ctx: Ctx, color: string, glyph: Glyph, frame: number): void {
  glow(ctx, 16, 16, 15, color, 0.5);
  circ(ctx, 16, 16, 13.5, darken(color, 0.3), 2.5);
  circ(ctx, 16, 16, 10.8, color, 0);
  glyph(ctx);
  ellipsePath(ctx, frame === 0 ? 10 : 21, 9.5, 3, 1.5, -0.7);
  ctx.fillStyle = rgba(WHITE, 0.6);
  ctx.fill();
}

/** The same capsule body at 22 px, without shimmer, as a HUD icon. */
function capsuleIcon(ctx: Ctx, color: string, glyph: Glyph): void {
  ctx.save();
  ctx.translate(11, 11);
  ctx.scale(22 / 32, 22 / 32);
  ctx.translate(-16, -16);
  glow(ctx, 16, 16, 15, color, 0.5);
  circ(ctx, 16, 16, 13.5, darken(color, 0.3), 2.5);
  circ(ctx, 16, 16, 10.8, color, 0);
  glyph(ctx);
  ctx.restore();
}

function drawLifeUp(ctx: Ctx, frame: number): void {
  const flame = frame === 0 ? 28.5 : 29.5;
  poly(ctx, [12, 25, 16, flame, 20, 25], '#FF9F1C', 1.2);
  poly(ctx, [16, 2.5, 29, 25, 16, 20, 3, 25], PAL.shipHull, 2.5);
  poly(ctx, [16, 9, 21, 22, 16, 18, 11, 22], PAL.shipWing, 0);
  circ(ctx, 24.5, 8, 5.5, '#FF3B3B', 1.5);
  line(ctx, [21.8, 8, 27.2, 8], WHITE, 1.8);
  line(ctx, [24.5, 5.3, 24.5, 10.7], WHITE, 1.8);
}

function drawGoldenEgg(ctx: Ctx, frame: number): void {
  blob(ctx, 13, 17.5, 10.5, 13.5, EGG_GOLD, 0, 2.5);
  line(ctx, [5, 22.5, 9, 19.5, 13, 22.5, 17, 19.5, 21, 22.5], darken(EGG_GOLD, 0.35), 1.6);
  if (frame === 0) {
    ellipsePath(ctx, 8.5, 11, 2.2, 4, -0.4);
    ctx.fillStyle = rgba(WHITE, 0.9);
    ctx.fill();
  } else {
    star(ctx, 18.5, 10, 4.5, 1.6, 4, WHITE, 0);
  }
}

function drawCorn(ctx: Ctx): void {
  const husk = '#5FA832';
  poly(ctx, [9, 22, 1.5, 20, 3.5, 11.5, 9, 17], husk, 1.5);
  poly(ctx, [9, 22, 16.5, 20, 14.5, 11.5, 9, 17], husk, 1.5);
  ellipsePath(ctx, 9, 11.5, 6, 9.5);
  paint(ctx, '#FFD93B', 2);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) circ(ctx, 6.5 + c * 5, 6.5 + r * 3.4, 1.2, '#FFF0A0', 0.6);
  }
}

function drawCornIcon(ctx: Ctx): void {
  const husk = '#5FA832';
  poly(ctx, [8, 20, 1, 18, 2.5, 11, 8, 15], husk, 1.2);
  poly(ctx, [8, 20, 15, 18, 13.5, 11, 8, 15], husk, 1.2);
  ellipsePath(ctx, 8, 9.5, 5.3, 8);
  paint(ctx, '#FFD93B', 2);
  for (let r = 0; r < 3; r++) circ(ctx, 5.8 + (r % 2) * 4.4, 5.5 + r * 3.2, 0.9, '#FFF0A0', 0.5);
}

function drawShieldIcon(ctx: Ctx): void {
  poly(ctx, [11, 1.5, 20.5, 4.5, 19.5, 13, 11, 22.5, 2.5, 13, 1.5, 4.5], PAL.shipWing, 2);
  line(ctx, [6, 10, 11, 15, 16, 10], WHITE, 2);
}

function drawFuryIcon(ctx: Ctx): void {
  flamePath(ctx, 0, 0, 1);
  paint(ctx, '#F72585', 2);
  ellipsePath(ctx, 12, 15, 4.5, 6.5);
  paint(ctx, '#FFD60A', 0);
}

const PU = {
  magnet: { color: '#E63946', glyph: glyphMagnet },
  rapid: { color: '#FFD60A', glyph: glyphRapid },
  drones: { color: '#8FE3FF', glyph: glyphDrones },
  timewarp: { color: '#9B5DE5', glyph: glyphTimewarp },
  double: { color: '#FFC93C', glyph: glyphDouble },
} as const;

export const LOOT_HUD_SPRITES: SpriteDef[] = [
  def({ key: 'pickup_pu_shield', w: 32, h: 32, frames: 2, draw: (ctx, f) => capsule(ctx, '#4361EE', glyphShield, f) }),
  def({ key: 'pickup_pu_magnet', w: 32, h: 32, frames: 2, draw: (ctx, f) => capsule(ctx, PU.magnet.color, PU.magnet.glyph, f) }),
  def({ key: 'pickup_pu_rapid', w: 32, h: 32, frames: 2, draw: (ctx, f) => capsule(ctx, PU.rapid.color, PU.rapid.glyph, f) }),
  def({ key: 'pickup_pu_drones', w: 32, h: 32, frames: 2, draw: (ctx, f) => capsule(ctx, PU.drones.color, PU.drones.glyph, f) }),
  def({ key: 'pickup_pu_timewarp', w: 32, h: 32, frames: 2, draw: (ctx, f) => capsule(ctx, PU.timewarp.color, PU.timewarp.glyph, f) }),
  def({ key: 'pickup_pu_double', w: 32, h: 32, frames: 2, draw: (ctx, f) => capsule(ctx, PU.double.color, PU.double.glyph, f) }),
  def({ key: 'pickup_life_up', w: 32, h: 30, frames: 2, draw: drawLifeUp }),
  def({ key: 'pickup_golden_egg', w: 26, h: 32, frames: 2, draw: drawGoldenEgg }),
  def({ key: 'pickup_corn', w: 18, h: 24, frames: 1, draw: drawCorn }),
  def({ key: 'icon_shield', w: 22, h: 24, frames: 1, draw: drawShieldIcon }),
  def({ key: 'icon_fury', w: 24, h: 24, frames: 1, draw: drawFuryIcon }),
  def({ key: 'icon_corn', w: 16, h: 22, frames: 1, draw: drawCornIcon }),
  def({ key: 'icon_pu_magnet', w: 22, h: 22, frames: 1, draw: (ctx) => capsuleIcon(ctx, PU.magnet.color, PU.magnet.glyph) }),
  def({ key: 'icon_pu_rapid', w: 22, h: 22, frames: 1, draw: (ctx) => capsuleIcon(ctx, PU.rapid.color, PU.rapid.glyph) }),
  def({ key: 'icon_pu_drones', w: 22, h: 22, frames: 1, draw: (ctx) => capsuleIcon(ctx, PU.drones.color, PU.drones.glyph) }),
  def({ key: 'icon_pu_timewarp', w: 22, h: 22, frames: 1, draw: (ctx) => capsuleIcon(ctx, PU.timewarp.color, PU.timewarp.glyph) }),
  def({ key: 'icon_pu_double', w: 22, h: 22, frames: 1, draw: (ctx) => capsuleIcon(ctx, PU.double.color, PU.double.glyph) }),
];
