// tests/h3.onslaught.test.ts — OWNER: H3. The onslaught generator: deterministic, valid for sectors 1–30, unlock rules, names.
import { describe, expect, it } from 'vitest';
import {
  generateOnslaughtWave, groupCost, lettersFor, onslaughtBudget, onslaughtSectorName,
} from '../src/sim/onslaught';
import { BOSS_RUSH_ORDER } from '../src/sim/modes';
import { patternPlanned } from '../src/sim/patterns';
import type { GroupSpec, KindLetter, WaveDef } from '../src/sim/waves.types';

const SEED = 0x5eed1234;

/** Every kind letter a spec uses (grid rows, stream kind, ring kinds, bouncer kinds). */
function lettersOf(spec: GroupSpec): string[] {
  switch (spec.pattern) {
    case 'grid': case 'swoop': case 'divers': return [...spec.rowKinds];
    case 'stream': return [spec.kind];
    case 'ring': return spec.rings.map((r) => r.kind);
    case 'bouncers': return Object.keys(spec.kinds);
    default: return [];
  }
}

function allWaves(seed = SEED, sectors = 30): { sector: number; wave: number; def: WaveDef }[] {
  const out: { sector: number; wave: number; def: WaveDef }[] = [];
  for (let sector = 1; sector <= sectors; sector++) {
    for (let wave = 1; wave <= 10; wave++) out.push({ sector, wave, def: generateOnslaughtWave(seed, sector, wave) });
  }
  return out;
}

describe('onslaught generator', () => {
  it('is deterministic: the same seed, sector and wave give the same wave', () => {
    for (const [sector, wave] of [[1, 1], [3, 7], [12, 5], [30, 10]] as const) {
      const a = JSON.stringify(generateOnslaughtWave(SEED, sector, wave));
      const b = JSON.stringify(generateOnslaughtWave(SEED, sector, wave));
      expect(a).toBe(b);
    }
  });

  it('different seeds give different waves', () => {
    const a = JSON.stringify(allWaves(1, 5).map((x) => x.def));
    const b = JSON.stringify(allWaves(2, 5).map((x) => x.def));
    expect(a).not.toBe(b);
  });

  it('wave 10 is the sector boss cycling the boss-rush order; wave 5 of sectors 2+ is a mini-boss', () => {
    for (let sector = 1; sector <= 30; sector++) {
      const w10 = generateOnslaughtWave(SEED, sector, 10);
      expect(w10.groups).toEqual([{ pattern: 'boss', boss: BOSS_RUSH_ORDER[(sector - 1) % 12] }]);
      const w5 = generateOnslaughtWave(SEED, sector, 5);
      if (sector >= 2) {
        expect(w5.groups).toHaveLength(1);
        const g = w5.groups[0];
        expect(g.pattern === 'boss' && g.boss.startsWith('mini_')).toBe(true);
      } else {
        expect(w5.groups.some((g) => g.pattern !== 'boss')).toBe(true);
      }
    }
  });

  it('is valid for sectors 1–30: 1–3 spawning groups, exact planned counts, unlocked letters only', () => {
    for (const { sector, wave, def } of allWaves()) {
      if (wave === 10 || (wave === 5 && sector >= 2)) continue;
      expect(def.groups.length, `s${sector}w${wave} groups`).toBeGreaterThanOrEqual(1);
      expect(def.groups.length, `s${sector}w${wave} groups`).toBeLessThanOrEqual(3);
      const unlocked = new Set<string>(lettersFor(sector));
      for (const spec of def.groups) {
        expect(patternPlanned(spec), `s${sector}w${wave} ${spec.pattern} planned`).toBeGreaterThan(0);
        for (const l of lettersOf(spec)) {
          expect(unlocked.has(l), `s${sector}w${wave} letter ${l} locked`).toBe(true);
        }
      }
    }
  });

  it('keeps most waves within the threat budget B = 18 + 6·sector + 2·wave', () => {
    let within = 0;
    let total = 0;
    for (const { sector, wave, def } of allWaves()) {
      if (wave === 10 || (wave === 5 && sector >= 2)) continue;
      total++;
      const cost = def.groups.reduce((sum, g) => sum + groupCost(g), 0);
      if (cost <= onslaughtBudget(sector, wave)) within++;
    }
    expect(within / total).toBeGreaterThan(0.9);
  });

  it('unlocks letters by sector: 1 B R A, 2 +C U N X, 3 +S T, 4 +G H W, 5+ all', () => {
    expect([...lettersFor(1)].sort()).toEqual(['A', 'B', 'R']);
    expect(lettersFor(2)).toEqual(expect.arrayContaining(['C', 'U', 'N', 'X']));
    expect(lettersFor(2)).not.toContain('S' as KindLetter);
    expect(lettersFor(3)).toEqual(expect.arrayContaining(['S', 'T']));
    expect(lettersFor(4)).toEqual(expect.arrayContaining(['G', 'H', 'W']));
    expect(lettersFor(5)).toEqual(expect.arrayContaining(['K', 'M', 'V', 'E']));
  });

  it('names waves "Adjective Noun" and sectors "Sector n — name" over a 12-entry cycle', () => {
    for (const { def } of allWaves(SEED, 4)) expect(def.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(onslaughtSectorName(1)).toBe('Sector 1 — Eggfall Reach');
    expect(onslaughtSectorName(13)).toBe('Sector 13 — Eggfall Reach');
    expect(onslaughtSectorName(2)).not.toBe(onslaughtSectorName(1));
  });
});
