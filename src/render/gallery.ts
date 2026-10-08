// src/render/gallery.ts — OWNER: A5. ?gallery=1 sprite review page: every key and frame at 1x, labelled, plus the white flash variant.
import { SPRITE_KEYS, type SpriteApi, type SpriteKey, type View } from '../shared/contracts';
import { WORLD_H, WORLD_W } from '../sim/tuning/core';
import { SPRITE_REGISTRY } from './sprites/registry';

export const GALLERY = {
  margin: 24, headerH: 56, gap: 14, labelH: 20, labelCharW: 6.4, minCellW: 44,
  bg: '#12121C', cell: '#1C1C2C', bounds: 'rgba(127,231,255,0.35)', label: '#C8D0E0', title: '#FFFFFF',
  scrollStep: 60, pageStep: 560,
} as const;

export interface GalleryCell {
  key: SpriteKey;
  frame: number;
  flash: boolean;
  x: number; y: number; w: number; h: number;   // content-space box (sprite area + label)
  label: string;
}

/** Pure flow layout (no canvas): frames in order, flash variant right after frame 0, wrapping at `width`. */
export function layoutGallery(width: number): { cells: GalleryCell[]; height: number } {
  const cells: GalleryCell[] = [];
  const maxX = width - GALLERY.margin;
  let x = GALLERY.margin;
  let y = GALLERY.headerH;
  let rowH = 0;
  const place = (key: SpriteKey, frame: number, flash: boolean, label: string): void => {
    const d = SPRITE_REGISTRY[key];
    const w = Math.max(GALLERY.minCellW, d.w + d.pad * 2, Math.ceil(label.length * GALLERY.labelCharW) + 8);
    const h = d.h + d.pad * 2 + GALLERY.labelH;
    if (x + w > maxX && x > GALLERY.margin) {
      x = GALLERY.margin;
      y += rowH + GALLERY.gap;
      rowH = 0;
    }
    cells.push({ key, frame, flash, x, y, w, h, label });
    x += w + GALLERY.gap;
    rowH = Math.max(rowH, h);
  };
  for (const key of SPRITE_KEYS) {
    const d = SPRITE_REGISTRY[key];
    for (let f = 0; f < d.frames; f++) {
      place(key, f, false, f === 0 ? key : `#${f}`);
      if (f === 0) place(key, 0, true, 'flash');
    }
  }
  return { cells, height: y + rowH + GALLERY.margin };
}

export interface Gallery { render(view: View): void }

export function createGallery(ctx: CanvasRenderingContext2D, sprites: SpriteApi): Gallery {
  const layout = layoutGallery(WORLD_W);
  let scroll = 0;
  const maxScroll = Math.max(0, layout.height - WORLD_H);
  const clampScroll = (v: number): number => Math.max(0, Math.min(maxScroll, v));
  const opts = { frame: 0, flash: false };

  if (typeof window !== 'undefined') {
    window.addEventListener('wheel', (e) => { scroll = clampScroll(scroll + Math.sign(e.deltaY) * GALLERY.scrollStep); }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') scroll = clampScroll(scroll + GALLERY.scrollStep);
      else if (e.key === 'ArrowUp') scroll = clampScroll(scroll - GALLERY.scrollStep);
      else if (e.key === 'PageDown' || e.key === ' ') scroll = clampScroll(scroll + GALLERY.pageStep);
      else if (e.key === 'PageUp') scroll = clampScroll(scroll - GALLERY.pageStep);
      else if (e.key === 'Home') scroll = 0;
      else if (e.key === 'End') scroll = maxScroll;
    });
  }

  return {
    render(view: View): void {
      ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      ctx.fillStyle = GALLERY.bg;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const c of layout.cells) {
        const y = c.y - scroll;
        if (y > WORLD_H || y + c.h < 0) continue;
        const d = SPRITE_REGISTRY[c.key];
        ctx.fillStyle = GALLERY.cell;
        ctx.fillRect(c.x, y, c.w, c.h);
        const cx = c.x + c.w / 2;
        const cy = y + (c.h - GALLERY.labelH) / 2;
        opts.frame = c.frame;
        opts.flash = c.flash;
        sprites.draw(ctx, c.key, cx, cy, opts);
        ctx.strokeStyle = GALLERY.bounds;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(cx - d.w / 2) + 0.5, Math.round(cy - d.h / 2) + 0.5, d.w, d.h);
        ctx.fillStyle = GALLERY.label;
        ctx.fillText(c.label, cx, y + c.h - 6);
      }
      ctx.fillStyle = GALLERY.bg;
      ctx.fillRect(0, 0, WORLD_W, GALLERY.headerH - 8);
      ctx.fillStyle = GALLERY.title;
      ctx.font = 'bold 18px "Trebuchet MS", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SPRITE GALLERY  -  ${SPRITE_KEYS.length} keys, 1x   (wheel / arrows / PgUp / PgDn / Home / End to scroll)`, GALLERY.margin, 32);
    },
  };
}
