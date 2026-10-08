// src/sim/chapters.ts — OWNER: A3. Chapter and wave tables (§7.12) as plain data.
import type { BossId } from './bosses.types';
import type {
  AsteroidsSpec, ChapterDef, GridParams, GroupSpec, KindCounts, KindLetter, RingDef, WaveDef,
} from './waves.types';
import { FINAL_CHAPTER, WAVES_PER_CHAPTER } from './tuning/core';

// ---- tiny builders keep the tables readable ----
type GridOpts = Partial<Omit<GridParams, 'rowKinds' | 'cols'>>;
const grid = (rowKinds: string, cols: number, o: GridOpts = {}): GroupSpec => ({ pattern: 'grid', rowKinds, cols, ...o });
const swoop = (rowKinds: string, cols: number, o: GridOpts = {}): GroupSpec => ({ pattern: 'swoop', rowKinds, cols, ...o });
const divers = (rowKinds: string, cols: number, interval: number, simultaneous: number): GroupSpec =>
  ({ pattern: 'divers', rowKinds, cols, interval, simultaneous });
const stream = (
  groups: number, perGroup: number, kind: KindLetter, sides: string, baseYs: number[],
  o: { amp?: number; speed?: number; delay?: number } = {},
): GroupSpec => ({ pattern: 'stream', groups, perGroup, kind, sides: sides.split('') as ('L' | 'R')[], baseYs, ...o });
const ring = (kind: KindLetter, n: number, r: number, omega: number): RingDef => ({ n, r, kind, omega });
const rings = (...rs: RingDef[]): GroupSpec => ({ pattern: 'ring', rings: rs });
const bouncers = (kinds: KindCounts): GroupSpec => ({ pattern: 'bouncers', kinds });
const asteroids = (duration: number, rate: number, from: AsteroidsSpec['from'], mix?: AsteroidsSpec['mix']): GroupSpec =>
  ({ pattern: 'asteroids', duration, rate, from, ...(mix ? { mix } : {}) });
const ufo = (count: number, delay?: number): GroupSpec => ({ pattern: 'ufo', count, ...(delay ? { delay } : {}) });
const swarm = (count: number, delay?: number): GroupSpec => ({ pattern: 'swarm', count, ...(delay ? { delay } : {}) });
const boss = (id: BossId): GroupSpec => ({ pattern: 'boss', boss: id });
const w = (name: string, ...groups: GroupSpec[]): WaveDef => ({ name, groups });
const later = (g: GroupSpec, delay: number): GroupSpec => ({ ...g, delay });

