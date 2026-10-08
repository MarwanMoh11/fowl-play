// src/render/sprites/registry.ts — OWNER: H5 (was A5). Canvas-free sprite registry: key -> size, frames, draw fn.
import { SPRITE_KEYS, type SpriteKey } from '../../shared/contracts';
import { BOSS_SPRITES } from './bosses';
import { ENEMY_SPRITES } from './enemies';
import { FX_SPRITES } from './fx';
import { HEN_SPRITES } from './hens';
import { PICKUP_SPRITES } from './pickups';
import { PROJECTILE_SPRITES } from './projectiles';
import { SHIP_SPRITES } from './ship';
import type { SpriteDef } from './types';
import { WARSHIP_SPRITES } from './warships';
import { ARSENAL_SPRITES } from './arsenal';
import { ARMADA_SPRITES } from './armada';
import { BOSS2_SPRITES } from './bosses2';
import { LOOT_SPRITES } from './loot';

const ALL: SpriteDef[] = [
  ...SHIP_SPRITES, ...HEN_SPRITES, ...ENEMY_SPRITES, ...BOSS_SPRITES, ...WARSHIP_SPRITES,
  ...PROJECTILE_SPRITES, ...PICKUP_SPRITES, ...FX_SPRITES,
  ...ARSENAL_SPRITES, ...ARMADA_SPRITES, ...BOSS2_SPRITES, ...LOOT_SPRITES,
];

export const SPRITE_REGISTRY: Readonly<Record<SpriteKey, SpriteDef>> = (() => {
  const reg = {} as Record<SpriteKey, SpriteDef>;
  for (const d of ALL) reg[d.key] = d;
  for (const k of SPRITE_KEYS) {
    if (!reg[k]) throw new Error(`sprite registry is missing "${k}"`);
  }
  return reg;
})();

export function spriteDef(key: SpriteKey): SpriteDef {
  return SPRITE_REGISTRY[key];
}
