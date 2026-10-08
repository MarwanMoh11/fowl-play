// src/input/input.ts — OWNER: A1 (touch wiring: D). Keyboard + mouse + touch → InputFrame (§7.2).
import type { Settings, View } from '../shared/contracts';
import type { InputFrame, Vec2 } from '../sim/types';
import { toLogical } from '../app/view';
import { createTouchControls } from './touch';

const POINTER_ACTIVATE_PX = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const FIRE = new Set(['Space', 'KeyZ', 'KeyJ']);
const MISSILE = new Set(['KeyX', 'KeyK']);
const OVERDRIVE = new Set(['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Enter', 'NumpadEnter', 'Space']);
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN, ...FIRE, ...MISSILE]);

export interface InputSystem {
  /** Builds this tick's frame and clears edge-triggered latches. */
  sample(view: View, settings: Settings): InputFrame;
  /** Clears held keys and latches (on pause/resume/new game). */
  reset(): void;
  /** Whether the game currently wants keys (prevents page scrolling on arrows/space). */
  setCapture(on: boolean): void;
}

export interface InputOptions {
  /** Ship position in logical px, or null when no run is active (touch steering anchors to it). */
  getShipPos?(): Vec2 | null;
  /** Which touch buttons can act right now (unavailable ones are dimmed). */
  getAvailability?(): { missile: boolean; overdrive: boolean };
  /** Pause button, and the portrait rotate hint while playing. */
  onPause?(): void;
}

function isFormTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName));
}

export function createInput(canvas: HTMLCanvasElement, opts: InputOptions = {}): InputSystem {
  const held = new Set<string>();
  let mouseFire = false;
  let missileLatch = false;
  let overdriveLatch = false;
  let skipLatch = false;
  let capture = false;
  let pointerActive = false;
  let client: Vec2 | null = null;   // last mouse position in client px
  let anchor: Vec2 | null = null;   // mouse position at the last keyboard-move press

  const touch = createTouchControls(canvas.parentElement ?? document.body, {
    getShipPos: () => opts.getShipPos?.() ?? null,
    getAvailability: () => opts.getAvailability?.() ?? { missile: false, overdrive: false },
    onPause: () => opts.onPause?.(),
  });

  function anyHeld(keys: Set<string>): boolean {
    for (const k of keys) if (held.has(k)) return true;
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (isFormTarget(e.target)) return;
    touch.releaseToMouse();
    if (capture && GAME_KEYS.has(e.code)) e.preventDefault();
    held.add(e.code);
    if (LEFT.has(e.code) || RIGHT.has(e.code) || UP.has(e.code) || DOWN.has(e.code)) {
      pointerActive = false;
      anchor = client ? { ...client } : null;
    }
    if (e.repeat) return;
    if (MISSILE.has(e.code)) missileLatch = true;
    if (OVERDRIVE.has(e.code)) overdriveLatch = true;
    if (CONFIRM.has(e.code)) skipLatch = true;
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouseFire = false;
  });
  const onMouseActivity = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') touch.releaseToMouse(); // hybrid devices: a real mouse takes over
  };
  window.addEventListener('pointerdown', onMouseActivity);
  window.addEventListener('pointermove', onMouseActivity);
  window.addEventListener('mousemove', (e) => {
    if (touch.ignoresMouse()) return; // compat event from a finger
    client = { x: e.clientX, y: e.clientY };
    if (pointerActive) return;
    if (!anchor) {
      anchor = { ...client };
      return;
    }
    if (Math.hypot(client.x - anchor.x, client.y - anchor.y) > POINTER_ACTIVATE_PX) pointerActive = true;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (touch.ignoresMouse()) return; // compat event from a finger: must not fire, skip or steer
    client = { x: e.clientX, y: e.clientY };
    if (e.button === 0) {
      mouseFire = true;
      skipLatch = true;
    } else if (e.button === 2) {
      missileLatch = true;
    } else if (e.button === 1) {
      e.preventDefault(); // no autoscroll
      overdriveLatch = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseFire = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    sample(view: View, settings: Settings): InputFrame {
      const moveX = (anyHeld(RIGHT) ? 1 : 0) - (anyHeld(LEFT) ? 1 : 0);
      const moveY = (anyHeld(DOWN) ? 1 : 0) - (anyHeld(UP) ? 1 : 0);
      const t = touch.sample();
      const mouse = settings.mouseControl && pointerActive && client && !touch.isTouchMode()
        ? toLogical(view, client.x, client.y)
        : null;
      const frame: InputFrame = {
        moveX,
        moveY,
        pointer: t.pointer ?? mouse,
        fire: settings.autoFire || mouseFire || anyHeld(FIRE) || t.fire,
        missile: missileLatch || t.missile,
        skip: skipLatch || t.tap,
        overdrive: overdriveLatch || t.overdrive,
      };
      missileLatch = false;
      skipLatch = false;
      overdriveLatch = false;
      return frame;
    },
    reset(): void {
      held.clear();
      mouseFire = false;
      missileLatch = false;
      skipLatch = false;
      overdriveLatch = false;
      touch.reset();
    },
    setCapture(on: boolean): void {
      capture = on;
      touch.setEnabled(on);
    },
  };
}
