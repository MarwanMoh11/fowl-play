// src/input/touch.ts — OWNER: D. Touch DOM: Pointer Events → TouchSteering, on-screen buttons, rotate hint, landscape request.
import type { Vec2 } from '../sim/types';
import { SHIP_SPAWN } from '../sim/tuning/core';
import { currentView, observeViewport, toLogical, viewportSize } from '../app/view';
import { layoutTouchButtons, type ButtonBox, type Insets } from './touch-layout';
import { TouchSteering, type TouchFrame, type TouchTarget } from './touch-map';

/** Compat mouse events trail a touch by a few hundred ms; ignore them so a tap can't also fire or steer. */
const GHOST_MOUSE_MS = 700;

type ButtonKind = 'missile' | 'overdrive' | 'pause';

const ICONS: Record<ButtonKind, string> = {
  missile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l4 7v9l-4 4-4-4V9z"/></svg>',
  overdrive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
};
const LABELS: Record<ButtonKind, string> = { missile: 'Missile', overdrive: 'Overdrive', pause: 'Pause' };

export interface TouchOptions {
  /** Ship position in logical px, or null when no run is active. */
  getShipPos(): Vec2 | null;
  /** Which of the two action buttons can fire right now (unavailable ones are dimmed). */
  getAvailability(): { missile: boolean; overdrive: boolean };
  onPause(): void;
}

export interface TouchControls {
  /** The game is running: the play area steers and the buttons may show. */
  setEnabled(on: boolean): void;
  /** A mouse or key was used: hide the buttons until the next touch. */
  releaseToMouse(): void;
  isTouchMode(): boolean;
  /** True within a short window after a touch, when compat mouse events must be ignored. */
  ignoresMouse(): boolean;
  /** Builds this tick's touch frame and clears its latches. */
  sample(): TouchFrame;
  reset(): void;
}

let landscapeAsked = false;

/**
 * First Start tap on a coarse-pointer device: go fullscreen and lock landscape where the browser allows it.
 * Best effort; iOS Safari supports neither, and every rejection is swallowed.
 */
