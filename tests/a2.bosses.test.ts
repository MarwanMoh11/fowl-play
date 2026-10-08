// tests/a2.bosses.test.ts — OWNER: A2. Boss spawn, HP, entry, phases, twins, death, long fights (§7.13).
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import type { Difficulty, Enemy, GameState } from '../src/sim/types';
import type { BossId } from '../src/sim/bosses.types';
import { BOSS_INFO } from '../src/shared/contracts';
import { damageEnemy } from '../src/sim/combat';
import { spawnBoss } from '../src/sim/bosses';
import { spawnProjectile } from '../src/sim/projectiles';
import { BOSS_DEFS } from '../src/sim/tuning/bosses';
import { addHazard } from './a2.bossHelpers';
import { checkInvariants, eventsOf, input, newState, tick } from './a2.helpers';

const IDS: BossId[] = ['hen', 'carrier', 'rooster', 'twin_hens', 'dreadnought'];

function spawn(id: BossId, o: { difficulty?: Difficulty; chapter?: number; god?: boolean } = {}): { s: GameState; bosses: Enemy[] } {
  const s = newState(o);
  spawnBoss(s, id);
  return { s, bosses: s.enemies.filter((e) => e.isBoss) };
}

/** Ticks until the entry is finished; returns the first boss. */
function finishEntry(s: GameState): void {
  for (let i = 0; i < 400 && s.enemies.some((e) => e.isBoss && e.behavior.type === 'boss' && e.behavior.rt.entering); i++) tick(s);
}

function rtOf(e: Enemy) {
  if (e.behavior.type !== 'boss') throw new Error('not a boss');
  return e.behavior.rt;
}

describe('spawnBoss', () => {
  it.each(IDS)('%s: HUD fields, flags and base stats', (id) => {
    const { s, bosses } = spawn(id);
    const def = BOSS_DEFS[id];
    expect(bosses).toHaveLength(id === 'twin_hens' ? 2 : 1);
    expect(s.bossName).toBe(BOSS_INFO[id].name);
    expect(s.bossThresholds).toEqual(BOSS_INFO[id].thresholds);
    for (const b of bosses) {
      expect(b).toMatchObject({ isBoss: true, invulnerable: true, canDropEggs: false, points: def.points, radius: def.radius, kind: def.kind });
      expect(b.hp).toBe(b.maxHp);
      expect(b.pos.y).toBe(-200);
      expect(rtOf(b)).toMatchObject({ id, phase: 0, entering: true, attack: 'idle' });
    }
  });

  it('HP = round(base × difficulty.bossHp × (1 + 0.25 × loopIndex))', () => {
    const cases: [BossId, Difficulty, number, number][] = [
      ['hen', 'normal', 1, 900], ['hen', 'easy', 1, 675], ['hen', 'hard', 1, 1260],
      ['hen', 'normal', 6, 1125], ['hen', 'normal', 11, 1350], ['hen', 'hard', 6, 1575],
      ['carrier', 'normal', 2, 1300], ['carrier', 'easy', 7, Math.round(1300 * 0.75 * 1.25)],
      ['rooster', 'hard', 3, Math.round(1700 * 1.4)], ['twin_hens', 'normal', 3, 650],
      ['dreadnought', 'normal', 5, 3600], ['dreadnought', 'hard', 10, Math.round(3600 * 1.4 * 1.25)],
      ['dreadnought', 'normal', 15, 3600 * 1.5],
    ];
    for (const [id, diff, chapter, hp] of cases) {
      const { bosses } = spawn(id, { difficulty: diff, chapter });
      for (const b of bosses) {
        expect(b.maxHp, `${id} ${diff} ch${chapter}`).toBe(hp);
        expect(b.hp).toBe(hp);
      }
    }
  });

  it('twin hens are linked through rt.partner and mirror each other', () => {
    const { bosses } = spawn('twin_hens');
    const [a, b] = bosses;
    expect(rtOf(a).partner).toBe(b.id);
    expect(rtOf(b).partner).toBe(a.id);
    expect(a.pos.x).toBe(400);
    expect(b.pos.x).toBe(880);
    expect(rtOf(b).cooldown - rtOf(a).cooldown).toBeCloseTo(2.0, 6);
  });

  it('tolerates spawnEnemy returning null (enemy cap)', () => {
    const s = newState();
    for (let i = 0; i < 400; i++) s.enemies.push({ ...({} as Enemy), alive: false });
    expect(() => spawnBoss(s, 'hen')).not.toThrow();
    expect(s.enemies.filter((e) => e.isBoss)).toHaveLength(0);
  });
});

