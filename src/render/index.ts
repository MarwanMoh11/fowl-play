// src/render/index.ts — OWNER: A5
// STUB(A1): owner A5 implements (§8.1–8.5)
import type { Renderer, Settings, SpriteApi, SpriteKey, View } from '../shared/contracts';
import type { GameState } from '../sim/types';
import type { GameEvent } from '../sim/events';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';

function createStubSprites(): SpriteApi {
  return {
    draw(): void {},
    size(_key: SpriteKey) {
      return { w: 1, h: 1, frames: 1 };
    },
    toCanvas(): HTMLCanvasElement {
      return document.createElement('canvas');
    },
  };
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');
  const sprites = createStubSprites();
  let view: View | null = null;

  function render(_state: GameState | null, v: View, _settings: Settings, _frameDt: number): void {
    view = v;
    ctx!.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx!.fillStyle = '#fff';
    ctx!.font = 'bold 48px sans-serif';
    ctx!.textAlign = 'center';
    ctx!.textBaseline = 'middle';
    ctx!.fillText('FOWL PLAY — M0', WORLD_W / 2, WORLD_H / 2);
  }

  return {
    ctx,
    sprites,
    resize(v: View): void {
      view = v;
    },
    handleEvents(_events: readonly GameEvent[], _state: GameState): void {},
    render,
    renderGallery(v: View): void {
      render(null, view ?? v, {} as Settings, 0);
    },
  };
}
