// tests/a5.render.test.ts — OWNER: A5. Draw order, entity -> sprite mapping, background helpers, gallery layout.
import { describe, expect, it } from 'vitest';
import { advanceStars, CHAPTER_PALETTES, createStarfield, paletteFor, warpFactor } from '../src/render/background';
import { layoutGallery } from '../src/render/gallery';
import { enemyLook, createWorldRenderer, ENEMY_SPRITE, PICKUP_SPRITE } from '../src/render/renderer';
import { CHAPTER_DECOR, decorFor, decorSize, drawNebula, drawPlanet } from '../src/render/decor';
import { createGallery } from '../src/render/gallery';
import { SPRITE_REGISTRY } from '../src/render/sprites/registry';
import { DEFAULT_SETTINGS, SPRITE_KEYS, type DrawOpts, type SpriteApi, type SpriteKey, type View } from '../src/shared/contracts';
import { createGame } from '../src/sim/game';
import type { Enemy, EnemyKind, GameState, PickupKind } from '../src/sim/types';
import { mockCtx } from './a5.mockctx';

function enemy(over: Partial<Enemy>): Enemy {
  return {
    id: 1, kind: 'chicken_basic', pos: { x: 400, y: 200 }, vel: { x: 0, y: 0 }, radius: 22, hp: 1, maxHp: 1, points: 100,
    eggRate: 0, alive: true, age: 0, hitFlash: 0, invulnerable: false, canDropEggs: false, carries: null, rotation: 0,
    anim: 0, isBoss: false, behavior: { type: 'none' }, ...over,
  };
}

describe('a5 sprite mapping and frame selection', () => {
  it('maps every enemy and pickup kind to a registered sprite', () => {
    for (const k of Object.keys(ENEMY_SPRITE) as EnemyKind[]) expect(SPRITE_REGISTRY[ENEMY_SPRITE[k]], k).toBeDefined();
    for (const k of Object.keys(PICKUP_SPRITE) as PickupKind[]) expect(SPRITE_REGISTRY[PICKUP_SPRITE[k]], k).toBeDefined();
  });

  it('armored chickens switch to the dented sprite below 50% HP', () => {
    const out = { key: 'ship' as SpriteKey, frame: 0 };
    enemyLook(enemy({ kind: 'chicken_armored', hp: 7, maxHp: 7 }), 0, out);
    expect(out.key).toBe('enemy_chicken_armored');
    enemyLook(enemy({ kind: 'chicken_armored', hp: 3.5, maxHp: 7 }), 0, out);
    expect(out.key).toBe('enemy_chicken_armored');
    enemyLook(enemy({ kind: 'chicken_armored', hp: 3, maxHp: 7 }), 0, out);
    expect(out.key).toBe('enemy_chicken_armored_dented');
  });

  it('asteroids use id % 3, chickens animate with time, bosses use anim', () => {
    const out = { key: 'ship' as SpriteKey, frame: 0 };
    for (const id of [3, 4, 5]) {
      enemyLook(enemy({ kind: 'asteroid_l', id }), 12.3, out);
      expect(out.frame).toBe(id % 3);
    }
    enemyLook(enemy({ kind: 'chicken_basic', id: 0 }), 0, out);
    const f0 = out.frame;
    enemyLook(enemy({ kind: 'chicken_basic', id: 0 }), 1 / 8 + 0.001, out);
    expect(out.frame).not.toBe(f0);
    enemyLook(enemy({ kind: 'boss_carrier', anim: 2, isBoss: true }), 0, out);
    expect([out.key, out.frame]).toEqual(['boss_carrier', 2]);
    enemyLook(enemy({ kind: 'boss_dreadnought', anim: 9, isBoss: true }), 0, out);
    expect(out.frame).toBe(2);
    enemyLook(enemy({ kind: 'boss_rooster', anim: 1, isBoss: true }), 0, out);
    expect([out.key, out.frame]).toEqual(['boss_rooster', 1]);
  });
});

