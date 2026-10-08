// src/audio/music-tracks-a.ts — OWNER: A4. Original compositions: menu and gameplay themes (§8.9).
import { arpeggio, drumPattern, melody, pulsingBass, type Track } from './music-dsl';

/** A minor, 100 BPM, 8 bars: Am - F - Dm - E. Sparse, mysterious. */
export const TITLE_TRACK: Track = {
  name: 'title', bpm: 100, bars: 8, loop: true,
  lead: melody([
    'E5/4 C5/2 D5/2 E5/6 r/2',
    'A5/4 G5/2 E5/2 C5/8',
    'A5/6 G5/2 F5/4 E5/2 F5/2',
    'C5/8 r/4 E5/2 F5/2',
    'D5/4 F5/2 A5/2 G5/6 F5/2',
    'E5/8 D5/4 C5/2 D5/2',
    'E5/4 G#5/4 B5/4 G#5/2 E5/2',
    'B5/8 A5/6 r/2',
  ].join('|')),
  bass: melody([
    'A2/8 E3/8', 'A2/8 E3/8', 'F2/8 C3/8', 'F2/8 C3/8',
    'D2/8 A2/8', 'D2/8 A2/8', 'E2/8 B2/8', 'E2/8 G#3/4 B2/4',
  ].join('|')),
  arp: arpeggio(
    [[57, 60, 64], [57, 60, 64], [53, 57, 60], [53, 57, 60], [50, 53, 57], [50, 53, 57], [52, 56, 59], [52, 56, 59]],
    [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1],
  ),
  drums: drumPattern([
    'k...h...k...h.h.', 'k...h...k...h.h.', 'k...h...k...h.h.', 'k...h...k...h.h.',
    'k...h...k...h.h.', 'k...h...k...h.h.', 'k...h...k...h.h.', 'k...h...k.s.s.s.',
  ].join('|')),
};

const GAME_ARP = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3];

/** E minor, 132 BPM, 8 bars: Em - C - G - D, Em - C - Am - B. Upbeat and driving. */
export const GAME_TRACK: Track = {
  name: 'game', bpm: 132, bars: 8, loop: true,
  lead: melody([
    'B5/2 r/1 B5/1 E6/2 D6/2 B5/4 G5/2 A5/2',
    'G5/2 r/1 G5/1 C6/2 B5/2 G5/4 E5/2 G5/2',
    'D6/2 r/1 D6/1 G6/2 F#6/2 D6/4 B5/2 D6/2',
    'A5/4 F#5/2 A5/2 D6/4 C#6/2 A5/2',
    'E6/4 D6/2 B5/2 G5/4 B5/4',
    'C6/4 B5/2 G5/2 E5/4 G5/4',
    'A5/4 C6/2 E6/2 D6/4 C6/2 A5/2',
    'B5/4 D#6/2 F#6/2 A6/4 G6/2 F#6/2',
  ].join('|')),
  bass: pulsingBass([40, 36, 43, 38, 40, 36, 45, 47], [2, 6]),
  arp: arpeggio(
    [[64, 67, 71], [60, 64, 67], [67, 71, 74], [62, 66, 69], [64, 67, 71], [60, 64, 67], [57, 60, 64], [59, 63, 66]],
    GAME_ARP,
  ),
  drums: drumPattern([
    ...Array.from({ length: 7 }, () => 'K.h.S.h.K.h.S.hh'),
    'K.h.S.h.K.hsS.sS',
  ].join('|')),
};
