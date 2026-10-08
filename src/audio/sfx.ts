// src/audio/sfx.ts — OWNER: A4. Sound-effect recipes (§8.8). Every recipe is pure synthesis, no samples.
import { arpeggio, midiToHz, noise, tone, type VoiceEnv } from './synth';
import { HENPO_SFX, HENPO_SOUND_IDS } from './sfx-henpo';

const BASE_SOUND_IDS = [
  'fire_pulse', 'fire_neutron', 'fire_laser', 'fire_arc', 'hit', 'cluck', 'peep', 'rock_break',
  'egg_drop', 'egg_splat', 'zap', 'food', 'roast', 'power', 'gift', 'missile_gain', 'missile_launch',
  'boom_big', 'overheat', 'cooled', 'player_die', 'respawn', 'one_up', 'wave_start', 'siren', 'charge',
  'telegraph', 'roar', 'boss_die', 'fanfare', 'game_over', 'tick',
  'ui_move', 'ui_select', 'ui_back', 'ui_error',
] as const;
export type BaseSoundId = typeof BASE_SOUND_IDS[number];
export const SOUND_IDS = [...BASE_SOUND_IDS, ...HENPO_SOUND_IDS] as const;
export type SoundId = typeof SOUND_IDS[number];

export interface SfxDef {
  /** Minimum seconds between two plays; 0 = unthrottled. */
  throttle: number;
  /** Approximate length in seconds (voice accounting). */
  dur: number;
  /** Random pitch spread: 0.05 means +-5%. */
  pitchVar: number;
  play(env: VoiceEnv, t: number): void;
}

const STD_VAR = 0.05;
const hz = midiToHz;

function cluck(env: VoiceEnv, t: number, speed: number, durMul: number): void {
  const bp = [1100, 4] as const;
  tone(env, t, { type: 'square', f0: 700 * speed, f1: 420 * speed, d: 0.045 * durMul, bp, gain: 0.11 });
  const t2 = t + (0.045 + 0.03) * durMul;
  tone(env, t2, { type: 'square', f0: 820 * speed, f1: 480 * speed, d: 0.06 * durMul, bp, gain: 0.11 });
}

function boom(env: VoiceEnv, t: number, level: number, pitch: number): void {
  noise(env, t, { filter: 'lowpass', f0: 4000 * pitch, f1: 200 * pitch, d: 0.9, gain: 0.3 * level });
  tone(env, t, { type: 'sine', f0: 60 * pitch, d: 0.6, gain: 0.3 * level });
}

function fanfare(env: VoiceEnv, t: number): void {
  const lead: [number, number][] = [
    [hz(72), 0.14], [hz(76), 0.14], [hz(79), 0.14], [hz(84), 0.4],
    [hz(79), 0.14], [hz(84), 0.14], [hz(88), 0.8],
  ];
  let at = t;
  for (const [f, len] of lead) {
    tone(env, at, { type: 'square', f0: f, d: len * 0.95, a: 0.004, gain: 0.07 });
    at += len;
  }
  const bass: [number, number][] = [[hz(48), 0.56], [hz(55), 0.28], [hz(48), 0.28], [hz(43), 0.28], [hz(48), 0.6]];
  at = t;
  for (const [f, len] of bass) {
    tone(env, at, { type: 'triangle', f0: f, d: len * 0.95, a: 0.004, gain: 0.1 });
    at += len;
  }
}

