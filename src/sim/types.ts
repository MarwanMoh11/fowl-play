// src/sim/types.ts — OWNER: A1 — CONTRACT v1 (frozen; changes only via A1)
import type { BehaviorState } from './behaviors.types';
import type { WaveRuntime } from './waves.types';
import type { GameEvent } from './events';

export interface Vec2 { x: number; y: number }
export interface RngState { s: number }

export type Difficulty = 'easy' | 'normal' | 'hard';
export type WeaponId = 'pulse' | 'neutron' | 'laser' | 'arc';
export const WEAPON_IDS: readonly WeaponId[] = ['pulse', 'neutron', 'laser', 'arc'];

export type EnemyKind =
  | 'chicken_basic' | 'chicken_red' | 'chicken_armored' | 'chicken_ufo' | 'chick'
  | 'asteroid_l' | 'asteroid_m' | 'asteroid_s'
  | 'boss_hen' | 'boss_carrier' | 'boss_rooster' | 'boss_dreadnought';

export type PickupKind =
  | 'drumstick' | 'roast' | 'power_core'
  | 'gift_pulse' | 'gift_neutron' | 'gift_laser' | 'gift_arc';

export type ProjectileKind =
  | 'bolt'           // player weapon shot
  | 'missile'        // player missile
  | 'egg'            // falling egg with gravity
  | 'enemy_shot'     // straight energy shot
  | 'boss_egg'       // large egg flying straight, no gravity
  | 'feather_knife'; // straight, rotated along velocity

export type Phase =
  | 'wave_intro' | 'boss_intro' | 'wave_active' | 'wave_clear'
  | 'chapter_complete' | 'warp' | 'game_over' | 'victory';

export type DamageSource = 'bolt' | 'arc' | 'missile' | 'contact' | 'debug';

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

export interface Hazard {
  id: number;
  kind: 'telegraph' | 'beam';
  a: Vec2;                 // segment start
  b: Vec2;                 // segment end
  width: number;           // px
  ttl: number;             // s
  lethal: boolean;         // beams true, telegraphs false
  alive: boolean;
  ownerId: number;         // boss enemy id
}

export interface Stats {
  shotsFired: number;      // bolts fired (arc: 1 per volley)
  shotsHit: number;        // bolts that hit at least one enemy (arc: volley hit ≥1)
  kills: number;
  foodCollected: number;   // food units (drumstick 1, roast 10)
  deaths: number;
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
}

export interface InputFrame {
  moveX: number;           // -1..1 keyboard/gamepad axis
  moveY: number;           // -1..1
  pointer: Vec2 | null;    // logical coords while pointer steering is active, else null
  fire: boolean;           // held
  missile: boolean;        // true only on the tick it was pressed
  skip: boolean;           // true only on the tick "confirm" was pressed
}
