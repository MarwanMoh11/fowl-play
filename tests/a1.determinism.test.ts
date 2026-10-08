// tests/a1.determinism.test.ts — OWNER: A1. Same seed + same input → same game (§10.3).
import { describe, expect, it } from 'vitest';
import { createGame, step } from '../src/sim/game';
import type { InputFrame } from '../src/sim/types';
import { DT } from '../src/sim/tuning/core';
import { checkInvariants } from './a1.invariants';

function scripted(tick: number): InputFrame {
  const usePointer = Math.floor(tick / 500) % 2 === 1;
  return {
    moveX: Math.sin(tick * 0.03) > 0 ? 1 : -1,
    moveY: Math.cos(tick * 0.011) > 0.6 ? -1 : 0,
    pointer: usePointer ? { x: 640 + 400 * Math.sin(tick * 0.02), y: 520 + 60 * Math.cos(tick * 0.05) } : null,
    fire: tick % 180 < 150,
    missile: tick % 700 === 350,
    skip: tick % 97 === 0,
  };
}

function run(seed: number): string {
  const s = createGame({ seed, difficulty: 'normal' });
  for (let t = 0; t < 3000; t++) {
    step(s, scripted(t), DT);
    const bad = checkInvariants(s, t % 100 === 0);
    if (bad.length) throw new Error(`tick ${s.tick}: ${bad.join(', ')}`);
  }
  return JSON.stringify({ score: s.score, tick: s.tick, player: s.player, enemies: s.enemies.length, rng: s.rng });
}

describe('determinism', () => {
  it('same seed and input produce identical runs', () => {
    expect(run(1234)).toBe(run(1234));
  });

  it('different seeds diverge', () => {
    expect(run(1)).not.toBe(run(2));
  });
});
