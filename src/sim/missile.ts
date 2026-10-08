// src/sim/missile.ts — OWNER: A2. Screen-clearing missile (§7.5).
import type { GameState, InputFrame } from './types';
import { emit } from './events';
import { canFire } from './game';
import { damageEnemy } from './combat';
import { clearEnemyProjectiles, spawnProjectile } from './projectiles';
import { PLAYER, MISSILE, TIMER_EPSILON } from './tuning/weapons';

export function updateMissile(state: GameState, input: InputFrame, dt: number): void {
  const p = state.player;
  if (p.missileCooldown > 0) {
    p.missileCooldown -= dt;
    if (p.missileCooldown <= TIMER_EPSILON) p.missileCooldown = 0;
  }
  if (!input.missile || !p.alive || p.missileCooldown > 0 || !canFire(state)) return;
  const free = state.debug.infiniteMissiles;
  if (p.missiles <= 0 && !free) return;
  const x = p.pos.x;
  const y = p.pos.y - PLAYER.noseOffset;
  const t = MISSILE.target;
  const shot = spawnProjectile(state, {
    kind: 'missile', owner: 'player', weapon: null, x, y,
    vx: (t.x - x) / MISSILE.flightTime, vy: (t.y - y) / MISSILE.flightTime,
    radius: MISSILE.radius, damage: 0, pierce: 0, ttl: MISSILE.flightTime,
  });
  if (!shot) return;
  if (!free) p.missiles -= 1;
  p.missileCooldown = MISSILE.cooldown;
  emit(state, { type: 'missile_launched', x, y, tx: t.x, ty: t.y });
}

export function detonateMissile(state: GameState, x: number, y: number): void {
  const [minX, maxX] = MISSILE.boundsX;
  const [minY, maxY] = MISSILE.boundsY;
  const list = state.enemies;
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const e = list[i];
    if (!e.alive) continue;
    if (e.isBoss) {
      if (!e.invulnerable) damageEnemy(state, e, MISSILE.bossDamage, 'missile');
    } else if (e.pos.x >= minX && e.pos.x <= maxX && e.pos.y >= minY && e.pos.y <= maxY) {
      damageEnemy(state, e, MISSILE.killDamage, 'missile');
    }
  }
  clearEnemyProjectiles(state);
  emit(state, { type: 'missile_detonated', x, y });
}
