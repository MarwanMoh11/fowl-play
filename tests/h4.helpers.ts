// tests/h4.helpers.ts — OWNER: H4. Shared fakes for H4 tests (not a test file).
import type { RunSummary } from '../src/shared/contracts';
import type { GameState } from '../src/sim/types';

export function makeSummary(over: Partial<RunSummary> = {}): RunSummary {
  return {
    score: 0, chapter: 1, wave: 1, difficulty: 'normal', accuracyPct: 0, kills: 0, victory: false, mode: 'campaign',
    ship: 'falcon', mutators: [], perks: [], corn: 0, bossesKilled: 0, maxCombo: 0, goldenKills: 0, seed: 0,
    dailyDate: 0, ...over,
  };
}

/** The part of GameState the profile and tracker read. */
export function fakeState(over: Record<string, unknown> = {}): GameState {
  return {
    runStats: { kills: 0, bossesKilled: 0, goldenKills: 0, overdrives: 0, foodCollected: 0 },
    combo: { best: 0, count: 0, timer: 0, mult: 1 },
    bossName: null,
    ...over,
  } as unknown as GameState;
}
