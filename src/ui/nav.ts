// src/ui/nav.ts — OWNER: A4. Pure menu-navigation helpers (keys, focus order, value steps).
export type NavAction = 'up' | 'down' | 'left' | 'right' | 'activate' | 'back';

const KEY_ACTIONS: Record<string, NavAction> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'activate', NumpadEnter: 'activate', Space: 'activate', Escape: 'back',
};
/** While typing in a text field only these keys navigate; letters and Space belong to the field. */
const TEXT_FIELD_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Enter', 'NumpadEnter', 'Escape']);

export const SLIDER_STEP = 0.05;

export function keyToAction(code: string, inTextField = false): NavAction | null {
  const action = KEY_ACTIONS[code];
  if (!action) return null;
  if (inTextField && !TEXT_FIELD_KEYS.has(code)) return null;
  return action;
}

/** Next focus index in direction `dir`, wrapping and skipping disabled items. Returns `from` when nothing is enabled. */
export function moveFocus(from: number, dir: 1 | -1, enabled: readonly boolean[]): number {
  const n = enabled.length;
  if (n === 0) return -1;
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    if (enabled[i]) return i;
  }
  return from;
}

export function firstEnabled(enabled: readonly boolean[]): number {
  return enabled.findIndex((e) => e);
}

/** Slider value after one step, clamped to 0..1 and rounded so repeated steps never drift. */
export function stepValue(value: number, dir: 1 | -1, step = SLIDER_STEP): number {
  const next = Math.round((value + dir * step) * 100) / 100;
  return Math.min(1, Math.max(0, next));
}

/** Slider value for a pointer position (ratio 0..1 along the track), snapped to `step`. */
export function snapValue(ratio: number, step = SLIDER_STEP): number {
  const r = Math.min(1, Math.max(0, ratio));
  return Math.round(Math.round(r / step) * step * 100) / 100;
}

export function cycleOption<T>(options: readonly T[], current: T, dir: 1 | -1): T {
  const i = options.indexOf(current);
  const start = i < 0 ? 0 : i;
  return options[(start + dir + options.length) % options.length];
}
