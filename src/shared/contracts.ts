// src/shared/contracts.ts — OWNER: A1 — CONTRACT v1
import type { GameState, Difficulty, WeaponId } from '../sim/types';
import type { GameEvent } from '../sim/events';
import type { BossId } from '../sim/bosses.types';

export type AppScreen = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

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
}

export interface UICallbacks {
  onStart(difficulty: Difficulty): void;
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
  hide(): void;
  isOpen(): boolean;
}

export const WEAPON_INFO: Record<WeaponId, { name: string; color: string; letter: string; desc: string }> = {
  pulse:   { name: 'PULSE BLASTER',  color: '#2E86FF', letter: 'P', desc: 'A widening fan of bolts that covers the screen.' },
  neutron: { name: 'NEUTRON CANNON', color: '#9B5DE5', letter: 'N', desc: 'Heavy focused rounds. Best against bosses.' },
  laser:   { name: 'PIERCING LASER', color: '#FF3B3B', letter: 'L', desc: 'Rapid beams that pass through several enemies.' },
  arc:     { name: 'ARC CASTER',     color: '#FFD60A', letter: 'A', desc: 'Lightning that seeks targets and chains between them.' },
};

export const BOSS_INFO: Record<BossId, { name: string; thresholds: number[] }> = {
  hen:         { name: 'MOTHER HEN',        thresholds: [0.5] },
  carrier:     { name: 'EGG CARRIER',       thresholds: [0.66, 0.33] },
  rooster:     { name: 'ROOSTER COMMANDER', thresholds: [0.4] },
  twin_hens:   { name: 'TWIN HENS',         thresholds: [] },
  dreadnought: { name: 'COOP DREADNOUGHT',  thresholds: [0.66, 0.33] },
};

export const STORAGE_KEYS = {
  settings: 'fowlplay.v1.settings',
  highscores: 'fowlplay.v1.highscores',
  lastName: 'fowlplay.v1.lastName',
} as const;
