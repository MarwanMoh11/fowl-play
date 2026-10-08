// src/sim/weapons2.ts — OWNER: H1 (ARSENAL). Six HENPOCALYPSE weapons, shared bolt helpers (mods, crits),
// prism splitting and drone volleys. weapons.ts dispatches here; this file never imports weapons.ts.
import type { Enemy, GameState, Projectile, Vec2, WeaponId } from './types';
import { emit } from './events';
import { damageEnemy } from './combat';
import { deg, segmentCircleHit } from './math';
import { dronePos, droneCount } from './powerups';
import { spawnProjectile } from './projectiles';
import { rngChance } from './rng';
import { CRIT_MUL, OVERDRIVE_DAMAGE_MUL } from './tuning/loadout';
import { BOLT_TTL, ARC, LASER, NEUTRON, PULSE, TIMER_EPSILON } from './tuning/weapons';
import { DRONE, FLAK, FLAME, HOMING, PRISM, RAIL, SICKLE } from './tuning/weapons2';

const UP = -Math.PI / 2;

// ---------------------------------------------------------------- shared bolt helpers
/** Per-volley scaling from state.mods and overdrive: damage, extra pierce, bolt speed, extra projectiles. */
export interface ShotMods {
  dmg: number;
  pierce: number;
  speed: number;
  extra: number;
  overdrive: boolean;
}

export function shotMods(state: GameState): ShotMods {
  const m = state.mods;
  const od = state.player.overdrive > 0;
  return {
    dmg: m.damageMul * (od ? OVERDRIVE_DAMAGE_MUL : 1),
    pierce: m.pierceBonus + (od ? 1 : 0),
    speed: m.boltSpeedMul,
    extra: Math.max(0, Math.floor(m.extraBolts)),
    overdrive: od,
  };
}

export interface BoltSpec {
  weapon: WeaponId;
  x: number;
  y: number;
  angle: number;
  speed: number;           // base px/s before boltSpeedMul
  radius: number;
  damage: number;          // base damage before damageMul / overdrive
  pierce: number;          // base pierce before pierceBonus / overdrive
  ttl: number;
  bonusPierce?: boolean;   // default true; flak opts out
}

/** Spawns one player bolt with the volley mods applied. Returns false if the projectile cap was hit. */
export function playerBolt(state: GameState, m: ShotMods, s: BoltSpec): boolean {
  const pierce = s.bonusPierce === false ? s.pierce : s.pierce + m.pierce;
  const speed = s.speed * m.speed;
  return spawnProjectile(state, {
    kind: 'bolt', owner: 'player', weapon: s.weapon, x: s.x, y: s.y,
    vx: Math.cos(s.angle) * speed, vy: Math.sin(s.angle) * speed,
    radius: s.radius, damage: s.damage * m.dmg, pierce, ttl: s.ttl,
  }) !== null;
}

/**
 * Multiplier for one hit on `e`: boss bonus × crit. Rolls the crit only when critChance > 0 and emits `crit` on a crit.
 * Bolts apply (mul − 1) × damage on top of the normal hit; arc and rail multiply their damage directly.
 */
export function hitMultiplier(state: GameState, e: Enemy): number {
  let mul = e.isBoss ? state.mods.bossDamageMul : 1;
  const chance = state.mods.critChance;
  if (chance > 0 && rngChance(state.rng, chance)) {
    mul *= CRIT_MUL;
    emit(state, { type: 'crit', x: e.pos.x, y: e.pos.y });
  }
  return mul;
}

/** Base damage of one hit for `weapon` at power `lvl` (drones scale from this). */
export function levelDamage(weapon: WeaponId, lvl: number): number {
  switch (weapon) {
    case 'pulse': return PULSE.levels[lvl].damage;
    case 'neutron': return NEUTRON.levels[lvl].damage;
    case 'laser': return LASER.levels[lvl].damage;
    case 'arc': return ARC.levels[lvl].damage;
    case 'flak': return FLAK.damage[lvl];
    case 'flame': return FLAME.damage[lvl];
    case 'sickle': return SICKLE.damage[lvl];
    case 'homing': return HOMING.damage[lvl];
    case 'rail': return RAIL.damage[lvl];
    case 'prism': return PRISM.damage[lvl];
  }
}

