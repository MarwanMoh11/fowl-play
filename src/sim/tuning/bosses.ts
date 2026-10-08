// src/sim/tuning/bosses.ts — OWNER: H2 (was A2). Boss numbers (§7.13). Angles are in degrees here (90 = straight down).
import type { EnemyKind } from '../types';
import type { BossId } from '../bosses.types';

export interface BossDef {
  kind: EnemyKind;
  hp: number;          // base HP (before difficulty and loop scaling)
  points: number;
  radius: number;
  homes: readonly { x: number; y: number }[];   // one entry per boss body
  entry: number;       // s
}

export const BOSS_DEFS: Record<BossId, BossDef> = {
  hen:         { kind: 'boss_hen', hp: 900, points: 10_000, radius: 95, homes: [{ x: 640, y: 170 }], entry: 2.5 },
  carrier:     { kind: 'boss_carrier', hp: 1300, points: 15_000, radius: 105, homes: [{ x: 640, y: 160 }], entry: 2.5 },
  rooster:     { kind: 'boss_rooster', hp: 1700, points: 20_000, radius: 85, homes: [{ x: 640, y: 150 }], entry: 2.5 },
  twin_hens:   { kind: 'boss_hen', hp: 650, points: 8_000, radius: 95, homes: [{ x: 400, y: 170 }, { x: 880, y: 170 }], entry: 2.5 },
  dreadnought: { kind: 'boss_dreadnought', hp: 3600, points: 50_000, radius: 130, homes: [{ x: 640, y: 165 }], entry: 3.0 },
  // ---- HENPOCALYPSE bosses (docs/HENPOCALYPSE.md §H2); homes are where each entry ends, on the start of its path ----
  broodmother: { kind: 'boss_broodmother', hp: 4200, points: 60_000, radius: 120, homes: [{ x: 640, y: 170 }], entry: 3.0 },
  rotisserie:  { kind: 'boss_rotisserie', hp: 4800, points: 70_000, radius: 130, homes: [{ x: 640, y: 170 }], entry: 3.0 },
  colossus:    { kind: 'boss_colossus', hp: 5600, points: 80_000, radius: 140, homes: [{ x: 640, y: 175 }], entry: 3.0 },
  kraken:      { kind: 'boss_kraken', hp: 6000, points: 90_000, radius: 135, homes: [{ x: 640, y: 160 }], entry: 3.0 },
  phoenix:     { kind: 'boss_phoenix', hp: 6400, points: 100_000, radius: 115, homes: [{ x: 640, y: 150 }], entry: 3.0 },
  scrambler:   { kind: 'boss_scrambler', hp: 7200, points: 120_000, radius: 130, homes: [{ x: 640, y: 140 }], entry: 3.0 },
  empress:     { kind: 'boss_empress', hp: 9000, points: 250_000, radius: 150, homes: [{ x: 640, y: 175 }], entry: 3.5 },
  mini_brigadier: { kind: 'boss_mini_brigadier', hp: 900, points: 15_000, radius: 70, homes: [{ x: 640, y: 150 }], entry: 2.0 },
  mini_ace:       { kind: 'boss_mini_ace', hp: 1000, points: 16_000, radius: 70, homes: [{ x: 640, y: 150 }], entry: 2.0 },
  mini_cuckoo:    { kind: 'boss_mini_cuckoo', hp: 1100, points: 17_000, radius: 72, homes: [{ x: 640, y: 150 }], entry: 2.0 },
  mini_jelly:     { kind: 'boss_mini_jelly', hp: 1200, points: 18_000, radius: 72, homes: [{ x: 640, y: 150 }], entry: 2.0 },
  mini_stormcrow: { kind: 'boss_mini_stormcrow', hp: 1300, points: 19_000, radius: 70, homes: [{ x: 640, y: 150 }], entry: 2.0 },
  mini_scarecrow: { kind: 'boss_mini_scarecrow', hp: 1400, points: 20_000, radius: 72, homes: [{ x: 640, y: 150 }], entry: 2.0 },
  mini_guard:     { kind: 'boss_mini_guard', hp: 1600, points: 22_000, radius: 74, homes: [{ x: 640, y: 150 }], entry: 2.0 },
};

export const BOSS_ENTRY_START_Y = -200;
export const BOSS_FIRST_ATTACK_DELAY = 0.8;   // s after entry (spec silent)
export const TWIN_B_DELAY = 2.0;              // hen B starts half a cycle later
export const TWIN_SURVIVOR_GAP_MUL = 0.85;

/** Minion movement parameters (behaviors are implemented by A3). */
export const MINION = {
  brood: { speed: 260, turnRate: 2.5, heading: 90, spacing: 14 },
  hatchling: { speed: 220, baseY: 260, amp: 50, freq: 0.012 },
  escort: { speed: 180, shotTimer: 2, lanes: [300, 360] as const, spawnX: [-40, 1320] as const },
} as const;

export const HEN = {
  move: { cx: 640, ampX: 380, period: 7, periodPhase1: 5, baseY: 170, ampY: 25, periodY: 2.3 },
  gap: [1.4, 1.0] as const,                     // phase 0, phase 1
  fan: { volleys: 3, interval: 0.45, count: [7, 9] as const, fromDeg: 60, toDeg: 120, speed: 240, originY: 70 },
  rain: { duration: 2.5, rate: [7, 10] as const, spreadX: 90, originY: 60 },
  brood: { count: 5, cap: 8, duration: 0.6 },
  flapFps: 6,
} as const;

export const CARRIER = {
  move: { speed: [90, 140] as const, minX: 220, maxX: 1060, baseY: 160, ampY: 15 },
  gap: 1.2,
  gapMulPerPhase: 0.8,
  speedMulPerPhase: 1.1,
  burst: { count: 5, interval: 0.35, speed: 320, turretDx: [-75, 75] as const, turretDy: 40 },
  hatch: {
    telegraph: 0.6, count: 5, releaseInterval: 0.15, cap: 10, offsetY: 80,
    telegraphLength: 70, telegraphWidth: 80,
  },
  spiral: { duration: 3.0, shotsPerSec: 12, speed: 210, startDeg: 90, stepDeg: 17, twoArmsFromPhase: 2 },
} as const;

export const ROOSTER = {
  path: { cx: 640, ampX: 360, freqX: 0.7, cy: 150, ampY: 50, freqY: 1.4 },
  gap: [1.1, 0.8] as const,
  dive: {
    telegraphWidth: 120, telegraphTtl: 1.2, endY: 720, slide: 0.5, waitUntil: 0.7,
    diveTime: 0.45, diveY: 560, hold: 0.2, returnTime: 0.8,
  },
  sweep: { telegraphTime: 0.8, telegraphWidth: 6, beamWidth: 26, beamLength: 800, fromDeg: 60, toDeg: 120, duration: 1.6, beakDy: 50 },
  ring: { rings: 3, interval: 0.5, knives: [16, 22] as const, stepDeg: 11, speed: 190 },
} as const;

export const DREADNOUGHT = {
  move: { cx: 640, ampX: 300, freq: 0.4, y: 165 },
  gap: [1.2, 1.0, 0.8] as const,                // per phase
  phaseInvuln: 1.5,
  turretDx: [-140, -70, 70, 140] as const,
  turretDy: 45,
  hatchOffsetY: 100,
  fanCount: 11,
  rainRate: 10,
  broodCount: 6,
  knives: 24,
  beakDy: 80,
} as const;
