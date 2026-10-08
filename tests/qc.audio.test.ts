// tests/qc.audio.test.ts — OWNER: QC. Node cleanup over a long run, voice caps, clock suspension, visibility, unlock states.
import { describe, expect, it } from 'vitest';
import { MAX_VOICES, MAX_VOICES_PER_SOUND, VoiceLimiter } from '../src/audio/voices';
import type { GameEvent } from '../src/sim/events';
import type { GameState } from '../src/sim/types';
import { harness, type FakeNode } from './qc.helpers';

const FRAME = 1 / 60;
const fire: GameEvent = { type: 'player_fire', weapon: 'pulse', power: 0, x: 0, y: 0 };
const splat: GameEvent = { type: 'egg_splat', x: 0, y: 0 };
const playing = { phase: 'wave_active', enemies: [], mode: 'campaign', chapter: 1 } as unknown as GameState;

describe('voice caps', () => {
  it('caps one sound at MAX_VOICES_PER_SOUND and the whole mix at MAX_VOICES', () => {
    const lim = new VoiceLimiter();
    for (let i = 0; i < MAX_VOICES_PER_SOUND; i++) expect(lim.tryAcquire(0, 1, 'hit')).toBe(true);
    expect(lim.tryAcquire(0, 1, 'hit')).toBe(false);
    expect(lim.active(0)).toBe(MAX_VOICES_PER_SOUND);
    for (let i = 0; lim.active(0) < MAX_VOICES; i++) expect(lim.tryAcquire(0, 1, `other${i}`)).toBe(true);
    expect(lim.active(0)).toBe(MAX_VOICES);
    expect(lim.tryAcquire(0, 1, 'fresh')).toBe(false);
    expect(lim.tryAcquire(1.5, 1, 'fresh')).toBe(true);
  });

  it('keeps voices without a key under the global cap only', () => {
    const lim = new VoiceLimiter();
    for (let i = 0; i < MAX_VOICES; i++) expect(lim.tryAcquire(0, 1)).toBe(true);
    expect(lim.tryAcquire(0, 1)).toBe(false);
  });

  it('bounds a bullet-hell burst of one sound to its share of voices', () => {
    const h = harness({ doc: null });
    h.audio.unlock();
    for (let i = 0; i < 40; i++) h.audio.handleEvents([{ type: 'overheat' }]);
    // overheat is 3 oscillators per play; a single sound never holds more than its share of voices
    expect(h.ctx.created.osc).toBeLessThanOrEqual(MAX_VOICES_PER_SOUND * 3);
  });
});

describe('node cleanup', () => {
  it('disconnects every finished voice, so a two-minute run keeps a bounded graph', () => {
    const h = harness({ doc: null });
    h.audio.unlock();
    const edgesAt: number[] = [];
    for (let frame = 0; frame < 60 * 120; frame++) {
      h.ctx.advance(FRAME);
      h.audio.update('playing', playing, FRAME);
      if (frame % 6 === 0) h.audio.handleEvents([fire]);
      if (frame % 9 === 0) h.audio.handleEvents([splat]);
      h.pump();
      if (frame % 1800 === 0) edgesAt.push(h.ctx.edges());
    }
    expect(h.ctx.created.osc ?? 0).toBeGreaterThan(1000);
    const finishedButConnected = h.ctx.started.filter((n: FakeNode) => n.finished && n.disconnectedAt.length === 0);
    expect(finishedButConnected).toHaveLength(0);
    // Steady state: the 4th sample (after 90 s) holds no more connections than the 2nd (after 30 s).
    expect(edgesAt).toHaveLength(4);
    expect(edgesAt[3]).toBeLessThanOrEqual(edgesAt[1] + 20);
  });
});

describe('clock state', () => {
  it('schedules nothing while the context is not running, and plays again once it is', () => {
    const h = harness({ doc: null });
    h.audio.unlock();
    const before = h.ctx.created.osc ?? 0;
    h.ctx.state = 'suspended';
    h.audio.handleEvents([fire, splat]);
    h.audio.ui('select');
    expect(h.ctx.created.osc ?? 0).toBe(before);
    h.ctx.state = 'running';
    h.audio.handleEvents([fire]);
    expect(h.ctx.created.osc ?? 0).toBeGreaterThan(before);
  });

  it('resumes an interrupted context on the next gesture, and never creates a second context', () => {
    const h = harness({ doc: null });
    h.ctx.state = 'interrupted';
    h.audio.unlock();
    h.audio.unlock();
    h.audio.unlock();
    expect(h.ctx.resumes).toBe(1);
    expect(h.ctx.state).toBe('running');
    expect(h.contextsCreated.count).toBe(1);
  });

  it('stops the clock while the page is hidden and restarts it when it is visible again', () => {
    const h = harness();
    h.audio.unlock();
    h.audio.update('playing', playing, FRAME);
    h.doc.hidden = true;
    for (const fn of h.doc.listeners) fn();
    expect(h.ctx.state).toBe('suspended');
    expect(h.ctx.suspends).toBe(1);
    h.doc.hidden = false;
    for (const fn of h.doc.listeners) fn();
    expect(h.ctx.state).toBe('running');
    expect(h.ctx.resumes).toBe(1);
    expect(h.contextsCreated.count).toBe(1);
  });

  it('survives a hidden page before any gesture (nothing to suspend)', () => {
    const h = harness();
    h.doc.hidden = true;
    expect(() => {
      for (const fn of h.doc.listeners) fn();
    }).not.toThrow();
    expect(h.contextsCreated.count).toBe(0);
  });
});
