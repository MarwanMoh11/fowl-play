// src/ui/menu.ts — OWNER: A4. Keyboard + mouse focus handling for one screen's items (§8.7 Navigation).
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
}

export interface Menu {
  readonly items: readonly MenuItem[];
  index(): number;
  focus(i: number, silent?: boolean): void;
  focusFirst(): void;
  /** Returns true when the key was consumed. */
  handleKey(e: KeyboardEvent): boolean;
}

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
    it.el.addEventListener('mouseenter', () => {
      if (!it.disabled) focus(i);
    });
    it.el.addEventListener('focus', () => focus(i, true));
    it.el.addEventListener('click', () => {
      opts.audio.unlock();
      focus(i, true);
      activate(i);
    });
  });

  function handleKey(e: KeyboardEvent): boolean {
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
    handleKey,
  };
}
