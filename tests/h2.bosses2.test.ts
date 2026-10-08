// tests/h2.bosses2.test.ts — OWNER: H2. The 7 major and 7 mini HENPOCALYPSE bosses on the real sim (no mocks):
// spawn numbers, every attack of each cycle in a god-mode fight, phases, caps, death cleanup, phoenix revive, fairness.
import { describe, expect, it } from 'vitest';
import type { BossId, BossRuntime } from '../src/sim/bosses.types';
import type { Enemy, GameState } from '../src/sim/types';
import { BOSS_INFO } from '../src/shared/contracts';
import { damageEnemy } from '../src/sim/combat';
import { bossMaxHp, spawnBoss } from '../src/sim/bosses';
import { BOSS_DEFS } from '../src/sim/tuning/bosses';
import { ACE, BRIGADIER, COLOSSUS, CUCKOO, EMPRESS, GUARD, KRAKEN, PHOENIX, ROTI, SCRAMBLER, STORMCROW } from '../src/sim/tuning/bosses2';
import { MAX_ENEMIES, MAX_HAZARDS, MAX_PROJECTILES } from '../src/sim/tuning/core';
import { checkInvariants, eventsOf, newState, tick } from './a2.helpers';

const MAJORS: BossId[] = ['broodmother', 'rotisserie', 'colossus', 'kraken', 'phoenix', 'scrambler', 'empress'];
const MINIS: BossId[] = ['mini_brigadier', 'mini_ace', 'mini_cuckoo', 'mini_jelly', 'mini_stormcrow', 'mini_scarecrow', 'mini_guard'];
const ALL: BossId[] = [...MAJORS, ...MINIS];

/** Every attack that appears in the boss's cycles (phase 0 through its last phase, reborn cycle included). */
const ATTACKS: Record<string, readonly string[]> = {
  broodmother: ['nebula_spiral', 'pod_drop', 'feather_storm', 'cloak'],
  rotisserie: ['spit_spin', 'grease_rain', 'flame_sweep', 'roast_burst'],
  colossus: ['gear_toss', 'piston_slam', 'clock_hands', 'cuckoo_swarm'],
  kraken: ['tentacle_slam', 'ink_cloud', 'sucker_rings', 'whirlpool', 'grab'],
  phoenix: ['fire_fan', 'lightning_strikes', 'dive_bomb', 'ash_ring'],
  scrambler: ['galaxy_arms', 'event_horizon', 'spaghettify', 'swallow'],
  empress: ['royal_decree', 'crown_spiral', 'summon_guard', 'cross_laser', 'yolk_nova', 'egg_apocalypse'],
  mini_brigadier: ['shotgun', 'salute', 'brood'],
  mini_ace: ['strafe', 'ring'],
  mini_cuckoo: ['tock', 'gear_burst'],
  mini_jelly: ['drip', 'pulse_ring', 'void_pair'],
  mini_stormcrow: ['thunder', 'feather_fan', 'dive'],
  mini_scarecrow: ['crow_call', 'hay_spin'],
  mini_guard: ['lance_charge', 'royal_volley'],
};

/** Phases last at least this long before the next threshold may drop (seconds). */
const DWELL = 25;

function rtOf(e: Enemy): BossRuntime {
  if (e.behavior.type !== 'boss') throw new Error('not a boss');
  return e.behavior.rt;
}

function bossOf(s: GameState): Enemy {
  const b = s.enemies.find((e) => e.isBoss);
  if (!b) throw new Error('no boss spawned');
  return b;
}

function freshBoss(id: BossId): { s: GameState; boss: Enemy } {
  const s = newState({ god: true });
  spawnBoss(s, id);
  return { s, boss: bossOf(s) };
}

/** Ticks until the entry is over and the boss is attackable. */
function finishEntry(s: GameState, boss: Enemy): void {
  for (let i = 0; i < 1200 && (rtOf(boss).entering || boss.invulnerable); i++) tick(s);
}

