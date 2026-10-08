// src/ui/screens/scores.ts — OWNER: H4 (from A4). High-score tables per mode (campaign, onslaught, boss rush, daily) (§8.7).
import { MODE_INFO } from '../../shared/contracts';
import { GAME_MODES, type GameMode } from '../../sim/types';
import { clearTable, loadTable, tableKeyFor, type HighScore } from '../highscores';
import { formatScore } from '../hud';
import { createMenu } from '../menu';
import { todayYmd } from '../profile';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';

export const EMPTY_TABLE_TEXT = 'No scores yet. Go fly!';
const CONFIRM_TEXT = 'SURE? PRESS AGAIN';
const CONFIRM_TIMEOUT_MS = 3000;
const HEADERS = ['#', 'NAME', 'SCORE', 'CH', 'DIFFICULTY', 'DATE'];

export function formatDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : '-';
}

/** The ranked list as a DOM grid; `highlight` is the 0-based row to mark as new. */
export function buildScoreTable(list: readonly HighScore[], highlight = -1): HTMLElement {
  const table = h('div', 'fp-table');
  if (list.length === 0) {
    table.append(h('p', 'fp-empty', EMPTY_TABLE_TEXT));
    return table;
  }
  const head = h('div', 'fp-trow fp-thead');
  for (const t of HEADERS) head.append(h('span', '', t));
  table.append(head);
  list.forEach((e, i) => {
    const row = h('div', `fp-trow${i === highlight ? ' is-new' : ''}`);
    const cells = [String(i + 1), e.name, formatScore(e.score), String(e.chapter), e.difficulty.toUpperCase(), formatDate(e.date)];
    for (const c of cells) row.append(h('span', '', c));
    table.append(row);
  });
  return table;
}

/** Tab label and storage key for each mode's table. */
export function tabsFor(today: number = todayYmd()): { mode: GameMode; label: string; key: string }[] {
  return GAME_MODES.map((mode) => ({ mode, label: MODE_INFO[mode].name, key: tableKeyFor(mode, today) }));
}

export function buildScores(host: Host, back: () => void, tab = 0): Screen {
  const tabs = tabsFor();
  const current = tabs[Math.min(Math.max(0, tab), tabs.length - 1)];
  const list = loadTable(host.kv, current.key);
  const el = h('div', 'fp-screen');
  const panel = h('div', 'fp-panel fp-scores');
  const tabRow = h('div', 'fp-tabs');
  const tabItems = tabs.map((t, i) => buttonItem(t.label, () => host.show(buildScores(host, back, i)), 'fp-tab'));
  tabItems.forEach((t, i) => t.el.classList.toggle('is-active', i === tabs.indexOf(current)));
  tabRow.append(...tabItems.map((t) => t.el));
  panel.append(h('h2', 'fp-heading', 'HIGH SCORES'), tabRow, buildScoreTable(list));
  let armed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = buttonItem('CLEAR SCORES', () => {
    if (!armed) {
      armed = true;
      clear.el.textContent = CONFIRM_TEXT;
      timer = setTimeout(() => {
        armed = false;
        clear.el.textContent = 'CLEAR SCORES';
      }, CONFIRM_TIMEOUT_MS);
      return;
    }
    if (timer !== null) clearTimeout(timer);
    clearTable(host.kv, current.key);
    host.show(buildScores(host, back, tabs.indexOf(current)));
  });
  clear.disabled = list.length === 0;
  const backItem = buttonItem('BACK', back);
  const row = h('div', 'fp-row');
  row.append(clear.el, backItem.el);
  panel.append(row);
  el.append(panel);
  const items = [...tabItems, clear, backItem];
  const menu = createMenu(items, { audio: host.audio, onBack: back });
  clear.el.classList.toggle('is-disabled', clear.disabled === true);
  return { el, menu, startAt: tabs.indexOf(current) };
}
