// src/sim/powerups.ts — OWNER: LEAD. Timed power-ups, fury/overdrive, drones, time warp, combo.
import type { GameState, InputFrame, PowerupId, Vec2 } from './types';
import { POWERUP_IDS } from './types';
import { emit } from './events';
import { clearEnemyProjectiles } from './projectiles';
import {
  COMBO_BREAK_MIN, COMBO_TIERS, DRONE_OFFSETS, FURY_MAX, MAX_DRONES, OVERDRIVE_CLEAR_RADIUS, POWERUP_DRONES,
  POWERUP_TIME, TIMEWARP_SCALE,
} from './tuning/loadout';

export function emptyPowerups(): Record<PowerupId, number> {
  return { magnet: 0, rapid: 0, drones: 0, timewarp: 0, double: 0 };
}

export function startPowerup(state: GameState, id: PowerupId): void {
  const p = state.player;
  p.powerups[id] = POWERUP_TIME[id];
  state.chapterStats.powerups += 1;
  state.runStats.powerups += 1;
  emit(state, { type: 'powerup_start', id, duration: POWERUP_TIME[id] });
}

/** Time scale for enemies, the wave spawner and enemy projectiles (time warp). */
export function enemyTimeScale(state: GameState): number {
  return state.player.powerups.timewarp > 0 ? TIMEWARP_SCALE : 1;
}

/** Active drones: permanent (perks) + the drones power-up, capped at MAX_DRONES. */
export function droneCount(state: GameState): number {
  const p = state.player;
  if (!p.alive) return 0;
  const n = state.mods.droneCount + (p.powerups.drones > 0 ? POWERUP_DRONES : 0);
  return Math.min(MAX_DRONES, n);
}

/** World position of drone `i` (deterministic; H1 fires from it, H5 draws it). */
export function dronePos(state: GameState, i: number, out: Vec2 = { x: 0, y: 0 }): Vec2 {
  const o = DRONE_OFFSETS[i % DRONE_OFFSETS.length];
  const p = state.player.pos;
  out.x = p.x + o.x;
  out.y = p.y + o.y + 4 * Math.sin(state.time * 3 + i * 1.7);
  return out;
}

export function gainFury(state: GameState, amount: number): void {
  const p = state.player;
  if (p.overdrive > 0 || amount <= 0) return;
  const before = p.fury;
  p.fury = Math.min(FURY_MAX, p.fury + amount * state.mods.furyGainMul);
  if (before < FURY_MAX && p.fury >= FURY_MAX) emit(state, { type: 'fury_full' });
}

export function isOverdrive(state: GameState): boolean {
  return state.player.overdrive > 0;
}

/** Ticks power-up timers and overdrive; starts overdrive on input.overdrive when fury is full. */
export function updatePowerups(state: GameState, input: InputFrame, dt: number, canAct: boolean): void {
  const p = state.player;
  for (const id of POWERUP_IDS) {
    if (p.powerups[id] <= 0) continue;
    p.powerups[id] = Math.max(0, p.powerups[id] - dt);
    if (p.powerups[id] === 0) emit(state, { type: 'powerup_end', id });
  }
  if (p.overdrive > 0) {
    p.overdrive = Math.max(0, p.overdrive - dt);
    if (p.overdrive === 0) emit(state, { type: 'overdrive_end' });
  } else if (input.overdrive && canAct && p.alive && p.fury >= FURY_MAX) {
    p.fury = 0;
    p.overdrive = state.mods.overdriveTime;
    state.chapterStats.overdrives += 1;
    state.runStats.overdrives += 1;
    clearEnemyProjectiles(state, p.pos, OVERDRIVE_CLEAR_RADIUS);
    emit(state, { type: 'overdrive_start', duration: p.overdrive, x: p.pos.x, y: p.pos.y });
  }
}

// ---------------------------------------------------------------- combo
export function comboMultFor(count: number): number {
  let m = 1;
  for (const t of COMBO_TIERS) if (count >= t.at) m = t.mult;
  return m;
}

export function registerKill(state: GameState): void {
  const c = state.combo;
  c.count += 1;
  c.timer = state.mods.comboWindow;
  const mult = comboMultFor(c.count);
  if (mult !== c.mult) {
    c.mult = mult;
    emit(state, { type: 'combo', count: c.count, mult });
  }
  if (c.count > c.best) c.best = c.count;
  if (c.count > state.chapterStats.maxCombo) state.chapterStats.maxCombo = c.count;
  if (c.count > state.runStats.maxCombo) state.runStats.maxCombo = c.count;
}

export function breakCombo(state: GameState): void {
  const c = state.combo;
  if (c.count >= COMBO_BREAK_MIN) emit(state, { type: 'combo_break', count: c.count });
  c.count = 0;
  c.timer = 0;
  c.mult = 1;
}

export function updateCombo(state: GameState, dt: number): void {
  const c = state.combo;
  if (c.count === 0) return;
  c.timer -= dt;
  if (c.timer <= 0) breakCombo(state);
}
