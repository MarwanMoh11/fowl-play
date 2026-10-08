// src/sim/onslaught.ts — OWNER: H3. Procedural infinite waves for ONSLAUGHT mode (HENPOCALYPSE §H3).
// Phase-0 placeholder: replays the campaign tables. H3 replaces this with the real generator.
import type { WaveDef } from './waves.types';
import { waveDef } from './chapters';
import { FINAL_CHAPTER } from './tuning/core';

/** Pure and deterministic: same (seed, sector, wave) → same WaveDef. Wave 10 of every sector is a boss. */
export function generateOnslaughtWave(seed: number, sector: number, wave: number): WaveDef {
  void seed;
  return waveDef(((Math.max(1, sector) - 1) % FINAL_CHAPTER) + 1, wave);
}

export function onslaughtSectorName(sector: number): string {
  return 'Sector ' + sector;
}
