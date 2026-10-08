// src/ui/screens/howto-pages.ts — OWNER: H4. The How to Play pages: controls, pickups, power-ups, perks and modes.
import type { SpriteApi } from '../../shared/contracts';
import { MODE_INFO } from '../../shared/contracts';
import { GAME_MODES } from '../../sim/types';
import { POWERUP_TIME } from '../../sim/tuning/loadout';
import { h } from '../widgets';
import { CONTROL_ROWS, PICKUP_ROWS, TIPS, preview } from './howto';

export const HOW_PAGES = ['CONTROLS', 'PICKUPS', 'POWER-UPS', 'PERKS & MODES'] as const;

export const POWERUP_ROWS = [
  { key: 'pickup_pu_shield', name: 'SHIELD', desc: 'Absorbs one hit. Pips show the charges you hold.' },
  { key: 'pickup_pu_magnet', name: 'MAGNET', desc: `Pulls every pickup to the ship for ${POWERUP_TIME.magnet} s.` },
  { key: 'pickup_pu_rapid', name: 'RAPID FIRE', desc: `Faster guns and cooler barrels for ${POWERUP_TIME.rapid} s.` },
  { key: 'pickup_pu_drones', name: 'DRONES', desc: `Two wingmen fire with you for ${POWERUP_TIME.drones} s.` },
  { key: 'pickup_pu_timewarp', name: 'TIME WARP', desc: `Enemies slow down for ${POWERUP_TIME.timewarp} s.` },
  { key: 'pickup_pu_double', name: 'DOUBLE SCORE', desc: `Every point counts twice for ${POWERUP_TIME.double} s.` },
] as const;

export const COMBO_NOTES: readonly string[] = [
  'Chain kills to build a combo. Each tier multiplies your score.',
  'The chain breaks when no kill lands inside the combo window.',
  'Fury fills with kills and boss hits. At full fury press C, L or Shift for an overdrive.',
  'Overdrive fires faster and hits harder, and your guns never overheat while it lasts.',
];

export const PERK_NOTES: readonly string[] = [
  'After a boss or mini-boss, pick one of three perks. Each stack stacks again up to its maximum.',
  'Rare and epic perks are worth the risk. Some trade damage for score.',
  'Hangar upgrades and ships are bought with the Golden Corn you carry home.',
];

function list(lines: readonly string[]): HTMLElement {
  const ul = h('ul', 'fp-tips');
  for (const line of lines) ul.append(h('li', '', line));
  return ul;
}

function panel(title: string, ...children: HTMLElement[]): HTMLElement {
  const box = h('section', 'fp-panel fp-howto-col');
  box.append(h('h3', 'fp-subheading', title), ...children);
  return box;
}

function controlsPage(): HTMLElement[] {
  const grid = h('div', 'fp-controls');
  for (const cell of ['', 'MOUSE', 'KEYBOARD']) grid.append(h('span', 'fp-ch', cell));
  for (const row of CONTROL_ROWS) for (const [i, cell] of row.entries()) grid.append(h('span', i === 0 ? 'fp-cl' : '', cell));
  return [panel('CONTROLS', grid), panel('TIPS', list(TIPS))];
}

function pickupsPage(sprites: SpriteApi): HTMLElement[] {
  return [panel('PICKUPS', ...PICKUP_ROWS.map((row) => {
    const line = h('div', 'fp-pickup');
    const text = h('span', 'fp-pickup-text');
    text.append(h('b', '', row.name), h('small', '', row.desc));
    line.append(preview(sprites, row.key), text);
    return line;
  }))];
}

function powerupsPage(sprites: SpriteApi): HTMLElement[] {
  const rows = POWERUP_ROWS.map((row) => {
    const line = h('div', 'fp-pickup');
    const text = h('span', 'fp-pickup-text');
    text.append(h('b', '', row.name), h('small', '', row.desc));
    line.append(preview(sprites, row.key), text);
    return line;
  });
  return [panel('POWER-UPS', ...rows), panel('COMBOS AND FURY', list(COMBO_NOTES))];
}

function perksModesPage(): HTMLElement[] {
  const modes = GAME_MODES.map((m) => h('p', 'fp-credit-line', `${MODE_INFO[m].name} — ${MODE_INFO[m].desc}`));
  return [panel('PERKS', list(PERK_NOTES)), panel('MODES', ...modes)];
}

/** The columns of one How to Play page. */
export function buildHowPages(sprites: SpriteApi, page: number): HTMLElement[] {
  switch (page) {
    case 1: return pickupsPage(sprites);
    case 2: return powerupsPage(sprites);
    case 3: return perksModesPage();
    default: return controlsPage();
  }
}
