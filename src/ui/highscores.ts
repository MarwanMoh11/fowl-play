// src/ui/highscores.ts — OWNER: A4. Top-10 table persisted through an injectable KV (§8.7 Storage).
import { STORAGE_KEYS } from '../shared/contracts';
import type { Difficulty } from '../sim/types';
import {
  DEFAULT_PILOT_NAME, readJson, removeKey, safeStorage, sanitizeName, writeJson, type KV,
} from './storage';

export interface HighScore {
  name: string;
  score: number;
  chapter: number;
  wave: number;
  difficulty: Difficulty;
  date: string; // ISO date
}

export const MAX_HIGH_SCORES = 10;
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

function parseEntry(raw: unknown): HighScore | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const score = r.score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) return null;
  const difficulty = DIFFICULTIES.find((d) => d === r.difficulty);
  if (!difficulty) return null;
  const name = typeof r.name === 'string' ? sanitizeName(r.name).trim() : '';
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1);
  return {
    name: name === '' ? DEFAULT_PILOT_NAME : name,
    score: Math.floor(score),
    chapter: num(r.chapter),
    wave: num(r.wave),
    difficulty,
    date: typeof r.date === 'string' ? r.date : '',
  };
}

/** Sorted by score descending (stable), capped at 10. Drops invalid entries. */
export function normalizeScores(raw: unknown): HighScore[] {
  if (!Array.isArray(raw)) return [];
  const list: HighScore[] = [];
  for (const item of raw) {
    const e = parseEntry(item);
    if (e) list.push(e);
  }
  return list.sort((a, b) => b.score - a.score).slice(0, MAX_HIGH_SCORES);
}

export function loadHighScores(kv: KV | null = safeStorage()): HighScore[] {
  return normalizeScores(readJson(kv, STORAGE_KEYS.highscores));
}

/** Whether `score` would earn a place: positive and beats the 10th entry (or the table has room). */
export function qualifiesFor(list: readonly HighScore[], score: number): boolean {
  if (!Number.isFinite(score) || score <= 0) return false;
  if (list.length < MAX_HIGH_SCORES) return true;
  return score > list[list.length - 1].score;
}

export function qualifies(score: number, kv: KV | null = safeStorage()): boolean {
  return qualifiesFor(loadHighScores(kv), score);
}

/** Pure insert. Ties rank below existing equal scores. rank is 0-based, -1 if it did not make the table. */
export function insertScore(list: readonly HighScore[], entry: HighScore): { list: HighScore[]; rank: number } {
  const next = [...list];
  let rank = next.findIndex((e) => entry.score > e.score);
  if (rank < 0) rank = next.length;
  next.splice(rank, 0, entry);
  if (rank >= MAX_HIGH_SCORES) return { list: next.slice(0, MAX_HIGH_SCORES), rank: -1 };
  return { list: next.slice(0, MAX_HIGH_SCORES), rank };
}

/** Stores the entry if it qualifies. Returns its 0-based rank, or -1 when it did not make the table. */
export function addHighScore(entry: HighScore, kv: KV | null = safeStorage()): number {
  const current = loadHighScores(kv);
  if (!qualifiesFor(current, entry.score)) return -1;
  const clean = parseEntry(entry);
  if (!clean) return -1;
  const { list, rank } = insertScore(current, clean);
  writeJson(kv, STORAGE_KEYS.highscores, list);
  return rank;
}

export function clearHighScores(kv: KV | null = safeStorage()): void {
  removeKey(kv, STORAGE_KEYS.highscores);
}
