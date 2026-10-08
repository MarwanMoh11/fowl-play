// src/render/ambient.ts — OWNER: H5. Per-frame trail emitters: gold chicken sparkles, comet and jet fire, gravity swirls.
import type { SpriteApi } from '../shared/contracts';
import type { GameState, Hazard } from '../sim/types';
import { fxRand, spawnFireball, spawnSparkles, type ParticlePool } from './particles';
import { opt } from './render-maps';
import { mixColor } from './sprites/draw';

export const TRAIL_INTERVAL = 0.05;
export const GOLD_TRAIL_COLOR = '#FFD93B';
export const GRAVITY_SPRITE_W = 128;
export const SWIRL_COUNT = 8;
export const SWIRL_SPEED = 0.5;
export const GRAVITY_SPIN = 0.8;
const SWIRL_COLOR = '#C77DFF';

export interface Ambient { acc: number }
export function createAmbient(): Ambient {
  return { acc: 0 };
}

/** Emits trail particles on a fixed interval, so density does not depend on the frame rate. */
export function emitAmbient(state: GameState, pool: ParticlePool, dt: number, amb: Ambient): void {
  if (dt <= 0) return;
  amb.acc += dt;
  if (amb.acc < TRAIL_INTERVAL) return;
  amb.acc %= TRAIL_INTERVAL;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.kind === 'chicken_gold') {
      spawnSparkles(pool, e.pos.x + (fxRand() - 0.5) * 14, e.pos.y, 1, GOLD_TRAIL_COLOR, 25, 0.35);
    } else if (e.kind === 'comet' || e.kind === 'chicken_jet') {
      spawnFireball(pool, e.pos.x - e.vel.x * 0.05, e.pos.y - e.vel.y * 0.05, 7, 1.5, 0.22);
    }
  }
}

/** Faint, so the swirl never competes with enemy shots (void orbs share its purple). */
export const GRAVITY_ALPHA = 0.32;

/** Gravity well: rotating fx_gravity sprite spanning the pull radius, plus spiral swirl dots drawn inward. */
export function drawGravityWells(ctx: CanvasRenderingContext2D, sprites: SpriteApi, hazards: readonly Hazard[], time: number): void {
  for (const h of hazards) {
    if (!h.alive || h.kind !== 'gravity') continue;
    sprites.draw(ctx, 'fx_gravity', h.a.x, h.a.y, opt(0, time * GRAVITY_SPIN, (h.width * 2) / GRAVITY_SPRITE_W, GRAVITY_ALPHA));
    drawSwirls(ctx, h, time);
  }
}

function drawSwirls(ctx: CanvasRenderingContext2D, h: Hazard, time: number): void {
  for (let k = 0; k < SWIRL_COUNT; k++) {
    const phase = (time * SWIRL_SPEED + k / SWIRL_COUNT) % 1;
    const r = h.width * (1 - phase);
    const a = k * (Math.PI * 2 / SWIRL_COUNT) + time * 2 + (1 - phase) * 2.5;
    ctx.fillStyle = mixColor(SWIRL_COLOR, '#000000', 0.4 * phase);
    ctx.globalAlpha = 0.25 + 0.6 * (1 - phase);
    ctx.beginPath();
    ctx.arc(h.a.x + Math.cos(a) * r, h.a.y + Math.sin(a) * r, 2 + 1.5 * (1 - phase), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
