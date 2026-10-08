// src/ui/achievements.ts — OWNER: H4. The 42 achievements: data, pure checks and unlock rewards (HENPOCALYPSE §H4 P1-8).
import { BOSS_RUSH_ORDER } from '../sim/modes';
import { PERKS, UPGRADES } from '../sim/tuning/loadout';
import { SHIP_IDS, WEAPON_IDS, type Difficulty, type GameMode, type MutatorId, type PerkId } from '../sim/types';
import { BOSS_IDS } from './codex-data';
import { upgradeMaxed, type Profile } from './profile';

export type Tier = 'bronze' | 'silver' | 'gold';
export const TIER_REWARD: Record<Tier, number> = { bronze: 25, silver: 75, gold: 200 };
export const TIER_LABEL: Record<Tier, string> = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD' };

/** What the checks can see about the current or just-finished run. */
export interface RunFacts {
  mode: GameMode;
  difficulty: Difficulty;
  chapter: number;
  mutators: readonly MutatorId[];
  victory: boolean;
  score: number;
  maxCombo: number;
  maxPower: number;
  overdrives: number;
  goldenKills: number;
  perks: Partial<Record<PerkId, number>>;
  /** Chapters whose wave 10 was cleared this run. */
  cleared: readonly number[];
  /** A chapter was cleared without losing a ship. */
  flawless: boolean;
  /** A chapter was cleared without overheating. */
  cool: boolean;
  revived: boolean;
}

export const NO_RUN: RunFacts = {
  mode: 'campaign', difficulty: 'normal', chapter: 1, mutators: [], victory: false, score: 0, maxCombo: 0,
  maxPower: 0, overdrives: 0, goldenKills: 0, perks: {}, cleared: [], flawless: false, cool: false, revived: false,
};

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  tier: Tier;
  check(f: RunFacts, p: Profile): boolean;
}

