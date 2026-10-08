// src/render/background.ts — OWNER: H5 (was A5). Chapter gradient, 3-layer starfield, decor, palette crossfade and warp streaks (§8.4).
import { HENPOCALYPSE_CHAPTERS } from '../sim/chapters2';
import { PHASE_TIME, WORLD_H, WORLD_W } from '../sim/tuning/core';
import { drawStormStrike } from './background-storm';
import { DECOR_DRIFT_PX_S, decorFor, decorSize, drawNebula, drawPlanet, PLANET_RENDER_SCALE, type DecorSpec } from './decor';
import { drawHenpoDecor } from './decor-henpo';
import { lighten, mixColor, seededRandom } from './sprites/draw';

const CLASSIC_PALETTES: readonly (readonly [string, string])[] = [
  ['#0B0B2B', '#2A1B5C'], ['#10202B', '#3B2A1A'], ['#2B0F2E', '#7A2E1E'], ['#061A33', '#1E4E79'], ['#1A0505', '#4A0E0E'],
];
/** Chapters 1–12: the five classic palettes, then chapters 6–12 from the HENPOCALYPSE chapter table. */
export const CHAPTER_PALETTES: readonly (readonly [string, string])[] = [
  ...CLASSIC_PALETTES, ...HENPOCALYPSE_CHAPTERS.map((c) => c.palette),
];
/** Palette index of chapter 10 (Thunderhead Roost): lightning strikes. */
export const STORM_PALETTE_INDEX = 9;
export const STAR_LAYERS = [
  { count: 160, size: 1, speed: 15, alpha: 0.6 },
  { count: 90, size: 1.5, speed: 40, alpha: 0.8 },
  { count: 40, size: 2.5, speed: 90, alpha: 1 },
] as const;
export const STAR_TINT_FRACTION = 0.1;
export const STAR_TINT_BRIGHTEN = 0.55;
export const CROSSFADE_TIME = 2.0;
export const WARP_SPEED_MULT = 20;
export const WARP_EASE_TIME = 0.5;
export const WARP_STREAK_FACTOR = 0.05;
export const WARP_STREAK_MIN_MULT = 1.5;
const STAR_SEED = 0x51a2;
const FAR_LAYERS_BEFORE_DECOR = 1;

export function paletteIndex(chapter: number): number {
  const n = CHAPTER_PALETTES.length;
  return (((Math.floor(chapter) - 1) % n) + n) % n;
}
export function paletteFor(chapter: number): readonly [string, string] {
  return CHAPTER_PALETTES[paletteIndex(chapter)];
}

/** Star speed multiplier during the warp phase: ease in over 0.5 s, ease out over the last 0.5 s. */
export function warpFactor(phaseTimer: number, total: number = PHASE_TIME.warp): number {
  const edge = Math.max(0, Math.min(1, phaseTimer / WARP_EASE_TIME, (total - phaseTimer) / WARP_EASE_TIME));
  const smooth = edge * edge * (3 - 2 * edge);
  return 1 + (WARP_SPEED_MULT - 1) * smooth;
}

export interface StarLayer {
  readonly size: number;
  readonly speed: number;
  readonly alpha: number;
  readonly count: number;
  /** Stars at index >= tintStart use the chapter tint colour. */
  readonly tintStart: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
}

export function createStarfield(seed: number = STAR_SEED): StarLayer[] {
  const rnd = seededRandom(seed);
  return STAR_LAYERS.map((l) => {
    const x = new Float32Array(l.count);
    const y = new Float32Array(l.count);
    for (let i = 0; i < l.count; i++) { x[i] = rnd() * WORLD_W; y[i] = rnd() * WORLD_H; }
    const tinted = Math.round(l.count * STAR_TINT_FRACTION);
    return { size: l.size, speed: l.speed, alpha: l.alpha, count: l.count, tintStart: l.count - tinted, x, y };
  });
}

export function advanceStars(layers: readonly StarLayer[], dt: number, mult: number): void {
  for (const l of layers) {
    const step = l.speed * mult * dt;
    for (let i = 0; i < l.count; i++) {
      let y = l.y[i] + step;
      while (y >= WORLD_H) y -= WORLD_H;
      l.y[i] = y;
    }
  }
}

interface DecorItem { spec: DecorSpec; canvas: HTMLCanvasElement | null; x: number; y: number; w: number; h: number; spin: number; angle: number }
interface Look { chapter: number; top: string; bottom: string; tint: string; storm: boolean; decor: DecorItem[] }

export type CanvasFactory = (w: number, h: number) => HTMLCanvasElement | null;
const defaultFactory: CanvasFactory = (w, h) => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

function drawSpec(ctx: CanvasRenderingContext2D, spec: DecorSpec): void {
  if (spec.type === 'planet') drawPlanet(ctx, spec);
  else if (spec.type === 'nebula') drawNebula(ctx, spec);
  else drawHenpoDecor(ctx, spec);
}

