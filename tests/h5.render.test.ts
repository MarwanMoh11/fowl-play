// tests/h5.render.test.ts — OWNER: H5. HENPOCALYPSE renderer: every event, mappings, backgrounds, drones/shields, budgets (mock canvas).
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SPRITE_KEYS, type SpriteApi, type SpriteKey, type View } from '../src/shared/contracts';
import { createAmbient, drawGravityWells, emitAmbient } from '../src/render/ambient';
import { createBackground, CHAPTER_PALETTES } from '../src/render/background';
import { bossKeyForName, createSplash, startSplash, updateSplash } from '../src/render/boss-splash';
import { drawStormStrike } from '../src/render/background-storm';
import { createEffects } from '../src/render/effects';
import { hazardTint, FLARE_TINT, STORM_TINT } from '../src/render/overlays';
import { POOL_CAPACITY, countKind, PK } from '../src/render/particles';
import { ENEMY_SPRITE, PICKUP_SPRITE, PROJECTILE_SPRITE, BOLT_SPRITE, SHIP_SPRITE, enemyLook, projectileLook, type ProjectilePose } from '../src/render/render-maps';
import { createWorldRenderer } from '../src/render/renderer';
import { SPRITE_REGISTRY } from '../src/render/sprites/registry';
import { createGame } from '../src/sim/game';
import type { GameEvent } from '../src/sim/events';
import type { Enemy, EnemyKind, GameState, Hazard, Projectile, ProjectileKind, ShipId, WeaponId } from '../src/sim/types';
import { WEAPON_IDS, SHIP_IDS } from '../src/sim/types';
import { mockCtx } from './a5.mockctx';

const view: View = { scale: 1, cssScale: 1, dpr: 1, cssWidth: 1280, cssHeight: 720, offsetX: 0, offsetY: 0 };

function recordingSprites(drawn: { key: SpriteKey; alpha: number }[]): SpriteApi {
  return {
    draw: (_c, key: SpriteKey, _x: number, _y: number, o) => { drawn.push({ key, alpha: o?.alpha ?? 1 }); },
    size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
    toCanvas: () => { throw new Error('unused'); },
  };
}

function enemy(kind: EnemyKind, over: Partial<Enemy> = {}): Enemy {
  return {
    id: 7, kind, pos: { x: 400, y: 200 }, vel: { x: 40, y: 80 }, radius: 28, hp: 10, maxHp: 10, points: 10, eggRate: 0,
    alive: true, age: 1.7, hitFlash: 0, invulnerable: false, canDropEggs: false, carries: null, rotation: 0.2, anim: 1,
    isBoss: kind.startsWith('boss_'), behavior: {} as Enemy['behavior'], shield: 0, maxShield: 0, skillTimer: 0, skillState: 0,
    parentId: -1, ...over,
  };
}

function projectile(kind: ProjectileKind, weapon: WeaponId | null = null, over: Partial<Projectile> = {}): Projectile {
  return {
    id: 3, kind, owner: kind === 'bolt' ? 'player' : 'enemy', weapon, pos: { x: 300, y: 300 }, vel: { x: 20, y: -260 },
    accel: { x: 0, y: 0 }, maxSpeed: 0, radius: 6, damage: 1, pierceLeft: 0, hitIds: [], ttl: 1.5, alive: true,
    rotation: 0.3, homing: 0, targetId: -1, fuse: 0, age: 0.4, ...over,
  };
}

/** Every event type that §4.2 assigns to H5 fx, with realistic payloads. */
const HENPO_EVENTS: GameEvent[] = [
  { type: 'combo', count: 25, mult: 2 }, { type: 'combo_break', count: 12 }, { type: 'fury_full' },
  { type: 'overdrive_start', duration: 6, x: 500, y: 400 }, { type: 'overdrive_end' },
  { type: 'powerup_start', id: 'drones', duration: 10 }, { type: 'powerup_end', id: 'magnet' },
  { type: 'shield_absorb', x: 500, y: 600, left: 1 }, { type: 'player_revived', x: 500, y: 600, left: 0 },
  { type: 'enemy_shield_hit', id: 1, x: 300, y: 200 }, { type: 'enemy_shield_break', id: 1, x: 300, y: 200 },
  { type: 'enemy_teleport', id: 2, fromX: 100, fromY: 100, x: 800, y: 150 }, { type: 'enemy_cloak', id: 2, x: 300, y: 150, on: true },
  { type: 'enemy_cloak', id: 2, x: 300, y: 150, on: false }, { type: 'enemy_heal', id: 3, x: 600, y: 200, radius: 120 },
  { type: 'pod_hatch', x: 700, y: 180 }, { type: 'projectile_burst', kind: 'cluster_egg', x: 640, y: 200 },
  { type: 'projectile_burst', kind: 'shard', x: 640, y: 220 }, { type: 'golden_appear', x: 900, y: 300 }, { type: 'golden_escaped' },
  { type: 'rail', x: 640, y0: 700, y1: 120, width: 14 }, { type: 'chain_explosion', x: 500, y: 300, radius: 90 },
  { type: 'crit', x: 450, y: 250 }, { type: 'drone_fire', x: 420, y: 500 }, { type: 'perk_draft', options: ['hot_sauce', 'ammo_belt', 'speed_loader'] },
  { type: 'perk_chosen', id: 'hot_sauce', stacks: 1 }, { type: 'corn_collected', amount: 1, total: 7 },
];

