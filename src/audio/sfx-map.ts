// src/audio/sfx-map.ts — OWNER: A4. Maps simulation events to sound ids (§8.8). Pure.
import type { UiSound } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { EnemyKind, WeaponId } from '../sim/types';
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

function pickupSound(kind: string, hasWeaponChange: boolean): SoundId | null {
  if (kind === 'drumstick') return 'food';
  if (kind === 'roast') return 'roast';
  if (kind === 'power_core') return 'power';
  // A gift of the weapon you already hold raises firepower instead of switching weapons.
  return hasWeaponChange ? null : 'power';
}

/** Phase 0: the six new weapons borrow v1 sounds until H4 adds their own recipes. */
const FIRE_SOUND: Record<WeaponId, SoundId> = {
  pulse: 'fire_pulse', neutron: 'fire_neutron', laser: 'fire_laser', arc: 'fire_arc',
  flak: 'fire_pulse', flame: 'fire_laser', sickle: 'fire_neutron', homing: 'fire_pulse', rail: 'fire_neutron', prism: 'fire_laser',
};

export function soundForEvent(e: GameEvent, hasWeaponChange: boolean): SoundId | null {
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
