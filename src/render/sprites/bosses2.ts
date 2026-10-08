// src/render/sprites/bosses2.ts — OWNER: H2. HENPOCALYPSE bosses and mini-bosses (HENPOCALYPSE §H2).
// Phase-0 placeholders: H2 replaces every entry with real art (keep key, size and frame count unless noted in the spec).
import { placeholderSprite as ph } from './placeholder';
import type { SpriteDef } from './types';

export const BOSS2_SPRITES: SpriteDef[] = [
  ph('boss_broodmother', 300, 240, 2, '#C77DFF'),
  ph('boss_rotisserie', 320, 260, 3, '#E85D04'),
  ph('boss_colossus', 340, 280, 3, '#B08D57'),
  ph('boss_kraken', 320, 300, 2, '#FFB703'),
  ph('boss_phoenix', 300, 240, 2, '#FF5A1F'),
  ph('boss_scrambler', 300, 300, 2, '#3C096C'),
  ph('boss_empress', 380, 300, 3, '#D00000'),
  ph('boss_mini_brigadier', 160, 140, 2, '#FF6B5B'),
  ph('boss_mini_ace', 170, 120, 2, '#6C5CE7'),
  ph('boss_mini_cuckoo', 150, 170, 2, '#A47148'),
  ph('boss_mini_jelly', 160, 160, 2, '#FFD60A'),
  ph('boss_mini_stormcrow', 170, 140, 2, '#4A4E69'),
  ph('boss_mini_scarecrow', 150, 170, 2, '#BC6C25'),
  ph('boss_mini_guard', 160, 160, 2, '#FFC93C'),
];
