// tests/a3.carry.test.ts — OWNER: A3. Carry plan (§7.8): 1 power core per wave, +1 gift on waves 3/6/9.
import { describe, expect, it } from 'vitest';
import { compact, createGame } from '../src/sim/game';
import { damageEnemy } from '../src/sim/combat';
import { updateEnemies } from '../src/sim/enemies';
import { patternPlanned } from '../src/sim/patterns';
import { updateWaveSpawner } from '../src/sim/waves';
import { waveDef } from '../src/sim/chapters';
import { DT } from '../src/sim/tuning/core';
import type { Enemy, GameState, PickupKind } from '../src/sim/types';

function makeState(chapter: number, wave: number, seed = 5): GameState {
  const s = createGame({ seed, difficulty: 'normal', startChapter: chapter, startWave: wave, debug: { godMode: true } });
  s.player.invulnTimer = 0;
  return s;
}

const NON_BOSS: [number, number][] = [];
for (let c = 1; c <= 13; c++) for (let w = 1; w <= 9; w++) if (c <= 5 || c >= 13 || w !== 5) NON_BOSS.push([c, w]); // 6–12: wave 5 is a mini-boss

describe('carry plan', () => {
  it.each(NON_BOSS)('chapter %i wave %i plans exactly one core (+ one gift on waves 3/6/9)', (c, w) => {
    const s = makeState(c, w);
    const plan = s.waveRt.carryPlan;
    const planned = waveDef(c, w).groups.reduce((sum, g) => sum + patternPlanned(g), 0);
    const cores = plan.filter((p) => p.kind === 'power_core');
    const gifts = plan.filter((p) => p.kind.startsWith('gift_'));
    expect(cores).toHaveLength(1);
    expect(gifts).toHaveLength([3, 6, 9].includes(w) ? 1 : 0);
    expect(plan).toHaveLength(cores.length + gifts.length);
    expect(new Set(plan.map((p) => p.spawnIndex)).size).toBe(plan.length);
    for (const p of plan) {
      expect(p.spawnIndex).toBeGreaterThanOrEqual(0);
      expect(p.spawnIndex).toBeLessThan(Math.floor(0.8 * planned));
    }
  });

  it.each([[1, 1], [1, 3], [2, 6], [3, 9], [4, 2], [5, 7]])('chapter %i wave %i: spawned enemies carry exactly the plan', (c, w) => {
    const s = makeState(c, w);
    const carried: PickupKind[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < 60 * 45; i++) {
      updateWaveSpawner(s, DT);
      updateEnemies(s, DT);
      for (const e of s.enemies) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        if (e.carries) carried.push(e.carries);
      }
      compact(s);
    }
    expect(carried.slice().sort()).toEqual(s.waveRt.carryPlan.map((p) => p.kind).sort());
  });

  it('boss waves have no carry plan', () => {
    for (let c = 1; c <= 5; c++) expect(makeState(c, 10).waveRt.carryPlan).toEqual([]);
  });

  it('is deterministic per seed and differs across seeds', () => {
    const a = makeState(1, 3, 99).waveRt.carryPlan;
    const b = makeState(1, 3, 99).waveRt.carryPlan;
    expect(a).toEqual(b);
    const others = [1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(makeState(1, 3, seed).waveRt.carryPlan));
    expect(new Set(others).size).toBeGreaterThan(1);
  });

  it('killing the carrier drops the carried pickup', () => {
    const s = makeState(1, 1, 8);
    let carrier: Enemy | undefined;
    for (let i = 0; i < 60 * 3 && !carrier; i++) {
      updateWaveSpawner(s, DT);
      updateEnemies(s, DT);
      carrier = s.enemies.find((e) => e.carries !== null);
    }
    expect(carrier).toBeDefined();
    const kind = carrier!.carries!;
    damageEnemy(s, carrier!, 999, 'bolt');
    expect(s.pickups.some((p) => p.kind === kind)).toBe(true);
  });

  it('asteroid children never take carry slots', () => {
    const s = makeState(1, 4);
    for (let i = 0; i < 60 * 3; i++) {
      updateWaveSpawner(s, DT);
      updateEnemies(s, DT);
    }
    const before = s.waveRt.spawnCounter;
    const big = s.enemies.find((e) => e.kind === 'asteroid_l' || e.kind === 'asteroid_m');
    if (big) damageEnemy(s, big, 99, 'bolt');
    expect(s.waveRt.spawnCounter).toBe(before);
    expect(s.enemies.filter((e) => e.carries !== null).length).toBeLessThanOrEqual(1);
  });
});
