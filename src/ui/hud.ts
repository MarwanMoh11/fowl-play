// src/ui/hud.ts — OWNER: A4
// STUB(A1): owner A4 implements (§8.6)
import type { Settings, SpriteApi } from '../shared/contracts';
import type { GameState } from '../sim/types';

export function formatScore(n: number): string {
  return String(Math.floor(n));
}

export function drawHud(
  ctx: CanvasRenderingContext2D, state: GameState, _sprites: SpriteApi, _settings: Settings, _fps: number,
): void {
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(formatScore(state.score), 16, 16);
}
