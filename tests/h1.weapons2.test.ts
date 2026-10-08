// tests/h1.weapons2.test.ts — OWNER: H1. The six HENPOCALYPSE weapons, drones, crits, rapid and overdrive.
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import type { GameEvent } from '../src/sim/events';
import type { GameState, WeaponId } from '../src/sim/types';
import { WEAPON_IDS } from '../src/sim/types';
import { recomputeMods } from '../src/sim/mods';
import { hitMultiplier } from '../src/sim/weapons2';
import { ARC, LASER, NEUTRON, PULSE, WEAPON_HEAT } from '../src/sim/tuning/weapons';
import { FLAK, FLAME, HOMING, PRISM, RAIL, SICKLE } from '../src/sim/tuning/weapons2';
import { OVERDRIVE_DAMAGE_MUL, OVERDRIVE_FIRE_MUL, RAPID_FIRE_MUL, RAPID_HEAT_MUL } from '../src/sim/tuning/loadout';
import { DT } from '../src/sim/tuning/core';
import { addEnemy, boltsOf, eventsOf, input, newState, tick } from './a2.helpers';

/** A god-mode state with `weapon` at `power` and the gun ready to fire. */
function armed(weapon: WeaponId, power: number): GameState {
  const s = newState({ god: true });
  s.player.weapon = weapon;
  s.player.power = power;
  s.player.fireCooldown = 0;
  return s;
}

const fireOnce = (s: GameState): void => tick(s, input({ fire: true }), 1);

/** Counts events of one type over `ticks` steps (step() clears events every tick). */
function countEvents(s: GameState, type: GameEvent['type'], ticks: number, inp = input()): number {
  let n = 0;
  for (let i = 0; i < ticks; i++) {
    tick(s, inp, 1);
    n += s.events.filter((e) => e.type === type).length;
  }
  return n;
}

/** Projectile count per volley from the tables, at each power level. Arc with no target fires one fallback bolt. */
const VOLLEY_BOLTS: Record<WeaponId, (lvl: number) => number> = {
  pulse: (l) => PULSE.levels[l].bolts,
  neutron: (l) => NEUTRON.levels[l].bolts,
  laser: (l) => LASER.levels[l].bolts,
  arc: () => 1,
  flak: (l) => FLAK.pellets[l],
  flame: (l) => FLAME.flames[l],
  sickle: (l) => SICKLE.blades[l],
  homing: (l) => HOMING.seekers[l],
  rail: () => 0,
  prism: (l) => PRISM.crystals[l],
};

describe('H1 weapons: tables and firing', () => {
  it('every weapon fires at every power level with the table projectile count', () => {
    for (const w of WEAPON_IDS) {
      for (let lvl = 0; lvl <= 10; lvl++) {
        const s = armed(w, lvl);
        fireOnce(s);
        expect(boltsOf(s).length, `${w} power ${lvl}`).toBe(VOLLEY_BOLTS[w](lvl));
        expect(eventsOf(s, 'player_fire').length).toBe(1);
      }
    }
  });

  it('every per-level table has 11 entries', () => {
    for (const t of [FLAK.pellets, FLAK.damage, FLAME.flames, FLAME.damage, SICKLE.blades, SICKLE.damage,
      HOMING.seekers, HOMING.damage, RAIL.width, RAIL.damage, PRISM.crystals, PRISM.damage, PRISM.shards]) {
      expect(t.length).toBe(11);
    }
  });

  it('rail damages every enemy touching the column once and skips invulnerable ones', () => {
    const s = armed('rail', 0);
    const near = addEnemy(s, { pos: { x: 640, y: 300 }, radius: 20, hp: 100, maxHp: 100 });
    const ghost = addEnemy(s, { pos: { x: 640, y: 200 }, radius: 20, hp: 100, maxHp: 100, invulnerable: true });
    const side = addEnemy(s, { pos: { x: 800, y: 300 }, radius: 20, hp: 100, maxHp: 100 });
    fireOnce(s);
    expect(near.hp).toBe(100 - RAIL.damage[0]);
    expect(ghost.hp).toBe(100);
    expect(side.hp).toBe(100);
    expect(eventsOf(s, 'rail').length).toBe(1);
    expect(s.chapterStats.shotsHit).toBe(1);
  });

  it('extra rail lances sit beside the nose and still hit an enemy only once', () => {
    const s = armed('rail', 0);
    s.mods = { ...s.mods, extraBolts: 1 };
    const e = addEnemy(s, { pos: { x: 664, y: 300 }, radius: 10, hp: 100, maxHp: 100 });
    fireOnce(s);
    expect(eventsOf(s, 'rail').length).toBe(2);
    expect(e.hp).toBe(100 - RAIL.damage[0]);
  });

  it('prism splits once on its first hit and shards never split', () => {
    const s = armed('prism', 0);
    addEnemy(s, { pos: { x: 640, y: 300 }, radius: 22, hp: 1000, maxHp: 1000 });
    fireOnce(s);
    tick(s, input(), 25);
    const shards = s.projectiles.filter((p) => p.alive && p.kind === 'bolt' && p.weapon === 'prism' && p.fuse === 1);
    expect(shards.length).toBe(PRISM.shards[0]);
    tick(s, input(), 25);
    const later = s.projectiles.filter((p) => p.alive && p.kind === 'bolt' && p.weapon === 'prism');
    expect(later.length).toBeLessThanOrEqual(PRISM.shards[0]);
    expect(later.every((p) => p.fuse === 1)).toBe(true);
  });

  it('sky sickle hits on the way up and again on the way back down', () => {
    const s = armed('sickle', 0);
    const e = addEnemy(s, { pos: { x: 640, y: 300 }, radius: 14, hp: 1000, maxHp: 1000 });
    fireOnce(s);
    tick(s, input(), 100);
    expect(1000 - e.hp).toBe(2 * SICKLE.damage[0]);
  });

  it('flak pellets die within about 380 px of the nose', () => {
    const s = armed('flak', 10);
    fireOnce(s);
    const nose = { x: 640, y: 574 };
    let maxD = 0;
    for (let i = 0; i < 40; i++) {
      tick(s, input(), 1);
      for (const b of boltsOf(s)) maxD = Math.max(maxD, Math.hypot(b.pos.x - nose.x, b.pos.y - nose.y));
    }
    expect(boltsOf(s).length).toBe(0);
    expect(maxD).toBeLessThanOrEqual(390); // 990 px/s × 0.38 s at the fastest pellet; 900 px/s base ≈ 342 px
  });

  it('crit chance 1 doubles a bolt hit', () => {
    const s = armed('pulse', 0);
    s.mods = { ...s.mods, critChance: 1 };
    const e = addEnemy(s, { pos: { x: 640, y: 300 }, radius: 22, hp: 100, maxHp: 100 });
    fireOnce(s);
    expect(countEvents(s, 'crit', 30)).toBe(1);
    expect(100 - e.hp).toBe(2 * PULSE.levels[0].damage);
  });

  it('hitMultiplier applies the boss bonus and never rolls without crit chance', () => {
    const s = armed('pulse', 0);
    s.mods = { ...s.mods, bossDamageMul: 1.5 };
    const boss = { pos: { x: 0, y: 0 }, isBoss: true } as never;
    const plain = { pos: { x: 0, y: 0 }, isBoss: false } as never;
    expect(hitMultiplier(s, boss)).toBeCloseTo(1.5);
    expect(hitMultiplier(s, plain)).toBe(1);
  });
});

