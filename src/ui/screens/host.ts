// src/ui/screens/host.ts — OWNER: H4 (from A4). What every screen builder receives from the UI controller.
import type { AudioSystem, Settings, SpriteApi, UICallbacks } from '../../shared/contracts';
import type { GameState } from '../../sim/types';
import type { Menu } from '../menu';
import type { KV } from '../storage';

export interface Screen {
  el: HTMLElement;
  menu: Menu;
  /** Item to focus when the screen opens (defaults to the first enabled item). */
  startAt?: number;
}

export interface Host {
  cb: UICallbacks;
  audio: AudioSystem;
  sprites: SpriteApi;
  kv: KV | null;
  settings(): Settings;
  /** The run being played (or paused), if any. */
  runState(): GameState | null;
  /** Merges, persists and announces a settings change (applies immediately). */
  update(patch: Partial<Settings>): void;
  show(screen: Screen): void;
}
