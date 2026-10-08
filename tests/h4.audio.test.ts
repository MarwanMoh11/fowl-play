// tests/h4.audio.test.ts — OWNER: H4. Every new sound has a recipe, and every §4.2 audio trigger maps to one (§H4 P1-10).
import { describe, expect, it } from 'vitest';
import { SFX, SOUND_IDS } from '../src/audio/sfx';
import { HENPO_SOUND_IDS } from '../src/audio/sfx-henpo';
import { MAPPED_EVENT_TYPES, soundForEvent, soundsForEvents } from '../src/audio/sfx-map';
import type { GameEvent } from '../src/sim/events';
import type { WeaponId } from '../src/sim/types';

const REQUIRED = [
  'fire_flak', 'fire_flame', 'fire_sickle', 'fire_homing', 'fire_rail', 'fire_prism',
  'combo_up', 'combo_break', 'fury_ready', 'overdrive_on', 'overdrive_off', 'powerup_on', 'powerup_off',
  'shield_pop', 'revive', 'enemy_shield', 'shield_break', 'teleport', 'cloak', 'heal', 'pod_hatch', 'burst',
  'golden', 'golden_gone', 'chain_pop', 'crit', 'drone', 'perk_draft', 'perk_pick', 'corn', 'achievement', 'purchase',
] as const;

const at = { x: 0, y: 0 };
const ev = (e: Record<string, unknown>): GameEvent => ({ ...at, ...e }) as unknown as GameEvent;

describe('sound table', () => {
  it('has every spec sound with a recipe and sane numbers', () => {
    for (const id of REQUIRED) {
      expect(SOUND_IDS as readonly string[], id).toContain(id);
      const def = SFX[id];
      expect(def.dur, id).toBeGreaterThan(0);
      expect(def.pitchVar, id).toBeLessThanOrEqual(0.08);
    }
    expect(HENPO_SOUND_IDS).toHaveLength(REQUIRED.length);
  });

  it('throttles the frequent sounds', () => {
    for (const id of ['fire_flame', 'drone', 'corn', 'crit', 'enemy_shield'] as const) {
      expect(SFX[id].throttle, id).toBeGreaterThan(0);
    }
  });
});

describe('event mapping', () => {
  it('maps each new weapon to its own fire sound (no borrowed v1 sounds)', () => {
    const fire: [WeaponId, string][] = [
      ['flak', 'fire_flak'], ['flame', 'fire_flame'], ['sickle', 'fire_sickle'],
      ['homing', 'fire_homing'], ['rail', 'fire_rail'], ['prism', 'fire_prism'],
    ];
    for (const [weapon, id] of fire) expect(soundForEvent(ev({ type: 'player_fire', weapon, power: 0 }), false)).toBe(id);
  });

  it('maps every HENPOCALYPSE trigger from the event matrix', () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ type: 'combo', count: 10, mult: 1.5 }, 'combo_up'],
      [{ type: 'combo_break', count: 12 }, 'combo_break'],
      [{ type: 'fury_full' }, 'fury_ready'],
      [{ type: 'overdrive_start', duration: 8 }, 'overdrive_on'],
      [{ type: 'overdrive_end' }, 'overdrive_off'],
      [{ type: 'powerup_start', id: 'magnet', duration: 12 }, 'powerup_on'],
      [{ type: 'powerup_end', id: 'magnet' }, 'powerup_off'],
      [{ type: 'shield_absorb', left: 1 }, 'shield_pop'],
      [{ type: 'player_revived', left: 0 }, 'revive'],
      [{ type: 'enemy_shield_hit', id: 1 }, 'enemy_shield'],
      [{ type: 'enemy_shield_break', id: 1 }, 'shield_break'],
      [{ type: 'enemy_teleport', id: 1, fromX: 0, fromY: 0 }, 'teleport'],
      [{ type: 'enemy_cloak', id: 1, on: true }, 'cloak'],
      [{ type: 'enemy_heal', id: 1, radius: 40 }, 'heal'],
      [{ type: 'pod_hatch' }, 'pod_hatch'],
      [{ type: 'projectile_burst', kind: 'shard' }, 'burst'],
      [{ type: 'golden_appear' }, 'golden'],
      [{ type: 'golden_escaped' }, 'golden_gone'],
      [{ type: 'chain_explosion', radius: 70 }, 'chain_pop'],
      [{ type: 'crit' }, 'crit'],
      [{ type: 'drone_fire' }, 'drone'],
      [{ type: 'perk_draft', options: [] }, 'perk_draft'],
      [{ type: 'perk_chosen', id: 'hot_sauce', stacks: 1 }, 'perk_pick'],
      [{ type: 'corn_collected', amount: 1, total: 4 }, 'corn'],
    ];
    for (const [e, id] of cases) {
      expect(soundForEvent(ev(e), false), String(e.type)).toBe(id);
      expect(MAPPED_EVENT_TYPES as readonly string[], String(e.type)).toContain(e.type);
    }
  });

  it('the rail beam is silent on its own (the shot plays fire_rail) and corn pickups play once', () => {
    expect(soundForEvent(ev({ type: 'rail', y0: 0, y1: 1, width: 4 }), false)).toBeNull();
    expect(soundsForEvents([ev({ type: 'pickup_collected', kind: 'corn' }), ev({ type: 'corn_collected', amount: 1, total: 1 })]))
      .toEqual(['corn']);
  });
});
