// src/ui/screens/draft.ts — OWNER: H4. Perk draft: pick 1 of 3 cards (HENPOCALYPSE §H4).
// Phase-0 version: plain buttons. H4 replaces with the full card layout.
import type { GameState } from '../../sim/types';
import { PERKS } from '../../sim/tuning/loadout';
import { createMenu } from '../menu';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';

export function buildDraft(host: Host, state: GameState): Screen {
  const el = h('div', 'fp-screen fp-draft');
  const options = state.draft?.options ?? [];
  const items = options.map((id, i) => buttonItem(`${PERKS[id].name} — ${PERKS[id].desc}`, () => host.cb.onDraftChoice(i)));
  if (items.length === 0) items.push(buttonItem('CONTINUE', () => host.cb.onDraftChoice(0)));
  const list = h('div', 'fp-menu');
  list.append(...items.map((i) => i.el));
  el.append(h('h2', 'fp-heading', 'CHOOSE A PERK'), list);
  return { el, menu: createMenu(items, { audio: host.audio }) };
}
