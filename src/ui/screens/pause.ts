// src/ui/screens/pause.ts — OWNER: H4 (from A4). Pause menu: resume, restart, settings, the run's perks and mutators (§H4 P0-6).
import { MUTATORS, PERKS } from '../../sim/tuning/loadout';
import type { GameState, PerkId } from '../../sim/types';
import { createMenu } from '../menu';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';
import { buildSettings } from './settings';

export const QUIT_WARNING = 'Your current run will be lost.';

/** "HOT SAUCE ×2 · SHOWBOAT ×1", or a dash when nothing is taken. */
export function perkLine(state: GameState | null): string {
  if (!state) return '—';
  const taken = (Object.keys(state.perks) as PerkId[]).filter((id) => (state.perks[id] ?? 0) > 0);
  return taken.length === 0 ? '—' : taken.map((id) => `${PERKS[id].name} ×${state.perks[id]}`).join(' · ');
}

export function mutatorLine(state: GameState | null): string {
  if (!state || state.loadout.mutators.length === 0) return '—';
  return state.loadout.mutators.map((m) => MUTATORS[m].name).join(' · ');
}

export function buildPause(host: Host, state: GameState | null): Screen {
  const toPause = (): void => host.show(buildPause(host, host.runState()));
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
  const run = h('div', 'fp-run-lines');
  run.append(h('p', 'fp-run-line', `PERKS  ${perkLine(state)}`), h('p', 'fp-run-line', `MUTATORS  ${mutatorLine(state)}`));
  panel.append(h('h2', 'fp-heading', 'PAUSED'), list, run);
  el.append(panel);
  return {
    el,
    menu: createMenu(items, { audio: host.audio, onBack: () => host.cb.onResume(), backKeys: ['KeyP'] }),
  };
}

export function buildQuitConfirm(host: Host): Screen {
  const toPause = (): void => host.show(buildPause(host, host.runState()));
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
