// src/sim/types.ts — OWNER: LEAD — CONTRACT v2 (HENPOCALYPSE; changes only via the lead)
import type { BehaviorState } from './behaviors.types';
import type { WaveRuntime } from './waves.types';
import type { GameEvent } from './events';

export interface Vec2 { x: number; y: number }
export interface RngState { s: number }

export type Difficulty = 'easy' | 'normal' | 'hard';
export type WeaponId =
  | 'pulse' | 'neutron' | 'laser' | 'arc'
  | 'flak' | 'flame' | 'sickle' | 'homing' | 'rail' | 'prism';
export const WEAPON_IDS: readonly WeaponId[] = [
  'pulse', 'neutron', 'laser', 'arc', 'flak', 'flame', 'sickle', 'homing', 'rail', 'prism',
];

export type ShipId = 'falcon' | 'bantam' | 'bulwark' | 'phoenix';
export const SHIP_IDS: readonly ShipId[] = ['falcon', 'bantam', 'bulwark', 'phoenix'];

export type GameMode = 'campaign' | 'onslaught' | 'boss_rush' | 'daily';
export const GAME_MODES: readonly GameMode[] = ['campaign', 'onslaught', 'boss_rush', 'daily'];

export type MutatorId =
  | 'egg_storm' | 'glass_cannon' | 'armored_armada' | 'turbo' | 'feast' | 'no_heat' | 'hardcore' | 'bullet_hell';

export type PerkId =
  | 'hot_sauce' | 'trigger_happy' | 'ice_water' | 'extra_barrel' | 'drill_bits' | 'afterburner'
  | 'hollow_point' | 'giant_slayer' | 'big_boom' | 'tractor_beam' | 'lucky_wishbone' | 'gourmand'
  | 'showboat' | 'chain_gang' | 'rage_engine' | 'long_fuse' | 'wingman' | 'popcorn'
  | 'second_wind' | 'bubble_wrap' | 'iron_will' | 'guardian_angel' | 'ammo_belt' | 'power_surge'
  | 'spare_ship' | 'featherweight' | 'speed_loader' | 'butterfingers' | 'golden_touch' | 'devils_bargain';

/** Timed power-ups (seconds remaining live in Player.powerups). The shield power-up is a charge, not a timer. */
export type PowerupId = 'magnet' | 'rapid' | 'drones' | 'timewarp' | 'double';
export const POWERUP_IDS: readonly PowerupId[] = ['magnet', 'rapid', 'drones', 'timewarp', 'double'];

/** Permanent hangar upgrades bought with Golden Corn (levels passed in through the Loadout). */
export type UpgradeId =
  | 'start_power' | 'hull' | 'missiles' | 'magnet' | 'coolant' | 'fury_core' | 'lucky' | 'combo_window';

export type EnemyKind =
  | 'chicken_basic' | 'chicken_red' | 'chicken_armored' | 'chicken_ufo' | 'chick'
  | 'asteroid_l' | 'asteroid_m' | 'asteroid_s'
  | 'boss_hen' | 'boss_carrier' | 'boss_rooster' | 'boss_dreadnought'
  // ---- HENPOCALYPSE armada (H3) ----
  | 'chicken_ninja' | 'chicken_bomber' | 'egg_pod' | 'chicken_jet' | 'chicken_turret' | 'chicken_shield'
  | 'chicken_mech' | 'space_mine' | 'chicken_ghost' | 'chicken_healer' | 'chicken_sniper' | 'chicken_mother'
  | 'chicken_void' | 'chicken_gold' | 'chicken_elite' | 'comet'
  // ---- HENPOCALYPSE bosses (H2) ----
  | 'boss_broodmother' | 'boss_rotisserie' | 'boss_colossus' | 'boss_kraken' | 'boss_phoenix' | 'boss_scrambler'
  | 'boss_empress'
  | 'boss_mini_brigadier' | 'boss_mini_ace' | 'boss_mini_cuckoo' | 'boss_mini_jelly' | 'boss_mini_stormcrow'
  | 'boss_mini_scarecrow' | 'boss_mini_guard';

export type PickupKind =
  | 'drumstick' | 'roast' | 'power_core'
  | 'gift_pulse' | 'gift_neutron' | 'gift_laser' | 'gift_arc'
  | 'gift_flak' | 'gift_flame' | 'gift_sickle' | 'gift_homing' | 'gift_rail' | 'gift_prism'
  | 'pu_shield' | 'pu_magnet' | 'pu_rapid' | 'pu_drones' | 'pu_timewarp' | 'pu_double'
  | 'life_up' | 'golden_egg' | 'corn';

