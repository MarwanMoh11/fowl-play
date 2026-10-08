// src/sim/bosses/dreadnought.ts — OWNER: A2. Coop Dreadnought (final boss), §7.13.
import { BOSS_DEFS, DREADNOUGHT } from '../tuning/bosses';
import { clearEnemyProjectiles } from '../projectiles';
import type { BossBehavior, Ctx } from './common';
import { killHazards, setPos } from './common';
import { brood, eggFan, eggRain } from './attacksEgg';
import { hatch, spiral, turretBurst } from './attacksShip';
import { featherRing, laserSweep } from './attacksRooster';

const CYCLES: readonly (readonly string[])[] = [
  ['turret_burst', 'hatch', 'spiral'],            // phase 0: Carrier set
  ['egg_fan', 'egg_rain', 'brood'],               // phase 1: Mother Hen set
  ['laser_sweep', 'feather_ring'],                // phase 2: Rooster set (no dive)
];

export const dreadnoughtBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => CYCLES[Math.min(rt.phase, CYCLES.length - 1)],
  gap: (rt) => DREADNOUGHT.gap[Math.min(rt.phase, DREADNOUGHT.gap.length - 1)],
  runAttack(c: Ctx, name) {
    const D = DREADNOUGHT;
    switch (name) {
      case 'turret_burst': return turretBurst(c, { turretDx: D.turretDx, turretDy: D.turretDy, speedMul: 1 });
      case 'hatch': return hatch(c, D.hatchOffsetY);
      case 'spiral': return spiral(c, 2, 1);
      case 'egg_fan': return eggFan(c, D.fanCount);
      case 'egg_rain': return eggRain(c, D.rainRate);
      case 'brood': return brood(c, D.broodCount);
      case 'laser_sweep': return laserSweep(c, { mirrored: true, beakDy: D.beakDy });
      default: return featherRing(c, D.knives);
    }
  },
  move(c) {
    const m = DREADNOUGHT.move;
    const mt = c.rt.t - BOSS_DEFS.dreadnought.entry;
    setPos(c.e, m.cx + m.ampX * Math.sin(m.freq * mt), m.y, c.dt);
  },
  onPhase(c) {
    const { state, e, rt } = c;
    e.invulnerable = true;
    rt.data.invuln = DREADNOUGHT.phaseInvuln;
    clearEnemyProjectiles(state);
    killHazards(state);
    rt.attack = 'idle';
    rt.attackT = 0;
    rt.cycleIndex = 0;
    rt.cooldown = DREADNOUGHT.phaseInvuln + dreadnoughtBehavior.gap(rt);
  },
  anim: (c) => c.rt.phase,
};
