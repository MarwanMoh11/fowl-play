// tests/a1.henpocalypse.test.ts — OWNER: LEAD. Core HENPOCALYPSE systems: mods, combo, fury, power-ups,
// shields/revives, perk draft, modes, gravity, time warp, plus the final-gate placeholder check.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { choosePerk, createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { computeMods } from '../src/sim/mods';
import { comboMultFor, dronePos, enemyTimeScale, registerKill } from '../src/sim/powerups';
import { applyDraftChoice, openDraft, rollDraft } from '../src/sim/draft';
import { BOSS_RUSH_ORDER, currentWaveInfo, dailyMutators, dailySeed, finalChapter } from '../src/sim/modes';
import { killPlayer } from '../src/sim/player';
import { collectPickup, spawnPickup, availableWeapons } from '../src/sim/pickups';
import { damageEnemy } from '../src/sim/combat';
import { FURY_MAX, PERKS, SHIPS } from '../src/sim/tuning/loadout';
import { DT } from '../src/sim/tuning/core';
import type { GameState, InputFrame } from '../src/sim/types';
import { addEnemy, addHazard } from './a1.helpers';

/** Flipped to true by the lead at the final gate: no placeholder art or behaviors may remain. */
const ENFORCE_NO_PLACEHOLDERS = false;

function game(over: Partial<Parameters<typeof createGame>[0]> = {}): GameState {
  return createGame({ seed: 5, difficulty: 'normal', ...over });
}

describe('modifiers', () => {
  it('stack ship, upgrades, mutators and perks', () => {
    const m = computeMods({ ship: 'bantam', upgrades: { coolant: 2 }, mutators: ['egg_storm'] }, { hot_sauce: 2, chain_gang: 1 });
    expect(m.moveSpeedMul).toBeCloseTo(1.2);
    expect(m.heatMul).toBeCloseTo(0.92 * 0.92);
    expect(m.enemyEggRateMul).toBe(2);
    expect(m.scoreMul).toBeCloseTo(1.4);
    expect(m.damageMul).toBeCloseTo(1.15 * 1.15);
    expect(m.comboWindow).toBeCloseTo(2.75);
  });

  it('ship and hardcore shape the starting player', () => {
    expect(game({ loadout: { ship: 'bulwark', upgrades: {}, mutators: [] } }).player).toMatchObject({ radius: SHIPS.bulwark.radius, shield: 2, power: 1 });
    expect(game({ loadout: { ship: 'falcon', upgrades: { hull: 2, start_power: 3 }, mutators: [] } }).player).toMatchObject({ lives: 7, power: 3 });
    expect(game({ loadout: { ship: 'falcon', upgrades: { hull: 2 }, mutators: ['hardcore'] } }).player.lives).toBe(1);
  });
});

describe('combo and fury', () => {
  it('tiers raise the kill multiplier and the chain breaks after the window', () => {
    expect([0, 9, 10, 25, 50, 100, 200, 400].map(comboMultFor)).toEqual([1, 1, 1.5, 2, 3, 4, 5, 8]);
    const s = game();
    s.phase = 'wave_active';
    for (let i = 0; i < 12; i++) registerKill(s);
    expect(s.combo.mult).toBe(1.5);
    for (let i = 0; i < 2.1 / DT; i++) step(s, NEUTRAL_INPUT, DT);
    expect(s.combo.count).toBe(0);
    expect(s.runStats.maxCombo).toBe(12);
  });

  it('kills fill fury; a full bar starts overdrive on input', () => {
    const s = game();
    for (let i = 0; i < 400 && s.player.fury < FURY_MAX; i++) damageEnemy(s, addEnemy(s, { hp: 1, points: 500 }), 1, 'bolt');
    expect(s.player.fury).toBe(FURY_MAX);
    const od: InputFrame = { ...NEUTRAL_INPUT, overdrive: true };
    step(s, od, DT);
    expect(s.player.overdrive).toBeGreaterThan(7.9);
    expect(s.events.some((e) => e.type === 'overdrive_start')).toBe(true);
  });
});

