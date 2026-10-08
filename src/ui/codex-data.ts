// src/ui/codex-data.ts — OWNER: H4. Codex names, flavour text and sprite lookups (HENPOCALYPSE §H4 P1-9). Pure.
import { SPRITE_KEYS, type SpriteKey } from '../shared/contracts';
import type { BossId } from '../sim/bosses.types';
import type { EnemyKind } from '../sim/types';

/** Every enemy kind the sim can produce, bosses included (profile validation). */
export const ENEMY_KINDS: readonly EnemyKind[] = [
  'chicken_basic', 'chicken_red', 'chicken_armored', 'chicken_ufo', 'chick', 'asteroid_l', 'asteroid_m', 'asteroid_s',
  'boss_hen', 'boss_carrier', 'boss_rooster', 'boss_dreadnought',
  'chicken_ninja', 'chicken_bomber', 'egg_pod', 'chicken_jet', 'chicken_turret', 'chicken_shield', 'chicken_mech',
  'space_mine', 'chicken_ghost', 'chicken_healer', 'chicken_sniper', 'chicken_mother', 'chicken_void', 'chicken_gold',
  'chicken_elite', 'comet',
  'boss_broodmother', 'boss_rotisserie', 'boss_colossus', 'boss_kraken', 'boss_phoenix', 'boss_scrambler', 'boss_empress',
  'boss_mini_brigadier', 'boss_mini_ace', 'boss_mini_cuckoo', 'boss_mini_jelly', 'boss_mini_stormcrow',
  'boss_mini_scarecrow', 'boss_mini_guard',
];

export interface CodexEnemy { kind: EnemyKind; name: string; text: string }

/** Regular enemies for the ENEMIES tab, in roster order. */
export const CODEX_ENEMIES: readonly CodexEnemy[] = [
  { kind: 'chicken_basic', name: 'SCOUT HEN', text: 'The advance guard. Always first in, always first out.' },
  { kind: 'chicken_red', name: 'RED BRAWLER', text: 'Hot-tempered and sunburnt. Charges without looking.' },
  { kind: 'chicken_armored', name: 'IRON PULLET', text: 'Plated with spare cookware. Takes a few more pecks.' },
  { kind: 'chicken_ufo', name: 'SAUCER HEN', text: 'Hitches a ride on a stolen dish. Hovers, wobbles, shoots.' },
  { kind: 'chick', name: 'PEEP CHICK', text: 'Tiny, fast and very loud about it. Lays nothing yet.' },
  { kind: 'asteroid_l', name: 'HEAVY SHELL', text: 'A giant eggshell fragment that drifted off a cosmic breakfast.' },
  { kind: 'asteroid_m', name: 'CRACKED SHELL', text: 'Half a shell with ambitions. Breaks into smaller pieces.' },
  { kind: 'asteroid_s', name: 'SHELL CHIP', text: 'Easily kicked aside, so it is kicked aside a lot.' },
  { kind: 'chicken_ninja', name: 'NINJA HEN', text: 'Trained in the ancient art of the hidden drumstick.' },
  { kind: 'chicken_bomber', name: 'BOMBER HEN', text: 'Carries a payload of very unstable eggs.' },
  { kind: 'egg_pod', name: 'EGG POD', text: 'Hatches surprises. Mostly the unpleasant kind.' },
  { kind: 'chicken_jet', name: 'JET HEN', text: 'Strapped a rocket to a chicken. Nobody asked why.' },
  { kind: 'chicken_turret', name: 'TURRET COOP', text: 'Mounted gun, zero legroom, full of chickens.' },
  { kind: 'chicken_shield', name: 'SHIELD HEN', text: 'Carries a dish lid and uses it with conviction.' },
  { kind: 'chicken_mech', name: 'MECH HEN', text: 'Hydraulic legs and a very large grudge.' },
  { kind: 'space_mine', name: 'SPACE MINE', text: 'Floats patiently. Do not poke it. Poke it anyway.' },
  { kind: 'chicken_ghost', name: 'GHOST HEN', text: 'Fades in and out of the sky. Still hungry.' },
  { kind: 'chicken_healer', name: 'MEDIC HEN', text: 'Patches up its friends mid-flight. Prioritize it.' },
  { kind: 'chicken_sniper', name: 'SNIPER HEN', text: 'Waits for the perfect moment. Usually yours.' },
  { kind: 'chicken_mother', name: 'NEST MOTHER', text: 'Keeps the nursery running. Its children never stop coming.' },
  { kind: 'chicken_void', name: 'VOID HEN', text: 'Pulled through a tear in space. Drags nearby things along.' },
  { kind: 'chicken_gold', name: 'GOLDEN CHICKEN', text: 'Worth its weight in corn. Catch it before it escapes.' },
  { kind: 'chicken_elite', name: 'ELITE HEN', text: 'The veterans. Their medals clink when they dodge.' },
  { kind: 'comet', name: 'FLAMING COMET', text: 'Not a hen. Nobody told the comet.' },
];

