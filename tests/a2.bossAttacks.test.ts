// tests/a2.bossAttacks.test.ts — OWNER: A2. What each boss attack actually spawns (§7.13).
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import type { Enemy, GameState, Hazard } from '../src/sim/types';
import type { BossId } from '../src/sim/bosses.types';
import { damageEnemy } from '../src/sim/combat';
import { spawnBoss } from '../src/sim/bosses';
import { eventsOf, input, newState, tick } from './a2.helpers';

interface Shot { kind: string; vx: number; vy: number; x: number; y: number; tick: number; speed: number; angle: number }
type Seen = Map<number, Shot>;

function rtOf(e: Enemy) {
  if (e.behavior.type !== 'boss') throw new Error('not a boss');
  return e.behavior.rt;
}

function start(id: BossId, o: { chapter?: number; difficulty?: 'easy' | 'normal' | 'hard' } = {}): { s: GameState; boss: Enemy } {
  const s = newState({ ...o, god: true });
  spawnBoss(s, id);
  const boss = s.enemies.filter((e) => e.isBoss)[0];
  while (rtOf(boss).entering) tick(s);
  return { s, boss };
}

function setPhase(s: GameState, boss: Enemy, frac: number): void {
  damageEnemy(s, boss, boss.hp - Math.floor(boss.maxHp * frac), 'bolt');
  boss.invulnerable = false;
  rtOf(boss).data.invuln = 0;
  rtOf(boss).attack = 'idle';
  rtOf(boss).cooldown = 0.5;
}

function observe(s: GameState, seen: Seen, idFloor: number): void {
  for (const p of s.projectiles) {
    if (!p.alive || p.owner !== 'enemy' || p.id < idFloor || seen.has(p.id)) continue;
    const speed = Math.hypot(p.vel.x, p.vel.y);
    seen.set(p.id, { kind: p.kind, vx: p.vel.x, vy: p.vel.y, x: p.pos.x, y: p.pos.y, tick: s.tick, speed, angle: Math.atan2(p.vel.y, p.vel.x) });
  }
}

/** Ticks until the boss starts `name`, then until that attack finishes; records every enemy projectile seen. */
function runAttack(s: GameState, boss: Enemy, name: string, each?: () => void): Seen {
  const rt = rtOf(boss);
  const seen: Seen = new Map();
  let guard = 0;
  let floor = s.nextId;
  while (!(rt.attack === name && rt.attackT === 0)) {
    floor = s.nextId;                       // ids created from the starting tick on belong to this attack
    tick(s);
    if (++guard > 6000) throw new Error('attack never started: ' + name);
  }
  observe(s, seen, floor);
  each?.();
  while (rt.attack === name) {
    tick(s);
    if (rt.attack === name) { observe(s, seen, floor); each?.(); }
  }
  return seen;
}

const ofKind = (seen: Seen, kind: string): Shot[] => [...seen.values()].filter((p) => p.kind === kind);
const degOf = (r: number): number => ((r * 180) / Math.PI + 360) % 360;
const minions = (s: GameState, pred: (e: Enemy) => boolean): Enemy[] => s.enemies.filter((e) => e.alive && !e.isBoss && pred(e));

