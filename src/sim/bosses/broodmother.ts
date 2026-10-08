// src/sim/bosses/broodmother.ts — OWNER: H2. Broodmother Nebula (ch 6): nebula spiral, egg pods, feather storm, cloak.
import { emit } from '../events';
import { clamp } from '../math';
import { rngRange } from '../rng';
import { shotSpeed, countEnemies, attackVar, setAttackVar } from './common';
import type { BossBehavior, Ctx } from './common';
import { BROOD } from '../tuning/bosses2';
import { aimedFan, fireRing, lissajou, spawnMinion, spiralStream } from './attacksNew';

const B = BROOD;

function nebula(c: Ctx): boolean {
  const s = B.spiral;
  return spiralStream(c, {
    kind: 'enemy_shot', arms: s.arms, eventsPerSec: s.shotsPerSec / s.arms, duration: s.duration,
    speed: s.speed, startDeg: 90, stepDeg: s.stepDeg,
  });
}

/** Egg pods across the wingspan, drifting down; at most `cap` alive from this boss. */
function podDrop(c: Ctx): boolean {
  const { state, e } = c;
  if (c.rt.attackT === 0) {
    const alive = countEnemies(state, (o) => o.kind === 'egg_pod' && o.parentId === e.id);
    const n = Math.max(0, Math.min(B.pods.count, B.pods.cap - alive));
    for (let i = 0; i < n; i++) {
      const x = e.pos.x + (i - (n - 1) / 2) * B.pods.spacing;
      const pod = spawnMinion(state, e, 'egg_pod', x, e.pos.y + 40, { type: 'drift', spin: 0 });
      if (pod) pod.vel.y = B.pods.vy;
    }
  }
  return c.rt.attackT >= B.pods.duration;
}

function feather(c: Ctx): boolean {
  const f = B.feather;
  return aimedFan(c, {
    kind: 'feather_knife', count: f.count, volleys: f.volleys, interval: f.interval, speed: f.speed,
    halfSpreadDeg: f.halfSpreadDeg,
  });
}

/** Invulnerable and cloaked for teleportAt seconds, then teleports and fires a ring. */
function cloak(c: Ctx): boolean {
  const { rt, e, state } = c;
  const C = B.cloak;
  if (rt.attackT === 0) {
    e.invulnerable = true;
    emit(state, { type: 'enemy_cloak', id: e.id, x: e.pos.x, y: e.pos.y, on: true });
  }
  if (attackVar(rt, 'tp') === 0 && rt.attackT >= C.teleportAt) {
    setAttackVar(rt, 'tp', 1);
    const fromX = e.pos.x;
    const fromY = e.pos.y;
    const x = rngRange(state.rng, C.teleportX[0], C.teleportX[1]);
    e.invulnerable = false;
    emit(state, { type: 'enemy_cloak', id: e.id, x: fromX, y: fromY, on: false });
    emit(state, { type: 'enemy_teleport', id: e.id, fromX, fromY, x, y: fromY });
    e.pos.x = x;
    rt.data.cx = clamp(x, C.clampX[0], C.clampX[1]);
    fireRing(c, 'enemy_shot', C.ringCount, 0, shotSpeed(state, C.ringSpeed));
  }
  return rt.attackT >= C.duration;
}

export const broodmotherBehavior: BossBehavior = {
  init() {},
  cycle: (rt) => {
    if (rt.phase >= 2) return ['cloak', 'feather_storm', 'nebula_spiral', 'pod_drop'];
    if (rt.phase >= 1) return ['nebula_spiral', 'feather_storm', 'pod_drop'];
    return ['nebula_spiral', 'pod_drop'];
  },
  gap: (rt) => B.gap[Math.min(rt.phase, B.gap.length - 1)],
  runAttack(c: Ctx, name) {
    if (name === 'nebula_spiral') return nebula(c);
    if (name === 'pod_drop') return podDrop(c);
    if (name === 'feather_storm') return feather(c);
    return cloak(c);
  },
  move(c) {
    const m = B.move;
    lissajou(c, c.rt.data.cx ?? m.cx, m.cy, m.ampX, m.period, m.ampY, m.period / 2);
  },
  onPhase() {},
  anim: (c) => Math.floor(c.rt.t * B.flapFps) % 2,
};
