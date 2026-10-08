// src/shared/contracts.ts — OWNER: LEAD — CONTRACT v2 (HENPOCALYPSE)
import type { GameState, Difficulty, WeaponId, GameMode, Loadout, MutatorId, PerkId, ShipId } from '../sim/types';
import type { GameEvent } from '../sim/events';
import type { BossId } from '../sim/bosses.types';

export type AppScreen = 'title' | 'playing' | 'paused' | 'gameover' | 'victory' | 'draft';

export interface View {
  scale: number;       // backing-store px per logical px (includes devicePixelRatio)
  cssScale: number;    // CSS px per logical px
  dpr: number;
  cssWidth: number;
  cssHeight: number;
  offsetX: number;     // canvas left in CSS px (letterbox)
  offsetY: number;
}

export interface Settings {
  difficulty: Difficulty;
  masterVolume: number;  // 0..1
  musicVolume: number;   // 0..1
  sfxVolume: number;     // 0..1
  screenShake: boolean;
  reduceFlashes: boolean;
  showFps: boolean;
  autoFire: boolean;
  mouseControl: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'normal', masterVolume: 0.8, musicVolume: 0.5, sfxVolume: 0.8,
  screenShake: true, reduceFlashes: false, showFps: false, autoFire: false, mouseControl: true,
};

export const SPRITE_KEYS = [
  'ship', 'ship_shield',
  'enemy_chicken_basic', 'enemy_chicken_red', 'enemy_chicken_armored', 'enemy_chicken_armored_dented',
  'enemy_chicken_ufo', 'enemy_chick',
  'enemy_asteroid_l', 'enemy_asteroid_m', 'enemy_asteroid_s',
  'boss_hen', 'boss_carrier', 'boss_rooster', 'boss_dreadnought',
  'proj_pulse', 'proj_neutron', 'proj_laser', 'proj_arc', 'proj_missile',
  'proj_egg', 'proj_enemy_shot', 'proj_boss_egg', 'proj_feather_knife',
  'pickup_drumstick', 'pickup_roast', 'pickup_power_core',
  'pickup_gift_pulse', 'pickup_gift_neutron', 'pickup_gift_laser', 'pickup_gift_arc',
  'icon_life', 'icon_missile', 'icon_food',
  'icon_weapon_pulse', 'icon_weapon_neutron', 'icon_weapon_laser', 'icon_weapon_arc',
  'fx_egg_splat', 'fx_puff',
  // ---- HENPOCALYPSE: H1 arsenal (src/render/sprites/arsenal.ts) ----
  'ship_bantam', 'ship_bulwark', 'ship_phoenix', 'drone',
  'proj_flak', 'proj_flame', 'proj_sickle', 'proj_homing', 'proj_rail', 'proj_prism',
  // ---- HENPOCALYPSE: H3 armada (src/render/sprites/armada.ts) ----
  'enemy_chicken_ninja', 'enemy_chicken_bomber', 'enemy_egg_pod', 'enemy_chicken_jet', 'enemy_chicken_turret',
  'enemy_chicken_shield', 'enemy_chicken_mech', 'enemy_space_mine', 'enemy_chicken_ghost', 'enemy_chicken_healer',
  'enemy_chicken_sniper', 'enemy_chicken_mother', 'enemy_chicken_void', 'enemy_chicken_gold', 'enemy_chicken_elite',
  'enemy_comet',
  'proj_cluster_egg', 'proj_shard', 'proj_void_orb', 'proj_fireball', 'proj_gear',
  // ---- HENPOCALYPSE: H2 bosses (src/render/sprites/bosses2.ts) ----
  'boss_broodmother', 'boss_rotisserie', 'boss_colossus', 'boss_kraken', 'boss_phoenix', 'boss_scrambler', 'boss_empress',
  'boss_mini_brigadier', 'boss_mini_ace', 'boss_mini_cuckoo', 'boss_mini_jelly', 'boss_mini_stormcrow',
  'boss_mini_scarecrow', 'boss_mini_guard',
  // ---- HENPOCALYPSE: H5 loot, icons, fx (src/render/sprites/loot.ts) ----
  'pickup_gift_flak', 'pickup_gift_flame', 'pickup_gift_sickle', 'pickup_gift_homing', 'pickup_gift_rail', 'pickup_gift_prism',
  'pickup_pu_shield', 'pickup_pu_magnet', 'pickup_pu_rapid', 'pickup_pu_drones', 'pickup_pu_timewarp', 'pickup_pu_double',
  'pickup_life_up', 'pickup_golden_egg', 'pickup_corn',
  'icon_weapon_flak', 'icon_weapon_flame', 'icon_weapon_sickle', 'icon_weapon_homing', 'icon_weapon_rail', 'icon_weapon_prism',
  'icon_shield', 'icon_fury', 'icon_corn',
  'icon_pu_magnet', 'icon_pu_rapid', 'icon_pu_drones', 'icon_pu_timewarp', 'icon_pu_double',
  'fx_shield_bubble', 'fx_smoke', 'fx_gravity',
] as const;
export type SpriteKey = typeof SPRITE_KEYS[number];

