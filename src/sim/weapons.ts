// src/sim/weapons.ts — OWNER: H1 (was A2). Firing loop, heat, ten weapons, power and gifts (§7.4, HENPOCALYPSE §H1).
import type { Enemy, GameState, InputFrame, Projectile, Vec2, WeaponId } from './types';
import { emit } from './events';
import { canFire } from './game';
import { damageEnemy } from './combat';
import { DIFFICULTY } from './difficulty';
import { clamp, deg } from './math';
import { spawnProjectile } from './projectiles';
import { addScore } from './scoring';
import { MAX_POWER } from './tuning/core';
import {
  ARC, BOLT_TTL, HEAT, LASER, NEUTRON, PLAYER, POWER_OVERFLOW_SCORE, PULSE, TIMER_EPSILON, WEAPON_HEAT, WEAPON_RATE,
} from './tuning/weapons';

const UP = -Math.PI / 2;

function spawnBolt(
  state: GameState, weapon: WeaponId, x: number, y: number, angle: number,
  speed: number, radius: number, damage: number, pierce: number,
): number {
  const shot = spawnProjectile(state, {
    kind: 'bolt', owner: 'player', weapon, x, y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    radius, damage, pierce, ttl: BOLT_TTL,
  });
  return shot ? 1 : 0;
}

function pulseVolley(state: GameState, nose: Vec2, level: number): number {
  const def = PULSE.levels[level];
  let made = 0;
  for (let i = 0; i < def.bolts; i++) {
    const off = def.bolts === 1 ? 0 : -def.spread / 2 + (i * def.spread) / (def.bolts - 1);
    made += spawnBolt(state, 'pulse', nose.x, nose.y, UP + deg(off), PULSE.speed, PULSE.radius, def.damage, PULSE.pierce);
  }
  return made;
}

function parallelVolley(
  state: GameState, nose: Vec2, weapon: 'neutron' | 'laser', bolts: number, spacing: number,
  speed: number, radius: number, damage: number, pierce: number,
): number {
  let made = 0;
  for (let i = 0; i < bolts; i++) {
    const x = nose.x + (i - (bolts - 1) / 2) * spacing;
    made += spawnBolt(state, weapon, x, nose.y, UP, speed, radius, damage, pierce);
  }
  return made;
}

