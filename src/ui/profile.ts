// src/ui/profile.ts — OWNER: H4. Meta profile: Golden Corn, hangar, codex, lifetime stats, best scores (HENPOCALYPSE §H4).
// Every parse is defensive: corrupt or missing data falls back to defaults and never throws.
import { BOSS_INFO, STORAGE_KEYS } from '../shared/contracts';
import type { BossId } from '../sim/bosses.types';
import { MUTATOR_IDS, PERK_IDS, SHIPS, UPGRADES } from '../sim/tuning/loadout';
import { GAME_MODES, SHIP_IDS, WEAPON_IDS, type EnemyKind, type GameMode, type MutatorId, type PerkId, type ShipId, type UpgradeId, type WeaponId } from '../sim/types';
import { ENEMY_KINDS, BOSS_IDS } from './codex-data';
import { readJson, writeJson, type KV } from './storage';

export const PROFILE_VERSION = 2;
/** Corn: +1 per 20 000 points and +15 per boss on top of the corn collected in the run. */
export const CORN_PER_SCORE = 20_000;
export const CORN_PER_BOSS = 15;

export const STAT_KEYS = [
  'runs', 'kills', 'bossesKilled', 'cornEarned', 'goldenKills', 'victories', 'perksTaken', 'bestCombo',
  'overdrives', 'shieldsPopped', 'missiles', 'food',
] as const;
export type StatKey = typeof STAT_KEYS[number];
export type ProfileStats = Record<StatKey, number>;

export interface Profile {
  v: number;
  corn: number;
  ships: ShipId[];
  upgrades: Partial<Record<UpgradeId, number>>;
  /** Achievement id -> ISO date unlocked. */
  achievements: Record<string, string>;
  seenEnemies: EnemyKind[];
  seenBosses: BossId[];
  seenPerks: PerkId[];
  weaponsFired: WeaponId[];
  stats: ProfileStats;
  best: Partial<Record<GameMode, number>>;
}

export interface LoadoutPrefs { ship: ShipId; mutators: MutatorId[]; mode: GameMode }

export function emptyStats(): ProfileStats {
  const s = {} as ProfileStats;
  for (const k of STAT_KEYS) s[k] = 0;
  return s;
}

export function createProfile(): Profile {
  return {
    v: PROFILE_VERSION, corn: 0, ships: ['falcon'], upgrades: {}, achievements: {}, seenEnemies: [], seenBosses: [],
    seenPerks: [], weaponsFired: [], stats: emptyStats(), best: {},
  };
}

function wholeCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Keeps the entries that are strings from `allowed`, without duplicates, in first-seen order. */
function pickIds<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const v of raw) {
    if (typeof v === 'string' && (allowed as readonly string[]).includes(v) && !out.includes(v as T)) out.push(v as T);
  }
  return out;
}

function parseUpgrades(raw: unknown): Partial<Record<UpgradeId, number>> {
  const out: Partial<Record<UpgradeId, number>> = {};
  if (raw === null || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
    const level = Math.min(UPGRADES[id].costs.length, wholeCount(r[id]));
    if (level > 0) out[id] = level;
  }
  return out;
}

function parseAchievements(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw === null || typeof raw !== 'object') return out;
  for (const [id, date] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof date === 'string') out[id] = date;
  }
  return out;
}

