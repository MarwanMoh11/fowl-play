// tests/a2.helpers.ts — OWNER: A2. State and input factories for A2 tests (not a test file).
// Every a2 test file must start with the two vi.mock lines shown in a2.player.test.ts.
import type { Difficulty, Enemy, GameState, InputFrame, Projectile } from '../src/sim/types';
import { createGame, step, NEUTRAL_INPUT } from '../src/sim/game';
import { updateBoss } from '../src/sim/bosses';
import { newId } from '../src/sim/ids';
import { DT } from '../src/sim/tuning/core';
import { hooks } from './a2.fakeEnemies';

hooks.updateBoss = updateBoss;

export interface TestOpts { difficulty?: Difficulty; chapter?: number; god?: boolean; seed?: number }

/** A clean wave_active state with a vulnerable, living player and nothing else in the world. */
export function newState(o: TestOpts = {}): GameState {
  const s = createGame({
    seed: o.seed ?? 11, difficulty: o.difficulty ?? 'normal', startChapter: o.chapter ?? 1, startWave: 1,
    debug: { godMode: o.god ?? false },
  });
  s.enemies.length = 0;
  s.projectiles.length = 0;
  s.pickups.length = 0;
  s.hazards.length = 0;
  s.events.length = 0;
  s.banner = null;
  s.phase = 'wave_active';
  s.phaseTimer = 0;
  s.player.invulnTimer = 0;
  return s;
}

export function input(over: Partial<InputFrame> = {}): InputFrame {
  return { ...NEUTRAL_INPUT, ...over };
}

export function tick(s: GameState, inp: InputFrame = NEUTRAL_INPUT, n = 1): void {
  for (let i = 0; i < n; i++) step(s, inp, DT);
}

export function addEnemy(s: GameState, over: Partial<Enemy> = {}): Enemy {
  const e: Enemy = {
    id: newId(s), kind: 'chicken_basic', pos: { x: 640, y: 200 }, vel: { x: 0, y: 0 }, radius: 22,
    hp: 1, maxHp: 1, points: 100, eggRate: 0, alive: true, age: 0, hitFlash: 0, invulnerable: false,
    canDropEggs: false, carries: null, rotation: 0, anim: 0, isBoss: false, behavior: { type: 'none' }, shield: 0, maxShield: 0, skillTimer: 0, skillState: 0, parentId: -1, ...over,
  };
  s.enemies.push(e);
  return e;
}

export function boltsOf(s: GameState): Projectile[] {
  return s.projectiles.filter((p) => p.kind === 'bolt' && p.alive);
}

export function eventsOf<T extends string>(s: GameState, type: T): Extract<GameState['events'][number], { type: T }>[] {
  return s.events.filter((e) => e.type === type) as Extract<GameState['events'][number], { type: T }>[];
}

/** NaN / cap / range invariants (subset of A1's §10.3 helper). */
export function checkInvariants(s: GameState): string | null {
  const bad = (v: number): boolean => !Number.isFinite(v);
  for (const e of s.enemies) if (bad(e.pos.x) || bad(e.pos.y) || bad(e.vel.x) || bad(e.vel.y) || bad(e.hp)) return 'enemy NaN ' + e.kind;
  for (const p of s.projectiles) if (bad(p.pos.x) || bad(p.pos.y) || bad(p.vel.x) || bad(p.vel.y)) return 'projectile NaN ' + p.kind;
  for (const h of s.hazards) if (bad(h.a.x) || bad(h.a.y) || bad(h.b.x) || bad(h.b.y)) return 'hazard NaN';
  if (bad(s.player.pos.x) || bad(s.player.pos.y)) return 'player NaN';
  if (s.enemies.length > 400 || s.projectiles.length > 1500 || s.pickups.length > 300 || s.hazards.length > 50) return 'cap';
  if (s.player.power < 0 || s.player.power > 10 || s.player.heat < 0 || s.player.heat > 100) return 'player range';
  return null;
}
