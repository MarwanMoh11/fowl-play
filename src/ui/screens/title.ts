// src/ui/screens/title.ts — OWNER: A4. Title screen (§8.7).
import type { Difficulty } from '../../sim/types';
import { createMenu } from '../menu';
import { buttonItem, h, selectorItem } from '../widgets';
import { buildCredits } from './credits';
import type { Host, Screen } from './host';
import { buildHowToPlay } from './howto';
import { buildScores } from './scores';
import { buildSettings } from './settings';

export const GAME_VERSION = 'v1.0';
export const TAGLINE = 'Defend the galaxy from the poultry armada';
export const CONTROLS_SUMMARY =
  'Move: mouse / arrows / WASD  ·  Fire: click / Space / Z  ·  Missile: right-click / X  ·  Pause: Esc / P';

const DIFFICULTY_OPTIONS: { value: Difficulty; text: string }[] = [
  { value: 'easy', text: 'EASY' },
  { value: 'normal', text: 'NORMAL' },
  { value: 'hard', text: 'HARD' },
];

/** Logo with an outline layer under a gradient-filled text layer (text-shadow would show through clipped text). */
export function buildLogo(): HTMLElement {
  const logo = h('h1', 'fp-logo');
  logo.dataset.text = 'FOWL PLAY';
  logo.append(h('span', 'fp-logo-fill', 'FOWL PLAY'));
  return logo;
}

export function buildTitle(host: Host): Screen {
  const el = h('div', 'fp-screen fp-title');
  const toTitle = (): void => host.show(buildTitle(host));
  const items = [
    buttonItem('PLAY', () => host.cb.onStart(host.settings().difficulty)),
    selectorItem('DIFFICULTY', DIFFICULTY_OPTIONS, host.settings().difficulty, (difficulty) => host.update({ difficulty })),
    buttonItem('HIGH SCORES', () => host.show(buildScores(host, toTitle))),
    buttonItem('SETTINGS', () => host.show(buildSettings(host, toTitle))),
    buttonItem('HOW TO PLAY', () => host.show(buildHowToPlay(host, toTitle))),
    buttonItem('CREDITS', () => host.show(buildCredits(host, toTitle))),
  ];
  const list = h('div', 'fp-menu');
  list.append(...items.map((i) => i.el));
  const footer = h('div', 'fp-footer');
  footer.append(h('span', '', CONTROLS_SUMMARY), h('span', 'fp-version', GAME_VERSION));
  el.append(buildLogo(), h('p', 'fp-tagline', TAGLINE), list, footer);
  return { el, menu: createMenu(items, { audio: host.audio }) };
}
