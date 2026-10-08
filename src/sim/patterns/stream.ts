// src/sim/patterns/stream.ts — OWNER: A3. `stream`: sine-wave lines flying across the screen (§7.11).
import type { GameState } from '../types';
import type { GroupRuntime, StreamSpec } from '../waves.types';
import { chapterScale } from '../difficulty';
import { STREAM } from '../tuning/enemies';
import { kindOf, spawnMember } from './common';

export function streamPlanned(s: StreamSpec): number {
  return s.groups * s.perGroup;
}

export function startStream(_state: GameState, g: GroupRuntime, s: StreamSpec): void {
  g.total = streamPlanned(s);
}

/** Sub-group i starts at i × groupGap and spawns a member every `spacing` s (sub-groups may overlap in time). */
export function updateStream(state: GameState, g: GroupRuntime, s: StreamSpec, _dt: number): void {
  const spacing = s.spacing ?? STREAM.spacing;
  const groupGap = s.groupGap ?? STREAM.groupGap;
  const amp = s.amp ?? STREAM.amp;
  const freq = s.freq ?? STREAM.freq;
  const speed = (s.speed ?? STREAM.speed) * chapterScale(state.chapter).speed;
  let finished = 0;
  for (let i = 0; i < s.groups; i++) {
    let done = g.data['sg' + i] ?? 0;
    while (done < s.perGroup && g.t >= i * groupGap + done * spacing) {
      const fromLeft = s.sides[i % s.sides.length] === 'L';
      const baseY = s.baseYs[i % s.baseYs.length];
      const x = fromLeft ? STREAM.leftX : STREAM.rightX;
      const y = baseY + amp * Math.sin(freq * x);
      spawnMember(state, g, kindOf(s.kind), x, y, {
        type: 'stream', dir: fromLeft ? 1 : -1, speed, baseY, amp, freq, phase: 0,
      });
      done++;
    }
    g.data['sg' + i] = done;
    if (done >= s.perGroup) finished++;
  }
  g.doneSpawning = finished === s.groups;
}
