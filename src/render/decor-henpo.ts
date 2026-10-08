// src/render/decor-henpo.ts — OWNER: H5. Chapters 6–12 decor: nests, sun, gears, ripples, accretion disk, crown, gold dust.
// Every spec is drawn once into a canvas of henpoDecorSize(spec), centred on (x, y) like the classic decor.
import { darken, lighten, rgba, seededRandom, TAU } from './sprites/draw';

export interface NestSpec { type: 'nest'; x: number; y: number; w: number; color: string; seed: number }
export interface SunSpec { type: 'sun'; x: number; y: number; r: number; core: string; corona: string }
/** spin is radians per second; the renderer turns the canvas each frame. */
export interface GearSpec { type: 'gear'; x: number; y: number; r: number; teeth: number; color: string; spin: number }
export interface RippleSpec { type: 'ripples'; x: number; y: number; r: number; color: string; rings: number }
export interface DiskSpec { type: 'disk'; x: number; y: number; r: number; colors: readonly string[]; seed: number }
export interface CrownSpec { type: 'crown'; x: number; y: number; w: number; color: string; seed: number }
export interface DustSpec { type: 'dust'; x: number; y: number; w: number; h: number; color: string; count: number; seed: number }
export type HenpoDecorSpec = NestSpec | SunSpec | GearSpec | RippleSpec | DiskSpec | CrownSpec | DustSpec;

export function henpoDecorSize(spec: HenpoDecorSpec): { w: number; h: number } {
  switch (spec.type) {
    case 'nest': return { w: spec.w, h: spec.w * 0.6 };
    case 'sun': { const side = Math.ceil(spec.r * 3.8); return { w: side, h: side }; }
    case 'gear': { const side = Math.ceil(spec.r * 2.5); return { w: side, h: side }; }
    case 'ripples': { const side = Math.ceil(spec.r * 2.2); return { w: side, h: side }; }
    case 'disk': { const side = Math.ceil(spec.r * 2.6); return { w: side, h: side }; }
    case 'crown': return { w: spec.w, h: Math.ceil(spec.w * 0.55) };
    case 'dust': return { w: spec.w, h: spec.h };
  }
}

export function drawHenpoDecor(ctx: CanvasRenderingContext2D, spec: HenpoDecorSpec): void {
  switch (spec.type) {
    case 'nest': drawNest(ctx, spec); break;
    case 'sun': drawSun(ctx, spec); break;
    case 'gear': drawGear(ctx, spec); break;
    case 'ripples': drawRipples(ctx, spec); break;
    case 'disk': drawDisk(ctx, spec); break;
    case 'crown': drawCrown(ctx, spec); break;
    case 'dust': drawDust(ctx, spec); break;
  }
}

function drawNest(ctx: CanvasRenderingContext2D, s: NestSpec): void {
  const { w, h } = henpoDecorSize(s);
  const rnd = seededRandom(s.seed);
  const cx = w / 2;
  const cy = h * 0.55;
  ctx.fillStyle = rgba(darken(s.color, 0.45), 0.5);
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.34, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(lighten(s.color, 0.3), 0.5);
  for (let i = 0; i < 24; i++) {
    const a = rnd() * TAU;
    const x = cx + Math.cos(a) * w * 0.4 * (0.7 + 0.3 * rnd());
    const y = cy + Math.sin(a) * h * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10 * (rnd() - 0.5) + 8, y - 4);
    ctx.stroke();
  }
  for (const [ex, ey] of [[-16, -6], [8, -9], [-2, -17]]) {
    ctx.fillStyle = rgba('#FFF3D6', 0.55);
    ctx.beginPath();
    ctx.ellipse(cx + ex, cy + ey, 6, 8, 0, 0, TAU);
    ctx.fill();
  }
}

