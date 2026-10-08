// src/ui/screens/howto.ts — OWNER: A4. How to Play: controls, pickups with sprite previews, tips (§8.7).
import { WEAPON_INFO, type SpriteApi, type SpriteKey } from '../../shared/contracts';
import { WEAPON_IDS } from '../../sim/types';
import { createMenu } from '../menu';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';

export const CONTROL_ROWS: readonly (readonly [string, string, string])[] = [
  ['Move', 'Ship follows the pointer', 'Arrows / WASD'],
  ['Fire (hold)', 'Left button', 'Space / Z / J'],
  ['Missile', 'Right button', 'X / K'],
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

function preview(sprites: SpriteApi, key: SpriteKey): HTMLElement {
  const box = h('span', 'fp-preview');
  try {
    box.append(sprites.toCanvas(key));
  } catch {
    /* sprite not available yet: leave the box empty */
  }
  return box;
}

function controlsPanel(): HTMLElement {
  const panel = h('section', 'fp-panel fp-howto-col');
  panel.append(h('h3', 'fp-subheading', 'CONTROLS'));
  const grid = h('div', 'fp-controls');
  for (const cell of ['', 'MOUSE', 'KEYBOARD']) grid.append(h('span', 'fp-ch', cell));
  for (const row of CONTROL_ROWS) for (const [i, cell] of row.entries()) grid.append(h('span', i === 0 ? 'fp-cl' : '', cell));
  panel.append(grid);
  return panel;
}

function pickupsPanel(sprites: SpriteApi): HTMLElement {
  const panel = h('section', 'fp-panel fp-howto-col');
  panel.append(h('h3', 'fp-subheading', 'PICKUPS'));
  for (const row of PICKUP_ROWS) {
    const line = h('div', 'fp-pickup');
    const text = h('span', 'fp-pickup-text');
    text.append(h('b', '', row.name), h('small', '', row.desc));
    line.append(preview(sprites, row.key), text);
    panel.append(line);
  }
  return panel;
}

function tipsPanel(): HTMLElement {
  const panel = h('section', 'fp-panel fp-howto-col');
  panel.append(h('h3', 'fp-subheading', 'TIPS'));
  const list = h('ul', 'fp-tips');
  for (const tip of TIPS) list.append(h('li', '', tip));
  panel.append(list);
  return panel;
}

export function buildHowToPlay(host: Host, back: () => void): Screen {
  const el = h('div', 'fp-screen fp-howto');
  const cols = h('div', 'fp-howto-cols');
  cols.append(controlsPanel(), pickupsPanel(host.sprites), tipsPanel());
  const backItem = buttonItem('BACK', back);
  const row = h('div', 'fp-row');
  row.append(backItem.el);
  el.append(h('h2', 'fp-heading fp-heading-float', 'HOW TO PLAY'), cols, row);
  return { el, menu: createMenu([backItem], { audio: host.audio, onBack: back }) };
}
