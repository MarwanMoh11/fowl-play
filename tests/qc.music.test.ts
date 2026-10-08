// tests/qc.music.test.ts — OWNER: QC. Music scheduler after stalls, end-of-track fade, duck automation churn.
import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/sim/types';
import { harness } from './qc.helpers';

const TICK = 0.025;
// Chapter 1 in a fast track (132 BPM, a 16th note every 0.11 s), so a short stall leaves several steps due at once.
const playing = { phase: 'wave_active', enemies: [], mode: 'campaign', chapter: 1 } as unknown as GameState;

describe('music scheduler after a stall', () => {
  for (const stall of [0.38, 3]) {
    it(`plays at most one late step after a ${stall} s stall instead of a burst`, () => {
      const h = harness({ doc: null });
      h.audio.unlock();
      h.audio.update('playing', playing, TICK);
      h.pump();
      for (let i = 0; i < 8; i++) {
        h.ctx.advance(TICK);
        h.pump();
      }
      const from = h.ctx.starts.length;
      h.ctx.advance(stall); // the timer did not run during the stall
      h.pump();
      const now = h.ctx.currentTime;
      const fresh = h.ctx.starts.slice(from).map((s) => s.t);
      expect(fresh.length).toBeGreaterThan(0);
      // Every note that fell due before `now` shares one step time, so at most one step sounds late.
      const late = new Set(fresh.filter((t) => t < now));
      expect(late.size).toBeLessThanOrEqual(1);
    });
  }
});

describe('track end', () => {
  it('fades the last sound out before its gain is disconnected', () => {
    const h = harness({ doc: null });
    h.audio.unlock();
    // gameover is a 2-bar, non-looping track at 80 BPM (about 6 s), then it rings out and is removed
    for (let t = 0; t < 12; t += TICK) {
      h.ctx.advance(TICK);
      h.audio.update('gameover', null, TICK);
      h.pump();
    }
    const ramps = h.ctx.params.filter((p) => p.method === 'linearRampToValueAtTime' && p.args[0] === 0);
    expect(ramps.length).toBeGreaterThan(0);
    const fade = ramps[ramps.length - 1];
    const cuts = fade.owner.disconnectedAt;
    expect(cuts.length).toBeGreaterThan(0);
    expect(Math.min(...cuts)).toBeGreaterThanOrEqual(fade.args[1]);
  });
});

describe('duck automation', () => {
  it('sends the duck level to the audio clock only when it changes', () => {
    const h = harness({ doc: null });
    h.audio.unlock();
    h.audio.update('title', null, TICK);
    const count = (): number => h.ctx.params.filter((p) => p.method === 'setTargetAtTime').length;
    h.audio.update('paused', null, TICK);
    const before = count();
    for (let i = 0; i < 100; i++) h.audio.update('paused', null, TICK);
    expect(count()).toBe(before);
  });
});
