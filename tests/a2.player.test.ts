// tests/a2.player.test.ts — OWNER: A2. Ship movement, death and respawn (§7.3).
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import { createPlayer, isPlayerVulnerable, killPlayer } from '../src/sim/player';
import { spawnProjectile } from '../src/sim/projectiles';
import { SHIP_MAX_X, SHIP_MAX_Y, SHIP_MIN_X, SHIP_MIN_Y, SHIP_SPAWN } from '../src/sim/tuning/core';
import { eventsOf, input, newState, tick } from './a2.helpers';

describe('createPlayer', () => {
  it('uses the §7.3 defaults and per-difficulty lives and missiles', () => {
    const p = createPlayer('hard');
    expect(p).toMatchObject({ lives: 3, missiles: 0, weapon: 'pulse', power: 0, food: 0, heat: 0, invulnTimer: 2.0, radius: 14, pickupRadius: 36 });
    expect(p.pos).toEqual({ x: SHIP_SPAWN.x, y: SHIP_SPAWN.y });
    expect(createPlayer('easy')).toMatchObject({ lives: 7, missiles: 2 });
    expect(createPlayer('normal')).toMatchObject({ lives: 5, missiles: 1 });
  });
});

describe('movement', () => {
  it('moves at 480 px/s on the keyboard', () => {
    const s = newState();
    const x0 = s.player.pos.x;
    tick(s, input({ moveX: 1 }), 30); // 0.5 s
    expect(s.player.pos.x - x0).toBeCloseTo(240, 3);
  });

  it('normalizes diagonals', () => {
    const s = newState();
    const { x, y } = s.player.pos;
    tick(s, input({ moveX: 1, moveY: -1 }), 1);
    expect(Math.hypot(s.player.pos.x - x, s.player.pos.y - y)).toBeCloseTo(480 / 60, 6);
  });

  it('keeps partial analog deflection proportional', () => {
    const s = newState();
    const x0 = s.player.pos.x;
    tick(s, input({ moveX: 0.5 }), 60);
    expect(s.player.pos.x - x0).toBeCloseTo(240, 3);
  });

  it('clamps to the play area', () => {
    const s = newState();
    tick(s, input({ moveX: -1, moveY: 1 }), 300);
    expect(s.player.pos.x).toBe(SHIP_MIN_X);
    expect(s.player.pos.y).toBe(SHIP_MAX_Y);
    tick(s, input({ moveX: 1, moveY: -1 }), 600);
    expect(s.player.pos.x).toBe(SHIP_MAX_X);
    expect(s.player.pos.y).toBe(SHIP_MIN_Y);
  });

  it('pointer steering is capped at 1100 px/s and arrives exactly', () => {
    const s = newState();
    s.player.pos.x = 100;
    s.player.pos.y = 300;
    tick(s, input({ pointer: { x: 1200, y: 300 } }), 1);
    expect(s.player.pos.x - 100).toBeCloseTo(1100 / 60, 6);
    tick(s, input({ pointer: { x: 1200, y: 300 } }), 120);
    expect(s.player.pos.x).toBe(1200);
    tick(s, input({ pointer: { x: 5000, y: -50 } }), 120);
    expect(s.player.pos.x).toBe(SHIP_MAX_X);
    expect(s.player.pos.y).toBe(SHIP_MIN_Y);
  });

  it('banks toward the movement direction at 8 units/s and relaxes back', () => {
    const s = newState();
    tick(s, input({ moveX: 1 }), 1);
    expect(s.player.bank).toBeCloseTo(8 / 60, 6);
    tick(s, input({ moveX: 1 }), 30);
    expect(s.player.bank).toBeCloseTo(480 / 600, 6);
    tick(s, input({ moveX: -1 }), 90);
    expect(s.player.bank).toBeCloseTo(-480 / 600, 6);
    tick(s, input(), 30);
    expect(s.player.bank).toBeCloseTo(0, 6);
  });

  it('counts down the start invulnerability while alive', () => {
    const s = newState();
    s.player.invulnTimer = 2.0;
    expect(isPlayerVulnerable(s)).toBe(false);
    tick(s, input(), 60);
    expect(s.player.invulnTimer).toBeCloseTo(1.0, 6);
    tick(s, input(), 61);
    expect(s.player.invulnTimer).toBe(0);
    expect(isPlayerVulnerable(s)).toBe(true);
  });
});

