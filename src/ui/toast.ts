// src/ui/toast.ts — OWNER: H4. Queued toasts at the top centre (3 s each). Lives outside #ui so screens never remove it.
export const TOAST_MS = 3000;

export interface Toaster {
  push(text: string): void;
}

const TOAST_TOP_PX = 14;

/** `anchor` (the letterboxed #ui root) keeps toasts inside the game area instead of the window's black bars. */
export function createToaster(doc: Document = document, anchor?: HTMLElement): Toaster {
  const box = doc.createElement('div');
  box.className = 'fp-toasts';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  doc.body.append(box);
  const queue: string[] = [];
  let busy = false;

  function place(): void {
    if (anchor) box.style.top = Math.max(0, anchor.getBoundingClientRect().top) + TOAST_TOP_PX + 'px';
  }

  function showNext(): void {
    place();
    const text = queue.shift();
    if (text === undefined) {
      busy = false;
      return;
    }
    busy = true;
    const el = doc.createElement('div');
    el.className = 'fp-toast';
    el.textContent = text;
    box.append(el);
    setTimeout(() => {
      el.remove();
      showNext();
    }, TOAST_MS);
  }

  return {
    push(text: string): void {
      queue.push(text);
      if (!busy) showNext();
    },
  };
}