describe('H1 drones', () => {
  it('each drone fires one extra bolt per ship volley', () => {
    const s = armed('pulse', 0);
    s.perks = { wingman: 2 };
    recomputeMods(s);
    fireOnce(s);
    expect(boltsOf(s).length).toBe(PULSE.levels[0].bolts + 2);
    expect(eventsOf(s, 'drone_fire').length).toBe(1);
  });

  it('overdrive fires two phantom drones without the drones power-up', () => {
    const s = armed('pulse', 0);
    s.player.overdrive = 5;
    fireOnce(s);
    expect(boltsOf(s).length).toBe(PULSE.levels[0].bolts + 2);
    expect(eventsOf(s, 'drone_fire').length).toBe(1);
  });

  it('drone volleys are capped at 8 per second', () => {
    const s = armed('pulse', 0);
    s.perks = { wingman: 2 };
    recomputeMods(s);
    s.player.powerups.rapid = 10;
    const volleys = countEvents(s, 'drone_fire', 60, input({ fire: true }));
    expect(volleys).toBeLessThanOrEqual(8);
    expect(volleys).toBeGreaterThanOrEqual(6);
  });
});

describe('H1 rapid and overdrive', () => {
  it('rapid power-up multiplies fire rate and heat gain', () => {
    const base = armed('pulse', 0);
    fireOnce(base);
    const rapid = armed('pulse', 0);
    rapid.player.powerups.rapid = 10;
    fireOnce(rapid);
    expect(rapid.player.fireCooldown).toBeCloseTo(1 / (PULSE.rate * RAPID_FIRE_MUL) - DT, 6);
    expect(rapid.player.heat / base.player.heat).toBeCloseTo(RAPID_HEAT_MUL, 6);
  });

  it('overdrive: no heat, +25% damage, +1 pierce, faster fire', () => {
    const s = armed('pulse', 0);
    s.player.overdrive = 5;
    fireOnce(s);
    const b = boltsOf(s)[0];
    expect(s.player.heat).toBe(0);
    expect(b.damage).toBeCloseTo(PULSE.levels[0].damage * OVERDRIVE_DAMAGE_MUL, 6);
    expect(b.pierceLeft).toBe(PULSE.pierce + 1);
    expect(s.player.fireCooldown).toBeCloseTo(1 / (PULSE.rate * OVERDRIVE_FIRE_MUL) - DT, 6);
  });

  it('heat is gained at the base rate outside overdrive', () => {
    const s = armed('pulse', 0);
    fireOnce(s);
    expect(s.player.heat).toBeCloseTo(WEAPON_HEAT.pulse, 6);
  });

  it('arc hits a target and reports a shot hit', () => {
    const s = armed('arc', 0);
    addEnemy(s, { pos: { x: 640, y: 300 }, radius: 22, hp: 50, maxHp: 50 });
    fireOnce(s);
    expect(eventsOf(s, 'arc').length).toBe(1);
    expect(s.chapterStats.shotsHit).toBe(1);
    expect(ARC.levels[0].targets).toBe(1);
  });
});
