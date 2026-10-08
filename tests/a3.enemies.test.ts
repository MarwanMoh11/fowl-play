// tests/a3.enemies.test.ts — OWNER: A3. Enemy construction, scaling, eggs, guards (§7.6).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { ENEMY_DEFS, dropEgg, spawnEnemy, updateEnemies } from '../src/sim/enemies';
import { DIFFICULTY, chapterScale } from '../src/sim/difficulty';
import { countEggs } from '../src/sim/projectiles';
import { DT, MAX_ENEMIES } from '../src/sim/tuning/core';
import { emptyWaveRuntime } from '../src/sim/waves.types';
import type { BehaviorState } from '../src/sim/behaviors.types';
import type { Difficulty, Enemy, EnemyKind, GameState } from '../src/sim/types';

function blank(difficulty: Difficulty = 'normal', chapter = 1): GameState {
  const s = createGame({ seed: 3, difficulty, startChapter: chapter, startWave: 1 });
  s.enemies.length = 0;
  s.projectiles.length = 0;
  s.waveRt = emptyWaveRuntime();
  s.events.length = 0;
  s.player.invulnTimer = 0;
  return s;
}

function spawn(s: GameState, kind: EnemyKind, x: number, y: number, b: BehaviorState = { type: 'none' }): Enemy {
  const e = spawnEnemy(s, kind, x, y, b);
  if (!e) throw new Error('spawn failed');
  return e;
}

function run(s: GameState, ticks: number): void {
  for (let i = 0; i < ticks; i++) updateEnemies(s, DT);
}

describe('ENEMY_DEFS', () => {
  it('matches the §7.6.1 table', () => {
    const rows: [EnemyKind, number, number, number, number, string | null][] = [
      ['chicken_basic', 22, 1, 100, 0.05, 'drumstick'],
      ['chicken_red', 24, 3, 250, 0.07, 'drumstick'],
      ['chicken_armored', 26, 7, 500, 0.08, 'roast'],
      ['chicken_ufo', 30, 5, 400, 0.04, 'roast'],
      ['chick', 14, 1, 50, 0, 'drumstick'],
      ['asteroid_l', 40, 8, 200, 0, null],
      ['asteroid_m', 26, 3, 100, 0, null],
      ['asteroid_s', 14, 1, 50, 0, null],
    ];
    for (const [k, r, hp, pts, egg, food] of rows) {
      const d = ENEMY_DEFS[k];
      expect([d.radius, d.hp, d.points, d.eggRate, d.food]).toEqual([r, hp, pts, egg, food]);
    }
    expect(ENEMY_DEFS.chick.foodChance).toBe(0.2);
    expect(ENEMY_DEFS.asteroid_l.splitInto).toBe('asteroid_m');
  });
});

describe('spawnEnemy scaling', () => {
  const kinds: EnemyKind[] = ['chicken_basic', 'chicken_red', 'chicken_armored', 'chicken_ufo', 'chick', 'asteroid_l'];
  const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
  it('hp, points and egg rate follow §7.14 for every kind, difficulty and chapter', () => {
    for (const d of diffs) {
      for (const c of [1, 2, 3, 5, 6, 12]) {
        const s = blank(d, c);
        for (const k of kinds) {
          const e = spawn(s, k, 100, 100);
          const base = ENEMY_DEFS[k];
          const sc = chapterScale(c);
          expect(e.hp).toBe(Math.max(1, Math.round(base.hp * DIFFICULTY[d].enemyHp * sc.hp)));
          expect(e.maxHp).toBe(e.hp);
          expect(e.points).toBe(Math.round((base.points * sc.points) / 10) * 10);
          expect(e.eggRate).toBeCloseTo(base.eggRate * DIFFICULTY[d].eggRate * sc.eggRate, 12);
          expect(e.radius).toBe(base.radius);
        }
      }
    }
  });

  it('spot values', () => {
    const hard3 = blank('hard', 3);
    expect(spawn(hard3, 'chicken_armored', 0, 0).hp).toBe(13); // 7 × 1.4 × 1.3 = 12.74
    const easy1 = blank('easy', 1);
    expect(spawn(easy1, 'chicken_armored', 0, 0).hp).toBe(5);
    expect(spawn(easy1, 'chicken_basic', 0, 0).hp).toBe(1); // never below 1
    expect(spawn(blank('normal', 2), 'chicken_basic', 0, 0).points).toBe(110);
    expect(spawn(blank('normal', 5), 'chicken_ufo', 0, 0).points).toBe(560);
  });

  it('boss kinds use base values and are flagged isBoss', () => {
    const s = blank('hard', 4);
    const b = spawn(s, 'boss_hen', 640, -200, { type: 'none' });
    expect(b.isBoss).toBe(true);
    expect(b.hp).toBe(900);
    expect(b.points).toBe(10000);
    expect(b.carries).toBeNull();
  });

  it('returns null at MAX_ENEMIES', () => {
    const s = blank();
    for (let i = 0; i < MAX_ENEMIES; i++) expect(spawnEnemy(s, 'chick', 10, 10, { type: 'none' })).not.toBeNull();
    expect(spawnEnemy(s, 'chick', 10, 10, { type: 'none' })).toBeNull();
    expect(s.enemies).toHaveLength(MAX_ENEMIES);
  });
});

