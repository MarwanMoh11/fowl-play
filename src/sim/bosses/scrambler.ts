// src/sim/bosses/scrambler.ts — OWNER: H2. The Scrambler (ch 11): permanent gravity well, galaxy arms, event horizon.
import { BOSS_DEFS } from '../tuning/bosses';
import { SCRAMBLER as S } from '../tuning/bosses2';
import { aimAngle, attackVar, setAttackVar, setPos } from './common';
import type { BossBehavior, Ctx } from './common';
import { lineBeams } from './attacksBeams';
import { gravityWell, inwardRing, spiralStream, swallowShots } from './attacksNew';

const TAU = Math.PI * 2;

function arms(c: Ctx): boolean {
  const a = S.arms;
  return spiralStream(c, {
    kind: 'enemy_shot', arms: a.arms, eventsPerSec: a.eventsPerSec, duration: a.duration, speed: a.speed,
    startDeg: 0, stepDeg: a.stepDeg,
  });
}

function horizon(c: Ctx): boolean {
  const h = S.horizon;
  if (c.rt.attackT === 0) {
    inwardRing(c, { kind: 'enemy_shot', count: h.count, radius: h.radius, speed: h.speed, gapSlots: h.gapSlots });
  }
  return c.rt.attackT >= h.duration;
}

/** Four lines aimed around the player, locked when the attack starts. */
function spaghettify(c: Ctx): boolean {
  if (c.rt.attackT === 0) setAttackVar(c.rt, 'aim', (aimAngle(c.state, c.e.pos.x, c.e.pos.y) * 180) / Math.PI);
  const aim = attackVar(c.rt, 'aim');
  const sp = S.spaghetti;
  return lineBeams(c, {
    angles: sp.anglesDeg.map((d) => aim + d), length: sp.length, teleT: sp.telegraph, beamT: sp.beam,
    teleWidth: sp.teleWidth, beamWidth: sp.beamWidth,
  });
}

function swallow(c: Ctx): boolean {
  if (c.rt.attackT === 0) swallowShots(c.state, S.swallow.max, S.swallow.speed, S.swallow.homing);
  return c.rt.attackT >= S.swallow.duration;
}

export const scramblerBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => {
    if (rt.phase >= 2) return ['swallow', 'galaxy_arms', 'spaghettify', 'event_horizon'];
    if (rt.phase >= 1) return ['galaxy_arms', 'spaghettify', 'event_horizon'];
    return ['galaxy_arms', 'event_horizon'];
  },
  gap: (rt) => S.gap[Math.min(rt.phase, S.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'galaxy_arms') return arms(c);
    if (name === 'event_horizon') return horizon(c);
    if (name === 'spaghettify') return spaghettify(c);
    return swallow(c);
  },
  move(c) {
    const m = S.move;
    const t = c.rt.t - BOSS_DEFS.scrambler.entry;
    const ang = (TAU * t) / m.period - Math.PI / 2;
    setPos(c.e, m.cx + m.radius * Math.cos(ang), m.cy + m.radius * Math.sin(ang), c.dt);
    gravityWell(c.state, c.e, S.well.radius, S.well.power[Math.min(c.rt.phase, S.well.power.length - 1)], S.well.ttl);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * 4) % 2,
};
