// src/sim/tuning/enemies.ts — OWNER: H3 (was A3). Enemy table and pattern constants (§7.6, §7.11).
import type { EnemyKind, PickupKind } from '../types';

export interface EnemyDef {
  radius: number;
  hp: number;
  points: number;
  eggRate: number;            // eggs per second (base)
  food: PickupKind | null;    // food dropped on death
  foodChance: number;         // 0..1 probability of the food drop
  splitInto: EnemyKind | null; // asteroids: break into 2 of this kind
  shield?: number;            // HENPOCALYPSE shield pool, absorbs damage before hp (absent = 0)
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
  // ---- HENPOCALYPSE armada (final numbers, docs/HENPOCALYPSE.md §H3) ----
  chicken_ninja:   { radius: 22, hp: 3, points: 350, eggRate: 0.05, food: 'drumstick', foodChance: 1, splitInto: null },
  chicken_bomber:  { radius: 26, hp: 4, points: 400, eggRate: 0, food: 'drumstick', foodChance: 1, splitInto: null },
  egg_pod:         { radius: 20, hp: 6, points: 300, ...NO_FOOD },
  chicken_jet:     { radius: 22, hp: 2, points: 300, eggRate: 0, food: 'drumstick', foodChance: 1, splitInto: null },
  chicken_turret:  { radius: 28, hp: 10, points: 600, eggRate: 0, food: 'roast', foodChance: 1, splitInto: null },
  chicken_shield:  { radius: 26, hp: 4, points: 500, eggRate: 0.06, shield: 8, food: 'roast', foodChance: 1, splitInto: null },
  chicken_mech:    { radius: 34, hp: 20, points: 1000, eggRate: 0, food: 'roast', foodChance: 1, splitInto: null },
  space_mine:      { radius: 18, hp: 3, points: 150, ...NO_FOOD },
  chicken_ghost:   { radius: 24, hp: 4, points: 450, eggRate: 0.06, food: 'drumstick', foodChance: 1, splitInto: null },
  chicken_healer:  { radius: 24, hp: 5, points: 600, eggRate: 0.03, food: 'roast', foodChance: 1, splitInto: null },
  chicken_sniper:  { radius: 24, hp: 4, points: 550, eggRate: 0, food: 'drumstick', foodChance: 1, splitInto: null },
  chicken_mother:  { radius: 36, hp: 15, points: 900, eggRate: 0.04, food: 'roast', foodChance: 1, splitInto: null },
  chicken_void:    { radius: 26, hp: 6, points: 700, eggRate: 0, food: 'roast', foodChance: 1, splitInto: null },
  chicken_gold:    { radius: 26, hp: 8, points: 5000, ...NO_FOOD },
  chicken_elite:   { radius: 30, hp: 14, points: 1200, eggRate: 0.06, shield: 10, food: 'roast', foodChance: 1, splitInto: null },
  comet:           { radius: 20, hp: 2, points: 150, ...NO_FOOD },
  // HENPOCALYPSE bosses: base values only; H2 overrides hp/points/radius from tuning/bosses.ts.
  boss_broodmother: { radius: 120, hp: 4200, points: 60000, ...NO_FOOD },
  boss_rotisserie:  { radius: 130, hp: 4800, points: 70000, ...NO_FOOD },
  boss_colossus:    { radius: 140, hp: 5600, points: 80000, ...NO_FOOD },
  boss_kraken:      { radius: 135, hp: 6000, points: 90000, ...NO_FOOD },
  boss_phoenix:     { radius: 115, hp: 6400, points: 100000, ...NO_FOOD },
  boss_scrambler:   { radius: 130, hp: 7200, points: 120000, ...NO_FOOD },
  boss_empress:     { radius: 150, hp: 9000, points: 250000, ...NO_FOOD },
  boss_mini_brigadier: { radius: 70, hp: 900, points: 15000, ...NO_FOOD },
  boss_mini_ace:       { radius: 70, hp: 1000, points: 16000, ...NO_FOOD },
  boss_mini_cuckoo:    { radius: 72, hp: 1100, points: 17000, ...NO_FOOD },
  boss_mini_jelly:     { radius: 72, hp: 1200, points: 18000, ...NO_FOOD },
  boss_mini_stormcrow: { radius: 70, hp: 1300, points: 19000, ...NO_FOOD },
  boss_mini_scarecrow: { radius: 72, hp: 1400, points: 20000, ...NO_FOOD },
  boss_mini_guard:     { radius: 74, hp: 1600, points: 22000, ...NO_FOOD },
};

