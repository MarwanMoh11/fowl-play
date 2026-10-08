// src/audio/index.ts — OWNER: A4
// STUB(A1): owner A4 implements (§8.8–8.9)
import type { AudioSystem } from '../shared/contracts';

export function createAudio(): AudioSystem {
  return {
    unlock(): void {},
    handleEvents(): void {},
    update(): void {},
    setVolumes(): void {},
    ui(): void {},
  };
}
