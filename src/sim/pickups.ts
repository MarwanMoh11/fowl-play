// src/sim/pickups.ts — OWNER: A1. Pickup spawning, motion, collection, enemy drops (§7.5, §7.8).
import type { Enemy, GameState, Pickup, PickupKind, WeaponId } from './types';
import { WEAPON_IDS } from './types';
import { emit } from './events';
import { newId } from './ids';
import { clamp } from './math';
import { rngChance, rngNext, rngPick, rngRange } from './rng';
import { addScore } from './scoring';
import { addPower, applyWeaponGift } from './weapons';
import { ENEMY_DEFS } from './enemies';
import { MAX_MISSILES, MAX_PICKUPS } from './tuning/core';
import {
  BOSS_CORE_COUNT, BOSS_DROP_SPREAD_X, BOSS_ROAST_COUNT, BOSS_ROAST_VX, BOSS_ROAST_VY_MAX, BOSS_ROAST_VY_MIN,
  DROP_CORE_CHANCE, DROP_CORE_CHANCE_ASTEROID, DROP_GIFT_CHANCE, FOOD_PER_MISSILE, FOOD_POINTS, FOOD_UNITS,
  PICKUP_DEFS, PICKUP_MAX_X, PICKUP_MIN_X, PICKUP_REMOVE_Y,
} from './tuning/economy';

const GIFT_BY_WEAPON: Record<WeaponId, PickupKind> = {
  pulse: 'gift_pulse', neutron: 'gift_neutron', laser: 'gift_laser', arc: 'gift_arc',
};
const WEAPON_BY_GIFT: Partial<Record<PickupKind, WeaponId>> = {
  gift_pulse: 'pulse', gift_neutron: 'neutron', gift_laser: 'laser', gift_arc: 'arc',
};

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

export function updatePickups(state: GameState, dt: number): void {
  const list = state.pickups;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p.alive) continue;
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

function addFood(state: GameState, units: number): void {
  const pl = state.player;
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
  } else {
    const w = WEAPON_BY_GIFT[p.kind];
    if (w) applyWeaponGift(state, w);
  }
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
  const others = WEAPON_IDS.filter((w) => w !== state.player.weapon);
  spawnPickup(state, giftFor(rngPick(state.rng, others)), x, y);
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
  const coreChance = e.kind.startsWith('asteroid_') ? DROP_CORE_CHANCE_ASTEROID : DROP_CORE_CHANCE;
  const roll = rngNext(state.rng);
  if (roll < coreChance) spawnPickup(state, 'power_core', x, y);
  else if (roll < coreChance + DROP_GIFT_CHANCE) spawnPickup(state, giftFor(rngPick(state.rng, WEAPON_IDS)), x, y);
}
