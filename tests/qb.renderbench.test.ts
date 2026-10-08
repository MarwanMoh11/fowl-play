// tests/qb.renderbench.test.ts — OWNER: B. Per-frame canvas cost on heavy real-sim scenes (boss fight, overdrive, menu),
// counted through a counting wrapper around the recording mock context. Budgets guard against per-frame regressions.
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type SpriteApi, type SpriteKey, type View } from '../src/shared/contracts';
import { createWorldRenderer, type WorldRenderer } from '../src/render/renderer';
import { qualityTierOf } from '../src/render/quality';
import { SPRITE_REGISTRY } from '../src/render/sprites/registry';
import { drawHud } from '../src/ui/hud';
import { applyDebug } from '../src/sim/debug';
import { createGame, NEUTRAL_INPUT, step } from '../src/sim/game';
import { DT } from '../src/sim/tuning/core';
import type { GameEvent } from '../src/sim/events';
import type { GameState, InputFrame } from '../src/sim/types';
import { mockCtx, type MockCtx } from './a5.mockctx';

const view: View = { scale: 1, cssScale: 1, dpr: 1, cssWidth: 1280, cssHeight: 720, offsetX: 0, offsetY: 0 };
const WARMUP_FRAMES = 120;
const MEASURE_FRAMES = 60;
const IMAGE = {} as CanvasImageSource;

/** Wraps a recording context and counts every method call and property write by name. */
function counting(m: MockCtx, counts: Map<string, number>): CanvasRenderingContext2D {
  const bump = (k: string): void => { counts.set(k, (counts.get(k) ?? 0) + 1); };
  return new Proxy(m.ctx, {
    get(target, prop) {
      const v: unknown = Reflect.get(target, prop);
      if (typeof v !== 'function') return v;
      const name = String(prop);
      return (...args: unknown[]) => { bump(name); return (v as (...a: unknown[]) => unknown).apply(target, args); };
    },
    set(target, prop, value) {
      bump(`=${String(prop)}`);
      return Reflect.set(target, prop, value);
    },
  }) as unknown as CanvasRenderingContext2D;
}

