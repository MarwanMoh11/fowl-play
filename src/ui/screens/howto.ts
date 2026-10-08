// src/ui/screens/howto.ts — OWNER: H4 (from A4). How to Play: four pages (controls, pickups, power-ups, perks and modes) (§8.7).
import { WEAPON_INFO, type SpriteApi, type SpriteKey } from '../../shared/contracts';
import { WEAPON_IDS } from '../../sim/types';
import { createMenu } from '../menu';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';
import { buildHowPages, HOW_PAGES } from './howto-pages';

export const CONTROL_ROWS: readonly (readonly [string, string, string])[] = [
  ['Move', 'Ship follows the pointer', 'Arrows / WASD'],
  ['Fire (hold)', 'Left button', 'Space / Z / J'],
  ['Missile', 'Right button', 'X / K'],
  ['Overdrive (full fury)', 'Middle button', 'C / L / Shift'],
  ['Pause', '—', 'Esc / P'],
  ['Confirm / skip', 'Left click', 'Enter / Space'],
];

export const TIPS: readonly string[] = [
  'Eggs and chickens destroy your ship',
  'Every 100 food = 1 missile; missiles clear the screen',
  'Same-weapon gifts raise firepower',
  'Watch your heat bar — overheating stops your guns',
  'Wave 10 of every chapter is a boss',
];

export interface PickupRow { key: SpriteKey; name: string; desc: string }

export const PICKUP_ROWS: readonly PickupRow[] = [
  { key: 'pickup_drumstick', name: 'DRUMSTICK', desc: '+1 food. Fill the counter for missiles.' },
  { key: 'pickup_roast', name: 'ROAST CHICKEN', desc: '+10 food.' },
  { key: 'pickup_power_core', name: 'POWER CORE', desc: '+1 firepower, up to level 10.' },
  ...WEAPON_IDS.map((w): PickupRow => ({
    key: `pickup_gift_${w}`, name: `${WEAPON_INFO[w].name} GIFT`, desc: WEAPON_INFO[w].desc,
  })),
];

export function preview(sprites: SpriteApi, key: SpriteKey): HTMLElement {
  const box = h('span', 'fp-preview');
  try {
    box.append(sprites.toCanvas(key));
  } catch {
    /* sprite not available yet: leave the box empty */
  }
  return box;
}

export function buildHowToPlay(host: Host, back: () => void, page = 0): Screen {
  const current = Math.min(Math.max(0, page), HOW_PAGES.length - 1);
  const tabItems = HOW_PAGES.map((label, i) => buttonItem(label, () => host.show(buildHowToPlay(host, back, i)), 'fp-tab'));
  tabItems.forEach((t, i) => t.el.classList.toggle('is-active', i === current));
  const backItem = buttonItem('BACK', back);
  const el = h('div', 'fp-screen fp-howto');
  const tabRow = h('div', 'fp-tabs');
  tabRow.append(...tabItems.map((t) => t.el));
  const cols = h('div', 'fp-howto-cols');
  cols.append(...buildHowPages(host.sprites, current));
  const row = h('div', 'fp-row');
  row.append(backItem.el);
  el.append(h('h2', 'fp-heading fp-heading-float', 'HOW TO PLAY'), tabRow, cols, row);
  return { el, menu: createMenu([...tabItems, backItem], { audio: host.audio, onBack: back }), startAt: current };
}
