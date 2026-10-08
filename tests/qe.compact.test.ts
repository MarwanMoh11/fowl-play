// tests/qe.compact.test.ts — OWNER: E. Compact and touch mode: scale and flags from the window, and the touch wording.
import { describe, expect, it } from 'vitest';
import { compactState, COMPACT_SCALE, isTouchUi, menuScale } from '../src/ui/compact';
import { COMBO_NOTES, comboNotes } from '../src/ui/screens/howto-pages';
import { TOUCH_CONTROL_ROWS } from '../src/ui/screens/howto';
import { CONTROLS_SUMMARY, TOUCH_CONTROLS_SUMMARY } from '../src/ui/screens/title';

describe('menu scale', () => {
  it('is the letterbox scale of the 1280x720 layer, limited by the tighter side', () => {
    expect(menuScale(1280, 720)).toBe(1);
    expect(menuScale(844, 390)).toBeCloseTo(390 / 720, 6);
    expect(menuScale(640, 1440)).toBeCloseTo(0.5, 6);
  });

  it('never returns zero, so the CSS variable 1 / scale stays finite', () => {
    expect(Number.isFinite(1 / menuScale(0, 0))).toBe(true);
  });
});

describe('compact and touch flags', () => {
  it('a desktop window at full size keeps the desktop layout and keyboard wording', () => {
    const s = compactState(1280, 720, false);
    expect(s.compact).toBe(false);
    expect(s.touch).toBe(false);
  });

  it('a phone in landscape (small on-screen scale) gets the compact layout', () => {
    const s = compactState(844, 390, false);
    expect(s.scale).toBeLessThan(COMPACT_SCALE);
    expect(s.compact).toBe(true);
    expect(s.touch).toBe(false);
  });

  it('a coarse pointer gets compact and touch, whatever the size', () => {
    const s = compactState(1920, 1080, true);
    expect(s.compact).toBe(true);
    expect(s.touch).toBe(true);
  });

  it('a small desktop window counts as compact, but keeps keyboard wording', () => {
    const s = compactState(900, 600, false);
    expect(s.compact).toBe(true);
    expect(s.touch).toBe(false);
  });

  it('touch wording is off until attachCompact runs (node has no window)', () => {
    expect(isTouchUi()).toBe(false);
  });
});

describe('touch wording', () => {
  it('the combo notes name the on-screen overdrive button on touch and keep the keys otherwise', () => {
    expect(comboNotes(false)).toBe(COMBO_NOTES);
    const touch = comboNotes(true).join(' ');
    expect(touch).toContain('tap the OVERDRIVE button');
    expect(touch).not.toContain('press C, L or Shift');
  });

  it('the touch control rows each name an action and how to do it on a phone', () => {
    expect(TOUCH_CONTROL_ROWS.length).toBeGreaterThan(0);
    for (const [action, how] of TOUCH_CONTROL_ROWS) {
      expect(action.length).toBeGreaterThan(0);
      expect(how.length).toBeGreaterThan(0);
    }
  });

  it('the title summary has a touch version with no keyboard keys', () => {
    expect(TOUCH_CONTROLS_SUMMARY).not.toMatch(/Space|Esc|WASD|click/);
    expect(CONTROLS_SUMMARY).toMatch(/Esc/);
  });
});
