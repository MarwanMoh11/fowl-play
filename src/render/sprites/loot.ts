// src/render/sprites/loot.ts — OWNER: H5. New pickups, HUD icons and fx sprites (HENPOCALYPSE §H5).
// Phase-0 placeholders: H5 replaces every entry with real art (keep key, size and frame count unless noted in the spec).
import { placeholderSprite as ph } from './placeholder';
import type { SpriteDef } from './types';

export const LOOT_SPRITES: SpriteDef[] = [
  ph('pickup_gift_flak', 34, 34, 1, '#FF9F1C'),
  ph('pickup_gift_flame', 34, 34, 1, '#FF4D00'),
  ph('pickup_gift_sickle', 34, 34, 1, '#4CC9F0'),
  ph('pickup_gift_homing', 34, 34, 1, '#B5E61D'),
  ph('pickup_gift_rail', 34, 34, 1, '#E0FBFC'),
  ph('pickup_gift_prism', 34, 34, 1, '#F72585'),
  ph('pickup_pu_shield', 32, 32, 2, '#4361EE'),
  ph('pickup_pu_magnet', 32, 32, 2, '#E63946'),
  ph('pickup_pu_rapid', 32, 32, 2, '#FFD60A'),
  ph('pickup_pu_drones', 32, 32, 2, '#8FE3FF'),
  ph('pickup_pu_timewarp', 32, 32, 2, '#9B5DE5'),
  ph('pickup_pu_double', 32, 32, 2, '#FFC93C'),
  ph('pickup_life_up', 32, 30, 2, '#FF3B3B'),
  ph('pickup_golden_egg', 26, 32, 2, '#FFC93C'),
  ph('pickup_corn', 18, 24, 1, '#FFD93B'),
  ph('icon_weapon_flak', 24, 24, 1, '#FF9F1C'),
  ph('icon_weapon_flame', 24, 24, 1, '#FF4D00'),
  ph('icon_weapon_sickle', 24, 24, 1, '#4CC9F0'),
  ph('icon_weapon_homing', 24, 24, 1, '#B5E61D'),
  ph('icon_weapon_rail', 24, 24, 1, '#E0FBFC'),
  ph('icon_weapon_prism', 24, 24, 1, '#F72585'),
  ph('icon_shield', 22, 24, 1, '#4361EE'),
  ph('icon_fury', 24, 24, 1, '#F72585'),
  ph('icon_corn', 16, 22, 1, '#FFD93B'),
  ph('icon_pu_magnet', 22, 22, 1, '#E63946'),
  ph('icon_pu_rapid', 22, 22, 1, '#FFD60A'),
  ph('icon_pu_drones', 22, 22, 1, '#8FE3FF'),
  ph('icon_pu_timewarp', 22, 22, 1, '#9B5DE5'),
  ph('icon_pu_double', 22, 22, 1, '#FFC93C'),
  ph('fx_shield_bubble', 96, 96, 1, '#4CC9F0'),
  ph('fx_smoke', 48, 48, 1, '#ADB5BD'),
  ph('fx_gravity', 128, 128, 1, '#7209B7'),
];
