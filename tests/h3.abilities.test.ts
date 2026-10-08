// tests/h3.abilities.test.ts — OWNER: H3. Every enemy ability (HENPOCALYPSE §H3) under fake time.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { spawnEnemy, updateEnemies } from '../src/sim/enemies';
import { damageEnemy } from '../src/sim/combat';
import { DT } from '../src/sim/tuning/core';
import type { Enemy, EnemyKind, GameState } from '../src/sim/types';
import type { BehaviorState } from '../src/sim/behaviors.types';

const NONE: BehaviorState = { type: 'none' };

function game(): GameState {
  const s = createGame({ seed: 3, difficulty: 'normal', debug: { godMode: true } });
  s.events.length = 0;
  return s;
}

/** Spawns an enemy that does not move (behavior none) so only its ability acts. */
function spawn(s: GameState, kind: EnemyKind, x: number, y: number, behavior: BehaviorState = NONE): Enemy {
  const e = spawnEnemy(s, kind, x, y, behavior, { counted: false });
  if (!e) throw new Error('spawn failed');
  return e;
}

/** Runs the enemy update for `seconds` of fake time. Events accumulate (the test owns them). */
function run(s: GameState, seconds: number): void {
  const ticks = Math.round(seconds / DT);
  for (let i = 0; i < ticks; i++) updateEnemies(s, DT);
}

function count(s: GameState, type: string): number {
  return s.events.filter((e) => e.type === type).length;
}

describe('ninja', () => {
  it('cloaks for 0.6 s every 3 s on screen, then throws one feather knife', () => {
    const s = game();
    const e = spawn(s, 'chicken_ninja', 400, 200);
    run(s, 2.3);
    expect(e.invulnerable).toBe(false);
    run(s, 0.2); // 2.5 s: cloak has begun
    expect(e.invulnerable).toBe(true);
    run(s, 0.7); // 3.2 s: cloak ended at 3.0 s
    expect(e.invulnerable).toBe(false);
    expect(s.projectiles.filter((p) => p.kind === 'feather_knife' && p.owner === 'enemy')).toHaveLength(1);
    expect(s.events.filter((ev) => ev.type === 'enemy_cloak').map((ev) => (ev.type === 'enemy_cloak' ? ev.on : null)))
      .toEqual([true, false]);
  });

  it('damage is absorbed while cloaked', () => {
    const s = game();
    const e = spawn(s, 'chicken_ninja', 400, 200);
    run(s, 2.5);
    expect(damageEnemy(s, e, 99, 'bolt')).toBe(false);
    expect(e.alive).toBe(true);
  });
});

describe('bomber', () => {
  it('lays cluster eggs with a 0.9–1.4 s fuse while in the egg zone', () => {
    const s = game();
    const e = spawn(s, 'chicken_bomber', 400, 200);
    e.canDropEggs = true;
    run(s, 60);
    const bombs = s.projectiles.filter((p) => p.kind === 'cluster_egg');
    expect(bombs.length).toBeGreaterThan(2);
    for (const b of bombs) {
      expect(b.fuse).toBeGreaterThanOrEqual(0.9);
      expect(b.fuse).toBeLessThanOrEqual(1.4);
    }
  });

  it('lays nothing outside the egg zone or when it cannot drop eggs', () => {
    const s = game();
    const e = spawn(s, 'chicken_bomber', 400, 600);
    e.canDropEggs = true;
    run(s, 20);
    expect(s.projectiles.some((p) => p.kind === 'cluster_egg')).toBe(false);
  });
});