describe('killPlayer', () => {
  it('is a no-op when not vulnerable (invulnerable, god mode, dead)', () => {
    const s = newState();
    s.player.invulnTimer = 1;
    killPlayer(s);
    expect(s.player.lives).toBe(5);
    s.player.invulnTimer = 0;
    s.debug.godMode = true;
    killPlayer(s);
    expect(s.player.lives).toBe(5);
    s.debug.godMode = false;
    s.player.alive = false;
    killPlayer(s);
    expect(s.player.lives).toBe(5);
  });

  it.each([['easy', 1, 7], ['normal', 2, 5], ['hard', 3, 3]] as const)('%s: loses %i power, keeps the weapon', (d, loss, lives) => {
    const s = newState({ difficulty: d });
    s.player.power = 5;
    s.player.weapon = 'laser';
    s.player.heat = 80;
    s.player.overheated = true;
    s.player.fireCooldown = 0.3;
    killPlayer(s);
    const p = s.player;
    expect(p.alive).toBe(false);
    expect(p.lives).toBe(lives - 1);
    expect(p.power).toBe(5 - loss);
    expect(p.weapon).toBe('laser');
    expect(p.heat).toBe(0);
    expect(p.overheated).toBe(false);
    expect(p.fireCooldown).toBe(0);
    expect(s.chapterStats.deaths).toBe(1);
    expect(s.runStats.deaths).toBe(1);
    expect(p.respawnTimer).toBe(1.5);
    expect(eventsOf(s, 'player_died')[0]).toMatchObject({ livesLeft: lives - 1 });
    expect(eventsOf(s, 'power_changed')[0]).toMatchObject({ power: 5 - loss, delta: -loss });
  });

  it('emits no power_changed at power 0 and floors power at 0', () => {
    const s = newState({ difficulty: 'hard' });
    s.player.power = 0;
    killPlayer(s);
    expect(s.player.power).toBe(0);
    expect(eventsOf(s, 'power_changed')).toHaveLength(0);
    const t = newState({ difficulty: 'hard' });
    t.player.power = 2;
    killPlayer(t);
    expect(t.player.power).toBe(0);
    expect(eventsOf(t, 'power_changed')[0].delta).toBe(-2);
  });

  it('uses the game-over delay when the last life is lost', () => {
    const s = newState();
    s.player.lives = 1;
    killPlayer(s);
    expect(s.player.lives).toBe(0);
    expect(s.player.respawnTimer).toBe(2.0);
  });
});

describe('respawn', () => {
  it('respawns after 1.5 s at the spawn point with 3 s of invulnerability and clears nearby shots', () => {
    const s = newState();
    s.player.pos.x = 200;
    killPlayer(s);
    const near = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 700, y: 500, vx: 0, vy: 0 });
    const far = spawnProjectile(s, { kind: 'enemy_shot', owner: 'enemy', x: 100, y: 100, vx: 0, vy: 0 });
    let ticks = 0;
    while (!s.player.alive && ticks < 200) {
      tick(s, input());
      ticks++;
    }
    expect(ticks).toBeGreaterThanOrEqual(89);
    expect(ticks).toBeLessThanOrEqual(91);
    expect(eventsOf(s, 'player_respawned')).toHaveLength(1);
    expect(s.player.pos).toEqual({ x: SHIP_SPAWN.x, y: SHIP_SPAWN.y });
    expect(s.player.invulnTimer).toBeGreaterThan(2.9);
    expect(s.player.invulnTimer).toBeLessThanOrEqual(3.0);
    expect(near?.alive).toBe(false);
    expect(far?.alive).toBe(true);
  });

  it('does not respawn at 0 lives; step switches to game_over after the delay', () => {
    const s = newState();
    s.player.lives = 1;
    killPlayer(s);
    tick(s, input(), 100);
    expect(s.player.alive).toBe(false);
    expect(s.player.lives).toBe(0);
    expect(s.phase).toBe('wave_active');
    tick(s, input(), 30);
    expect(s.phase).toBe('game_over');
    expect(s.player.alive).toBe(false);
  });

  it('a dead ship cannot move', () => {
    const s = newState();
    killPlayer(s);
    const x0 = s.player.pos.x;
    tick(s, input({ moveX: 1 }), 10);
    expect(s.player.pos.x).toBe(x0);
  });
});