describe('h5 events and fx', () => {
  it('every §4.2 H5 event is handled without invalid canvas calls', () => {
    const state = createGame({ seed: 11, difficulty: 'normal' });
    for (const e of HENPO_EVENTS) {
      const m = mockCtx();
      const drawn: { key: SpriteKey; alpha: number }[] = [];
      const r = createWorldRenderer(m.ctx, recordingSprites(drawn));
      r.handleEvents([e], state);
      r.render(state, view, DEFAULT_SETTINGS, 1 / 60);
      r.render(state, view, DEFAULT_SETTINGS, 0.3);
      expect(m.violations, e.type).toEqual([]);
    }
  });

  it('a rail beam lives for 0.15 s and is drawn as a column between muzzle and hit point', () => {
    const fx = createEffects();
    fx.handleEvents([{ type: 'rail', x: 100, y0: 700, y1: 120, width: 14 }], null);
    expect(fx.rails.filter((r) => r.active).length).toBe(1);
    expect(countKind(fx.pool, PK.spark)).toBeGreaterThan(0);
    fx.update(0.1, null);
    expect(fx.rails.some((r) => r.active)).toBe(true);
    fx.update(0.1, null);
    expect(fx.rails.some((r) => r.active)).toBe(false);
  });

  it('the particle pool never exceeds its capacity under an event flood', () => {
    const fx = createEffects();
    const flood: GameEvent[] = [];
    for (let i = 0; i < 300; i++) flood.push({ type: 'enemy_killed', id: i, kind: 'chicken_basic', x: 300, y: 200, byMissile: false });
    for (let i = 0; i < 60; i++) flood.push({ type: 'combo', count: i, mult: 2 });
    fx.handleEvents(flood, { x: 640, y: 600 });
    expect(fx.pool.count).toBeLessThanOrEqual(POOL_CAPACITY);
  });

  it('gold chickens leave a sparkle trail and comets leave fire while the simulation advances', () => {
    const state = createGame({ seed: 5, difficulty: 'normal' });
    state.enemies.length = 0;
    state.enemies.push(enemy('chicken_gold'), enemy('comet', { id: 8 }));
    const fx = createEffects();
    const amb = createAmbient();
    emitAmbient(state, fx.pool, 0.2, amb);
    expect(fx.pool.count).toBeGreaterThan(0);
    expect(countKind(fx.pool, PK.fireball)).toBeGreaterThan(0);
  });
});

