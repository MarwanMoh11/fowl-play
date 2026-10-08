// tests/a2.weapons.test.ts — OWNER: A2. Weapons, heat, power and gifts (§7.4).
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import type { GameState, WeaponId } from '../src/sim/types';
import { addPower, applyWeaponGift } from '../src/sim/weapons';
import { killPlayer } from '../src/sim/player';
import { ARC, LASER, NEUTRON, PULSE } from '../src/sim/tuning/weapons';
import { addEnemy, boltsOf, eventsOf, input, newState, tick } from './a2.helpers';

const FIRE = input({ fire: true });
const deg = (r: number): number => (r * 180) / Math.PI;

function fireOnce(s: GameState): void {
  s.player.fireCooldown = 0;
  tick(s, FIRE, 1);
}

function secondsToOverheat(weapon: WeaponId, power: number): number {
  const s = newState();
  s.player.weapon = weapon;
  s.player.power = power;
  for (let i = 1; i <= 3000; i++) {
    tick(s, FIRE, 1);
    if (s.player.overheated) return i / 60;
  }
  return Infinity;
}

describe('pulse blaster', () => {
  it.each(PULSE.levels.map((l, i) => [i, l] as const))('level %i: bolt count, fan spread and damage match the table', (level, def) => {
    const s = newState();
    s.player.power = level;
    fireOnce(s);
    const bolts = boltsOf(s);
    expect(bolts).toHaveLength(def.bolts);
    const angles = bolts.map((b) => deg(Math.atan2(b.vel.y, b.vel.x)) + 90).sort((a, b) => a - b);
    for (let i = 0; i < def.bolts; i++) {
      const expected = def.bolts === 1 ? 0 : -def.spread / 2 + (i * def.spread) / (def.bolts - 1);
      expect(angles[i]).toBeCloseTo(expected, 6);
    }
    for (const b of bolts) {
      expect(Math.hypot(b.vel.x, b.vel.y)).toBeCloseTo(950, 6);
      expect(b).toMatchObject({ damage: def.damage, radius: 5, pierceLeft: 1, owner: 'player', weapon: 'pulse', hitIds: [] });
    }
    expect(s.chapterStats.shotsFired).toBe(def.bolts);
    expect(s.runStats.shotsFired).toBe(def.bolts);
    expect(eventsOf(s, 'player_fire')).toHaveLength(1);
    expect(eventsOf(s, 'player_fire')[0]).toMatchObject({ weapon: 'pulse', power: level, x: 640 });
  });

  it('fires from the nose, 26 px above the ship', () => {
    const s = newState();
    fireOnce(s);
    const b = boltsOf(s)[0];
    expect(b.pos.x).toBeCloseTo(640, 6);
    expect(b.pos.y).toBeCloseTo(600 - 26 - 950 / 60, 3);
  });
});

describe('fire rate and gating', () => {
  it.each([['pulse', 7], ['neutron', 5], ['laser', 10], ['arc', 5]] as const)('%s fires %i volleys/s', (w, rate) => {
    const s = newState();
    s.player.weapon = w;
    let volleys = 0;
    for (let i = 0; i < 600; i++) {
      s.player.heat = 0;
      tick(s, FIRE, 1);
      volleys += eventsOf(s, 'player_fire').length;
    }
    expect(Math.abs(volleys - rate * 10)).toBeLessThanOrEqual(1);
  });

  it('does not fire outside canFire phases or when dead', () => {
    for (const phase of ['chapter_complete', 'warp', 'game_over', 'victory'] as const) {
      const s = newState();
      s.phase = phase;
      tick(s, FIRE, 5);
      expect(boltsOf(s)).toHaveLength(0);
    }
    for (const phase of ['wave_intro', 'boss_intro', 'wave_active', 'wave_clear'] as const) {
      const s = newState();
      s.phase = phase;
      tick(s, FIRE, 1);
      expect(boltsOf(s).length).toBeGreaterThan(0);
    }
    const d = newState();
    killPlayer(d);
    tick(d, FIRE, 10);
    expect(boltsOf(d)).toHaveLength(0);
  });

  it('can fire while invulnerable', () => {
    const s = newState();
    s.player.invulnTimer = 2;
    tick(s, FIRE, 1);
    expect(boltsOf(s).length).toBeGreaterThan(0);
  });
});

