// src/audio/music-tracks-d.ts — OWNER: H4. HENPOCALYPSE boss, final boss and menu themes: boss2, empress, draft (§H4 P1-11).
import { arpeggio, drumPattern, gallopBass, melody, pulsingBass, type Track } from './music-dsl';

const BOSS_ARP = [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 3];

/** F minor, 150 BPM, 8 bars: the new HENPOCALYPSE bosses and mini-bosses. */
export const BOSS2_TRACK: Track = {
  name: 'boss2', bpm: 150, bars: 8, loop: true,
  lead: melody([
    'F5/2 Ab5/2 C6/4 Bb5/2 Ab5/2 F5/2 G5/2',
    'Eb5/4 F5/4 Ab5/2 C6/2 Bb5/2 Ab5/2',
    'G5/2 F5/2 Eb5/2 Db5/2 C5/4 Bb4/4',
    'C5/4 Db5/4 Eb5/2 F5/2 G5/2 r/2',
    'Ab5/2 G5/2 F5/4 G5/4 Ab5/2 C6/2',
    'Bb5/4 Ab5/4 G5/2 F5/2 Eb5/2 Db5/2',
    'C6/4 Bb5/4 Ab5/2 G5/2 F5/2 G5/2',
    'F5/2 Eb5/2 Db5/4 C5/4 F4/2 r/2',
  ].join('|')),
  bass: gallopBass([29, 32, 27, 36, 29, 32, 34, 29]),
  arp: arpeggio(
    [[53, 56, 60], [56, 60, 63], [51, 55, 58], [48, 52, 55], [53, 56, 60], [56, 60, 63], [58, 62, 65], [53, 56, 60]],
    BOSS_ARP,
  ),
  drums: drumPattern([
    ...Array.from({ length: 3 }, () => 'K.hKS.h.K.hKS.hs'),
    'K.hKS.hsK.hKSsSs',
    ...Array.from({ length: 3 }, () => 'K.hKS.h.K.hKS.hs'),
    'K.hKS.hsK.hKSsSs',
  ].join('|')),
};

const EMPRESS_CHORDS: readonly (readonly number[])[] = [[59, 62, 66], [55, 59, 62], [62, 66, 69], [57, 61, 64]];

/** B minor, 156 BPM, 16 bars: the final boss, a long climb with a slow middle. */
export const EMPRESS_TRACK: Track = {
  name: 'empress', bpm: 156, bars: 16, loop: true,
  lead: melody([
    'B5/2 D6/2 F#6/4 E6/2 D6/2 B5/2 A5/2',
    'G5/4 A5/4 B5/2 D6/2 C6/2 B5/2',
    'A5/2 G5/2 F#5/4 E5/4 D5/2 F#5/2',
    'E5/4 F#5/4 G5/2 A5/2 B5/2 r/2',
    'D6/2 E6/2 F#6/2 D6/2 B5/4 A5/4',
    'G6/4 F#6/4 E6/2 D6/2 C#6/2 B5/2',
    'A5/2 B5/2 D6/4 C#6/4 B5/2 A5/2',
    'F#5/2 A5/2 B5/4 r/4 E5/2 F#5/2',
    'B5/2 D6/2 F#6/2 A6/2 G6/4 F#6/4',
    'E6/2 D6/2 B5/4 A5/4 G5/2 F#5/2',
    'E6/4 F#6/4 G6/2 A6/2 B6/2 r/2',
    'A6/2 G6/2 F#6/2 E6/2 D6/4 C#6/4',
    'B5/4 D6/4 F#6/4 B6/4',
    'A6/2 F#6/2 D6/4 B5/4 A5/2 G5/2',
    'F#5/2 G5/2 A5/2 B5/2 D6/2 F#6/2 B6/4',
    'B5/4 A5/4 F#5/4 D5/4',
  ].join('|')),
  bass: pulsingBass([35, 31, 38, 33, 35, 31, 26, 33, 35, 31, 38, 33, 35, 31, 38, 35], [2, 6]),
  arp: arpeggio(Array.from({ length: 16 }, (_, i) => EMPRESS_CHORDS[i % 4]), [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3]),
  drums: drumPattern([
    ...Array.from({ length: 15 }, () => 'K.hKS.h.K.hKS.hs'),
    'K.hKS.hsK.hKSsSs',
  ].join('|')),
};

/** C major, 90 BPM, 8 bars: calm, for the perk draft. */
export const DRAFT_TRACK: Track = {
  name: 'draft', bpm: 90, bars: 8, loop: true,
  lead: melody([
    'C5/4 E5/4 G5/4 E5/4',
    'F5/4 A5/4 C6/4 A5/4',
    'G5/4 B5/4 D6/4 r/4',
    'C6/4 G5/4 E5/4 C5/4',
    'A4/4 C5/4 E5/4 A5/4',
    'F5/4 A5/4 C6/4 B5/2 r/2',
    'G5/2 F5/2 E5/4 D5/4 C5/4',
    'C5/2 E5/2 G5/4 E5/4 C5/4',
  ].join('|')),
  bass: pulsingBass([36, 41, 43, 36, 33, 41, 43, 36], []),
  arp: arpeggio(
    [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67], [57, 60, 64], [60, 65, 69], [59, 62, 67], [60, 64, 67]],
    [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1],
  ),
  drums: drumPattern(Array.from({ length: 8 }, () => 'k...h.h.k...h.h.').join('|')),
};