function dealTo(s: GameState, e: Enemy, frac: number): void {
  const amount = e.hp - frac * e.maxHp + e.shield;
  if (amount > 0) damageEnemy(s, e, amount, 'debug');
}

function capError(s: GameState): string | null {
  const en = s.enemies.filter((e) => e.alive).length;
  const pr = s.projectiles.filter((p) => p.alive).length;
  const hz = s.hazards.filter((h) => h.alive).length;
  if (en > MAX_ENEMIES) return `enemies ${en}`;
  if (pr > MAX_PROJECTILES) return `projectiles ${pr}`;
  if (hz > MAX_HAZARDS) return `hazards ${hz}`;
  return checkInvariants(s);
}

interface FightLog { attacks: Set<string>; maxPhase: number; caps: string | null }

/**
 * God-mode fight: each threshold is dropped to once the current phase has run DWELL seconds; after the last
 * phase one lethal hit lands (the Phoenix revives instead). Runs `seconds` of sim time or until the boss dies.
 */
function fight(id: BossId, seconds: number): { s: GameState; boss: Enemy; log: FightLog } {
  const { s, boss } = freshBoss(id);
  const log: FightLog = { attacks: new Set(), maxPhase: 0, caps: null };
  const thresholds = BOSS_INFO[id].thresholds;
  let lastPhase = 0;
  let phaseSince = 0;
  let lethalDone = false;
  for (let i = 0; i < seconds * 60 && boss.alive; i++) {
    tick(s);
    for (const ev of eventsOf(s, 'boss_attack')) log.attacks.add(ev.attack);
    log.caps ??= capError(s);
    const rt = rtOf(boss);
    log.maxPhase = Math.max(log.maxPhase, rt.phase);
    if (rt.phase !== lastPhase) {
      lastPhase = rt.phase;
      phaseSince = rt.t;
    }
    if (boss.invulnerable || rt.entering || rt.t - phaseSince < DWELL) continue;
    if (rt.phase < thresholds.length) {
      dealTo(s, boss, thresholds[rt.phase] - 0.02);
    } else if (!lethalDone) {
      lethalDone = true;
      damageEnemy(s, boss, boss.hp + boss.shield + 1, 'debug');
    }
  }
  return { s, boss, log };
}

describe('spawn numbers', () => {
  it.each(ALL)('%s spawns with its table HP, radius, points and flags', (id) => {
    const { s, boss } = freshBoss(id);
    const def = BOSS_DEFS[id];
    expect(boss).toMatchObject({ kind: def.kind, radius: def.radius, points: def.points, isBoss: true, invulnerable: true });
    expect(boss.maxHp).toBe(def.hp);
    expect(bossMaxHp(s, id)).toBe(def.hp);
    expect(s.bossName).toBe(BOSS_INFO[id].name);
    expect(rtOf(boss)).toMatchObject({ id, phase: 0, entering: true, attack: 'idle' });
  });
});

describe('fights', () => {
  it.each(ALL)('%s runs every attack of its cycle, advances every phase, respects caps and stays JSON-safe', (id) => {
    const { s, boss, log } = fight(id, 120);
    for (const a of ATTACKS[id]) expect(log.attacks.has(a), `attack ${a}`).toBe(true);
    expect(log.caps).toBeNull();
    const expectedMax = BOSS_INFO[id].thresholds.length + (id === 'phoenix' ? 1 : 0);
    expect(log.maxPhase).toBe(expectedMax);
    expect(() => JSON.stringify(s)).not.toThrow();
    expect(Object.values(rtOf(boss).data).every((v) => Number.isFinite(v))).toBe(true);
  }, 60_000);

  it.each(ALL)('%s dies and takes its minions and hazards with it', (id) => {
    const { s, boss } = fight(id, 60);
    for (let i = 0; i < 60 * 30 && boss.alive; i++) {
      tick(s);
      if (!boss.invulnerable && !rtOf(boss).entering) damageEnemy(s, boss, boss.hp + boss.shield + 1, 'debug');
    }
    expect(boss.alive).toBe(false);
    expect(s.enemies.some((e) => e.alive && e.parentId === boss.id)).toBe(false);
    expect(s.hazards.some((h) => h.alive && h.ownerId === boss.id)).toBe(false);
  }, 60_000);
});

