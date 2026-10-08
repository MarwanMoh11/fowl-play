// src/ui/screens/scores.ts — OWNER: A4. High-score table screen (§8.7).
import { formatScore } from '../hud';
import { clearHighScores, loadHighScores, type HighScore } from '../highscores';
import { createMenu } from '../menu';
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

export function buildScores(host: Host, back: () => void): Screen {
  const list = loadHighScores(host.kv);
  const el = h('div', 'fp-screen');
  const panel = h('div', 'fp-panel fp-scores');
  panel.append(h('h2', 'fp-heading', 'HIGH SCORES'), buildScoreTable(list));
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
    clearHighScores(host.kv);
    host.show(buildScores(host, back));
  });
  clear.disabled = list.length === 0;
  const backItem = buttonItem('BACK', back);
  const row = h('div', 'fp-row');
  row.append(clear.el, backItem.el);
  panel.append(row);
  el.append(panel);
  const menu = createMenu([clear, backItem], { audio: host.audio, onBack: back });
  clear.el.classList.toggle('is-disabled', clear.disabled === true);
  return { el, menu };
}