export interface DrawOpts {
  frame?: number;      // default 0
  rotation?: number;   // radians, around center
  scale?: number;      // default 1
  alpha?: number;      // default 1
  flash?: boolean;     // draw the pre-built white silhouette instead
  flipX?: boolean;
}

export interface SpriteApi {
  /** Draws centered at (x, y) in logical px using the current transform. */
  draw(ctx: CanvasRenderingContext2D, key: SpriteKey, x: number, y: number, opts?: DrawOpts): void;
  size(key: SpriteKey): { w: number; h: number; frames: number };
  /** Standalone canvas of one frame, for DOM previews (How to Play). */
  toCanvas(key: SpriteKey, frame?: number): HTMLCanvasElement;
}

export interface Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly sprites: SpriteApi;
  resize(view: View): void;
  /** Call after every step() with that step's events. */
  handleEvents(events: readonly GameEvent[], state: GameState): void;
  /** state === null draws the attract-mode background for menus. Leaves transform at logical scale. */
  render(state: GameState | null, view: View, settings: Settings, frameDt: number): void;
  /** Debug page: every sprite and frame in a labeled grid. */
  renderGallery(view: View): void;
}

export type UiSound = 'move' | 'select' | 'back' | 'error' | 'tick';

export interface AudioSystem {
  /** Create/resume the AudioContext. Call from a user gesture. Safe to call repeatedly. */
  unlock(): void;
  handleEvents(events: readonly GameEvent[]): void;
  /** Every frame: chooses the music track, ducking, tally ticks. */
  update(screen: AppScreen, state: GameState | null, frameDt: number): void;
  setVolumes(master: number, music: number, sfx: number): void;
  ui(sound: UiSound): void;
}

export interface RunSummary {
  score: number;
  chapter: number;
  wave: number;
  difficulty: Difficulty;
  accuracyPct: number;
  kills: number;
  victory: boolean;
  mode: GameMode;
  ship: ShipId;
  mutators: MutatorId[];
  perks: PerkId[];          // one entry per stack taken, in id order
  corn: number;             // Golden Corn collected during the run (H4 adds end-of-run conversion)
  bossesKilled: number;
  maxCombo: number;
  goldenKills: number;
  seed: number;
  /** Daily runs: local date as YYYYMMDD; 0 otherwise. */
  dailyDate: number;
}

export interface StartOptions {
  difficulty: Difficulty;
  mode: GameMode;
  loadout: Loadout;
}

export interface UICallbacks {
  onStart(opts: StartOptions): void;
  /** Perk draft: the player picked card `index` (0-based). */
  onDraftChoice(index: number): void;
  onResume(): void;
  onRestart(): void;
  onQuitToTitle(): void;
  onContinueEndless(): void;
  onSettingsChanged(settings: Settings): void;
}

export interface UIDeps {
  sprites: SpriteApi;
  audio: AudioSystem;
  getSettings(): Settings;
}

export interface UI {
  showTitle(): void;
  showPause(): void;
  showGameOver(summary: RunSummary): void;
  showVictory(summary: RunSummary): void;
  /** Perk draft cards for state.draft (screen 'draft'); calls onDraftChoice. */
  showDraft(state: GameState): void;
  /** Every sim event batch while playing (achievements, toasts, codex "seen" tracking). */
  trackEvents(events: readonly GameEvent[], state: GameState): void;
  hide(): void;
  isOpen(): boolean;
}