describe('egg pod', () => {
  it('hatches three seeking chicks after 6 s, silently and with no points', () => {
    const s = game();
    const pod = spawn(s, 'egg_pod', 300, 100);
    const kills = s.runStats.kills;
    run(s, 5.9);
    expect(pod.alive).toBe(true);
    run(s, 0.2);
    expect(pod.alive).toBe(false);
    const chicks = s.enemies.filter((e) => e.kind === 'chick' && e.parentId === pod.id);
    expect(chicks).toHaveLength(3);
    expect(chicks.every((c) => c.behavior.type === 'seek' && c.alive)).toBe(true);
    expect(count(s, 'pod_hatch')).toBe(1);
    expect(s.runStats.kills).toBe(kills);
  });

  it('a pod killed early is a normal kill', () => {
    const s = game();
    const pod = spawn(s, 'egg_pod', 300, 100);
    run(s, 1);
    expect(damageEnemy(s, pod, 99, 'bolt')).toBe(true);
    expect(count(s, 'pod_hatch')).toBe(0);
  });
});

describe('turret', () => {
  it('fires a burst of three aimed shots 0.12 s apart, every 2.5 s', () => {
    const s = game();
    spawn(s, 'chicken_turret', 640, 200);
    run(s, 0.3);
    expect(count(s, 'enemy_shot')).toBe(3);
    run(s, 2.6);
    expect(count(s, 'enemy_shot')).toBe(6);
  });
});

describe('shield and elite regeneration', () => {
  it('regenerates 2 shield/s only 3 s after the last shield hit', () => {
    const s = game();
    const e = spawn(s, 'chicken_shield', 300, 200);
    expect(e.maxShield).toBe(8);
    damageEnemy(s, e, 5, 'bolt');
    expect(e.shield).toBe(3);
    run(s, 2.9);
    expect(e.shield).toBe(3);
    run(s, 1);
    expect(e.shield).toBeGreaterThan(3);
    run(s, 10);
    expect(e.shield).toBe(8);
  });

  it('the elite fires a 5-way spread every 3 s and regenerates its 10 shield', () => {
    const s = game();
    const e = spawn(s, 'chicken_elite', 640, 200);
    expect(e.maxShield).toBe(10);
    run(s, 3.05);
    expect(count(s, 'enemy_shot')).toBe(5);
    damageEnemy(s, e, 10, 'bolt');
    run(s, 8);
    expect(e.shield).toBeCloseTo(10, 6);
  });
});

describe('mech', () => {
  it('drops a boss egg straight down every 3 s', () => {
    const s = game();
    spawn(s, 'chicken_mech', 640, 200);
    run(s, 3.05);
    const eggs = s.projectiles.filter((p) => p.kind === 'boss_egg');
    expect(eggs).toHaveLength(1);
    expect(eggs[0].vel.x).toBeCloseTo(0, 6);
    expect(eggs[0].vel.y).toBeGreaterThan(0);
  });
});

describe('space mine', () => {
  it('detonates within 90 px: no points, eight shards', () => {
    const s = game();
    const m = spawn(s, 'space_mine', s.player.pos.x + 50, s.player.pos.y);
    const kills = s.runStats.kills;
    run(s, DT * 2);
    expect(m.alive).toBe(false);
    expect(s.projectiles.filter((p) => p.kind === 'shard')).toHaveLength(8);
    expect(count(s, 'projectile_burst')).toBe(1);
    expect(s.runStats.kills).toBe(kills);
  });

  it('a mine shot down also bursts into eight shards', () => {
    const s = game();
    const m = spawn(s, 'space_mine', 200, 200);
    expect(damageEnemy(s, m, 99, 'bolt')).toBe(true);
    expect(s.projectiles.filter((p) => p.kind === 'shard')).toHaveLength(8);
  });
});

describe('ghost', () => {
  it('is invulnerable for the last 1.5 s of each 4 s cycle', () => {
    const s = game();
    const g = spawn(s, 'chicken_ghost', 300, 200);
    run(s, 2.4);
    expect(g.invulnerable).toBe(false);
    run(s, 0.2);
    expect(g.invulnerable).toBe(true);
    run(s, 1.5); // 4.1 s: the cycle restarted at 4.0 s
    expect(g.invulnerable).toBe(false);
    expect(s.events.filter((ev) => ev.type === 'enemy_cloak').length).toBe(2);
  });
});

