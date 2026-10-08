// src/sim/player.ts — OWNER: A2
// STUB(A1): owner A2 implements (§7.3)
import type { Difficulty, GameState, InputFrame, Player } from './types';
import { SHIP_SPAWN } from './tuning/core';
import { DIFFICULTY } from './difficulty';

export function createPlayer(d: Difficulty): Player {
  return {
    pos: { x: SHIP_SPAWN.x, y: SHIP_SPAWN.y },
    radius: 14,
    pickupRadius: 36,
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
    invulnTimer: 2.0,
    respawnTimer: 0,
    bank: 0,
  };
}

export function updatePlayer(_state: GameState, _input: InputFrame, _dt: number): void {}

export function isPlayerVulnerable(state: GameState): boolean {
  const p = state.player;
  return p.alive && p.invulnTimer <= 0 && !state.debug.godMode;
}

export function killPlayer(_state: GameState): void {}
