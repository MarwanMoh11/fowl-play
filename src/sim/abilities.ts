// src/sim/abilities.ts — OWNER: H3. Enemy abilities (HENPOCALYPSE §H3). updateAbility runs after the behavior each tick.
import type { Enemy, GameState, ProjectileKind } from './types';
import { emit } from './events';
import { spawnProjectile } from './projectiles';
import { DIFFICULTY } from './difficulty';
import { fromAngle } from './math';
import { rngChance, rngRange } from './rng';
import { spawnEnemy } from './enemies';
import { addLineHazard } from './envHazards';
import { ABILITY, EGG } from './tuning/enemies';
import { EGG_DROP_MAX_Y, WORLD_H, WORLD_W } from './tuning/core';

const TAU = 2 * Math.PI;
/** Sniper windup: skillState holds WINDUP + aim angle while the telegraph is up (0 = idle). */
const WINDUP = 8;

function onScreen(e: Enemy): boolean {
  const { x, y } = e.pos;
  return x >= 0 && x <= WORLD_W && y >= 0 && y <= WORLD_H;
}

function inEggZone(e: Enemy): boolean {
  const { x, y } = e.pos;
  return y >= 0 && y <= EGG_DROP_MAX_Y && x >= EGG.zoneMinX && x <= EGG.zoneMaxX;
}

/** Angle from the enemy to the player; straight down when the player is dead. */
function aimAngle(state: GameState, e: Enemy): number {
  const pl = state.player;
  if (!pl.alive) return Math.PI / 2;
  return Math.atan2(pl.pos.y - e.pos.y, pl.pos.x - e.pos.x);
}

/** One enemy projectile flying at `angle`; speed is scaled by the difficulty's shot speed. */
function fireAt(
  state: GameState, e: Enemy, kind: ProjectileKind, angle: number, speed: number,
  extra: { homing?: number; ttl?: number } = {},
): void {
  const v = fromAngle(angle, speed * DIFFICULTY[state.difficulty].shotSpeed);
  const p = spawnProjectile(state, { kind, owner: 'enemy', x: e.pos.x, y: e.pos.y, vx: v.x, vy: v.y, ...extra });
  if (p) emit(state, { type: 'enemy_shot', x: e.pos.x, y: e.pos.y });
}

/** `count` projectiles fanning out evenly from the enemy (mine shards). */
function radial(state: GameState, e: Enemy, kind: ProjectileKind, count: number, speed: number): void {
  for (let i = 0; i < count; i++) {
    const v = fromAngle((TAU * i) / count, speed * DIFFICULTY[state.difficulty].shotSpeed);
    spawnProjectile(state, { kind, owner: 'enemy', x: e.pos.x, y: e.pos.y, vx: v.x, vy: v.y });
  }
}

function setCloak(state: GameState, e: Enemy, on: boolean): void {
  e.invulnerable = on;
  emit(state, { type: 'enemy_cloak', id: e.id, x: e.pos.x, y: e.pos.y, on });
}

/** Ninja: every 3 s it cloaks for 0.6 s (on screen only), then throws one feather knife at the player. */
function ninja(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.ninja;
  if (!onScreen(e)) {
    if (e.skillState === 1) setCloak(state, e, false);
    e.skillState = 0;
    e.skillTimer = 0;
    return;
  }
  e.skillTimer += dt;
  if (e.skillState === 0) {
    if (e.skillTimer >= A.period - A.cloak) {
      e.skillState = 1;
      e.skillTimer = 0;
      setCloak(state, e, true);
    }
  } else if (e.skillTimer >= A.cloak) {
    e.skillState = 0;
    e.skillTimer = 0;
    setCloak(state, e, false);
    fireAt(state, e, 'feather_knife', aimAngle(state, e), A.knifeSpeed);
  }
}

/** Bomber: while it drops in the egg zone it lays cluster eggs (fuse 0.9–1.4 s) instead of eggs. */
function bomber(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.bomber;
  if (!e.canDropEggs || !inEggZone(e)) return;
  if (!rngChance(state.rng, A.clusterRate * dt)) return;
  const fuse = rngRange(state.rng, A.fuseMin, A.fuseMax);
  const p = spawnProjectile(state, {
    kind: 'cluster_egg', owner: 'enemy', x: e.pos.x, y: e.pos.y + e.radius * EGG.spawnYFactor,
    vx: 0, vy: A.dropSpeed, fuse,
  });
  if (p) emit(state, { type: 'egg_dropped', x: p.pos.x, y: p.pos.y });
}

