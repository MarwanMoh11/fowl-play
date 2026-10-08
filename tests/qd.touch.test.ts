// tests/qd.touch.test.ts — OWNER: D. Pure touch steering: relative drag, multi-touch, buttons, taps.
import { describe, expect, it } from 'vitest';
import { TOUCH_SENSITIVITY, TouchSteering } from '../src/input/touch-map';

const S = TOUCH_SENSITIVITY;
const SHIP = { x: 640, y: 500 };

describe('touch steering: relative drag', () => {
  it('moves the ship target by finger delta × sensitivity, anchored at the ship position at touch start', () => {
    const s = new TouchSteering();
    s.down(1, { x: 300, y: 300 }, SHIP, 'field');
    s.move(1, { x: 400, y: 260 });
    // The ship has moved since touch start; the anchor must not follow it.
    const f = s.frame({ x: 900, y: 600 });
    expect(f.pointer).toEqual({ x: SHIP.x + 100 * S, y: SHIP.y - 40 * S });
  });

  it('a finger that does not move leaves the ship target where the ship was', () => {
    const s = new TouchSteering();
    s.down(1, { x: 300, y: 300 }, SHIP, 'field');
    expect(s.frame(SHIP).pointer).toEqual(SHIP);
  });

  it('fires while a finger rests on the play area and taps once per touch', () => {
    const s = new TouchSteering();
    s.down(1, { x: 300, y: 300 }, SHIP, 'field');
    const first = s.frame(SHIP);
    expect(first.fire).toBe(true);
    expect(first.tap).toBe(true);
    const second = s.frame(SHIP);
    expect(second.fire).toBe(true);
    expect(second.tap).toBe(false);
    s.up(1);
    const after = s.frame(SHIP);
    expect(after.fire).toBe(false);
    expect(after.pointer).toBeNull();
  });

  it('reports no steering and no fire with no fingers', () => {
    const f = new TouchSteering().frame(SHIP);
    expect(f).toEqual({ pointer: null, fire: false, tap: false, missile: false, overdrive: false });
  });
});

describe('touch steering: multi-touch', () => {
  it('a second play-area finger does not move the ship, then takes over without a jump when the first lifts', () => {
    const s = new TouchSteering();
    s.down(1, { x: 300, y: 300 }, SHIP, 'field');
    s.down(2, { x: 800, y: 300 }, SHIP, 'field');
    s.move(2, { x: 900, y: 300 });
    const held = s.frame(SHIP);
    expect(held.pointer).toEqual(SHIP);
    expect(held.fire).toBe(true);

    s.up(1);
    const handover = { x: 700, y: 480 };
    expect(s.frame(handover).pointer).toEqual(handover); // re-anchored at the ship's current position
    s.move(2, { x: 920, y: 300 });
    expect(s.frame(handover).pointer).toEqual({ x: 700 + 20 * S, y: 480 });
  });

  it('lifting every finger stops steering', () => {
    const s = new TouchSteering();
    s.down(1, { x: 300, y: 300 }, SHIP, 'field');
    s.down(2, { x: 800, y: 300 }, SHIP, 'field');
    s.up(1);
    s.up(2);
    const f = s.frame(SHIP);
    expect(f.pointer).toBeNull();
    expect(f.fire).toBe(false);
  });
});

describe('touch steering: buttons never move the ship', () => {
  it('a missile press latches once, steers nothing, and ignores a drag that starts on it', () => {
    const s = new TouchSteering();
    s.down(3, { x: 1200, y: 600 }, SHIP, 'missile');
    const f = s.frame(SHIP);
    expect(f.missile).toBe(true);
    expect(f.pointer).toBeNull();
    expect(f.fire).toBe(false);
    expect(f.tap).toBe(false);
    s.move(3, { x: 300, y: 300 });
    expect(s.frame(SHIP).pointer).toBeNull();
    expect(s.frame(SHIP).missile).toBe(false);
  });

  it('an overdrive press during a drag leaves the steering finger in control', () => {
    const s = new TouchSteering();
    s.down(1, { x: 300, y: 300 }, SHIP, 'field');
    s.down(2, { x: 1200, y: 600 }, SHIP, 'overdrive');
    const f = s.frame(SHIP);
    expect(f.overdrive).toBe(true);
    expect(f.pointer).toEqual(SHIP);
    expect(f.tap).toBe(true); // only the play-area touch counts as a tap
  });

  it('the pause target produces no steering, fire or tap of its own', () => {
    const s = new TouchSteering();
    s.down(4, { x: 1200, y: 40 }, SHIP, 'pause');
    expect(s.frame(SHIP)).toEqual({ pointer: null, fire: false, tap: false, missile: false, overdrive: false });
  });
});

describe('touch steering: taps and reset', () => {
  it('a tap on the play area yields one skip (tap) latch', () => {
    const s = new TouchSteering();
    s.down(5, { x: 640, y: 360 }, SHIP, 'field');
    s.up(5);
    expect(s.frame(SHIP).tap).toBe(true);
    expect(s.frame(SHIP).tap).toBe(false);
  });

  it('reset forgets fingers and pending latches', () => {
    const s = new TouchSteering();
    s.down(1, { x: 300, y: 300 }, SHIP, 'field');
    s.down(2, { x: 1200, y: 600 }, SHIP, 'missile');
    s.reset();
    expect(s.frame(SHIP)).toEqual({ pointer: null, fire: false, tap: false, missile: false, overdrive: false });
  });
});
