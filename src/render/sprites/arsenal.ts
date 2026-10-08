// src/render/sprites/arsenal.ts — OWNER: H1. New ships, drone and player projectiles (HENPOCALYPSE §H1).
// Phase-0 placeholders: H1 replaces every entry with real art (keep key, size and frame count unless noted in the spec).
import { placeholderSprite as ph } from './placeholder';
import type { SpriteDef } from './types';

export const ARSENAL_SPRITES: SpriteDef[] = [
  ph('ship_bantam', 52, 48, 3, '#39FF88'),
  ph('ship_bulwark', 74, 62, 3, '#FFB627'),
  ph('ship_phoenix', 68, 60, 3, '#FF5A1F'),
  ph('drone', 28, 28, 2, '#8FE3FF'),
  ph('proj_flak', 10, 10, 1, '#FF9F1C'),
  ph('proj_flame', 20, 20, 2, '#FF4D00'),
  ph('proj_sickle', 30, 30, 2, '#4CC9F0'),
  ph('proj_homing', 10, 22, 2, '#B5E61D'),
  ph('proj_rail', 14, 40, 1, '#E0FBFC'),
  ph('proj_prism', 14, 22, 1, '#F72585'),
];
