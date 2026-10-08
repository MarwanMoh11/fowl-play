// src/render/particles.ts — OWNER: A5. Preallocated particle pool (swap-remove), spawn helpers, update and draw (§8.5).
import type { SpriteApi, DrawOpts } from '../shared/contracts';
import { FONT_FAMILY } from './sprites/palette';

export const POOL_CAPACITY = 3000;
const TAU = Math.PI * 2;

export const PK = {
  feather: 0, spark: 1, debris: 2, ring: 3, puff: 4, splat: 5,
  sparkle: 6, muzzle: 7, text: 8, fireball: 9, yolk: 10, smoke: 11,
} as const;
export type ParticleKind = typeof PK[keyof typeof PK];

export const FEATHER = { rx: 2, ry: 4.5, speedMin: 60, speedMax: 220, gravity: 120, swayAmp: 40, swayFreq: 6, life: 1.2, fadeTime: 0.4, spin: 8 } as const;
export const SPARK = { speedMin: 120, speedMax: 320, lifeMin: 0.25, lifeMax: 0.45, width: 2, trail: 0.045 } as const;
export const DEBRIS = { speedMin: 80, speedMax: 260, gravity: 340, lifeMin: 0.5, lifeMax: 0.9, sizeMin: 3, sizeMax: 7 } as const;
export const SPLAT_LIFE = 1.5;
export const POPUP = { rise: 40, life: 0.8, fontSize: 18, outline: 4 } as const;
export const COLORS = {
  spark: '#FFE680', hot: '#FFB02E', white: '#FFFFFF', outline: '#1B1030', yolk: '#FFC21A',
  rock: '#6B5B53', rockLight: '#9A8678', cyan: '#7FE7FF', green: '#39FF88', fire: '#FF8A1E', fireCore: '#FFE066',
} as const;

export interface Particle {
  kind: ParticleKind;
  x: number; y: number; vx: number; vy: number;
  g: number;            // gravity px/s^2
  life: number; maxLife: number;
  size: number; size2: number;
  rot: number; vrot: number;
  seed: number;
  color: string;
  text: string;
}

export interface ParticlePool { items: Particle[]; count: number; readonly capacity: number }

function blank(): Particle {
  return { kind: PK.spark, x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 0, maxLife: 1, size: 1, size2: 1, rot: 0, vrot: 0, seed: 0, color: '#FFFFFF', text: '' };
}

export function createPool(capacity: number = POOL_CAPACITY): ParticlePool {
  const items: Particle[] = new Array<Particle>(capacity);
  for (let i = 0; i < capacity; i++) items[i] = blank();
  return { items, count: 0, capacity };
}

// Local deterministic PRNG so effects are reproducible in tests (render never uses sim rng).
let rngState = 0x9e3779b9;
export function fxRand(): number {
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function fxSeed(s: number): void {
  rngState = s >>> 0;
}
const range = (a: number, b: number): number => a + (b - a) * fxRand();

/** Claims a slot; returns null when the pool is full (new particles are dropped, never over capacity). */
export function alloc(pool: ParticlePool, kind: ParticleKind, x: number, y: number, life: number, color: string): Particle | null {
  if (pool.count >= pool.capacity) return null;
  const p = pool.items[pool.count++];
  p.kind = kind; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.g = 0;
  p.life = life; p.maxLife = life; p.size = 1; p.size2 = 1; p.rot = 0; p.vrot = 0;
  p.seed = fxRand() * 100; p.color = color; p.text = '';
  return p;
}

export function clearPool(pool: ParticlePool): void {
  pool.count = 0;
}

export function countKind(pool: ParticlePool, kind: ParticleKind): number {
  let n = 0;
  for (let i = 0; i < pool.count; i++) if (pool.items[i].kind === kind) n++;
  return n;
}

export function spawnFeathers(pool: ParticlePool, x: number, y: number, n: number, color: string, spread = 0): void {
  for (let i = 0; i < n; i++) {
    const a = fxRand() * TAU;
    const off = spread * Math.sqrt(fxRand());
    const p = alloc(pool, PK.feather, x + Math.cos(a) * off, y + Math.sin(a) * off, FEATHER.life, color);
    if (!p) return;
    const sp = range(FEATHER.speedMin, FEATHER.speedMax);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 40; p.g = FEATHER.gravity;
    p.rot = fxRand() * TAU; p.vrot = (fxRand() - 0.5) * FEATHER.spin;
  }
}

export function spawnSparks(pool: ParticlePool, x: number, y: number, n: number, color: string = COLORS.spark, speedScale = 1): void {
  for (let i = 0; i < n; i++) {
    const a = fxRand() * TAU;
    const sp = range(SPARK.speedMin, SPARK.speedMax) * speedScale;
    const p = alloc(pool, PK.spark, x, y, range(SPARK.lifeMin, SPARK.lifeMax), color);
    if (!p) return;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
  }
}

export function spawnDebris(pool: ParticlePool, x: number, y: number, n: number, color: string, spread = 0): void {
  for (let i = 0; i < n; i++) {
    const a = fxRand() * TAU;
    const off = spread * Math.sqrt(fxRand());
    const p = alloc(pool, PK.debris, x + Math.cos(a) * off, y + Math.sin(a) * off, range(DEBRIS.lifeMin, DEBRIS.lifeMax), color);
    if (!p) return;
    const sp = range(DEBRIS.speedMin, DEBRIS.speedMax);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 60; p.g = DEBRIS.gravity;
    p.size = range(DEBRIS.sizeMin, DEBRIS.sizeMax); p.rot = fxRand() * TAU; p.vrot = (fxRand() - 0.5) * 12;
  }
}

/** fx_puff sprite scaling s0 -> s1 while fading from alpha (stored in `seed`) to 0. */
export function spawnPuff(pool: ParticlePool, x: number, y: number, s0: number, s1: number, life: number, alpha = 0.6, vy = 0): void {
  const p = alloc(pool, PK.puff, x, y, life, COLORS.white);
  if (!p) return;
  p.size = s0; p.size2 = s1; p.seed = alpha; p.vy = vy;
}

export function spawnRing(pool: ParticlePool, x: number, y: number, r0: number, r1: number, life: number, color: string, width = 5): void {
  const p = alloc(pool, PK.ring, x, y, life, color);
  if (!p) return;
  p.size = r0; p.size2 = r1; p.rot = width;
}

export function spawnFireball(pool: ParticlePool, x: number, y: number, r0: number, r1: number, life: number): void {
  const p = alloc(pool, PK.fireball, x, y, life, COLORS.fire);
  if (!p) return;
  p.size = r0; p.size2 = r1;
}

export function spawnSparkles(pool: ParticlePool, x: number, y: number, n: number, color: string, speed = 70, life = 0.6): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + fxRand() * 0.4;
    const p = alloc(pool, PK.sparkle, x, y, life * range(0.8, 1.2), color);
    if (!p) return;
    const sp = speed * range(0.5, 1);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 20; p.size = range(2.5, 4);
  }
}