describe('power-ups, shields, revives', () => {
  it('shield then revive absorb hits before a life is lost', () => {
    const s = game();
    s.player.invulnTimer = 0;
    s.player.shield = 1;
    s.player.revives = 1;
    killPlayer(s);
    expect(s.player).toMatchObject({ alive: true, shield: 0, lives: 5 });
    s.player.invulnTimer = 0;
    killPlayer(s);
    expect(s.player).toMatchObject({ alive: true, revives: 0, lives: 5 });
    s.player.invulnTimer = 0;
    killPlayer(s);
    expect(s.player).toMatchObject({ alive: false, lives: 4 });
  });

  it('timed power-ups start, slow the armada and expire', () => {
    const s = game();
    const p = spawnPickup(s, 'pu_timewarp', 640, 600);
    expect(p).not.toBeNull();
    if (p) collectPickup(s, p);
    expect(enemyTimeScale(s)).toBe(0.5);
    for (let i = 0; i < 6.1 / DT; i++) step(s, NEUTRAL_INPUT, DT);
    expect(enemyTimeScale(s)).toBe(1);
  });

  it('drone slots follow the ship', () => {
    const s = game();
    const a = dronePos(s, 0);
    const b = dronePos(s, 1);
    expect(a.x).toBeLessThan(s.player.pos.x);
    expect(b.x).toBeGreaterThan(s.player.pos.x);
  });

  it('gravity wells pull the ship', () => {
    const s = game();
    s.phase = 'wave_active';
    const x0 = s.player.pos.x;
    addHazard(s, { kind: 'gravity', a: { x: x0 + 200, y: s.player.pos.y }, b: { x: x0 + 200, y: s.player.pos.y }, width: 400, lethal: false, ttl: 5, power: 300 });
    for (let i = 0; i < 30; i++) step(s, NEUTRAL_INPUT, DT);
    expect(s.player.pos.x).toBeGreaterThan(x0 + 20);
  });

  it('weapon gifts respect unlock chapters', () => {
    expect(availableWeapons(game())).toEqual(['pulse', 'neutron', 'laser', 'arc', 'flak']);
    expect(availableWeapons(game({ mode: 'onslaught' }))).toHaveLength(10);
  });
});

describe('perk draft', () => {
  it('rolls distinct perks, never maxed ones, and applies instant effects', () => {
    const s = game();
    for (let i = 0; i < 50; i++) {
      const opts = rollDraft(s);
      expect(new Set(opts).size).toBe(opts.length);
      expect(opts.length).toBe(3);
    }
    s.perks.devils_bargain = PERKS.devils_bargain.max;
    for (let i = 0; i < 50; i++) expect(rollDraft(s)).not.toContain('devils_bargain');
    s.draft = { options: ['spare_ship', 'hot_sauce', 'ammo_belt'] };
    applyDraftChoice(s, 0);
    expect(s.player.lives).toBe(6);
    expect(s.perks.spare_ship).toBe(1);
  });

  it('a boss wave clear opens a draft that continues into the tally', () => {
    const s = game({ startChapter: 1, startWave: 10, debug: { godMode: true } });
    for (let i = 0; i < 60 * 120 && s.phase !== 'perk_draft'; i++) {
      for (const e of s.enemies) if (!e.invulnerable) damageEnemy(s, e, 99999, 'debug');
      step(s, NEUTRAL_INPUT, DT);
    }
    expect(s.phase).toBe('perk_draft');
    expect(s.draft?.options).toHaveLength(3);
    choosePerk(s, 1);
    expect(s.phase).toBe('chapter_complete');
    expect(Object.keys(s.perks)).toHaveLength(1);
  });

  it('openDraft emits the options', () => {
    const s = game();
    openDraft(s);
    expect(s.events.some((e) => e.type === 'perk_draft')).toBe(true);
  });
});

describe('modes', () => {
  it('campaign 12, daily 3, boss rush 12, onslaught endless', () => {
    expect(finalChapter(game())).toBe(12);
    expect(finalChapter(game({ mode: 'daily' }))).toBe(3);
    expect(finalChapter(game({ mode: 'boss_rush' }))).toBe(BOSS_RUSH_ORDER.length);
    expect(finalChapter(game({ mode: 'onslaught' }))).toBe(Infinity);
  });

  it('boss rush: every chapter is one boss wave', () => {
    const s = game({ mode: 'boss_rush', startChapter: 6 });
    expect(currentWaveInfo(s)).toMatchObject({ isBoss: true, boss: 'broodmother' });
    expect(s.phase).toBe('boss_intro');
  });

  it('daily seeds and mutators are stable per date', () => {
    expect(dailySeed(20261008)).toBe(dailySeed(20261008));
    expect(dailySeed(20261008)).not.toBe(dailySeed(20261009));
    const m = dailyMutators(dailySeed(20261008));
    expect(m).toHaveLength(2);
    expect(new Set(m).size).toBe(2);
    expect(m).not.toContain('hardcore');
  });

  it('state stays JSON-safe with every new field', () => {
    const s = game({ mode: 'onslaught', loadout: { ship: 'phoenix', upgrades: { lucky: 1 }, mutators: ['turbo'] } });
    for (let i = 0; i < 300; i++) step(s, NEUTRAL_INPUT, DT);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('final gate', () => {
  it.runIf(ENFORCE_NO_PLACEHOLDERS)('no placeholder sprites or placeholder boss/chapter/weapon code remains', () => {
    const root = join(__dirname, '..', 'src');
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const n of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, n.name);
        if (n.isDirectory()) walk(p);
        else if (p.endsWith('.ts') && !p.endsWith('placeholder.ts')) {
          const t = readFileSync(p, 'utf8');
          if (/placeholderSprite|Phase-0 placeholder|Phase 0:/i.test(t)) hits.push(p.slice(root.length + 1));
        }
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
});
