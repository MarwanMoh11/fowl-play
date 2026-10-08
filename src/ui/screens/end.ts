// src/ui/screens/end.ts — OWNER: H4 (from A4). Game Over and Victory: corn, unlocked achievements, name entry per mode (§8.7).
import { MODE_INFO, type RunSummary } from '../../shared/contracts';
import { achievementById, TIER_LABEL } from '../achievements';
import { isCompactUi, isTouchUi } from '../compact';
import { formatScore } from '../hud';
import { addToTable, loadTable, qualifiesFor, tableKeyFor, type HighScore } from '../highscores';
import { createMenu } from '../menu';
import type { RunReward } from '../profile-record';
import { DEFAULT_PILOT_NAME, MAX_NAME_LENGTH, loadLastName, sanitizeName, saveLastName } from '../storage';
import { buttonItem, h, textItem, type MenuItem } from '../widgets';
import type { Host, Screen } from './host';
import { buildScoreTable } from './scores';

/** Clicks and key presses this soon after the screen opens are ignored (the player was still firing). */
export const ACTIVATE_GUARD_MS = 350;
/** The name field ignores typing this long, for the same reason. */
export const INPUT_LOCK_MS = 600;
/** Wait for the on-screen keyboard to open before scrolling the name field into view. */
export const KEYBOARD_SCROLL_MS = 300;
export const MAX_SHOWN_ACHIEVEMENTS = 6;

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

/** "+N GOLDEN CORN" plus the achievements unlocked during this run. */
export function rewardBlock(reward: RunReward): HTMLElement {
  const box = h('div', 'fp-reward');
  const total = reward.cornEarned + reward.achievementCorn;
  box.append(h('div', 'fp-reward-corn', `+${formatScore(total)} GOLDEN CORN`));
  const names = reward.unlocked.map((id) => achievementById(id)).filter((d) => d !== undefined);
  for (const def of names.slice(0, MAX_SHOWN_ACHIEVEMENTS)) {
    box.append(h('div', `fp-reward-ach is-${def.tier}`, `${TIER_LABEL[def.tier]} · ${def.name}`));
  }
  if (names.length > MAX_SHOWN_ACHIEVEMENTS) box.append(h('div', 'fp-reward-ach', `+${names.length - MAX_SHOWN_ACHIEVEMENTS} MORE`));
  return box;
}

/** Name entry row. Returns the items it contributes to the menu. */
function nameEntry(
  host: Host, summary: RunSummary, key: string, onSaved: (rank: number) => void,
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
  // On a phone the on-screen keyboard covers the lower half of the landscape screen: bring the field to the top of the scroll area.
  input.addEventListener('focus', () => {
    if (isCompactUi()) setTimeout(() => input.scrollIntoView({ block: 'start' }), KEYBOARD_SCROLL_MS);
  });
  const save = (): void => {
    const name = sanitizeName(input.value).trim() || DEFAULT_PILOT_NAME;
    saveLastName(name, host.kv);
    const entry: HighScore = {
      name, score: summary.score, chapter: summary.chapter, wave: summary.wave,
      difficulty: summary.difficulty, date: new Date().toISOString(),
    };
    onSaved(addToTable(entry, host.kv, key));
  };
  const saveItem = buttonItem('SAVE', save, 'fp-save');
  const row = h('div', 'fp-name-row');
  const label = isTouchUi() ? 'NEW HIGH SCORE! TYPE YOUR NAME, THEN TAP SAVE' : 'NEW HIGH SCORE! ENTER YOUR NAME';
  row.append(h('label', 'fp-name-label', label), input, saveItem.el);
  return { row, items: [textItem(input, save), saveItem] };
}

function tableBlock(host: Host, summary: RunSummary, key: string, savedRank: number | null, reward: RunReward | null, shownAt: number): Screen {
  const el = h('div', 'fp-screen');
  const panel = h('div', `fp-panel fp-end ${summary.victory ? 'is-victory' : 'is-over'}`);
  panel.append(h('h2', 'fp-end-title', endTitle(summary)));
  panel.append(h('small', 'fp-score-label', `${MODE_INFO[summary.mode].name} · FINAL SCORE`), h('div', 'fp-score', formatScore(summary.score)));
  const items: MenuItem[] = [];
  if (savedRank === null) {
    panel.append(statsGrid(summary));
    if (reward) panel.append(rewardBlock(reward));
    if (qualifiesFor(loadTable(host.kv, key), summary.score)) {
      const entry = nameEntry(host, summary, key, (rank) => host.show(tableBlock(host, summary, key, rank, reward, shownAt)));
      panel.append(entry.row);
      items.push(...entry.items);
    }
  } else {
    panel.append(buildScoreTable(loadTable(host.kv, key), savedRank));
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

/** The end screen. `reward` is what the run banked (null when unknown). */
export function buildEnd(
  host: Host, summary: RunSummary, reward: RunReward | null = null, savedRank: number | null = null,
  shownAt = performance.now(),
): Screen {
  return tableBlock(host, summary, tableKeyFor(summary.mode, summary.dailyDate), savedRank, reward, shownAt);
}
