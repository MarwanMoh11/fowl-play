// src/ui/storage.ts — OWNER: A4. Persistent settings and small values (§8.7 Storage).
// Every access is wrapped in try/catch: storage can be missing, full, or blocked (private mode).
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Settings } from '../shared/contracts';
import type { Difficulty } from '../sim/types';

export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const DEFAULT_PILOT_NAME = 'PILOT';
export const MAX_NAME_LENGTH = 12;
const PROBE_KEY = 'fowlplay.v1.probe';
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

/** localStorage if it works, otherwise null. Never throws. */
export function safeStorage(): KV | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    localStorage.setItem(PROBE_KEY, '1');
    localStorage.removeItem(PROBE_KEY);
    return localStorage;
  } catch {
    return null;
  }
}

function readRaw(kv: KV | null, key: string): unknown {
  if (!kv) return undefined;
  try {
    const text = kv.getItem(key);
    return text === null || text === undefined ? undefined : (JSON.parse(text) as unknown);
  } catch {
    return undefined;
  }
}

function writeRaw(kv: KV | null, key: string, value: unknown): boolean {
  if (!kv) return false;
  try {
    kv.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clamp01(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function toBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0' || s === '') return false;
  }
  return fallback;
}

/** Turns any parsed JSON into a complete, valid Settings object. */
export function parseSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const diff = DIFFICULTIES.find((x) => x === r.difficulty) ?? d.difficulty;
  return {
    difficulty: diff,
    masterVolume: clamp01(r.masterVolume, d.masterVolume),
    musicVolume: clamp01(r.musicVolume, d.musicVolume),
    sfxVolume: clamp01(r.sfxVolume, d.sfxVolume),
    screenShake: toBool(r.screenShake, d.screenShake),
    reduceFlashes: toBool(r.reduceFlashes, d.reduceFlashes),
    showFps: toBool(r.showFps, d.showFps),
    autoFire: toBool(r.autoFire, d.autoFire),
    mouseControl: toBool(r.mouseControl, d.mouseControl),
  };
}

export function loadSettings(kv: KV | null = safeStorage()): Settings {
  return parseSettings(readRaw(kv, STORAGE_KEYS.settings));
}

export function saveSettings(s: Settings, kv: KV | null = safeStorage()): void {
  writeRaw(kv, STORAGE_KEYS.settings, parseSettings(s));
}

/** Uppercase A-Z 0-9 and spaces only, at most 12 characters. */
export function sanitizeName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, MAX_NAME_LENGTH);
}

export function loadLastName(kv: KV | null = safeStorage()): string {
  const raw = readRaw(kv, STORAGE_KEYS.lastName);
  const name = typeof raw === 'string' ? sanitizeName(raw).trim() : '';
  return name === '' ? DEFAULT_PILOT_NAME : name;
}

export function saveLastName(name: string, kv: KV | null = safeStorage()): void {
  writeRaw(kv, STORAGE_KEYS.lastName, sanitizeName(name).trim());
}

/** Shared by highscores.ts. */
export function readJson(kv: KV | null, key: string): unknown {
  return readRaw(kv, key);
}

export function writeJson(kv: KV | null, key: string, value: unknown): boolean {
  return writeRaw(kv, key, value);
}

export function removeKey(kv: KV | null, key: string): void {
  if (!kv) return;
  try {
    kv.removeItem(key);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}
