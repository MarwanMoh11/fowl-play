// tests/a1.smoke.test.ts — OWNER: A1. Smoke bot through chapter 1 (§10.3).
import { describe, expect, it } from 'vitest';
import { createGame, step } from '../src/sim/game';
import { applyDebug } from '../src/sim/debug';
import type { InputFrame } from '../src/sim/types';
import { DT, MAX_POWER } from '../src/sim/tuning/core';
import { checkInvariants } from './a1.invariants';

const MAX_TICKS = 30 * 60 * 60;       // 30 simulated minutes
const MAX_WAVE_TICKS = 5 * 60 * 60;   // 5 simulated minutes
const JSON_CHECK_EVERY = 30;

describe('smoke bot', () => {
  it('clears chapter 1 in god mode at power 10', () => {
    const s = createGame({ seed: 7, difficulty: 'normal', debug: { godMode: true } });
    for (let i = 0; i < MAX_POWER; i++) applyDebug(s, 'powerUp');
    expect(s.player.power).toBe(MAX_POWER);

    let waveStartTick = 0;
    let longestWave = 0;
    for (let t = 0; t < MAX_TICKS && s.chapter === 1; t++) {
      const time = t * DT;
      const input: InputFrame = {
        moveX: 0, moveY: 0,
        pointer: { x: 640 + 500 * Math.sin(0.7 * time), y: 560 },
        fire: true,
        missile: t % 600 === 0,
        skip: false,
      };
      step(s, input, DT);
      const bad = checkInvariants(s, t % JSON_CHECK_EVERY === 0);
      if (bad.length) throw new Error(`tick ${s.tick} c${s.chapter}w${s.wave} ${s.phase}: ${bad.join(', ')}`);
      if (s.events.some((e) => e.type === 'wave_start')) waveStartTick = s.tick;
      longestWave = Math.max(longestWave, s.tick - waveStartTick);
      if (s.tick - waveStartTick > MAX_WAVE_TICKS) throw new Error(`wave ${s.wave} lasted over 5 minutes`);
    }
    expect(s.chapter).toBe(2);
    expect(longestWave).toBeLessThanOrEqual(MAX_WAVE_TICKS);
  }, 120_000);
});
