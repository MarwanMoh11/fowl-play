# FOWL PLAY — Complete Game Specification & 5-Agent Build Prompt

**Version 1.0** · Team: 5 coding agents (A1–A5) · Stack: TypeScript + HTML5 Canvas 2D + Web Audio · Zero runtime dependencies · All art and audio generated in code

FOWL PLAY is an original arcade shoot-'em-up in the tradition of the classic "chicken invasion" space shooters: a lone starfighter against an armada of space chickens that fly in formations and bomb you with eggs. This document is the single source of truth. It contains everything needed to take an empty folder to a finished, tested, shippable game. If something is not in this document, follow §2 rule 10.

---

## 0. Operator instructions (for the human — agents skip to §1)

1. Create an empty folder. Save this file inside it as `docs/SPEC.md`.
2. Give **every** agent the full contents of this file plus its kickoff line from Appendix A.
3. Start **A1 alone first**. A1 builds the scaffold and the shared contracts (Phase 0). When `docs/STATUS.md` contains the line `PHASE 0 DONE`, start A2, A3, A4 and A5 in parallel. A1 keeps running as lead and integrator.
4. If your harness has an orchestrator that spawns sub-agents, make A1 the orchestrator; it spawns A2–A5 after Phase 0 using the Appendix A lines.
5. All agents work in the same working tree. File ownership is disjoint, so there are no merge conflicts as long as everyone follows §2.
6. "Fowl Play" is a working title. Rename freely (search-replace `Fowl Play`, `FOWL PLAY`, `fowlplay`) — but never use the name, logo, characters, music or assets of any existing commercial game.

---

## 1. Mission and Definition of Done

### 1.1 The game

The player pilots a starfighter in the lower part of the screen. Waves of space chickens fly in on formations, circles, streams and dives, dropping eggs that destroy the ship on contact. Shooting a chicken makes it burst into feathers and drop food (drumsticks, roast chickens). Catching food fills a counter; every 100 food grants one screen-clearing **missile**. Defeated enemies sometimes drop **power cores** (raise firepower 0→10) and **gift boxes** (switch to one of four weapons, or +1 firepower if it is the weapon you already hold). Firing builds **heat**; overheating locks the gun until it cools. Each **chapter** has 10 waves; wave 10 is a **boss**. Five chapters lead to victory, after which an endless mode loops the chapters with rising difficulty. Score, lives, extra lives every 100,000 points, a top-10 high-score table, three difficulty levels.

### 1.2 Definition of Done — ALL must be true

1. `npm install && npm run check` exits 0 (typecheck + every test + production build).
2. `npm run dev` → title screen → Play → chapters 1–5 fully playable → victory screen → endless mode continues; losing all lives → game over → name entry → high-score table.
3. Every **P0** and **P1** item in §9 is implemented and its acceptance check passes. **P2** items are optional.
4. No console errors or warnings during a full run (verified with debug skipping, §7.15 and §10).
5. `dist/` from `npm run build` runs from any static host and offline: no CDN, no web fonts, no image or audio files — everything is generated in code.
6. Holds 60 fps at 1280×720 during the heaviest wave (chapter 5 wave 9) on a mid-range laptop with integrated graphics.
7. `README.md` documents how to run, controls, architecture, and debug keys.

---

## 2. Rules for every agent (re-read before every task)

1. **Ownership.** Create and edit only files you own (§3.2). Never edit, move, reformat or delete another agent's file. Need a change there? File a request (§3.4).
2. **Contracts are law.** The files in §6 are frozen once A1 posts `PHASE 0 DONE`. Use their exact names and signatures. Only A1 may change them, only in response to a request, and A1 announces every change in `docs/STATUS.md` as `CONTRACT vN: <change>`.
3. **Always green.** Before reporting any task done, run `npm run check`. Never leave the repo failing typecheck. If someone else's file breaks the build, tell them; do not fix it yourself.
4. **No new dependencies.** Runtime dependencies: none. Dev dependencies: exactly those in §4.1.
5. **The simulation is pure and deterministic.** Code under `src/sim/` never touches `document`, `window`, `localStorage`, time (`Date.now`, `performance.now`), `Math.random`, audio, or canvas. All randomness goes through `src/sim/rng.ts` with `state.rng`. `GameState` must stay JSON-serializable: plain objects, arrays, numbers, strings, booleans, null — no functions, classes, Map, Set, or DOM references.
6. **Numbers come from this spec.** Put every number into your tuning file or data table as a named constant. Do not inline magic numbers in logic.
7. **Don't guess APIs.** Before calling a function from another module, open the file and read its signature. If it is still a stub, code against the contract and write your test with a minimal fake.
8. **Small steps.** One item → typecheck → test → commit → update STATUS. Keep files ≤ 400 lines (split by responsibility), functions ≤ 60 lines where practical. Prefer data tables over clever code.
9. **No unfinished code at milestones.** During Phase 1, temporary placeholders are allowed only as `// STUB(A#): reason`. From M2 onward there must be zero `STUB`, `TODO`, or `FIXME` in `src/` (a test enforces this once A1 enables it).
10. **Ambiguity.** If the spec is silent, choose the simplest behavior consistent with it, implement it, and append one line to `docs/DECISIONS.md`, e.g. `[A3] Stream chickens wrap at x=1340 (spec gives no exact wrap point).`
11. **Original work only.** No names, art, music, sound effects, text or level layouts copied, traced or transcribed from any existing game. Draw and compose everything yourselves.
12. **Git (if the folder is a repo).** Commit only your own files with explicit paths — never `git add -A` or `git add .`. Message prefix: `[A2] weapons: arc chaining`. Never rebase shared history or force-push.
13. **Don't stop early.** Work through your whole §9 list in priority order (all P0, then all P1, then P2). If blocked, write it in STATUS and move to the next item.
14. **Angles and axes.** Code uses radians. Screen y points DOWN: "up" is −y, straight up is angle −π/2, straight down is +π/2. Angles in this spec are written in degrees using the same convention (90° = straight down) — convert them.

---

## 3. Team, ownership, coordination

### 3.1 Roles

| Agent | Role | Core responsibility |
|---|---|---|
| **A1** | Lead · Core sim · App shell · Integrator · QA gatekeeper | Scaffold, contracts, game loop, input, phase machine, collisions, damage, pickups, scoring, difficulty, debug tools, app/screen flow, milestone gates, smoke tests, README |
| **A2** | Player & Combat | Ship movement, death/respawn, 4 weapons, power, heat, projectiles, missiles, all 5 bosses |
| **A3** | Enemies & Waves | Enemy definitions, movement patterns, egg dropping, wave spawner, all 50 waves across 5 chapters, asteroids, endless looping |
| **A4** | UI & Audio | HUD, banners, chapter tally, all menu screens (DOM), high scores, settings, all sound effects, procedural music |
| **A5** | Visuals | Procedural sprite atlas, world renderer, backgrounds, particles and VFX, screen shake, attract mode, sprite gallery |

### 3.2 File ownership (exact)

```
/package.json, /tsconfig.json, /vite.config.ts, /index.html, /README.md      A1
/docs/SPEC.md                         read-only for everyone (operator's copy)
/docs/STATUS.md                       each agent edits ONLY its own section
/docs/REQUESTS.md, /docs/DECISIONS.md append-only, everyone

src/main.ts                           A1
src/app/**                            A1   (loop, view/letterbox, screen flow, app.css)
src/input/**                          A1
src/shared/contracts.ts               A1   (CONTRACT)

src/sim/types.ts                      A1   (CONTRACT)
src/sim/events.ts                     A1   (CONTRACT)
src/sim/tuning/core.ts                A1   (CONTRACT)
src/sim/rng.ts, math.ts, ids.ts       A1
src/sim/difficulty.ts                 A1
src/sim/game.ts                       A1   (createGame, step, phase machine)
src/sim/combat.ts                     A1   (damageEnemy, killEnemy)
src/sim/collisions.ts                 A1
src/sim/pickups.ts                    A1
src/sim/scoring.ts                    A1
src/sim/debug.ts                      A1
src/sim/tuning/economy.ts             A1

src/sim/player.ts                     A2
src/sim/weapons.ts                    A2
src/sim/projectiles.ts                A2
src/sim/missile.ts                    A2
src/sim/bosses.ts (+ bosses/*.ts)     A2
src/sim/bosses.types.ts               A2   (initial version written by A1)
src/sim/tuning/weapons.ts             A2
src/sim/tuning/bosses.ts              A2

src/sim/enemies.ts                    A3
src/sim/behaviors.ts (+ patterns/*.ts) A3
src/sim/behaviors.types.ts            A3   (initial version written by A1)
src/sim/waves.ts                      A3
src/sim/waves.types.ts                A3   (initial version written by A1)
src/sim/chapters.ts                   A3
src/sim/tuning/enemies.ts             A3

src/ui/**                             A4   (hud.ts, banners.ts, screens/*, storage.ts, highscores.ts, styles.css, index.ts)
src/audio/**                          A4

src/render/**                         A5   (index.ts, sprites/*, renderer.ts, background.ts, particles.ts, shake.ts, gallery.ts)

tests/a1.*.test.ts … tests/a5.*.test.ts   each agent owns files with its own prefix
```

### 3.3 Phases

| Phase | Who | Content | Exit |
|---|---|---|---|
| **Phase 0** | A1 | Scaffold, contracts (§6), compiling stubs for every module, rng/math/ids/difficulty, app shell that boots to a stub title | `npm run check` green; A1 writes `PHASE 0 DONE — CONTRACT v1` in STATUS |
| **Phase 1 → M1** | all | Vertical slice (§11 M1) | A1 runs gate M1 |
| **Phase 2 → M2** | all | Content complete: every P0+P1 item | A1 runs gate M2, enables no-STUB test |
| **Phase 3 → M3** | all | Balance, performance, polish, bug fixing | A1 runs gate M3 |
| **Phase 4 → M4** | all | Cross-review, final checklist, release | §12 all checked |

**Warm-up during Phase 0** (optional, for A2–A5 while A1 works): you may create **new** files only, never a file on A1's stub list (§6.6), and they must not import contract files that don't exist yet.
- A2: write `src/sim/tuning/weapons.ts` (weapon tables from §7.4 as plain data).
- A3: write `src/sim/chapters.ts` as plain data from §7.12 with a local temporary type.
- A4: write `src/audio/synth.ts` (Web Audio voice helpers, §8.8).
- A5: write `src/render/sprites/*.ts` drawing functions (§8.2) that take a `CanvasRenderingContext2D` and draw one sprite.

### 3.4 Communication

