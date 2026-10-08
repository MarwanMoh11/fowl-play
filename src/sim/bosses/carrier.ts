// src/sim/bosses/carrier.ts — OWNER: A2. Egg Carrier, §7.13.
import { approach, clamp } from '../math';
import { BOSS_DEFS, CARRIER } from '../tuning/bosses';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { hatch, spiral, turretBurst } from './attacksShip';

const phaseSpeed = (phase: number): number => Math.pow(CARRIER.speedMulPerPhase, phase);

export const carrierBehavior: BossBehavior = {
  init() {},
  cycle: () => ['turret_burst', 'hatch', 'spiral'],
  gap: (rt) => CARRIER.gap * Math.pow(CARRIER.gapMulPerPhase, rt.phase),
  runAttack(c: Ctx, name) {
    const mul = phaseSpeed(c.rt.phase);
    if (name === 'turret_burst') {
      return turretBurst(c, { turretDx: CARRIER.burst.turretDx, turretDy: CARRIER.burst.turretDy, speedMul: mul });
    }
    if (name === 'hatch') return hatch(c, CARRIER.hatch.offsetY);
    return spiral(c, c.rt.phase >= CARRIER.spiral.twoArmsFromPhase ? 2 : 1, mul);
  },
  move(c) {
    const { rt, e, state, dt } = c;
    const m = CARRIER.move;
    const mt = rt.t - BOSS_DEFS.carrier.entry;
    const player = state.player;
    const target = player.alive ? clamp(player.pos.x, m.minX, m.maxX) : e.pos.x;
    const x = approach(e.pos.x, target, m.speed[rt.phase >= 1 ? 1 : 0] * dt);
    setPos(e, x, m.baseY + m.ampY * Math.sin(mt), dt);
  },
  onPhase() {},
  anim: (c) => c.rt.phase,
};