describe('entry', () => {
  it.each(IDS)('%s: invulnerable until the entry ends, then at home position', (id) => {
    const { s, bosses } = spawn(id);
    const def = BOSS_DEFS[id];
    const first = bosses[0];
    let lastY = first.pos.y;
    let ticks = 0;
    while (rtOf(first).entering && ticks < 400) {
      expect(first.invulnerable, `tick ${ticks}`).toBe(true);
      if (ticks === 30) {
        const hp = first.hp;
        expect(damageEnemy(s, first, 50, 'bolt')).toBe(false);
        expect(first.hp).toBe(hp);
      }
      tick(s);
      ticks++;
      expect(first.pos.y).toBeGreaterThanOrEqual(lastY);
      lastY = first.pos.y;
    }
    expect(Math.abs(ticks - def.entry * 60)).toBeLessThanOrEqual(1);
    expect(first.invulnerable).toBe(false);
    bosses.forEach((b, i) => {
      expect(b.pos.x).toBeCloseTo(def.homes[i].x, 6);
      expect(b.pos.y).toBeCloseTo(def.homes[i].y, 3);
    });
    expect(damageEnemy(s, first, 5, 'bolt')).toBe(false);
    expect(first.hp).toBe(first.maxHp - 5);
  });

  it('movement starts continuous from the home position (no jump)', () => {
    for (const id of IDS) {
      const { s, bosses } = spawn(id);
      finishEntry(s);
      for (const b of bosses) {
        const x0 = b.pos.x;
        const y0 = b.pos.y;
        tick(s);
        expect(Math.hypot(b.pos.x - x0, b.pos.y - y0), id).toBeLessThan(15);
      }
    }
  });
});

describe('phase thresholds', () => {
  it.each(IDS.filter((i) => i !== 'twin_hens'))('%s: boss_phase fires exactly once per threshold', (id) => {
    const { s, bosses } = spawn(id);
    finishEntry(s);
    const boss = bosses[0];
    const thresholds = BOSS_INFO[id].thresholds;
    const phases: number[] = [];
    const step = Math.max(1, Math.floor(boss.maxHp / 200));
    while (boss.hp - step > 1) {
      s.events.length = 0;
      damageEnemy(s, boss, step, 'bolt');
      for (const ev of eventsOf(s, 'boss_phase')) phases.push(ev.phase);
      boss.invulnerable = false; // dreadnought phase shields are tested separately
    }
    expect(phases).toEqual(thresholds.map((_, i) => i + 1));
    expect(rtOf(boss).phase).toBe(thresholds.length);
  });

  it('phase triggers at the threshold itself, not before', () => {
    const { s, bosses } = spawn('hen');
    finishEntry(s);
    const boss = bosses[0];
    damageEnemy(s, boss, 449, 'bolt'); // 451/900 = 50.1%
    expect(rtOf(boss).phase).toBe(0);
    damageEnemy(s, boss, 1, 'bolt');   // 450/900 = 50%
    expect(rtOf(boss).phase).toBe(1);
    expect(eventsOf(s, 'boss_phase')).toHaveLength(1);
  });

  it('one big hit crossing two thresholds advances through both phases', () => {
    const { s, bosses } = spawn('carrier');
    finishEntry(s);
    s.events.length = 0;
    damageEnemy(s, bosses[0], 900, 'bolt'); // 400/1300 = 30.8%
    expect(eventsOf(s, 'boss_phase').map((e) => e.phase)).toEqual([1, 2]);
    expect(bosses[0].anim).toBe(2);
  });

  it('a killing blow does not fire phases', () => {
    const { s, bosses } = spawn('dreadnought');
    finishEntry(s);
    s.events.length = 0;
    damageEnemy(s, bosses[0], 99999, 'debug');
    expect(eventsOf(s, 'boss_phase')).toHaveLength(0);
    expect(eventsOf(s, 'boss_killed')).toHaveLength(1);
  });
});

