// src/ui/widgets.ts — OWNER: A4. DOM builders for menu items (buttons, selectors, sliders, toggles, text field).
import { cycleOption, snapValue, stepValue } from './nav';

export interface MenuItem {
  el: HTMLElement;
  activate?(): void;
  /** Left/Right (or arrow clicks). */
  adjust?(dir: -1 | 1): void;
  /** Real text field: letters, Space and caret keys stay with the browser. */
  text?: boolean;
  disabled?: boolean;
  /** Sound for adjust(): sliders use 'tick', others 'move'. */
  adjustSound?: 'tick' | 'move' | 'select';
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, className = '', text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function baseButton(extra: string): HTMLButtonElement {
  const b = h('button', `fp-btn ${extra}`.trim());
  b.type = 'button';
  return b;
}

export function buttonItem(label: string, onActivate: () => void, extra = ''): MenuItem {
  const el = baseButton(extra);
  el.textContent = label;
  return { el, activate: onActivate };
}

export function selectorItem<T extends string>(
  label: string, options: readonly { value: T; text: string }[], initial: T, onChange: (v: T) => void,
): MenuItem {
  const el = baseButton('fp-selector');
  const name = h('span', 'fp-sel-label', label);
  const left = h('span', 'fp-arrow', '◀');
  const value = h('span', 'fp-sel-value');
  const right = h('span', 'fp-arrow', '▶');
  el.append(name, left, value, right);
  let current = initial;
  const show = (): void => {
    value.textContent = options.find((o) => o.value === current)?.text ?? '';
  };
  const adjust = (dir: -1 | 1): void => {
    current = cycleOption(options.map((o) => o.value), current, dir);
    show();
    onChange(current);
  };
  left.addEventListener('click', (e) => { e.stopPropagation(); adjust(-1); });
  right.addEventListener('click', (e) => { e.stopPropagation(); adjust(1); });
  show();
  return { el, adjust, activate: () => adjust(1), adjustSound: 'move' };
}

export function toggleItem(label: string, initial: boolean, onChange: (v: boolean) => void): MenuItem {
  const el = baseButton('fp-toggle');
  const name = h('span', 'fp-sel-label', label);
  const pill = h('span', 'fp-pill');
  el.append(name, pill);
  let on = initial;
  const show = (): void => {
    pill.textContent = on ? 'ON' : 'OFF';
    pill.classList.toggle('is-on', on);
    el.setAttribute('role', 'switch');
    el.setAttribute('aria-checked', String(on));
  };
  const set = (v: boolean): void => {
    if (v === on) return;
    on = v;
    show();
    onChange(on);
  };
  show();
  return { el, activate: () => set(!on), adjust: (dir) => set(dir > 0), adjustSound: 'select' };
}

export function sliderItem(label: string, initial: number, onChange: (v: number) => void): MenuItem {
  const el = baseButton('fp-slider');
  el.setAttribute('role', 'slider');
  const name = h('span', 'fp-sel-label', label);
  const track = h('span', 'fp-track');
  const fill = h('span', 'fp-fill');
  track.append(fill);
  const readout = h('span', 'fp-readout');
  el.append(name, track, readout);
  let value = initial;
  const show = (): void => {
    fill.style.width = `${Math.round(value * 100)}%`;
    readout.textContent = String(Math.round(value * 100));
    el.setAttribute('aria-valuenow', readout.textContent);
  };
  const set = (v: number): void => {
    if (v === value) return;
    value = v;
    show();
    onChange(value);
  };
  const fromPointer = (e: PointerEvent): void => {
    const r = track.getBoundingClientRect();
    if (r.width > 0) set(snapValue((e.clientX - r.left) / r.width));
  };
  track.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    track.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  track.addEventListener('pointermove', (e) => {
    if (track.hasPointerCapture(e.pointerId)) fromPointer(e);
  });
  track.addEventListener('click', (e) => e.stopPropagation());
  show();
  return { el, adjust: (dir) => set(stepValue(value, dir)), adjustSound: 'tick' };
}

export function textItem(input: HTMLInputElement, onEnter: () => void): MenuItem {
  return { el: input, text: true, activate: onEnter };
}

/** A large clickable card (mode, ship, perk). `adjust` lets Left/Right move between cards. */
export function cardItem(el: HTMLButtonElement, onActivate: () => void, adjust?: (dir: -1 | 1) => void): MenuItem {
  return { el, activate: onActivate, adjust, adjustSound: 'move' };
}

export function cardButton(className: string): HTMLButtonElement {
  const b = h('button', `fp-card ${className}`.trim());
  b.type = 'button';
  return b;
}
