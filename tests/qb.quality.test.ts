// tests/qb.quality.test.ts — OWNER: B. Adaptive quality tiers, FPS meter gaps, HUD legibility at small scale and the coarse-pointer layout.
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type SpriteApi, type SpriteKey } from '../src/shared/contracts';
import { createFpsMeter } from '../src/app/fps';
import { createWorldRenderer } from '../src/render/renderer';
import {
  COARSE_START_TIER, createQuality, isCoarsePointer, MAX_FRAME_S, qualityTierOf, TIER_SETTINGS, type QualityTier,
} from '../src/render/quality';
import { SPRITE_REGISTRY } from '../src/render/sprites/registry';
import { createGame } from '../src/sim/game';
import { drawHud, HUD_SMALL_SCALE } from '../src/ui/hud';
import { legibleSize, LEGIBLE_MAX_BOOST, LEGIBLE_MIN_CSS_PX, setLegibilityScale } from '../src/ui/text';
import { mockCtx } from './a5.mockctx';

/** Feeds `seconds` of frames of `dt` seconds each into a quality controller. */
function feed(q: ReturnType<typeof createQuality>, dt: number, seconds: number): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) q.observe(dt);
}

describe('qb adaptive quality tiers', () => {
  it('a 60 Hz screen never drops or raises a tier', () => {
    const q = createQuality('high');
    feed(q, 1 / 60, 30);
    expect(q.tier).toBe('high');
    const medium = createQuality('medium');
    feed(medium, 1 / 60, 30);
    expect(medium.tier).toBe('medium');
  });

  it('drops one tier after two slow windows, and never below low', () => {
    const q = createQuality('high');
    feed(q, 0.025, 1.5);
    expect(q.tier).toBe('high');
    feed(q, 0.025, 1);
    expect(q.tier).toBe('medium');
    feed(q, 0.025, 4);
    expect(q.tier).toBe('low');
    feed(q, 0.05, 10);
    expect(q.tier).toBe('low');
  });

  it('a coarse-pointer start (medium) reaches low under sustained load', () => {
    expect(COARSE_START_TIER).toBe('medium');
    const q = createQuality(COARSE_START_TIER);
    feed(q, 0.03, 4);
    expect(q.tier).toBe('low');
  });

  it('raises cautiously: six spare windows per step, capped at high', () => {
    const q = createQuality('low');
    feed(q, 0.008, 5);
    expect(q.tier).toBe('low');
    feed(q, 0.008, 1.5);
    expect(q.tier).toBe('medium');
    feed(q, 0.008, 12);
    expect(q.tier).toBe('high');
  });

  it('hysteresis: frame times between the raise and drop thresholds hold the tier', () => {
    for (const start of ['low', 'medium', 'high'] as QualityTier[]) {
      const q = createQuality(start);
      feed(q, 0.018, 20);
      expect(q.tier).toBe(start);
    }
  });

  it('paused frames (dt 0), hidden-tab gaps and hitches are not load', () => {
    const q = createQuality('high');
    for (let i = 0; i < 600; i++) q.observe(0);
    feed(q, MAX_FRAME_S + 0.4, 6);
    expect(q.tier).toBe('high');
    const r = createQuality('medium');
    feed(r, 0.016, 2);
    for (let i = 0; i < 100; i++) r.observe(0);
    feed(r, 0.016, 2);
    expect(r.tier).toBe('medium');
  });

  it('each tier has a particle budget no larger than the last one', () => {
    expect(TIER_SETTINGS.low.particleLimit).toBeLessThan(TIER_SETTINGS.medium.particleLimit);
    expect(TIER_SETTINGS.medium.particleLimit).toBeLessThan(TIER_SETTINGS.high.particleLimit);
    expect(TIER_SETTINGS.high.glow && TIER_SETTINGS.high.decor).toBe(true);
    expect(TIER_SETTINGS.low.decor).toBe(false);
  });

  it('is not coarse outside a browser, and an unbound context reports no tier', () => {
    expect(isCoarsePointer()).toBe(false);
    expect(qualityTierOf(mockCtx().ctx)).toBeNull();
    const ctx = mockCtx().ctx;
    const sprites: SpriteApi = {
      draw: (_c, _k: SpriteKey) => {},
      size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
      toCanvas: () => { throw new Error('unused'); },
    };
    createWorldRenderer(ctx, sprites);
    expect(qualityTierOf(ctx)).toBe('high');
  });
});

