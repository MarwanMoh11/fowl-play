// src/audio/sfx-map.ts — OWNER: H4. Maps simulation events to sound ids (§8.8, HENPOCALYPSE §4.2). Pure.
import type { UiSound } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { EnemyKind, PickupKind, WeaponId } from '../sim/types';
import type { SoundId } from './sfx';

const UI_SOUNDS: Record<UiSound, SoundId> = {
  move: 'ui_move', select: 'ui_select', back: 'ui_back', error: 'ui_error', tick: 'tick',
};

export function uiSoundId(sound: UiSound): SoundId {
  return UI_SOUNDS[sound];
}

function killSound(kind: EnemyKind): SoundId | null {
  if (kind === 'chick') return 'peep';
  if (kind.startsWith('chicken_')) return 'cluck';
  if (kind.startsWith('asteroid_')) return 'rock_break';
  return null; // bosses are covered by boss_killed
}

function pickupSound(kind: PickupKind, hasWeaponChange: boolean): SoundId | null {
  if (kind === 'drumstick') return 'food';
  if (kind === 'roast') return 'roast';
  if (kind === 'power_core') return 'power';
  if (kind === 'life_up') return 'one_up';
  if (kind === 'golden_egg') return 'golden';
  if (kind === 'corn') return null; // corn_collected plays the coin
  if (kind.startsWith('pu_')) return 'power';
  // A gift of the weapon you already hold raises firepower instead of switching weapons.
  return hasWeaponChange ? null : 'power';
}

const FIRE_SOUND: Record<WeaponId, SoundId> = {
  pulse: 'fire_pulse', neutron: 'fire_neutron', laser: 'fire_laser', arc: 'fire_arc',
  flak: 'fire_flak', flame: 'fire_flame', sickle: 'fire_sickle', homing: 'fire_homing', rail: 'fire_rail', prism: 'fire_prism',
};

/** Simulation events that map one-to-one onto a sound (HENPOCALYPSE §4.2). */
const EVENT_SOUND: Partial<Record<GameEvent['type'], SoundId>> = {
  combo: 'combo_up',
  combo_break: 'combo_break',
  fury_full: 'fury_ready',
  overdrive_start: 'overdrive_on',
  overdrive_end: 'overdrive_off',
  powerup_start: 'powerup_on',
  powerup_end: 'powerup_off',
  shield_absorb: 'shield_pop',
  player_revived: 'revive',
  enemy_shield_hit: 'enemy_shield',
  enemy_shield_break: 'shield_break',
  enemy_teleport: 'teleport',
  enemy_cloak: 'cloak',
  enemy_heal: 'heal',
  pod_hatch: 'pod_hatch',
  projectile_burst: 'burst',
  golden_appear: 'golden',
  golden_escaped: 'golden_gone',
  chain_explosion: 'chain_pop',
  crit: 'crit',
  drone_fire: 'drone',
  perk_draft: 'perk_draft',
  perk_chosen: 'perk_pick',
  corn_collected: 'corn',
};

export function soundForEvent(e: GameEvent, hasWeaponChange: boolean): SoundId | null {
  const mapped = EVENT_SOUND[e.type];
  if (mapped !== undefined) return mapped;
  switch (e.type) {
    case 'player_fire': return FIRE_SOUND[e.weapon];
    case 'enemy_hit': return 'hit';
    case 'enemy_killed': return killSound(e.kind);
    case 'egg_dropped': return 'egg_drop';
    case 'egg_splat': return 'egg_splat';
    case 'enemy_shot': return 'zap';
    case 'pickup_collected': return pickupSound(e.kind, hasWeaponChange);
    case 'weapon_changed': return 'gift';
    case 'missile_gained': return 'missile_gain';
    case 'missile_launched': return 'missile_launch';
    case 'missile_detonated': return 'boom_big';
    case 'overheat': return 'overheat';
    case 'heat_recovered': return 'cooled';
    case 'player_died': return 'player_die';
    case 'player_respawned': return 'respawn';
    case 'extra_life': return 'one_up';
    case 'wave_start': return e.isBoss ? null : 'wave_start';
    case 'boss_warning': return 'siren';
    case 'boss_attack': return 'charge';
    case 'telegraph': return 'telegraph';
    case 'boss_phase': return 'roar';
    case 'boss_killed': return 'boss_die';
    case 'chapter_complete': return 'fanfare';
    case 'game_over': return 'game_over';
    default: return null;
  }
}

/** Sounds for one batch of events, in order. */
export function soundsForEvents(events: readonly GameEvent[]): SoundId[] {
  let hasWeaponChange = false;
  for (const e of events) if (e.type === 'weapon_changed') hasWeaponChange = true;
  const out: SoundId[] = [];
  for (const e of events) {
    const id = soundForEvent(e, hasWeaponChange);
    if (id !== null) out.push(id);
  }
  return out;
}

/** Event types with a sound in the table (for coverage tests). */
export const MAPPED_EVENT_TYPES: readonly GameEvent['type'][] = Object.keys(EVENT_SOUND) as GameEvent['type'][];
