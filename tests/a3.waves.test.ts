// tests/a3.waves.test.ts — OWNER: A3. Wave spawner: groups, delays, boss waves, completion (§7.11, §7.12).
import { describe, expect, it, vi } from 'vitest';

const spawnBossMock = vi.hoisted(() => vi.fn());
vi.mock('../src/sim/bosses', () => ({
  spawnBoss: spawnBossMock,
  updateBoss: vi.fn(),
  onBossDamaged: vi.fn(),
  onBossKilled: vi.fn(),
}));

import { createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { applyDebug } from '../src/sim/debug';
import { damageEnemy } from '../src/sim/combat';
import { isWaveComplete, startWave, updateWaveSpawner, waveInfo } from '../src/sim/waves';
import { DT } from '../src/sim/tuning/core';
import type { Enemy, EnemyKind, GameState } from '../src/sim/types';
import type { BossId } from '../src/sim/bosses.types';

const KIND_BY_BOSS: Record<BossId, EnemyKind> = {
  hen: 'boss_hen', carrier: 'boss_carrier', rooster: 'boss_rooster', twin_hens: 'boss_hen', dreadnought: 'boss_dreadnought',
};

spawnBossMock.mockImplementation((state: GameState, id: BossId) => {
  const e: Enemy = {
    id: state.nextId++, kind: KIND_BY_BOSS[id], pos: { x: 640, y: 170 }, vel: { x: 0, y: 0 }, radius: 95, hp: 50, maxHp: 50,
    points: 10000, eggRate: 0, alive: true, age: 0, hitFlash: 0, invulnerable: false, canDropEggs: false, carries: null,
    rotation: 0, anim: 0, isBoss: true, behavior: { type: 'none' },
  };
  state.enemies.push(e);
  state.bossName = 'TEST BOSS';
});

function make(chapter: number, wave: number): GameState {
  const s = createGame({ seed: 21, difficulty: 'normal', startChapter: chapter, startWave: wave, debug: { godMode: true } });
  s.player.invulnTimer = 0;
  return s;
}

describe('boss waves', () => {
  it.each([[1, 'hen'], [2, 'carrier'], [3, 'rooster'], [4, 'twin_hens'], [5, 'dreadnought'], [6, 'hen'], [9, 'twin_hens']])(
    'chapter %i wave 10 calls spawnBoss(%s) exactly once from startWave',
    (c, id) => {
      spawnBossMock.mockClear();
      const s = make(c, 10);
      expect(spawnBossMock).toHaveBeenCalledTimes(1);
      expect(spawnBossMock.mock.calls[0][1]).toBe(id);
      expect(s.bossName).toBe('TEST BOSS');
      for (let i = 0; i < 120; i++) updateWaveSpawner(s, DT);
      expect(spawnBossMock).toHaveBeenCalledTimes(1);
    },
  );

  it('completes once the boss is dead, not before', () => {
    const s = make(1, 10);
    expect(isWaveComplete(s)).toBe(false);
    updateWaveSpawner(s, DT);
    expect(isWaveComplete(s)).toBe(false);
    damageEnemy(s, s.enemies[0], 999, 'bolt');
    expect(isWaveComplete(s)).toBe(true);
  });

  it('twin hens: the wave waits for every boss', () => {
    spawnBossMock.mockImplementationOnce((state: GameState) => {
      for (let i = 0; i < 2; i++) {
        state.enemies.push({
          id: state.nextId++, kind: 'boss_hen', pos: { x: 400 + i * 480, y: 170 }, vel: { x: 0, y: 0 }, radius: 95, hp: 5, maxHp: 5,
          points: 8000, eggRate: 0, alive: true, age: 0, hitFlash: 0, invulnerable: false, canDropEggs: false, carries: null,
          rotation: 0, anim: 0, isBoss: true, behavior: { type: 'none' },
        });
      }
    });
    const s = make(4, 10);
    expect(s.enemies).toHaveLength(2);
    damageEnemy(s, s.enemies[0], 99, 'bolt');
    expect(isWaveComplete(s)).toBe(false);
    damageEnemy(s, s.enemies[1], 99, 'bolt');
    expect(isWaveComplete(s)).toBe(true);
  });
});

describe('group delays', () => {
  it('"delay +N" groups start N seconds after the first group (0.8 s)', () => {
    const s = make(2, 5); // ufo ; stream +2.0
    const starts: number[] = [-1, -1];
    for (let i = 0; i < 60 * 4; i++) {
      updateWaveSpawner(s, DT);
      s.waveRt.groups.forEach((g, k) => {
        if (g.started && starts[k] < 0) starts[k] = s.waveRt.elapsed;
      });
    }
    expect(starts[0]).toBeCloseTo(0.8, 1);
    expect(starts[1]).toBeCloseTo(2.8, 1);
  });

  it('isWaveComplete is false until every group started and finished spawning', () => {
    const s = make(5, 3); // swarm 70 ; ufo 2 delay +3
    expect(isWaveComplete(s)).toBe(false);
    s.enemies.length = 0;
    for (let i = 0; i < 60 * 2; i++) updateWaveSpawner(s, DT);
    s.enemies.length = 0;
    expect(isWaveComplete(s)).toBe(false); // second group has not started
  });

  it('startWave resets the runtime', () => {
    const s = make(1, 1);
    for (let i = 0; i < 100; i++) updateWaveSpawner(s, DT);
    startWave(s);
    expect(s.waveRt.elapsed).toBe(0);
    expect(s.waveRt.groups.every((g) => !g.started)).toBe(true);
    expect(s.waveRt.spawnCounter).toBe(0);
  });
});

describe('waveInfo', () => {
  it('reports names and boss ids', () => {
    expect(waveInfo(1, 1)).toEqual({ chapterName: 'Low Orbit', waveName: 'First Contact', isBoss: false, boss: null });
    expect(waveInfo(4, 10)).toEqual({ chapterName: 'Ice Moons', waveName: 'BOSS', isBoss: true, boss: 'twin_hens' });
  });
});

describe('all tables (chapters 1-6 × waves 1-10), killAll every tick', () => {
  const cases: [number, number][] = [];
  for (let c = 1; c <= 6; c++) for (let w = 1; w <= 10; w++) cases.push([c, w]);

  it.each(cases)('chapter %i wave %i spawns an enemy within 600 ticks and clears within 60 s', (c, w) => {
    const s = make(c, w);
    let sawEnemy = s.enemies.length > 0;
    for (let i = 0; i < 600 && !sawEnemy; i++) {
      step(s, NEUTRAL_INPUT, DT);
      sawEnemy = s.enemies.length > 0;
    }
    expect(sawEnemy).toBe(true);
    let ticks = 0;
    while ((s.phase === 'wave_intro' || s.phase === 'boss_intro' || s.phase === 'wave_active') && ticks < 60 * 60) {
      applyDebug(s, 'killAll');
      step(s, NEUTRAL_INPUT, DT);
      ticks++;
    }
    expect(s.phase).toBe('wave_clear');
    expect(ticks).toBeLessThan(60 * 60);
  });
});
