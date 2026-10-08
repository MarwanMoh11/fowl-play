// tests/a3.chapters.test.ts — OWNER: A3. Chapter/wave tables (§7.12) and endless naming.
import { describe, expect, it } from 'vitest';
import { CHAPTERS, chapterDisplayName, toRoman, waveDef } from '../src/sim/chapters';
import { patternPlanned } from '../src/sim/patterns';
import { waveInfo } from '../src/sim/waves';
import { KIND_LETTERS } from '../src/sim/tuning/enemies';
import type { GroupSpec } from '../src/sim/waves.types';

const BOSSES = ['hen', 'carrier', 'rooster', 'twin_hens', 'dreadnought', 'broodmother', 'rotisserie', 'colossus', 'kraken', 'phoenix', 'scrambler', 'empress'];
const MINIS = ['mini_brigadier', 'mini_ace', 'mini_cuckoo', 'mini_jelly', 'mini_stormcrow', 'mini_scarecrow', 'mini_guard'];

function letters(spec: GroupSpec): string[] {
  switch (spec.pattern) {
    case 'grid':
    case 'swoop':
    case 'divers': return spec.rowKinds.split('');
    case 'stream': return [spec.kind];
    case 'ring': return spec.rings.map((r) => r.kind);
    case 'bouncers': return Object.keys(spec.kinds);
    case 'ufo': return ['U'];
    case 'swarm': return ['C'];
    default: return [];
  }
}

describe('chapter tables', () => {
  it('has 12 chapters of 10 waves', () => {
    expect(CHAPTERS).toHaveLength(12);
    for (const c of CHAPTERS) expect(c.waves).toHaveLength(10);
  });

  it('wave 10 is the boss, wave 5 of chapters 6–12 the mini-boss; other waves are not bosses', () => {
    CHAPTERS.forEach((_, ci) => {
      for (let w = 1; w <= 10; w++) {
        const info = waveInfo(ci + 1, w);
        if (w === 10) {
          expect(info.isBoss).toBe(true);
          expect(info.boss).toBe(BOSSES[ci]);
        } else if (w === 5 && ci >= 5) {
          expect(info.isBoss).toBe(true);
          expect(info.boss).toBe(MINIS[ci - 5]);
        } else {
          expect(info.isBoss).toBe(false);
          expect(info.boss).toBeNull();
        }
      }
    });
  });

  it('every kind letter is valid, counts are positive and names are non-empty', () => {
    CHAPTERS.forEach((ch, ci) => {
      expect(ch.name.length).toBeGreaterThan(0);
      ch.waves.forEach((wave, wi) => {
        expect(wave.name.length).toBeGreaterThan(0);
        expect(wave.groups.length).toBeGreaterThan(0);
        for (const g of wave.groups) {
          for (const l of letters(g)) expect(KIND_LETTERS[l], `${ci + 1}-${wi + 1} ${g.pattern} ${l}`).toBeDefined();
          if (g.pattern !== 'boss') expect(patternPlanned(g)).toBeGreaterThan(0);
        }
      });
    });
  });

  it('matches the spec on planned counts (chapter 1 and chapter 5 samples)', () => {
    const planned = (c: number, w: number): number => waveDef(c, w).groups.reduce((s, g) => s + patternPlanned(g), 0);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => planned(1, w))).toEqual([32, 30, 40, 24, 26, 12, 32, 24, 50, 0]);
    expect(planned(2, 5)).toBe(4 + 16);
    expect(planned(3, 7)).toBe(60);
    expect(planned(4, 4)).toBe(8 + 12 + 16 + 20);
    expect(planned(5, 3)).toBe(70 + 2);
    expect(planned(5, 8)).toBe(28 + 20);
    expect(planned(5, 9)).toBe(72 + 2);
  });

  it('delays: "+N" groups start later than the first group', () => {
    const w = waveDef(2, 5).groups;
    expect(w[0].delay ?? 0).toBe(0);
    expect(w[1].delay).toBe(2.0);
    expect(waveDef(5, 3).groups[1].delay).toBe(3.0);
    expect(waveDef(5, 8).groups[1].delay).toBe(4.0);
    expect(waveDef(5, 9).groups[1].delay).toBe(5.0);
  });
});

describe('endless naming and reuse', () => {
  it('waveInfo(13, 1) is "Low Orbit II" and later loops use roman numerals', () => {
    expect(waveInfo(13, 1).chapterName).toBe('Low Orbit II');
    expect(waveInfo(25, 3).chapterName).toBe('Low Orbit III');
    expect(waveInfo(37, 1).chapterName).toBe('Low Orbit IV');
    expect(chapterDisplayName(17)).toBe('The Mother Coop II');
    expect(chapterDisplayName(1)).toBe('Low Orbit');
  });

  it('chapters beyond 12 reuse the same waves', () => {
    expect(waveInfo(13, 4).waveName).toBe(waveInfo(1, 4).waveName);
    expect(waveInfo(16, 10).boss).toBe('twin_hens');
    expect(waveDef(15, 2)).toBe(waveDef(3, 2));
  });

  it('toRoman', () => {
    expect([1, 2, 3, 4, 5, 9, 14, 40].map(toRoman)).toEqual(['I', 'II', 'III', 'IV', 'V', 'IX', 'XIV', 'XL']);
  });
});
