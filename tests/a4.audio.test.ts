// tests/a4.audio.test.ts — OWNER: A4. Audio graph, voice limit, throttle, event mapping (§9.A4).
import { describe, expect, it } from 'vitest';
import { createAudio } from '../src/audio';
import { SFX, SOUND_IDS } from '../src/audio/sfx';
import { soundForEvent, soundsForEvents, uiSoundId } from '../src/audio/sfx-map';
import { midiToHz, pulseWaveCoefs } from '../src/audio/synth';
import { MAX_VOICES, Throttle, VoiceLimiter } from '../src/audio/voices';
import type { GameEvent } from '../src/sim/events';
import { fakeAudioContext } from './a4.helpers';

const noTimer = { set: () => 0, clear: () => undefined };

function makeAudio(over: Parameters<typeof createAudio>[0] = {}) {
  const fake = fakeAudioContext();
  const audio = createAudio({ createContext: () => fake.ctx, random: () => 0.5, timer: noTimer, ...over });
  return { fake, audio };
}

describe('voice limiter', () => {
  it('allows 24 voices and drops the rest until they end', () => {
    const lim = new VoiceLimiter();
    for (let i = 0; i < MAX_VOICES; i++) expect(lim.tryAcquire(0, 1)).toBe(true);
    expect(lim.tryAcquire(0.5, 1)).toBe(false);
    expect(lim.active(0.5)).toBe(MAX_VOICES);
    expect(lim.tryAcquire(1.01, 1)).toBe(true);
    expect(lim.active(1.01)).toBe(1);
  });
});

describe('throttle', () => {
  it('enforces a minimum gap per sound id', () => {
    const th = new Throttle();
    expect(th.allow('hit', 0, 0.03)).toBe(true);
    expect(th.allow('hit', 0.01, 0.03)).toBe(false);
    expect(th.allow('cluck', 0.01, 0.035)).toBe(true);
    expect(th.allow('hit', 0.031, 0.03)).toBe(true);
    expect(th.allow('free', 0, 0)).toBe(true);
    expect(th.allow('free', 0, 0)).toBe(true);
  });
});

describe('sound table', () => {
  it('has a recipe for every sound id with sane numbers', () => {
    for (const id of SOUND_IDS) {
      const def = SFX[id];
      expect(def, id).toBeDefined();
      expect(def.dur).toBeGreaterThan(0);
      expect(def.throttle).toBeGreaterThanOrEqual(0);
      expect(def.pitchVar).toBeGreaterThanOrEqual(0);
      expect(def.pitchVar).toBeLessThanOrEqual(0.08);
    }
  });

  it('uses the throttles from the spec', () => {
    expect(SFX.fire_pulse.throttle).toBe(0.06);
    expect(SFX.fire_laser.throttle).toBe(0.05);
    expect(SFX.hit.throttle).toBe(0.03);
    expect(SFX.cluck.throttle).toBe(0.035);
    expect(SFX.charge.throttle).toBe(0.2);
    expect(SFX.tick.throttle).toBe(0.04);
  });

  it('computes pitch and pulse coefficients', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(60)).toBeCloseTo(261.63, 1);
    const { real, imag } = pulseWaveCoefs(0.25, 8);
    expect(real).toHaveLength(9);
    expect(imag).toHaveLength(9);
    expect(real[0]).toBe(0);
    expect(imag[1]).toBeGreaterThan(0);
  });
});

describe('event mapping', () => {
  const ev = (e: GameEvent): GameEvent => e;
  it('maps the spec triggers to sounds', () => {
    expect(soundForEvent(ev({ type: 'player_fire', weapon: 'pulse', power: 0, x: 0, y: 0 }), false)).toBe('fire_pulse');
    expect(soundForEvent(ev({ type: 'player_fire', weapon: 'arc', power: 0, x: 0, y: 0 }), false)).toBe('fire_arc');
    expect(soundForEvent(ev({ type: 'enemy_killed', id: 1, kind: 'chicken_red', x: 0, y: 0, byMissile: false }), false)).toBe('cluck');
    expect(soundForEvent(ev({ type: 'enemy_killed', id: 1, kind: 'chick', x: 0, y: 0, byMissile: false }), false)).toBe('peep');
    expect(soundForEvent(ev({ type: 'enemy_killed', id: 1, kind: 'asteroid_m', x: 0, y: 0, byMissile: false }), false)).toBe('rock_break');
    expect(soundForEvent(ev({ type: 'enemy_killed', id: 1, kind: 'boss_hen', x: 0, y: 0, byMissile: false }), false)).toBeNull();
    expect(soundForEvent(ev({ type: 'egg_splat', x: 0, y: 0 }), false)).toBe('egg_splat');
    expect(soundForEvent(ev({ type: 'player_died', x: 0, y: 0, livesLeft: 1 }), false)).toBe('player_die');
    expect(soundForEvent(ev({ type: 'wave_start', chapter: 1, wave: 2, name: 'x', isBoss: false }), false)).toBe('wave_start');
    expect(soundForEvent(ev({ type: 'wave_start', chapter: 1, wave: 10, name: 'x', isBoss: true }), false)).toBeNull();
    expect(soundForEvent(ev({ type: 'boss_warning', name: 'x' }), false)).toBe('siren');
    expect(soundForEvent(ev({ type: 'boss_phase', phase: 2, x: 0, y: 0 }), false)).toBe('roar');
    expect(soundForEvent(ev({ type: 'game_over', score: 5 }), false)).toBe('game_over');
    expect(soundForEvent(ev({ type: 'arc', points: [] }), false)).toBeNull();
  });

  it('plays the pickup sound by kind, and a gift as power when no weapon change follows', () => {
    const pick = (kind: 'drumstick' | 'roast' | 'power_core' | 'gift_laser'): GameEvent => ({ type: 'pickup_collected', kind, x: 0, y: 0 });
    expect(soundsForEvents([pick('drumstick')])).toEqual(['food']);
    expect(soundsForEvents([pick('roast')])).toEqual(['roast']);
    expect(soundsForEvents([pick('power_core')])).toEqual(['power']);
    expect(soundsForEvents([pick('gift_laser')])).toEqual(['power']);
    expect(soundsForEvents([pick('gift_laser'), { type: 'weapon_changed', weapon: 'laser' }])).toEqual(['gift']);
  });

  it('maps UI sounds', () => {
    expect(uiSoundId('move')).toBe('ui_move');
    expect(uiSoundId('tick')).toBe('tick');
  });
});