describe('twin hens', () => {
  it('when one dies the survivor enters phase 1 once and tightens its gaps by 0.85', () => {
    const { s, bosses } = spawn('twin_hens');
    finishEntry(s);
    const [a, b] = bosses;
    s.events.length = 0;
    damageEnemy(s, a, 99999, 'bolt');
    expect(a.alive).toBe(false);
    expect(eventsOf(s, 'boss_phase')).toHaveLength(1);
    expect(eventsOf(s, 'boss_killed')).toHaveLength(1);
    expect(rtOf(b).phase).toBe(1);
    expect(rtOf(b).data.gapMul).toBe(0.85);
    tick(s, input(), 600);
    expect(rtOf(b).phase).toBe(1);
    expect(rtOf(b).partner).toBe(a.id);
  });

  it('has no thresholds of its own', () => {
    const { s, bosses } = spawn('twin_hens');
    finishEntry(s);
    damageEnemy(s, bosses[0], 600, 'bolt');
    damageEnemy(s, bosses[1], 600, 'bolt');
    expect(eventsOf(s, 'boss_phase')).toHaveLength(0);
  });

  it('the last hen leaves no minions behind', () => {
    const { s, bosses } = spawn('twin_hens');
    finishEntry(s);
    const chick = s.enemies.push({ ...bosses[0], id: 9999, isBoss: false, kind: 'chick', behavior: { type: 'seek', speed: 1, turnRate: 1, heading: 0 } });
    expect(chick).toBeGreaterThan(0);
    damageEnemy(s, bosses[0], 99999, 'bolt');
    expect(s.enemies.find((e) => e.id === 9999)?.alive).toBe(true);
    damageEnemy(s, bosses[1], 99999, 'bolt');
    expect(s.enemies.find((e) => e.id === 9999)?.alive).toBe(false);
  });
});

describe('death', () => {
  it('emits boss_killed, clears enemy projectiles and the boss hazards', () => {
    const { s, bosses } = spawn('rooster');
    finishEntry(s);
    const boss = bosses[0];
    spawnProjectile(s, { kind: 'egg', owner: 'enemy', x: 100, y: 100, vx: 0, vy: 0 });
    spawnProjectile(s, { kind: 'feather_knife', owner: 'enemy', x: 900, y: 500, vx: 0, vy: 0 });
    const player = spawnProjectile(s, { kind: 'bolt', owner: 'player', weapon: 'pulse', x: 600, y: 400, vx: 0, vy: -1 });
    addHazard(s, boss.id);
    addHazard(s, 12345);
    s.events.length = 0;
    damageEnemy(s, boss, 99999, 'bolt');
    expect(eventsOf(s, 'boss_killed')[0]).toMatchObject({ kind: 'boss_rooster', radius: 85 });
    expect(s.projectiles.filter((p) => p.alive && p.owner === 'enemy')).toHaveLength(0);
    expect(player?.alive).toBe(true);
    expect(s.hazards.find((h) => h.ownerId === boss.id)?.alive).toBe(false);
    expect(s.hazards.find((h) => h.ownerId === 12345)?.alive).toBe(true);
    expect(s.score).toBe(20_000);
  });

  it('boss drops come from A1: 12 roasts, 2 power cores and a gift', () => {
    const { s, bosses } = spawn('hen');
    finishEntry(s);
    damageEnemy(s, bosses[0], 99999, 'bolt');
    expect(s.pickups.filter((p) => p.kind === 'roast')).toHaveLength(12);
    expect(s.pickups.filter((p) => p.kind === 'power_core')).toHaveLength(2);
    expect(s.pickups.filter((p) => p.kind.startsWith('gift_'))).toHaveLength(1);
  });
});

