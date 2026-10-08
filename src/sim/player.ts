// src/sim/player.ts — OWNER: A2. Ship movement, death and respawn (§7.3).
import type { Difficulty, GameState, InputFrame, Player } from './types';
import { emit } from './events';
import { approach, clamp } from './math';
import { DIFFICULTY } from './difficulty';
import { clearEnemyProjectiles } from './projectiles';
import { PHASE_TIME, SHIP_MAX_X, SHIP_MAX_Y, SHIP_MIN_X, SHIP_MIN_Y, SHIP_SPAWN } from './tuning/core';
import { PLAYER, TIMER_EPSILON } from './tuning/weapons';

export function createPlayer(d: Difficulty): Player {
  return {
    pos: { x: SHIP_SPAWN.x, y: SHIP_SPAWN.y },
    radius: PLAYER.radius,
    pickupRadius: PLAYER.pickupRadius,
    alive: true,
    lives: DIFFICULTY[d].lives,
    weapon: 'pulse',
    power: 0,
    heat: 0,
    overheated: false,
    fireCooldown: 0,
    missiles: DIFFICULTY[d].missiles,
    missileCooldown: 0,
    food: 0,
    invulnTimer: PLAYER.startInvuln,
    respawnTimer: 0,
    bank: 0,
  };
}

function respawn(state: GameState): void {
  const p = state.player;
  p.alive = true;
  p.pos.x = SHIP_SPAWN.x;
  p.pos.y = SHIP_SPAWN.y;
  p.invulnTimer = PLAYER.respawnInvuln;
  p.respawnTimer = 0;
  p.bank = 0;
  clearEnemyProjectiles(state, { x: SHIP_SPAWN.x, y: SHIP_SPAWN.y }, PLAYER.respawnClearRadius);
  emit(state, { type: 'player_respawned', x: p.pos.x, y: p.pos.y });
}

/** Moves the ship for one tick and returns its horizontal velocity (px/s). */
function moveShip(p: Player, input: InputFrame, dt: number): number {
  const startX = p.pos.x;
  if (input.pointer) {
    const tx = clamp(input.pointer.x, SHIP_MIN_X, SHIP_MAX_X);
    const ty = clamp(input.pointer.y, SHIP_MIN_Y, SHIP_MAX_Y);
    const dx = tx - p.pos.x;
    const dy = ty - p.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const step = Math.min(d, PLAYER.pointerMaxSpeed * dt);
    if (d > 0) {
      p.pos.x += (dx / d) * step;
      p.pos.y += (dy / d) * step;
    }
  } else {
    let mx = input.moveX;
    let my = input.moveY;
    const l = Math.sqrt(mx * mx + my * my);
    if (l > 1) {
      mx /= l;
      my /= l;
    }
    p.pos.x += mx * PLAYER.keyboardSpeed * dt;
    p.pos.y += my * PLAYER.keyboardSpeed * dt;
  }
  p.pos.x = clamp(p.pos.x, SHIP_MIN_X, SHIP_MAX_X);
  p.pos.y = clamp(p.pos.y, SHIP_MIN_Y, SHIP_MAX_Y);
  return dt > 0 ? (p.pos.x - startX) / dt : 0;
}

export function updatePlayer(state: GameState, input: InputFrame, dt: number): void {
  const p = state.player;
  if (!p.alive) {
    p.bank = approach(p.bank, 0, PLAYER.bankRate * dt);
    if (p.respawnTimer > 0) {
      p.respawnTimer -= dt;
      if (p.respawnTimer <= TIMER_EPSILON) p.respawnTimer = 0;
    }
    if (p.respawnTimer <= 0 && p.lives > 0) respawn(state);
    return;
  }
  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  const vx = moveShip(p, input, dt);
  const target = clamp(vx / PLAYER.bankDivisor, -1, 1);
  p.bank = approach(p.bank, target, PLAYER.bankRate * dt);
}

export function isPlayerVulnerable(state: GameState): boolean {
  const p = state.player;
  return p.alive && p.invulnTimer <= 0 && !state.debug.godMode;
}

export function killPlayer(state: GameState): void {
  if (!isPlayerVulnerable(state)) return;
  const p = state.player;
  p.alive = false;
  p.lives -= 1;
  const before = p.power;
  p.power = Math.max(0, p.power - DIFFICULTY[state.difficulty].deathPowerLoss);
  if (p.power !== before) emit(state, { type: 'power_changed', power: p.power, delta: p.power - before });
  p.heat = 0;
  p.overheated = false;
  p.fireCooldown = 0;
  state.chapterStats.deaths += 1;
  state.runStats.deaths += 1;
  emit(state, { type: 'player_died', x: p.pos.x, y: p.pos.y, livesLeft: p.lives });
  p.respawnTimer = p.lives > 0 ? PLAYER.respawnDelay : PHASE_TIME.gameOverDelay;
}
