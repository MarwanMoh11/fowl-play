// src/render/renderer.ts — OWNER: H5 (was A5). World renderer: draw order of §8.3 and the per-frame orchestration.
import type { Settings, SpriteApi, View } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { GameState } from '../sim/types';
import { createAmbient, drawGravityWells, emitAmbient, type Ambient } from './ambient';
import { createSplash, drawSplash, startSplash, updateSplash, type Splash } from './boss-splash';
import { createBackground, paletteIndex, warpFactor } from './background';
import { createEffects, drawArcs, type Effects } from './effects';
import { drawRails } from './fx-henpo';
import { drawFlash, drawHazards, drawHitboxes } from './overlays';
import { drawParticles } from './particles';
import { drawAttract } from './render-attract';
import { drawEnemyLayer, drawPickupLayer, drawProjectileLayer } from './render-entities';
import { drawShipLayer } from './render-ship';

export * from './render-maps';
export { ATTRACT_CHICKENS } from './render-attract';
export { CULL_MARGIN, CULL_MARGIN_BOSS, FLASH_OVERLAY_ALPHA, FLASH_OVERLAY_ALPHA_BOSS } from './render-entities';

const NO_DASH: number[] = [];

export interface WorldRenderer {
  handleEvents(events: readonly GameEvent[], state: GameState): void;
  render(state: GameState | null, view: View, settings: Settings, frameDt: number): void;
}

/** Leaves the context in default drawing state for A4's HUD, which draws right after render(). */
function resetContextState(ctx: CanvasRenderingContext2D): void {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.setLineDash(NO_DASH);
}

export function createWorldRenderer(ctx: CanvasRenderingContext2D, sprites: SpriteApi): WorldRenderer {
  const effects: Effects = createEffects();
  const background = createBackground();
  const ambient: Ambient = createAmbient();
  const splash: Splash = createSplash();
  const shakeOffset = { x: 0, y: 0 };
  let lastState: GameState | null = null;
  let lastSimTime = -1;
  let clock = 0;

  function drawWorld(state: GameState): void {
    drawGravityWells(ctx, sprites, state.hazards, state.time);
    drawPickupLayer(ctx, sprites, state);
    drawEnemyLayer(ctx, sprites, state, false, effects.ghosts);
    drawEnemyLayer(ctx, sprites, state, true, effects.ghosts);
    drawHazards(ctx, state.hazards, state.time, state.chapter);
    drawProjectileLayer(ctx, sprites, state, false);
    drawProjectileLayer(ctx, sprites, state, true);
    drawRails(ctx, effects.rails);
  }

  function syncChapter(state: GameState | null): void {
    if (background.fading) return;
    const want = state ? state.chapter : 1;
    if (paletteIndex(want) !== paletteIndex(background.chapter)) background.setChapter(want, state !== null);
  }

  return {
    handleEvents(events: readonly GameEvent[], state: GameState): void {
      if (state !== lastState) {
        lastState = state;
        effects.reset();
        splash.active = false;
        background.setChapter(state.chapter, true);
      }
      for (const e of events) {
        if (e.type === 'wave_start' && e.wave === 1) background.setChapter(e.chapter, false);
        else if (e.type === 'boss_warning') startSplash(splash, e.name);
      }
      effects.handleEvents(events, state.player.alive ? state.player.pos : null);
    },

    render(state: GameState | null, view: View, settings: Settings, frameDt: number): void {
      const s = view.scale;
      const reduce = settings.reduceFlashes;
      ctx.imageSmoothingEnabled = true;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      clock += frameDt;
      syncChapter(state);
      const warp = state && state.phase === 'warp' ? warpFactor(state.phaseTimer) : 1;
      background.update(frameDt, warp);
      effects.update(frameDt, state && state.player.alive ? state.player.pos : null);
      updateSplash(splash, frameDt);
      background.draw(ctx, warp, reduce);
      effects.shake.sample(clock, settings.screenShake, shakeOffset);
      ctx.setTransform(s, 0, 0, s, shakeOffset.x * s, shakeOffset.y * s);
      drawParticles(ctx, effects.pool, sprites, true);
      if (state) {
        // Trails only grow while the simulation advances, so a paused game does not keep emitting.
        if (state.time !== lastSimTime) emitAmbient(state, effects.pool, frameDt, ambient);
        lastSimTime = state.time;
        drawWorld(state);
      } else {
        drawAttract(ctx, sprites, clock);
      }
      drawArcs(ctx, effects.arcs);
      if (state) drawShipLayer(ctx, sprites, state, reduce);
      drawParticles(ctx, effects.pool, sprites, false);
      ctx.setTransform(s, 0, 0, s, 0, 0);
      if (state) drawSplash(ctx, sprites, splash);
      drawFlash(ctx, effects.flash.color, effects.flash.alpha(reduce));
      if (state && state.debug.showHitboxes) drawHitboxes(ctx, state);
      resetContextState(ctx);
    },
  };
}

