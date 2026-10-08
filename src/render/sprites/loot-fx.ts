// src/render/sprites/loot-fx.ts — OWNER: H5. Effect sprites: shield bubble, grey smoke puff, gravity well.
import { glow, rgba, TAU } from './draw';
import { def, type Ctx, type SpriteDef } from './types';

function drawShieldBubble(ctx: Ctx): void {
  glow(ctx, 48, 48, 46, '#4CC9F0', 0.28);
  ctx.beginPath();
  ctx.arc(48, 48, 44, 0, TAU);
  ctx.strokeStyle = '#7FE7FF';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(48, 48, 40, 0, TAU);
  ctx.strokeStyle = rgba('#FFFFFF', 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(48, 48, 44, Math.PI * 1.1, Math.PI * 1.45);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  ctx.stroke();
}

function drawSmoke(ctx: Ctx): void {
  glow(ctx, 24, 24, 22, '#ADB5BD', 0.8);
  glow(ctx, 16, 29, 14, '#ADB5BD', 0.6);
  glow(ctx, 32, 27, 14, '#ADB5BD', 0.6);
  glow(ctx, 24, 17, 13, '#DEE2E6', 0.5);
}

const GRAVITY_ARMS = 3;
const GRAVITY_STEPS = 48;

function drawGravity(ctx: Ctx): void {
  glow(ctx, 64, 64, 62, '#7209B7', 0.4);
  ctx.lineCap = 'round';
  for (let arm = 0; arm < GRAVITY_ARMS; arm++) {
    ctx.beginPath();
    for (let k = 0; k <= GRAVITY_STEPS; k++) {
      const u = k / GRAVITY_STEPS;
      const r = 10 + u * 48;
      const a = arm * (TAU / GRAVITY_ARMS) + u * 3.4;
      const x = 64 + Math.cos(a) * r;
      const y = 64 + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#C77DFF', 0.9);
    ctx.lineWidth = 6 - arm;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(64, 64, 14, 0, TAU);
  ctx.strokeStyle = rgba('#E0C3FF', 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Keep the centre transparent so the well reads as a hole in the field.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(64, 64, 9, 0, TAU);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export const LOOT_FX_SPRITES: SpriteDef[] = [
  def({ key: 'fx_shield_bubble', w: 96, h: 96, frames: 1, draw: drawShieldBubble }),
  def({ key: 'fx_smoke', w: 48, h: 48, frames: 1, draw: drawSmoke }),
  def({ key: 'fx_gravity', w: 128, h: 128, frames: 1, draw: drawGravity }),
];
