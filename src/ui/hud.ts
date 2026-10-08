// src/ui/hud.ts — OWNER: H4 (from A4). Canvas HUD drawn in logical 1280x720 coordinates after the world (§8.6, HENPOCALYPSE §H4 P0-4).
import type { Settings, SpriteApi } from '../shared/contracts';
import type { GameState } from '../sim/types';
import { FINAL_CHAPTER, WAVES_PER_CHAPTER, WORLD_W } from '../sim/tuning/core';
import { drawBanner } from './banners';
import { drawBottomBar } from './hud-bar';
import { drawComboMeter } from './hud-meters';
import { drawPowerups } from './hud-powerups';
import { drawTally } from './tally';
import { clamp01, drawText } from './text';

const SCORE_X = 20;
const SCORE_Y = 36;
const CORN_Y = 70;
const RIGHT_X = 1260;
const CHAPTER_Y = 30;
const FPS_Y = 54;
const BOSS_NAME_Y = 22;
const BOSS_BAR = { x: 360, y: 30, w: 560, h: 14 } as const;
const BOSS_BAR_BACK = '#2A1030';
const BOSS_BAR_FILL = '#FF3B3B';
const BOSS_TICK = 'rgba(255, 255, 255, 0.9)';

/** 1234567 -> "1,234,567". */
export function formatScore(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const v = Math.floor(Math.abs(n));
  const text = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 && v > 0 ? `-${text}` : text;
}

/** `CHAPTER 2 · WAVE 7/10`. */
export function chapterWaveLabel(chapter: number, wave: number): string {
  return `CHAPTER ${chapter} · WAVE ${wave}/${WAVES_PER_CHAPTER}`;
}

/** The label for the run's mode, in place of the chapter label for the other modes. */
export function modeLabel(state: GameState): string {
  switch (state.mode) {
    case 'onslaught': return `ONSLAUGHT · SECTOR ${state.chapter} · WAVE ${state.wave}`;
    case 'boss_rush': return `BOSS RUSH · ${Math.min(state.chapter, FINAL_CHAPTER)}/${FINAL_CHAPTER}`;
    case 'daily': return `DAILY CLUTCH · CH ${state.chapter}`;
    default: return chapterWaveLabel(state.chapter, state.wave);
  }
}

/** Combined HP fraction of all living bosses, or null when none is alive. */
export function bossHealth(state: GameState): number | null {
  let hp = 0;
  let max = 0;
  for (const e of state.enemies) {
    if (e.alive && e.isBoss) {
      hp += Math.max(0, e.hp);
      max += e.maxHp;
    }
  }
  return max > 0 ? clamp01(hp / max) : null;
}

function drawBossBar(ctx: CanvasRenderingContext2D, state: GameState): void {
  const frac = bossHealth(state);
  if (frac === null) return;
  const { x, y, w, h } = BOSS_BAR;
  drawText(ctx, state.bossName ?? 'BOSS', WORLD_W / 2, BOSS_NAME_Y, 16, { align: 'center' });
  ctx.fillStyle = BOSS_BAR_BACK;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = BOSS_BAR_FILL;
  ctx.fillRect(x, y, w * frac, h);
  ctx.fillStyle = BOSS_TICK;
  for (const t of state.bossThresholds) ctx.fillRect(x + w * t - 1, y, 2, h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeRect(x, y, w, h);
}

export function drawHud(
  ctx: CanvasRenderingContext2D, state: GameState, sprites: SpriteApi, settings: Settings, fps: number,
): void {
  ctx.save();
  ctx.globalAlpha = 1;
  drawBottomBar(ctx, state, sprites, settings);
  drawText(ctx, formatScore(state.score), SCORE_X, SCORE_Y, 28);
  sprites.draw(ctx, 'icon_corn', SCORE_X + 10, CORN_Y);
  drawText(ctx, formatScore(state.corn), SCORE_X + 26, CORN_Y, 18);
  drawText(ctx, modeLabel(state), RIGHT_X, CHAPTER_Y, 18, { align: 'right' });
  if (settings.showFps) drawText(ctx, `${Math.round(fps)} FPS`, RIGHT_X, FPS_Y, 14, { align: 'right' });
  drawBossBar(ctx, state);
  drawComboMeter(ctx, state);
  drawPowerups(ctx, state, sprites);
  drawTally(ctx, state, settings);
  drawBanner(ctx, state, settings);
  ctx.restore();
}
