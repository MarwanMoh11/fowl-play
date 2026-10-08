// tests/a1.alltables.test.ts — OWNER: A1. Every wave of chapters 1–6 is spawnable and clearable (§10.3).
import { describe, expect, it } from 'vitest';
import { createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { applyDebug } from '../src/sim/debug';
import { waveInfo } from '../src/sim/waves';
import type { InputFrame } from '../src/sim/types';
import { FINAL_CHAPTER, DT } from '../src/sim/tuning/core';
import { checkInvariants } from './a1.invariants';

const SPAWN_WITHIN_TICKS = 600;
const CLEAR_WITHIN_TICKS = 60 * 60;

function checkWave(chapter: number, wave: number): void {
  const s = createGame({ seed: 100 * chapter + wave, difficulty: 'normal', startChapter: chapter, startWave: wave, debug: { godMode: true } });
  const where = `c${chapter}w${wave}`;
  const info = waveInfo(chapter, wave);
  let t = 0;
  for (; t < SPAWN_WITHIN_TICKS; t++) {
    step(s, NEUTRAL_INPUT, DT);
    if (info.isBoss && t === 0) {
      expect(s.bossName, `${where} bossName`).not.toBeNull();
      expect(s.enemies.some((e) => e.isBoss), `${where} boss exists`).toBe(true);
    }
    if (s.enemies.length > 0) break;
  }
  expect(s.enemies.length, `${where} spawns an enemy within ${SPAWN_WITHIN_TICKS} ticks`).toBeGreaterThan(0);

  let left = false;
  for (let i = 0; i < CLEAR_WITHIN_TICKS + 300; i++) {
    applyDebug(s, 'killAll');
    step(s, NEUTRAL_INPUT, DT);
    const bad = checkInvariants(s);
    if (bad.length) throw new Error(`${where} tick ${s.tick}: ${bad.join(', ')}`);
    if (s.phase !== 'wave_intro' && s.phase !== 'boss_intro' && s.phase !== 'wave_active') {
      left = true;
      expect(i, `${where} cleared within 60 s`).toBeLessThanOrEqual(CLEAR_WITHIN_TICKS);
      break;
    }
  }
  expect(left, `${where} leaves wave_active`).toBe(true);
}

describe('all tables', () => {
  for (let chapter = 1; chapter <= 6; chapter++) {
    it(`chapter ${chapter}: every wave spawns and clears`, () => {
      for (let wave = 1; wave <= 10; wave++) checkWave(chapter, wave);
    }, 60_000);
  }

  it('a killAll run from chapter 1 wave 1 reaches victory exactly once', () => {
    const s = createGame({ seed: 77, difficulty: 'normal', debug: { godMode: true } });
    const skip: InputFrame = { ...NEUTRAL_INPUT, skip: true };
    let victories = 0;
    for (let t = 0; t < 60 * 60 * 60 && s.phase !== 'victory'; t++) {
      applyDebug(s, 'killAll');
      step(s, skip, DT);
      victories += s.events.filter((e) => e.type === 'victory').length;
    }
    expect(s.phase).toBe('victory');
    expect(s.chapter).toBe(FINAL_CHAPTER);
    for (let t = 0; t < 600; t++) {
      step(s, skip, DT);
      victories += s.events.filter((e) => e.type === 'victory').length;
    }
    expect(victories).toBe(1);
  }, 120_000);
});
