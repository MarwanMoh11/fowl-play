// src/sim/bosses/mini_brigadier.ts — OWNER: H2. Brigadier Broiler (ch 6 mini): egg shotgun, salute columns, brood.
import { rngRange } from '../rng';
import { BRIGADIER as B } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { strikeColumns } from './attacksBeams';
import { aimedFan, patrol, summonSeekers } from './attacksNew';

function shotgun(c: Ctx): boolean {
  const s = B.shotgun;
  return aimedFan(c, { kind: 'boss_egg', count: s.count, volleys: s.volleys, interval: s.interval, speed: s.speed, halfSpreadDeg: s.halfSpreadDeg });
}

/** Two telegraphed columns: one on the player, one at a random x. */
function salute(c: Ctx): boolean {
  const s = B.salute;
  const { state } = c;
  return strikeColumns(c, {
    t0: [0, 0],
    xOf: (i) => (i === 0 ? state.player.pos.x : rngRange(state.rng, 200, 1080)),
    teleT: s.telegraph, beamT: s.beam, teleWidth: s.teleWidth, beamWidth: s.beamWidth,
  });
}

function brood(c: Ctx): boolean {
  const b = B.brood;
  if (c.rt.attackT === 0) summonSeekers(c, b.count, b.cap, b.speed, b.turnRate);
  return c.rt.attackT >= b.duration;
}

export const brigadierBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => (rt.phase >= 1 ? ['shotgun', 'salute', 'brood'] : ['shotgun', 'salute']),
  gap: (rt) => B.gap[Math.min(rt.phase, B.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'shotgun') return shotgun(c);
    if (name === 'salute') return salute(c);
    return brood(c);
  },
  move(c) {
    const m = B.move;
    patrol(c, m.y, m.cx - m.ampX, m.cx + m.ampX, m.speed);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * 4) % 2,
};
