// src/render/sprites/bosses3.ts — OWNER: H2. HENPOCALYPSE mini-bosses (HENPOCALYPSE §H2); re-exported through bosses2.ts.
import { blob, circ, ell, glow, line, mirrored, poly, roundRect, TAU } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

const WOOD = '#A47148';
const STRAW = '#E9C46A';

function drawBrigadier(ctx: Ctx, frame: number): void {
  const wing = frame === 0 ? -0.5 : 0.25;
  mirrored(ctx, 160, () => {
    ctx.save();
    ctx.translate(40, 80);
    ctx.rotate(wing);
    ell(ctx, 0, 0, 30, 14, '#D94B3F', 0, 2);
    ctx.restore();
  });
  blob(ctx, 80, 92, 50, 42, '#FF6B5B');
  ell(ctx, 80, 40, 30, 22, PAL.steel, 0, 2.5);
  line(ctx, [60, 24, 80, 4, 100, 24], PAL.comb, 4);
  circ(ctx, 80, 52, 24, '#FF6B5B', 2);
  circ(ctx, 72, 48, 4, PAL.outline, 0);
  circ(ctx, 88, 48, 4, PAL.outline, 0);
  poly(ctx, [76, 56, 84, 56, 80, 64], PAL.beak, 1.5);
  roundRect(ctx, 56, 124, 48, 10, 4, PAL.gold, 1.5);
}

function drawAce(ctx: Ctx, frame: number): void {
  glow(ctx, 85, 58, 56, '#6C5CE7', 0.35);
  ell(ctx, 85, 70, 70, 22, PAL.ufoHull, 0, 2.5);
  ell(ctx, 85, 52, 30, 22, PAL.ufoDome, 0, 2);
  circ(ctx, 85, 52, 9, '#FFFFFF', 1.5);
  line(ctx, [76, 52, 94, 52], PAL.outline, 2);
  const lit = frame === 0 ? PAL.ufoLights : '#FFFFFF';
  for (const x of [35, 60, 85, 110, 135]) circ(ctx, x, 80, 4, lit, 1);
}

function drawCuckoo(ctx: Ctx, frame: number): void {
  roundRect(ctx, 14, 40, 122, 120, 10, WOOD, 2.5);
  poly(ctx, [10, 46, 75, 8, 140, 46], '#7A4E2D', 2.5);
  circ(ctx, 75, 72, 22, PAL.henWhite, 2);
  line(ctx, [75, 72, 75, 60], PAL.outline, 2);
  line(ctx, [75, 72, 86, 76], PAL.outline, 2);
  roundRect(ctx, 56, 104, 38, 46, 6, '#7A4E2D', 2);
  if (frame === 1) {
    circ(ctx, 75, 110, 16, PAL.henWhite, 2);
    poly(ctx, [86, 108, 96, 112, 86, 116], PAL.beak, 1.5);
    circ(ctx, 72, 106, 2.5, PAL.outline, 0);
  }
  line(ctx, [75, 150, 75, 156], PAL.gold, 2.5);
  circ(ctx, 75, 158, 5, PAL.gold, 1.5);
}

function drawJelly(ctx: Ctx, frame: number): void {
  const rx = frame === 0 ? 62 : 66;
  const ry = frame === 0 ? 55 : 50;
  glow(ctx, 80, 82, 72, '#FFD60A', 0.3);
  blob(ctx, 80, 88, rx, ry, PAL.chick);
  circ(ctx, 80, 92, 22, '#FF8A1E', 2);
  circ(ctx, 72, 84, 5, '#FFFFFF', 0);
  for (const x of [34, 60, 100, 126]) poly(ctx, [x - 5, 128, x, 146 + (frame ? 4 : 0), x + 5, 128], PAL.chick, 1.5);
}

function drawStormcrow(ctx: Ctx, frame: number): void {
  const flap = frame === 0 ? -0.6 : 0.4;
  poly(ctx, [64, 48, 74, 16, 84, 46, 94, 12, 104, 50], '#3B3F58', 2);
  mirrored(ctx, 170, () => {
    ctx.save();
    ctx.translate(50, 70);
    ctx.rotate(flap);
    ell(ctx, 0, 0, 46, 14, '#3B3F58', 0, 2);
    ctx.restore();
  });
  blob(ctx, 85, 80, 46, 38, '#4A4E69');
  poly(ctx, [120, 74, 146, 82, 120, 90], PAL.beak, 1.5);
  circ(ctx, 104, 68, 6, '#FFFFFF', 1.5);
  circ(ctx, 105, 69, 2.5, PAL.outline, 0);
  line(ctx, [24, 132, 44, 110, 30, 100, 58, 74], PAL.ufoLights, 3);
  line(ctx, [140, 130, 118, 110, 134, 100], PAL.ufoLights, 3);
}

function drawScarecrow(ctx: Ctx, frame: number): void {
  roundRect(ctx, 68, 40, 14, 124, 4, '#8B5A2B', 2.5);
  roundRect(ctx, 4, 62, 142, 12, 5, '#8B5A2B', 2.5);
  const spin = frame === 0 ? 0 : 0.5;
  for (let i = 0; i < 5; i++) {
    const a = spin + (i / 5) * TAU;
    line(ctx, [75, 40, 75 + Math.cos(a) * 26, 40 + Math.sin(a) * 26], STRAW, 2.5);
  }
  circ(ctx, 75, 40, 20, STRAW, 2);
  poly(ctx, [48, 26, 102, 26, 92, 14, 58, 14], '#3B2A12', 2);
  line(ctx, [66, 38, 72, 44, 66, 44], PAL.outline, 2);
  line(ctx, [82, 38, 88, 44, 82, 44], PAL.outline, 2);
  line(ctx, [70, 54, 80, 54], PAL.outline, 2);
}

function drawGuard(ctx: Ctx, frame: number): void {
  const dx = frame === 0 ? 0 : -6;
  const dy = frame === 0 ? 0 : 8;
  line(ctx, [146 + dx, 14 + dy, 16, 136], '#D9B26F', 4);
  poly(ctx, [146 + dx, 8 + dy, 156 + dx, 20 + dy, 136 + dx, 20 + dy], PAL.gold, 2);
  blob(ctx, 80, 92, 48, 58, '#FFF3D6');
  roundRect(ctx, 52, 98, 56, 34, 10, PAL.gold, 2.5);
  line(ctx, [52, 112, 108, 112], PAL.outline, 2);
  poly(ctx, [40, 100, 60, 90, 62, 130, 48, 140], PAL.gold, 2);
  circ(ctx, 80, 40, 24, PAL.steel, 2.5);
  line(ctx, [60, 46, 100, 46], PAL.outline, 3);
}

export const BOSS3_SPRITES: SpriteDef[] = [
  def({ key: 'boss_mini_brigadier', w: 160, h: 140, frames: 2, draw: drawBrigadier }),
  def({ key: 'boss_mini_ace', w: 170, h: 120, frames: 2, draw: drawAce }),
  def({ key: 'boss_mini_cuckoo', w: 150, h: 170, frames: 2, draw: drawCuckoo }),
  def({ key: 'boss_mini_jelly', w: 160, h: 160, frames: 2, draw: drawJelly }),
  def({ key: 'boss_mini_stormcrow', w: 170, h: 140, frames: 2, draw: drawStormcrow }),
  def({ key: 'boss_mini_scarecrow', w: 150, h: 170, frames: 2, draw: drawScarecrow }),
  def({ key: 'boss_mini_guard', w: 160, h: 160, frames: 2, draw: drawGuard }),
];
