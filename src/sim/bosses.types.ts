// src/sim/bosses.types.ts — OWNER: A2 (initial version by A1)
export type BossId =
  | 'hen' | 'carrier' | 'rooster' | 'twin_hens' | 'dreadnought'
  // HENPOCALYPSE chapter bosses (chapters 6–12)
  | 'broodmother' | 'rotisserie' | 'colossus' | 'kraken' | 'phoenix' | 'scrambler' | 'empress'
  // HENPOCALYPSE mini-bosses (wave 5 of chapters 6–12)
  | 'mini_brigadier' | 'mini_ace' | 'mini_cuckoo' | 'mini_jelly' | 'mini_stormcrow' | 'mini_scarecrow' | 'mini_guard';

export interface BossRuntime {
  id: BossId;
  phase: number;            // 0-based
  entering: boolean;
  t: number;                // s since spawn
  attack: string;           // current attack name, or 'idle'
  attackT: number;          // s into current attack
  cooldown: number;         // s until next attack may start
  cycleIndex: number;       // position in the attack cycle
  partner: number;          // twin hens: other boss's enemy id; otherwise -1
  data: Record<string, number>; // JSON-safe scratch values
}
