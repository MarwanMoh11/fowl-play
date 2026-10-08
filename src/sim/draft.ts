// src/sim/draft.ts — OWNER: LEAD. Perk draft after boss / mini-boss waves (pick 1 of 3).
import type { GameState, PerkId } from './types';
import { emit } from './events';
import { recomputeMods } from './mods';
import { rngNext } from './rng';
import { addPower } from './weapons';
import { DRAFT_SIZE, MAX_SHIELD, PERK_IDS, PERKS, RARITY_WEIGHT } from './tuning/loadout';
import { MAX_LIVES, MAX_MISSILES } from './tuning/core';

export function perkStacks(state: GameState, id: PerkId): number {
  return state.perks[id] ?? 0;
}

/** Rolls up to DRAFT_SIZE distinct perks that are not maxed, weighted by rarity. */
export function rollDraft(state: GameState): PerkId[] {
  const pool = PERK_IDS.filter((id) => perkStacks(state, id) < PERKS[id].max);
  const out: PerkId[] = [];
  while (out.length < DRAFT_SIZE && pool.length > 0) {
    let total = 0;
    for (const id of pool) total += RARITY_WEIGHT[PERKS[id].rarity];
    let r = rngNext(state.rng) * total;
    let pick = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= RARITY_WEIGHT[PERKS[pool[i]].rarity];
      if (r < 0) { pick = i; break; }
    }
    out.push(pool[pick]);
    pool.splice(pick, 1);
  }
  return out;
}

export function openDraft(state: GameState): void {
  const options = rollDraft(state);
  state.draft = { options };
  emit(state, { type: 'perk_draft', options: options.slice() });
}

/** Applies perk `index` of the open draft. Returns false if there is no draft or the index is invalid. */
export function applyDraftChoice(state: GameState, index: number): boolean {
  const d = state.draft;
  if (!d) return false;
  const id = d.options[index];
  state.draft = null;
  if (id === undefined) return true; // empty pool: nothing to take
  const stacks = perkStacks(state, id) + 1;
  state.perks[id] = stacks;
  recomputeMods(state);
  const p = state.player;
  const inst = PERKS[id].instant;
  if (inst?.lives) p.lives = Math.min(MAX_LIVES, p.lives + inst.lives);
  if (inst?.missiles) p.missiles = Math.min(MAX_MISSILES, p.missiles + inst.missiles);
  if (inst?.shield) p.shield = Math.min(MAX_SHIELD, p.shield + inst.shield);
  if (inst?.revives) p.revives += inst.revives;
  if (inst?.power) addPower(state, inst.power);
  emit(state, { type: 'perk_chosen', id, stacks });
  return true;
}
