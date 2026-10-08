// src/ui/screens/codex.ts — OWNER: H4. Codex: enemies, bosses, weapons and perks. Unseen entries are silhouettes (§H4 P1-9).
import { BOSS_INFO, WEAPON_INFO, type SpriteKey } from '../../shared/contracts';
import { setMenuTrack } from '../../audio/music-select';
import { PERK_IDS, PERKS } from '../../sim/tuning/loadout';
import { WEAPON_IDS } from '../../sim/types';
import { createMenu } from '../menu';
import { BOSS_IDS, BOSS_TEXT, CODEX_ENEMIES, bossSprite, enemySprite } from '../codex-data';
import { loadProfile, type Profile } from '../profile';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';

export const CODEX_TABS = ['ENEMIES', 'BOSSES', 'WEAPONS', 'PERKS'] as const;

export interface CodexEntry {
  seen: boolean;
  name: string;
  text: string;
  sprite: SpriteKey | null;
  color: string | null;
}

/** Entries for one tab, with seen state taken from the profile. */
export function codexEntries(tab: number, p: Profile): CodexEntry[] {
  switch (tab) {
    case 1:
      return BOSS_IDS.map((id) => ({
        seen: p.seenBosses.includes(id), name: BOSS_INFO[id].name, text: BOSS_TEXT[id], sprite: bossSprite(id), color: null,
      }));
    case 2:
      return WEAPON_IDS.map((w) => ({
        seen: p.weaponsFired.includes(w), name: WEAPON_INFO[w].name, text: WEAPON_INFO[w].desc,
        sprite: `icon_weapon_${w}` as SpriteKey, color: WEAPON_INFO[w].color,
      }));
    case 3:
      return PERK_IDS.map((id) => ({
        seen: p.seenPerks.includes(id), name: PERKS[id].name, text: PERKS[id].desc, sprite: null, color: PERKS[id].color,
      }));
    default:
      return CODEX_ENEMIES.map((e) => ({
        seen: p.seenEnemies.includes(e.kind), name: e.name, text: e.text, sprite: enemySprite(e.kind), color: null,
      }));
  }
}

function card(host: Host, entry: CodexEntry): HTMLElement {
  const box = h('div', `fp-codex-card${entry.seen ? ' is-seen' : ' is-unseen'}`);
  if (entry.color) box.style.setProperty('--accent', entry.color);
  if (entry.sprite) {
    const art = h('span', `fp-codex-art${entry.seen ? '' : ' is-silhouette'}`);
    try {
      art.append(host.sprites.toCanvas(entry.sprite));
    } catch {
      /* art not available yet */
    }
    box.append(art);
  }
  box.append(h('b', 'fp-codex-name', entry.seen ? entry.name : '???'));
  if (entry.seen) box.append(h('small', 'fp-codex-text', entry.text));
  return box;
}

export function buildCodex(host: Host, back: () => void, tab = 0): Screen {
  setMenuTrack('draft');
  const p = loadProfile(host.kv);
  const current = Math.min(Math.max(0, tab), CODEX_TABS.length - 1);
  const entries = codexEntries(current, p);
  const seen = entries.filter((e) => e.seen).length;
  const tabItems = CODEX_TABS.map((label, i) => buttonItem(label, () => host.show(buildCodex(host, back, i)), 'fp-tab'));
  tabItems.forEach((t, i) => t.el.classList.toggle('is-active', i === current));
  const backItem = buttonItem('BACK', back);
  const el = h('div', 'fp-screen fp-codex-screen');
  const panel = h('div', 'fp-panel fp-codex');
  const tabRow = h('div', 'fp-tabs');
  tabRow.append(...tabItems.map((t) => t.el));
  const grid = h('div', 'fp-codex-grid');
  grid.append(...entries.map((e) => card(host, e)));
  const row = h('div', 'fp-row');
  row.append(backItem.el);
  panel.append(h('h2', 'fp-heading', 'CODEX'), tabRow, h('p', 'fp-corn-balance', `SEEN ${seen} / ${entries.length}`), grid, row);
  el.append(panel);
  return { el, menu: createMenu([...tabItems, backItem], { audio: host.audio, onBack: back }), startAt: current };
}