/** One-line flavour for every boss; names come from BOSS_INFO. */
export const BOSS_TEXT: Record<BossId, string> = {
  hen: 'The matriarch of the first coop. Wounded pride, endless eggs.',
  carrier: 'A flying nest that delivers its eggs with extreme prejudice.',
  rooster: 'Crows at the wrong hour and shoots at the right ones.',
  twin_hens: 'Two sisters, one fight, zero intention of sharing the sky.',
  dreadnought: 'A co-op gunboat reclaimed by the poultry. Bristles with turrets.',
  broodmother: 'Sits on the nebula and hatches whatever she likes.',
  rotisserie: 'Turns slowly on a spit of fire. Rotates the danger, too.',
  colossus: 'A clockwork giant with gears for ribs. Tick, tick, boom.',
  kraken: 'Yolk tentacles from the abyss. Grabs and does not let go.',
  phoenix: 'Reborn from its own ashes, and quite annoyed about it.',
  scrambler: 'Jams your signal and throws the whole battle into chaos.',
  empress: 'Rules the Cluckhive with a golden beak. The last egg is hers.',
  mini_brigadier: 'Shouts orders at a squadron of tiny drills.',
  mini_ace: 'A rival pilot who keeps bragging about his high score.',
  mini_cuckoo: 'Lives in a clock tower and shows up every hour, on time.',
  mini_jelly: 'A wobbling yolk that splits when you hit it. Please do not.',
  mini_stormcrow: 'Brings thunder wherever it lands, and more rain than needed.',
  mini_scarecrow: 'Guards a field of shell mines. Surprisingly good at it.',
  mini_guard: 'The royal egg guard. Very loyal, very slow, very square.',
};

export const BOSS_IDS: readonly BossId[] = Object.keys(BOSS_TEXT) as BossId[];

function hasSprite(key: string): key is SpriteKey {
  return (SPRITE_KEYS as readonly string[]).includes(key);
}

/** Sprite for an enemy kind, or null when the kind has no art (e.g. bosses handled by bossSprite). */
export function enemySprite(kind: EnemyKind): SpriteKey | null {
  const key = kind.startsWith('boss_') ? kind : `enemy_${kind}`;
  return hasSprite(key) ? key : null;
}

/** Boss art: the twin hens share the mother hen sprite. */
export function bossSprite(id: BossId): SpriteKey | null {
  const key = `boss_${id === 'twin_hens' ? 'hen' : id}`;
  return hasSprite(key) ? key : null;
}

/** Boss id for a boss_killed event: the twin hens share the `boss_hen` kind, so the banner name decides. */
export function bossIdOf(kind: EnemyKind, bossName: string | null, twinName: string): BossId | null {
  if (!kind.startsWith('boss_')) return null;
  const id = kind.slice('boss_'.length);
  if (id === 'hen' && bossName === twinName) return 'twin_hens';
  return (BOSS_IDS as readonly string[]).includes(id) ? (id as BossId) : null;
}