/** Egg pod: after 6 s it hatches three seeking chicks and vanishes silently (no points, no drops). */
function pod(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.pod;
  e.skillTimer += dt;
  if (e.skillTimer < A.hatchAfter) return;
  for (let i = 0; i < A.chicks; i++) {
    const spread = (i - (A.chicks - 1) / 2) * A.spread;
    const chick = spawnEnemy(state, 'chick', e.pos.x, e.pos.y,
      { type: 'seek', speed: A.chickSpeed, turnRate: A.chickTurn, heading: Math.PI / 2 + spread }, { counted: false });
    if (chick) chick.parentId = e.id;
  }
  e.alive = false;
  emit(state, { type: 'pod_hatch', x: e.pos.x, y: e.pos.y });
}

/** Turret: every 2.5 s a burst of 3 aimed shots 0.12 s apart. skillState counts shots fired in the burst. */
function turret(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.turret;
  if (!onScreen(e)) return;
  e.skillTimer += dt;
  if (e.skillTimer >= A.period) {
    e.skillTimer -= A.period;
    e.skillState = 0;
  }
  while (e.skillState < A.burst && e.skillTimer >= e.skillState * A.gap) {
    fireAt(state, e, 'enemy_shot', aimAngle(state, e), A.speed);
    e.skillState += 1;
  }
}

/** Shield regeneration: 2 shield/s once 3 s have passed since the last shield hit (combat resets skillTimer). */
function regen(e: Enemy, dt: number): void {
  const A = ABILITY.regen;
  e.skillTimer = Math.min(e.skillTimer + dt, A.delay);
  if (e.skillTimer >= A.delay && e.shield < e.maxShield) {
    e.shield = Math.min(e.maxShield, e.shield + A.perSecond * dt);
  }
}

/** Elite: shield regeneration plus a 5-way spread every 3 s (skillState is the spread timer). */
function elite(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.elite;
  regen(e, dt);
  if (!onScreen(e)) return;
  e.skillState += dt;
  if (e.skillState < A.period) return;
  e.skillState -= A.period;
  const base = aimAngle(state, e);
  for (let i = 0; i < A.shots; i++) {
    fireAt(state, e, 'enemy_shot', base + (i - (A.shots - 1) / 2) * A.step, A.speed);
  }
}

/** Mech: a boss egg straight down every 3 s. */
function mech(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.mech;
  if (!onScreen(e)) return;
  e.skillTimer += dt;
  if (e.skillTimer < A.period) return;
  e.skillTimer -= A.period;
  fireAt(state, e, 'boss_egg', Math.PI / 2, A.speed);
}

/** Space mine: detonates when the player is within 90 px (no points). Death bursts are in mineBurst. */
function mineTrigger(state: GameState, e: Enemy): void {
  const pl = state.player;
  if (!pl.alive) return;
  const dx = pl.pos.x - e.pos.x;
  const dy = pl.pos.y - e.pos.y;
  const r = ABILITY.mine.trigger;
  if (dx * dx + dy * dy > r * r) return;
  e.alive = false;
  mineBurst(state, e);
}

/** Mine burst on death or detonation: 8 shards radiate out and the burst event fires. */
export function mineBurst(state: GameState, e: Enemy): void {
  const A = ABILITY.mine;
  radial(state, e, 'shard', A.shards, A.shardSpeed);
  emit(state, { type: 'projectile_burst', kind: 'shard', x: e.pos.x, y: e.pos.y });
}

/** Ghost: a 4 s cycle, invulnerable for the last 1.5 s. Transitions emit enemy_cloak. */
function ghost(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.ghost;
  e.skillTimer = (e.skillTimer + dt) % A.cycle;
  const cloaked = e.skillTimer >= A.cloakAt ? 1 : 0;
  if (cloaked !== e.skillState) {
    e.skillState = cloaked;
    setCloak(state, e, cloaked === 1);
  }
}

