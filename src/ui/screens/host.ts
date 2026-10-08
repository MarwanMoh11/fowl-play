// src/ui/screens/host.ts — OWNER: A4. What every screen builder receives from the UI controller.
import type { AudioSystem, Settings, SpriteApi, UICallbacks } from '../../shared/contracts';
import type { Menu } from '../menu';
import type { KV } from '../storage';

export interface Screen {
  el: HTMLElement;
  menu: Menu;
}

export interface Host {
  cb: UICallbacks;
  audio: AudioSystem;
  sprites: SpriteApi;
  kv: KV | null;
  settings(): Settings;
  /** Merges, persists and announces a settings change (applies immediately). */
  update(patch: Partial<Settings>): void;
  show(screen: Screen): void;
}
