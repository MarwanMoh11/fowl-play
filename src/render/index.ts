// src/render/index.ts — OWNER: A5. Renderer entry (§8): sprite atlas + world renderer + gallery.
import type { Renderer, Settings, View } from '../shared/contracts';
import type { GameState } from '../sim/types';
import type { GameEvent } from '../sim/events';
import { createGallery, type Gallery } from './gallery';
import { createWorldRenderer } from './renderer';
import { createSpriteAtlas } from './sprites/atlas';

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');
  const sprites = createSpriteAtlas();
  const world = createWorldRenderer(ctx, sprites);
  let gallery: Gallery | null = null;

  return {
    ctx,
    sprites,
    resize(_view: View): void {
      // The app sets the backing-store size; every frame re-applies the transform, so nothing to do here.
    },
    handleEvents(events: readonly GameEvent[], state: GameState): void {
      world.handleEvents(events, state);
    },
    render(state: GameState | null, view: View, settings: Settings, frameDt: number): void {
      world.render(state, view, settings, frameDt);
    },
    renderGallery(view: View): void {
      if (!gallery) gallery = createGallery(ctx, sprites);
      gallery.render(view);
    },
  };
}
