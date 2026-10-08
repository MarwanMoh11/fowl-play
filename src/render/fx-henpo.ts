// src/render/fx-henpo.ts — OWNER: H5. Effects for the HENPOCALYPSE events of §4.2 (player, power-ups, enemies, rail beams).
import type { GameEvent } from '../sim/events';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';
import type { PowerupId, Vec2 } from '../sim/types';
import { rgba } from './sprites/draw';
import {
  fxRand, spawnConverging, spawnDebris, spawnFeathers, spawnFireball, spawnMuzzle, spawnRing, spawnSmoke,
  spawnSparkles, spawnSparks, spawnText, spawnYolk, type ParticlePool,
} from './particles';
import type { ScreenFlash, Shake } from './shake';

export const RAIL_FADE_S = 0.15;
export const MAX_RAILS = 8;
export const HENPO = {
  magenta: '#FF3DCB', gold: '#FFD93B', goldRing: '#FFC93C', cyan: '#7FE7FF', shield: '#4CC9F0', purple: '#9B5DE5',
  green: '#39FF88', fire: '#FF8A1E', yolk: '#FFC21A', shell: '#FFF3D6', grey: '#9AA7B8', railGlow: '#7FE7FF', railCore: '#FFFFFF',
  spark: '#FFD60A', popcorn: '#FFF3B0', drone: '#8FE3FF',
} as const;
export const POWERUP_COLOR: Record<PowerupId, string> = {
  magnet: '#E63946', rapid: '#FFD60A', drones: '#8FE3FF', timewarp: '#9B5DE5', double: '#FFC93C',
};

export interface RailBeam { active: boolean; x: number; y0: number; y1: number; width: number; t: number }
export interface FxSinks { pool: ParticlePool; shake: Shake; flash: ScreenFlash; ship: Vec2 | null; rails: RailBeam[] }

export function createRails(): RailBeam[] {
  const rails: RailBeam[] = [];
  for (let i = 0; i < MAX_RAILS; i++) rails.push({ active: false, x: 0, y0: 0, y1: 0, width: 1, t: 0 });
  return rails;
}

export function updateRails(rails: RailBeam[], dt: number): void {
  for (const r of rails) {
    if (!r.active) continue;
    r.t += dt;
    if (r.t >= RAIL_FADE_S) r.active = false;
  }
}

export function resetRails(rails: RailBeam[]): void {
  for (const r of rails) r.active = false;
}

/** Bright column from the muzzle to the hit point: wide glow, cyan body, white core. Fades over RAIL_FADE_S. */
export function drawRails(ctx: CanvasRenderingContext2D, rails: readonly RailBeam[]): void {
  for (const r of rails) {
    if (!r.active) continue;
    const a = 1 - r.t / RAIL_FADE_S;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(r.x, r.y0);
    ctx.lineTo(r.x, r.y1);
    ctx.strokeStyle = rgba(HENPO.railGlow, 0.35 * a);
    ctx.lineWidth = r.width * 3;
    ctx.stroke();
    ctx.strokeStyle = rgba(HENPO.railGlow, 0.9 * a);
    ctx.lineWidth = r.width;
    ctx.stroke();
    ctx.strokeStyle = rgba(HENPO.railCore, a);
    ctx.lineWidth = Math.max(1, r.width * 0.4);
    ctx.stroke();
  }
}

function addRail(s: FxSinks, x: number, y0: number, y1: number, width: number): void {
  let slot = s.rails.find((r) => !r.active);
  if (!slot) slot = s.rails[0];
  slot.active = true; slot.x = x; slot.y0 = y0; slot.y1 = y1; slot.width = width; slot.t = 0;
  spawnSparks(s.pool, x, y1, 10, HENPO.railCore, 0.9);
  for (let i = 0; i < 6; i++) spawnSparks(s.pool, x, y1 + fxRand() * (y0 - y1), 1, HENPO.cyan, 0.5);
  s.shake.add(0.08);
}