describe('heat', () => {
  it('pulse overheats in the intended window (5-10 s at power 0, 2.5-4 s at power 10)', () => {
    const t0 = secondsToOverheat('pulse', 0);
    const t10 = secondsToOverheat('pulse', 10);
    expect(t0).toBeGreaterThanOrEqual(5);
    expect(t0).toBeLessThanOrEqual(10);
    expect(t10).toBeGreaterThanOrEqual(2.4); // 2.59 s analytically; the 9.8-per-volley sawtooth peaks a little earlier
    expect(t10).toBeLessThanOrEqual(4);
  });

  it.each(['neutron', 'laser', 'arc'] as const)('%s overheats within roughly the same windows', (w) => {
    expect(secondsToOverheat(w, 0)).toBeGreaterThanOrEqual(4.5);
    expect(secondsToOverheat(w, 0)).toBeLessThanOrEqual(10.6);
    expect(secondsToOverheat(w, 10)).toBeGreaterThanOrEqual(2.0);
    expect(secondsToOverheat(w, 10)).toBeLessThanOrEqual(4.2);
  });

  it('heat scales with difficulty heatMul and power', () => {
    const easy = newState({ difficulty: 'easy' });
    fireOnce(easy);
    expect(easy.player.heat).toBeCloseTo(7 * 0.6, 6);
    const hard = newState({ difficulty: 'hard' });
    hard.player.power = 10;
    fireOnce(hard);
    expect(hard.player.heat).toBeCloseTo(7 * 1.4 * 1.15, 6);
  });

  it('locks the gun until heat falls to 25, then recovers with an event', () => {
    const s = newState();
    let overheatEvents = 0;
    let guard = 0;
    while (!s.player.overheated && guard++ < 3000) {
      tick(s, FIRE, 1);
      overheatEvents += eventsOf(s, 'overheat').length;
    }
    expect(overheatEvents).toBe(1);
    expect(s.player.heat).toBeLessThanOrEqual(100);
    const before = s.projectiles.length;
    let recovered = 0;
    let ticks = 0;
    while (s.player.overheated && ticks < 600) {
      tick(s, ticks < 10 ? FIRE : input(), 1); // holding fire while overheated must not shoot
      recovered += eventsOf(s, 'heat_recovered').length;
      if (ticks < 10) expect(eventsOf(s, 'player_fire')).toHaveLength(0);
      ticks++;
    }
    expect(recovered).toBe(1);
    expect(s.player.heat).toBeLessThanOrEqual(25);
    expect(s.player.heat).toBeGreaterThan(25 - 40 / 60 - 1e-9);
    expect(ticks / 60).toBeGreaterThan(1.5);
    expect(ticks / 60).toBeLessThan(2.2);
    expect(s.projectiles.length).toBeLessThanOrEqual(before);
    tick(s, FIRE, 1);
    expect(boltsOf(s).length).toBeGreaterThan(0);
  });

  it('cools at 30/s when idle and never goes below zero', () => {
    const s = newState();
    s.player.heat = 40;
    tick(s, input(), 30);
    expect(s.player.heat).toBeCloseTo(25, 6);
    tick(s, input(), 120);
    expect(s.player.heat).toBe(0);
  });
});

describe('neutron cannon', () => {
  it.each(NEUTRON.levels.map((l, i) => [i, l] as const))('level %i: parallel bolts, damage', (level, def) => {
    const s = newState();
    s.player.weapon = 'neutron';
    s.player.power = level;
    fireOnce(s);
    const bolts = boltsOf(s).sort((a, b) => a.pos.x - b.pos.x);
    expect(bolts).toHaveLength(def.bolts);
    bolts.forEach((b, i) => {
      expect(b.pos.x).toBeCloseTo(640 + (i - (def.bolts - 1) / 2) * 14, 6);
      expect(b.vel.x).toBeCloseTo(0, 6);
      expect(b.vel.y).toBeCloseTo(-1050, 6);
      expect(b).toMatchObject({ damage: def.damage, radius: 7, pierceLeft: 1, weapon: 'neutron' });
    });
    expect(s.runStats.shotsFired).toBe(def.bolts);
  });
});

