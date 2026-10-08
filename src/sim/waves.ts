// src/sim/waves.ts — OWNER: H3 (was A3). Wave spawner: groups, delays, carry plan, completion (§7.8, §7.11, §7.12).
import type { GameState, PickupKind } from './types';
import type { GroupRuntime, WaveDef, WaveInfo } from './waves.types';
import { emptyWaveRuntime } from './waves.types';
import { chapterDisplayName, waveDef } from './chapters';
import { currentWaveDef } from './modes';
import { availableWeapons } from './pickups';
import { rngInt, rngPick } from './rng';
import { patternPlanned, startPattern, updatePattern } from './patterns';
import { CARRY, START_DELAY } from './tuning/enemies';

const TIME_EPS = 1e-9;

function newGroup(index: number, total: number, start: number): GroupRuntime {
  return {
    index, started: false, doneSpawning: false, spawned: 0, total, timer: 0, t: 0,
    anchor: { x: 0, y: 0 }, data: { start },
  };
}

function pickUnusedIndex(state: GameState, span: number, planned: number, used: number[]): number {
  for (let tries = 0; tries < CARRY.maxTries; tries++) {
    const i = rngInt(state.rng, 0, span - 1);
    if (!used.includes(i)) return i;
  }
  let i = 0;
  while (used.includes(i) && i < planned - 1) i++;
  return i;
}

/** §7.8: one power core per non-boss wave, plus one gift on waves 3, 6, 9; indices in [0, floor(0.8 × planned)). */
export function buildCarryPlan(state: GameState, planned: number): { spawnIndex: number; kind: PickupKind }[] {
  if (planned <= 0) return [];
  const span = Math.max(1, Math.floor(CARRY.spanFraction * planned));
  const plan: { spawnIndex: number; kind: PickupKind }[] = [];
  const used: number[] = [];
  const add = (kind: PickupKind): void => {
    const spawnIndex = pickUnusedIndex(state, span, planned, used);
    used.push(spawnIndex);
    plan.push({ spawnIndex, kind });
  };
  add('power_core');
  if (CARRY.giftWaves.includes(state.wave)) add(('gift_' + rngPick(state.rng, availableWeapons(state))) as PickupKind);
  return plan;
}

function beginGroup(state: GameState, g: GroupRuntime, def: WaveDef): void {
  g.started = true;
  g.t = 0;
  startPattern(state, g, def.groups[g.index]);
}

export function startWave(state: GameState): void {
  const def = currentWaveDef(state);
  const rt = emptyWaveRuntime();
  state.waveRt = rt;
  let planned = 0;
  def.groups.forEach((spec, i) => {
    const total = patternPlanned(spec);
    planned += total;
    rt.groups.push(newGroup(i, total, START_DELAY + (spec.delay ?? 0)));
  });
  rt.carryPlan = buildCarryPlan(state, planned);
  // Boss groups spawn right away so the boss can enter during the boss intro (and bossName is set for the banner).
  def.groups.forEach((spec, i) => {
    if (spec.pattern === 'boss') beginGroup(state, rt.groups[i], def);
  });
}

export function updateWaveSpawner(state: GameState, dt: number): void {
  const rt = state.waveRt;
  const def = currentWaveDef(state);
  rt.elapsed += dt;
  for (const g of rt.groups) {
    if (!g.started) {
      if (rt.elapsed + TIME_EPS < g.data.start) continue;
      beginGroup(state, g, def);
    } else {
      g.t += dt;
    }
    updatePattern(state, g, def.groups[g.index], dt);
  }
}

export function isWaveComplete(state: GameState): boolean {
  for (const g of state.waveRt.groups) {
    if (!g.started || !g.doneSpawning) return false;
  }
  for (const e of state.enemies) {
    if (e.alive) return false;
  }
  return true;
}

export function waveInfo(chapter: number, wave: number): WaveInfo {
  const def = waveDef(chapter, wave);
  const first = def.groups[0];
  const boss = first && first.pattern === 'boss' ? first.boss : null;
  return { chapterName: chapterDisplayName(chapter), waveName: def.name, isBoss: boss !== null, boss };
}