function parseStats(raw: unknown): ProfileStats {
  const s = emptyStats();
  if (raw === null || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  for (const k of STAT_KEYS) s[k] = wholeCount(r[k]);
  return s;
}

function parseBest(raw: unknown): Partial<Record<GameMode, number>> {
  const out: Partial<Record<GameMode, number>> = {};
  if (raw === null || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const m of GAME_MODES) {
    const v = wholeCount(r[m]);
    if (v > 0) out[m] = v;
  }
  return out;
}

/** Any parsed JSON -> a complete, valid Profile. */
export function parseProfile(raw: unknown): Profile {
  const base = createProfile();
  if (raw === null || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  base.corn = wholeCount(r.corn);
  base.ships = pickIds(r.ships, SHIP_IDS);
  if (!base.ships.includes('falcon')) base.ships.unshift('falcon');
  base.upgrades = parseUpgrades(r.upgrades);
  base.achievements = parseAchievements(r.achievements);
  base.seenEnemies = pickIds(r.seenEnemies, ENEMY_KINDS);
  base.seenBosses = pickIds(r.seenBosses, BOSS_IDS);
  base.seenPerks = pickIds(r.seenPerks, PERK_IDS);
  base.weaponsFired = pickIds(r.weaponsFired, WEAPON_IDS);
  base.stats = parseStats(r.stats);
  base.best = parseBest(r.best);
  return base;
}

export function loadProfile(kv: KV | null): Profile {
  return parseProfile(readJson(kv, STORAGE_KEYS.profile));
}

export function saveProfile(p: Profile, kv: KV | null): void {
  writeJson(kv, STORAGE_KEYS.profile, { ...p, v: PROFILE_VERSION });
}

export function bestFor(p: Profile, mode: GameMode): number {
  return p.best[mode] ?? 0;
}

export function ownsShip(p: Profile, id: ShipId): boolean {
  return p.ships.includes(id);
}

export function upgradeLevel(p: Profile, id: UpgradeId): number {
  return p.upgrades[id] ?? 0;
}

export function upgradeMaxed(p: Profile, id: UpgradeId): boolean {
  return upgradeLevel(p, id) >= UPGRADES[id].costs.length;
}

/** Cost of the next level, or null when maxed. */
export function nextUpgradeCost(p: Profile, id: UpgradeId): number | null {
  return upgradeMaxed(p, id) ? null : UPGRADES[id].costs[upgradeLevel(p, id)];
}

/** Buys a ship with corn. Returns false (and changes nothing) when owned or unaffordable. */
export function buyShip(p: Profile, id: ShipId): boolean {
  const cost = SHIPS[id].cost;
  if (ownsShip(p, id) || p.corn < cost) return false;
  p.corn -= cost;
  p.ships.push(id);
  return true;
}

/** Buys the next upgrade level. Returns false when maxed or unaffordable. */
export function buyUpgrade(p: Profile, id: UpgradeId): boolean {
  const cost = nextUpgradeCost(p, id);
  if (cost === null || p.corn < cost) return false;
  p.corn -= cost;
  p.upgrades[id] = upgradeLevel(p, id) + 1;
  return true;
}

/** Whole 20 000-point blocks in a score: the score part of Golden Corn. */
export function scoreBlocks(score: number): number {
  return Math.floor(Math.max(0, score) / CORN_PER_SCORE);
}

/** Golden Corn for one run segment: pickups + 1 per 20 000 points + 15 per boss. */
export function cornForRun(run: { corn: number; score: number; bossesKilled: number }): number {
  return Math.max(0, run.corn) + scoreBlocks(run.score) + CORN_PER_BOSS * Math.max(0, run.bossesKilled);
}

/** Local calendar date as YYYYMMDD (daily runs). */
export function todayYmd(d: Date = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function parseLoadoutPrefs(raw: unknown): LoadoutPrefs {
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const ship = SHIP_IDS.find((s) => s === r.ship) ?? 'falcon';
  const mode = GAME_MODES.find((m) => m === r.mode) ?? 'campaign';
  return { ship, mode, mutators: pickIds(r.mutators, MUTATOR_IDS) };
}

export function loadLoadoutPrefs(kv: KV | null): LoadoutPrefs {
  return parseLoadoutPrefs(readJson(kv, STORAGE_KEYS.loadout));
}

export function saveLoadoutPrefs(prefs: LoadoutPrefs, kv: KV | null): void {
  writeJson(kv, STORAGE_KEYS.loadout, prefs);
}

export function bossName(id: BossId): string {
  return BOSS_INFO[id].name;
}
