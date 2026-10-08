// src/sim/patterns/flyers.ts — OWNER: H3. Flying armada (§H3): `jets` (V-formations), `turrets` (park on a line),
// `mothers` (hover in a band), `voids` (blink in place). Planned counts are exact: jets, turrets, mothers and voids spawn `count`.
import type { GameState } from '../types';
import type { GroupRuntime, JetsSpec, MothersSpec, TurretsSpec, VoidsSpec } from '../waves.types';
import { chapterScale } from '../difficulty';
import { rngRange } from '../rng';
import { ABILITY, JETS, MOTHERS, TURRETS, VOIDS } from '../tuning/enemies';
import { spawnMember } from './common';

// ---- jets: V-formations streaking across from alternating sides; `g.data.v` counts launched V's ----

export function jetsPlanned(s: JetsSpec): number {
  return s.count;
}

export function startJets(_state: GameState, g: GroupRuntime, s: JetsSpec): void {
  g.total = s.count;
  g.data.v = 0;
}

/** Offset of member i behind its leader (leader at 0,0; ranks fan out to both sides of the V). */
function vOffset(i: number, dir: 1 | -1): { x: number; y: number } {
  const rank = Math.ceil(i / 2);
  const side = i % 2 === 1 ? 1 : -1;
  return { x: -dir * rank * JETS.spacingX, y: side * rank * JETS.spacingY };
}

function launchV(state: GameState, g: GroupRuntime, s: JetsSpec, k: number): void {
  const left = k % 2 === 0;
  const dir: 1 | -1 = left ? 1 : -1;
  const lanes = s.ys ?? JETS.lanes;
  const laneY = lanes[k % lanes.length];
  const speed = s.speed ?? JETS.speed;
  const members = Math.min(s.perV, s.count - g.spawned);
  for (let i = 0; i < members; i++) {
    const off = vOffset(i, dir);
    const baseY = laneY + off.y;
    const x = (left ? JETS.leftX : JETS.rightX) + off.x;
    spawnMember(state, g, 'chicken_jet', x, baseY, {
      type: 'jet', dir, speed, baseY, amp: JETS.wobbleAmp, freq: JETS.wobbleFreq, phase: 0,
    });
  }
}

export function updateJets(state: GameState, g: GroupRuntime, s: JetsSpec, _dt: number): void {
  while (g.spawned < s.count && g.t >= g.data.v * JETS.vGap) {
    launchV(state, g, s, g.data.v);
    g.data.v += 1;
  }
  g.doneSpawning = g.spawned >= s.count;
}

// ---- turrets: fly down to parking slots on y = 110 and stay there (formation behavior after the entry) ----

export function turretsPlanned(s: TurretsSpec): number {
  return s.count;
}

export function startTurrets(state: GameState, g: GroupRuntime, s: TurretsSpec): void {
  g.total = s.count;
  g.anchor = { x: 0, y: 0 }; // formation slots are absolute screen positions
  const speed = chapterScale(state.chapter).speed;
  for (let i = 0; i < s.count; i++) {
    const x = s.count === 1
      ? (TURRETS.minX + TURRETS.maxX) / 2
      : TURRETS.minX + (i * (TURRETS.maxX - TURRETS.minX)) / (s.count - 1);
    const slot = { x, y: TURRETS.parkY };
    const path = {
      p0: { x, y: TURRETS.enterY }, p1: { x, y: 40 }, p2: { x, y: TURRETS.parkY - 30 }, p3: slot,
    };
    spawnMember(state, g, 'chicken_turret', x, TURRETS.enterY, {
      type: 'enter_path', path, t: 0, duration: TURRETS.enterTime / speed, group: g.index, slot,
    });
  }
  g.doneSpawning = true;
}

// ---- mothers: all spawn at once and hover in a wide slow sine at y 140–200 ----

export function mothersPlanned(s: MothersSpec): number {
  return s.count;
}

export function startMothers(state: GameState, g: GroupRuntime, s: MothersSpec): void {
  g.total = s.count;
  for (let i = 0; i < s.count; i++) {
    const homeX = 640 + (i - (s.count - 1) / 2) * MOTHERS.spacing;
    const phase = (2 * Math.PI * i) / s.count;
    const x = homeX + MOTHERS.ampX * Math.sin(phase);
    spawnMember(state, g, 'chicken_mother', x, -60, {
      type: 'hover', homeX, homeY: MOTHERS.homeY, ampX: MOTHERS.ampX, ampY: MOTHERS.ampY, freq: MOTHERS.freq, phase,
    });
  }
  g.doneSpawning = true;
}

// ---- voids: blink voids spawn inside the teleport box and hover until their ability moves them ----

export function voidsPlanned(s: VoidsSpec): number {
  return s.count;
}

export function startVoids(_state: GameState, g: GroupRuntime, s: VoidsSpec): void {
  g.total = s.count;
}

export function updateVoids(state: GameState, g: GroupRuntime, s: VoidsSpec, _dt: number): void {
  const A = ABILITY.void;
  while (g.spawned < s.count && g.t >= g.spawned * VOIDS.gap) {
    const x = rngRange(state.rng, A.minX, A.maxX);
    const y = rngRange(state.rng, A.minY, A.maxY);
    spawnMember(state, g, 'chicken_void', x, y, { type: 'blink' });
  }
  g.doneSpawning = g.spawned >= s.count;
}
