// src/render/decor.ts — OWNER: A5. Per-chapter planets and nebulae: spec table + canvas-free draw functions (§8.4).
import { darken, lighten, mixColor, rgba, seededRandom } from './sprites/draw';

const TAU = Math.PI * 2;

export interface PlanetSpec {
  type: 'planet';
  x: number; y: number; r: number;
  colors: readonly string[];   // light -> dark body colours; with bands=true they are the stripe colours
  bands: boolean;
  ring: string | null;
  atmosphere: string;
}
export interface NebulaSpec {
  type: 'nebula';
  x: number; y: number; w: number; h: number;
  colors: readonly string[];
  seed: number;
}
export type DecorSpec = PlanetSpec | NebulaSpec;

export const DECOR_DRIFT_PX_S = 6;
export const NEBULA_BLOBS_MIN = 6;
export const NEBULA_BLOBS_MAX = 10;
export const NEBULA_ALPHA_MIN = 0.08;
export const NEBULA_ALPHA_MAX = 0.15;
export const PLANET_RENDER_SCALE = 2;
const RING_TILT = -0.35;
const RING_SQUASH = 0.28;
const RING_SCALE = 1.8;

/** Index 0..4 = chapters 1..5. Chapters > 5 reuse ((n-1) % 5) + 1. */
export const CHAPTER_DECOR: readonly (readonly DecorSpec[])[] = [
  [
    { type: 'nebula', x: 330, y: 300, w: 760, h: 520, colors: ['#7B4BD8', '#C04BD8', '#3B5BD8'], seed: 11 },
    { type: 'planet', x: 1020, y: 200, r: 120, colors: ['#5AA0F0', '#2D62B8', '#173A78'], bands: false, ring: null, atmosphere: '#7FC8FF' },
  ],
  [
    { type: 'nebula', x: 900, y: 280, w: 820, h: 520, colors: ['#B5651D', '#8A4A2A', '#D9A066'], seed: 23 },
    { type: 'planet', x: 250, y: 430, r: 66, colors: ['#D8B48A', '#9A7248', '#5E4128'], bands: false, ring: '#E8D2A8', atmosphere: '#E8C890' },
  ],
  [
    { type: 'nebula', x: 280, y: 360, w: 700, h: 520, colors: ['#C0562E', '#8E2F6E'], seed: 37 },
    { type: 'planet', x: 960, y: 300, r: 200, colors: ['#F0B070', '#D07840', '#A8482A', '#7A2E1E'], bands: true, ring: '#F2D2A0', atmosphere: '#FFB070' },
  ],
  [
    { type: 'nebula', x: 640, y: 380, w: 900, h: 560, colors: ['#2E86C1', '#48C9B0', '#5B6EE0'], seed: 41 },
    { type: 'planet', x: 320, y: 240, r: 110, colors: ['#E8F4FF', '#A8D0F0', '#6FA0D0'], bands: false, ring: null, atmosphere: '#CFE9FF' },
    { type: 'planet', x: 1010, y: 450, r: 54, colors: ['#D8ECFF', '#8FB8E0', '#5A86B8'], bands: false, ring: null, atmosphere: '#CFE9FF' },
  ],
  [
    { type: 'nebula', x: 360, y: 360, w: 820, h: 600, colors: ['#B3202A', '#FF6B5B', '#7A1020'], seed: 53 },
    { type: 'planet', x: 960, y: 280, r: 170, colors: ['#8A2424', '#4A1010', '#220505'], bands: false, ring: null, atmosphere: '#FF4A3A' },
  ],
];

export function decorFor(chapter: number): readonly DecorSpec[] {
  const idx = (((Math.floor(chapter) - 1) % CHAPTER_DECOR.length) + CHAPTER_DECOR.length) % CHAPTER_DECOR.length;
  return CHAPTER_DECOR[idx];
}

/** Canvas size in logical px for a spec (planets include atmosphere and ring margins). */
export function decorSize(spec: DecorSpec): { w: number; h: number } {
  if (spec.type === 'nebula') return { w: spec.w, h: spec.h };
  const m = spec.ring ? spec.r * RING_SCALE : spec.r * 1.25;
  return { w: Math.ceil(m * 2), h: Math.ceil(m * 2) };
}

export function drawNebula(ctx: CanvasRenderingContext2D, spec: NebulaSpec): void {
  const rnd = seededRandom(spec.seed);
  const blobs = NEBULA_BLOBS_MIN + Math.floor(rnd() * (NEBULA_BLOBS_MAX - NEBULA_BLOBS_MIN + 1));
  for (let i = 0; i < blobs; i++) {
    const x = spec.w * (0.2 + rnd() * 0.6);
    const y = spec.h * (0.2 + rnd() * 0.6);
    const r = spec.w * (0.14 + rnd() * 0.16);
    const color = spec.colors[Math.floor(rnd() * spec.colors.length)];
    const a = NEBULA_ALPHA_MIN + rnd() * (NEBULA_ALPHA_MAX - NEBULA_ALPHA_MIN);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(0.6, rgba(color, a * 0.5));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function ringPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, from: number, to: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.6, r * 1.6 * RING_SQUASH, RING_TILT, from, to);
}

export function drawPlanet(ctx: CanvasRenderingContext2D, spec: PlanetSpec): void {
  const { w, h } = decorSize(spec);
  const cx = w / 2;
  const cy = h / 2;
  const r = spec.r;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.25);
  halo.addColorStop(0, rgba(spec.atmosphere, 0.35));
  halo.addColorStop(1, rgba(spec.atmosphere, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  if (spec.ring) {
    ringPath(ctx, cx, cy, r, Math.PI, TAU);
    ctx.strokeStyle = rgba(spec.ring, 0.7);
    ctx.lineWidth = r * 0.22;
    ctx.stroke();
  }
  const body = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
  const last = spec.colors.length - 1;
  spec.colors.forEach((c, i) => body.addColorStop(last === 0 ? 0 : i / last, c));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = body;
  ctx.fill();
  if (spec.bands) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    for (let i = 0; i < 9; i++) {
      const y = cy - r + (i + 0.5) * ((r * 2) / 9);
      ctx.fillStyle = rgba(i % 2 ? lighten(spec.colors[0], 0.2) : darken(spec.colors[last], 0.1), 0.22);
      ctx.fillRect(cx - r, y - r * 0.05, r * 2, r * 0.1 + (i % 3) * 3);
    }
    ctx.restore();
  }
  const shade = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.4, cx, cy, r * 1.1);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, rgba(mixColor(spec.colors[last], '#000000', 0.5), 0.55));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = shade;
  ctx.fill();
  if (spec.ring) {
    ringPath(ctx, cx, cy, r, 0, Math.PI);
    ctx.strokeStyle = rgba(spec.ring, 0.7);
    ctx.lineWidth = r * 0.22;
    ctx.stroke();
  }
}
