// tests/h4.music.test.ts — OWNER: H4. Track choice per chapter, boss kind, mode and screen (§H4 P1-11).
import { describe, expect, it } from 'vitest';
import { bossTrack, chooseTrack, gameTrack, setMenuTrack } from '../src/audio/music-select';
import { TRACK_NAMES } from '../src/audio/music-data';
import type { GameState } from '../src/sim/types';
import { fakeState } from './h4.helpers';

const st = (over: Record<string, unknown>): GameState => fakeState({ phase: 'wave_active', mode: 'campaign', chapter: 1, enemies: [], ...over });
const boss = (kind: string): GameState['enemies'][number] => ({ alive: true, isBoss: true, kind }) as unknown as GameState['enemies'][number];

describe('game themes', () => {
  it('follow the chapter: 1-5 game, 6-8 nebula, 9-11 abyss, 12 throne, then the cycle repeats', () => {
    const pick = (chapter: number): string => gameTrack(st({ chapter }));
    expect([1, 5].map(pick)).toEqual(['game', 'game']);
    expect([6, 8].map(pick)).toEqual(['nebula', 'nebula']);
    expect([9, 11].map(pick)).toEqual(['abyss', 'abyss']);
    expect(pick(12)).toBe('throne');
    expect(pick(13)).toBe('game');
    expect(pick(18)).toBe('nebula');
  });

  it('Boss Rush always plays the throne; onslaught follows its sector; daily follows its chapter', () => {
    expect(gameTrack(st({ mode: 'boss_rush', chapter: 3 }))).toBe('throne');
    expect(gameTrack(st({ mode: 'onslaught', chapter: 7 }))).toBe('nebula');
    expect(gameTrack(st({ mode: 'daily', chapter: 2 }))).toBe('game');
  });

  it('every theme name the rules can return exists in the track table', () => {
    const names = new Set<string>(TRACK_NAMES);
    for (let c = 1; c <= 24; c++) expect(names.has(gameTrack(st({ chapter: c })))).toBe(true);
  });
});

describe('boss themes', () => {
  it('classic bosses keep the boss theme, the final boss gets its own, the rest get boss2', () => {
    expect(bossTrack('boss_hen')).toBe('boss');
    expect(bossTrack('boss_dreadnought')).toBe('boss');
    expect(bossTrack('boss_empress')).toBe('empress');
    expect(bossTrack('boss_broodmother')).toBe('boss2');
    expect(bossTrack('boss_mini_guard')).toBe('boss2');
    expect(bossTrack(null)).toBe('boss');
  });

  it('an alive boss overrides the chapter theme', () => {
    expect(chooseTrack('playing', st({ enemies: [boss('boss_kraken')] }))).toBe('boss2');
    expect(chooseTrack('playing', st({ enemies: [boss('boss_empress')], chapter: 12 }))).toBe('empress');
    expect(chooseTrack('playing', st({ phase: 'boss_intro' }))).toBe('boss');
  });
});

describe('menu themes', () => {
  it('the draft screen plays the calm draft theme; menus keep the title theme unless the UI asks for draft', () => {
    expect(chooseTrack('draft', st({}))).toBe('draft');
    expect(chooseTrack('title', null)).toBe('title');
    setMenuTrack('draft');
    expect(chooseTrack('title', null)).toBe('draft');
    setMenuTrack(null);
    expect(chooseTrack('title', null)).toBe('title');
  });
});
