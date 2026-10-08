// src/sim/patterns/bouncers.ts — OWNER: A3. `bouncers`: chickens bouncing around a box (§7.11).
import type { GameState } from '../types';
import type { BouncersSpec, GroupRuntime, KindLetter } from '../waves.types';
import { rngInt, rngRange } from '../rng';
import { BOUNCE } from '../tuning/enemies';
import { kindOf, spawnMember } from './common';

const LETTERS: readonly KindLetter[] = ['B', 'R', 'A', 'U', 'C'];

export function bouncersPlanned(s: BouncersSpec): number {
  return LETTERS.reduce((sum, l) => sum + (s.kinds[l] ?? 0), 0);
}

export function startBouncers(_state: GameState, g: GroupRuntime, s: BouncersSpec): void {
  g.total = bouncersPlanned(s);
  for (const l of LETTERS) g.data['k' + l] = s.kinds[l] ?? 0;
}

/** Draws the next kind uniformly from the remaining counts: a shuffled list with the exact counts. */
function takeKind(state: GameState, g: GroupRuntime): KindLetter {
  let left = 0;
  for (const l of LETTERS) left += g.data['k' + l];
  let pick = rngInt(state.rng, 0, Math.max(0, left - 1));
  for (const l of LETTERS) {
    pick -= g.data['k' + l];
    if (pick < 0) {
      g.data['k' + l] -= 1;
      return l;
    }
  }
  return 'B';
}

export function updateBouncers(state: GameState, g: GroupRuntime, _s: BouncersSpec, _dt: number): void {
  while (g.spawned < g.total && g.t >= g.spawned * BOUNCE.spawnGap) {
    const kind = kindOf(takeKind(state, g));
    const x = rngRange(state.rng, BOUNCE.spawnMinX, BOUNCE.spawnMaxX);
    spawnMember(state, g, kind, x, BOUNCE.spawnY, { type: 'bounce', entering: true });
  }
  g.doneSpawning = g.spawned >= g.total;
}