describe('audio system', () => {
  it('does nothing before unlock', () => {
    const { fake, audio } = makeAudio();
    audio.ui('select');
    audio.handleEvents([{ type: 'egg_splat', x: 0, y: 0 }]);
    audio.update('title', null, 0.016);
    audio.setVolumes(1, 1, 1);
    expect(fake.created.createOscillator ?? 0).toBe(0);
    expect(fake.created.createGain ?? 0).toBe(0);
  });

  it('builds the graph on unlock and plays sounds afterwards', () => {
    const { fake, audio } = makeAudio();
    audio.unlock();
    audio.unlock();
    expect(fake.created.createDynamicsCompressor).toBe(1);
    const gains = fake.created.createGain;
    audio.ui('select');
    expect(fake.created.createOscillator).toBe(1);
    audio.handleEvents([{ type: 'egg_splat', x: 0, y: 0 }, { type: 'enemy_killed', id: 1, kind: 'chicken_basic', x: 0, y: 0, byMissile: false }]);
    expect(fake.created.createBufferSource).toBe(1);
    expect(fake.created.createOscillator).toBeGreaterThan(2);
    expect(fake.created.createGain).toBeGreaterThan(gains);
  });

  it('resumes a suspended context on unlock', () => {
    const { fake, audio } = makeAudio();
    fake.state.running = 'suspended';
    audio.unlock();
    expect(fake.resumed.count).toBe(1);
  });

  it('survives a missing AudioContext', () => {
    const audio = createAudio({ createContext: () => { throw new Error('no audio'); } });
    expect(() => {
      audio.unlock();
      audio.ui('move');
      audio.handleEvents([{ type: 'overheat' }]);
      audio.update('title', null, 0.016);
    }).not.toThrow();
  });

  it('throttles repeated sounds on the audio clock', () => {
    const { fake, audio } = makeAudio();
    audio.unlock();
    const fire: GameEvent = { type: 'player_fire', weapon: 'pulse', power: 0, x: 0, y: 0 };
    audio.handleEvents([fire]);
    audio.handleEvents([fire]);
    expect(fake.created.createOscillator).toBe(1);
    fake.state.currentTime = 0.07;
    audio.handleEvents([fire]);
    expect(fake.created.createOscillator).toBe(2);
  });

  it('drops new voices beyond 24 at the same instant', () => {
    const { fake, audio } = makeAudio();
    audio.unlock();
    const kinds = ['overheat', 'heat_recovered'] as const;
    for (let i = 0; i < 40; i++) audio.handleEvents([{ type: kinds[i % 2] }]);
    // overheat = 3 oscillators per play, cooled = 1 oscillator per play. Updated by QC: one sound now holds at most
    // MAX_VOICES_PER_SOUND (6) voices, so this mixed burst is 6 + 6 voices instead of 12 + 12.
    const oscillators = fake.created.createOscillator;
    expect(oscillators).toBe(6 * 3 + 6 * 1);
  });

  it('plays tally ticks while the chapter tally counts up', () => {
    const { fake, audio } = makeAudio();
    audio.unlock();
    const state = { phase: 'chapter_complete', phaseTimer: 3, enemies: [] } as unknown as Parameters<typeof audio.update>[1];
    const timer = state as unknown as { phaseTimer: number };
    audio.update('playing', state, 1 / 60); // starts the music; tally is over so no tick yet
    const base = fake.created.createOscillator ?? 0;
    timer.phaseTimer = 0.5;
    for (let i = 0; i < 12; i++) {
      fake.state.currentTime += 1 / 60;
      audio.update('playing', state, 1 / 60);
    }
    const ticks = (fake.created.createOscillator ?? 0) - base;
    expect(ticks).toBeGreaterThanOrEqual(3); // one tick per ~60 ms over 200 ms
    expect(ticks).toBeLessThanOrEqual(4);
    timer.phaseTimer = 2.5;
    audio.update('playing', state, 1 / 60);
    expect((fake.created.createOscillator ?? 0) - base).toBe(ticks);
  });
});
