// src/app/view.ts — OWNER: A1. Letterboxed 1280×720 view (§5.3).
import type { View } from '../shared/contracts';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';

export interface ViewLayout extends View {
  backingWidth: number;
  backingHeight: number;
}

/** Pure: computes the letterbox for a window size and device pixel ratio. */
export function computeView(innerWidth: number, innerHeight: number, dpr: number): ViewLayout {
  const cssScale = Math.max(0.01, Math.min(innerWidth / WORLD_W, innerHeight / WORLD_H));
  const cssWidth = WORLD_W * cssScale;
  const cssHeight = WORLD_H * cssScale;
  const backingWidth = Math.max(1, Math.round(WORLD_W * cssScale * dpr));
  const backingHeight = Math.max(1, Math.round(WORLD_H * cssScale * dpr));
  return {
    scale: backingWidth / WORLD_W,
    cssScale,
    dpr,
    cssWidth,
    cssHeight,
    offsetX: Math.floor((innerWidth - cssWidth) / 2),
    offsetY: Math.floor((innerHeight - cssHeight) / 2),
    backingWidth,
    backingHeight,
  };
}

/** Applies the layout to the canvas and the #ui overlay. */
export function applyView(canvas: HTMLCanvasElement, ui: HTMLElement, v: ViewLayout): void {
  canvas.width = v.backingWidth;
  canvas.height = v.backingHeight;
  canvas.style.left = v.offsetX + 'px';
  canvas.style.top = v.offsetY + 'px';
  canvas.style.width = v.cssWidth + 'px';
  canvas.style.height = v.cssHeight + 'px';
  ui.style.left = v.offsetX + 'px';
  ui.style.top = v.offsetY + 'px';
  ui.style.transform = `scale(${v.cssScale})`;
}

/** CSS client coordinates → logical world coordinates. */
export function toLogical(v: View, clientX: number, clientY: number): { x: number; y: number } {
  return { x: (clientX - v.offsetX) / v.cssScale, y: (clientY - v.offsetY) / v.cssScale };
}
