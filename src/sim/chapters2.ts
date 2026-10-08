// src/sim/chapters2.ts — OWNER: H3. HENPOCALYPSE chapters 6–12 (wave 5 = mini-boss, wave 10 = boss).
// Phase-0 placeholder: classic waves with the new bosses slotted in. H3 replaces every table here.
import type { BossId } from './bosses.types';
import type { ChapterDef, GroupSpec, WaveDef } from './waves.types';

const boss = (id: BossId): GroupSpec => ({ pattern: 'boss', boss: id });
const grid = (rowKinds: string, cols: number): GroupSpec => ({ pattern: 'grid', rowKinds, cols });
const w = (name: string, ...groups: GroupSpec[]): WaveDef => ({ name, groups });

function placeholder(name: string, palette: [string, string], mini: BossId, major: BossId): ChapterDef {
  return {
    name, palette,
    waves: [
      w('Wave 1', grid('RRBBB', 8)), w('Wave 2', grid('ARRBB', 8)), w('Wave 3', grid('RRRBB', 10)),
      w('Wave 4', grid('AARBB', 10)), w('MINI-BOSS', boss(mini)), w('Wave 6', grid('AARRB', 10)),
      w('Wave 7', grid('AARRR', 10)), w('Wave 8', grid('AAARR', 10)), w('Wave 9', grid('AAARRR', 12)),
      w('BOSS', boss(major)),
    ],
  };
}

export const HENPOCALYPSE_CHAPTERS: readonly ChapterDef[] = [
  placeholder('Nebula Nests', ['#1B0B2E', '#5C1F5A'], 'mini_brigadier', 'broodmother'),
  placeholder('Solar Forge', ['#2E0A00', '#A83A00'], 'mini_ace', 'rotisserie'),
  placeholder('Clockwork Coop', ['#0E1F1C', '#5B4A1E'], 'mini_cuckoo', 'colossus'),
  placeholder('The Yolk Sea', ['#2B2200', '#C7A008'], 'mini_jelly', 'kraken'),
  placeholder('Thunderhead Roost', ['#0A1020', '#2E3F66'], 'mini_stormcrow', 'phoenix'),
  placeholder('Black Hole Barnyard', ['#050008', '#2A0A40'], 'mini_scarecrow', 'scrambler'),
  placeholder('The Cluckhive Throne', ['#1F0010', '#7A0A2A'], 'mini_guard', 'empress'),
];
