// src/render/sprites/projectiles.ts — OWNER: A5. Player bolts, missile, enemy eggs and shots.
import { circ, darken, ell, glow, glowEllipse, lighten, line, paint, poly, polyPath, rgba, roundRect, star } from './draw';
import { PAL } from './palette';
import { WEAPON_INFO } from '../../shared/contracts';
import { def, type Ctx, type SpriteDef } from './types';

const PULSE = WEAPON_INFO.pulse.color;
const NEUTRON = WEAPON_INFO.neutron.color;
const LASER = WEAPON_INFO.laser.color;
const ARC = WEAPON_INFO.arc.color;

/** Unit egg (16 x 20 box) scaled to w x h at the origin. */
function eggPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const sx = w / 16;
  const sy = h / 20;
  ctx.beginPath();
  ctx.moveTo(x + 8 * sx, y + 1 * sy);
  ctx.bezierCurveTo(x + 13 * sx, y + 1 * sy, x + 15 * sx, y + 10 * sy, x + 15 * sx, y + 13 * sy);
  ctx.bezierCurveTo(x + 15 * sx, y + 17.5 * sy, x + 12 * sx, y + 19.5 * sy, x + 8 * sx, y + 19.5 * sy);
  ctx.bezierCurveTo(x + 4 * sx, y + 19.5 * sy, x + 1 * sx, y + 17.5 * sy, x + 1 * sx, y + 13 * sy);
  ctx.bezierCurveTo(x + 1 * sx, y + 10 * sy, x + 3 * sx, y + 1 * sy, x + 8 * sx, y + 1 * sy);
  ctx.closePath();
}

function drawEgg(ctx: Ctx, w: number, h: number, fill: string, lw: number): void {
  eggPath(ctx, 0, 0, w, h);
  paint(ctx, fill, lw);
  ell(ctx, w * 0.34, h * 0.4, w * 0.11, h * 0.16, 'rgba(255,255,255,0.85)', 0.35, 0);
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.62, w * 0.36, 0.3, 1.9);
  ctx.strokeStyle = rgba(darken(fill, 0.25), 0.7);
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawPulse(ctx: Ctx): void {
  glowEllipse(ctx, 4, 10, 8, 14, PULSE, 0.65);
  roundRect(ctx, 0.5, 0.5, 7, 19, 3.5, PULSE, 0);
  roundRect(ctx, 2, 2, 4, 16, 2, '#EAF4FF', 0);
}

function drawNeutron(ctx: Ctx): void {
  glow(ctx, 8, 8, 16, NEUTRON, 0.75);
  circ(ctx, 8, 8, 7, NEUTRON, 0);
  circ(ctx, 8, 8, 5, lighten(NEUTRON, 0.35), 0);
  circ(ctx, 8, 8, 3, PAL.white, 0);
}

function drawLaser(ctx: Ctx): void {
  glowEllipse(ctx, 3, 14, 8, 18, LASER, 0.5);
  roundRect(ctx, 0.8, 0, 4.4, 28, 2.2, LASER, 0);
  roundRect(ctx, 2.1, 1, 1.8, 26, 0.9, '#FFE6EE', 0);
}

function drawArc(ctx: Ctx): void {
  glow(ctx, 5, 5, 10, ARC, 0.8);
  star(ctx, 5, 5, 5, 1.8, 4, ARC, 0);
  circ(ctx, 5, 5, 1.8, PAL.white, 0);
}

export function drawMissile(ctx: Ctx, frame: number): void {
  const flameLen = frame === 0 ? 8 : 5.5;
  ctx.beginPath();
  ctx.moveTo(5.5, 26);
  ctx.quadraticCurveTo(8, 26 + flameLen * 1.3, 10.5, 26);
  ctx.closePath();
  ctx.fillStyle = PAL.shipThruster;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6.8, 26);
  ctx.quadraticCurveTo(8, 26 + flameLen * 0.8, 9.2, 26);
  ctx.closePath();
  ctx.fillStyle = PAL.flameCore;
  ctx.fill();
  poly(ctx, [4, 19, 0.5, 27, 4, 25.5], PAL.comb, 1.6);
  poly(ctx, [12, 19, 15.5, 27, 12, 25.5], PAL.comb, 1.6);
  roundRect(ctx, 4, 8.5, 8, 18, 2, PAL.shipHull, 1.8);
  polyPath(ctx, [4, 9.5, 12, 9.5, 8, 0.8]);
  paint(ctx, PAL.comb, 1.8);
  circ(ctx, 8, 16, 1.7, PAL.shipWing, 1);
}

function drawEnemyShot(ctx: Ctx, frame: number): void {
  const r = frame === 0 ? 6 : 7.2;
  glow(ctx, 8, 8, 14, PAL.plasma, 0.8);
  circ(ctx, 8, 8, r, PAL.plasma, 0);
  circ(ctx, 8, 8, r * 0.62, '#FFB3EE', 0);
  circ(ctx, 8, 8, r * 0.3, PAL.white, 0);
}

function drawBossEgg(ctx: Ctx): void {
  glow(ctx, 11, 13, 17, PAL.gold, 0.55);
  drawEgg(ctx, 22, 26, PAL.gold, 2);
  line(ctx, [4.5, 15, 17.5, 15], lighten(PAL.gold, 0.55), 1.6);
}

function drawFeather(ctx: Ctx): void {
  glow(ctx, 5, 13, 8, PAL.shipCockpit, 0.35);
  ctx.beginPath();
  ctx.moveTo(5, 0.5);
  ctx.bezierCurveTo(9.5, 6, 10, 16, 6.5, 24);
  ctx.lineTo(5, 26);
  ctx.lineTo(3.5, 24);
  ctx.bezierCurveTo(0, 16, 0.5, 6, 5, 0.5);
  ctx.closePath();
  paint(ctx, PAL.white, 1.6);
  line(ctx, [5, 3, 5, 25], PAL.steel, 1.2);
}

export const PROJECTILE_SPRITES: SpriteDef[] = [
  def({ key: 'proj_pulse', w: 8, h: 20, frames: 1, pad: 6, draw: drawPulse }),
  def({ key: 'proj_neutron', w: 16, h: 16, frames: 1, pad: 8, draw: drawNeutron }),
  def({ key: 'proj_laser', w: 6, h: 28, frames: 1, pad: 6, draw: drawLaser }),
  def({ key: 'proj_arc', w: 10, h: 10, frames: 1, pad: 5, draw: drawArc }),
  def({ key: 'proj_missile', w: 16, h: 34, frames: 2, pad: 3, draw: drawMissile }),
  def({ key: 'proj_egg', w: 16, h: 20, frames: 1, pad: 1, draw: (ctx) => drawEgg(ctx, 16, 20, PAL.egg, 2) }),
  def({ key: 'proj_enemy_shot', w: 16, h: 16, frames: 2, pad: 6, draw: drawEnemyShot }),
  def({ key: 'proj_boss_egg', w: 22, h: 26, frames: 1, pad: 6, draw: drawBossEgg }),
  def({ key: 'proj_feather_knife', w: 10, h: 26, frames: 1, pad: 4, draw: drawFeather }),
];
