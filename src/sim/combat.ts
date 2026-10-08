// src/sim/combat.ts — OWNER: A1. Enemy damage and death (§7.6.3).
import type { DamageSource, Enemy, GameState } from './types';
import { emit } from './events';
import { addScore } from './scoring';
import { spawnDropsForEnemy } from './pickups';
import { onBossDamaged, onBossKilled } from './bosses';
import { onEnemyKilled } from './enemies';
import { HIT_FLASH_TIME } from './tuning/economy';

/** Returns true if the enemy was killed by this hit. */
export function damageEnemy(state: GameState, e: Enemy, amount: number, source: DamageSource): boolean {
  if (!e.alive || e.invulnerable) return false;
  e.hp -= amount;
  e.hitFlash = HIT_FLASH_TIME;
  emit(state, { type: 'enemy_hit', id: e.id, kind: e.kind, x: e.pos.x, y: e.pos.y, dmg: amount });
  if (e.isBoss) onBossDamaged(state, e);
  if (e.hp <= 0 && e.alive) {
    killEnemy(state, e, source === 'missile');
    return true;
  }
  return false;
}

export function killEnemy(state: GameState, e: Enemy, byMissile: boolean): void {
  e.alive = false;
  emit(state, { type: 'enemy_killed', id: e.id, kind: e.kind, x: e.pos.x, y: e.pos.y, byMissile });
  addScore(state, e.points, e.isBoss ? e.pos : undefined);
  state.chapterStats.kills += 1;
  state.runStats.kills += 1;
  spawnDropsForEnemy(state, e);
  if (e.isBoss) onBossKilled(state, e);
  else onEnemyKilled(state, e, byMissile);
}