describe('specific mechanics', () => {
  it('the Phoenix revives exactly once: the first lethal hit leaves it at half HP, the second kills it', () => {
    const { s, boss } = freshBoss('phoenix');
    finishEntry(s, boss);
    damageEnemy(s, boss, boss.hp, 'debug');
    expect(boss.alive).toBe(true);
    expect(boss.hp).toBe(Math.round(boss.maxHp * PHOENIX.rebirth.hpFrac));
    expect(rtOf(boss)).toMatchObject({ phase: 2 });
    expect(rtOf(boss).data.reborn).toBe(1);
    expect(boss.invulnerable).toBe(true);
    expect(eventsOf(s, 'boss_phase').some((ev) => ev.phase === 2)).toBe(true);
    expect(eventsOf(s, 'boss_attack').some((ev) => ev.attack === 'rebirth')).toBe(true);
    for (let i = 0; i < 60 * 3; i++) tick(s);
    expect(boss.invulnerable).toBe(false);
    damageEnemy(s, boss, boss.hp, 'debug');
    expect(boss.alive).toBe(false);
    expect(rtOf(boss).data.reborn).toBe(1);
  });

  it('the Guard starts with a 300 shield that absorbs hits, and phase 1 restores 200', () => {
    const { s, boss } = freshBoss('mini_guard');
    expect(boss.shield).toBe(GUARD.shield);
    expect(boss.maxShield).toBe(GUARD.shield);
    finishEntry(s, boss);
    damageEnemy(s, boss, 250, 'debug');
    expect(boss.shield).toBe(GUARD.shield - 250);
    expect(boss.hp).toBe(boss.maxHp);
    dealTo(s, boss, 0.49);
    expect(rtOf(boss).phase).toBe(1);
    expect(boss.shield).toBe(GUARD.shieldAfter);
  });

  it('the Scrambler keeps one gravity well on itself: radius 600, power 70 then 110 after the first threshold', () => {
    const { s, boss } = freshBoss('scrambler');
    finishEntry(s, boss);
    for (let i = 0; i < 90; i++) tick(s);
    const wells = () => s.hazards.filter((h) => h.alive && h.kind === 'gravity' && h.ownerId === boss.id);
    expect(wells()).toHaveLength(1);
    expect(wells()[0]).toMatchObject({ width: SCRAMBLER.well.radius, power: SCRAMBLER.well.power[0] });
    expect(wells()[0].ttl).toBeGreaterThan(0.5);
    dealTo(s, boss, 0.64);
    for (let i = 0; i < 10; i++) tick(s);
    expect(wells()).toHaveLength(1);
    expect(wells()[0].power).toBe(SCRAMBLER.well.power[1]);
  });

  it('every telegraph lasts at least 0.8 s before its beam (fairness)', () => {
    const telegraphs = [
      COLOSSUS.piston.telegraph, COLOSSUS.clock.telegraph, KRAKEN.slam.telegraph, KRAKEN.grab.telegraph,
      PHOENIX.lightning.telegraph, ROTI.flame.telegraph, SCRAMBLER.spaghetti.telegraph, EMPRESS.cross.telegraph,
      BRIGADIER.salute.telegraph, STORMCROW.thunder.telegraph, CUCKOO.tock.telegraph, GUARD.lance.telegraph,
    ];
    for (const t of telegraphs) expect(t).toBeGreaterThanOrEqual(0.8);
    expect(ACE.escorts.count).toBe(2);
  });
});
