// src/sim/bosses.ts — OWNER: H2 (was A2). Boss spawning, entry, attack cycle, phases and death (§7.13).
import type { Enemy, GameState } from './types';
import type { BossId, BossRuntime } from './bosses.types';
import { BOSS_INFO } from '../shared/contracts';
import { chapterScale, DIFFICULTY } from './difficulty';
import { emit } from './events';
import { spawnEnemy } from './enemies';
import { easeOutCubic, lerp } from './math';
import { clearEnemyProjectiles } from './projectiles';
import {
  BOSS_DEFS, BOSS_ENTRY_START_Y, BOSS_FIRST_ATTACK_DELAY, TWIN_B_DELAY, TWIN_SURVIVOR_GAP_MUL,
} from './tuning/bosses';
import { TIMER_EPSILON } from './tuning/weapons';
import type { BossBehavior, Ctx } from './bosses/common';
import { clearAttackData, isMinion, killHazards } from './bosses/common';
import { henBehavior } from './bosses/hen';
import { carrierBehavior } from './bosses/carrier';
import { roosterBehavior } from './bosses/rooster';
import { dreadnoughtBehavior } from './bosses/dreadnought';
import { broodmotherBehavior } from './bosses/broodmother';
import { rotisserieBehavior } from './bosses/rotisserie';
import { colossusBehavior } from './bosses/colossus';
import { krakenBehavior } from './bosses/kraken';
import { phoenixBehavior } from './bosses/phoenix';
import { scramblerBehavior } from './bosses/scrambler';
import { empressBehavior } from './bosses/empress';
import { brigadierBehavior } from './bosses/mini_brigadier';
import { aceBehavior } from './bosses/mini_ace';
import { cuckooBehavior } from './bosses/mini_cuckoo';
import { jellyBehavior } from './bosses/mini_jelly';
import { stormcrowBehavior } from './bosses/mini_stormcrow';
import { scarecrowBehavior } from './bosses/mini_scarecrow';
import { guardBehavior } from './bosses/mini_guard';

const BEHAVIORS: Record<BossId, BossBehavior> = {
  hen: henBehavior,
  twin_hens: henBehavior,
  carrier: carrierBehavior,
  rooster: roosterBehavior,
  dreadnought: dreadnoughtBehavior,
  broodmother: broodmotherBehavior,
  rotisserie: rotisserieBehavior,
  colossus: colossusBehavior,
  kraken: krakenBehavior,
  phoenix: phoenixBehavior,
  scrambler: scramblerBehavior,
  empress: empressBehavior,
  mini_brigadier: brigadierBehavior,
  mini_ace: aceBehavior,
  mini_cuckoo: cuckooBehavior,
  mini_jelly: jellyBehavior,
  mini_stormcrow: stormcrowBehavior,
  mini_scarecrow: scarecrowBehavior,
  mini_guard: guardBehavior,
};

function runtimeOf(e: Enemy): BossRuntime | null {
  return e.behavior.type === 'boss' ? e.behavior.rt : null;
}

/** Final HP: base × difficulty.bossHp × chapterScale(chapter).bossHp (§7.13). */
export function bossMaxHp(state: GameState, id: BossId): number {
  const base = BOSS_DEFS[id].hp;
  return Math.max(1, Math.round(base * DIFFICULTY[state.difficulty].bossHp * chapterScale(state.chapter).bossHp));
}

export function spawnBoss(state: GameState, id: BossId): void {
  const def = BOSS_DEFS[id];
  const beh = BEHAVIORS[id];
  const info = BOSS_INFO[id];
  const hp = bossMaxHp(state, id);
  state.bossName = info.name;
  state.bossThresholds = info.thresholds.slice();
  const bodies: Enemy[] = [];
  def.homes.forEach((home, index) => {
    const rt: BossRuntime = {
      id, phase: 0, entering: true, t: 0, attack: 'idle', attackT: 0,
      cooldown: BOSS_FIRST_ATTACK_DELAY + (id === 'twin_hens' && index === 1 ? TWIN_B_DELAY : 0),
      cycleIndex: 0, partner: -1, data: {},
    };
    rt.data.idx = index;
    beh.init(rt, index, home);
    const e = spawnEnemy(state, def.kind, home.x, BOSS_ENTRY_START_Y, { type: 'boss', rt });
    if (!e) return;
    e.hp = hp;
    e.maxHp = hp;
    e.points = def.points;
    e.radius = def.radius;
    e.isBoss = true;
    e.invulnerable = true;
    e.canDropEggs = false;
    e.eggRate = 0;
    beh.onSpawn?.({ state, e, rt, dt: 0 });
    bodies.push(e);
  });
  if (bodies.length === 2) {
    (bodies[0].behavior as { rt: BossRuntime }).rt.partner = bodies[1].id;
    (bodies[1].behavior as { rt: BossRuntime }).rt.partner = bodies[0].id;
  }
}

