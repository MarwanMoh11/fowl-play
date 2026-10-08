// src/sim/onslaught.ts — OWNER: H3. Procedural infinite waves for ONSLAUGHT mode (HENPOCALYPSE §H3).
// Pure and deterministic: the same (seed, sector, wave) always yields the same WaveDef (local RngState, never state.rng).
import type { BossId } from './bosses.types';
import type { GroupSpec, KindLetter, RingDef, WaveDef } from './waves.types';
import type { EnemyKind, RngState } from './types';
import { rngInt, rngNext, rngPick, rngRange } from './rng';
import { ENEMY_BASE, KIND_LETTERS } from './tuning/enemies';
import {
  boss, comets, divers, grid, jets, mines, mothers, pods, ring, rings, stream, swarm, swoop, turrets, voids, w,
} from './chapterKit';

/** Boss per sector, cycling. Same order as modes.ts BOSS_RUSH_ORDER (tests/h3.onslaught checks it). */
const SECTOR_BOSSES: readonly BossId[] = [
  'hen', 'carrier', 'rooster', 'twin_hens', 'dreadnought', 'broodmother',
  'rotisserie', 'colossus', 'kraken', 'phoenix', 'scrambler', 'empress',
];
const MINI_BOSSES: readonly BossId[] = [
  'mini_brigadier', 'mini_ace', 'mini_cuckoo', 'mini_jelly', 'mini_stormcrow', 'mini_scarecrow', 'mini_guard',
];
const ADJECTIVES: readonly string[] = [
  'Feral', 'Molten', 'Rotten', 'Crispy', 'Golden', 'Frantic', 'Savage', 'Lucky', 'Sneaky', 'Spicy', 'Fluffy', 'Greasy',
  'Sizzling', 'Cosmic', 'Feathered', 'Plucky', 'Wicked', 'Howling', 'Scrappy', 'Shiny', 'Stormy', 'Gilded', 'Wobbly', 'Ravenous',
];
const NOUNS: readonly string[] = [
  'Flock', 'Murder', 'Stampede', 'Brood', 'Swarm', 'Storm', 'Feast', 'Rampage', 'Barrage', 'Nest', 'Coop', 'Parade',
  'Roost', 'Rally', 'Showdown', 'Ambush', 'Brigade', 'Cloud', 'Volley', 'Fiesta', 'Riot', 'Hurricane', 'Scramble', 'Hatch',
];
const SECTOR_NAMES: readonly string[] = [
  'Eggfall Reach', 'Cinder Gulf', 'Gilded Rim', 'Clockspire Drift', 'Brine Shoals', 'Hollow Belt',
  'Ashen Verge', 'Velvet Spur', 'Rustwing Expanse', 'Thunder Mesa', 'Dusk Vault', 'Hatchling Heartland',
];

/** Threat budget B = base + perSector × sector + perWave × wave; a group costs its enemies' HP sum / 4. */
const BUDGET = { base: 18, perSector: 6, perWave: 2 } as const;
const COST_DIVISOR = 4;
const MAX_GROUPS = 3;
const PICK_TRIES = 10;
const ASTEROID_AVG_HP = 3; // 20% large (8 hp), 40% medium (3 hp), 40% small (1 hp)
const BASE_YS: number[] = [150, 210, 270, 330];

export function onslaughtBudget(sector: number, wave: number): number {
  return BUDGET.base + BUDGET.perSector * sector + BUDGET.perWave * wave;
}

/** Kind letters unlocked by sector: 1 B R A · 2 +C U N X · 3 +S T (and jets) · 4 +G H W · 5+ all. */
export function lettersFor(sector: number): KindLetter[] {
  const out: KindLetter[] = ['B', 'R', 'A'];
  if (sector >= 2) out.push('C', 'U', 'N', 'X');
  if (sector >= 3) out.push('S', 'T');
  if (sector >= 4) out.push('G', 'H', 'W');
  if (sector >= 5) out.push('K', 'M', 'V', 'E');
  return out;
}

function hpOfKind(kind: EnemyKind): number {
  return ENEMY_BASE[kind].hp;
}