describe('a5 backgrounds', () => {
  it('uses the chapter palettes and reuses them past chapter 5', () => {
    expect(CHAPTER_PALETTES.length).toBe(5);
    expect(paletteFor(1)).toEqual(['#0B0B2B', '#2A1B5C']);
    expect(paletteFor(5)).toEqual(['#1A0505', '#4A0E0E']);
    expect(paletteFor(6)).toEqual(paletteFor(1));
    expect(paletteFor(13)).toEqual(paletteFor(3));
    for (let c = 1; c <= 6; c++) {
      const decor = decorFor(c);
      expect(decor.length).toBeGreaterThanOrEqual(1);
      expect(decor.length).toBeLessThanOrEqual(3);
    }
  });

  it('has three star layers of 160 / 90 / 40 stars that wrap inside the screen', () => {
    const layers = createStarfield();
    expect(layers.map((l) => l.count)).toEqual([160, 90, 40]);
    expect(layers.map((l) => l.size)).toEqual([1, 1.5, 2.5]);
    expect(layers.map((l) => l.speed)).toEqual([15, 40, 90]);
    expect(layers.map((l) => l.count - l.tintStart)).toEqual([16, 9, 4]);
    for (let i = 0; i < 400; i++) advanceStars(layers, 1 / 60, 20);
    for (const l of layers) for (let i = 0; i < l.count; i++) {
      expect(l.y[i]).toBeGreaterThanOrEqual(0);
      expect(l.y[i]).toBeLessThan(720);
    }
  });

  it('warp speed eases in over 0.5 s and out over the last 0.5 s', () => {
    expect(warpFactor(0)).toBe(1);
    expect(warpFactor(0.25)).toBeGreaterThan(1);
    expect(warpFactor(0.25)).toBeLessThan(20);
    expect(warpFactor(0.5)).toBe(20);
    expect(warpFactor(1.5)).toBe(20);
    expect(warpFactor(2.75)).toBeLessThan(20);
    expect(warpFactor(3)).toBe(1);
  });
});

describe('a5 gallery layout', () => {
  it('has a cell for every frame and one flash cell per sprite, inside the width', () => {
    const { cells, height } = layoutGallery(1280);
    for (const key of SPRITE_KEYS) {
      const mine = cells.filter((c) => c.key === key);
      expect(mine.filter((c) => !c.flash).length, key).toBe(SPRITE_REGISTRY[key].frames);
      expect(mine.filter((c) => c.flash).length, key).toBe(1);
    }
    for (const c of cells) expect(c.x + c.w).toBeLessThanOrEqual(1280);
    expect(height).toBeGreaterThan(720);
  });
});

