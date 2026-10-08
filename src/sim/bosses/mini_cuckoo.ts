// src/sim/bosses/mini_cuckoo.ts — OWNER: H2. The Cuckoo Clock (ch 8 mini): pendulum beam, gear burst; 30% faster at half HP.
import { CUCKOO as K } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { lineBeams } from './attacksBeams';
import { radialBurst } from './attacksNew';

const TAU = Math.PI * 2;

/** A telegraphed beam that swings from 60 to 120 degrees and back, once per attack. */
function tock(c: Ctx): boolean {
  const k = K.tock;
  const dur = k.duration / (c.rt.phase >= 1 ? K.fasterMul : 1);
  return lineBeams(c, {
    angles: [k.centerDeg],
    angleAt: (_, t) => k.centerDeg - k.swingDeg * Math.cos((TAU * t) / dur),
    length: k.length, teleT: k.telegraph, beamT: dur, teleWidth: k.teleWidth, beamWidth: k.beamWidth,
  });
}

function gears(c: Ctx): boolean {
  const g = K.gears;
  if (c.rt.attackT === 0) radialBurst(c, 'gear', g.count, 0, g.speed * (c.rt.phase >= 1 ? K.fasterMul : 1));
  return c.rt.attackT >= g.duration;
}

export const cuckooBehavior: BossBehavior = {
  init() {},
  cycle: () => ['tock', 'gear_burst'],
  gap: (rt) => K.gap[Math.min(rt.phase, K.gap.length - 1)],
  runAttack(c: Ctx, name) {
    return name === 'tock' ? tock(c) : gears(c);
  },
  move(c) {
    setPos(c.e, K.home.x, K.home.y, c.dt);
  },
  onPhase() {},
  anim: (c) => (c.rt.attack === 'gear_burst' ? 1 : 0),
};