export type ProjectileKind =
  | 'bolt'           // player weapon shot
  | 'missile'        // player missile
  | 'egg'            // falling egg with gravity
  | 'enemy_shot'     // straight energy shot
  | 'boss_egg'       // large egg flying straight, no gravity
  | 'feather_knife'  // straight, rotated along velocity
  | 'cluster_egg'    // egg that bursts into 6 shards when its fuse runs out
  | 'shard'          // small fast fragment
  | 'void_orb'       // slow orb that homes on the player (homing > 0)
  | 'fireball'       // big boss fire projectile
  | 'gear';          // spinning boss cog

export type Phase =
  | 'wave_intro' | 'boss_intro' | 'wave_active' | 'wave_clear'
  | 'chapter_complete' | 'warp' | 'game_over' | 'victory'
  | 'perk_draft';   // after a boss / mini-boss wave: pick 1 of 3 perks (sim waits for choosePerk)

export type DamageSource = 'bolt' | 'arc' | 'missile' | 'contact' | 'debug' | 'chain' | 'rail' | 'drone';

export interface Player {
  pos: Vec2;
  radius: number;          // hit radius
  pickupRadius: number;    // collection radius
  alive: boolean;
  lives: number;           // ships remaining INCLUDING the current one; 0 => game over
  weapon: WeaponId;
  power: number;           // integer 0..10
  heat: number;            // 0..100
  overheated: boolean;
  fireCooldown: number;    // s until next volley allowed
  missiles: number;
  missileCooldown: number; // s
  food: number;            // 0..99
  invulnTimer: number;     // s; > 0 means invulnerable
  respawnTimer: number;    // s; counts down while dead
  bank: number;            // -1..1, render tilt only
  ship: ShipId;
  shield: number;          // charges; each absorbs one lethal hit
  revives: number;         // charges; revive in place without losing a life
  fury: number;            // 0..FURY_MAX; full → overdrive can be triggered
  overdrive: number;       // s remaining; > 0 = overdrive active
  powerups: Record<PowerupId, number>; // s remaining per timed power-up (0 = off)
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec2;
  vel: Vec2;               // px/s, kept up to date by behaviors (render uses it)
  radius: number;
  hp: number;
  maxHp: number;
  points: number;          // already chapter-scaled
  eggRate: number;         // eggs per second, already scaled; 0 = never
  alive: boolean;
  age: number;             // s since spawn
  hitFlash: number;        // s of white flash remaining
  invulnerable: boolean;   // bolts are absorbed, no damage
  canDropEggs: boolean;    // false while entering/returning
  carries: PickupKind | null; // guaranteed extra drop
  rotation: number;        // radians, render only
  anim: number;            // render hint: bosses use it as frame index (see §8.2)
  isBoss: boolean;
  behavior: BehaviorState;
  shield: number;          // absorbs damage before hp (combat.ts); 0 = none
  maxShield: number;
  skillTimer: number;      // H3 ability scratch (abilities.ts), s
  skillState: number;      // H3 ability scratch
  parentId: number;        // enemy id of the spawner (mother/pod/boss), -1 = none
}

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  owner: 'player' | 'enemy';
  weapon: WeaponId | null; // player bolts only
  pos: Vec2;
  vel: Vec2;
  accel: Vec2;
  maxSpeed: number;        // 0 = unlimited
  radius: number;
  damage: number;
  pierceLeft: number;      // player bolts: remaining enemy hits
  hitIds: number[];        // enemy ids already hit by this bolt
  ttl: number;             // s; removed at 0
  alive: boolean;
  rotation: number;        // render
  homing: number;          // turn rate rad/s; 0 = flies straight. Player: steers to targetId; enemy: to the player
  targetId: number;        // player homing target enemy id, -1 = none (re-acquired by H1)
  fuse: number;            // s until the kind's special action (cluster_egg burst); 0 = none
  age: number;             // s since spawn
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  age: number;
  spin: number;            // rotation, render
  alive: boolean;
}

export type HazardKind = 'telegraph' | 'beam' | 'gravity';

export interface Hazard {
  id: number;
  kind: HazardKind;        // gravity: a = center, width = radius, power = pull px/s at the center
  a: Vec2;                 // segment start
  b: Vec2;                 // segment end
  width: number;           // px
  ttl: number;             // s
  lethal: boolean;         // beams true, telegraphs false
  alive: boolean;
  ownerId: number;         // boss enemy id (-1 = environment)
  power: number;           // gravity pull strength; 0 for other kinds
}

