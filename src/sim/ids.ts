// src/sim/ids.ts — OWNER: A1
import type { GameState } from './types';

export function newId(state: GameState): number {
  return state.nextId++;
}
