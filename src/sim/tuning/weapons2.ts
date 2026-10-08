// src/sim/tuning/weapons2.ts — OWNER: H1 (ARSENAL). Numbers for the six HENPOCALYPSE weapons and drones (§H1 P0.1, P0.4).
// Every per-level table has 11 entries: index = weapon power 0..10.

/** Scatter flak: short-range shotgun cone. Pellets get +2 per extraBolts stack. */
export const FLAK = {
  rate: 3.2,
  heat: 9,
  pellets: [5, 6, 7, 7, 8, 9, 9, 10, 11, 12, 13],
  coneBaseDeg: 40,         // cone = coneBaseDeg + coneStepDeg × power
  coneStepDeg: 3,
  speed: 900,
  speedMin: 0.9,           // speed × (speedMin + speedRange × ((i × 53) % 11) / 10)
  speedRange: 0.2,
  ttl: 0.38,               // s; 900 × 0.38 ≈ 342 px of reach
  radius: 4,
  damage: [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3],
  pierce: 1,
  pelletExtra: 2,          // pellets added per extraBolts stack
} as const;

/** Plasma torch: close-range flame fan. Ticks alternate the fan's sign on odd game ticks. */
export const FLAME = {
  rate: 16,
  heat: 3.2,
  flames: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5],
  spreadBaseDeg: 12,       // half-angle = spreadBaseDeg + spreadStepDeg × power
  spreadStepDeg: 1.2,
  speed: 620,
  ttl: 0.32,
  radius: 9,
  damage: [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
  pierce: 3,
} as const;

/** Sky sickle: blades fly up, stop, fall back through the ship and hit again on the way down. */
export const SICKLE = {
  rate: 2.2,
  heat: 10,
  blades: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
  fanDeg: 8,               // blades are fanned this far apart
  vy: -1100,               // launch velocity (x is tan(angle) × 1100)
  accelY: 1500,            // gravity that turns them round
  ttl: 1.6,
  radius: 13,
  pierce: 99,
  damage: [2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7],
} as const;

/** Hive seekers: micro-missiles that home on the nearest enemy above the ship. */
export const HOMING = {
  rate: 6,
  heat: 6,
  seekers: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
  fanStepDeg: 25,          // seeker k launches at -90° ± fanStepDeg × ceil(k/2), alternating sides
  speed: 560,
  turn: 5.5,               // rad/s
  radius: 5,
  ttl: 2.2,
  damage: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3],
} as const;

/** Rail lance: hitscan column from the nose to the top of the screen. */
export const RAIL = {
  rate: 1.4,
  heat: 22,
  width: [10, 10, 12, 12, 14, 14, 16, 16, 18, 18, 22],
  damage: [10, 13, 16, 19, 22, 26, 30, 34, 38, 43, 50],
  lanceSpacing: 24,        // extra lances (extraBolts) alternate ±24 px, ±48 px…
} as const;

/** Prism splitter: crystal rounds that shatter into shards when they hit. */
export const PRISM = {
  rate: 4,
  heat: 8,
  crystals: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
  spacing: 16,
  speed: 1000,
  radius: 7,
  damage: [3, 3, 4, 4, 5, 5, 5, 6, 6, 7, 8],
  pierce: 1,
  shards: [2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6],
  shardSpeed: 700,
  shardRadius: 4,
  shardTtl: 0.6,
} as const;

/** Drones (§H1 P0.4): one pulse bolt per drone per volley, capped at maxPerSec volleys. */
export const DRONE = {
  speed: 900,
  radius: 4,
  aimConeDeg: 30,          // toward the nearest enemy inside this cone above the drone, else straight up
  maxPerSec: 8,
  damageScale: 0.5,        // drone damage = max(1, round(level damage × damageScale))
  overdriveMin: 2,         // overdrive fires at least this many drones, even without the drones power-up
} as const;