describe('healer', () => {
  it('heals non-boss enemies within 160 px by 15% of max hp, every 2 s', () => {
    const s = game();
    spawn(s, 'chicken_healer', 300, 200);
    const near = spawn(s, 'chicken_armored', 360, 200);
    const far = spawn(s, 'chicken_armored', 600, 200);
    near.hp = 2;
    far.hp = 2;
    run(s, 2.05);
    expect(near.hp).toBe(2 + Math.ceil(near.maxHp * 0.15));
    expect(far.hp).toBe(2);
    expect(count(s, 'enemy_heal')).toBe(1);
  });
});

describe('sniper', () => {
  it('telegraphs 0.9 s toward the player, then fires along the same line at 700 px/s', () => {
    const s = game();
    const k = spawn(s, 'chicken_sniper', 400, 200);
    run(s, 4.05);
    const tele = s.hazards.find((h) => h.kind === 'telegraph' && h.ownerId === k.id);
    expect(tele).toBeDefined();
    expect(count(s, 'enemy_shot')).toBe(0);
    run(s, 0.95);
    const shot = s.projectiles.find((p) => p.owner === 'enemy' && p.kind === 'enemy_shot');
    expect(shot).toBeDefined();
    if (!tele || !shot) return;
    expect(Math.hypot(shot.vel.x, shot.vel.y)).toBeCloseTo(700, 3);
    const aim = Math.atan2(tele.b.y - tele.a.y, tele.b.x - tele.a.x);
    expect(Math.atan2(shot.vel.y, shot.vel.x)).toBeCloseTo(aim, 6);
  });
});

describe('mother', () => {
  it('spawns two seeking chicks every 4 s, never more than 24 alive', () => {
    const s = game();
    const m = spawn(s, 'chicken_mother', 640, 170);
    run(s, 4.05);
    const first = s.enemies.filter((e) => e.kind === 'chick' && e.parentId === m.id);
    expect(first).toHaveLength(2);
    expect(first[0].behavior.type).toBe('seek');
    run(s, 80);
    const chicks = s.enemies.filter((e) => e.kind === 'chick' && e.alive);
    expect(chicks.length).toBe(24);
  });
});

describe('void', () => {
  it('a blink void teleports into its box and fires a homing orb every 2.5 s', () => {
    const s = game();
    const v = spawn(s, 'chicken_void', 300, 200, { type: 'blink' });
    run(s, 2.55);
    const tele = s.events.find((ev) => ev.type === 'enemy_teleport');
    expect(tele).toBeDefined();
    expect(v.pos.x).toBeGreaterThanOrEqual(120);
    expect(v.pos.x).toBeLessThanOrEqual(1160);
    expect(v.pos.y).toBeGreaterThanOrEqual(80);
    expect(v.pos.y).toBeLessThanOrEqual(360);
    const orb = s.projectiles.find((p) => p.kind === 'void_orb');
    expect(orb).toBeDefined();
    expect(orb?.homing).toBeCloseTo(1.2, 6);
    expect(orb?.ttl).toBe(6);
  });

  it('a ring void fires orbs but never teleports', () => {
    const s = game();
    const v = spawn(s, 'chicken_void', 300, 200, { type: 'ring', group: -1, ring: 0, index: 0, count: 1, radiusTarget: 0, omega: 0 });
    run(s, 5.1);
    expect(count(s, 'enemy_teleport')).toBe(0);
    expect(v.pos).toEqual({ x: 300, y: 200 });
    expect(s.projectiles.filter((p) => p.kind === 'void_orb')).toHaveLength(2);
  });
});

describe('abilities that only move or never shoot', () => {
  it('gold chickens and comets have no ability', () => {
    const s = game();
    spawn(s, 'chicken_gold', 300, 200);
    spawn(s, 'comet', 500, 200);
    run(s, 10);
    expect(s.projectiles).toHaveLength(0);
  });
});
