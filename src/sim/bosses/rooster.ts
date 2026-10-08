// src/sim/bosses/rooster.ts — OWNER: A2. Rooster Commander, §7.13.
import { spawnEnemy } from '../enemies';
import { ROOSTER, MINION } from '../tuning/bosses';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { dive, divePosition, featherRing, laserSweep, roosterPath } from './attacksRooster';

export const roosterBehavior: BossBehavior = {
  init(rt) {
    rt.data.pt = 0;
  },
  cycle: () => ['dive', 'laser_sweep', 'feather_ring'],
  gap: (rt) => ROOSTER.gap[Math.min(rt.phase, 1)],
  runAttack(c: Ctx, name) {
    if (name === 'dive') return dive(c);
    if (name === 'laser_sweep') return laserSweep(c, { mirrored: false, beakDy: ROOSTER.sweep.beakDy });
    return featherRing(c, ROOSTER.ring.knives[Math.min(c.rt.phase, 1)]);
  },
  move(c) {
    const { rt, e, dt } = c;
    if (rt.attack === 'dive') {
      divePosition(c);
    } else if (rt.attack === 'laser_sweep') {
      setPos(e, e.pos.x, e.pos.y, dt);                 // stop moving while the beam is out
    } else {
      rt.data.pt += dt;
      const p = roosterPath(rt.data.pt);
      setPos(e, p.x, p.y, dt);
    }
  },
  onPhase(c, phase) {
    if (phase !== 1) return;
    const m = MINION.escort;
    // Two escort UFOs enter from opposite sides on separate lanes.
    spawnEnemy(c.state, 'chicken_ufo', m.spawnX[0], m.lanes[0], {
      type: 'lane', laneY: m.lanes[0], speed: m.speed, dir: 1, shotTimer: m.shotTimer,
    });
    spawnEnemy(c.state, 'chicken_ufo', m.spawnX[1], m.lanes[1], {
      type: 'lane', laneY: m.lanes[1], speed: m.speed, dir: -1, shotTimer: m.shotTimer,
    });
  },
  anim: (c) => (c.rt.attack === 'idle' ? 0 : 1),
};
