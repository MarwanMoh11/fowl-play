// src/ui/screens/end.ts — OWNER: A4. Game Over and Victory screens with name entry (§8.7).
import type { RunSummary } from '../../shared/contracts';
import { insertScore, loadHighScores, qualifies, addHighScore, type HighScore } from '../highscores';
import { formatScore } from '../hud';
import { createMenu } from '../menu';
import { DEFAULT_PILOT_NAME, MAX_NAME_LENGTH, loadLastName, sanitizeName, saveLastName } from '../storage';
import { buttonItem, h, textItem, type MenuItem } from '../widgets';
import type { Host, Screen } from './host';
import { buildScoreTable } from './scores';

/** Clicks and key presses this soon after the screen opens are ignored (the player was still firing). */
export const ACTIVATE_GUARD_MS = 350;
/** The name field ignores typing this long, for the same reason. */
export const INPUT_LOCK_MS = 600;

export function endTitle(summary: RunSummary): string {
  return summary.victory ? 'COOP LIBERATED!' : 'GAME OVER';
}

function statsGrid(s: RunSummary): HTMLElement {
  const grid = h('div', 'fp-stats');
  const stats: [string, string][] = [
    ['REACHED', `CHAPTER ${s.chapter} · WAVE ${s.wave}`],
    ['ACCURACY', `${s.accuracyPct}%`],
    ['KILLS', formatScore(s.kills)],
    ['DIFFICULTY', s.difficulty.toUpperCase()],
  ];
  for (const [k, v] of stats) {
    const cell = h('div', 'fp-stat');
    cell.append(h('small', '', k), h('b', '', v));
    grid.append(cell);
  }
  return grid;
}

/** Name entry row. Returns the items it contributes to the menu. */
function nameEntry(
  host: Host, summary: RunSummary, onSaved: (rank: number) => void,
): { row: HTMLElement; items: MenuItem[] } {
  const input = h('input', 'fp-input');
  input.type = 'text';
  input.maxLength = MAX_NAME_LENGTH;
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.value = loadLastName(host.kv);
  input.readOnly = true;
  setTimeout(() => { input.readOnly = false; }, INPUT_LOCK_MS);
  input.addEventListener('input', () => { input.value = sanitizeName(input.value); });
  const save = (): void => {
    const name = sanitizeName(input.value).trim() || DEFAULT_PILOT_NAME;
    saveLastName(name, host.kv);
    const entry: HighScore = {
      name, score: summary.score, chapter: summary.chapter, wave: summary.wave,
      difficulty: summary.difficulty, date: new Date().toISOString(),
    };
    onSaved(addHighScore(entry, host.kv));
  };
  const saveItem = buttonItem('SAVE', save, 'fp-save');
  const row = h('div', 'fp-name-row');
  row.append(h('label', 'fp-name-label', 'NEW HIGH SCORE! ENTER YOUR NAME'), input, saveItem.el);
  return { row, items: [textItem(input, save), saveItem] };
}

export function buildEnd(host: Host, summary: RunSummary, savedRank: number | null = null, shownAt = performance.now()): Screen {
  const el = h('div', 'fp-screen');
  const panel = h('div', `fp-panel fp-end ${summary.victory ? 'is-victory' : 'is-over'}`);
  panel.append(h('h2', 'fp-end-title', endTitle(summary)));
  panel.append(h('small', 'fp-score-label', 'FINAL SCORE'), h('div', 'fp-score', formatScore(summary.score)));
  const items: MenuItem[] = [];
  if (savedRank === null) {
    panel.append(statsGrid(summary));
    if (qualifies(summary.score, host.kv)) {
      const entry = nameEntry(host, summary, (rank) => host.show(buildEnd(host, summary, rank, shownAt)));
      panel.append(entry.row);
      items.push(...entry.items);
    }
  } else {
    let list = loadHighScores(host.kv);
    if (savedRank >= 0 && list[savedRank]?.score !== summary.score) {
      list = insertScore(list, { name: DEFAULT_PILOT_NAME, score: summary.score, chapter: summary.chapter, wave: summary.wave, difficulty: summary.difficulty, date: '' }).list;
    }
    panel.append(buildScoreTable(list, savedRank));
  }
  const primary = summary.victory
    ? buttonItem('CONTINUE (ENDLESS)', () => host.cb.onContinueEndless())
    : buttonItem('RETRY', () => host.cb.onRestart());
  const toTitle = buttonItem('TITLE', () => host.cb.onQuitToTitle());
  items.push(primary, toTitle);
  const row = h('div', 'fp-row');
  row.append(primary.el, toTitle.el);
  panel.append(row);
  el.append(panel);
  const canActivate = (): boolean => performance.now() - shownAt >= ACTIVATE_GUARD_MS;
  return { el, menu: createMenu(items, { audio: host.audio, canActivate }) };
}
