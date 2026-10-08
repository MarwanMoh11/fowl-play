// src/render/render-entities.ts — OWNER: H5. Draws enemies (shields, cloak, boss death ghosts), pickups and projectiles.
import type { SpriteApi, SpriteKey } from '../shared/contracts';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';
import type { Enemy, GameState, Vec2 } from '../sim/types';
import type { BossGhost } from './effects';
import {
  animFrame, CLOAK_ALPHA, CLOAK_FLICKER, enemyLook, ENEMY_SPRITE, FRAME_FPS, framesOf, opt, PICKUP_SPRITE,
  projectileLook, type EnemyPose, type ProjectilePose,
} from './render-maps';

export const CULL_MARGIN = 120;
export const CULL_MARGIN_BOSS = 400;
export const FLASH_OVERLAY_ALPHA = 0.8;
export const FLASH_OVERLAY_ALPHA_BOSS = 0.55;
/** Enemy shield bubble diameter as a multiple of the enemy's hit radius. */
export const ENEMY_SHIELD_DIAMETER = 2.4;
export const GHOST_FLASH_FPS = FRAME_FPS.ghostFlash;

export function onScreen(p: Vec2, margin: number): boolean {
  return p.x > -margin && p.x < WORLD_W + margin && p.y > -margin && p.y < WORLD_H + margin;
}

function drawEnemyShield(ctx: CanvasRenderingContext2D, sprites: SpriteApi, e: Enemy): void {
  const frac = Math.max(0, Math.min(1, e.shield / e.maxShield));
  const w = sprites.size('fx_shield_bubble').w;
  sprites.draw(ctx, 'fx_shield_bubble', e.pos.x, e.pos.y, opt(0, 0, (e.radius * ENEMY_SHIELD_DIAMETER) / w, 0.25 + 0.6 * frac));
}

function drawGhosts(ctx: CanvasRenderingContext2D, sprites: SpriteApi, ghosts: readonly BossGhost[]): void {
  for (const g of ghosts) {
    if (!g.active) continue;
    const flicker = Math.floor(g.t * GHOST_FLASH_FPS) % 2 === 0;
    const jitter = (1 - g.t / 2.5) * 3;
    sprites.draw(ctx, ENEMY_SPRITE[g.kind], g.x + Math.sin(g.t * 90) * jitter, g.y + Math.cos(g.t * 70) * jitter,
      opt(g.frame, 0, 1, 1, flicker));
  }
}

/** Enemies of one class (bosses or the rest), with shields, cloak, hit flash and (for bosses) death ghosts. */
export function drawEnemyLayer(ctx: CanvasRenderingContext2D, sprites: SpriteApi, state: GameState, boss: boolean, ghosts: readonly BossGhost[]): void {
  const t = state.time;
  const pose: EnemyPose = { key: 'ship', frame: 0 };
  for (const e of state.enemies) {
    if (!e.alive || e.isBoss !== boss || !onScreen(e.pos, boss ? CULL_MARGIN_BOSS : CULL_MARGIN)) continue;
    enemyLook(e, t, pose);
    const cloaked = e.invulnerable && !e.isBoss;
    const alpha = cloaked ? Math.max(0.05, CLOAK_ALPHA + CLOAK_FLICKER * Math.sin(t * 31 + e.id * 1.7)) : 1;
    sprites.draw(ctx, pose.key, e.pos.x, e.pos.y, opt(pose.frame, e.rotation, 1, alpha));
    if (e.maxShield > 0 && e.shield > 0) drawEnemyShield(ctx, sprites, e);
    if (e.hitFlash > 0) {
      // White silhouette laid over the sprite; partly transparent so a boss under constant fire stays readable.
      sprites.draw(ctx, pose.key, e.pos.x, e.pos.y, opt(pose.frame, e.rotation, 1, boss ? FLASH_OVERLAY_ALPHA_BOSS : FLASH_OVERLAY_ALPHA, true));
    }
  }
  if (boss) drawGhosts(ctx, sprites, ghosts);
}

export function drawPickupLayer(ctx: CanvasRenderingContext2D, sprites: SpriteApi, state: GameState): void {
  for (const p of state.pickups) {
    if (!p.alive) continue;
    const key: SpriteKey = PICKUP_SPRITE[p.kind];
    // Single-frame pickups resolve to frame 0 here, so every pickup can share this line.
    sprites.draw(ctx, key, p.pos.x, p.pos.y, opt(animFrame(state.time, FRAME_FPS.pickup, p.id, framesOf(key)), p.spin));
  }
}

/** Player (player = true) or enemy projectiles. Enemy shots are drawn after the player's so they read on top. */
export function drawProjectileLayer(ctx: CanvasRenderingContext2D, sprites: SpriteApi, state: GameState, player: boolean): void {
  const pose: ProjectilePose = { key: 'ship', frame: 0, rotation: 0, scale: 1, alpha: 1 };
  for (const p of state.projectiles) {
    if (!p.alive || (p.owner === 'player') !== player) continue;
    projectileLook(p, state.time, pose);
    sprites.draw(ctx, pose.key, p.pos.x, p.pos.y, opt(pose.frame, pose.rotation, pose.scale, pose.alpha));
  }
}
