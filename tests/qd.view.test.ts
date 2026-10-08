// tests/qd.view.test.ts — OWNER: D. Backing-store DPR caps and pillarbox placement of the touch buttons.
import { describe, expect, it } from 'vitest';
import { MAX_BACKING_H, MAX_BACKING_W, MAX_DPR, capDpr, computeView } from '../src/app/view';
import { TOUCH_BUTTON_PX, layoutTouchButtons, type Insets } from '../src/input/touch-layout';

const NO_SAFE: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

describe('computeView DPR cap', () => {
  it('caps the device pixel ratio at 2 and keeps letterbox geometry', () => {
    const v = computeView(1280, 720, 3);
    expect(v.dpr).toBe(MAX_DPR);
    expect(v.backingWidth).toBe(2560);
    expect(v.backingHeight).toBe(1440);
    expect(v.scale).toBeCloseTo(2);
    expect(v.cssWidth).toBe(1280);
    expect(v.offsetX).toBe(0);
  });

  it('leaves ratios at or below the cap untouched', () => {
    const v = computeView(1280, 720, 1.5);
    expect(v.dpr).toBe(1.5);
    expect(v.backingWidth).toBe(1920);
  });

  it('keeps the backing store within 2560×1440 on large screens', () => {
    const v = computeView(3840, 2160, 2);
    expect(v.backingWidth).toBeLessThanOrEqual(MAX_BACKING_W);
    expect(v.backingHeight).toBeLessThanOrEqual(MAX_BACKING_H);
    expect(v.dpr).toBeLessThan(1); // 4K at 1× is scaled down to fit the cap
    expect(v.cssScale).toBeCloseTo(3);
  });

  it('a phone in landscape gets the 2× cap, with the same letterbox as an uncapped ratio', () => {
    const capped = computeView(844, 390, 3);
    const plain = computeView(844, 390, 2);
    expect(capped.dpr).toBe(2);
    expect(capped.backingWidth).toBe(plain.backingWidth);
    expect(capped.offsetX).toBe(plain.offsetX);
    expect(capped.offsetY).toBe(plain.offsetY);
    expect(capped.cssWidth).toBe(plain.cssWidth);
  });

  it('capDpr clamps invalid ratios to 1 and never raises the ratio', () => {
    expect(capDpr(Number.NaN, 1)).toBe(1);
    expect(capDpr(0, 1)).toBe(1);
    expect(capDpr(1, 1)).toBe(1);
    expect(capDpr(4, 1)).toBe(2);
  });
});

describe('layoutTouchButtons placement', () => {
  it('a 16:9 window has no pillarbox, so the buttons overlay the right-hand corners', () => {
    const v = computeView(1280, 720, 1);
    const l = layoutTouchButtons({ viewW: 1280, viewH: 720, offsetX: v.offsetX, cssWidth: v.cssWidth, safe: NO_SAFE });
    expect(l.inMargin).toBe(false);
    expect(l.pause.x + l.pause.size).toBeLessThanOrEqual(1280);
    expect(l.pause.y).toBeLessThan(l.missile.y);
  });

  it('a phone wider than 16:9 puts all three buttons in the right pillarbox', () => {
    const v = computeView(844, 390, 2); // 844×390 landscape phone
    const l = layoutTouchButtons({ viewW: 844, viewH: 390, offsetX: v.offsetX, cssWidth: v.cssWidth, safe: NO_SAFE });
    expect(l.inMargin).toBe(true);
    const gameRight = v.offsetX + v.cssWidth;
    for (const b of [l.pause, l.overdrive, l.missile]) {
      expect(b.size).toBeGreaterThanOrEqual(56);
      expect(b.size).toBe(TOUCH_BUTTON_PX);
      expect(b.x).toBeGreaterThanOrEqual(gameRight);
      expect(b.x + b.size).toBeLessThanOrEqual(844);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.size).toBeLessThanOrEqual(390);
    }
  });

  it('buttons stack without overlapping: pause top, missile above overdrive at the bottom', () => {
    const v = computeView(844, 390, 2);
    const l = layoutTouchButtons({ viewW: 844, viewH: 390, offsetX: v.offsetX, cssWidth: v.cssWidth, safe: NO_SAFE });
    expect(l.pause.y + l.pause.size).toBeLessThanOrEqual(l.missile.y);
    expect(l.missile.y + l.missile.size).toBeLessThanOrEqual(l.overdrive.y);
    expect(l.overdrive.y + l.overdrive.size).toBeLessThanOrEqual(390);
  });

  it('a 4:3 window has no margin, so the buttons sit over the corners', () => {
    const v = computeView(1024, 768, 1);
    const l = layoutTouchButtons({ viewW: 1024, viewH: 768, offsetX: v.offsetX, cssWidth: v.cssWidth, safe: NO_SAFE });
    expect(l.inMargin).toBe(false);
    expect(l.overdrive.x + l.overdrive.size).toBeLessThanOrEqual(1024);
  });

  it('a notch on the right moves the column to the roomier left margin', () => {
    const v = computeView(844, 390, 2);
    const notch: Insets = { top: 0, right: 47, bottom: 0, left: 0 };
    const l = layoutTouchButtons({ viewW: 844, viewH: 390, offsetX: v.offsetX, cssWidth: v.cssWidth, safe: notch });
    expect(l.inMargin).toBe(true);
    expect(l.pause.x).toBe(notch.left + 8);
    expect(l.pause.x + l.pause.size).toBeLessThanOrEqual(v.offsetX);
  });

  it('safe-area insets keep the buttons clear of the top and bottom edges', () => {
    const v = computeView(932, 430, 2);
    const safe: Insets = { top: 20, right: 0, bottom: 21, left: 0 };
    const l = layoutTouchButtons({ viewW: 932, viewH: 430, offsetX: v.offsetX, cssWidth: v.cssWidth, safe });
    expect(l.pause.y).toBe(safe.top + 8);
    expect(l.overdrive.y + l.overdrive.size).toBe(430 - safe.bottom - 8);
  });
});
