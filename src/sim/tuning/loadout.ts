// src/sim/tuning/loadout.ts — OWNER: LEAD — CONTRACT v2. Ships, hangar upgrades, mutators, perks, power-ups,
// combo and fury numbers (HENPOCALYPSE §4). Pure data; the UI reads names/descriptions from here.
import type { Modifiers, MutatorId, PerkId, PowerupId, ShipId, UpgradeId } from '../types';

/** Multiplicative keys multiply per stack (v^stacks); every other key adds per stack (v × stacks). */
export type MulKey =
  | 'damageMul' | 'fireRateMul' | 'heatMul' | 'moveSpeedMul' | 'boltSpeedMul' | 'bossDamageMul'
  | 'missileDamageMul' | 'missileCooldownMul' | 'pickupRadiusMul' | 'dropMul' | 'foodMul' | 'scoreMul'
  | 'furyGainMul' | 'enemyHpMul' | 'enemyEggRateMul' | 'enemyShotSpeedMul' | 'enemySpeedMul' | 'luck';
export type AddKey = Exclude<keyof Modifiers, MulKey>;

export interface ModEffect {
  mul?: Partial<Record<MulKey, number>>;
  add?: Partial<Record<AddKey, number>>;
}

export const BASE_MODS: Readonly<Modifiers> = {
  damageMul: 1, fireRateMul: 1, heatMul: 1, moveSpeedMul: 1, extraBolts: 0, pierceBonus: 0, boltSpeedMul: 1,
  critChance: 0, bossDamageMul: 1, missileDamageMul: 1, missileCooldownMul: 1, pickupRadiusMul: 1,
  magnetRadius: 0, dropMul: 1, foodMul: 1, scoreMul: 1, comboWindow: 2.0, furyGainMul: 1, overdriveTime: 8,
  droneCount: 0, chainRadius: 0, enemyHpMul: 1, enemyEggRateMul: 1, enemyShotSpeedMul: 1, enemySpeedMul: 1,
  powerLossOnDeath: 0, invulnBonus: 0, luck: 1, shieldPerChapter: 0,
};

// ---------------------------------------------------------------- ships
export interface ShipDef {
  name: string;
  desc: string;
  radius: number;          // hit radius (falcon = 14)
  lives: number;           // added to the difficulty's lives (min 1 total)
  power: number;           // starting power
  missiles: number;        // added starting missiles
  shield: number;          // starting shield charges
  revives: number;         // starting revive charges
  cost: number;            // Golden Corn to unlock (0 = owned from the start)
  color: string;           // UI accent
  fx: ModEffect;
}

export const SHIPS: Record<ShipId, ShipDef> = {
  falcon: {
    name: 'STARFALCON', desc: 'Balanced all-rounder. The pride of the Coop Defense Force.',
    radius: 14, lives: 0, power: 0, missiles: 0, shield: 0, revives: 0, cost: 0, color: '#2E86FF', fx: {},
  },
  bantam: {
    name: 'BANTAM', desc: 'Tiny hitbox, blazing engines, rapid guns. One fewer ship.',
    radius: 10, lives: -1, power: 0, missiles: 0, shield: 0, revives: 0, cost: 400, color: '#39FF88',
    fx: { mul: { moveSpeedMul: 1.2, fireRateMul: 1.1 } },
  },
  bulwark: {
    name: 'BULWARK', desc: 'Armored gunboat. Starts with 2 shields and regrows one every chapter. Slow.',
    radius: 17, lives: 0, power: 1, missiles: 0, shield: 2, revives: 0, cost: 600, color: '#FFB627',
    fx: { mul: { moveSpeedMul: 0.88, heatMul: 0.85 }, add: { shieldPerChapter: 1 } },
  },
  phoenix: {
    name: 'PHOENIX', desc: 'Rises from its own ashes once. Fury builds 50% faster. One fewer ship.',
    radius: 14, lives: -1, power: 2, missiles: 1, shield: 0, revives: 1, cost: 900, color: '#FF5A1F',
    fx: { mul: { furyGainMul: 1.5 }, add: { overdriveTime: 2 } },
  },
};