const BASE_SFX: Record<BaseSoundId, SfxDef> = {
  fire_pulse: {
    throttle: 0.06, dur: 0.08, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 1200, f1: 600, d: 0.07, gain: 0.07 }); },
  },
  fire_neutron: {
    throttle: 0.06, dur: 0.12, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sawtooth', f0: 400, f1: 180, lp: 1800, d: 0.11, gain: 0.09 }); },
  },
  fire_laser: {
    throttle: 0.05, dur: 0.06, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 2200, f1: 1400, d: 0.05, gain: 0.045 }); },
  },
  fire_arc: {
    throttle: 0.06, dur: 0.1, pitchVar: STD_VAR,
    play: (e, t) => {
      noise(e, t, { filter: 'bandpass', f0: 3000, q: 2, d: 0.09, gain: 0.08 });
      tone(e, t, { type: 'square', f0: 90, d: 0.09, gain: 0.05 });
    },
  },
  hit: {
    throttle: 0.03, dur: 0.05, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'triangle', f0: 900, f1: 700, d: 0.04, gain: 0.04 }); },
  },
  cluck: { throttle: 0.035, dur: 0.14, pitchVar: 0.08, play: (e, t) => cluck(e, t, 1, 1) },
  peep: { throttle: 0.035, dur: 0.1, pitchVar: 0.08, play: (e, t) => cluck(e, t, 1.6, 0.7) },
  rock_break: {
    throttle: 0.04, dur: 0.17, pitchVar: STD_VAR,
    play: (e, t) => { noise(e, t, { filter: 'lowpass', f0: 900, f1: 300, d: 0.16, gain: 0.11 }); },
  },
  egg_drop: {
    throttle: 0.08, dur: 0.07, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sine', f0: 500, f1: 350, d: 0.06, gain: 0.025 }); },
  },
  egg_splat: {
    throttle: 0.05, dur: 0.13, pitchVar: STD_VAR,
    play: (e, t) => {
      noise(e, t, { filter: 'lowpass', f0: 700, d: 0.12, gain: 0.07 });
      tone(e, t, { type: 'sine', f0: 120, d: 0.08, gain: 0.07 });
    },
  },
  zap: {
    throttle: 0.06, dur: 0.08, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 600, f1: 900, d: 0.07, gain: 0.05 }); },
  },
  food: {
    throttle: 0.03, dur: 0.09, pitchVar: STD_VAR,
    play: (e, t) => { arpeggio(e, t, [880, 1320], 0.04, 'triangle', 0.06); },
  },
  roast: {
    throttle: 0.03, dur: 0.13, pitchVar: STD_VAR,
    play: (e, t) => { arpeggio(e, t, [880, 1320, 1760], 0.04, 'triangle', 0.06); },
  },
  power: {
    throttle: 0, dur: 0.15, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(84), hz(88), hz(91), hz(96)], 0.035, 'triangle', 0.08); },
  },
  gift: {
    throttle: 0, dur: 0.35, pitchVar: 0,
    play: (e, t) => {
      arpeggio(e, t, [hz(72), hz(76), hz(79), hz(84)], 0.055, 'square', 0.08);
      noise(e, t + 0.2, { filter: 'highpass', f0: 6000, d: 0.12, gain: 0.04 });
    },
  },
  missile_gain: {
    throttle: 0, dur: 0.25, pitchVar: STD_VAR,
    play: (e, t) => { arpeggio(e, t, [660, 990], 0.12, 'sine', 0.08); },
  },
  missile_launch: {
    throttle: 0, dur: 0.45, pitchVar: STD_VAR,
    play: (e, t) => {
      tone(e, t, { type: 'sawtooth', f0: 200, f1: 800, d: 0.4, gain: 0.1 });
      noise(e, t, { filter: 'bandpass', f0: 500, f1: 2400, q: 1, d: 0.4, gain: 0.08 });
    },
  },
  boom_big: { throttle: 0, dur: 0.95, pitchVar: STD_VAR, play: (e, t) => boom(e, t, 1, 1) },
  overheat: {
    throttle: 0, dur: 0.25, pitchVar: STD_VAR,
    play: (e, t) => { arpeggio(e, t, [440, 330, 440], 0.08, 'square', 0.07); },
  },
  cooled: {
    throttle: 0, dur: 0.09, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sine', f0: 600, f1: 900, d: 0.08, gain: 0.05 }); },
  },
  player_die: {
    throttle: 0, dur: 1.25, pitchVar: STD_VAR,
    play: (e, t) => {
      noise(e, t, { filter: 'lowpass', f0: 3000, f1: 150, d: 1.2, gain: 0.25 });
      tone(e, t, { type: 'sawtooth', f0: 600, f1: 60, d: 1.2, gain: 0.25 });
    },
  },
  respawn: {
    throttle: 0, dur: 0.55, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'triangle', f0: 400, f1: 1600, d: 0.5, tremolo: 12, gain: 0.07 }); },
  },
  one_up: {
    throttle: 0, dur: 0.45, pitchVar: 0,
    play: (e, t) => {
      arpeggio(e, t, [hz(72), hz(76), hz(79), hz(84), hz(88), hz(91)], 0.07, 'pulse', 0.08);
    },
  },
  wave_start: {
    throttle: 0, dur: 0.25, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(79), hz(84)], 0.12, 'square', 0.07); },
  },
  siren: {
    throttle: 0, dur: 2.1, pitchVar: 0,
    play: (e, t) => {
      const path: number[] = [];
      for (let i = 0; i < 4; i++) path.push(600, 900);
      path.push(600);
      tone(e, t, { type: 'sine', f0: 600, path, sustain: 1.9, d: 0.1, gain: 0.11 });
    },
  },
  charge: {
    throttle: 0.2, dur: 0.26, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sawtooth', f0: 150, f1: 400, lp: 1200, d: 0.25, gain: 0.06 }); },
  },
  telegraph: {
    throttle: 0.2, dur: 0.62, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sine', f0: 300, f1: 1200, d: 0.6, gain: 0.05 }); },
  },
  roar: {
    throttle: 0, dur: 0.52, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sawtooth', f0: 150, f1: 80, d: 0.5, distort: true, gain: 0.15 }); },
  },
  boss_die: {
    throttle: 0, dur: 1.6, pitchVar: STD_VAR,
    play: (e, t) => {
      boom(e, t, 1, 1);
      boom(e, t + 0.3, 0.85, 0.8);
      boom(e, t + 0.6, 0.7, 0.6);
    },
  },
  fanfare: { throttle: 0, dur: 2, pitchVar: 0, play: fanfare },
  game_over: {
    throttle: 0, dur: 1, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(76), hz(74), hz(72), hz(69)], 0.25, 'triangle', 0.1); },
  },
  tick: {
    throttle: 0.04, dur: 0.02, pitchVar: 0,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 1500, d: 0.015, gain: 0.03 }); },
  },
  ui_move: {
    throttle: 0, dur: 0.05, pitchVar: 0,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 1000, d: 0.04, gain: 0.05 }); },
  },
  ui_select: {
    throttle: 0, dur: 0.07, pitchVar: 0,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 1400, d: 0.06, gain: 0.05 }); },
  },
  ui_back: {
    throttle: 0, dur: 0.06, pitchVar: 0,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 700, d: 0.05, gain: 0.05 }); },
  },
  ui_error: {
    throttle: 0, dur: 0.07, pitchVar: 0,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 200, d: 0.06, gain: 0.05 }); },
  },
};

export const SFX: Record<SoundId, SfxDef> = { ...BASE_SFX, ...HENPO_SFX };
