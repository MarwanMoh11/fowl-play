// tests/a4.helpers.ts — OWNER: A4. Fakes shared by A4 tests (not a test file).
import type { KV } from '../src/ui/storage';

export function memoryKV(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  };
}

export function throwingKV(): KV {
  const boom = (): never => {
    throw new Error('storage blocked');
  };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

export interface Call { name: string; args: unknown[] }

/** A 2D context stand-in that records method calls and swallows property writes. */
export function recordingContext(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const gradient = { addColorStop: (): void => {} };
  const props: Record<string, unknown> = {};
  const ctx = new Proxy({}, {
    get(_t, name: string) {
      if (name in props) return props[name];
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient;
      return (...args: unknown[]) => {
        calls.push({ name, args });
      };
    },
    set(_t, name: string, value: unknown) {
      props[name] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

export interface FakeAudio {
  ctx: AudioContext;
  state: { currentTime: number; running: 'running' | 'suspended' };
  /** Number of nodes created by name (createOscillator, createBufferSource, ...). */
  created: Record<string, number>;
  resumed: { count: number };
}

/** Deep, callable stand-in for any Web Audio node or AudioParam: every property and call returns another stand-in. */
function anyNode(store: Record<string, unknown> = {}): unknown {
  return new Proxy(function stand() {}, {
    get(_t, name: string | symbol) {
      if (typeof name === 'symbol') return undefined;
      if (name in store) return store[name];
      if (name === 'value') return 0;
      return anyNode();
    },
    set(_t, name: string | symbol, value: unknown) {
      if (typeof name === 'string') store[name] = value;
      return true;
    },
    apply() {
      return anyNode();
    },
  });
}

export function fakeAudioContext(): FakeAudio {
  const state = { currentTime: 0, running: 'running' as 'running' | 'suspended' };
  const created: Record<string, number> = {};
  const resumed = { count: 0 };
  const ctx = new Proxy({}, {
    get(_t, name: string) {
      if (name === 'currentTime') return state.currentTime;
      if (name === 'state') return state.running;
      if (name === 'sampleRate') return 8000;
      if (name === 'destination') return anyNode();
      if (name === 'resume') {
        return () => {
          resumed.count += 1;
          state.running = 'running';
          return Promise.resolve();
        };
      }
      if (name === 'createBuffer') {
        return (_ch: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
      }
      return () => {
        created[name] = (created[name] ?? 0) + 1;
        return anyNode();
      };
    },
  }) as unknown as AudioContext;
  return { ctx, state, created, resumed };
}
