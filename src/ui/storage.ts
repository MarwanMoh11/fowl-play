// src/ui/storage.ts — OWNER: A4
// STUB(A1): owner A4 implements (§8.7 Storage)
import { DEFAULT_SETTINGS, type Settings } from '../shared/contracts';

export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function safeStorage(): KV | null {
  return null;
}

export function loadSettings(_kv?: KV | null): Settings {
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(_s: Settings, _kv?: KV | null): void {}
