// src/audio/music-dsl.ts — OWNER: A4. Tiny text notation that expands to Note[] / DrumHit[] (§8.9). Pure.
export interface Note { step: number; midi: number; len: number; vel?: number }
export interface DrumHit { step: number; kind: 'kick' | 'snare' | 'hat' }
export interface Track {
  name: string; bpm: number; bars: number; loop: boolean;
  lead: Note[]; bass: Note[]; arp: Note[]; drums: DrumHit[];
}

export const STEPS_PER_BAR = 16;
const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" -> 60, "F#5" -> 78, "Bb3" -> 58. Returns -1 for anything unparsable. */
export function noteToMidi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return -1;
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + accidental;
}

/**
 * Melodic line. Bars are separated by `|`; tokens by spaces: `E5/2` = note E5 for 2 steps, `r/4` = rest for 4 steps.
 * Every bar should add up to 16 steps; the tests check this.
 */
export function melody(text: string): Note[] {
  const notes: Note[] = [];
  text.split('|').forEach((bar, barIndex) => {
    let cursor = barIndex * STEPS_PER_BAR;
    for (const token of bar.trim().split(/\s+/)) {
      if (token === '') continue;
      const [name, lenText] = token.split('/');
      const len = lenText === undefined ? 1 : Number(lenText);
      if (name !== 'r') notes.push({ step: cursor, midi: noteToMidi(name), len });
      cursor += len;
    }
  });
  return notes;
}

const DRUM_CHARS: Record<string, DrumHit['kind'][]> = {
  k: ['kick'], s: ['snare'], h: ['hat'], K: ['kick', 'hat'], S: ['snare', 'hat'],
};

/** Drum pattern, 16 characters per bar, bars separated by `|`: k kick, s snare, h hat, K kick+hat, S snare+hat, . none. */
export function drumPattern(text: string): DrumHit[] {
  const hits: DrumHit[] = [];
  text.split('|').forEach((bar, barIndex) => {
    [...bar.trim()].forEach((ch, i) => {
      for (const kind of DRUM_CHARS[ch] ?? []) hits.push({ step: barIndex * STEPS_PER_BAR + i, kind });
    });
  });
  return hits;
}

/** Repeats one chord per bar as a 16-step pattern. Entry i of `pattern` indexes the chord (wrapping up an octave), -1 = rest. */
export function arpeggio(chords: readonly (readonly number[])[], pattern: readonly number[]): Note[] {
  const notes: Note[] = [];
  chords.forEach((chord, bar) => {
    pattern.forEach((idx, i) => {
      if (idx < 0) return;
      const midi = chord[idx % chord.length] + 12 * Math.floor(idx / chord.length);
      notes.push({ step: bar * STEPS_PER_BAR + i, midi, len: 1 });
    });
  });
  return notes;
}

/** Eight eighth-notes per bar on the root, with an octave jump on the off-beats listed in `jumps` (0..7). */
export function pulsingBass(roots: readonly number[], jumps: readonly number[]): Note[] {
  const notes: Note[] = [];
  roots.forEach((root, bar) => {
    for (let e = 0; e < 8; e++) {
      notes.push({ step: bar * STEPS_PER_BAR + e * 2, midi: root + (jumps.includes(e) ? 12 : 0), len: 2 });
    }
  });
  return notes;
}

/** Gallop: three hits and a rest on every beat. */
export function gallopBass(roots: readonly number[]): Note[] {
  const notes: Note[] = [];
  roots.forEach((root, bar) => {
    for (let beat = 0; beat < 4; beat++) {
      const base = bar * STEPS_PER_BAR + beat * 4;
      notes.push({ step: base, midi: root, len: 1 }, { step: base + 1, midi: root, len: 1 }, { step: base + 3, midi: root + (beat % 2) * 12, len: 1 });
    }
  });
  return notes;
}
