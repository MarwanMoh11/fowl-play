// src/audio/index.ts — OWNER: A4. Audio system: graph, unlock, volumes, SFX voices, music (§8.8–8.9).
// Nothing touches AudioContext until unlock() runs from a user gesture; before that every call is a no-op.
import type { AppScreen, AudioSystem, UiSound } from '../shared/contracts';
import { DEFAULT_SETTINGS } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { GameState } from '../sim/types';
import { createMusicEngine, type MusicEngine, type MusicTimer } from './music';
import { chooseTrack, duckLevel } from './music-select';
import { SFX, type SoundId } from './sfx';
import { soundsForEvents, uiSoundId } from './sfx-map';
import { createNoiseBuffer, createPulseWave, type VoiceEnv } from './synth';
import { Throttle, VoiceLimiter } from './voices';
import { tallyCounting } from '../ui/tally';

export const MUSIC_BUS_LEVEL = 0.55;
export const VOLUME_SMOOTH_S = 0.02;
export const TALLY_TICK_EVERY_S = 0.06;
const COMPRESSOR = { threshold: -14, knee: 24, ratio: 6, attack: 0.003, release: 0.2 } as const;
const SCHEDULE_AHEAD_S = 0.004;

export interface AudioOptions {
  /** Test hook: builds the AudioContext instead of using the browser's. */
  createContext?: () => AudioContext;
  random?: () => number;
  timer?: MusicTimer;
}

type AudioCtor = new () => AudioContext;

function browserContext(): AudioContext | null {
  const g = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export function createAudio(opts: AudioOptions = {}): AudioSystem {
  const rand = opts.random ?? Math.random;
  const limiter = new VoiceLimiter();
  const throttle = new Throttle();
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let musicBus: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let base: Omit<VoiceEnv, 'out' | 'pitch'> | null = null;
  let music: MusicEngine | null = null;
  let vol = { master: DEFAULT_SETTINGS.masterVolume, music: DEFAULT_SETTINGS.musicVolume, sfx: DEFAULT_SETTINGS.sfxVolume };
  let tickClock = 0;
  let wantedTrack: ReturnType<typeof chooseTrack> = null;
  let wantedDuck = 1;
  let failed = false;

  function applyVolumes(): void {
    if (!ctx || !master || !musicBus || !sfxBus) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(vol.master, t, VOLUME_SMOOTH_S);
    musicBus.gain.setTargetAtTime(vol.music * MUSIC_BUS_LEVEL, t, VOLUME_SMOOTH_S);
    sfxBus.gain.setTargetAtTime(vol.sfx, t, VOLUME_SMOOTH_S);
  }

  function build(c: AudioContext): void {
    master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = COMPRESSOR.threshold;
    comp.knee.value = COMPRESSOR.knee;
    comp.ratio.value = COMPRESSOR.ratio;
    comp.attack.value = COMPRESSOR.attack;
    comp.release.value = COMPRESSOR.release;
    master.connect(comp);
    comp.connect(c.destination);
    musicBus = c.createGain();
    sfxBus = c.createGain();
    musicBus.connect(master);
    sfxBus.connect(master);
    base = { ctx: c, noise: createNoiseBuffer(c, rand), pulse: createPulseWave(c), rand };
    music = createMusicEngine(c, musicBus, base, opts.timer);
    music.start();
    ctx = c;
    applyVolumes();
  }

  function unlock(): void {
    if (failed) return;
    try {
      if (!ctx) {
        const c = opts.createContext ? opts.createContext() : browserContext();
        if (!c) {
          failed = true;
          return;
        }
        build(c);
      }
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    } catch {
      failed = true;
      ctx = null;
    }
  }

  function play(id: SoundId): void {
    if (!ctx || !base || !sfxBus) return;
    const def = SFX[id];
    const now = ctx.currentTime;
    if (!throttle.allow(id, now, def.throttle)) return;
    if (!limiter.tryAcquire(now, def.dur)) return;
    const pitch = 1 + (rand() * 2 - 1) * def.pitchVar;
    try {
      def.play({ ...base, out: sfxBus, pitch }, now + SCHEDULE_AHEAD_S);
    } catch {
      /* a failed voice must never break the game loop */
    }
  }

  function tallyTicks(state: GameState | null, dt: number): void {
    if (state && state.phase === 'chapter_complete' && tallyCounting(state.phaseTimer)) {
      tickClock += dt;
      if (tickClock >= TALLY_TICK_EVERY_S) {
        tickClock %= TALLY_TICK_EVERY_S;
        play('tick');
      }
    } else {
      tickClock = TALLY_TICK_EVERY_S;
    }
  }

  return {
    unlock,
    handleEvents(events: readonly GameEvent[]): void {
      if (!ctx) return;
      for (const id of soundsForEvents(events)) play(id);
    },
    update(screen: AppScreen, state: GameState | null, frameDt: number): void {
      const choice = chooseTrack(screen, state);
      if (choice !== undefined) wantedTrack = choice;
      wantedDuck = duckLevel(screen, state);
      if (!ctx || !music) return;
      music.setTrack(wantedTrack ?? null);
      music.setDuck(wantedDuck);
      if (screen === 'playing') tallyTicks(state, frameDt);
    },
    setVolumes(masterVolume: number, musicVolume: number, sfxVolume: number): void {
      const c01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
      vol = { master: c01(masterVolume), music: c01(musicVolume), sfx: c01(sfxVolume) };
      applyVolumes();
    },
    ui(sound: UiSound): void {
      play(uiSoundId(sound));
    },
  };
}
