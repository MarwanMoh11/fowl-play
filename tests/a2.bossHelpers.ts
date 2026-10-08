// tests/a2.bossHelpers.ts — OWNER: A2. Boss test helpers (not a test file).
import type { GameState, Hazard } from '../src/sim/types';
import { newId } from '../src/sim/ids';

export function addHazard(s: GameState, ownerId: number, over: Partial<Hazard> = {}): Hazard {
  const h: Hazard = {
    id: newId(s), kind: 'beam', a: { x: 640, y: 0 }, b: { x: 640, y: 720 }, width: 40, ttl: 5, lethal: true,
    alive: true, ownerId, ...over,
  };
  s.hazards.push(h);
  return h;
}
