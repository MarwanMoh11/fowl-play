// src/ui/screens/draft.ts — OWNER: H4. Perk draft: three cards; keys 1/2/3, arrows + Enter, or the mouse (§H4 P0-3).
import type { GameState, PerkId } from '../../sim/types';
import { PERKS, type PerkRarity } from '../../sim/tuning/loadout';
import { isTouchUi } from '../compact';
import { createMenu, type Menu } from '../menu';
import { buttonItem, cardButton, cardItem, h, type MenuItem } from '../widgets';
import type { Host, Screen } from './host';

/** Clicks and keys are ignored this long after the draft opens (the player was still firing). */
export const DRAFT_GUARD_MS = 400;
export const DRAFT_TITLE = 'CHOOSE YOUR UPGRADE';
export const RARITY_COLOR: Record<PerkRarity, string> = { common: '#9AA7B8', rare: '#4CC9F0', epic: '#F72585' };
const DIGIT_KEYS: Record<string, number> = {
  Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2,
};

/** "2/5": stacks held now over the perk's maximum. */
export function stackLabel(state: GameState, id: PerkId): string {
  return `${state.perks[id] ?? 0}/${PERKS[id].max}`;
}

export function perkCard(state: GameState, id: PerkId, key: number): HTMLButtonElement {
  const def = PERKS[id];
  const card = cardButton('fp-perk');
  card.style.setProperty('--rarity', RARITY_COLOR[def.rarity]);
  card.style.setProperty('--perk', def.color);
  card.append(
    h('small', 'fp-perk-key', String(key)),
    h('small', 'fp-perk-rarity', def.rarity.toUpperCase()),
    h('b', 'fp-perk-name', def.name),
    h('p', 'fp-perk-desc', def.desc),
    h('span', 'fp-perk-stacks', `STACKS ${stackLabel(state, id)}`),
  );
  return card;
}

/** The perks taken so far this run, as chips. */
export function runPerkChips(state: GameState): HTMLElement {
  const row = h('div', 'fp-chips');
  const taken = (Object.keys(state.perks) as PerkId[]).filter((id) => (state.perks[id] ?? 0) > 0);
  if (taken.length === 0) row.append(h('span', 'fp-chip', 'NO PERKS YET'));
  for (const id of taken) row.append(h('span', 'fp-chip', `${PERKS[id].name} ×${state.perks[id]}`));
  return row;
}

export function buildDraft(host: Host, state: GameState): Screen {
  const el = h('div', 'fp-screen fp-draft');
  const shownAt = performance.now();
  const options = state.draft?.options ?? [];
  let menu: Menu;
  const cards: MenuItem[] = options.map((id, i) => cardItem(
    perkCard(state, id, i + 1),
    () => host.cb.onDraftChoice(i),
    (dir) => menu.focus(menu.index() + dir),
  ));
  if (cards.length === 0) cards.push(buttonItem('CONTINUE', () => host.cb.onDraftChoice(0)));
  const canActivate = (): boolean => performance.now() - shownAt >= DRAFT_GUARD_MS;
  const onKey = (e: KeyboardEvent): boolean => {
    const n = DIGIT_KEYS[e.code];
    if (n === undefined || n >= cards.length) return false;
    if (!e.repeat) {
      menu.focus(n, true);
      menu.activate(n);
    }
    return true;
  };
  menu = createMenu(cards, { audio: host.audio, canActivate, onKey });
  const row = h('div', 'fp-draft-cards');
  row.append(...cards.map((c) => c.el));
  const hint = h('p', 'fp-draft-hint', isTouchUi() ? 'Tap a card to take that upgrade' : '1 · 2 · 3  or  ← → and Enter  or  click');
  el.append(h('h2', 'fp-heading', DRAFT_TITLE), row, hint, runPerkChips(state));
  return { el, menu };
}