const MINI_BOSSES = BOSS_IDS.filter((id) => id.startsWith('mini_'));
const stackCount = (f: RunFacts): number => Object.values(f.perks).reduce((a, n) => a + (n ?? 0), 0);
const won = (f: RunFacts, mode: GameMode): boolean => f.victory && f.mode === mode;
const has = (f: RunFacts, id: PerkId): boolean => (f.perks[id] ?? 0) > 0;

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first_blood', name: 'First Feather', desc: 'Get your first kill', tier: 'bronze', check: (_f, p) => p.stats.kills >= 1 },
  { id: 'kills_1k', name: 'Poultry in Motion', desc: '1 000 kills (lifetime)', tier: 'bronze', check: (_f, p) => p.stats.kills >= 1_000 },
  { id: 'kills_10k', name: 'Fowl Executioner', desc: '10 000 kills (lifetime)', tier: 'silver', check: (_f, p) => p.stats.kills >= 10_000 },
  { id: 'kills_100k', name: 'Extinction Event', desc: '100 000 kills (lifetime)', tier: 'gold', check: (_f, p) => p.stats.kills >= 100_000 },
  { id: 'combo_25', name: 'Chain Reaction', desc: 'A 25 chain', tier: 'bronze', check: (f) => f.maxCombo >= 25 },
  { id: 'combo_100', name: 'Hundred-Hen Combo', desc: 'A 100 chain', tier: 'silver', check: (f) => f.maxCombo >= 100 },
  { id: 'combo_400', name: 'Clucking Unstoppable', desc: 'A 400 chain (x8 multiplier)', tier: 'gold', check: (f) => f.maxCombo >= 400 },
  { id: 'boss_first', name: 'Hen-tervention', desc: 'Defeat any boss', tier: 'bronze', check: (_f, p) => p.stats.bossesKilled >= 1 },
  { id: 'boss_all', name: 'Coop de Grâce', desc: 'Defeat all 12 major bosses (lifetime)', tier: 'gold', check: (_f, p) => BOSS_RUSH_ORDER.every((id) => p.seenBosses.includes(id)) },
  { id: 'mini_all', name: 'Small Fry', desc: 'Defeat all 7 mini-bosses (lifetime)', tier: 'silver', check: (_f, p) => MINI_BOSSES.every((id) => p.seenBosses.includes(id)) },
  { id: 'empress', name: 'Regicide', desc: 'Defeat Empress Yolkanda', tier: 'gold', check: (_f, p) => p.seenBosses.includes('empress') },
  { id: 'phoenix', name: 'Ashes to Ashes', desc: 'Defeat the Storm Phoenix', tier: 'silver', check: (_f, p) => p.seenBosses.includes('phoenix') },
  { id: 'classic', name: 'Classic Hero', desc: 'Clear chapter 5 of the campaign', tier: 'bronze', check: (f) => f.mode === 'campaign' && f.cleared.includes(5) },
  { id: 'victory', name: 'Coop Liberated', desc: 'Finish the campaign', tier: 'silver', check: (f) => won(f, 'campaign') },
  { id: 'victory_hard', name: 'Hard-Boiled', desc: 'Finish the campaign on Hard', tier: 'gold', check: (f) => won(f, 'campaign') && f.difficulty === 'hard' },
  { id: 'flawless', name: 'Untouchable', desc: 'Clear a chapter without losing a ship', tier: 'silver', check: (f) => f.flawless },
  { id: 'hardcore', name: 'One Egg Basket', desc: 'Finish the campaign with Hardcore', tier: 'gold', check: (f) => won(f, 'campaign') && f.mutators.includes('hardcore') },
  { id: 'sector5', name: 'Deep Space', desc: 'Reach Onslaught sector 5', tier: 'silver', check: (f) => f.mode === 'onslaught' && f.chapter >= 5 },
  { id: 'sector20', name: 'Infinite Omelette', desc: 'Reach Onslaught sector 20', tier: 'gold', check: (f) => f.mode === 'onslaught' && f.chapter >= 20 },
  { id: 'rush', name: 'Rush Hour', desc: 'Clear Boss Rush', tier: 'gold', check: (f) => won(f, 'boss_rush') },
  { id: 'daily_play', name: 'Daily Grind', desc: 'Play a Daily Clutch', tier: 'bronze', check: (f) => f.mode === 'daily' },
  { id: 'daily_win', name: 'Daily Hero', desc: 'Clear a Daily Clutch', tier: 'silver', check: (f) => won(f, 'daily') },
  { id: 'arsenal', name: 'Arms Dealer', desc: 'Fire all 10 weapons (lifetime)', tier: 'silver', check: (_f, p) => WEAPON_IDS.every((w) => p.weaponsFired.includes(w)) },
  { id: 'max_power', name: 'Maximum Overcluck', desc: 'Reach firepower 10', tier: 'bronze', check: (f) => f.maxPower >= 10 },
  { id: 'overdrive5', name: 'Seeing Red', desc: 'Five overdrives in one run', tier: 'silver', check: (f) => f.overdrives >= 5 },
  { id: 'missiles100', name: 'Bunker Buster', desc: 'Launch 100 missiles (lifetime)', tier: 'silver', check: (_f, p) => p.stats.missiles >= 100 },
  { id: 'cool', name: 'Cool Customer', desc: 'Clear a chapter without overheating', tier: 'silver', check: (f) => f.cool },
  { id: 'perk_first', name: 'Taste of Power', desc: 'Take your first perk', tier: 'bronze', check: (f) => stackCount(f) >= 1 },
  { id: 'perks10', name: 'Overloaded', desc: '10 perk stacks in one run', tier: 'silver', check: (f) => stackCount(f) >= 10 },
  { id: 'devil', name: 'Deal with the Devil', desc: 'Take Devil\'s Bargain', tier: 'bronze', check: (f) => has(f, 'devils_bargain') },
  { id: 'maxed', name: 'Maxed Out', desc: 'Max out any perk', tier: 'silver', check: (f) => (Object.keys(f.perks) as PerkId[]).some((id) => (f.perks[id] ?? 0) >= PERKS[id].max) },
  { id: 'corn100', name: 'Corn Fed', desc: 'Earn 100 corn (lifetime)', tier: 'bronze', check: (_f, p) => p.stats.cornEarned >= 100 },
  { id: 'corn5k', name: 'Corn Baron', desc: 'Earn 5 000 corn (lifetime)', tier: 'gold', check: (_f, p) => p.stats.cornEarned >= 5_000 },
  { id: 'golden1', name: 'Golden Goose', desc: 'Catch a golden chicken', tier: 'bronze', check: (_f, p) => p.stats.goldenKills >= 1 },
  { id: 'golden10', name: 'Midas Touch', desc: '10 golden chickens (lifetime)', tier: 'silver', check: (_f, p) => p.stats.goldenKills >= 10 },
  { id: 'food10k', name: 'Gourmet', desc: 'Eat 10 000 food (lifetime)', tier: 'silver', check: (_f, p) => p.stats.food >= 10_000 },
  { id: 'hangar', name: 'Full Hangar', desc: 'Own every ship', tier: 'gold', check: (_f, p) => SHIP_IDS.every((s) => p.ships.includes(s)) },
  { id: 'upgraded', name: 'Fully Upgraded', desc: 'Max every hangar upgrade', tier: 'gold', check: (_f, p) => (Object.keys(UPGRADES) as (keyof typeof UPGRADES)[]).every((u) => upgradeMaxed(p, u)) },
  { id: 'bubble', name: 'Bubble Boy', desc: 'Pop 25 shields (lifetime)', tier: 'silver', check: (_f, p) => p.stats.shieldsPopped >= 25 },
  { id: 'revive', name: 'Not Today', desc: 'Get revived', tier: 'bronze', check: (f) => f.revived },
  { id: 'million', name: 'Millionaire', desc: 'Score 1 000 000 in one run', tier: 'silver', check: (f) => f.score >= 1_000_000 },
  { id: 'ten_million', name: 'Deca-Millionaire', desc: 'Score 10 000 000 in one run', tier: 'gold', check: (f) => f.score >= 10_000_000 },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function rewardFor(id: string): number {
  const def = achievementById(id);
  return def ? TIER_REWARD[def.tier] : 0;
}

/** Achievements whose condition holds now and that the profile does not have yet. Pure. */
export function evaluateAchievements(f: RunFacts, p: Profile): string[] {
  return ACHIEVEMENTS.filter((a) => !(a.id in p.achievements) && a.check(f, p)).map((a) => a.id);
}

/** Records an unlock on the profile (date and corn). Returns the corn awarded. */
export function unlockAchievement(p: Profile, id: string, date: string): number {
  if (id in p.achievements) return 0;
  p.achievements[id] = date;
  const reward = rewardFor(id);
  p.corn += reward;
  return reward;
}