describe('piercing laser', () => {
  it.each(LASER.levels.map((l, i) => [i, l] as const))('level %i: beams, pierce, damage', (level, def) => {
    const s = newState();
    s.player.weapon = 'laser';
    s.player.power = level;
    fireOnce(s);
    const bolts = boltsOf(s).sort((a, b) => a.pos.x - b.pos.x);
    expect(bolts).toHaveLength(def.bolts);
    bolts.forEach((b, i) => {
      expect(b.pos.x).toBeCloseTo(640 + (i - (def.bolts - 1) / 2) * 18, 6);
      expect(b.vel.y).toBeCloseTo(-1500, 6);
      expect(b).toMatchObject({ damage: def.damage, radius: 4, pierceLeft: def.pierce, weapon: 'laser' });
    });
  });
});

describe('arc caster', () => {
  // Ship at (640, 600): nose at (640, 574).
  const tough = { hp: 100, maxHp: 100 };

  it.each(ARC.levels.map((l, i) => [i, l] as const))('level %i: chains up to the table target count for the table damage', (level, def) => {
    const s = newState();
    s.player.weapon = 'arc';
    s.player.power = level;
    // A column of 8 enemies 90 px apart, the lowest one in range of every level.
    const col = Array.from({ length: 8 }, (_, i) => addEnemy(s, { pos: { x: 640, y: 400 - i * 90 }, ...tough }));
    fireOnce(s);
    const hit = col.filter((e) => e.hp < 100);
    const range = 320 + 20 * level;
    expect(hit.length).toBe(def.targets);
    for (const e of hit) expect(100 - e.hp).toBe(def.damage);
    const arc = eventsOf(s, 'arc');
    expect(arc).toHaveLength(1);
    expect(arc[0].points).toHaveLength(def.targets + 1);
    expect(arc[0].points[0]).toEqual({ x: 640, y: 574 });
    expect(574 - 400).toBeLessThanOrEqual(range);
    expect(boltsOf(s)).toHaveLength(0);
    expect(s.runStats.shotsFired).toBe(1);
    expect(s.runStats.shotsHit).toBe(1);
    expect(s.chapterStats.shotsHit).toBe(1);
  });

  it('first target is the nearest enemy inside the cone; chain picks the nearest unhit within 170 px', () => {
    const s = newState();
    s.player.weapon = 'arc';
    s.player.power = 4; // 3 targets
    const a = addEnemy(s, { pos: { x: 640, y: 400 }, ...tough });
    const b = addEnemy(s, { pos: { x: 740, y: 400 }, ...tough });
    const c = addEnemy(s, { pos: { x: 580, y: 400 }, ...tough });
    const far = addEnemy(s, { pos: { x: 640, y: 200 }, ...tough });
    fireOnce(s);
    expect(a.hp).toBeLessThan(100);
    expect(c.hp).toBeLessThan(100);
    expect(b.hp).toBeLessThan(100);
    expect(far.hp).toBe(100); // 200 px from a, 208 from c: out of hop range
    expect(eventsOf(s, 'arc')[0].points.map((p) => p.x)).toEqual([640, 640, 580, 740]);
  });

  it('never re-hits a target within one volley and stops when nothing is in hop range', () => {
    const s = newState();
    s.player.weapon = 'arc';
    s.player.power = 10; // 6 targets
    const a = addEnemy(s, { pos: { x: 640, y: 400 }, ...tough });
    const b = addEnemy(s, { pos: { x: 700, y: 400 }, ...tough });
    fireOnce(s);
    expect(a.hp).toBe(100 - 8);
    expect(b.hp).toBe(100 - 8);
    expect(eventsOf(s, 'arc')[0].points).toHaveLength(3);
  });

  it('ignores enemies beyond range, outside the ±60° cone, below the ship, or invulnerable; fires a straight fallback bolt', () => {
    const s = newState();
    s.player.weapon = 'arc';
    s.player.power = 0; // range 320
    addEnemy(s, { pos: { x: 640, y: 574 - 330 }, ...tough });          // too far
    addEnemy(s, { pos: { x: 940, y: 465 }, ...tough });                // ~70° off vertical
    addEnemy(s, { pos: { x: 640, y: 650 }, ...tough });                // below the ship
    addEnemy(s, { pos: { x: 640, y: 450 }, invulnerable: true, ...tough });
    fireOnce(s);
    expect(s.enemies.every((e) => e.hp === 100)).toBe(true);
    expect(eventsOf(s, 'arc')).toHaveLength(0);
    const bolts = boltsOf(s);
    expect(bolts).toHaveLength(1);
    expect(bolts[0]).toMatchObject({ weapon: 'arc', radius: 5, damage: 1, pierceLeft: 1 });
    expect(bolts[0].vel.y).toBeCloseTo(-1000, 6);
    expect(bolts[0].vel.x).toBeCloseTo(0, 6);
    expect(s.runStats.shotsFired).toBe(1);
    expect(s.runStats.shotsHit).toBe(0);
  });

  it('range grows with level and the cone edge is ±60°', () => {
    const inRange = newState();
    inRange.player.weapon = 'arc';
    inRange.player.power = 5; // range 420
    const e = addEnemy(inRange, { pos: { x: 640, y: 574 - 410 }, ...tough });
    fireOnce(inRange);
    expect(e.hp).toBeLessThan(100);
    const edge = newState();
    edge.player.weapon = 'arc';
    const dy = 100;
    const inside = addEnemy(edge, { pos: { x: 640 + dy * Math.tan((59 * Math.PI) / 180), y: 574 - dy }, ...tough });
    fireOnce(edge);
    expect(inside.hp).toBeLessThan(100);
  });

  it('kills go through damageEnemy (score and enemy_killed)', () => {
    const s = newState();
    s.player.weapon = 'arc';
    addEnemy(s, { pos: { x: 640, y: 400 }, hp: 1, maxHp: 1, points: 100 });
    fireOnce(s);
    expect(s.score).toBe(100);
    expect(eventsOf(s, 'enemy_killed')).toHaveLength(1);
    expect(eventsOf(s, 'enemy_hit')[0].dmg).toBe(2);
  });
});

