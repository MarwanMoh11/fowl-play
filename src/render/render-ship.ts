// src/render/render-ship.ts — OWNER: H5. The player's ship: hull by ship id, shield bubbles, overdrive aura and drones.
import type { SpriteApi } from '../shared/contracts';
import { droneCount, dronePos } from '../sim/powerups';
import type { GameState, Vec2 } from '../sim/types';
import { mixColor, rgba } from './sprites/draw';
import { animFrame, BANK_TILT, BLINK_HZ, BLINK_LOW_ALPHA, FRAME_FPS, framesOf, opt, SHIP_SPRITE } from './render-maps';

export const SHIELD_BASE_SCALE = 84 / 96;      // fx_shield_bubble (96 px) drawn about the ship_shield size
export const SHIELD_RING_STEP = 0.1;           // extra charges widen the bubble by this scale each
export const AURA_RADIUS = 58;
export const OD_MAGENTA = '#FF3DCB';
export const OD_GOLD = '#FFC93C';
export const DRONE_FPS = 8;
const TAU = Math.PI * 2;

function drawOverdriveAura(ctx: CanvasRenderingContext2D, pos: Vec2, t: number, reduce: boolean): void {
  const k = 0.5 + 0.5 * Math.sin(t * 5);
  const color = mixColor(OD_MAGENTA, OD_GOLD, k);
  const amp = reduce ? 0.5 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, AURA_RADIUS);
  g.addColorStop(0, rgba(color, 0.55 * amp));
  g.addColorStop(0.6, rgba(color, 0.18 * amp));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, AURA_RADIUS, 0, TAU);
  ctx.fill();
  // Speed streaks trailing down past the hull.
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(color, 0.5 * amp);
  for (let i = 0; i < 5; i++) {
    const x = pos.x + (i - 2) * 14;
    const y0 = pos.y + 26 + ((t * 420 + i * 97) % 180);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + 26);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShieldBubbles(ctx: CanvasRenderingContext2D, sprites: SpriteApi, pos: Vec2, charges: number, t: number): void {
  const base = SHIELD_BASE_SCALE * (1 + 0.03 * Math.sin(t * 3.2));
  sprites.draw(ctx, 'fx_shield_bubble', pos.x, pos.y, opt(0, 0, base, 0.85));
  for (let i = 1; i < charges; i++) {
    sprites.draw(ctx, 'fx_shield_bubble', pos.x, pos.y, opt(0, 0, base + i * SHIELD_RING_STEP, Math.max(0.2, 0.5 - i * 0.08)));
  }
}

function drawDrones(ctx: CanvasRenderingContext2D, sprites: SpriteApi, state: GameState): void {
  const n = droneCount(state);
  if (n <= 0) return;
  const frames = framesOf('drone');
  const t = state.time;
  for (let i = 0; i < n; i++) {
    const p = dronePos(state, i);
    sprites.draw(ctx, 'drone', p.x, p.y, opt(animFrame(t, DRONE_FPS, i, frames), 0.2 * Math.sin(t * 2 + i)));
  }
}

/** Ship hull (blinking while invulnerable), shield bubbles, overdrive aura and drones. */
export function drawShipLayer(ctx: CanvasRenderingContext2D, sprites: SpriteApi, state: GameState, reduce: boolean): void {
  const pl = state.player;
  if (!pl.alive) return;
  const t = state.time;
  if (pl.overdrive > 0) drawOverdriveAura(ctx, pl.pos, t, reduce);
  drawDrones(ctx, sprites, state);
  const key = SHIP_SPRITE[pl.ship];
  const invuln = pl.invulnTimer > 0;
  const alpha = invuln ? (Math.floor(t * BLINK_HZ * 2) % 2 === 0 ? 1 : BLINK_LOW_ALPHA) : 1;
  const frame = animFrame(t, FRAME_FPS.flame, 0, framesOf(key));
  sprites.draw(ctx, key, pl.pos.x, pl.pos.y, opt(frame, pl.bank * BANK_TILT, 1, alpha));
  if (invuln) sprites.draw(ctx, 'ship_shield', pl.pos.x, pl.pos.y, opt(0, 0, 1, Math.min(1, pl.invulnTimer)));
  if (pl.shield > 0) drawShieldBubbles(ctx, sprites, pl.pos, pl.shield, t);
}
