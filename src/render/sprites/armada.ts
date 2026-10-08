// src/render/sprites/armada.ts — OWNER: H3. Armada enemies (HENPOCALYPSE §H3): ability chickens, pods, mines and comets.
// Chickens are drawn in a 60×56 design box scaled to each sprite (house style of hens.ts). Enemy projectiles live in
// armada2.ts; ARMADA_SPRITES here is the single export and includes them, so registry.ts keeps one import.
import { blob, circ, ell, glow, line, poly, rgba, roundRect, seededRandom, star, TAU } from './draw';
import { drawBeak, drawEyes } from './hens';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';
import { ARMADA2_SPRITES } from './armada2';

const DW = 60;
const DH = 56;

/** Runs `fn` in a dw×dh design space scaled to the w×h sprite box. */
function boxed(ctx: Ctx, w: number, h: number, dw: number, dh: number, fn: () => void): void {
  ctx.save();
  ctx.scale(w / dw, h / dh);
  fn();
  ctx.restore();
}

function sprite(
  key: SpriteDef['key'], w: number, h: number, frames: number, fn: (ctx: Ctx, f: number) => void, dw = DW, dh = DH,
): SpriteDef {
  return def({ key, w, h, frames, draw: (ctx, f) => boxed(ctx, w, h, dw, dh, () => fn(ctx, f)) });
}

interface HenStyle { body: string; wing: string; comb?: boolean; angry?: boolean; feet?: boolean }

/** Wings flap between two poses (frame 0 up, frame 1 down). */
function wings(ctx: Ctx, frame: number, color: string, spread = 20.5): void {
  const cy = frame === 0 ? 26.4 : 35.4;
  const rot = frame === 0 ? -0.6 : 0.4;
  for (const side of [-1, 1]) blob(ctx, 30 + side * spread, cy, 5.5, 10.5, color, -rot * side, 2.2);
}

/** The standard chicken in design space: feet, wings, body, comb, head, eyes, beak. */
function hen(ctx: Ctx, f: number, s: HenStyle): void {
  if (s.feet !== false) for (const dx of [-8, 8]) ell(ctx, 30 + dx, 52, 5, 3, PAL.feet, 0, 2);
  wings(ctx, f, s.wing);
  blob(ctx, 30, 36, 20, 16, s.body);
  if (s.comb !== false) {
    for (const [x, y, r] of [[22.5, 9.8, 4.8], [30, 7.2, 5.6], [37.5, 9.8, 4.8]]) circ(ctx, x, y, r, PAL.comb, 2.2);
  }
  blob(ctx, 30, 23.5, 14.5, 13.5, s.body);
  drawEyes(ctx, 30, 22.5, 6.2, 4.4, s.angry === true);
  drawBeak(ctx, 30, 26.7, 8);
}

function ninja(ctx: Ctx, f: number): void {
  hen(ctx, f, { body: '#2B2D42', wing: '#1B1D2E', comb: false });
  roundRect(ctx, 18, 16, 24, 9, 3, '#14142B', 1.4);
  for (const x of [24, 36]) circ(ctx, x, 20.5, 1.3, PAL.white, 0);
  line(ctx, [16, 13, 44, 13], '#E63946', 3.4);
  poly(ctx, [16, 12, 6, 9, 8, 17, 16, 16], '#E63946', 1.4);
  poly(ctx, [44, 12, 54, 9, 52, 17, 44, 16], '#E63946', 1.4);
}

function bomber(ctx: Ctx, f: number): void {
  hen(ctx, f, { body: '#6A994E', wing: '#4F7A38' });
  roundRect(ctx, 19, 39, 22, 9, 3, '#5E6B7D', 1.8);
  for (const x of [23.5, 30, 36.5]) circ(ctx, x, 43.5, 2.2, '#2B2D42', 1.2);
  for (const dx of [-6.2, 6.2]) {
    circ(ctx, 30 + dx, 22.5, 5.4, PAL.steelDark, 2);
    circ(ctx, 30 + dx, 22.5, 3.4, '#8FE3FF', 1.2);
  }
}

function eggPod(ctx: Ctx, f: number): void {
  const rnd = seededRandom(7);
  glow(ctx, 20, 26, 18, '#FFE66D', 0.35);
  ell(ctx, 20, 26, 16, 22, '#E9C46A');
  for (let i = 0; i < 14; i++) circ(ctx, 7 + rnd() * 26, 9 + rnd() * 34, 1.1, '#8A5A18', 0.8);
  line(ctx, [13, 20, 19, 25, 15, 30, 23, 36, 18, 41], '#FFE66D', 2);
  if (f === 1) line(ctx, [19, 25, 28, 22, 31, 24], '#FFE66D', 1.8);
}