describe('addPower / applyWeaponGift', () => {
  it('clamps to 0..10 and reports the real delta', () => {
    const s = newState();
    addPower(s, 3);
    expect(s.player.power).toBe(3);
    expect(eventsOf(s, 'power_changed')[0]).toEqual({ type: 'power_changed', power: 3, delta: 3 });
    s.events.length = 0;
    addPower(s, -10);
    expect(s.player.power).toBe(0);
    expect(eventsOf(s, 'power_changed')[0]).toMatchObject({ power: 0, delta: -3 });
    s.events.length = 0;
    addPower(s, -1);
    expect(eventsOf(s, 'power_changed')).toHaveLength(0);
    addPower(s, 99);
    expect(s.player.power).toBe(10);
  });

  it('at power 10 a positive delta awards 500 points instead', () => {
    const s = newState();
    s.player.power = 10;
    s.events.length = 0;
    addPower(s, 1);
    expect(s.player.power).toBe(10);
    expect(s.score).toBe(500);
    expect(eventsOf(s, 'power_changed')).toHaveLength(0);
    expect(eventsOf(s, 'score_popup')[0]).toMatchObject({ amount: 500 });
  });

  it('a gift of another weapon switches (power kept); the same weapon adds +1 power', () => {
    const s = newState();
    s.player.power = 4;
    applyWeaponGift(s, 'laser');
    expect(s.player.weapon).toBe('laser');
    expect(s.player.power).toBe(4);
    expect(eventsOf(s, 'weapon_changed')).toEqual([{ type: 'weapon_changed', weapon: 'laser' }]);
    s.events.length = 0;
    applyWeaponGift(s, 'laser');
    expect(s.player.power).toBe(5);
    expect(eventsOf(s, 'weapon_changed')).toHaveLength(0);
    expect(eventsOf(s, 'power_changed')).toHaveLength(1);
  });
});