/** Kind letters used by the chapter tables (§7.11; HENPOCALYPSE letters N X S W T G H K M V E). */
export const KIND_LETTERS: Record<string, EnemyKind> = {
  B: 'chicken_basic', R: 'chicken_red', A: 'chicken_armored', U: 'chicken_ufo', C: 'chick',
  N: 'chicken_ninja', X: 'chicken_bomber', S: 'chicken_shield', W: 'chicken_mech', T: 'chicken_turret',
  G: 'chicken_ghost', H: 'chicken_healer', K: 'chicken_sniper', M: 'chicken_mother', V: 'chicken_void',
  E: 'chicken_elite',
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

// ---- HENPOCALYPSE armada (H3) ----

/** Enemy abilities (abilities.ts). Times in s; speeds in px/s before DIFFICULTY.shotSpeed. */
export const ABILITY = {
  ninja: { period: 3.0, cloak: 0.6, knifeSpeed: 380 },
  bomber: { clusterRate: 0.12, fuseMin: 0.9, fuseMax: 1.4, dropSpeed: 60 },
  pod: { hatchAfter: 6, chicks: 3, chickSpeed: 240, chickTurn: 2.5, spread: 0.6 },
  turret: { period: 2.5, burst: 3, gap: 0.12, speed: 300 },
  regen: { delay: 3, perSecond: 2 },
  elite: { period: 3, shots: 5, step: 0.21, speed: 260 },
  mech: { period: 3, speed: 220 },
  mine: { trigger: 90, shards: 8, shardSpeed: 220 },
  ghost: { cycle: 4, cloakAt: 2.5 },
  healer: { period: 2, radius: 160, fraction: 0.15 },
  sniper: { period: 4, telegraph: 0.9, width: 4, speed: 700, reach: 1400 },
  mother: { period: 4, spawn: 2, cap: 24, chickSpeed: 200, chickTurn: 1.5 },
  void: { period: 2.5, speed: 160, homing: 1.2, ttl: 6, minX: 120, maxX: 1160, minY: 80, maxY: 360 },
} as const;

/** Armada movers and spawn lanes for the HENPOCALYPSE patterns (patterns/flyers.ts, patterns/drops.ts). */
export const JETS = {
  speed: 460, lanes: [140, 220, 300], vGap: 1.2, spacingX: 44, spacingY: 28,
  wobbleAmp: 20, wobbleFreq: 3, leftX: -60, rightX: 1340,
} as const;
export const TURRETS = { parkY: 110, enterY: -60, enterTime: 1.6, minX: 200, maxX: 1080 } as const;
export const MOTHERS = { homeY: 170, ampY: 30, ampX: 300, spacing: 260, freq: 0.5, rise: 200 } as const;
export const VOIDS = { gap: 0.6 } as const;
export const PODS = { spawnY: -30, minX: 120, maxX: 1160, drift: 40 } as const;
export const MINES = {
  spawnY: -30, minX: 60, maxX: 1220, minSpeed: 30, maxSpeed: 60, swayAmp: 40, minSwayFreq: 0.6, maxSwayFreq: 1.0,
  bottomY: 740,
} as const;
export const COMETS = {
  spawnY: -30, minSpeed: 380, maxSpeed: 520, leftMaxX: 240, rightMinX: 1040, minAngle: 55, maxAngle: 70, spinMax: 2,
} as const;

/** Golden chickens (waves.ts): a roll each second of a non-boss wave; the chicken flees across the screen. */
export const GOLDEN = {
  chancePerSec: 0.006, minY: 120, maxY: 260, speed: 300, zigzagAmp: 80, zigzagHz: 1.5,
  spawnLeftX: -40, spawnRightX: 1320, leftExitX: -60, rightExitX: 1340,
} as const;

/** Environmental hazards (envHazards.ts), keyed by chapter: 7 solar flares, 10 lightning, 11 gravity well. */
export const ENV = {
  firstAt: 3,
  flare: { every: 9, width: 90, telegraph: 1.2, beam: 0.6, minX: 60, maxX: 1220 },
  lightning: { every: 6, width: 50, telegraph: 0.9, beam: 0.3, strikes: 2, gap: 0.4, minX: 60, maxX: 1220 },
  well: { radius: 380, power: 90, y: 200, centerX: 640, swayAmp: 420, swayRate: 0.15, ttl: 0.25 },
} as const;
