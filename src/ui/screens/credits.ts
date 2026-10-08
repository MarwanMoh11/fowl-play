// src/ui/screens/credits.ts — OWNER: A4. Credits screen (§8.7).
import { createMenu } from '../menu';
import { buttonItem, h } from '../widgets';
import type { Host, Screen } from './host';

export const CREDITS_LINES = [
  'Design and code: an AI agent team.',
  'Inspired by classic chicken-invasion arcade shooters.',
  'All art, music and sound generated procedurally.',
];

export function buildCredits(host: Host, back: () => void): Screen {
  const el = h('div', 'fp-screen');
  const panel = h('div', 'fp-panel fp-credits');
  panel.append(h('h2', 'fp-heading', 'CREDITS'));
  for (const line of CREDITS_LINES) panel.append(h('p', 'fp-credit-line', line));
  const backItem = buttonItem('BACK', back);
  const row = h('div', 'fp-row');
  row.append(backItem.el);
  panel.append(row);
  el.append(panel);
  return { el, menu: createMenu([backItem], { audio: host.audio, onBack: back }) };
}
