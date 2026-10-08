// src/sim/patterns/swoop.ts — OWNER: A3. `swoop`: fly-in curves that settle into a formation (§7.11).
import type { GameState } from '../types';
import type { CubicPath } from '../behaviors.types';
import type { GroupRuntime, SwoopSpec } from '../waves.types';
import { chapterScale } from '../difficulty';
import { GRID, SWOOP } from '../tuning/enemies';
import { countMembers, kindOf, spawnMember } from './common';
import { gridPlanned, gridSlot, resolveGrid, swayAmplitude } from './grid';

export const swoopPlanned = gridPlanned;

function params(s: SwoopSpec) {
  const streams = Math.max(1, s.streams ?? SWOOP.streams);
  const total = gridPlanned(s);
  return {
    streams,
    total,
    per: Math.ceil(total / streams),
    memberGap: s.memberGap ?? SWOOP.memberGap,
    streamGap: s.streamGap ?? SWOOP.streamGap,
    pathDuration: s.pathDuration ?? SWOOP.pathDuration,
  };
}

export function startSwoop(_state: GameState, g: GroupRuntime, s: SwoopSpec): void {
  const grid = resolveGrid(s);
  g.total = gridPlanned(s);
  g.anchor = { x: GRID.centerX, y: grid.topY };
  g.data.entered = 1;       // no group entry animation: members fly in individually
  g.data.swayStart = -1;
  g.data.done = 0;
}

function mirrorX(x: number): number {
  return SWOOP.mirrorWidth - x;
}

function swoopPath(k: number, target: { x: number; y: number }): CubicPath {
  const { p0, p1, p2 } = SWOOP.left;
  const left = k % 2 === 0;
  const fx = (x: number): number => (left ? x : mirrorX(x));
  return {
    p0: { x: fx(p0.x), y: p0.y },
    p1: { x: fx(p1.x), y: p1.y },
    p2: { x: fx(p2.x), y: p2.y },
    p3: { x: target.x, y: target.y },
  };
}

function spawnSwoopMember(state: GameState, g: GroupRuntime, s: SwoopSpec, slotIndex: number, stream: number): void {
  const grid = resolveGrid(s);
  const row = Math.floor(slotIndex / grid.cols);
  const slot = gridSlot(grid, row, slotIndex % grid.cols);
  const path = swoopPath(stream, { x: g.anchor.x + slot.x, y: g.anchor.y + slot.y });
  const speed = chapterScale(state.chapter).speed;
  spawnMember(state, g, kindOf(s.rowKinds[row]), path.p0.x, path.p0.y, {
    type: 'enter_path', path, t: 0, duration: params(s).pathDuration / speed, group: g.index, slot,
  });
}

export function updateSwoop(state: GameState, g: GroupRuntime, s: SwoopSpec, _dt: number): void {
  const p = params(s);
  let finished = 0;
  for (let k = 0; k < p.streams; k++) {
    const first = k * p.per;
    const count = Math.max(0, Math.min(p.per, p.total - first));
    let done = g.data['st' + k] ?? 0;
    while (done < count && g.t >= k * p.streamGap + done * p.memberGap) {
      spawnSwoopMember(state, g, s, first + done, k);
      done++;
    }
    g.data['st' + k] = done;
    if (done >= count) finished++;
  }
  g.doneSpawning = finished === p.streams;
  if (g.data.swayStart < 0 && g.doneSpawning && countMembers(state, g.index, 'enter_path') === 0) {
    g.data.swayStart = g.t;
  }
  if (g.data.swayStart < 0) return;
  const grid = resolveGrid(s);
  const ts = g.t - g.data.swayStart;
  const ramp = Math.min(1, ts / SWOOP.swayRamp);
  g.anchor.x = GRID.centerX + swayAmplitude(grid) * ramp * Math.sin((2 * Math.PI * ts) / grid.swayPeriod);
  g.anchor.y = grid.topY + grid.bobAmp * ramp * Math.sin((2 * Math.PI * ts) / grid.bobPeriod);
}
