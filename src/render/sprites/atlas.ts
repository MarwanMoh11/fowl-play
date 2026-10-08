// src/render/sprites/atlas.ts — OWNER: A5. Packs every sprite frame into 2x atlases (colour + white flash) and implements SpriteApi.
import { SPRITE_KEYS, type DrawOpts, type SpriteApi, type SpriteKey } from '../../shared/contracts';
import { ATLAS_SCALE } from './palette';
import { SPRITE_REGISTRY } from './registry';
import type { SpriteDef } from './types';

export const ATLAS_MAX_WIDTH = 2048;
export const ATLAS_GUTTER = 2;

export interface AtlasRect { x: number; y: number; w: number; h: number }
export interface AtlasLayout {
  width: number;
  height: number;
  rects: Record<SpriteKey, AtlasRect[]>;
}

/** Pure shelf packer: no canvas needed, so it is unit-testable. Cells include the sprite's glow padding. */
export function packSprites(defs: readonly SpriteDef[], scale: number, maxWidth = ATLAS_MAX_WIDTH, gutter = ATLAS_GUTTER): AtlasLayout {
  const cells: { key: SpriteKey; frame: number; w: number; h: number }[] = [];
  for (const d of defs) {
    const w = Math.ceil((d.w + d.pad * 2) * scale);
    const h = Math.ceil((d.h + d.pad * 2) * scale);
    for (let f = 0; f < d.frames; f++) cells.push({ key: d.key, frame: f, w, h });
  }
  cells.sort((a, b) => b.h - a.h || b.w - a.w);
  const rects = {} as Record<SpriteKey, AtlasRect[]>;
  for (const d of defs) rects[d.key] = new Array<AtlasRect>(d.frames);
  let x = 0;
  let y = 0;
  let shelfH = 0;
  let width = 0;
  for (const c of cells) {
    if (x + c.w > maxWidth && x > 0) {
      y += shelfH + gutter;
      x = 0;
      shelfH = 0;
    }
    rects[c.key][c.frame] = { x, y, w: c.w, h: c.h };
    x += c.w + gutter;
    width = Math.max(width, x - gutter);
    shelfH = Math.max(shelfH, c.h);
  }
  return { width, height: y + shelfH, rects };
}

export function spriteSize(key: SpriteKey): { w: number; h: number; frames: number } {
  const d = SPRITE_REGISTRY[key];
  return { w: d.w, h: d.h, frames: d.frames };
}

export interface SpriteAtlas extends SpriteApi {
  /** Raw atlas canvases, for tests/debugging. */
  readonly color: HTMLCanvasElement;
  readonly flash: HTMLCanvasElement;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

/** Browser-only. Draws every registered sprite once and returns the SpriteApi. */
export function createSpriteAtlas(): SpriteAtlas {
  const defs = SPRITE_KEYS.map((k) => SPRITE_REGISTRY[k]);
  const layout = packSprites(defs, ATLAS_SCALE);
  const color = makeCanvas(layout.width, layout.height);
  const cctx = color.getContext('2d');
  if (!cctx) throw new Error('2D canvas not supported');
  for (const d of defs) {
    for (let f = 0; f < d.frames; f++) {
      const r = layout.rects[d.key][f];
      cctx.save();
      cctx.beginPath();
      cctx.rect(r.x, r.y, r.w, r.h);
      cctx.clip();
      cctx.setTransform(ATLAS_SCALE, 0, 0, ATLAS_SCALE, r.x + d.pad * ATLAS_SCALE, r.y + d.pad * ATLAS_SCALE);
      d.draw(cctx, f);
      cctx.restore();
    }
  }
  const flash = makeCanvas(layout.width, layout.height);
  const fctx = flash.getContext('2d');
  if (!fctx) throw new Error('2D canvas not supported');
  fctx.drawImage(color, 0, 0);
  fctx.globalCompositeOperation = 'source-in';
  fctx.fillStyle = '#FFFFFF';
  fctx.fillRect(0, 0, flash.width, flash.height);
  fctx.globalCompositeOperation = 'source-over';

  function draw(ctx: CanvasRenderingContext2D, key: SpriteKey, x: number, y: number, opts?: DrawOpts): void {
    const d = SPRITE_REGISTRY[key];
    let frame = opts?.frame ?? 0;
    if (frame >= d.frames) frame = d.frames - 1;
    else if (frame < 0) frame = 0;
    const r = layout.rects[key][frame | 0];
    const sc = opts?.scale ?? 1;
    const dw = (r.w / ATLAS_SCALE) * sc;
    const dh = (r.h / ATLAS_SCALE) * sc;
    const src = opts?.flash ? flash : color;
    const alpha = opts?.alpha ?? 1;
    const rot = opts?.rotation ?? 0;
    if (rot !== 0 || opts?.flipX) {
      ctx.save();
      ctx.translate(x, y);
      if (rot !== 0) ctx.rotate(rot);
      if (opts?.flipX) ctx.scale(-1, 1);
      if (alpha !== 1) ctx.globalAlpha *= alpha;
      ctx.drawImage(src, r.x, r.y, r.w, r.h, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      return;
    }
    if (alpha !== 1) {
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = prev * alpha;
      ctx.drawImage(src, r.x, r.y, r.w, r.h, x - dw / 2, y - dh / 2, dw, dh);
      ctx.globalAlpha = prev;
    } else {
      ctx.drawImage(src, r.x, r.y, r.w, r.h, x - dw / 2, y - dh / 2, dw, dh);
    }
  }

  function toCanvas(key: SpriteKey, frame = 0): HTMLCanvasElement {
    const d = SPRITE_REGISTRY[key];
    const f = Math.max(0, Math.min(d.frames - 1, Math.floor(frame)));
    const r = layout.rects[key][f];
    const out = makeCanvas(r.w, r.h);
    out.getContext('2d')?.drawImage(color, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    out.style.width = r.w / ATLAS_SCALE + 'px';
    out.style.height = r.h / ATLAS_SCALE + 'px';
    return out;
  }

  return { color, flash, draw, size: spriteSize, toCanvas };
}