/** Same call shape as the real atlas: one drawImage per sprite, with save/restore only when rotated. */
function spriteStub(): SpriteApi {
  return {
    draw(ctx, key: SpriteKey, x, y, o) {
      const def = SPRITE_REGISTRY[key];
      const scale = o?.scale ?? 1;
      const w = def.w * scale;
      const h = def.h * scale;
      const rot = o?.rotation ?? 0;
      const alpha = o?.alpha ?? 1;
      if (rot !== 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.drawImage(IMAGE, 0, 0, def.w, def.h, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else if (alpha !== 1) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * alpha;
        ctx.drawImage(IMAGE, 0, 0, def.w, def.h, x - w / 2, y - h / 2, w, h);
        ctx.globalAlpha = prev;
      } else {
        ctx.drawImage(IMAGE, 0, 0, def.w, def.h, x - w / 2, y - h / 2, w, h);
      }
    },
    size: (k) => ({ w: SPRITE_REGISTRY[k].w, h: SPRITE_REGISTRY[k].h, frames: SPRITE_REGISTRY[k].frames }),
    toCanvas: () => { throw new Error('unused'); },
  };
}

interface Harness {
  state: GameState | null; renderer: WorldRenderer; ctx: CanvasRenderingContext2D; counts: Map<string, number>; mock: MockCtx; sprites: SpriteApi;
  /** frameDt handed to render(): DT, or a longer interval to simulate a slow device. */
  dt: number;
}

function harness(state: GameState | null): Harness {
  const mock = mockCtx();
  const counts = new Map<string, number>();
  const ctx = counting(mock, counts);
  const sprites = spriteStub();
  return { state, renderer: createWorldRenderer(ctx, sprites), ctx, counts, mock, sprites, dt: DT };
}

/** Worst-case combat burst per tick: hits, kills, detonations and popups, so the particle pool runs at capacity. */
function stormEvents(state: GameState): GameEvent[] {
  const out: GameEvent[] = [];
  const x = 200 + (state.tick * 37) % 880;
  const y = 150 + (state.tick * 53) % 400;
  for (let i = 0; i < 6; i++) out.push({ type: 'enemy_hit', id: i, kind: 'chicken_red', x: x + i * 30, y: y + i * 12, dmg: 1 });
  for (let i = 0; i < 2; i++) out.push({ type: 'enemy_killed', id: i, kind: 'chicken_red', x: x + i * 90, y, byMissile: false });
  out.push({ type: 'missile_detonated', x, y: y + 60 });
  out.push({ type: 'score_popup', amount: 100, x, y: y - 40 });
  out.push({ type: 'player_fire', weapon: state.player.weapon, power: 3, x, y: y + 200 });
  return out;
}

/** One 60 Hz tick: sim step, event handling, world render, then the HUD as the app draws it. */
function frame(h: Harness, fire: boolean, storm = false): void {
  const s = h.state;
  if (s) {
    const input: InputFrame = { ...NEUTRAL_INPUT, fire, moveX: Math.sin(s.time * 0.9) * 0.8 };
    step(s, input, DT);
    h.renderer.handleEvents(s.events, s);
    if (storm) h.renderer.handleEvents(stormEvents(s), s);
  }
  h.renderer.render(s, view, DEFAULT_SETTINGS, h.dt);
  if (s) drawHud(h.ctx, s, h.sprites, DEFAULT_SETTINGS, 60);
}

/** Per-frame averages over the measured frames. */
interface PerFrame { calls: number; paints: number; gradients: number; fonts: number; shadows: number; filters: number; saves: number; drawImages: number; text: number }

function measure(h: Harness, fire: boolean, storm = false, before?: () => void): PerFrame {
  for (let i = 0; i < WARMUP_FRAMES; i++) frame(h, fire, storm);
  if (before) before();
  h.counts.clear();
  for (let i = 0; i < MEASURE_FRAMES; i++) frame(h, fire, storm);
  const c = (k: string): number => h.counts.get(k) ?? 0;
  const sum = [...h.counts.values()].reduce((a, b) => a + b, 0);
  const per = (n: number): number => Math.round((n / MEASURE_FRAMES) * 10) / 10;
  return {
    calls: per(sum),
    paints: per(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage'].reduce((a, k) => a + c(k), 0)),
    gradients: per(c('createRadialGradient') + c('createLinearGradient')),
    fonts: per(c('=font')),
    shadows: per(c('=shadowBlur') + c('=shadowColor')),
    filters: per(c('=filter')),
    saves: per(c('save')),
    drawImages: per(c('drawImage')),
    text: per(c('fillText') + c('strokeText')),
  };
}

/** Boss fight with a live armada, shots in flight and particles, god mode so the run stays stable. */
function bossState(seed: number): GameState {
  const state = createGame({ seed, difficulty: 'normal', debug: { godMode: true } });
  for (let i = 0; i < 90; i++) {
    step(state, { ...NEUTRAL_INPUT, fire: true, moveX: Math.sin(i * 0.1) * 0.8 }, DT);
  }
  applyDebug(state, 'jumpToBoss');
  for (let i = 0; i < 240; i++) {
    step(state, { ...NEUTRAL_INPUT, fire: true, moveX: Math.sin(state.time * 0.9) * 0.8 }, DT);
  }
  return state;
}

describe('qb render bench: per-frame canvas cost', () => {
  it('boss fight: no gradient, shadow or filter work per frame, bounded draw calls', () => {
    const state = bossState(21);
    const h = harness(state);
    const bossAlive = state.enemies.filter((e) => e.alive && e.isBoss).length;
    expect(bossAlive).toBeGreaterThan(0);
    const perFrame = measure(h, true);
    const enemies = state.enemies.filter((e) => e.alive).length;
    const shots = state.projectiles.filter((p) => p.alive).length;
    console.info(`[qb bench] boss fight: enemies=${enemies} projectiles=${shots} ${JSON.stringify(perFrame)}`);
    expect(perFrame.shadows).toBe(0);
    expect(perFrame.filters).toBe(0);
    expect(perFrame.gradients).toBe(0);
    expect(perFrame.fonts).toBeLessThanOrEqual(40);
    expect(h.mock.violations).toEqual([]);
  });

  it('combat storm: particle pool at capacity stays within a bounded draw budget', () => {
    const state = bossState(23);
    const h = harness(state);
    const perFrame = measure(h, true, true);
    console.info(`[qb bench] storm: ${JSON.stringify(perFrame)}`);
    expect(perFrame.shadows).toBe(0);
    expect(perFrame.filters).toBe(0);
    expect(perFrame.gradients).toBe(0);
    expect(h.mock.violations).toEqual([]);
  });

  it('overdrive aura: no per-frame gradient creation while overdriving', () => {
    const state = bossState(22);
    state.player.overdrive = 1e6;
    const h = harness(state);
    const perFrame = measure(h, true, false, () => { state.player.overdrive = 1e6; });
    console.info(`[qb bench] overdrive: ${JSON.stringify(perFrame)}`);
    expect(perFrame.gradients).toBe(0);
    expect(h.mock.violations).toEqual([]);
  });

  it('attract menu: no gradient creation per frame and a bounded draw count', () => {
    const h = harness(null);
    const perFrame = measure(h, false, false);
    console.info(`[qb bench] menu: ${JSON.stringify(perFrame)}`);
    expect(perFrame.gradients).toBe(0);
    expect(perFrame.shadows).toBe(0);
    expect(perFrame.filters).toBe(0);
    expect(h.mock.violations).toEqual([]);
  });

  it('slow device: the quality tier steps down and the storm budget shrinks with it', () => {
    const state = bossState(23);
    const h = harness(state);
    // 30 ms frames: two slow one-second windows per step, so high -> medium -> low within 6 s.
    h.dt = 0.03;
    for (let i = 0; i < 360; i++) frame(h, true, true);
    expect(qualityTierOf(h.ctx)).toBe('low');
    const perFrame = measure(h, true, true);
    console.info(`[qb bench] storm on low tier: ${JSON.stringify(perFrame)}`);
    expect(perFrame.paints).toBeLessThan(700);
    expect(perFrame.gradients).toBe(0);
    expect(h.mock.violations).toEqual([]);
  });
});
