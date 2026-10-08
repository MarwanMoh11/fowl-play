// src/ui/profile-record.ts — OWNER: H4. Writes a run into the profile: live lifetime stats and end-of-run banking.
import type { RunSummary } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { GameState } from '../sim/types';
import { evaluateAchievements, rewardFor, unlockAchievement, type RunFacts } from './achievements';
import { bossIdOf } from './codex-data';
import { CORN_PER_BOSS, loadProfile, saveProfile, type Profile, type ProfileStats } from './profile';
import type { KV } from './storage';

/** Run counters already added to the profile; the sim's runStats only grow during a run. */
export interface StatBase { kills: number; bossesKilled: number; goldenKills: number; overdrives: number; foodCollected: number }
export const ZERO_BASE: Readonly<StatBase> = { kills: 0, bossesKilled: 0, goldenKills: 0, overdrives: 0, foodCollected: 0 };

/**
 * What one bank adds: pickup corn, the whole score blocks gained since the last bank (a difference of
 * floors, so a run banked in parts pays the same as one banked at once), boss kills, and whether this
 * is the run's first bank (a run that continues after victory banks again but is still one run).
 */
export interface BankDelta { corn: number; scoreBlocks: number; bosses: number; first?: boolean }
export interface RunReward { cornEarned: number; achievementCorn: number; unlocked: string[] }

function runCounters(st: GameState): StatBase {
  const s = st.runStats;
  return { kills: s.kills, bossesKilled: s.bossesKilled, goldenKills: s.goldenKills, overdrives: s.overdrives, foodCollected: s.foodCollected };
}

function bump(p: Profile, key: keyof ProfileStats, n: number): boolean {
  if (n <= 0) return false;
  p.stats[key] += n;
  return true;
}

/** Event-driven lifetime records (weapons, codex, shields, missiles, perks). Returns true when the profile changed. */
function applyEvent(p: Profile, e: GameEvent, st: GameState, twinName: string): boolean {
  switch (e.type) {
    case 'player_fire':
      if (p.weaponsFired.includes(e.weapon)) return false;
      p.weaponsFired.push(e.weapon);
      return true;
    case 'enemy_killed':
      if (p.seenEnemies.includes(e.kind)) return false;
      p.seenEnemies.push(e.kind);
      return true;
    case 'boss_killed': {
      const id = bossIdOf(e.kind, st.bossName, twinName);
      if (id === null || p.seenBosses.includes(id)) return false;
      p.seenBosses.push(id);
      return true;
    }
    case 'shield_absorb': return bump(p, 'shieldsPopped', 1);
    case 'missile_launched': return bump(p, 'missiles', 1);
    case 'perk_chosen':
      bump(p, 'perksTaken', 1);
      if (!p.seenPerks.includes(e.id)) p.seenPerks.push(e.id);
      return true;
    default: return false;
  }
}

/**
 * Adds one event batch to the lifetime profile. `base` holds the run counters already counted and is
 * advanced to the current values. Returns true when the profile changed.
 */
export function applyLive(p: Profile, events: readonly GameEvent[], st: GameState, base: StatBase, twinName: string): boolean {
  const now = runCounters(st);
  let changed = false;
  changed = bump(p, 'kills', now.kills - base.kills) || changed;
  changed = bump(p, 'bossesKilled', now.bossesKilled - base.bossesKilled) || changed;
  changed = bump(p, 'goldenKills', now.goldenKills - base.goldenKills) || changed;
  changed = bump(p, 'overdrives', now.overdrives - base.overdrives) || changed;
  changed = bump(p, 'food', now.foodCollected - base.foodCollected) || changed;
  if (st.combo.best > p.stats.bestCombo) {
    p.stats.bestCombo = st.combo.best;
    changed = true;
  }
  Object.assign(base, now);
  for (const e of events) changed = applyEvent(p, e, st, twinName) || changed;
  return changed;
}

/** Banks one run segment into the profile (mutates `p`). `pending` are achievements already unlocked live this run. */
export function bankRun(
  p: Profile, s: RunSummary, delta: BankDelta, facts: RunFacts, pending: readonly string[], date: string,
): RunReward {
  const cornEarned = Math.max(0, delta.corn) + Math.max(0, delta.scoreBlocks) + CORN_PER_BOSS * Math.max(0, delta.bosses);
  p.corn += cornEarned;
  p.stats.cornEarned += cornEarned;
  if (delta.first !== false) p.stats.runs += 1;
  if (s.victory) p.stats.victories += 1;
  p.stats.bestCombo = Math.max(p.stats.bestCombo, s.maxCombo);
  if (s.score > (p.best[s.mode] ?? 0)) p.best[s.mode] = s.score;
  // Achievements already unlocked live are in `pending`; without storage the profile is empty, so skip them here too.
  const fresh = evaluateAchievements(facts, p).filter((id) => !pending.includes(id));
  for (const id of fresh) unlockAchievement(p, id, date);
  const unlocked = [...pending, ...fresh];
  const achievementCorn = unlocked.reduce((n, id) => n + rewardFor(id), 0);
  return { cornEarned, achievementCorn, unlocked };
}

/** Loads the profile, banks the run segment and saves it. */
export function recordRun(
  summary: RunSummary, kv: KV | null, delta: BankDelta, facts: RunFacts, pending: readonly string[] = [],
): RunReward {
  const p = loadProfile(kv);
  const reward = bankRun(p, summary, delta, facts, pending, new Date().toISOString());
  saveProfile(p, kv);
  return reward;
}