/** Ring of sparkles that fly inwards and reach (x, y) when they expire. */
export function spawnConverging(pool: ParticlePool, x: number, y: number, n: number, radius: number, life: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const p = alloc(pool, PK.sparkle, x + Math.cos(a) * radius, y + Math.sin(a) * radius, life, color);
    if (!p) return;
    p.vx = (-Math.cos(a) * radius) / life; p.vy = (-Math.sin(a) * radius) / life; p.size = 3.2;
  }
}

export function spawnMuzzle(pool: ParticlePool, x: number, y: number, color: string, life: number, radius: number): void {
  const p = alloc(pool, PK.muzzle, x, y, life, color);
  if (p) p.size = radius;
}

/** Floating text. size scales POPUP.fontSize; the outline stays dark so text reads on any background. */
export function spawnText(pool: ParticlePool, x: number, y: number, text: string, size: number, color: string, life: number = POPUP.life): void {
  const p = alloc(pool, PK.text, x, y, life, color);
  if (!p) return;
  p.text = text; p.size = size; p.vy = -POPUP.rise / life;
}

export function spawnPopup(pool: ParticlePool, x: number, y: number, text: string): void {
  spawnText(pool, x, y, text, 1, COLORS.white);
}

/** Grey smoke puff (fx_smoke) that grows, rises slightly and fades. */
export function spawnSmoke(pool: ParticlePool, x: number, y: number, s0: number, s1: number, life: number, alpha = 0.6, vy = -30): void {
  const p = alloc(pool, PK.smoke, x, y, life, COLORS.white);
  if (!p) return;
  p.size = s0; p.size2 = s1; p.seed = alpha; p.vy = vy;
}

export function spawnSplat(pool: ParticlePool, x: number, y: number): void {
  alloc(pool, PK.splat, x, y, SPLAT_LIFE, COLORS.white);
}

export function spawnYolk(pool: ParticlePool, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const p = alloc(pool, PK.yolk, x, y, range(0.35, 0.6), COLORS.yolk);
    if (!p) return;
    p.vx = range(-90, 90); p.vy = range(-170, -70); p.g = 600; p.size = range(1.8, 3);
  }
}

export function updateParticles(pool: ParticlePool, dt: number): void {
  if (dt <= 0) return;
  const items = pool.items;
  let i = 0;
  while (i < pool.count) {
    const p = items[i];
    p.life -= dt;
    if (p.life <= 0) {
      pool.count--;
      items[i] = items[pool.count];
      items[pool.count] = p;
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === PK.feather) p.x += Math.sin((FEATHER.life - p.life) * FEATHER.swayFreq + p.seed) * FEATHER.swayAmp * dt;
    if (p.kind === PK.feather || p.kind === PK.debris) p.rot += p.vrot * dt;
    i++;
  }
}

const drawOpts: DrawOpts = { alpha: 1, scale: 1 };

