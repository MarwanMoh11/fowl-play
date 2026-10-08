// tests/h4.profile.test.ts — OWNER: H4. Profile parsing, storage, hangar purchases, corn formula and loadout prefs (§H4 P0-1, P1-7).
import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../src/shared/contracts';
import { bossIdOf } from '../src/ui/codex-data';
import {
  buyShip, buyUpgrade, cornForRun, createProfile, loadLoadoutPrefs, loadProfile, nextUpgradeCost, parseLoadoutPrefs,
  parseProfile, saveLoadoutPrefs, saveProfile, todayYmd, upgradeMaxed,
} from '../src/ui/profile';
import { tableKeyFor } from '../src/ui/highscores';
import { memoryKV, throwingKV } from './a4.helpers';

describe('profile parsing', () => {
  it('returns a fresh profile for missing, null or non-object data', () => {
    for (const raw of [undefined, null, 'x', 42, []]) {
      const p = parseProfile(raw);
      expect(p.corn).toBe(0);
      expect(p.ships).toEqual(['falcon']);
      expect(p.stats.kills).toBe(0);
    }
  });

  it('drops bad entries and clamps numbers instead of throwing', () => {
    const p = parseProfile({
      corn: -5, ships: ['bantam', 'nope', 'bantam'], upgrades: { hull: 99, missiles: 'x', bogus: 3 },
      seenEnemies: ['chick', 'alien'], stats: { kills: 12.7, food: -3 }, best: { campaign: 500, nope: 1 },
      weaponsFired: ['pulse', 7], achievements: { first_blood: '2026-01-01', bad: 5 },
    });
    expect(p.corn).toBe(0);
    expect(p.ships).toEqual(['falcon', 'bantam']);
    expect(p.upgrades).toEqual({ hull: 2 });
    expect(p.seenEnemies).toEqual(['chick']);
    expect(p.stats.kills).toBe(12);
    expect(p.stats.food).toBe(0);
    expect(p.best).toEqual({ campaign: 500 });
    expect(p.weaponsFired).toEqual(['pulse']);
    expect(p.achievements).toEqual({ first_blood: '2026-01-01' });
  });

  it('survives storage that throws or holds broken JSON', () => {
    expect(loadProfile(throwingKV()).corn).toBe(0);
    expect(loadProfile(memoryKV({ [STORAGE_KEYS.profile]: '{not json' })).ships).toEqual(['falcon']);
  });

  it('round-trips through save and load, and null storage gives defaults', () => {
    const kv = memoryKV();
    const p = createProfile();
    p.corn = 320;
    p.ships.push('bulwark');
    saveProfile(p, kv);
    const back = loadProfile(kv);
    expect(back.corn).toBe(320);
    expect(back.ships).toEqual(['falcon', 'bulwark']);
    expect(loadProfile(null).corn).toBe(0);
    expect(() => saveProfile(p, null)).not.toThrow();
  });
});

describe('hangar purchases', () => {
  it('buys a ship only when affordable and not yet owned', () => {
    const p = createProfile();
    p.corn = 399;
    expect(buyShip(p, 'bantam')).toBe(false);
    p.corn = 1000;
    expect(buyShip(p, 'bantam')).toBe(true);
    expect(p.corn).toBe(600);
    expect(buyShip(p, 'bantam')).toBe(false);
    expect(p.ships).toEqual(['falcon', 'bantam']);
  });

  it('buys upgrade levels at rising costs until maxed', () => {
    const p = createProfile();
    p.corn = 10_000;
    expect(nextUpgradeCost(p, 'hull')).toBe(400);
    expect(buyUpgrade(p, 'hull')).toBe(true);
    expect(nextUpgradeCost(p, 'hull')).toBe(900);
    expect(buyUpgrade(p, 'hull')).toBe(true);
    expect(upgradeMaxed(p, 'hull')).toBe(true);
    expect(nextUpgradeCost(p, 'hull')).toBeNull();
    expect(buyUpgrade(p, 'hull')).toBe(false);
    expect(p.corn).toBe(10_000 - 400 - 900);
  });
});

describe('corn and loadout preferences', () => {
  it('pays pickups, one corn per 20 000 points and 15 per boss', () => {
    expect(cornForRun({ corn: 12, score: 45_000, bossesKilled: 2 })).toBe(12 + 2 + 30);
    expect(cornForRun({ corn: 0, score: 0, bossesKilled: 0 })).toBe(0);
    expect(cornForRun({ corn: -4, score: -1, bossesKilled: -1 })).toBe(0);
  });

  it('defaults the loadout prefs and keeps valid ones', () => {
    expect(parseLoadoutPrefs(undefined)).toEqual({ ship: 'falcon', mode: 'campaign', mutators: [] });
    expect(parseLoadoutPrefs({ ship: 'phoenix', mode: 'boss_rush', mutators: ['turbo', 'x', 'turbo'] }))
      .toEqual({ ship: 'phoenix', mode: 'boss_rush', mutators: ['turbo'] });
    expect(parseLoadoutPrefs({ ship: 'zeppelin', mode: 'x' })).toEqual({ ship: 'falcon', mode: 'campaign', mutators: [] });
    const kv = memoryKV();
    saveLoadoutPrefs({ ship: 'bulwark', mode: 'daily', mutators: [] }, kv);
    expect(loadLoadoutPrefs(kv).mode).toBe('daily');
  });

  it('formats the daily date as YYYYMMDD', () => {
    expect(todayYmd(new Date(2026, 9, 8))).toBe(20261008);
  });
});

describe('codex and high-score keys', () => {
  it('maps boss kinds to ids, telling the twin hens apart by name', () => {
    expect(bossIdOf('boss_carrier', null, 'TWIN HENS')).toBe('carrier');
    expect(bossIdOf('boss_hen', 'MOTHER HEN', 'TWIN HENS')).toBe('hen');
    expect(bossIdOf('boss_hen', 'TWIN HENS', 'TWIN HENS')).toBe('twin_hens');
    expect(bossIdOf('boss_mini_guard', null, 'TWIN HENS')).toBe('mini_guard');
    expect(bossIdOf('chicken_red', null, 'TWIN HENS')).toBeNull();
  });

  it('keeps the campaign table on the v1 key and gives each mode its own', () => {
    expect(tableKeyFor('campaign')).toBe(STORAGE_KEYS.highscores);
    expect(tableKeyFor('onslaught')).toBe(`${STORAGE_KEYS.modeScores}onslaught`);
    expect(tableKeyFor('daily', 20261008)).toBe(`${STORAGE_KEYS.modeScores}daily.20261008`);
  });
});
