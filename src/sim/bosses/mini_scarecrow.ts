// src/sim/bosses/mini_scarecrow.ts — OWNER: H2. Scarecrow Sentinel (ch 11 mini): crow call, hay spin; gravity well at half HP.
import { SCARECROW as S } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { gravityWell, spiralStream, summonSeekers } from './attacksNew';

function crowCall(c: Ctx): boolean {
  const k = S.crow;
  if (c.rt.attackT === 0) summonSeekers(c, k.count, k.cap, k.speed, k.turnRate);
  return c.rt.attackT >= k.duration;
}

function hay(c: Ctx): boolean {
  const h = S.hay;
  return spiralStream(c, {
    kind: 'enemy_shot', arms: h.arms, eventsPerSec: h.eventsPerSec, duration: h.duration, speed: h.speed, startDeg: 0, stepDeg: h.stepDeg,
  });
}

export const scarecrowBehavior: BossBehavior = {
  init() {},
  cycle: () => ['crow_call', 'hay_spin'],
  gap: (rt) => S.gap[Math.min(rt.phase, S.gap.length - 1)],
  runAttack(c: Ctx, name) {
    return name === 'crow_call' ? crowCall(c) : hay(c);
  },
  move(c) {
    setPos(c.e, S.home.x, S.home.y, c.dt);
    if (c.rt.phase >= 1) gravityWell(c.state, c.e, S.well.radius, S.well.power, S.well.ttl);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * 2) % 2,
};
