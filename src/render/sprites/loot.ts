// src/render/sprites/loot.ts — OWNER: H5. Loot art: gift boxes and weapon icons for the six HENPOCALYPSE weapons,
// plus the index of every loot, power-up, HUD and fx sprite (power-up and HUD art in loot-hud.ts, effects in loot-fx.ts).
import { WEAPON_INFO, type SpriteKey } from '../../shared/contracts';
import { circ, ellipsePath, line, paint, poly } from './draw';
import { PAL } from './palette';
import { drawGift } from './pickups';
import { flamePath, LOOT_HUD_SPRITES } from './loot-hud';
import { LOOT_FX_SPRITES } from './loot-fx';
import { def, type Ctx, type SpriteDef } from './types';

/** The six weapons added by HENPOCALYPSE; the four classic weapons keep their art in pickups.ts. */
export const NEW_WEAPONS = ['flak', 'flame', 'sickle', 'homing', 'rail', 'prism'] as const;
type NewWeapon = typeof NEW_WEAPONS[number];

const OUTLINE_EXTRA = 2.4;

/** Outlined stroke, the same language as the classic weapon icons. */
function glyph(ctx: Ctx, pts: readonly number[], color: string, lw: number): void {
  line(ctx, pts, PAL.outline, lw + OUTLINE_EXTRA);
  line(ctx, pts, color, lw);
}

function drawFlakIcon(ctx: Ctx): void {
  const c = WEAPON_INFO.flak.color;
  for (const x of [3.5, 12, 20.5]) glyph(ctx, [12, 21, x, 3.5], c, 3);
}

function drawFlameIcon(ctx: Ctx): void {
  flamePath(ctx, 0, 0, 1);
  paint(ctx, WEAPON_INFO.flame.color, 2);
  ellipsePath(ctx, 12, 15, 4, 6);
  paint(ctx, '#FFF1A8', 0);
}

function drawSickleIcon(ctx: Ctx): void {
  const c = WEAPON_INFO.sickle.color;
  glyph(ctx, [3, 20.5, 12, 3.5, 21, 20.5], c, 4.5);
  line(ctx, [7, 14, 12, 7, 17, 14], '#FFFFFF', 1.2);
}

function drawHomingIcon(ctx: Ctx): void {
  const c = WEAPON_INFO.homing.color;
  for (const [x, y] of [[4.5, 17.5], [19.5, 17.5], [12, 6]]) {
    line(ctx, [12, 13, x, y], PAL.outline, 3);
    circ(ctx, x, y, 3.4, c, 1.8);
  }
}

function drawRailIcon(ctx: Ctx): void {
  glyph(ctx, [12, 2.5, 12, 21.5], '#E0FBFC', 3);
  glyph(ctx, [2, 15.5, 22, 15.5], WEAPON_INFO.rail.color, 3);
}

function drawPrismIcon(ctx: Ctx): void {
  poly(ctx, [12, 1.8, 22.5, 11.5, 12, 22.2, 1.5, 11.5], WEAPON_INFO.prism.color, 2);
  line(ctx, [12, 1.8, 12, 22.2], '#FFFFFF', 1);
  line(ctx, [1.5, 11.5, 22.5, 11.5], '#FFFFFF', 1);
}

const ICON_DRAW: Record<NewWeapon, (ctx: Ctx) => void> = {
  flak: drawFlakIcon, flame: drawFlameIcon, sickle: drawSickleIcon, homing: drawHomingIcon, rail: drawRailIcon, prism: drawPrismIcon,
};

const GIFTS: SpriteDef[] = NEW_WEAPONS.map((w) =>
  def({ key: `pickup_gift_${w}` as SpriteKey, w: 34, h: 34, frames: 1, pad: 5, draw: (ctx) => drawGift(ctx, w) }),
);
const WEAPON_ICONS: SpriteDef[] = NEW_WEAPONS.map((w) =>
  def({ key: `icon_weapon_${w}` as SpriteKey, w: 24, h: 24, frames: 1, draw: ICON_DRAW[w] }),
);

export const LOOT_SPRITES: SpriteDef[] = [...GIFTS, ...WEAPON_ICONS, ...LOOT_HUD_SPRITES, ...LOOT_FX_SPRITES];
