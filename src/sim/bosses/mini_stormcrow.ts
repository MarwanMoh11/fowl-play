// src/sim/bosses/mini_stormcrow.ts — OWNER: H2. Stormcrow (ch 10 mini): lightning columns, feather fan; Rooster dive at half HP.
import { rngRange } from '../rng';
import { STORMCROW as S } from '../tuning/bosses2';
import { dive, divePosition } from './attacksRooster';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { spaced, strikeColumns } from './attacksBeams';
import { aimedFan } from './attacksNew';

const TAU = Math.PI * 2;

function thunder(c: Ctx): boolean {
  const t = S.thunder;
  const { state } = c;
  return strikeColumns(c, {
    t0: spaced(t.count, t.spacing), xOf: () => rngRange(state.rng, t.minX, t.maxX),
    teleT: t.telegraph, beamT: t.beam, teleWidth: t.teleWidth, beamWidth: t.beamWidth,
  });
}

function feather(c: Ctx): boolean {
  const f = S.fan;
  return aimedFan(c, { kind: 'feather_knife', count: f.count, volleys: f.volleys, interval: f.interval, speed: f.speed, halfSpreadDeg: f.halfSpreadDeg });
}

export const stormcrowBehavior: BossBehavior = {
  init(rt) {
    rt.data.pt = 0;
  },
  cycle: (rt) => (rt.phase >= 1 ? ['thunder', 'feather_fan', 'dive'] : ['thunder', 'feather_fan']),
  gap: (rt) => S.gap[Math.min(rt.phase, S.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'thunder') return thunder(c);
    if (name === 'feather_fan') return feather(c);
    return dive(c);
  },
  move(c) {
    const { rt, e, dt } = c;
    if (rt.attack === 'dive') {
      divePosition(c);
      return;
    }
    rt.data.pt = (rt.data.pt ?? 0) + dt;
    const m = S.move;
    const pt = rt.data.pt;
    setPos(e, m.cx + m.ampX * Math.sin((TAU * pt) / m.periodX), m.cy + m.ampY * Math.sin((TAU * pt) / m.periodY), dt);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * 6) % 2,
};
