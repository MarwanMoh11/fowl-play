// src/app/fps.ts — OWNER: A1. Frame-rate meter (value refreshed twice a second).
const FPS_WINDOW = 0.5;

export interface FpsMeter {
  readonly value: number;
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
