// src/ui/screens/pause.ts — OWNER: A4. Pause menu with settings and a quit confirmation (§8.7).
import { createMenu } from '../menu';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';
import { buildSettings } from './settings';

export const QUIT_WARNING = 'Your current run will be lost.';

export function buildPause(host: Host): Screen {
  const toPause = (): void => host.show(buildPause(host));
  const items = [
    buttonItem('RESUME', () => host.cb.onResume()),
    buttonItem('RESTART', () => host.cb.onRestart()),
    buttonItem('SETTINGS', () => host.show(buildSettings(host, toPause))),
    buttonItem('QUIT TO TITLE', () => host.show(buildQuitConfirm(host))),
  ];
  const el = h('div', 'fp-screen');
  const panel = h('div', 'fp-panel fp-pause');
  const list = h('div', 'fp-menu');
  list.append(...items.map((i) => i.el));
  panel.append(h('h2', 'fp-heading', 'PAUSED'), list);
  el.append(panel);
  return {
    el,
    menu: createMenu(items, { audio: host.audio, onBack: () => host.cb.onResume(), backKeys: ['KeyP'] }),
  };
}

export function buildQuitConfirm(host: Host): Screen {
  const toPause = (): void => host.show(buildPause(host));
  const items = [
    buttonItem('KEEP PLAYING', toPause),
    buttonItem('YES, QUIT', () => host.cb.onQuitToTitle()),
  ];
  const el = h('div', 'fp-screen');
  const panel = h('div', 'fp-panel fp-pause');
  const list = h('div', 'fp-menu');
  list.append(...items.map((i) => i.el));
  panel.append(h('h2', 'fp-heading', 'QUIT TO TITLE?'), h('p', 'fp-credit-line', QUIT_WARNING), list);
  el.append(panel);
  return { el, menu: createMenu(items, { audio: host.audio, onBack: toPause }) };
}