/** Healer: every 2 s heals each other non-boss enemy within 160 px by 15% of its max hp. */
function healer(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.healer;
  e.skillTimer += dt;
  if (e.skillTimer < A.period) return;
  e.skillTimer -= A.period;
  emit(state, { type: 'enemy_heal', id: e.id, x: e.pos.x, y: e.pos.y, radius: A.radius });
  const r2 = A.radius * A.radius;
  for (const o of state.enemies) {
    if (o === e || !o.alive || o.isBoss) continue;
    const dx = o.pos.x - e.pos.x;
    const dy = o.pos.y - e.pos.y;
    if (dx * dx + dy * dy > r2) continue;
    o.hp = Math.min(o.maxHp, o.hp + Math.ceil(o.maxHp * A.fraction));
  }
}

/** Sniper: every 4 s a 0.9 s telegraph toward the player; then one shot along the same line at 700 px/s. */
function sniper(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.sniper;
  if (e.skillState > 0) {
    e.skillTimer += dt;
    if (e.skillTimer < A.telegraph) return;
    const angle = e.skillState - WINDUP;
    e.skillState = 0;
    e.skillTimer = 0;
    fireAt(state, e, 'enemy_shot', angle, A.speed);
    return;
  }
  if (!onScreen(e)) return;
  e.skillTimer += dt;
  if (e.skillTimer < A.period) return;
  e.skillTimer = 0;
  const angle = aimAngle(state, e);
  const far = { x: e.pos.x + Math.cos(angle) * A.reach, y: e.pos.y + Math.sin(angle) * A.reach };
  addLineHazard(state, e.id, 'telegraph', e.pos, far, A.width, A.telegraph);
  e.skillState = WINDUP + angle;
}

function countChicks(state: GameState): number {
  let n = 0;
  for (const o of state.enemies) if (o.alive && o.kind === 'chick') n++;
  return n;
}

/** Mother: every 4 s spawns up to 2 seeking chicks while fewer than 24 chicks are alive. */
function mother(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.mother;
  e.skillTimer += dt;
  if (e.skillTimer < A.period) return;
  e.skillTimer -= A.period;
  const n = Math.min(A.spawn, A.cap - countChicks(state));
  for (let i = 0; i < n; i++) {
    const heading = Math.PI / 2 + (i - (A.spawn - 1) / 2) * 0.8;
    const c = spawnEnemy(state, 'chick', e.pos.x, e.pos.y,
      { type: 'seek', speed: A.chickSpeed, turnRate: A.chickTurn, heading }, { counted: false });
    if (c) c.parentId = e.id;
  }
}

/** Void: every 2.5 s fires a homing orb; a blink void (voids pattern) first teleports into its box. */
function voidChicken(state: GameState, e: Enemy, dt: number): void {
  const A = ABILITY.void;
  e.skillTimer += dt;
  if (e.skillTimer < A.period) return;
  e.skillTimer -= A.period;
  if (e.behavior.type === 'blink') {
    const fromX = e.pos.x;
    const fromY = e.pos.y;
    e.pos.x = rngRange(state.rng, A.minX, A.maxX);
    e.pos.y = rngRange(state.rng, A.minY, A.maxY);
    emit(state, { type: 'enemy_teleport', id: e.id, fromX, fromY, x: e.pos.x, y: e.pos.y });
  }
  fireAt(state, e, 'void_orb', aimAngle(state, e), A.speed, { homing: A.homing, ttl: A.ttl });
}

/** Runs the ability of `e` for this tick (after its behavior). Kinds without an ability do nothing. */
export function updateAbility(state: GameState, e: Enemy, dt: number): void {
  switch (e.kind) {
    case 'chicken_ninja': return ninja(state, e, dt);
    case 'chicken_bomber': return bomber(state, e, dt);
    case 'egg_pod': return pod(state, e, dt);
    case 'chicken_turret': return turret(state, e, dt);
    case 'chicken_shield': return regen(e, dt);
    case 'chicken_elite': return elite(state, e, dt);
    case 'chicken_mech': return mech(state, e, dt);
    case 'space_mine': return mineTrigger(state, e);
    case 'chicken_ghost': return ghost(state, e, dt);
    case 'chicken_healer': return healer(state, e, dt);
    case 'chicken_sniper': return sniper(state, e, dt);
    case 'chicken_mother': return mother(state, e, dt);
    case 'chicken_void': return voidChicken(state, e, dt);
    default: return;
  }
}