function jet(ctx: Ctx, f: number): void {
  const tipX = f === 0 ? 5 : 3;
  glow(ctx, 10, 30, 9, '#FF9F1C', 0.5);
  poly(ctx, [15, 24, tipX, 30, 15, 36], '#FF9F1C', 1.4);
  poly(ctx, [15, 27, tipX + 5, 30, 15, 33], '#FFF1A8', 1);
  poly(ctx, [22, 40, 26, 52, 34, 50, 34, 40], '#E76F51', 1.6);
  poly(ctx, [22, 20, 26, 4, 36, 8, 34, 20], '#E76F51', 1.6);
  blob(ctx, 34, 30, 10, 6, '#E76F51', f === 0 ? -0.5 : 0.4, 2);
  blob(ctx, 32, 31, 20, 14, '#F4A261');
  roundRect(ctx, 14, 20, 28, 8, 4, '#8D99AE', 1.8);
  for (const x of [20, 30, 38]) line(ctx, [x, 20, x, 28], '#5E6B7D', 1.4);
  blob(ctx, 47, 22, 9, 9, '#F4A261');
  circ(ctx, 46, 13.5, 2.8, PAL.comb, 1.8);
  drawEyes(ctx, 47, 20, 4.2, 3.2, false);
  drawBeak(ctx, 52, 23, 6);
}

function turret(ctx: Ctx, _f: number): void {
  roundRect(ctx, 5, 40, 46, 14, 5, '#5E6B7D', 2.2);
  roundRect(ctx, 34, 33, 24, 7, 2, '#5E6B7D', 1.6);
  circ(ctx, 56, 36.5, 2.4, '#2B2D42', 1.2);
  blob(ctx, 28, 38, 14, 9, '#8D99AE');
  for (const [x, y, r] of [[24.5, 12, 3.2], [28, 10, 3.6], [31.5, 12, 3.2]]) circ(ctx, x, y, r, PAL.comb, 2);
  blob(ctx, 28, 22, 11, 10, PAL.henWhite);
  drawEyes(ctx, 28, 20.5, 4.6, 3.4, false);
  drawBeak(ctx, 28, 23.8, 6);
}

function shield(ctx: Ctx, f: number): void {
  hen(ctx, f, { body: '#4361EE', wing: '#2B47C4' });
  roundRect(ctx, 18, 15, 24, 9, 4, '#0B1030', 1.6);
  line(ctx, [21, 17.5, 36, 17.5], '#7FE7FF', 1.6);
}

function mech(ctx: Ctx, _f: number): void {
  for (const side of [-1, 1]) {
    const x = (v: number): number => (side === 1 ? v : DW - v);
    poly(ctx, [x(20), 46, x(14), 55, x(22), 55, x(27), 46], '#5E6B7D', 1.8);
    line(ctx, [x(14), 31, x(5), 40], '#9AA7B8', 3.4);
  }
  roundRect(ctx, 14, 25, 32, 22, 6, '#5E6B7D', 2);
  blob(ctx, 30, 21, 8, 8, PAL.henWhite);
  circ(ctx, 30, 13.5, 3, PAL.comb, 1.6);
  drawBeak(ctx, 30, 24.5, 5);
  ell(ctx, 30, 20, 12, 12, rgba('#8FE3FF', 0.5), 0, 2);
}

function spaceMine(ctx: Ctx, f: number): void {
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    const tip = [19 + Math.cos(a) * 17, 19 + Math.sin(a) * 17];
    const b1 = [19 + Math.cos(a - 0.3) * 11, 19 + Math.sin(a - 0.3) * 11];
    const b2 = [19 + Math.cos(a + 0.3) * 11, 19 + Math.sin(a + 0.3) * 11];
    poly(ctx, [b1[0], b1[1], tip[0], tip[1], b2[0], b2[1]], '#2B2D42', 1.2);
  }
  circ(ctx, 19, 19, 12, '#E63946', 2);
  line(ctx, [11, 19, 27, 19], '#2B2D42', 1.4);
  circ(ctx, 19, 19, 3.2, f === 0 ? '#FFD60A' : '#FFFFFF', 1.2);
  if (f === 0) glow(ctx, 19, 19, 9, '#FFD60A', 0.6);
}

function ghost(ctx: Ctx, f: number): void {
  ctx.globalAlpha = 0.82; // translucent: solid colours so blob() can still shade them
  hen(ctx, f, { body: '#CDB4DB', wing: '#B79BCB', comb: false, feet: false });
  poly(ctx, [10, 46, 16, 54, 22, 47, 30, 54, 38, 47, 44, 54, 50, 46, 50, 40, 10, 40], '#CDB4DB', 1.4);
  line(ctx, [20, 8, 30, 3, 40, 8], '#E0D0EE', 1.6);
}

