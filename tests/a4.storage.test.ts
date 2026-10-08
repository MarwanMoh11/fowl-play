// tests/a4.storage.test.ts — OWNER: A4. Settings storage and high-score table (§9.A4 P0).
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../src/shared/contracts';
import {
  DEFAULT_PILOT_NAME, loadLastName, loadSettings, parseSettings, safeStorage, sanitizeName, saveLastName, saveSettings,
} from '../src/ui/storage';
import {
  addHighScore, clearHighScores, insertScore, loadHighScores, normalizeScores, qualifies, type HighScore,
} from '../src/ui/highscores';
import { memoryKV, throwingKV } from './a4.helpers';

function entry(score: number, over: Partial<HighScore> = {}): HighScore {
  return { name: 'ACE', score, chapter: 2, wave: 3, difficulty: 'normal', date: '2026-01-01', ...over };
}

describe('settings storage', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(memoryKV())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults for corrupt JSON and for non-objects', () => {
    expect(loadSettings(memoryKV({ [STORAGE_KEYS.settings]: '{oops' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryKV({ [STORAGE_KEYS.settings]: '42' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryKV({ [STORAGE_KEYS.settings]: 'null' }))).toEqual(DEFAULT_SETTINGS);
  });

  it('survives storage that throws', () => {
    const kv = throwingKV();
    expect(loadSettings(kv)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, kv)).not.toThrow();
    expect(loadLastName(kv)).toBe(DEFAULT_PILOT_NAME);
    expect(loadHighScores(kv)).toEqual([]);
    expect(() => addHighScore(entry(100), kv)).not.toThrow();
  });

  it('clamps volumes to 0..1 and coerces booleans', () => {
    const s = parseSettings({
      masterVolume: 7, musicVolume: -3, sfxVolume: 'abc', screenShake: 0, reduceFlashes: 'true', showFps: 1,
      autoFire: 'false', mouseControl: null, difficulty: 'nightmare',
    });
    expect(s.masterVolume).toBe(1);
    expect(s.musicVolume).toBe(0);
    expect(s.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(s.screenShake).toBe(false);
    expect(s.reduceFlashes).toBe(true);
    expect(s.showFps).toBe(true);
    expect(s.autoFire).toBe(false);
    expect(s.mouseControl).toBe(DEFAULT_SETTINGS.mouseControl);
    expect(s.difficulty).toBe(DEFAULT_SETTINGS.difficulty);
  });

  it('round-trips through save and load', () => {
    const kv = memoryKV();
    const next = { ...DEFAULT_SETTINGS, masterVolume: 0.35, autoFire: true, difficulty: 'hard' as const };
    saveSettings(next, kv);
    expect(loadSettings(kv)).toEqual(next);
  });

  it('safeStorage never throws in Node', () => {
    expect(() => safeStorage()).not.toThrow();
  });

  it('keeps the last name sanitized', () => {
    const kv = memoryKV();
    expect(loadLastName(kv)).toBe('PILOT');
    saveLastName('ace pilot!!', kv);
    expect(loadLastName(kv)).toBe('ACE PILOT');
    expect(sanitizeName('abcdefghijklmnopqrstuvwxyz')).toHaveLength(12);
    expect(sanitizeName('a-b_c d9')).toBe('ABC D9');
  });
});

describe('high scores', () => {
  it('is empty for missing or corrupt data', () => {
    expect(loadHighScores(memoryKV())).toEqual([]);
    expect(loadHighScores(memoryKV({ [STORAGE_KEYS.highscores]: 'not json' }))).toEqual([]);
    expect(loadHighScores(memoryKV({ [STORAGE_KEYS.highscores]: '{"a":1}' }))).toEqual([]);
  });

  it('drops invalid entries and sorts by score descending, max 10', () => {
    const raw = [
      entry(50), { nope: true }, entry(900), entry(300), { ...entry(10), difficulty: 'insane' },
      ...Array.from({ length: 12 }, (_, i) => entry(1000 + i)),
    ];
    const list = normalizeScores(raw);
    expect(list).toHaveLength(10);
    expect(list.map((e) => e.score)).toEqual([...list.map((e) => e.score)].sort((a, b) => b - a));
    expect(list[0].score).toBe(1011);
    expect(list.some((e) => e.score === 10)).toBe(false);
  });

  it('qualifies: positive scores while there is room, then only above the 10th', () => {
    const kv = memoryKV();
    expect(qualifies(0, kv)).toBe(false);
    expect(qualifies(1, kv)).toBe(true);
    for (let i = 1; i <= 10; i++) addHighScore(entry(i * 100), kv);
    expect(loadHighScores(kv)).toHaveLength(10);
    expect(qualifies(100, kv)).toBe(false);
    expect(qualifies(101, kv)).toBe(true);
  });

  it('returns the insertion rank and keeps the table ordered', () => {
    const kv = memoryKV();
    expect(addHighScore(entry(500), kv)).toBe(0);
    expect(addHighScore(entry(900), kv)).toBe(0);
    expect(addHighScore(entry(700), kv)).toBe(1);
    expect(addHighScore(entry(100), kv)).toBe(3);
    expect(loadHighScores(kv).map((e) => e.score)).toEqual([900, 700, 500, 100]);
  });

  it('ties rank below existing equal scores', () => {
    const { rank, list } = insertScore([entry(500, { name: 'ONE' })], entry(500, { name: 'TWO' }));
    expect(rank).toBe(1);
    expect(list.map((e) => e.name)).toEqual(['ONE', 'TWO']);
  });

  it('a full table pushes out the lowest entry and rejects scores that miss', () => {
    const kv = memoryKV();
    for (let i = 1; i <= 10; i++) addHighScore(entry(i * 100), kv);
    expect(addHighScore(entry(50), kv)).toBe(-1);
    expect(addHighScore(entry(550), kv)).toBe(5);
    const list = loadHighScores(kv);
    expect(list).toHaveLength(10);
    expect(list[list.length - 1].score).toBe(200);
  });

  it('clears the table', () => {
    const kv = memoryKV();
    addHighScore(entry(500), kv);
    clearHighScores(kv);
    expect(loadHighScores(kv)).toEqual([]);
  });
});
