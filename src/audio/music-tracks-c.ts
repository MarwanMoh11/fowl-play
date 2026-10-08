// src/audio/music-tracks-c.ts — OWNER: H4. HENPOCALYPSE chapter themes: nebula, abyss, throne (§H4 P1-11).
import { arpeggio, drumPattern, gallopBass, melody, pulsingBass, type Track } from './music-dsl';

const CYCLE_ARP = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3];

/** E minor, 132 BPM, 8 bars: synthwave for chapters 6-8. */
export const NEBULA_TRACK: Track = {
  name: 'nebula', bpm: 132, bars: 8, loop: true,
  lead: melody([
    'E5/2 G5/2 B5/4 A5/2 G5/2 E5/2 D5/2',
    'C5/4 E5/4 G5/2 r/2 A5/2 G5/2',
    'D5/2 F#5/2 A5/4 G5/2 F#5/2 D5/2 r/2',
    'B4/4 D5/4 F#5/4 A5/2 F#5/2',
    'E6/2 D6/2 B5/4 G5/2 B5/2 E5/2 r/2',
    'C6/4 B5/4 A5/2 G5/2 E5/2 A5/2',
    'D6/2 C6/2 A5/4 F#5/4 A5/2 D5/2',
    'B5/4 A5/4 B5/2 E6/2 D6/2 B5/2',
  ].join('|')),
  bass: pulsingBass([40, 36, 38, 35, 40, 36, 38, 40], [2, 6]),
  arp: arpeggio(
    [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 62, 66], [64, 67, 71], [60, 64, 67], [62, 66, 69], [64, 68, 71]],
    CYCLE_ARP,
  ),
  drums: drumPattern([
    ...Array.from({ length: 7 }, () => 'K.h.S.h.K.h.S.hh'),
    'K.h.S.h.K.hsS.sS',
  ].join('|')),
};

/** D minor, 120 BPM, 8 bars: slow and heavy for chapters 9-11. */
export const ABYSS_TRACK: Track = {
  name: 'abyss', bpm: 120, bars: 8, loop: true,
  lead: melody([
    'D5/4 F5/2 A5/2 G5/4 r/4',
    'Bb4/2 C5/2 D5/4 F5/4 E5/2 r/2',
    'A4/4 C5/4 F5/2 E5/2 D5/2 C5/2',
    'D5/2 r/2 G4/2 Bb4/2 A4/4 r/4',
    'D6/4 C6/4 A5/2 F5/2 G5/2 F5/2',
    'E5/2 F5/2 G5/4 A5/4 Bb5/2 r/2',
    'A5/4 G5/4 F5/2 E5/2 D5/2 r/2',
    'C5/2 D5/2 F5/4 E5/4 D5/2 r/2',
  ].join('|')),
  bass: pulsingBass([38, 34, 29, 36, 38, 34, 33, 38], []),
  arp: arpeggio(
    [[50, 53, 57], [58, 62, 65], [53, 57, 60], [55, 58, 62], [62, 65, 69], [58, 62, 65], [57, 60, 64], [50, 53, 57]],
    [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1],
  ),
  drums: drumPattern([
    'k...s.......s...', 'k.......k...s...', 'k...s.......s...', 'k.......k.s.....',
    'k...s.......s...', 'k.......k...s...', 'k...s.......s.s.', 'k.......k...sSsS',
  ].join('|')),
};

/** C minor, 140 BPM, 8 bars: an epic march for chapter 12 and Boss Rush. */
export const THRONE_TRACK: Track = {
  name: 'throne', bpm: 140, bars: 8, loop: true,
  lead: melody([
    'C5/2 Eb5/2 G5/4 Ab5/2 G5/2 Eb5/2 r/2',
    'F5/4 Ab5/4 C6/2 Bb5/2 Ab5/2 G5/2',
    'Ab5/2 G5/2 F5/4 Eb5/4 D5/2 C5/2',
    'Bb4/4 C5/4 Eb5/2 G5/2 F5/2 Eb5/2',
    'C6/2 Bb5/2 Ab5/4 G5/4 F5/2 Eb5/2',
    'G5/4 Ab5/4 Bb5/2 C6/2 Bb5/2 Ab5/2',
    'G5/2 F5/2 Eb5/2 D5/2 C5/4 Eb5/4',
    'G4/2 C5/2 Eb5/2 G5/2 C6/8',
  ].join('|')),
  bass: gallopBass([36, 32, 31, 36, 36, 32, 31, 36]),
  arp: arpeggio(
    [[60, 63, 67], [53, 56, 60], [56, 60, 63], [58, 62, 65], [60, 63, 67], [56, 60, 63], [55, 59, 62], [60, 63, 67]],
    CYCLE_ARP,
  ),
  drums: drumPattern([
    ...Array.from({ length: 7 }, () => 'K.h.S.h.K.h.S.h.'),
    'K.h.S.hSK.SsS.sS',
  ].join('|')),
};