function healer(ctx: Ctx, f: number): void {
  hen(ctx, f, { body: '#80ED99', wing: '#4FCB74', comb: false });
  poly(ctx, [27.2, 4.5, 32.8, 4.5, 32.8, 9.2, 37.5, 9.2, 37.5, 14.8, 32.8, 14.8, 32.8, 19.5, 27.2, 19.5,
    27.2, 14.8, 22.5, 14.8, 22.5, 9.2, 27.2, 9.2], PAL.white, 1.6);
}

function sniper(ctx: Ctx, f: number): void {
  hen(ctx, f, { body: '#9D0208', wing: '#6A0000', angry: true });
  circ(ctx, 36.2, 22.5, 5.6, '#9AA7B8', 2);
  circ(ctx, 36.2, 22.5, 3.4, '#7FE7FF', 1.2);
  line(ctx, [41.8, 22.5, 50, 30], '#2B2D42', 1.8);
}

function mother(ctx: Ctx, f: number): void {
  hen(ctx, f, { body: PAL.henWhite, wing: PAL.henShade });
  blob(ctx, 30, 35, 24, 18, PAL.henWhite);
  blob(ctx, 30, 20, 13, 12, PAL.henWhite);
  ell(ctx, 30, 46, 21, 7, '#C98B4B', 0, 2);
  for (const x of [18, 26, 34, 42]) line(ctx, [x, 44, x - 2, 49], '#8A5A18', 1);
}

function voidChicken(ctx: Ctx, f: number): void {
  const rnd = seededRandom(11);
  glow(ctx, 30, 30, 25, '#7209B7', 0.3);
  hen(ctx, f, { body: '#3A0CA3', wing: '#2A0872' });
  for (let i = 0; i < 7; i++) star(ctx, 20 + rnd() * 20, 28 + rnd() * 14, 1.9, 0.8, 4, '#FFFFFF', 0);
}

function gold(ctx: Ctx, f: number): void {
  glow(ctx, 30, 28, 26, '#FFC93C', 0.35);
  hen(ctx, f, { body: '#FFC93C', wing: '#E0A106' });
  star(ctx, 5, 12, 3.2, 1.2, 4, '#FFF8C0', 0);
  star(ctx, 55, f === 0 ? 40 : 38, f === 0 ? 3.4 : 2.4, 1.0, 4, '#FFF8C0', 0);
}

function elite(ctx: Ctx, f: number): void {
  hen(ctx, f, { body: '#D4A24C', wing: '#B08D57', comb: false });
  roundRect(ctx, 18, 30, 24, 12, 4, '#B08D57', 1.6);
  for (const x of [22, 30, 38]) circ(ctx, x, 36, 1.2, '#FFF3D6', 0.8);
  blob(ctx, 24, 8, 2.6, 5, '#FFC93C', -0.3, 1.4);
  blob(ctx, 30, 6, 2.6, 5.5, '#FF6B5B', 0, 1.4);
  blob(ctx, 36, 8, 2.6, 5, '#FFC93C', 0.3, 1.4);
}

function comet(ctx: Ctx, f: number): void {
  glow(ctx, 30, 30, 16, '#FF6B35', 0.6);
  const tipX = 2 + f;
  poly(ctx, [22, 20, tipX, 3, 16, 28], '#FF9F1C', 1.4);
  circ(ctx, 30, 30, 13, PAL.rock, 2);
  circ(ctx, 26, 27, 3, PAL.crater, 1);
  circ(ctx, 34, 34, 2.2, PAL.crater, 1);
}

const ENEMY_SPRITES: SpriteDef[] = [
  sprite('enemy_chicken_ninja', 60, 56, 2, ninja),
  sprite('enemy_chicken_bomber', 70, 60, 2, bomber),
  sprite('enemy_egg_pod', 40, 50, 2, eggPod, 40, 50),
  sprite('enemy_chicken_jet', 66, 50, 2, jet, 60, 56),
  sprite('enemy_chicken_turret', 68, 64, 2, turret),
  sprite('enemy_chicken_shield', 64, 60, 2, shield),
  sprite('enemy_chicken_mech', 84, 80, 2, mech),
  sprite('enemy_space_mine', 38, 38, 2, spaceMine, 38, 38),
  sprite('enemy_chicken_ghost', 60, 56, 2, ghost),
  sprite('enemy_chicken_healer', 62, 58, 2, healer),
  sprite('enemy_chicken_sniper', 62, 58, 2, sniper),
  sprite('enemy_chicken_mother', 88, 82, 2, mother),
  sprite('enemy_chicken_void', 64, 60, 2, voidChicken),
  sprite('enemy_chicken_gold', 62, 58, 2, gold),
  sprite('enemy_chicken_elite', 72, 66, 2, elite),
  sprite('enemy_comet', 46, 46, 3, comet, 46, 46),
];

export const ARMADA_SPRITES: SpriteDef[] = [...ENEMY_SPRITES, ...ARMADA2_SPRITES];
