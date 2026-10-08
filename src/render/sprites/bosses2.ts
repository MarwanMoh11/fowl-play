// src/render/sprites/bosses2.ts — OWNER: H2. HENPOCALYPSE major bosses (HENPOCALYPSE §H2); the mini-bosses live in bosses3.ts.
import { blob, circ, darken, ell, glow, glowEllipse, lighten, line, mirrored, poly, roundRect, star, TAU } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';
import { BOSS3_SPRITES } from './bosses3';

const VIOLET = '#9D4EDD';
const NEST = '#FFD6FF';

function eggRing(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ell(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 8, 11, PAL.egg, 0, 1.6);
  }
}

function drawBroodmother(ctx: Ctx, frame: number): void {
  const flap = frame === 0 ? -0.4 : 0.4;
  glow(ctx, 150, 122, 112, VIOLET, 0.35);
  mirrored(ctx, 300, () => {
    ctx.save();
    ctx.translate(80, 110);
    ctx.rotate(flap);
    ell(ctx, 0, 0, 72, 32, '#C8A2F0', 0, 2);
    ctx.restore();
  });
  blob(ctx, 150, 130, 80, 74, VIOLET);
  ell(ctx, 150, 166, 60, 32, NEST, 0, 2);
  eggRing(ctx, 150, 166, 40, 18, 7);
  blob(ctx, 150, 62, 34, 30, VIOLET);
  for (const [x, y, r] of [[138, 26, 9], [150, 18, 11], [162, 26, 9]]) circ(ctx, x, y, r, '#FF6BD6');
  circ(ctx, 138, 58, 6, '#FFFFFF', 1.5);
  circ(ctx, 162, 58, 6, '#FFFFFF', 1.5);
  circ(ctx, 139, 59, 2.5, PAL.outline, 0);
  circ(ctx, 163, 59, 2.5, PAL.outline, 0);
  poly(ctx, [146, 70, 154, 70, 150, 80], PAL.beak, 1.5);
}

function drawRotisserie(ctx: Ctx, frame: number): void {
  for (let k = 0; k < frame + 2; k++) {
    const x = 70 + k * 60;
    glow(ctx, x, 110, 34, '#FF6B00', 0.6);
    poly(ctx, [x - 9, 150, x, 96 - frame * 5, x + 9, 150], '#FF8A1E', 1.5);
  }
  line(ctx, [20, 150, 300, 150], PAL.steelDark, 6);
  line(ctx, [100, 200, 96, 250], PAL.steelDark, 6);
  line(ctx, [220, 200, 224, 250], PAL.steelDark, 6);
  roundRect(ctx, 80, 150 - 30, 160, 90, 14, '#C9D1DB', 2.5);
  for (let x = 100; x < 230; x += 22) line(ctx, [x, 126, x, 176], PAL.steelDark, 3);
  ell(ctx, 160, 70, 62, 42, '#FFFFFF', 0, 2.5);
  roundRect(ctx, 104, 96, 112, 16, 5, PAL.gold, 2);
  circ(ctx, 140, 136, 8, '#FFF1A8', 2);
  circ(ctx, 180, 136, 8, '#FFF1A8', 2);
}

function drawColossus(ctx: Ctx, frame: number): void {
  mirrored(ctx, 340, () => {
    roundRect(ctx, 24, 196, 26, 74, 6, PAL.steelDark, 2.5);
    roundRect(ctx, 30, 160, 14, 40, 4, '#D9B26F', 2);
  });
  glow(ctx, 170, 140, 120, '#D9B26F', 0.25);
  blob(ctx, 170, 150, 124, 86, '#B08D57');
  star(ctx, 170, 150, 36, 28, 10, '#D9B26F', 2);
  circ(ctx, 170, 150, 14, '#8C6D3F', 2);
  blob(ctx, 170, 58, 42, 38, '#C49A62');
  poly(ctx, [158, 74, 182, 74, 170, 92], PAL.beak, 1.5);
  circ(ctx, 154, 52, 7, '#FFF1A8', 1.5);
  circ(ctx, 186, 52, 7, '#FFF1A8', 1.5);
  if (frame >= 1) glowEllipse(ctx, 100, 50, 46, 26, '#FFFFFF', 0.4);
  if (frame >= 2) {
    line(ctx, [140, 120, 152, 136, 146, 152, 160, 166], '#3B2A12', 2.5);
    glow(ctx, 150, 140, 60, '#FF6B00', 0.45);
  }
}

function drawKraken(ctx: Ctx, frame: number): void {
  const sway = frame === 0 ? -14 : 14;
  for (let i = 0; i < 8; i++) {
    const x0 = 30 + i * 36;
    const s = sway * Math.sin(i * 1.3);
    const pts = [x0, 170, x0 + s, 222, x0 - s, 280];
    line(ctx, pts, PAL.outline, 12);
    line(ctx, pts, '#FFB703', 7);
  }
  ell(ctx, 160, 100, 100, 80, PAL.egg, 0, 2.5);
  blob(ctx, 160, 135, 72, 60, '#FFB703');
  circ(ctx, 138, 128, 9, '#FFFFFF', 1.5);
  circ(ctx, 182, 128, 9, '#FFFFFF', 1.5);
  circ(ctx, 139, 129, 3.5, PAL.outline, 0);
  circ(ctx, 183, 129, 3.5, PAL.outline, 0);
  for (let i = 0; i < 8; i++) circ(ctx, 30 + i * 36, 230, 3, '#FF8A1E', 0);
}

