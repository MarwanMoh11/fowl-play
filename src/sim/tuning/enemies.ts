// src/sim/tuning/enemies.ts — OWNER: A3. Enemy table and pattern constants (§7.6, §7.11).
import type { EnemyKind, PickupKind } from '../types';

export interface EnemyDef {
  radius: number;
  hp: number;
  points: number;
  eggRate: number;            // eggs per second (base)
  food: PickupKind | null;    // food dropped on death
  foodChance: number;         // 0..1 probability of the food drop
  splitInto: EnemyKind | null; // asteroids: break into 2 of this kind
}

const NO_FOOD = { food: null, foodChance: 0, eggRate: 0, splitInto: null } as const;

export const ENEMY_BASE: Record<EnemyKind, EnemyDef> = {
  chicken_basic:   { radius: 22, hp: 1, points: 100, eggRate: 0.05, food: 'drumstick', foodChance: 1, splitInto: null },
  chicken_red:     { radius: 24, hp: 3, points: 250, eggRate: 0.07, food: 'drumstick', foodChance: 1, splitInto: null },
  chicken_armored: { radius: 26, hp: 7, points: 500, eggRate: 0.08, food: 'roast', foodChance: 1, splitInto: null },
  chicken_ufo:     { radius: 30, hp: 5, points: 400, eggRate: 0.04, food: 'roast', foodChance: 1, splitInto: null },
  chick:           { radius: 14, hp: 1, points: 50, eggRate: 0, food: 'drumstick', foodChance: 0.2, splitInto: null },
  asteroid_l:      { radius: 40, hp: 8, points: 200, ...NO_FOOD, splitInto: 'asteroid_m' },
  asteroid_m:      { radius: 26, hp: 3, points: 100, ...NO_FOOD, splitInto: 'asteroid_s' },
  asteroid_s:      { radius: 14, hp: 1, points: 50, ...NO_FOOD },
  // Boss values are the base numbers of §7.13; A2 overrides hp/points (difficulty, twin hens).
  boss_hen:        { radius: 95, hp: 900, points: 10000, ...NO_FOOD },
  boss_carrier:    { radius: 105, hp: 1300, points: 15000, ...NO_FOOD },
  boss_rooster:    { radius: 85, hp: 1700, points: 20000, ...NO_FOOD },
  boss_dreadnought: { radius: 130, hp: 3600, points: 50000, ...NO_FOOD },
};

/** Kind letters used by the chapter tables (§7.11). */
export const KIND_LETTERS: Record<string, EnemyKind> = {
  B: 'chicken_basic', R: 'chicken_red', A: 'chicken_armored', U: 'chicken_ufo', C: 'chick',
};

export const POINTS_ROUND_TO = 10;
export const START_DELAY = 0.8;         // default start of a wave's first group (s)

// Lost-enemy guard (§7.6.2).
export const LOST_ENEMY = { minX: -400, maxX: 1680, minY: -400, maxY: 1120, seconds: 5 } as const;

// Eggs (§7.1, §7.6.2, §7.7).
export const EGG = {
  zoneMinX: 0, zoneMaxX: 1280,
  diveRateMul: 3,
  launchVy: 60,          // initial fall speed; gravity and max speed come from A2's per-kind defaults
  spawnYFactor: 0.6,     // egg spawns at y + radius × factor
} as const;

// Rotation (§7.6.2).
export const TILT = { divisor: 800, max: 0.25 } as const;
export const BOUNCE_WOBBLE = { amp: 0.15, freq: 6 } as const;

// Aimed shots (UFO, escorts) (§7.6.2, §7.11).
export const AIMED_SHOT = {
  speed: 300, firstMin: 1.0, firstMax: 2.5, gapMin: 2.5, gapMax: 4.0,
  screenMinX: 0, screenMaxX: 1280, screenMinY: 0, screenMaxY: 720,
} as const;

export const FORMATION_BOB = { amp: 4, freq: 4 } as const;

export const GRID = {
  spacingX: 80, spacingY: 60, topY: 110, swayPeriod: 5, bobAmp: 10, bobPeriod: 3,
  descendRate: 0, maxBottomY: 440,
  centerX: 640, entryTime: 2.0, entryAbove: 100, swayAmpMax: 140, swayMargin: 60,
} as const;

export const STREAM = {
  amp: 60, freq: 0.012, speed: 220, spacing: 0.35, groupGap: 1.2,
  leftX: -60, rightX: 1340, rowStep: 70, maxBaseY: 380, resetBaseY: 140,
  yFollow: 500,          // px/s max vertical correction (lets shared stream users start off-curve)
} as const;

export const SWOOP = {
  streams: 4, memberGap: 0.18, streamGap: 1.6, pathDuration: 2.4, swayRamp: 1.0,
  left: { p0: { x: -80, y: 520 }, p1: { x: 300, y: 60 }, p2: { x: 760, y: 640 } },
  mirrorWidth: 1280,
} as const;

export const RING = {
  centerX: 640, centerY: 250, driftAmp: 180, driftPeriod: 8, pulseAmp: 20, pulsePeriod: 3,
  entryRadius: 900, entryTime: 2.0,
} as const;

export const DIVERS = {
  simultaneous: 1, diveDuration: 1.6, returnDuration: 1.2,
  dropY: 200, aimY: 600, exitXOffset: 160, exitY: 800, reappearY: -50, centerX: 640,
} as const;

export const BOUNCE = {
  speedMin: 160, speedMax: 240, ceilY: 80, floorY: 470, spawnGap: 0.25,
  spawnMinX: 100, spawnMaxX: 1180, spawnY: -40, enterSpeed: 200, activateOffset: 20,
  angleMin: 20, angleMax: 160, wallLeft: 30, wallRight: 1250,
} as const;

export const ASTEROIDS = {
  mix: { l: 0.2, m: 0.4, s: 0.4 },
  speed: {
    asteroid_l: { min: 160, max: 220 },
    asteroid_m: { min: 200, max: 260 },
    asteroid_s: { min: 240, max: 300 },
  },
  trAngle: { min: 125, max: 145 },
  topEdge: { minX: 400, maxX: 1400, y: -60 },
  sideEdge: { x: 1340, minY: -60, maxY: 300 },
  worldWidth: 1280, worldHeight: 720,
  spin: 2,
  splitAngle: 25, splitSpeedMul: 1.15,
} as const;

export const UFO = {
  lanes: [130, 200, 270, 340], speedMin: 150, speedMax: 220, gap: 0.6,
  minX: 80, maxX: 1200, leftX: -60, rightX: 1340, laneFollow: 200,
} as const;

export const SWARM = {
  spawnGap: 0.05, spawnMinX: 100, spawnMaxX: 1180, spawnY: -30, offsetRadius: 150,
  kamikazeInterval: 6, kamikazeFraction: 0.1, maxSpeed: 320, maxAccel: 900,
  kamikazeSpeed: 380, respawnBelowY: 780,
  arriveGain: 6,         // desired speed = min(maxSpeed, distance × gain): damps overshoot around the target
  leader: { x: 640, xAmp: 480, xFreq: 0.5, y: 220, yAmp: 110, yFreq: 0.9, yPhase: 1 },
} as const;

/** Behaviors used by other agents' minions (SHARED members). */
export const OFFSCREEN = { minX: -40, maxX: 1320, minY: -40, maxY: 760 } as const;

/** Carry plan (§7.8): guaranteed drops per wave. */
export const CARRY: { spanFraction: number; giftWaves: readonly number[]; maxTries: number } = {
  spanFraction: 0.8, giftWaves: [3, 6, 9], maxTries: 20,
};
