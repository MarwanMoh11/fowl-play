// src/ui/tally.ts — OWNER: A4. Chapter-complete tally panel with count-up (§8.6).
import type { Settings } from '../shared/contracts';
import { DIFFICULTY } from '../sim/difficulty';
import { PHASE_TIME, WORLD_H, WORLD_W } from '../sim/tuning/core';
import type { ChapterBonus, Difficulty, GameState } from '../sim/types';
import { clamp01, drawText, roundRectPath } from './text';

export const TALLY_COUNT_TIME = 2.0;
export const TALLY_PROMPT_AT = PHASE_TIME.chapterCompleteSkippableAfter;
const PANEL_W = 640;
const PANEL_H = 380;
const PANEL_X = (WORLD_W - PANEL_W) / 2;
const PANEL_Y = (WORLD_H - PANEL_H) / 2 - 10;
const PANEL_FILL = 'rgba(16, 10, 40, 0.86)';
const PANEL_BORDER = '#6C5CE7';
const LABEL_X = PANEL_X + 44;
const VALUE_X = PANEL_X + PANEL_W - 44;
const ROW_START_Y = PANEL_Y + 96;
const ROW_STEP = 38;
const PROMPT_BLINK_HZ = 2;

export type TallyKind = 'stat' | 'bonus' | 'total' | 'mult';
export interface TallyRow {
  kind: TallyKind;
  label: string;
  /** Final number shown on the right. */
  value: number;
  /** Suffix appended to the counting number ('%' for accuracy). */
  suffix: string;
}

export function multiplierLabel(difficulty: Difficulty): string | null {
  const mul = DIFFICULTY[difficulty].scoreMul;
  if (mul === 1) return null;
  return `× ${mul} (${difficulty.toUpperCase()})`;
}

/** Rows in display order; the divider sits before the TOTAL row. */
export function buildTallyRows(bonus: ChapterBonus, difficulty: Difficulty): TallyRow[] {
  const rows: TallyRow[] = [
    { kind: 'stat', label: 'ACCURACY', value: bonus.accuracyPct, suffix: '%' },
    { kind: 'bonus', label: 'Accuracy bonus', value: bonus.accuracy, suffix: '' },
    { kind: 'bonus', label: 'Food bonus', value: bonus.food, suffix: '' },
    { kind: 'bonus', label: 'Flawless bonus', value: bonus.flawless, suffix: '' },
    { kind: 'bonus', label: 'Firepower bonus', value: bonus.firepower, suffix: '' },
    { kind: 'total', label: 'TOTAL', value: bonus.total, suffix: '' },
  ];
  const mulLabel = multiplierLabel(difficulty);
  if (mulLabel !== null) {
    rows.push({ kind: 'mult', label: mulLabel, value: Math.round(bonus.total * DIFFICULTY[difficulty].scoreMul), suffix: '' });
  }
  return rows;
}

/** Row i starts counting at i/n of the count-up window and finishes when its slot ends. */
export function tallyProgress(index: number, count: number, t: number): number {
  const slot = TALLY_COUNT_TIME / count;
  return clamp01((t - index * slot) / slot);
}

export function tallyIsRevealed(index: number, count: number, t: number): boolean {
  return t >= (index * TALLY_COUNT_TIME) / count;
}

export function tallyDone(t: number): boolean {
  return t >= TALLY_COUNT_TIME;
}

/** Whether a tick sound should play at this phase time (tally still counting). */
export function tallyCounting(t: number): boolean {
  return t >= 0 && t < TALLY_COUNT_TIME;
}

function formatValue(n: number): string {
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function drawTally(ctx: CanvasRenderingContext2D, state: GameState, settings: Settings): void {
  const bonus = state.lastChapterBonus;
  if (state.phase !== 'chapter_complete' || !bonus) return;
  const t = state.phaseTimer;
  const rows = buildTallyRows(bonus, state.difficulty);
  ctx.save();
  roundRectPath(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 16);
  ctx.fillStyle = PANEL_FILL;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PANEL_BORDER;
  ctx.stroke();
  drawText(ctx, `CHAPTER ${state.chapter} COMPLETE`, WORLD_W / 2, PANEL_Y + 44, 32, { align: 'center', fill: '#FFD60A' });
  let y = ROW_START_Y;
  rows.forEach((row, i) => {
    if (row.kind === 'total') {
      ctx.fillStyle = PANEL_BORDER;
      ctx.fillRect(LABEL_X, y - 12, VALUE_X - LABEL_X, 2);
      y += 10;
    }
    if (tallyIsRevealed(i, rows.length, t)) {
      const shown = row.value * tallyProgress(i, rows.length, t);
      const size = row.kind === 'total' ? 28 : 22;
      const fill = row.kind === 'total' ? '#FFD60A' : '#FFFFFF';
      drawText(ctx, row.label, LABEL_X, y, size, { fill });
      drawText(ctx, formatValue(shown) + row.suffix, VALUE_X, y, size, { align: 'right', fill });
    }
    y += ROW_STEP;
  });
  const blinkOn = settings.reduceFlashes || Math.floor(t * PROMPT_BLINK_HZ * 2) % 2 === 0;
  if (t >= TALLY_PROMPT_AT && blinkOn) {
    drawText(ctx, 'Press FIRE to continue', WORLD_W / 2, PANEL_Y + PANEL_H - 32, 20, { align: 'center' });
  }
  ctx.restore();
}
