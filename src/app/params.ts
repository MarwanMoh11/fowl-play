// src/app/params.ts — OWNER: A1. URL parameters (§7.15).
import type { Difficulty } from '../sim/types';

export interface UrlParams {
  debug: boolean;
  seed: number | null;
  difficulty: Difficulty | null;
  chapter: number | null;
  wave: number | null;
  god: boolean;
  gallery: boolean;
}

function intParam(q: URLSearchParams, key: string, min: number, max: number): number | null {
  const raw = q.get(key);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Pure: parses a location.search string. */
export function parseParams(search: string): UrlParams {
  const q = new URLSearchParams(search);
  const d = q.get('difficulty');
  const seed = intParam(q, 'seed', 0, 0xffffffff);
  return {
    debug: q.get('debug') === '1',
    seed,
    difficulty: d === 'easy' || d === 'normal' || d === 'hard' ? d : null,
    chapter: intParam(q, 'chapter', 1, 999),
    wave: intParam(q, 'wave', 1, 10),
    god: q.get('god') === '1',
    gallery: q.get('gallery') === '1',
  };
}
