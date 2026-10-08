// tests/a4.music.test.ts — OWNER: A4. Track data validity, scheduler and track selection (§9.A4).
import { describe, expect, it } from 'vitest';
import { createMusicEngine, buildStepIndex, stepSeconds, LOOKAHEAD_S, CROSSFADE_S } from '../src/audio/music';
import { melody, drumPattern, noteToMidi, STEPS_PER_BAR } from '../src/audio/music-dsl';
import { TRACKS, TRACK_NAMES, TRACK_TAILS, trackSteps } from '../src/audio/music-data';
import { chooseTrack, duckLevel, PAUSE_DUCK } from '../src/audio/music-select';
import type { GameState } from '../src/sim/types';
import { fakeAudioContext } from './a4.helpers';

const MIDI_MIN = 24;
const MIDI_MAX = 108;
const DRUM_KINDS = ['kick', 'snare', 'hat'];
const EXPECTED = {
  title: { bpm: 100, bars: 8, loop: true },
  game: { bpm: 132, bars: 8, loop: true },
  boss: { bpm: 150, bars: 8, loop: true },
  victory: { bpm: 120, bars: 4, loop: false },
  gameover: { bpm: 80, bars: 2, loop: false },
} as const;

describe('music data', () => {
  it('has the five tracks from the spec', () => {
    expect([...TRACK_NAMES].sort()).toEqual(['boss', 'game', 'gameover', 'title', 'victory']);
    for (const name of TRACK_NAMES) {
      const t = TRACKS[name];
      expect(t.name).toBe(name);
      expect({ bpm: t.bpm, bars: t.bars, loop: t.loop }).toEqual(EXPECTED[name]);
    }
  });

  for (const name of TRACK_NAMES) {
    it(`${name}: notes lie within the loop, MIDI 24-108, drums valid`, () => {
      const t = TRACKS[name];
      const total = trackSteps(t);
      expect(t.bpm).toBeGreaterThan(0);
      expect(t.lead.length).toBeGreaterThan(0);
      expect(t.bass.length).toBeGreaterThan(0);
      for (const part of [t.lead, t.bass, t.arp]) {
        for (const n of part) {
          expect(Number.isInteger(n.step)).toBe(true);
          expect(n.step).toBeGreaterThanOrEqual(0);
          expect(n.step).toBeLessThan(total);
          expect(n.len).toBeGreaterThan(0);
          expect(n.step + n.len).toBeLessThanOrEqual(total);
          expect(n.midi).toBeGreaterThanOrEqual(MIDI_MIN);
          expect(n.midi).toBeLessThanOrEqual(MIDI_MAX);
          if (n.vel !== undefined) expect(n.vel).toBeGreaterThan(0);
        }
      }
      for (const h of t.drums) {
        expect(DRUM_KINDS).toContain(h.kind);
        expect(Number.isInteger(h.step)).toBe(true);
        expect(h.step).toBeGreaterThanOrEqual(0);
        expect(h.step).toBeLessThan(total);
      }
    });

    it(`${name}: melodic lines fill whole bars without overlapping themselves`, () => {
      const t = TRACKS[name];
      for (const part of [t.lead, t.bass]) {
        const sorted = [...part].sort((a, b) => a.step - b.step);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].step).toBeGreaterThanOrEqual(sorted[i - 1].step + sorted[i - 1].len);
        }
        const last = sorted[sorted.length - 1];
        expect(last.step + last.len).toBeLessThanOrEqual(trackSteps(t));
        // every bar is written out in full: the lead/bass reach into the final bar
        expect(last.step).toBeGreaterThanOrEqual(trackSteps(t) - STEPS_PER_BAR);
      }
    });
  }

  it('the victory track loops its last two bars after one play; game over fades to silence', () => {
    expect(TRACK_TAILS.victory).toEqual({ fromBar: 2, level: 0.6 });
    expect(TRACK_TAILS.gameover).toBeUndefined();
  });

  it('notation helpers parse notes, rests and drums', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('F#5')).toBe(78);
    expect(noteToMidi('Bb3')).toBe(58);
    expect(noteToMidi('H9')).toBe(-1);
    expect(melody('C4/2 r/2 E4/4|G4/16')).toEqual([
      { step: 0, midi: 60, len: 2 }, { step: 4, midi: 64, len: 4 }, { step: 16, midi: 67, len: 16 },
    ]);
    expect(drumPattern('K..s').map((h) => `${h.step}${h.kind}`)).toEqual(['0kick', '0hat', '3snare']);
  });
});

