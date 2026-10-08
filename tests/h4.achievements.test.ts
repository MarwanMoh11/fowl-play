// tests/h4.achievements.test.ts — OWNER: H4. Achievement checks, unlock rewards, live stats and banking (§H4 P1-8).
import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/sim/events';
import type { GameState, PerkId, WeaponId } from '../src/sim/types';
import { WEAPON_IDS } from '../src/sim/types';
import { BOSS_RUSH_ORDER } from '../src/sim/modes';
import {
  ACHIEVEMENTS, ACHIEVEMENT_COUNT, NO_RUN, TIER_REWARD, achievementById, evaluateAchievements, rewardFor, unlockAchievement,
  type RunFacts,
} from '../src/ui/achievements';
import { createProfile, loadProfile } from '../src/ui/profile';
import { applyLive, bankRun, recordRun, ZERO_BASE, type StatBase } from '../src/ui/profile-record';
import { memoryKV } from './a4.helpers';
import { fakeState, makeSummary } from './h4.helpers';

const run = (over: Partial<RunFacts>): RunFacts => ({ ...NO_RUN, ...over });
const ids = (f: RunFacts, p = createProfile()): string[] => evaluateAchievements(f, p);

describe('achievement table', () => {
  it('has 42 unique achievements with the spec tiers and rewards', () => {
    expect(ACHIEVEMENT_COUNT).toBe(42);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(42);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'bronze')).toHaveLength(12);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'silver')).toHaveLength(18);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'gold')).toHaveLength(12);
    expect([TIER_REWARD.bronze, TIER_REWARD.silver, TIER_REWARD.gold]).toEqual([25, 75, 200]);
    expect(rewardFor('empress')).toBe(200);
    expect(rewardFor('nope')).toBe(0);
  });

  it('nothing unlocks on a blank profile and a blank run', () => {
    expect(ids(NO_RUN)).toEqual([]);
  });

  it('checks lifetime stats on the profile', () => {
    const p = createProfile();
    p.stats.kills = 1;
    p.stats.cornEarned = 5000;
    expect(ids(NO_RUN, p)).toEqual(expect.arrayContaining(['first_blood', 'corn5k', 'corn100']));
    p.seenBosses = [...BOSS_RUSH_ORDER];
    expect(ids(NO_RUN, p)).toContain('boss_all');
    p.weaponsFired = [...WEAPON_IDS] as WeaponId[];
    expect(ids(NO_RUN, p)).toContain('arsenal');
  });

  it('checks the run: chains, victories, perks, modes and score', () => {
    expect(ids(run({ maxCombo: 400 }))).toEqual(expect.arrayContaining(['combo_25', 'combo_100', 'combo_400']));
    expect(ids(run({ victory: true, mode: 'campaign', difficulty: 'hard', mutators: ['hardcore'] })))
      .toEqual(expect.arrayContaining(['victory', 'victory_hard', 'hardcore']));
    expect(ids(run({ mode: 'onslaught', chapter: 5 }))).toContain('sector5');
    expect(ids(run({ mode: 'onslaught', chapter: 4 }))).not.toContain('sector5');
    expect(ids(run({ perks: { devils_bargain: 1 } as Partial<Record<PerkId, number>> }))).toContain('devil');
    expect(ids(run({ perks: { golden_touch: 2 } as Partial<Record<PerkId, number>> }))).toContain('maxed');
    expect(ids(run({ score: 1_000_000 }))).toContain('million');
    expect(ids(run({ cleared: [5] }))).toContain('classic');
  });

  it('a second unlock of the same id pays nothing and keeps the first date', () => {
    const p = createProfile();
    expect(unlockAchievement(p, 'kills_10k', '2026-10-08T00:00:00.000Z')).toBe(75);
    expect(unlockAchievement(p, 'kills_10k', '2026-11-01T00:00:00.000Z')).toBe(0);
    expect(p.corn).toBe(75);
    expect(p.achievements.kills_10k).toBe('2026-10-08T00:00:00.000Z');
    expect(ids(run({}), p)).not.toContain('kills_10k');
    expect(achievementById('kills_10k')?.tier).toBe('silver');
  });
});

