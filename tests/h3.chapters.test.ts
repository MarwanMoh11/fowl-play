// tests/h3.chapters.test.ts — OWNER: H3. Every wave of chapters 6–12 (and sectors 1, 7 of onslaught) spawns and clears.
import { describe, expect, it } from 'vitest';
import { createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { applyDebug } from '../src/sim/debug';
import { DT } from '../src/sim/tuning/core';
import type { GameMode } from '../src/sim/types';
import { checkInvariants } from './a1.invariants';

const SPAWN_WITHIN_TICKS = 600;
const CLEAR_WITHIN_TICKS = 60 * 60;

/** Plays one wave with godMode, killing everything each tick, and checks it spawns then leaves wave_active. */
function checkWave(where: string, mode: GameMode, chapter: number, wave: number): void {
  const s = createGame({
    seed: 100 * chapter + wave, difficulty: 'normal', mode, startChapter: chapter, startWave: wave,
    debug: { godMode: true },
  });
  let spawned = false;
  for (let t = 0; t < SPAWN_WITHIN_TICKS && !spawned; t++) {
    step(s, NEUTRAL_INPUT, DT);
    spawned = s.enemies.length > 0;
  }
  expect(spawned, `${where} spawns`).toBe(true);
  let left = false;
  for (let i = 0; i < CLEAR_WITHIN_TICKS + 300 && !left; i++) {
    applyDebug(s, 'killAll');
    step(s, NEUTRAL_INPUT, DT);
    const bad = checkInvariants(s);
    if (bad.length) throw new Error(`${where} tick ${s.tick}: ${bad.join(', ')}`);
    left = s.phase !== 'wave_intro' && s.phase !== 'boss_intro' && s.phase !== 'wave_active';
  }
  expect(left, `${where} clears`).toBe(true);
}

describe('chapters 6–12', () => {
  for (let chapter = 6; chapter <= 12; chapter++) {
    it(`chapter ${chapter}: every wave spawns and clears`, () => {
      for (let wave = 1; wave <= 10; wave++) checkWave(`c${chapter}w${wave}`, 'campaign', chapter, wave);
    }, 180_000);
  }
});

describe('onslaught integration', () => {
  for (const sector of [1, 7]) {
    it(`sector ${sector}: every generated wave spawns and clears`, () => {
      for (let wave = 1; wave <= 10; wave++) checkWave(`s${sector}w${wave}`, 'onslaught', sector, wave);
    }, 180_000);
  }
});
