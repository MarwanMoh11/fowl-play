// src/app/view.ts — OWNER: A1 (viewport sizing and DPR caps: D). Letterboxed 1280×720 view (§5.3).
import type { View } from '../shared/contracts';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';

/** Backing-store caps: phones and 4K screens stay fast; 2× is plenty for pixel-art sprites. */
export const MAX_DPR = 2;
export const MAX_BACKING_W = 2560;
export const MAX_BACKING_H = 1440;

export interface ViewLayout extends View {
  backingWidth: number;
  backingHeight: number;
}

/** Pure: device pixel ratio actually used for a letterbox scale, after the caps. */
export function capDpr(dpr: number, cssScale: number): number {
  const real = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.min(real, MAX_DPR, MAX_BACKING_W / (WORLD_W * cssScale), MAX_BACKING_H / (WORLD_H * cssScale));
}

/** Pure: computes the letterbox for a window size and device pixel ratio. */
export function computeView(innerWidth: number, innerHeight: number, dpr: number): ViewLayout {
  const cssScale = Math.max(0.01, Math.min(innerWidth / WORLD_W, innerHeight / WORLD_H));
  const cssWidth = WORLD_W * cssScale;
  const cssHeight = WORLD_H * cssScale;
  const eff = capDpr(dpr, cssScale);
  const backingWidth = Math.max(1, Math.round(WORLD_W * cssScale * eff));
  const backingHeight = Math.max(1, Math.round(WORLD_H * cssScale * eff));
  return {
    scale: backingWidth / WORLD_W,
    cssScale,
    dpr: eff,
    cssWidth,
    cssHeight,
    offsetX: Math.floor((innerWidth - cssWidth) / 2),
    offsetY: Math.floor((innerHeight - cssHeight) / 2),
    backingWidth,
    backingHeight,
  };
}

/** Visible viewport in CSS px; visualViewport follows iOS toolbars and the on-screen keyboard. */
export function viewportSize(): { width: number; height: number } {
  const vv = window.visualViewport;
  return vv ? { width: vv.width, height: vv.height } : { width: innerWidth, height: innerHeight };
}

/** The letterbox for the current viewport and device pixel ratio. */
export function currentView(): ViewLayout {
  const vp = viewportSize();
  return computeView(vp.width, vp.height, devicePixelRatio || 1);
}

/** Calls cb once per animation frame after any viewport change (resize, orientation, visualViewport). */
export function observeViewport(cb: () => void): void {
  let pending = false;
  const schedule = (): void => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      cb();
    });
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
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
