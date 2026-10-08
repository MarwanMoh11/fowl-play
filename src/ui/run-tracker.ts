// src/ui/run-tracker.ts — OWNER: H4. Follows the live run from trackEvents: achievements, lifetime stats, toasts, banking.
import { BOSS_INFO, type RunSummary } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { GameState } from '../sim/types';
import { achievementById, evaluateAchievements, unlockAchievement, type RunFacts } from './achievements';
import { loadProfile, saveProfile, scoreBlocks } from './profile';
import { applyLive, bankRun, ZERO_BASE, type BankDelta, type RunReward, type StatBase } from './profile-record';
import { playEffect } from '../audio';
import type { KV } from './storage';

export interface RunTracker {
  /** One non-empty batch of sim events, with the state they came from. */
  observe(events: readonly GameEvent[], state: GameState): void;
  /** The state of the run being tracked, or null before its first batch. */
  state(): GameState | null;
  /** Banks the run (or the part of it since the last bank) and returns the rewards to show. */
  finish(summary: RunSummary): RunReward;
  /** Forgets the current run; called when a new run is started. */
  reset(): void;
}

interface Flags {
  victory: boolean;
  flawless: boolean;
  cool: boolean;
  revived: boolean;
  overheated: boolean;
  maxPower: number;
  cleared: number[];
}

function freshFlags(): Flags {
  return { victory: false, flawless: false, cool: false, revived: false, overheated: false, maxPower: 0, cleared: [] };
}

/** Totals already banked for the current run (a victory run banks once at victory and again at its end). */
interface Banked { corn: number; score: number; bosses: number }

function zeroBank(): Banked {
  return { corn: 0, score: 0, bosses: 0 };
}

export function createRunTracker(kv: KV | null, notify: (text: string) => void): RunTracker {
  let st: GameState | null = null;
  let flags = freshFlags();
  const base: StatBase = { ...ZERO_BASE };
  let pending: string[] = [];
  let banked = zeroBank();
  let banks = 0;

  function factsOf(s: GameState): RunFacts {
    return {
      mode: s.mode, difficulty: s.difficulty, chapter: s.chapter, mutators: s.loadout.mutators, victory: flags.victory,
      score: s.score, maxCombo: Math.max(s.combo.best, s.runStats.maxCombo), maxPower: flags.maxPower,
      overdrives: s.runStats.overdrives, goldenKills: s.runStats.goldenKills, perks: s.perks,
      cleared: flags.cleared, flawless: flags.flawless, cool: flags.cool, revived: flags.revived,
    };
  }

  function noteEvent(e: GameEvent, s: GameState): void {
    if (e.type === 'victory') flags.victory = true;
    if (e.type === 'overheat') flags.overheated = true;
    if (e.type === 'player_revived') flags.revived = true;
    if (e.type !== 'chapter_complete') return;
    if (!flags.cleared.includes(e.chapter)) flags.cleared.push(e.chapter);
    if (s.chapterStats.deaths === 0) flags.flawless = true;
    if (!flags.overheated) flags.cool = true;
    flags.overheated = false;
  }

  function unlockLive(p: ReturnType<typeof loadProfile>, facts: RunFacts): boolean {
    // Without storage the profile never remembers an unlock, so a condition that stays true must not re-unlock each batch.
    const fresh = evaluateAchievements(facts, p).filter((id) => !pending.includes(id));
    const date = new Date().toISOString();
    for (const id of fresh) {
      const reward = unlockAchievement(p, id, date);
      pending.push(id);
      const def = achievementById(id);
      if (def) notify(`ACHIEVEMENT: ${def.name} +${reward} CORN`);
      playEffect('achievement');
    }
    return fresh.length > 0;
  }

  function observe(events: readonly GameEvent[], s: GameState): void {
    if (s !== st) {
      st = s;
      flags = freshFlags();
      Object.assign(base, ZERO_BASE);
      pending = [];
      banked = zeroBank();
      banks = 0;
    }
    for (const e of events) noteEvent(e, s);
    flags.maxPower = Math.max(flags.maxPower, s.player.power);
    const p = loadProfile(kv);
    const changed = applyLive(p, events, s, base, BOSS_INFO.twin_hens.name);
    const unlocked = unlockLive(p, factsOf(s));
    if (changed || unlocked) saveProfile(p, kv);
  }

  function finish(summary: RunSummary): RunReward {
    const p = loadProfile(kv);
    const delta: BankDelta = {
      corn: summary.corn - banked.corn,
      scoreBlocks: scoreBlocks(summary.score) - scoreBlocks(banked.score),
      bosses: summary.bossesKilled - banked.bosses,
      first: banks === 0,
    };
    const facts: RunFacts = st ? { ...factsOf(st), victory: flags.victory || summary.victory } : {
      mode: summary.mode, difficulty: summary.difficulty, chapter: summary.chapter, mutators: summary.mutators,
      victory: summary.victory, score: summary.score, maxCombo: summary.maxCombo, maxPower: 0, overdrives: 0,
      goldenKills: summary.goldenKills, perks: {}, cleared: [], flawless: false, cool: false, revived: false,
    };
    const reward = bankRun(p, summary, delta, facts, pending, new Date().toISOString());
    saveProfile(p, kv);
    pending = [];
    banked = { corn: summary.corn, score: summary.score, bosses: summary.bossesKilled };
    banks += 1;
    return reward;
  }

  return {
    observe,
    state: () => st,
    finish,
    reset(): void {
      st = null;
      flags = freshFlags();
      Object.assign(base, ZERO_BASE);
      pending = [];
      banked = zeroBank();
      banks = 0;
    },
  };
}
