// tests/a5.particles.test.ts — OWNER: A5. Particle pool, event -> effect table and screen shake (no canvas needed).
import { describe, expect, it } from 'vitest';
import { createEffects, MAX_ARC_POINTS } from '../src/render/effects';
import { countKind, createPool, fxSeed, PK, POOL_CAPACITY, spawnFeathers, updateParticles } from '../src/render/particles';
import { createFlash, createShake, FLASH_REDUCED_SCALE, SHAKE_DECAY_PER_S, SHAKE_MAX_OFFSET_PX } from '../src/render/shake';
import type { GameEvent } from '../src/sim/events';

const SHIP = { x: 640, y: 600 };
const ev = (e: GameEvent): GameEvent => e;

function run(effects: ReturnType<typeof createEffects>, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) effects.update(1 / 60, SHIP);
}

describe('a5 particle pool', () => {
  it('never exceeds capacity, even with a flood of spawns', () => {
    fxSeed(1);
    const pool = createPool();
    expect(pool.capacity).toBe(POOL_CAPACITY);
    for (let i = 0; i < 50; i++) spawnFeathers(pool, 100, 100, 200, '#FFF');
    expect(pool.count).toBeLessThanOrEqual(POOL_CAPACITY);
    expect(pool.count).toBe(POOL_CAPACITY);
    updateParticles(pool, 1 / 60);
    expect(pool.count).toBeLessThanOrEqual(POOL_CAPACITY);
  });

  it('expires every particle and frees the slots', () => {
    fxSeed(2);
    const pool = createPool();
    spawnFeathers(pool, 100, 100, 100, '#FFF');
    expect(pool.count).toBe(100);
    for (let i = 0; i < 40; i++) updateParticles(pool, 1 / 60);
    expect(pool.count).toBeGreaterThan(0);
    for (let i = 0; i < 90; i++) updateParticles(pool, 1 / 60);
    expect(pool.count).toBe(0);
  });

  it('does not advance while paused (dt = 0)', () => {
    const pool = createPool();
    spawnFeathers(pool, 100, 100, 10, '#FFF');
    const before = pool.items[0].life;
    updateParticles(pool, 0);
    expect(pool.items[0].life).toBe(before);
  });

  it('keeps every live particle finite after a long run with a big event mix', () => {
    fxSeed(3);
    const fx = createEffects();
    fx.handleEvents([
      ev({ type: 'boss_killed', kind: 'boss_hen', x: 640, y: 170, radius: 95 }),
      ev({ type: 'missile_detonated', x: 640, y: 360 }),
      ev({ type: 'player_died', x: 640, y: 600, livesLeft: 2 }),
    ], SHIP);
    for (let i = 0; i < 200; i++) {
      fx.update(1 / 60, SHIP);
      expect(fx.pool.count).toBeLessThanOrEqual(POOL_CAPACITY);
      for (let k = 0; k < fx.pool.count; k++) {
        const p = fx.pool.items[k];
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      }
    }
  });
});

