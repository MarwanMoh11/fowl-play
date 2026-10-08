// src/sim/patterns/boss.ts — OWNER: A3. `boss`: calls A2's spawnBoss once (§7.11).
import type { GameState } from '../types';
import type { BossSpec, GroupRuntime } from '../waves.types';
import { spawnBoss } from '../bosses';

export function startBoss(state: GameState, g: GroupRuntime, s: BossSpec): void {
  g.total = 0;
  spawnBoss(state, s.boss);
  g.doneSpawning = true;
}
