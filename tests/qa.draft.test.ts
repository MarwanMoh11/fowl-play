// tests/qa.draft.test.ts — QA: the perk draft must never open empty. The app only steps the sim on the playing
// screen, so an empty draft (every perk maxed, reachable in a long endless run) would softlock on the draft screen.
import { describe, expect, it } from 'vitest';
import { createGame, NEUTRAL_INPUT, setPhase, step } from '../src/sim/game';
import { recomputeMods } from '../src/sim/mods';
import { DT } from '../src/sim/tuning/core';
import { PERK_IDS, PERKS } from '../src/sim/tuning/loadout';
import { openDraft, rollDraft } from '../src/sim/draft';

describe('perk draft with no perks left', () => {
  it('a boss wave clear skips the draft when every perk is maxed', () => {
    const s = createGame({ seed: 9, difficulty: 'normal', startChapter: 1, startWave: 10, debug: { godMode: true } });
    for (const id of PERK_IDS) s.perks[id] = PERKS[id].max;
    recomputeMods(s);
    s.enemies.length = 0;
    setPhase(s, 'wave_clear');
    const seen = new Set<string>();
    for (let i = 0; i < 200 && s.phase === 'wave_clear'; i++) {
      step(s, NEUTRAL_INPUT, DT);
      s.events.forEach((e) => seen.add(e.type));
    }
    expect(rollDraft(s)).toEqual([]);
    expect(s.phase).toBe('chapter_complete');
    expect(seen.has('perk_draft')).toBe(false);
    expect(s.draft).toBeNull();
  });

  it('openDraft reports false and leaves no draft behind when the pool is empty', () => {
    const s = createGame({ seed: 9, difficulty: 'normal' });
    for (const id of PERK_IDS) s.perks[id] = PERKS[id].max;
    recomputeMods(s);
    expect(openDraft(s)).toBe(false);
    expect(s.draft).toBeNull();
    expect(s.events.some((e) => e.type === 'perk_draft')).toBe(false);
  });
});
