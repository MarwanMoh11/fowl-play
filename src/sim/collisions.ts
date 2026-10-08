// src/sim/collisions.ts — OWNER: LEAD. Circle-vs-circle collision resolution (§7.6.4).
import type { GameState, Projectile } from './types';
import { dist2, segmentCircleHit } from './math';
import { damageEnemy } from './combat';
import { collectPickup } from './pickups';
import { isPlayerVulnerable, killPlayer } from './player';
import { onBoltHit } from './weapons';
import { CONTACT_DAMAGE, CONTACT_RADIUS_FACTOR } from './tuning/economy';

function overlaps(ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < r * r;
}

function boltVsEnemies(state: GameState, bolt: Projectile): void {
  const enemies = state.enemies;
  const n = enemies.length;
  for (let i = 0; i < n; i++) {
    const e = enemies[i];
    if (!e.alive || bolt.hitIds.includes(e.id)) continue;
    if (!overlaps(bolt.pos.x, bolt.pos.y, e.pos.x, e.pos.y, bolt.radius + e.radius)) continue;
    if (e.invulnerable) {
      bolt.alive = false;
      return;
    }
    damageEnemy(state, e, bolt.damage, 'bolt');
    bolt.hitIds.push(e.id);
    onBoltHit(state, bolt, e);
    if (bolt.hitIds.length === 1) {
      state.chapterStats.shotsHit += 1;
      state.runStats.shotsHit += 1;
    }
    bolt.pierceLeft -= 1;
    if (bolt.pierceLeft <= 0) {
      bolt.alive = false;
      return;
    }
  }
}

export function resolveCollisions(state: GameState): void {
  const p = state.player;
  const projectiles = state.projectiles;
  const np = projectiles.length;

  // 1. Player bolts vs enemies.
  for (let i = 0; i < np; i++) {
    const b = projectiles[i];
    if (b.alive && b.owner === 'player' && b.kind === 'bolt') boltVsEnemies(state, b);
  }

  // 2. Enemy projectiles vs player.
  for (let i = 0; i < np && isPlayerVulnerable(state); i++) {
    const pr = projectiles[i];
    if (!pr.alive || pr.owner !== 'enemy') continue;
    if (overlaps(pr.pos.x, pr.pos.y, p.pos.x, p.pos.y, pr.radius + p.radius)) {
      pr.alive = false;
      killPlayer(state);
    }
  }

  // 3. Enemies vs player (contact).
  const enemies = state.enemies;
  const ne = enemies.length;
  for (let i = 0; i < ne && isPlayerVulnerable(state); i++) {
    const e = enemies[i];
    if (!e.alive) continue;
    const r = (e.radius + p.radius) * CONTACT_RADIUS_FACTOR;
    if (dist2(e.pos, p.pos) < r * r) {
      killPlayer(state);
      if (!e.isBoss) damageEnemy(state, e, CONTACT_DAMAGE, 'contact');
    }
  }

  // 4. Lethal hazards vs player.
  const hazards = state.hazards;
  for (let i = 0; i < hazards.length && isPlayerVulnerable(state); i++) {
    const h = hazards[i];
    if (h.alive && h.lethal && segmentCircleHit(h.a, h.b, h.width / 2, p.pos, p.radius)) killPlayer(state);
  }

  // 5. Pickups vs player.
  if (!p.alive) return;
  const pickups = state.pickups;
  const nk = pickups.length;
  const reach = p.pickupRadius * state.mods.pickupRadiusMul;
  for (let i = 0; i < nk; i++) {
    const k = pickups[i];
    if (k.alive && overlaps(k.pos.x, k.pos.y, p.pos.x, p.pos.y, reach + k.radius)) collectPickup(state, k);
  }
}
