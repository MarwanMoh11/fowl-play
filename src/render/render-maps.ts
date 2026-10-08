// src/render/render-maps.ts — OWNER: H5. Entity -> sprite mapping and pure frame/pose selection (no canvas).
import type { DrawOpts, SpriteKey } from '../shared/contracts';
import type { Enemy, EnemyKind, PickupKind, Projectile, ProjectileKind, ShipId, Vec2, WeaponId } from '../sim/types';
import { SPRITE_REGISTRY } from './sprites/registry';

export const FRAME_FPS = { chicken: 8, flame: 12, pickup: 6, shot: 6, missile: 12, hen: 6, ghostFlash: 14, void: 8, mine: 4 } as const;
export const FRAME_ID_STEP = 0.37;
export const BLINK_HZ = 10;
export const BLINK_LOW_ALPHA = 0.35;
export const BANK_TILT = 0.15;
export const DENT_HP_FRACTION = 0.5;
/** Egg pods crack one stage per this many seconds of age. */
export const POD_CRACK_S = 1.2;
export const CLOAK_ALPHA = 0.3;
export const CLOAK_FLICKER = 0.08;

export const ENEMY_SPRITE: Record<EnemyKind, SpriteKey> = {
  chicken_basic: 'enemy_chicken_basic', chicken_red: 'enemy_chicken_red', chicken_armored: 'enemy_chicken_armored',
  chicken_ufo: 'enemy_chicken_ufo', chick: 'enemy_chick',
  asteroid_l: 'enemy_asteroid_l', asteroid_m: 'enemy_asteroid_m', asteroid_s: 'enemy_asteroid_s',
  boss_hen: 'boss_hen', boss_carrier: 'boss_carrier', boss_rooster: 'boss_rooster', boss_dreadnought: 'boss_dreadnought',
  chicken_ninja: 'enemy_chicken_ninja', chicken_bomber: 'enemy_chicken_bomber', egg_pod: 'enemy_egg_pod',
  chicken_jet: 'enemy_chicken_jet', chicken_turret: 'enemy_chicken_turret', chicken_shield: 'enemy_chicken_shield',
  chicken_mech: 'enemy_chicken_mech', space_mine: 'enemy_space_mine', chicken_ghost: 'enemy_chicken_ghost',
  chicken_healer: 'enemy_chicken_healer', chicken_sniper: 'enemy_chicken_sniper', chicken_mother: 'enemy_chicken_mother',
  chicken_void: 'enemy_chicken_void', chicken_gold: 'enemy_chicken_gold', chicken_elite: 'enemy_chicken_elite',
  comet: 'enemy_comet',
  boss_broodmother: 'boss_broodmother', boss_rotisserie: 'boss_rotisserie', boss_colossus: 'boss_colossus',
  boss_kraken: 'boss_kraken', boss_phoenix: 'boss_phoenix', boss_scrambler: 'boss_scrambler', boss_empress: 'boss_empress',
  boss_mini_brigadier: 'boss_mini_brigadier', boss_mini_ace: 'boss_mini_ace', boss_mini_cuckoo: 'boss_mini_cuckoo',
  boss_mini_jelly: 'boss_mini_jelly', boss_mini_stormcrow: 'boss_mini_stormcrow', boss_mini_scarecrow: 'boss_mini_scarecrow',
  boss_mini_guard: 'boss_mini_guard',
};
export const PICKUP_SPRITE: Record<PickupKind, SpriteKey> = {
  drumstick: 'pickup_drumstick', roast: 'pickup_roast', power_core: 'pickup_power_core',
  gift_pulse: 'pickup_gift_pulse', gift_neutron: 'pickup_gift_neutron', gift_laser: 'pickup_gift_laser', gift_arc: 'pickup_gift_arc',
  gift_flak: 'pickup_gift_flak', gift_flame: 'pickup_gift_flame', gift_sickle: 'pickup_gift_sickle',
  gift_homing: 'pickup_gift_homing', gift_rail: 'pickup_gift_rail', gift_prism: 'pickup_gift_prism',
  pu_shield: 'pickup_pu_shield', pu_magnet: 'pickup_pu_magnet', pu_rapid: 'pickup_pu_rapid', pu_drones: 'pickup_pu_drones',
  pu_timewarp: 'pickup_pu_timewarp', pu_double: 'pickup_pu_double',
  life_up: 'pickup_life_up', golden_egg: 'pickup_golden_egg', corn: 'pickup_corn',
};
export const BOLT_SPRITE: Record<WeaponId, SpriteKey> = {
  pulse: 'proj_pulse', neutron: 'proj_neutron', laser: 'proj_laser', arc: 'proj_arc',
  flak: 'proj_flak', flame: 'proj_flame', sickle: 'proj_sickle', homing: 'proj_homing', rail: 'proj_rail', prism: 'proj_prism',
};
export const PROJECTILE_SPRITE: Record<Exclude<ProjectileKind, 'bolt'>, SpriteKey> = {
  missile: 'proj_missile', egg: 'proj_egg', enemy_shot: 'proj_enemy_shot', boss_egg: 'proj_boss_egg', feather_knife: 'proj_feather_knife',
  cluster_egg: 'proj_cluster_egg', shard: 'proj_shard', void_orb: 'proj_void_orb', fireball: 'proj_fireball', gear: 'proj_gear',
};
export const SHIP_SPRITE: Record<ShipId, SpriteKey> = {
  falcon: 'ship', bantam: 'ship_bantam', bulwark: 'ship_bulwark', phoenix: 'ship_phoenix',
};

