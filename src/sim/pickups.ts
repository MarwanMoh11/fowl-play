// src/sim/pickups.ts — OWNER: LEAD. Pickup spawning, motion, collection, enemy drops (§7.5, §7.8).
import type { Enemy, GameState, Pickup, PickupKind, PowerupId, WeaponId } from './types';
import { WEAPON_IDS } from './types';
import { emit } from './events';
import { newId } from './ids';
import { clamp } from './math';
import { rngChance, rngNext, rngPick, rngRange } from './rng';
import { addScore } from './scoring';
import { addPower, applyWeaponGift } from './weapons';
import { ENEMY_DEFS } from './enemies';
import { MAX_LIVES, MAX_MISSILES, MAX_PICKUPS } from './tuning/core';
import { gainFury, startPowerup } from './powerups';
import {
  BOSS_CORN, CORN_PER_PICKUP, DROP_CORN_CHANCE, DROP_LIFE_CHANCE, DROP_POWERUP_CHANCE, FURY_GOLDEN_EGG,
  GOLDEN_EGG_POINTS, MAGNET_PULL_SPEED, MAX_SHIELD, MINI_BOSS_CORN, POWERUP_MAGNET_RADIUS, WEAPON_UNLOCK_CHAPTER,
} from './tuning/loadout';
import {
  BOSS_CORE_COUNT, BOSS_DROP_SPREAD_X, BOSS_ROAST_COUNT, BOSS_ROAST_VX, BOSS_ROAST_VY_MAX, BOSS_ROAST_VY_MIN,
  DROP_CORE_CHANCE, DROP_CORE_CHANCE_ASTEROID, DROP_GIFT_CHANCE, FOOD_PER_MISSILE, FOOD_POINTS, FOOD_UNITS,
  PICKUP_DEFS, PICKUP_MAX_X, PICKUP_MIN_X, PICKUP_REMOVE_Y,
} from './tuning/economy';

const GIFT_BY_WEAPON: Record<WeaponId, PickupKind> = {
  pulse: 'gift_pulse', neutron: 'gift_neutron', laser: 'gift_laser', arc: 'gift_arc',
  flak: 'gift_flak', flame: 'gift_flame', sickle: 'gift_sickle', homing: 'gift_homing', rail: 'gift_rail', prism: 'gift_prism',
};
const WEAPON_BY_GIFT: Partial<Record<PickupKind, WeaponId>> = {
  gift_pulse: 'pulse', gift_neutron: 'neutron', gift_laser: 'laser', gift_arc: 'arc',
  gift_flak: 'flak', gift_flame: 'flame', gift_sickle: 'sickle', gift_homing: 'homing', gift_rail: 'rail', gift_prism: 'prism',
};
const POWERUP_BY_PICKUP: Partial<Record<PickupKind, PowerupId>> = {
  pu_magnet: 'magnet', pu_rapid: 'rapid', pu_drones: 'drones', pu_timewarp: 'timewarp', pu_double: 'double',
};
export const POWERUP_PICKUPS: readonly PickupKind[] = ['pu_shield', 'pu_magnet', 'pu_rapid', 'pu_drones', 'pu_timewarp', 'pu_double'];

/** Weapons gifts may offer: unlocked by campaign/daily chapter; every weapon in onslaught and boss rush. */
export function availableWeapons(state: GameState): WeaponId[] {
  if (state.mode === 'onslaught' || state.mode === 'boss_rush') return WEAPON_IDS.slice();
  return WEAPON_IDS.filter((w) => (WEAPON_UNLOCK_CHAPTER[w] ?? 1) <= state.chapter);
}

function chance(state: GameState, p: number): boolean {
  return rngChance(state.rng, Math.min(1, p * state.mods.dropMul));
}

export function giftFor(weapon: WeaponId): PickupKind {
  return GIFT_BY_WEAPON[weapon];
}

/** vx/vy override the default launch velocity (food pops; sway pickups ignore vx). */
export function spawnPickup(state: GameState, kind: PickupKind, x: number, y: number, vx?: number, vy?: number): Pickup | null {
  if (state.pickups.length >= MAX_PICKUPS) return null;
  const def = PICKUP_DEFS[kind];
  const m = def.motion;
  const vel = m.type === 'pop'
    ? { x: vx ?? rngRange(state.rng, -m.popVx, m.popVx), y: vy ?? m.popVy }
    : { x: 0, y: m.fall };
  const p: Pickup = { id: newId(state), kind, pos: { x, y }, vel, radius: def.radius, age: 0, spin: 0, alive: true };
  state.pickups.push(p);
  return p;
}

function magnetRadius(state: GameState): number {
  const pl = state.player;
  if (!pl.alive) return 0;
  return Math.max(state.mods.magnetRadius, pl.powerups.magnet > 0 ? POWERUP_MAGNET_RADIUS : 0);
}

export function updatePickups(state: GameState, dt: number): void {
  const list = state.pickups;
  const mr = magnetRadius(state);
  const ship = state.player.pos;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p.alive) continue;
    if (mr > 0) {
      const dx = ship.x - p.pos.x;
      const dy = ship.y - p.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < mr && d > 1) {
        const step = Math.min(d, MAGNET_PULL_SPEED * dt);
        p.pos.x += (dx / d) * step;
        p.pos.y += (dy / d) * step;
        p.age += dt;
        continue;
      }
    }
    const m = PICKUP_DEFS[p.kind].motion;
    const age0 = p.age;
    p.age += dt;
    p.spin += m.spin * dt;
    let dx: number;
    if (m.type === 'pop') {
      p.vel.y = Math.min(p.vel.y + m.gravity * dt, m.maxFall);
      dx = p.vel.x * dt;
    } else {
      // Exact step of a ±swayAmp sine offset, so x sways around its spawn column without drift.
      const w = 2 * Math.PI * m.swayHz;
      dx = m.swayAmp * (Math.sin(w * p.age) - Math.sin(w * age0));
      p.vel.x = m.swayAmp * w * Math.cos(w * p.age);
      p.vel.y = m.fall;
    }
    p.pos.x = clamp(p.pos.x + dx, PICKUP_MIN_X, PICKUP_MAX_X);
    p.pos.y += p.vel.y * dt;
    if (p.pos.y > PICKUP_REMOVE_Y) p.alive = false;
  }
}

