// src/sim/events.ts — OWNER: A1 — CONTRACT v1
import type { Vec2, WeaponId, EnemyKind, PickupKind, ChapterBonus, GameState } from './types';

export type GameEvent =
  | { type: 'player_fire'; weapon: WeaponId; power: number; x: number; y: number }
  | { type: 'arc'; points: Vec2[] }                    // lightning polyline: nose, target1, target2…
  | { type: 'overheat' }
  | { type: 'heat_recovered' }
  | { type: 'enemy_hit'; id: number; kind: EnemyKind; x: number; y: number; dmg: number }
  | { type: 'enemy_killed'; id: number; kind: EnemyKind; x: number; y: number; byMissile: boolean }
  | { type: 'egg_dropped'; x: number; y: number }
  | { type: 'egg_splat'; x: number; y: number }
  | { type: 'enemy_shot'; x: number; y: number }
  | { type: 'pickup_collected'; kind: PickupKind; x: number; y: number }
  | { type: 'power_changed'; power: number; delta: number }
  | { type: 'weapon_changed'; weapon: WeaponId }
  | { type: 'missile_gained'; missiles: number }
  | { type: 'missile_launched'; x: number; y: number; tx: number; ty: number }
  | { type: 'missile_detonated'; x: number; y: number }
  | { type: 'player_died'; x: number; y: number; livesLeft: number }
  | { type: 'player_respawned'; x: number; y: number }
  | { type: 'extra_life'; lives: number }
  | { type: 'score_popup'; amount: number; x: number; y: number }
  | { type: 'wave_start'; chapter: number; wave: number; name: string; isBoss: boolean }
  | { type: 'wave_cleared'; chapter: number; wave: number }
  | { type: 'boss_warning'; name: string }
  | { type: 'boss_attack'; attack: string; x: number; y: number }
  | { type: 'boss_phase'; phase: number; x: number; y: number }
  | { type: 'boss_killed'; kind: EnemyKind; x: number; y: number; radius: number }
  | { type: 'telegraph'; x: number; y: number }
  | { type: 'chapter_complete'; chapter: number; bonus: ChapterBonus }
  | { type: 'warp_start'; nextChapter: number }
  | { type: 'game_over'; score: number }
  | { type: 'victory'; score: number };

export function emit(state: GameState, e: GameEvent): void {
  state.events.push(e);
}