function arcFirstTarget(state: GameState, nose: Vec2, range: number): Enemy | null {
  const coneTan = Math.tan(deg(ARC.coneDeg));
  let best: Enemy | null = null;
  let bestD = range * range;
  for (const e of state.enemies) {
    if (!e.alive || e.invulnerable || e.pos.y >= state.player.pos.y) continue;
    const dx = e.pos.x - nose.x;
    const dy = nose.y - e.pos.y;
    if (dy <= 0 || Math.abs(dx) > dy * coneTan) continue;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function arcNextTarget(state: GameState, from: Vec2, hitIds: number[]): Enemy | null {
  let best: Enemy | null = null;
  let bestD = ARC.hopRange * ARC.hopRange;
  for (const e of state.enemies) {
    if (!e.alive || e.invulnerable || hitIds.includes(e.id)) continue;
    const dx = e.pos.x - from.x;
    const dy = e.pos.y - from.y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/** Hitscan chain lightning. Returns true if at least one enemy was struck. */
function arcVolley(state: GameState, nose: Vec2, level: number): boolean {
  const def = ARC.levels[level];
  const range = ARC.rangeBase + ARC.rangePerLevel * level;
  let target: Enemy | null = arcFirstTarget(state, nose, range);
  if (!target) {
    const f = ARC.fallback;
    spawnBolt(state, 'arc', nose.x, nose.y, UP, f.speed, f.radius, f.damage, f.pierce);
    return false;
  }
  const points: Vec2[] = [{ x: nose.x, y: nose.y }];
  const hitIds: number[] = [];
  for (let k = 0; k < def.targets && target; k++) {
    hitIds.push(target.id);
    points.push({ x: target.pos.x, y: target.pos.y });
    const from: Vec2 = { x: target.pos.x, y: target.pos.y };
    damageEnemy(state, target, def.damage, 'arc');
    target = k + 1 < def.targets ? arcNextTarget(state, from, hitIds) : null;
  }
  emit(state, { type: 'arc', points });
  return true;
}

function fireVolley(state: GameState): void {
  const p = state.player;
  const nose = { x: p.pos.x, y: p.pos.y - PLAYER.noseOffset };
  const lvl = p.power;
  let fired = 1;
  let hit = false;
  switch (p.weapon) {
    case 'pulse':
      fired = pulseVolley(state, nose, lvl);
      break;
    case 'neutron': {
      const d = NEUTRON.levels[lvl];
      fired = parallelVolley(state, nose, 'neutron', d.bolts, NEUTRON.spacing, NEUTRON.speed, NEUTRON.radius, d.damage, d.pierce);
      break;
    }
    case 'laser': {
      const d = LASER.levels[lvl];
      fired = parallelVolley(state, nose, 'laser', d.bolts, LASER.spacing, LASER.speed, LASER.radius, d.damage, d.pierce);
      break;
    }
    case 'arc':
      hit = arcVolley(state, nose, lvl);
      break;
    default: {
      // Phase-0 placeholder: the six new weapons fire a pulse fan with their own weapon id (H1 replaces).
      const d = PULSE.levels[lvl];
      fired = 0;
      for (let i = 0; i < d.bolts; i++) {
        const off = d.bolts === 1 ? 0 : -d.spread / 2 + (i * d.spread) / (d.bolts - 1);
        fired += spawnBolt(state, p.weapon, nose.x, nose.y, UP + deg(off), PULSE.speed, PULSE.radius, d.damage, PULSE.pierce);
      }
    }
  }
  state.chapterStats.shotsFired += fired;
  state.runStats.shotsFired += fired;
  if (hit) {
    state.chapterStats.shotsHit += 1;
    state.runStats.shotsHit += 1;
  }
  emit(state, { type: 'player_fire', weapon: p.weapon, power: p.power, x: nose.x, y: nose.y });
}

export function updateWeapons(state: GameState, input: InputFrame, dt: number): void {
  const p = state.player;
  p.heat = Math.max(0, p.heat - (p.overheated ? HEAT.overheatCoolRate : HEAT.coolRate) * dt);
  if (p.overheated && p.heat <= HEAT.recoverAt) {
    p.overheated = false;
    emit(state, { type: 'heat_recovered' });
  }
  // Keep at most one tick of carried-over cooldown so the true volley rate survives the 60 Hz step.
  p.fireCooldown = Math.max(p.fireCooldown - dt, -dt);
  if (!p.alive || !input.fire || p.overheated || p.fireCooldown > TIMER_EPSILON || !canFire(state)) return;

  fireVolley(state);
  p.fireCooldown = Math.min(p.fireCooldown, 0) + 1 / WEAPON_RATE[p.weapon];
  p.heat += WEAPON_HEAT[p.weapon] * (1 + HEAT.perPowerLevel * p.power) * DIFFICULTY[state.difficulty].heatMul;
  if (p.heat >= HEAT.max) {
    p.heat = HEAT.max;
    p.overheated = true;
    emit(state, { type: 'overheat' });
  }
}

export function addPower(state: GameState, delta: number): void {
  const p = state.player;
  if (delta > 0 && p.power >= MAX_POWER) {
    addScore(state, POWER_OVERFLOW_SCORE, p.pos);
    return;
  }
  const next = clamp(p.power + delta, 0, MAX_POWER);
  if (next === p.power) return;
  const change = next - p.power;
  p.power = next;
  emit(state, { type: 'power_changed', power: next, delta: change });
}

export function applyWeaponGift(state: GameState, weapon: WeaponId): void {
  if (weapon !== state.player.weapon) {
    state.player.weapon = weapon;
    emit(state, { type: 'weapon_changed', weapon });
  } else {
    addPower(state, 1);
  }
}

/** Called by collisions after a player bolt damaged `enemy` (prism shards, crit effects…). Phase 0: no-op. */
export function onBoltHit(state: GameState, bolt: Projectile, enemy: Enemy): void {
  void state; void bolt; void enemy;
}