// ---------------------------------------------------------------- flak, flame, sickle, homing
export function fireFlak(state: GameState, nose: Vec2, lvl: number, m: ShotMods): number {
  const n = FLAK.pellets[lvl] + m.extra * FLAK.pelletExtra;
  const coneDeg = FLAK.coneBaseDeg + FLAK.coneStepDeg * lvl;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const spreadDeg = n === 1 ? 0 : -coneDeg / 2 + (i * coneDeg) / (n - 1);
    const jitterDeg = ((i * 37) % 7) - 3;
    const speed = FLAK.speed * (FLAK.speedMin + (FLAK.speedRange * ((i * 53) % 11)) / 10);
    if (playerBolt(state, m, {
      weapon: 'flak', x: nose.x, y: nose.y, angle: UP + deg(spreadDeg + jitterDeg), speed,
      radius: FLAK.radius, damage: FLAK.damage[lvl], pierce: FLAK.pierce, ttl: FLAK.ttl, bonusPierce: false,
    })) made++;
  }
  return made;
}

/** Odd game ticks shift the fan by half a step (a symmetric fan would not change under a sign flip). */
export function fireFlame(state: GameState, nose: Vec2, lvl: number, m: ShotMods): number {
  const n = FLAME.flames[lvl] + m.extra;
  const halfDeg = FLAME.spreadBaseDeg + FLAME.spreadStepDeg * lvl;
  const step = n > 1 ? (2 * halfDeg) / (n - 1) : 0;
  const phase = state.tick % 2 === 1 ? step / 2 : 0;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const spreadDeg = -halfDeg + i * step + phase;
    if (playerBolt(state, m, {
      weapon: 'flame', x: nose.x, y: nose.y, angle: UP + deg(spreadDeg), speed: FLAME.speed,
      radius: FLAME.radius, damage: FLAME.damage[lvl], pierce: FLAME.pierce, ttl: FLAME.ttl,
    })) made++;
  }
  return made;
}

/** Blades launch at vy = -1100 (angle a fans them), gravity turns them round; fuse 1 marks the rising trip. */
export function fireSickle(state: GameState, nose: Vec2, lvl: number, m: ShotMods): number {
  const n = SICKLE.blades[lvl] + m.extra;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const aDeg = n === 1 ? 0 : (i - (n - 1) / 2) * SICKLE.fanDeg;
    const a = deg(aDeg);
    const speed = -SICKLE.vy / Math.cos(a);
    if (!playerBolt(state, m, {
      weapon: 'sickle', x: nose.x, y: nose.y, angle: UP + a, speed,
      radius: SICKLE.radius, damage: SICKLE.damage[lvl], pierce: SICKLE.pierce, ttl: SICKLE.ttl,
    })) continue;
    const b = lastBolt(state);
    b.accel.y = SICKLE.accelY;
    b.fuse = 1;
    made++;
  }
  return made;
}

/** Seekers fan out from straight up (alternating sides); projectiles.ts steers them to targetId. */
export function fireHoming(state: GameState, nose: Vec2, lvl: number, m: ShotMods): number {
  const n = HOMING.seekers[lvl] + m.extra;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const k = Math.ceil(i / 2);
    const offDeg = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * HOMING.fanStepDeg * k;
    if (!playerBolt(state, m, {
      weapon: 'homing', x: nose.x, y: nose.y, angle: UP + deg(offDeg), speed: HOMING.speed,
      radius: HOMING.radius, damage: HOMING.damage[lvl], pierce: 1, ttl: HOMING.ttl,
    })) continue;
    const b = lastBolt(state);
    b.homing = HOMING.turn;
    made++;
  }
  return made;
}

/** The projectile spawned last (playerBolt returns only a flag; the new bolt is always the list's tail). */
function lastBolt(state: GameState): Projectile {
  return state.projectiles[state.projectiles.length - 1];
}

// ---------------------------------------------------------------- rail
/** Hitscan lances from the nose to the top of the screen. Each enemy takes at most one hit per volley. */
export function fireRail(state: GameState, nose: Vec2, lvl: number, m: ShotMods): boolean {
  const width = RAIL.width[lvl];
  const lances: number[] = [nose.x];
  for (let k = 1; k <= m.extra; k++) lances.push(nose.x + (k % 2 === 1 ? 1 : -1) * RAIL.lanceSpacing * Math.ceil(k / 2));
  for (const x of lances) emit(state, { type: 'rail', x, y0: nose.y, y1: 0, width });
  const base = RAIL.damage[lvl] * m.dmg;
  let hit = false;
  for (const e of state.enemies) {
    if (!e.alive || e.invulnerable) continue;
    const touched = lances.some((x) => segmentCircleHit({ x, y: nose.y }, { x, y: 0 }, width / 2, e.pos, e.radius));
    if (!touched) continue;
    hit = true;
    damageEnemy(state, e, base * hitMultiplier(state, e), 'rail');
  }
  return hit;
}