function drawSun(ctx: CanvasRenderingContext2D, s: SunSpec): void {
  const { w, h } = henpoDecorSize(s);
  const cx = w / 2;
  const cy = h / 2;
  const corona = ctx.createRadialGradient(cx, cy, s.r * 0.9, cx, cy, w / 2);
  corona.addColorStop(0, rgba(s.corona, 0.55));
  corona.addColorStop(0.45, rgba(s.corona, 0.18));
  corona.addColorStop(1, rgba(s.corona, 0));
  ctx.fillStyle = corona;
  ctx.fillRect(0, 0, w, h);
  const disc = ctx.createRadialGradient(cx - s.r * 0.25, cy - s.r * 0.25, s.r * 0.1, cx, cy, s.r);
  disc.addColorStop(0, s.core);
  disc.addColorStop(1, s.corona);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, s.r, 0, TAU);
  ctx.fill();
  // Heat-haze bands rolling off the disc.
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(s.corona, 0.16);
  for (let k = 0; k < 4; k++) {
    const y = cy + s.r * (1.15 + k * 0.2);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 24) {
      const yy = y + Math.sin(x * 0.05 + k * 1.7) * 4;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function gearPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, teeth: number): void {
  const steps = teeth * 4;
  ctx.beginPath();
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const rr = i % 4 < 2 ? r : r * 0.82;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawGear(ctx: CanvasRenderingContext2D, s: GearSpec): void {
  const { w, h } = henpoDecorSize(s);
  const cx = w / 2;
  const cy = h / 2;
  gearPath(ctx, cx, cy, s.r, s.teeth);
  ctx.fillStyle = rgba(s.color, 0.28);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(lighten(s.color, 0.35), 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, s.r * 0.62, 0, TAU);
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * s.r * 0.2, cy + Math.sin(a) * s.r * 0.2);
    ctx.lineTo(cx + Math.cos(a) * s.r * 0.62, cy + Math.sin(a) * s.r * 0.62);
    ctx.stroke();
  }
  // Punch the axle hole so the gear reads as a ring when it turns.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, s.r * 0.2, 0, TAU);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function drawRipples(ctx: CanvasRenderingContext2D, s: RippleSpec): void {
  const { w, h } = henpoDecorSize(s);
  const cx = w / 2;
  const cy = h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.r);
  glow.addColorStop(0, rgba(s.color, 0.35));
  glow.addColorStop(1, rgba(s.color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 2.5;
  for (let i = 0; i < s.rings; i++) {
    const rr = s.r * (0.35 + (i * 0.65) / s.rings);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * 0.55, 0, 0, TAU);
    ctx.strokeStyle = rgba(s.color, 0.2 + 0.4 * (1 - i / s.rings));
    ctx.stroke();
  }
}

function drawDisk(ctx: CanvasRenderingContext2D, s: DiskSpec): void {
  const { w, h } = henpoDecorSize(s);
  const cx = w / 2;
  const cy = h / 2;
  const R = s.r;
  const rnd = seededRandom(s.seed);
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const u = k / 60;
      const rr = R * (0.42 + 0.58 * u);
      const a = arm * (TAU / 3) + u * 4.2;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.36;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(s.colors[arm % s.colors.length], 0.45);
    ctx.lineWidth = 6 - arm;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.4, 0, TAU);
  ctx.strokeStyle = rgba('#FFF3D6', 0.7);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.36, 0, TAU);
  ctx.fillStyle = rgba('#000000', 0.95);
  ctx.fill();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 8 + rnd() * 18;
    ctx.strokeStyle = rgba('#FFFFFF', 0.25 + rnd() * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
}

const CROWN_PROFILE: readonly (readonly [number, number])[] = [
  [0.18, 0.72], [0.22, 0.38], [0.34, 0.6], [0.5, 0.22], [0.66, 0.6], [0.78, 0.38], [0.82, 0.72],
];

function drawCrown(ctx: CanvasRenderingContext2D, s: CrownSpec): void {
  const { w, h } = henpoDecorSize(s);
  const rnd = seededRandom(s.seed);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba('#FFFFFF', 0.15 + rnd() * 0.5);
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.2, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = rgba(s.color, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  CROWN_PROFILE.forEach(([fx, fy], i) => {
    if (i === 0) ctx.moveTo(w * fx, h * fy); else ctx.lineTo(w * fx, h * fy);
  });
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.72);
  ctx.lineTo(w * 0.82, h * 0.72);
  ctx.stroke();
  for (const [fx, fy] of CROWN_PROFILE) {
    ctx.fillStyle = rgba(s.color, 0.95);
    ctx.beginPath();
    ctx.arc(w * fx, h * fy, 3.2, 0, TAU);
    ctx.fill();
  }
}

function drawDust(ctx: CanvasRenderingContext2D, s: DustSpec): void {
  const { w, h } = henpoDecorSize(s);
  const rnd = seededRandom(s.seed);
  for (let i = 0; i < s.count; i++) {
    ctx.fillStyle = rgba(s.color, 0.2 + rnd() * 0.6);
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 0.5 + rnd() * 1.6, 0, TAU);
    ctx.fill();
  }
}
