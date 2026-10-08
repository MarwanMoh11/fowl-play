// src/ui/banners.ts — OWNER: A4. Centered banners drawn from state.banner (§8.6).
import type { Settings } from '../shared/contracts';
import type { Banner, GameState } from '../sim/types';
import { WORLD_W } from '../sim/tuning/core';
import { clamp01, drawText } from './text';

export const BANNER_Y = 300;
export const BANNER_FADE_IN = 0.2;
export const BANNER_FADE_OUT = 0.3;
export const BANNER_START_SCALE = 1.15;
const BOSS_FLASH_HZ = 3;
const BOSS_BAND_H = 140;
const BOSS_STRIPE_GAP = 56;
const BOSS_STRIPE_W = 16;
const BOSS_BAND_FILL = 'rgba(170, 16, 28, 0.5)';
const BOSS_STRIPE_FILL = 'rgba(255, 255, 255, 0.1)';
const BANNER_MAX_TEXT_W = WORLD_W - 80;
const GOLD = '#FFD60A';
const ORANGE = '#FF8A1E';
const ALERT_RED = '#FF3B3B';

export interface BannerEnvelope { alpha: number; scale: number }

/** Fade in 0.2 s (scale 1.15 → 1), fade out over the last 0.3 s. */
export function bannerEnvelope(b: Pick<Banner, 'ttl' | 'total'>): BannerEnvelope {
  const elapsed = b.total - b.ttl;
  const fadeIn = clamp01(elapsed / BANNER_FADE_IN);
  const fadeOut = clamp01(b.ttl / BANNER_FADE_OUT);
  return { alpha: Math.min(fadeIn, fadeOut), scale: 1 + (BANNER_START_SCALE - 1) * (1 - fadeIn) };
}

/** Boss banner title colour: red/white square wave at 3 Hz (steady red when flashes are reduced). */
export function bossTitleColor(elapsed: number, reduceFlashes: boolean): string {
  if (reduceFlashes) return ALERT_RED;
  return Math.floor(elapsed * BOSS_FLASH_HZ * 2) % 2 === 0 ? ALERT_RED : '#FFFFFF';
}

function drawBossBand(ctx: CanvasRenderingContext2D): void {
  const x = -WORLD_W / 2;
  const y = -BOSS_BAND_H / 2;
  ctx.fillStyle = BOSS_BAND_FILL;
  ctx.fillRect(x, y, WORLD_W, BOSS_BAND_H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, WORLD_W, BOSS_BAND_H);
  ctx.clip();
  ctx.strokeStyle = BOSS_STRIPE_FILL;
  ctx.lineWidth = BOSS_STRIPE_W;
  ctx.beginPath();
  for (let sx = x - BOSS_BAND_H; sx < x + WORLD_W; sx += BOSS_STRIPE_GAP) {
    ctx.moveTo(sx, y + BOSS_BAND_H);
    ctx.lineTo(sx + BOSS_BAND_H, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBannerBody(ctx: CanvasRenderingContext2D, b: Banner, settings: Settings): void {
  const maxWidth = BANNER_MAX_TEXT_W;
  const center: CanvasTextAlign = 'center';
  switch (b.style) {
    case 'wave':
      drawText(ctx, b.title, 0, -14, 52, { align: center, fill: GOLD, maxWidth });
      drawText(ctx, b.subtitle, 0, 30, 24, { align: center, maxWidth });
      break;
    case 'boss':
      drawBossBand(ctx);
      drawText(ctx, b.title, 0, -16, 64, { align: center, fill: bossTitleColor(b.total - b.ttl, settings.reduceFlashes), maxWidth });
      drawText(ctx, b.subtitle, 0, 36, 24, { align: center, maxWidth });
      break;
    case 'small':
      drawText(ctx, b.title, 0, 0, 32, { align: center, maxWidth });
      if (b.subtitle !== '') drawText(ctx, b.subtitle, 0, 36, 20, { align: center, maxWidth });
      break;
    case 'big': {
      const g = ctx.createLinearGradient(0, -36, 0, 36);
      g.addColorStop(0, GOLD);
      g.addColorStop(1, ORANGE);
      drawText(ctx, b.title, 0, 0, 72, { align: center, fill: g, strokeWidth: 5, maxWidth });
      if (b.subtitle !== '') drawText(ctx, b.subtitle, 0, 56, 24, { align: center, maxWidth });
      break;
    }
  }
}

/** Draws state.banner. Game over and victory banners are skipped: the DOM screens own those phases. */
export function drawBanner(ctx: CanvasRenderingContext2D, state: GameState, settings: Settings): void {
  const b = state.banner;
  if (!b || state.phase === 'game_over' || state.phase === 'victory') return;
  const env = bannerEnvelope(b);
  if (env.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = env.alpha;
  ctx.translate(WORLD_W / 2, BANNER_Y);
  ctx.scale(env.scale, env.scale);
  drawBannerBody(ctx, b, settings);
  ctx.restore();
}