function buildLook(chapter: number, makeCanvas: CanvasFactory): Look {
  const [top, bottom] = paletteFor(chapter);
  const decor: DecorItem[] = decorFor(chapter).map((spec) => {
    const size = decorSize(spec);
    const scale = spec.type === 'planet' ? PLANET_RENDER_SCALE : 1;
    const canvas = makeCanvas(size.w * scale, size.h * scale);
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawSpec(ctx, spec);
    }
    return { spec, canvas, x: spec.x, y: spec.y, w: size.w, h: size.h, spin: spec.type === 'gear' ? spec.spin : 0, angle: 0 };
  });
  return {
    chapter, top, bottom, tint: lighten(top, STAR_TINT_BRIGHTEN),
    storm: paletteIndex(chapter) === STORM_PALETTE_INDEX, decor,
  };
}

export interface Background {
  readonly stars: StarLayer[];
  readonly chapter: number;
  /** True while a palette crossfade is running. */
  readonly fading: boolean;
  /** Switch to a chapter's look. instant = no crossfade (new game, debug start). */
  setChapter(chapter: number, instant: boolean): void;
  update(dt: number, warpMult: number): void;
  /** reduceFlashes dims the lightning strikes of chapter 10. detail = false (low quality tier) skips the decor layers. */
  draw(ctx: CanvasRenderingContext2D, warpMult: number, reduceFlashes?: boolean, detail?: boolean): void;
}

export function createBackground(makeCanvas: CanvasFactory = defaultFactory): Background {
  const stars = createStarfield();
  let cur: Look = buildLook(1, makeCanvas);
  let prev: Look | null = null;
  let fade = 1;
  let clock = 0;
  let top = cur.top;
  let bottom = cur.bottom;
  let tint = cur.tint;
  let gradient: CanvasGradient | null = null;
  let gradientKey = '';

  function mix(): void {
    if (!prev || fade >= 1) { top = cur.top; bottom = cur.bottom; tint = cur.tint; return; }
    top = mixColor(prev.top, cur.top, fade);
    bottom = mixColor(prev.bottom, cur.bottom, fade);
    tint = mixColor(prev.tint, cur.tint, fade);
  }

  function animate(look: Look, dt: number): void {
    for (const d of look.decor) {
      d.y += DECOR_DRIFT_PX_S * dt;
      d.angle += d.spin * dt;
      if (d.y - d.h / 2 > WORLD_H + 40) d.y = -d.h / 2 - 40;
    }
  }

  function drawDecor(ctx: CanvasRenderingContext2D, look: Look, alpha: number): void {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    for (const d of look.decor) {
      if (!d.canvas) continue;
      if (d.spin === 0) {
        ctx.drawImage(d.canvas, d.x - d.w / 2, d.y - d.h / 2, d.w, d.h);
      } else {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle);
        ctx.drawImage(d.canvas, -d.w / 2, -d.h / 2, d.w, d.h);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** One path and one fill per colour group: a layer of 160 stars costs two fills, not 160 fillRect calls. */
  function drawStars(ctx: CanvasRenderingContext2D, from: number, to: number, mult: number): void {
    const streak = mult > WARP_STREAK_MIN_MULT;
    for (let li = from; li < to; li++) {
      const l = stars[li];
      const len = streak ? l.speed * mult * WARP_STREAK_FACTOR : 0;
      ctx.globalAlpha = l.alpha;
      ctx.beginPath();
      for (let i = 0; i < l.tintStart; i++) ctx.rect(l.x[i], l.y[i] - len, l.size, l.size + len);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      for (let i = l.tintStart; i < l.count; i++) ctx.rect(l.x[i], l.y[i] - len, l.size, l.size + len);
      ctx.fillStyle = tint;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    stars,
    get chapter(): number { return cur.chapter; },
    get fading(): boolean { return prev !== null && fade < 1; },
    setChapter(chapter: number, instant: boolean): void {
      if (prev === null && paletteIndex(chapter) === paletteIndex(cur.chapter)) { cur.chapter = chapter; return; }
      const next = buildLook(chapter, makeCanvas);
      if (instant) { cur = next; prev = null; fade = 1; } else { prev = cur; cur = next; fade = 0; }
      mix();
    },
    update(dt: number, warpMult: number): void {
      clock += dt;
      advanceStars(stars, dt, warpMult);
      animate(cur, dt);
      if (prev) {
        animate(prev, dt);
        fade += dt / CROSSFADE_TIME;
        if (fade >= 1) { fade = 1; prev = null; }
        mix();
      }
    },
    draw(ctx: CanvasRenderingContext2D, warpMult: number, reduceFlashes = false, detail = true): void {
      const key = top + bottom;
      if (!gradient || key !== gradientKey) {
        gradient = ctx.createLinearGradient(0, 0, 0, WORLD_H);
        gradient.addColorStop(0, top);
        gradient.addColorStop(1, bottom);
        gradientKey = key;
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      drawStars(ctx, 0, FAR_LAYERS_BEFORE_DECOR, warpMult);
      if (detail) {
        if (prev) drawDecor(ctx, prev, 1 - fade);
        drawDecor(ctx, cur, prev ? fade : 1);
      }
      if (cur.storm) drawStormStrike(ctx, clock, reduceFlashes);
      drawStars(ctx, FAR_LAYERS_BEFORE_DECOR, stars.length, warpMult);
    },
  };
}
