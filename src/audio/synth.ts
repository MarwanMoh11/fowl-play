// src/audio/synth.ts — OWNER: A4. Web Audio voice helpers (§8.8). Nothing here runs at import time.
export const SILENCE = 0.0001;
const DEFAULT_ATTACK = 0.002;
const STOP_PAD = 0.03;
const NOISE_SECONDS = 1;
const PULSE_DUTY = 0.25;
const PULSE_HARMONICS = 32;
const DISTORTION_DRIVE = 5;
const DISTORTION_SAMPLES = 256;

/** Everything a sound recipe needs: the context, where to connect, shared buffers and the pitch multiplier. */
export interface VoiceEnv {
  ctx: AudioContext;
  out: AudioNode;
  noise: AudioBuffer;
  pulse: PeriodicWave;
  /** Multiplies every frequency in the recipe (random per-play variation). */
  pitch: number;
  rand: () => number;
}

export interface ToneOpts {
  type: OscillatorType | 'pulse';
  f0: number;
  /** Exponential glide target over attack + sustain + decay. */
  f1?: number;
  /** Frequencies at equal spacing across the whole note (linear segments); overrides f0/f1. */
  path?: readonly number[];
  /** Decay to silence, seconds. */
  d: number;
  a?: number;
  /** Seconds held at full gain between attack and decay. */
  sustain?: number;
  gain: number;
  lp?: number;
  bp?: readonly [number, number];
  /** Amplitude LFO in Hz. */
  tremolo?: number;
  distort?: boolean;
}

export interface NoiseOpts {
  filter: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  d: number;
  a?: number;
  gain: number;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Fourier coefficients of a pulse wave with the given duty cycle (0..1). */
export function pulseWaveCoefs(duty: number, harmonics = PULSE_HARMONICS): { real: Float32Array; imag: Float32Array } {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) {
    real[n] = Math.sin(2 * Math.PI * n * duty) / (Math.PI * n);
    imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (Math.PI * n);
  }
  return { real, imag };
}

export function createPulseWave(ctx: AudioContext, duty = PULSE_DUTY): PeriodicWave {
  const { real, imag } = pulseWaveCoefs(duty);
  return ctx.createPeriodicWave(real, imag);
}

export function createNoiseBuffer(ctx: AudioContext, rand: () => number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * NOISE_SECONDS));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
  return buf;
}

let distortionCurve: Float32Array | null = null;

/** Soft-clip curve for the boss roar. */
export function getDistortionCurve(): Float32Array {
  if (distortionCurve) return distortionCurve;
  const curve = new Float32Array(DISTORTION_SAMPLES);
  for (let i = 0; i < DISTORTION_SAMPLES; i++) {
    const x = (i / (DISTORTION_SAMPLES - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * DISTORTION_DRIVE);
  }
  distortionCurve = curve;
  return curve;
}

function envelope(g: AudioParam, t: number, a: number, sustain: number, d: number, peak: number): void {
  g.setValueAtTime(SILENCE, t);
  g.linearRampToValueAtTime(peak, t + a);
  if (sustain > 0) g.setValueAtTime(peak, t + a + sustain);
  g.exponentialRampToValueAtTime(SILENCE, t + a + sustain + d);
}

/** Disconnects a finished voice's nodes, so a long session does not keep every dead voice in the graph. */
function releaseWhenEnded(src: AudioScheduledSourceNode, nodes: readonly AudioNode[]): void {
  src.onended = () => {
    for (const n of nodes) n.disconnect();
  };
}

/** Plays one enveloped oscillator note starting at time t. Returns its total length in seconds. */
export function tone(env: VoiceEnv, t: number, o: ToneOpts): number {
  const { ctx } = env;
  const a = o.a ?? DEFAULT_ATTACK;
  const sustain = o.sustain ?? 0;
  const total = a + sustain + o.d;
  const osc = ctx.createOscillator();
  if (o.type === 'pulse') osc.setPeriodicWave(env.pulse);
  else osc.type = o.type;
  if (o.path && o.path.length > 1) {
    osc.frequency.setValueAtTime(o.path[0] * env.pitch, t);
    for (let i = 1; i < o.path.length; i++) {
      osc.frequency.linearRampToValueAtTime(o.path[i] * env.pitch, t + (i / (o.path.length - 1)) * total);
    }
  } else {
    osc.frequency.setValueAtTime(o.f0 * env.pitch, t);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(o.f1 * env.pitch, t + total);
  }
  const g = ctx.createGain();
  envelope(g.gain, t, a, sustain, o.d, o.gain);
  const chain: AudioNode[] = [osc];
  let tail: AudioNode = osc;
  const insert = (node: AudioNode): void => {
    tail.connect(node);
    tail = node;
    chain.push(node);
  };
  if (o.lp !== undefined) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    insert(f);
  }
  if (o.bp) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = o.bp[0];
    f.Q.value = o.bp[1];
    insert(f);
  }
  if (o.distort) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = getDistortionCurve() as Float32Array<ArrayBuffer>;
    insert(shaper);
  }
  insert(g);
  if (o.tremolo !== undefined) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.tremolo;
    const depth = ctx.createGain();
    depth.gain.value = o.gain * 0.5;
    lfo.connect(depth);
    depth.connect(g.gain);
    lfo.start(t);
    lfo.stop(t + total + STOP_PAD);
    releaseWhenEnded(lfo, [lfo, depth]);
  }
  tail.connect(env.out);
  osc.start(t);
  osc.stop(t + total + STOP_PAD);
  releaseWhenEnded(osc, chain);
  return total;
}

/** Plays a filtered burst of white noise starting at time t. Returns its total length in seconds. */
export function noise(env: VoiceEnv, t: number, o: NoiseOpts): number {
  const { ctx } = env;
  const a = o.a ?? DEFAULT_ATTACK;
  const total = a + o.d;
  const src = ctx.createBufferSource();
  src.buffer = env.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(o.f1, t + total);
  if (o.q !== undefined) f.Q.value = o.q;
  const g = ctx.createGain();
  envelope(g.gain, t, a, 0, o.d, o.gain);
  src.connect(f);
  f.connect(g);
  g.connect(env.out);
  src.start(t, env.rand() * (NOISE_SECONDS * 0.5));
  src.stop(t + total + STOP_PAD);
  releaseWhenEnded(src, [src, f, g]);
  return total;
}

/** Equal-length notes one after another. */
export function arpeggio(
  env: VoiceEnv, t: number, freqs: readonly number[], noteLen: number, type: ToneOpts['type'], gain: number,
): void {
  freqs.forEach((f, i) => {
    tone(env, t + i * noteLen, { type, f0: f, d: noteLen * 0.95, a: 0.003, gain });
  });
}
