// tests/a1.phase.test.ts — OWNER: A1. Phase machine transitions (§7.10) with the wave spawner mocked out.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, InputFrame } from '../src/sim/types';

const ctl = vi.hoisted(() => ({ complete: false }));
vi.mock('../src/sim/waves', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/sim/waves')>()),
  startWave: vi.fn(),
  updateWaveSpawner: vi.fn(),
  isWaveComplete: vi.fn(() => ctl.complete),
}));

import { canFire, continueEndless, createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { waveInfo } from '../src/sim/waves';
import { DT } from '../src/sim/tuning/core';
import type { GameEvent } from '../src/sim/events';

const SKIP: InputFrame = { ...NEUTRAL_INPUT, skip: true };

function ticksFor(seconds: number): number {
  return Math.round(seconds / DT);
}

/** Steps until pred holds; returns the tick count and every event seen. */
function runUntil(s: GameState, pred: (s: GameState) => boolean, max: number, input: InputFrame = NEUTRAL_INPUT) {
  const events: GameEvent[] = [];
  for (let i = 1; i <= max; i++) {
    step(s, input, DT);
    events.push(...s.events);
    if (pred(s)) return { ticks: i, events };
  }
  throw new Error(`condition not reached in ${max} ticks (phase ${s.phase})`);
}

function newGame(startChapter = 1, startWave = 1): GameState {
  const s = createGame({ seed: 11, difficulty: 'normal', startChapter, startWave, debug: { godMode: true } });
  return s;
}

beforeEach(() => {
  ctl.complete = false;
});

describe('phase machine', () => {
  it('starts chapter 1 wave 1 with the chapter banner', () => {
    const s = newGame();
    const info = waveInfo(1, 1);
    expect(s.phase).toBe('wave_intro');
    expect(s.events).toContainEqual({ type: 'wave_start', chapter: 1, wave: 1, name: info.waveName, isBoss: false });
    expect(s.banner).toMatchObject({
      style: 'wave', title: 'CHAPTER 1: ' + info.chapterName.toUpperCase(), subtitle: 'Wave 1 — ' + info.waveName, ttl: 2.5,
    });
    expect(canFire(s)).toBe(true);
  });

  it('wave_intro → wave_active after 2 s; banner expires', () => {
    const s = newGame();
    const { ticks } = runUntil(s, (g) => g.phase === 'wave_active', 500);
    expect(ticks).toBe(ticksFor(2.0));
    runUntil(s, (g) => g.banner === null, 60);
  });

  it('wave_active → wave_clear → next wave', () => {
    const s = newGame();
    runUntil(s, (g) => g.phase === 'wave_active', 500);
    step(s, NEUTRAL_INPUT, DT);
    expect(s.phase).toBe('wave_active');
    ctl.complete = true;
    step(s, NEUTRAL_INPUT, DT);
    expect(s.phase).toBe('wave_clear');
    expect(s.events).toContainEqual({ type: 'wave_cleared', chapter: 1, wave: 1 });
    expect(s.banner).toMatchObject({ style: 'small', title: 'WAVE CLEARED', ttl: 1.2 });
    const { ticks } = runUntil(s, (g) => g.phase === 'wave_intro', 500);
    expect(ticks).toBe(ticksFor(1.5));
    expect(s.wave).toBe(2);
    expect(s.banner).toMatchObject({ style: 'wave', title: 'WAVE 2', subtitle: waveInfo(1, 2).waveName, ttl: 2.0 });
  });

  it('boss wave: warning banner, boss_intro for 3 s', () => {
    const s = newGame(1, 10);
    expect(s.phase).toBe('boss_intro');
    expect(s.banner).toMatchObject({ style: 'boss', title: 'WARNING' });
    expect(s.banner!.subtitle.endsWith(' APPROACHING')).toBe(true);
    expect(s.events.some((e) => e.type === 'boss_warning')).toBe(true);
    const { ticks } = runUntil(s, (g) => g.phase === 'wave_active', 500);
    expect(ticks).toBe(ticksFor(3.0));
  });

  it('boss cleared → chapter bonus → skippable tally → warp → next chapter', () => {
    const s = newGame(1, 10);
    s.chapterStats = { shotsFired: 10, shotsHit: 5, kills: 3, foodCollected: 4, deaths: 1 };
    s.player.power = 2;
    ctl.complete = true;
    const r = runUntil(s, (g) => g.phase === 'chapter_complete', 1000);
    const done = r.events.find((e) => e.type === 'chapter_complete');
    expect(done).toBeDefined();
    const expected = 50 * 200 + 4 * 50 + 0 + 2 * 1000;
    expect(s.lastChapterBonus?.total).toBe(expected);
    expect(s.score).toBe(expected);
    expect(canFire(s)).toBe(false);

    // skip is ignored before 1.5 s, honored after.
    const r2 = runUntil(s, (g) => g.phase === 'warp', 1000, SKIP);
    expect(r2.ticks).toBe(ticksFor(1.5));
    expect(r2.events).toContainEqual({ type: 'warp_start', nextChapter: 2 });
    expect(s.banner).toMatchObject({ title: 'WARP TO CHAPTER 2' });

    ctl.complete = false;
    const r3 = runUntil(s, (g) => g.chapter === 2, 1000);
    expect(r3.ticks).toBe(ticksFor(3.0));
    expect(s.wave).toBe(1);
    expect(s.phase).toBe('wave_intro');
    expect(s.chapterStats).toEqual({ shotsFired: 0, shotsHit: 0, kills: 0, foodCollected: 0, deaths: 0 });
  });

  it('tally ends by itself after 5 s', () => {
    const s = newGame(2, 10);
    ctl.complete = true;
    runUntil(s, (g) => g.phase === 'chapter_complete', 1000);
    const { ticks } = runUntil(s, (g) => g.phase === 'warp', 1000);
    expect(ticks).toBe(ticksFor(5.0));
  });

  it('final chapter → victory once; continueEndless → warp → chapter 6', () => {
    const s = newGame(5, 10);
    ctl.complete = true;
    runUntil(s, (g) => g.phase === 'chapter_complete', 1000);
    const r = runUntil(s, (g) => g.phase === 'victory', 1000, SKIP);
    expect(r.events.filter((e) => e.type === 'victory')).toHaveLength(1);
    expect(s.banner).toMatchObject({ style: 'big', title: 'COOP LIBERATED!' });
    for (let i = 0; i < 300; i++) {
      step(s, SKIP, DT);
      expect(s.events.some((e) => e.type === 'victory')).toBe(false);
    }
    expect(s.phase).toBe('victory');

    continueEndless(s);
    expect(s.endless).toBe(true);
    expect(s.phase).toBe('warp');
    expect(s.events).toContainEqual({ type: 'warp_start', nextChapter: 6 });
    ctl.complete = false;
    runUntil(s, (g) => g.chapter === 6, 1000);
    expect(s.phase).toBe('wave_intro');
  });

  it('endless chapter 10 warps instead of winning again', () => {
    const s = newGame(10, 10);
    s.endless = true;
    ctl.complete = true;
    runUntil(s, (g) => g.phase === 'chapter_complete', 1000);
    runUntil(s, (g) => g.phase === 'warp', 1000);
  });

  it('game over when the player is dead with no lives and the delay ran out', () => {
    const s = newGame();
    s.player.alive = false;
    s.player.lives = 0;
    s.player.respawnTimer = 0;
    step(s, NEUTRAL_INPUT, DT);
    expect(s.phase).toBe('game_over');
    expect(s.events).toContainEqual({ type: 'game_over', score: s.score });
    expect(s.banner).toMatchObject({ style: 'big', title: 'GAME OVER' });
    step(s, NEUTRAL_INPUT, DT);
    expect(s.events.some((e) => e.type === 'game_over')).toBe(false);
  });

  it('state stays JSON-serializable', () => {
    const s = newGame();
    runUntil(s, (g) => g.phase === 'wave_active', 500);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
