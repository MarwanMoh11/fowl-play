// src/sim/bosses/kraken.ts — OWNER: H2. Yolk Kraken (ch 9): tentacle slam, ink cloud, sucker rings, whirlpool, grab.
import { KRAKEN } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { lineBeams, spaced, strikeColumns } from './attacksBeams';
import { gravityWell, homingShots, lissajou, ringBurst, spiralStream } from './attacksNew';

const K = KRAKEN;

function slam(c: Ctx): boolean {
  const s = K.slam;
  return lineBeams(c, {
    angles: s.anglesDeg, length: s.length, teleT: s.telegraph, beamT: s.beam, teleWidth: s.teleWidth, beamWidth: s.beamWidth,
  });
}

function ink(c: Ctx): boolean {
  if (c.rt.attackT === 0) homingShots(c, 'void_orb', K.ink.anglesDeg, K.ink.speed, K.ink.homing);
  return c.rt.attackT >= K.ink.duration;
}

function rings(c: Ctx): boolean {
  const r = K.rings;
  return ringBurst(c, { kind: 'boss_egg', count: r.count, rings: r.rings, interval: r.interval, speed: r.speed, stepDeg: r.stepDeg });
}

/** A gravity well that lasts exactly the attack, plus a slow single arm of shots. */
function whirlpool(c: Ctx): boolean {
  const w = K.whirl;
  gravityWell(c.state, c.e, w.radius, w.power, Math.max(0.05, w.duration - c.rt.attackT));
  return spiralStream(c, {
    kind: 'enemy_shot', arms: w.arms, eventsPerSec: w.eventsPerSec, duration: w.duration, speed: w.speed,
    startDeg: 0, stepDeg: w.stepDeg,
  });
}

/** Two column strikes on the player's x, each taken when its telegraph starts. */
function grab(c: Ctx): boolean {
  const g = K.grab;
  return strikeColumns(c, {
    t0: spaced(g.count, g.spacing),
    xOf: () => c.state.player.pos.x,
    teleT: g.telegraph, beamT: g.beam, teleWidth: g.width, beamWidth: g.width,
  });
}

export const krakenBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => {
    if (rt.phase >= 2) return ['grab', 'whirlpool', 'sucker_rings', 'ink_cloud'];
    if (rt.phase >= 1) return ['whirlpool', 'sucker_rings', 'tentacle_slam'];
    return ['sucker_rings', 'tentacle_slam', 'ink_cloud'];
  },
  gap: (rt) => K.gap[Math.min(rt.phase, K.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'tentacle_slam') return slam(c);
    if (name === 'ink_cloud') return ink(c);
    if (name === 'sucker_rings') return rings(c);
    if (name === 'whirlpool') return whirlpool(c);
    return grab(c);
  },
  move(c) {
    const m = K.move;
    lissajou(c, m.cx, m.cy, m.ampX, m.periodX, m.ampY, m.periodY);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * 2) % 2,
};
