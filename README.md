# Fowl Play

An original arcade shoot-'em-up: one starfighter against an armada of space chickens. TypeScript + Canvas 2D + Web Audio, no runtime dependencies, all art and audio generated in code.

## Run

```bash
npm install
npm run dev      # dev server
npm run check    # typecheck + tests + production build
npm run build    # static build in dist/
```

## Controls

| Action | Mouse | Keyboard |
|---|---|---|
| Move | ship follows pointer | Arrows / WASD |
| Fire (hold) | left button | Space / Z / J |
| Missile | right button | X / K |
| Pause | — | Esc / P |
| Confirm / skip tally | left click | Enter / Space |

## Debug

URL parameters: `?debug=1&seed=42&difficulty=hard&chapter=3&wave=10&god=1&gallery=1`.

Debug keys (with `debug=1`): `1` hitboxes · `2` god mode · `3` kill all · `4` power +1 · `5` cycle weapon · `6` +5 missiles · `7` jump to boss.

## Architecture

```
            ┌──────────── src/app: loop, screens, view ─────────────────┐
 input ──▶  │  InputFrame ──▶ sim.step(state, input, DT)  (60 Hz fixed) │
            │                      │ state.events (per tick)            │
            │        ┌─────────────┼───────────────┐                    │
            │        ▼             ▼               ▼                    │
            │  renderer.handleEvents  audio.handleEvents  app.onSimEvents│
            │  every animation frame:                                   │
            │   renderer.render(state) → drawHud(state)                 │
            │   audio.update(screen, state)                             │
            │   DOM menus overlay #ui                                   │
            └────────────────────────────────────────────────────────────┘
 src/sim: pure deterministic game logic, no DOM
```

- **Simulation** (`src/sim`) owns every game rule. `GameState` is plain JSON-safe data mutated by `step()`; all randomness comes from a seeded RNG in the state, so a seed plus an input sequence always replays the same game.
- `step()` clears `state.events` and refills it with what happened that tick. The renderer and audio react to events (particles, sounds) and read the state each frame. Rendering never changes gameplay.
- **Menus** are DOM elements in `#ui`; the **HUD** is drawn on the canvas. The logical world is 1280×720, letterboxed to the window.

### File map

| Path | Contents |
|---|---|
| `src/main.ts`, `src/app/` | entry point, fixed-step loop, letterbox view, screen flow, URL params, FPS meter |
| `src/input/` | keyboard and mouse → `InputFrame` |
| `src/shared/contracts.ts` | interfaces between sim, renderer, UI and audio |
| `src/sim/types.ts`, `events.ts`, `tuning/core.ts` | game state, events, core constants |
| `src/sim/game.ts` | `createGame`, `step`, phase machine (waves, chapters, victory, endless) |
| `src/sim/combat.ts`, `collisions.ts`, `pickups.ts`, `scoring.ts` | damage, collisions, drops and food, score and extra lives |
| `src/sim/player.ts`, `weapons.ts`, `projectiles.ts`, `missile.ts` | ship, four weapons with power and heat, projectiles, missiles |
| `src/sim/bosses.ts`, `bosses/` | the five bosses and their attacks |
| `src/sim/enemies.ts`, `behaviors.ts`, `patterns/` | enemy table, egg dropping, movement patterns |
| `src/sim/waves.ts`, `chapters.ts` | wave spawner and the 50-wave chapter tables |
| `src/sim/difficulty.ts`, `tuning/*` | difficulty table, chapter scaling, all tuning numbers |
| `src/sim/rng.ts`, `math.ts`, `ids.ts`, `debug.ts` | seeded RNG, math helpers, ids, debug commands |
| `src/render/` | procedural sprite atlas, world renderer, backgrounds, particles, screen shake, sprite gallery |
| `src/ui/` | HUD, banners, chapter tally, menu screens, settings and high-score storage |
| `src/audio/` | Web Audio synth, sound effects, procedural music |
| `tests/` | Vitest suites, one prefix per area (`a1.*` core and integration … `a5.*` visuals) |
| `docs/` | `SPEC.md`, team `STATUS.md`, `REQUESTS.md`, `DECISIONS.md` |
