// src/sim/chapterKit.ts — OWNER: H3. Table builders for chapters 6–12 (same shape as chapters.ts, plus the armada patterns).
import type { BossId } from './bosses.types';
import type { GridParams, GroupSpec, KindLetter, RingDef, WaveDef } from './waves.types';

type GridOpts = Partial<Omit<GridParams, 'rowKinds' | 'cols'>>;

export const w = (name: string, ...groups: GroupSpec[]): WaveDef => ({ name, groups });
export const grid = (rowKinds: string, cols: number, o: GridOpts = {}): GroupSpec => ({ pattern: 'grid', rowKinds, cols, ...o });
export const swoop = (rowKinds: string, cols: number, o: GridOpts = {}): GroupSpec => ({ pattern: 'swoop', rowKinds, cols, ...o });
export const divers = (rowKinds: string, cols: number, interval: number, simultaneous: number): GroupSpec =>
  ({ pattern: 'divers', rowKinds, cols, interval, simultaneous });
export const stream = (
  groups: number, perGroup: number, kind: KindLetter, sides: string, baseYs: number[],
  o: { amp?: number; speed?: number; delay?: number } = {},
): GroupSpec => ({ pattern: 'stream', groups, perGroup, kind, sides: sides.split('') as ('L' | 'R')[], baseYs, ...o });
export const ring = (kind: KindLetter, n: number, r: number, omega: number): RingDef => ({ n, r, kind, omega });
export const rings = (...rs: RingDef[]): GroupSpec => ({ pattern: 'ring', rings: rs });
export const swarm = (count: number, delay?: number): GroupSpec => ({ pattern: 'swarm', count, ...(delay ? { delay } : {}) });
export const boss = (id: BossId): GroupSpec => ({ pattern: 'boss', boss: id });
export const later = (g: GroupSpec, delay: number): GroupSpec => ({ ...g, delay });

// ---- HENPOCALYPSE armada patterns ----
export const jets = (count: number, perV: number, o: { y?: number[]; speed?: number } = {}): GroupSpec =>
  ({ pattern: 'jets', count, perV, ...(o.y ? { ys: o.y } : {}), ...(o.speed ? { speed: o.speed } : {}) });
export const pods = (count: number, interval: number): GroupSpec => ({ pattern: 'pods', count, interval });
export const mines = (count: number, rate: number): GroupSpec => ({ pattern: 'mines', count, rate });
export const voids = (count: number): GroupSpec => ({ pattern: 'voids', count });
export const comets = (duration: number, rate: number): GroupSpec => ({ pattern: 'comets', duration, rate });
export const turrets = (count: number, delay?: number): GroupSpec => ({ pattern: 'turrets', count, ...(delay ? { delay } : {}) });
export const mothers = (count: number): GroupSpec => ({ pattern: 'mothers', count });
