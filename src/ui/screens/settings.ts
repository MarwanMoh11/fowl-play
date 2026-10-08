// src/ui/screens/settings.ts — OWNER: A4. Settings: changes apply immediately and persist (§8.7).
import type { Settings } from '../../shared/contracts';
import { createMenu } from '../menu';
import { buttonItem, h, sliderItem, toggleItem, type MenuItem } from '../widgets';
import type { Host, Screen } from './host';

type VolumeKey = 'masterVolume' | 'musicVolume' | 'sfxVolume';
type ToggleKey = 'screenShake' | 'reduceFlashes' | 'showFps' | 'autoFire' | 'mouseControl';

export const VOLUME_ROWS: readonly { key: VolumeKey; label: string }[] = [
  { key: 'masterVolume', label: 'MASTER VOLUME' },
  { key: 'musicVolume', label: 'MUSIC VOLUME' },
  { key: 'sfxVolume', label: 'SFX VOLUME' },
];

export const TOGGLE_ROWS: readonly { key: ToggleKey; label: string }[] = [
  { key: 'screenShake', label: 'SCREEN SHAKE' },
  { key: 'reduceFlashes', label: 'REDUCE FLASHES' },
  { key: 'showFps', label: 'SHOW FPS' },
  { key: 'autoFire', label: 'AUTO-FIRE' },
  { key: 'mouseControl', label: 'MOUSE CONTROL' },
];

export function buildSettings(host: Host, back: () => void): Screen {
  const s: Settings = host.settings();
  const items: MenuItem[] = [
    ...VOLUME_ROWS.map((r) => sliderItem(r.label, s[r.key], (v) => host.update({ [r.key]: v }))),
    ...TOGGLE_ROWS.map((r) => toggleItem(r.label, s[r.key], (v) => host.update({ [r.key]: v }))),
    buttonItem('BACK', back),
  ];
  const el = h('div', 'fp-screen');
  const panel = h('div', 'fp-panel fp-settings');
  panel.append(h('h2', 'fp-heading', 'SETTINGS'));
  const list = h('div', 'fp-list');
  list.append(...items.map((i) => i.el));
  panel.append(list);
  el.append(panel);
  return { el, menu: createMenu(items, { audio: host.audio, onBack: back }) };
}
