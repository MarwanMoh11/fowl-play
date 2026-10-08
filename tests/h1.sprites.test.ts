// tests/h1.sprites.test.ts — OWNER: H1. Arsenal art: the ten keys exist, every frame draws without canvas violations,
// and the painting stays inside the sprite box plus its glow padding (2 px slack for outlines).
import { describe, expect, it } from 'vitest';
import { mockCtx } from './a5.mockctx';
import { ARSENAL_SPRITES } from '../src/render/sprites/arsenal';

const KEYS = [
  'ship_bantam', 'ship_bulwark', 'ship_phoenix', 'drone',
  'proj_flak', 'proj_flame', 'proj_sickle', 'proj_homing', 'proj_rail', 'proj_prism',
];

describe('H1 arsenal art', () => {
  it('defines exactly the ten arsenal keys', () => {
    expect(ARSENAL_SPRITES.map((d) => d.key).sort()).toEqual([...KEYS].sort());
  });

  it.each(ARSENAL_SPRITES.map((d) => [d.key, d] as const))('%s draws every frame cleanly inside its box', (_key, d) => {
    for (let f = 0; f < d.frames; f++) {
      const m = mockCtx();
      d.draw(m.ctx, f);
      expect(m.violations, `frame ${f}`).toEqual([]);
      expect(m.paints(), `frame ${f}`).toBeGreaterThan(0);
      const b = m.bounds();
      expect(b, `frame ${f}`).not.toBeNull();
      const slack = d.pad + 2;
      expect(b!.minX).toBeGreaterThanOrEqual(-slack);
      expect(b!.minY).toBeGreaterThanOrEqual(-slack);
      expect(b!.maxX).toBeLessThanOrEqual(d.w + slack);
      expect(b!.maxY).toBeLessThanOrEqual(d.h + slack);
    }
  });
});