describe('Mother Hen', () => {
  it('runs egg_fan -> egg_rain and, from phase 1, brood, with the listed gaps', () => {
    const { s, boss } = start('hen');
    const rt = rtOf(boss);
    const order: string[] = [];
    const gaps: number[] = [];
    let idleSince = -1;
    for (let i = 0; i < 60 * 40; i++) {
      const before = rt.attack;
      tick(s);
      if (before !== 'idle' && rt.attack === 'idle') idleSince = s.time;
      for (const ev of eventsOf(s, 'boss_attack')) {
        order.push(ev.attack);
        if (idleSince >= 0) gaps.push(s.time - idleSince);
      }
    }
    expect(order.slice(0, 5)).toEqual(['egg_fan', 'egg_rain', 'egg_fan', 'egg_rain', 'egg_fan']);
    for (const g of gaps) expect(g).toBeGreaterThanOrEqual(1.4 - 1 / 60);
    const p1 = start('hen');
    setPhase(p1.s, p1.boss, 0.49);
    const names: string[] = [];
    for (let i = 0; i < 60 * 40; i++) {
      tick(p1.s);
      for (const ev of eventsOf(p1.s, 'boss_attack')) names.push(ev.attack);
    }
    expect(names.slice(0, 4)).toEqual(['egg_fan', 'egg_rain', 'brood', 'egg_fan']);
  });

  it.each([[0, 7], [0.49, 9]] as const)('egg_fan at %s HP: 3 volleys of %i boss eggs, 60-120 deg, speed 240', (frac, count) => {
    const { s, boss } = start('hen');
    if (frac < 1 && frac > 0) setPhase(s, boss, frac);
    const seen = runAttack(s, boss, 'egg_fan');
    const eggs = ofKind(seen, 'boss_egg');
    expect(eggs).toHaveLength(3 * count);
    const ticks = [...new Set(eggs.map((e) => e.tick))];
    expect(ticks).toHaveLength(3);
    expect((ticks[1] - ticks[0]) / 60).toBeCloseTo(0.45, 1);
    const first = eggs.filter((e) => e.tick === ticks[0]).map((e) => degOf(e.angle)).sort((a, b) => a - b);
    expect(first[0]).toBeCloseTo(60, 4);
    expect(first[first.length - 1]).toBeCloseTo(120, 4);
    for (const e of eggs) expect(e.speed).toBeCloseTo(240, 4);
  });

  it('boss shots scale with difficulty.shotSpeed', () => {
    const { s, boss } = start('hen', { difficulty: 'hard' });
    const seen = runAttack(s, boss, 'egg_fan');
    for (const e of ofKind(seen, 'boss_egg')) expect(e.speed).toBeCloseTo(240 * 1.15, 4);
  });

  it('egg_rain: 2.5 s of gravity eggs at 7/s (10/s in phase 1) under the boss, with egg_dropped events', () => {
    for (const [frac, rate] of [[0, 7], [0.49, 10]] as const) {
      const { s, boss } = start('hen');
      if (frac > 0) setPhase(s, boss, frac);
      let dropped = 0;
      const seen = runAttack(s, boss, 'egg_rain', () => { dropped += eventsOf(s, 'egg_dropped').length; });
      const eggs = ofKind(seen, 'egg');
      expect(Math.abs(eggs.length - rate * 2.5)).toBeLessThanOrEqual(1.5);
      expect(dropped).toBe(eggs.length);
      for (const e of eggs) expect(e.y).toBeGreaterThan(boss.pos.y);
    }
  });

  it('brood: 5 seeking chicks, none while 8 are alive', () => {
    const { s, boss } = start('hen');
    setPhase(s, boss, 0.49);
    runAttack(s, boss, 'brood');
    const chicks = minions(s, (e) => e.kind === 'chick');
    expect(chicks).toHaveLength(5);
    for (const c of chicks) {
      expect(c.behavior).toEqual({ type: 'seek', speed: 260, turnRate: 2.5, heading: Math.PI / 2 });
    }
    runAttack(s, boss, 'brood'); // 10 would exceed the cap: the first brood is 5 (< 8) so a second is allowed
    expect(minions(s, (e) => e.kind === 'chick')).toHaveLength(10);
    runAttack(s, boss, 'brood'); // already >= 8 alive: skipped
    expect(minions(s, (e) => e.kind === 'chick')).toHaveLength(10);
  });

  it('flaps its wings at 6 fps and patrols x = 640 + 380 sin(2 pi t / 7)', () => {
    const { s, boss } = start('hen');
    const t0 = rtOf(boss).t;
    const xs: number[] = [];
    const anims = new Set<number>();
    for (let i = 0; i < 60 * 7; i++) {
      tick(s);
      xs.push(boss.pos.x);
      anims.add(boss.anim);
    }
    expect(anims).toEqual(new Set([0, 1]));
    expect(Math.max(...xs)).toBeGreaterThan(640 + 375);
    expect(Math.min(...xs)).toBeLessThan(640 - 375);
    expect(rtOf(boss).t).toBeGreaterThan(t0);
    expect(boss.pos.x - 640).toBeCloseTo(380 * Math.sin(2 * Math.PI * (7 * 60) / 60 / 7), 0);
  });
});

