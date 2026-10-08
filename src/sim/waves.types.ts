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
  /** A3: seconds each enemy id has spent outside the lost-enemy bounds (§7.6.2). */
  lost?: Record<number, number>;
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

// ---- A3 additions: wave/chapter data model (§7.11, §7.12) ----

/** Kind letters in chapter tables: B basic, R red, A armored, U ufo, C chick. */
export type KindLetter = 'B' | 'R' | 'A' | 'U' | 'C';
export type KindCounts = Partial<Record<KindLetter, number>>;

interface SpecBase {
  /** Seconds after the wave's first group starts ("delay +N" in §7.12). Default 0. */
  delay?: number;
}

/** Shared by grid, swoop and divers. `rowKinds` is one letter per row, top row first. */
export interface GridParams {
  rowKinds: string;
  cols: number;
  spacingX?: number;
  spacingY?: number;
  topY?: number;
  swayPeriod?: number;
  bobAmp?: number;
  bobPeriod?: number;
  descendRate?: number;
  maxBottomY?: number;
}

export interface GridSpec extends SpecBase, GridParams { pattern: 'grid' }
export interface SwoopSpec extends SpecBase, GridParams {
  pattern: 'swoop';
  streams?: number;
  memberGap?: number;
  streamGap?: number;
  pathDuration?: number;
}
export interface DiversSpec extends SpecBase, GridParams {
  pattern: 'divers';
  interval: number;
  simultaneous?: number;
  diveDuration?: number;
}
export interface StreamSpec extends SpecBase {
  pattern: 'stream';
  groups: number;
  perGroup: number;
  kind: KindLetter;
  sides: ('L' | 'R')[];
  baseYs: number[];
  amp?: number;
  freq?: number;
  speed?: number;
  spacing?: number;
  groupGap?: number;
}
export interface RingDef { n: number; r: number; kind: KindLetter; omega: number }
export interface RingSpec extends SpecBase { pattern: 'ring'; rings: RingDef[] }
export interface BouncersSpec extends SpecBase { pattern: 'bouncers'; kinds: KindCounts }
export interface AsteroidsSpec extends SpecBase {
  pattern: 'asteroids';
  duration: number;
  rate: number;
  from: 'tr' | 'tl' | 'both';
  mix?: { l: number; m: number; s: number };
}
export interface UfoSpec extends SpecBase { pattern: 'ufo'; count: number }
export interface SwarmSpec extends SpecBase {
  pattern: 'swarm';
  count: number;
  kamikazeInterval?: number;
  kamikazeFraction?: number;
}
export interface BossSpec extends SpecBase { pattern: 'boss'; boss: BossId }

export type GroupSpec =
  | GridSpec | SwoopSpec | DiversSpec | StreamSpec | RingSpec
  | BouncersSpec | AsteroidsSpec | UfoSpec | SwarmSpec | BossSpec;

export type PatternName = GroupSpec['pattern'];

export interface WaveDef { name: string; groups: GroupSpec[] }
export interface ChapterDef { name: string; palette: [string, string]; waves: WaveDef[] }
