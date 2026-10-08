// src/sim/waves.ts — OWNER: A3
// STUB(A1): owner A3 implements (§7.12)
import type { GameState } from './types';
import type { WaveInfo } from './waves.types';

export function startWave(_state: GameState): void {}

export function updateWaveSpawner(_state: GameState, _dt: number): void {}

export function isWaveComplete(_state: GameState): boolean {
  return false;
}

export function waveInfo(chapter: number, wave: number): WaveInfo {
  return { chapterName: 'Chapter ' + chapter, waveName: 'Wave ' + wave, isBoss: wave === 10, boss: null };
}
