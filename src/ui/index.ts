// src/ui/index.ts — OWNER: A4. DOM menus in #ui (§8.7): title, pause, game over, victory and their sub-screens.
import type { RunSummary, Settings, UI, UICallbacks, UIDeps } from '../shared/contracts';
import { buildEnd } from './screens/end';
import type { Host, Screen } from './screens/host';
import { buildPause } from './screens/pause';
import { buildTitle } from './screens/title';
import { parseSettings, safeStorage, saveSettings } from './storage';

export function createUI(root: HTMLElement, cb: UICallbacks, deps: UIDeps): UI {
  const kv = safeStorage();
  let current: Screen | null = null;
  let open = false;

  const host: Host = {
    cb,
    audio: deps.audio,
    sprites: deps.sprites,
    kv,
    settings: () => deps.getSettings(),
    update(patch: Partial<Settings>): void {
      const next = parseSettings({ ...deps.getSettings(), ...patch });
      saveSettings(next, kv);
      cb.onSettingsChanged(next);
    },
    show(screen: Screen): void {
      current = screen;
      open = true;
      root.replaceChildren(screen.el);
      screen.menu.focusFirst();
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

  return {
    showTitle(): void {
      host.show(buildTitle(host));
    },
    showPause(): void {
      host.show(buildPause(host));
    },
    showGameOver(summary: RunSummary): void {
      host.show(buildEnd(host, summary));
    },
    showVictory(summary: RunSummary): void {
      host.show(buildEnd(host, summary));
    },
    hide(): void {
      open = false;
      current = null;
      root.replaceChildren();
    },
    isOpen: () => open,
  };
}
