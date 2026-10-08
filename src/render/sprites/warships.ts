// src/render/sprites/warships.ts — OWNER: A5. Egg Carrier and Coop Dreadnought bosses.
import { circ, darken, ell, ellipsePath, glow, lighten, line, paint, poly, polyPath, roundRect, rgba, TAU } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

function carrierEggPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(140, 6);
  ctx.bezierCurveTo(186, 6, 275, 62, 275, 124);
  ctx.bezierCurveTo(275, 170, 215, 194, 140, 194);
  ctx.bezierCurveTo(65, 194, 5, 170, 5, 124);
  ctx.bezierCurveTo(5, 62, 94, 6, 140, 6);
  ctx.closePath();
}

function drawCrack(ctx: Ctx, pts: readonly number[]): void {
  line(ctx, pts, PAL.outline, 2.6);
  line(ctx, pts, 'rgba(255,159,28,0.6)', 0.9);
}

function drawCarrier(ctx: Ctx, stage: number): void {
  const shell = ctx.createLinearGradient(0, 6, 0, 194);
  shell.addColorStop(0, '#FFFBEE');
  shell.addColorStop(1, '#E3C98F');
  carrierEggPath(ctx);
  ctx.fillStyle = shell;
  ctx.fill();
  ctx.save();
  carrierEggPath(ctx);
  ctx.clip();
  for (const [y, h] of [[60, 20], [128, 18]]) {
    ctx.fillStyle = PAL.steel;
    ctx.fillRect(0, y, 280, h);
    line(ctx, [0, y, 280, y], PAL.outline, 2.2);
    line(ctx, [0, y + h, 280, y + h], PAL.outline, 2.2);
    line(ctx, [0, y + 3, 280, y + 3], rgba(PAL.white, 0.5), 1.4);
    for (let x = 20; x < 270; x += 28) circ(ctx, x, y + h / 2 + 1, 1.8, PAL.steelDark, 1);
  }
  line(ctx, [140, 82, 140, 128], rgba(PAL.outline, 0.35), 1.6);
  ctx.restore();
  carrierEggPath(ctx);
  ctx.lineWidth = 3;
  ctx.strokeStyle = PAL.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // cockpit window with a hen silhouette
  circ(ctx, 140, 46, 25, PAL.steel);
  circ(ctx, 140, 46, 19, PAL.ufoDome, 1.8);
  const sil = darken(PAL.ufoHull, 0.55);
  for (const dx of [-5, 0, 5]) circ(ctx, 140 + dx, 36 - Math.abs(dx) * 0.3, 3.4, sil, 0);
  ell(ctx, 140, 47, 9, 9, sil, 0, 0);
  poly(ctx, [136, 50, 144, 50, 140, 56], sil, 0);
  ctx.beginPath();
  ctx.arc(140, 46, 15, Math.PI * 1.1, Math.PI * 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // turrets and hatch
  for (const dx of [-75, 75]) {
    roundRect(ctx, 140 + dx - 5, 140, 10, 24, 3, PAL.steelDark, 2.2);
    circ(ctx, 140 + dx, 136, 15, PAL.steel);
    circ(ctx, 140 + dx, 136, 7, PAL.steelDark, 1.8);
  }
  roundRect(ctx, 115, 166, 50, 22, 4, PAL.steelDark, 2.4);
  for (let x = 120; x < 160; x += 10) poly(ctx, [x, 188, x + 5, 188, x + 10, 168, x + 5, 168], PAL.ufoLights, 0);
  roundRect(ctx, 115, 166, 50, 22, 4, 'rgba(0,0,0,0)', 2.4);
  if (stage >= 1) {
    drawCrack(ctx, [64, 40, 76, 60, 66, 78, 84, 96, 78, 112]);
    drawCrack(ctx, [210, 70, 200, 88, 214, 100]);
  }
  if (stage >= 2) {
    drawCrack(ctx, [100, 14, 108, 32, 96, 48, 104, 62]);
    drawCrack(ctx, [66, 150, 90, 160, 84, 176]);
    drawCrack(ctx, [232, 128, 216, 142, 226, 160]);
    polyPath(ctx, [172, 20, 190, 26, 184, 40, 168, 34]);
    ctx.fillStyle = PAL.outline;
    ctx.fill();
    glow(ctx, 178, 30, 14, PAL.shipThruster, 0.6);
  }
}

interface Scheme { plate: string; dark: string; glow: string }
const SCHEMES: Scheme[] = [
  { plate: PAL.steel, dark: PAL.steelDark, glow: PAL.shipCockpit },
  { plate: '#D9873A', dark: '#7A3F1D', glow: '#FFB02E' },
  { plate: '#D94B3F', dark: '#6E1818', glow: PAL.enemyRed },
];

function hullPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(170, 40);
  ctx.bezierCurveTo(260, 40, 335, 90, 335, 150);
  ctx.bezierCurveTo(335, 215, 255, 252, 170, 252);
  ctx.bezierCurveTo(85, 252, 5, 215, 5, 150);
  ctx.bezierCurveTo(5, 90, 80, 40, 170, 40);
  ctx.closePath();
}