describe('Egg Carrier', () => {
  it('turret_burst: 5 bursts of 2 aimed shots from x +/- 75, speed 320', () => {
    const { s, boss } = start('carrier');
    s.player.pos.x = 300;
    s.player.pos.y = 600;
    const seen = runAttack(s, boss, 'turret_burst');
    const shots = ofKind(seen, 'enemy_shot');
    expect(shots).toHaveLength(10);
    for (const sh of shots) {
      expect(sh.speed).toBeCloseTo(320, 4);
      expect(sh.vx).toBeLessThan(0);   // player is far left
      expect(sh.vy).toBeGreaterThan(0);
    }
    const t0 = shots[0].tick;
    expect((shots.filter((x) => x.tick > t0)[0].tick - t0) / 60).toBeCloseTo(0.35, 1);
    const xs = shots.filter((x) => x.tick === t0).map((x) => x.x - boss.pos.x);
    expect(Math.abs(Math.max(...xs) - Math.min(...xs))).toBeGreaterThan(140);
  });

  it('hatch: telegraph hazard + event, then 5 stream chickens; skipped with 10 hatchlings alive', () => {
    const { s, boss } = start('carrier');
    let telegraphs = 0;
    let hazard: Hazard | undefined;
    runAttack(s, boss, 'hatch', () => {
      telegraphs += eventsOf(s, 'telegraph').length;
      hazard = hazard ?? s.hazards.find((h) => h.ownerId === boss.id && h.kind === 'telegraph');
    });
    expect(telegraphs).toBe(1);
    expect(hazard).toMatchObject({ kind: 'telegraph', lethal: false });
    const kids = minions(s, (e) => e.kind === 'chicken_basic');
    expect(kids).toHaveLength(5);
    expect(kids.map((k) => (k.behavior as { dir: number }).dir)).toEqual([1, -1, 1, -1, 1]);
    expect(kids[0].behavior).toMatchObject({ type: 'stream', speed: 220, baseY: 260, amp: 50, freq: 0.012 });
    runAttack(s, boss, 'hatch');
    expect(minions(s, (e) => e.kind === 'chicken_basic')).toHaveLength(10);
    runAttack(s, boss, 'hatch');
    expect(minions(s, (e) => e.kind === 'chicken_basic')).toHaveLength(10);
  });

  it('spiral: 36 shots over 3 s from 90 deg in 17 deg steps; two arms from phase 2', () => {
    const { s, boss } = start('carrier');
    const seen = runAttack(s, boss, 'spiral');
    const shots = ofKind(seen, 'enemy_shot').sort((a, b) => a.tick - b.tick);
    expect(shots).toHaveLength(36);
    expect(degOf(shots[0].angle)).toBeCloseTo(90, 3);
    expect(degOf(shots[1].angle)).toBeCloseTo(107, 3);
    for (const sh of shots) expect(sh.speed).toBeCloseTo(210, 4);
    const p2 = start('carrier');
    setPhase(p2.s, p2.boss, 0.3);
    const seen2 = runAttack(p2.s, p2.boss, 'spiral');
    const shots2 = ofKind(seen2, 'enemy_shot').sort((a, b) => a.tick - b.tick);
    expect(shots2).toHaveLength(72);
    expect(degOf(shots2[1].angle)).toBeCloseTo(270, 3);
    expect(shots2[0].speed).toBeCloseTo(210 * 1.1 * 1.1, 4);
  });

  it('follows the player at 90 px/s (140 from phase 1) inside [220, 1060]', () => {
    const { s, boss } = start('carrier');
    s.player.pos.x = 1240;
    const x0 = boss.pos.x;
    tick(s, input(), 60);
    expect(boss.pos.x - x0).toBeCloseTo(90, 3);
    setPhase(s, boss, 0.6);
    const x1 = boss.pos.x;
    tick(s, input(), 60);
    expect(boss.pos.x - x1).toBeCloseTo(140, 3);
    tick(s, input(), 60 * 10);
    expect(boss.pos.x).toBe(1060);
    s.player.pos.x = 36;
    tick(s, input(), 60 * 10);
    expect(boss.pos.x).toBe(220);
  });

  it('phases multiply gaps by 0.8 and anim shows the crack stage', () => {
    const { s, boss } = start('carrier');
    setPhase(s, boss, 0.6);
    expect(boss.anim).toBe(1);
    const rt = rtOf(boss);
    runAttack(s, boss, 'turret_burst');
    expect(rt.cooldown).toBeCloseTo(1.2 * 0.8, 6);
  });
});

