// tests/a3.patterns.test.ts — OWNER: A3. Wave patterns (§7.11): counts, bounds, finiteness, behaviors.
import { describe, expect, it } from 'vitest';
import { compact, createGame } from '../src/sim/game';
import { damageEnemy } from '../src/sim/combat';
import { updateEnemies } from '../src/sim/enemies';
import { isWaveComplete, updateWaveSpawner } from '../src/sim/waves';
import { waveDef } from '../src/sim/chapters';
import { patternPlanned } from '../src/sim/patterns';
import { DT } from '../src/sim/tuning/core';
import type { Enemy, GameState } from '../src/sim/types';

function makeState(chapter: number, wave: number, seed = 11): GameState {
  const s = createGame({ seed, difficulty: 'normal', startChapter: chapter, startWave: wave, debug: { godMode: true } });
  s.player.invulnTimer = 0;
  return s;
}

function tick(s: GameState): void {
  updateWaveSpawner(s, DT);
  updateEnemies(s, DT);
  compact(s);
}

function finite(e: Enemy): boolean {
  return [e.pos.x, e.pos.y, e.vel.x, e.vel.y, e.rotation].every(Number.isFinite);
}

const PLAIN: string[] = ['dive', 'return', 'enter_path', 'drift'];

/** y ≤ 520 for everything except divers, kamikazes, asteroids, fly-ins and rings still entering. */
function mayExceedY(s: GameState, e: Enemy): boolean {
  const b = e.behavior;
  if (PLAIN.includes(b.type)) return true;
  if (b.type === 'swarm') return b.mode === 'kamikaze';
  if (b.type === 'ring') return s.waveRt.groups[b.group].data.entered !== 1;
  return false;
}

const ALL_WAVES: [number, number][] = [];
for (let c = 1; c <= 5; c++) for (let w = 1; w <= 9; w++) ALL_WAVES.push([c, w]);

