// src/sim/debug.ts — OWNER: LEAD. Debug commands (§7.15); only reachable with ?debug=1 or from tests.
import type { GameState } from './types';
import { WEAPON_IDS } from './types';
import { emit } from './events';
import { damageEnemy } from './combat';
import { addPower, applyWeaponGift } from './weapons';
import { beginWave } from './game';
import { MAX_MISSILES, WAVES_PER_CHAPTER } from './tuning/core';
import { POWERUP_PICKUPS, spawnPickup } from './pickups';
import { FURY_MAX } from './tuning/loadout';

export type DebugCommand =
  | 'toggleHitboxes' // key 1
  | 'toggleGod'      // key 2
  | 'killAll'        // key 3
  | 'powerUp'        // key 4
  | 'cycleWeapon'    // key 5
  | 'addMissiles'    // key 6
  | 'jumpToBoss'     // key 7
  | 'spawnPowerup'   // key 8: drops the next power-up pickup above the ship
  | 'fillFury'       // key 9
  | 'nextWave';      // key 0: kills everything and skips to the next wave

const DEBUG_MISSILES = 5;
const KILL_ALL_DAMAGE = 99999;

export function applyDebug(state: GameState, cmd: DebugCommand): void {
  switch (cmd) {
    case 'toggleHitboxes':
      state.debug.showHitboxes = !state.debug.showHitboxes;
      break;
    case 'toggleGod':
      state.debug.godMode = !state.debug.godMode;
      break;
    case 'killAll': {
      const n = state.enemies.length;
      for (let i = 0; i < n; i++) damageEnemy(state, state.enemies[i], KILL_ALL_DAMAGE, 'debug');
      break;
    }
    case 'powerUp':
      addPower(state, 1);
      break;
    case 'cycleWeapon': {
      const idx = WEAPON_IDS.indexOf(state.player.weapon);
      applyWeaponGift(state, WEAPON_IDS[(idx + 1) % WEAPON_IDS.length]);
      break;
    }
    case 'addMissiles':
      state.player.missiles = Math.min(MAX_MISSILES, state.player.missiles + DEBUG_MISSILES);
      emit(state, { type: 'missile_gained', missiles: state.player.missiles });
      break;
    case 'spawnPowerup': {
      const k = POWERUP_PICKUPS[state.tick % POWERUP_PICKUPS.length];
      spawnPickup(state, k, state.player.pos.x, state.player.pos.y - 120);
      break;
    }
    case 'fillFury':
      state.player.fury = FURY_MAX;
      emit(state, { type: 'fury_full' });
      break;
    case 'nextWave': {
      const n = state.enemies.length;
      for (let i = 0; i < n; i++) damageEnemy(state, state.enemies[i], KILL_ALL_DAMAGE, 'debug');
      break;
    }
    case 'jumpToBoss':
      if (state.phase === 'game_over' || state.phase === 'victory') break;
      state.wave = WAVES_PER_CHAPTER;
      state.enemies.length = 0;
      state.projectiles.length = 0;
      state.hazards.length = 0;
      beginWave(state);
      break;
  }
}