describe('a5 event effects', () => {
  it('enemy_killed (basic chicken) spawns exactly 12 feathers, a puff and a little shake', () => {
    fxSeed(4);
    const fx = createEffects();
    fx.handleEvents([ev({ type: 'enemy_killed', id: 1, kind: 'chicken_basic', x: 300, y: 200, byMissile: false })], SHIP);
    expect(countKind(fx.pool, PK.feather)).toBe(12);
    expect(countKind(fx.pool, PK.puff)).toBe(1);
    expect(fx.shake.trauma).toBeCloseTo(0.05, 5);
  });

  it('enemy_killed for asteroids makes debris, not feathers; bosses are left to boss_killed', () => {
    const fx = createEffects();
    fx.handleEvents([ev({ type: 'enemy_killed', id: 1, kind: 'asteroid_m', x: 300, y: 200, byMissile: false })], SHIP);
    expect(countKind(fx.pool, PK.debris)).toBe(10);
    expect(countKind(fx.pool, PK.feather)).toBe(0);
    const fx2 = createEffects();
    fx2.handleEvents([ev({ type: 'enemy_killed', id: 2, kind: 'boss_hen', x: 300, y: 200, byMissile: false })], SHIP);
    expect(fx2.pool.count).toBe(0);
  });

  it('enemy_hit: chicken = 2 feathers + 4 sparks, asteroid = 3 chips + 4 sparks', () => {
    const a = createEffects();
    a.handleEvents([ev({ type: 'enemy_hit', id: 1, kind: 'chicken_red', x: 1, y: 1, dmg: 1 })], SHIP);
    expect([countKind(a.pool, PK.feather), countKind(a.pool, PK.spark)]).toEqual([2, 4]);
    const b = createEffects();
    b.handleEvents([ev({ type: 'enemy_hit', id: 1, kind: 'asteroid_l', x: 1, y: 1, dmg: 1 })], SHIP);
    expect([countKind(b.pool, PK.debris), countKind(b.pool, PK.spark)]).toEqual([3, 4]);
  });

  it('egg_splat leaves a decal on the ground plus 4 yolk droplets; popups carry the text', () => {
    const fx = createEffects();
    fx.handleEvents([ev({ type: 'egg_splat', x: 500, y: 668 }), ev({ type: 'score_popup', amount: 250, x: 10, y: 20 })], SHIP);
    expect(countKind(fx.pool, PK.splat)).toBe(1);
    expect(countKind(fx.pool, PK.yolk)).toBe(4);
    const popup = fx.pool.items.slice(0, fx.pool.count).find((p) => p.kind === PK.text);
    expect(popup?.text).toBe('+250');
    run(fx, 2);
    expect(fx.pool.count).toBe(0);
  });

  it('player_died, missile_detonated and boss_phase trigger flashes and shake', () => {
    const fx = createEffects();
    fx.handleEvents([ev({ type: 'player_died', x: 1, y: 1, livesLeft: 1 })], SHIP);
    expect(fx.flash.timer).toBeCloseTo(0.2, 5);
    expect(fx.shake.trauma).toBeCloseTo(0.6, 5);
    expect(countKind(fx.pool, PK.spark)).toBe(30);
    expect(countKind(fx.pool, PK.debris)).toBe(16);
    fx.reset();
    fx.handleEvents([ev({ type: 'missile_detonated', x: 1, y: 1 })], SHIP);
    expect(fx.flash.timer).toBeCloseTo(0.25, 5);
    expect(fx.shake.trauma).toBeCloseTo(0.7, 5);
    expect(countKind(fx.pool, PK.spark)).toBe(60);
    fx.reset();
    fx.handleEvents([ev({ type: 'boss_phase', phase: 1, x: 1, y: 1 })], SHIP);
    expect(fx.flash.timer).toBeCloseTo(0.15, 5);
    expect(fx.shake.trauma).toBeCloseTo(0.3, 5);
    expect(countKind(fx.pool, PK.spark)).toBe(30);
  });

  it('boss_killed: 200 feathers, 8 staggered explosions over 2.5 s, then a large one', () => {
    fxSeed(5);
    const fx = createEffects();
    fx.handleEvents([ev({ type: 'boss_killed', kind: 'boss_carrier', x: 640, y: 170, radius: 105 })], SHIP);
    expect(countKind(fx.pool, PK.feather)).toBe(200);
    expect(fx.shake.trauma).toBe(1);
    expect(fx.ghosts.filter((g) => g.active).length).toBe(1);
    let fireballs = 0;
    let last = 0;
    for (let i = 0; i < 60 * 3; i++) {
      fx.update(1 / 60, SHIP);
      const n = countKind(fx.pool, PK.fireball);
      if (n > last) fireballs += n - last;
      last = n;
    }
    expect(fireballs).toBe(9);
    expect(fx.ghosts.some((g) => g.active)).toBe(false);
  });

  it('respawn converges 16 sparkles, extra life makes 20, pickups make 8', () => {
    const fx = createEffects();
    fx.handleEvents([ev({ type: 'player_respawned', x: 640, y: 600 })], SHIP);
    expect(countKind(fx.pool, PK.sparkle)).toBe(16);
    fx.reset();
    fx.handleEvents([ev({ type: 'extra_life', lives: 4 })], SHIP);
    expect(countKind(fx.pool, PK.sparkle)).toBe(20);
    fx.reset();
    fx.handleEvents([ev({ type: 'pickup_collected', kind: 'gift_arc', x: 5, y: 5 })], SHIP);
    expect(countKind(fx.pool, PK.sparkle)).toBe(8);
  });

  it('overheat emits steam puffs for about half a second', () => {
    const fx = createEffects();
    fx.handleEvents([ev({ type: 'overheat' })], SHIP);
    run(fx, 0.25);
    expect(countKind(fx.pool, PK.puff)).toBeGreaterThan(3);
    run(fx, 2);
    expect(fx.pool.count).toBe(0);
  });

  it('arc events are stored for 0.08 s and capped in length', () => {
    const fx = createEffects();
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: i * 10, y: 100 }));
    fx.handleEvents([ev({ type: 'arc', points: pts })], SHIP);
    const live = fx.arcs.filter((a) => a.ttl > 0);
    expect(live.length).toBe(1);
    expect(live[0].n).toBe(MAX_ARC_POINTS);
    run(fx, 0.2);
    expect(fx.arcs.some((a) => a.ttl > 0)).toBe(false);
  });
});

describe('a5 screen shake and flash', () => {
  it('decays to exactly 0 at 1.6 per second and caps at 1', () => {
    const s = createShake();
    s.add(0.8);
    s.add(0.8);
    expect(s.trauma).toBe(1);
    for (let i = 0; i < Math.ceil((1 / SHAKE_DECAY_PER_S) * 60) + 2; i++) s.update(1 / 60);
    expect(s.trauma).toBe(0);
  });

  it('offset is bounded by trauma^2 * 10 px and zero when disabled or calm', () => {
    const s = createShake();
    const out = { x: 9, y: 9 };
    s.add(1);
    for (let t = 0; t < 3; t += 0.013) {
      s.sample(t, true, out);
      expect(Math.abs(out.x)).toBeLessThanOrEqual(SHAKE_MAX_OFFSET_PX);
      expect(Math.abs(out.y)).toBeLessThanOrEqual(SHAKE_MAX_OFFSET_PX);
    }
    s.sample(1.234, false, out);
    expect(out).toEqual({ x: 0, y: 0 });
    s.reset();
    s.sample(1.234, true, out);
    expect(out).toEqual({ x: 0, y: 0 });
  });

  it('flash fades out and is scaled by 0.3 with reduceFlashes', () => {
    const f = createFlash();
    f.trigger(0.2, '#FFFFFF');
    const full = f.alpha(false);
    expect(full).toBeGreaterThan(0);
    expect(f.alpha(true)).toBeCloseTo(full * FLASH_REDUCED_SCALE, 6);
    f.update(0.25);
    expect(f.alpha(false)).toBe(0);
  });
});
