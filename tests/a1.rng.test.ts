// tests/a1.rng.test.ts — OWNER: A1
import { describe, expect, it } from 'vitest';
import { rngChance, rngInt, rngNext, rngPick, rngRange } from '../src/sim/rng';
import type { RngState } from '../src/sim/types';

describe('rng', () => {
  it('same seed gives the same sequence', () => {
    const a: RngState = { s: 42 };
    const b: RngState = { s: 42 };
    const sa = Array.from({ length: 1000 }, () => rngNext(a));
    const sb = Array.from({ length: 1000 }, () => rngNext(b));
    expect(sa).toEqual(sb);
    expect(a).toEqual(b);
  });

  it('different seeds give different sequences', () => {
    const a: RngState = { s: 1 };
    const b: RngState = { s: 2 };
    expect(rngNext(a)).not.toBe(rngNext(b));
  });

  it('state stays a JSON-safe uint32', () => {
    const r: RngState = { s: 0xffffffff };
    for (let i = 0; i < 100; i++) rngNext(r);
    expect(Number.isInteger(r.s)).toBe(true);
    expect(r.s).toBeGreaterThanOrEqual(0);
    expect(r.s).toBeLessThanOrEqual(0xffffffff);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it('respects range bounds', () => {
    const r: RngState = { s: 7 };
    const seenInts = new Set<number>();
    for (let i = 0; i < 20000; i++) {
      const f = rngNext(r);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const x = rngRange(r, -3, 5);
      expect(x).toBeGreaterThanOrEqual(-3);
      expect(x).toBeLessThan(5);
      const n = rngInt(r, 2, 6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(6);
      seenInts.add(n);
    }
    expect([...seenInts].sort()).toEqual([2, 3, 4, 5, 6]);
  });

  it('rngChance and rngPick behave', () => {
    const r: RngState = { s: 99 };
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (rngChance(r, 0.25)) hits++;
    expect(hits).toBeGreaterThan(2200);
    expect(hits).toBeLessThan(2800);
    expect(rngChance(r, 0)).toBe(false);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(arr).toContain(rngPick(r, arr));
  });
});
