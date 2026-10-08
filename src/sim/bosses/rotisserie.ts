// src/sim/bosses/rotisserie.ts — OWNER: H2. Rotisserie Titan (ch 7): spit spin, grease rain, flame sweep, roast burst.
import { rngRange } from '../rng';
import { ROTI } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { lineBeams } from './attacksBeams';
import { patrol, rain, ringBurst, spiralStream } from './attacksNew';

const R = ROTI;

/** Four rotating arms of fireballs, one shot per arm every armInterval. */
function spit(c: Ctx): boolean {
  const s = R.spit;
  return spiralStream(c, {
    kind: 'fireball', arms: s.arms, eventsPerSec: 1 / s.armInterval, duration: s.duration, speed: s.speed,
    startDeg: 0, stepDeg: s.rotDegPerSec * s.armInterval,
  });
}

function grease(c: Ctx): boolean {
  const g = R.grease;
  const { state } = c;
  rain(c, 'grease', g.rate, () => rngRange(state.rng, g.minX, g.maxX), g.y);
  return c.rt.attackT >= g.duration;
}

/** Telegraph down the spit, then a 34-wide beam sweeping 60 to 120 degrees. */
function flame(c: Ctx): boolean {
  const f = R.flame;
  return lineBeams(c, {
    angles: [f.fromDeg], rates: [(f.toDeg - f.fromDeg) / f.duration], dy: f.dy, length: f.length,
    teleT: f.telegraph, beamT: f.duration, teleWidth: f.telegraphWidth, beamWidth: f.width,
  });
}

function roast(c: Ctx): boolean {
  const r = R.roast;
  return ringBurst(c, {
    kind: 'fireball', count: r.count, rings: r.rings, interval: r.interval, speed: r.speed, stepDeg: 0, alternate: true,
  });
}

export const rotisserieBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => {
    if (rt.phase >= 2) return ['roast_burst', 'flame_sweep', 'spit_spin'];
    if (rt.phase >= 1) return ['spit_spin', 'flame_sweep', 'grease_rain'];
    return ['spit_spin', 'grease_rain'];
  },
  gap: (rt) => R.gap[Math.min(rt.phase, R.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'spit_spin') return spit(c);
    if (name === 'grease_rain') return grease(c);
    if (name === 'flame_sweep') return flame(c);
    return roast(c);
  },
  move(c) {
    const m = R.move;
    patrol(c, m.y, m.minX, m.maxX, m.speed[Math.min(c.rt.phase, m.speed.length - 1)]);
  },
  onPhase() {},
  anim: (c) => Math.min(c.rt.phase, 2),
};
