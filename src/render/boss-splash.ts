// src/render/boss-splash.ts — OWNER: H5. P2 boss intro splash: a 1.5 s boss portrait sliding in over speed lines.
import { BOSS_INFO, SPRITE_KEYS, type SpriteApi, type SpriteKey } from '../shared/contracts';
import type { BossId } from '../sim/bosses.types';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';
import { animFrame, FRAME_FPS, framesOf, opt } from './render-maps';
import { rgba, seededRandom } from './sprites/draw';

export const SPLASH_TIME_S = 1.5;
export const SPLASH_SLIDE_S = 0.45;
export const SPLASH_FADE_FROM = 0.8;
export const SPLASH_ALPHA = 0.85;
export const SPLASH_SCALE = 1.2;
export const SPLASH_BAND = { top: 0.2, height: 0.44 } as const;
export const SPLASH_LINES = 16;
const SPLASH_SEED = 0x5b1a;

export interface Splash { active: boolean; key: SpriteKey; t: number }

export function createSplash(): Splash {
  return { active: false, key: 'boss_hen', t: 0 };
}

/** Sprite of the boss named in a boss_warning event, or null when that boss has no art. */
export function bossKeyForName(name: string): SpriteKey | null {
  for (const id of Object.keys(BOSS_INFO) as BossId[]) {
    if (BOSS_INFO[id].name !== name) continue;
    const key = `boss_${id}`;
    return (SPRITE_KEYS as readonly string[]).includes(key) ? (key as SpriteKey) : null;
  }
  return null;
}

export function startSplash(s: Splash, name: string): void {
  const key = bossKeyForName(name);
  s.active = key !== null;
  s.t = 0;
  if (key) s.key = key;
}

export function updateSplash(s: Splash, dt: number): void {
  if (!s.active) return;
  s.t += dt;
  if (s.t >= SPLASH_TIME_S) s.active = false;
}

/** Dark band with speed lines; the portrait slides in from the right and fades out over the last fifth. */
export function drawSplash(ctx: CanvasRenderingContext2D, sprites: SpriteApi, s: Splash): void {
  if (!s.active) return;
  const u = s.t / SPLASH_TIME_S;
  const alpha = SPLASH_ALPHA * (u > SPLASH_FADE_FROM ? (1 - u) / (1 - SPLASH_FADE_FROM) : 1);
  const top = WORLD_H * SPLASH_BAND.top;
  const h = WORLD_H * SPLASH_BAND.height;
  ctx.globalAlpha = 0.4 * alpha;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, top, WORLD_W, h);
  const rnd = seededRandom(SPLASH_SEED);
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba('#FFFFFF', 0.45 * alpha);
  for (let i = 0; i < SPLASH_LINES; i++) {
    const y = top + rnd() * h;
    const x = rnd() * WORLD_W;
    const len = 60 + rnd() * 140;
    const drift = ((s.t * 900 * (0.5 + rnd())) % (WORLD_W + len));
    ctx.beginPath();
    ctx.moveTo(WORLD_W - ((x + drift) % (WORLD_W + len)), y);
    ctx.lineTo(WORLD_W - ((x + drift) % (WORLD_W + len)) + len, y);
    ctx.stroke();
  }
  const slide = Math.min(1, s.t / SPLASH_SLIDE_S);
  const eased = 1 - (1 - slide) * (1 - slide) * (1 - slide);
  const x = WORLD_W + 160 - eased * (WORLD_W * 0.3 + 160);
  const frames = framesOf(s.key);
  sprites.draw(ctx, s.key, x, top + h / 2, opt(animFrame(s.t, FRAME_FPS.hen, 0, frames), 0, SPLASH_SCALE, alpha));
  ctx.globalAlpha = 1;
}
