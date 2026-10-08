// tests/qc.params.test.ts — OWNER: QC. URL parameter parsing edge cases (debug switches, clamps, mutator ids).
import { describe, expect, it } from 'vitest';
import { parseMutators, parseParams } from '../src/app/params';
import { MUTATOR_IDS } from '../src/sim/tuning/loadout';

describe('mutator parameter', () => {
  it('keeps only real mutator ids, each once', () => {
    const real = MUTATOR_IDS[0];
    expect(parseMutators(`${real},${real}`)).toEqual([real]);
    expect(parseMutators('constructor,__proto__,toString,hasOwnProperty,,nope')).toEqual([]);
    expect(parseMutators('')).toEqual([]);
  });

  it('reads mutators from the query string', () => {
    const real = MUTATOR_IDS[0];
    expect(parseParams(`?mutators=${real},constructor`).mutators).toEqual([real]);
    expect(parseParams('').mutators).toEqual([]);
  });
});

describe('url parameters', () => {
  it('turns debug on only for debug=1', () => {
    expect(parseParams('?debug=1').debug).toBe(true);
    expect(parseParams('?debug=true').debug).toBe(false);
    expect(parseParams('?debug=0').debug).toBe(false);
  });

  it('clamps numbers and drops unknown names', () => {
    const p = parseParams('?seed=abc&chapter=0&wave=99&difficulty=insane&mode=nope&ship=zzz');
    expect(p.seed).toBeNull();
    expect(p.chapter).toBe(1);
    expect(p.wave).toBe(10);
    expect(p.difficulty).toBeNull();
    expect(p.mode).toBeNull();
    expect(p.ship).toBeNull();
  });

  it('ignores non-finite numbers and empty values', () => {
    const p = parseParams('?seed=&chapter=Infinity&wave=1e400');
    expect(p.seed).toBeNull();
    expect(p.chapter).toBeNull();
    expect(p.wave).toBeNull();
    expect(parseParams('?seed=-5').seed).toBe(0);
  });
});
