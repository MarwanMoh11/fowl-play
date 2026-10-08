// tests/a1.pickups.test.ts — OWNER: A1
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/sim/weapons', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/sim/weapons')>()),
  addPower: vi.fn(),
  applyWeaponGift: vi.fn(),
}));

import { createGame } from '../src/sim/game';
import { collectPickup, spawnDropsForEnemy, spawnPickup, updatePickups } from '../src/sim/pickups';
import { addPower, applyWeaponGift } from '../src/sim/weapons';
import { DT, MAX_PICKUPS } from '../src/sim/tuning/core';
import { addEnemy, clearWorld } from './a1.helpers';

const game = () => clearWorld(createGame({ seed: 3, difficulty: 'normal' }));

beforeEach(() => vi.clearAllMocks());

describe('pickups', () => {
  it('converts every 100 food into a missile, including a roast crossing the threshold', () => {
    const s = game();
    s.player.food = 95;
    const missiles = s.player.missiles;
    collectPickup(s, spawnPickup(s, 'roast', 0, 0)!);
    expect(s.player.food).toBe(5);
    expect(s.player.missiles).toBe(missiles + 1);
    expect(s.events).toContainEqual({ type: 'missile_gained', missiles: missiles + 1 });
    expect(s.chapterStats.foodCollected).toBe(10);
    expect(s.runStats.foodCollected).toBe(10);
    expect(s.score).toBe(1000);
  });

  it('drumstick gives 1 food and 100 points with a popup', () => {
    const s = game();
    const p = spawnPickup(s, 'drumstick', 50, 60)!;
    collectPickup(s, p);
    expect(p.alive).toBe(false);
    expect(s.player.food).toBe(1);
    expect(s.score).toBe(100);
    expect(s.events).toContainEqual({ type: 'pickup_collected', kind: 'drumstick', x: 50, y: 60 });
    expect(s.events).toContainEqual({ type: 'score_popup', amount: 100, x: 50, y: 60 });
  });

  it('food can grant an extra life at 100k', () => {
    const s = game();
    s.score = 99_950;
    const lives = s.player.lives;
    collectPickup(s, spawnPickup(s, 'drumstick', 0, 0)!);
    expect(s.player.lives).toBe(lives + 1);
  });

  it('power cores and gifts delegate to A2', () => {
    const s = game();
    collectPickup(s, spawnPickup(s, 'power_core', 0, 0)!);
    collectPickup(s, spawnPickup(s, 'gift_laser', 0, 0)!);
    expect(addPower).toHaveBeenCalledWith(s, 1);
    expect(applyWeaponGift).toHaveBeenCalledWith(s, 'laser');
  });

  it('respects the pickup cap', () => {
    const s = game();
    for (let i = 0; i < MAX_PICKUPS; i++) spawnPickup(s, 'drumstick', 0, 0);
    expect(spawnPickup(s, 'drumstick', 0, 0)).toBeNull();
  });

  it('food pops up then falls and is removed below the screen; sway stays within its amplitude', () => {
    const s = game();
    const food = spawnPickup(s, 'drumstick', 640, 300)!;
    const core = spawnPickup(s, 'power_core', 640, 0)!;
    expect(food.vel.y).toBe(-140);
    let minX = 640, maxX = 640;
    for (let i = 0; i < 600 && food.alive; i++) {
      updatePickups(s, DT);
      if (core.alive) {
        minX = Math.min(minX, core.pos.x);
        maxX = Math.max(maxX, core.pos.x);
      }
      expect(food.vel.y).toBeLessThanOrEqual(300);
    }
    expect(food.alive).toBe(false);
    expect(minX).toBeGreaterThanOrEqual(640 - 20.5);
    expect(maxX).toBeLessThanOrEqual(640 + 20.5);
  });

  it('enemy drops: food per table plus the carried item', () => {
    const s = game();
    spawnDropsForEnemy(s, addEnemy(s, { kind: 'chicken_armored', carries: 'gift_arc' }));
    expect(s.pickups.map((p) => p.kind)).toEqual(['roast', 'gift_arc']);
  });

  it('boss drops: 12 roasts, 2 cores and a gift for a different weapon', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = clearWorld(createGame({ seed, difficulty: 'normal' }));
      s.player.weapon = 'neutron';
      spawnDropsForEnemy(s, addEnemy(s, { kind: 'boss_hen', isBoss: true }));
      const kinds = s.pickups.map((p) => p.kind);
      expect(kinds.filter((k) => k === 'roast')).toHaveLength(12);
      expect(kinds.filter((k) => k === 'power_core')).toHaveLength(2);
      const gifts = kinds.filter((k) => k.startsWith('gift_'));
      expect(gifts).toHaveLength(1);
      expect(gifts[0]).not.toBe('gift_neutron');
    }
  });
});
