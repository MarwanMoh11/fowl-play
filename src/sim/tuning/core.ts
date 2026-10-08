// src/sim/tuning/core.ts — OWNER: A1 — CONTRACT v1
export const WORLD_W = 1280;
export const WORLD_H = 720;
export const DT = 1 / 60;

export const SHIP_MIN_X = 36;
export const SHIP_MAX_X = 1244;
export const SHIP_MIN_Y = 90;
export const SHIP_MAX_Y = 640;
export const SHIP_SPAWN = { x: 640, y: 600 } as const;

export const GROUND_Y = 668;          // eggs splat here (just above the HUD bar)
export const HUD_BAR_Y = 676;         // bottom HUD bar occupies 676..720
export const EGG_DROP_MAX_Y = 520;    // enemies below this never drop eggs

export const MAX_ENEMIES = 400;
export const MAX_PROJECTILES = 1500;
export const MAX_PICKUPS = 300;
export const MAX_HAZARDS = 50;

export const PHASE_TIME = {
  waveIntro: 2.0,
  bossIntro: 3.0,
  waveClear: 1.5,
  chapterComplete: 5.0,
  chapterCompleteSkippableAfter: 1.5,
  warp: 3.0,
  gameOverDelay: 2.0,                  // dead with 0 lives → game_over after this
} as const;

export const WAVES_PER_CHAPTER = 10;
export const FINAL_CHAPTER = 5;
export const MAX_LIVES = 9;
export const MAX_MISSILES = 99;
export const MAX_POWER = 10;
export const EXTRA_LIFE_EVERY = 100_000;