function updateEntry(c: Ctx): void {
  const { rt, e, dt } = c;
  const def = BOSS_DEFS[rt.id];
  const home = def.homes[Math.min(rt.data.idx ?? 0, def.homes.length - 1)];
  const u = Math.min(1, rt.t / def.entry);
  const y = lerp(BOSS_ENTRY_START_Y, home.y, easeOutCubic(u));
  e.vel.x = 0;
  e.vel.y = dt > 0 ? (y - e.pos.y) / dt : 0;
  e.pos.x = home.x;
  e.pos.y = y;
  if (rt.t >= def.entry - TIMER_EPSILON) {
    rt.entering = false;
    e.invulnerable = false;
  }
}

function runCycle(c: Ctx, beh: BossBehavior): void {
  const { rt, state, e } = c;
  if (rt.attack === 'idle') {
    rt.cooldown -= c.dt;
    if (rt.cooldown > TIMER_EPSILON) return;
    const cycle = beh.cycle(rt);
    rt.attack = cycle[rt.cycleIndex % cycle.length];
    rt.attackT = 0;
    clearAttackData(rt);
    emit(state, { type: 'boss_attack', attack: rt.attack, x: e.pos.x, y: e.pos.y });
  } else {
    rt.attackT += c.dt;
  }
  if (beh.runAttack(c, rt.attack)) {
    rt.attack = 'idle';
    rt.attackT = 0;
    rt.cycleIndex += 1;
    rt.cooldown = beh.gap(rt) * (rt.data.gapMul ?? 1);
    killHazards(state, e.id, 'beam');
  }
}

export function updateBoss(state: GameState, enemy: Enemy, dt: number): void {
  const rt = runtimeOf(enemy);
  if (!rt || !enemy.alive) return;
  const beh = BEHAVIORS[rt.id];
  const c: Ctx = { state, e: enemy, rt, dt };
  rt.t += dt;
  if (rt.data.invuln > 0) {
    rt.data.invuln -= dt;
    if (rt.data.invuln <= TIMER_EPSILON) {
      rt.data.invuln = 0;
      if (!rt.entering) enemy.invulnerable = false;
    }
  }
  if (rt.entering) {
    updateEntry(c);
  } else {
    runCycle(c, beh);
    beh.move(c);
  }
  enemy.anim = beh.anim(c);
}

function advancePhase(state: GameState, e: Enemy, rt: BossRuntime): void {
  rt.phase += 1;
  emit(state, { type: 'boss_phase', phase: rt.phase, x: e.pos.x, y: e.pos.y });
  const c: Ctx = { state, e, rt, dt: 0 };
  BEHAVIORS[rt.id].onPhase(c, rt.phase);
  e.anim = BEHAVIORS[rt.id].anim(c);
}

export function onBossDamaged(state: GameState, enemy: Enemy): void {
  const rt = runtimeOf(enemy);
  if (!rt) return;
  if (enemy.hp <= 0) {
    // A lethal hit: the behavior may refuse the death (the Phoenix rebirth). Phases do not advance on death.
    BEHAVIORS[rt.id].onLethal?.({ state, e: enemy, rt, dt: 0 });
    return;
  }
  const thresholds = BOSS_INFO[rt.id].thresholds;
  while (rt.phase < thresholds.length && enemy.hp / enemy.maxHp <= thresholds[rt.phase]) {
    advancePhase(state, enemy, rt);
  }
}

export function onBossKilled(state: GameState, enemy: Enemy): void {
  const rt = runtimeOf(enemy);
  emit(state, { type: 'boss_killed', kind: enemy.kind, x: enemy.pos.x, y: enemy.pos.y, radius: enemy.radius });
  clearEnemyProjectiles(state);
  killHazards(state, enemy.id);
  if (rt && rt.partner >= 0) {
    const partner = state.enemies.find((o) => o.id === rt.partner && o.alive);
    const prt = partner ? runtimeOf(partner) : null;
    if (partner && prt) {
      if (prt.phase < 1) advancePhase(state, partner, prt);
      prt.data.gapMul = TWIN_SURVIVOR_GAP_MUL;
    }
  }
  // Anything this boss spawned (parentId = its id) goes with it, whatever kind it is.
  for (const o of state.enemies) if (o.alive && !o.isBoss && o.parentId === enemy.id) o.alive = false;
  if (!state.enemies.some((o) => o.alive && o.isBoss && o.id !== enemy.id)) {
    for (const o of state.enemies) if (o.alive && isMinion(o)) o.alive = false;
  }
}
