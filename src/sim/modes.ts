// src/sim/modes.ts — OWNER: LEAD. Game modes: campaign, onslaught, boss rush, daily (HENPOCALYPSE §5).
import type { GameState, MutatorId } from './types';
import type { BossId } from './bosses.types';
import type { WaveDef, WaveInfo } from './waves.types';
import { BOSS_INFO } from '../shared/contracts';
import { chapterDisplayName, waveDef as campaignWaveDef } from './chapters';
import { generateOnslaughtWave, onslaughtSectorName } from './onslaught';
import { FINAL_CHAPTER, WAVES_PER_CHAPTER } from './tuning/core';
import { DAILY_FINAL_CHAPTER, DAILY_MUTATOR_COUNT, MUTATOR_IDS } from './tuning/loadout';
import { rngInt } from './rng';

/** Boss rush fights these in order, one per "chapter". */
export const BOSS_RUSH_ORDER: readonly BossId[] = [
  'hen', 'carrier', 'rooster', 'twin_hens', 'dreadnought',
  'broodmother', 'rotisserie', 'colossus', 'kraken', 'phoenix', 'scrambler', 'empress',
];

/** Last chapter of the mode; finishing it wins the run (Infinity = never). */
export function finalChapter(state: GameState): number {
  switch (state.mode) {
    case 'campaign': return FINAL_CHAPTER;
    case 'daily': return DAILY_FINAL_CHAPTER;
    case 'boss_rush': return BOSS_RUSH_ORDER.length;
    case 'onslaught': return Infinity;
  }
}

export function wavesInChapter(state: GameState): number {
  return state.mode === 'boss_rush' ? 1 : WAVES_PER_CHAPTER;
}

let cacheKey = '';
let cacheDef: WaveDef | null = null;

export function rushBoss(chapter: number): BossId {
  const n = BOSS_RUSH_ORDER.length;
  return BOSS_RUSH_ORDER[(((Math.floor(chapter) - 1) % n) + n) % n];
}

/** The wave definition for the state's mode, chapter and wave (memoized; generators are pure). */
export function currentWaveDef(state: GameState): WaveDef {
  if (state.mode === 'campaign' || state.mode === 'daily') return campaignWaveDef(state.chapter, state.wave);
  const key = state.mode + ':' + state.seed + ':' + state.chapter + ':' + state.wave;
  if (key === cacheKey && cacheDef) return cacheDef;
  let def: WaveDef;
  if (state.mode === 'boss_rush') {
    const boss = rushBoss(state.chapter);
    def = { name: BOSS_INFO[boss].name, groups: [{ pattern: 'boss', boss }] };
  } else {
    def = generateOnslaughtWave(state.seed, state.chapter, state.wave);
  }
  cacheKey = key;
  cacheDef = def;
  return def;
}

export function currentWaveInfo(state: GameState): WaveInfo {
  const def = currentWaveDef(state);
  let boss: BossId | null = null;
  for (const g of def.groups) if (g.pattern === 'boss') { boss = g.boss; break; }
  let chapterName: string;
  if (state.mode === 'boss_rush') chapterName = 'Boss Rush';
  else if (state.mode === 'onslaught') chapterName = onslaughtSectorName(state.chapter);
  else chapterName = chapterDisplayName(state.chapter);
  return { chapterName, waveName: def.name, isBoss: boss !== null, boss };
}

/** True for the small mid-chapter bosses (ids starting with "mini_"). */
export function isMiniBoss(id: BossId | null): boolean {
  return id !== null && id.startsWith('mini_');
}

/** Two distinct mutators derived from the daily seed. */
export function dailyMutators(seed: number): MutatorId[] {
  const rng = { s: (seed ^ 0xda11c0de) >>> 0 };
  const pool = MUTATOR_IDS.filter((m) => m !== 'hardcore');
  const out: MutatorId[] = [];
  while (out.length < DAILY_MUTATOR_COUNT && pool.length > 0) {
    out.push(pool.splice(rngInt(rng, 0, pool.length - 1), 1)[0]);
  }
  return out;
}

/** YYYYMMDD → seed (the app passes the local date; the sim never reads the clock). */
export function dailySeed(yyyymmdd: number): number {
  let h = 2166136261 >>> 0;
  const s = String(yyyymmdd);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
