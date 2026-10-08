// src/sim/bosses/attacksEgg.ts — OWNER: A2. Mother Hen attack set: egg_fan, egg_rain, brood (§7.13).
import { emit } from '../events';
import { spawnEnemy } from '../enemies';
import { deg } from '../math';
import { rngRange } from '../rng';
import { spawnProjectile } from '../projectiles';
import { HEN, MINION } from '../tuning/bosses';
import { EGG } from '../tuning/weapons';
import { attackVar, countEnemies, due, fireAt, setAttackVar, shotSpeed } from './common';
import type { Ctx } from './common';

/** 3 volleys of `count` boss eggs fanned from 60° to 120°. */
export function eggFan(c: Ctx, count: number): boolean {
  const f = HEN.fan;
  const volleys = due(c.rt, 'fan', c.rt.attackT, f.interval, f.volleys);
  for (let v = 0; v < volleys; v++) {
    for (let i = 0; i < count; i++) {
      const a = deg(count === 1 ? 90 : f.fromDeg + ((f.toDeg - f.fromDeg) * i) / (count - 1));
      fireAt(c.state, 'boss_egg', c.e.pos.x, c.e.pos.y + f.originY, a, shotSpeed(c.state, f.speed));
    }
  }
  return c.rt.attackT >= f.volleys * f.interval;
}

/** Gravity eggs raining from under the boss at `rate` per second. */
export function eggRain(c: Ctx, rate: number): boolean {
  const r = HEN.rain;
  const acc = attackVar(c.rt, 'acc') + rate * c.dt;
  const n = Math.floor(acc);
  setAttackVar(c.rt, 'acc', acc - n);
  for (let i = 0; i < n; i++) {
    const x = c.e.pos.x + rngRange(c.state.rng, -r.spreadX, r.spreadX);
    const y = c.e.pos.y + r.originY;
    const egg = spawnProjectile(c.state, { kind: 'egg', owner: 'enemy', x, y, vx: 0, vy: EGG.startVy });
    if (egg) emit(c.state, { type: 'egg_dropped', x, y });
  }
  return c.rt.attackT >= r.duration;
}

/** Spawns `count` seeking chicks unless the brood cap is already reached. */
export function brood(c: Ctx, count: number): boolean {
  if (c.rt.attackT === 0) {
    const alive = countEnemies(c.state, (e) => e.kind === 'chick' && e.behavior.type === 'seek');
    if (alive < HEN.brood.cap) {
      const m = MINION.brood;
      for (let i = 0; i < count; i++) {
        const x = c.e.pos.x + (i - (count - 1) / 2) * m.spacing;
        spawnEnemy(c.state, 'chick', x, c.e.pos.y, {
          type: 'seek', speed: m.speed, turnRate: m.turnRate, heading: deg(m.heading),
        });
      }
    }
  }
  return c.rt.attackT >= HEN.brood.duration;
}
