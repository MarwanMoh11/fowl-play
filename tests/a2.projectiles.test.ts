// tests/a2.projectiles.test.ts — OWNER: A2. Projectile spawning and motion (§7.7).
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import { clearEnemyProjectiles, countEggs, spawnProjectile, updateProjectiles } from '../src/sim/projectiles';
import { DT, GROUND_Y, MAX_PROJECTILES } from '../src/sim/tuning/core';
import { eventsOf, newState } from './a2.helpers';

function run(s: ReturnType<typeof newState>, seconds: number): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) updateProjectiles(s, DT);
}

describe('spawnProjectile', () => {
  it('applies per-kind defaults from §7.7', () => {
    const s = newState();
    const egg = spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 100, y: 100, vx: 0, vy: 60 });
    expect(egg).toMatchObject({ radius: 8, maxSpeed: 420, owner: 'enemy', alive: true });
    expect(egg?.accel).toEqual({ x: 0, y: 420 });
    expect(spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 0, y: 0, vx: 1, vy: 0 })).toMatchObject({ radius: 7, ttl: 6, maxSpeed: 0 });
    expect(spawnProjectile(s, { kind: 'boss_egg', owner: 'enemy', x: 0, y: 0, vx: 1, vy: 0 })).toMatchObject({ radius: 10, ttl: 6 });
    const knife = spawnProjectile(s, { kind: 'feather_knife', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 190 });
    expect(knife).toMatchObject({ radius: 8, ttl: 6 });
    expect(knife?.rotation).toBeCloseTo(Math.PI, 6); // angleOf(down) + π/2
    const bolt = spawnProjectile(s, { kind: 'bolt', owner: 'player', weapon: 'laser', x: 0, y: 0, vx: 0, vy: -1000, radius: 4, damage: 2, pierce: 3 });
    expect(bolt).toMatchObject({ weapon: 'laser', radius: 4, damage: 2, pierceLeft: 3, ttl: 2.0, hitIds: [] });
  });

  it('scales the egg speed cap with difficulty and honors overrides', () => {
    const hard = newState({ difficulty: 'hard' });
    expect(spawnProjectile(hard, { kind: 'egg', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 0 })?.maxSpeed).toBeCloseTo(420 * 1.15, 6);
    const e = spawnProjectile(hard, { kind: 'egg', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 0, radius: 12, maxSpeed: 99, ay: 10, ttl: 3 });
    expect(e).toMatchObject({ radius: 12, maxSpeed: 99, ttl: 3 });
    expect(e?.accel.y).toBe(10);
  });

  it('returns null at MAX_PROJECTILES', () => {
    const s = newState();
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      expect(spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 0 })).not.toBeNull();
    }
    expect(spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 0 })).toBeNull();
    expect(s.projectiles).toHaveLength(MAX_PROJECTILES);
  });
});

describe('updateProjectiles', () => {
  it('an egg accelerates, respects its speed cap and splats at GROUND_Y with an event', () => {
    const s = newState();
    const egg = spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 300, y: 100, vx: 0, vy: 60 });
    updateProjectiles(s, DT);
    expect(egg?.vel.y).toBeCloseTo(60 + 420 * DT, 6);
    let splats = 0;
    let guard = 0;
    while (egg?.alive && guard++ < 600) {
      updateProjectiles(s, DT);
      expect(egg.vel.y).toBeLessThanOrEqual(420 + 1e-9);
      splats += eventsOf(s, 'egg_splat').length;
    }
    expect(egg?.alive).toBe(false);
    expect(splats).toBe(1);
    expect(egg?.pos.y).toBeGreaterThanOrEqual(GROUND_Y);
    const ev = eventsOf(s, 'egg_splat')[0];
    expect(ev).toMatchObject({ x: 300, y: GROUND_Y });
  });

  it('countEggs counts only living eggs', () => {
    const s = newState();
    const a = spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 0 });
    spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 0 });
    spawnProjectile(s, { kind: 'boss_egg', owner: 'enemy', x: 0, y: 0, vx: 0, vy: 0 });
    expect(countEggs(s)).toBe(2);
    if (a) a.alive = false;
    expect(countEggs(s)).toBe(1);
  });

  it('moves with accel and clamps to maxSpeed', () => {
    const s = newState();
    const p = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 100, y: 100, vx: 0, vy: 0, ax: 100, maxSpeed: 50 });
    run(s, 2);
    expect(Math.hypot(p?.vel.x ?? 0, p?.vel.y ?? 0)).toBeCloseTo(50, 6);
  });

  it('expires on ttl', () => {
    const s = newState();
    const p = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 600, y: 300, vx: 0, vy: 0, ttl: 1 });
    run(s, 0.9);
    expect(p?.alive).toBe(true);
    run(s, 0.2);
    expect(p?.alive).toBe(false);
  });

  it('removes player bolts that leave the top or sides and enemy shots outside their wider box', () => {
    const s = newState();
    const up = spawnProjectile(s, { kind: 'bolt', owner: 'player', weapon: 'pulse', x: 600, y: 10, vx: 0, vy: -1000 });
    const left = spawnProjectile(s, { kind: 'bolt', owner: 'player', weapon: 'pulse', x: -50, y: 300, vx: -1000, vy: 0 });
    const enemyUp = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 600, y: -115, vx: 0, vy: -200 });
    const enemyDown = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 600, y: 770, vx: 0, vy: 300 });
    const enemyOk = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 600, y: -100, vx: 0, vy: 100 });
    run(s, 0.1);
    expect(up?.alive).toBe(false);
    expect(left?.alive).toBe(false);
    expect(enemyUp?.alive).toBe(false);
    expect(enemyDown?.alive).toBe(false);
    expect(enemyOk?.alive).toBe(true);
  });
});

describe('clearEnemyProjectiles', () => {
  it('kills all enemy projectiles without splat events and spares player bolts', () => {
    const s = newState();
    const egg = spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 600, y: 600, vx: 0, vy: 0 });
    const bolt = spawnProjectile(s, { kind: 'bolt', owner: 'player', weapon: 'pulse', x: 600, y: 600, vx: 0, vy: -1 });
    clearEnemyProjectiles(s);
    expect(egg?.alive).toBe(false);
    expect(bolt?.alive).toBe(true);
    expect(eventsOf(s, 'egg_splat')).toHaveLength(0);
  });

  it('with a center only clears within the radius', () => {
    const s = newState();
    const near = spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 640, y: 500, vx: 0, vy: 0 });
    const far = spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 640, y: 100, vx: 0, vy: 0 });
    clearEnemyProjectiles(s, { x: 640, y: 600 }, 200);
    expect(near?.alive).toBe(false);
    expect(far?.alive).toBe(true);
  });
});