describe('every pattern, chapters 1-5', () => {
  it.each(ALL_WAVES)('chapter %i wave %i: exact planned count, bounds, no NaN over 30 s', (c, w) => {
    const s = makeState(c, w);
    const planned = waveDef(c, w).groups.reduce((sum, g) => sum + patternPlanned(g), 0);
    const seen = new Set<number>();
    const bad: string[] = [];
    for (let i = 0; i < 60 * 40; i++) {
      tick(s);
      for (const e of s.enemies) {
        seen.add(e.id);
        const tag = `${e.kind} ${e.behavior.type} tick ${i} (${e.pos.x.toFixed(0)},${e.pos.y.toFixed(0)})`;
        if (!finite(e)) bad.push('NaN: ' + tag);
        if (i > 60 * 12 && e.behavior.type === 'formation' && (e.pos.x < 20 || e.pos.x > 1260)) bad.push('x: ' + tag);
        if (e.pos.y > 520 && !mayExceedY(s, e)) bad.push('y: ' + tag);
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
    expect(seen.size).toBe(planned);
    expect(s.waveRt.spawnCounter).toBe(planned);
    for (const g of s.waveRt.groups) {
      expect(g.started).toBe(true);
      expect(g.doneSpawning).toBe(true);
      expect(g.spawned).toBe(g.total);
    }
  });
});

describe('asteroids', () => {
  it('spawns floor(rate × duration) within ±1 and the group ends on time', () => {
    const s = makeState(1, 4);
    let done = -1;
    for (let i = 0; i < 60 * 40; i++) {
      tick(s);
      if (done < 0 && s.waveRt.groups[0].doneSpawning) done = s.waveRt.elapsed;
    }
    const g = s.waveRt.groups[0];
    expect(Math.abs(g.spawned - 1.2 * 20)).toBeLessThanOrEqual(1);
    expect(done).toBeGreaterThanOrEqual(0.8 + 20 - 0.1);
    expect(done).toBeLessThanOrEqual(0.8 + 20 + 0.1);
  });

  it('rocks leave the screen silently and the wave completes without kills', () => {
    const s = makeState(2, 2);
    let t = 0;
    while (!isWaveComplete(s) && t < 60 * 70) {
      tick(s);
      t++;
    }
    expect(isWaveComplete(s)).toBe(true);
    expect(s.score).toBe(0);
  });

  it('spawns on the right sides and in the right directions', () => {
    const s = makeState(1, 4);
    const velocities: Enemy[] = [];
    for (let i = 0; i < 60 * 10; i++) {
      tick(s);
      for (const e of s.enemies) if (e.age < DT * 1.5 && !velocities.includes(e)) velocities.push(e);
    }
    expect(velocities.length).toBeGreaterThan(5);
    for (const e of velocities) {
      expect(e.vel.x).toBeLessThan(0); // 'tr' flies down-left
      expect(e.vel.y).toBeGreaterThan(0);
    }
    const t = makeState(2, 2); // 'tl'
    for (let i = 0; i < 60 * 3; i++) tick(t);
    for (const e of t.enemies) expect(e.vel.x).toBeGreaterThan(0);
  });

  it('splits L into 2 M and M into 2 S at 1.15x speed, ±25°; missiles do not split', () => {
    const s = makeState(1, 4);
    s.enemies.length = 0;
    s.waveRt.groups[0].doneSpawning = true;
    const big = spawnTestAsteroid(s, 'asteroid_l', 300, 100, { x: -150, y: 100 });
    damageEnemy(s, big, 99, 'bolt');
    const mids = s.enemies.filter((e) => e.alive && e.kind === 'asteroid_m');
    expect(mids).toHaveLength(2);
    const speed = Math.hypot(-150, 100);
    for (const m of mids) expect(Math.hypot(m.vel.x, m.vel.y)).toBeCloseTo(speed * 1.15, 5);
    const a0 = Math.atan2(100, -150);
    const diffs = mids.map((m) => Math.atan2(m.vel.y, m.vel.x) - a0).sort((x, y) => x - y);
    expect(diffs[0]).toBeCloseTo(-Math.PI * 25 / 180, 5);
    expect(diffs[1]).toBeCloseTo(Math.PI * 25 / 180, 5);
    damageEnemy(s, mids[0], 99, 'bolt');
    expect(s.enemies.filter((e) => e.alive && e.kind === 'asteroid_s')).toHaveLength(2);
    const m2 = s.enemies.filter((e) => e.alive && e.kind === 'asteroid_m')[0];
    const before = s.enemies.length;
    damageEnemy(s, m2, 99, 'missile');
    expect(s.enemies.length).toBe(before);
  });
});

function spawnTestAsteroid(s: GameState, kind: 'asteroid_l', x: number, y: number, v: { x: number; y: number }): Enemy {
  const e: Enemy = {
    id: s.nextId++, kind, pos: { x, y }, vel: { ...v }, radius: 40, hp: 8, maxHp: 8, points: 200, eggRate: 0,
    alive: true, age: 0, hitFlash: 0, invulnerable: false, canDropEggs: false, carries: null, rotation: 0, anim: 0,
    isBoss: false, behavior: { type: 'drift', spin: 1 },
  };
  s.enemies.push(e);
  return e;
}

describe('grid', () => {
  it('enters over 2 s, never drops eggs before, descends no further than maxBottomY', () => {
    const s = makeState(3, 1); // descendRate 3
    for (let i = 0; i < 60 * 2.7; i++) {
      tick(s);
      if (s.waveRt.elapsed < 0.8 + 2.0) for (const e of s.enemies) expect(e.canDropEggs).toBe(false);
    }
    for (let i = 0; i < 60 * 30; i++) tick(s);
    const bottom = Math.max(...s.enemies.map((e) => e.pos.y));
    expect(bottom).toBeLessThanOrEqual(440 + 10 + 4 + 0.001);
    expect(s.enemies.some((e) => e.canDropEggs)).toBe(true);
  });

  it('formation does not compact when members die', () => {
    const s = makeState(1, 1);
    for (let i = 0; i < 60 * 6; i++) tick(s);
    const victim = s.enemies[10];
    const dy = victim.pos.y;
    damageEnemy(s, victim, 99, 'bolt');
    compact(s);
    for (let i = 0; i < 60; i++) tick(s);
    const other = s.enemies.find((e) => e.behavior.type === 'formation' && e.behavior.slot.y === 0)!;
    expect(other.pos.y).toBeLessThan(dy);
    expect(s.enemies).toHaveLength(31);
  });
});

describe('swoop', () => {
  it('members fly curves, then sway starts only after the last one arrived', () => {
    const s = makeState(1, 7);
    let allArrivedAt = -1;
    for (let i = 0; i < 60 * 25; i++) {
      tick(s);
      const g = s.waveRt.groups[0];
      const flying = s.enemies.some((e) => e.behavior.type === 'enter_path');
      if (g.started && (flying || !g.doneSpawning)) expect(g.anchor.x).toBe(640);
      if (allArrivedAt < 0 && g.doneSpawning && !flying) allArrivedAt = s.waveRt.elapsed;
    }
    expect(allArrivedAt).toBeGreaterThan(5);
    expect(s.enemies.every((e) => e.behavior.type === 'formation')).toBe(true);
    expect(s.waveRt.groups[0].anchor.x).not.toBe(640);
  });
});

describe('ring', () => {
  it('radius starts at 900 and settles to r; members keep their spacing', () => {
    const s = makeState(1, 5);
    for (let i = 0; i < 49; i++) tick(s); // just after the 0.8 s start
    expect(s.enemies.every((e) => !e.canDropEggs)).toBe(true);
    const first = s.enemies[0];
    const g = s.waveRt.groups[0];
    const r0 = Math.hypot(first.pos.x - g.anchor.x, first.pos.y - g.anchor.y);
    expect(r0).toBeGreaterThan(300);
    for (let i = 0; i < 60 * 6; i++) tick(s);
    expect(s.enemies.some((e) => e.canDropEggs)).toBe(true);
    const inner = s.enemies.filter((e) => e.behavior.type === 'ring' && e.behavior.ring === 0);
    for (const e of inner) {
      const r = Math.hypot(e.pos.x - g.anchor.x, e.pos.y - g.anchor.y);
      expect(Math.abs(r - 100)).toBeLessThanOrEqual(20.001);
    }
  });
});

describe('divers', () => {
  it('dives at the player, returns from above and rejoins the formation', () => {
    const s = makeState(1, 8);
    const seen = new Set<string>();
    let maxY = 0;
    for (let i = 0; i < 60 * 14; i++) {
      tick(s);
      for (const e of s.enemies) {
        seen.add(e.behavior.type);
        if (e.behavior.type === 'dive') maxY = Math.max(maxY, e.pos.y);
      }
    }
    expect(seen.has('dive')).toBe(true);
    expect(seen.has('return')).toBe(true);
    expect(maxY).toBeGreaterThan(500);
    expect(s.enemies).toHaveLength(24);
  });

  it('dive egg rate is 3x (conditions: canDropEggs while diving)', () => {
    const s = makeState(1, 8);
    for (let i = 0; i < 60 * 8; i++) {
      tick(s);
      for (const e of s.enemies) if (e.behavior.type === 'dive') expect(e.canDropEggs).toBe(true);
    }
  });
});

describe('bouncers', () => {
  it('spawns the exact kind counts and keeps them inside the box', () => {
    const s = makeState(2, 9); // 8 R + 8 B
    for (let i = 0; i < 60 * 20; i++) {
      tick(s);
      for (const e of s.enemies) {
        if (e.behavior.type === 'bounce' && !e.behavior.entering) {
          expect(e.pos.x).toBeGreaterThanOrEqual(30 - 0.001);
          expect(e.pos.x).toBeLessThanOrEqual(1250 + 0.001);
          expect(e.pos.y).toBeGreaterThanOrEqual(80 - 0.001);
          expect(e.pos.y).toBeLessThanOrEqual(470 + 0.001);
          expect(Math.abs(e.rotation)).toBeLessThanOrEqual(0.15 + 1e-9);
        }
      }
    }
    expect(s.enemies.filter((e) => e.kind === 'chicken_red')).toHaveLength(8);
    expect(s.enemies.filter((e) => e.kind === 'chicken_basic')).toHaveLength(8);
  });
});

describe('ufo', () => {
  it('patrols its lane, ping-pongs between 80 and 1200 and fires aimed enemy_shots', () => {
    const s = makeState(3, 4); // 6 UFOs
    s.player.pos.x = 640;
    s.player.pos.y = 600;
    let shots = 0;
    for (let i = 0; i < 60 * 20; i++) {
      s.events.length = 0;
      tick(s);
      shots += s.events.filter((e) => e.type === 'enemy_shot').length;
      for (const e of s.enemies) {
        if (e.behavior.type === 'lane') {
          expect(e.pos.x).toBeGreaterThanOrEqual(-61);
          expect(e.pos.x).toBeLessThanOrEqual(1341);
          expect(Math.abs(e.pos.y - e.behavior.laneY)).toBeLessThan(1);
        }
      }
    }
    expect(shots).toBeGreaterThan(6);
    const aimed = s.projectiles.filter((p) => p.kind === 'enemy_shot');
    expect(aimed.length).toBeGreaterThan(0);
    for (const p of aimed) expect(p.vel.y).toBeGreaterThan(0);
  });

  it('does not shoot when the player is dead', () => {
    const s = makeState(3, 4);
    s.player.alive = false;
    for (let i = 0; i < 60 * 15; i++) tick(s);
    expect(s.projectiles.filter((p) => p.kind === 'enemy_shot')).toHaveLength(0);
  });
});

describe('swarm', () => {
  it('follows a leader and sends ceil(10%) chicks kamikaze every 6 s, then they reappear', () => {
    const s = makeState(2, 3); // 36 chicks
    let sawKami = 0;
    let reappeared = false;
    const kami = new Set<number>();
    for (let i = 0; i < 60 * 25; i++) {
      tick(s);
      for (const e of s.enemies) {
        if (e.behavior.type !== 'swarm') continue;
        if (e.behavior.mode === 'kamikaze') {
          kami.add(e.id);
          sawKami = Math.max(sawKami, s.enemies.filter((x) => x.behavior.type === 'swarm' && x.behavior.mode === 'kamikaze').length);
        } else if (kami.has(e.id) && e.pos.y < 0) reappeared = true;
      }
    }
    expect(sawKami).toBeGreaterThanOrEqual(1);
    expect(sawKami).toBeLessThanOrEqual(4);
    expect(reappeared).toBe(true);
    expect(s.enemies).toHaveLength(36);
  });
});

describe('streams', () => {
  it('reverse at the screen edge and step down 70 px, resetting past 380', () => {
    const s = makeState(1, 2);
    for (let i = 0; i < 60 * 30; i++) tick(s);
    const dirs = new Set(s.enemies.map((e) => (e.behavior.type === 'stream' ? e.behavior.dir : 0)));
    expect(dirs.has(1)).toBe(true);
    expect(dirs.has(-1)).toBe(true);
    for (const e of s.enemies) {
      if (e.behavior.type === 'stream') expect(e.behavior.baseY).toBeLessThanOrEqual(380);
    }
  });
});
