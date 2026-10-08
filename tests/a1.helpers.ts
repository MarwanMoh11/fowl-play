// tests/a1.helpers.ts — OWNER: A1. Entity factories for A1 tests (not a test file).
import type { Enemy, EnemyKind, GameState, Hazard, Projectile } from '../src/sim/types';
import { newId } from '../src/sim/ids';

export function addEnemy(state: GameState, over: Partial<Enemy> = {}): Enemy {
  const kind: EnemyKind = over.kind ?? 'chicken_basic';
  const e: Enemy = {
    id: newId(state), kind, pos: { x: 640, y: 200 }, vel: { x: 0, y: 0 }, radius: 22,
    hp: 1, maxHp: 1, points: 100, eggRate: 0, alive: true, age: 0, hitFlash: 0,
    invulnerable: false, canDropEggs: false, carries: null, rotation: 0, anim: 0,
    isBoss: false, behavior: { type: 'none' }, ...over,
  };
  state.enemies.push(e);
  return e;
}

export function addProjectile(state: GameState, over: Partial<Projectile> = {}): Projectile {
  const p: Projectile = {
    id: newId(state), kind: 'bolt', owner: 'player', weapon: 'pulse', pos: { x: 640, y: 200 },
    vel: { x: 0, y: 0 }, accel: { x: 0, y: 0 }, maxSpeed: 0, radius: 6, damage: 1, pierceLeft: 1,
    hitIds: [], ttl: 5, alive: true, rotation: 0, ...over,
  };
  state.projectiles.push(p);
  return p;
}

export function addHazard(state: GameState, over: Partial<Hazard> = {}): Hazard {
  const h: Hazard = {
    id: newId(state), kind: 'beam', a: { x: 640, y: 0 }, b: { x: 640, y: 720 }, width: 40,
    ttl: 1, lethal: true, alive: true, ownerId: -1, ...over,
  };
  state.hazards.push(h);
  return h;
}

/** Removes everything createGame/startWave may have spawned and makes the player vulnerable. */
export function clearWorld(state: GameState): GameState {
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.pickups.length = 0;
  state.hazards.length = 0;
  state.events.length = 0;
  state.player.invulnTimer = 0;
  return state;
}
