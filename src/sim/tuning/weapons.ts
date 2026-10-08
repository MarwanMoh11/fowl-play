// src/sim/tuning/weapons.ts — OWNER: H1 (was A2). Player, weapon, heat, missile and projectile numbers (§7.3–§7.7).
import type { ProjectileKind, WeaponId } from '../types';

/** Ship (§7.3). */
export const PLAYER = {
  radius: 14,
  pickupRadius: 36,
  keyboardSpeed: 480,        // px/s
  pointerMaxSpeed: 1100,     // px/s
  bankDivisor: 600,          // bank target = clamp(vx / bankDivisor, -1, 1)
  bankRate: 8,               // units/s
  startInvuln: 2.0,          // s
  respawnInvuln: 3.0,        // s
  respawnDelay: 1.5,         // s (lives left)
  respawnClearRadius: 200,   // px, enemy projectiles cleared around the spawn point
  noseOffset: 26,            // bolts leave at (x, y - noseOffset)
} as const;

/** Heat (§7.4). */
export const HEAT = {
  max: 100,
  coolRate: 30,              // per s
  overheatCoolRate: 40,      // per s while overheated
  recoverAt: 25,             // overheated clears at or below this
  perPowerLevel: 0.04,       // volley heat × (1 + this × power)
} as const;

export const BOLT_TTL = 2.0;
export const BOLT_MIN_Y = -40;
export const BOLT_MIN_X = -60;
export const BOLT_MAX_X = 1340;
/** Float slack for countdown timers that should land exactly on a whole number of ticks. */
export const TIMER_EPSILON = 1e-9;
export const POWER_OVERFLOW_SCORE = 500;

export interface PulseLevel { bolts: number; spread: number; damage: number }
export interface ParallelLevel { bolts: number; damage: number; pierce: number }
export interface ArcLevel { targets: number; damage: number }

const lv = <T>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));

const PULSE_BOLTS = [1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7];
const PULSE_SPREAD = [0, 6, 12, 16, 22, 26, 32, 36, 42, 46, 52];
const PULSE_DAMAGE = [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
const NEUTRON_BOLTS = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];
const NEUTRON_DAMAGE = [3, 4, 3, 4, 5, 4, 5, 6, 5, 6, 7];
const LASER_BEAMS = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
const LASER_PIERCE = [1, 2, 3, 2, 3, 4, 5, 4, 5, 6, 8];
const LASER_DAMAGE = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2];
const ARC_TARGETS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6];
const ARC_DAMAGE = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8];

export const PULSE = {
  rate: 7, speed: 950, radius: 5, heat: 7, pierce: 1,
  levels: lv<PulseLevel>(11, (i) => ({ bolts: PULSE_BOLTS[i], spread: PULSE_SPREAD[i], damage: PULSE_DAMAGE[i] })),
} as const;

export const NEUTRON = {
  rate: 5, speed: 1050, radius: 7, heat: 8, pierce: 1, spacing: 14,
  levels: lv<ParallelLevel>(11, (i) => ({ bolts: NEUTRON_BOLTS[i], damage: NEUTRON_DAMAGE[i], pierce: 1 })),
} as const;

export const LASER = {
  rate: 10, speed: 1500, radius: 4, heat: 5, spacing: 18,
  levels: lv<ParallelLevel>(11, (i) => ({ bolts: LASER_BEAMS[i], damage: LASER_DAMAGE[i], pierce: LASER_PIERCE[i] })),
} as const;

export const ARC = {
  rate: 5, heat: 10, rangeBase: 320, rangePerLevel: 20, hopRange: 170,
  coneDeg: 60,               // ± from straight up
  fallback: { speed: 1000, radius: 5, damage: 1, pierce: 1 },
  levels: lv<ArcLevel>(11, (i) => ({ targets: ARC_TARGETS[i], damage: ARC_DAMAGE[i] })),
} as const;

// Phase-0 placeholders for the six HENPOCALYPSE weapons (H1 replaces with real tables).
export const WEAPON_RATE: Record<WeaponId, number> = {
  pulse: PULSE.rate, neutron: NEUTRON.rate, laser: LASER.rate, arc: ARC.rate,
  flak: PULSE.rate, flame: PULSE.rate, sickle: PULSE.rate, homing: PULSE.rate, rail: PULSE.rate, prism: PULSE.rate,
};
export const WEAPON_HEAT: Record<WeaponId, number> = {
  pulse: PULSE.heat, neutron: NEUTRON.heat, laser: LASER.heat, arc: ARC.heat,
  flak: PULSE.heat, flame: PULSE.heat, sickle: PULSE.heat, homing: PULSE.heat, rail: PULSE.heat, prism: PULSE.heat,
};

/** Missile (§7.5). */
export const MISSILE = {
  cooldown: 1.0,
  flightTime: 0.55,
  target: { x: 640, y: 300 },
  radius: 10,
  boundsX: [-40, 1320] as const,
  boundsY: [-40, 760] as const,
  killDamage: 9999,
  bossDamage: 60,
} as const;

/** Enemy projectile defaults per kind (§7.7). Player kinds listed for completeness. */
export interface ProjectileDef {
  radius: number;
  ttl: number;
  damage: number;
  pierce: number;
  ax: number;
  ay: number;
  rotateWithVelocity: boolean;
}
export const PROJECTILE_DEFS: Record<ProjectileKind, ProjectileDef> = {
  bolt:          { radius: 5,  ttl: BOLT_TTL, damage: 1, pierce: 1, ax: 0, ay: 0, rotateWithVelocity: true },
  missile:       { radius: MISSILE.radius, ttl: MISSILE.flightTime, damage: 0, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: true },
  egg:           { radius: 8,  ttl: 12, damage: 1, pierce: 0, ax: 0, ay: 420, rotateWithVelocity: false },
  enemy_shot:    { radius: 7,  ttl: 6,  damage: 1, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: false },
  boss_egg:      { radius: 10, ttl: 6,  damage: 1, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: false },
  feather_knife: { radius: 8,  ttl: 6,  damage: 1, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: true },
  cluster_egg:   { radius: 10, ttl: 12, damage: 1, pierce: 0, ax: 0, ay: 300, rotateWithVelocity: false },
  shard:         { radius: 5,  ttl: 5,  damage: 1, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: true },
  void_orb:      { radius: 11, ttl: 7,  damage: 1, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: false },
  fireball:      { radius: 14, ttl: 7,  damage: 1, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: true },
  gear:          { radius: 12, ttl: 7,  damage: 1, pierce: 0, ax: 0, ay: 0, rotateWithVelocity: false },
};

export const EGG = { startVy: 60, maxSpeed: 420, spawnOffsetFactor: 0.6 } as const;

/** Off-screen limits for enemy projectiles. */
export const ENEMY_PROJECTILE_BOUNDS = { minX: -60, maxX: 1340, minY: -120, maxY: 780 } as const;
