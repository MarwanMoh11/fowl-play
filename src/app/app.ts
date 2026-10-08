// src/app/app.ts — OWNER: LEAD. Screen flow, wiring of sim/render/audio/ui (§5.4, HENPOCALYPSE §5).
import type { AppScreen, AudioSystem, Renderer, Settings, StartOptions, UI } from '../shared/contracts';
import type { GameState } from '../sim/types';
import type { GameEvent } from '../sim/events';
import type { DebugCommand } from '../sim/debug';
import { applyDebug } from '../sim/debug';
import { choosePerk, continueEndless, createGame } from '../sim/game';
import { dailyMutators, dailySeed } from '../sim/modes';
import { DEFAULT_LOADOUT } from '../sim/mods';
import { createRenderer } from '../render';
import { createAudio } from '../audio';
import { createUI } from '../ui';
import { loadSettings, safeStorage } from '../ui/storage';
import { createInput, type InputSystem } from '../input/input';
import { applyView, computeView, type ViewLayout } from './view';
import { parseParams, type UrlParams } from './params';
import { buildRunSummary } from './summary';
import { createFpsMeter, type FpsMeter } from './fps';

const DEBUG_KEYS: Record<string, DebugCommand> = {
  Digit1: 'toggleHitboxes', Digit2: 'toggleGod', Digit3: 'killAll', Digit4: 'powerUp',
  Digit5: 'cycleWeapon', Digit6: 'addMissiles', Digit7: 'jumpToBoss',
  Digit8: 'spawnPowerup', Digit9: 'fillFury', Digit0: 'nextWave',
};