// ---------------------------------------------------------------- hangar upgrades
export interface UpgradeDef {
  name: string;
  desc: string;            // per level
  costs: readonly number[]; // cost of level 1, 2, …; length = max level
  fx: ModEffect;           // applied once per level
  power?: number;          // starting power per level
  lives?: number;          // starting lives per level
  missiles?: number;       // starting missiles per level
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  start_power:  { name: 'PRE-HEATED BARRELS', desc: '+1 starting firepower', costs: [150, 300, 600], fx: {}, power: 1 },
  hull:         { name: 'SPARE HULL', desc: '+1 starting ship', costs: [400, 900], fx: {}, lives: 1 },
  missiles:     { name: 'MISSILE RACK', desc: '+1 starting missile', costs: [100, 200, 400], fx: {}, missiles: 1 },
  magnet:       { name: 'GRAVY MAGNET', desc: '+15% pickup radius', costs: [100, 200, 400], fx: { mul: { pickupRadiusMul: 1.15 } } },
  coolant:      { name: 'CRYO COOLANT', desc: '-8% heat build-up', costs: [150, 300, 600], fx: { mul: { heatMul: 0.92 } } },
  fury_core:    { name: 'FURY CORE', desc: '+15% fury gain', costs: [150, 300, 600], fx: { mul: { furyGainMul: 1.15 } } },
  lucky:        { name: 'LUCKY CLOVER', desc: '+10% drop chance', costs: [200, 400, 800], fx: { mul: { dropMul: 1.1 } } },
  combo_window: { name: 'CHAIN LINKER', desc: '+0.25 s combo window', costs: [250, 500], fx: { add: { comboWindow: 0.25 } } },
};

// ---------------------------------------------------------------- mutators
export interface MutatorDef { name: string; desc: string; fx: ModEffect; livesOverride?: number }

export const MUTATORS: Record<MutatorId, MutatorDef> = {
  egg_storm:      { name: 'EGG STORM', desc: 'Twice the eggs. Score ×1.4', fx: { mul: { enemyEggRateMul: 2, scoreMul: 1.4 } } },
  glass_cannon:   { name: 'GLASS CANNON', desc: 'Damage ×1.75, lose all firepower on death. Score ×1.2', fx: { mul: { damageMul: 1.75, scoreMul: 1.2 }, add: { powerLossOnDeath: 10 } } },
  armored_armada: { name: 'ARMORED ARMADA', desc: 'Enemies have 50% more HP. Score ×1.3', fx: { mul: { enemyHpMul: 1.5, scoreMul: 1.3 } } },
  turbo:          { name: 'TURBO COOP', desc: 'Enemies move 30% faster, shots 15% faster. Score ×1.3', fx: { mul: { enemySpeedMul: 1.3, enemyShotSpeedMul: 1.15, scoreMul: 1.3 } } },
  feast:          { name: 'FEAST', desc: 'Double food, +50% drops. Score ×0.9', fx: { mul: { foodMul: 2, dropMul: 1.5, scoreMul: 0.9 } } },
  no_heat:        { name: 'COLD BARRELS', desc: 'Weapons never overheat. Score ×0.75', fx: { mul: { heatMul: 0, scoreMul: 0.75 } } },
  hardcore:       { name: 'HARDCORE', desc: 'One ship. No extra lives. Score ×2', fx: { mul: { scoreMul: 2 } }, livesOverride: 1 },
  bullet_hell:    { name: 'BULLET HELL', desc: '+60% eggs, shots 25% faster. Score ×1.8', fx: { mul: { enemyEggRateMul: 1.6, enemyShotSpeedMul: 1.25, scoreMul: 1.8 } } },
};
export const MUTATOR_IDS = Object.keys(MUTATORS) as MutatorId[];
export const DAILY_MUTATOR_COUNT = 2;
export const DAILY_FINAL_CHAPTER = 3;

// ---------------------------------------------------------------- perks
export type PerkRarity = 'common' | 'rare' | 'epic';
export const RARITY_WEIGHT: Record<PerkRarity, number> = { common: 10, rare: 5, epic: 2 };

export interface PerkInstant { lives?: number; power?: number; missiles?: number; shield?: number; revives?: number }

export interface PerkDef {
  name: string;
  desc: string;
  rarity: PerkRarity;
  max: number;             // max stacks
  fx: ModEffect;           // per stack, recomputed every time
  instant?: PerkInstant;   // applied once when picked
  color: string;           // card accent
}

