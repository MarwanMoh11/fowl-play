// src/audio/music-select.ts — OWNER: A4. Which music track plays on which screen (§8.9). Pure.
import type { AppScreen } from '../shared/contracts';
import type { GameState } from '../sim/types';
import type { TrackName } from './music-data';

export const PAUSE_DUCK = 0.4;
export const TALLY_DUCK = 0.5;

function bossAlive(state: GameState): boolean {
  for (const e of state.enemies) if (e.alive && e.isBoss) return true;
  return false;
}

/**
 * Track for this frame, or `undefined` when the current track should simply continue (paused).
 * null means silence (no state to base a choice on).
 */
export function chooseTrack(screen: AppScreen, state: GameState | null): TrackName | null | undefined {
  switch (screen) {
    case 'title': return 'title';
    case 'victory': return 'victory';
    case 'gameover': return 'gameover';
    case 'paused': return undefined;
    case 'playing':
      if (!state) return null;
      return state.phase === 'boss_intro' || bossAlive(state) ? 'boss' : 'game';
  }
}

/** Music volume multiplier while paused or during the chapter tally. */
export function duckLevel(screen: AppScreen, state: GameState | null): number {
  if (screen === 'paused') return PAUSE_DUCK;
  if (screen === 'playing' && state?.phase === 'chapter_complete') return TALLY_DUCK;
  return 1;
}
