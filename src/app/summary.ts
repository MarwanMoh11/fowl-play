// src/app/summary.ts — OWNER: A1. RunSummary for the game-over / victory screens.
import type { RunSummary } from '../shared/contracts';
import type { GameState } from '../sim/types';
import { accuracyPct } from '../sim/scoring';

export function buildRunSummary(state: GameState, victory: boolean): RunSummary {
  return {
    score: state.score,
    chapter: state.chapter,
    wave: state.wave,
    difficulty: state.difficulty,
    accuracyPct: Math.min(100, accuracyPct(state.runStats)),
    kills: state.runStats.kills,
    victory,
  };
}
