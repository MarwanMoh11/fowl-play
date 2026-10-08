// tests/h1.projectiles2.test.ts — OWNER: H1. Projectile behaviours: homing, cluster-egg bursts, gear spin,
// time warp on enemy shots and the sickle return.
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import type { GameState, Projectile } from '../src/sim/types';
import { spawnProjectile } from '../src/sim/projectiles';
import { HOMING } from '../src/sim/tuning/weapons2';
import { addEnemy, boltsOf, input, newState, tick } from './a2.helpers';

function countEvents(s: GameState, type: string, ticks: number): number {
  let n = 0;
  for (let i = 0; i < ticks; i++) {
    tick(s, input(), 1);
    n += s.events.filter((e) => e.type === type).length;
  }
  return n;
}

describe('H1 projectile behaviours', () => {
  it('homing seekers turn toward their target and keep their speed', () => {
    const s = newState({ god: true });
    s.player.weapon = 'homing';
    s.player.power = 0;
    s.player.fireCooldown = 0;
    const target = addEnemy(s, { pos: { x: 1150, y: 200 }, radius: 20, hp: 1000, maxHp: 1000 });
    tick(s, input({ fire: true }), 1);
    const seeker = boltsOf(s)[0] as Projectile;
    expect(seeker.homing).toBe(HOMING.turn);
    const x0 = seeker.pos.x;
    tick(s, input(), 30);
    const after = boltsOf(s)[0] as Projectile;
    expect(after.targetId).toBe(target.id);
    expect(after.pos.x).toBeGreaterThan(x0);
    expect(after.vel.x).toBeGreaterThan(0);
    expect(Math.hypot(after.vel.x, after.vel.y)).toBeCloseTo(HOMING.speed, 3);
  });

  it('a homing bolt with no target flies straight', () => {
    const s = newState({ god: true });
    const p = spawnProjectile(s, { kind: 'bolt', owner: 'player', weapon: 'homing', x: 640, y: 500, vx: 0, vy: -560, homing: 5.5 })!;
    tick(s, input(), 10);
    expect(p.vel.x).toBeCloseTo(0, 6);
    expect(p.targetId).toBe(-1);
  });

  it('enemy void orbs home on the player', () => {
    const s = newState({ god: true });
    const orb = spawnProjectile(s, { kind: 'void_orb', owner: 'enemy', x: 200, y: 200, vx: 0, vy: 150, homing: 2 })!;
    tick(s, input(), 60);
    expect(orb.vel.x).toBeGreaterThan(0);
  });

  it('cluster egg bursts into six enemy shards when its fuse runs out', () => {
    const s = newState({ god: true });
    spawnProjectile(s, { kind: 'cluster_egg', owner: 'enemy', x: 300, y: 200, vx: 0, vy: 0 });
    expect(countEvents(s, 'projectile_burst', 100)).toBe(1);
    expect(countEvents(s, 'egg_splat', 1)).toBe(0);
    const shards = s.projectiles.filter((p) => p.alive && p.kind === 'shard' && p.owner === 'enemy');
    expect(shards.length).toBe(6);
    expect(s.projectiles.filter((p) => p.alive && p.kind === 'cluster_egg').length).toBe(0);
  });

  it('a cluster egg that lands splats without bursting', () => {
    const s = newState({ god: true });
    spawnProjectile(s, { kind: 'cluster_egg', owner: 'enemy', x: 300, y: 660, vx: 0, vy: 0 });
    expect(countEvents(s, 'egg_splat', 60)).toBe(1);
    expect(countEvents(s, 'projectile_burst', 1)).toBe(0);
  });

  it('gear spins at 6 rad/s', () => {
    const s = newState({ god: true });
    const g = spawnProjectile(s, { kind: 'gear', owner: 'enemy', x: 300, y: 200, vx: 0, vy: 0 })!;
    tick(s, input(), 60);
    expect(g.rotation).toBeCloseTo(6, 2);
  });

  it('time warp halves the travel of enemy shots', () => {
    const shot = (): { s: GameState; p: Projectile } => {
      const s = newState({ god: true });
      const p = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 100, y: 100, vx: 0, vy: 100 })!;
      return { s, p };
    };
    const normal = shot();
    tick(normal.s, input(), 60);
    const warped = shot();
    warped.s.player.powerups.timewarp = 6;
    tick(warped.s, input(), 60);
    expect(normal.p.pos.y - 100).toBeCloseTo(100, 4);
    expect(warped.p.pos.y - 100).toBeCloseTo(50, 4);
  });

  it('a sickle blade falls back to the ship and its hit list is cleared', () => {
    const s = newState({ god: true });
    const blade = spawnProjectile(s, {
      kind: 'bolt', owner: 'player', weapon: 'sickle', x: 640, y: 574, vx: 0, vy: -1100, ay: 1500, pierce: 99, ttl: 1.6,
    })!;
    blade.accel.y = 1500;
    blade.fuse = 1;
    blade.hitIds = [123];
    tick(s, input(), 60);
    expect(blade.fuse).toBe(0);
    expect(blade.hitIds).toEqual([]);
  });
});
