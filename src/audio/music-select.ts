// src/audio/music-select.ts — OWNER: H4. Which music track plays on which screen and chapter (§8.9, HENPOCALYPSE §H4). Pure.
import type { AppScreen } from '../shared/contracts';
import type { GameState } from '../sim/types';
import type { TrackName } from './music-data';

export const PAUSE_DUCK = 0.4;
export const TALLY_DUCK = 0.5;
/** Bosses from the classic game keep the original boss theme; every other boss kind gets the newer themes. */
const CLASSIC_BOSS_KINDS: readonly string[] = ['boss_hen', 'boss_carrier', 'boss_rooster', 'boss_dreadnought'];

/** The menu track the UI asks for: 'draft' for the hangar and loadout, null for the usual title theme. */
let menuTrack: TrackName | null = null;

/** Set by the UI when a menu screen wants a different theme (null = the title theme). */
export function setMenuTrack(track: 'draft' | null): void {
  menuTrack = track;
}

function aliveBossKind(state: GameState): string | null {
  for (const e of state.enemies) if (e.alive && e.isBoss) return e.kind;
  return null;
}

/** Boss theme by kind: the final boss, the HENPOCALYPSE bosses and minis, or the classic boss theme. */
export function bossTrack(kind: string | null): TrackName {
  if (kind === 'boss_empress') return 'empress';
  if (typeof kind === 'string' && kind.startsWith('boss_') && !CLASSIC_BOSS_KINDS.includes(kind)) return 'boss2';
  return 'boss';
}

/** Game theme by chapter. Chapters past 12 (endless) repeat the cycle; Boss Rush always uses the throne theme. */
export function gameTrack(state: GameState): TrackName {
  if (state.mode === 'boss_rush') return 'throne';
  const chapter = Math.max(1, Math.floor(state.chapter || 1));
  const c = ((chapter - 1) % 12) + 1;
  if (c <= 5) return 'game';
  if (c <= 8) return 'nebula';
  if (c <= 11) return 'abyss';
  return 'throne';
}

function playingTrack(state: GameState): TrackName {
  const kind = aliveBossKind(state);
  if (kind !== null) return bossTrack(kind);
  if (state.phase === 'boss_intro') return 'boss';
  return gameTrack(state);
}

/**
 * Track for this frame, or `undefined` when the current track should simply continue (paused).
 * null means silence (no state to base a choice on).
 */
export function chooseTrack(screen: AppScreen, state: GameState | null): TrackName | null | undefined {
  switch (screen) {
    case 'title': return menuTrack ?? 'title';
    case 'victory': return 'victory';
    case 'gameover': return 'gameover';
    case 'paused': return undefined;
    case 'draft': return 'draft';
    case 'playing':
      if (!state) return null;
      return playingTrack(state);
  }
}

/** Music volume multiplier while paused or during the chapter tally. */
export function duckLevel(screen: AppScreen, state: GameState | null): number {
  if (screen === 'paused') return PAUSE_DUCK;
  if (screen === 'playing' && state?.phase === 'chapter_complete') return TALLY_DUCK;
  return 1;
}
