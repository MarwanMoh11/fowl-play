// tests/a1.scoring.test.ts — OWNER: A1
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { addScore, computeChapterBonus, emptyStats } from '../src/sim/scoring';
import type { Difficulty } from '../src/sim/types';
import { clearWorld } from './a1.helpers';

const game = (difficulty: Difficulty = 'normal') => clearWorld(createGame({ seed: 1, difficulty }));

describe('scoring', () => {
  it('applies the difficulty multiplier and rounds', () => {
    expect(addScore(game('normal'), 250)).toBe(250);
    expect(addScore(game('easy'), 250)).toBe(188);   // 187.5 → 188
    expect(addScore(game('hard'), 250)).toBe(375);
  });

  it('emits a popup only when a position is given', () => {
    const s = game();
    addScore(s, 100);
    expect(s.events).toEqual([]);
    addScore(s, 100, { x: 10, y: 20 });
    expect(s.events).toEqual([{ type: 'score_popup', amount: 100, x: 10, y: 20 }]);
  });

  it('grants an extra life every 100,000 points, capped at 9 lives', () => {
    const s = game();
    const lives = s.player.lives;
    addScore(s, 250_000);
    expect(s.player.lives).toBe(lives + 2);
    expect(s.nextExtraLifeAt).toBe(300_000);
    expect(s.events.filter((e) => e.type === 'extra_life')).toHaveLength(2);

    s.player.lives = 9;
    s.events.length = 0;
    addScore(s, 100_000);
    expect(s.player.lives).toBe(9);
    expect(s.nextExtraLifeAt).toBe(400_000);
    expect(s.events.some((e) => e.type === 'extra_life')).toBe(false);
  });

  it('computes the chapter bonus', () => {
    const s = game();
    s.chapterStats = { ...emptyStats(), shotsFired: 300, shotsHit: 200, foodCollected: 140, deaths: 0 };
    s.player.power = 4;
    expect(computeChapterBonus(s)).toEqual({
      accuracyPct: 66, accuracy: 13_200, food: 7_000, flawless: 25_000, firepower: 4_000, total: 49_200,
    });
    s.chapterStats.deaths = 1;
    s.chapterStats.shotsFired = 0;
    const b = computeChapterBonus(s);
    expect(b.accuracyPct).toBe(0);
    expect(b.flawless).toBe(0);
    expect(b.total).toBe(7_000 + 4_000);
  });
});
