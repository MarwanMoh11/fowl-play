// src/sim/bosses/phoenix.ts — OWNER: H2. Storm Phoenix (ch 10): fire fan, lightning, dive, ash rings; one rebirth.
import { emit } from '../events';
import { clearEnemyProjectiles } from '../projectiles';
import { rngRange } from '../rng';
import { PHOENIX } from '../tuning/bosses2';
import { dive, divePosition } from './attacksRooster';
import type { BossBehavior, Ctx } from './common';
import { killHazards, setPos } from './common';
import { spaced, strikeColumns } from './attacksBeams';
import { fixedFan, ringBurst } from './attacksNew';

const P = PHOENIX;

function fire(c: Ctx): boolean {
  const f = P.fan;
  return fixedFan(c, { kind: 'fireball', count: f.count, volleys: f.volleys, interval: f.interval, speed: f.speed, fromDeg: f.fromDeg, toDeg: f.toDeg });
}

function lightning(c: Ctx): boolean {
  const l = P.lightning;
  const { state } = c;
  return strikeColumns(c, {
    t0: spaced(l.count, l.interval), xOf: () => rngRange(state.rng, l.minX, l.maxX),
    teleT: l.telegraph, beamT: l.beam, teleWidth: l.teleWidth, beamWidth: l.beamWidth,
  });
}

function ash(c: Ctx): boolean {
  const a = P.ash;
  return ringBurst(c, { kind: 'feather_knife', count: a.count, rings: a.rings, interval: a.interval, speed: a.speed, stepDeg: a.stepDeg });
}

/**
 * The first lethal hit only drops the Phoenix to half HP: it turns invulnerable for a moment, clears shots,
 * jumps to phase 2 and starts the reborn cycle. Later lethal hits go through.
 */
function rebirth(c: Ctx): void {
  const { rt, e, state } = c;
  if (rt.data.reborn === 1) return;
  const R = P.rebirth;
  rt.data.reborn = 1;
  e.hp = Math.round(e.maxHp * R.hpFrac);
  e.invulnerable = true;
  rt.data.invuln = R.invuln;
  rt.phase = 2;
  emit(state, { type: 'boss_phase', phase: 2, x: e.pos.x, y: e.pos.y });
  emit(state, { type: 'boss_attack', attack: 'rebirth', x: e.pos.x, y: e.pos.y });
  clearEnemyProjectiles(state);
  killHazards(state, e.id);
  rt.attack = 'idle';
  rt.attackT = 0;
  rt.cycleIndex = 0;
  rt.cooldown = R.invuln;
  rt.data.gapMul = R.gapMul;
}

export const phoenixBehavior: BossBehavior = {
  init(rt) {
    rt.data.pt = 0;
  },
  cycle: (rt) => {
    if (rt.data.reborn === 1) return ['ash_ring', 'lightning_strikes', 'dive_bomb', 'fire_fan'];
    if (rt.phase >= 1) return ['fire_fan', 'lightning_strikes', 'dive_bomb', 'fire_fan'];
    return ['fire_fan', 'lightning_strikes', 'dive_bomb'];
  },
  gap: (rt) => P.gap[Math.min(rt.phase, P.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'fire_fan') return fire(c);
    if (name === 'lightning_strikes') return lightning(c);
    if (name === 'dive_bomb') return dive(c);
    return ash(c);
  },
  move(c) {
    const { rt, e, dt } = c;
    if (rt.attack === 'dive_bomb') {
      divePosition(c);
      return;
    }
    rt.data.pt = (rt.data.pt ?? 0) + dt;
    const m = P.move;
    setPos(e, m.cx + m.ampX * Math.sin(m.freqX * rt.data.pt), m.cy + m.ampY * Math.sin(m.freqY * rt.data.pt), dt);
  },
  onPhase() {},
  onLethal(c) {
    rebirth(c);
  },
  anim: (c) => (c.rt.data.reborn === 1 ? 1 : 0),
};
