// src/ui/hud-powerups.ts — OWNER: H4. Power-up timers (icons with shrinking arcs), shield pips and revives (§H4 P0-4).
import type { SpriteApi, SpriteKey } from '../shared/contracts';
import type { GameState, PowerupId } from '../sim/types';
import { POWERUP_IDS } from '../sim/types';
import { POWERUP_TIME } from '../sim/tuning/loadout';
import { clamp01, drawText } from './text';

export const ICON_SIZE = 26;
const TIMER_X = 16;
const TIMER_Y = 640;
const TIMER_STEP = 44;
const ARC_R = 16;
const ARC_COLOR = '#FFD60A';
const SHIELD_Y = 604;
const SHIELD_STEP = 22;
const REVIVE_COLOR = '#FFD60A';
const ICON: Record<PowerupId, SpriteKey> = {
  magnet: 'icon_pu_magnet', rapid: 'icon_pu_rapid', drones: 'icon_pu_drones', timewarp: 'icon_pu_timewarp', double: 'icon_pu_double',
};

/** Seconds left for each active timed power-up, in a fixed order. */
export function activePowerups(state: GameState): { id: PowerupId; left: number; frac: number }[] {
  const out: { id: PowerupId; left: number; frac: number }[] = [];
  for (const id of POWERUP_IDS) {
    const left = state.player.powerups[id] ?? 0;
    if (left > 0) out.push({ id, left, frac: clamp01(left / POWERUP_TIME[id]) });
  }
  return out;
}

function drawTimer(ctx: CanvasRenderingContext2D, sprites: SpriteApi, x: number, id: PowerupId, left: number, frac: number): void {
  sprites.draw(ctx, ICON[id], x, TIMER_Y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = ARC_COLOR;
  ctx.beginPath();
  ctx.arc(x, TIMER_Y, ARC_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  drawText(ctx, String(Math.ceil(left)), x + ARC_R + 6, TIMER_Y, 14);
}

/** Power-up timers above the bottom bar on the left, then shield pips and the revive count. */
export function drawPowerups(ctx: CanvasRenderingContext2D, state: GameState, sprites: SpriteApi): void {
  activePowerups(state).forEach((pu, i) => drawTimer(ctx, sprites, TIMER_X + i * TIMER_STEP + ICON_SIZE / 2, pu.id, pu.left, pu.frac));
  const p = state.player;
  for (let i = 0; i < p.shield; i++) sprites.draw(ctx, 'icon_shield', TIMER_X + i * SHIELD_STEP + 10, SHIELD_Y);
  if (p.revives > 0) {
    const x = TIMER_X + Math.max(1, p.shield) * SHIELD_STEP + 6;
    drawText(ctx, `REVIVE ×${p.revives}`, x, SHIELD_Y, 14, { fill: REVIVE_COLOR });
  }
}
