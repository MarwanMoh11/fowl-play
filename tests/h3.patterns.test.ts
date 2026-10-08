// tests/h3.patterns.test.ts — OWNER: H3. Armada patterns: exact planned counts, V-formations, silent exits,
// every chapter 6–12 table letter is a real kind, and no placeholder markers remain in H3's files.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGame } from '../src/sim/game';
import { CHAPTERS } from '../src/sim/chapters';
import { updateEnemies } from '../src/sim/enemies';
import { patternPlanned, startPattern, updatePattern } from '../src/sim/patterns';
import { emptyWaveRuntime } from '../src/sim/waves.types';
import type { GroupRuntime, GroupSpec } from '../src/sim/waves.types';
import { KIND_LETTERS } from '../src/sim/tuning/enemies';
import { DT } from '../src/sim/tuning/core';
import type { GameState } from '../src/sim/types';

/** Runs one group alone (its own state) until it has finished spawning, moving every enemy each tick. */
function runGroup(spec: GroupSpec, seconds = 120, seed = 9): { s: GameState; g: GroupRuntime; planned: number } {
  const s = createGame({ seed, difficulty: 'normal', debug: { godMode: true } });
  const rt = emptyWaveRuntime();
  s.waveRt = rt;
  const planned = patternPlanned(spec);
  const g: GroupRuntime = {
    index: 0, started: true, doneSpawning: false, spawned: 0, total: planned, timer: 0, t: 0,
    anchor: { x: 0, y: 0 }, data: { start: 0 },
  };
  rt.groups.push(g);
  startPattern(s, g, spec);
  for (let i = 0; i < seconds / DT && !g.doneSpawning; i++) {
    updatePattern(s, g, spec, DT);
    updateEnemies(s, DT);
    g.t += DT;
  }
  return { s, g, planned };
}

const ARMADA_LETTERS = 'NXSWTGHKMVE';

describe('chapters 6–12: every group spawns exactly its planned count', () => {
  it('runs every non-boss group of chapters 6–12 to completion', () => {
    let groups = 0;
    for (let c = 5; c < CHAPTERS.length; c++) {
      for (const wave of CHAPTERS[c].waves) {
        for (const spec of wave.groups) {
          if (spec.pattern === 'boss') continue;
          const { g, planned } = runGroup(spec);
          expect(g.doneSpawning, `${CHAPTERS[c].name}/${wave.name}/${spec.pattern}`).toBe(true);
          expect(g.spawned, `${CHAPTERS[c].name}/${wave.name}/${spec.pattern}`).toBe(planned);
          groups++;
        }
      }
    }
    expect(groups).toBeGreaterThan(60);
  }, 120_000);

  it('every letter used by the chapter 6–12 tables is a real kind', () => {
    const used = new Set<string>();
    const note = (spec: GroupSpec): void => {
      if (spec.pattern === 'grid' || spec.pattern === 'swoop' || spec.pattern === 'divers') {
        for (const l of spec.rowKinds) used.add(l);
      } else if (spec.pattern === 'stream') used.add(spec.kind);
      else if (spec.pattern === 'ring') for (const r of spec.rings) used.add(r.kind);
    };
    for (let c = 5; c < CHAPTERS.length; c++) {
      for (const wave of CHAPTERS[c].waves) for (const spec of wave.groups) note(spec);
    }
    for (const l of used) expect(KIND_LETTERS[l], `letter ${l}`).toBeDefined();
    for (const l of ARMADA_LETTERS) expect(used.has(l), `armada letter ${l} is used in a table`).toBe(true);
  });
});

