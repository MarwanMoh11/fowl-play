// src/app/loop.ts — OWNER: A1. Fixed 60 Hz simulation, render every animation frame (§5.2).
import { step } from '../sim/game';
import { DT } from '../sim/tuning/core';
import { drawHud } from '../ui/hud';
import type { App } from './app';

const MAX_STEPS = 5;
const MAX_FRAME_TIME = 0.25;

export function startLoop(app: App): void {
  let acc = 0;
  let last = performance.now();

  function frame(now: number): void {
    const elapsed = Math.min(Math.max(0, now - last) / 1000, MAX_FRAME_TIME);
    last = now;
    app.fps.tick(elapsed);
    if (app.params.gallery) {
      app.renderer.renderGallery(app.view);
      requestAnimationFrame(frame);
      return;
    }
    if (app.screen === 'playing' && app.state) {
      acc += elapsed;
      let steps = 0;
      while (acc >= DT && steps < MAX_STEPS && app.screen === 'playing') {
        const input = app.input.sample(app.view, app.settings);
        step(app.state, input, DT);
        app.renderer.handleEvents(app.state.events, app.state);
        app.audio.handleEvents(app.state.events);
        app.onSimEvents(app.state.events);
        acc -= DT;
        steps++;
      }
      if (steps === MAX_STEPS) acc = 0;
    } else {
      acc = 0;
    }
    const frameDt = app.screen === 'paused' ? 0 : elapsed;
    app.renderer.render(app.state, app.view, app.settings, frameDt);
    if (app.state && app.screen !== 'title') {
      drawHud(app.renderer.ctx, app.state, app.renderer.sprites, app.settings, app.fps.value);
    }
    app.audio.update(app.screen, app.state, elapsed);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