- `docs/STATUS.md` — one section per agent: **Done / Doing / Blocked / Next**. Update after every task. Read the top (A1's section and any `CONTRACT vN` lines) before starting each task.
- `docs/REQUESTS.md` — append-only checklist. Format: `- [ ] [A3→A2] spawnProjectile must accept radius override for boss eggs`. The owner changes `[ ]` to `[x]` and appends ` → done in projectiles.ts`. If your harness supports direct messages, also send one; the file remains the record.
- `docs/DECISIONS.md` — append-only, one line per spec-silent decision.
- **Contract change process:** request to A1 with the exact proposed diff → A1 applies it, bumps the `CONTRACT vN` header comment in the changed file, posts `CONTRACT vN: …` in STATUS → affected owners update their code.

---

## 4. Tech stack and scaffold (A1, Phase 0)

### 4.1 package.json

```json
{
  "name": "fowl-play",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "npm run typecheck && npm run test && npm run build"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

If these exact majors fail to install together, A1 picks the nearest compatible set and logs it in DECISIONS.

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src", "tests"]
}
```

### 4.3 vite.config.ts

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

### 4.4 index.html

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fowl Play</title>
</head>
<body>
  <div id="stage">
    <canvas id="game"></canvas>
    <div id="ui"></div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/main.ts` imports `./app/app.css` (A1: page reset, black background, `#stage` fixed full-window, no scrollbars) and `./ui/styles.css` (A4).

### 4.5 Rules for code that runs in tests

Tests run in Node (no DOM, no canvas). Therefore:
- `src/sim/**` must never import from `src/render`, `src/ui`, `src/audio`, `src/app`, `src/input`.
- Modules in `src/render`, `src/ui`, `src/audio` must not touch `document`, `window`, canvas or `AudioContext` at import time (top level). Only inside functions. This lets tests import their pure helpers.

---

## 5. Architecture

### 5.1 Layers

```
            ┌──────────── src/app (A1): loop, screens, view ────────────┐
 input ──▶  │  InputFrame ──▶ sim.step(state, input, DT)  (60 Hz fixed) │
 (A1)       │                      │ state.events (per tick)            │
            │        ┌─────────────┼───────────────┐                    │
            │        ▼             ▼               ▼                    │
            │  renderer.handleEvents  audio.handleEvents  app.onSimEvents│
            │        (A5)            (A4)          (A1: open UI)        │
            │  every animation frame:                                   │
            │   renderer.render(state) (A5) → drawHud(state) (A4)       │
            │   audio.update(screen, state) (A4)                        │
            │   DOM menus overlay #ui (A4)                              │
            └────────────────────────────────────────────────────────────┘
 src/sim (A1, A2, A3): pure deterministic game logic, no DOM
```

- The **simulation** (`src/sim`) owns all game rules. It is a plain data `GameState` mutated by `step()`.
- `step()` clears `state.events` and refills it with what happened this tick. Renderer and audio react to events (particles, sounds) and also read the state each frame.
- **Rendering** is read-only with respect to `GameState`. Rendering never changes gameplay.
- **Menus** are DOM elements in `#ui`. The **HUD** is drawn on the canvas.

### 5.2 Main loop (A1, `src/app/loop.ts`)

```ts
const MAX_STEPS = 5;
let acc = 0;
let last = performance.now();

function frame(now: number): void {
  const elapsed = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (app.screen === 'playing' && app.state) {
    acc += elapsed;
    let steps = 0;
    while (acc >= DT && steps < MAX_STEPS) {
      const input = inputSystem.sample(app.view, app.settings);   // consumes edge-triggered presses
      step(app.state, input, DT);
      renderer.handleEvents(app.state.events, app.state);
      audio.handleEvents(app.state.events);
      app.onSimEvents(app.state.events);                          // game_over / victory → open UI
      acc -= DT;
      steps++;
    }
    if (steps === MAX_STEPS) acc = 0;                             // never spiral
  } else {
    acc = 0;
  }
  const frameDt = app.screen === 'paused' ? 0 : elapsed;          // freezes particles while paused
  renderer.render(app.state, app.view, app.settings, frameDt);    // null state = attract mode
  if (app.state && app.screen !== 'title') {
    drawHud(renderer.ctx, app.state, renderer.sprites, app.settings, fps.value);
  }
  audio.update(app.screen, app.state, elapsed);
  requestAnimationFrame(frame);
}
```

- Only the `playing` screen steps the simulation. `paused`, `gameover`, `victory` show a frozen game behind the DOM overlay (particles keep animating except while paused).
- `renderer.render` must leave the context transform set to logical scale (`ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0)`) with no shake, so `drawHud` draws in logical 1280×720 coordinates.

### 5.3 View and letterboxing (A1)

- Logical world: **1280×720**, origin top-left, y down.
- On resize: `cssScale = min(innerWidth/1280, innerHeight/720)`; canvas CSS size = `1280·cssScale × 720·cssScale`, centered (letterbox, black bars).
- Backing store: `canvas.width = round(1280·cssScale·dpr)`, `canvas.height = round(720·cssScale·dpr)`; `view.scale = canvas.width / 1280`.
- `#ui` is a 1280×720 box positioned over the canvas with `transform: scale(cssScale)` and `transform-origin: top left`, so A4 lays out menus in fixed 1280×720 logical pixels.
- Pointer → logical: `x = (clientX − offsetX) / cssScale`, `y = (clientY − offsetY) / cssScale`.

### 5.4 App screen flow (A1, `src/app`)

```
boot → title ──onStart──▶ playing ⇄ paused
                            │  game_over event ──▶ gameover ──Retry──▶ playing (new game)
                            │                                 └─Title──▶ title
                            └─ victory event ──▶ victory ──Continue──▶ playing (continueEndless)
                                                          └─Title──▶ title
```

- `onStart(difficulty)`: seed = `(Date.now() ^ 0x5f3759df) >>> 0` (allowed — app layer, not sim) unless `?seed=` is given; `state = createGame(...)`; screen `playing`; `ui.hide()`; `audio.unlock()`.
- `Esc` or `P` while playing → `paused` + `ui.showPause()`. Resume returns to `playing`.
- Auto-pause on `visibilitychange` (hidden) and window `blur` while playing.
- `onRestart` → new game, same difficulty. `onQuitToTitle` → `state = null`, `ui.showTitle()`.
- On a `game_over` event → screen `gameover`, `ui.showGameOver(summary)`. On a `victory` event → screen `victory`, `ui.showVictory(summary)`.
- `onSettingsChanged(s)` → store `app.settings`, `audio.setVolumes(...)`; storage is A4's job inside the UI.
- `?gallery=1` → skip the title and call `renderer.renderGallery(view)` every frame (sprite review page, §8.2).
- Hide the mouse cursor over the canvas while `playing` (`cursor: none`); show it otherwise. Prevent the context menu on the canvas.

---

## 6. Contracts (A1 creates these verbatim in Phase 0)

Every file in 6.1–6.4 starts with the header comment shown. 6.5 files are written by A1 once and then owned by A2/A3, who may only **add** members/fields (never rename or remove ones listed here).

### 6.1 `src/sim/types.ts`

```ts
// src/sim/types.ts — OWNER: A1 — CONTRACT v1 (frozen; changes only via A1)
import type { BehaviorState } from './behaviors.types';
import type { WaveRuntime } from './waves.types';
import type { GameEvent } from './events';

export interface Vec2 { x: number; y: number }
export interface RngState { s: number }

export type Difficulty = 'easy' | 'normal' | 'hard';
export type WeaponId = 'pulse' | 'neutron' | 'laser' | 'arc';
export const WEAPON_IDS: readonly WeaponId[] = ['pulse', 'neutron', 'laser', 'arc'];

export type EnemyKind =
  | 'chicken_basic' | 'chicken_red' | 'chicken_armored' | 'chicken_ufo' | 'chick'
  | 'asteroid_l' | 'asteroid_m' | 'asteroid_s'
  | 'boss_hen' | 'boss_carrier' | 'boss_rooster' | 'boss_dreadnought';

export type PickupKind =
  | 'drumstick' | 'roast' | 'power_core'
  | 'gift_pulse' | 'gift_neutron' | 'gift_laser' | 'gift_arc';

export type ProjectileKind =
  | 'bolt'           // player weapon shot
  | 'missile'        // player missile
  | 'egg'            // falling egg with gravity
  | 'enemy_shot'     // straight energy shot
  | 'boss_egg'       // large egg flying straight, no gravity
  | 'feather_knife'; // straight, rotated along velocity

export type Phase =
  | 'wave_intro' | 'boss_intro' | 'wave_active' | 'wave_clear'
  | 'chapter_complete' | 'warp' | 'game_over' | 'victory';

export type DamageSource = 'bolt' | 'arc' | 'missile' | 'contact' | 'debug';

export interface Player {
  pos: Vec2;
  radius: number;          // hit radius
  pickupRadius: number;    // collection radius
  alive: boolean;
  lives: number;           // ships remaining INCLUDING the current one; 0 => game over
  weapon: WeaponId;
  power: number;           // integer 0..10
  heat: number;            // 0..100
  overheated: boolean;
  fireCooldown: number;    // s until next volley allowed
  missiles: number;
  missileCooldown: number; // s
  food: number;            // 0..99
  invulnTimer: number;     // s; > 0 means invulnerable
  respawnTimer: number;    // s; counts down while dead
  bank: number;            // -1..1, render tilt only
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec2;
  vel: Vec2;               // px/s, kept up to date by behaviors (render uses it)
  radius: number;
  hp: number;
  maxHp: number;
  points: number;          // already chapter-scaled
  eggRate: number;         // eggs per second, already scaled; 0 = never
  alive: boolean;
  age: number;             // s since spawn
  hitFlash: number;        // s of white flash remaining
  invulnerable: boolean;   // bolts are absorbed, no damage
  canDropEggs: boolean;    // false while entering/returning
  carries: PickupKind | null; // guaranteed extra drop
  rotation: number;        // radians, render only
  anim: number;            // render hint: bosses use it as frame index (see §8.2)
  isBoss: boolean;
  behavior: BehaviorState;
}

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  owner: 'player' | 'enemy';
  weapon: WeaponId | null; // player bolts only
  pos: Vec2;
  vel: Vec2;
  accel: Vec2;
  maxSpeed: number;        // 0 = unlimited
  radius: number;
  damage: number;
  pierceLeft: number;      // player bolts: remaining enemy hits
  hitIds: number[];        // enemy ids already hit by this bolt
  ttl: number;             // s; removed at 0
  alive: boolean;
  rotation: number;        // render
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  age: number;
  spin: number;            // rotation, render
  alive: boolean;
}

export interface Hazard {
  id: number;
  kind: 'telegraph' | 'beam';
  a: Vec2;                 // segment start
  b: Vec2;                 // segment end
  width: number;           // px
  ttl: number;             // s
  lethal: boolean;         // beams true, telegraphs false
  alive: boolean;
  ownerId: number;         // boss enemy id
}

export interface Stats {
  shotsFired: number;      // bolts fired (arc: 1 per volley)
  shotsHit: number;        // bolts that hit at least one enemy (arc: volley hit ≥1)
  kills: number;
  foodCollected: number;   // food units (drumstick 1, roast 10)
  deaths: number;
}

export interface ChapterBonus {
  accuracyPct: number;     // integer 0..100
  accuracy: number;        // bonus points (raw, before difficulty multiplier)
  food: number;
  flawless: number;
  firepower: number;
  total: number;           // raw sum; score receives total × difficulty scoreMul
}

export interface Banner {
  style: 'wave' | 'boss' | 'small' | 'big';
  title: string;
  subtitle: string;
  ttl: number;             // s remaining
  total: number;           // initial ttl
}

export interface DebugFlags { godMode: boolean; showHitboxes: boolean; infiniteMissiles: boolean }

export interface GameState {
  seed: number;
  tick: number;
  time: number;            // simulated seconds
  rng: RngState;
  difficulty: Difficulty;
  endless: boolean;
  phase: Phase;
  phaseTimer: number;      // s since phase started
  chapter: number;         // 1-based, unbounded in endless mode
  wave: number;            // 1..10
  chapterName: string;
  waveName: string;
  bossName: string | null; // set by spawnBoss; null otherwise
  bossThresholds: number[];// hp fractions for HUD bar marks
  score: number;
  nextExtraLifeAt: number;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  hazards: Hazard[];
  waveRt: WaveRuntime;     // owned by A3
  banner: Banner | null;
  lastChapterBonus: ChapterBonus | null;
  chapterStats: Stats;
  runStats: Stats;
  events: GameEvent[];     // cleared at the start of every step()
  nextId: number;
  debug: DebugFlags;
}

export interface InputFrame {
  moveX: number;           // -1..1 keyboard/gamepad axis
  moveY: number;           // -1..1
  pointer: Vec2 | null;    // logical coords while pointer steering is active, else null
  fire: boolean;           // held
  missile: boolean;        // true only on the tick it was pressed
  skip: boolean;           // true only on the tick "confirm" was pressed
}
```

### 6.2 `src/sim/events.ts`

```ts
// src/sim/events.ts — OWNER: A1 — CONTRACT v1
import type { Vec2, WeaponId, EnemyKind, PickupKind, ChapterBonus, GameState } from './types';

export type GameEvent =
  | { type: 'player_fire'; weapon: WeaponId; power: number; x: number; y: number }
  | { type: 'arc'; points: Vec2[] }                    // lightning polyline: nose, target1, target2…
  | { type: 'overheat' }
  | { type: 'heat_recovered' }
  | { type: 'enemy_hit'; id: number; kind: EnemyKind; x: number; y: number; dmg: number }
  | { type: 'enemy_killed'; id: number; kind: EnemyKind; x: number; y: number; byMissile: boolean }
  | { type: 'egg_dropped'; x: number; y: number }
  | { type: 'egg_splat'; x: number; y: number }
  | { type: 'enemy_shot'; x: number; y: number }
  | { type: 'pickup_collected'; kind: PickupKind; x: number; y: number }
  | { type: 'power_changed'; power: number; delta: number }
  | { type: 'weapon_changed'; weapon: WeaponId }
  | { type: 'missile_gained'; missiles: number }
  | { type: 'missile_launched'; x: number; y: number; tx: number; ty: number }
  | { type: 'missile_detonated'; x: number; y: number }
  | { type: 'player_died'; x: number; y: number; livesLeft: number }
  | { type: 'player_respawned'; x: number; y: number }
  | { type: 'extra_life'; lives: number }
  | { type: 'score_popup'; amount: number; x: number; y: number }
  | { type: 'wave_start'; chapter: number; wave: number; name: string; isBoss: boolean }
  | { type: 'wave_cleared'; chapter: number; wave: number }
  | { type: 'boss_warning'; name: string }
  | { type: 'boss_attack'; attack: string; x: number; y: number }
  | { type: 'boss_phase'; phase: number; x: number; y: number }
  | { type: 'boss_killed'; kind: EnemyKind; x: number; y: number; radius: number }
  | { type: 'telegraph'; x: number; y: number }
  | { type: 'chapter_complete'; chapter: number; bonus: ChapterBonus }
  | { type: 'warp_start'; nextChapter: number }
  | { type: 'game_over'; score: number }
  | { type: 'victory'; score: number };

export function emit(state: GameState, e: GameEvent): void {
  state.events.push(e);
}
```

### 6.3 `src/sim/tuning/core.ts`

```ts
// src/sim/tuning/core.ts — OWNER: A1 — CONTRACT v1
export const WORLD_W = 1280;
export const WORLD_H = 720;
export const DT = 1 / 60;

export const SHIP_MIN_X = 36;
export const SHIP_MAX_X = 1244;
export const SHIP_MIN_Y = 90;
export const SHIP_MAX_Y = 640;
export const SHIP_SPAWN = { x: 640, y: 600 } as const;

export const GROUND_Y = 668;          // eggs splat here (just above the HUD bar)
export const HUD_BAR_Y = 676;         // bottom HUD bar occupies 676..720
export const EGG_DROP_MAX_Y = 520;    // enemies below this never drop eggs

export const MAX_ENEMIES = 400;
export const MAX_PROJECTILES = 1500;
export const MAX_PICKUPS = 300;
export const MAX_HAZARDS = 50;

export const PHASE_TIME = {
  waveIntro: 2.0,
  bossIntro: 3.0,
  waveClear: 1.5,
  chapterComplete: 5.0,
  chapterCompleteSkippableAfter: 1.5,
  warp: 3.0,
  gameOverDelay: 2.0,                  // dead with 0 lives → game_over after this
} as const;

export const WAVES_PER_CHAPTER = 10;
export const FINAL_CHAPTER = 5;
export const MAX_LIVES = 9;
export const MAX_MISSILES = 99;
export const MAX_POWER = 10;
export const EXTRA_LIFE_EVERY = 100_000;
```

### 6.4 `src/shared/contracts.ts`

```ts
// src/shared/contracts.ts — OWNER: A1 — CONTRACT v1
import type { GameState, Difficulty, WeaponId } from '../sim/types';
import type { GameEvent } from '../sim/events';
import type { BossId } from '../sim/bosses.types';

export type AppScreen = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export interface View {
  scale: number;       // backing-store px per logical px (includes devicePixelRatio)
  cssScale: number;    // CSS px per logical px
  dpr: number;
  cssWidth: number;
  cssHeight: number;
  offsetX: number;     // canvas left in CSS px (letterbox)
  offsetY: number;
}

export interface Settings {
  difficulty: Difficulty;
  masterVolume: number;  // 0..1
  musicVolume: number;   // 0..1
  sfxVolume: number;     // 0..1
  screenShake: boolean;
  reduceFlashes: boolean;
  showFps: boolean;
  autoFire: boolean;
  mouseControl: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'normal', masterVolume: 0.8, musicVolume: 0.5, sfxVolume: 0.8,
  screenShake: true, reduceFlashes: false, showFps: false, autoFire: false, mouseControl: true,
};

export const SPRITE_KEYS = [
  'ship', 'ship_shield',
  'enemy_chicken_basic', 'enemy_chicken_red', 'enemy_chicken_armored', 'enemy_chicken_armored_dented',
  'enemy_chicken_ufo', 'enemy_chick',
  'enemy_asteroid_l', 'enemy_asteroid_m', 'enemy_asteroid_s',
  'boss_hen', 'boss_carrier', 'boss_rooster', 'boss_dreadnought',
  'proj_pulse', 'proj_neutron', 'proj_laser', 'proj_arc', 'proj_missile',
  'proj_egg', 'proj_enemy_shot', 'proj_boss_egg', 'proj_feather_knife',
  'pickup_drumstick', 'pickup_roast', 'pickup_power_core',
  'pickup_gift_pulse', 'pickup_gift_neutron', 'pickup_gift_laser', 'pickup_gift_arc',
  'icon_life', 'icon_missile', 'icon_food',
  'icon_weapon_pulse', 'icon_weapon_neutron', 'icon_weapon_laser', 'icon_weapon_arc',
  'fx_egg_splat', 'fx_puff',
] as const;
export type SpriteKey = typeof SPRITE_KEYS[number];

export interface DrawOpts {
  frame?: number;      // default 0
  rotation?: number;   // radians, around center
  scale?: number;      // default 1
  alpha?: number;      // default 1
  flash?: boolean;     // draw the pre-built white silhouette instead
  flipX?: boolean;
}

export interface SpriteApi {
  /** Draws centered at (x, y) in logical px using the current transform. */
  draw(ctx: CanvasRenderingContext2D, key: SpriteKey, x: number, y: number, opts?: DrawOpts): void;
  size(key: SpriteKey): { w: number; h: number; frames: number };
  /** Standalone canvas of one frame, for DOM previews (How to Play). */
  toCanvas(key: SpriteKey, frame?: number): HTMLCanvasElement;
}

export interface Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly sprites: SpriteApi;
  resize(view: View): void;
  /** Call after every step() with that step's events. */
  handleEvents(events: readonly GameEvent[], state: GameState): void;
  /** state === null draws the attract-mode background for menus. Leaves transform at logical scale. */
  render(state: GameState | null, view: View, settings: Settings, frameDt: number): void;
  /** Debug page: every sprite and frame in a labeled grid. */
  renderGallery(view: View): void;
}

export type UiSound = 'move' | 'select' | 'back' | 'error' | 'tick';

export interface AudioSystem {
  /** Create/resume the AudioContext. Call from a user gesture. Safe to call repeatedly. */
  unlock(): void;
  handleEvents(events: readonly GameEvent[]): void;
  /** Every frame: chooses the music track, ducking, tally ticks. */
  update(screen: AppScreen, state: GameState | null, frameDt: number): void;
  setVolumes(master: number, music: number, sfx: number): void;
  ui(sound: UiSound): void;
}

export interface RunSummary {
  score: number;
  chapter: number;
  wave: number;
  difficulty: Difficulty;
  accuracyPct: number;
  kills: number;
  victory: boolean;
}

export interface UICallbacks {
  onStart(difficulty: Difficulty): void;
  onResume(): void;
  onRestart(): void;
  onQuitToTitle(): void;
  onContinueEndless(): void;
  onSettingsChanged(settings: Settings): void;
}

export interface UIDeps {
  sprites: SpriteApi;
  audio: AudioSystem;
  getSettings(): Settings;
}

export interface UI {
  showTitle(): void;
  showPause(): void;
  showGameOver(summary: RunSummary): void;
  showVictory(summary: RunSummary): void;
  hide(): void;
  isOpen(): boolean;
}

export const WEAPON_INFO: Record<WeaponId, { name: string; color: string; letter: string; desc: string }> = {
  pulse:   { name: 'PULSE BLASTER',  color: '#2E86FF', letter: 'P', desc: 'A widening fan of bolts that covers the screen.' },
  neutron: { name: 'NEUTRON CANNON', color: '#9B5DE5', letter: 'N', desc: 'Heavy focused rounds. Best against bosses.' },
  laser:   { name: 'PIERCING LASER', color: '#FF3B3B', letter: 'L', desc: 'Rapid beams that pass through several enemies.' },
  arc:     { name: 'ARC CASTER',     color: '#FFD60A', letter: 'A', desc: 'Lightning that seeks targets and chains between them.' },
};

export const BOSS_INFO: Record<BossId, { name: string; thresholds: number[] }> = {
  hen:         { name: 'MOTHER HEN',        thresholds: [0.5] },
  carrier:     { name: 'EGG CARRIER',       thresholds: [0.66, 0.33] },
  rooster:     { name: 'ROOSTER COMMANDER', thresholds: [0.4] },
  twin_hens:   { name: 'TWIN HENS',         thresholds: [] },
  dreadnought: { name: 'COOP DREADNOUGHT',  thresholds: [0.66, 0.33] },
};

export const STORAGE_KEYS = {
  settings: 'fowlplay.v1.settings',
  highscores: 'fowlplay.v1.highscores',
  lastName: 'fowlplay.v1.lastName',
} as const;
```

### 6.5 Owner-extendable type files (A1 writes initial version; owners extend)

**`src/sim/behaviors.types.ts`** — owned by A3. Members marked SHARED are constructed by A2 for boss minions; their fields must never be renamed or removed.

```ts
import type { Vec2 } from './types';
import type { BossRuntime } from './bosses.types';

export interface CubicPath { p0: Vec2; p1: Vec2; p2: Vec2; p3: Vec2 }

export type BehaviorState =
  | { type: 'none' }
  | { type: 'boss'; rt: BossRuntime }                                                    // SHARED (A2)
  | { type: 'seek'; speed: number; turnRate: number; heading: number }                   // SHARED (A2: brood chicks)
  | { type: 'stream'; dir: 1 | -1; speed: number; baseY: number; amp: number; freq: number; phase: number } // SHARED (A2: hatchlings)
  | { type: 'lane'; laneY: number; speed: number; dir: 1 | -1; shotTimer: number }       // SHARED (A2: escorts)
  | { type: 'formation'; group: number; slot: Vec2 }
  | { type: 'enter_path'; path: CubicPath; t: number; duration: number; group: number; slot: Vec2 }
  | { type: 'dive'; path: CubicPath; t: number; duration: number; group: number; slot: Vec2 }
  | { type: 'return'; from: Vec2; t: number; duration: number; group: number; slot: Vec2 }
  | { type: 'ring'; group: number; ring: number; index: number; count: number; radiusTarget: number; omega: number }
  | { type: 'bounce'; entering: boolean }
  | { type: 'drift'; spin: number }
  | { type: 'swarm'; offset: Vec2; mode: 'follow' | 'kamikaze'; dir: Vec2 };
```

**`src/sim/bosses.types.ts`** — owned by A2.

```ts
export type BossId = 'hen' | 'carrier' | 'rooster' | 'twin_hens' | 'dreadnought';

export interface BossRuntime {
  id: BossId;
  phase: number;            // 0-based
  entering: boolean;
  t: number;                // s since spawn
  attack: string;           // current attack name, or 'idle'
  attackT: number;          // s into current attack
  cooldown: number;         // s until next attack may start
  cycleIndex: number;       // position in the attack cycle
  partner: number;          // twin hens: other boss's enemy id; otherwise -1
  data: Record<string, number>; // JSON-safe scratch values
}
```

**`src/sim/waves.types.ts`** — owned by A3. A3 defines `WaveDef`/`GroupDef` itself (§7.12) and may add fields.

```ts
import type { Vec2, PickupKind } from './types';
import type { BossId } from './bosses.types';

export interface GroupRuntime {
  index: number;
  started: boolean;
  doneSpawning: boolean;
  spawned: number;
  total: number;            // planned spawn count (asteroids: rate × duration, floored)
  timer: number;            // s until next spawn
  t: number;                // s since group started
  anchor: Vec2;             // formation anchor (grid/swoop/divers/ring center)
  data: Record<string, number>;
}

export interface WaveRuntime {
  elapsed: number;
  groups: GroupRuntime[];
  spawnCounter: number;     // total spawns so far this wave (for carry plan)
  carryPlan: { spawnIndex: number; kind: PickupKind }[];
}

export interface WaveInfo {
  chapterName: string;
  waveName: string;
  isBoss: boolean;
  boss: BossId | null;
}

export function emptyWaveRuntime(): WaveRuntime {
  return { elapsed: 0, groups: [], spawnCounter: 0, carryPlan: [] };
}
```

### 6.6 Module API list (A1 writes compiling stubs for every module not yet implemented)

Stub bodies must compile and do nothing harmful (return `null`, `false`, `0`, a valid default object, or no-op). Each stub carries `// STUB(A1): owner A# implements`.

| File | Owner | Exports (exact) |
|---|---|---|
| `src/sim/rng.ts` | A1 | `rngNext(r: RngState): number` [0,1) · `rngRange(r, min, max): number` · `rngInt(r, min, maxInclusive): number` · `rngChance(r, p): boolean` · `rngPick<T>(r, arr: readonly T[]): T` |
| `src/sim/math.ts` | A1 | `clamp, lerp, dist, dist2, len, norm(v): Vec2, angleOf(v), fromAngle(a, length): Vec2, approach(cur, target, maxDelta), easeOutCubic(t), easeInOutSine(t), cubicBezier(p: CubicPath, t): Vec2, segmentCircleHit(a, b, halfWidth, c, r): boolean, deg(d): number` (degrees→radians) |
| `src/sim/ids.ts` | A1 | `newId(state): number` |
| `src/sim/difficulty.ts` | A1 | `DIFFICULTY: Record<Difficulty, DifficultyDef>` · `chapterScale(chapter): ChapterScale` · `loopIndex(chapter): number` |
| `src/sim/game.ts` | A1 | `NewGameOptions` · `createGame(opts): GameState` · `step(state, input, dt): void` · `canFire(state): boolean` · `continueEndless(state): void` · `NEUTRAL_INPUT: InputFrame` |
| `src/sim/combat.ts` | A1 | `damageEnemy(state, enemy, amount, source: DamageSource): boolean` (true if killed) · `killEnemy(state, enemy, byMissile): void` |
| `src/sim/collisions.ts` | A1 | `resolveCollisions(state): void` |
| `src/sim/pickups.ts` | A1 | `spawnPickup(state, kind, x, y, vx?, vy?): Pickup \| null` · `spawnDropsForEnemy(state, enemy): void` · `updatePickups(state, dt): void` · `collectPickup(state, p): void` |
| `src/sim/scoring.ts` | A1 | `addScore(state, base, at?: Vec2): number` (returns awarded) · `computeChapterBonus(state): ChapterBonus` · `emptyStats(): Stats` |
| `src/sim/debug.ts` | A1 | `DebugCommand` · `applyDebug(state, cmd): void` |
| `src/sim/player.ts` | A2 | `createPlayer(d: Difficulty): Player` · `updatePlayer(state, input, dt)` · `isPlayerVulnerable(state): boolean` · `killPlayer(state): void` |
| `src/sim/weapons.ts` | A2 | `updateWeapons(state, input, dt)` · `addPower(state, delta): void` · `applyWeaponGift(state, weapon): void` |
| `src/sim/projectiles.ts` | A2 | `ProjectileInit` · `spawnProjectile(state, init): Projectile \| null` · `updateProjectiles(state, dt)` · `clearEnemyProjectiles(state, center?: Vec2, radius?: number): void` · `countEggs(state): number` |
| `src/sim/missile.ts` | A2 | `updateMissile(state, input, dt)` · `detonateMissile(state, x, y)` |
| `src/sim/bosses.ts` | A2 | `spawnBoss(state, id: BossId): void` · `updateBoss(state, enemy, dt)` · `onBossDamaged(state, enemy)` · `onBossKilled(state, enemy)` |
| `src/sim/enemies.ts` | A3 | `ENEMY_DEFS: Record<EnemyKind, EnemyDef>` · `spawnEnemy(state, kind, x, y, behavior): Enemy \| null` · `updateEnemies(state, dt)` · `onEnemyKilled(state, enemy, byMissile)` · `dropEgg(state, enemy): void` |
| `src/sim/waves.ts` | A3 | `startWave(state)` · `updateWaveSpawner(state, dt)` · `isWaveComplete(state): boolean` · `waveInfo(chapter, wave): WaveInfo` |
| `src/render/index.ts` | A5 | `createRenderer(canvas: HTMLCanvasElement): Renderer` |
| `src/ui/index.ts` | A4 | `createUI(root: HTMLElement, cb: UICallbacks, deps: UIDeps): UI` |
| `src/ui/hud.ts` | A4 | `drawHud(ctx, state, sprites: SpriteApi, settings: Settings, fps: number): void` · `formatScore(n): string` |
| `src/ui/storage.ts` | A4 | `type KV = Pick<Storage, 'getItem' \| 'setItem' \| 'removeItem'>` · `safeStorage(): KV \| null` · `loadSettings(kv?): Settings` · `saveSettings(s, kv?): void` |
| `src/ui/highscores.ts` | A4 | `HighScore` · `loadHighScores(kv?): HighScore[]` · `qualifies(score, kv?): boolean` · `addHighScore(entry, kv?): number` (rank 0-9 or −1) |
| `src/audio/index.ts` | A4 | `createAudio(): AudioSystem` |

Default stub behavior A1 must give so the app runs in Phase 0: `createPlayer` returns a full valid Player (§7.3 defaults); `waveInfo` returns `{ chapterName: 'Chapter ' + c, waveName: 'Wave ' + w, isBoss: w === 10, boss: null }`; `isWaveComplete` returns `false`; `createRenderer` clears to black and prints `FOWL PLAY — M0` centered; `createUI` shows one "PLAY" button calling `onStart(getSettings().difficulty)`; `createAudio` is all no-ops; `drawHud` prints the score top-left.

### 6.7 `step()` order (A1, `src/sim/game.ts`) — exact

```ts
export function step(state: GameState, input: InputFrame, dt: number): void {
  state.events.length = 0;
  state.tick += 1;
  state.time += dt;
  state.phaseTimer += dt;
  updatePhase(state, input, dt);            // A1 — §7.10
  updatePlayer(state, input, dt);           // A2
  updateWeapons(state, input, dt);          // A2
  updateMissile(state, input, dt);          // A2
  if (state.phase === 'wave_intro' || state.phase === 'boss_intro' || state.phase === 'wave_active') {
    updateWaveSpawner(state, dt);           // A3
  }
  updateEnemies(state, dt);                 // A3 (calls A2 updateBoss for isBoss enemies)
  updateProjectiles(state, dt);             // A2
  updatePickups(state, dt);                 // A1
  updateHazards(state, dt);                 // A1: ttl -= dt; ttl <= 0 → alive = false
  resolveCollisions(state);                 // A1 — §7.6.4
  compact(state);                           // A1: remove entities with alive === false
}
```

Entities are never spliced out mid-step: set `alive = false`; `compact()` removes them. Entities spawned during a loop are appended and processed next tick (iterate with a cached length).

---

## 7. Gameplay specification

All values are for **Normal** difficulty in **chapter 1** before scaling, unless stated. Scaling rules are in §7.14.

### 7.1 Screen and play area

- World 1280×720. Ship confined to x ∈ [36, 1244], y ∈ [90, 640].
- Bottom HUD bar: y 676–720 (gameplay objects may pass behind it; eggs splat at `GROUND_Y` = 668).
- Enemies live mostly in the upper area (y 80–470); divers, kamikazes and the Rooster's dive enter the lower area.
- Enemies never drop eggs when below y = 520 or outside x ∈ [0, 1280].

### 7.2 Controls (A1 input → InputFrame; A2 applies them)

| Action | Mouse | Keyboard | Gamepad (P2) | Touch (P2) |
|---|---|---|---|---|
| Move | Ship follows pointer | Arrows / WASD | Left stick (deadzone 0.2) | Drag; ship sits 90 px above the finger |
| Fire (hold) | Left button | Space / Z / J | A (button 0) | Automatic while touching |
| Missile | Right button | X / K | B or X (buttons 1, 2) | Two-finger tap |
| Pause | — | Esc / P | Start (button 9) | Pause button on screen |
| Confirm/skip tally | Left click | Enter / Space | A | Tap |

- **Pointer steering** is active when `settings.mouseControl` is true and the mouse moved more than 4 px since the last keyboard movement key press. Pressing a movement key switches to keyboard steering (`pointer = null`) until the mouse moves again.
- `settings.autoFire` → `fire = true` every tick while playing.
- Edge-triggered inputs (`missile`, `skip`) are latched on keydown/mousedown and cleared when sampled, so a press is never lost or repeated.
- Debug keys (only with `?debug=1`): see §7.15.

### 7.3 Player ship (A2)

| Property | Value |
|---|---|
| Spawn / respawn position | (640, 600) |
| Hit radius | 14 (much smaller than the 64×56 sprite — forgiving) |
| Pickup radius | 36 |
| Keyboard speed | 480 px/s, diagonal normalized, no acceleration |
| Pointer steering | move straight toward pointer (clamped to bounds), at most 1100 px/s |
| Bank | target = clamp(vx / 600, −1, 1); bank approaches target at 8 units/s |
| Starting weapon / power / food / heat | pulse / 0 / 0 / 0 |
| Starting lives / missiles | per difficulty (§7.14) |
| Invulnerability at game start | 2.0 s |

**Vulnerable** = `alive && invulnTimer <= 0 && !state.debug.godMode`.

**Death** (`killPlayer`, no-op if not vulnerable):
1. `alive = false`; `lives -= 1`.
2. `power = max(0, power − deathPowerLoss)` (Easy 1, Normal 2, Hard 3). Weapon type is kept. Emit `power_changed` if it changed.
3. `heat = 0`, `overheated = false`, `fireCooldown = 0`.
4. `chapterStats.deaths++`, `runStats.deaths++`.
5. Emit `player_died { x, y, livesLeft: lives }`.
6. `respawnTimer = lives > 0 ? 1.5 : PHASE_TIME.gameOverDelay`.

**While dead:** `respawnTimer -= dt`. When it reaches 0 and `lives > 0`: `alive = true`, position = spawn, `invulnTimer = 3.0`, call `clearEnemyProjectiles(state, spawn, 200)`, emit `player_respawned`. If `lives === 0` the ship stays dead and A1 switches to `game_over` (§7.10).

**Invulnerability:** `invulnTimer -= dt` while alive. The ship can fire while invulnerable. Rendering shows a blink + shield (§8.3).

The ship can move during every phase while alive (including warp and chapter tally). It can fire only when `canFire(state)` is true: phase ∈ {wave_intro, boss_intro, wave_active, wave_clear}.

### 7.4 Weapons, power and heat (A2)

The player holds exactly one weapon. **Power** is an integer 0–10 shared across weapons.

**Firing loop (each tick, in `updateWeapons`):**
1. Cooling: `heat -= (overheated ? 40 : 30) × dt`, min 0. If `overheated && heat <= 25` → `overheated = false`, emit `heat_recovered`.
2. `fireCooldown -= dt`.
3. If `player.alive && canFire(state) && input.fire && !overheated && fireCooldown <= 0`:
   - Fire one **volley** (tables below) from the nose `(pos.x, pos.y − 26)`.
   - `fireCooldown = 1 / rate`.
   - `heat += heatPerVolley × (1 + 0.04 × power) × difficulty.heatMul`. If `heat >= 100` → `heat = 100`, `overheated = true`, emit `overheat`.
   - Emit `player_fire`. Add to `shotsFired` (chapter and run): number of bolts created, or 1 for an arc volley.

Bolts fly with the given speed; `ttl` 2.0 s; removed when y < −40 or outside x ∈ [−60, 1340]. Fan angles are measured from straight up (−90°), spread evenly across the total spread.

#### Pulse Blaster (`pulse`) — wide fan
Rate 7 volleys/s · speed 950 px/s · bolt radius 5 · heat 7/volley · pierce 1

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Bolts | 1 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 6 | 7 |
| Total spread (°) | 0 | 6 | 12 | 16 | 22 | 26 | 32 | 36 | 42 | 46 | 52 |
| Damage per bolt | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 2 |

#### Neutron Cannon (`neutron`) — focused heavy rounds
Rate 5/s · speed 1050 px/s · radius 7 · heat 8/volley · parallel bolts 14 px apart, all straight up · pierce 1

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Bolts | 1 | 1 | 2 | 2 | 2 | 3 | 3 | 3 | 4 | 4 | 4 |
| Damage per bolt | 3 | 4 | 3 | 4 | 5 | 4 | 5 | 6 | 5 | 6 | 7 |

#### Piercing Laser (`laser`) — rapid, passes through enemies
Rate 10/s · speed 1500 px/s · radius 4 · heat 5/volley · parallel beams 18 px apart, straight up

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Beams | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 |
| Pierce (enemies hit) | 1 | 2 | 3 | 2 | 3 | 4 | 5 | 4 | 5 | 6 | 8 |
| Damage | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 2 | 2 |

#### Arc Caster (`arc`) — auto-targeting chain lightning (hitscan)
Rate 5/s · heat 10/volley · range = 320 + 20 × level · chain hop range 170

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Targets per volley | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 |
| Damage per target | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 6 | 7 | 8 |

- First target: the nearest alive, non-invulnerable enemy that is above the ship (`enemy.y < ship.y`), within range, and within ±60° of straight up from the nose.
- Each next target: nearest alive enemy within 170 px of the previous target that has not been hit this volley.
- Damage is applied immediately via `damageEnemy(…, 'arc')`. Emit `arc { points: [nose, t1, t2, …] }`.
- If no first target exists, fire one straight bolt (`weapon: 'arc'`, speed 1000, radius 5, damage 1) so the weapon is never useless.
- Volley counts as a hit for accuracy if at least one target was struck.

#### Power and gifts
- `addPower(state, delta)`: clamp to 0..10, emit `power_changed` if the value changed. If `delta > 0` and power was already 10 → `addScore(state, 500, player.pos)` instead.
- `applyWeaponGift(state, w)`: if `w !== player.weapon` → switch weapon (power unchanged), emit `weapon_changed`. If same weapon → `addPower(state, +1)`.

**Balance intent (A2 tunes in M3, keeps the shape):** Pulse = coverage, weakest per target. Neutron = best single-target/boss DPS. Laser = crowd lines and armored rows. Arc = easy aiming, weak against bosses. Heat: continuous fire at power 0 overheats in about 5–10 s; at power 10 in about 2.5–4 s.

### 7.5 Food and missiles

- Food counter `player.food` 0–99. Drumstick +1, roast +10. Whenever `food >= 100`: `food -= 100`, `missiles = min(99, missiles + 1)`, emit `missile_gained` (loop, a roast can cross the threshold).
- **Missile (A2, `updateMissile`):** on `input.missile` with `missiles > 0`, `missileCooldown <= 0`, `player.alive`, `canFire(state)`:
  - `missiles -= 1` (not when `debug.infiniteMissiles`), `missileCooldown = 1.0`.
  - Spawn a `missile` projectile at the nose aimed at (640, 300), flight time 0.55 s (`vel = (target − nose) / 0.55`, `ttl = 0.55`). Emit `missile_launched`.
  - When its ttl reaches 0 → `detonateMissile(state, 640, 300)`; the projectile dies.
- **Detonation:** every alive non-boss enemy whose center is within x ∈ [−40, 1320], y ∈ [−40, 760] → `damageEnemy(e, 9999, 'missile')` (drops and points are still awarded; asteroids do NOT split). Every alive, non-invulnerable boss → `damageEnemy(boss, 60, 'missile')`. All enemy projectiles die (eggs killed this way do not splat). Emit `missile_detonated`.

### 7.6 Enemies (A3 defines; A1 resolves damage)

#### 7.6.1 Enemy table (base values)

| Kind | Radius | HP | Points | Egg rate (/s) | Food drop | Notes |
|---|---|---|---|---|---|---|
| `chicken_basic` (B) | 22 | 1 | 100 | 0.05 | drumstick | |
| `chicken_red` (R) | 24 | 3 | 250 | 0.07 | drumstick | |
| `chicken_armored` (A) | 26 | 7 | 500 | 0.08 | roast | dented sprite below 50% HP |
| `chicken_ufo` (U) | 30 | 5 | 400 | 0.04 | roast | aimed shot every 2.5–4.0 s (random each time) |
| `chick` (C) | 14 | 1 | 50 | 0 | drumstick 20% | fast, small, swarms |
| `asteroid_l` | 40 | 8 | 200 | 0 | none | splits into 2 × M |
| `asteroid_m` | 26 | 3 | 100 | 0 | none | splits into 2 × S |
| `asteroid_s` | 14 | 1 | 50 | 0 | none | |
| `boss_*` | §7.13 | §7.13 | §7.13 | — | §7.8 | spawned only by A2 |

`spawnEnemy` (A3) builds the Enemy from `ENEMY_DEFS`, applies scaling (§7.14) to HP (rounded, min 1), points (rounded to nearest 10) and egg rate, assigns `carries` from the wave's carry plan (§7.8), and returns `null` when `enemies.length >= MAX_ENEMIES`. For boss kinds it uses base values only; A2 overrides HP/points.

#### 7.6.2 Common enemy rules (A3)
- `age += dt`, `hitFlash = max(0, hitFlash − dt)` every tick.
- `rotation`: chickens tilt with horizontal speed, `clamp(vel.x / 800, −0.25, 0.25)`; asteroids spin by `drift.spin`; bouncers wobble ±0.15 rad.
- **Egg dropping** (`dropEgg` / inside `updateEnemies`): each tick, if `canDropEggs && eggRate > 0` and position inside the egg zone (§7.1) and `countEggs(state) < difficulty.eggCap`, drop with probability `eggRate × dt` (via `rngChance`). Diving chickens use 3× rate.
- **Lost-enemy guard:** any non-boss enemy outside x ∈ [−400, 1680] or y ∈ [−400, 1120] for more than 5 consecutive seconds is removed silently (`alive = false`, no points, no drops). Prevents stuck waves.
- **UFO shots:** aimed at the player's current position, `enemy_shot`, speed 300 × `shotSpeed` × chapter speed; emit `enemy_shot`. No shot if the player is dead.

#### 7.6.3 Damage and death (A1, `combat.ts`)

`damageEnemy(state, e, amount, source)`:
1. If `!e.alive || e.invulnerable` → return false.
2. `e.hp -= amount`; `e.hitFlash = 0.06`; emit `enemy_hit`.
3. If `e.isBoss` → `onBossDamaged(state, e)` (A2; handles phase thresholds).
4. If `e.hp <= 0` → `killEnemy(state, e, source === 'missile')`; return true.

`killEnemy(state, e, byMissile)`:
1. `e.alive = false`; emit `enemy_killed`.
2. `addScore(state, e.points, e.isBoss ? e.pos : undefined)`.
3. `chapterStats.kills++`, `runStats.kills++`.
4. `spawnDropsForEnemy(state, e)` (§7.8).
5. If `e.isBoss` → `onBossKilled(state, e)` (A2) else `onEnemyKilled(state, e, byMissile)` (A3: asteroid splitting).

#### 7.6.4 Collisions (A1, `resolveCollisions`) — circle vs circle unless noted
1. **Player bolts vs enemies:** for each alive `bolt`, test alive enemies not in `hitIds`. Invulnerable enemy → bolt dies, no damage. Otherwise `damageEnemy(…, 'bolt')`, push id to `hitIds`, on the bolt's first hit add 1 to `shotsHit`, `pierceLeft -= 1`; at 0 the bolt dies and stops testing.
2. **Enemy projectiles vs player** (only if vulnerable): hit → `killPlayer`, projectile dies.
3. **Enemies vs player** (only if vulnerable): distance < (enemy.radius + player.radius) × 0.85 → `killPlayer`; if the enemy is not a boss, `damageEnemy(e, 10, 'contact')`.
4. **Lethal hazards vs player** (only if vulnerable): `segmentCircleHit(a, b, width/2, player.pos, player.radius)` → `killPlayer`.
5. **Pickups vs player** (only if alive): distance < `pickupRadius + pickup.radius` → `collectPickup`.

### 7.7 Enemy projectiles (A2 implements movement; spawned by A2 and A3)

| Kind | Radius | Motion | Removed when | Notes |
|---|---|---|---|---|
| `egg` | 8 | vel (0, 60), accel (0, 420), max speed 420 × `eggSpeed` | y ≥ `GROUND_Y` → emit `egg_splat` | spawned at enemy (x, y + radius × 0.6); emit `egg_dropped` |
| `enemy_shot` | 7 | straight, 300 × `shotSpeed` | ttl 6 s or off-screen | aimed |
| `boss_egg` | 10 | straight, 240 × `shotSpeed` | ttl 6 s or off-screen | no gravity |
| `feather_knife` | 8 | straight, 190 × `shotSpeed` | ttl 6 s or off-screen | `rotation = angleOf(vel) + π/2` |

Off-screen for enemy projectiles = outside x ∈ [−60, 1340], y ∈ [−120, 780]. `spawnProjectile` returns `null` when `projectiles.length >= MAX_PROJECTILES`. Boss eggs and boss egg-rain eggs ignore `eggCap`.

### 7.8 Pickups and drops (A1)

| Kind | Radius | Motion | On collect |
|---|---|---|---|
| `drumstick` | 14 | pops up: vy −140, vx ±40 random; gravity 380; max fall 300; spins 4 rad/s | food +1, `addScore(100, pos)` |
| `roast` | 18 | same as drumstick, spins 2 rad/s | food +10, `addScore(1000, pos)` |
| `power_core` | 16 | falls 130 px/s, sways ±20 px at 1 Hz | `addPower(+1)` |
| `gift_<weapon>` | 20 | falls 110 px/s, sways ±30 px at 1.2 Hz, gentle spin | `applyWeaponGift(weapon)` |

- Pickups are removed when y > 760 (missed). `spawnPickup` returns `null` at `MAX_PICKUPS`.
- On collect: `chapterStats.foodCollected` / `runStats.foodCollected` += food units; emit `pickup_collected`; food → missile conversion per §7.5.

**`spawnDropsForEnemy(state, e)` for non-boss enemies:**
1. Food per §7.6.1 table (chick: 20% chance).
2. If `e.carries` → spawn that pickup too.
3. Otherwise roll once: power core 2.5% (asteroids 3%), else gift 1.2% (weapon uniformly random).
Missile kills drop the same.

**Boss drops:** 12 roasts in a burst (vx ±200, vy −300…−100, gravity applies), 2 power cores, 1 gift whose weapon differs from the player's current weapon.

**Carry plan (A3, built in `startWave`):** every non-boss wave guarantees exactly 1 power core; waves 3, 6 and 9 additionally guarantee 1 gift (uniform random weapon). Choose spawn indices uniformly in [0, floor(0.8 × plannedTotal)) using the rng; assign `carries` when that spawn index is created. If the carrier leaves the screen and is removed, the drop is lost (acceptable).

### 7.9 Scoring and lives (A1)

- `addScore(state, base, at?)`: `amount = round(base × difficulty.scoreMul)`; `score += amount`; if `at` given emit `score_popup`. Then while `score >= nextExtraLifeAt`: if `lives < 9` → `lives++`, emit `extra_life`; always `nextExtraLifeAt += 100_000`. Returns `amount`.
- Kill points: `enemy.points` (no popup for regular kills; bosses get a popup).
- Pickups: drumstick 100, roast 1,000, power core or same gift at max power 500.
- Boss points: §7.13.
- **Chapter bonus** (`computeChapterBonus`, applied when the boss wave is cleared):
  - `accuracyPct = shotsFired > 0 ? floor(100 × shotsHit / shotsFired) : 0`; accuracy bonus = `accuracyPct × 200` (max 20,000).
  - Food bonus = `chapterStats.foodCollected × 50`.
  - Flawless bonus = 25,000 if `chapterStats.deaths === 0`, else 0.
  - Firepower bonus = `player.power × 1,000`.
  - `total` = raw sum. Score receives `addScore(state, total)` (multiplier applied there).

### 7.10 Game flow — phase machine (A1, `updatePhase`)

`setPhase(p)` sets `phase = p`, `phaseTimer = 0`. Banner ttl counts down each tick; at 0 → `banner = null`.

**`beginWave(state)`:** `info = waveInfo(chapter, wave)`; set `chapterName`, `waveName`; `bossName = null`; `bossThresholds = []`; `startWave(state)` (A3; for a boss wave this calls `spawnBoss`, which sets `bossName` and `bossThresholds`); emit `wave_start`.
- Boss wave → banner `{ style: 'boss', title: 'WARNING', subtitle: bossName + ' APPROACHING', ttl: 3.0 }`, emit `boss_warning`, `setPhase('boss_intro')`.
- Wave 1 → banner `{ style: 'wave', title: 'CHAPTER ' + chapter + ': ' + chapterName.toUpperCase(), subtitle: 'Wave 1 — ' + waveName, ttl: 2.5 }`, `setPhase('wave_intro')`.
- Other waves → banner `{ style: 'wave', title: 'WAVE ' + wave, subtitle: waveName, ttl: 2.0 }`, `setPhase('wave_intro')`.

**Transitions:**

| Phase | Rule |
|---|---|
| `wave_intro` | after 2.0 s → `wave_active` (A3 delays first spawns by group delay, default 0.8 s, so enemies arrive under the banner) |
| `boss_intro` | after 3.0 s → `wave_active` (boss enters during this time, invulnerable) |
| `wave_active` | if `isWaveComplete(state)` → emit `wave_cleared`, banner `{ style: 'small', title: 'WAVE CLEARED', ttl: 1.2 }`, `wave_clear` |
| `wave_clear` | after 1.5 s: if `wave < 10` → `wave++`, `beginWave`; else → `bonus = computeChapterBonus`, `lastChapterBonus = bonus`, `addScore(bonus.total)`, emit `chapter_complete`, `chapter_complete` |
| `chapter_complete` | after 5.0 s, or after 1.5 s if `input.skip`: if `chapter === FINAL_CHAPTER && !endless` → emit `victory`, banner `{ style: 'big', title: 'COOP LIBERATED!' }`, `victory`; else emit `warp_start`, banner `{ style: 'small', title: 'WARP TO CHAPTER ' + (chapter+1), ttl: 2.5 }`, `warp` |
| `warp` | after 3.0 s → `chapter++`, `wave = 1`, `chapterStats = emptyStats()`, `beginWave` |
| `game_over`, `victory` | nothing (the app reacts to the events) |

**Global check every tick (except in `game_over`/`victory`):** if `!player.alive && player.lives === 0 && player.respawnTimer <= 0` → emit `game_over`, banner `{ style: 'big', title: 'GAME OVER', ttl: 999 }`, `setPhase('game_over')`.

**`continueEndless(state)`:** `endless = true`; emit `warp_start`; `setPhase('warp')`.

**`createGame(opts)`:** `NewGameOptions = { seed: number; difficulty: Difficulty; startChapter?: number; startWave?: number; debug?: Partial<DebugFlags> }`. Initializes every GameState field (rng from seed, player via `createPlayer`, `score 0`, `nextExtraLifeAt 100_000`, `waveRt = emptyWaveRuntime()`, empty arrays, `nextId 1`), then `beginWave`.

**`RunSummary`** (built by A1 for the UI): score, chapter, wave, difficulty, `accuracyPct` from `runStats`, kills, victory flag.

### 7.11 Movement patterns (A3)

A wave is a list of **groups**; each group has a pattern, parameters, and a start `delay` in seconds from wave start (default 0.8). All pattern speeds are multiplied by `chapterScale(chapter).speed`. Kind letters: **B** basic, **R** red, **A** armored, **U** UFO, **C** chick. Row kinds are listed top row first.

Every enemy has `canDropEggs = false` while in `enter_path`, `return`, `bounce.entering`, or before its group's entry animation finishes; then `true`.

#### `grid` — classic formation
Params: `rows, cols, rowKinds[], spacingX = 80, spacingY = 60, topY = 110, swayPeriod = 5, bobAmp = 10, bobPeriod = 3, descendRate = 0, maxBottomY = 440`.
- Slots: `slot = (−(cols−1)·spacingX/2 + c·spacingX, r·spacingY)` relative to the anchor. Enemy position = anchor + slot + individual bob `(0, 4·sin(4t + id))`.
- **Entry:** the anchor starts at `(640, topY − rows·spacingY − 100)` and eases (easeOutCubic) to `(640, topY)` over 2.0 s. All members spawn at once at group start.
- **Sway:** `swayAmp = min(140, (1280 − (cols−1)·spacingX)/2 − 60)`; `anchor.x = 640 + swayAmp·sin(2π·t/swayPeriod)`, `anchor.y = topY + bobAmp·sin(2π·t/bobPeriod)` (+ descent).
- **Descent:** if `descendRate > 0`, the base y increases by `descendRate·dt` until the bottom row reaches `maxBottomY`.
- Formation does not compact when members die.

#### `stream` — lines flying across the screen
Params: `groups, perGroup, kinds, sides[] ('L'|'R'), baseYs[], amp = 60, freq = 0.012 (rad/px), speed = 220, spacing = 0.35 s, groupGap = 1.2 s`.
- Sub-group g starts at `delay + g·groupGap`; its members spawn every `spacing` s at x = −60 (side L, dir +1) or x = 1340 (side R, dir −1), y = `baseYs[g]`.
- Motion: `x += dir·speed·dt`; `y = baseY + amp·sin(freq·x + phase)`.
- On passing x > 1340 (dir +1) or x < −60 (dir −1): reverse `dir`, `baseY += 70`; if `baseY > 380` → `baseY = 140`. They loop until killed.

#### `swoop` — fly-in curves that settle into a formation
Params: grid params + `streams = 4, memberGap = 0.18 s, streamGap = 1.6 s, pathDuration = 2.4 s`.
- Slots as in `grid` with the anchor fixed at `(640, topY)`. Members are split into `streams` equal parts in row-major slot order.
- Stream k enters on the LEFT curve if k is even, RIGHT if odd. LEFT: `p0 (−80, 520)`, `p1 (300, 60)`, `p2 (760, 640)`, `p3 = slot world position`. RIGHT mirrors x (`x → 1280 − x`).
- Members spawn every `memberGap` within a stream; streams start every `streamGap`. Each follows its path (`enter_path`) then switches to `formation`.
- Sway begins only after every member has arrived, ramping amplitude from 0 to full over 1.0 s.

#### `ring` — rotating circles
Params: `rings[]: { n, r, kind, omega (rad/s, sign = direction) }, center = (640, 250), driftAmp = 180, driftPeriod = 8, pulseAmp = 20, pulsePeriod = 3`.
- Member i of a ring: angle `2π·i/n + omega·t`; radius `r + pulseAmp·sin(2π·t/pulsePeriod)`.
- Center x = `640 + driftAmp·sin(2π·t/driftPeriod)`.
- **Entry:** all spawn at once; radius starts at 900 and eases to `r` over 2.0 s.

#### `divers` — formation whose members dive at the player
Params: grid params + `interval, simultaneous = 1, diveDuration = 1.6 s, returnDuration = 1.2 s`.
- Behaves as `grid` (entry and sway). After the entry finishes, every `interval` seconds pick `simultaneous` random members in `formation` state and start a dive.
- Dive path: cubic from current position `p0`; `p1 = (p0.x, p0.y + 200)`; `p2 = (player.x, 600)`; `p3 = (player.x + (player.x < 640 ? 160 : −160), 800)`, where `player.x` is captured at dive start. Duration `diveDuration / speedScale`. Egg rate ×3 while diving.
- When the path ends: teleport to `(slot world x, −50)`, then `return` (lerp to the live slot position over `returnDuration`, no eggs), then `formation`.

#### `bouncers` — chickens bouncing around a box
Params: `count, kinds (list or counts), speedMin = 160, speedMax = 240, ceilY = 80, floorY = 470`.
- Spawn every 0.25 s at random x ∈ [100, 1180], y = −40, moving down at 200 px/s (`entering`). Once y > `ceilY + 20`: pick a random direction with downward or sideways bias (angle 20°–160°) and random speed in range; reflect off x = 30, x = 1250, y = `ceilY`, y = `floorY`.

#### `asteroids` — timed rock field
Params: `duration, rate (/s), from: 'tr' | 'tl' | 'both', mix = { l: 0.2, m: 0.4, s: 0.4 }`.
- During `duration` seconds spawn at `rate` (with `both`, alternate sides). Planned total = `floor(rate × duration)`.
- From `tr`: position random on the top edge (x ∈ [400, 1400], y = −60) or right edge (x = 1340, y ∈ [−60, 300]) — 50/50. Velocity angle 125°–145° (down-left), speed L 160–220, M 200–260, S 240–300. `tl` mirrors (angle 35°–55°, left/top edges).
- Spin random ±2 rad/s. Removed silently once fully off-screen on the exit sides (no points).
- **Split** (in `onEnemyKilled`, not when `byMissile`): L → 2 M, M → 2 S at the same position; velocities = parent velocity rotated ±25°, speed ×1.15.
- Group is done when the duration has elapsed and every asteroid it spawned (and their children) is gone.

#### `ufo` — saucers patrolling lanes and shooting
Params: `count, lanes = [130, 200, 270, 340], speedMin = 150, speedMax = 220, gap = 0.6 s`.
- UFO i: lane `lanes[i % lanes.length]`; enters from the left if i is even (dir +1) else right; ping-pongs between x = 80 and x = 1200.
- `shotTimer` starts at a random 1.0–2.5 s, then resets to a random 2.5–4.0 s after each shot (§7.6.2).

#### `swarm` — flock of chicks following a leader
Params: `count, kamikazeInterval = 6, kamikazeFraction = 0.1, maxSpeed = 320, maxAccel = 900`.
- Spawn every 0.05 s at random x ∈ [100, 1180], y = −30. Each chick has a random offset in a disk of radius 150.
- Leader point `L(t) = (640 + 480·sin(0.5t), 220 + 110·sin(0.9t + 1))`. Each chick steers toward `L + offset`: `desired = norm(target − pos)·maxSpeed`; velocity approaches `desired` by at most `maxAccel·dt`.
- Every `kamikazeInterval` s, `ceil(alive × kamikazeFraction)` random chicks switch to `kamikaze`: fly straight toward the player's position at that moment at 380 px/s; after y > 780 they reappear at y = −30 and return to `follow`.

#### `boss`
Params: `boss: BossId`. The spawner calls `spawnBoss(state, boss)` once (A2). The group is done spawning immediately; the wave completes when no enemies remain.

**`isWaveComplete(state)`** = every group has started and finished spawning (asteroids: duration over) AND `state.enemies` has no alive enemy.

### 7.12 Chapters and waves (A3, `src/sim/chapters.ts`)

Chapter `n > 5` (endless) reuses chapter `((n−1) % 5) + 1` with name suffix ` II`, ` III`, … (roman numeral of loop + 1); scaling continues with `n` (§7.14). Background palette is A5's concern (§8.4) but listed here for reference.

**Chapter 1 — "Low Orbit"** · palette #0B0B2B → #2A1B5C

| W | Name | Groups |
|---|---|---|
| 1 | First Contact | grid 4×8 rows B,B,B,B |
| 2 | Feathered Stream | stream 3 × 10 B · sides L,R,L · baseY 160/240/320 · amp 60 · speed 220 |
| 3 | Red Alert | grid 5×8 rows R,B,B,B,B |
| 4 | Rock Garden | asteroids 20 s · 1.2/s · from tr · mix .2/.4/.4 |
| 5 | Merry-Go-Round | ring [n10 r100 B +0.9] [n16 r190 B −0.9] |
| 6 | Bounce House | bouncers 12 R |
| 7 | Galactic Parade | swoop 4×8 rows B,B,B,B |
| 8 | Kamikaze Coop | divers 4×6 rows R,B,B,B · interval 2.5 · 1 at a time |
| 9 | The Wall | grid 5×10 rows A,R,R,B,B |
| 10 | BOSS | boss hen |

**Chapter 2 — "Asteroid Belt"** · #10202B → #3B2A1A

| W | Name | Groups |
|---|---|---|
| 1 | Welcome Committee | swoop 4×8 rows R,B,B,B |
| 2 | Meteor Shower | asteroids 25 s · 1.6/s · from tl |
| 3 | Chick Storm | swarm 36 C |
| 4 | Triple Spin | ring [n8 r80 B +1.0] [n14 r145 B −1.0] [n20 r210 R +1.0] |
| 5 | Saucer Squadron | ufo 4 U ; stream 2 × 8 B · sides L,R · baseY 300/360 · delay +2.0 |
| 6 | Dive Bombers | divers 5×8 rows R,R,B,B,B · interval 2.0 · 1 |
| 7 | Crossfire Rocks | asteroids 25 s · 1.8/s · from both |
| 8 | Armored Front | grid 6×10 rows A,A,R,R,B,B |
| 9 | Pinball | bouncers 16 (8 R + 8 B) |
| 10 | BOSS | boss carrier |

**Chapter 3 — "Gas Giant Run"** · #2B0F2E → #7A2E1E

| W | Name | Groups |
|---|---|---|
| 1 | Hot Wings | grid 5×10 rows R,R,B,B,B · descendRate 3 |
| 2 | Double Helix | stream 4 × 12 B · sides L,R,L,R · baseY 150/210/270/330 · amp 90 |
| 3 | Chick Flood | swarm 50 C |
| 4 | Saucer Escort | ufo 6 U |
| 5 | Spin Cycle | ring [n10 r80 R +1.2] [n16 r145 R −1.2] [n22 r210 B +1.2] |
| 6 | Iron Parade | swoop 5×8 rows A,R,R,B,B |
| 7 | Gravel Pit | asteroids 30 s · 2.0/s · from tr · mix .3/.4/.3 |
| 8 | Rain of Feathers | divers 5×10 rows A,R,R,B,B · interval 1.6 · 2 |
| 9 | Rubber Chickens | bouncers 20 (6 A + 14 R) |
| 10 | BOSS | boss rooster |

**Chapter 4 — "Ice Moons"** · #061A33 → #1E4E79

| W | Name | Groups |
|---|---|---|
| 1 | Cold Front | swoop 5×10 rows A,R,R,B,B |
| 2 | Blizzard | asteroids 30 s · 2.2/s · from both |
| 3 | Snow Chicks | swarm 60 C |
| 4 | Frozen Orbit | ring [n8 r60 A +1.1] [n12 r110 A −1.1] [n16 r160 R +1.1] [n20 r210 R −1.1] |
| 5 | UFO Blockade | ufo 8 U |
| 6 | Avalanche | divers 6×10 rows A,A,R,R,B,B · interval 1.4 · 2 |
| 7 | Glacier | grid 6×12 rows A,A,R,R,R,B · descendRate 4 |
| 8 | Hailstorm | stream 4 × 14 R · sides L,R,L,R · baseY 150/210/270/330 · amp 80 · speed 260 |
| 9 | Ice Rink | bouncers 24 (12 A + 12 R) |
| 10 | BOSS | boss twin_hens |

**Chapter 5 — "The Mother Coop"** · #1A0505 → #4A0E0E

| W | Name | Groups |
|---|---|---|
| 1 | Last Stand | grid 6×12 rows A,A,A,R,R,R |
| 2 | Debris Field | asteroids 35 s · 2.4/s · from both · mix .3/.4/.3 |
| 3 | Brood War | swarm 70 C ; ufo 2 U · delay +3.0 |
| 4 | Saucer Storm | ufo 8 U ; stream 2 × 12 R · sides L,R · baseY 300/360 · delay +2.0 |
| 5 | Vortex | ring [n8 r60 A +1.4] [n14 r110 R −1.4] [n18 r160 A +1.4] [n22 r210 R −1.4] |
| 6 | Final Parade | swoop 6×10 rows A,A,R,R,R,B |
| 7 | Kamikaze Sky | divers 6×12 rows A,A,R,R,R,R · interval 1.2 · 3 |
| 8 | Chaos Bounce | bouncers 28 (14 A + 14 R) ; swarm 20 C · delay +4.0 |
| 9 | The Gauntlet | grid 6×12 rows A,A,A,A,R,R · descendRate 5 ; ufo 2 U · delay +5.0 |
| 10 | BOSS | boss dreadnought |

"delay +N" means that group starts N seconds after the wave's first group. Bouncer counts like "(8 R + 8 B)" mean a shuffled list with those counts.

### 7.13 Bosses (A2, `src/sim/bosses.ts` and `src/sim/bosses/*.ts`)

**Common rules**
- `spawnBoss(state, id)` creates the boss enemy (or two for Twin Hens) via A3's `spawnEnemy(state, kind, x, y, { type: 'boss', rt })`, then sets `hp = maxHp = round(baseHp × difficulty.bossHp × chapterScale(chapter).bossHp)`, `points`, `isBoss = true`, `invulnerable = true`, `canDropEggs = false`; sets `state.bossName = BOSS_INFO[id].name` and `state.bossThresholds = BOSS_INFO[id].thresholds`.
- **Entry:** from `(640, −200)` (Twin Hens: x 400 and 880) to the home position over the entry time with easeOutCubic. `invulnerable` stays true until entry ends.
- **Attack cycle:** after entry, attacks run in the listed order and loop. A new attack starts when the previous one has finished and `cooldown` (the gap) has elapsed. Emit `boss_attack { attack }` when an attack starts.
- **Phase thresholds** checked in `onBossDamaged`: when `hp / maxHp` first drops to or below a threshold, advance `phase`, emit `boss_phase` once, apply the phase changes.
- **Telegraphs:** a hazard with `kind 'telegraph'`, `lethal false`; emit `telegraph` when created. **Beams:** `kind 'beam'`, `lethal true`; A2 updates `a`/`b` each tick while active.
- Bosses never take contact damage. Contact kills the player.
- `onBossKilled`: emit `boss_killed { kind, x, y, radius }`; clear all enemy projectiles and the boss's hazards; drops per §7.8 are spawned by A1's `spawnDropsForEnemy`.
- `enemy.anim` = frame index for rendering (see §8.2).
- All boss projectile speeds × `difficulty.shotSpeed`. Aimed shots aim at the player's current position (straight down if the player is dead).

| Boss | Kind | Base HP | Points | Radius | Home | Entry |
|---|---|---|---|---|---|---|
| Mother Hen | `boss_hen` | 900 | 10,000 | 95 | (640, 170) | 2.5 s |
| Egg Carrier | `boss_carrier` | 1,300 | 15,000 | 105 | (640, 160) | 2.5 s |
| Rooster Commander | `boss_rooster` | 1,700 | 20,000 | 85 | (640, 150) | 2.5 s |
| Twin Hens | 2 × `boss_hen` | 650 each | 8,000 each | 95 | (400, 170) / (880, 170) | 2.5 s |
| Coop Dreadnought | `boss_dreadnought` | 3,600 | 50,000 | 130 | (640, 165) | 3.0 s |

#### Mother Hen
- **Move:** `x = 640 + 380·sin(2π·t/7)`, `y = 170 + 25·sin(2π·t/2.3)`. Phase 1: period 5 s instead of 7.
- **Cycle:** `egg_fan` → `egg_rain` → (phase 1 only) `brood`. Gap 1.4 s (phase 1: 1.0 s).
  - `egg_fan`: 3 volleys 0.45 s apart; each volley 7 `boss_egg` (phase 1: 9) spread evenly from 60° to 120°, speed 240, from (x, y + 70).
  - `egg_rain`: 2.5 s; normal gravity `egg`s at x = boss.x + random(−90, 90), y = boss.y + 60, at 7/s (phase 1: 10/s).
  - `brood`: spawn 5 `chick` at the boss position with `{ type: 'seek', speed: 260, turnRate: 2.5, heading: π/2 }` — skip if 8 brood chicks are already alive. Seek: heading turns toward the player by at most `turnRate·dt`; velocity = heading × speed; chicks leaving the screen are removed silently.
- **Phase 1** at ≤ 50% HP. `anim` = wing-flap frame (0/1 alternating at 6 fps).

#### Egg Carrier
- **Move:** x approaches `player.x` at max 90 px/s (phase ≥ 1: 140), clamped to [220, 1060]; `y = 160 + 15·sin(t)`.
- **Cycle:** `turret_burst` → `hatch` → `spiral`. Gap 1.2 s.
  - `turret_burst`: 5 bursts 0.35 s apart; each fires one aimed `enemy_shot` (speed 320) from each turret at (x ± 75, y + 40).
  - `hatch`: telegraph 0.6 s (hatch-open, emit `telegraph`), then release 5 `chicken_basic` from (x, y + 80) with `stream` behavior (dir alternating ±1, speed 220, baseY 260, amp 50, freq 0.012). Skip release if 10 hatchlings are alive.
  - `spiral`: 3.0 s; every 1/12 s fire an `enemy_shot` from the center at speed 210; angle starts at 90° and advances 17° per shot. From phase 2 fire two arms (angle and angle + 180°).
- **Phases** at 66% and 33% (cracks): each multiplies gaps by 0.8 and projectile speeds by 1.1. `anim` = phase (0, 1, 2 = crack stage).

#### Rooster Commander
- **Idle move:** figure-8 `x = 640 + 360·sin(0.7t)`, `y = 150 + 50·sin(1.4t)`.
- **Cycle:** `dive` → `laser_sweep` → `feather_ring`. Gap 1.1 s (phase 1: 0.8 s).
  - `dive`: capture `tx = player.x`; telegraph a vertical hazard from (tx, boss.y) to (tx, 720), width 120, ttl 1.2. Slide horizontally to tx over 0.5 s, wait until 0.7 s, dive to y = 560 over 0.45 s, hold 0.2 s, return to the figure-8 path over 0.8 s.
  - `laser_sweep`: stop moving. Telegraph a thin line (width 6) from the beak (x, y + 50) at 90° for 0.8 s; then a lethal beam (width 26, length 800) sweeping from 60° to 120° (alternate direction each time) over 1.6 s.
  - `feather_ring`: 3 rings 0.5 s apart; each ring 16 `feather_knife` (phase 1: 22) evenly spaced around 360°, rotated +11° per ring, speed 190.
- **Phase 1** at ≤ 40%: once, spawn 2 `chicken_ufo` with `{ type: 'lane', laneY: 300 / 360, speed: 180, dir: ±1, shotTimer: 2 }` entering from opposite sides.
- `anim`: 1 while an attack is active, else 0.

#### Twin Hens
- Two Mother Hens with base HP 650 each. Hen B uses the mirrored movement (`x = 640 − 380·sin(2π·t/7)`) and its attack cycle starts half a cycle (2.0 s) later.
- No HP thresholds of their own. When one dies, the survivor immediately enters phase 1 (if not already) and multiplies its gaps by 0.85.
- `rt.partner` holds the other hen's enemy id. HUD shows the combined HP of all alive bosses against their combined max.

#### Coop Dreadnought (final)
- **Move:** `x = 640 + 300·sin(0.4t)`, `y = 165`.
- **Phase 0 (100–66%):** Carrier attack set with 4 turrets at x ± 70 and x ± 140, spiral with 2 arms.
- **Phase 1 (66–33%):** Mother Hen set: egg_fan with 11 eggs, egg_rain at 10/s, brood of 6.
- **Phase 2 (33–0%):** Rooster set: laser_sweep with two mirrored beams (60°→120° and 120°→60° simultaneously), feather_ring with 24 knives. No dive.
- **Phase change:** 1.5 s invulnerable, clear all enemy projectiles and hazards, emit `boss_phase`. `anim` = phase.

**Boss balance intent:** at expected firepower (power 5–7 in chapter 1, 8–10 later) each boss fight lasts 45–90 s on Normal.

### 7.14 Difficulty and scaling (A1, `src/sim/difficulty.ts`)

| Field | Easy | Normal | Hard |
|---|---|---|---|
| `lives` | 7 | 5 | 3 |
| `missiles` (start) | 2 | 1 | 0 |
| `enemyHp` | 0.75 | 1.0 | 1.4 |
| `bossHp` | 0.75 | 1.0 | 1.4 |
| `eggRate` | 0.6 | 1.0 | 1.5 |
| `eggSpeed` | 0.85 | 1.0 | 1.15 |
| `shotSpeed` | 0.85 | 1.0 | 1.15 |
| `heatMul` | 0.6 | 1.0 | 1.15 |
| `scoreMul` | 0.75 | 1.0 | 1.5 |
| `eggCap` (eggs alive at once) | 12 | 24 | 40 |
| `deathPowerLoss` | 1 | 2 | 3 |

`chapterScale(c)`:
- `hp = 1 + 0.15·(c − 1)` (non-boss enemies; multiplied with `enemyHp`)
- `eggRate = 1 + 0.10·(c − 1)`
- `points = 1 + 0.10·(c − 1)`
- `speed = min(1.5, 1 + 0.04·(c − 1))`
- `bossHp = 1 + 0.25·loopIndex(c)` where `loopIndex(c) = floor((c − 1) / 5)`

### 7.15 Debug and developer tools (A1)

URL parameters: `?debug=1&seed=42&difficulty=hard&chapter=3&wave=10&god=1&gallery=1`.
- `chapter`/`wave` start the game there (skip the title when present with `debug=1`).
- `god=1` sets `debug.godMode`.
- `gallery=1` shows the sprite gallery (§8.2).

Debug keys (only with `debug=1`) → `applyDebug(state, cmd)`:

| Key | Command |
|---|---|
| 1 | toggle hitbox overlay (`debug.showHitboxes`) |
| 2 | toggle god mode |
| 3 | kill all enemies (`damageEnemy(e, 99999, 'debug')`, bosses included) |
| 4 | power +1 |
| 5 | cycle weapon |
| 6 | +5 missiles |
| 7 | jump to the current chapter's boss (`wave = 10`, clear enemies/projectiles/hazards, `beginWave`) |

Do not use F-keys (browsers reserve F1/F5).

---

## 8. Presentation specification

### 8.1 Art direction (A5)

Bright cartoon space comedy. Flat colors with one highlight and one shadow tone per shape, thick dark outlines, glowing projectiles, readable silhouettes against dark space. Everything is drawn with Canvas 2D path commands into offscreen canvases at boot — no image files, no SVG imports, no fonts from the web.

| Token | Hex | Use |
|---|---|---|
| outline | #1B1030 | all outlines, 2.5 px at 1× |
| hen white / shade | #FFF8EE / #E6D9C6 | chicken bodies |
| comb / wattle | #E8343C | |
| beak | #FFB627 | |
| feet | #FF8A1E | |
| red hen / wing | #FF6B5B / #D94B3F | |
| steel / dark steel | #9AA7B8 / #5E6B7D | helmets, plating |
| ufo hull / dome / lights | #6C5CE7 / #8FE3FF (α 0.55) / #FFD60A | |
| chick | #FFD93B | |
| rock / crater | #6B5B53 / #4A3E39 | asteroids |
| ship hull / wing / cockpit / thruster | #F2F6FF / #2E86FF / #7FE7FF / #FF9F1C | |
| egg | #FFF3D6 | |
| meat / bone | #C46A2B / #FFF6E0 | food |
| power core | #39FF88 | |
| weapon colors | `WEAPON_INFO[w].color` | gifts, bolts, HUD |

Sprite pipeline (`src/render/sprites/`):
- A registry maps every `SpriteKey` to `{ w, h, frames, draw(ctx, frame) }` (pure data + draw function; testable without canvas).
- At renderer creation, build each frame at **2× resolution** into an offscreen canvas; `draw()` renders it at 0.5 scale so sprites stay crisp on high-DPI screens.
- For every frame also build a **white silhouette** (draw the sprite, then `globalCompositeOperation = 'source-in'`, fill white) for hit flashes.
- Glows are baked into sprites at build time (radial gradients). Never use `shadowBlur` per frame at runtime.
- Do not trace or imitate the sprites of any existing game. Chickens should be original designs.

### 8.2 Sprite list (A5)

Sizes are logical pixels (built at 2×). Mapping from game objects: enemy kind `k` → `enemy_${k}` (bosses: `k` itself), projectile → `proj_${weapon}` for bolts else `proj_${kind}`, pickup kind `k` → `pickup_${k}`.

| Key | Size | Frames | Description |
|---|---|---|---|
| `ship` | 64×56 | 3 | Original starfighter: white arrowhead fuselage, swept blue wings with red tips, cyan canopy, twin rear engines. Frames = thruster flame short/medium/long |
| `ship_shield` | 84×84 | 1 | cyan bubble ring with soft inner glow |
| `enemy_chicken_basic` | 60×56 | 2 | Round white hen: oval body, round head, 3-lobe red comb, big eyes, yellow beak, small wattle, wings at the sides (frame 0 up, frame 1 down), orange feet |
| `enemy_chicken_red` | 62×58 | 2 | Same build, coral body, darker wings, angry eyebrows |
| `enemy_chicken_armored` | 64×60 | 2 | White hen with riveted steel helmet and chest plate |
| `enemy_chicken_armored_dented` | 64×60 | 2 | Same with dents, crack lines, one missing rivet (used below 50% HP) |
| `enemy_chicken_ufo` | 76×60 | 2 | Purple saucer, rim lights alternating per frame, glass dome with a hen head inside |
| `enemy_chick` | 32×30 | 2 | Small round yellow chick, tiny flapping wings |
| `enemy_asteroid_l` / `_m` / `_s` | 84 / 56 / 30 square | 3 | Jagged rock, 9–12 jittered vertices, 2–3 craters. Frames are 3 shape variants (renderer uses `id % 3`, not animated) |
| `boss_hen` | 240×220 | 2 | Giant hen wearing flight goggles and a medal sash; wing-flap frames |
| `boss_carrier` | 280×200 | 3 | Egg-shaped warship: cream shell, steel bands, cockpit window with hen silhouette, turrets at ±75 px, bottom hatch. Frames = crack stage 0/1/2 |
| `boss_rooster` | 230×230 | 2 | Tall rooster with officer cap, epaulettes, 5-feather tail fan. Frame 1 = beak open (attacking) |
| `boss_dreadnought` | 340×260 | 3 | Fortress: wide egg hull, rooster-head command bridge, 4 turrets, plated armor. Frames = phase color schemes (steel / orange-hot / red-hot) |
| `proj_pulse` | 8×20 | 1 | blue-white capsule with glow |
| `proj_neutron` | 16×16 | 1 | violet orb with white core |
| `proj_laser` | 6×28 | 1 | thin red beam with pink-white core |
| `proj_arc` | 10×10 | 1 | yellow spark |
| `proj_missile` | 16×34 | 2 | white rocket, red nose, flickering flame |
| `proj_egg` | 16×20 | 1 | cream egg with outline and highlight |
| `proj_enemy_shot` | 16×16 | 2 | magenta plasma orb, pulsing |
| `proj_boss_egg` | 22×26 | 1 | golden egg |
| `proj_feather_knife` | 10×26 | 1 | sharp white feather pointing up (renderer rotates) |
| `pickup_drumstick` | 30×30 | 1 | brown drumstick with cream bone |
| `pickup_roast` | 40×32 | 1 | whole glossy roast bird, legs up |
| `pickup_power_core` | 30×30 | 2 | glowing green core with two orbit rings; pulse frames |
| `pickup_gift_<w>` (×4) | 34×34 | 1 | gift box in weapon color, white ribbon and bow, weapon letter on the front |
| `icon_life` | 26×22 | 1 | mini ship |
| `icon_missile` | 14×26 | 1 | mini rocket |
| `icon_food` | 22×22 | 1 | mini drumstick |
| `icon_weapon_<w>` (×4) | 24×24 | 1 | glyph in weapon color: pulse = fan of 3 lines, neutron = big dot, laser = long line, arc = zigzag |
| `fx_egg_splat` | 44×18 | 1 | flattened white splash with yellow yolk |
| `fx_puff` | 32×32 | 1 | soft white cloud |

**Frame selection:** animated sprites use `floor(time × fps + id × 0.37) % frames` with fps 8 for chickens/chicks, 12 for ship flame, 6 for pickups and enemy shots. Bosses use `enemy.anim` (Hen: flap by time).

**Gallery (`renderGallery`):** dark background, every key and every frame in a grid at 1×, label under each, plus the white flash variant beside the first frame. Used by humans and by agents that can take screenshots.

### 8.3 Renderer (A5, `src/render/renderer.ts`)

Draw order each frame:
1. Clear; `ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0)`.
2. Background (§8.4).
3. Apply screen shake translation (§8.5).
4. Ground decals (egg splats).
5. Pickups (`spin` rotation; power core frames).
6. Non-boss enemies, then bosses (rotation, frame, `flash` when `hitFlash > 0`; armored uses dented sprite below 50% HP).
7. Hazards: telegraph = dashed red line, alpha pulsing 0.3–0.7 at 8 Hz, width as given (wide telegraphs as a translucent red band); beam = outer glow (#FF3B3B α 0.5, width × 1.6) + core (#FFFFFF, width × 0.4) + main (#FF6B6B, width).
8. Enemy projectiles.
9. Player projectiles and arc lightning.
10. Player ship: rotation `bank × 0.15`; while `invulnTimer > 0`, blink at 10 Hz (alpha 0.35 / 1) and draw `ship_shield`; hidden while dead.
11. Particles.
12. Reset translation (no shake); full-screen flash overlay (§8.5), scaled by 0.3 when `settings.reduceFlashes`.
13. If `state.debug.showHitboxes`: circles for every hit radius (player green, enemies red, projectiles yellow, pickups cyan) and hazard segments.
14. Leave transform at logical scale.

`render(null, …)` = attract mode: chapter 1 background, plus 6 basic chickens drifting slowly across the upper area on gentle sine paths (purely visual, no sim).

Performance rules: no allocation per entity per frame in hot paths; pre-built sprites only; batch particle fills by color where easy; target < 6 ms render time at the heaviest wave.

### 8.4 Backgrounds (A5, `background.ts`)

- Vertical gradient using the chapter palette (§7.12). For chapter > 5 use the palette of the reused chapter.
- 3 star layers: counts 160 / 90 / 40, sizes 1 / 1.5 / 2.5 px, speeds 15 / 40 / 90 px/s downward, wrapping. Star tint: white with 10% of stars tinted by the chapter's top color brightened.
- Per chapter 1–2 decor objects pre-rendered when the chapter starts: a planet (circle with radial shading, optional ring) and/or a nebula (6–10 large soft radial gradients, alpha 0.08–0.15) drifting down at 6 px/s.
- On `wave_start` with `wave === 1`: crossfade from the old palette and decor to the new one over 2.0 s.
- **Warp** (`state.phase === 'warp'`): star speeds × 20 drawn as streaks (length = speed × 0.05), ease in over 0.5 s and out over the last 0.5 s.

### 8.5 Particles, VFX, shake (A5, `particles.ts`, `shake.ts`)

Particle pool of 2,000 preallocated objects (swap-remove on death). Feathers, sparks, debris and shockwaves are drawn as primitives (ellipses, lines, arcs); splats and puffs use sprites.

| Event | Effect |
|---|---|
| `player_fire` | muzzle flash at the nose: bright circle in weapon color, 60 ms |
| `arc` | store the polyline for 0.08 s; draw each segment subdivided into 6 pieces with ±10 px perpendicular jitter (re-jittered every frame): wide yellow pass (α 0.4, 6 px) + thin white pass (2 px) |
| `enemy_hit` (chicken) | 2 feathers + 4 sparks |
| `enemy_hit` (asteroid) | 3 rock chips + 4 sparks |
| `enemy_killed` (chicken kinds) | 12 feathers (white; coral for red; yellow for chicks), `fx_puff` expanding 0.5→1.8 scale with alpha 0.6→0 over 0.35 s, shake +0.05 |
| `enemy_killed` (asteroid) | 10 debris chunks + dust puff |
| `egg_splat` | `fx_egg_splat` decal at (x, GROUND_Y) fading over 1.5 s + 4 yolk droplets |
| `pickup_collected` | 8 sparkles in the pickup's color |
| `score_popup` | text `+N` rising 40 px over 0.8 s, fading; white with dark outline, bold 18 px |
| `player_died` | 30 sparks, 16 debris, shockwave ring 0→160 px over 0.5 s, flash 0.2 s, shake +0.6 |
| `player_respawned` | ring of 16 cyan sparkles converging on the ship |
| `extra_life` | 20 green sparkles around the ship |
| `missile_detonated` | shockwave ring to 900 px over 0.6 s, white flash 0.25 s, 60 sparks, shake +0.7 |
| `boss_phase` | flash 0.15 s, shake +0.3, 30 sparks at the boss |
| `boss_killed` | 8 explosions staggered over 2.5 s at random points within the boss radius, then a large one; 200 feathers; shake +1.0 |
| `overheat` | steam puffs at the ship nose for 0.5 s |

**Feather particle:** ellipse 4×9 px, starts with outward velocity 60–220 px/s, gravity 120 px/s², horizontal sway `sin(t·6 + seed)·40`, rotates, life 1.2 s, fades in the last 0.4 s.

**Screen shake:** `trauma` accumulates (cap 1.0) and decays 1.6/s; offset = `trauma² × 10 px` × smooth noise per axis. Disabled when `settings.screenShake` is false.

### 8.6 HUD (A4, `src/ui/hud.ts`, canvas, logical coordinates, no shake)

Font for all canvas text: `bold <size>px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`. Text uses a 3 px #1B1030 stroke under white fill for readability.

**Bottom bar** (y 676–720): fill `rgba(10, 8, 30, 0.72)`, top border 2 px #6C5CE7 at 60% alpha.

| x | Element |
|---|---|
| 16 | lives: up to 5 `icon_life`, 30 px apart; if lives > 5 → one icon + `×N` |
| 200 | missiles: up to 5 `icon_missile`, 20 px apart; if > 5 → one icon + `×N` |
| 360 | `icon_food` + food count `37`; under it an 80×6 bar filled food/100 in #FFB627 |
| 520 | label `POWER` (10 px) at y 688, with 10 pips (14×10, 3 px gaps) below it at y 694, filled = power, fill = weapon color, empty = #2A2340 |
| 740 | heat bar 180×12: fill = heat %; color lerps #39FF88 (0) → #FFD60A (60) → #FF3B3B (100); when overheated the bar flashes at 6 Hz and `OVERHEAT` (12 px, red) shows above it |
| 980 | `icon_weapon_<w>` + weapon name (16 px) |

**Top:** score top-left at (20, 36), 28 px, formatted with thousands separators (`formatScore(1234567) === '1,234,567'`). Top-right (right-aligned at x 1260, y 30): `CHAPTER 2 · WAVE 7/10` (18 px); FPS below it when `settings.showFps`.

**Boss bar** (when any boss is alive): name centered at y 22 (16 px); bar 560×14 at (360, 30); background #2A1030, fill #FF3B3B, 2 px white border; tick marks at each `state.bossThresholds` fraction; value = sum of alive boss HP / sum of their max HP.

**Banners** (`state.banner`, drawn by `src/ui/banners.ts`): centered at y 300. Fade in 0.2 s, fade out over the last 0.3 s, scale 1.15 → 1.0 during fade-in.
- `wave`: title 52 px #FFD60A, subtitle 24 px white.
- `boss`: title flashing red/white at 3 Hz, 64 px; translucent red band (height 140) with diagonal stripes behind it; subtitle 24 px.
- `small`: title 32 px white.
- `big`: title 72 px with gradient #FFD60A → #FF8A1E.

**Chapter tally** (phase `chapter_complete`, from `state.lastChapterBonus`): panel 640×380 centered, rounded, dark translucent. Lines count up over 2.0 s one after another: `ACCURACY 78%`, `Accuracy bonus`, `Food bonus`, `Flawless bonus`, `Firepower bonus`, a divider, `TOTAL`, and `× 1.5 (HARD)` / `× 0.75 (EASY)` when the multiplier is not 1. After 1.5 s show `Press FIRE to continue` blinking.

### 8.7 Menus and screens (A4, DOM in `#ui`, 1280×720 logical layout)

Look: dark translucent panels (`rgba(16, 10, 40, 0.86)`), 16 px radius, 2 px #6C5CE7 border, bold rounded system font stack. Buttons 300×52, 22 px text; focused/hovered button: #FFD60A border, slight scale-up. Logo "FOWL PLAY": 96 px, gradient #FFD60A → #FF8A1E via background-clip text, 4-direction #1B1030 outline via text-shadow plus drop shadow.

Navigation: Up/Down (and W/S) move focus, Left/Right change the value of sliders and selectors, Enter/Space activate, Esc goes back. Mouse hover moves focus. Every focus move plays `ui('move')`, activation `ui('select')`, back `ui('back')`. First click/keypress anywhere calls `audio.unlock()`.

| Screen | Content |
|---|---|
| **Title** | Logo; tagline "Defend the galaxy from the poultry armada"; menu: PLAY · DIFFICULTY ◀ NORMAL ▶ · HIGH SCORES · SETTINGS · HOW TO PLAY · CREDITS; footer with controls summary and `v1.0`. Canvas attract mode shows behind. |
| **High Scores** | Top 10: rank, name, score, chapter reached, difficulty, date. "Clear scores" with a confirm step. Back. |
| **Settings** | Master / Music / SFX sliders (0–100, step 5), Screen shake, Reduce flashes, Show FPS, Auto-fire, Mouse control toggles. Changes apply immediately (`onSettingsChanged`) and persist. Back. |
| **How to Play** | Three panels: *Controls* (table from §7.2); *Pickups* with sprite previews from `sprites.toCanvas` (drumstick, roast, power core, each gift with its `WEAPON_INFO` name + desc); *Tips*: "Eggs and chickens destroy your ship", "Every 100 food = 1 missile; missiles clear the screen", "Same-weapon gifts raise firepower", "Watch your heat bar — overheating stops your guns", "Wave 10 of every chapter is a boss". Back. |
| **Credits** | "Design and code: an AI agent team. Inspired by classic chicken-invasion arcade shooters. All art, music and sound generated procedurally." Back. |
| **Pause** | Title "PAUSED"; RESUME · RESTART · SETTINGS · QUIT TO TITLE (confirm). Esc resumes. |
| **Game Over** | "GAME OVER", final score (large), chapter/wave reached, accuracy, kills. If `qualifies(score)`: name input (max 12 chars, A–Z 0–9 space, uppercase, prefilled with last used name or "PILOT") + SAVE; after saving show the table with the new row highlighted. Buttons: RETRY · TITLE. |
| **Victory** | "COOP LIBERATED!", stats as above, same name entry flow, buttons: CONTINUE (ENDLESS) · TITLE. |

**Storage** (`src/ui/storage.ts`, `highscores.ts`): keys from `STORAGE_KEYS`. Every access wrapped in try/catch; corrupt or missing JSON → defaults; numeric settings clamped to 0..1; booleans coerced. `HighScore = { name: string; score: number; chapter: number; wave: number; difficulty: Difficulty; date: string }` (ISO date); list sorted by score descending, max 10 entries.

### 8.8 Sound effects (A4, `src/audio/`)

Audio graph: `AudioContext` → master gain → compressor (`DynamicsCompressorNode`) → destination; music gain and SFX gain feed the master. Created lazily in `unlock()`; until then all calls are no-ops. Max 24 simultaneous SFX voices (drop new ones beyond that); per-sound minimum interval (throttle) as listed. Every sound gets ±5% random pitch unless stated. All synthesized — no sample files.

Envelope shorthand: `A` attack, `D` decay to silence, gains are pre-master.

| Sound id | Trigger | Recipe | Throttle |
|---|---|---|---|
| `fire_pulse` | `player_fire` pulse | square 1200→600 Hz exp, A 2 ms D 70 ms, gain 0.07 | 60 ms |
| `fire_neutron` | `player_fire` neutron | sawtooth 400→180 Hz, lowpass 1800 Hz, D 110 ms, gain 0.09 | 60 ms |
| `fire_laser` | `player_fire` laser | square 2200→1400 Hz, D 50 ms, gain 0.045 | 50 ms |
| `fire_arc` | `player_fire` arc | white noise bandpass 3000 Hz Q 2 + square 90 Hz buzz, D 90 ms, gain 0.08 | 60 ms |
| `hit` | `enemy_hit` | triangle 900→700 Hz, D 40 ms, gain 0.04 | 30 ms |
| `cluck` | `enemy_killed` chicken kinds | two blips through bandpass 1100 Hz Q 4: square 700→420 Hz 45 ms, 30 ms gap, square 820→480 Hz 60 ms; gain 0.11; ±8% pitch | 35 ms |
| `peep` | `enemy_killed` chick | `cluck` at pitch ×1.6, durations ×0.7 | 35 ms |
| `rock_break` | `enemy_killed` asteroid | noise lowpass sweeping 900→300 Hz, D 160 ms, gain 0.11 | 40 ms |
| `egg_drop` | `egg_dropped` | sine 500→350 Hz, D 60 ms, gain 0.025 | 80 ms |
| `egg_splat` | `egg_splat` | noise lowpass 700 Hz D 120 ms + sine 120 Hz D 80 ms, gain 0.07 | 50 ms |
| `zap` | `enemy_shot` | square 600→900 Hz, D 70 ms, gain 0.05 | 60 ms |
| `food` | `pickup_collected` drumstick/roast | triangle 880 Hz 40 ms then 1320 Hz 40 ms, gain 0.06 (roast: add a third note 1760 Hz) | 30 ms |
| `power` | `pickup_collected` power_core | triangle arpeggio C6 E6 G6 C7, 35 ms each, gain 0.08 | — |
| `gift` | `weapon_changed` | square arpeggio up 4 notes + short noise sparkle, gain 0.08 | — |
| `missile_gain` | `missile_gained` | two-tone chime 660/990 Hz sine, 120 ms each, gain 0.08 | — |
| `missile_launch` | `missile_launched` | sawtooth 200→800 Hz over 400 ms + noise whoosh, gain 0.1 | — |
| `boom_big` | `missile_detonated` | noise lowpass sweep 4000→200 Hz over 900 ms + sine 60 Hz D 600 ms, gain 0.3 | — |
| `overheat` | `overheat` | square alternating 440/330 Hz, 3 × 80 ms, gain 0.07 | — |
| `cooled` | `heat_recovered` | sine 600→900 Hz, D 80 ms, gain 0.05 | — |
| `player_die` | `player_died` | noise lowpass sweep 3000→150 Hz over 1.2 s + sawtooth 600→60 Hz, gain 0.25 | — |
| `respawn` | `player_respawned` | rising triangle shimmer 400→1600 Hz over 500 ms with 12 Hz tremolo, gain 0.07 | — |
| `one_up` | `extra_life` | 6-note major arpeggio (C5 E5 G5 C6 E6 G6), square 25% duty, 70 ms each, gain 0.08 | — |
| `wave_start` | `wave_start` (not boss) | two-note fanfare G5 → C6, square, 120 ms each, gain 0.07 | — |
| `siren` | `boss_warning` | sine sweeping 600↔900 Hz, 4 cycles over 2 s, gain 0.11 | — |
| `charge` | `boss_attack` | sawtooth 150→400 Hz, D 250 ms, lowpass 1200 Hz, gain 0.06 | 200 ms |
| `telegraph` | `telegraph` | sine 300→1200 Hz over 600 ms, gain 0.05 | 200 ms |
| `roar` | `boss_phase` | sawtooth 150→80 Hz 500 ms through a WaveShaper distortion, gain 0.15 | — |
| `boss_die` | `boss_killed` | 3 × `boom_big` variants 300 ms apart, decreasing pitch | — |
| `fanfare` | `chapter_complete` | 2 s major fanfare, square lead + triangle bass | — |
| `game_over` | `game_over` | 4 descending minor notes, triangle, 250 ms each, gain 0.1 | — |
| `tick` | `ui('tick')` and tally count-up | square 1500 Hz, D 15 ms, gain 0.03 | 40 ms |
| `ui_move` / `ui_select` / `ui_back` / `ui_error` | `ui(...)` | short square blips (1000 / 1400 / 700 / 200 Hz), D 40–60 ms, gain 0.05 | — |

### 8.9 Music (A4, `src/audio/music.ts`, `music-data.ts`)

- Original compositions only. Do not transcribe or imitate the melody of any existing song or game theme.
- Look-ahead scheduler: a 25 ms timer schedules notes up to 120 ms ahead on the `AudioContext` clock.
- Track format:

```ts
interface Note { step: number; midi: number; len: number; vel?: number }   // step = 16th-note index in the loop, len in steps
interface DrumHit { step: number; kind: 'kick' | 'snare' | 'hat' }
interface Track { name: string; bpm: number; bars: number; loop: boolean;
                  lead: Note[]; bass: Note[]; arp: Note[]; drums: DrumHit[] }
```

- Instruments: lead = square with 25% duty (`PeriodicWave`); bass = triangle; arp = sawtooth through lowpass 1500 Hz; kick = sine 150→50 Hz 120 ms; snare = noise bandpass 1800 Hz 100 ms; hat = noise highpass 7000 Hz 30 ms.

| Track | BPM | Bars | Mood | Loop |
|---|---|---|---|---|
| `title` | 100 | 8 | mysterious, A minor | yes |
| `game` | 132 | 8 | upbeat, driving, E minor | yes |
| `boss` | 150 | 8 | intense, D minor, heavier drums | yes |
| `victory` | 120 | 4 | triumphant, C major | once, then `title`-style soft loop of the last 2 bars |
| `gameover` | 80 | 2 | somber | once, then silence |

**Track selection in `audio.update`:** title screen → `title`; playing with phase `boss_intro` or any boss alive → `boss`; playing otherwise → `game`; `victory` screen → `victory`; `gameover` screen → `gameover`; paused → keep the current track ducked to 40% volume. Track changes crossfade over 0.5 s. During phase `chapter_complete`, emit `tick` sounds while the tally counts up (one every 60 ms for the first 2 s).

---

## 9. Task lists per agent

Work strictly in priority order: all P0 → all P1 → P2. Each item lists its acceptance check. "Test:" means a Vitest test in `tests/a#.*.test.ts` that you write.

### 9.A1 — Lead / Core / Integrator

**Phase 0 (P0, alone, do these first and fast)**
1. Scaffold §4 (package.json, tsconfig, vite config, index.html, app.css), run `npm install`.
2. Create `docs/STATUS.md` (sections A1–A5 with Done/Doing/Blocked/Next), `docs/REQUESTS.md`, `docs/DECISIONS.md`, README skeleton.
3. Write all contracts §6.1–6.4 verbatim and the initial §6.5 files.
4. Implement fully: `rng.ts` (mulberry32 on `state.rng.s`), `math.ts`, `ids.ts`, `difficulty.ts`.
5. Write compiling stubs for every module in §6.6 not owned by you, with the default behaviors listed there.
6. Implement `game.ts` fully (createGame, step order §6.7, phase machine §7.10, canFire, continueEndless, NEUTRAL_INPUT). Write `combat.ts`, `collisions.ts`, `pickups.ts`, `scoring.ts`, `debug.ts`, `tuning/economy.ts` as stubs with final signatures — implement them right after Phase 0 so the others are not kept waiting.
7. App shell: `main.ts`, loop §5.2, view/letterbox §5.3, screen flow §5.4, input §7.2 (keyboard + mouse), pause/blur, URL params and debug keys §7.15.
8. Tests: `a1.static.test.ts` (§10.2), `a1.rng.test.ts` (same seed → same sequence; range bounds).
9. `npm run check` green → write `PHASE 0 DONE — CONTRACT v1` at the top of STATUS.

**After Phase 0**
- P0 Implement `combat.ts` (§7.6.3), `collisions.ts` (§7.6.4), `pickups.ts` (§7.8), `scoring.ts` (§7.9), `debug.ts` (§7.15), `tuning/economy.ts` — immediately, they are on everyone's critical path.
- P0 Tests for your modules: collisions (pierce, invulnerable absorbs bolt, contact damage), combat (kill → events, score, drops, boss callbacks), pickups (food → missile at 100 including roast crossing, extra life at 100k, lives cap 9), scoring (chapter bonus math), phase machine (every transition in §7.10 including skip, victory, endless, game over).
- P0 `a1.invariants.ts` helper + `a1.determinism.test.ts` + `a1.smoke.test.ts` + `a1.alltables.test.ts` (§10.3) as soon as A2/A3 code exists.
- P0 Run gate M1, then M2, M3 (§11). Post results in STATUS. File precise REQUESTS for every failure.
- P1 At M2: enable the no-STUB/TODO/FIXME check in `a1.static.test.ts`.
- P1 Balance coordination (M3): run the smoke bot and debug playthroughs; compare against the balance intents in §7.4 and §7.13 and the targets in §11 M3; send concrete tuning requests to owners.
- P1 README: run instructions, controls, debug keys, architecture diagram (§5.1), file map.
- P2 Gamepad input (standard mapping) and touch input (§7.2).

### 9.A2 — Player & Combat

- **P0** `player.ts`: createPlayer, movement (keyboard + pointer), bounds, bank, invulnerability, killPlayer, respawn (§7.3). Test: speeds, clamping, pointer cap 1100 px/s, death reduces lives and power per difficulty, respawn after 1.5 s with 3.0 s invulnerability, no respawn at 0 lives.
- **P0** `projectiles.ts`: spawnProjectile (cap), movement with accel and maxSpeed, ttl, off-screen removal, egg splat at GROUND_Y with event, clearEnemyProjectiles, countEggs (§7.7). Test: egg falls and splats, cap returns null.
- **P0** `weapons.ts` + `tuning/weapons.ts`: pulse weapon table, heat/overheat/recovery, fire cooldown, canFire gating, stats, addPower, applyWeaponGift (§7.4). Test: for every pulse level, one volley creates the table's bolt count and spread; overheat within the intended window; recovery at heat ≤ 25.
- **P1** Neutron, laser (pierce), arc (targeting cone, chaining, fallback bolt, `arc` event). Test: per-level bolt counts/damage for every weapon; arc chain picks nearest unhit targets within 170 px; arc fallback fires when no target.
- **P1** `missile.ts` (§7.5). Test: launch requires missile and cooldown; detonation kills on-screen non-boss enemies with drops, damages bosses by 60, clears enemy projectiles, asteroids do not split.
- **P1** `bosses.ts` + `bosses/*.ts` + `tuning/bosses.ts`: all five bosses (§7.13): entry, movement, attack cycles, telegraphs/beams, minions, phases, HUD fields. Test: HP formula with difficulty and loop; invulnerable during entry; each threshold fires `boss_phase` exactly once; twin partner rule; dreadnought phase change clears projectiles; 90 s simulated fight per boss in god mode produces no NaN and stays within entity caps.
- **P2** Boss attack variety and weapon feel tuning after M3 feedback (change only your own tuning files; numbers stay within ±25% of the spec unless A1 approves).

### 9.A3 — Enemies & Waves

- **P0** `enemies.ts` + `tuning/enemies.ts`: ENEMY_DEFS (§7.6.1), spawnEnemy with scaling and carry plan, updateEnemies (behavior dispatch, age, hitFlash, rotation, eggs with cap, lost-enemy guard, boss dispatch to A2's `updateBoss`). Test: scaling formula; egg cap respected under a 200-chicken stress setup; no eggs while entering.
- **P0** `waves.ts`: startWave (groups, delays, carry plan), updateWaveSpawner, isWaveComplete, waveInfo. Patterns `grid` and `stream`. Chapter 1 waves 1–3 in `chapters.ts`.
- **P1** Remaining patterns: `swoop`, `ring`, `divers`, `bouncers`, `asteroids` (with splitting in onEnemyKilled), `ufo` (shooting), `swarm` (follow + kamikaze), `boss` (calls spawnBoss) (§7.11).
- **P1** All 50 waves (§7.12) and endless naming. Test (`a3.chapters.test.ts`): 5 chapters × 10 waves, wave 10 is a boss with the right id, every kind letter valid, counts > 0, names non-empty; `waveInfo(6, 1)` returns "Low Orbit II".
- **P1** Test (`a3.patterns.test.ts`): each pattern spawns exactly its planned count (asteroids within ±1 of rate × duration); after entry, formation members stay within x ∈ [20, 1260]; enemies that are not diving, kamikaze, or asteroids stay at y ≤ 520; 30 s of every pattern produces no NaN.
- **P1** Test (`a3.carry.test.ts`): exactly one power core per non-boss wave, plus one gift on waves 3/6/9.
- **P2** Polish: formation members tilt into the sway direction (via `rotation`); extra wave variety for endless chapters 6+ (e.g. mixed kinds per row), as long as the §7.12 tables stay unchanged for chapters 1–5.

### 9.A4 — UI & Audio

- **P0** `hud.ts` + `banners.ts`: bottom bar, score, chapter/wave, banners (§8.6), `formatScore`. Test: `formatScore`.
- **P0** `storage.ts`, `highscores.ts` with injectable KV. Test: defaults on missing/corrupt JSON, clamping, top-10 ordering, `qualifies`, insertion rank.
- **P0** `index.ts` UI: title (Play + difficulty), pause, game over (no name entry yet). Keyboard + mouse navigation.
- **P0** `audio/index.ts`: graph, unlock, volumes, voice limit, throttle, and 6 sounds: `fire_pulse`, `cluck`, `egg_splat`, `food`, `player_die`, `ui_select`.
- **P1** Complete HUD: boss bar with threshold marks, overheat flash, chapter tally with count-up and multiplier line (§8.6).
- **P1** All screens (§8.7) including settings (live apply + persist), high scores, how to play with sprite previews, credits, name entry on game over and victory, quit confirm.
- **P1** All sound effects (§8.8) mapped from events; tally ticks.
- **P1** Music engine + 5 original tracks + selection, crossfade, pause ducking (§8.9). Test (`a4.music.test.ts`): every track's notes lie within its loop length, MIDI 24–108, bpm > 0, drums valid.
- **P2** Gamepad menu navigation; on-screen pause button for touch.

### 9.A5 — Visuals

- **P0** Sprite registry and atlas builder (2×, white flash variants, frames); `SpriteApi` (draw/size/toCanvas). P0 sprites: `ship`, `ship_shield`, `enemy_chicken_basic`, `enemy_chick`, `proj_pulse`, `proj_egg`, `pickup_drumstick`, `pickup_power_core`, `icon_life`, `icon_missile`, `icon_food`, `fx_egg_splat`, `fx_puff`; every other key gets a clearly visible placeholder (colored circle + key text) until P1. Test (`a5.sprites.test.ts`): registry has an entry for every `SPRITE_KEYS` item with positive size and frames.
- **P0** Renderer draw order (§8.3), entity → sprite mapping, frame selection, invulnerability blink, starfield, attract mode.
- **P0** Particles core: pool, feathers, puff, splat decals, sparks; screen shake. Test (`a5.particles.test.ts`): pool never exceeds capacity; particles expire; `enemy_killed` (basic) spawns 12 feathers; shake decays to 0 and is zero when disabled.
- **P1** All remaining sprites (§8.2), including boss frames.
- **P1** Hazard drawing, arc lightning, all VFX in §8.5, flash overlay with `reduceFlashes`, debug hitboxes.
- **P1** Chapter backgrounds with decor, palette crossfade, warp streaks (§8.4).
- **P1** `renderGallery`.
- **P2** Subtle ship engine trail; parallax drift of planets with ship x (±8 px).

---

## 10. Testing

### 10.1 General
- Vitest, Node environment. Test files: `tests/a<n>.<topic>.test.ts`.
- Sim tests build states with `createGame({ seed, difficulty, startChapter, startWave, debug })` and drive them with `step`.
- Never depend on wall-clock time or real randomness in tests.

### 10.2 Static rules (`a1.static.test.ts`, A1)
Scan every `.ts` file under `src/sim/` and fail on: `Math.random`, `Date.now`, `performance.`, `\bdocument\.`, `\bwindow\.`, `localStorage`, `requestAnimationFrame`, imports from `../render`, `../ui`, `../audio`, `../app`, `../input`. From M2 also scan all of `src/` for `STUB`, `TODO`, `FIXME` (A1 flips a constant `ENFORCE_NO_STUBS = true`).

### 10.3 Integration (A1)
- **Invariants helper** — after any tick: no NaN in any position/velocity; `enemies ≤ 400`, `projectiles ≤ 1500`, `pickups ≤ 300`, `hazards ≤ 50`; `0 ≤ power ≤ 10`; `0 ≤ heat ≤ 100`; `lives ≥ 0`; `0 ≤ food ≤ 99`; `JSON.stringify(state)` succeeds.
- **Determinism** — two games with the same seed and the same scripted 3,000-tick input produce identical `JSON.stringify` of (score, tick, player, enemies.length, rng).
- **Smoke bot** — seed 7, Normal, god mode, power set to 10 via debug, input: pointer at `(640 + 500·sin(0.7t), 560)`, fire always, missile every 600 ticks. Run until chapter 2 starts. Assert it happens within 30 simulated minutes, no single wave lasts longer than 5 simulated minutes, and invariants hold every tick.
- **All tables** — for chapters 1–6 and waves 1–10: start a game there in god mode; within 600 ticks at least one enemy exists (boss waves: a boss exists and `bossName` is set after the first tick); then apply `killAll` every tick until the phase leaves `wave_active`; assert that happens within 60 simulated seconds. Then a full run from chapter 1 wave 1 with `killAll` every tick (and `skip` on tally) must reach phase `victory` and emit exactly one `victory` event.

### 10.4 Manual / visual checks
If your harness can open a browser and take screenshots, use `npm run dev` with `?debug=1&gallery=1` (sprites), `?debug=1&chapter=N&wave=M` (any wave) and debug keys. If it cannot, rely on the tests and on `npm run build`; A1 asks the human operator for a visual pass at M2 and M3.

---

## 11. Milestone gates (A1 runs them and posts results in STATUS)

**M1 — Vertical slice**
- `npm run check` green.
- Title → Play → chapter 1 waves 1–3 playable: ship moves with mouse and keyboard, pulse weapon with heat, grid and stream patterns, eggs kill the ship, death/respawn/invulnerability, drumsticks and power cores drop and work, score and HUD bottom bar, feathers/puffs/splats, 6 core sounds, game over → title.
- Determinism and invariants tests pass.

**M2 — Content complete**
- Every P0 and P1 item of every agent done; zero STUB/TODO/FIXME (test enabled).
- All-tables test passes (all 50 waves + endless chapter 6 + victory).
- All screens, settings persistence, high scores, music, every SFX, every sprite (gallery reviewed), every VFX.

**M3 — Balance, performance, polish**
- Smoke bot passes. Targets on Normal: chapter 1 takes a competent player about 8–12 minutes; typical wave 30–70 s; boss 45–90 s; a basic chicken dies to one pulse bolt in chapters 1–3; wave 1 is clearable at power 0 in under 45 s; average egg rate in chapter 1 wave 1 ≤ 3/s; a missile is earned roughly every 2–3 waves; a no-death player reaches about power 5 by the end of chapter 1.
- Performance: chapter 5 wave 9 holds 60 fps; sim step < 2 ms, render < 6 ms on the test machine (measure with `?debug=1` and `showFps`).
- No console errors or warnings in a full debug-skip run.

**M4 — Release**
- Cross-review: A2 reviews A3's modules against §7.11–7.12; A3 reviews A2's against §7.3–7.5 and §7.13; A4 reviews A5's against §8.1–8.5; A5 reviews A4's against §8.6–8.9; A1 reviews everything against §12. Reviewers file REQUESTS; owners fix; reviewers confirm.
- §12 checklist fully checked by A1.

---

## 12. Final release checklist (A1)

- [ ] `npm install && npm run check` exits 0 on a clean clone.
- [ ] `npm run build` → `dist/` opens via `npx vite preview` and from a plain static server; no network requests besides the page's own files.
- [ ] Full flow works: title → play → 5 chapters → victory → endless chapter 6 → game over → name entry → high scores → title.
- [ ] All four weapons, power 0–10 visuals, heat/overheat, missiles, all pickups.
- [ ] All five bosses with their phases, telegraphs and beams.
- [ ] Easy / Normal / Hard differ as in §7.14.
- [ ] Pause via Esc/P and on window blur; settings persist after reload; high scores persist after reload.
- [ ] Audio starts after the first interaction; volumes work; music switches title/game/boss/victory/gameover.
- [ ] Screen shake and reduce-flashes toggles work.
- [ ] Window resize and high-DPI screens keep the 16:9 letterbox crisp; pointer steering stays accurate after resizing.
- [ ] No console errors or warnings; 60 fps on the heaviest wave.
- [ ] No asset, name or text from any existing commercial game.
- [ ] README complete.

---

## Appendix A — Kickoff lines (paste one per agent, together with this whole document)

- **A1:** `You are A1 — Lead, Core Simulation and Integrator for FOWL PLAY. The full spec is below (also saved as docs/SPEC.md). Read all of it. Execute Phase 0 (§9.A1) immediately and alone; the other agents are waiting for "PHASE 0 DONE" in docs/STATUS.md. Then continue your task list, run the milestone gates in §11, and process contract-change requests. You are the only agent allowed to edit contract files.`
- **A2:** `You are A2 — Player & Combat for FOWL PLAY. Read the full spec below. Until docs/STATUS.md shows "PHASE 0 DONE", do only your warm-up item from §3.3. Then execute §9.A2 in priority order. Edit only the files you own (§3.2). Check STATUS before each task.`
- **A3:** `You are A3 — Enemies & Waves for FOWL PLAY. Read the full spec below. Until docs/STATUS.md shows "PHASE 0 DONE", do only your warm-up item from §3.3. Then execute §9.A3 in priority order. Edit only the files you own (§3.2). Check STATUS before each task.`
- **A4:** `You are A4 — UI & Audio for FOWL PLAY. Read the full spec below. Until docs/STATUS.md shows "PHASE 0 DONE", do only your warm-up item from §3.3. Then execute §9.A4 in priority order. Edit only the files you own (§3.2). Check STATUS before each task.`
- **A5:** `You are A5 — Visuals for FOWL PLAY. Read the full spec below. Until docs/STATUS.md shows "PHASE 0 DONE", do only your warm-up item from §3.3. Then execute §9.A5 in priority order. Edit only the files you own (§3.2). Check STATUS before each task.`

---

## Appendix B — Common pitfalls (read before coding)

1. Forgetting `× dt` on any per-second quantity. Speeds are px/s, rates are per second.
2. Degrees vs radians. Convert with `deg()`. 90° points DOWN on screen.
3. Removing array items during iteration. Set `alive = false`; `compact()` removes. Cache `length` when iterating while spawning.
4. Reading `state.events` from the wrong place. Events are cleared at the start of every `step()`; consumers must read them right after each step.
5. Putting functions, classes, Map/Set, or DOM objects into `GameState`.
6. Using `Math.random()` in `src/sim` — use `rngNext(state.rng)` and friends.
7. Calling `AudioContext` methods before `unlock()` — browsers block audio until a user gesture.
8. Canvas `font` must be set before `measureText`/`fillText` every time it changes.
9. `localStorage` can throw (private mode, disabled storage) — always try/catch.
10. Drawing with `shadowBlur` every frame kills performance — bake glows into sprites.
11. Using F-keys for debug — browsers reserve them. Use digits 1–7.
12. Touching DOM or canvas at module top level — breaks Node tests.
13. Silently changing a shared name or signature — breaks four other agents. Use the request process.
14. "It compiles" is not "it works": every feature ends with its acceptance test from §9 passing.
