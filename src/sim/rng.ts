// src/sim/rng.ts — OWNER: A1. mulberry32 on state.rng.s; the only randomness source in src/sim.
import type { RngState } from './types';

/** Next float in [0, 1). Mutates r.s. */
export function rngNext(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Float in [min, max). */
export function rngRange(r: RngState, min: number, max: number): number {
  return min + (max - min) * rngNext(r);
}

/** Integer in [min, maxInclusive]. */
export function rngInt(r: RngState, min: number, maxInclusive: number): number {
  return min + Math.floor(rngNext(r) * (maxInclusive - min + 1));
}

/** True with probability p. */
export function rngChance(r: RngState, p: number): boolean {
  return rngNext(r) < p;
}

export function rngPick<T>(r: RngState, arr: readonly T[]): T {
  return arr[Math.floor(rngNext(r) * arr.length)];
}
