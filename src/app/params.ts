// src/app/params.ts — OWNER: LEAD. URL parameters (§7.15, HENPOCALYPSE debug).
import type { Difficulty, GameMode, MutatorId, ShipId } from '../sim/types';
import { GAME_MODES, SHIP_IDS } from '../sim/types';
import { MUTATORS } from '../sim/tuning/loadout';

export interface UrlParams {
  debug: boolean;
  seed: number | null;
  difficulty: Difficulty | null;
  chapter: number | null;
  wave: number | null;
  god: boolean;
  gallery: boolean;
  /** Debug only: start straight into a mode / ship / mutator set (with chapter or wave). */
  mode: GameMode | null;
  ship: ShipId | null;
  mutators: MutatorId[];
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
    mode: (GAME_MODES as readonly string[]).includes(q.get('mode') ?? '') ? (q.get('mode') as GameMode) : null,
    ship: (SHIP_IDS as readonly string[]).includes(q.get('ship') ?? '') ? (q.get('ship') as ShipId) : null,
    mutators: (q.get('mutators') ?? '').split(',').filter((m): m is MutatorId => m in MUTATORS),
  };
}
