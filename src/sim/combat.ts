// src/sim/combat.ts — OWNER: LEAD. Enemy damage and death (§7.6.3), shields, combo, fury, chain explosions.
import type { DamageSource, Enemy, GameState } from './types';
import { emit } from './events';
import { addScore } from './scoring';
import { spawnDropsForEnemy } from './pickups';
import { onBossDamaged, onBossKilled } from './bosses';
import { onEnemyKilled } from './enemies';
import { gainFury, registerKill } from './powerups';
import { HIT_FLASH_TIME } from './tuning/economy';
import { CHAIN_DAMAGE, FURY_PER_BOSS, FURY_PER_KILL, FURY_POINTS_DIV } from './tuning/loadout';

/**
 * Returns true if the enemy was killed by this hit. `amount` is final damage (callers apply
 * mods.damageMul / crits / bossDamageMul). Enemy shields absorb damage before hp.
 */
export function damageEnemy(state: GameState, e: Enemy, amount: number, source: DamageSource): boolean {
  if (!e.alive || e.invulnerable) return false;
  e.hitFlash = HIT_FLASH_TIME;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, amount);
    e.shield -= absorbed;
    amount -= absorbed;
    e.skillTimer = 0; // abilities use this to delay shield regeneration
    emit(state, { type: e.shield > 0 ? 'enemy_shield_hit' : 'enemy_shield_break', id: e.id, x: e.pos.x, y: e.pos.y });
    if (amount <= 0) return false;
  }
  e.hp -= amount;
  emit(state, { type: 'enemy_hit', id: e.id, kind: e.kind, x: e.pos.x, y: e.pos.y, dmg: amount });
  if (e.isBoss) onBossDamaged(state, e);
  if (e.hp <= 0 && e.alive) {
    killEnemy(state, e, source === 'missile', source);
    return true;
  }
  return false;
}

export function killEnemy(state: GameState, e: Enemy, byMissile: boolean, source: DamageSource = 'bolt'): void {
  e.alive = false;
  emit(state, { type: 'enemy_killed', id: e.id, kind: e.kind, x: e.pos.x, y: e.pos.y, byMissile });
  registerKill(state);
  addScore(state, e.points * state.combo.mult, e.isBoss ? e.pos : undefined);
  gainFury(state, e.isBoss ? FURY_PER_BOSS : FURY_PER_KILL + e.points / FURY_POINTS_DIV);
  state.chapterStats.kills += 1;
  state.runStats.kills += 1;
  if (e.isBoss) {
    state.chapterStats.bossesKilled += 1;
    state.runStats.bossesKilled += 1;
  }
  if (e.kind === 'chicken_gold') {
    state.chapterStats.goldenKills += 1;
    state.runStats.goldenKills += 1;
  }
  spawnDropsForEnemy(state, e);
  if (e.isBoss) onBossKilled(state, e);
  else onEnemyKilled(state, e, byMissile);
  if (!e.isBoss && source !== 'chain' && source !== 'missile' && state.mods.chainRadius > 0) chainExplode(state, e);
}

/** Popcorn perk: a non-boss kill splashes CHAIN_DAMAGE onto other non-boss enemies in range (no recursion). */
function chainExplode(state: GameState, from: Enemy): void {
  const r = state.mods.chainRadius;
  emit(state, { type: 'chain_explosion', x: from.pos.x, y: from.pos.y, radius: r });
  const list = state.enemies;
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const o = list[i];
    if (!o.alive || o.isBoss || o === from) continue;
    const dx = o.pos.x - from.pos.x;
    const dy = o.pos.y - from.pos.y;
    if (dx * dx + dy * dy <= (r + o.radius) * (r + o.radius)) damageEnemy(state, o, CHAIN_DAMAGE, 'chain');
  }
}