function hpOfLetter(letter: string): number {
  return hpOfKind(KIND_LETTERS[letter]);
}

/** Total enemy HP of a group's planned spawns (bosses cost nothing: they are never generated as groups). */
function hpSum(spec: GroupSpec): number {
  switch (spec.pattern) {
    case 'grid':
    case 'swoop':
    case 'divers':
      return [...spec.rowKinds].reduce((s, l) => s + hpOfLetter(l), 0) * spec.cols;
    case 'stream': return spec.groups * spec.perGroup * hpOfLetter(spec.kind);
    case 'ring': return spec.rings.reduce((s, r) => s + r.n * hpOfLetter(r.kind), 0);
    case 'bouncers': return Object.entries(spec.kinds).reduce((s, [l, n]) => s + (n ?? 0) * hpOfLetter(l), 0);
    case 'asteroids': return spec.rate * spec.duration * ASTEROID_AVG_HP;
    case 'swarm': return spec.count * hpOfKind('chick');
    case 'ufo': return spec.count * hpOfKind('chicken_ufo');
    case 'jets': return spec.count * hpOfKind('chicken_jet');
    case 'pods': return spec.count * hpOfKind('egg_pod');
    case 'mines': return spec.count * hpOfKind('space_mine');
    case 'comets': return Math.floor(spec.rate * spec.duration) * hpOfKind('comet');
    case 'turrets': return spec.count * hpOfKind('chicken_turret');
    case 'mothers': return spec.count * hpOfKind('chicken_mother');
    case 'voids': return spec.count * hpOfKind('chicken_void');
    default: return 0;
  }
}

/** Threat cost of one group: its enemies' HP sum / 4. */
export function groupCost(spec: GroupSpec): number {
  return hpSum(spec) / COST_DIVISOR;
}

// ---- random helpers (all draw from the local state) ----

function int(r: RngState, lo: number, hi: number): number {
  return rngInt(r, lo, hi);
}

/** A random number in [lo, hi] rounded to one decimal, so names and tables stay readable. */
function tenth(r: RngState, lo: number, hi: number): number {
  return Math.round(rngRange(r, lo, hi) * 10) / 10;
}

function pick<T>(r: RngState, arr: readonly T[]): T {
  return rngPick(r, arr);
}

function rowsOf(r: RngState, letters: readonly KindLetter[], lo: number, hi: number): string {
  const n = int(r, lo, hi);
  let s = '';
  for (let i = 0; i < n; i++) s += pick(r, letters);
  return s;
}

function sidesOf(r: RngState, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += rngNext(r) < 0.5 ? 'L' : 'R';
  return s;
}

function ringsSpec(r: RngState, letters: readonly KindLetter[]): GroupSpec {
  const n = int(r, 2, 3);
  const defs: RingDef[] = [];
  for (let i = 0; i < n; i++) {
    const omega = (i % 2 === 0 ? 1 : -1) * tenth(r, 0.8, 1.3);
    defs.push(ring(pick(r, letters), int(r, 6, 12), 80 + i * 70, omega));
  }
  return rings(...defs);
}

type Make = (r: RngState, letters: readonly KindLetter[]) => GroupSpec;
interface Template { minSector: number; make: Make }

