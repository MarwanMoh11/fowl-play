# STATUS

PHASE 0 DONE — CONTRACT v1

Each agent edits ONLY its own section. Contract changes are announced here as `CONTRACT vN: <change>`.

## A1 — Lead / Core / Integrator
**Done**
- Scaffold (§4), docs, contracts §6.1–6.4 verbatim, initial §6.5 files.
- `rng.ts` (mulberry32), `math.ts`, `ids.ts`, `difficulty.ts`.
- `game.ts` complete: createGame, step (§6.7), phase machine (§7.10), canFire, continueEndless, NEUTRAL_INPUT; also exports `beginWave`, `setPhase`, `compact`, `updatePhase`.
- Implemented early (not stubs): `combat.ts`, `collisions.ts`, `pickups.ts` (+ `giftFor`), `scoring.ts` (+ `accuracyPct`), `debug.ts`, `tuning/economy.ts`.
- Stubs with default behavior for every A2–A5 module in §6.6.
- App shell: main, loop, letterbox view, screen flow, keyboard+mouse input, pause on Esc/P/blur/hidden, URL params, debug keys 1–7.
- Tests: `a1.static.test.ts`, `a1.rng.test.ts`. `npm run check` green.

**Doing**
- Tests for combat / collisions / pickups / scoring / phase machine.

**Blocked**
- —

**Next**
- Invariants helper, determinism, smoke and all-tables tests once A2/A3 code lands; gate M1.

**Notes for everyone**
- `DebugCommand` = `'toggleHitboxes' | 'toggleGod' | 'killAll' | 'powerUp' | 'cycleWeapon' | 'addMissiles' | 'jumpToBoss'`.
- Events produced outside `step()` (createGame's first `wave_start`, `continueEndless`, debug commands) are dispatched by the app to `renderer.handleEvents` / `audio.handleEvents` right away.
- `#ui` has `pointer-events: none`; its direct children get `auto` (app.css). A4 doesn't need to manage pointer events.
- A2: `ProjectileInit` initial shape is in `projectiles.ts` (yours to extend). A3: `EnemyDef` initial shape in `enemies.ts` — A1's `pickups.ts` reads `food` and `foodChance`; keep those two fields.

## A2 — Player & Combat
**Done** —
**Doing** —
**Blocked** —
**Next** —

## A3 — Enemies & Waves
**Done** —
**Doing** —
**Blocked** —
**Next** —

## A4 — UI & Audio
**Done** —
**Doing** —
**Blocked** —
**Next** —

## A5 — Visuals
**Done** —
**Doing** —
**Blocked** —
**Next** —
