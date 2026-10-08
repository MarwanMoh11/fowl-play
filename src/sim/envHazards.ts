// src/sim/envHazards.ts — OWNER: H3. Environmental hazards (HENPOCALYPSE §H3): chapter 7 solar flares,
// chapter 10 lightning, chapter 11 gravity well. Runs only in non-boss waves; ownerId -1 (environment).
import type { GameState, Hazard, Vec2 } from './types';
import { emit } from './events';
import { newId } from './ids';
import { rngRange } from './rng';
import { FINAL_CHAPTER, MAX_HAZARDS, WORLD_H } from './tuning/core';
import { ENV } from './tuning/enemies';
import { ambientOf } from './waves.types';
import type { EnvStrike } from './waves.types';

export type EnvKind = 'flare' | 'lightning' | 'gravity';

/** Environment for a chapter (loops every FINAL_CHAPTER, and matches onslaught sectors): 7 flare, 10 lightning, 11 well. */
export function envKindFor(chapter: number): EnvKind | null {
  const base = ((Math.max(1, Math.floor(chapter)) - 1) % FINAL_CHAPTER) + 1;
  if (base === 7) return 'flare';
  if (base === 10) return 'lightning';
  if (base === 11) return 'gravity';
  return null;
}

/** Adds a segment hazard (telegraph or beam). Telegraphs emit `telegraph`. Null when the hazard cap is reached. */
export function addLineHazard(
  state: GameState, ownerId: number, kind: 'telegraph' | 'beam', a: Vec2, b: Vec2, width: number, ttl: number,
): Hazard | null {
  if (state.hazards.length >= MAX_HAZARDS) return null;
  const h: Hazard = {
    id: newId(state), kind, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, width, ttl,
    lethal: kind === 'beam', alive: true, ownerId, power: 0,
  };
  state.hazards.push(h);
  if (kind === 'telegraph') emit(state, { type: 'telegraph', x: a.x, y: a.y });
  return h;
}

/** Flare: a telegraph column at a random x, then a beam 1.2 s later. */
function scheduleFlare(state: GameState, at: number, strikes: EnvStrike[]): void {
  const A = ENV.flare;
  const x = rngRange(state.rng, A.minX, A.maxX);
  strikes.push({ at, kind: 'telegraph', x, width: A.width, ttl: A.telegraph });
  strikes.push({ at: at + A.telegraph, kind: 'beam', x, width: A.width, ttl: A.beam });
}

/** Lightning: two telegraph → beam strikes, 0.4 s apart, each at its own random x. */
function scheduleLightning(state: GameState, at: number, strikes: EnvStrike[]): void {
  const A = ENV.lightning;
  for (let i = 0; i < A.strikes; i++) {
    const t = at + i * A.gap;
    const x = rngRange(state.rng, A.minX, A.maxX);
    strikes.push({ at: t, kind: 'telegraph', x, width: A.width, ttl: A.telegraph });
    strikes.push({ at: t + A.telegraph, kind: 'beam', x, width: A.width, ttl: A.beam });
  }
}

/** Moves the due strikes into the hazard list (full-height columns). */
function fireDue(state: GameState, now: number): void {
  const amb = ambientOf(state.waveRt);
  const due = amb.strikes.filter((s) => s.at <= now);
  amb.strikes = amb.strikes.filter((s) => s.at > now);
  for (const s of due) {
    addLineHazard(state, -1, s.kind, { x: s.x, y: 0 }, { x: s.x, y: WORLD_H }, s.width, s.ttl);
  }
}

/** Chapter 11: one gravity well drifts slowly across y = 200. Its ttl is refreshed every tick, so it lapses shortly after the wave ends. */
function updateWell(state: GameState, now: number): void {
  const A = ENV.well;
  const x = A.centerX + A.swayAmp * Math.sin(A.swayRate * now);
  const found = state.hazards.find((o) => o.alive && o.kind === 'gravity' && o.ownerId === -1);
  if (found) {
    found.a = { x, y: A.y };
    found.b = { x, y: A.y };
    found.ttl = A.ttl;
    return;
  }
  if (state.hazards.length >= MAX_HAZARDS) return;
  state.hazards.push({
    id: newId(state), kind: 'gravity', a: { x, y: A.y }, b: { x, y: A.y }, width: A.radius, ttl: A.ttl,
    lethal: false, alive: true, ownerId: -1, power: A.power,
  });
}

/** Called by waves.ts each tick of a non-boss wave in the active phase. Does nothing in other chapters. */
export function updateEnvHazards(state: GameState): void {
  const kind = envKindFor(state.chapter);
  if (!kind) return;
  const now = state.waveRt.elapsed;
  if (kind === 'gravity') {
    updateWell(state, now);
    return;
  }
  const amb = ambientOf(state.waveRt);
  const every = kind === 'flare' ? ENV.flare.every : ENV.lightning.every;
  while (amb.envNext <= now) {
    if (kind === 'flare') scheduleFlare(state, amb.envNext, amb.strikes);
    else scheduleLightning(state, amb.envNext, amb.strikes);
    amb.envNext += every;
  }
  fireDue(state, now);
}