// ---------------------------------------------------------------- prism
export function firePrism(state: GameState, nose: Vec2, lvl: number, m: ShotMods): number {
  const n = PRISM.crystals[lvl] + m.extra;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const x = nose.x + (i - (n - 1) / 2) * PRISM.spacing;
    if (playerBolt(state, m, {
      weapon: 'prism', x, y: nose.y, angle: UP, speed: PRISM.speed, radius: PRISM.radius,
      damage: PRISM.damage[lvl], pierce: PRISM.pierce, ttl: BOLT_TTL,
    })) made++;
  }
  return made;
}

/**
 * A primary crystal (fuse 0) splits once on its first hit: shards fan over the upper 180° from the hit point.
 * Fuse 2 marks a crystal that already split; shards carry fuse 1 and never split.
 */
export function prismSplit(state: GameState, bolt: Projectile, enemy: Enemy): void {
  bolt.fuse = 2;
  const n = PRISM.shards[Math.max(0, Math.min(PRISM.shards.length - 1, state.player.power))];
  const dmg = Math.ceil(bolt.damage / 2);
  const m = shotMods(state);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + (i * Math.PI) / (n - 1);
    const shard = spawnProjectile(state, {
      kind: 'bolt', owner: 'player', weapon: 'prism', x: bolt.pos.x, y: bolt.pos.y,
      vx: Math.cos(a) * PRISM.shardSpeed * m.speed, vy: Math.sin(a) * PRISM.shardSpeed * m.speed,
      radius: PRISM.shardRadius, damage: dmg, pierce: 1 + m.pierce, ttl: PRISM.shardTtl,
    });
    if (!shard) continue;
    shard.fuse = 1;
    shard.hitIds = [enemy.id];
  }
}

// ---------------------------------------------------------------- drones
const droneNext = new WeakMap<GameState, number>();
const DRONE_GAP = 1 / DRONE.maxPerSec;

/** Drone volleys are capped at DRONE.maxPerSec; the clock lives outside the (JSON-safe) state. */
function dronesMayFire(state: GameState): boolean {
  const next = droneNext.get(state) ?? 0;
  if (state.time < next - TIMER_EPSILON) return false;
  droneNext.set(state, state.time + DRONE_GAP);
  return true;
}

/** Nearest enemy inside the aim cone above the drone, else straight up. */
function droneAim(state: GameState, from: Vec2): number {
  const tan = Math.tan(deg(DRONE.aimConeDeg));
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.invulnerable || e.pos.y >= from.y) continue;
    const dx = e.pos.x - from.x;
    const dy = from.y - e.pos.y;
    if (Math.abs(dx) > dy * tan) continue;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best ? Math.atan2(best.pos.y - from.y, best.pos.x - from.x) : UP;
}

/** Each drone fires one pulse bolt per ship volley (capped). Returns the number of drone bolts spawned. */
export function fireDrones(state: GameState, lvl: number, m: ShotMods): number {
  const count = m.overdrive ? Math.max(droneCount(state), DRONE.overdriveMin) : droneCount(state);
  if (count <= 0 || !dronesMayFire(state)) return 0;
  const base = Math.max(1, Math.round(levelDamage(state.player.weapon, lvl) * DRONE.damageScale));
  let made = 0;
  let first: Vec2 | null = null;
  for (let i = 0; i < count; i++) {
    const pos = dronePos(state, i);
    if (!first) first = { x: pos.x, y: pos.y };
    if (playerBolt(state, m, {
      weapon: 'pulse', x: pos.x, y: pos.y, angle: droneAim(state, pos), speed: DRONE.speed,
      radius: DRONE.radius, damage: base, pierce: 1, ttl: BOLT_TTL,
    })) made++;
  }
  if (made > 0 && first) emit(state, { type: 'drone_fire', x: first.x, y: first.y });
  return made;
}