export interface Stats {
  shotsFired: number;      // bolts fired (arc: 1 per volley)
  shotsHit: number;        // bolts that hit at least one enemy (arc: volley hit ≥1)
  kills: number;
  foodCollected: number;   // food units (drumstick 1, roast 10)
  deaths: number;
  maxCombo: number;
  bossesKilled: number;    // includes mini-bosses
  goldenKills: number;
  powerups: number;        // power-up pickups collected
  overdrives: number;
}

export interface ChapterBonus {
  accuracyPct: number;     // integer 0..100
  accuracy: number;        // bonus points (raw, before difficulty multiplier)
  food: number;
  flawless: number;
  firepower: number;
  total: number;           // raw sum; score receives total × difficulty scoreMul
}

export interface Banner {
  style: 'wave' | 'boss' | 'small' | 'big';
  title: string;
  subtitle: string;
  ttl: number;             // s remaining
  total: number;           // initial ttl
}

export interface DebugFlags { godMode: boolean; showHitboxes: boolean; infiniteMissiles: boolean }

/** Everything that changes the run's rules. Recomputed by mods.ts from ship + upgrades + mutators + perks. */
export interface Modifiers {
  damageMul: number;         // player damage (bolts, arc, rail, drones)
  fireRateMul: number;
  heatMul: number;           // heat gain
  moveSpeedMul: number;
  extraBolts: number;        // added projectiles per volley (spread weapons)
  pierceBonus: number;
  boltSpeedMul: number;
  critChance: number;        // 0..1; a crit deals ×CRIT_MUL damage
  bossDamageMul: number;
  missileDamageMul: number;
  missileCooldownMul: number;
  pickupRadiusMul: number;
  magnetRadius: number;      // px; pickups inside are pulled to the ship (0 = off)
  dropMul: number;           // power core / gift / power-up / corn drop chances
  foodMul: number;           // food units
  scoreMul: number;          // every score award
  comboWindow: number;       // s a combo survives without a kill
  furyGainMul: number;
  overdriveTime: number;     // s
  droneCount: number;        // permanent drones
  chainRadius: number;       // px; non-boss kills splash nearby enemies (0 = off)
  enemyHpMul: number;
  enemyEggRateMul: number;
  enemyShotSpeedMul: number; // eggs and enemy shots
  enemySpeedMul: number;
  powerLossOnDeath: number;  // added to the difficulty's power loss (may be negative)
  invulnBonus: number;       // s added to respawn invulnerability
  luck: number;              // golden chicken chance multiplier
  shieldPerChapter: number;  // shield charges granted at every chapter start
}

export interface ComboState {
  count: number;           // kills in the current chain
  timer: number;           // s left before the chain breaks
  mult: number;            // current score multiplier from COMBO_TIERS
  best: number;            // best chain this run
}

export interface DraftState {
  options: PerkId[];       // 3 distinct perks (fewer if the pool ran dry)
}

export interface Loadout {
  ship: ShipId;
  upgrades: Partial<Record<UpgradeId, number>>;
  mutators: MutatorId[];
}

export interface GameState {
  seed: number;
  tick: number;
  time: number;            // simulated seconds
  rng: RngState;
  difficulty: Difficulty;
  endless: boolean;
  phase: Phase;
  phaseTimer: number;      // s since phase started
  chapter: number;         // 1-based, unbounded in endless mode
  wave: number;            // 1..10
  chapterName: string;
  waveName: string;
  bossName: string | null; // set by spawnBoss; null otherwise
  bossThresholds: number[];// hp fractions for HUD bar marks
  score: number;
  nextExtraLifeAt: number;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  hazards: Hazard[];
  waveRt: WaveRuntime;     // owned by A3
  banner: Banner | null;
  lastChapterBonus: ChapterBonus | null;
  chapterStats: Stats;
  runStats: Stats;
  events: GameEvent[];     // cleared at the start of every step()
  nextId: number;
  debug: DebugFlags;
  // ---- HENPOCALYPSE ----
  mode: GameMode;
  loadout: Loadout;
  mods: Modifiers;         // derived; never edit directly — call recomputeMods(state)
  perks: Partial<Record<PerkId, number>>; // stacks taken
  draft: DraftState | null;
  combo: ComboState;
  corn: number;            // Golden Corn collected this run
  waveCount: number;       // waves started this run (1-based; onslaught generator index)
}

export interface InputFrame {
  moveX: number;           // -1..1 keyboard/gamepad axis
  moveY: number;           // -1..1
  pointer: Vec2 | null;    // logical coords while pointer steering is active, else null
  fire: boolean;           // held
  missile: boolean;        // true only on the tick it was pressed
  skip: boolean;           // true only on the tick "confirm" was pressed
  overdrive?: boolean;     // true only on the tick "overdrive" was pressed
}
