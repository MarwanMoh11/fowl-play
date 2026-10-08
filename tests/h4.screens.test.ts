// tests/h4.screens.test.ts — OWNER: H4. Pure helpers behind the H4 screens and HUD (no DOM needed).
import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS, SPRITE_KEYS, type SpriteKey } from '../src/shared/contracts';
import { BOSS_INFO } from '../src/shared/contracts';
import { PERKS, PERK_IDS } from '../src/sim/tuning/loadout';
import { ENEMY_KINDS, BOSS_IDS, CODEX_ENEMIES, bossSprite, enemySprite } from '../src/ui/codex-data';
import { codexEntries } from '../src/ui/screens/codex';
import { perkLine, mutatorLine } from '../src/ui/screens/pause';
import { startOptions } from '../src/ui/screens/loadout';
import { shipBars } from '../src/ui/screens/ship-card';
import { stackLabel, RARITY_COLOR, DRAFT_GUARD_MS } from '../src/ui/screens/draft';
import { tabsFor } from '../src/ui/screens/scores';
import { dailyMutatorNames } from '../src/ui/screens/mode-select';
import { unlockedCount } from '../src/ui/screens/achievements-screen';
import { CONTROL_ROWS, PICKUP_ROWS } from '../src/ui/screens/howto';
import { POWERUP_ROWS, HOW_PAGES } from '../src/ui/screens/howto-pages';
import { activePowerups } from '../src/ui/hud-powerups';
import { comboFraction, comboTierColor, comboTierMult } from '../src/ui/hud-meters';
import { modeLabel } from '../src/ui/hud';
import { createProfile, parseProfile } from '../src/ui/profile';
import { ACHIEVEMENT_COUNT } from '../src/ui/achievements';
import { fakeState } from './h4.helpers';
import { mutatorLabel, scoreMultiplier } from '../src/ui/screens/mutator-label';
import type { GameState } from '../src/sim/types';

describe('codex', () => {
  it('lists every enemy, boss, weapon and perk, and reads seen state from the profile', () => {
    const p = createProfile();
    expect(codexEntries(0, p)).toHaveLength(CODEX_ENEMIES.length);
    expect(codexEntries(1, p)).toHaveLength(BOSS_IDS.length);
    expect(codexEntries(2, p)).toHaveLength(10);
    expect(codexEntries(3, p)).toHaveLength(PERK_IDS.length);
    expect(codexEntries(0, p).every((e) => !e.seen)).toBe(true);
    p.seenEnemies = ['chicken_ninja'];
    expect(codexEntries(0, p).filter((e) => e.seen).map((e) => e.name)).toEqual(['NINJA HEN']);
  });

  it('every codex sprite key resolves to a real sprite', () => {
    const keys = new Set<string>(SPRITE_KEYS);
    for (const e of CODEX_ENEMIES) expect(enemySprite(e.kind), e.kind).toBeTruthy();
    for (const id of BOSS_IDS) expect(keys.has(bossSprite(id) as string), id).toBe(true);
    for (const kind of ENEMY_KINDS) if (!kind.startsWith('boss_')) expect(enemySprite(kind), kind).not.toBeNull();
    for (const e of codexEntries(2, createProfile())) expect(keys.has(e.sprite as SpriteKey), e.name).toBe(true);
  });

  it('every boss has a name and a line of flavour', () => {
    for (const id of BOSS_IDS) expect(BOSS_INFO[id].name.length).toBeGreaterThan(0);
  });
});