export const PERKS: Record<PerkId, PerkDef> = {
  hot_sauce:      { name: 'HOT SAUCE', desc: '+15% damage', rarity: 'common', max: 5, fx: { mul: { damageMul: 1.15 } }, color: '#FF3B3B' },
  trigger_happy:  { name: 'TRIGGER HAPPY', desc: '+12% fire rate', rarity: 'common', max: 5, fx: { mul: { fireRateMul: 1.12 } }, color: '#FF9F1C' },
  ice_water:      { name: 'ICE WATER', desc: '-20% heat build-up', rarity: 'common', max: 3, fx: { mul: { heatMul: 0.8 } }, color: '#7FE7FF' },
  extra_barrel:   { name: 'EXTRA BARREL', desc: '+1 projectile per volley', rarity: 'rare', max: 2, fx: { add: { extraBolts: 1 } }, color: '#FFD60A' },
  drill_bits:     { name: 'DRILL BITS', desc: 'Shots pierce +1 enemy', rarity: 'rare', max: 3, fx: { add: { pierceBonus: 1 } }, color: '#9AA7B8' },
  afterburner:    { name: 'AFTERBURNER', desc: '+12% move speed', rarity: 'common', max: 3, fx: { mul: { moveSpeedMul: 1.12 } }, color: '#FF5A1F' },
  hollow_point:   { name: 'HOLLOW POINT', desc: '+8% critical hit chance (×2 damage)', rarity: 'common', max: 4, fx: { add: { critChance: 0.08 } }, color: '#FF3DCB' },
  giant_slayer:   { name: 'GIANT SLAYER', desc: '+25% damage to bosses', rarity: 'rare', max: 3, fx: { mul: { bossDamageMul: 1.25 } }, color: '#B5179E' },
  big_boom:       { name: 'BIG BOOM', desc: 'Missiles hit 50% harder, recharge 30% faster', rarity: 'rare', max: 2, fx: { mul: { missileDamageMul: 1.5, missileCooldownMul: 0.7 } }, color: '#FF6B5B' },
  tractor_beam:   { name: 'TRACTOR BEAM', desc: 'Pull pickups from 160 px away', rarity: 'common', max: 2, fx: { add: { magnetRadius: 160 } }, color: '#39FF88' },
  lucky_wishbone: { name: 'LUCKY WISHBONE', desc: '+30% drop chance', rarity: 'common', max: 3, fx: { mul: { dropMul: 1.3 } }, color: '#FFE66D' },
  gourmand:       { name: 'GOURMAND', desc: '+50% food from every pickup', rarity: 'common', max: 2, fx: { mul: { foodMul: 1.5 } }, color: '#C46A2B' },
  showboat:       { name: 'SHOWBOAT', desc: '+15% score', rarity: 'common', max: 5, fx: { mul: { scoreMul: 1.15 } }, color: '#FFC93C' },
  chain_gang:     { name: 'CHAIN GANG', desc: 'Combo window +0.75 s', rarity: 'common', max: 3, fx: { add: { comboWindow: 0.75 } }, color: '#4CC9F0' },
  rage_engine:    { name: 'RAGE ENGINE', desc: '+30% fury gain', rarity: 'common', max: 3, fx: { mul: { furyGainMul: 1.3 } }, color: '#F72585' },
  long_fuse:      { name: 'LONG FUSE', desc: 'Overdrive lasts 3 s longer', rarity: 'rare', max: 3, fx: { add: { overdriveTime: 3 } }, color: '#FF006E' },
  wingman:        { name: 'WINGMAN', desc: '+1 permanent drone that fires with you', rarity: 'epic', max: 2, fx: { add: { droneCount: 1 } }, color: '#8FE3FF' },
  popcorn:        { name: 'POPCORN KERNELS', desc: 'Kills explode, hurting enemies within 70 px', rarity: 'rare', max: 2, fx: { add: { chainRadius: 70 } }, color: '#FFF3D6' },
  second_wind:    { name: 'SECOND WIND', desc: 'Revive in place once without losing a ship', rarity: 'epic', max: 2, fx: {}, instant: { revives: 1 }, color: '#FFFFFF' },
  bubble_wrap:    { name: 'BUBBLE WRAP', desc: '+1 shield now and at every chapter start', rarity: 'rare', max: 3, fx: { add: { shieldPerChapter: 1 } }, instant: { shield: 1 }, color: '#4361EE' },
  iron_will:      { name: 'IRON WILL', desc: 'Lose 1 less firepower when you die', rarity: 'common', max: 2, fx: { add: { powerLossOnDeath: -1 } }, color: '#5E6B7D' },
  guardian_angel: { name: 'GUARDIAN ANGEL', desc: '+1.5 s invulnerability after respawning', rarity: 'common', max: 2, fx: { add: { invulnBonus: 1.5 } }, color: '#FFF8EE' },
  ammo_belt:      { name: 'AMMO BELT', desc: '+3 missiles now', rarity: 'common', max: 3, fx: {}, instant: { missiles: 3 }, color: '#E8343C' },
  power_surge:    { name: 'POWER SURGE', desc: '+2 firepower now', rarity: 'common', max: 3, fx: {}, instant: { power: 2 }, color: '#39FF88' },
  spare_ship:     { name: 'SPARE SHIP', desc: '+1 ship now', rarity: 'rare', max: 2, fx: {}, instant: { lives: 1 }, color: '#2E86FF' },
  featherweight:  { name: 'FEATHERWEIGHT', desc: '+40% pickup radius', rarity: 'common', max: 2, fx: { mul: { pickupRadiusMul: 1.4 } }, color: '#E6D9C6' },
  speed_loader:   { name: 'SPEED LOADER', desc: 'Shots fly 20% faster, +5% fire rate', rarity: 'common', max: 2, fx: { mul: { boltSpeedMul: 1.2, fireRateMul: 1.05 } }, color: '#ADB5BD' },
  butterfingers:  { name: 'BUTTERFINGERS', desc: 'Eggs and enemy shots fly 12% slower', rarity: 'rare', max: 2, fx: { mul: { enemyShotSpeedMul: 0.88 } }, color: '#FFF3D6' },
  golden_touch:   { name: 'GOLDEN TOUCH', desc: 'Golden chickens appear twice as often', rarity: 'rare', max: 2, fx: { mul: { luck: 2 } }, color: '#FFC93C' },
  devils_bargain: { name: "DEVIL'S BARGAIN", desc: '+50% damage, +25% score, but enemy shots are 15% faster', rarity: 'epic', max: 1, fx: { mul: { damageMul: 1.5, scoreMul: 1.25, enemyShotSpeedMul: 1.15 } }, color: '#9D0208' },
};
export const PERK_IDS = Object.keys(PERKS) as PerkId[];
export const DRAFT_SIZE = 3;

