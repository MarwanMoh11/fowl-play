// src/render/renderer.ts — OWNER: H5 (was A5). World renderer: draw order of §8.3, entity -> sprite mapping, frame selection.
import type { DrawOpts, Settings, SpriteApi, SpriteKey, View } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { Enemy, EnemyKind, GameState, PickupKind, ProjectileKind, Vec2, WeaponId } from '../sim/types';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';
import { createBackground, paletteIndex, warpFactor } from './background';
import { createEffects, drawArcs } from './effects';
import { drawFlash, drawHazards, drawHitboxes } from './overlays';
import { drawParticles } from './particles';

export const FRAME_FPS = { chicken: 8, flame: 12, pickup: 6, shot: 6, missile: 12, hen: 6, ghostFlash: 14 } as const;
export const FRAME_ID_STEP = 0.37;
export const BLINK_HZ = 10;
export const BLINK_LOW_ALPHA = 0.35;
export const BANK_TILT = 0.15;
export const DENT_HP_FRACTION = 0.5;
export const CULL_MARGIN = 120;
export const CULL_MARGIN_BOSS = 400;
const NO_DASH: number[] = [];
export const ATTRACT_CHICKENS = 6;
export const FLASH_OVERLAY_ALPHA = 0.8;
export const FLASH_OVERLAY_ALPHA_BOSS = 0.55;

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

export function animFrame(time: number, fps: number, id: number, frames: number): number {
  return Math.floor(time * fps + id * FRAME_ID_STEP) % frames;
}

/** Which sprite and frame an enemy uses. Pure, so tests can check the mapping. */
export function enemyLook(e: Enemy, time: number, out: { key: SpriteKey; frame: number }): void {
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
    case 'boss_carrier': case 'boss_dreadnought': frame = Math.max(0, Math.min(2, Math.floor(e.anim))); break;
  }
  out.key = key;
  out.frame = frame;
}

export interface WorldRenderer {
  handleEvents(events: readonly GameEvent[], state: GameState): void;
  render(state: GameState | null, view: View, settings: Settings, frameDt: number): void;
}

