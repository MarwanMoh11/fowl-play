// src/render/effects.ts — OWNER: A5. Turns sim events into particles, shake, flashes, arcs and boss death sequences (§8.5).
import { WEAPON_INFO } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import { GROUND_Y } from '../sim/tuning/core';
import type { EnemyKind, PickupKind, Vec2 } from '../sim/types';
import {
  COLORS, clearPool, createPool, fxRand, spawnConverging, spawnDebris, spawnFeathers, spawnFireball, spawnMuzzle,
  spawnPopup, spawnPuff, spawnRing, spawnSparkles, spawnSparks, spawnSplat, spawnYolk, updateParticles,
  type ParticlePool,
} from './particles';
import { createRails, handleHenpoEvent, resetRails, updateRails, type FxSinks, type RailBeam } from './fx-henpo';
import { createFlash, createShake, type ScreenFlash, type Shake } from './shake';

const TAU = Math.PI * 2;
export const MAX_ARCS = 8;
export const MAX_ARC_POINTS = 16;
export const ARC_LIFE = 0.08;
export const ARC_PIECES = 6;
export const ARC_JITTER = 10;
export const MAX_BURSTS = 32;
export const MAX_GHOSTS = 4;
export const BOSS_DEATH_TIME = 2.5;
export const BOSS_DEATH_BURSTS = 8;
export const BOSS_FEATHERS = 200;
export const STEAM_TIME = 0.5;
export const STEAM_INTERVAL = 0.04;
export const STEAM_NOSE_OFFSET = 28;
const FEATHER_COLOR = { white: '#FFF8EE', red: '#FF6B5B', chick: '#FFD93B', rooster: '#D9582E', gold: '#FFD93B', ghost: '#CDB4FF' } as const;
const SHELL_COLOR = '#FFF3D6';
const SHIP_DEBRIS = ['#F2F6FF', '#2E86FF', '#9AA7B8', '#FF3B3B'] as const;
const PICKUP_COLOR: Record<PickupKind, string> = {
  drumstick: '#FFB35C', roast: '#FFB35C', power_core: '#39FF88',
  gift_pulse: WEAPON_INFO.pulse.color, gift_neutron: WEAPON_INFO.neutron.color,
  gift_laser: WEAPON_INFO.laser.color, gift_arc: WEAPON_INFO.arc.color,
  gift_flak: WEAPON_INFO.flak.color, gift_flame: WEAPON_INFO.flame.color, gift_sickle: WEAPON_INFO.sickle.color,
  gift_homing: WEAPON_INFO.homing.color, gift_rail: WEAPON_INFO.rail.color, gift_prism: WEAPON_INFO.prism.color,
  pu_shield: '#4361EE', pu_magnet: '#E63946', pu_rapid: '#FFD60A', pu_drones: '#8FE3FF', pu_timewarp: '#9B5DE5',
  pu_double: '#FFC93C', life_up: '#FF3B3B', golden_egg: '#FFC93C', corn: '#FFD93B',
};

export interface ArcBolt { ttl: number; n: number; xs: Float32Array; ys: Float32Array }
export interface BossGhost { active: boolean; kind: EnemyKind; x: number; y: number; t: number; frame: number }
interface Burst { active: boolean; delay: number; x: number; y: number; big: boolean }

export interface Effects {
  readonly pool: ParticlePool;
  readonly shake: Shake;
  readonly flash: ScreenFlash;
  readonly arcs: ArcBolt[];
  readonly ghosts: BossGhost[];
  readonly rails: RailBeam[];
  handleEvents(events: readonly GameEvent[], ship: Vec2 | null): void;
  /** Advances particles, timers, pending explosions. ship = player position for emitters (null if unknown). */
  update(dt: number, ship: Vec2 | null): void;
  reset(): void;
}

const MACHINE_KINDS: ReadonlySet<EnemyKind> = new Set<EnemyKind>(['boss_carrier', 'boss_dreadnought', 'chicken_jet', 'chicken_turret', 'chicken_mech', 'space_mine']);
const isAsteroid = (k: EnemyKind): boolean => k.startsWith('asteroid') || k === 'comet';
const isMachine = (k: EnemyKind): boolean => MACHINE_KINDS.has(k);

function featherColor(k: EnemyKind): string {
  if (k === 'chicken_red') return FEATHER_COLOR.red;
  if (k === 'chick') return FEATHER_COLOR.chick;
  if (k === 'boss_rooster') return FEATHER_COLOR.rooster;
  if (k === 'chicken_gold') return FEATHER_COLOR.gold;
  if (k === 'chicken_ghost') return FEATHER_COLOR.ghost;
  return FEATHER_COLOR.white;
}

