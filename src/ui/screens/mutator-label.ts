// src/ui/screens/mutator-label.ts — OWNER: H4. Mutator toggle labels: name plus its score multiplier, taken from the tuning text.
import { MUTATORS } from '../../sim/tuning/loadout';
import type { MutatorId } from '../../sim/types';

/** "×1.4" from a description such as "Twice the eggs. Score ×1.4", or '' when the text has none. */
export function scoreMultiplier(desc: string): string {
  const m = /Score ×(\d+(?:\.\d+)?)/.exec(desc);
  return m ? `×${m[1]}` : '';
}

export function mutatorLabel(id: MutatorId): string {
  const def = MUTATORS[id];
  const mult = scoreMultiplier(def.desc);
  return mult === '' ? def.name : `${def.name}  ${mult}`;
}
