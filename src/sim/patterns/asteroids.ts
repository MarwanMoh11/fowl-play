// src/sim/patterns/asteroids.ts — OWNER: A3. `asteroids`: timed rock field (§7.11). Splitting lives in enemies.ts.
import type { EnemyKind, GameState } from '../types';
import type { AsteroidsSpec, GroupRuntime } from '../waves.types';
import { chapterScale } from '../difficulty';
import { deg, fromAngle } from '../math';
import { rngChance, rngNext, rngRange } from '../rng';
import { ASTEROIDS } from '../tuning/enemies';
import { spawnMember } from './common';

export function asteroidsPlanned(s: AsteroidsSpec): number {
  return Math.floor(s.rate * s.duration + 1e-9);
}

export function startAsteroids(_state: GameState, g: GroupRuntime, s: AsteroidsSpec): void {
  g.total = asteroidsPlanned(s);
}

function pickKind(state: GameState, mix: { l: number; m: number; s: number }): EnemyKind {
  const u = rngNext(state.rng) * (mix.l + mix.m + mix.s);
  if (u < mix.l) return 'asteroid_l';
  return u < mix.l + mix.m ? 'asteroid_m' : 'asteroid_s';
}

function spawnAsteroid(state: GameState, g: GroupRuntime, s: AsteroidsSpec, index: number): void {
  const left = s.from === 'tl' || (s.from === 'both' && index % 2 === 1);
  const kind = pickKind(state, s.mix ?? ASTEROIDS.mix);
  const top = rngChance(state.rng, 0.5);
  const rx = top
    ? rngRange(state.rng, ASTEROIDS.topEdge.minX, ASTEROIDS.topEdge.maxX)
    : ASTEROIDS.sideEdge.x;
  const y = top ? ASTEROIDS.topEdge.y : rngRange(state.rng, ASTEROIDS.sideEdge.minY, ASTEROIDS.sideEdge.maxY);
  const x = left ? ASTEROIDS.worldWidth - rx : rx;
  const base = rngRange(state.rng, ASTEROIDS.trAngle.min, ASTEROIDS.trAngle.max);
  const angle = deg(left ? 180 - base : base); // mirror: 125–145° becomes 35–55°
  const range = ASTEROIDS.speed[kind as 'asteroid_l' | 'asteroid_m' | 'asteroid_s'];
  const speed = rngRange(state.rng, range.min, range.max) * chapterScale(state.chapter).speed;
  const spin = rngRange(state.rng, -ASTEROIDS.spin, ASTEROIDS.spin);
  const e = spawnMember(state, g, kind, x, y, { type: 'drift', spin });
  if (e) {
    const v = fromAngle(angle, speed);
    e.vel.x = v.x;
    e.vel.y = v.y;
  }
}

export function updateAsteroids(state: GameState, g: GroupRuntime, s: AsteroidsSpec, _dt: number): void {
  while (g.spawned < g.total && g.t >= g.spawned / s.rate) spawnAsteroid(state, g, s, g.spawned);
  g.doneSpawning = g.spawned >= g.total && g.t >= s.duration;
}
