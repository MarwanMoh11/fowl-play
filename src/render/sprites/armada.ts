// src/render/sprites/armada.ts — OWNER: H3. New enemies and enemy projectiles (HENPOCALYPSE §H3).
// Phase-0 placeholders: H3 replaces every entry with real art (keep key, size and frame count unless noted in the spec).
import { placeholderSprite as ph } from './placeholder';
import type { SpriteDef } from './types';

export const ARMADA_SPRITES: SpriteDef[] = [
  ph('enemy_chicken_ninja', 60, 56, 2, '#2B2D42'),
  ph('enemy_chicken_bomber', 70, 60, 2, '#6A994E'),
  ph('enemy_egg_pod', 40, 50, 2, '#E9C46A'),
  ph('enemy_chicken_jet', 66, 50, 2, '#F4A261'),
  ph('enemy_chicken_turret', 68, 64, 2, '#8D99AE'),
  ph('enemy_chicken_shield', 64, 60, 2, '#4361EE'),
  ph('enemy_chicken_mech', 84, 80, 2, '#5E6B7D'),
  ph('enemy_space_mine', 38, 38, 2, '#E63946'),
  ph('enemy_chicken_ghost', 60, 56, 2, '#CDB4DB'),
  ph('enemy_chicken_healer', 62, 58, 2, '#80ED99'),
  ph('enemy_chicken_sniper', 62, 58, 2, '#9D0208'),
  ph('enemy_chicken_mother', 88, 82, 2, '#FFF8EE'),
  ph('enemy_chicken_void', 64, 60, 2, '#3A0CA3'),
  ph('enemy_chicken_gold', 62, 58, 2, '#FFC93C'),
  ph('enemy_chicken_elite', 72, 66, 2, '#B08D57'),
  ph('enemy_comet', 46, 46, 3, '#FF6B35'),
  ph('proj_cluster_egg', 20, 26, 1, '#B5E48C'),
  ph('proj_shard', 8, 16, 1, '#FFE66D'),
  ph('proj_void_orb', 26, 26, 2, '#7209B7'),
  ph('proj_fireball', 30, 30, 2, '#FF4D00'),
  ph('proj_gear', 28, 28, 1, '#B08D57'),
];
