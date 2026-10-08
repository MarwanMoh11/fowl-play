// tests/a1.invariants.ts — OWNER: A1. State invariants checked by integration tests (§10.3).
import type { GameState, Vec2 } from '../src/sim/types';
import { MAX_ENEMIES, MAX_HAZARDS, MAX_PICKUPS, MAX_POWER, MAX_PROJECTILES } from '../src/sim/tuning/core';

function finite(v: Vec2): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y);
}

/** Returns a list of violations (empty = OK). `json` also checks JSON serializability (slower). */
export function checkInvariants(s: GameState, json = false): string[] {
  const out: string[] = [];
  const p = s.player;
  if (!finite(p.pos)) out.push('player.pos NaN');
  for (const e of s.enemies) if (!finite(e.pos) || !finite(e.vel)) out.push(`enemy ${e.id} ${e.kind} NaN`);
  for (const pr of s.projectiles) if (!finite(pr.pos) || !finite(pr.vel)) out.push(`projectile ${pr.id} ${pr.kind} NaN`);
  for (const k of s.pickups) if (!finite(k.pos) || !finite(k.vel)) out.push(`pickup ${k.id} NaN`);
  for (const h of s.hazards) if (!finite(h.a) || !finite(h.b)) out.push(`hazard ${h.id} NaN`);
  if (s.enemies.length > MAX_ENEMIES) out.push(`enemies ${s.enemies.length}`);
  if (s.projectiles.length > MAX_PROJECTILES) out.push(`projectiles ${s.projectiles.length}`);
  if (s.pickups.length > MAX_PICKUPS) out.push(`pickups ${s.pickups.length}`);
  if (s.hazards.length > MAX_HAZARDS) out.push(`hazards ${s.hazards.length}`);
  if (!(p.power >= 0 && p.power <= MAX_POWER)) out.push(`power ${p.power}`);
  if (!(p.heat >= 0 && p.heat <= 100)) out.push(`heat ${p.heat}`);
  if (!(p.lives >= 0)) out.push(`lives ${p.lives}`);
  if (!(p.food >= 0 && p.food <= 99)) out.push(`food ${p.food}`);
  if (!Number.isFinite(s.score)) out.push('score NaN');
  if (json) {
    try {
      JSON.stringify(s);
    } catch (err) {
      out.push('JSON.stringify failed: ' + String(err));
    }
  }
  return out;
}
