// tests/a1.collisions.test.ts — OWNER: A1
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../src/sim/types';

vi.mock('../src/sim/player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/sim/player')>()),
  killPlayer: vi.fn((s: GameState) => {
    s.player.alive = false;
  }),
}));

import { createGame } from '../src/sim/game';
import { resolveCollisions } from '../src/sim/collisions';
import { killPlayer } from '../src/sim/player';
import { spawnPickup } from '../src/sim/pickups';
import { addEnemy, addHazard, addProjectile, clearWorld } from './a1.helpers';

const game = () => {
  const s = clearWorld(createGame({ seed: 9, difficulty: 'normal' }));
  s.player.pos = { x: 640, y: 600 };
  return s;
};

beforeEach(() => vi.clearAllMocks());

describe('collisions', () => {
  it('a piercing bolt hits each enemy once and dies when pierce runs out', () => {
    const s = game();
    const a = addEnemy(s, { pos: { x: 640, y: 200 }, hp: 5 });
    const b = addEnemy(s, { pos: { x: 645, y: 205 }, hp: 5 });
    const c = addEnemy(s, { pos: { x: 650, y: 200 }, hp: 5 });
    const bolt = addProjectile(s, { pos: { x: 645, y: 200 }, damage: 2, pierceLeft: 2 });
    resolveCollisions(s);
    expect([a.hp, b.hp, c.hp]).toEqual([3, 3, 5]);
    expect(bolt.hitIds).toEqual([a.id, b.id]);
    expect(bolt.alive).toBe(false);
    expect(s.chapterStats.shotsHit).toBe(1);
    expect(s.runStats.shotsHit).toBe(1);

    const bolt2 = addProjectile(s, { pos: { x: 645, y: 200 }, damage: 1, pierceLeft: 5, hitIds: [a.id] });
    resolveCollisions(s);
    expect([a.hp, b.hp, c.hp]).toEqual([3, 2, 4]);
    expect(bolt2.alive).toBe(true);
    expect(s.chapterStats.shotsHit).toBe(1); // bolt2 already had a hit recorded
  });

  it('an invulnerable enemy absorbs the bolt without damage', () => {
    const s = game();
    const e = addEnemy(s, { hp: 5, invulnerable: true });
    const bolt = addProjectile(s, { pos: { ...e.pos }, pierceLeft: 3 });
    resolveCollisions(s);
    expect(e.hp).toBe(5);
    expect(bolt.alive).toBe(false);
    expect(s.chapterStats.shotsHit).toBe(0);
  });

  it('enemy projectiles kill a vulnerable player and die', () => {
    const s = game();
    const egg = addProjectile(s, { kind: 'egg', owner: 'enemy', weapon: null, pos: { x: 640, y: 590 }, radius: 8 });
    resolveCollisions(s);
    expect(killPlayer).toHaveBeenCalledTimes(1);
    expect(egg.alive).toBe(false);
  });

  it('invulnerable or god-mode players are not hit', () => {
    const s = game();
    s.player.invulnTimer = 1;
    const egg = addProjectile(s, { kind: 'egg', owner: 'enemy', weapon: null, pos: { x: 640, y: 600 } });
    resolveCollisions(s);
    s.player.invulnTimer = 0;
    s.debug.godMode = true;
    resolveCollisions(s);
    expect(killPlayer).not.toHaveBeenCalled();
    expect(egg.alive).toBe(true);
  });

  it('contact kills the player and deals 10 damage to non-boss enemies only', () => {
    const s = game();
    const e = addEnemy(s, { pos: { x: 660, y: 600 }, hp: 12 });
    resolveCollisions(s);
    expect(killPlayer).toHaveBeenCalledTimes(1);
    expect(e.hp).toBe(2);

    const s2 = game();
    const boss = addEnemy(s2, { pos: { x: 640, y: 560 }, radius: 95, hp: 900, isBoss: true });
    resolveCollisions(s2);
    expect(killPlayer).toHaveBeenCalledTimes(2);
    expect(boss.hp).toBe(900);
  });

  it('contact uses 85% of the summed radii', () => {
    const s = game();
    addEnemy(s, { pos: { x: 640 + (22 + 14) * 0.9, y: 600 } });
    resolveCollisions(s);
    expect(killPlayer).not.toHaveBeenCalled();
  });

  it('lethal hazards kill, telegraphs do not', () => {
    const s = game();
    addHazard(s, { kind: 'telegraph', lethal: false });
    resolveCollisions(s);
    expect(killPlayer).not.toHaveBeenCalled();
    addHazard(s, { a: { x: 600, y: 0 }, b: { x: 600, y: 720 }, width: 60 });
    resolveCollisions(s);
    expect(killPlayer).toHaveBeenCalledTimes(1);
  });

  it('a living player collects pickups within pickupRadius', () => {
    const s = game();
    const near = spawnPickup(s, 'drumstick', 640 + 36 + 10, 600)!;
    const far = spawnPickup(s, 'drumstick', 640 + 36 + 16, 600)!;
    resolveCollisions(s);
    expect(near.alive).toBe(false);
    expect(far.alive).toBe(true);
    s.player.alive = false;
    far.pos.x = 640;
    resolveCollisions(s);
    expect(far.alive).toBe(true);
  });
});
