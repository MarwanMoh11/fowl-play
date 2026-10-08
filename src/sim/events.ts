// src/sim/events.ts — OWNER: LEAD — CONTRACT v2 (HENPOCALYPSE)
import type { Vec2, WeaponId, EnemyKind, PickupKind, ChapterBonus, GameState, PerkId, PowerupId, ProjectileKind } from './types';

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
  | { type: 'victory'; score: number }
  // ---- HENPOCALYPSE ----
  | { type: 'combo'; count: number; mult: number }                 // combo reached a new tier
  | { type: 'combo_break'; count: number }                          // chain of ≥ COMBO_BREAK_MIN kills ended
  | { type: 'fury_full' }
  | { type: 'overdrive_start'; duration: number; x: number; y: number }
  | { type: 'overdrive_end' }
  | { type: 'powerup_start'; id: PowerupId; duration: number }
  | { type: 'powerup_end'; id: PowerupId }
  | { type: 'shield_absorb'; x: number; y: number; left: number }   // player shield charge popped
  | { type: 'player_revived'; x: number; y: number; left: number }
  | { type: 'enemy_shield_hit'; id: number; x: number; y: number }
  | { type: 'enemy_shield_break'; id: number; x: number; y: number }
  | { type: 'enemy_teleport'; id: number; fromX: number; fromY: number; x: number; y: number }
  | { type: 'enemy_cloak'; id: number; x: number; y: number; on: boolean }
  | { type: 'enemy_heal'; id: number; x: number; y: number; radius: number }
  | { type: 'pod_hatch'; x: number; y: number }
  | { type: 'projectile_burst'; kind: ProjectileKind; x: number; y: number } // cluster egg / mine burst
  | { type: 'golden_appear'; x: number; y: number }
  | { type: 'golden_escaped' }
  | { type: 'rail'; x: number; y0: number; y1: number; width: number }     // hitscan rail beam
  | { type: 'chain_explosion'; x: number; y: number; radius: number }
  | { type: 'crit'; x: number; y: number }
  | { type: 'drone_fire'; x: number; y: number }
  | { type: 'perk_draft'; options: PerkId[] }
  | { type: 'perk_chosen'; id: PerkId; stacks: number }
  | { type: 'corn_collected'; amount: number; total: number };

export function emit(state: GameState, e: GameEvent): void {
  state.events.push(e);
}