function drawPhoenix(ctx: Ctx, frame: number): void {
  const c1 = frame === 0 ? '#FF5A1F' : '#9BD8FF';
  const c2 = frame === 0 ? '#FFD60A' : '#FFFFFF';
  glow(ctx, 150, 120, 116, c1, 0.45);
  mirrored(ctx, 300, () => poly(ctx, [150, 110, 30, 40, 20, 110, 60, 170, 110, 150], darken(c1, 0.1), 2));
  for (const x of [120, 150, 180]) poly(ctx, [x - 14, 180, x, 240, x + 14, 180], c1, 2);
  blob(ctx, 150, 130, 55, 60, c1);
  circ(ctx, 150, 62, 28, c1, 2);
  poly(ctx, [150, 70, 172, 82, 150, 86], PAL.beak, 1.5);
  line(ctx, [150, 36, 140, 20, 152, 22, 136, 4], c2, 3.5);
  circ(ctx, 140, 56, 5, '#FFFFFF', 1.5);
  circ(ctx, 160, 56, 5, '#FFFFFF', 1.5);
  line(ctx, [120, 150, 150, 170, 180, 150], lighten(c1, 0.5), 3);
}

function drawScrambler(ctx: Ctx, frame: number): void {
  glow(ctx, 150, 150, 150, '#7B2CBF', 0.5);
  const turn = frame * 0.9;
  for (let i = 0; i < 6; i++) {
    const r = 112 - i * 14;
    ctx.beginPath();
    ctx.arc(150, 150, r, turn + i * 0.8, turn + i * 0.8 + 1.9);
    ctx.strokeStyle = i % 2 === 0 ? '#FF9E00' : '#9D4EDD';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  blob(ctx, 150, 66, 30, 28, '#2B1A44');
  poly(ctx, [146, 80, 154, 80, 150, 92], PAL.beak, 1.5);
  circ(ctx, 150, 150, 40, '#05000A', 2.5);
  glow(ctx, 134, 146, 18, '#FF3B3B', 0.8);
  glow(ctx, 166, 146, 18, '#FF3B3B', 0.8);
  circ(ctx, 134, 146, 6, '#FF3B3B', 1.5);
  circ(ctx, 166, 146, 6, '#FF3B3B', 1.5);
}

function drawEmpress(ctx: Ctx, frame: number): void {
  const spread = frame >= 1 ? 90 : 30;
  glow(ctx, 190, 150, 140, '#D00000', 0.25);
  mirrored(ctx, 380, () => poly(ctx, [160, 150, 190 - spread, 110, 170 - spread, 220, 170, 200], '#F7C6C6', 2));
  roundRect(ctx, 34, 232, 312, 30, 12, PAL.gold, 2.5);
  if (frame < 2) roundRect(ctx, 150, 170, 80, 74, 8, '#B5651D', 2.5);
  else {
    roundRect(ctx, 150, 170, 80, 60, 8, '#B5651D', 2.5);
    line(ctx, [176, 186, 188, 206, 178, 222], PAL.outline, 2);
  }
  blob(ctx, 190, 160, 70, 62, '#D00000');
  roundRect(ctx, 150, 190, 80, 12, 4, PAL.gold, 1.5);
  circ(ctx, 190, 100, 38, PAL.egg, 2);
  poly(ctx, [160, 70, 166, 40, 178, 58, 190, 30, 202, 58, 214, 40, 220, 70], PAL.gold, 2.5);
  if (frame === 2) line(ctx, [186, 46, 194, 60, 188, 68], PAL.outline, 2);
  const eye = frame === 2 ? '#FF6B00' : '#FFFFFF';
  if (frame === 2) glow(ctx, 178, 100, 24, '#FF6B00', 0.9);
  circ(ctx, 176, 100, 6, eye, 1.5);
  circ(ctx, 204, 100, 6, eye, 1.5);
}

export const BOSS2_SPRITES: SpriteDef[] = [
  def({ key: 'boss_broodmother', w: 300, h: 240, frames: 2, draw: drawBroodmother }),
  def({ key: 'boss_rotisserie', w: 320, h: 260, frames: 3, draw: drawRotisserie }),
  def({ key: 'boss_colossus', w: 340, h: 280, frames: 3, draw: drawColossus }),
  def({ key: 'boss_kraken', w: 320, h: 300, frames: 2, draw: drawKraken }),
  def({ key: 'boss_phoenix', w: 300, h: 240, frames: 2, draw: drawPhoenix }),
  def({ key: 'boss_scrambler', w: 300, h: 300, frames: 2, draw: drawScrambler }),
  def({ key: 'boss_empress', w: 380, h: 300, frames: 3, draw: drawEmpress }),
  ...BOSS3_SPRITES,
];
