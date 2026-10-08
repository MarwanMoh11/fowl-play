// src/render/sprites/armada2.ts — OWNER: H3. Armada enemy projectiles (HENPOCALYPSE §H3): cluster egg, shard,
// void orb, fireball, gear. Drawn in native pixels (no scaling). Re-exported through armada.ts's ARMADA_SPRITES.
import { circ, ell, glow, line, poly, seededRandom, TAU } from './draw';
import { PAL } from './palette';
import { def, type Ctx, type SpriteDef } from './types';

function clusterEgg(ctx: Ctx, _f: number): void {
  const rnd = seededRandom(3);
  glow(ctx, 10, 6, 5, '#FFE66D', 0.8);
  ell(ctx, 10, 14, 9, 11, '#B5E48C');
  for (let i = 0; i < 9; i++) circ(ctx, 5 + rnd() * 10, 8 + rnd() * 12, 0.9, '#2D6A4F', 0.6);
  line(ctx, [10, 4, 13, 1.5], '#FFD60A', 1.4);
  circ(ctx, 10, 4, 1.8, '#FFD60A', 1);
}

function voidOrb(ctx: Ctx, f: number): void {
  glow(ctx, 13, 13, 12, '#B5179E', 0.7);
  circ(ctx, 13, 13, 10.5, '#7209B7', 1.6);
  const a = f === 0 ? 0.3 : 1.9;
  ctx.beginPath();
  ctx.arc(13, 13, 6, a, a + 4.2);
  ctx.strokeStyle = '#C77DFF';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
  circ(ctx, 10, 9.5, 2, '#E0AAFF', 0);
}

function fireball(ctx: Ctx, f: number): void {
  glow(ctx, 15, 16, 14, '#FF4D00', 0.6);
  const tip = f === 0 ? 1 : 2;
  poly(ctx, [15, tip, 25, 13, 28, 23, 22, 29, 8, 29, 2, 23, 5, 13], '#FF4D00', 1.4);
  poly(ctx, [15, tip + 6, 21, 16, 22, 24, 15, 27, 9, 24, 10, 16], '#FFB703', 1);
  circ(ctx, 15, 21, 4.2, PAL.flameCore, 0.8);
}

function gear(ctx: Ctx, _f: number): void {
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    const pts: number[] = [];
    for (const [ang, r] of [[a - 0.2, 8.5], [a - 0.12, 12.5], [a + 0.12, 12.5], [a + 0.2, 8.5]] as const) {
      pts.push(14 + Math.cos(ang) * r, 14 + Math.sin(ang) * r);
    }
    poly(ctx, pts, '#B08D57', 1.2);
  }
  circ(ctx, 14, 14, 9, '#B08D57', 1.8);
  circ(ctx, 14, 14, 3.4, PAL.outline, 1.2);
}

function shardArt(ctx: Ctx, _f: number): void {
  poly(ctx, [4, 0.6, 7.6, 8, 4, 15.4, 0.4, 8], '#FFE66D', 1.2);
  line(ctx, [4, 3, 4, 13], '#FFF8C0', 1);
}

const art = (key: SpriteDef['key'], w: number, h: number, frames: number, fn: (ctx: Ctx, f: number) => void): SpriteDef =>
  def({ key, w, h, frames, draw: (ctx, f) => { ctx.save(); fn(ctx, f); ctx.restore(); } });

export const ARMADA2_SPRITES: SpriteDef[] = [
  art('proj_cluster_egg', 20, 26, 1, clusterEgg),
  art('proj_shard', 8, 16, 1, shardArt),
  art('proj_void_orb', 26, 26, 2, voidOrb),
  art('proj_fireball', 30, 30, 2, fireball),
  art('proj_gear', 28, 28, 1, gear),
];
