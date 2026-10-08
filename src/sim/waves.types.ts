// src/sim/waves.types.ts — OWNER: A3 (initial version by A1)
import type { Vec2, PickupKind } from './types';
import type { BossId } from './bosses.types';
import { ENV } from './tuning/enemies';

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
  /** H3: golden-chicken roll clock and scheduled environmental strikes (optional: created on first use). */
  ambient?: AmbientRuntime;
}

/** H3: JSON-safe clocks for ambient events that run beside the groups. */
export interface AmbientRuntime {
  goldClock: number;         // s accumulated toward the next golden-chicken roll
  envNext: number;           // wave elapsed time of the next environmental event
  strikes: EnvStrike[];      // scheduled telegraphs and beams, fired when `at` is reached
}

export interface EnvStrike {
  at: number;                // wave elapsed time
  kind: 'telegraph' | 'beam';
  x: number;                 // column centre
  width: number;
  ttl: number;
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

/** H3: the wave's ambient clocks, created on first use. */
export function ambientOf(rt: WaveRuntime): AmbientRuntime {
  return (rt.ambient ??= { goldClock: 0, envNext: ENV.firstAt, strikes: [] });
}

// ---- A3 additions: wave/chapter data model (§7.11, §7.12) ----

/**
 * Kind letters in chapter tables: B basic, R red, A armored, U ufo, C chick, and (H3) N ninja, X bomber,
 * S shield, W mech, T turret, G ghost, H healer, K sniper, M mother, V void, E elite.
 */
export type KindLetter = 'B' | 'R' | 'A' | 'U' | 'C' | 'N' | 'X' | 'S' | 'W' | 'T' | 'G' | 'H' | 'K' | 'M' | 'V' | 'E';
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

// ---- H3 armada patterns (exact planned counts are `count`, or floor(rate × duration) for comets) ----
/** V-formations of `perV` jets; `count` jets in total; `ys` lanes; `speed` before chapter scaling. */
export interface JetsSpec extends SpecBase { pattern: 'jets'; count: number; perV: number; ys?: number[]; speed?: number }
export interface PodsSpec extends SpecBase { pattern: 'pods'; count: number; interval: number }
export interface MinesSpec extends SpecBase { pattern: 'mines'; count: number; rate: number }
export interface VoidsSpec extends SpecBase { pattern: 'voids'; count: number }
export interface CometsSpec extends SpecBase { pattern: 'comets'; duration: number; rate: number }
export interface TurretsSpec extends SpecBase { pattern: 'turrets'; count: number }
export interface MothersSpec extends SpecBase { pattern: 'mothers'; count: number }

export type GroupSpec =
  | GridSpec | SwoopSpec | DiversSpec | StreamSpec | RingSpec
  | BouncersSpec | AsteroidsSpec | UfoSpec | SwarmSpec | BossSpec
  | JetsSpec | PodsSpec | MinesSpec | VoidsSpec | CometsSpec | TurretsSpec | MothersSpec;

export type PatternName = GroupSpec['pattern'];

export interface WaveDef { name: string; groups: GroupSpec[] }
export interface ChapterDef { name: string; palette: [string, string]; waves: WaveDef[] }
