// src/ui/index.ts — OWNER: H4 (from A4). DOM menus in #ui: title flow, pause, end, draft and meta screens; toasts and run tracking.
import type { RunSummary, Settings, UI, UICallbacks, UIDeps } from '../shared/contracts';
import type { GameEvent } from '../sim/events';
import type { GameState } from '../sim/types';
import { buildDraft } from './screens/draft';
import { buildEnd } from './screens/end';
import type { Host, Screen } from './screens/host';
import { buildPause } from './screens/pause';
import { buildTitle } from './screens/title';
import { createRunTracker } from './run-tracker';
import { createToaster } from './toast';
import { parseSettings, safeStorage, saveSettings } from './storage';

export function createUI(root: HTMLElement, rawCb: UICallbacks, deps: UIDeps): UI {
  const kv = safeStorage();
  const toaster = createToaster(document, root);
  const tracker = createRunTracker(kv, (text) => toaster.push(text));
  let current: Screen | null = null;
  let open = false;

  // A new run forgets the previous one before the app builds the state.
  const cb: UICallbacks = {
    ...rawCb,
    onStart(opts) {
      tracker.reset();
      rawCb.onStart(opts);
    },
    onRestart() {
      tracker.reset();
      rawCb.onRestart();
    },
  };

  const host: Host = {
    cb,
    audio: deps.audio,
    sprites: deps.sprites,
    kv,
    settings: () => deps.getSettings(),
    runState: (): GameState | null => tracker.state(),
    update(patch: Partial<Settings>): void {
      const next = parseSettings({ ...deps.getSettings(), ...patch });
      saveSettings(next, kv);
      cb.onSettingsChanged(next);
    },
    show(screen: Screen): void {
      current = screen;
      open = true;
      root.replaceChildren(screen.el);
      if (screen.startAt !== undefined) screen.menu.focus(screen.startAt, true);
      else screen.menu.focusFirst();
    },
  };

  // Menu keys are handled here, before the game's own window listener sees them, so Esc/Space/Enter never leak.
  document.addEventListener('keydown', (e) => {
    if (!open || !current) return;
    if (current.menu.handleKey(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  // Space/Enter on a focused button would otherwise also fire a native click on key-up.
  document.addEventListener('keyup', (e) => {
    if (open && (e.code === 'Space' || e.code === 'Enter') && e.target instanceof HTMLButtonElement) e.preventDefault();
  });

  /** Banks the finished run (corn, lifetime stats, achievements) and shows its end screen. */
  function endRun(summary: RunSummary): void {
    host.show(buildEnd(host, summary, tracker.finish(summary)));
  }

  return {
    showTitle(): void {
      host.show(buildTitle(host));
    },
    showPause(): void {
      host.show(buildPause(host, tracker.state()));
    },
    showGameOver: endRun,
    showVictory: endRun,
    showDraft(state: GameState): void {
      host.show(buildDraft(host, state));
    },
    trackEvents(events: readonly GameEvent[], state: GameState): void {
      tracker.observe(events, state);
    },
    hide(): void {
      open = false;
      current = null;
      root.replaceChildren();
    },
    isOpen: () => open,
  };
}
