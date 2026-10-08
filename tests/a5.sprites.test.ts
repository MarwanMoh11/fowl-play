// tests/a5.sprites.test.ts — OWNER: A5. Registry metadata, atlas packing and draw functions (no real canvas).
import { describe, expect, it } from 'vitest';
import { SPRITE_KEYS, WEAPON_INFO } from '../src/shared/contracts';
import { packSprites, spriteSize } from '../src/render/sprites/atlas';
import { SPRITE_REGISTRY } from '../src/render/sprites/registry';
import { ATLAS_SCALE } from '../src/render/sprites/palette';
import { mockCtx } from './a5.mockctx';

describe('a5 sprite registry', () => {
  it('has an entry for every SPRITE_KEYS item with positive size and frames', () => {
    for (const key of SPRITE_KEYS) {
      const d = SPRITE_REGISTRY[key];
      expect(d, key).toBeDefined();
      expect(d.key).toBe(key);
      expect(d.w, key).toBeGreaterThan(0);
      expect(d.h, key).toBeGreaterThan(0);
      expect(Number.isInteger(d.frames) && d.frames >= 1, key).toBe(true);
      expect(typeof d.draw).toBe('function');
      expect(spriteSize(key)).toEqual({ w: d.w, h: d.h, frames: d.frames });
    }
    expect(Object.keys(SPRITE_REGISTRY).length).toBe(SPRITE_KEYS.length);
  });

  it('matches the sizes and frame counts of spec 8.2', () => {
    const expected: Record<string, [number, number, number]> = {
      ship: [64, 56, 3], ship_shield: [84, 84, 1], enemy_chicken_basic: [60, 56, 2], enemy_chicken_red: [62, 58, 2],
      enemy_chicken_armored: [64, 60, 2], enemy_chicken_armored_dented: [64, 60, 2], enemy_chicken_ufo: [76, 60, 2],
      enemy_chick: [32, 30, 2], enemy_asteroid_l: [84, 84, 3], enemy_asteroid_m: [56, 56, 3], enemy_asteroid_s: [30, 30, 3],
      boss_hen: [240, 220, 2], boss_carrier: [280, 200, 3], boss_rooster: [230, 230, 2], boss_dreadnought: [340, 260, 3],
      proj_pulse: [8, 20, 1], proj_neutron: [16, 16, 1], proj_laser: [6, 28, 1], proj_arc: [10, 10, 1], proj_missile: [16, 34, 2],
      proj_egg: [16, 20, 1], proj_enemy_shot: [16, 16, 2], proj_boss_egg: [22, 26, 1], proj_feather_knife: [10, 26, 1],
      pickup_drumstick: [30, 30, 1], pickup_roast: [40, 32, 1], pickup_power_core: [30, 30, 2],
      pickup_gift_pulse: [34, 34, 1], pickup_gift_arc: [34, 34, 1], icon_life: [26, 22, 1], icon_missile: [14, 26, 1],
      icon_food: [22, 22, 1], icon_weapon_pulse: [24, 24, 1], icon_weapon_arc: [24, 24, 1], fx_egg_splat: [44, 18, 1], fx_puff: [32, 32, 1],
    };
    for (const [key, [w, h, frames]] of Object.entries(expected)) {
      const d = SPRITE_REGISTRY[key as keyof typeof SPRITE_REGISTRY];
      expect([d.w, d.h, d.frames], key).toEqual([w, h, frames]);
    }
  });

  it('every frame of every sprite draws something without throwing or invalid canvas calls', () => {
    for (const key of SPRITE_KEYS) {
      const d = SPRITE_REGISTRY[key];
      for (let f = 0; f < d.frames; f++) {
        const { ctx, paints, violations } = mockCtx();
        expect(() => d.draw(ctx, f), `${key}#${f}`).not.toThrow();
        expect(paints(), `${key}#${f} paints`).toBeGreaterThan(0);
        expect(violations, `${key}#${f}`).toEqual([]);
      }
    }
  });

  it('keeps all painted geometry inside the sprite box plus its glow padding', () => {
    const tol = 1.2;
    const bad: string[] = [];
    for (const key of SPRITE_KEYS) {
      const d = SPRITE_REGISTRY[key];
      for (let f = 0; f < d.frames; f++) {
        const m = mockCtx();
        d.draw(m.ctx, f);
        const b = m.bounds();
        if (!b) { bad.push(`${key}#${f}: nothing painted`); continue; }
        const over = [-d.pad - b.minX, -d.pad - b.minY, b.maxX - d.w - d.pad, b.maxY - d.h - d.pad].map((v) => Math.round(v * 10) / 10);
        if (over.some((v) => v > tol)) bad.push(`${key}#${f}: overflow L/T/R/B = ${over.join('/')} (bounds ${JSON.stringify(b)})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('fills most of its box (no tiny or misplaced art)', () => {
    const bad: string[] = [];
    for (const key of SPRITE_KEYS) {
      const d = SPRITE_REGISTRY[key];
      for (let f = 0; f < d.frames; f++) {
        const m = mockCtx();
        d.draw(m.ctx, f);
        const b = m.bounds();
        if (!b || key === 'icon_weapon_laser') continue; // a long thin line by design
        const fw = (Math.min(b.maxX, d.w + d.pad) - Math.max(b.minX, -d.pad)) / d.w;
        const fh = (Math.min(b.maxY, d.h + d.pad) - Math.max(b.minY, -d.pad)) / d.h;
        if (fw < 0.8 || fh < 0.8) bad.push(`${key}#${f}: covers ${(fw * 100).toFixed(0)}% x ${(fh * 100).toFixed(0)}%`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('gift sprites exist for every weapon colour', () => {
    for (const w of Object.keys(WEAPON_INFO)) expect(SPRITE_REGISTRY[`pickup_gift_${w}` as 'pickup_gift_arc']).toBeDefined();
  });
});

describe('a5 atlas packing', () => {
  const defs = SPRITE_KEYS.map((k) => SPRITE_REGISTRY[k]);
  const layout = packSprites(defs, ATLAS_SCALE);

  it('gives every frame a rect inside the atlas and never overlaps', () => {
    const all: { x: number; y: number; w: number; h: number; id: string }[] = [];
    for (const d of defs) {
      expect(layout.rects[d.key].length).toBe(d.frames);
      layout.rects[d.key].forEach((r, f) => {
        expect(r, `${d.key}#${f}`).toBeDefined();
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(layout.width);
        expect(r.y + r.h).toBeLessThanOrEqual(layout.height);
        expect(r.w).toBe(Math.ceil((d.w + d.pad * 2) * ATLAS_SCALE));
        all.push({ ...r, id: `${d.key}#${f}` });
      });
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.id} vs ${b.id}`).toBe(false);
      }
    }
  });

  it('keeps the atlas within a sane texture size', () => {
    expect(layout.width).toBeLessThanOrEqual(2048);
    expect(layout.height).toBeLessThanOrEqual(4096);
  });
});
