// src/sim/player.ts — OWNER: H1 (was A2). Ship movement, death and respawn (§7.3), shields and revives.
import type { Difficulty, GameState, InputFrame, Loadout, Player } from './types';
import { emit } from './events';
import { approach, clamp } from './math';
import { DIFFICULTY } from './difficulty';
import { clearEnemyProjectiles } from './projectiles';
import { MAX_LIVES, MAX_MISSILES, MAX_POWER, PHASE_TIME, SHIP_MAX_X, SHIP_MAX_Y, SHIP_MIN_X, SHIP_MIN_Y, SHIP_SPAWN } from './tuning/core';
import {
  FURY_DEATH_KEEP, MAX_SHIELD, MUTATORS, REVIVE_CLEAR_RADIUS, REVIVE_INVULN, SHIELD_CLEAR_RADIUS, SHIELD_HIT_INVULN,
  SHIPS, UPGRADES,
} from './tuning/loadout';
import { emptyPowerups, breakCombo } from './powerups';
import { DEFAULT_LOADOUT } from './mods';
import { PLAYER, TIMER_EPSILON } from './tuning/weapons';

function upgradeSum(loadout: Loadout, key: 'power' | 'lives' | 'missiles'): number {
  let n = 0;
  for (const [id, lvl] of Object.entries(loadout.upgrades) as [keyof typeof UPGRADES, number][]) {
    const def = UPGRADES[id];
    if (def) n += (def[key] ?? 0) * Math.min(lvl, def.costs.length);
  }
  return n;
}

/** Starting ship for a difficulty and loadout (ship stats, hangar upgrades, hardcore mutator). */
export function createPlayer(d: Difficulty, loadout: Loadout = DEFAULT_LOADOUT): Player {
  const ship = SHIPS[loadout.ship];
  let lives = Math.max(1, DIFFICULTY[d].lives + ship.lives + upgradeSum(loadout, 'lives'));
  for (const m of loadout.mutators) {
    const o = MUTATORS[m].livesOverride;
    if (o !== undefined) lives = o;
  }
  return {
    pos: { x: SHIP_SPAWN.x, y: SHIP_SPAWN.y },
    radius: ship.radius,
    pickupRadius: PLAYER.pickupRadius,
    alive: true,
    lives: Math.min(MAX_LIVES, lives),
    weapon: 'pulse',
    power: Math.min(MAX_POWER, ship.power + upgradeSum(loadout, 'power')),
    heat: 0,
    overheated: false,
    fireCooldown: 0,
    missiles: Math.min(MAX_MISSILES, DIFFICULTY[d].missiles + ship.missiles + upgradeSum(loadout, 'missiles')),
    missileCooldown: 0,
    food: 0,
    invulnTimer: PLAYER.startInvuln,
    respawnTimer: 0,
    bank: 0,
    ship: loadout.ship,
    shield: Math.min(MAX_SHIELD, ship.shield),
    revives: ship.revives,
    fury: 0,
    overdrive: 0,
    powerups: emptyPowerups(),
  };
}

function respawn(state: GameState): void {
  const p = state.player;
  p.alive = true;
  p.pos.x = SHIP_SPAWN.x;
  p.pos.y = SHIP_SPAWN.y;
  p.invulnTimer = PLAYER.respawnInvuln + state.mods.invulnBonus;
  p.respawnTimer = 0;
  p.bank = 0;
  clearEnemyProjectiles(state, { x: SHIP_SPAWN.x, y: SHIP_SPAWN.y }, PLAYER.respawnClearRadius);
  emit(state, { type: 'player_respawned', x: p.pos.x, y: p.pos.y });
}

/** Moves the ship for one tick and returns its horizontal velocity (px/s). speedMul = mods.moveSpeedMul. */
function moveShip(p: Player, input: InputFrame, dt: number, speedMul: number): number {
  const startX = p.pos.x;
  if (input.pointer) {
    const tx = clamp(input.pointer.x, SHIP_MIN_X, SHIP_MAX_X);
    const ty = clamp(input.pointer.y, SHIP_MIN_Y, SHIP_MAX_Y);
    const dx = tx - p.pos.x;
    const dy = ty - p.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const step = Math.min(d, PLAYER.pointerMaxSpeed * speedMul * dt);
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
    p.pos.x += mx * PLAYER.keyboardSpeed * speedMul * dt;
    p.pos.y += my * PLAYER.keyboardSpeed * speedMul * dt;
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
  const vx = moveShip(p, input, dt, state.mods.moveSpeedMul);
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
  if (p.shield > 0) {
    p.shield -= 1;
    p.invulnTimer = SHIELD_HIT_INVULN;
    clearEnemyProjectiles(state, p.pos, SHIELD_CLEAR_RADIUS);
    emit(state, { type: 'shield_absorb', x: p.pos.x, y: p.pos.y, left: p.shield });
    return;
  }
  if (p.revives > 0) {
    p.revives -= 1;
    p.invulnTimer = REVIVE_INVULN;
    clearEnemyProjectiles(state, p.pos, REVIVE_CLEAR_RADIUS);
    breakCombo(state);
    emit(state, { type: 'player_revived', x: p.pos.x, y: p.pos.y, left: p.revives });
    return;
  }
  p.alive = false;
  p.lives -= 1;
  breakCombo(state);
  p.fury *= FURY_DEATH_KEEP;
  if (p.overdrive > 0) {
    p.overdrive = 0;
    emit(state, { type: 'overdrive_end' });
  }
  const before = p.power;
  const loss = Math.max(0, DIFFICULTY[state.difficulty].deathPowerLoss + state.mods.powerLossOnDeath);
  p.power = Math.max(0, p.power - loss);
  if (p.power !== before) emit(state, { type: 'power_changed', power: p.power, delta: p.power - before });
  p.heat = 0;
  p.overheated = false;
  p.fireCooldown = 0;
  state.chapterStats.deaths += 1;
  state.runStats.deaths += 1;
  emit(state, { type: 'player_died', x: p.pos.x, y: p.pos.y, livesLeft: p.lives });
  p.respawnTimer = p.lives > 0 ? PLAYER.respawnDelay : PHASE_TIME.gameOverDelay;
}