export const CHAPTERS: readonly ChapterDef[] = [
  {
    name: 'Low Orbit', palette: ['#0B0B2B', '#2A1B5C'],
    waves: [
      w('First Contact', grid('BBBB', 8)),
      w('Feathered Stream', stream(3, 10, 'B', 'LRL', [160, 240, 320], { amp: 60, speed: 220 })),
      w('Red Alert', grid('RBBBB', 8)),
      w('Rock Garden', asteroids(20, 1.2, 'tr', { l: 0.2, m: 0.4, s: 0.4 })),
      w('Merry-Go-Round', rings(ring('B', 10, 100, 0.9), ring('B', 16, 190, -0.9))),
      w('Bounce House', bouncers({ R: 12 })),
      w('Galactic Parade', swoop('BBBB', 8)),
      w('Kamikaze Coop', divers('RBBB', 6, 2.5, 1)),
      w('The Wall', grid('ARRBB', 10)),
      w('BOSS', boss('hen')),
    ],
  },
  {
    name: 'Asteroid Belt', palette: ['#10202B', '#3B2A1A'],
    waves: [
      w('Welcome Committee', swoop('RBBB', 8)),
      w('Meteor Shower', asteroids(25, 1.6, 'tl')),
      w('Chick Storm', swarm(36)),
      w('Triple Spin', rings(ring('B', 8, 80, 1.0), ring('B', 14, 145, -1.0), ring('R', 20, 210, 1.0))),
      w('Saucer Squadron', ufo(4), stream(2, 8, 'B', 'LR', [300, 360], { delay: 2.0 })),
      w('Dive Bombers', divers('RRBBB', 8, 2.0, 1)),
      w('Crossfire Rocks', asteroids(25, 1.8, 'both')),
      w('Armored Front', grid('AARRBB', 10)),
      w('Pinball', bouncers({ R: 8, B: 8 })),
      w('BOSS', boss('carrier')),
    ],
  },
  {
    name: 'Gas Giant Run', palette: ['#2B0F2E', '#7A2E1E'],
    waves: [
      w('Hot Wings', grid('RRBBB', 10, { descendRate: 3 })),
      w('Double Helix', stream(4, 12, 'B', 'LRLR', [150, 210, 270, 330], { amp: 90 })),
      w('Chick Flood', swarm(50)),
      w('Saucer Escort', ufo(6)),
      w('Spin Cycle', rings(ring('R', 10, 80, 1.2), ring('R', 16, 145, -1.2), ring('B', 22, 210, 1.2))),
      w('Iron Parade', swoop('ARRBB', 8)),
      w('Gravel Pit', asteroids(30, 2.0, 'tr', { l: 0.3, m: 0.4, s: 0.3 })),
      w('Rain of Feathers', divers('ARRBB', 10, 1.6, 2)),
      w('Rubber Chickens', bouncers({ A: 6, R: 14 })),
      w('BOSS', boss('rooster')),
    ],
  },
  {
    name: 'Ice Moons', palette: ['#061A33', '#1E4E79'],
    waves: [
      w('Cold Front', swoop('ARRBB', 10)),
      w('Blizzard', asteroids(30, 2.2, 'both')),
      w('Snow Chicks', swarm(60)),
      w('Frozen Orbit', rings(ring('A', 8, 60, 1.1), ring('A', 12, 110, -1.1), ring('R', 16, 160, 1.1), ring('R', 20, 210, -1.1))),
      w('UFO Blockade', ufo(8)),
      w('Avalanche', divers('AARRBB', 10, 1.4, 2)),
      w('Glacier', grid('AARRRB', 12, { descendRate: 4 })),
      w('Hailstorm', stream(4, 14, 'R', 'LRLR', [150, 210, 270, 330], { amp: 80, speed: 260 })),
      w('Ice Rink', bouncers({ A: 12, R: 12 })),
      w('BOSS', boss('twin_hens')),
    ],
  },
  {
    name: 'The Mother Coop', palette: ['#1A0505', '#4A0E0E'],
    waves: [
      w('Last Stand', grid('AAARRR', 12)),
      w('Debris Field', asteroids(35, 2.4, 'both', { l: 0.3, m: 0.4, s: 0.3 })),
      w('Brood War', swarm(70), ufo(2, 3.0)),
      w('Saucer Storm', ufo(8), stream(2, 12, 'R', 'LR', [300, 360], { delay: 2.0 })),
      w('Vortex', rings(ring('A', 8, 60, 1.4), ring('R', 14, 110, -1.4), ring('A', 18, 160, 1.4), ring('R', 22, 210, -1.4))),
      w('Final Parade', swoop('AARRRB', 10)),
      w('Kamikaze Sky', divers('AARRRR', 12, 1.2, 3)),
      w('Chaos Bounce', bouncers({ A: 14, R: 14 }), later(swarm(20), 4.0)),
      w('The Gauntlet', grid('AAAARR', 12, { descendRate: 5 }), ufo(2, 5.0)),
      w('BOSS', boss('dreadnought')),
    ],
  },
];

const ROMAN: readonly (readonly [number, string])[] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(n: number): string {
  let out = '';
  let rest = Math.max(1, Math.floor(n));
  for (const [v, s] of ROMAN) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

/** Table index (0-based) a chapter number maps to; chapters beyond 5 loop. */
export function baseChapterIndex(chapter: number): number {
  return (Math.max(1, Math.floor(chapter)) - 1) % FINAL_CHAPTER;
}

export function chapterDef(chapter: number): ChapterDef {
  return CHAPTERS[baseChapterIndex(chapter)];
}

/** "Low Orbit", then "Low Orbit II", "Low Orbit III" … for endless loops. */
export function chapterDisplayName(chapter: number): string {
  const loop = Math.floor((Math.max(1, Math.floor(chapter)) - 1) / FINAL_CHAPTER);
  const base = chapterDef(chapter).name;
  return loop === 0 ? base : base + ' ' + toRoman(loop + 1);
}

export function waveDef(chapter: number, wave: number): WaveDef {
  const idx = Math.min(WAVES_PER_CHAPTER, Math.max(1, Math.floor(wave))) - 1;
  return chapterDef(chapter).waves[idx];
}