describe('loadout, ships and draft', () => {
  it('ship bars stay within 0..1 and there are four of them', () => {
    for (const id of ['falcon', 'bantam', 'bulwark', 'phoenix'] as const) {
      const bars = shipBars(id);
      expect(bars).toHaveLength(4);
      for (const b of bars) {
        expect(b.value).toBeGreaterThanOrEqual(0);
        expect(b.value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('start options copy the upgrades and carry the chosen mutators', () => {
    const p = parseProfile({ upgrades: { hull: 1 } });
    const opts = startOptions(p, 'bantam', 'hard', 'campaign', ['turbo']);
    expect(opts).toEqual({ difficulty: 'hard', mode: 'campaign', loadout: { ship: 'bantam', upgrades: { hull: 1 }, mutators: ['turbo'] } });
    opts.loadout.upgrades.hull = 9;
    expect(p.upgrades.hull).toBe(1);
  });

  it('shows stacks as taken over maximum, and colours rarities', () => {
    const state = fakeState({ perks: { hot_sauce: 2 } }) as GameState;
    expect(stackLabel(state, 'hot_sauce')).toBe(`2/${PERKS.hot_sauce.max}`);
    expect(stackLabel(state, 'wingman')).toBe(`0/${PERKS.wingman.max}`);
    expect(Object.keys(RARITY_COLOR).sort()).toEqual(['common', 'epic', 'rare']);
    expect(DRAFT_GUARD_MS).toBe(400);
  });

  it('pause lines name the perks and mutators, or show a dash', () => {
    expect(perkLine(null)).toBe('—');
    expect(perkLine(fakeState({ perks: {} }) as GameState)).toBe('—');
    expect(perkLine(fakeState({ perks: { showboat: 2 } }) as GameState)).toBe(`${PERKS.showboat.name} ×2`);
    expect(mutatorLine(fakeState({ loadout: { mutators: ['turbo', 'feast'] } }) as GameState)).toBe('TURBO COOP · FEAST');
  });

  it('daily mutators come from the date and are two names', () => {
    expect(dailyMutatorNames(20261008).split(' · ')).toHaveLength(2);
    expect(dailyMutatorNames(20261008)).toBe(dailyMutatorNames(20261008));
  });
});

describe('screens and HUD', () => {
  it('score tabs cover the four modes and the campaign keeps the v1 key', () => {
    const tabs = tabsFor(20261008);
    expect(tabs.map((t) => t.mode)).toEqual(['campaign', 'onslaught', 'boss_rush', 'daily']);
    expect(tabs[0].key).toBe(STORAGE_KEYS.highscores);
    expect(tabs[3].key).toContain('20261008');
  });

  it('counts unlocked achievements against the total', () => {
    const p = createProfile();
    p.achievements = { first_blood: '2026-10-08T00:00:00.000Z', golden1: '2026-10-08T00:00:00.000Z' };
    expect(unlockedCount(p)).toBe(2);
    expect(ACHIEVEMENT_COUNT).toBe(42);
  });

  it('how-to pages: controls list overdrive, powerups and pages exist', () => {
    expect(CONTROL_ROWS.map((r) => r[0])).toContain('Overdrive (full fury)');
    expect(PICKUP_ROWS).toHaveLength(13);
    expect(POWERUP_ROWS).toHaveLength(6);
    expect(HOW_PAGES).toHaveLength(4);
  });

  it('mode labels follow the mode', () => {
    expect(modeLabel(fakeState({ mode: 'onslaught', chapter: 4, wave: 7 }) as GameState)).toBe('ONSLAUGHT · SECTOR 4 · WAVE 7');
    expect(modeLabel(fakeState({ mode: 'boss_rush', chapter: 3 }) as GameState)).toBe('BOSS RUSH · 3/12');
    expect(modeLabel(fakeState({ mode: 'daily', chapter: 2 }) as GameState)).toBe('DAILY CLUTCH · CH 2');
    expect(modeLabel(fakeState({ mode: 'campaign', chapter: 2, wave: 4 }) as GameState)).toBe('CHAPTER 2 · WAVE 4/10');
  });

  it('combo tiers and the window fraction', () => {
    expect(comboTierMult(0)).toBe(1);
    expect(comboTierMult(10)).toBe(1.5);
    expect(comboTierMult(400)).toBe(8);
    expect(comboTierColor(8)).toBe('#F72585');
    expect(comboFraction(fakeState({ mods: { comboWindow: 2 }, combo: { timer: 1 } }) as GameState)).toBeCloseTo(0.5);
    expect(comboFraction(fakeState({ mods: { comboWindow: 0 }, combo: { timer: 1 } }) as GameState)).toBe(0);
  });

  it('lists the power-ups that are running, with their share of time left', () => {
    const state = fakeState({ player: { powerups: { magnet: 6, rapid: 0, drones: 0, timewarp: 0, double: 0 } } }) as GameState;
    const active = activePowerups(state);
    expect(active.map((a) => a.id)).toEqual(['magnet']);
    expect(active[0].frac).toBeCloseTo(0.5);
  });

  it('mutator labels carry the score multiplier from the tuning text', () => {
    expect(scoreMultiplier('Twice the eggs. Score ×1.4')).toBe('×1.4');
    expect(scoreMultiplier('Lose everything. No bonus')).toBe('');
    expect(mutatorLabel('egg_storm')).toBe('EGG STORM  ×1.4');
    expect(mutatorLabel('feast')).toBe('FEAST  ×0.9');
    for (const id of PERK_IDS) expect(PERKS[id].name.length).toBeGreaterThan(0);
  });
});
