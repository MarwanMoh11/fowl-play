// src/render/overlays.ts — OWNER: A5. Hazard drawing (§8.3 step 7), full-screen flash and debug hitboxes (step 13).
import type { GameState, Hazard } from '../sim/types';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';

const TAU = Math.PI * 2;
export const TELEGRAPH_ALPHA_MIN = 0.3;
export const TELEGRAPH_ALPHA_MAX = 0.7;
export const TELEGRAPH_HZ = 8;
export const TELEGRAPH_BAND_MIN_WIDTH = 24;
export const TELEGRAPH_DASH: number[] = [14, 10];
const NO_DASH: number[] = [];
export const BEAM = { glowColor: '#FF3B3B', glowAlpha: 0.5, glowScale: 1.6, mainColor: '#FF6B6B', coreColor: '#FFFFFF', coreScale: 0.4 } as const;
export const HITBOX_COLORS = { player: '#39FF88', enemy: '#FF3B3B', projectile: '#FFD60A', pickup: '#7FE7FF', hazard: '#FF8AF0' } as const;

function strokeSegment(ctx: CanvasRenderingContext2D, h: Hazard, width: number): void {
  ctx.beginPath();
  ctx.moveTo(h.a.x, h.a.y);
  ctx.lineTo(h.b.x, h.b.y);
  ctx.lineWidth = width;
  ctx.stroke();
}

export function drawHazards(ctx: CanvasRenderingContext2D, hazards: readonly Hazard[], time: number): void {
  const pulse = TELEGRAPH_ALPHA_MIN + (TELEGRAPH_ALPHA_MAX - TELEGRAPH_ALPHA_MIN) * (0.5 + 0.5 * Math.sin(time * TELEGRAPH_HZ * TAU));
  for (const h of hazards) {
    if (!h.alive) continue;
    if (h.kind === 'telegraph') {
      ctx.lineCap = 'butt';
      if (h.width >= TELEGRAPH_BAND_MIN_WIDTH) {
        ctx.strokeStyle = `rgba(255,59,59,${(pulse * 0.5).toFixed(3)})`;
        strokeSegment(ctx, h, h.width);
      }
      ctx.strokeStyle = `rgba(255,59,59,${pulse.toFixed(3)})`;
      ctx.setLineDash(TELEGRAPH_DASH);
      strokeSegment(ctx, h, h.width >= TELEGRAPH_BAND_MIN_WIDTH ? 4 : Math.max(2, h.width));
      ctx.setLineDash(NO_DASH);
    } else {
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,59,59,${BEAM.glowAlpha})`;
      strokeSegment(ctx, h, h.width * BEAM.glowScale);
      ctx.strokeStyle = BEAM.mainColor;
      strokeSegment(ctx, h, h.width);
      ctx.strokeStyle = BEAM.coreColor;
      strokeSegment(ctx, h, h.width * BEAM.coreScale);
    }
  }
  ctx.lineCap = 'butt';
}

/** Full-screen colour wash. Call with the logical-scale transform and no shake. */
export function drawFlash(ctx: CanvasRenderingContext2D, color: string, alpha: number): void {
  if (alpha <= 0.001) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.globalAlpha = 1;
}

function circles(ctx: CanvasRenderingContext2D, color: string, xs: readonly { x: number; y: number; r: number }[]): void {
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (const c of xs) {
    ctx.moveTo(c.x + c.r, c.y);
    ctx.arc(c.x, c.y, c.r, 0, TAU);
  }
  ctx.stroke();
}

const scratch: { x: number; y: number; r: number }[] = [];
function collect<T extends { alive: boolean; pos: { x: number; y: number }; radius: number }>(items: readonly T[]): typeof scratch {
  scratch.length = 0;
  for (const it of items) if (it.alive) scratch.push({ x: it.pos.x, y: it.pos.y, r: it.radius });
  return scratch;
}

/** Circles for every hit radius plus hazard segments. */
export function drawHitboxes(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.lineWidth = 1.5;
  circles(ctx, HITBOX_COLORS.enemy, collect(state.enemies));
  circles(ctx, HITBOX_COLORS.projectile, collect(state.projectiles));
  circles(ctx, HITBOX_COLORS.pickup, collect(state.pickups));
  if (state.player.alive) {
    const p = state.player;
    circles(ctx, HITBOX_COLORS.player, [{ x: p.pos.x, y: p.pos.y, r: p.radius }]);
    ctx.setLineDash(TELEGRAPH_DASH);
    circles(ctx, HITBOX_COLORS.player, [{ x: p.pos.x, y: p.pos.y, r: p.pickupRadius }]);
    ctx.setLineDash(NO_DASH);
  }
  ctx.strokeStyle = HITBOX_COLORS.hazard;
  for (const h of state.hazards) {
    if (!h.alive) continue;
    ctx.beginPath();
    ctx.moveTo(h.a.x, h.a.y);
    ctx.lineTo(h.b.x, h.b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h.a.x, h.a.y);
    ctx.lineTo(h.b.x, h.b.y);
    ctx.lineWidth = Math.max(1.5, h.width);
    ctx.globalAlpha = 0.18;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
  }
}
