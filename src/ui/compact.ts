// src/ui/compact.ts — OWNER: E. Touch and compact mode for the DOM menus.
// Sets `fp-compact` (menu layer shown small, or a coarse pointer) and `fp-touch` (coarse pointer) on the #ui root,
// plus --fp-k = 1 / on-screen scale, so compact sizes are written as calc(var(--fp-k) * Npx) and come out N CSS px on screen.
export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;
/** Below this on-screen scale the menus use the compact layout, whatever the pointer. */
export const COMPACT_SCALE = 0.75;

export interface CompactState {
  /** On-screen scale of the 1280x720 menu layer (the same number view.ts applies). */
  scale: number;
  /** Compact layout: larger tap targets, fewer columns, screens scroll. */
  compact: boolean;
  /** Coarse pointer: touch wording instead of keyboard and mouse wording. */
  touch: boolean;
}

export function menuScale(innerWidth: number, innerHeight: number): number {
  return Math.max(0.01, Math.min(innerWidth / LOGICAL_W, innerHeight / LOGICAL_H));
}

export function compactState(innerWidth: number, innerHeight: number, coarse: boolean): CompactState {
  const scale = menuScale(innerWidth, innerHeight);
  return { scale, compact: coarse || scale < COMPACT_SCALE, touch: coarse };
}

let state: CompactState = { scale: 1, compact: false, touch: false };

/** Touch wording is chosen when a screen is built, so screens read this at build time. */
export function isTouchUi(): boolean {
  return state.touch;
}

/** Compact layout flag, read when a screen is built or focused. */
export function isCompactUi(): boolean {
  return state.compact;
}

/** Keeps the #ui root in step with the window size and the pointer type. Returns a function that removes the listeners. */
export function attachCompact(root: HTMLElement): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia('(pointer: coarse)');
  const apply = (): void => {
    state = compactState(window.innerWidth, window.innerHeight, mq.matches);
    root.classList.toggle('fp-compact', state.compact);
    root.classList.toggle('fp-touch', state.touch);
    root.style.setProperty('--fp-k', String(1 / state.scale));
  };
  apply();
  window.addEventListener('resize', apply);
  mq.addEventListener?.('change', apply);
  return () => {
    window.removeEventListener('resize', apply);
    mq.removeEventListener?.('change', apply);
  };
}
