// src/ui/screens/achievements-screen.ts — OWNER: H4. The 42 achievements with progress (§H4 P1-8).
import { setMenuTrack } from '../../audio/music-select';
import { ACHIEVEMENT_COUNT, ACHIEVEMENTS, TIER_LABEL, TIER_REWARD, type AchievementDef } from '../achievements';
import { createMenu } from '../menu';
import { loadProfile, type Profile } from '../profile';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';

export function achievementRow(def: AchievementDef, date: string | undefined): HTMLElement {
  const row = h('div', `fp-ach-row is-${def.tier}${date ? ' is-unlocked' : ''}`);
  const head = h('div', 'fp-ach-head');
  head.append(h('span', 'fp-ach-tier', TIER_LABEL[def.tier]), h('b', 'fp-ach-name', def.name));
  row.append(head, h('small', 'fp-ach-desc', `${def.desc} · +${TIER_REWARD[def.tier]}`));
  if (date) row.append(h('small', 'fp-ach-date', date.slice(0, 10)));
  return row;
}

export function unlockedCount(p: Profile): number {
  return ACHIEVEMENTS.filter((a) => a.id in p.achievements).length;
}

export function buildAchievements(host: Host, back: () => void): Screen {
  setMenuTrack('draft');
  const profile = loadProfile(host.kv);
  const el = h('div', 'fp-screen fp-ach-screen');
  const panel = h('div', 'fp-panel fp-ach');
  panel.append(
    h('h2', 'fp-heading', 'ACHIEVEMENTS'),
    h('p', 'fp-corn-balance', `${unlockedCount(profile)} / ${ACHIEVEMENT_COUNT} UNLOCKED`),
  );
  const grid = h('div', 'fp-ach-grid');
  grid.append(...ACHIEVEMENTS.map((a) => achievementRow(a, profile.achievements[a.id])));
  const backItem = buttonItem('BACK', back);
  const row = h('div', 'fp-row');
  row.append(backItem.el);
  panel.append(grid, row);
  el.append(panel);
  return { el, menu: createMenu([backItem], { audio: host.audio, onBack: back }) };
}
