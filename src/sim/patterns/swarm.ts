// src/sim/patterns/swarm.ts — OWNER: A3. `swarm`: chicks following a moving leader point, some go kamikaze (§7.11).
import type { Enemy, GameState } from '../types';
import type { GroupRuntime, SwarmSpec } from '../waves.types';
import { norm } from '../math';
import { rngInt, rngRange } from '../rng';
import { SWARM } from '../tuning/enemies';
import { spawnMember } from './common';

export function swarmPlanned(s: SwarmSpec): number {
  return s.count;
}

export function startSwarm(_state: GameState, g: GroupRuntime, s: SwarmSpec): void {
  g.total = s.count;
  g.data.kami = s.kamikazeInterval ?? SWARM.kamikazeInterval;
}

function spawnChick(state: GameState, g: GroupRuntime): void {
  const r = SWARM.offsetRadius * Math.sqrt(rngRange(state.rng, 0, 1));
  const a = rngRange(state.rng, 0, 2 * Math.PI);
  spawnMember(state, g, 'chick', rngRange(state.rng, SWARM.spawnMinX, SWARM.spawnMaxX), SWARM.spawnY, {
    type: 'swarm', offset: { x: Math.cos(a) * r, y: Math.sin(a) * r }, mode: 'follow', dir: { x: 0, y: 1 }, group: g.index,
  });
}

function launchKamikazes(state: GameState, g: GroupRuntime, s: SwarmSpec): void {
  const pool: Enemy[] = [];
  for (const e of state.enemies) {
    const b = e.behavior;
    if (e.alive && b.type === 'swarm' && b.group === g.index && b.mode === 'follow') pool.push(e);
  }
  const fraction = s.kamikazeFraction ?? SWARM.kamikazeFraction;
  const n = Math.min(pool.length, Math.ceil(pool.length * fraction));
  const pl = state.player;
  for (let i = 0; i < n; i++) {
    const k = rngInt(state.rng, 0, pool.length - 1);
    const e = pool[k];
    pool[k] = pool[pool.length - 1];
    pool.pop();
    if (e.behavior.type !== 'swarm') continue;
    const d = pl.alive ? norm({ x: pl.pos.x - e.pos.x, y: pl.pos.y - e.pos.y }) : { x: 0, y: 1 };
    e.behavior.mode = 'kamikaze';
    e.behavior.dir = d.x === 0 && d.y === 0 ? { x: 0, y: 1 } : d;
  }
}

export function updateSwarmGroup(state: GameState, g: GroupRuntime, s: SwarmSpec, dt: number): void {
  while (g.spawned < s.count && g.t >= g.spawned * SWARM.spawnGap) spawnChick(state, g);
  g.doneSpawning = g.spawned >= s.count;
  g.data.kami -= dt;
  if (g.data.kami <= 0) {
    g.data.kami += s.kamikazeInterval ?? SWARM.kamikazeInterval;
    launchKamikazes(state, g, s);
  }
}
