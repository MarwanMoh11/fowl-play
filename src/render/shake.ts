// src/render/shake.ts — OWNER: A5. Trauma-based screen shake and the full-screen flash overlay (§8.5).
export const SHAKE_DECAY_PER_S = 1.6;
export const SHAKE_MAX_OFFSET_PX = 10;
export const SHAKE_NOISE_HZ = 22;
export const FLASH_PEAK_ALPHA = 0.55;
export const FLASH_REDUCED_SCALE = 0.3;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Smooth 1-D value noise in [-1, 1]. */
export function smoothNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

export interface Shake {
  trauma: number;
  /** Adds trauma (capped at 1). */
  add(amount: number): void;
  update(dt: number): void;
  /** Writes the pixel offset into out; always (0, 0) when disabled. */
  sample(time: number, enabled: boolean, out: { x: number; y: number }): void;
  reset(): void;
}

export function createShake(): Shake {
  const shake: Shake = {
    trauma: 0,
    add(amount: number): void {
      shake.trauma = Math.min(1, shake.trauma + amount);
    },
    update(dt: number): void {
      shake.trauma = Math.max(0, shake.trauma - SHAKE_DECAY_PER_S * dt);
    },
    sample(time: number, enabled: boolean, out: { x: number; y: number }): void {
      if (!enabled || shake.trauma <= 0) {
        out.x = 0;
        out.y = 0;
        return;
      }
      const amp = shake.trauma * shake.trauma * SHAKE_MAX_OFFSET_PX;
      out.x = amp * smoothNoise(time * SHAKE_NOISE_HZ);
      out.y = amp * smoothNoise(time * SHAKE_NOISE_HZ + 1000.5);
    },
    reset(): void {
      shake.trauma = 0;
    },
  };
  return shake;
}

export interface ScreenFlash {
  timer: number;
  duration: number;
  color: string;
  /** Starts (or restarts) a flash. */
  trigger(duration: number, color: string): void;
  update(dt: number): void;
  /** Current overlay alpha 0..1 (scaled down when reduceFlashes is on). */
  alpha(reduce: boolean): number;
  reset(): void;
}

export function createFlash(): ScreenFlash {
  const flash: ScreenFlash = {
    timer: 0,
    duration: 1,
    color: '#FFFFFF',
    trigger(duration: number, color: string): void {
      flash.timer = duration;
      flash.duration = duration;
      flash.color = color;
    },
    update(dt: number): void {
      flash.timer = Math.max(0, flash.timer - dt);
    },
    alpha(reduce: boolean): number {
      if (flash.timer <= 0) return 0;
      return (flash.timer / flash.duration) * FLASH_PEAK_ALPHA * (reduce ? FLASH_REDUCED_SCALE : 1);
    },
    reset(): void {
      flash.timer = 0;
    },
  };
  return flash;
}