describe('qb fps meter', () => {
  it('counts frames and ignores hidden-tab gaps', () => {
    const m = createFpsMeter();
    for (let i = 0; i < 40; i++) m.tick(1 / 60);
    expect(m.value).toBe(60);
    m.tick(30);
    m.tick(1 / 60);
    for (let i = 0; i < 40; i++) m.tick(1 / 30);
    expect(m.value).toBe(30);
  });
});

describe('qb HUD legibility on small screens', () => {
  it('leaves text as designed on a large screen and enlarges small text on a phone', () => {
    setLegibilityScale(null);
    expect(legibleSize(14)).toBe(14);
    setLegibilityScale(0.5);
    expect(legibleSize(28)).toBe(28);
    expect(legibleSize(14) * 0.5).toBeCloseTo(LEGIBLE_MIN_CSS_PX, 6);
    expect(legibleSize(10) / 10).toBeCloseTo(LEGIBLE_MAX_BOOST, 6);
    setLegibilityScale(null);
    expect(legibleSize(14)).toBe(14);
  });

  it('drawHud at a phone scale draws larger text and restores the designed size afterwards', () => {
    const state = createGame({ seed: 4, difficulty: 'normal' });
    const fonts = (opts: Parameters<typeof drawHud>[5]): string[] => {
      const m = mockCtx();
      const seen: string[] = [];
      const ctx = new Proxy(m.ctx, {
        set(target, prop, value) {
          if (prop === 'font') seen.push(String(value));
          return Reflect.set(target, prop, value);
        },
      }) as unknown as CanvasRenderingContext2D;
      const sprites: SpriteApi = {
        draw: () => {},
        size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
        toCanvas: () => { throw new Error('unused'); },
      };
      drawHud(ctx, state, sprites, { ...DEFAULT_SETTINGS, showFps: true }, 60, opts);
      return seen;
    };
    const sizeOf = (f: string): number => Number(/bold (\d+(?:\.\d+)?)px/.exec(f)?.[1]);
    const designed = fonts({});
    const phone = fonts({ cssScale: 0.5 });
    expect(designed.map(sizeOf)).toContain(10);
    expect(phone.length).toBe(designed.length);
    // Every size is at least as large on a phone, and the smallest reads at about 9 CSS px or more.
    phone.forEach((f, i) => {
      expect(sizeOf(f)).toBeGreaterThanOrEqual(sizeOf(designed[i]));
      expect(sizeOf(f) * 0.5).toBeGreaterThanOrEqual(8.9);
    });
    expect(fonts({ cssScale: HUD_SMALL_SCALE + 0.01 }).map(sizeOf)).toEqual(designed.map(sizeOf));
    expect(legibleSize(10)).toBe(10);
  });

  it('shows the quality tier under the FPS counter only when FPS is on', () => {
    const state = createGame({ seed: 4, difficulty: 'normal' });
    const texts = (settings: typeof DEFAULT_SETTINGS, tier: string | null): string[] => {
      const m = mockCtx();
      const sprites: SpriteApi = {
        draw: () => {},
        size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
        toCanvas: () => { throw new Error('unused'); },
      };
      drawHud(m.ctx, state, sprites, settings, 58, { tier });
      return m.calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
    };
    expect(texts({ ...DEFAULT_SETTINGS, showFps: true }, 'medium')).toContain('QUALITY MEDIUM');
    expect(texts({ ...DEFAULT_SETTINGS, showFps: false }, 'medium')).not.toContain('QUALITY MEDIUM');
    expect(texts({ ...DEFAULT_SETTINGS, showFps: true }, null)).not.toContain('QUALITY MEDIUM');
  });

  it('touch layout moves the top-right chapter label clear of the pause corner', () => {
    const state = createGame({ seed: 4, difficulty: 'normal' });
    const xOf = (coarse: boolean): number => {
      const m = mockCtx();
      const sprites: SpriteApi = {
        draw: () => {},
        size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
        toCanvas: () => { throw new Error('unused'); },
      };
      drawHud(m.ctx, state, sprites, DEFAULT_SETTINGS, 60, { coarse });
      const label = m.calls.find((c) => c.name === 'fillText' && String(c.args[0]).startsWith('CHAPTER'));
      return Number(label?.args[1]);
    };
    expect(xOf(false)).toBe(1260);
    expect(xOf(true)).toBe(1150);
  });
});