function setAlpha(ctx: CanvasRenderingContext2D, a: number): void {
  ctx.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a;
}

/** Ground layer = egg splat decals (drawn under pickups and enemies). Top layer = everything else. */
export function drawParticles(ctx: CanvasRenderingContext2D, pool: ParticlePool, sprites: SpriteApi, ground: boolean): void {
  const items = pool.items;
  let fill = '';
  let stroke = '';
  for (let i = 0; i < pool.count; i++) {
    const p = items[i];
    const isGround = p.kind === PK.splat;
    if (isGround !== ground) continue;
    const t = 1 - p.life / p.maxLife;
    switch (p.kind) {
      case PK.feather: {
        setAlpha(ctx, p.life < FEATHER.fadeTime ? p.life / FEATHER.fadeTime : 1);
        if (fill !== p.color) { ctx.fillStyle = p.color; fill = p.color; }
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, FEATHER.rx, FEATHER.ry, p.rot, 0, TAU);
        ctx.fill();
        break;
      }
      case PK.spark: {
        setAlpha(ctx, 1 - t);
        if (stroke !== p.color) { ctx.strokeStyle = p.color; stroke = p.color; }
        ctx.lineWidth = SPARK.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * SPARK.trail, p.y - p.vy * SPARK.trail);
        ctx.stroke();
        break;
      }
      case PK.debris: {
        setAlpha(ctx, p.life < 0.2 ? p.life / 0.2 : 1);
        if (fill !== p.color) { ctx.fillStyle = p.color; fill = p.color; }
        const c = Math.cos(p.rot) * p.size;
        const s = Math.sin(p.rot) * p.size;
        ctx.beginPath();
        ctx.moveTo(p.x + c, p.y + s);
        ctx.lineTo(p.x - s, p.y + c);
        ctx.lineTo(p.x - c * 0.7, p.y - s * 0.7);
        ctx.lineTo(p.x + s * 0.8, p.y - c * 0.8);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case PK.ring: {
        const e = 1 - (1 - t) * (1 - t);
        setAlpha(ctx, 1 - t);
        if (stroke !== p.color) { ctx.strokeStyle = p.color; stroke = p.color; }
        ctx.lineWidth = Math.max(1, p.rot * (1 - t));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (p.size2 - p.size) * e, 0, TAU);
        ctx.stroke();
        break;
      }
      case PK.fireball: {
        const r = p.size + (p.size2 - p.size) * Math.sqrt(t);
        setAlpha(ctx, (1 - t) * 0.9);
        ctx.fillStyle = COLORS.fire; fill = COLORS.fire;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = COLORS.fireCore; fill = COLORS.fireCore;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.55 * (1 - t), 0, TAU); ctx.fill();
        break;
      }
      case PK.sparkle: {
        const r = p.size * (1 - t * 0.6);
        setAlpha(ctx, 0.35 * (1 - t));
        if (fill !== p.color) { ctx.fillStyle = p.color; fill = p.color; }
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.2, 0, TAU); ctx.fill();
        setAlpha(ctx, 1 - t * 0.7);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        break;
      }
      case PK.muzzle: {
        const r = p.size * (1 - t * 0.5);
        setAlpha(ctx, 0.5 * (1 - t));
        if (fill !== p.color) { ctx.fillStyle = p.color; fill = p.color; }
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.6, 0, TAU); ctx.fill();
        setAlpha(ctx, 1 - t);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = COLORS.white; fill = COLORS.white;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, TAU); ctx.fill();
        break;
      }
      case PK.yolk: {
        setAlpha(ctx, 1 - t * 0.5);
        if (fill !== p.color) { ctx.fillStyle = p.color; fill = p.color; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        break;
      }
      case PK.puff: {
        ctx.globalAlpha = 1;
        drawOpts.scale = p.size + (p.size2 - p.size) * t;
        drawOpts.alpha = p.seed * (1 - t);
        sprites.draw(ctx, 'fx_puff', p.x, p.y, drawOpts);
        break;
      }
      case PK.smoke: {
        ctx.globalAlpha = 1;
        drawOpts.scale = p.size + (p.size2 - p.size) * t;
        drawOpts.alpha = p.seed * (1 - t);
        sprites.draw(ctx, 'fx_smoke', p.x, p.y, drawOpts);
        break;
      }
      case PK.splat: {
        ctx.globalAlpha = 1;
        drawOpts.scale = 1;
        drawOpts.alpha = Math.min(1, p.life / p.maxLife * 1.4);
        sprites.draw(ctx, 'fx_egg_splat', p.x, p.y, drawOpts);
        break;
      }
      case PK.text: {
        setAlpha(ctx, t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
        ctx.font = `bold ${POPUP.fontSize * p.size}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = POPUP.outline;
        ctx.strokeStyle = COLORS.outline; stroke = COLORS.outline;
        ctx.strokeText(p.text, p.x, p.y);
        if (fill !== p.color) { ctx.fillStyle = p.color; fill = p.color; }
        ctx.fillText(p.text, p.x, p.y);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}