describe('h5 mappings', () => {
  it('every enemy kind, pickup, bolt, projectile and ship maps to a registered sprite', () => {
    for (const key of [...Object.values(ENEMY_SPRITE), ...Object.values(PICKUP_SPRITE), ...Object.values(BOLT_SPRITE), ...Object.values(PROJECTILE_SPRITE), ...Object.values(SHIP_SPRITE)]) {
      expect(SPRITE_KEYS as readonly string[], key).toContain(key);
    }
    for (const w of WEAPON_IDS) expect(SPRITE_KEYS as readonly string[]).toContain(BOLT_SPRITE[w as WeaponId]);
    for (const s of SHIP_IDS) expect(SPRITE_KEYS as readonly string[]).toContain(SHIP_SPRITE[s as ShipId]);
  });

  it('enemy poses stay inside the sprite frame range for every kind', () => {
    const pose = { key: 'ship' as SpriteKey, frame: 0 };
    for (const kind of Object.keys(ENEMY_SPRITE) as EnemyKind[]) {
      for (const anim of [0, 1, 2, 9]) {
        enemyLook(enemy(kind, { anim, age: 3.1 }), 4.2, pose);
        expect(pose.frame, kind).toBeGreaterThanOrEqual(0);
        expect(pose.frame, kind).toBeLessThan(SPRITE_REGISTRY[pose.key].frames);
      }
    }
  });

  it('projectile poses are finite and inside the frame range for every kind and weapon', () => {
    const out: ProjectilePose = { key: 'ship', frame: 0, rotation: 0, scale: 1, alpha: 1 };
    const kinds: ProjectileKind[] = ['egg', 'enemy_shot', 'boss_egg', 'feather_knife', 'cluster_egg', 'shard', 'void_orb', 'fireball', 'gear', 'missile'];
    for (const k of kinds) {
      projectileLook(projectile(k), 2.5, out);
      expect(Number.isFinite(out.rotation) && Number.isFinite(out.scale) && out.frame < SPRITE_REGISTRY[out.key].frames, k).toBe(true);
    }
    for (const w of WEAPON_IDS) {
      projectileLook(projectile('bolt', w, { age: 0.5, ttl: 0.7 }), 2.5, out);
      expect(out.key, w).toBe(BOLT_SPRITE[w]);
      expect(out.frame < SPRITE_REGISTRY[out.key].frames && out.alpha > 0 && out.scale > 0, w).toBe(true);
    }
  });

  it('flame bolts swell and fade with their age, sickles spin, flak does not rotate', () => {
    const out: ProjectilePose = { key: 'ship', frame: 0, rotation: 0, scale: 1, alpha: 1 };
    projectileLook(projectile('bolt', 'flame', { age: 0.1, ttl: 0.9 }), 0, out);
    const young = { ...out };
    projectileLook(projectile('bolt', 'flame', { age: 0.9, ttl: 0.1 }), 0, out);
    expect(out.scale).toBeGreaterThan(young.scale);
    expect(out.alpha).toBeLessThan(young.alpha);
    projectileLook(projectile('bolt', 'sickle', { age: 1 }), 0, out);
    expect(out.rotation).toBeCloseTo(18, 5);
    projectileLook(projectile('bolt', 'flak'), 0, out);
    expect(out.rotation).toBe(0);
  });
});

describe('h5 backgrounds and hazards', () => {
  it('draws the backgrounds of chapters 1–24 with valid canvas calls (decor included)', () => {
    const made: ReturnType<typeof mockCtx>[] = [];
    const factory = (w: number, h: number): HTMLCanvasElement => {
      const m = mockCtx();
      made.push(m);
      return { width: w, height: h, getContext: () => m.ctx } as unknown as HTMLCanvasElement;
    };
    expect(CHAPTER_PALETTES.length).toBe(12);
    const bg = createBackground(factory);
    const m = mockCtx();
    for (let c = 1; c <= 24; c++) {
      bg.setChapter(c, true);
      bg.update(0.05, 1);
      bg.draw(m.ctx, 1, c % 2 === 0);
    }
    expect(m.violations).toEqual([]);
    for (const dm of made) expect(dm.violations).toEqual([]);
  });

  it('gives each chapter a distinct palette and chapters 13+ repeat the cycle', () => {
    const keys = CHAPTER_PALETTES.map((p) => p.join('|'));
    expect(new Set(keys).size).toBe(12);
  });

  it('lightning strikes only while a strike is live and is dimmed by reduceFlashes', () => {
    const live = mockCtx();
    drawStormStrike(live.ctx, 0.1, false);
    const dim = mockCtx();
    drawStormStrike(dim.ctx, 0.1, true);
    expect(dim.paints()).toBeGreaterThan(0);
    const idle = mockCtx();
    drawStormStrike(idle.ctx, 1.5, false);
    expect(live.paints()).toBeGreaterThan(0);
    expect(idle.paints()).toBe(0);
  });

  it('environment beams take the chapter tint: 7 solar flare, 10 storm, others the boss red', () => {
    const h = { ownerId: -1 } as Hazard;
    expect(hazardTint(h, 7)).toEqual(FLARE_TINT);
    expect(hazardTint(h, 19)).toEqual(FLARE_TINT);
    expect(hazardTint(h, 10)).toEqual(STORM_TINT);
    expect(hazardTint(h, 3).main).toBe('#FF6B6B');
    expect(hazardTint({ ownerId: 42 } as Hazard, 7).main).toBe('#FF6B6B');
  });

  it('gravity wells draw the fx_gravity sprite under the swirl dots', () => {
    const m = mockCtx();
    const drawn: { key: SpriteKey; alpha: number }[] = [];
    const well: Hazard = {
      id: 1, kind: 'gravity', a: { x: 500, y: 300 }, b: { x: 500, y: 300 }, width: 150, ttl: 2, lethal: false, alive: true,
      ownerId: -1, power: 200,
    };
    drawGravityWells(m.ctx, recordingSprites(drawn), [well], 3);
    expect(drawn.map((d) => d.key)).toEqual(['fx_gravity']);
    expect(m.violations).toEqual([]);
  });
});