function addFood(state: GameState, baseUnits: number): void {
  const pl = state.player;
  const units = Math.max(1, Math.round(baseUnits * state.mods.foodMul));
  pl.food += units;
  state.chapterStats.foodCollected += units;
  state.runStats.foodCollected += units;
  while (pl.food >= FOOD_PER_MISSILE) {
    pl.food -= FOOD_PER_MISSILE;
    pl.missiles = Math.min(MAX_MISSILES, pl.missiles + 1);
    emit(state, { type: 'missile_gained', missiles: pl.missiles });
  }
}

export function collectPickup(state: GameState, p: Pickup): void {
  if (!p.alive) return;
  p.alive = false;
  emit(state, { type: 'pickup_collected', kind: p.kind, x: p.pos.x, y: p.pos.y });
  if (p.kind === 'drumstick' || p.kind === 'roast') {
    addFood(state, FOOD_UNITS[p.kind]);
    addScore(state, FOOD_POINTS[p.kind], p.pos);
  } else if (p.kind === 'power_core') {
    addPower(state, 1);
  } else if (p.kind === 'pu_shield') {
    state.player.shield = Math.min(MAX_SHIELD, state.player.shield + 1);
    state.chapterStats.powerups += 1;
    state.runStats.powerups += 1;
  } else if (POWERUP_BY_PICKUP[p.kind]) {
    startPowerup(state, POWERUP_BY_PICKUP[p.kind] as PowerupId);
  } else if (p.kind === 'life_up') {
    if (state.player.lives < MAX_LIVES) {
      state.player.lives += 1;
      emit(state, { type: 'extra_life', lives: state.player.lives });
    }
  } else if (p.kind === 'golden_egg') {
    addScore(state, GOLDEN_EGG_POINTS, p.pos);
    gainFury(state, FURY_GOLDEN_EGG);
  } else if (p.kind === 'corn') {
    state.corn += CORN_PER_PICKUP;
    emit(state, { type: 'corn_collected', amount: CORN_PER_PICKUP, total: state.corn });
  } else {
    const w = WEAPON_BY_GIFT[p.kind];
    if (w) applyWeaponGift(state, w);
  }
}

function spawnCorn(state: GameState, n: number, x: number, y: number): void {
  for (let i = 0; i < n; i++) spawnPickup(state, 'corn', x, y);
}

function spawnBossDrops(state: GameState, e: Enemy): void {
  const { x, y } = e.pos;
  for (let i = 0; i < BOSS_ROAST_COUNT; i++) {
    const vx = rngRange(state.rng, -BOSS_ROAST_VX, BOSS_ROAST_VX);
    const vy = rngRange(state.rng, BOSS_ROAST_VY_MIN, BOSS_ROAST_VY_MAX);
    spawnPickup(state, 'roast', x, y, vx, vy);
  }
  for (let i = 0; i < BOSS_CORE_COUNT; i++) {
    spawnPickup(state, 'power_core', x + (i === 0 ? -BOSS_DROP_SPREAD_X : BOSS_DROP_SPREAD_X), y);
  }
  const others = availableWeapons(state).filter((w) => w !== state.player.weapon);
  if (others.length > 0) spawnPickup(state, giftFor(rngPick(state.rng, others)), x, y);
  const mini = e.kind.startsWith('boss_mini_');
  spawnPickup(state, rngPick(state.rng, POWERUP_PICKUPS), x, y);
  spawnCorn(state, mini ? MINI_BOSS_CORN : BOSS_CORN, x, y);
}

export function spawnDropsForEnemy(state: GameState, e: Enemy): void {
  if (e.isBoss) {
    spawnBossDrops(state, e);
    return;
  }
  const def = ENEMY_DEFS[e.kind];
  const { x, y } = e.pos;
  if (def.food && (def.foodChance >= 1 || rngChance(state.rng, def.foodChance))) spawnPickup(state, def.food, x, y);
  if (e.carries) {
    spawnPickup(state, e.carries, x, y);
    return;
  }
  if (e.kind === 'chicken_gold') {
    spawnPickup(state, 'golden_egg', x, y);
    spawnCorn(state, 10, x, y);
    return;
  }
  const dm = state.mods.dropMul;
  const coreChance = (e.kind.startsWith('asteroid_') ? DROP_CORE_CHANCE_ASTEROID : DROP_CORE_CHANCE) * dm;
  const roll = rngNext(state.rng);
  if (roll < coreChance) spawnPickup(state, 'power_core', x, y);
  else if (roll < coreChance + DROP_GIFT_CHANCE * dm) spawnPickup(state, giftFor(rngPick(state.rng, availableWeapons(state))), x, y);
  else if (roll < coreChance + (DROP_GIFT_CHANCE + DROP_POWERUP_CHANCE) * dm) spawnPickup(state, rngPick(state.rng, POWERUP_PICKUPS), x, y);
  else if (roll < coreChance + (DROP_GIFT_CHANCE + DROP_POWERUP_CHANCE + DROP_LIFE_CHANCE) * dm) spawnPickup(state, 'life_up', x, y);
  if (chance(state, DROP_CORN_CHANCE)) spawnPickup(state, 'corn', x, y);
}
