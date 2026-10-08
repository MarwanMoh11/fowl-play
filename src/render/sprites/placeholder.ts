// src/render/sprites/placeholder.ts — OWNER: LEAD (Phase 0). Temporary sprite for keys whose art is not drawn yet.
// Every use must be gone by the final gate (tests/a1.henpocalypse.test.ts checks).
import type { SpriteKey } from '../../shared/contracts';
import { ell } from './draw';
import { def, type SpriteDef } from './types';

export function placeholderSprite(key: SpriteKey, w: number, h: number, frames: number, color: string): SpriteDef {
  return def({
    key, w, h, frames,
    draw: (ctx, f) => {
      ell(ctx, w / 2, h / 2, Math.max(1, w / 2 - 1.5), Math.max(1, h / 2 - 1.5), color, 0);
      ell(ctx, w / 2, h / 2, Math.max(1, w / 6), Math.max(1, h / 6), f % 2 === 0 ? '#FFFFFF' : '#1B1030', 0, 0);
    },
  });
}
