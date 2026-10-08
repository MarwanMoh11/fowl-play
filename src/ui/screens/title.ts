// src/ui/screens/title.ts — OWNER: H4 (from A4). Title screen: PLAY, meta screens, settings and help (§8.7, HENPOCALYPSE §H4 P0-2).
import { setMenuTrack } from '../../audio/music-select';
import { isTouchUi } from '../compact';
import { createMenu } from '../menu';
import { buttonItem, h } from '../widgets';
import { buildAchievements } from './achievements-screen';
import { buildCodex } from './codex';
import { buildCredits } from './credits';
import { buildHangar } from './hangar';
import type { Host, Screen } from './host';
import { buildHowToPlay } from './howto';
import { buildModeSelect } from './mode-select';
import { buildScores } from './scores';
import { buildSettings } from './settings';

export const GAME_VERSION = 'v2.0';
export const SUBTITLE = 'HENPOCALYPSE';
export const TAGLINE = 'Defend the galaxy from the poultry armada';
export const CONTROLS_SUMMARY =
  'Move: mouse / arrows / WASD  ·  Fire: click / Space / Z  ·  Missile: right-click / X  ·  Pause: Esc / P';
/** Touch screens: the on-screen buttons replace the keys. Matches the controls on the How to Play page. */
export const TOUCH_CONTROLS_SUMMARY =
  'Drag to move  ·  Hold to fire  ·  On-screen buttons: Missile, Overdrive, Pause';

/** Logo with an outline layer under a gradient-filled text layer (text-shadow would show through clipped text). */
export function buildLogo(): HTMLElement {
  const logo = h('h1', 'fp-logo');
  logo.dataset.text = 'FOWL PLAY';
  logo.append(h('span', 'fp-logo-fill', 'FOWL PLAY'));
  return logo;
}

export function buildTitle(host: Host): Screen {
  setMenuTrack(null);
  const el = h('div', 'fp-screen fp-title');
  const toTitle = (): void => host.show(buildTitle(host));
  const items = [
    buttonItem('PLAY', () => host.show(buildModeSelect(host, toTitle))),
    buttonItem('HANGAR', () => host.show(buildHangar(host, toTitle))),
    buttonItem('ACHIEVEMENTS', () => host.show(buildAchievements(host, toTitle))),
    buttonItem('CODEX', () => host.show(buildCodex(host, toTitle, 0))),
    buttonItem('HIGH SCORES', () => host.show(buildScores(host, toTitle, 0))),
    buttonItem('SETTINGS', () => host.show(buildSettings(host, toTitle))),
    buttonItem('HOW TO PLAY', () => host.show(buildHowToPlay(host, toTitle, 0))),
    buttonItem('CREDITS', () => host.show(buildCredits(host, toTitle))),
  ];
  const list = h('div', 'fp-menu fp-title-menu');
  list.append(...items.map((i) => i.el));
  const footer = h('div', 'fp-footer');
  footer.append(h('span', '', isTouchUi() ? TOUCH_CONTROLS_SUMMARY : CONTROLS_SUMMARY), h('span', 'fp-version', GAME_VERSION));
  el.append(buildLogo(), h('p', 'fp-subtitle', SUBTITLE), h('p', 'fp-tagline', TAGLINE), list, footer);
  return { el, menu: createMenu(items, { audio: host.audio }) };
}