describe('music engine', () => {
  function setup() {
    const fake = fakeAudioContext();
    const engine = createMusicEngine(fake.ctx, {} as AudioNode, {
      ctx: fake.ctx, noise: {} as AudioBuffer, pulse: {} as PeriodicWave, rand: () => 0.5,
    }, { set: () => 1, clear: () => undefined });
    return { fake, engine };
  }

  it('builds a step index with every note and drum hit', () => {
    const t = TRACKS.game;
    const index = buildStepIndex(t);
    expect(index).toHaveLength(trackSteps(t));
    const counted = index.reduce((n, s) => n + s.notes.length, 0);
    expect(counted).toBe(t.lead.length + t.bass.length + t.arp.length);
    expect(index.reduce((n, s) => n + s.drums.length, 0)).toBe(t.drums.length);
  });

  it('schedules only about 120 ms ahead on the audio clock', () => {
    const { fake, engine } = setup();
    engine.setTrack('game');
    expect(engine.current()).toBe('game');
    const initial = (fake.created.createOscillator ?? 0) + (fake.created.createBufferSource ?? 0);
    expect(initial).toBeGreaterThan(0);
    const stepLen = stepSeconds(TRACKS.game.bpm);
    expect(stepLen).toBeCloseTo(60 / 132 / 4);
    // nothing new until the clock moves
    engine.pump();
    expect((fake.created.createOscillator ?? 0) + (fake.created.createBufferSource ?? 0)).toBe(initial);
    fake.state.currentTime = 1;
    engine.pump();
    const later = (fake.created.createOscillator ?? 0) + (fake.created.createBufferSource ?? 0);
    expect(later).toBeGreaterThan(initial);
    expect(LOOKAHEAD_S).toBe(0.12);
  });

  it('crossfades: the old track fades out over 0.5 s and the new one starts', () => {
    const { fake, engine } = setup();
    engine.setTrack('title');
    fake.state.currentTime = 2;
    engine.setTrack('boss');
    expect(engine.current()).toBe('boss');
    expect(CROSSFADE_S).toBe(0.5);
    engine.setTrack(null);
    expect(engine.current()).toBeNull();
  });

  it('a track without a tail goes quiet after one pass', () => {
    const { fake, engine } = setup();
    engine.setTrack('gameover');
    const seconds = trackSteps(TRACKS.gameover) * stepSeconds(TRACKS.gameover.bpm);
    for (let t = 0; t < seconds + 1; t += 0.05) {
      fake.state.currentTime = t;
      engine.pump();
    }
    const total = (fake.created.createOscillator ?? 0) + (fake.created.createBufferSource ?? 0);
    fake.state.currentTime = seconds + 5;
    engine.pump();
    expect((fake.created.createOscillator ?? 0) + (fake.created.createBufferSource ?? 0)).toBe(total);
  });

  it('a track with a tail keeps playing after one pass', () => {
    const { fake, engine } = setup();
    engine.setTrack('victory');
    const seconds = trackSteps(TRACKS.victory) * stepSeconds(TRACKS.victory.bpm);
    for (let t = 0; t < seconds + 0.5; t += 0.05) {
      fake.state.currentTime = t;
      engine.pump();
    }
    const total = fake.created.createOscillator ?? 0;
    for (let t = seconds + 0.5; t < seconds + 3; t += 0.05) {
      fake.state.currentTime = t;
      engine.pump();
    }
    expect(fake.created.createOscillator ?? 0).toBeGreaterThan(total);
  });
});

describe('track selection', () => {
  const state = (over: Partial<GameState>): GameState => ({ phase: 'wave_active', enemies: [], ...over }) as GameState;
  const boss = { alive: true, isBoss: true } as unknown as GameState['enemies'][number];

  it('picks the track for each screen', () => {
    expect(chooseTrack('title', null)).toBe('title');
    expect(chooseTrack('victory', state({}))).toBe('victory');
    expect(chooseTrack('gameover', state({}))).toBe('gameover');
    expect(chooseTrack('paused', state({}))).toBeUndefined();
    expect(chooseTrack('playing', state({}))).toBe('game');
    expect(chooseTrack('playing', state({ phase: 'boss_intro' }))).toBe('boss');
    expect(chooseTrack('playing', state({ enemies: [boss] }))).toBe('boss');
    expect(chooseTrack('playing', null)).toBeNull();
  });

  it('ducks the music to 40% while paused', () => {
    expect(duckLevel('paused', state({}))).toBe(PAUSE_DUCK);
    expect(PAUSE_DUCK).toBe(0.4);
    expect(duckLevel('playing', state({}))).toBe(1);
    expect(duckLevel('playing', state({ phase: 'chapter_complete' }))).toBeLessThan(1);
    expect(duckLevel('title', null)).toBe(1);
  });
});
