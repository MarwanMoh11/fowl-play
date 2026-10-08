// src/audio/music.ts — OWNER: A4. Look-ahead music scheduler and instruments (§8.9).
import {
  TRACKS, TRACK_TAILS, trackSteps, type Note, type Track, type TrackName,
} from './music-data';
import { STEPS_PER_BAR, type DrumHit } from './music-dsl';
import { midiToHz, noise, tone, type VoiceEnv } from './synth';

export const SCHEDULER_MS = 25;
export const LOOKAHEAD_S = 0.12;
export const CROSSFADE_S = 0.5;
export const DUCK_SMOOTH_S = 0.08;
const START_DELAY_S = 0.05;
const RESYNC_AFTER_S = 0.25;
const REMOVE_PAD_S = 0.1;
const END_LINGER_S = 2;
const LEAD_GAIN = 0.07;
const BASS_GAIN = 0.13;
const ARP_GAIN = 0.035;
const ARP_LOWPASS = 1500;
const KICK_GAIN = 0.28;
const SNARE_GAIN = 0.13;
const HAT_GAIN = 0.06;

export type Part = 'lead' | 'bass' | 'arp';
export interface StepEvents { notes: { part: Part; note: Note }[]; drums: DrumHit['kind'][] }

export function stepSeconds(bpm: number): number {
  return 60 / bpm / 4;
}

/** One entry per 16th-note step of the loop listing what starts there. */
export function buildStepIndex(track: Track): StepEvents[] {
  const index: StepEvents[] = Array.from({ length: trackSteps(track) }, () => ({ notes: [], drums: [] }));
  const parts: [Part, Note[]][] = [['lead', track.lead], ['bass', track.bass], ['arp', track.arp]];
  for (const [part, notes] of parts) {
    for (const note of notes) index[note.step]?.notes.push({ part, note });
  }
  for (const hit of track.drums) index[hit.step]?.drums.push(hit.kind);
  return index;
}

interface Playing {
  name: TrackName;
  track: Track;
  index: StepEvents[];
  gain: GainNode;
  env: VoiceEnv;
  step: number;
  nextTime: number;
  stepLen: number;
  level: number;
  ended: boolean;
  removeAt: number;
}

export type MusicBase = Omit<VoiceEnv, 'out' | 'pitch'>;
export interface MusicTimer {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface MusicEngine {
  setTrack(name: TrackName | null): void;
  setDuck(level: number): void;
  /** One scheduler pass; the timer calls it every 25 ms. Exposed for tests. */
  pump(): void;
  start(): void;
  stop(): void;
  current(): TrackName | null;
}

function playNote(p: Playing, part: Part, note: Note, t: number): void {
  const len = note.len * p.stepLen;
  const hz = midiToHz(note.midi);
  const vel = (note.vel ?? 1) * p.level;
  if (part === 'arp') {
    tone(p.env, t, { type: 'sawtooth', f0: hz, lp: ARP_LOWPASS, a: 0.004, d: Math.max(0.05, len * 0.9), gain: ARP_GAIN * vel });
    return;
  }
  const attack = 0.006;
  const hold = Math.max(0, len * 0.8 - attack);
  const gain = (part === 'lead' ? LEAD_GAIN : BASS_GAIN) * vel;
  tone(p.env, t, { type: part === 'lead' ? 'pulse' : 'triangle', f0: hz, a: attack, sustain: hold, d: len * 0.2 + 0.02, gain });
}

function playDrum(p: Playing, kind: DrumHit['kind'], t: number): void {
  const lv = p.level;
  if (kind === 'kick') tone(p.env, t, { type: 'sine', f0: 150, f1: 50, d: 0.12, gain: KICK_GAIN * lv });
  else if (kind === 'snare') noise(p.env, t, { filter: 'bandpass', f0: 1800, q: 1, d: 0.1, gain: SNARE_GAIN * lv });
  else noise(p.env, t, { filter: 'highpass', f0: 7000, d: 0.03, gain: HAT_GAIN * lv });
}

function scheduleStep(p: Playing): void {
  const ev = p.index[p.step];
  for (const { part, note } of ev.notes) playNote(p, part, note, p.nextTime);
  for (const kind of ev.drums) playDrum(p, kind, p.nextTime);
}

function advance(p: Playing, tail: { fromBar: number; level: number } | undefined): void {
  p.step += 1;
  p.nextTime += p.stepLen;
  if (p.step < p.index.length) return;
  if (p.track.loop) p.step = 0;
  else if (tail) {
    p.step = tail.fromBar * STEPS_PER_BAR;
    p.level = tail.level;
  } else {
    p.ended = true;
    p.removeAt = p.nextTime + END_LINGER_S;
  }
}

const defaultTimer: MusicTimer = {
  set: (fn, ms) => setInterval(fn, ms),
  clear: (h) => clearInterval(h as ReturnType<typeof setInterval>),
};

export function createMusicEngine(
  ctx: AudioContext, out: AudioNode, base: MusicBase, timer: MusicTimer = defaultTimer,
): MusicEngine {
  const duck = ctx.createGain();
  duck.connect(out);
  const voices: Playing[] = [];
  let current: Playing | null = null;
  let handle: unknown = null;

  function fadeOut(p: Playing, now: number): void {
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_S);
    p.ended = true;
    p.removeAt = now + CROSSFADE_S + REMOVE_PAD_S;
  }

  function pump(): void {
    const now = ctx.currentTime;
    for (const p of voices) {
      if (p.ended) continue;
      if (p.nextTime < now - RESYNC_AFTER_S) p.nextTime = now + START_DELAY_S;
      const tail = TRACK_TAILS[p.name];
      while (!p.ended && p.nextTime < now + LOOKAHEAD_S) {
        scheduleStep(p);
        advance(p, tail);
      }
    }
    for (let i = voices.length - 1; i >= 0; i--) {
      const p = voices[i];
      if (p.removeAt > 0 && now >= p.removeAt) {
        p.gain.disconnect();
        voices.splice(i, 1);
      }
    }
  }

  return {
    setTrack(name: TrackName | null): void {
      if ((current?.name ?? null) === name) return;
      const now = ctx.currentTime;
      if (current) fadeOut(current, now);
      current = null;
      if (name === null) return;
      const track = TRACKS[name];
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_S);
      gain.connect(duck);
      const p: Playing = {
        name, track, index: buildStepIndex(track), gain, env: { ...base, out: gain, pitch: 1 },
        step: 0, nextTime: now + START_DELAY_S, stepLen: stepSeconds(track.bpm), level: 1, ended: false, removeAt: 0,
      };
      voices.push(p);
      current = p;
      pump();
    },
    setDuck(level: number): void {
      duck.gain.setTargetAtTime(level, ctx.currentTime, DUCK_SMOOTH_S);
    },
    pump,
    start(): void {
      if (handle === null) handle = timer.set(pump, SCHEDULER_MS);
    },
    stop(): void {
      if (handle !== null) timer.clear(handle);
      handle = null;
    },
    current: () => current?.name ?? null,
  };
}
