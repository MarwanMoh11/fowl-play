// src/sim/bosses/hen.ts — OWNER: A2. Mother Hen (also used by each Twin Hen), §7.13.
import { clamp } from '../math';
import { HEN } from '../tuning/bosses';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { brood, eggFan, eggRain } from './attacksEgg';

const TAU = Math.PI * 2;

export const henBehavior: BossBehavior = {
  init(rt, index, home) {
    const m = HEN.move;
    const sign = index === 1 ? -1 : 1;             // hen B uses the mirrored movement
    rt.data.mirror = index === 1 ? 1 : 0;
    // Start the sine at the home x so entry flows into the patrol without a jump.
    rt.data.mph = Math.asin(clamp((sign * (home.x - m.cx)) / m.ampX, -1, 1));
    rt.data.yph = 0;
  },
  cycle: (rt) => (rt.phase >= 1 ? ['egg_fan', 'egg_rain', 'brood'] : ['egg_fan', 'egg_rain']),
  gap: (rt) => HEN.gap[Math.min(rt.phase, 1)],
  runAttack(c: Ctx, name) {
    const ph = Math.min(c.rt.phase, 1);
    if (name === 'egg_fan') return eggFan(c, HEN.fan.count[ph]);
    if (name === 'egg_rain') return eggRain(c, HEN.rain.rate[ph]);
    return brood(c, HEN.brood.count);
  },
  move(c) {
    const { rt, e, dt } = c;
    const m = HEN.move;
    rt.data.mph += (TAU * dt) / (rt.phase >= 1 ? m.periodPhase1 : m.period);
    rt.data.yph += (TAU * dt) / m.periodY;
    const sign = rt.data.mirror ? -1 : 1;
    setPos(e, m.cx + sign * m.ampX * Math.sin(rt.data.mph), m.baseY + m.ampY * Math.sin(rt.data.yph), dt);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * HEN.flapFps) % 2,
};
