// src/sim/patterns/ring.ts — OWNER: A3. `ring`: concentric rotating circles (§7.11).
import type { GameState } from '../types';
import type { GroupRuntime, RingSpec } from '../waves.types';
import { chapterScale } from '../difficulty';
import { ringPosition } from '../behaviors';
import { RING } from '../tuning/enemies';
import { kindOf, spawnMember } from './common';

export function ringPlanned(s: RingSpec): number {
  return s.rings.reduce((sum, r) => sum + r.n, 0);
}

export function startRing(state: GameState, g: GroupRuntime, s: RingSpec): void {
  g.total = ringPlanned(s);
  g.anchor = { x: RING.centerX, y: RING.centerY };
  g.data.entry = 0;
  g.data.pulse = 0;
  g.data.entered = 0;
  const speed = chapterScale(state.chapter).speed;
  s.rings.forEach((def, ri) => {
    for (let i = 0; i < def.n; i++) {
      const b = {
        type: 'ring' as const, group: g.index, ring: ri, index: i, count: def.n,
        radiusTarget: def.r, omega: def.omega * speed,
      };
      const p = ringPosition(g, b);
      spawnMember(state, g, kindOf(def.kind), p.x, p.y, b);
    }
  });
  g.doneSpawning = true;
}

export function updateRing(_state: GameState, g: GroupRuntime, _s: RingSpec, _dt: number): void {
  g.data.entry = Math.min(1, g.t / RING.entryTime);
  g.data.entered = g.data.entry >= 1 ? 1 : 0;
  g.anchor.x = RING.centerX + RING.driftAmp * Math.sin((2 * Math.PI * g.t) / RING.driftPeriod);
  g.anchor.y = RING.centerY;
  g.data.pulse = RING.pulseAmp * Math.sin((2 * Math.PI * g.t) / RING.pulsePeriod);
}
