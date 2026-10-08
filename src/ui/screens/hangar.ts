// src/ui/screens/hangar.ts — OWNER: H4. Hangar: buy ships and permanent upgrades with Golden Corn (§H4 P1-7).
import { playEffect } from '../../audio';
import { setMenuTrack } from '../../audio/music-select';
import { SHIPS, UPGRADES } from '../../sim/tuning/loadout';
import { SHIP_IDS, type UpgradeId } from '../../sim/types';
import { formatScore } from '../hud';
import { createMenu } from '../menu';
import {
  buyShip, buyUpgrade, loadProfile, nextUpgradeCost, ownsShip, saveProfile, upgradeLevel, upgradeMaxed, type Profile,
} from '../profile';
import { buttonItem, h, type MenuItem } from '../widgets';
import type { Host, Screen } from './host';
import { SHIP_SPRITE } from './ship-card';

/** A hangar row: art or pips, name, one-line detail and a price or state. */
function rowButton(name: string, sub: string, detail: string, art: HTMLElement | null): HTMLButtonElement {
  const b = h('button', 'fp-row-item');
  b.type = 'button';
  const text = h('span', 'fp-row-text');
  text.append(h('b', 'fp-row-name', name), h('small', 'fp-row-sub', sub));
  b.append(...(art ? [art] : []), text, h('span', 'fp-row-detail', detail));
  return b;
}

function shipRow(host: Host, profile: Profile, id: (typeof SHIP_IDS)[number], index: number, rebuild: (i: number) => void): MenuItem {
  const def = SHIPS[id];
  const owned = ownsShip(profile, id);
  const affordable = profile.corn >= def.cost;
  const art = h('span', 'fp-row-art');
  try {
    art.append(host.sprites.toCanvas(SHIP_SPRITE[id]));
  } catch {
    /* art not available */
  }
  const el = rowButton(def.name, def.desc, owned ? 'OWNED' : `${formatScore(def.cost)} CORN`, art);
  return {
    el,
    disabled: owned || !affordable,
    activate: () => {
      if (!buyShip(profile, id)) return;
      saveProfile(profile, host.kv);
      playEffect('purchase');
      rebuild(index);
    },
  };
}

/** Lifetime numbers for the hangar footer. */
export function lifetimeLine(p: Profile): string {
  const s = p.stats;
  return `RUNS ${formatScore(s.runs)} · KILLS ${formatScore(s.kills)} · BOSSES ${formatScore(s.bossesKilled)} · BEST CHAIN ${formatScore(s.bestCombo)} · VICTORIES ${formatScore(s.victories)}`;
}

function pips(level: number, max: number): string {
  return '●'.repeat(level) + '○'.repeat(max - level);
}

function upgradeRow(host: Host, profile: Profile, id: UpgradeId, index: number, rebuild: (i: number) => void): MenuItem {
  const def = UPGRADES[id];
  const level = upgradeLevel(profile, id);
  const cost = nextUpgradeCost(profile, id);
  const maxed = upgradeMaxed(profile, id);
  const el = rowButton(def.name, def.desc, `${pips(level, def.costs.length)}  ${maxed ? 'MAX' : `${formatScore(cost ?? 0)} CORN`}`, null);
  return {
    el,
    disabled: maxed || cost === null || profile.corn < cost,
    activate: () => {
      if (!buyUpgrade(profile, id)) return;
      saveProfile(profile, host.kv);
      playEffect('purchase');
      rebuild(index);
    },
  };
}

export function buildHangar(host: Host, back: () => void, startAt = 0): Screen {
  setMenuTrack('draft');
  const profile = loadProfile(host.kv);
  const rebuild = (i: number): void => host.show(buildHangar(host, back, i));
  const shipItems = SHIP_IDS.map((id, i) => shipRow(host, profile, id, i, rebuild));
  const upgradeIds = Object.keys(UPGRADES) as UpgradeId[];
  const upgradeItems = upgradeIds.map((id, i) => upgradeRow(host, profile, id, shipItems.length + i, rebuild));
  const backItem = buttonItem('BACK', back);
  const items = [...shipItems, ...upgradeItems, backItem];

  const el = h('div', 'fp-screen fp-hangar-screen');
  const panel = h('div', 'fp-panel fp-hangar');
  panel.append(h('h2', 'fp-heading', 'HANGAR'), h('p', 'fp-corn-balance', `GOLDEN CORN  ${formatScore(profile.corn)}`), h('p', 'fp-stat-line', lifetimeLine(profile)));
  const cols = h('div', 'fp-hangar-cols');
  const shipCol = h('div', 'fp-hangar-col');
  shipCol.append(h('h3', 'fp-subheading', 'SHIPS'), ...shipItems.map((i) => i.el));
  const upgradeCol = h('div', 'fp-hangar-col');
  upgradeCol.append(h('h3', 'fp-subheading', 'UPGRADES'), ...upgradeItems.map((i) => i.el));
  cols.append(shipCol, upgradeCol);
  const row = h('div', 'fp-row');
  row.append(backItem.el);
  panel.append(cols, row);
  el.append(panel);
  return { el, menu: createMenu(items, { audio: host.audio, onBack: back }), startAt };
}