function drawDreadnought(ctx: Ctx, phase: number): void {
  const s = SCHEMES[Math.min(phase, SCHEMES.length - 1)];
  const grad = ctx.createLinearGradient(0, 40, 0, 252);
  grad.addColorStop(0, lighten(s.plate, 0.25));
  grad.addColorStop(1, s.dark);
  hullPath(ctx);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.save();
  hullPath(ctx);
  ctx.clip();
  for (const x of [-120, -60, 60, 120]) {
    ctx.beginPath();
    ctx.moveTo(170 + x * 0.5, 44);
    ctx.quadraticCurveTo(170 + x * 1.5, 150, 170 + x * 0.9, 252);
    ctx.strokeStyle = rgba(PAL.outline, 0.55);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  for (const [y, h] of [[112, 20], [204, 16]]) {
    ctx.fillStyle = s.dark;
    ctx.fillRect(0, y, 340, h);
    line(ctx, [0, y, 340, y], PAL.outline, 2.2);
    line(ctx, [0, y + h, 340, y + h], PAL.outline, 2.2);
    for (let x = 16; x < 334; x += 24) {
      glow(ctx, x, y + h / 2, 7 + phase * 2, s.glow, 0.5);
      circ(ctx, x, y + h / 2, 2.3, s.glow, 0.8);
    }
  }
  ctx.restore();
  hullPath(ctx);
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = PAL.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // reactor core
  glow(ctx, 170, 168, 38, s.glow, 0.55 + phase * 0.1);
  circ(ctx, 170, 168, 21, s.dark);
  circ(ctx, 170, 168, 13, s.glow, 1.8);
  circ(ctx, 167, 164, 4, PAL.white, 0);
  // turrets (x +- 70, x +- 140)
  for (const dx of [-140, -70, 70, 140]) {
    roundRect(ctx, 170 + dx - 6, 164, 12, 26, 3, s.dark, 2.2);
    circ(ctx, 170 + dx, 158, 16, s.plate);
    circ(ctx, 170 + dx, 158, 8, s.dark, 2);
  }
  // command bridge with a rooster head
  roundRect(ctx, 130, 6, 80, 54, 10, s.plate, 2.8);
  ell(ctx, 170, 32, 29, 22, rgba(PAL.ufoDome, 0.55), 0, 2.2);
  ell(ctx, 170, 36, 12, 12, '#EE7A45', 0, 1.6);
  for (const [x, y] of [[164, 22], [170, 19], [176, 22]]) circ(ctx, x, y, 3.6, PAL.comb, 1.4);
  ctx.beginPath();
  ctx.moveTo(158, 30);
  ctx.arc(170, 30, 12, Math.PI, TAU);
  ctx.closePath();
  paint(ctx, '#2B3A8C', 1.6);
  poly(ctx, [166, 39, 174, 39, 170, 46], PAL.beak, 1.4);
  for (const dx of [-5, 5]) circ(ctx, 170 + dx, 36, 2.2, PAL.white, 1);
  for (const dx of [-5, 5]) circ(ctx, 170 + dx, 36.5, 1, PAL.outline, 0);
  if (phase >= 1) {
    ell(ctx, 170, 33, 30, 24, 'rgba(0,0,0,0)', 0, 0);
    ctx.strokeStyle = rgba(s.glow, 0.9);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  if (phase >= 2) {
    for (const [x, y, rx, ry, rot] of [[78, 96, 22, 9, 0.5], [262, 86, 20, 8, -0.5], [120, 232, 26, 7, 0.2]]) {
      ellipsePath(ctx, x, y, rx, ry, rot);
      ctx.fillStyle = 'rgba(27,16,48,0.4)';
      ctx.fill();
    }
    for (const pts of [[60, 100, 74, 108, 70, 122], [262, 96, 252, 110, 258, 124]]) {
      line(ctx, pts, PAL.outline, 2.4);
      line(ctx, pts, rgba(s.glow, 0.8), 0.9);
    }
  }
}

export const WARSHIP_SPRITES: SpriteDef[] = [
  def({ key: 'boss_carrier', w: 280, h: 200, frames: 3, draw: drawCarrier }),
  def({ key: 'boss_dreadnought', w: 340, h: 260, frames: 3, draw: drawDreadnought }),
];
