// src/ui/index.ts — OWNER: A4
// STUB(A1): owner A4 implements (§8.7)
import type { RunSummary, UI, UICallbacks, UIDeps } from '../shared/contracts';

export function createUI(root: HTMLElement, cb: UICallbacks, deps: UIDeps): UI {
  let open = false;

  function show(build: () => HTMLElement): void {
    root.replaceChildren(build());
    open = true;
  }

  function button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = 'stub-btn';
    b.addEventListener('click', onClick);
    return b;
  }

  function panel(...children: HTMLElement[]): HTMLElement {
    const div = document.createElement('div');
    div.className = 'stub-panel';
    div.append(...children);
    return div;
  }

  return {
    showTitle(): void {
      show(() => panel(button('PLAY', () => cb.onStart(deps.getSettings().difficulty))));
    },
    showPause(): void {
      show(() => panel(button('RESUME', () => cb.onResume()), button('QUIT', () => cb.onQuitToTitle())));
    },
    showGameOver(_s: RunSummary): void {
      show(() => panel(button('RETRY', () => cb.onRestart()), button('TITLE', () => cb.onQuitToTitle())));
    },
    showVictory(_s: RunSummary): void {
      show(() => panel(button('CONTINUE', () => cb.onContinueEndless()), button('TITLE', () => cb.onQuitToTitle())));
    },
    hide(): void {
      root.replaceChildren();
      open = false;
    },
    isOpen(): boolean {
      return open;
    },
  };
}