describe('common rules', () => {
  it('age grows, hitFlash decays, chickens tilt with horizontal speed', () => {
    const s = blank();
    const e = spawn(s, 'chicken_basic', 640, 200);
    e.hitFlash = 0.06;
    e.vel.x = 100;
    run(s, 3);
    expect(e.age).toBeCloseTo(3 * DT, 9);
    expect(e.hitFlash).toBeCloseTo(0.06 - 3 * DT, 9);
    expect(e.rotation).toBeCloseTo(100 / 800, 9);
    e.vel.x = 5000;
    run(s, 1);
    expect(e.rotation).toBe(0.25);
    e.vel.x = -5000;
    run(s, 1);
    expect(e.rotation).toBe(-0.25);
    run(s, 10);
    expect(e.hitFlash).toBe(0);
  });

  it('removes lost enemies silently after more than 5 s outside the bounds', () => {
    const s = blank();
    const e = spawn(s, 'chicken_basic', 2000, 200);
    run(s, 60 * 5 - 5);
    expect(e.alive).toBe(true);
    run(s, 20);
    expect(e.alive).toBe(false);
    expect(s.events.filter((ev) => ev.type === 'enemy_killed')).toHaveLength(0);
    expect(s.score).toBe(0);
  });

  it('resets the lost timer when the enemy comes back', () => {
    const s = blank();
    const e = spawn(s, 'chicken_basic', 2000, 200);
    run(s, 60 * 4);
    e.pos.x = 640;
    run(s, 2);
    e.pos.x = 2000;
    run(s, 60 * 4);
    expect(e.alive).toBe(true);
  });

  it('bosses are handed to updateBoss, not to behaviors', () => {
    const s = blank();
    const b = spawn(s, 'boss_hen', 640, 170, { type: 'none' });
    b.vel.x = 400;
    run(s, 10);
    expect(b.age).toBeGreaterThan(0);
    expect(b.pos.x).toBe(640);
    expect(b.rotation).toBe(0);
  });
});

