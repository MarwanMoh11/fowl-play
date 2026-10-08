// src/render/quality.ts — OWNER: B. Adaptive render quality (high / medium / low) from measured frame intervals. Internal to render.
import { POOL_CAPACITY } from './particles';

export type QualityTier = 'high' | 'medium' | 'low';
/** Worst to best, so stepping a tier down is index - 1. */
const ORDER: readonly QualityTier[] = ['low', 'medium', 'high'];

export interface TierSettings {
  /** Live particle budget; new particles are dropped beyond it. Gameplay sprites are never budgeted. */
  particleLimit: number;
  /** Radial glow behind the ship while overdriving (the speed streaks always draw). */
  glow: boolean;
  /** Decor layers behind the play field: planets, nebulae and gears. */
  decor: boolean;
}

export const TIER_SETTINGS: Readonly<Record<QualityTier, TierSettings>> = {
  high: { particleLimit: POOL_CAPACITY, glow: true, decor: true },
  medium: { particleLimit: 1200, glow: true, decor: true },
  low: { particleLimit: 500, glow: false, decor: false },
};

/** Tier a coarse-pointer (touch) device starts on; fine pointers start on high. */
export const COARSE_START_TIER: QualityTier = 'medium';
/** Length of one measurement window in seconds. */
export const WINDOW_S = 1;
/** A window whose mean frame interval is above this (about 50 fps) counts as too slow. */
export const DROP_ABOVE_S = 0.02;
/** A window below this (about 66 fps) counts as spare headroom. Set well under 60 Hz so 60 Hz screens never raise. */
export const RAISE_BELOW_S = 0.015;
/** Consecutive slow windows before dropping a tier. */
export const DROP_AFTER_WINDOWS = 2;
/** Consecutive spare windows before raising a tier (slower than dropping, so the tier does not flap). */
export const RAISE_AFTER_WINDOWS = 6;
/** Longer intervals (hidden tab, screen lock, one-off hitch) say nothing about render cost and are ignored. */
export const MAX_FRAME_S = 0.1;

export interface Quality {
  readonly tier: QualityTier;
  readonly settings: TierSettings;
  /** Feeds the frame interval passed to render(). Zero (paused) and gaps beyond MAX_FRAME_S are ignored. */
  observe(frameDt: number): void;
}

export function createQuality(start: QualityTier = 'high'): Quality {
  let idx = ORDER.indexOf(start);
  let winTime = 0;
  let winFrames = 0;
  let slow = 0;
  let spare = 0;
  return {
    get tier(): QualityTier { return ORDER[idx]; },
    get settings(): TierSettings { return TIER_SETTINGS[ORDER[idx]]; },
    observe(frameDt: number): void {
      if (!(frameDt > 0) || frameDt > MAX_FRAME_S) return;
      winTime += frameDt;
      winFrames += 1;
      if (winTime < WINDOW_S) return;
      const mean = winTime / winFrames;
      winTime = 0;
      winFrames = 0;
      if (mean > DROP_ABOVE_S) {
        spare = 0;
        slow += 1;
        if (slow >= DROP_AFTER_WINDOWS) { slow = 0; idx = Math.max(0, idx - 1); }
      } else if (mean < RAISE_BELOW_S) {
        slow = 0;
        spare += 1;
        if (spare >= RAISE_AFTER_WINDOWS) { spare = 0; idx = Math.min(ORDER.length - 1, idx + 1); }
      } else {
        slow = 0;
        spare = 0;
      }
    },
  };
}

/** True on touch-first devices. Guarded so non-browser environments (tests, workers) read as fine-pointer. */
export function isCoarsePointer(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** The quality controller of each world renderer, keyed by its canvas context, so the HUD can show the tier. */
const registry = new WeakMap<CanvasRenderingContext2D, Quality>();

export function bindQuality(ctx: CanvasRenderingContext2D, quality: Quality): void {
  registry.set(ctx, quality);
}

/** Current tier of the renderer drawing into ctx, or null when no renderer is bound to it. */
export function qualityTierOf(ctx: CanvasRenderingContext2D): QualityTier | null {
  return registry.get(ctx)?.tier ?? null;
}