/** Position of the player's ship, or a fallback point when the ship is dead. */
function at(s: FxSinks, dy = 0): Vec2 {
  return s.ship ? { x: s.ship.x, y: s.ship.y + dy } : { x: WORLD_W / 2, y: WORLD_H * 0.8 + dy };
}

function playerFx(e: GameEvent, s: FxSinks): boolean {
  const { pool } = s;
  switch (e.type) {
    case 'combo': {
      const p = at(s, -50);
      spawnText(pool, p.x, p.y, `COMBO ×${e.mult}!`, Math.min(2.2, 1 + (e.mult - 1) * 0.3), HENPO.spark, 1);
      return true;
    }
    case 'combo_break': {
      const p = at(s, -50);
      spawnText(pool, p.x, p.y, 'CHAIN LOST', 1, HENPO.grey, 0.9);
      return true;
    }
    case 'fury_full': {
      const p = at(s);
      spawnRing(pool, p.x, p.y, 20, 70, 0.45, HENPO.magenta, 4);
      spawnSparkles(pool, p.x, p.y, 10, HENPO.goldRing, 80);
      return true;
    }
    case 'overdrive_start':
      spawnRing(pool, e.x, e.y, 0, 360, 0.7, HENPO.magenta, 10);
      spawnRing(pool, e.x, e.y, 0, 220, 0.45, HENPO.goldRing, 6);
      spawnSparkles(pool, e.x, e.y, 24, HENPO.magenta, 220, 0.6);
      s.flash.trigger(0.18, HENPO.magenta);
      s.shake.add(0.45);
      return true;
    case 'overdrive_end': {
      const p = at(s);
      spawnRing(pool, p.x, p.y, 80, 30, 0.35, HENPO.magenta, 3);
      spawnSparks(pool, p.x, p.y, 10, HENPO.magenta);
      return true;
    }
    case 'powerup_start': {
      const p = at(s);
      const c = POWERUP_COLOR[e.id];
      spawnRing(pool, p.x, p.y, 0, 90, 0.5, c, 5);
      spawnSparkles(pool, p.x, p.y, 12, c, 90, 0.6);
      return true;
    }
    case 'powerup_end': {
      const p = at(s);
      spawnConverging(pool, p.x, p.y, 10, 40, 0.35, POWERUP_COLOR[e.id]);
      return true;
    }
    default:
      return rewardFx(e, s);
  }
}

function rewardFx(e: GameEvent, s: FxSinks): boolean {
  const { pool } = s;
  switch (e.type) {
    case 'shield_absorb':
      spawnDebris(pool, e.x, e.y, 6, HENPO.cyan);
      spawnRing(pool, e.x, e.y, 0, 70, 0.3, HENPO.cyan, 4);
      spawnSparkles(pool, e.x, e.y, 10, HENPO.cyan, 120, 0.35);
      s.shake.add(0.2);
      return true;
    case 'player_revived':
      spawnFeathers(pool, e.x, e.y, 18, HENPO.gold, 10);
      spawnRing(pool, e.x, e.y, 0, 120, 0.6, HENPO.goldRing, 6);
      s.flash.trigger(0.12, HENPO.goldRing);
      s.shake.add(0.2);
      return true;
    case 'perk_draft': {
      const p = at(s);
      spawnSparkles(pool, p.x, p.y, 28, HENPO.goldRing, 100, 0.9);
      spawnRing(pool, p.x, p.y, 0, 90, 0.6, HENPO.goldRing, 4);
      return true;
    }
    case 'perk_chosen': {
      const p = at(s);
      spawnSparkles(pool, p.x, p.y, 16, HENPO.goldRing, 80, 0.7);
      return true;
    }
    case 'corn_collected': {
      const p = at(s);
      spawnSparkles(pool, p.x, p.y, 6, HENPO.gold, 50, 0.5);
      return true;
    }
    case 'crit':
      spawnText(pool, e.x, e.y - 12, 'CRIT!', 1.2, HENPO.spark, 0.6);
      spawnSparks(pool, e.x, e.y, 4, HENPO.spark);
      return true;
    case 'drone_fire':
      spawnMuzzle(pool, e.x, e.y, HENPO.drone, 0.05, 5);
      return true;
    default:
      return false;
  }
}