/** Local calendar date as YYYYMMDD (daily runs). */
export function todayYmd(d: Date = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export interface App {
  screen: AppScreen;
  state: GameState | null;
  view: ViewLayout;
  settings: Settings;
  readonly params: UrlParams;
  readonly renderer: Renderer;
  readonly audio: AudioSystem;
  readonly ui: UI;
  readonly input: InputSystem;
  readonly fps: FpsMeter;
  onSimEvents(events: readonly GameEvent[]): void;
}

export function createApp(canvas: HTMLCanvasElement, uiRoot: HTMLElement): App {
  const params = parseParams(location.search);
  const settings = loadSettings(safeStorage());
  if (params.difficulty) settings.difficulty = params.difficulty;
  const renderer = createRenderer(canvas);
  const audio = createAudio();
  audio.setVolumes(settings.masterVolume, settings.musicVolume, settings.sfxVolume);
  const input = createInput(canvas);
  let lastStart: StartOptions = { difficulty: settings.difficulty, mode: 'campaign', loadout: DEFAULT_LOADOUT };
  let dailyDate = 0;

  function newSeed(): number {
    return params.seed ?? ((Date.now() ^ 0x5f3759df) >>> 0);
  }

  /** Feeds events produced outside step() (createGame, continueEndless, debug) to consumers. */
  function dispatch(events: readonly GameEvent[]): void {
    if (!app.state || events.length === 0) return;
    renderer.handleEvents(events, app.state);
    audio.handleEvents(events);
    app.onSimEvents(events);
  }

  function setScreen(s: AppScreen): void {
    app.screen = s;
    canvas.classList.toggle('playing', s === 'playing');
    input.setCapture(s === 'playing');
  }

  function startGame(opts: StartOptions): void {
    lastStart = opts;
    let seed = newSeed();
    let loadout = opts.loadout;
    dailyDate = 0;
    if (opts.mode === 'daily') {
      dailyDate = todayYmd();
      seed = dailySeed(dailyDate);
      loadout = { ...loadout, mutators: dailyMutators(seed) };
    }
    app.state = createGame({
      seed,
      difficulty: opts.difficulty,
      mode: opts.mode,
      loadout,
      startChapter: params.debug ? params.chapter ?? undefined : undefined,
      startWave: params.debug ? params.wave ?? undefined : undefined,
      debug: { godMode: params.god },
    });
    input.reset();
    setScreen('playing');
    ui.hide();
    audio.unlock();
    dispatch(app.state.events);
  }

  function pause(): void {
    if (app.screen !== 'playing') return;
    setScreen('paused');
    ui.showPause();
  }

  const ui = createUI(uiRoot, {
    onStart(opts: StartOptions): void {
      // A double tap on Start must not begin a second run over the first one.
      if (app.screen === 'playing' || app.screen === 'paused' || app.screen === 'draft') return;
      startGame(opts);
    },
    onResume(): void {
      if (app.screen !== 'paused') return;
      input.reset();
      setScreen('playing');
      ui.hide();
      audio.unlock();
    },
    onRestart(): void {
      if (app.screen === 'playing' || app.screen === 'draft') return;
      startGame(lastStart);
    },
    onDraftChoice(index: number): void {
      if (app.screen !== 'draft' || !app.state) return;
      const from = app.state.events.length;
      choosePerk(app.state, index);
      input.reset();
      setScreen('playing');
      ui.hide();
      dispatch(app.state.events.slice(from));
    },
    onQuitToTitle(): void {
      app.state = null;
      setScreen('title');
      ui.showTitle();
    },
    onContinueEndless(): void {
      if (!app.state || (app.screen !== 'gameover' && app.screen !== 'victory')) return;
      const from = app.state.events.length;
      continueEndless(app.state);
      input.reset();
      setScreen('playing');
      ui.hide();
      dispatch(app.state.events.slice(from));
    },
    onSettingsChanged(s: Settings): void {
      app.settings = s;
      audio.setVolumes(s.masterVolume, s.musicVolume, s.sfxVolume);
    },
  }, { sprites: renderer.sprites, audio, getSettings: () => app.settings });

  const app: App = {
    screen: 'title',
    state: null,
    view: computeView(innerWidth, innerHeight, devicePixelRatio || 1),
    settings,
    params,
    renderer,
    audio,
    ui,
    input,
    fps: createFpsMeter(),
    onSimEvents(events: readonly GameEvent[]): void {
      if (app.state && events.length > 0) ui.trackEvents(events, app.state);
      for (const e of events) {
        if (e.type === 'game_over' && app.state) {
          setScreen('gameover');
          ui.showGameOver(buildRunSummary(app.state, false, dailyDate));
        } else if (e.type === 'victory' && app.state) {
          setScreen('victory');
          ui.showVictory(buildRunSummary(app.state, true, dailyDate));
        } else if (e.type === 'perk_draft' && app.state) {
          setScreen('draft');
          ui.showDraft(app.state);
        }
      }
    },
  };

  function resize(): void {
    app.view = computeView(innerWidth, innerHeight, devicePixelRatio || 1);
    applyView(canvas, uiRoot, app.view);
    renderer.resize(app.view);
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if ((e.code === 'Escape' || e.code === 'KeyP') && app.screen === 'playing') {
      e.preventDefault();
      pause();
      return;
    }
    const cmd = params.debug ? DEBUG_KEYS[e.code] : undefined;
    if (cmd && app.state && (app.screen === 'playing' || app.screen === 'paused')) {
      const from = app.state.events.length;
      applyDebug(app.state, cmd);
      dispatch(app.state.events.slice(from));
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  window.addEventListener('blur', pause);
  // iOS Safari only starts or resumes audio from a completed tap (touchend/click), so every gesture type unlocks.
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) {
    window.addEventListener(type, () => audio.unlock(), { capture: true });
  }

  if (params.gallery) {
    setScreen('title');
  } else if (params.debug && (params.chapter !== null || params.wave !== null || params.mode !== null)) {
    startGame({
      difficulty: settings.difficulty,
      mode: params.mode ?? 'campaign',
      loadout: { ship: params.ship ?? 'falcon', upgrades: {}, mutators: params.mutators },
    });
  } else {
    setScreen('title');
    ui.showTitle();
  }
  return app;
}
