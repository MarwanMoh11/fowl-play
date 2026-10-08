// src/sim/difficulty.ts — OWNER: A1. Difficulty table and chapter scaling (§7.14).
import type { Difficulty } from './types';
import { FINAL_CHAPTER } from './tuning/core';

export interface DifficultyDef {
  lives: number;
  missiles: number;
  enemyHp: number;
  bossHp: number;
  eggRate: number;
  eggSpeed: number;
  shotSpeed: number;
  heatMul: number;
  scoreMul: number;
  eggCap: number;
  deathPowerLoss: number;
}

export interface ChapterScale {
  hp: number;
  eggRate: number;
  points: number;
  speed: number;
  bossHp: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyDef> = {
  easy: {
    lives: 7, missiles: 2, enemyHp: 0.75, bossHp: 0.75, eggRate: 0.6, eggSpeed: 0.85,
    shotSpeed: 0.85, heatMul: 0.6, scoreMul: 0.75, eggCap: 12, deathPowerLoss: 1,
  },
  normal: {
    lives: 5, missiles: 1, enemyHp: 1.0, bossHp: 1.0, eggRate: 1.0, eggSpeed: 1.0,
    shotSpeed: 1.0, heatMul: 1.0, scoreMul: 1.0, eggCap: 24, deathPowerLoss: 2,
  },
  hard: {
    lives: 3, missiles: 0, enemyHp: 1.4, bossHp: 1.4, eggRate: 1.5, eggSpeed: 1.15,
    shotSpeed: 1.15, heatMul: 1.15, scoreMul: 1.5, eggCap: 40, deathPowerLoss: 3,
  },
};

const SCALE_HP_PER_CHAPTER = 0.15;
const SCALE_EGG_PER_CHAPTER = 0.10;
const SCALE_POINTS_PER_CHAPTER = 0.10;
const SCALE_SPEED_PER_CHAPTER = 0.04;
const SCALE_SPEED_MAX = 1.5;
const SCALE_BOSS_HP_PER_LOOP = 0.25;

/** 0 for chapters 1–5, 1 for 6–10, … */
export function loopIndex(chapter: number): number {
  return Math.floor((chapter - 1) / FINAL_CHAPTER);
}

export function chapterScale(chapter: number): ChapterScale {
  const c = chapter - 1;
  return {
    hp: 1 + SCALE_HP_PER_CHAPTER * c,
    eggRate: 1 + SCALE_EGG_PER_CHAPTER * c,
    points: 1 + SCALE_POINTS_PER_CHAPTER * c,
    speed: Math.min(SCALE_SPEED_MAX, 1 + SCALE_SPEED_PER_CHAPTER * c),
    bossHp: 1 + SCALE_BOSS_HP_PER_LOOP * loopIndex(chapter),
  };
}
