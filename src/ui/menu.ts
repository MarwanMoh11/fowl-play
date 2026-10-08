// src/ui/menu.ts — OWNER: H4 (from A4). Keyboard + mouse focus handling for one screen's items (§8.7 Navigation).
import type { AudioSystem } from '../shared/contracts';
import { firstEnabled, keyToAction, moveFocus } from './nav';
import type { MenuItem } from './widgets';

export interface MenuOpts {
  audio: AudioSystem;
  /** Esc (and `backKeys`) call this. */
  onBack?: () => void;
  /** Extra key codes that act as Back on this screen (e.g. KeyP on the pause menu). */
  backKeys?: readonly string[];
  /** Return false to ignore activation (accidental-click guard on end screens). */
  canActivate?: () => boolean;
  /** Screen-specific keys, tried first. Return true when the key was used (e.g. 1/2/3 on the draft). */
  onKey?: (e: KeyboardEvent) => boolean;
}

export interface Menu {
  readonly items: readonly MenuItem[];
  index(): number;
  focus(i: number, silent?: boolean): void;
  focusFirst(): void;
  /** Activates item i as if it had been clicked (respects the guard and disabled items). */
  activate(i: number): void;
  /** Returns true when the key was consumed. */
  handleKey(e: KeyboardEvent): boolean;
}

/** Clicks closer together than this are one click (see the click handler). Shared by every menu on the page. */
export const CLICK_GUARD_MS = 300;
let lastClickAt = Number.NEGATIVE_INFINITY;

export function createMenu(items: readonly MenuItem[], opts: MenuOpts): Menu {
  let index = -1;
  const enabled = (): boolean[] => items.map((it) => !it.disabled);

  function focus(i: number, silent = false): void {
    if (i < 0 || i >= items.length || i === index) return;
    index = i;
    items.forEach((it, k) => it.el.classList.toggle('is-focused', k === i));
    items[i].el.focus({ preventScroll: true });
    if (items[i].text) (items[i].el as Partial<HTMLInputElement>).select?.();
    if (!silent) opts.audio.ui('move');
  }

  function activate(i: number): void {
    const it = items[i];
    if (!it?.activate || it.disabled) return;
    if (opts.canActivate && !opts.canActivate()) return;
    if (!it.text) opts.audio.ui('select');
    it.activate();
  }

  function adjust(i: number, dir: -1 | 1): void {
    const it = items[i];
    if (!it?.adjust || it.disabled) return;
    it.adjust(dir);
    opts.audio.ui(it.adjustSound ?? 'move');
  }

  function back(): void {
    if (!opts.onBack) return;
    if (opts.canActivate && !opts.canActivate()) return;
    opts.audio.ui('back');
    opts.onBack();
  }

  items.forEach((it, i) => {
    // Touch taps also send mouse-style enter events; hover focus is for mice only, so a tap does not play two sounds.
    it.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && !it.disabled) focus(i);
    });
    it.el.addEventListener('focus', () => focus(i, true));
    it.el.addEventListener('click', () => {
      opts.audio.unlock();
      // A double click or double tap sends a second click that lands on the screen the first one rebuilt
      // (a hangar row bought twice, a score table cleared). One click per CLICK_GUARD_MS.
      const now = performance.now();
      if (now - lastClickAt < CLICK_GUARD_MS) return;
      lastClickAt = now;
      focus(i, true);
      // Clicking a text field only focuses it; its activate() is the save action, which Enter triggers.
      if (!it.text) activate(i);
    });
  });

  function handleKey(e: KeyboardEvent): boolean {
    if (opts.onKey?.(e)) return true;
    const inText = items[index]?.text === true;
    const action = opts.backKeys?.includes(e.code) && !inText ? 'back' : keyToAction(e.code, inText);
    if (!action) return false;
    if (action === 'up' || action === 'down') {
      focus(moveFocus(index, action === 'down' ? 1 : -1, enabled()));
    } else if (action === 'left' || action === 'right') {
      adjust(index, action === 'right' ? 1 : -1);
    } else if (e.repeat) {
      return true; // holding Enter/Space/Esc must not re-trigger
    } else if (action === 'activate') {
      activate(index);
    } else {
      back();
    }
    return true;
  }

  return {
    items,
    index: () => index,
    focus,
    focusFirst: () => focus(firstEnabled(enabled()), true),
    activate,
    handleKey,
  };
}
