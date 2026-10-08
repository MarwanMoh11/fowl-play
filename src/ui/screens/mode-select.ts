// src/ui/screens/mode-select.ts — OWNER: H4. PLAY: pick a mode. Cards show your best score; Daily shows today's mutators.
import { MODE_INFO } from '../../shared/contracts';
import { setMenuTrack } from '../../audio/music-select';
import { dailyMutators, dailySeed } from '../../sim/modes';
import { GAME_MODES, type GameMode } from '../../sim/types';
import { MUTATORS } from '../../sim/tuning/loadout';
import { formatScore } from '../hud';
import { createMenu } from '../menu';
import { bestFor, loadProfile, todayYmd } from '../profile';
import { buttonItem, cardButton, cardItem, h } from '../widgets';
import type { Host, Screen } from './host';
import { buildLoadout } from './loadout';

/** Names of today's two Daily Clutch mutators, joined for display. */
export function dailyMutatorNames(date: number = todayYmd()): string {
  return dailyMutators(dailySeed(date)).map((m) => MUTATORS[m].name).join(' · ');
}

export function modeCard(mode: GameMode, best: number): HTMLButtonElement {
  const card = cardButton(`fp-mode fp-mode-${mode}`);
  const info = MODE_INFO[mode];
  const foot = mode === 'daily' ? `TODAY: ${dailyMutatorNames()}` : `BEST ${formatScore(best)}`;
  card.append(h('b', 'fp-card-title', info.name), h('small', 'fp-card-desc', info.desc), h('span', 'fp-card-foot', foot));
  return card;
}

export function buildModeSelect(host: Host, back: () => void): Screen {
  setMenuTrack(null);
  const profile = loadProfile(host.kv);
  const el = h('div', 'fp-screen fp-mode-screen');
  const again = (): void => host.show(buildModeSelect(host, back));
  const cards = GAME_MODES.map((mode) => cardItem(modeCard(mode, bestFor(profile, mode)), () => {
    host.show(buildLoadout(host, mode, again));
  }));
  const backItem = buttonItem('BACK', back);
  const panel = h('div', 'fp-panel fp-modes');
  const list = h('div', 'fp-mode-list');
  list.append(...[...cards, backItem].map((i) => i.el));
  panel.append(h('h2', 'fp-heading', 'CHOOSE A MODE'), list);
  el.append(panel);
  return { el, menu: createMenu([...cards, backItem], { audio: host.audio, onBack: back }) };
}
