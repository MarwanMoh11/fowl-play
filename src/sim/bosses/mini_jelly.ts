// src/sim/bosses/mini_jelly.ts — OWNER: H2. Yolk Jelly (ch 9 mini): egg drips, pulse ring; homing orbs at half HP.
import { JELLY as J } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { homingShots, lissajou, rain, ringBurst } from './attacksNew';

/** Eggs drip from three tentacle columns under the jelly. */
function drip(c: Ctx): boolean {
  const d = J.drip;
  for (const dx of d.columns) {
    rain(c, 'drip' + dx, d.rate, () => c.e.pos.x + dx, c.e.pos.y + d.y);
  }
  return c.rt.attackT >= d.duration;
}

function pulse(c: Ctx): boolean {
  const p = J.pulse;
  return ringBurst(c, { kind: 'boss_egg', count: p.count, rings: 1, interval: p.duration, speed: p.speed, stepDeg: 0 });
}

function orbs(c: Ctx): boolean {
  const o = J.orbs;
  if (c.rt.attackT === 0) homingShots(c, 'void_orb', o.anglesDeg, o.speed, o.homing);
  return c.rt.attackT >= o.duration;
}

export const jellyBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => (rt.phase >= 1 ? ['drip', 'pulse_ring', 'void_pair'] : ['drip', 'pulse_ring']),
  gap: (rt) => J.gap[Math.min(rt.phase, J.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'drip') return drip(c);
    if (name === 'pulse_ring') return pulse(c);
    return orbs(c);
  },
  move(c) {
    const m = J.move;
    lissajou(c, m.cx, m.cy, m.ampX, m.periodX, m.ampY, m.periodY);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * 3) % 2,
};