describe('eggs', () => {
  function stress(difficulty: Difficulty): GameState {
    const s = blank(difficulty);
    for (let i = 0; i < 200; i++) {
      const e = spawn(s, 'chicken_basic', 20 + (i % 40) * 30, 60 + Math.floor(i / 40) * 60);
      e.canDropEggs = true;
      e.eggRate = 5;
    }
    return s;
  }

  it('respects the difficulty egg cap with 200 chickens', () => {
    for (const d of ['easy', 'normal', 'hard'] as Difficulty[]) {
      const s = stress(d);
      let max = 0;
      for (let i = 0; i < 300; i++) {
        updateEnemies(s, DT);
        max = Math.max(max, countEggs(s));
      }
      expect(max).toBe(DIFFICULTY[d].eggCap);
    }
  });

  it('drops eggs below the cap and emits egg_dropped', () => {
    const s = blank();
    const e = spawn(s, 'chicken_basic', 640, 200);
    e.canDropEggs = true;
    e.eggRate = 10;
    run(s, 120);
    const eggs = s.projectiles.filter((p) => p.kind === 'egg');
    expect(eggs.length).toBeGreaterThan(3);
    expect(s.events.filter((ev) => ev.type === 'egg_dropped').length).toBe(eggs.length);
    expect(eggs[0].pos.y).toBeCloseTo(200 + 22 * 0.6, 6);
  });

  it('dropEgg spawns at (x, y + radius × 0.6)', () => {
    const s = blank();
    const e = spawn(s, 'chicken_armored', 300, 150);
    dropEgg(s, e);
    const egg = s.projectiles[0];
    expect(egg.pos.x).toBe(300);
    expect(egg.pos.y).toBeCloseTo(150 + 26 * 0.6, 9);
    expect(egg.owner).toBe('enemy');
  });

  it('no eggs below y = 520, outside x ∈ [0, 1280], or when canDropEggs is false', () => {
    const s = blank();
    const low = spawn(s, 'chicken_basic', 640, 560);
    const wide = spawn(s, 'chicken_basic', 1300, 200);
    const off = spawn(s, 'chicken_basic', 500, 200);
    for (const e of [low, wide, off]) e.eggRate = 50;
    low.canDropEggs = true;
    wide.canDropEggs = true;
    off.canDropEggs = false;
    run(s, 300);
    expect(s.projectiles).toHaveLength(0);
  });

  it('never drops eggs while entering: enter_path, return, bounce entering', () => {
    const s = blank();
    const path = { p0: { x: 0, y: 100 }, p1: { x: 100, y: 100 }, p2: { x: 200, y: 100 }, p3: { x: 300, y: 100 } };
    const a = spawn(s, 'chicken_basic', 0, 100, { type: 'enter_path', path, t: 0, duration: 1000, group: 0, slot: { x: 0, y: 0 } });
    const b = spawn(s, 'chicken_basic', 600, 100, { type: 'return', from: { x: 600, y: 100 }, t: 0, duration: 1000, group: 0, slot: { x: 0, y: 0 } });
    const c = spawn(s, 'chicken_basic', 640, -40, { type: 'bounce', entering: true });
    for (const e of [a, b, c]) {
      e.canDropEggs = true; // behaviors must override this
      e.eggRate = 50;
    }
    run(s, 20);
    expect([a.canDropEggs, b.canDropEggs, c.canDropEggs]).toEqual([false, false, false]);
    expect(s.projectiles.filter((p) => p.kind === 'egg')).toHaveLength(0);
  });

  it('diving chickens use 3x the egg rate', () => {
    const rate = (behavior: BehaviorState): number => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const s = blank();
        s.rng.s = seed * 7919;
        const e = spawn(s, 'chicken_basic', 640, 100, behavior);
        e.eggRate = 0.5;
        const path = { p0: { x: 640, y: 100 }, p1: { x: 640, y: 100 }, p2: { x: 640, y: 100 }, p3: { x: 640, y: 100 } };
        if (behavior.type === 'dive') e.behavior = { ...behavior, path };
        e.canDropEggs = true;
        for (let i = 0; i < 600; i++) updateEnemies(s, DT);
        total += s.projectiles.filter((p) => p.kind === 'egg').length;
      }
      return total;
    };
    const path = { p0: { x: 0, y: 0 }, p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, p3: { x: 0, y: 0 } };
    const diving = rate({ type: 'dive', path, t: 0, duration: 1e6, group: 0, slot: { x: 0, y: 0 } });
    const formation = rate({ type: 'formation', group: 99, slot: { x: 0, y: 0 } });
    expect(formation).toBeGreaterThan(0);
    expect(diving / formation).toBeGreaterThan(2);
    expect(diving / formation).toBeLessThan(4);
  });
});

describe('shared behaviors (A2 minions)', () => {
  it('seek turns toward the player at turnRate, then leaves the screen silently', () => {
    const s = blank();
    s.player.pos.x = 1000;
    s.player.pos.y = 600;
    const c = spawn(s, 'chick', 640, 170, { type: 'seek', speed: 260, turnRate: 2.5, heading: Math.PI / 2 });
    run(s, 1);
    const b = c.behavior as Extract<BehaviorState, { type: 'seek' }>;
    expect(b.heading).toBeCloseTo(Math.PI / 2 - 2.5 * DT, 9); // player is to the lower right: heading decreases
    expect(Math.hypot(c.vel.x, c.vel.y)).toBeCloseTo(260, 6);
    s.player.alive = false;
    b.heading = 0;
    c.pos.x = 1300;
    run(s, 10);
    expect(c.alive).toBe(false);
  });

  it('stream (hatchlings) moves along its sine and turns around', () => {
    const s = blank();
    const h = spawn(s, 'chicken_basic', 300, 260, { type: 'stream', dir: 1, speed: 220, baseY: 260, amp: 50, freq: 0.012, phase: 0 });
    run(s, 60);
    expect(h.pos.x).toBeCloseTo(300 + 220, 3);
    h.pos.x = 1339;
    run(s, 5);
    expect((h.behavior as Extract<BehaviorState, { type: 'stream' }>).dir).toBe(-1);
  });

  it('lane (escorts) patrols its lane and shoots the player', () => {
    const s = blank();
    s.player.pos.x = 640;
    s.player.pos.y = 600;
    const u = spawn(s, 'chicken_ufo', 100, 300, { type: 'lane', laneY: 300, speed: 180, dir: 1, shotTimer: 0.5 });
    run(s, 60 * 6);
    expect(s.projectiles.some((p) => p.kind === 'enemy_shot')).toBe(true);
    expect(s.events.some((ev) => ev.type === 'enemy_shot')).toBe(true);
    expect(u.pos.x).toBeGreaterThanOrEqual(80 - 1);
    expect(u.pos.x).toBeLessThanOrEqual(1200 + 1);
  });
});