export function createWorldRenderer(ctx: CanvasRenderingContext2D, sprites: SpriteApi): WorldRenderer {
  const effects = createEffects();
  const background = createBackground();
  const opts: DrawOpts = {};
  const look = { key: 'ship' as SpriteKey, frame: 0 };
  const shakeOffset = { x: 0, y: 0 };
  let lastState: GameState | null = null;
  let clock = 0;

  function plain(frame = 0): DrawOpts {
    opts.frame = frame; opts.rotation = 0; opts.scale = 1; opts.alpha = 1; opts.flash = false; opts.flipX = false;
    return opts;
  }

  function onScreen(p: Vec2, margin: number): boolean {
    return p.x > -margin && p.x < WORLD_W + margin && p.y > -margin && p.y < WORLD_H + margin;
  }

  function drawEnemies(state: GameState, boss: boolean): void {
    const t = state.time;
    for (const e of state.enemies) {
      if (!e.alive || e.isBoss !== boss || !onScreen(e.pos, boss ? CULL_MARGIN_BOSS : CULL_MARGIN)) continue;
      enemyLook(e, t, look);
      const o = plain(look.frame);
      o.rotation = e.rotation;
      sprites.draw(ctx, look.key, e.pos.x, e.pos.y, o);
      if (e.hitFlash > 0) {
        // White silhouette laid over the sprite; partly transparent so a boss under constant fire stays readable.
        o.flash = true;
        o.alpha = boss ? FLASH_OVERLAY_ALPHA_BOSS : FLASH_OVERLAY_ALPHA;
        sprites.draw(ctx, look.key, e.pos.x, e.pos.y, o);
      }
    }
    if (!boss) return;
    for (const g of effects.ghosts) {
      if (!g.active) continue;
      const o = plain(g.frame);
      o.flash = Math.floor(g.t * FRAME_FPS.ghostFlash) % 2 === 0;
      const jitter = (1 - g.t / 2.5) * 3;
      sprites.draw(ctx, ENEMY_SPRITE[g.kind], g.x + Math.sin(g.t * 90) * jitter, g.y + Math.cos(g.t * 70) * jitter, o);
    }
  }

  function drawPickups(state: GameState): void {
    for (const p of state.pickups) {
      if (!p.alive) continue;
      const o = plain(p.kind === 'power_core' ? animFrame(state.time, FRAME_FPS.pickup, p.id, 2) : 0);
      o.rotation = p.spin;
      sprites.draw(ctx, PICKUP_SPRITE[p.kind], p.pos.x, p.pos.y, o);
    }
  }

  function drawProjectiles(state: GameState, player: boolean): void {
    const t = state.time;
    for (const p of state.projectiles) {
      if (!p.alive || (p.owner === 'player') !== player) continue;
      let key: SpriteKey;
      let frame = 0;
      let rot = p.rotation;
      if (p.kind === 'bolt') {
        const w: WeaponId = p.weapon ?? 'pulse';
        key = BOLT_SPRITE[w];
        rot = w === 'pulse' || w === 'laser' ? velocityRotation(p.vel, p.rotation) : 0;
      } else {
        key = PROJECTILE_SPRITE[p.kind];
        if (p.kind === 'missile') { frame = animFrame(t, FRAME_FPS.missile, p.id, 2); rot = velocityRotation(p.vel, p.rotation); }
        else if (p.kind === 'enemy_shot') { frame = animFrame(t, FRAME_FPS.shot, p.id, 2); rot = 0; }
        else if (p.kind === 'feather_knife') rot = velocityRotation(p.vel, p.rotation);
        else if (p.kind === 'boss_egg') rot = 0;
      }
      const o = plain(frame);
      o.rotation = rot;
      sprites.draw(ctx, key, p.pos.x, p.pos.y, o);
    }
  }

  function drawShip(state: GameState): void {
    const pl = state.player;
    if (!pl.alive) return;
    const o = plain(animFrame(state.time, FRAME_FPS.flame, 0, 3));
    o.rotation = pl.bank * BANK_TILT;
    const invuln = pl.invulnTimer > 0;
    if (invuln) o.alpha = Math.floor(state.time * BLINK_HZ * 2) % 2 === 0 ? 1 : BLINK_LOW_ALPHA;
    sprites.draw(ctx, 'ship', pl.pos.x, pl.pos.y, o);
    if (invuln) {
      const s = plain();
      s.alpha = Math.min(1, pl.invulnTimer);
      sprites.draw(ctx, 'ship_shield', pl.pos.x, pl.pos.y, s);
    }
  }

  function drawAttract(): void {
    for (let i = 0; i < ATTRACT_CHICKENS; i++) {
      const x = 140 + i * 200 + 70 * Math.sin(clock * 0.35 + i * 1.3);
      const y = 110 + (i % 3) * 48 + 18 * Math.sin(clock * 0.6 + i * 0.9);
      const o = plain(animFrame(clock, FRAME_FPS.chicken, i, 2));
      o.rotation = 0.1 * Math.cos(clock * 0.35 + i * 1.3);
      sprites.draw(ctx, 'enemy_chicken_basic', x, y, o);
    }
  }

  function velocityRotation(v: Vec2, fallback: number): number {
    return v.x * v.x + v.y * v.y > 1 ? Math.atan2(v.y, v.x) + Math.PI / 2 : fallback;
  }

  /** Leaves the context in default drawing state for A4's HUD, which draws right after render(). */
  function resetContextState(): void {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash(NO_DASH);
  }

  function syncChapter(state: GameState | null): void {
    if (background.fading) return;
    const want = state ? state.chapter : 1;
    if (paletteIndex(want) !== paletteIndex(background.chapter)) background.setChapter(want, state !== null);
  }

  return {
    handleEvents(events: readonly GameEvent[], state: GameState): void {
      if (state !== lastState) {
        lastState = state;
        effects.reset();
        background.setChapter(state.chapter, true);
      }
      for (const e of events) if (e.type === 'wave_start' && e.wave === 1) background.setChapter(e.chapter, false);
      effects.handleEvents(events, state.player.alive ? state.player.pos : null);
    },

    render(state: GameState | null, view: View, settings: Settings, frameDt: number): void {
      const s = view.scale;
      ctx.imageSmoothingEnabled = true;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      clock += frameDt;
      syncChapter(state);
      const warp = state && state.phase === 'warp' ? warpFactor(state.phaseTimer) : 1;
      background.update(frameDt, warp);
      effects.update(frameDt, state && state.player.alive ? state.player.pos : null);
      background.draw(ctx, warp);
      effects.shake.sample(clock, settings.screenShake, shakeOffset);
      ctx.setTransform(s, 0, 0, s, shakeOffset.x * s, shakeOffset.y * s);
      drawParticles(ctx, effects.pool, sprites, true);
      if (state) {
        drawPickups(state);
        drawEnemies(state, false);
        drawEnemies(state, true);
        drawHazards(ctx, state.hazards, state.time);
        drawProjectiles(state, false);
        drawProjectiles(state, true);
      } else {
        drawAttract();
      }
      drawArcs(ctx, effects.arcs);
      if (state) drawShip(state);
      drawParticles(ctx, effects.pool, sprites, false);
      ctx.setTransform(s, 0, 0, s, 0, 0);
      drawFlash(ctx, effects.flash.color, effects.flash.alpha(settings.reduceFlashes));
      if (state && state.debug.showHitboxes) drawHitboxes(ctx, state);
      resetContextState();
    },
  };
}
