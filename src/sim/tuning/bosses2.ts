// src/sim/tuning/bosses2.ts — OWNER: H2. HENPOCALYPSE boss and mini-boss attack numbers (docs/HENPOCALYPSE.md §H2).
// Angles are degrees here (90 = straight down); attack code converts them. HP/radius/points live in BOSS_DEFS.

export const BROOD = {
  move: { cx: 640, cy: 170, ampX: 300, ampY: 40, period: 9 },
  gap: [1.4, 1.1, 0.9] as const,
  flapFps: 6,
  spiral: { duration: 3, shotsPerSec: 14, arms: 2, speed: 200, stepDeg: 13 },
  pods: { count: 3, spacing: 180, vy: 45, cap: 6, duration: 0.6 },
  feather: { volleys: 3, interval: 0.4, count: 7, halfSpreadDeg: 30, speed: 230 },
  cloak: { duration: 2.4, teleportAt: 2, teleportX: [300, 980] as const, clampX: [340, 940] as const, ringCount: 24, ringSpeed: 190 },
} as const;

export const ROTI = {
  move: { minX: 260, maxX: 1020, y: 170, speed: [80, 100, 120] as const },
  gap: [1.3, 1.0, 0.8] as const,
  spit: { duration: 2.5, arms: 4, armInterval: 0.18, speed: 220, rotDegPerSec: 50 },
  grease: { duration: 2.5, rate: 14, minX: 60, maxX: 1220, y: 0 },
  flame: { telegraph: 0.8, duration: 1.6, width: 34, fromDeg: 60, toDeg: 120, dy: 50, telegraphWidth: 6, length: 800 },
  roast: { rings: 3, interval: 0.4, count: 18, speed: 210 },
} as const;

export const COLOSSUS = {
  move: { xs: [640, 360, 640, 920] as const, y: 175, stepSec: 3, easeSec: 0.8 },
  gap: [1.3, 1.1, 0.9, 0.55] as const,
  gear: { counts: [5, 5, 5, 9] as const, interval: 0.3, halfSpreadDeg: 20, speed: 260 },
  piston: { offsets: [0, -180, 180] as const, telegraph: 0.9, beam: 0.5, teleWidth: 8, beamWidth: 56 },
  clock: { telegraph: 1.0, duration: 3.0, length: 700, width: 20, teleWidth: 4, startDeg: [125, 55] as const, rateDegPerSec: [40, 110] as const },
  swarm: { count: 8, cap: 16, speed: 200, turnRate: 2.5, duration: 1.0 },
} as const;

export const KRAKEN = {
  move: { cx: 640, ampX: 150, periodX: 8, cy: 160, ampY: 30, periodY: 3 },
  gap: [1.3, 1.0, 0.85] as const,
  slam: { telegraph: 1.0, beam: 0.6, anglesDeg: [60, 120] as const, length: 900, teleWidth: 8, beamWidth: 40 },
  ink: { anglesDeg: [70, 90, 110] as const, speed: 140, homing: 1.0, duration: 0.6 },
  rings: { rings: 4, interval: 0.45, count: 16, stepDeg: 11, speed: 200 },
  whirl: { radius: 520, power: 160, duration: 4, arms: 1, eventsPerSec: 4, speed: 170, stepDeg: 10 },
  grab: { telegraph: 1.0, beam: 0.5, width: 140, count: 2, spacing: 2.0 },
} as const;

export const PHOENIX = {
  move: { cx: 640, cy: 150, ampX: 380, freqX: 0.8, ampY: 50, freqY: 1.4 },
  gap: [1.1, 0.9] as const,
  rebirth: { hpFrac: 0.5, invuln: 2.5, gapMul: 0.8 },
  fan: { volleys: 3, interval: 0.6, count: 11, fromDeg: 50, toDeg: 130, speed: 230 },
  lightning: { count: 4, interval: 0.3, telegraph: 0.8, beam: 0.35, teleWidth: 8, beamWidth: 36, minX: 60, maxX: 1220 },
  ash: { rings: 2, interval: 0.5, count: 28, stepDeg: 6, speed: 190 },
} as const;

export const SCRAMBLER = {
  move: { cx: 640, cy: 200, radius: 60, period: 8 },
  gap: [1.2, 1.0, 0.85] as const,
  well: { radius: 600, power: [70, 110, 150] as const, ttl: 1.1 },
  arms: { duration: 3.5, arms: 4, eventsPerSec: 4, speed: 180, stepDeg: 23 },
  horizon: { count: 32, radius: 380, speed: 120, gapSlots: 3, duration: 1.0 },
  spaghetti: { telegraph: 0.9, beam: 0.5, anglesDeg: [-35, -15, 15, 35] as const, length: 900, teleWidth: 6, beamWidth: 22 },
  swallow: { max: 12, speed: 150, homing: 1.2, duration: 0.8 },
} as const;

