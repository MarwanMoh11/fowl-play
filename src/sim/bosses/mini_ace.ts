// src/sim/bosses/mini_ace.ts — OWNER: H2. Ace of Saucers (ch 7 mini): zips between waypoints, strafes, rings; escorts at half HP.
import { ACE as A } from '../tuning/bosses2';
import { shotSpeed } from './common';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { fireRing, spawnMinion, spiralStream } from './attacksNew';

/** Flies straight at the next waypoint at zipSpeed, then moves on to the following one. */
function zip(c: Ctx): void {
  const { rt, e, dt } = c;
  const idx = (rt.data.wp ?? 0) % A.waypoints.length;
  const target = A.waypoints[idx];
  const dx = target.x - e.pos.x;
  const dy = target.y - e.pos.y;
  const d = Math.hypot(dx, dy);
  const step = A.zipSpeed * dt;
  if (d <= step) {
    rt.data.wp = (idx + 1) % A.waypoints.length;
    setPos(e, target.x, target.y, dt);
  } else {
    setPos(e, e.pos.x + (dx / d) * step, e.pos.y + (dy / d) * step, dt);
  }
}

function strafe(c: Ctx): boolean {
  const s = A.strafe;
  return spiralStream(c, {
    kind: 'enemy_shot', arms: 1, eventsPerSec: 1 / s.interval, duration: s.duration, speed: s.speed, startDeg: 90, stepDeg: 0,
  });
}

function ring(c: Ctx): boolean {
  const r = A.ring;
  if (c.rt.attackT === 0) fireRing(c, 'enemy_shot', r.count, 0, shotSpeed(c.state, r.speed));
  return c.rt.attackT >= r.duration;
}

export const aceBehavior: BossBehavior = {
  init() {},
  cycle: () => ['strafe', 'ring'],
  gap: (rt) => A.gap[Math.min(rt.phase, A.gap.length - 1)],
  runAttack(c: Ctx, name) {
    return name === 'strafe' ? strafe(c) : ring(c);
  },
  move: zip,
  onPhase(c, phase) {
    if (phase !== 1) return;
    const m = A.escorts;
    m.lanes.forEach((laneY, i) => {
      const dir: 1 | -1 = i === 0 ? 1 : -1;
      spawnMinion(c.state, c.e, 'chicken_ufo', m.spawnX[i], laneY, { type: 'lane', laneY, speed: m.speed, dir, shotTimer: m.shotTimer });
    });
  },
  anim: (c) => (c.rt.attack === 'strafe' ? 1 : 0),
};