describe('a5 world renderer (mock canvas)', () => {
  const view: View = { scale: 1.5, cssScale: 1.5, dpr: 1, cssWidth: 1920, cssHeight: 1080, offsetX: 0, offsetY: 0 };
  function fakeSprites(drawn: SpriteKey[]): SpriteApi {
    return {
      draw: (_c, key: SpriteKey, _x: number, _y: number, _o?: DrawOpts) => { drawn.push(key); },
      size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
      toCanvas: () => { throw new Error('unused'); },
    };
  }

  function populated(): GameState {
    const s = createGame({ seed: 7, difficulty: 'normal', debug: { showHitboxes: true } });
    s.enemies.length = 0; s.projectiles.length = 0; s.pickups.length = 0; s.hazards.length = 0;
    let id = 100;
    for (const kind of Object.keys(ENEMY_SPRITE) as EnemyKind[]) {
      s.enemies.push(enemy({ id: id++, kind, isBoss: kind.startsWith('boss_'), pos: { x: 300 + (id % 8) * 90, y: 220 }, hitFlash: 0.05 }));
    }
    for (const kind of Object.keys(PICKUP_SPRITE) as PickupKind[]) {
      s.pickups.push({ id: id++, kind, pos: { x: 200 + (id % 8) * 80, y: 400 }, vel: { x: 0, y: 0 }, radius: 14, age: 0, spin: 1, alive: true });
    }
    const proj = (kind: 'bolt' | 'missile' | 'egg' | 'enemy_shot' | 'boss_egg' | 'feather_knife', owner: 'player' | 'enemy', weapon: 'pulse' | 'neutron' | 'laser' | 'arc' | null) =>
      s.projectiles.push({ id: id++, kind, owner, weapon, pos: { x: 500 + (id % 6) * 40, y: 450 }, vel: { x: 30, y: -300 }, accel: { x: 0, y: 0 }, maxSpeed: 0, radius: 6, damage: 1, pierceLeft: 1, hitIds: [], ttl: 3, alive: true, rotation: 0 });
    for (const w of ['pulse', 'neutron', 'laser', 'arc'] as const) proj('bolt', 'player', w);
    proj('missile', 'player', null);
    for (const k of ['egg', 'enemy_shot', 'boss_egg', 'feather_knife'] as const) proj(k, 'enemy', null);
    s.hazards.push({ id: id++, kind: 'telegraph', a: { x: 100, y: 0 }, b: { x: 100, y: 720 }, width: 120, ttl: 1, lethal: false, alive: true, ownerId: 1 });
    s.hazards.push({ id: id++, kind: 'telegraph', a: { x: 200, y: 0 }, b: { x: 200, y: 720 }, width: 6, ttl: 1, lethal: false, alive: true, ownerId: 1 });
    s.hazards.push({ id: id++, kind: 'beam', a: { x: 300, y: 0 }, b: { x: 300, y: 720 }, width: 26, ttl: 1, lethal: true, alive: true, ownerId: 1 });
    s.player.invulnTimer = 2;
    s.time = 5;
    return s;
  }

  it('draws every entity sprite, the ship with its shield, and ends at logical scale', () => {
    const drawn: SpriteKey[] = [];
    const m = mockCtx();
    const r = createWorldRenderer(m.ctx, fakeSprites(drawn));
    const state = populated();
    r.handleEvents([{ type: 'enemy_killed', id: 1, kind: 'chicken_basic', x: 400, y: 300, byMissile: false }], state);
    r.render(state, view, DEFAULT_SETTINGS, 1 / 60);
    for (const k of ['ship', 'ship_shield', 'enemy_chicken_basic', 'enemy_chick', 'enemy_asteroid_m', 'boss_hen', 'boss_dreadnought',
      'proj_pulse', 'proj_neutron', 'proj_laser', 'proj_arc', 'proj_missile', 'proj_egg', 'proj_enemy_shot', 'proj_boss_egg',
      'proj_feather_knife', 'pickup_drumstick', 'pickup_power_core', 'pickup_gift_arc', 'fx_puff'] as SpriteKey[]) {
      expect(drawn, k).toContain(k);
    }
    expect(m.last('setTransform')).toEqual([view.scale, 0, 0, view.scale, 0, 0]);
    expect(m.paints()).toBeGreaterThan(0);
    expect(m.violations).toEqual([]);
  });

  it('issues only valid canvas calls through a whole boss-death + warp + flash sequence', () => {
    const m = mockCtx();
    const r = createWorldRenderer(m.ctx, fakeSprites([]));
    const state = populated();
    r.handleEvents([
      { type: 'boss_killed', kind: 'boss_dreadnought', x: 640, y: 165, radius: 130 },
      { type: 'arc', points: [{ x: 640, y: 560 }, { x: 600, y: 300 }, { x: 700, y: 200 }] },
      { type: 'score_popup', amount: 10000, x: 640, y: 165 },
      { type: 'egg_splat', x: 100, y: 668 },
      { type: 'wave_start', chapter: 2, wave: 1, name: 'x', isBoss: false },
    ], state);
    state.phase = 'warp';
    for (let i = 0; i < 240; i++) {
      state.phaseTimer = i / 80;
      state.time += 1 / 60;
      r.render(state, view, { ...DEFAULT_SETTINGS, reduceFlashes: i % 2 === 0 }, 1 / 60);
    }
    expect(m.violations).toEqual([]);
  });

  it('hides the ship while dead and draws attract mode for a null state', () => {
    const drawn: SpriteKey[] = [];
    const m = mockCtx();
    const r = createWorldRenderer(m.ctx, fakeSprites(drawn));
    const state = populated();
    state.player.alive = false;
    r.render(state, view, DEFAULT_SETTINGS, 0);
    expect(drawn).not.toContain('ship');
    drawn.length = 0;
    r.render(null, view, DEFAULT_SETTINGS, 1 / 60);
    expect(drawn.filter((k) => k === 'enemy_chicken_basic').length).toBe(6);
    expect(m.last('setTransform')).toEqual([view.scale, 0, 0, view.scale, 0, 0]);
  });

  it('leaves no shake in the final transform even with trauma and shake enabled', () => {
    const m = mockCtx();
    const r = createWorldRenderer(m.ctx, fakeSprites([]));
    const state = populated();
    r.handleEvents([{ type: 'missile_detonated', x: 640, y: 360 }], state);
    r.render(state, view, { ...DEFAULT_SETTINGS, screenShake: true }, 1 / 60);
    expect(m.last('setTransform')).toEqual([view.scale, 0, 0, view.scale, 0, 0]);
  });
});

describe('a5 decor and gallery drawing (mock canvas)', () => {
  it('draws every planet and nebula inside its canvas without invalid calls', () => {
    for (const [i, list] of CHAPTER_DECOR.entries()) {
      for (const spec of list) {
        const m = mockCtx();
        if (spec.type === 'planet') drawPlanet(m.ctx, spec); else drawNebula(m.ctx, spec);
        const { w, h } = decorSize(spec);
        const b = m.bounds();
        expect(m.violations, `chapter ${i + 1} ${spec.type}`).toEqual([]);
        expect(b, `chapter ${i + 1} ${spec.type}`).not.toBeNull();
        if (b && spec.type === 'planet') {
          expect(b.minX).toBeGreaterThanOrEqual(-1);
          expect(b.minY).toBeGreaterThanOrEqual(-1);
          expect(b.maxX).toBeLessThanOrEqual(w + 1);
          expect(b.maxY).toBeLessThanOrEqual(h + 1);
        }
      }
    }
  });

  it('renders the gallery page and scrolls without invalid calls', () => {
    const m = mockCtx();
    const drawn: SpriteKey[] = [];
    const sprites: SpriteApi = {
      draw: (_c, key) => { drawn.push(key); },
      size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
      toCanvas: () => { throw new Error('unused'); },
    };
    createGallery(m.ctx, sprites).render({ scale: 1, cssScale: 1, dpr: 1, cssWidth: 1280, cssHeight: 720, offsetX: 0, offsetY: 0 });
    expect(drawn.length).toBeGreaterThan(20);
    expect(m.violations).toEqual([]);
  });
});
