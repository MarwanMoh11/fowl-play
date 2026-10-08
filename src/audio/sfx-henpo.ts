// src/audio/sfx-henpo.ts — OWNER: H4. HENPOCALYPSE sound recipes (§H4 P1-10). Pure synthesis, like sfx.ts.
import type { SfxDef } from './sfx';
import { arpeggio, midiToHz, noise, tone } from './synth';

const STD_VAR = 0.05;
const hz = midiToHz;

export const HENPO_SOUND_IDS = [
  'fire_flak', 'fire_flame', 'fire_sickle', 'fire_homing', 'fire_rail', 'fire_prism',
  'combo_up', 'combo_break', 'fury_ready', 'overdrive_on', 'overdrive_off', 'powerup_on', 'powerup_off',
  'shield_pop', 'revive', 'enemy_shield', 'shield_break', 'teleport', 'cloak', 'heal', 'pod_hatch', 'burst',
  'golden', 'golden_gone', 'chain_pop', 'crit', 'drone', 'perk_draft', 'perk_pick', 'corn', 'achievement', 'purchase',
] as const;
export type HenpoSoundId = typeof HENPO_SOUND_IDS[number];

export const HENPO_SFX: Record<HenpoSoundId, SfxDef> = {
  fire_flak: {
    throttle: 0.07, dur: 0.12, pitchVar: STD_VAR,
    play: (e, t) => {
      noise(e, t, { filter: 'bandpass', f0: 1400, q: 0.8, d: 0.1, gain: 0.12 });
      tone(e, t, { type: 'square', f0: 300, f1: 140, d: 0.08, gain: 0.06 });
    },
  },
  fire_flame: {
    throttle: 0.05, dur: 0.2, pitchVar: STD_VAR,
    play: (e, t) => { noise(e, t, { filter: 'bandpass', f0: 900, f1: 500, q: 0.7, d: 0.18, gain: 0.07 }); },
  },
  fire_sickle: {
    throttle: 0.07, dur: 0.12, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'triangle', f0: 1400, f1: 2200, d: 0.12, tremolo: 30, gain: 0.05 }); },
  },
  fire_homing: {
    throttle: 0.05, dur: 0.05, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 1800, f1: 2400, d: 0.04, gain: 0.04 }); },
  },
  fire_rail: {
    throttle: 0.12, dur: 0.26, pitchVar: STD_VAR,
    play: (e, t) => {
      tone(e, t, { type: 'sawtooth', f0: 1600, f1: 300, lp: 2500, d: 0.25, gain: 0.08 });
      noise(e, t, { filter: 'highpass', f0: 3000, d: 0.2, gain: 0.03 });
    },
  },
  fire_prism: {
    throttle: 0.06, dur: 0.17, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sine', f0: 2600, path: [2600, 3100, 2400], d: 0.16, gain: 0.04 }); },
  },
  combo_up: {
    throttle: 0.05, dur: 0.1, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(76), hz(79)], 0.04, 'square', 0.05); },
  },
  combo_break: {
    throttle: 0, dur: 0.3, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(79), hz(74), hz(69)], 0.08, 'triangle', 0.06); },
  },
  fury_ready: {
    throttle: 0, dur: 0.4, pitchVar: 0,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 300, f1: 1200, d: 0.35, tremolo: 10, gain: 0.08 }); },
  },
  overdrive_on: {
    throttle: 0, dur: 0.65, pitchVar: STD_VAR,
    play: (e, t) => {
      tone(e, t, { type: 'sawtooth', f0: 120, f1: 900, lp: 2000, d: 0.6, gain: 0.12 });
      noise(e, t, { filter: 'highpass', f0: 2000, f1: 6000, d: 0.5, gain: 0.05 });
    },
  },
  overdrive_off: {
    throttle: 0, dur: 0.5, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sawtooth', f0: 800, f1: 90, d: 0.5, gain: 0.09 }); },
  },
  powerup_on: {
    throttle: 0, dur: 0.25, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(79), hz(83), hz(86), hz(91)], 0.05, 'triangle', 0.07); },
  },
  powerup_off: {
    throttle: 0, dur: 0.22, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(91), hz(86), hz(83), hz(79)], 0.05, 'triangle', 0.06); },
  },
  shield_pop: {
    throttle: 0.05, dur: 0.15, pitchVar: STD_VAR,
    play: (e, t) => {
      tone(e, t, { type: 'sine', f0: 500, f1: 1100, d: 0.12, gain: 0.12 });
      noise(e, t, { filter: 'bandpass', f0: 2000, d: 0.05, gain: 0.05 });
    },
  },
  revive: {
    throttle: 0, dur: 0.6, pitchVar: 0,
    play: (e, t) => {
      arpeggio(e, t, [hz(72), hz(76), hz(79), hz(84), hz(88)], 0.09, 'triangle', 0.09);
      tone(e, t + 0.4, { type: 'sine', f0: hz(96), d: 0.3, gain: 0.05 });
    },
  },
  enemy_shield: {
    throttle: 0.04, dur: 0.07, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sine', f0: 1500, f1: 1000, d: 0.06, gain: 0.04 }); },
  },
  shield_break: {
    throttle: 0, dur: 0.28, pitchVar: STD_VAR,
    play: (e, t) => {
      noise(e, t, { filter: 'highpass', f0: 3000, d: 0.25, gain: 0.12 });
      tone(e, t, { type: 'triangle', f0: 900, f1: 300, d: 0.2, gain: 0.06 });
    },
  },
  teleport: {
    throttle: 0.15, dur: 0.36, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'sine', f0: 200, path: [200, 1600, 300], d: 0.35, tremolo: 20, gain: 0.09 }); },
  },
  cloak: {
    throttle: 0.2, dur: 0.42, pitchVar: STD_VAR,
    play: (e, t) => { noise(e, t, { filter: 'bandpass', f0: 2500, f1: 400, d: 0.4, gain: 0.06 }); },
  },
  heal: {
    throttle: 0.1, dur: 0.16, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(76), hz(83)], 0.07, 'sine', 0.07); },
  },
  pod_hatch: {
    throttle: 0.1, dur: 0.16, pitchVar: STD_VAR,
    play: (e, t) => {
      tone(e, t, { type: 'sine', f0: 260, f1: 90, d: 0.14, gain: 0.14 });
      noise(e, t, { filter: 'lowpass', f0: 800, d: 0.1, gain: 0.06 });
    },
  },
  burst: {
    throttle: 0.06, dur: 0.24, pitchVar: STD_VAR,
    play: (e, t) => {
      noise(e, t, { filter: 'bandpass', f0: 1500, q: 1, d: 0.22, gain: 0.12 });
      tone(e, t, { type: 'square', f0: 220, f1: 80, d: 0.18, gain: 0.07 });
    },
  },
  golden: {
    throttle: 0.1, dur: 0.2, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(91), hz(96), hz(103), hz(108)], 0.04, 'sine', 0.05); },
  },
  golden_gone: {
    throttle: 0, dur: 0.3, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(96), hz(91), hz(84), hz(79)], 0.06, 'sine', 0.05); },
  },
  chain_pop: {
    throttle: 0.04, dur: 0.07, pitchVar: STD_VAR,
    play: (e, t) => {
      tone(e, t, { type: 'square', f0: 1000, f1: 350, d: 0.05, gain: 0.06 });
      noise(e, t, { filter: 'highpass', f0: 4000, d: 0.03, gain: 0.03 });
    },
  },
  crit: {
    throttle: 0.06, dur: 0.09, pitchVar: STD_VAR,
    play: (e, t) => {
      tone(e, t, { type: 'square', f0: 2000, f1: 900, d: 0.08, gain: 0.07 });
      tone(e, t, { type: 'triangle', f0: 3000, d: 0.03, gain: 0.03 });
    },
  },
  drone: {
    throttle: 0.07, dur: 0.07, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 500, f1: 420, d: 0.06, gain: 0.035 }); },
  },
  perk_draft: {
    throttle: 0, dur: 0.5, pitchVar: 0,
    play: (e, t) => {
      arpeggio(e, t, [hz(72), hz(79), hz(84)], 0.09, 'triangle', 0.08);
      tone(e, t + 0.27, { type: 'square', f0: hz(96), d: 0.2, gain: 0.05 });
    },
  },
  perk_pick: {
    throttle: 0, dur: 0.2, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(84), hz(91), hz(96)], 0.05, 'square', 0.07); },
  },
  corn: {
    throttle: 0.04, dur: 0.05, pitchVar: STD_VAR,
    play: (e, t) => { tone(e, t, { type: 'square', f0: 1320, f1: 1760, d: 0.04, gain: 0.05 }); },
  },
  achievement: {
    throttle: 0, dur: 0.5, pitchVar: 0,
    play: (e, t) => { arpeggio(e, t, [hz(72), hz(76), hz(79), hz(84), hz(79), hz(84)], 0.07, 'square', 0.06); },
  },
  purchase: {
    throttle: 0, dur: 0.14, pitchVar: 0,
    play: (e, t) => {
      tone(e, t, { type: 'square', f0: 1900, d: 0.03, gain: 0.06 });
      tone(e, t + 0.05, { type: 'square', f0: 2500, d: 0.08, gain: 0.06 });
    },
  },
};
