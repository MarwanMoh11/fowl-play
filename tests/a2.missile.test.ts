// tests/a2.missile.test.ts — OWNER: A2. Missiles (§7.5).
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import { detonateMissile } from '../src/sim/missile';
import { spawnProjectile } from '../src/sim/projectiles';
import { killedLog } from './a2.fakeEnemies';
import { addEnemy, eventsOf, input, newState, tick } from './a2.helpers';

const MISSILE = input({ missile: true });

describe('launch', () => {
  it('launches a missile projectile aimed at (640, 300) with a 0.55 s flight', () => {
    const s = newState();
    s.player.pos.x = 300;
    tick(s, MISSILE, 1);
    expect(s.player.missiles).toBe(0);
    expect(s.player.missileCooldown).toBeGreaterThan(0.9);
    const m = s.projectiles.find((p) => p.kind === 'missile');
    expect(m).toBeDefined();
    expect(m?.ttl).toBeCloseTo(0.55 - 1 / 60, 6);
    const ev = eventsOf(s, 'missile_launched')[0];
    expect(ev).toMatchObject({ x: 300, y: 600 - 26, tx: 640, ty: 300 });
    expect(m?.vel.x).toBeCloseTo((640 - 300) / 0.55, 6);
    expect(m?.vel.y).toBeCloseTo((300 - 574) / 0.55, 6);
  });

  it('needs a missile, a ready cooldown, a living ship and a firing phase', () => {
    const none = newState();
    none.player.missiles = 0;
    tick(none, MISSILE, 3);
    expect(none.projectiles).toHaveLength(0);

    const s = newState();
    s.player.missiles = 3;
    tick(s, MISSILE, 1);
    tick(s, MISSILE, 30); // cooldown still running
    expect(s.player.missiles).toBe(2);
    tick(s, MISSILE, 31);
    expect(s.player.missiles).toBe(1);

    const dead = newState();
    dead.player.alive = false;
    dead.player.lives = 0;
    dead.player.respawnTimer = 5;
    tick(dead, MISSILE, 3);
    expect(dead.player.missiles).toBe(1);

    const tally = newState();
    tally.phase = 'chapter_complete';
    tick(tally, MISSILE, 3);
    expect(tally.player.missiles).toBe(1);
  });

  it('infiniteMissiles launches without consuming', () => {
    const s = newState();
    s.debug.infiniteMissiles = true;
    s.player.missiles = 0;
    tick(s, MISSILE, 1);
    expect(s.projectiles.some((p) => p.kind === 'missile')).toBe(true);
    expect(s.player.missiles).toBe(0);
    const t = newState();
    t.debug.infiniteMissiles = true;
    tick(t, MISSILE, 1);
    expect(t.player.missiles).toBe(1);
  });
});

describe('detonation', () => {
  it('fires when the flight ends and kills on-screen non-boss enemies with score and drops', () => {
    const s = newState();
    const near = addEnemy(s, { pos: { x: 100, y: 100 }, hp: 5, maxHp: 5, points: 250 });
    const edge = addEnemy(s, { pos: { x: 1300, y: -30 }, hp: 5, maxHp: 5, points: 250 });
    const away = addEnemy(s, { pos: { x: -60, y: 100 }, hp: 5, maxHp: 5 });
    const below = addEnemy(s, { pos: { x: 600, y: 770 }, hp: 5, maxHp: 5 });
    tick(s, MISSILE, 1);
    let detonated = 0;
    for (let i = 0; i < 40 && detonated === 0; i++) {
      expect(near.alive).toBe(true);
      tick(s, input(), 1);
      detonated += eventsOf(s, 'missile_detonated').length;
    }
    expect(detonated).toBe(1);
    expect(near.alive).toBe(false);
    expect(edge.alive).toBe(false);
    expect(away.alive).toBe(true);
    expect(below.alive).toBe(true);
    expect(s.score).toBe(500);
    expect(eventsOf(s, 'enemy_killed').every((e) => e.byMissile)).toBe(true);
    expect(s.pickups.length).toBe(2); // fake kind chicken_basic drops a drumstick each
    expect(s.projectiles.some((p) => p.kind === 'missile' && p.alive)).toBe(false);
  });

  it('reports byMissile to the kill hook so asteroids do not split', () => {
    const s = newState();
    killedLog.length = 0;
    const rock = addEnemy(s, { kind: 'asteroid_l', pos: { x: 400, y: 200 }, hp: 8, maxHp: 8 });
    detonateMissile(s, 640, 300);
    expect(rock.alive).toBe(false);
    expect(killedLog).toEqual([{ id: rock.id, byMissile: true }]);
  });

  it('deals 60 damage to bosses, skips invulnerable ones and never kills them outright', () => {
    const s = newState();
    const boss = addEnemy(s, { kind: 'boss_hen', isBoss: true, radius: 95, hp: 900, maxHp: 900, points: 10000 });
    const shielded = addEnemy(s, { kind: 'boss_hen', isBoss: true, invulnerable: true, hp: 900, maxHp: 900 });
    detonateMissile(s, 640, 300);
    expect(boss.hp).toBe(840);
    expect(shielded.hp).toBe(900);
    expect(boss.alive).toBe(true);
  });

  it('removes every enemy projectile without egg splats and spares player bolts', () => {
    const s = newState();
    const egg = spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 500, y: 650, vx: 0, vy: 60 });
    const shot = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 100, y: 100, vx: 0, vy: 1 });
    const bolt = spawnProjectile(s, { kind: 'bolt', owner: 'player', weapon: 'pulse', x: 100, y: 400, vx: 0, vy: -100 });
    detonateMissile(s, 640, 300);
    expect(egg?.alive).toBe(false);
    expect(shot?.alive).toBe(false);
    expect(bolt?.alive).toBe(true);
    expect(eventsOf(s, 'egg_splat')).toHaveLength(0);
    expect(eventsOf(s, 'missile_detonated')[0]).toEqual({ type: 'missile_detonated', x: 640, y: 300 });
  });
});
