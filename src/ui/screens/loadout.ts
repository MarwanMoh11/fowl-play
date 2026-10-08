// src/ui/screens/loadout.ts — OWNER: H4. Loadout: ship carousel, difficulty and mutator toggles, then START (§H4 P0-2).
import { setMenuTrack } from '../../audio/music-select';
import { MODE_INFO, type StartOptions } from '../../shared/contracts';
import { MUTATOR_IDS, MUTATORS, SHIPS } from '../../sim/tuning/loadout';
import { SHIP_IDS, type Difficulty, type GameMode, type MutatorId, type ShipId } from '../../sim/types';
import { createMenu, type Menu } from '../menu';
import { mutatorLabel } from './mutator-label';
import { loadLoadoutPrefs, loadProfile, ownsShip, saveLoadoutPrefs, type Profile } from '../profile';
import { buttonItem, cardButton, h, selectorItem, toggleItem, type MenuItem } from '../widgets';
import { dailyMutatorNames } from './mode-select';
import type { Host, Screen } from './host';
import { buildShipCard } from './ship-card';

const DIFFICULTY_OPTIONS: { value: Difficulty; text: string }[] = [
  { value: 'easy', text: 'EASY' },
  { value: 'normal', text: 'NORMAL' },
  { value: 'hard', text: 'HARD' },
];

function shipStatus(profile: Profile, id: ShipId, selected: boolean): string {
  if (!ownsShip(profile, id)) return `LOCKED · ${SHIPS[id].cost} CORN`;
  return selected ? 'OWNED · FLYING' : 'OWNED';
}

/** Start-of-run options for the chosen loadout. Daily runs take their mutators from the date (app side). */
export function startOptions(
  profile: Profile, ship: ShipId, difficulty: Difficulty, mode: GameMode, mutators: readonly MutatorId[],
): StartOptions {
  return { difficulty, mode, loadout: { ship, upgrades: { ...profile.upgrades }, mutators: [...mutators] } };
}

export function buildLoadout(host: Host, mode: GameMode, back: () => void): Screen {
  setMenuTrack('draft');
  const profile = loadProfile(host.kv);
  const prefs = loadLoadoutPrefs(host.kv);
  const daily = mode === 'daily';
  const chosen = new Set<MutatorId>(daily ? [] : prefs.mutators);
  let ship: ShipId = prefs.ship;
  let difficulty: Difficulty = host.settings().difficulty;
  const shipButton = cardButton('fp-ship-pick');
  const details = h('p', 'fp-details', daily ? `TODAY'S MUTATORS: ${dailyMutatorNames()}` : '');
  const startItem = buttonItem('START', () => start());

  function refreshShip(): void {
    const locked = !ownsShip(profile, ship);
    shipButton.replaceChildren(buildShipCard(host.sprites, ship, shipStatus(profile, ship, true), locked));
    startItem.disabled = locked;
    startItem.el.classList.toggle('is-disabled', locked);
  }

  function cycleShip(dir: -1 | 1): void {
    const i = SHIP_IDS.indexOf(ship);
    ship = SHIP_IDS[(i + dir + SHIP_IDS.length) % SHIP_IDS.length];
    refreshShip();
  }

  function start(): void {
    if (!ownsShip(profile, ship)) return;
    const mutators = daily ? [] : MUTATOR_IDS.filter((m) => chosen.has(m));
    saveLoadoutPrefs({ ship, mode, mutators: daily ? prefs.mutators : mutators }, host.kv);
    host.cb.onStart(startOptions(profile, ship, difficulty, mode, mutators));
  }

  const shipItem: MenuItem = {
    el: shipButton, activate: () => cycleShip(1), adjust: (dir) => cycleShip(dir), adjustSound: 'move',
  };
  const difficultyItem = selectorItem('DIFFICULTY', DIFFICULTY_OPTIONS, difficulty, (v) => {
    difficulty = v;
    host.update({ difficulty: v });
  });
  const mutatorItems = daily ? [] : MUTATOR_IDS.map((id) => {
    const item = toggleItem(mutatorLabel(id), chosen.has(id), (on) => {
      if (on) chosen.add(id);
      else chosen.delete(id);
    });
    item.el.addEventListener('focus', () => { details.textContent = MUTATORS[id].desc; });
    item.el.addEventListener('mouseenter', () => { details.textContent = MUTATORS[id].desc; });
    return item;
  });
  const backItem = buttonItem('BACK', back);
  const items = [shipItem, difficultyItem, ...mutatorItems, startItem, backItem];

  const el = h('div', 'fp-screen fp-loadout-screen');
  const panel = h('div', 'fp-panel fp-loadout');
  panel.append(h('h2', 'fp-heading', `LOADOUT · ${MODE_INFO[mode].name}`));
  const cols = h('div', 'fp-loadout-cols');
  const left = h('div', 'fp-loadout-col');
  left.append(shipButton, difficultyItem.el, details);
  const right = h('div', 'fp-loadout-col');
  right.append(h('h3', 'fp-subheading', daily ? 'DAILY MUTATORS' : 'MUTATORS'));
  if (daily) right.append(h('p', 'fp-details', 'Chosen by the date. Same for everyone today.'));
  else right.append(...mutatorItems.map((i) => i.el));
  cols.append(left, right);
  const row = h('div', 'fp-row');
  row.append(startItem.el, backItem.el);
  panel.append(cols, row);
  el.append(panel);
  refreshShip();
  const menu: Menu = createMenu(items, { audio: host.audio, onBack: back });
  return { el, menu, startAt: 0 };
}