/** Every armada pattern plus the v1 patterns, each with a sector gate (jets/turrets/mines need sector 3, and so on). */
const TEMPLATES: readonly Template[] = [
  { minSector: 1, make: (r, L) => grid(rowsOf(r, L, 2, 4), int(r, 6, 10)) },
  { minSector: 1, make: (r, L) => swoop(rowsOf(r, L, 2, 3), int(r, 6, 10)) },
  { minSector: 1, make: (r, L) => divers(rowsOf(r, L, 2, 3), int(r, 6, 10), tenth(r, 1.0, 2.0), int(r, 1, 3)) },
  {
    minSector: 1,
    make: (r, L) => {
      const groups = int(r, 2, 4);
      return stream(groups, int(r, 6, 12), pick(r, L), sidesOf(r, groups), BASE_YS);
    },
  },
  { minSector: 1, make: (r, L) => ringsSpec(r, L) },
  { minSector: 1, make: (r) => ({ pattern: 'bouncers', kinds: { B: int(r, 4, 8), R: int(r, 0, 6), A: int(r, 0, 4) } }) },
  {
    minSector: 1,
    make: (r) => ({ pattern: 'asteroids', duration: int(r, 15, 30), rate: tenth(r, 1.0, 2.4), from: pick(r, ['tr', 'tl', 'both'] as const) }),
  },
  { minSector: 2, make: (r) => swarm(int(r, 20, 50)) },
  { minSector: 2, make: (r) => ({ pattern: 'ufo', count: int(r, 3, 6) }) },
  { minSector: 2, make: (r) => pods(int(r, 6, 14), tenth(r, 1.0, 2.0)) },
  { minSector: 2, make: (r) => comets(int(r, 15, 30), tenth(r, 1.0, 2.0)) },
  { minSector: 3, make: (r) => { const perV = pick(r, [4, 6, 8]); return jets(perV * int(r, 2, 4), perV); } },
  { minSector: 3, make: (r) => turrets(int(r, 2, 6)) },
  { minSector: 3, make: (r) => mines(int(r, 12, 30), tenth(r, 1.0, 2.0)) },
  { minSector: 4, make: (r) => mothers(int(r, 2, 4)) },
  { minSector: 5, make: (r) => voids(int(r, 4, 10)) },
];

/** Tries a few random candidates; returns the first that fits `left`, else the cheapest candidate seen. */
function pickAffordable(r: RngState, pool: readonly Template[], letters: readonly KindLetter[], left: number): GroupSpec {
  let best: GroupSpec | null = null;
  let bestCost = Infinity;
  for (let i = 0; i < PICK_TRIES; i++) {
    const spec = pick(r, pool).make(r, letters);
    const cost = groupCost(spec);
    if (cost <= left) return spec;
    if (cost < bestCost) { best = spec; bestCost = cost; }
  }
  return best ?? grid(letters[0], 1);
}

/** "Feral Flock", "Molten Murder": a random adjective and noun. */
function waveName(r: RngState): string {
  return pick(r, ADJECTIVES) + ' ' + pick(r, NOUNS);
}

/** Mixes the seed with sector and wave into a non-zero 32-bit state (a local stream, never state.rng). */
function mixSeed(seed: number, sector: number, wave: number): number {
  let h = (seed ^ Math.imul(sector, 0x9e3779b1) ^ Math.imul(wave + 1, 0x85ebca77)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return (h >>> 0) || 1;
}

/** Pure and deterministic: same (seed, sector, wave) → same WaveDef. Wave 10 is the sector boss; wave 5 of sectors 2+ is a mini-boss. */
export function generateOnslaughtWave(seed: number, sector: number, wave: number): WaveDef {
  const s = Math.max(1, Math.floor(sector));
  const wv = Math.min(10, Math.max(1, Math.floor(wave)));
  const r: RngState = { s: mixSeed(seed, s, wv) };
  const name = waveName(r);
  if (wv === 10) return w(name, boss(SECTOR_BOSSES[(s - 1) % SECTOR_BOSSES.length]));
  if (wv === 5 && s >= 2) return w(name, boss(MINI_BOSSES[(s - 2) % MINI_BOSSES.length]));
  const letters = lettersFor(s);
  const pool = TEMPLATES.filter((t) => t.minSector <= s);
  let left = onslaughtBudget(s, wv);
  const count = int(r, 1, MAX_GROUPS);
  const groups: GroupSpec[] = [];
  for (let g = 0; g < count; g++) {
    const spec = pickAffordable(r, pool, letters, left);
    groups.push(spec);
    left -= groupCost(spec);
  }
  return w(name, ...groups);
}

/** "Sector n — <name>" with the name from a 12-entry list that cycles. */
export function onslaughtSectorName(sector: number): string {
  const n = Math.max(1, Math.floor(sector));
  return 'Sector ' + n + ' — ' + SECTOR_NAMES[(n - 1) % SECTOR_NAMES.length];
}
