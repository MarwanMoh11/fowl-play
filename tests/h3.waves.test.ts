// tests/h3.waves.test.ts — OWNER: H3. Golden chickens, environmental hazards and the golden-chicken completion rule.
import { describe, expect, it } from 'vitest';
import { createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { spawnEnemy } from '../src/sim/enemies';
import { isWaveComplete } from '../src/sim/waves';
import { DT } from '../src/sim/tuning/core';
import type { GameState, Hazard } from '../src/sim/types';

function toActive(s: GameState): void {
  for (let i = 0; i < 60 * 30 && s.phase !== 'wave_active'; i++) step(s, NEUTRAL_INPUT, DT);
  expect(s.phase).toBe('wave_active');
}

/** Steps `seconds` of game time; `seen` runs after every tick (events are cleared each step). */
function play(s: GameState, seconds: number, seen: (st: GameState) => void): void {
  for (let i = 0; i < seconds / DT; i++) {
    step(s, NEUTRAL_INPUT, DT);
    seen(s);
  }
}

function game(chapter: number, wave: number, seed = 6, luck?: number): GameState {
  const s = createGame({ seed, difficulty: 'normal', startChapter: chapter, startWave: wave, debug: { godMode: true } });
  if (luck !== undefined) s.mods.luck = luck;
  return s;
}

describe('golden chickens', () => {
  it('appear, flee across the screen and escape; at most one is alive at a time', () => {
    const s = game(1, 2, 4, 1000); // a roll of 0.006 × 1000 always succeeds once a second
    toActive(s);
    const types: string[] = [];
    let maxAlive = 0;
    play(s, 30, (st) => {
      for (const e of st.events) types.push(e.type);
      maxAlive = Math.max(maxAlive, st.enemies.filter((e) => e.alive && e.kind === 'chicken_gold').length);
    });
    expect(types).toContain('golden_appear');
    expect(types).toContain('golden_escaped');
    expect(maxAlive).toBeLessThanOrEqual(1);
  });

  it('never appears when luck is zero', () => {
    const s = game(1, 2, 4, 0);
    toActive(s);
    let appeared = false;
    play(s, 30, (st) => { appeared ||= st.events.some((e) => e.type === 'golden_appear'); });
    expect(appeared).toBe(false);
  });

  it('a golden chicken never holds a wave open, and leaves silently when the wave completes', () => {
    const s = createGame({ seed: 5, difficulty: 'normal', debug: { godMode: true } });
    for (const g of s.waveRt.groups) { g.started = true; g.doneSpawning = true; }
    const basic = spawnEnemy(s, 'chicken_basic', 300, 200, { type: 'none' }, { counted: false });
    const gold = spawnEnemy(s, 'chicken_gold', 300, 200, { type: 'flee', dir: 1, speed: 300, baseY: 200, t: 0 }, { counted: false });
    expect(gold).not.toBeNull();
    expect(isWaveComplete(s)).toBe(false);
    if (basic) basic.alive = false;
    s.events.length = 0;
    expect(isWaveComplete(s)).toBe(true);
    expect(gold?.alive).toBe(false);
    expect(s.events.some((e) => e.type === 'golden_escaped')).toBe(false);
  });
});

describe('environmental hazards', () => {
  function seenHazards(s: GameState, seconds: number): Hazard[] {
    const seen = new Set<Hazard>();
    play(s, seconds, (st) => { for (const h of st.hazards) seen.add(h); });
    return [...seen];
  }

  it('chapter 7: solar flares are full-height 90 px telegraph columns, then 90 px lethal beams', () => {
    const s = game(7, 1);
    toActive(s);
    const hs = seenHazards(s, 22).filter((h) => h.ownerId === -1);
    const tele = hs.filter((h) => h.kind === 'telegraph');
    const beams = hs.filter((h) => h.kind === 'beam');
    expect(tele.length).toBeGreaterThanOrEqual(2);
    expect(beams.length).toBeGreaterThanOrEqual(1);
    expect(tele.every((h) => h.width === 90 && !h.lethal && h.a.x === h.b.x && h.b.y === 720)).toBe(true);
    expect(beams.every((h) => h.width === 90 && h.lethal)).toBe(true);
  });

  it('chapter 10: lightning is 50 px telegraphs with 0.3 s lethal beams', () => {
    const s = game(10, 1);
    toActive(s);
    const hs = seenHazards(s, 14).filter((h) => h.ownerId === -1);
    const tele = hs.filter((h) => h.kind === 'telegraph');
    const beams = hs.filter((h) => h.kind === 'beam');
    expect(tele.length).toBeGreaterThanOrEqual(2);
    expect(tele.every((h) => h.width === 50 && h.ttl <= 0.9 + 1e-9)).toBe(true);
    expect(beams.every((h) => h.width === 50 && h.lethal && h.ttl <= 0.3 + 1e-9)).toBe(true);
  });

  it('chapter 11: one gravity well (radius 380, power 90) drifts along y = 200', () => {
    const s = game(11, 1);
    toActive(s);
    let maxWells = 0;
    let well: Hazard | null = null;
    play(s, 10, (st) => {
      const wells = st.hazards.filter((h) => h.alive && h.kind === 'gravity');
      maxWells = Math.max(maxWells, wells.length);
      if (wells[0]) well = wells[0];
    });
    expect(maxWells).toBe(1);
    expect(well).not.toBeNull();
    const w = well as unknown as Hazard;
    expect(w.width).toBe(380);
    expect(w.power).toBe(90);
    expect(w.a.y).toBe(200);
    expect(w.ownerId).toBe(-1);
  });

  it('no environment hazards in other chapters or in boss waves', () => {
    const plain = game(1, 1);
    toActive(plain);
    expect(seenHazards(plain, 15).some((h) => h.ownerId === -1)).toBe(false);
    const bossWave = game(7, 10);
    for (let i = 0; i < 60 * 30 && bossWave.phase !== 'wave_active'; i++) step(bossWave, NEUTRAL_INPUT, DT);
    expect(seenHazards(bossWave, 15).some((h) => h.ownerId === -1)).toBe(false);
  });
});
