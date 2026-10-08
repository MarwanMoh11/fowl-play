// tests/a1.combat.test.ts — OWNER: A1
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/sim/bosses', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/sim/bosses')>()),
  onBossDamaged: vi.fn(),
  onBossKilled: vi.fn(),
}));
vi.mock('../src/sim/enemies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/sim/enemies')>()),
  onEnemyKilled: vi.fn(),
}));

import { createGame } from '../src/sim/game';
import { damageEnemy } from '../src/sim/combat';
import { onBossDamaged, onBossKilled } from '../src/sim/bosses';
import { onEnemyKilled } from '../src/sim/enemies';
import { addEnemy, clearWorld } from './a1.helpers';

const game = () => clearWorld(createGame({ seed: 5, difficulty: 'normal' }));

beforeEach(() => vi.clearAllMocks());

describe('combat', () => {
  it('invulnerable or dead enemies take no damage', () => {
    const s = game();
    const e = addEnemy(s, { hp: 3, invulnerable: true });
    expect(damageEnemy(s, e, 5, 'bolt')).toBe(false);
    expect(e.hp).toBe(3);
    expect(s.events).toEqual([]);
  });

  it('a hit flashes and emits enemy_hit without killing', () => {
    const s = game();
    const e = addEnemy(s, { hp: 3 });
    expect(damageEnemy(s, e, 1, 'bolt')).toBe(false);
    expect(e.hp).toBe(2);
    expect(e.hitFlash).toBeGreaterThan(0);
    expect(s.events).toEqual([{ type: 'enemy_hit', id: e.id, kind: e.kind, x: 640, y: 200, dmg: 1 }]);
  });

  it('a kill emits events, awards points without popup, counts stats, drops food and calls A3', () => {
    const s = game();
    const e = addEnemy(s, { hp: 1, points: 100 });
    expect(damageEnemy(s, e, 1, 'missile')).toBe(true);
    expect(e.alive).toBe(false);
    expect(s.events).toContainEqual({ type: 'enemy_killed', id: e.id, kind: e.kind, x: 640, y: 200, byMissile: true });
    expect(s.events.some((ev) => ev.type === 'score_popup')).toBe(false);
    expect(s.score).toBe(100);
    expect(s.chapterStats.kills).toBe(1);
    expect(s.runStats.kills).toBe(1);
    expect(s.pickups.some((p) => p.kind === 'drumstick')).toBe(true);
    expect(onEnemyKilled).toHaveBeenCalledWith(s, e, true);
    expect(onBossKilled).not.toHaveBeenCalled();
  });

  it('bosses get the damaged/killed callbacks and a score popup', () => {
    const s = game();
    const b = addEnemy(s, { kind: 'boss_hen', isBoss: true, hp: 10, maxHp: 10, points: 10_000 });
    damageEnemy(s, b, 4, 'bolt');
    expect(onBossDamaged).toHaveBeenCalledTimes(1);
    damageEnemy(s, b, 6, 'bolt');
    expect(onBossDamaged).toHaveBeenCalledTimes(2);
    expect(onBossKilled).toHaveBeenCalledWith(s, b);
    expect(onEnemyKilled).not.toHaveBeenCalled();
    expect(s.events).toContainEqual({ type: 'score_popup', amount: 10_000, x: 640, y: 200 });
  });
});