export function requestLandscapePlay(): void {
  if (landscapeAsked || !matchMedia('(pointer: coarse)').matches) return;
  landscapeAsked = true;
  const lock = (): void => {
    try {
      // lock() is missing from some TypeScript DOM typings, so it is feature-detected here.
      const orientation = screen.orientation as (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined;
      orientation?.lock?.('landscape')?.catch(() => {});
    } catch {
      /* not supported */
    }
  };
  try {
    const entering = document.documentElement.requestFullscreen?.();
    if (entering) entering.then(lock, lock);
    else lock();
  } catch {
    lock();
  }
}

/** Creates the touch layer inside the stage: play-area steering, pause/missile/overdrive buttons, rotate hint. */
export function createTouchControls(stage: HTMLElement, opts: TouchOptions): TouchControls {
  const steer = new TouchSteering();
  let enabled = false;
  let touchMode = false;      // the last input was a finger: buttons show
  let lastTouchAt = -Infinity;
  let dismissed = false;      // "keep playing in portrait" for the current portrait stretch
  let shownAvail = -1;        // cache for the dimmed-button state

  const buttons: Record<ButtonKind, HTMLButtonElement> = {
    missile: makeButton('missile'),
    overdrive: makeButton('overdrive'),
    pause: makeButton('pause'),
  };

  const rotate = document.createElement('div');
  rotate.className = 'qd-rotate';
  rotate.hidden = true;
  rotate.innerHTML =
    '<div class="qd-rotate-phone" aria-hidden="true"></div>' +
    '<p class="qd-rotate-title">Rotate your device</p>' +
    '<p class="qd-rotate-sub">Fowl Play is played in landscape.</p>' +
    '<button type="button" class="qd-rotate-skip">Keep playing in portrait</button>';
  rotate.querySelector('button')?.addEventListener('click', () => {
    dismissed = true;
    refreshOrientation();
  });
  stage.appendChild(rotate);

  function makeButton(kind: ButtonKind): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qd-btn';
    b.dataset.touch = kind;
    b.setAttribute('aria-label', LABELS[kind]);
    b.innerHTML = ICONS[kind];
    b.hidden = true;
    stage.appendChild(b);
    return b;
  }

  function buttonAt(t: EventTarget | null): TouchTarget {
    const el = t instanceof Element ? t.closest('[data-touch]') : null;
    const k = el instanceof HTMLElement ? el.dataset.touch : undefined;
    return k === 'missile' || k === 'overdrive' || k === 'pause' ? k : 'field';
  }

  function toField(e: PointerEvent): Vec2 {
    return toLogical(currentView(), e.clientX, e.clientY);
  }

  function setButtonsVisible(): void {
    const show = enabled && touchMode;
    for (const kind of Object.keys(buttons) as ButtonKind[]) buttons[kind].hidden = !show;
  }

  function updateAvail(a: { missile: boolean; overdrive: boolean }): void {
    const key = (a.missile ? 1 : 0) | (a.overdrive ? 2 : 0);
    if (key === shownAvail) return;
    shownAvail = key;
    buttons.missile.classList.toggle('off', !a.missile);
    buttons.overdrive.classList.toggle('off', !a.overdrive);
  }

  /** env(safe-area-inset-*) read back through a probe, since JS cannot read env() directly. */
  function readSafe(vw: number, vh: number): Insets {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      'top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);' +
      'bottom:env(safe-area-inset-bottom,0px);left:env(safe-area-inset-left,0px)';
    stage.appendChild(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    return {
      top: Math.max(0, r.top),
      left: Math.max(0, r.left),
      right: Math.max(0, vw - r.right),
      bottom: Math.max(0, vh - r.bottom),
    };
  }

  function place(el: HTMLButtonElement, box: ButtonBox, over: boolean): void {
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.size}px`;
    el.style.height = `${box.size}px`;
    el.classList.toggle('qd-over', over);
  }

  function relayout(): void {
    const vp = viewportSize();
    const v = currentView();
    const l = layoutTouchButtons({
      viewW: vp.width,
      viewH: vp.height,
      offsetX: v.offsetX,
      cssWidth: v.cssWidth,
      safe: readSafe(vp.width, vp.height),
    });
    place(buttons.pause, l.pause, !l.inMargin);
    place(buttons.overdrive, l.overdrive, !l.inMargin);
    place(buttons.missile, l.missile, !l.inMargin);
  }

  /** Portrait on a phone: show the rotate hint and pause the run behind it. */
  function refreshOrientation(): void {
    const vp = viewportSize();
    const portrait = vp.height > vp.width;
    if (!portrait) dismissed = false;
    const show = portrait && !dismissed && matchMedia('(pointer: coarse)').matches;
    rotate.hidden = !show;
    if (show && enabled) opts.onPause();
  }

  function onViewport(): void {
    relayout();
    refreshOrientation();
  }
  observeViewport(onViewport);
  onViewport();

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    lastTouchAt = performance.now();
    if (!touchMode) {
      touchMode = true;
      setButtonsVisible();
    }
    if (!enabled) return;
    e.preventDefault(); // no focus, no compat mouse events, no text selection
    const target = buttonAt(e.target);
    if (target === 'pause') {
      opts.onPause();
      return;
    }
    steer.down(e.pointerId, toField(e), opts.getShipPos() ?? SHIP_SPAWN, target);
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && enabled) steer.move(e.pointerId, toField(e));
  });
  const release = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    lastTouchAt = performance.now();
    steer.up(e.pointerId);
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('contextmenu', (e) => e.preventDefault()); // long-press menu on Android
  // Pinch and multi-finger scroll stay off while playing; menus keep normal touch behaviour.
  stage.addEventListener('touchmove', (e) => {
    if (enabled || e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false }); // iOS pinch zoom
  }

  return {
    setEnabled(on: boolean): void {
      enabled = on;
      if (!on) steer.reset();
      setButtonsVisible();
    },
    releaseToMouse(): void {
      if (!touchMode) return;
      touchMode = false;
      setButtonsVisible();
    },
    isTouchMode(): boolean {
      return touchMode;
    },
    ignoresMouse(): boolean {
      return performance.now() - lastTouchAt < GHOST_MOUSE_MS;
    },
    sample(): TouchFrame {
      if (enabled) updateAvail(opts.getAvailability());
      return steer.frame(opts.getShipPos() ?? SHIP_SPAWN);
    },
    reset(): void {
      steer.reset();
    },
  };
}