describe('live stats and banking', () => {
  it('applyLive adds only the new run counters and advances the base', () => {
    const p = createProfile();
    const base: StatBase = { ...ZERO_BASE };
    const st = fakeState({ runStats: { kills: 5, bossesKilled: 1, goldenKills: 1, overdrives: 2, foodCollected: 30 } }) as GameState;
    expect(applyLive(p, [], st, base, 'TWIN HENS')).toBe(true);
    expect(p.stats.kills).toBe(5);
    expect(p.stats.food).toBe(30);
    expect(p.stats.overdrives).toBe(2);
    expect(applyLive(p, [], st, base, 'TWIN HENS')).toBe(false);
    expect(p.stats.kills).toBe(5);
  });

  it('applyLive records weapons, codex entries, shields, missiles and perks from events', () => {
    const p = createProfile();
    const st = fakeState({ bossName: 'TWIN HENS' }) as GameState;
    const events: GameEvent[] = [
      { type: 'player_fire', weapon: 'rail', power: 1, x: 0, y: 0 },
      { type: 'enemy_killed', id: 1, kind: 'chicken_ninja', x: 0, y: 0, byMissile: false },
      { type: 'boss_killed', kind: 'boss_hen', x: 0, y: 0, radius: 10 },
      { type: 'shield_absorb', x: 0, y: 0, left: 1 },
      { type: 'missile_launched', x: 0, y: 0, tx: 0, ty: 0 },
      { type: 'perk_chosen', id: 'hot_sauce', stacks: 1 },
    ];
    applyLive(p, events, st, { ...ZERO_BASE }, 'TWIN HENS');
    expect(p.weaponsFired).toEqual(['rail']);
    expect(p.seenEnemies).toEqual(['chicken_ninja']);
    expect(p.seenBosses).toEqual(['twin_hens']);
    expect(p.stats.shieldsPopped).toBe(1);
    expect(p.stats.missiles).toBe(1);
    expect(p.stats.perksTaken).toBe(1);
    expect(p.seenPerks).toEqual(['hot_sauce']);
  });

  it('bankRun pays corn for the new part of a run only and counts each run once', () => {
    const p = createProfile();
    const first = makeSummary({ score: 45_000, corn: 12, bossesKilled: 2, mode: 'campaign' });
    const r1 = bankRun(p, first, { corn: 12, score: 45_000, bosses: 2 }, NO_RUN, [], '2026-10-08T00:00:00.000Z');
    expect(r1.cornEarned).toBe(12 + 2 + 30);
    expect(p.corn).toBe(44);
    expect(p.stats.runs).toBe(1);
    expect(p.best.campaign).toBe(45_000);
    const later = makeSummary({ score: 60_000, corn: 15, bossesKilled: 3, mode: 'campaign' });
    const r2 = bankRun(p, later, { corn: 3, score: 15_000, bosses: 1 }, NO_RUN, [], '2026-10-08T00:00:00.000Z');
    expect(r2.cornEarned).toBe(3 + 0 + 15);
    expect(p.corn).toBe(44 + 18);
    expect(p.stats.runs).toBe(2);
    expect(p.best.campaign).toBe(60_000);
  });

  it('bankRun reports achievements unlocked live and at the end, and pays their rewards once', () => {
    const p = createProfile();
    p.achievements.first_blood = '2026-10-01T00:00:00.000Z';
    const summary = makeSummary({ score: 0, corn: 0, maxCombo: 25, mode: 'campaign' });
    const r = bankRun(p, summary, { corn: 0, score: 0, bosses: 0 }, run({ maxCombo: 25 }), ['first_blood'], '2026-10-08T00:00:00.000Z');
    expect(r.unlocked).toEqual(['first_blood', 'combo_25']);
    expect(r.achievementCorn).toBe(25 + 25);
    expect(p.corn).toBe(25);
    expect(p.stats.bestCombo).toBe(25);
  });

  it('recordRun saves the banked run to storage', () => {
    const kv = memoryKV();
    recordRun(makeSummary({ score: 20_000, corn: 4, mode: 'onslaught' }), kv, { corn: 4, score: 20_000, bosses: 0 }, NO_RUN);
    const back = loadProfile(kv);
    expect(back.corn).toBe(5);
    expect(back.best.onslaught).toBe(20_000);
    expect(back.stats.runs).toBe(1);
  });
});
