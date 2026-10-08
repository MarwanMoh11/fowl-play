// src/sim/patterns/drops.ts — OWNER: H3. Falling armada (§H3): `pods` (egg pods drifting down), `mines` (space mines
// sinking with a sway), `comets` (diagonal rocks from the top corners, timed like asteroids).
import type { GameState } from '../types';
import type { CometsSpec, GroupRuntime, MinesSpec, PodsSpec } from '../waves.types';
import { chapterScale } from '../difficulty';
import { deg, fromAngle } from '../math';
import { rngChance, rngRange } from '../rng';
import { COMETS, MINES, PODS } from '../tuning/enemies';
import { spawnMember } from './common';

// ---- pods: spaced `interval` s apart, fall at PODS.drift px/s ----

export function podsPlanned(s: PodsSpec): number {
  return s.count;
}

export function startPods(_state: GameState, g: GroupRuntime, s: PodsSpec): void {
  g.total = s.count;
}

export function updatePods(state: GameState, g: GroupRuntime, s: PodsSpec, _dt: number): void {
  while (g.spawned < s.count && g.t >= g.spawned * s.interval) {
    const x = rngRange(state.rng, PODS.minX, PODS.maxX);
    const pod = spawnMember(state, g, 'egg_pod', x, PODS.spawnY, { type: 'drift', spin: 0 });
    if (pod) pod.vel = { x: 0, y: PODS.drift };
  }
  g.doneSpawning = g.spawned >= s.count;
}

// ---- mines: `rate` per second, sink at 30–60 px/s with a slow horizontal sway ----

export function minesPlanned(s: MinesSpec): number {
  return s.count;
}

export function startMines(_state: GameState, g: GroupRuntime, s: MinesSpec): void {
  g.total = s.count;
}

export function updateMines(state: GameState, g: GroupRuntime, s: MinesSpec, _dt: number): void {
  while (g.spawned < s.count && g.t >= g.spawned / s.rate) {
    const x = rngRange(state.rng, MINES.minX, MINES.maxX);
    spawnMember(state, g, 'space_mine', x, MINES.spawnY, {
      type: 'mine',
      vy: rngRange(state.rng, MINES.minSpeed, MINES.maxSpeed),
      baseX: x,
      swayAmp: MINES.swayAmp,
      swayFreq: rngRange(state.rng, MINES.minSwayFreq, MINES.maxSwayFreq),
      phase: rngRange(state.rng, 0, 2 * Math.PI),
    });
  }
  g.doneSpawning = g.spawned >= s.count;
}

// ---- comets: floor(rate × duration) rocks, like asteroids, diagonal from the top-left or top-right corner ----

export function cometsPlanned(s: CometsSpec): number {
  return Math.floor(s.rate * s.duration + 1e-9);
}

export function startComets(_state: GameState, g: GroupRuntime, s: CometsSpec): void {
  g.total = cometsPlanned(s);
}

function spawnComet(state: GameState, g: GroupRuntime): void {
  const fromLeft = rngChance(state.rng, 0.5);
  const x = fromLeft
    ? rngRange(state.rng, 0, COMETS.leftMaxX)
    : rngRange(state.rng, COMETS.rightMinX, 1280);
  const speed = rngRange(state.rng, COMETS.minSpeed, COMETS.maxSpeed) * chapterScale(state.chapter).speed;
  const v = fromAngle(deg(rngRange(state.rng, COMETS.minAngle, COMETS.maxAngle)), speed);
  const c = spawnMember(state, g, 'comet', x, COMETS.spawnY, {
    type: 'drift', spin: rngRange(state.rng, -COMETS.spinMax, COMETS.spinMax),
  });
  if (c) c.vel = { x: fromLeft ? v.x : -v.x, y: v.y };
}

export function updateComets(state: GameState, g: GroupRuntime, s: CometsSpec, _dt: number): void {
  while (g.spawned < g.total && g.t >= g.spawned / s.rate) spawnComet(state, g);
  g.doneSpawning = g.spawned >= g.total && g.t >= s.duration;
}
