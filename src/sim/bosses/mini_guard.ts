// src/sim/bosses/mini_guard.ts — OWNER: H2. Royal Egg Guard (ch 12 mini): 300 shield, lance charge, royal volley.
import { clamp, easeInOutSine, lerp } from '../math';
import { GUARD as G } from '../tuning/bosses2';
import type { BossBehavior, Ctx } from './common';
import { addHazard, attackVar, setAttackVar, setPos } from './common';
import { SCREEN_H } from './attacksBeams';
import { aimedFan } from './attacksNew';

const L = G.lance;

/** Telegraphs a lance down the player's column, then dashes down and returns home. */
function lance(c: Ctx): boolean {
  const { rt, e, state } = c;
  if (rt.attackT === 0) {
    const tx = clamp(state.player.pos.x, L.clampX[0], L.clampX[1]);
    setAttackVar(rt, 'tx', tx);
    setAttackVar(rt, 'sx', e.pos.x);
    setAttackVar(rt, 'sy', e.pos.y);
    addHazard(state, e, 'telegraph', { x: tx, y: e.pos.y }, { x: tx, y: SCREEN_H }, L.width, L.telegraph);
  }
  return rt.attackT >= L.telegraph + L.dash + L.hold + L.back;
}

function lancePos(c: Ctx): void {
  const { rt, e, dt } = c;
  const t = rt.attackT;
  const tx = attackVar(rt, 'tx');
  const sx = attackVar(rt, 'sx');
  const sy = attackVar(rt, 'sy');
  const d1 = L.telegraph;
  const d2 = d1 + L.dash;
  const d3 = d2 + L.hold;
  if (t < d1) {
    setPos(e, sx, sy, dt);
  } else if (t < d2) {
    const u = (t - d1) / L.dash;
    setPos(e, lerp(sx, tx, u), lerp(sy, L.dashY, u), dt);
  } else if (t < d3) {
    setPos(e, tx, L.dashY, dt);
  } else {
    const u = easeInOutSine(Math.min(1, (t - d3) / L.back));
    setPos(e, lerp(tx, G.home.x, u), lerp(L.dashY, G.home.y, u), dt);
  }
}

function volley(c: Ctx): boolean {
  const v = G.volley;
  return aimedFan(c, { kind: 'boss_egg', count: v.count, volleys: v.volleys, interval: v.interval, speed: v.speed, halfSpreadDeg: v.halfSpreadDeg });
}

export const guardBehavior: BossBehavior = {
  init() {},
  onSpawn(c) {
    c.e.shield = G.shield;
    c.e.maxShield = G.shield;
  },
  cycle: () => ['lance_charge', 'royal_volley'],
  gap: (rt) => G.gap[Math.min(rt.phase, G.gap.length - 1)],
  runAttack(c: Ctx, name) {
    return name === 'lance_charge' ? lance(c) : volley(c);
  },
  move(c) {
    if (c.rt.attack === 'lance_charge') lancePos(c);
    else setPos(c.e, G.home.x, G.home.y, c.dt);
  },
  onPhase(c, phase) {
    if (phase === 1) c.e.shield = G.shieldAfter;
  },
  anim: (c) => (c.rt.attack === 'lance_charge' ? 1 : 0),
};