export const WEAPON_INFO: Record<WeaponId, { name: string; color: string; letter: string; desc: string }> = {
  pulse:   { name: 'PULSE BLASTER',  color: '#2E86FF', letter: 'P', desc: 'A widening fan of bolts that covers the screen.' },
  neutron: { name: 'NEUTRON CANNON', color: '#9B5DE5', letter: 'N', desc: 'Heavy focused rounds. Best against bosses.' },
  laser:   { name: 'PIERCING LASER', color: '#FF3B3B', letter: 'L', desc: 'Rapid beams that pass through several enemies.' },
  arc:     { name: 'ARC CASTER',     color: '#FFD60A', letter: 'A', desc: 'Lightning that seeks targets and chains between them.' },
  flak:    { name: 'SCATTER FLAK',   color: '#FF9F1C', letter: 'F', desc: 'A short-range shotgun blast. Shreds anything up close.' },
  flame:   { name: 'PLASMA TORCH',   color: '#FF4D00', letter: 'T', desc: 'A roaring cone of plasma. Melts armor, burns through crowds.' },
  sickle:  { name: 'SKY SICKLE',     color: '#4CC9F0', letter: 'S', desc: 'Spinning blades that fly out and boomerang back through everything.' },
  homing:  { name: 'HIVE SEEKERS',   color: '#B5E61D', letter: 'H', desc: 'Swarms of micro-missiles that hunt down targets.' },
  rail:    { name: 'RAIL LANCE',     color: '#E0FBFC', letter: 'R', desc: 'Slow, devastating hitscan lance that pierces the whole column.' },
  prism:   { name: 'PRISM SPLITTER', color: '#F72585', letter: 'X', desc: 'Crystal rounds that shatter into shards on impact.' },
};

export const BOSS_INFO: Record<BossId, { name: string; thresholds: number[] }> = {
  hen:         { name: 'MOTHER HEN',        thresholds: [0.5] },
  carrier:     { name: 'EGG CARRIER',       thresholds: [0.66, 0.33] },
  rooster:     { name: 'ROOSTER COMMANDER', thresholds: [0.4] },
  twin_hens:   { name: 'TWIN HENS',         thresholds: [] },
  dreadnought: { name: 'COOP DREADNOUGHT',  thresholds: [0.66, 0.33] },
  broodmother: { name: 'BROODMOTHER NEBULA', thresholds: [0.6, 0.3] },
  rotisserie:  { name: 'ROTISSERIE TITAN',   thresholds: [0.66, 0.33] },
  colossus:    { name: 'CLUCKWORK COLOSSUS', thresholds: [0.7, 0.4, 0.15] },
  kraken:      { name: 'YOLK KRAKEN',        thresholds: [0.66, 0.33] },
  phoenix:     { name: 'STORM PHOENIX',      thresholds: [0.5] },
  scrambler:   { name: 'THE SCRAMBLER',      thresholds: [0.66, 0.33] },
  empress:     { name: 'EMPRESS YOLKANDA',   thresholds: [0.75, 0.5, 0.25] },
  mini_brigadier: { name: 'BRIGADIER BROILER', thresholds: [0.5] },
  mini_ace:       { name: 'ACE OF SAUCERS',    thresholds: [0.5] },
  mini_cuckoo:    { name: 'THE CUCKOO CLOCK',  thresholds: [0.5] },
  mini_jelly:     { name: 'YOLK JELLY',        thresholds: [0.5] },
  mini_stormcrow: { name: 'STORMCROW',         thresholds: [0.5] },
  mini_scarecrow: { name: 'SCARECROW SENTINEL', thresholds: [0.5] },
  mini_guard:     { name: 'ROYAL EGG GUARD',   thresholds: [0.5] },
};

export const STORAGE_KEYS = {
  settings: 'fowlplay.v1.settings',
  highscores: 'fowlplay.v1.highscores',          // campaign table (kept from v1)
  lastName: 'fowlplay.v1.lastName',
  profile: 'fowlplay.v2.profile',                // H4: corn, unlocks, upgrades, achievements, codex, lifetime stats
  modeScores: 'fowlplay.v2.scores.',             // + mode ('onslaught' | 'boss_rush'), or 'daily.' + YYYYMMDD
  loadout: 'fowlplay.v2.loadout',                // H4: last chosen ship / mutators / mode
} as const;

export const MODE_INFO: Record<GameMode, { name: string; desc: string }> = {
  campaign:  { name: 'CAMPAIGN',    desc: '12 chapters, 120 waves, 12 bosses. Liberate the galaxy from the Cluckhive.' },
  onslaught: { name: 'ONSLAUGHT',   desc: 'Endless procedurally generated waves. How far can you get?' },
  boss_rush: { name: 'BOSS RUSH',   desc: 'Every boss back to back. Draft a perk after each kill.' },
  daily:     { name: 'DAILY CLUTCH', desc: 'Three chapters, two random mutators, one shared seed per day.' },
};
