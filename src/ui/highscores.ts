// src/ui/highscores.ts — OWNER: A4
// STUB(A1): owner A4 implements (§8.7 Storage)
import type { Difficulty } from '../sim/types';
import type { KV } from './storage';

export interface HighScore {
  name: string;
  score: number;
  chapter: number;
  wave: number;
  difficulty: Difficulty;
  date: string; // ISO date
}

export function loadHighScores(_kv?: KV | null): HighScore[] {
  return [];
}

export function qualifies(_score: number, _kv?: KV | null): boolean {
  return false;
}

export function addHighScore(_entry: HighScore, _kv?: KV | null): number {
  return -1;
}
