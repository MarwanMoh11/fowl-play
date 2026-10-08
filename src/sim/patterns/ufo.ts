// src/sim/patterns/ufo.ts — OWNER: A3. `ufo`: saucers patrolling lanes and shooting (§7.11).
import type { GameState } from '../types';
import type { GroupRuntime, UfoSpec } from '../waves.types';
import { chapterScale } from '../difficulty';
import { rngRange } from '../rng';
import { AIMED_SHOT, UFO } from '../tuning/enemies';
import { spawnMember } from './common';

export function ufoPlanned(s: UfoSpec): number {
  return s.count;
}

export function startUfo(_state: GameState, g: GroupRuntime, s: UfoSpec): void {
  g.total = s.count;
}

export function updateUfo(state: GameState, g: GroupRuntime, s: UfoSpec, _dt: number): void {
  while (g.spawned < s.count && g.t >= g.spawned * UFO.gap) {
    const i = g.spawned;
    const laneY = UFO.lanes[i % UFO.lanes.length];
    const fromLeft = i % 2 === 0;
    const speed = rngRange(state.rng, UFO.speedMin, UFO.speedMax) * chapterScale(state.chapter).speed;
    const shotTimer = rngRange(state.rng, AIMED_SHOT.firstMin, AIMED_SHOT.firstMax);
    spawnMember(state, g, 'chicken_ufo', fromLeft ? UFO.leftX : UFO.rightX, laneY, {
      type: 'lane', laneY, speed, dir: fromLeft ? 1 : -1, shotTimer,
    });
  }
  g.doneSpawning = g.spawned >= s.count;
}
