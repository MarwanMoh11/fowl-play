// src/app/summary.ts — OWNER: LEAD. RunSummary for the game-over / victory screens.
import type { RunSummary } from '../shared/contracts';
import type { GameState, PerkId } from '../sim/types';
import { accuracyPct } from '../sim/scoring';

export function buildRunSummary(state: GameState, victory: boolean, dailyDate = 0): RunSummary {
  const perks: PerkId[] = [];
  for (const [id, n] of Object.entries(state.perks) as [PerkId, number][]) for (let i = 0; i < n; i++) perks.push(id);
  return {
    score: state.score,
    chapter: state.chapter,
    wave: state.wave,
    difficulty: state.difficulty,
    accuracyPct: Math.min(100, accuracyPct(state.runStats)),
    kills: state.runStats.kills,
    victory,
    mode: state.mode,
    ship: state.player.ship,
    mutators: state.loadout.mutators.slice(),
    perks,
    corn: state.corn,
    bossesKilled: state.runStats.bossesKilled,
    maxCombo: state.runStats.maxCombo,
    goldenKills: state.runStats.goldenKills,
    seed: state.seed,
    dailyDate: state.mode === 'daily' ? dailyDate : 0,
  };
}
