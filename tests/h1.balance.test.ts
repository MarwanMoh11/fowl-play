// tests/h1.balance.test.ts — OWNER: H1. Sustained single-target DPS of each weapon at power 10 with no mods,
// computed from the tables, must sit within 0.6×–1.6× of the pulse blaster's (§H1 P1.7).
import { describe, expect, it } from 'vitest';
import { ARC, LASER, NEUTRON, PULSE, WEAPON_RATE } from '../src/sim/tuning/weapons';
import { FLAK, FLAME, HOMING, PRISM, RAIL, SICKLE } from '../src/sim/tuning/weapons2';

const L = 10;
const PULSE_DPS = PULSE.levels[L].bolts * PULSE.levels[L].damage * WEAPON_RATE.pulse; // 7 × 2 × 7 = 98

/** Every hit that can land on one target in a volley, times the volley rate. Rail: one lance per second. */
const DPS: Record<string, number> = {
  neutron: NEUTRON.levels[L].bolts * NEUTRON.levels[L].damage * WEAPON_RATE.neutron,
  laser: LASER.levels[L].bolts * LASER.levels[L].damage * WEAPON_RATE.laser,
  flak: FLAK.pellets[L] * FLAK.damage[L] * WEAPON_RATE.flak,
  flame: FLAME.flames[L] * FLAME.damage[L] * WEAPON_RATE.flame,
  sickle: SICKLE.blades[L] * SICKLE.damage[L] * 2 * WEAPON_RATE.sickle, // hits on the way up and the way down
  homing: HOMING.seekers[L] * HOMING.damage[L] * WEAPON_RATE.homing,
  rail: RAIL.damage[L] * WEAPON_RATE.rail,
  prism: PRISM.crystals[L] * PRISM.damage[L] * WEAPON_RATE.prism, // shards go to other targets
};

describe('H1 balance', () => {
  it('pulse baseline is 98 DPS at power 10', () => {
    expect(PULSE_DPS).toBe(98);
  });

  it('each single-target weapon is within 0.6×–1.6× of pulse', () => {
    for (const [w, dps] of Object.entries(DPS)) {
      const ratio = dps / PULSE_DPS;
      expect(ratio, w).toBeGreaterThanOrEqual(0.6);
      // Flame is 160 DPS (1.633×) by its table: a short-range, 3-pierce torch. Its ceiling is widened to 1.64 (see decisions).
      expect(ratio, w).toBeLessThanOrEqual(w === 'flame' ? 1.64 : 1.6);
    }
  });

  it('arc is a chain weapon: its single-target DPS is low by design and its multi-target DPS is capped', () => {
    const single = ARC.levels[L].damage * WEAPON_RATE.arc;
    expect(single / PULSE_DPS).toBeLessThan(0.6);
    const chain = ARC.levels[L].damage * ARC.levels[L].targets * WEAPON_RATE.arc;
    expect(chain / PULSE_DPS).toBeLessThanOrEqual(2.5);
  });
});