export function createEffects(): Effects {
  const pool = createPool();
  const shake = createShake();
  const flash = createFlash();
  const arcs: ArcBolt[] = [];
  for (let i = 0; i < MAX_ARCS; i++) arcs.push({ ttl: 0, n: 0, xs: new Float32Array(MAX_ARC_POINTS), ys: new Float32Array(MAX_ARC_POINTS) });
  const ghosts: BossGhost[] = [];
  for (let i = 0; i < MAX_GHOSTS; i++) ghosts.push({ active: false, kind: 'boss_hen', x: 0, y: 0, t: 0, frame: 0 });
  const bursts: Burst[] = [];
  for (let i = 0; i < MAX_BURSTS; i++) bursts.push({ active: false, delay: 0, x: 0, y: 0, big: false });
  const rails = createRails();
  const sinks: FxSinks = { pool, shake, flash, ship: null, rails };
  let arcCursor = 0;
  let steamTimer = 0;
  let steamAcc = 0;

  function storeArc(points: readonly Vec2[]): void {
    let slot = arcs.find((a) => a.ttl <= 0);
    if (!slot) { slot = arcs[arcCursor]; arcCursor = (arcCursor + 1) % MAX_ARCS; }
    const n = Math.min(points.length, MAX_ARC_POINTS);
    for (let i = 0; i < n; i++) { slot.xs[i] = points[i].x; slot.ys[i] = points[i].y; }
    slot.n = n;
    slot.ttl = ARC_LIFE;
  }

  function hit(kind: EnemyKind, x: number, y: number): void {
    if (isAsteroid(kind)) {
      spawnDebris(pool, x, y, 3, COLORS.rock);
      spawnSparks(pool, x, y, 4);
    } else if (isMachine(kind)) {
      spawnSparks(pool, x, y, 4);
    } else if (kind === 'egg_pod') {
      spawnDebris(pool, x, y, 2, SHELL_COLOR);
      spawnYolk(pool, x, y, 2);
    } else if (kind.startsWith('boss_')) {
      spawnFeathers(pool, x, y, 1, featherColor(kind));
      spawnSparks(pool, x, y, 3);
    } else {
      spawnFeathers(pool, x, y, 2, featherColor(kind));
      spawnSparks(pool, x, y, 4);
    }
  }

  function killed(kind: EnemyKind, x: number, y: number): void {
    if (kind.startsWith('boss_')) return; // boss_killed carries the whole sequence
    if (isAsteroid(kind)) {
      for (let i = 0; i < 5; i++) spawnDebris(pool, x, y, 2, i % 2 ? COLORS.rock : COLORS.rockLight);
      spawnPuff(pool, x, y, 0.5, 1.6, 0.4, 0.5);
      shake.add(0.03);
      return;
    }
    if (kind === 'egg_pod') {
      for (let i = 0; i < 2; i++) spawnDebris(pool, x, y, 4, SHELL_COLOR);
      spawnYolk(pool, x, y, 6);
      shake.add(0.05);
      return;
    }
    spawnFeathers(pool, x, y, 12, featherColor(kind));
    spawnPuff(pool, x, y, 0.5, 1.8, 0.35, 0.6);
    shake.add(0.05);
  }

  function explosion(x: number, y: number, big: boolean): void {
    spawnFireball(pool, x, y, big ? 20 : 12, big ? 180 : 70, big ? 0.8 : 0.5);
    spawnSparks(pool, x, y, big ? 50 : 14, COLORS.hot);
    spawnDebris(pool, x, y, big ? 24 : 6, big ? '#5E6B7D' : COLORS.rock);
    spawnPuff(pool, x, y, 0.8, big ? 5 : 2.2, 0.7, 0.5);
    if (big) {
      spawnRing(pool, x, y, 0, 320, 0.7, COLORS.white, 8);
      flash.trigger(0.15, COLORS.white);
    }
    shake.add(big ? 0.5 : 0.12);
  }

  function schedule(delay: number, x: number, y: number, big: boolean): void {
    const b = bursts.find((s) => !s.active);
    if (!b) return;
    b.active = true; b.delay = delay; b.x = x; b.y = y; b.big = big;
  }

  function bossKilled(kind: EnemyKind, x: number, y: number, radius: number): void {
    const g = ghosts.find((s) => !s.active);
    if (g) { g.active = true; g.kind = kind; g.x = x; g.y = y; g.t = 0; g.frame = isMachine(kind) ? 2 : 0; }
    spawnFeathers(pool, x, y, BOSS_FEATHERS, featherColor(kind), radius * 0.7);
    for (let i = 0; i < BOSS_DEATH_BURSTS; i++) {
      const a = fxRand() * TAU;
      const d = Math.sqrt(fxRand()) * radius * 0.8;
      schedule((i * BOSS_DEATH_TIME) / BOSS_DEATH_BURSTS, x + Math.cos(a) * d, y + Math.sin(a) * d, false);
    }
    schedule(BOSS_DEATH_TIME, x, y, true);
    shake.add(1);
  }

  function handle(e: GameEvent, ship: Vec2 | null): void {
    switch (e.type) {
      case 'player_fire':
        spawnMuzzle(pool, e.x, e.y, WEAPON_INFO[e.weapon].color, 0.06, 7 + e.power * 0.5);
        break;
      case 'arc': storeArc(e.points); break;
      case 'enemy_hit': hit(e.kind, e.x, e.y); break;
      case 'enemy_killed': killed(e.kind, e.x, e.y); break;
      case 'egg_splat':
        spawnSplat(pool, e.x, GROUND_Y);
        spawnYolk(pool, e.x, GROUND_Y - 4, 4);
        break;
      case 'pickup_collected': spawnSparkles(pool, e.x, e.y, 8, PICKUP_COLOR[e.kind]); break;
      case 'score_popup': spawnPopup(pool, e.x, e.y, '+' + e.amount); break;
      case 'player_died':
        spawnSparks(pool, e.x, e.y, 30, COLORS.spark);
        for (let i = 0; i < SHIP_DEBRIS.length; i++) spawnDebris(pool, e.x, e.y, 4, SHIP_DEBRIS[i]);
        spawnFireball(pool, e.x, e.y, 10, 70, 0.4);
        spawnRing(pool, e.x, e.y, 0, 160, 0.5, COLORS.white, 6);
        flash.trigger(0.2, COLORS.white);
        shake.add(0.6);
        break;
      case 'player_respawned': spawnConverging(pool, e.x, e.y, 16, 90, 0.5, COLORS.cyan); break;
      case 'extra_life': if (ship) spawnSparkles(pool, ship.x, ship.y, 20, COLORS.green, 110, 0.8); break;
      case 'missile_detonated':
        spawnRing(pool, e.x, e.y, 0, 900, 0.6, COLORS.white, 12);
        spawnRing(pool, e.x, e.y, 0, 600, 0.5, COLORS.fire, 8);
        spawnSparks(pool, e.x, e.y, 60, COLORS.spark, 1.6);
        spawnFireball(pool, e.x, e.y, 20, 200, 0.5);
        flash.trigger(0.25, COLORS.white);
        shake.add(0.7);
        break;
      case 'boss_phase':
        flash.trigger(0.15, COLORS.white);
        shake.add(0.3);
        spawnSparks(pool, e.x, e.y, 30, COLORS.hot);
        break;
      case 'boss_killed': bossKilled(e.kind, e.x, e.y, e.radius); break;
      case 'overheat': steamTimer = STEAM_TIME; steamAcc = 0; break;
      default: handleHenpoEvent(e, sinks); break;
    }
  }

  function update(dt: number, ship: Vec2 | null): void {
    if (dt <= 0) return;
    updateParticles(pool, dt);
    shake.update(dt);
    flash.update(dt);
    for (const a of arcs) if (a.ttl > 0) a.ttl -= dt;
    updateRails(rails, dt);
    for (const g of ghosts) {
      if (!g.active) continue;
      g.t += dt;
      if (g.t >= BOSS_DEATH_TIME) g.active = false;
    }
    for (const b of bursts) {
      if (!b.active) continue;
      b.delay -= dt;
      if (b.delay <= 0) { b.active = false; explosion(b.x, b.y, b.big); }
    }
    // The timer runs down even with the ship dead, so steam from a death does not resume after respawn.
    if (steamTimer > 0) {
      steamTimer -= dt;
      if (ship) {
        steamAcc += dt;
        while (steamAcc >= STEAM_INTERVAL) {
          steamAcc -= STEAM_INTERVAL;
          spawnPuff(pool, ship.x + (fxRand() - 0.5) * 12, ship.y - STEAM_NOSE_OFFSET, 0.3, 0.9, 0.5, 0.5, -70);
        }
      }
    }
  }

  function reset(): void {
    clearPool(pool);
    shake.reset();
    flash.reset();
    for (const a of arcs) a.ttl = 0;
    for (const g of ghosts) g.active = false;
    for (const b of bursts) b.active = false;
    resetRails(rails);
    steamTimer = 0;
    steamAcc = 0;
  }

  return {
    pool, shake, flash, arcs, ghosts, rails,
    handleEvents(events: readonly GameEvent[], ship: Vec2 | null): void {
      sinks.ship = ship;
      for (let i = 0; i < events.length; i++) handle(events[i], ship);
    },
    update,
    reset,
  };
}

/** Draws every live lightning bolt: wide yellow pass then thin white pass; re-jittered each call. */
export function drawArcs(ctx: CanvasRenderingContext2D, arcs: readonly ArcBolt[]): void {
  let any = false;
  ctx.beginPath();
  for (const a of arcs) {
    if (a.ttl <= 0 || a.n < 2) continue;
    any = true;
    ctx.moveTo(a.xs[0], a.ys[0]);
    for (let i = 1; i < a.n; i++) {
      const ax = a.xs[i - 1]; const ay = a.ys[i - 1];
      const dx = a.xs[i] - ax; const dy = a.ys[i] - ay;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; const ny = dx / len;
      for (let k = 1; k <= ARC_PIECES; k++) {
        const t = k / ARC_PIECES;
        const j = k < ARC_PIECES ? (fxRand() * 2 - 1) * ARC_JITTER : 0;
        ctx.lineTo(ax + dx * t + nx * j, ay + dy * t + ny * j);
      }
    }
  }
  if (!any) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,214,10,0.4)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
}