export const EMPRESS = {
  move: {
    cx: 640, cy: 175, minX: 240, maxX: 1040,
    glideAmp: 200, glidePeriod: 10, sweepAmp: 360, sweepPeriod: 7,
    ampA: 300, periodA: 5.3, ampB: 120, periodB: 2.1, ampY: 25, periodY: 4,
  },
  gap: [1.2, 1.0, 0.9, 0.75] as const,
  invuln: 1.5,
  decree: { volleys: 5, interval: 0.25, count: 3, halfSpreadDeg: 10, speed: 230 },
  crown: { duration: 3, arms: 3, eventsPerSec: 4, speed: 200, stepDeg: 14 },
  guard: { count: 4, cap: 6, duration: 0.5, laneY: [300, 360] as const, speed: 170, shotTimer: 2, spawnX: [-40, 1320] as const },
  cross: { telegraph: 1.0, beam: 2.0, length: 1000, width: 26, teleWidth: 6, startDeg: [45, 135] as const, rateDegPerSec: 45 },
  nova: { rings: 3, interval: 0.4, count: 36, stepDeg: 5, speed: 170, well: { radius: 450, power: 140, ttl: 2.5 } },
  apocalypse: { duration: 4, rate: 24, y: 60, laneWidth: 160, laneCenters: [400, 880] as const, driftAmp: 80, driftPeriod: 8 },
} as const;

export const BRIGADIER = {
  move: { cx: 640, y: 150, ampX: 300, speed: 110 },
  gap: [1.2, 1.0] as const,
  shotgun: { volleys: 3, interval: 0.5, count: 5, halfSpreadDeg: 25, speed: 220 },
  salute: { telegraph: 0.9, beam: 0.45, teleWidth: 8, beamWidth: 48, duration: 0.2 },
  brood: { count: 4, cap: 8, speed: 240, turnRate: 2.5, duration: 0.6 },
} as const;

export const ACE = {
  waypoints: [{ x: 240, y: 150 }, { x: 1040, y: 150 }, { x: 1040, y: 250 }, { x: 240, y: 250 }] as const,
  zipSpeed: 420,
  gap: [1.0, 0.8] as const,
  strafe: { duration: 3, interval: 0.12, speed: 260 },
  ring: { count: 16, speed: 190, duration: 0.3 },
  escorts: { count: 2, speed: 180, shotTimer: 2, lanes: [300, 360] as const, spawnX: [-40, 1320] as const },
} as const;

export const CUCKOO = {
  home: { x: 640, y: 150 },
  gap: [1.2, 0.9] as const,
  tock: { telegraph: 1.0, duration: 2.0, centerDeg: 90, swingDeg: 30, length: 900, teleWidth: 6, beamWidth: 22 },
  gears: { count: 8, speed: 230, duration: 0.4 },
  fasterMul: 1.3,
} as const;

export const JELLY = {
  move: { cx: 640, cy: 150, ampX: 200, periodX: 9, ampY: 25, periodY: 6 },
  gap: [1.0, 0.8] as const,
  drip: { columns: [-120, 0, 120] as const, rate: 5, duration: 2, y: 60 },
  pulse: { count: 24, speed: 200, duration: 0.5 },
  orbs: { anglesDeg: [70, 110] as const, speed: 140, homing: 1.0, duration: 0.6 },
} as const;

export const STORMCROW = {
  move: { cx: 640, cy: 150, ampX: 380, periodX: 8, ampY: 60, periodY: 4 },
  gap: [1.0, 0.8] as const,
  thunder: { count: 3, spacing: 0.4, telegraph: 0.8, beam: 0.35, teleWidth: 8, beamWidth: 40, minX: 100, maxX: 1180 },
  fan: { count: 9, volleys: 1, interval: 0.3, halfSpreadDeg: 40, speed: 240 },
} as const;

export const SCARECROW = {
  home: { x: 640, y: 150 },
  gap: [1.2, 1.0] as const,
  crow: { count: 5, cap: 10, speed: 200, turnRate: 2.5, duration: 0.5 },
  hay: { duration: 2.5, arms: 2, eventsPerSec: 8, speed: 170, stepDeg: 14 },
  well: { radius: 300, power: 90, ttl: 1.1 },
} as const;

export const GUARD = {
  shield: 300,
  shieldAfter: 200,
  home: { x: 640, y: 150 },
  gap: [1.4, 1.0] as const,
  lance: { telegraph: 0.8, dash: 0.35, hold: 0.2, back: 0.6, dashY: 560, width: 30, clampX: [200, 1080] as const },
  volley: { volleys: 3, interval: 0.5, count: 3, halfSpreadDeg: 12, speed: 230 },
} as const;
