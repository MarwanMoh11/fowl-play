// src/ui/screens/ship-card.ts — OWNER: H4. A ship's art, name, blurb and stat bars (loadout carousel and hangar).
import { SHIPS } from '../../sim/tuning/loadout';
import type { ShipId } from '../../sim/types';
import type { SpriteApi, SpriteKey } from '../../shared/contracts';
import { h } from '../widgets';

export const SHIP_SPRITE: Record<ShipId, SpriteKey> = {
  falcon: 'ship', bantam: 'ship_bantam', bulwark: 'ship_bulwark', phoenix: 'ship_phoenix',
};

export interface StatBar { label: string; value: number }

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Four 0..1 bars summing up the ship's tuning numbers. Cosmetic only; the sim never reads them. */
export function shipBars(id: ShipId): StatBar[] {
  const d = SHIPS[id];
  const speed = d.fx.mul?.moveSpeedMul ?? 1;
  const fire = d.fx.mul?.fireRateMul ?? 1;
  return [
    { label: 'SPEED', value: clamp01(0.5 + (speed - 1) * 2.5) },
    { label: 'FIRE RATE', value: clamp01(0.5 + (fire - 1) * 4) },
    { label: 'HULL', value: clamp01(0.45 + 0.25 * d.lives + 0.15 * d.shield + 0.3 * d.revives) },
    { label: 'FIREPOWER', value: clamp01(0.2 + 0.15 * d.power + 0.1 * d.missiles) },
  ];
}

function bar(stat: StatBar): HTMLElement {
  const row = h('div', 'fp-bar');
  const fill = h('i', 'fp-bar-fill');
  fill.style.width = `${Math.round(stat.value * 100)}%`;
  row.append(h('span', 'fp-bar-label', stat.label), h('span', 'fp-bar-track'), fill);
  row.querySelector('.fp-bar-track')?.append(fill);
  return row;
}

/** Ship card: art, name, blurb, bars and a status line such as "OWNED" or "LOCKED · 400 CORN". */
export function buildShipCard(sprites: SpriteApi, id: ShipId, status: string, locked: boolean): HTMLElement {
  const d = SHIPS[id];
  const card = h('div', `fp-ship-card${locked ? ' is-locked' : ''}`);
  const art = h('span', 'fp-ship-art');
  try {
    art.append(sprites.toCanvas(SHIP_SPRITE[id]));
  } catch {
    /* art not available: keep the name and bars */
  }
  const head = h('div', 'fp-ship-head');
  head.append(h('b', 'fp-ship-name', d.name), h('small', 'fp-ship-status', status));
  const bars = h('div', 'fp-bars');
  bars.append(...shipBars(id).map(bar));
  card.append(art, head, h('p', 'fp-ship-desc', d.desc), bars);
  card.style.setProperty('--ship', d.color);
  return card;
}
