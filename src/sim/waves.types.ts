// src/sim/waves.types.ts — OWNER: A3 (initial version by A1)
import type { Vec2, PickupKind } from './types';
import type { BossId } from './bosses.types';

export interface GroupRuntime {
  index: number;
  started: boolean;
  doneSpawning: boolean;
  spawned: number;
  total: number;            // planned spawn count (asteroids: rate × duration, floored)
  timer: number;            // s until next spawn
  t: number;                // s since group started
  anchor: Vec2;             // formation anchor (grid/swoop/divers/ring center)
  data: Record<string, number>;
}

export interface WaveRuntime {
  elapsed: number;
  groups: GroupRuntime[];
  spawnCounter: number;     // total spawns so far this wave (for carry plan)
  carryPlan: { spawnIndex: number; kind: PickupKind }[];
}

export interface WaveInfo {
  chapterName: string;
  waveName: string;
  isBoss: boolean;
  boss: BossId | null;
}

export function emptyWaveRuntime(): WaveRuntime {
  return { elapsed: 0, groups: [], spawnCounter: 0, carryPlan: [] };
}
