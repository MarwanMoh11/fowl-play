// src/audio/music-data.ts — OWNER: H4. The original tracks and their end-of-track behaviour (§8.9, HENPOCALYPSE §H4 P1-11).
import { GAME_TRACK, TITLE_TRACK } from './music-tracks-a';
import { BOSS_TRACK, GAMEOVER_TRACK, VICTORY_TRACK } from './music-tracks-b';
import { ABYSS_TRACK, NEBULA_TRACK, THRONE_TRACK } from './music-tracks-c';
import { BOSS2_TRACK, DRAFT_TRACK, EMPRESS_TRACK } from './music-tracks-d';
import { STEPS_PER_BAR, type Track } from './music-dsl';

export type { DrumHit, Note, Track } from './music-dsl';
export { STEPS_PER_BAR };

export const TRACK_NAMES = [
  'title', 'game', 'boss', 'victory', 'gameover', 'nebula', 'abyss', 'throne', 'boss2', 'empress', 'draft',
] as const;
export type TrackName = typeof TRACK_NAMES[number];

export const TRACKS: Record<TrackName, Track> = {
  title: TITLE_TRACK, game: GAME_TRACK, boss: BOSS_TRACK, victory: VICTORY_TRACK, gameover: GAMEOVER_TRACK,
  nebula: NEBULA_TRACK, abyss: ABYSS_TRACK, throne: THRONE_TRACK, boss2: BOSS2_TRACK, empress: EMPRESS_TRACK,
  draft: DRAFT_TRACK,
};

/** For tracks that do not loop: after one play, loop from `fromBar` at `level` volume. No entry = silence. */
export const TRACK_TAILS: Partial<Record<TrackName, { fromBar: number; level: number }>> = {
  victory: { fromBar: 2, level: 0.6 },
};

export function trackSteps(track: Track): number {
  return track.bars * STEPS_PER_BAR;
}