export interface EnemyPose { key: SpriteKey; frame: number }
export interface ProjectilePose { key: SpriteKey; frame: number; rotation: number; scale: number; alpha: number }

export function opt(frame = 0, rotation = 0, scale = 1, alpha = 1, flash = false): DrawOpts {
  return { frame, rotation, scale, alpha, flash, flipX: false };
}

export function framesOf(key: SpriteKey): number {
  return SPRITE_REGISTRY[key].frames;
}

export function animFrame(time: number, fps: number, id: number, frames: number): number {
  return Math.floor(time * fps + id * FRAME_ID_STEP) % frames;
}

export function clampFrame(v: number, frames: number): number {
  const f = Math.floor(v);
  return f < 0 ? 0 : f >= frames ? frames - 1 : f;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function velocityRotation(v: Vec2, fallback: number): number {
  return v.x * v.x + v.y * v.y > 1 ? Math.atan2(v.y, v.x) + Math.PI / 2 : fallback;
}

/** Which sprite and frame an enemy uses. Pure, so tests can check the mapping. */
export function enemyLook(e: Enemy, time: number, out: EnemyPose): void {
  let key = ENEMY_SPRITE[e.kind];
  let frame = 0;
  switch (e.kind) {
    case 'chicken_armored':
      if (e.maxHp > 0 && e.hp / e.maxHp < DENT_HP_FRACTION) key = 'enemy_chicken_armored_dented';
      frame = animFrame(time, FRAME_FPS.chicken, e.id, 2);
      break;
    case 'chicken_basic': case 'chicken_red': case 'chicken_ufo': case 'chick':
      frame = animFrame(time, FRAME_FPS.chicken, e.id, 2);
      break;
    case 'asteroid_l': case 'asteroid_m': case 'asteroid_s':
      frame = e.id % 3;
      break;
    case 'boss_hen': frame = animFrame(time, FRAME_FPS.hen, 0, 2); break;
    case 'boss_rooster': frame = e.anim > 0 ? 1 : 0; break;
    case 'boss_carrier': case 'boss_dreadnought': frame = clampFrame(e.anim, framesOf(key)); break;
    case 'egg_pod': frame = clampFrame(e.age / POD_CRACK_S, framesOf(key)); break;
    case 'space_mine': frame = animFrame(time, FRAME_FPS.mine, e.id, framesOf(key)); break;
    case 'comet': break;
    default: {
      const frames = framesOf(key);
      if (e.kind.startsWith('boss_')) frame = clampFrame(e.anim, frames);
      else frame = animFrame(time, FRAME_FPS.chicken, e.id, frames);
    }
  }
  out.key = key;
  out.frame = frame;
}

function boltPose(p: Projectile, time: number, out: ProjectilePose): void {
  const w: WeaponId = p.weapon ?? 'pulse';
  out.key = BOLT_SPRITE[w];
  out.scale = 1;
  out.alpha = 1;
  out.frame = 0;
  out.rotation = 0;
  switch (w) {
    case 'pulse': case 'laser': case 'homing': case 'prism': case 'rail':
      out.rotation = velocityRotation(p.vel, p.rotation);
      break;
    case 'sickle': out.rotation = p.age * 18; break;
    case 'flame': {
      const t = clamp01(p.age / Math.max(0.05, p.age + p.ttl));
      out.scale = 0.6 + t;
      out.alpha = 1 - 0.7 * t;
      out.frame = animFrame(time, FRAME_FPS.flame, p.id, framesOf(out.key));
      break;
    }
    default: break;
  }
}

/** Sprite, frame, rotation, scale and alpha of a projectile. Pure. */
export function projectileLook(p: Projectile, time: number, out: ProjectilePose): void {
  if (p.kind === 'bolt') { boltPose(p, time, out); return; }
  out.key = PROJECTILE_SPRITE[p.kind];
  out.frame = 0;
  out.scale = 1;
  out.alpha = 1;
  out.rotation = p.rotation;
  const frames = framesOf(out.key);
  switch (p.kind) {
    case 'missile': out.frame = animFrame(time, FRAME_FPS.missile, p.id, frames); out.rotation = velocityRotation(p.vel, p.rotation); break;
    case 'enemy_shot': out.frame = animFrame(time, FRAME_FPS.shot, p.id, frames); out.rotation = 0; break;
    case 'feather_knife': case 'shard': case 'fireball': out.rotation = velocityRotation(p.vel, p.rotation); break;
    case 'boss_egg': out.rotation = 0; break;
    case 'cluster_egg': out.rotation = Math.sin(p.age * 9) * 0.3; break;
    case 'void_orb': out.frame = animFrame(time, FRAME_FPS.void, p.id, frames); out.rotation = 0; break;
    case 'gear': out.rotation = p.age * 7; break;
    default: break;
  }
}
