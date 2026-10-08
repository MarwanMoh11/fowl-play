// src/audio/music-tracks-b.ts — OWNER: A4. Original compositions: boss, victory and game over (§8.9).
import { arpeggio, drumPattern, gallopBass, melody, type Track } from './music-dsl';

const BOSS_ARP = [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 3];

/** D minor, 150 BPM, 8 bars: Dm - Bb - C - A, Dm - Bb - Gm - A. Heavy and relentless. */
export const BOSS_TRACK: Track = {
  name: 'boss', bpm: 150, bars: 8, loop: true,
  lead: melody([
    'D5/2 D5/1 F5/1 A5/2 G5/2 F5/2 E5/2 D5/4',
    'Bb4/2 Bb4/1 D5/1 F5/2 E5/2 D5/2 C5/2 Bb4/4',
    'C5/2 C5/1 E5/1 G5/2 F5/2 E5/2 D5/2 C5/4',
    'A4/2 C#5/2 E5/2 A5/2 G5/2 E5/2 C#5/4',
    'D6/4 C6/2 A5/2 F5/4 A5/4',
    'Bb5/4 A5/2 F5/2 D5/4 F5/4',
    'G5/4 Bb5/2 D6/2 C6/2 Bb5/2 A5/2 G5/2',
    'A5/2 G5/2 F5/2 E5/2 D5/2 C#5/2 E5/2 A5/2',
  ].join('|')),
  bass: gallopBass([38, 34, 36, 33, 38, 34, 31, 33]),
  arp: arpeggio(
    [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64], [62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]],
    BOSS_ARP,
  ),
  drums: drumPattern([
    ...Array.from({ length: 3 }, () => 'K.hKS.h.K.hKS.hs'),
    'K.hKS.hsK.hKSsSs',
    ...Array.from({ length: 3 }, () => 'K.hKS.h.K.hKS.hs'),
    'K.hKS.hsK.hKSsSs',
  ].join('|')),
};

/** C major, 120 BPM, 4 bars: C - F - G - C. Plays once, then bars 3-4 loop softly. */
export const VICTORY_TRACK: Track = {
  name: 'victory', bpm: 120, bars: 4, loop: false,
  lead: melody([
    'G5/2 C6/2 E6/4 D6/2 C6/2 G5/4',
    'A5/2 C6/2 F6/4 E6/2 D6/2 C6/4',
    'B5/2 D6/2 G6/4 F6/2 E6/2 D6/4',
    'C6/6 E6/2 G6/4 C7/4',
  ].join('|')),
  bass: melody([
    'C3/4 G3/4 C3/4 G3/4', 'F2/4 C3/4 F2/4 C3/4', 'G2/4 D3/4 G2/4 D3/4', 'C3/4 G3/4 C3/4 C3/4',
  ].join('|')),
  arp: arpeggio(
    [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]],
    [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3],
  ),
  drums: drumPattern('K...S...K.K.S...|K...S...K.K.S...|K...S...K.K.S...|K...S...K.K.SsSs'),
};

/** A minor, 80 BPM, 2 bars: a slow falling line. Plays once, then silence. */
export const GAMEOVER_TRACK: Track = {
  name: 'gameover', bpm: 80, bars: 2, loop: false,
  lead: melody('E5/6 D5/2 C5/4 B4/4|A4/12 r/4'),
  bass: melody('A2/16|D3/8 E2/8'),
  arp: [],
  drums: drumPattern('k...............|................'),
};
