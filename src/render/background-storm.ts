// src/render/background-storm.ts — OWNER: H5. Chapter 10 Thunderhead Roost: random lightning strikes on the render clock.
import { WORLD_H, WORLD_W } from '../sim/tuning/core';
import { seededRandom } from './sprites/draw';
import { FLASH_REDUCED_SCALE } from './shake';

export const STRIKE_PERIOD_S = 2.7;
export const STRIKE_FLASH_S = 0.35;
export const STRIKE_WASH_ALPHA = 0.14;
export const STRIKE_WASH_COLOR = '#9BE8FF';
export const STRIKE_BOLT_COLOR = '#E6FBFF';
const STRIKE_BOLT_WIDTH = 3;
const STRIKE_REACH = 0.8;

/** Draws the strike live at `clock` (render clock, not sim time). Dimmed like other flashes when reduceFlashes is on. */
export function drawStormStrike(ctx: CanvasRenderingContext2D, clock: number, reduce: boolean): void {
  const period = Math.floor(clock / STRIKE_PERIOD_S);
  const age = clock - period * STRIKE_PERIOD_S;
  if (age > STRIKE_FLASH_S) return;
  const level = (1 - age / STRIKE_FLASH_S) * (reduce ? FLASH_REDUCED_SCALE : 1);
  const rnd = seededRandom(period * 7919 + 13);
  ctx.globalAlpha = STRIKE_WASH_ALPHA * level;
  ctx.fillStyle = STRIKE_WASH_COLOR;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  let x = WORLD_W * (0.15 + 0.7 * rnd());
  let y = 0;
  ctx.globalAlpha = Math.min(1, 0.9 * level);
  ctx.strokeStyle = STRIKE_BOLT_COLOR;
  ctx.lineWidth = STRIKE_BOLT_WIDTH;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  while (y < WORLD_H * STRIKE_REACH) {
    y += 30 + 40 * rnd();
    x += (rnd() - 0.5) * 50;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
