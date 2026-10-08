// src/ui/hud-bar.ts — OWNER: A4. Bottom HUD bar (§8.6): lives, missiles, food, power, heat, weapon.
import { WEAPON_INFO, type Settings, type SpriteApi } from '../shared/contracts';
import type { GameState } from '../sim/types';
import { HUD_BAR_Y, MAX_POWER, WORLD_W } from '../sim/tuning/core';
import { clamp01, drawText, lerpColor } from './text';

export const BAR_HEIGHT = 44;
export const BAR_CENTER_Y = HUD_BAR_Y + BAR_HEIGHT / 2;
const BAR_FILL = 'rgba(10, 8, 30, 0.72)';
const BAR_BORDER = '#6C5CE7';
const BAR_BORDER_ALPHA = 0.6;
const BAR_BORDER_H = 2;

const LIVES_X = 16;
const LIVES_STEP = 30;
const ICON_ROW_MAX = 5;
const MISSILES_X = 200;
const MISSILES_STEP = 20;
const FOOD_X = 360;
const FOOD_BAR_W = 80;
const FOOD_BAR_H = 6;
const FOOD_BAR_Y = 706;
const FOOD_MAX = 100;
const FOOD_COLOR = '#FFB627';
const POWER_X = 520;
const POWER_LABEL_Y = 688;
const POWER_PIPS_Y = 694;
const PIP_W = 14;
const PIP_H = 10;
const PIP_GAP = 3;
const PIP_EMPTY = '#2A2340';
const HEAT_X = 740;
const HEAT_W = 180;
const HEAT_H = 12;
const HEAT_Y = BAR_CENTER_Y - HEAT_H / 2;
const HEAT_BACK = '#2A2340';
const HEAT_MID_AT = 60;
export const HEAT_COLORS = { cool: '#39FF88', warm: '#FFD60A', hot: '#FF3B3B' } as const;
export const OVERHEAT_FLASH_HZ = 6;
const WEAPON_X = 980;

/** Heat bar colour: green at 0, yellow at 60, red at 100. */
export function heatColor(heat: number): string {
  const h = Math.min(100, Math.max(0, heat));
  if (h <= HEAT_MID_AT) return lerpColor(HEAT_COLORS.cool, HEAT_COLORS.warm, h / HEAT_MID_AT);
  return lerpColor(HEAT_COLORS.warm, HEAT_COLORS.hot, (h - HEAT_MID_AT) / (100 - HEAT_MID_AT));
}

/** 6 Hz on/off square wave used for the overheat flash. */
export function overheatFlashOn(time: number): boolean {
  return Math.floor(time * OVERHEAT_FLASH_HZ * 2) % 2 === 0;
}

function iconRow(
  ctx: CanvasRenderingContext2D, sprites: SpriteApi, key: 'icon_life' | 'icon_missile',
  x: number, step: number, count: number,
): void {
  if (count <= 0) return;
  if (count > ICON_ROW_MAX) {
    sprites.draw(ctx, key, x + step / 2, BAR_CENTER_Y);
    drawText(ctx, `×${count}`, x + step, BAR_CENTER_Y, 18);
    return;
  }
  for (let i = 0; i < count; i++) sprites.draw(ctx, key, x + step / 2 + i * step, BAR_CENTER_Y);
}

function drawFood(ctx: CanvasRenderingContext2D, sprites: SpriteApi, food: number): void {
  sprites.draw(ctx, 'icon_food', FOOD_X + 11, BAR_CENTER_Y - 7);
  drawText(ctx, String(Math.floor(food)), FOOD_X + 28, BAR_CENTER_Y - 7, 18);
  ctx.fillStyle = PIP_EMPTY;
  ctx.fillRect(FOOD_X, FOOD_BAR_Y, FOOD_BAR_W, FOOD_BAR_H);
  ctx.fillStyle = FOOD_COLOR;
  ctx.fillRect(FOOD_X, FOOD_BAR_Y, FOOD_BAR_W * clamp01(food / FOOD_MAX), FOOD_BAR_H);
}

function drawPower(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawText(ctx, 'POWER', POWER_X, POWER_LABEL_Y, 10);
  const color = WEAPON_INFO[state.player.weapon].color;
  for (let i = 0; i < MAX_POWER; i++) {
    ctx.fillStyle = i < state.player.power ? color : PIP_EMPTY;
    ctx.fillRect(POWER_X + i * (PIP_W + PIP_GAP), POWER_PIPS_Y, PIP_W, PIP_H);
  }
}

function drawHeat(ctx: CanvasRenderingContext2D, state: GameState, settings: Settings): void {
  const { heat, overheated } = state.player;
  const flashOn = settings.reduceFlashes || overheatFlashOn(state.time);
  ctx.fillStyle = HEAT_BACK;
  ctx.fillRect(HEAT_X, HEAT_Y, HEAT_W, HEAT_H);
  if (!overheated || flashOn) {
    ctx.fillStyle = overheated ? HEAT_COLORS.hot : heatColor(heat);
    ctx.fillRect(HEAT_X, HEAT_Y, HEAT_W * clamp01(heat / 100), HEAT_H);
  }
  ctx.strokeStyle = '#1B1030';
  ctx.lineWidth = 2;
  ctx.strokeRect(HEAT_X, HEAT_Y, HEAT_W, HEAT_H);
  if (overheated) drawText(ctx, 'OVERHEAT', HEAT_X, HEAT_Y - 9, 12, { fill: HEAT_COLORS.hot });
}

function drawWeapon(ctx: CanvasRenderingContext2D, sprites: SpriteApi, state: GameState): void {
  const w = state.player.weapon;
  sprites.draw(ctx, `icon_weapon_${w}`, WEAPON_X + 14, BAR_CENTER_Y);
  drawText(ctx, WEAPON_INFO[w].name, WEAPON_X + 36, BAR_CENTER_Y, 16);
}

export function drawBottomBar(
  ctx: CanvasRenderingContext2D, state: GameState, sprites: SpriteApi, settings: Settings,
): void {
  ctx.fillStyle = BAR_FILL;
  ctx.fillRect(0, HUD_BAR_Y, WORLD_W, BAR_HEIGHT);
  ctx.globalAlpha = BAR_BORDER_ALPHA;
  ctx.fillStyle = BAR_BORDER;
  ctx.fillRect(0, HUD_BAR_Y, WORLD_W, BAR_BORDER_H);
  ctx.globalAlpha = 1;
  const p = state.player;
  iconRow(ctx, sprites, 'icon_life', LIVES_X, LIVES_STEP, p.lives);
  iconRow(ctx, sprites, 'icon_missile', MISSILES_X, MISSILES_STEP, p.missiles);
  drawFood(ctx, sprites, p.food);
  drawPower(ctx, state);
  drawHeat(ctx, state, settings);
  drawWeapon(ctx, sprites, state);
}
