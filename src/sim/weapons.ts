// src/sim/weapons.ts — OWNER: H1 (was A2). Firing loop, heat, power and gifts, the classic four weapons,
// the bolt-hit hook (crits, boss bonus, prism split) and drone volleys (§7.4, HENPOCALYPSE §H1).
// The six HENPOCALYPSE weapons live in weapons2.ts.
import type { Enemy, GameState, InputFrame, Projectile, Vec2, WeaponId } from './types';
import { emit } from './events';
import { canFire } from './game';
import { damageEnemy } from './combat';
import { DIFFICULTY } from './difficulty';
import { clamp, deg } from './math';
import { addScore } from './scoring';
import { MAX_POWER } from './tuning/core';
import {
  ARC, BOLT_TTL, HEAT, LASER, NEUTRON, PLAYER, POWER_OVERFLOW_SCORE, PULSE, TIMER_EPSILON, WEAPON_HEAT, WEAPON_RATE,
} from './tuning/weapons';
import { OVERDRIVE_FIRE_MUL, RAPID_FIRE_MUL, RAPID_HEAT_MUL } from './tuning/loadout';
import {
  fireDrones, fireFlak, fireFlame, fireHoming, firePrism, fireRail, fireSickle, hitMultiplier, playerBolt, prismSplit,
  shotMods, type ShotMods,
} from './weapons2';

const UP = -Math.PI / 2;
/** Extra pulse fan width per extraBolts stack (degrees). */
const PULSE_SPREAD_PER_EXTRA = 6;

function pulseVolley(state: GameState, nose: Vec2, m: ShotMods, lvl: number): number {
  const def = PULSE.levels[lvl];
  const n = def.bolts + m.extra;
  const spread = def.spread + PULSE_SPREAD_PER_EXTRA * m.extra;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const off = n === 1 ? 0 : -spread / 2 + (i * spread) / (n - 1);
    if (playerBolt(state, m, {
      weapon: 'pulse', x: nose.x, y: nose.y, angle: UP + deg(off), speed: PULSE.speed,
      radius: PULSE.radius, damage: def.damage, pierce: PULSE.pierce, ttl: BOLT_TTL,
    })) made++;
  }
  return made;
}

function parallelVolley(
  state: GameState, nose: Vec2, m: ShotMods, weapon: 'neutron' | 'laser', bolts: number, spacing: number,
  speed: number, radius: number, damage: number, pierce: number,
): number {
  const n = bolts + m.extra;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const x = nose.x + (i - (n - 1) / 2) * spacing;
    if (playerBolt(state, m, { weapon, x, y: nose.y, angle: UP, speed, radius, damage, pierce, ttl: BOLT_TTL })) made++;
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
function arcVolley(state: GameState, nose: Vec2, m: ShotMods, lvl: number): boolean {
  const def = ARC.levels[lvl];
  const range = ARC.rangeBase + ARC.rangePerLevel * lvl;
  const targets = def.targets + m.extra;
  let target: Enemy | null = arcFirstTarget(state, nose, range);
  if (!target) {
    const f = ARC.fallback;
    playerBolt(state, m, {
      weapon: 'arc', x: nose.x, y: nose.y, angle: UP, speed: f.speed, radius: f.radius,
      damage: f.damage, pierce: f.pierce, ttl: BOLT_TTL,
    });
    return false;
  }
  const points: Vec2[] = [{ x: nose.x, y: nose.y }];
  const hitIds: number[] = [];
  for (let k = 0; k < targets && target; k++) {
    hitIds.push(target.id);
    points.push({ x: target.pos.x, y: target.pos.y });
    const from: Vec2 = { x: target.pos.x, y: target.pos.y };
    damageEnemy(state, target, def.damage * m.dmg * hitMultiplier(state, target), 'arc');
    target = k + 1 < targets ? arcNextTarget(state, from, hitIds) : null;
  }
  emit(state, { type: 'arc', points });
  return true;
}

function fireVolley(state: GameState): void {
  const p = state.player;
  const nose = { x: p.pos.x, y: p.pos.y - PLAYER.noseOffset };
  const lvl = p.power;
  const m = shotMods(state);
  let fired = 1;
  let hit = false;
  switch (p.weapon) {
    case 'pulse':
      fired = pulseVolley(state, nose, m, lvl);
      break;
    case 'neutron': {
      const d = NEUTRON.levels[lvl];
      fired = parallelVolley(state, nose, m, 'neutron', d.bolts, NEUTRON.spacing, NEUTRON.speed, NEUTRON.radius, d.damage, d.pierce);
      break;
    }
    case 'laser': {
      const d = LASER.levels[lvl];
      fired = parallelVolley(state, nose, m, 'laser', d.bolts, LASER.spacing, LASER.speed, LASER.radius, d.damage, d.pierce);
      break;
    }
    case 'arc':
      hit = arcVolley(state, nose, m, lvl);
      break;
    case 'flak':
      fired = fireFlak(state, nose, lvl, m);
      break;
    case 'flame':
      fired = fireFlame(state, nose, lvl, m);
      break;
    case 'sickle':
      fired = fireSickle(state, nose, lvl, m);
      break;
    case 'homing':
      fired = fireHoming(state, nose, lvl, m);
      break;
    case 'rail':
      hit = fireRail(state, nose, lvl, m);
      break;
    case 'prism':
      fired = firePrism(state, nose, lvl, m);
      break;
  }
  fired += fireDrones(state, lvl, m);
  state.chapterStats.shotsFired += fired;
  state.runStats.shotsFired += fired;
  if (hit) {
    state.chapterStats.shotsHit += 1;
    state.runStats.shotsHit += 1;
  }
  emit(state, { type: 'player_fire', weapon: p.weapon, power: p.power, x: nose.x, y: nose.y });
}

/** Fire-rate multiplier from rapid and overdrive (on top of mods.fireRateMul). */
function volleyRate(state: GameState, weapon: WeaponId): number {
  const p = state.player;
  let rate = WEAPON_RATE[weapon] * state.mods.fireRateMul;
  if (p.powerups.rapid > 0) rate *= RAPID_FIRE_MUL;
  if (p.overdrive > 0) rate *= OVERDRIVE_FIRE_MUL;
  return rate;
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
  p.fireCooldown = Math.min(p.fireCooldown, 0) + 1 / volleyRate(state, p.weapon);
  if (p.overdrive > 0) return; // overdrive: no heat gain
  let heat = WEAPON_HEAT[p.weapon] * (1 + HEAT.perPowerLevel * p.power) * DIFFICULTY[state.difficulty].heatMul;
  heat *= state.mods.heatMul;
  if (p.powerups.rapid > 0) heat *= RAPID_HEAT_MUL;
  p.heat += heat;
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

/** Called by collisions after a player bolt damaged `enemy`: prism split, then the crit / boss bonus. */
export function onBoltHit(state: GameState, bolt: Projectile, enemy: Enemy): void {
  if (bolt.weapon === 'prism' && bolt.fuse === 0) prismSplit(state, bolt, enemy);
  const extra = bolt.damage * (hitMultiplier(state, enemy) - 1);
  if (extra > 0 && enemy.alive) damageEnemy(state, enemy, extra, 'bolt');
}