function enemyFx(e: GameEvent, s: FxSinks): boolean {
  const { pool } = s;
  switch (e.type) {
    case 'enemy_shield_hit':
      spawnSparks(pool, e.x, e.y, 5, HENPO.shield, 0.8);
      return true;
    case 'enemy_shield_break':
      spawnRing(pool, e.x, e.y, 0, 60, 0.3, HENPO.cyan, 5);
      spawnDebris(pool, e.x, e.y, 5, HENPO.cyan);
      spawnSparks(pool, e.x, e.y, 6, HENPO.cyan);
      return true;
    case 'enemy_teleport':
      spawnSmoke(pool, e.fromX, e.fromY, 0.4, 1.4, 0.6, 0.55);
      spawnSmoke(pool, e.x, e.y, 0.3, 1.1, 0.5, 0.5);
      spawnSparks(pool, e.fromX, e.fromY, 8, HENPO.purple, 0.8);
      spawnSparks(pool, e.x, e.y, 8, HENPO.purple, 0.8);
      return true;
    case 'enemy_cloak':
      spawnSmoke(pool, e.x, e.y, 0.3, 1.1, 0.6, 0.55);
      spawnSparks(pool, e.x, e.y, e.on ? 6 : 3, HENPO.purple, 0.8);
      return true;
    case 'enemy_heal':
      spawnRing(pool, e.x, e.y, 0, e.radius, 0.45, HENPO.green, 4);
      spawnSparkles(pool, e.x, e.y, 8, HENPO.green, 40, 0.6);
      spawnText(pool, e.x - 14, e.y - 6, '+', 1.1, HENPO.green, 0.7);
      spawnText(pool, e.x + 12, e.y - 14, '+', 0.9, HENPO.green, 0.6);
      return true;
    case 'pod_hatch':
      spawnYolk(pool, e.x, e.y, 8);
      spawnDebris(pool, e.x, e.y, 8, HENPO.shell);
      spawnRing(pool, e.x, e.y, 0, 40, 0.3, HENPO.shell, 3);
      return true;
    case 'projectile_burst':
      spawnRing(pool, e.x, e.y, 0, 90, 0.35, HENPO.fire, 6);
      spawnSparks(pool, e.x, e.y, 12, HENPO.fire);
      spawnFireball(pool, e.x, e.y, 8, 40, 0.3);
      return true;
    default:
      return specialFx(e, s);
  }
}

function specialFx(e: GameEvent, s: FxSinks): boolean {
  const { pool } = s;
  switch (e.type) {
    case 'golden_appear':
      spawnSparkles(pool, e.x, e.y, 14, HENPO.gold, 90, 0.8);
      spawnRing(pool, e.x, e.y, 0, 60, 0.4, HENPO.gold, 3);
      return true;
    case 'golden_escaped':
      spawnText(pool, WORLD_W / 2 - 170, WORLD_H * 0.42, 'IT GOT AWAY!', 2.2, HENPO.gold, 1.4);
      return true;
    case 'rail':
      addRail(s, e.x, e.y0, e.y1, e.width);
      return true;
    case 'chain_explosion':
      spawnSparkles(pool, e.x, e.y, 12, HENPO.popcorn, e.radius * 1.1, 0.45);
      spawnRing(pool, e.x, e.y, 0, e.radius, 0.3, HENPO.spark, 4);
      spawnFireball(pool, e.x, e.y, e.radius * 0.2, e.radius * 0.6, 0.25);
      return true;
    default:
      return false;
  }
}

/** Handles the HENPOCALYPSE events; returns false for events it does not own. */
export function handleHenpoEvent(e: GameEvent, s: FxSinks): boolean {
  return playerFx(e, s) || enemyFx(e, s);
}