describe('dreadnought phase change', () => {
  it('goes invulnerable for 1.5 s, wipes enemy projectiles and hazards, and aborts the attack', () => {
    const { s, bosses } = spawn('dreadnought');
    finishEntry(s);
    tick(s, input(), 60 * 4); // mid-fight, an attack is running
    const boss = bosses[0];
    for (let i = 0; i < 20; i++) spawnProjectile(s, { kind: 'boss_egg', owner: 'enemy', x: 100 + i * 10, y: 400, vx: 0, vy: 1 });
    addHazard(s, boss.id);
    s.events.length = 0;
    damageEnemy(s, boss, Math.ceil(boss.maxHp * 0.35), 'bolt'); // 65% <= 66%
    expect(eventsOf(s, 'boss_phase')).toHaveLength(1);
    expect(rtOf(boss).phase).toBe(1);
    expect(boss.invulnerable).toBe(true);
    expect(s.projectiles.filter((p) => p.alive && p.owner === 'enemy')).toHaveLength(0);
    expect(s.hazards.filter((h) => h.alive)).toHaveLength(0);
    expect(rtOf(boss).attack).toBe('idle');
    const hp = boss.hp;
    expect(damageEnemy(s, boss, 10, 'bolt')).toBe(false);
    expect(boss.hp).toBe(hp);
    tick(s, input(), 85);
    expect(boss.invulnerable).toBe(true);
    tick(s, input(), 8);
    expect(boss.invulnerable).toBe(false);
    expect(boss.anim).toBe(1);
  });
});

describe('long fights', () => {
  it.each(IDS)('%s: 90 s in god mode stays finite, within caps, and cycles every attack', (id) => {
    const { s, bosses } = spawn(id, { god: true });
    const seen = new Set<string>();
    for (let i = 0; i < 90 * 60; i++) {
      const t = i / 60;
      const inp = input({ pointer: { x: 640 + 500 * Math.sin(0.7 * t), y: 560 } });
      tick(s, inp);
      for (const ev of eventsOf(s, 'boss_attack')) seen.add(ev.attack);
      // Wear the boss down to roughly 25% so every threshold is crossed without killing it.
      if (i % 60 === 59 && i < 80 * 60) {
        for (const b of bosses) {
          damageEnemy(s, b, Math.max(1, Math.round(b.maxHp * 0.0095)), 'bolt');
        }
      }
      const bad = checkInvariants(s);
      if (bad) throw new Error(`tick ${i}: ${bad}`);
    }
    expect(bosses.every((b) => b.alive)).toBe(true);
    const expected: Record<BossId, string[]> = {
      hen: ['egg_fan', 'egg_rain', 'brood'],
      carrier: ['turret_burst', 'hatch', 'spiral'],
      rooster: ['dive', 'laser_sweep', 'feather_ring'],
      twin_hens: ['egg_fan', 'egg_rain'],
      dreadnought: ['turret_burst', 'hatch', 'spiral', 'egg_fan', 'egg_rain', 'brood', 'laser_sweep', 'feather_ring'],
    };
    for (const a of expected[id]) expect(seen.has(a), `${id} never ran ${a}`).toBe(true);
    expect(s.enemies.length).toBeLessThanOrEqual(400);
    expect(s.projectiles.length).toBeLessThanOrEqual(1500);
    expect(s.hazards.length).toBeLessThanOrEqual(50);
    expect(JSON.parse(JSON.stringify(s))).toStrictEqual(s); // plain JSON-safe data only
  });

  it('is deterministic: same seed and inputs give the same fight', () => {
    const run = (): string => {
      const { s } = spawn('dreadnought', { god: true });
      for (let i = 0; i < 40 * 60; i++) {
        tick(s, input({ pointer: { x: 640 + 400 * Math.sin(i / 50), y: 560 } }));
        if (i % 90 === 0) for (const e of s.enemies) if (e.isBoss) damageEnemy(s, e, 40, 'bolt');
      }
      return JSON.stringify({ rng: s.rng, tick: s.tick, enemies: s.enemies, projectiles: s.projectiles, hazards: s.hazards });
    };
    expect(run()).toBe(run());
  });
});
