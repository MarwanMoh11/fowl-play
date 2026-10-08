// tests/qe.menu.test.ts — OWNER: E. Menu click guard, text fields and hover-by-mouse-only, on a fake element (node env, no DOM).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AudioSystem } from '../src/shared/contracts';
import { createMenu, CLICK_GUARD_MS } from '../src/ui/menu';
import type { MenuItem } from '../src/ui/widgets';

type Listener = (e: { pointerType?: string }) => void;

/** Just enough of an HTMLElement for createMenu: listeners, classList, focus. */
function fakeEl() {
  const listeners: Record<string, Listener[]> = {};
  return {
    classList: { toggle: (): boolean => false },
    addEventListener(type: string, fn: Listener): void {
      (listeners[type] ??= []).push(fn);
    },
    focus: (): void => {},
    fire(type: string, ev: { pointerType?: string } = {}): void {
      for (const fn of listeners[type] ?? []) fn(ev);
    },
  };
}

const audio = { ui: (): void => {}, unlock: (): void => {} } as unknown as AudioSystem;
const key = (code: string): KeyboardEvent => ({ code, repeat: false, preventDefault() {}, stopPropagation() {} }) as unknown as KeyboardEvent;

function item(over: Partial<MenuItem> = {}): { it: MenuItem; el: ReturnType<typeof fakeEl> } {
  const el = fakeEl();
  return { it: { el: el as unknown as HTMLElement, activate: () => {}, ...over }, el };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('click guard', () => {
  it('a double click activates once; a second click after the guard activates again', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(100_000);
    let hits = 0;
    const { it: a, el } = item({ activate: () => { hits += 1; } });
    createMenu([a], { audio });
    el.fire('click');
    now.mockReturnValue(100_000 + CLICK_GUARD_MS / 2);
    el.fire('click'); // the second click of a double click lands on the rebuilt screen
    expect(hits).toBe(1);
    now.mockReturnValue(100_000 + CLICK_GUARD_MS + 50);
    el.fire('click');
    expect(hits).toBe(2);
  });

  it('a click that rebuilt the screen cannot reach a button on the new screen', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(200_000);
    let buy = 0;
    const first = item({ activate: () => {} });
    createMenu([first.it], { audio });
    first.el.fire('click');
    const second = item({ activate: () => { buy += 1; } });
    createMenu([second.it], { audio });
    now.mockReturnValue(200_000 + 120);
    second.el.fire('click');
    expect(buy).toBe(0);
  });
});

describe('text fields', () => {
  it('a click only focuses a text field; Enter is what saves', () => {
    vi.spyOn(performance, 'now').mockReturnValue(300_000);
    let saves = 0;
    const { it: field, el } = item({ text: true, activate: () => { saves += 1; } });
    const menu = createMenu([field], { audio });
    el.fire('click');
    expect(saves).toBe(0);
    expect(menu.index()).toBe(0);
    expect(menu.handleKey(key('Enter'))).toBe(true);
    expect(saves).toBe(1);
  });
});

describe('hover focus', () => {
  it('moves focus on mouse enter but not on a touch tap', () => {
    vi.spyOn(performance, 'now').mockReturnValue(400_000);
    const a = item();
    const b = item();
    const menu = createMenu([a.it, b.it], { audio });
    b.el.fire('pointerenter', { pointerType: 'touch' });
    expect(menu.index()).toBe(-1);
    b.el.fire('pointerenter', { pointerType: 'mouse' });
    expect(menu.index()).toBe(1);
  });
});
