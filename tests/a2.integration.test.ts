// tests/a2.integration.test.ts — OWNER: A2. Boss waves with the REAL enemies/waves modules (no mocks).
import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/sim/types';
import { createGame, step, NEUTRAL_INPUT } from '../src/sim/game';
import { applyDebug } from '../src/sim/debug';
import { damageEnemy } from '../src/sim/combat';
import { DT } from '../src/sim/tuning/core';
import { BOSS_INFO } from '../src/shared/contracts';
import { checkInvariants } from './a2.helpers';

const BOSS_BY_CHAPTER = ['hen', 'carrier', 'rooster', 'twin_hens', 'dreadnought'] as const;

function run(s: GameState, ticks: number, fire = false): void {
  for (let i = 0; i < ticks; i++) {
    step(s, { ...NEUTRAL_INPUT, fire, pointer: { x: 640 + 450 * Math.sin(s.tick / 60), y: 580 } }, DT);
    const bad = checkInvariants(s);
    if (bad) throw new Error(`tick ${s.tick}: ${bad}`);
  }
}

describe('boss waves with the real wave spawner and enemy updater', () => {
  it.each(BOSS_BY_CHAPTER.map((id, i) => [i + 1, id] as const))('chapter %i boss (%s): spawns, fights, dies, wave clears', (chapter, id) => {
    const s = createGame({ seed: 5, difficulty: 'normal', startChapter: chapter, startWave: 10, debug: { godMode: true } });
    run(s, 2);
    const bosses = s.enemies.filter((e) => e.isBoss);
    expect(bosses).toHaveLength(id === 'twin_hens' ? 2 : 1);
    expect(s.bossName).toBe(BOSS_INFO[id].name);
    expect(s.phase).toBe('boss_intro');
    expect(bosses.every((b) => b.invulnerable)).toBe(true);
    run(s, 60 * 45, true);                       // 45 s of fighting (boss is worn down by the pulse gun)
    expect(s.enemies.some((e) => e.isBoss && e.alive) || s.phase !== 'wave_active').toBe(true);
    applyDebug(s, 'killAll');
    for (let i = 0; i < 60 * 8 && s.phase === 'wave_active'; i++) run(s, 1);
    expect(['wave_clear', 'chapter_complete']).toContain(s.phase);
    expect(s.enemies.filter((e) => e.alive && e.isBoss)).toHaveLength(0);
    expect(s.projectiles.filter((p) => p.alive && p.owner === 'enemy')).toHaveLength(0);
  });
});

describe('boss minions use A3 behaviors', () => {
  it.each([
    [1, 'chick', 'seek', 0.45],
    [2, 'chicken_basic', 'stream', 1],
    [3, 'chicken_ufo', 'lane', 0.35],
  ] as const)('chapter %i: %s with %s behavior appear, move, and vanish with the last boss', (chapter, kind, behavior, frac) => {
    const s = createGame({ seed: 9, difficulty: 'normal', startChapter: chapter, startWave: 10, debug: { godMode: true } });
    run(s, 60 * 4);
    const boss = s.enemies.find((e) => e.isBoss);
    if (!boss) throw new Error('no boss');
    if (frac < 1) damageEnemy(s, boss, boss.hp - Math.floor(boss.maxHp * frac), 'bolt');
    let seen = 0;
    let moved = false;
    for (let i = 0; i < 60 * 40; i++) {
      run(s, 1);
      const list = s.enemies.filter((e) => e.alive && e.kind === kind && e.behavior.type === behavior);
      seen = Math.max(seen, list.length);
      if (list.some((e) => Math.hypot(e.vel.x, e.vel.y) > 100)) moved = true;
    }
    expect(seen, `${kind}/${behavior}`).toBeGreaterThan(0);
    expect(moved).toBe(true);
    for (const e of s.enemies) if (e.isBoss && e.alive) damageEnemy(s, e, 99999, 'debug');
    expect(s.enemies.filter((e) => e.alive && e.behavior.type === behavior && !e.isBoss)).toHaveLength(0);
  });
});
