// src/sim/patterns/grid.ts — OWNER: A3. `grid` and `divers` patterns (§7.11).
import type { Enemy, GameState, Vec2 } from '../types';
import type { BehaviorState } from '../behaviors.types';
import type { DiversSpec, GridParams, GridSpec, GroupRuntime } from '../waves.types';
import { chapterScale } from '../difficulty';
import { easeOutCubic, lerp } from '../math';
import { rngInt } from '../rng';
import { DIVERS, GRID } from '../tuning/enemies';
import { groupMembers, kindOf, spawnMember } from './common';

export interface ResolvedGrid {
  rows: number;
  cols: number;
  spacingX: number;
  spacingY: number;
  topY: number;
  swayPeriod: number;
  bobAmp: number;
  bobPeriod: number;
  descendRate: number;
  maxBottomY: number;
}

export function resolveGrid(s: GridParams): ResolvedGrid {
  return {
    rows: s.rowKinds.length,
    cols: s.cols,
    spacingX: s.spacingX ?? GRID.spacingX,
    spacingY: s.spacingY ?? GRID.spacingY,
    topY: s.topY ?? GRID.topY,
    swayPeriod: s.swayPeriod ?? GRID.swayPeriod,
    bobAmp: s.bobAmp ?? GRID.bobAmp,
    bobPeriod: s.bobPeriod ?? GRID.bobPeriod,
    descendRate: s.descendRate ?? GRID.descendRate,
    maxBottomY: s.maxBottomY ?? GRID.maxBottomY,
  };
}

/** Slot offset relative to the anchor (§7.11): centered columns, rows going down. */
export function gridSlot(p: ResolvedGrid, row: number, col: number): Vec2 {
  return { x: -((p.cols - 1) * p.spacingX) / 2 + col * p.spacingX, y: row * p.spacingY };
}

export function gridPlanned(s: GridParams): number {
  return s.rowKinds.length * s.cols;
}

/** Max sway amplitude that keeps the whole formation on screen. */
export function swayAmplitude(p: ResolvedGrid): number {
  return Math.max(0, Math.min(GRID.swayAmpMax, (1280 - (p.cols - 1) * p.spacingX) / 2 - GRID.swayMargin));
}

function entryStartY(p: ResolvedGrid): number {
  return p.topY - p.rows * p.spacingY - GRID.entryAbove;
}

export function startGrid(state: GameState, g: GroupRuntime, s: GridParams): void {
  const p = resolveGrid(s);
  g.total = p.rows * p.cols;
  g.anchor = { x: GRID.centerX, y: entryStartY(p) };
  g.data.entered = 0;
  g.data.descent = 0;
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      const slot = gridSlot(p, r, c);
      const b: BehaviorState = { type: 'formation', group: g.index, slot };
      spawnMember(state, g, kindOf(s.rowKinds[r]), g.anchor.x + slot.x, g.anchor.y + slot.y, b);
    }
  }
  g.doneSpawning = true;
}

/** Entry easing, then sway/bob/descent (§7.11). Sway time starts when entry ends so there is no jump. */
export function updateGridAnchor(g: GroupRuntime, s: GridParams, dt: number): void {
  const p = resolveGrid(s);
  if (g.t < GRID.entryTime) {
    g.anchor.x = GRID.centerX;
    g.anchor.y = lerp(entryStartY(p), p.topY, easeOutCubic(g.t / GRID.entryTime));
    return;
  }
  g.data.entered = 1;
  const ts = g.t - GRID.entryTime;
  const budget = Math.max(0, p.maxBottomY - (p.topY + (p.rows - 1) * p.spacingY));
  g.data.descent = Math.min((g.data.descent ?? 0) + p.descendRate * dt, budget);
  g.anchor.x = GRID.centerX + swayAmplitude(p) * Math.sin((2 * Math.PI * ts) / p.swayPeriod);
  g.anchor.y = p.topY + g.data.descent + p.bobAmp * Math.sin((2 * Math.PI * ts) / p.bobPeriod);
}

export function updateGrid(_state: GameState, g: GroupRuntime, s: GridSpec, dt: number): void {
  updateGridAnchor(g, s, dt);
}

// ---- divers ----

export function startDivers(state: GameState, g: GroupRuntime, s: DiversSpec): void {
  startGrid(state, g, s);
  g.data.diveTimer = s.interval;
}

function beginDive(state: GameState, e: Enemy, b: Extract<BehaviorState, { type: 'formation' }>, s: DiversSpec): void {
  const speed = chapterScale(state.chapter).speed;
  const px = state.player.pos.x;
  const p0 = { x: e.pos.x, y: e.pos.y };
  e.behavior = {
    type: 'dive',
    path: {
      p0,
      p1: { x: p0.x, y: p0.y + DIVERS.dropY },
      p2: { x: px, y: DIVERS.aimY },
      p3: { x: px + (px < DIVERS.centerX ? DIVERS.exitXOffset : -DIVERS.exitXOffset), y: DIVERS.exitY },
    },
    t: 0,
    duration: (s.diveDuration ?? DIVERS.diveDuration) / speed,
    group: b.group,
    slot: b.slot,
  };
}

export function updateDivers(state: GameState, g: GroupRuntime, s: DiversSpec, dt: number): void {
  updateGridAnchor(g, s, dt);
  if (g.data.entered !== 1) return;
  g.data.diveTimer -= dt;
  if (g.data.diveTimer > 0) return;
  g.data.diveTimer += s.interval;
  const pool = groupMembers(state, g.index, 'formation');
  const n = Math.min(s.simultaneous ?? DIVERS.simultaneous, pool.length);
  for (let i = 0; i < n; i++) {
    const k = rngInt(state.rng, 0, pool.length - 1);
    const e = pool[k];
    pool[k] = pool[pool.length - 1];
    pool.pop();
    if (e.behavior.type === 'formation') beginDive(state, e, e.behavior, s);
  }
}
