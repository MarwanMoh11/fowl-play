// src/sim/scoring.ts — OWNER: LEAD. Score, extra lives, chapter bonus (§7.9).
import type { ChapterBonus, GameState, Stats, Vec2 } from './types';
import { emit } from './events';
import { DIFFICULTY } from './difficulty';
import { EXTRA_LIFE_EVERY, MAX_LIVES } from './tuning/core';
import { DOUBLE_SCORE_MUL } from './tuning/loadout';
import { BONUS_FLAWLESS, BONUS_PER_ACCURACY_PCT, BONUS_PER_FOOD, BONUS_PER_POWER } from './tuning/economy';

export function emptyStats(): Stats {
  return {
    shotsFired: 0, shotsHit: 0, kills: 0, foodCollected: 0, deaths: 0,
    maxCombo: 0, bossesKilled: 0, goldenKills: 0, powerups: 0, overdrives: 0,
  };
}

/** Run-wide score multiplier: difficulty × mods.scoreMul × double-score power-up. */
export function scoreMultiplier(state: GameState): number {
  const dbl = state.player.powerups.double > 0 ? DOUBLE_SCORE_MUL : 1;
  return DIFFICULTY[state.difficulty].scoreMul * state.mods.scoreMul * dbl;
}

/** Adds base × scoreMultiplier; grants extra lives. Returns the awarded amount. */
export function addScore(state: GameState, base: number, at?: Vec2): number {
  const amount = Math.round(base * scoreMultiplier(state));
  state.score += amount;
  if (at) emit(state, { type: 'score_popup', amount, x: at.x, y: at.y });
  while (state.score >= state.nextExtraLifeAt) {
    if (state.player.lives < MAX_LIVES) {
      state.player.lives += 1;
      emit(state, { type: 'extra_life', lives: state.player.lives });
    }
    state.nextExtraLifeAt += EXTRA_LIFE_EVERY;
  }
  return amount;
}

export function accuracyPct(stats: Stats): number {
  return stats.shotsFired > 0 ? Math.floor((100 * stats.shotsHit) / stats.shotsFired) : 0;
}

export function computeChapterBonus(state: GameState): ChapterBonus {
  const s = state.chapterStats;
  const pct = Math.min(100, accuracyPct(s));
  const accuracy = pct * BONUS_PER_ACCURACY_PCT;
  const food = s.foodCollected * BONUS_PER_FOOD;
  const flawless = s.deaths === 0 ? BONUS_FLAWLESS : 0;
  const firepower = state.player.power * BONUS_PER_POWER;
  return { accuracyPct: pct, accuracy, food, flawless, firepower, total: accuracy + food + flawless + firepower };
}