// ---------------------------------------------------------------- power-ups, combo, fury
export const POWERUP_TIME: Record<PowerupId, number> = { magnet: 12, rapid: 10, drones: 15, timewarp: 6, double: 15 };
export const POWERUP_MAGNET_RADIUS = 420;      // px while the magnet power-up runs
export const MAGNET_PULL_SPEED = 520;          // px/s
export const RAPID_FIRE_MUL = 1.5;             // fire rate while rapid runs (H1)
export const RAPID_HEAT_MUL = 0.5;             // heat gain while rapid runs (H1)
export const TIMEWARP_SCALE = 0.5;             // enemy / enemy projectile time scale
export const DOUBLE_SCORE_MUL = 2;
export const POWERUP_DRONES = 2;               // drones added by the drones power-up
export const MAX_DRONES = 4;
/** Drone slots relative to the ship (H1 fires from them, H5 draws them). */
export const DRONE_OFFSETS: readonly { x: number; y: number }[] = [
  { x: -54, y: 14 }, { x: 54, y: 14 }, { x: -94, y: 32 }, { x: 94, y: 32 },
];
export const SHIELD_HIT_INVULN = 1.0;          // s after a shield pops
export const SHIELD_CLEAR_RADIUS = 160;        // enemy projectiles cleared when a shield pops
export const REVIVE_INVULN = 2.5;
export const REVIVE_CLEAR_RADIUS = 320;
export const MAX_SHIELD = 5;

export const COMBO_TIERS: readonly { at: number; mult: number }[] = [
  { at: 0, mult: 1 }, { at: 10, mult: 1.5 }, { at: 25, mult: 2 }, { at: 50, mult: 3 },
  { at: 100, mult: 4 }, { at: 200, mult: 5 }, { at: 400, mult: 8 },
];
export const COMBO_BREAK_MIN = 10;             // combo_break is only emitted for chains this long

export const FURY_MAX = 100;
export const FURY_PER_KILL = 1;                // + points / FURY_POINTS_DIV, × furyGainMul
export const FURY_POINTS_DIV = 250;
export const FURY_PER_BOSS = 50;
export const FURY_GOLDEN_EGG = 30;
export const FURY_DEATH_KEEP = 0.5;            // fraction kept on death
export const OVERDRIVE_CLEAR_RADIUS = 260;
/** Read by H1: overdrive fire-rate and damage multipliers; no heat gain; +1 pierce. */
export const OVERDRIVE_FIRE_MUL = 1.6;
export const OVERDRIVE_DAMAGE_MUL = 1.25;
export const CRIT_MUL = 2;
export const CHAIN_DAMAGE = 3;

// ---------------------------------------------------------------- drops (non-boss kill; × mods.dropMul)
export const DROP_POWERUP_CHANCE = 0.012;
export const DROP_CORN_CHANCE = 0.05;
export const DROP_LIFE_CHANCE = 0.0008;
export const BOSS_CORN = 15;                   // corn pickups dropped by a major boss
export const MINI_BOSS_CORN = 6;
export const GOLDEN_EGG_POINTS = 5000;
export const CORN_PER_PICKUP = 1;
/** Weapon gifts only offer weapons whose unlock chapter has been reached (onslaught/boss rush: all). */
export const WEAPON_UNLOCK_CHAPTER: Record<string, number> = {
  pulse: 1, neutron: 1, laser: 1, arc: 1, flak: 1, flame: 2, sickle: 3, homing: 4, rail: 6, prism: 7,
};