describe('Rooster Commander', () => {
  it('dive: telegraphs the player column, slides, plunges to y=560, and returns to the figure-8', () => {
    const { s, boss } = start('rooster');
    s.player.pos.x = 900;
    s.player.pos.y = 600;
    const rt = rtOf(boss);
    let tele: Hazard | undefined;
    let minY = 0;
    let maxY = 0;
    runAttack(s, boss, 'dive', () => {
      tele = tele ?? s.hazards.find((h) => h.ownerId === boss.id && h.kind === 'telegraph');
      maxY = Math.max(maxY, boss.pos.y);
      minY = rt.attackT >= 0.5 && rt.attackT <= 0.7 ? Math.abs(boss.pos.x - 900) : minY;
    });
    expect(tele).toMatchObject({ kind: 'telegraph', lethal: false, width: 120, a: { x: 900 }, b: { x: 900, y: 720 } });
    expect(tele?.ttl).toBeLessThanOrEqual(1.2);
    expect(maxY).toBeGreaterThan(555);
    expect(maxY).toBeLessThanOrEqual(560.0001);
    expect(minY).toBeLessThan(1);
    tick(s, input(), 5);
    expect(boss.pos.y).toBeLessThan(260);
    expect(boss.anim).toBe(0);
  });

  it('laser_sweep: 0.8 s thin telegraph, then a lethal 26-wide 800-long beam sweeping 60-120 deg, alternating', () => {
    const { s, boss } = start('rooster');
    const rt = rtOf(boss);
    const run = (): { tele: Hazard | undefined; angles: number[]; beam: Hazard | undefined; stillX: boolean } => {
      let tele: Hazard | undefined;
      let beam: Hazard | undefined;
      const angles: number[] = [];
      const x0 = { v: -1 };
      let moved = false;
      runAttack(s, boss, 'laser_sweep', () => {
        if (x0.v < 0) x0.v = boss.pos.x;
        if (Math.abs(boss.pos.x - x0.v) > 1e-9) moved = true;
        tele = tele ?? s.hazards.find((h) => h.ownerId === boss.id && h.kind === 'telegraph');
        const b = s.hazards.find((h) => h.ownerId === boss.id && h.kind === 'beam' && h.alive);
        if (b) {
          beam = b;
          angles.push(degOf(Math.atan2(b.b.y - b.a.y, b.b.x - b.a.x)));
          expect(Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y)).toBeCloseTo(800, 3);
          expect(b.a.y).toBeCloseTo(boss.pos.y + 50, 6);
        }
        expect(boss.anim).toBe(1);
      });
      return { tele, angles, beam, stillX: !moved };
    };
    const a = run();
    expect(a.tele).toMatchObject({ kind: 'telegraph', width: 6, lethal: false });
    expect(a.beam).toMatchObject({ kind: 'beam', width: 26, lethal: true });
    expect(a.angles[0]).toBeCloseTo(60, 0);
    expect(a.angles[a.angles.length - 1]).toBeGreaterThan(118);
    expect(a.stillX).toBe(true);
    expect(s.hazards.filter((h) => h.alive && h.kind === 'beam')).toHaveLength(0);
    expect(rt.attack).toBe('idle');
    const b = run();
    expect(b.angles[0]).toBeCloseTo(120, 0);
    expect(b.angles[b.angles.length - 1]).toBeLessThan(62);
  });

  it('feather_ring: 3 rings of 16 knives 0.5 s apart, rotated 11 deg per ring (22 knives in phase 1)', () => {
    for (const [frac, n] of [[0, 16], [0.39, 22]] as const) {
      const { s, boss } = start('rooster');
      if (frac > 0) setPhase(s, boss, frac);
      const seen = runAttack(s, boss, 'feather_ring');
      const knives = ofKind(seen, 'feather_knife');
      expect(knives).toHaveLength(3 * n);
      const ticks = [...new Set(knives.map((k) => k.tick))].sort((a, b) => a - b);
      expect(ticks).toHaveLength(3);
      expect((ticks[1] - ticks[0]) / 60).toBeCloseTo(0.5, 1);
      for (const k of knives) expect(k.speed).toBeCloseTo(190, 4);
      const ring = (t: number): number[] => knives.filter((k) => k.tick === t).map((k) => degOf(k.angle)).sort((a, b) => a - b);
      const r0 = ring(ticks[0]);
      const r1 = ring(ticks[1]);
      expect(r0[0]).toBeCloseTo(0, 3);
      expect(r1[0]).toBeCloseTo(11, 3);
      expect(r0[1] - r0[0]).toBeCloseTo(360 / n, 3);
    }
  });

  it('phase 1 (40%) spawns two lane UFOs from opposite sides, once', () => {
    const { s, boss } = start('rooster');
    setPhase(s, boss, 0.39);
    const ufos = minions(s, (e) => e.kind === 'chicken_ufo');
    expect(ufos).toHaveLength(2);
    expect(ufos.map((u) => u.behavior)).toEqual([
      { type: 'lane', laneY: 300, speed: 180, dir: 1, shotTimer: 2 },
      { type: 'lane', laneY: 360, speed: 180, dir: -1, shotTimer: 2 },
    ]);
    expect(ufos[0].pos.x).toBeLessThan(0);
    expect(ufos[1].pos.x).toBeGreaterThan(1280);
    damageEnemy(s, boss, 10, 'bolt');
    expect(minions(s, (e) => e.kind === 'chicken_ufo')).toHaveLength(2);
  });
});

