// src/input/touch-layout.ts — OWNER: D. Pure placement of the touch buttons (side margins, else over the corners).

/** Minimum touch target, CSS px. */
export const TOUCH_BUTTON_PX = 56;
const EDGE_PX = 8;
const GAP_PX = 10;

export interface Insets { top: number; right: number; bottom: number; left: number }

export interface ButtonBox { x: number; y: number; size: number } // CSS px, viewport coordinates

export interface TouchLayoutInput {
  viewW: number;      // visible viewport, CSS px
  viewH: number;
  offsetX: number;    // letterboxed game rectangle (computeView)
  cssWidth: number;
  safe: Insets;       // env(safe-area-inset-*)
}

export interface TouchLayout {
  /** true when the buttons sit fully in a side margin; false when they overlay the game corners. */
  inMargin: boolean;
  pause: ButtonBox;
  overdrive: ButtonBox;
  missile: ButtonBox;
}

/**
 * Buttons go in the wider side margin when it fits one button column plus edges; otherwise they stack
 * in the right-hand corners over the game (Pause top, Missile and Overdrive bottom).
 */
export function layoutTouchButtons(l: TouchLayoutInput): TouchLayout {
  const size = TOUCH_BUTTON_PX;
  const leftFree = l.offsetX - l.safe.left;
  const rightFree = l.viewW - (l.offsetX + l.cssWidth) - l.safe.right;
  const onRight = rightFree >= leftFree;
  const inMargin = Math.max(leftFree, rightFree) >= size + 2 * EDGE_PX;
  const x = onRight ? l.viewW - l.safe.right - EDGE_PX - size : l.safe.left + EDGE_PX;
  const top = l.safe.top + EDGE_PX;
  const bottom = l.viewH - l.safe.bottom - EDGE_PX - size;
  return {
    inMargin,
    pause: { x, y: top, size },
    overdrive: { x, y: bottom, size },
    missile: { x, y: bottom - GAP_PX - size, size },
  };
}
