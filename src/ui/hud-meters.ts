// src/ui/hud-meters.ts — OWNER: H4. Combo meter (right of centre, below the boss bar) and the fury bar in the bottom bar (§H4 P0-4).
import type { GameState } from '../sim/types';
import { COMBO_TIERS, FURY_MAX } from '../sim/tuning/loadout';
import { clamp01, drawText } from './text';

export const COMBO_MIN_COUNT = 5;
const COMBO_X = 700;
const COMBO_Y = 92;
const COMBO_W = 240;
const COMBO_H = 10;
const COMBO_BACK = '#2A1030';
const FURY_X = 930;
const FURY_W = 110;
const FURY_H = 12;
const FURY_Y = 698 - FURY_H / 2;
const FURY_BACK = '#2A2340';
const FURY_LABEL_Y = 654;
const FURY_COLOR = '#F72585';
const FURY_READY_HZ = 4;

/** Colour of the combo bar and label by multiplier tier. */
export function comboTierColor(mult: number): string {
  if (mult >= 8) return '#F72585';
  if (mult >= 5) return '#FF3B3B';
  if (mult >= 3) return '#FF8A1E';
  if (mult >= 2) return '#FFD60A';
  if (mult >= 1.5) return '#B5E61D';
  return '#4CC9F0';
}

/** Share of the combo window left before the chain breaks, 0..1. */
export function comboFraction(state: GameState): number {
  const window = state.mods.comboWindow;
  return window > 0 ? clamp01(state.combo.timer / window) : 0;
}

/** The multiplier tier reached by the chain, for display (1 below the first tier). */
export function comboTierMult(count: number): number {
  let mult = COMBO_TIERS[0].mult;
  for (const t of COMBO_TIERS) if (count >= t.at) mult = t.mult;
  return mult;
}

export function drawComboMeter(ctx: CanvasRenderingContext2D, state: GameState): void {
  const c = state.combo;
  if (c.count < COMBO_MIN_COUNT) return;
  const color = comboTierColor(c.mult);
  drawText(ctx, `×${c.mult} · ${c.count} CHAIN`, COMBO_X, COMBO_Y - 12, 16, { fill: color });
  ctx.fillStyle = COMBO_BACK;
  ctx.fillRect(COMBO_X, COMBO_Y, COMBO_W, COMBO_H);
  ctx.fillStyle = color;
  ctx.fillRect(COMBO_X, COMBO_Y, COMBO_W * comboFraction(state), COMBO_H);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1B1030';
  ctx.strokeRect(COMBO_X, COMBO_Y, COMBO_W, COMBO_H);
}

/** Fury fills magenta; while overdriving it drains, and when full it pulses with the overdrive hint. */
export function drawFuryBar(ctx: CanvasRenderingContext2D, state: GameState, reduceFlashes: boolean): void {
  const p = state.player;
  const overdriving = p.overdrive > 0;
  const full = p.fury >= FURY_MAX;
  const frac = overdriving ? clamp01(p.overdrive / state.mods.overdriveTime) : clamp01(p.fury / FURY_MAX);
  const pulse = full && !reduceFlashes ? 0.6 + 0.4 * Math.sin(state.time * FURY_READY_HZ * Math.PI * 2) : 1;
  ctx.fillStyle = FURY_BACK;
  ctx.fillRect(FURY_X, FURY_Y, FURY_W, FURY_H);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = FURY_COLOR;
  ctx.fillRect(FURY_X, FURY_Y, FURY_W * frac, FURY_H);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#1B1030';
  ctx.lineWidth = 2;
  ctx.strokeRect(FURY_X, FURY_Y, FURY_W, FURY_H);
  const label = overdriving ? 'OVERDRIVE ACTIVE' : full ? 'OVERDRIVE READY — C / SHIFT' : 'FURY';
  const color = full || overdriving ? '#FFD60A' : '#FFFFFF';
  drawText(ctx, label, FURY_X + FURY_W / 2, FURY_LABEL_Y, 13, { align: 'center', fill: color });
}