describe('Coop Dreadnought', () => {
  it('phase 0 is the Carrier set with 4 turrets and a two-arm spiral', () => {
    const { s, boss } = start('dreadnought');
    const burst = runAttack(s, boss, 'turret_burst');
    expect(ofKind(burst, 'enemy_shot')).toHaveLength(20);
    const sp = runAttack(s, boss, 'spiral');
    expect(ofKind(sp, 'enemy_shot')).toHaveLength(72);
  });

  it('phase 1 is the Mother Hen set: fan of 11, rain 10/s, brood of 6', () => {
    const { s, boss } = start('dreadnought');
    setPhase(s, boss, 0.6);
    expect(rtOf(boss).phase).toBe(1);
    const fan = runAttack(s, boss, 'egg_fan');
    expect(ofKind(fan, 'boss_egg')).toHaveLength(33);
    const rain = runAttack(s, boss, 'egg_rain');
    expect(Math.abs(ofKind(rain, 'egg').length - 25)).toBeLessThanOrEqual(1.5);
    runAttack(s, boss, 'brood');
    expect(minions(s, (e) => e.kind === 'chick')).toHaveLength(6);
  });

  it('phase 2 is the Rooster set: two mirrored beams, 24 knives, never a dive', () => {
    const { s, boss } = start('dreadnought');
    setPhase(s, boss, 0.6);
    setPhase(s, boss, 0.3);
    expect(rtOf(boss).phase).toBe(2);
    const names: string[] = [];
    let maxBeams = 0;
    let mirrored = false;
    for (let i = 0; i < 60 * 40; i++) {
      tick(s);
      for (const ev of eventsOf(s, 'boss_attack')) names.push(ev.attack);
      const beams = s.hazards.filter((h) => h.alive && h.kind === 'beam');
      maxBeams = Math.max(maxBeams, beams.length);
      if (beams.length === 2) {
        const a = Math.atan2(beams[0].b.y - beams[0].a.y, beams[0].b.x - beams[0].a.x);
        const b = Math.atan2(beams[1].b.y - beams[1].a.y, beams[1].b.x - beams[1].a.x);
        mirrored = mirrored || Math.abs(a + b - Math.PI) < 1e-6;
      }
    }
    expect(maxBeams).toBe(2);
    expect(mirrored).toBe(true);
    expect(new Set(names)).toEqual(new Set(['laser_sweep', 'feather_ring']));
    const ring = runAttack(s, boss, 'feather_ring');
    expect(ofKind(ring, 'feather_knife')).toHaveLength(72);
  });
});