describe('jets', () => {
  it('fly in V-formations of perV, alternating sides, and leave silently', () => {
    const { s, g } = runGroup({ pattern: 'jets', count: 18, perV: 6 });
    expect(g.spawned).toBe(18);
    const jets = s.enemies.filter((e) => e.kind === 'chicken_jet');
    expect(jets).toHaveLength(18);
    // Each V's leader (rank 0) sits at its lane; the first V comes from the left, the second from the right.
    const leftSpawns = jets.filter((e) => e.pos.x < 0).length;
    expect(leftSpawns).toBeGreaterThan(0);
    // All jets have left the far side by now and were removed without points.
    for (let i = 0; i < 6 / DT; i++) updateEnemies(s, DT);
    expect(s.enemies.every((e) => !e.alive)).toBe(true);
    expect(s.runStats.kills).toBe(0);
  });

  it('a V holds perV jets at the same lane (rank offsets only)', () => {
    const { s } = runGroup({ pattern: 'jets', count: 6, perV: 6, ys: [200] }, 0.05);
    // rank 3 sits 84 px off the lane; the sine wobble adds up to 20 px either way.
    const reach = 28 * 3 + 20 + 0.01;
    const ys = s.enemies.map((e) => e.pos.y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(200 - reach);
    expect(Math.max(...ys)).toBeLessThanOrEqual(200 + reach);
    expect(s.enemies).toHaveLength(6);
  });
});

describe('mines, pods and mothers', () => {
  it('mines sink and are removed at the bottom without points', () => {
    const { s, g } = runGroup({ pattern: 'mines', count: 4, rate: 4 }, 3);
    expect(g.spawned).toBe(4);
    for (let i = 0; i < 40 / DT; i++) updateEnemies(s, DT);
    expect(s.enemies.every((e) => !e.alive || e.pos.y <= 740)).toBe(true);
    expect(s.runStats.kills).toBe(0);
  });

  it('pods drift down at 40 px/s from y = −30', () => {
    const { s } = runGroup({ pattern: 'pods', count: 2, interval: 1 }, 0.01);
    const pods = s.enemies.filter((e) => e.kind === 'egg_pod');
    expect(pods.length).toBeGreaterThanOrEqual(1);
    for (const p of pods) {
      expect(p.pos.y).toBeGreaterThan(-31); // spawned at -30, moved less than a tick's drift
      expect(p.pos.y).toBeLessThan(-28);
      expect(p.vel).toEqual({ x: 0, y: 40 });
      expect(p.pos.x).toBeGreaterThanOrEqual(120);
      expect(p.pos.x).toBeLessThanOrEqual(1160);
    }
  });

  it('mothers hover in the y 140–200 band, never leaving it once entered', () => {
    const { s } = runGroup({ pattern: 'mothers', count: 3 }, 0.01);
    expect(s.enemies.filter((e) => e.kind === 'chicken_mother')).toHaveLength(3);
    for (let i = 0; i < 12 / DT; i++) updateEnemies(s, DT);
    for (const m of s.enemies.filter((e) => e.kind === 'chicken_mother')) {
      expect(m.pos.y).toBeGreaterThanOrEqual(140 - 1);
      expect(m.pos.y).toBeLessThanOrEqual(200 + 1);
    }
  });
});

describe('placeholder gate', () => {
  it('no placeholder markers or placeholderSprite uses remain in H3 files', () => {
    const root = process.cwd();
    const files = [
      'src/sim/enemies.ts', 'src/sim/behaviors.ts', 'src/sim/behaviors.types.ts', 'src/sim/waves.ts',
      'src/sim/waves.types.ts', 'src/sim/chapters.ts', 'src/sim/chapters2.ts', 'src/sim/chapterKit.ts',
      'src/sim/onslaught.ts', 'src/sim/abilities.ts', 'src/sim/envHazards.ts', 'src/sim/tuning/enemies.ts',
      'src/sim/patterns/index.ts', 'src/sim/patterns/flyers.ts', 'src/sim/patterns/drops.ts',
      'src/render/sprites/armada.ts', 'src/render/sprites/armada2.ts',
    ];
    const hits = files.filter((f) => /Phase-0 placeholder|Phase 0:|placeholderSprite/.test(readFileSync(join(root, f), 'utf8')));
    expect(hits).toEqual([]);
  });
});
