// src/render/sprites/atlas.ts — OWNER: H5 (was A5). Packs every sprite frame into paged atlases (colour + white flash)
// and implements SpriteApi. Big sprites (bosses) bake at a lower scale to keep memory in budget.
import { SPRITE_KEYS, type DrawOpts, type SpriteApi, type SpriteKey } from '../../shared/contracts';
import { ATLAS_SCALE } from './palette';
import { SPRITE_REGISTRY } from './registry';
import type { SpriteDef } from './types';

export const ATLAS_MAX_WIDTH = 2048;
export const ATLAS_MAX_HEIGHT = 4096;
export const ATLAS_GUTTER = 2;
/** Sprites larger than this (logical w × h) bake at BIG_SPRITE_SCALE instead of ATLAS_SCALE. */
export const BIG_SPRITE_AREA = 60000;
export const BIG_SPRITE_SCALE = 1.25;

export interface AtlasRect { x: number; y: number; w: number; h: number; page: number; scale: number }
export interface AtlasLayout {
  width: number;               // widest page
  height: number;              // tallest page
  pages: { width: number; height: number }[];
  rects: Record<SpriteKey, AtlasRect[]>;
}

export function bakeScale(d: SpriteDef, base: number): number {
  return d.w * d.h > BIG_SPRITE_AREA ? Math.min(base, BIG_SPRITE_SCALE) : base;
}

/** Pure shelf packer over pages: no canvas needed, so it is unit-testable. Cells include the sprite's glow padding. */
export function packSprites(
  defs: readonly SpriteDef[], scale: number, maxWidth = ATLAS_MAX_WIDTH, gutter = ATLAS_GUTTER,
  maxHeight = ATLAS_MAX_HEIGHT,
): AtlasLayout {
  const cells: { key: SpriteKey; frame: number; w: number; h: number; scale: number }[] = [];
  for (const d of defs) {
    const s = bakeScale(d, scale);
    const w = Math.ceil((d.w + d.pad * 2) * s);
    const h = Math.ceil((d.h + d.pad * 2) * s);
    for (let f = 0; f < d.frames; f++) cells.push({ key: d.key, frame: f, w, h, scale: s });
  }
  cells.sort((a, b) => b.h - a.h || b.w - a.w);
  const rects = {} as Record<SpriteKey, AtlasRect[]>;
  for (const d of defs) rects[d.key] = new Array<AtlasRect>(d.frames);
  const pages: { width: number; height: number }[] = [{ width: 0, height: 0 }];
  let x = 0;
  let y = 0;
  let shelfH = 0;
  for (const c of cells) {
    if (x + c.w > maxWidth && x > 0) {
      y += shelfH + gutter;
      x = 0;
      shelfH = 0;
    }
    if (y + c.h > maxHeight && y > 0) {
      pages.push({ width: 0, height: 0 });
      x = 0;
      y = 0;
      shelfH = 0;
    }
    const page = pages.length - 1;
    rects[c.key][c.frame] = { x, y, w: c.w, h: c.h, page, scale: c.scale };
    x += c.w + gutter;
    shelfH = Math.max(shelfH, c.h);
    pages[page].width = Math.max(pages[page].width, x - gutter);
    pages[page].height = Math.max(pages[page].height, y + shelfH);
  }
  let width = 0;
  let height = 0;
  for (const p of pages) { width = Math.max(width, p.width); height = Math.max(height, p.height); }
  return { width, height, pages, rects };
}

export function spriteSize(key: SpriteKey): { w: number; h: number; frames: number } {
  const d = SPRITE_REGISTRY[key];
  return { w: d.w, h: d.h, frames: d.frames };
}

export interface SpriteAtlas extends SpriteApi {
  /** Raw atlas canvases (one per page), for tests/debugging. */
  readonly color: HTMLCanvasElement[];
  readonly flash: HTMLCanvasElement[];
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
  const color = layout.pages.map((p) => makeCanvas(p.width, p.height));
  const cctxs = color.map((c) => {
    const x = c.getContext('2d');
    if (!x) throw new Error('2D canvas not supported');
    return x;
  });
  for (const d of defs) {
    for (let f = 0; f < d.frames; f++) {
      const r = layout.rects[d.key][f];
      const cctx = cctxs[r.page];
      cctx.save();
      cctx.beginPath();
      cctx.rect(r.x, r.y, r.w, r.h);
      cctx.clip();
      cctx.setTransform(r.scale, 0, 0, r.scale, r.x + d.pad * r.scale, r.y + d.pad * r.scale);
      d.draw(cctx, f);
      cctx.restore();
    }
  }
  const flash = color.map((c) => {
    const fl = makeCanvas(c.width, c.height);
    const fctx = fl.getContext('2d');
    if (!fctx) throw new Error('2D canvas not supported');
    fctx.drawImage(c, 0, 0);
    fctx.globalCompositeOperation = 'source-in';
    fctx.fillStyle = '#FFFFFF';
    fctx.fillRect(0, 0, fl.width, fl.height);
    fctx.globalCompositeOperation = 'source-over';
    return fl;
  });

  function draw(ctx: CanvasRenderingContext2D, key: SpriteKey, x: number, y: number, opts?: DrawOpts): void {
    const d = SPRITE_REGISTRY[key];
    let frame = opts?.frame ?? 0;
    if (frame >= d.frames) frame = d.frames - 1;
    else if (frame < 0) frame = 0;
    const r = layout.rects[key][frame | 0];
    const sc = opts?.scale ?? 1;
    const dw = (r.w / r.scale) * sc;
    const dh = (r.h / r.scale) * sc;
    const src = opts?.flash ? flash[r.page] : color[r.page];
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
    out.getContext('2d')?.drawImage(color[r.page], r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    out.style.width = r.w / r.scale + 'px';
    out.style.height = r.h / r.scale + 'px';
    return out;
  }

  return { color, flash, draw, size: spriteSize, toCanvas };
}
