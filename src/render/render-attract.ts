// src/render/render-attract.ts — OWNER: H5. Attract mode (menus): a parade of new enemy kinds and an occasional boss silhouette.
import type { SpriteApi, SpriteKey } from '../shared/contracts';
import { WORLD_W } from '../sim/tuning/core';
import { animFrame, FRAME_FPS, framesOf, opt } from './render-maps';

export const ATTRACT_CHICKENS = 6;
export const PARADE_SWAP_S = 6;
export const PARADE: readonly SpriteKey[] = [
  'enemy_chicken_ninja', 'enemy_chicken_bomber', 'enemy_chicken_ghost', 'enemy_chicken_gold', 'enemy_chicken_jet',
  'enemy_space_mine', 'enemy_chicken_void', 'enemy_comet', 'enemy_chicken_shield', 'enemy_chicken_mech',
  'enemy_egg_pod', 'enemy_chicken_healer',
];
export const BOSS_PASS_KEYS: readonly SpriteKey[] = [
  'boss_broodmother', 'boss_rotisserie', 'boss_colossus', 'boss_kraken', 'boss_phoenix', 'boss_scrambler', 'boss_empress',
];
export const BOSS_PASS_PERIOD_S = 22;
export const BOSS_PASS_S = 9;
export const BOSS_PASS_ALPHA = 0.12;
export const BOSS_PASS_Y = 300;
const BOSS_PASS_FPS = FRAME_FPS.hen;
const BOSS_PASS_MARGIN = 200;

/** A white silhouette of one boss glides across the menu background, then the cycle repeats. */
function drawBossPass(ctx: CanvasRenderingContext2D, sprites: SpriteApi, clock: number): void {
  const phase = clock % BOSS_PASS_PERIOD_S;
  if (phase >= BOSS_PASS_S) return;
  const key = BOSS_PASS_KEYS[Math.floor(clock / BOSS_PASS_PERIOD_S) % BOSS_PASS_KEYS.length];
  const u = phase / BOSS_PASS_S;
  const x = -BOSS_PASS_MARGIN + u * (WORLD_W + 2 * BOSS_PASS_MARGIN);
  const y = BOSS_PASS_Y + 30 * Math.sin(u * Math.PI);
  sprites.draw(ctx, key, x, y, opt(animFrame(clock, BOSS_PASS_FPS, 0, framesOf(key)), 0, 1, BOSS_PASS_ALPHA, true));
}

/** Background parade for menus (state === null): chickens cycle through PARADE, a boss silhouette passes now and then. */
export function drawAttract(ctx: CanvasRenderingContext2D, sprites: SpriteApi, clock: number): void {
  drawBossPass(ctx, sprites, clock);
  const swap = Math.floor(clock / PARADE_SWAP_S);
  for (let i = 0; i < ATTRACT_CHICKENS; i++) {
    const key = PARADE[(i + swap) % PARADE.length];
    const x = 140 + i * 200 + 70 * Math.sin(clock * 0.35 + i * 1.3);
    const y = 110 + (i % 3) * 48 + 18 * Math.sin(clock * 0.6 + i * 0.9);
    const frame = animFrame(clock, FRAME_FPS.chicken, i, framesOf(key));
    sprites.draw(ctx, key, x, y, opt(frame, 0.1 * Math.cos(clock * 0.35 + i * 1.3)));
  }
}
