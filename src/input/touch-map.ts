// src/input/touch-map.ts — OWNER: D. Pure touch → InputFrame steering (no DOM, unit-tested).
import type { Vec2 } from '../sim/types';

/** Ship travel per finger px. Relative drag: the finger never covers the ship. */
export const TOUCH_SENSITIVITY = 1.35;

/** What a finger landed on: the play area (steers and fires) or one of the touch buttons. */
export type TouchTarget = 'field' | 'missile' | 'overdrive' | 'pause';

export interface TouchFrame {
  pointer: Vec2 | null;  // ship target while a steering finger is down, else null
  fire: boolean;         // held while any finger rests on the play area
  tap: boolean;          // true only on the tick a play-area finger went down (skip latch)
  missile: boolean;      // true only on the tick the missile button was pressed
  overdrive: boolean;    // true only on the tick the overdrive button was pressed
}

/**
 * Turns Pointer Events (already converted to logical px) into a ship target.
 * The first play-area finger steers: target = ship position at touch start + finger delta × sensitivity.
 * When it lifts, the next finger takes over, re-anchored at the ship's current position so nothing jumps.
 */
export class TouchSteering {
  private readonly fingers = new Map<number, Vec2>(); // play-area fingers, logical px
  private steer: number | null = null;                // id of the finger that moves the ship
  private anchorFinger: Vec2 = { x: 0, y: 0 };
  private anchorShip: Vec2 = { x: 0, y: 0 };
  private tap = false;
  private missile = false;
  private overdrive = false;

  /** A finger went down. `ship` is the ship's current position (logical px). */
  down(id: number, p: Vec2, ship: Vec2, target: TouchTarget): void {
    if (target === 'missile') {
      this.missile = true;
      return;
    }
    if (target === 'overdrive') {
      this.overdrive = true;
      return;
    }
    if (target === 'pause') return; // the caller handles pause; buttons never steer
    this.fingers.set(id, { x: p.x, y: p.y });
    this.tap = true;
    if (this.steer === null) this.anchor(id, p, ship);
  }

  move(id: number, p: Vec2): void {
    if (this.fingers.has(id)) this.fingers.set(id, { x: p.x, y: p.y });
  }

  up(id: number): void {
    this.fingers.delete(id);
    if (id === this.steer) this.steer = null; // frame() promotes the next finger
  }

  /** Forgets every finger and latch (pause, resume, new game). */
  reset(): void {
    this.fingers.clear();
    this.steer = null;
    this.tap = false;
    this.missile = false;
    this.overdrive = false;
  }

  /** Builds this tick's frame and clears the edge-triggered latches. */
  frame(ship: Vec2): TouchFrame {
    if (this.steer === null) {
      const next = this.fingers.entries().next();
      if (!next.done) this.anchor(next.value[0], next.value[1], ship);
    }
    const p = this.steer === null ? undefined : this.fingers.get(this.steer);
    const out: TouchFrame = {
      pointer: p
        ? {
            x: this.anchorShip.x + (p.x - this.anchorFinger.x) * TOUCH_SENSITIVITY,
            y: this.anchorShip.y + (p.y - this.anchorFinger.y) * TOUCH_SENSITIVITY,
          }
        : null,
      fire: this.fingers.size > 0,
      tap: this.tap,
      missile: this.missile,
      overdrive: this.overdrive,
    };
    this.tap = false;
    this.missile = false;
    this.overdrive = false;
    return out;
  }

  private anchor(id: number, p: Vec2, ship: Vec2): void {
    this.steer = id;
    this.anchorFinger = { x: p.x, y: p.y };
    this.anchorShip = { x: ship.x, y: ship.y };
  }
}
