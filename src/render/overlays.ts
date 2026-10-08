// src/render/overlays.ts — OWNER: H5 (was A5). Hazard drawing (§8.3 step 7), full-screen flash and debug hitboxes (step 13).
import type { GameState, Hazard } from '../sim/types';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';
import { rgba } from './sprites/draw';

const TAU = Math.PI * 2;
export const TELEGRAPH_ALPHA_MIN = 0.3;
export const TELEGRAPH_ALPHA_MAX = 0.7;
export const TELEGRAPH_HZ = 8;
export const TELEGRAPH_BAND_MIN_WIDTH = 24;
export const TELEGRAPH_DASH: number[] = [14, 10];
const NO_DASH: number[] = [];
export const BEAM = { glowColor: '#FF3B3B', glowAlpha: 0.5, glowScale: 1.6, mainColor: '#FF6B6B', coreColor: '#FFFFFF', coreScale: 0.4 } as const;
export const HITBOX_COLORS = { player: '#39FF88', enemy: '#FF3B3B', projectile: '#FFD60A', pickup: '#7FE7FF', hazard: '#FF8AF0' } as const;

/** Beam colours: boss beams are red; environment beams are tinted by chapter (ch 7 solar flare, ch 10 storm). */
export interface BeamTint { glow: string; main: string }
export const BOSS_TINT: BeamTint = { glow: BEAM.glowColor, main: BEAM.mainColor };
export const FLARE_TINT: BeamTint = { glow: '#FF8A1E', main: '#FFB347' };
export const STORM_TINT: BeamTint = { glow: '#2E9BFF', main: '#7FE7FF' };
export const FLARE_CHAPTER = 7;
export const STORM_CHAPTER = 10;
const CYCLE = 12;

export function hazardTint(h: Hazard, chapter: number): BeamTint {
  if (h.ownerId !== -1) return BOSS_TINT;
  const c = ((Math.floor(chapter) - 1) % CYCLE + CYCLE) % CYCLE + 1;
  if (c === FLARE_CHAPTER) return FLARE_TINT;
  if (c === STORM_CHAPTER) return STORM_TINT;
  return BOSS_TINT;
}

function strokeSegment(ctx: CanvasRenderingContext2D, h: Hazard, width: number): void {
  ctx.beginPath();
  ctx.moveTo(h.a.x, h.a.y);
  ctx.lineTo(h.b.x, h.b.y);
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawTelegraph(ctx: CanvasRenderingContext2D, h: Hazard, pulse: number, tint: BeamTint): void {
  ctx.lineCap = 'butt';
  if (h.width >= TELEGRAPH_BAND_MIN_WIDTH) {
    ctx.strokeStyle = rgba(tint.glow, Number((pulse * 0.5).toFixed(3)));
    strokeSegment(ctx, h, h.width);
  }
  ctx.strokeStyle = rgba(tint.glow, Number(pulse.toFixed(3)));
  ctx.setLineDash(TELEGRAPH_DASH);
  strokeSegment(ctx, h, h.width >= TELEGRAPH_BAND_MIN_WIDTH ? 4 : Math.max(2, h.width));
  ctx.setLineDash(NO_DASH);
}

function drawBeam(ctx: CanvasRenderingContext2D, h: Hazard, tint: BeamTint): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(tint.glow, BEAM.glowAlpha);
  strokeSegment(ctx, h, h.width * BEAM.glowScale);
  ctx.strokeStyle = tint.main;
  strokeSegment(ctx, h, h.width);
  ctx.strokeStyle = BEAM.coreColor;
  strokeSegment(ctx, h, h.width * BEAM.coreScale);
}

/** Telegraphs and beams. Gravity wells are drawn separately (gravity.ts). */
export function drawHazards(ctx: CanvasRenderingContext2D, hazards: readonly Hazard[], time: number, chapter = 1): void {
  const pulse = TELEGRAPH_ALPHA_MIN + (TELEGRAPH_ALPHA_MAX - TELEGRAPH_ALPHA_MIN) * (0.5 + 0.5 * Math.sin(time * TELEGRAPH_HZ * TAU));
  for (const h of hazards) {
    if (!h.alive || h.kind === 'gravity') continue;
    const tint = hazardTint(h, chapter);
    if (h.kind === 'telegraph') drawTelegraph(ctx, h, pulse, tint);
    else drawBeam(ctx, h, tint);
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
