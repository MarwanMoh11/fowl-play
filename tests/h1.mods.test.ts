// tests/h1.mods.test.ts — OWNER: H1. Every state.mods knob that H1 reads (§4.1): damage, rate, heat, pierce, speed, extra
// projectiles, move speed, crit / boss bonus and missile knobs. Modifiers are set directly on state.mods for clarity.
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/sim/enemies', async () => (await import('./a2.fakeEnemies')).enemiesModule);
vi.mock('../src/sim/waves', async () => (await import('./a2.fakeEnemies')).wavesModule);
import type { GameState } from '../src/sim/types';
import { recomputeMods } from '../src/sim/mods';
import { detonateMissile } from '../src/sim/missile';
import { MISSILE, PLAYER, PULSE, WEAPON_RATE } from '../src/sim/tuning/weapons';
import { FLAK } from '../src/sim/tuning/weapons2';
import { addEnemy, boltsOf, input, newState, tick } from './a2.helpers';

function armed(weapon: 'pulse' | 'flak', power = 0): GameState {
  const s = newState({ god: true });
  s.player.weapon = weapon;
  s.player.power = power;
  s.player.fireCooldown = 0;
  return s;
}

const fireOnce = (s: GameState): void => tick(s, input({ fire: true }), 1);

describe('H1 mods: bolts', () => {
  it('damageMul scales bolt damage', () => {
    const s = armed('pulse');
    s.mods = { ...s.mods, damageMul: 2 };
    fireOnce(s);
    expect(boltsOf(s)[0].damage).toBeCloseTo(PULSE.levels[0].damage * 2, 6);
  });

  it('boltSpeedMul scales bolt speed', () => {
    const s = armed('pulse');
    s.mods = { ...s.mods, boltSpeedMul: 1.5 };
    fireOnce(s);
    expect(Math.abs(boltsOf(s)[0].vel.y)).toBeCloseTo(PULSE.speed * 1.5, 6);
  });

  it('extraBolts adds pulse bolts, and flak pellets', () => {
    const s = armed('pulse');
    s.mods = { ...s.mods, extraBolts: 2 };
    fireOnce(s);
    expect(boltsOf(s).length).toBe(PULSE.levels[0].bolts + 2);
    const f = armed('flak', 3);
    f.mods = { ...f.mods, extraBolts: 1 };
    fireOnce(f);
    expect(boltsOf(f).length).toBe(FLAK.pellets[3] + 2);
  });

  it('pierceBonus adds to every bolt except flak', () => {
    const s = armed('pulse');
    s.mods = { ...s.mods, pierceBonus: 3 };
    fireOnce(s);
    expect(boltsOf(s)[0].pierceLeft).toBe(PULSE.pierce + 3);
    const f = armed('flak', 0);
    f.mods = { ...f.mods, pierceBonus: 3 };
    fireOnce(f);
    expect(boltsOf(f)[0].pierceLeft).toBe(FLAK.pierce);
  });

  it('fireRateMul shortens the cooldown', () => {
    const s = armed('pulse');
    s.mods = { ...s.mods, fireRateMul: 2 };
    fireOnce(s);
    expect(s.player.fireCooldown).toBeCloseTo(1 / (WEAPON_RATE.pulse * 2) - 1 / 60, 6);
  });

  it('heatMul scales heat gain', () => {
    const base = armed('pulse');
    fireOnce(base);
    const cool = armed('pulse');
    cool.mods = { ...cool.mods, heatMul: 0.5 };
    fireOnce(cool);
    expect(cool.player.heat / base.player.heat).toBeCloseTo(0.5, 6);
  });

  it('no_heat style heatMul 0 never heats the gun', () => {
    const s = armed('pulse');
    s.mods = { ...s.mods, heatMul: 0 };
    fireOnce(s);
    expect(s.player.heat).toBe(0);
  });
});

describe('H1 mods: ship and crits', () => {
  it('moveSpeedMul scales keyboard movement', () => {
    const slow = newState({ god: true });
    tick(slow, input({ moveX: 1 }), 30);
    const fast = newState({ god: true });
    fast.mods = { ...fast.mods, moveSpeedMul: 2 };
    tick(fast, input({ moveX: 1 }), 30);
    const dSlow = slow.player.pos.x - 640;
    const dFast = fast.player.pos.x - 640;
    expect(dSlow).toBeCloseTo(PLAYER.keyboardSpeed * 0.5, 4);
    expect(dFast).toBeCloseTo(dSlow * 2, 4);
  });

  it('critChance is clamped and derived from perks', () => {
    const s = newState({ god: true });
    s.perks = { hollow_point: 20 };
    recomputeMods(s);
    expect(s.mods.critChance).toBe(1);
  });

  it('wingman perks give drones through recomputeMods', () => {
    const s = newState({ god: true });
    s.perks = { wingman: 1 };
    recomputeMods(s);
    expect(s.mods.droneCount).toBe(1);
  });
});

describe('H1 mods: missiles', () => {
  it('missileCooldownMul scales the missile cooldown', () => {
    const s = newState({ god: true });
    s.player.missiles = 5;
    s.mods = { ...s.mods, missileCooldownMul: 0.7 };
    tick(s, input({ missile: true }), 1);
    expect(s.player.missileCooldown).toBeCloseTo(MISSILE.cooldown * 0.7, 6);
  });

  it('missileDamageMul and bossDamageMul raise the boss missile hit', () => {
    const s = newState({ god: true });
    s.mods = { ...s.mods, missileDamageMul: 1.5, bossDamageMul: 1.25 };
    const boss = addEnemy(s, { isBoss: true, kind: 'boss_hen', hp: 1000, maxHp: 1000, pos: { x: 640, y: 200 } });
    detonateMissile(s, 640, 300);
    expect(1000 - boss.hp).toBeCloseTo(MISSILE.bossDamage * 1.5 * 1.25, 6);
  });
});
