// src/sim/tuning/economy.ts — OWNER: LEAD. Pickups, drops, scoring constants (§7.5, §7.8, §7.9).
import type { PickupKind } from '../types';

export const FOOD_PER_MISSILE = 100;
export const FOOD_UNITS: Record<'drumstick' | 'roast', number> = { drumstick: 1, roast: 10 };
export const FOOD_POINTS: Record<'drumstick' | 'roast', number> = { drumstick: 100, roast: 1000 };

export type PickupMotion =
  | { type: 'pop'; popVy: number; popVx: number; gravity: number; maxFall: number; spin: number }
  | { type: 'sway'; fall: number; swayAmp: number; swayHz: number; spin: number };

export interface PickupDef { radius: number; motion: PickupMotion }

const FOOD_POP = { popVy: -140, popVx: 40, gravity: 380, maxFall: 300 } as const;
const GIFT_MOTION: PickupMotion = { type: 'sway', fall: 110, swayAmp: 30, swayHz: 1.2, spin: 1 };
const PU_MOTION: PickupMotion = { type: 'sway', fall: 100, swayAmp: 26, swayHz: 1.4, spin: 0 };
const CORN_MOTION: PickupMotion = { type: 'pop', popVy: -160, popVx: 60, gravity: 380, maxFall: 280, spin: 3 };

export const PICKUP_DEFS: Record<PickupKind, PickupDef> = {
  drumstick:    { radius: 14, motion: { type: 'pop', ...FOOD_POP, spin: 4 } },
  roast:        { radius: 18, motion: { type: 'pop', ...FOOD_POP, spin: 2 } },
  power_core:   { radius: 16, motion: { type: 'sway', fall: 130, swayAmp: 20, swayHz: 1, spin: 0 } },
  gift_pulse:   { radius: 20, motion: GIFT_MOTION },
  gift_neutron: { radius: 20, motion: GIFT_MOTION },
  gift_laser:   { radius: 20, motion: GIFT_MOTION },
  gift_arc:     { radius: 20, motion: GIFT_MOTION },
  gift_flak:    { radius: 20, motion: GIFT_MOTION },
  gift_flame:   { radius: 20, motion: GIFT_MOTION },
  gift_sickle:  { radius: 20, motion: GIFT_MOTION },
  gift_homing:  { radius: 20, motion: GIFT_MOTION },
  gift_rail:    { radius: 20, motion: GIFT_MOTION },
  gift_prism:   { radius: 20, motion: GIFT_MOTION },
  pu_shield:    { radius: 18, motion: PU_MOTION },
  pu_magnet:    { radius: 18, motion: PU_MOTION },
  pu_rapid:     { radius: 18, motion: PU_MOTION },
  pu_drones:    { radius: 18, motion: PU_MOTION },
  pu_timewarp:  { radius: 18, motion: PU_MOTION },
  pu_double:    { radius: 18, motion: PU_MOTION },
  life_up:      { radius: 18, motion: { type: 'sway', fall: 90, swayAmp: 34, swayHz: 1, spin: 0 } },
  golden_egg:   { radius: 18, motion: { type: 'pop', ...FOOD_POP, spin: 1.5 } },
  corn:         { radius: 12, motion: CORN_MOTION },
};

export const PICKUP_REMOVE_Y = 760;
export const PICKUP_MIN_X = 16;
export const PICKUP_MAX_X = 1264;

// Random drops for non-boss enemies (one roll: core, else gift).
export const DROP_CORE_CHANCE = 0.025;
export const DROP_CORE_CHANCE_ASTEROID = 0.03;
export const DROP_GIFT_CHANCE = 0.012;

// Boss drops.
export const BOSS_ROAST_COUNT = 12;
export const BOSS_ROAST_VX = 200;          // ± px/s
export const BOSS_ROAST_VY_MIN = -300;
export const BOSS_ROAST_VY_MAX = -100;
export const BOSS_CORE_COUNT = 2;
export const BOSS_DROP_SPREAD_X = 60;      // cores/gift spread around the boss center

// Combat.
export const HIT_FLASH_TIME = 0.06;
export const CONTACT_DAMAGE = 10;
export const CONTACT_RADIUS_FACTOR = 0.85;

// Chapter bonus (§7.9).
export const BONUS_PER_ACCURACY_PCT = 200;
export const BONUS_PER_FOOD = 50;
export const BONUS_FLAWLESS = 25_000;
export const BONUS_PER_POWER = 1_000;
