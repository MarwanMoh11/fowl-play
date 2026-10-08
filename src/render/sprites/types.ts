// src/render/sprites/types.ts — OWNER: A5. Registry metadata types (canvas-free).
import type { SpriteKey } from '../../shared/contracts';

export type Ctx = CanvasRenderingContext2D;

export interface SpriteDef {
  key: SpriteKey;
  /** Logical size in px. */
  w: number;
  h: number;
  frames: number;
  /** Extra transparent margin (logical px per side) so baked glows can spill past w x h. */
  pad: number;
  /** Draws one frame in logical px with the origin at the top-left corner of the w x h box. */
  draw(ctx: Ctx, frame: number): void;
}

export type SpriteDefInput = Omit<SpriteDef, 'pad'> & { pad?: number };

export function def(d: SpriteDefInput): SpriteDef {
  return { ...d, pad: d.pad ?? 0 };
}
