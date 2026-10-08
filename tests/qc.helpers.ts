// tests/qc.helpers.ts — OWNER: QC. Fake Web Audio graph that tracks connections, disconnects, scheduled
// starts and stops, and fires `onended` when the fake clock passes a source's stop time. Not a test file.
import type { AudioSystem } from '../src/shared/contracts';
import { createAudio } from '../src/audio';
import type { MusicTimer } from '../src/audio/music';

export interface ParamLog { owner: FakeNode; method: string; args: number[]; at: number }

export class FakeParam {
  value = 0;
  constructor(readonly owner: FakeNode, readonly c: FakeCtx, value = 0) {
    this.value = value;
  }
  private log(method: string, args: number[]): void {
    this.c.params.push({ owner: this.owner, method, args, at: this.c.currentTime });
  }
  setValueAtTime(v: number, t: number): this { this.log('setValueAtTime', [v, t]); return this; }
  linearRampToValueAtTime(v: number, t: number): this { this.log('linearRampToValueAtTime', [v, t]); return this; }
  exponentialRampToValueAtTime(v: number, t: number): this { this.log('exponentialRampToValueAtTime', [v, t]); return this; }
  setTargetAtTime(v: number, t: number, tc: number): this { this.log('setTargetAtTime', [v, t, tc]); return this; }
  cancelScheduledValues(t: number): this { this.log('cancelScheduledValues', [t]); return this; }
}

export class FakeNode {
  readonly connections: FakeNode[] = [];
  disconnectedAt: number[] = [];
  startAt = Number.NaN;
  stopAt = Number.POSITIVE_INFINITY;
  onended: (() => void) | null = null;
  finished = false;
  [key: string]: unknown;
  constructor(readonly kind: string, readonly c: FakeCtx) {}
  connect(dst: FakeNode): FakeNode {
    this.connections.push(dst);
    return dst;
  }
  disconnect(): void {
    this.connections.length = 0;
    this.disconnectedAt.push(this.c.currentTime);
  }
  start(t: number): void {
    this.startAt = t;
    this.c.starts.push({ kind: this.kind, t });
    this.c.started.push(this);
    this.c.sources.push(this);
  }
  stop(t: number): void {
    this.stopAt = t;
  }
  setPeriodicWave(): void {}
}

export class FakeCtx {
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = 'running';
  destination: FakeNode;
  params: ParamLog[] = [];
  starts: { kind: string; t: number }[] = [];
  /** Every source ever started, and the ones still playing. */
  started: FakeNode[] = [];
  sources: FakeNode[] = [];
  created: Record<string, number> = {};
  resumes = 0;
  suspends = 0;
  constructor() {
    this.destination = new FakeNode('destination', this);
  }
  private make(kind: string, extra: Record<string, unknown> = {}): FakeNode {
    this.created[kind] = (this.created[kind] ?? 0) + 1;
    const n = new FakeNode(kind, this);
    Object.assign(n, extra);
    return n;
  }
  createGain(): FakeNode {
    const n = this.make('gain');
    n.gain = new FakeParam(n, this, 1);
    return n;
  }
  createOscillator(): FakeNode {
    const n = this.make('osc', { type: 'sine' });
    n.frequency = new FakeParam(n, this);
    return n;
  }
  createBufferSource(): FakeNode { return this.make('bufsrc', { loop: false, buffer: null }); }
  createBiquadFilter(): FakeNode {
    const n = this.make('filter', { type: 'lowpass' });
    n.frequency = new FakeParam(n, this);
    n.Q = new FakeParam(n, this);
    return n;
  }
  createWaveShaper(): FakeNode { return this.make('shaper', { curve: null }); }
  createDynamicsCompressor(): FakeNode {
    const n = this.make('comp');
    for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = new FakeParam(n, this);
    return n;
  }
  createPeriodicWave(): object { return {}; }
  createBuffer(_ch: number, length: number): { getChannelData(): Float32Array } {
    return { getChannelData: () => new Float32Array(length) };
  }
  suspend(): Promise<void> {
    this.suspends += 1;
    this.state = 'suspended';
    return Promise.resolve();
  }
  resume(): Promise<void> {
    this.resumes += 1;
    this.state = 'running';
    return Promise.resolve();
  }
  /** Moves the clock forward and fires `onended` for every source whose stop time has passed. */
  advance(dt: number): void {
    this.currentTime += dt;
    const still: FakeNode[] = [];
    for (const s of this.sources) {
      if (s.stopAt <= this.currentTime) {
        s.finished = true;
        s.onended?.();
      } else still.push(s);
    }
    this.sources = still;
  }
  /** Total connections still held by any node: a leak shows up as this growing over time. */
  edges(): number {
    let n = 0;
    const seen = new Set<FakeNode>();
    const visit = (node: FakeNode): void => {
      if (seen.has(node)) return;
      seen.add(node);
      n += node.connections.length;
      for (const c of node.connections) visit(c);
    };
    visit(this.destination);
    return n;
  }
}

export interface TestDoc {
  hidden: boolean;
  listeners: (() => void)[];
  addEventListener(type: string, fn: () => void): void;
}

export interface Harness {
  ctx: FakeCtx;
  audio: AudioSystem;
  /** Runs the scheduler once, as the 25 ms timer would. */
  pump(): void;
  doc: TestDoc;
  contextsCreated: { count: number };
}

export function harness(over: { doc?: TestDoc | null } = {}): Harness {
  const ctx = new FakeCtx();
  let timerFn: (() => void) | null = null;
  const timer: MusicTimer = {
    set: (fn) => {
      timerFn = fn;
      return 1;
    },
    clear: () => {
      timerFn = null;
    },
  };
  const doc: TestDoc | null = over.doc === undefined
    ? {
      hidden: false,
      listeners: [],
      addEventListener(type: string, fn: () => void): void {
        if (type === 'visibilitychange') this.listeners.push(fn);
      },
    }
    : over.doc;
  const contextsCreated = { count: 0 };
  const audio = createAudio({
    createContext: () => {
      contextsCreated.count += 1;
      return ctx as unknown as AudioContext;
    },
    random: () => 0.5,
    timer,
    doc: doc as unknown as Pick<Document, 'hidden' | 'addEventListener'> | null,
  });
  return {
    ctx,
    audio,
    pump: () => timerFn?.(),
    doc: doc as TestDoc,
    contextsCreated,
  };
}
