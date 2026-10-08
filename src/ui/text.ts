// src/ui/text.ts — OWNER: A4. Canvas text helpers shared by HUD, banners and tally (§8.6).
export const FONT_STACK = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const OUTLINE_COLOR = '#1B1030';
export const OUTLINE_WIDTH = 3;

export function fontOf(size: number): string {
  return `bold ${size}px ${FONT_STACK}`;
}

export interface TextOpts {
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  fill?: string | CanvasGradient;
  /** Outline colour; null disables the stroke. */
  stroke?: string | null;
  strokeWidth?: number;
  maxWidth?: number;
}

/** White text with a dark outline underneath. (x, y) is the anchor for the chosen align/baseline (default left/middle). */
export function drawText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, opts: TextOpts = {},
): void {
  ctx.font = fontOf(size);
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = opts.baseline ?? 'middle';
  const stroke = opts.stroke === undefined ? OUTLINE_COLOR : opts.stroke;
  if (stroke !== null) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.strokeWidth ?? OUTLINE_WIDTH;
    ctx.strokeStyle = stroke;
    if (opts.maxWidth !== undefined) ctx.strokeText(text, x, y, opts.maxWidth);
    else ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = opts.fill ?? '#FFFFFF';
  if (opts.maxWidth !== undefined) ctx.fillText(text, x, y, opts.maxWidth);
  else ctx.fillText(text, x, y);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear blend of two #RRGGBB colours. */
export function lerpColor(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const mix = (x: number, y: number): number => Math.round(x + (y - x) * k);
  return `rgb(${mix(ar, br)}, ${mix(ag, bg)}, ${mix(ab, bb)})`;
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