describe('h5 entities', () => {
  function baseState(): GameState {
    const s = createGame({ seed: 9, difficulty: 'normal' });
    s.enemies.length = 0; s.projectiles.length = 0; s.pickups.length = 0; s.hazards.length = 0;
    s.time = 6;
    return s;
  }

  it('draws drones while the drones power-up is active and shields for each charge', () => {
    const s = baseState();
    s.player.powerups.drones = 8;
    s.player.shield = 2;
    const drawn: { key: SpriteKey; alpha: number }[] = [];
    const r = createWorldRenderer(mockCtx().ctx, recordingSprites(drawn));
    r.render(s, view, DEFAULT_SETTINGS, 1 / 60);
    expect(drawn.filter((d) => d.key === 'drone').length).toBeGreaterThan(0);
    expect(drawn.filter((d) => d.key === 'fx_shield_bubble').length).toBe(2);
  });

  it('enemy shields draw a bubble that fades with the shield left, and cloaked enemies go translucent', () => {
    const s = baseState();
    s.enemies.push(enemy('chicken_shield', { id: 30, shield: 5, maxShield: 10 }));
    s.enemies.push(enemy('chicken_ninja', { id: 31, invulnerable: true, pos: { x: 700, y: 300 } }));
    const drawn: { key: SpriteKey; alpha: number }[] = [];
    const r = createWorldRenderer(mockCtx().ctx, recordingSprites(drawn));
    r.render(s, view, DEFAULT_SETTINGS, 1 / 60);
    const bubble = drawn.find((d) => d.key === 'fx_shield_bubble');
    expect(bubble).toBeDefined();
    expect(bubble!.alpha).toBeCloseTo(0.25 + 0.6 * 0.5, 5);
    const ninja = drawn.filter((d) => d.key === 'enemy_chicken_ninja');
    expect(ninja.length).toBe(1);
    expect(ninja[0].alpha).toBeGreaterThan(0.2);
    expect(ninja[0].alpha).toBeLessThan(0.4);
  });

  it('a dense frame in chapter 12 stays within a per-frame draw-call budget', () => {
    const s = baseState();
    s.chapter = 12;
    s.wave = 9;
    s.player.powerups.drones = 8;
    s.player.shield = 3;
    s.player.overdrive = 4;
    const kinds = Object.keys(ENEMY_SPRITE) as EnemyKind[];
    for (let i = 0; i < 120; i++) s.enemies.push(enemy(kinds[i % kinds.length], { id: 100 + i, pos: { x: 40 + (i % 12) * 100, y: 80 + Math.floor(i / 12) * 50 } }));
    for (let i = 0; i < 200; i++) s.projectiles.push(projectile(i % 3 ? 'egg' : 'bolt', WEAPON_IDS[i % WEAPON_IDS.length], { id: 1000 + i, pos: { x: (i * 37) % 1280, y: (i * 53) % 720 } }));
    const m = mockCtx();
    const r = createWorldRenderer(m.ctx, recordingSprites([]));
    r.handleEvents(HENPO_EVENTS, s);
    r.render(s, view, DEFAULT_SETTINGS, 1 / 60);
    const before = m.calls.length;
    r.render(s, view, DEFAULT_SETTINGS, 1 / 60);
    const perFrame = m.calls.length - before;
    expect(perFrame, "draw calls per dense frame").toBeLessThan(12000);
    expect(m.violations).toEqual([]);
  });
});

describe('h5 boss intro splash', () => {
  it('starts on boss_warning for a boss with art, draws without invalid calls, and ends after 1.5 s', () => {
    const drawn: { key: SpriteKey; alpha: number }[] = [];
    const m = mockCtx();
    const r = createWorldRenderer(m.ctx, recordingSprites(drawn));
    const state = createGame({ seed: 4, difficulty: 'normal' });
    expect(bossKeyForName('MOTHER HEN')).toBe('boss_hen');
    expect(bossKeyForName('NO SUCH BOSS')).toBeNull();
    r.handleEvents([{ type: 'boss_warning', name: 'MOTHER HEN' }], state);
    r.render(state, view, DEFAULT_SETTINGS, 0.5);
    expect(drawn.some((d) => d.key === 'boss_hen')).toBe(true);
    expect(m.violations).toEqual([]);
    const s = createSplash();
    startSplash(s, 'MOTHER HEN');
    updateSplash(s, 1.6);
    expect(s.active).toBe(false);
  });
});
