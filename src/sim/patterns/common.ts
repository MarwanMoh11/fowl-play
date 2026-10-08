// src/sim/patterns/common.ts — OWNER: A3. Helpers shared by behaviors and wave patterns.
import type { Enemy, EnemyKind, GameState } from '../types';
import type { BehaviorState } from '../behaviors.types';
import type { GroupRuntime, KindLetter } from '../waves.types';
import { spawnEnemy } from '../enemies';
import { KIND_LETTERS } from '../tuning/enemies';

/** Moves an enemy to (x, y) and records the implied velocity (render uses it for tilt). */
export function moveTo(e: Enemy, x: number, y: number, dt: number): void {
  if (dt > 0) {
    e.vel.x = (x - e.pos.x) / dt;
    e.vel.y = (y - e.pos.y) / dt;
  }
  e.pos.x = x;
  e.pos.y = y;
}

export function groupOf(state: GameState, index: number): GroupRuntime | undefined {
  return state.waveRt.groups[index];
}

export function kindOf(letter: string): EnemyKind {
  return KIND_LETTERS[letter] ?? 'chicken_basic';
}

/** Spawns one wave member for a group (counts toward the carry plan) and bumps the group's counter. */
export function spawnMember(
  state: GameState, g: GroupRuntime, kind: EnemyKind, x: number, y: number, behavior: BehaviorState,
): Enemy | null {
  g.spawned += 1; // a spawn skipped by the entity cap still counts, so groups always finish
  return spawnEnemy(state, kind, x, y, behavior);
}

/** Number of alive enemies whose behavior has the given type and group index. */
export function groupMembers(state: GameState, group: number, type: BehaviorState['type']): Enemy[] {
  const out: Enemy[] = [];
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const b = e.behavior;
    if (b.type === type && 'group' in b && b.group === group) out.push(e);
  }
  return out;
}

export function isKindLetter(s: string): s is KindLetter {
  return s in KIND_LETTERS;
}

/** Alive enemies of a behavior type in a group, without allocating. */
export function countMembers(state: GameState, group: number, type: BehaviorState['type']): number {
  let n = 0;
  for (const e of state.enemies) {
    const b = e.behavior;
    if (e.alive && b.type === type && 'group' in b && b.group === group) n++;
  }
  return n;
}
