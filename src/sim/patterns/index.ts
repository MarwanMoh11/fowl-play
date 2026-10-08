// src/sim/patterns/index.ts — OWNER: A3 (H3 added the armada patterns). Pattern registry: planned counts, start and per-tick update (§7.11).
import type { GameState } from '../types';
import type { GroupRuntime, GroupSpec } from '../waves.types';
import { asteroidsPlanned, startAsteroids, updateAsteroids } from './asteroids';
import { startBoss } from './boss';
import { bouncersPlanned, startBouncers, updateBouncers } from './bouncers';
import { cometsPlanned, minesPlanned, podsPlanned, startComets, startMines, startPods, updateComets, updateMines, updatePods } from './drops';
import { gridPlanned, startDivers, startGrid, updateDivers, updateGrid } from './grid';
import {
  jetsPlanned, mothersPlanned, startJets, startMothers, startTurrets, startVoids, turretsPlanned, updateJets,
  updateVoids, voidsPlanned,
} from './flyers';
import { ringPlanned, startRing, updateRing } from './ring';
import { startStream, streamPlanned, updateStream } from './stream';
import { startSwarm, swarmPlanned, updateSwarmGroup } from './swarm';
import { startSwoop, swoopPlanned, updateSwoop } from './swoop';
import { startUfo, ufoPlanned, updateUfo } from './ufo';

/** Number of wave spawns the group plans (drives the carry plan and the "exact count" tests). */
export function patternPlanned(spec: GroupSpec): number {
  switch (spec.pattern) {
    case 'grid': return gridPlanned(spec);
    case 'divers': return gridPlanned(spec);
    case 'swoop': return swoopPlanned(spec);
    case 'stream': return streamPlanned(spec);
    case 'ring': return ringPlanned(spec);
    case 'bouncers': return bouncersPlanned(spec);
    case 'asteroids': return asteroidsPlanned(spec);
    case 'ufo': return ufoPlanned(spec);
    case 'swarm': return swarmPlanned(spec);
    case 'boss': return 0;
    case 'jets': return jetsPlanned(spec);
    case 'pods': return podsPlanned(spec);
    case 'mines': return minesPlanned(spec);
    case 'voids': return voidsPlanned(spec);
    case 'comets': return cometsPlanned(spec);
    case 'turrets': return turretsPlanned(spec);
    case 'mothers': return mothersPlanned(spec);
  }
}

/** Called once when the group starts (group time 0). */
export function startPattern(state: GameState, g: GroupRuntime, spec: GroupSpec): void {
  switch (spec.pattern) {
    case 'grid': return startGrid(state, g, spec);
    case 'divers': return startDivers(state, g, spec);
    case 'swoop': return startSwoop(state, g, spec);
    case 'stream': return startStream(state, g, spec);
    case 'ring': return startRing(state, g, spec);
    case 'bouncers': return startBouncers(state, g, spec);
    case 'asteroids': return startAsteroids(state, g, spec);
    case 'ufo': return startUfo(state, g, spec);
    case 'swarm': return startSwarm(state, g, spec);
    case 'boss': return startBoss(state, g, spec);
    case 'jets': return startJets(state, g, spec);
    case 'pods': return startPods(state, g, spec);
    case 'mines': return startMines(state, g, spec);
    case 'voids': return startVoids(state, g, spec);
    case 'comets': return startComets(state, g, spec);
    case 'turrets': return startTurrets(state, g, spec);
    case 'mothers': return startMothers(state, g, spec);
  }
}

/** Called every tick after the group started (including the start tick). Spawns and moves anchors. */
export function updatePattern(state: GameState, g: GroupRuntime, spec: GroupSpec, dt: number): void {
  switch (spec.pattern) {
    case 'grid': return updateGrid(state, g, spec, dt);
    case 'divers': return updateDivers(state, g, spec, dt);
    case 'swoop': return updateSwoop(state, g, spec, dt);
    case 'stream': return updateStream(state, g, spec, dt);
    case 'ring': return updateRing(state, g, spec, dt);
    case 'bouncers': return updateBouncers(state, g, spec, dt);
    case 'asteroids': return updateAsteroids(state, g, spec, dt);
    case 'ufo': return updateUfo(state, g, spec, dt);
    case 'swarm': return updateSwarmGroup(state, g, spec, dt);
    case 'boss': return;
    case 'jets': return updateJets(state, g, spec, dt);
    case 'pods': return updatePods(state, g, spec, dt);
    case 'mines': return updateMines(state, g, spec, dt);
    case 'voids': return updateVoids(state, g, spec, dt);
    case 'comets': return updateComets(state, g, spec, dt);
    case 'turrets': return;
    case 'mothers': return;
  }
}
