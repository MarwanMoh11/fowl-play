// src/sim/bosses/colossus.ts — OWNER: H2. Cluckwork Colossus (ch 8): gear toss, piston slam, clock hands, cuckoo swarm.
import { BOSS_DEFS } from '../tuning/bosses';
import { clamp, easeInOutSine, lerp } from '../math';
import { COLOSSUS } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { setPos } from './common';
import { lineBeams, strikeColumns } from './attacksBeams';
import { aimedFan, summonSeekers } from './attacksNew';

const K = COLOSSUS;

function gearToss(c: Ctx): boolean {
  const g = K.gear;
  const count = g.counts[Math.min(c.rt.phase, g.counts.length - 1)];
  return aimedFan(c, { kind: 'gear', count, volleys: 1, interval: g.interval, speed: g.speed, halfSpreadDeg: g.halfSpreadDeg });
}

/** Three full-height columns: one on the player and two 180 px either side, each telegraphed first. */
function pistonSlam(c: Ctx): boolean {
  const p = K.piston;
  return strikeColumns(c, {
    t0: [0, 0, 0],
    xOf: (i) => clamp(c.state.player.pos.x + p.offsets[i], 40, 1240),
    teleT: p.telegraph, beamT: p.beam, teleWidth: p.teleWidth, beamWidth: p.beamWidth,
  });
}

function clockHands(c: Ctx): boolean {
  const k = K.clock;
  return lineBeams(c, {
    angles: k.startDeg, rates: k.rateDegPerSec, length: k.length, teleT: k.telegraph, beamT: k.duration,
    teleWidth: k.teleWidth, beamWidth: k.width,
  });
}

function cuckooSwarm(c: Ctx): boolean {
  const s = K.swarm;
  if (c.rt.attackT === 0) summonSeekers(c, s.count, s.cap, s.speed, s.turnRate);
  return c.rt.attackT >= s.duration;
}

/** Steps x through xs every stepSec, easing over easeSec at the start of each step (clock from the end of entry). */
function stepX(t: number): number {
  const m = K.move;
  const seg = Math.floor(t / m.stepSec);
  const from = m.xs[seg % m.xs.length];
  const to = m.xs[(seg + 1) % m.xs.length];
  const u = Math.min(1, (t - seg * m.stepSec) / m.easeSec);
  return lerp(from, to, easeInOutSine(u));
}

export const colossusBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => {
    if (rt.phase >= 2) return ['cuckoo_swarm', 'clock_hands', 'gear_toss', 'piston_slam'];
    if (rt.phase >= 1) return ['gear_toss', 'clock_hands', 'piston_slam'];
    return ['gear_toss', 'piston_slam'];
  },
  gap: (rt) => K.gap[Math.min(rt.phase, K.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'gear_toss') return gearToss(c);
    if (name === 'piston_slam') return pistonSlam(c);
    if (name === 'clock_hands') return clockHands(c);
    return cuckooSwarm(c);
  },
  move(c) {
    setPos(c.e, stepX(c.rt.t - BOSS_DEFS.colossus.entry), K.move.y, c.dt);
  },
  onPhase() {},
  anim: (c) => Math.min(c.rt.phase, 2),
};
