// src/sim/behaviors.types.ts — OWNER: A3 (initial version by A1). SHARED members: never rename/remove fields.
import type { Vec2 } from './types';
import type { BossRuntime } from './bosses.types';

export interface CubicPath { p0: Vec2; p1: Vec2; p2: Vec2; p3: Vec2 }

export type BehaviorState =
  | { type: 'none' }
  | { type: 'boss'; rt: BossRuntime }                                                    // SHARED (A2)
  | { type: 'seek'; speed: number; turnRate: number; heading: number }                   // SHARED (A2: brood chicks)
  | { type: 'stream'; dir: 1 | -1; speed: number; baseY: number; amp: number; freq: number; phase: number } // SHARED (A2: hatchlings)
  | { type: 'lane'; laneY: number; speed: number; dir: 1 | -1; shotTimer: number }       // SHARED (A2: escorts)
  | { type: 'formation'; group: number; slot: Vec2 }
  | { type: 'enter_path'; path: CubicPath; t: number; duration: number; group: number; slot: Vec2 }
  | { type: 'dive'; path: CubicPath; t: number; duration: number; group: number; slot: Vec2 }
  | { type: 'return'; from: Vec2; t: number; duration: number; group: number; slot: Vec2 }
  | { type: 'ring'; group: number; ring: number; index: number; count: number; radiusTarget: number; omega: number }
  | { type: 'bounce'; entering: boolean }
  | { type: 'drift'; spin: number }
  | { type: 'swarm'; offset: Vec2; mode: 'follow' | 'kamikaze'; dir: Vec2; group?: number } // group: A3 addition (optional)
  // ---- H3 armada movers ----
  | { type: 'flee'; dir: 1 | -1; speed: number; baseY: number; t: number }              // golden chicken: zigzag across, then leaves
  | { type: 'blink' }                                                                    // void: hovers in place; its ability teleports it
  | { type: 'jet'; dir: 1 | -1; speed: number; baseY: number; amp: number; freq: number; phase: number } // V-formation jet, removed past the far side
  | { type: 'mine'; vy: number; baseX: number; swayAmp: number; swayFreq: number; phase: number }        // falls with a slow sway, removed at the bottom
  | { type: 'hover'; homeX: number; homeY: number; ampX: number; ampY: number; freq: number; phase: number }; // mother: wide slow sine
