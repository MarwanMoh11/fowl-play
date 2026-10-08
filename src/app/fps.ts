// src/app/fps.ts — OWNER: A1. Frame-rate meter (value refreshed twice a second).
const FPS_WINDOW = 0.5;
/** Gaps longer than this (hidden tab, screen lock, paused debugger) are not frames and must not drag the average down. */
const FPS_MAX_GAP = 1;

export interface FpsMeter {
  readonly value: number;
  /** elapsed = unclamped seconds since the previous animation frame. */
  tick(elapsed: number): void;
}

export function createFpsMeter(): FpsMeter {
  let frames = 0;
  let time = 0;
  let value = 60;
  return {
    get value() {
      return value;
    },
    tick(elapsed: number): void {
      if (!(elapsed >= 0) || elapsed > FPS_MAX_GAP) return;
      frames += 1;
      time += elapsed;
      if (time >= FPS_WINDOW) {
        value = Math.round(frames / time);
        frames = 0;
        time = 0;
      }
    },
  };
}
