// tests/qe.bank.test.ts — OWNER: E. Golden Corn and run counts across banks: a run banked in parts pays what one bank would.
import { describe, expect, it } from 'vitest';
import type { RunSummary } from '../src/shared/contracts';
import { NO_RUN } from '../src/ui/achievements';
import { createProfile, scoreBlocks, cornForRun } from '../src/ui/profile';
import { bankRun } from '../src/ui/profile-record';

const DATE = '2026-10-08T00:00:00.000Z';

function summary(over: Partial<RunSummary>): RunSummary {
  return { mode: 'campaign', victory: false, score: 0, maxCombo: 0, ...over } as unknown as RunSummary;
}

describe('score blocks', () => {
  it('counts whole 20 000-point blocks and nothing for negatives', () => {
    expect(scoreBlocks(0)).toBe(0);
    expect(scoreBlocks(19_999)).toBe(0);
    expect(scoreBlocks(20_000)).toBe(1);
    expect(scoreBlocks(59_999)).toBe(2);
    expect(scoreBlocks(-5)).toBe(0);
  });

  it('a run split in two banks pays the same score corn as one bank', () => {
    // Victory at 10 000, then endless to 25 000: one bank would pay floor(25 000 / 20 000) = 1.
    const whole = cornForRun({ corn: 0, score: 25_000, bossesKilled: 0 });
    const p = createProfile();
    bankRun(p, summary({ score: 10_000 }), { corn: 0, scoreBlocks: scoreBlocks(10_000) - 0, bosses: 0 }, NO_RUN, [], DATE);
    bankRun(p, summary({ score: 25_000 }), { corn: 0, scoreBlocks: scoreBlocks(25_000) - scoreBlocks(10_000), bosses: 0, first: false }, NO_RUN, [], DATE);
    expect(p.stats.cornEarned).toBe(whole);
    expect(whole).toBe(1);
  });
});

describe('run count', () => {
  it('a run that continues after victory is still one run', () => {
    const p = createProfile();
    bankRun(p, summary({ victory: true, score: 30_000 }), { corn: 2, scoreBlocks: 1, bosses: 1 }, NO_RUN, [], DATE);
    bankRun(p, summary({ score: 42_000 }), { corn: 1, scoreBlocks: 0, bosses: 0, first: false }, NO_RUN, [], DATE);
    expect(p.stats.runs).toBe(1);
    expect(p.stats.victories).toBe(1);
  });

  it('a bank without `first` counts as a run, as before', () => {
    const p = createProfile();
    bankRun(p, summary({ score: 5_000 }), { corn: 0, scoreBlocks: 0, bosses: 0 }, NO_RUN, [], DATE);
    expect(p.stats.runs).toBe(1);
  });
});

describe('achievements already unlocked live', () => {
  it('a pending unlock appears once in the reward, even when the profile has no record of it (no storage)', () => {
    const p = createProfile();
    const r = bankRun(
      p, summary({ maxCombo: 25 }), { corn: 0, scoreBlocks: 0, bosses: 0 }, { ...NO_RUN, maxCombo: 25 }, ['combo_25'], DATE,
    );
    expect(r.unlocked.filter((id) => id === 'combo_25')).toHaveLength(1);
    expect(r.achievementCorn).toBe(25);
  });
});
