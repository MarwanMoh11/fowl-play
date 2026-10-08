// src/sim/mods.ts — OWNER: LEAD. Builds GameState.mods from ship + hangar upgrades + mutators + perks.
import type { GameState, Loadout, Modifiers, PerkId } from './types';
import type { AddKey, ModEffect, MulKey } from './tuning/loadout';
import { BASE_MODS, MUTATORS, PERKS, SHIPS, UPGRADES } from './tuning/loadout';

const MUL_KEYS = new Set<keyof Modifiers>([
  'damageMul', 'fireRateMul', 'heatMul', 'moveSpeedMul', 'boltSpeedMul', 'bossDamageMul', 'missileDamageMul',
  'missileCooldownMul', 'pickupRadiusMul', 'dropMul', 'foodMul', 'scoreMul', 'furyGainMul', 'enemyHpMul',
  'enemyEggRateMul', 'enemyShotSpeedMul', 'enemySpeedMul', 'luck',
]);

export function isMulKey(k: keyof Modifiers): k is MulKey {
  return MUL_KEYS.has(k);
}

export function baseMods(): Modifiers {
  return { ...BASE_MODS };
}

export const DEFAULT_LOADOUT: Readonly<Loadout> = { ship: 'falcon', upgrades: {}, mutators: [] };

function apply(m: Modifiers, fx: ModEffect, times: number): void {
  if (times <= 0) return;
  for (const [k, v] of Object.entries(fx.mul ?? {}) as [MulKey, number][]) m[k] *= Math.pow(v, times);
  for (const [k, v] of Object.entries(fx.add ?? {}) as [AddKey, number][]) m[k] += v * times;
}

/** Pure: modifiers for a loadout plus perk stacks. */
export function computeMods(loadout: Loadout, perks: Partial<Record<PerkId, number>>): Modifiers {
  const m = baseMods();
  apply(m, SHIPS[loadout.ship].fx, 1);
  for (const [id, lvl] of Object.entries(loadout.upgrades) as [keyof typeof UPGRADES, number][]) {
    const def = UPGRADES[id];
    if (def) apply(m, def.fx, Math.min(lvl, def.costs.length));
  }
  for (const id of loadout.mutators) apply(m, MUTATORS[id].fx, 1);
  for (const [id, n] of Object.entries(perks) as [PerkId, number][]) apply(m, PERKS[id].fx, n);
  m.critChance = Math.min(1, Math.max(0, m.critChance));
  m.droneCount = Math.max(0, Math.floor(m.droneCount));
  return m;
}

export function recomputeMods(state: GameState): void {
  state.mods = computeMods(state.loadout, state.perks);
}
