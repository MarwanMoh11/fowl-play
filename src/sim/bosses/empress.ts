// src/sim/bosses/empress.ts — OWNER: H2. Empress Yolkanda (ch 12): four phases; decrees, crosses, guards, egg storms.
import { BOSS_DEFS } from '../tuning/bosses';
import { clamp } from '../math';
import { clearEnemyProjectiles } from '../projectiles';
import { rngRange } from '../rng';
import { EMPRESS as E } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { killHazards, setPos } from './common';
import { lineBeams } from './attacksBeams';
import { aimedFan, countMinions, gravityWell, rain, ringBurst, spawnMinion, spiralStream } from './attacksNew';

const TAU = Math.PI * 2;

function royalDecree(c: Ctx): boolean {
  const d = E.decree;
  return aimedFan(c, { kind: 'boss_egg', count: d.count, volleys: d.volleys, interval: d.interval, speed: d.speed, halfSpreadDeg: d.halfSpreadDeg });
}

function crownSpiral(c: Ctx): boolean {
  const s = E.crown;
  return spiralStream(c, {
    kind: 'gear', arms: s.arms, eventsPerSec: s.eventsPerSec, duration: s.duration, speed: s.speed, startDeg: 0, stepDeg: s.stepDeg,
  });
}

/** Elite guards enter on two lanes from alternate sides, at most `cap` alive from the Empress. */
function summonGuard(c: Ctx): boolean {
  const { state, e, rt } = c;
  const g = E.guard;
  if (rt.attackT === 0) {
    const n = Math.min(g.count, g.cap - countMinions(state, e, 'chicken_elite'));
    for (let i = 0; i < n; i++) {
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const laneY = g.laneY[Math.floor(i / 2) % g.laneY.length];
      const x = dir === 1 ? g.spawnX[0] : g.spawnX[1];
      spawnMinion(state, e, 'chicken_elite', x, laneY, { type: 'lane', laneY, speed: g.speed, dir, shotTimer: g.shotTimer });
    }
  }
  return rt.attackT >= g.duration;
}

/** Two beams forming an X through her, turning 90 degrees over the beam stage. */
function crossLaser(c: Ctx): boolean {
  const x = E.cross;
  return lineBeams(c, {
    angles: x.startDeg, rates: [x.rateDegPerSec, x.rateDegPerSec], length: x.length, teleT: x.telegraph,
    beamT: x.beam, teleWidth: x.teleWidth, beamWidth: x.width,
  });
}

function yolkNova(c: Ctx): boolean {
  const n = E.nova;
  if (c.rt.attackT === 0) gravityWell(c.state, c.e, n.well.radius, n.well.power, n.well.ttl);
  return ringBurst(c, { kind: 'fireball', count: n.count, rings: n.rings, interval: n.interval, speed: n.speed, stepDeg: n.stepDeg });
}

/** Eggs across the screen except two drifting 160 px lanes. */
function eggApocalypse(c: Ctx): boolean {
  const a = E.apocalypse;
  const { state } = c;
  const t = c.rt.attackT;
  const drift = a.driftAmp * Math.sin((TAU * t) / a.driftPeriod);
  const lanes = [a.laneCenters[0] + drift, a.laneCenters[1] - drift];
  rain(c, 'apoc', a.rate, () => {
    const x = rngRange(state.rng, 0, 1280);
    return lanes.some((l) => Math.abs(x - l) < a.laneWidth / 2) ? null : x;
  }, a.y);
  return t >= a.duration;
}

/** Glide in phase 0, wide sweep in phases 1 and 2, two sines (erratic) in phase 3. */
function movePos(c: Ctx): void {
  const m = E.move;
  const t = c.rt.t - BOSS_DEFS.empress.entry;
  let x: number;
  let y = m.cy;
  if (c.rt.phase === 0) {
    x = m.cx + m.glideAmp * Math.sin((TAU * t) / m.glidePeriod);
  } else if (c.rt.phase < 3) {
    x = m.cx + m.sweepAmp * Math.sin((TAU * t) / m.sweepPeriod);
  } else {
    x = m.cx + m.ampA * Math.sin((TAU * t) / m.periodA) + m.ampB * Math.sin((TAU * t) / m.periodB);
    y = m.cy + m.ampY * Math.sin((TAU * t) / m.periodY);
  }
  setPos(c.e, clamp(x, m.minX, m.maxX), y, c.dt);
}

export const empressBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => {
    if (rt.phase >= 3) return ['yolk_nova', 'egg_apocalypse', 'cross_laser', 'crown_spiral'];
    if (rt.phase >= 2) return ['cross_laser', 'royal_decree', 'crown_spiral', 'summon_guard'];
    if (rt.phase >= 1) return ['summon_guard', 'royal_decree', 'crown_spiral'];
    return ['royal_decree', 'crown_spiral'];
  },
  gap: (rt) => E.gap[Math.min(rt.phase, E.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'royal_decree') return royalDecree(c);
    if (name === 'crown_spiral') return crownSpiral(c);
    if (name === 'summon_guard') return summonGuard(c);
    if (name === 'cross_laser') return crossLaser(c);
    if (name === 'yolk_nova') return yolkNova(c);
    return eggApocalypse(c);
  },
  move: movePos,
  onPhase(c) {
    const { state, e, rt } = c;
    e.invulnerable = true;
    rt.data.invuln = E.invuln;
    clearEnemyProjectiles(state);
    killHazards(state);
    rt.attack = 'idle';
    rt.attackT = 0;
    rt.cycleIndex = 0;
    rt.cooldown = E.invuln + empressBehavior.gap(rt);
  },
  anim: (c) => Math.min(2, Math.max(0, c.rt.phase - 1)),
};
