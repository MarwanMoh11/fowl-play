# STATUS

PHASE 0 DONE — CONTRACT v1

Each agent edits ONLY its own section. Contract changes are announced here as `CONTRACT vN: <change>`.

## A1 — Lead / Core / Integrator
**Gates**
- **M1 PASSED** and **M2 PASSED (automated part)** — 2026-10-08. `npm run check` green: 30 test files, 552 tests, build 155 kB (56 kB gzip). `ENFORCE_NO_STUBS = true`; no STUB/TODO/FIXME in src. Determinism, smoke bot (chapter 1 in 3.4 sim-min at power 10, longest wave = boss 82 s), all-tables (chapters 1–6 × 10 waves + full killAll run to exactly one victory) all pass.
- Browser pass (dev server, 1280×760): gallery shows all 40 sprite keys with flash variants and frames; title, chapter banner, grid wave, firing, overheat, feathers/food/popups, Rooster boss with boss bar, game-over screen with name entry all render; no console errors or warnings.
- Perf (in-page timing, c5w9, power 10): sim ≈ 0.005 ms/tick, render ≈ 0.2 ms CPU/frame. Real frame pacing not measurable in the hidden pane → needs a human visual pass (§10.4).

**Done**
- Phase 0 (scaffold, contracts, core sim, app shell, stubs).
- combat, collisions, pickups, scoring, debug, economy; phase timers exact in ticks.
- Tests: a1.static, rng, scoring, pickups, combat, collisions, phase, determinism, smoke, alltables (+ a1.invariants, a1.helpers).
- README: run, controls, debug keys, architecture diagram, file map.

**Doing** —
**Blocked** —
**Next**
- M3: human play-test for feel/balance and fps on a real window; then M4 cross-review and §12 checklist.

## A2 — Player & Combat
**Done**
- `tuning/weapons.ts`, `player.ts`, `projectiles.ts`, `weapons.ts` (pulse/neutron/laser/arc), `missile.ts` — all P0 + P1 weapon items implemented and tested.
- `bosses.ts` + `bosses/*.ts` + `tuning/bosses.ts`: all five bosses (entry, movement, attack cycles, telegraphs/beams, minions, phases, twins, dreadnought shield).
- Tests (160 passing): a2.player, a2.projectiles, a2.weapons, a2.missile, a2.bosses, a2.bossAttacks (unit tests mock A3's enemies/waves via `tests/a2.fakeEnemies.ts`), a2.integration (real A3 enemies/waves: all 5 boss waves + minion behaviors).
- ALL P0 + P1 items of §9.A2 done. P2 not started.
**Doing** — idle.
**Blocked** —
**Next** — M3 balance feedback (tuning in `tuning/weapons.ts` / `tuning/bosses.ts` only).
**API notes (A1/A3)**
- `spawnProjectile` does NOT emit `egg_dropped` / `enemy_shot` events and does not scale velocity: callers (A3 dropEgg/UFO) emit and apply shotSpeed. Egg defaults: accel (0,420), maxSpeed 420 × eggSpeed (pass vy 60 yourself).
- `ProjectileInit` adds optional `rotation`. Rotation defaults to angleOf(vel)+π/2 for bolt/missile/feather_knife.
- `bosses.ts` also exports `bossMaxHp(state, id)`. Boss minions: brood = `chick` + `seek`, hatchlings = `chicken_basic` + `stream`, escorts = `chicken_ufo` + `lane`. When the last boss dies, A2 silently kills (alive=false, no points/drops) any non-boss enemy with seek/stream/lane behavior.
- Boss `spawnBoss` needs A3's `spawnEnemy` to keep the `behavior` object passed in (`{type:'boss', rt}`) and to NOT reset hp/isBoss afterwards.

## A3 — Enemies & Waves
**Done**
- All P0 + P1 of §9.A3: `tuning/enemies.ts`, `chapters.ts` (50 waves, endless naming), `enemies.ts`, `behaviors.ts`, `waves.ts`, `patterns/*` (grid, divers, stream, swoop, ring, bouncers, asteroids, ufo, swarm, boss). Typecheck clean for my files; no STUB left.
- Tests (223 passing): `a3.chapters`, `a3.patterns`, `a3.carry`, `a3.enemies`, `a3.waves` (includes an all-tables killAll check with a mocked `bosses` module).
**Doing** —
**Blocked** —
**Next**
- P2 (endless variety for chapters 6+) skipped. Ready for M1/M2 gate findings.
**API notes**
- `spawnEnemy(state, kind, x, y, behavior, opts?: { counted?: boolean })`: optional 6th arg; default consumes the wave carry plan (boss kinds never do). `isBossKind`, `ENEMY_DEFS` (+`splitInto`), `waveDef`/`chapterDef`/`chapterDisplayName`/`CHAPTERS`/`toRoman` in chapters.ts, `buildCarryPlan` in waves.ts.
- Boss waves call `spawnBoss` inside `startWave` (so `bossName` is set before the banner); the wave completes when all enemies are dead.
- `swarm` behavior got an optional `group` field; `WaveRuntime.lost?` added. Shared `seek`/`stream`/`lane` behaviors are moved by `updateEnemies` (A2 minions).
- `dropEgg` emits `egg_dropped`; UFO/lane shots emit `enemy_shot`.

## A4 — UI & Audio
**Done** (all P0 + P1 of §9.A4; P2 skipped)
- HUD: bottom bar, score, chapter/wave, FPS, boss bar with threshold ticks, overheat flash, banners, chapter tally with count-up + multiplier line (`hud.ts`, `hud-bar.ts`, `banners.ts`, `tally.ts`, `text.ts`).
- Storage + high scores with injectable KV (`storage.ts`, `highscores.ts`).
- DOM UI (`index.ts`, `screens/*`, `menu.ts`, `nav.ts`, `widgets.ts`, `styles.css`): title (Play, difficulty, scores, settings, how to play, credits), pause (+quit confirm, settings), game over / victory with name entry and highlighted table. Keyboard + mouse navigation; menu keys are stopped before the app's window listener.
- Audio (`src/audio/*`): graph (master -> compressor), unlock, volumes, 24-voice cap, per-sound throttle, all §8.8 sounds mapped from events, tally ticks, UI sounds; music engine (25 ms look-ahead scheduler, crossfade 0.5 s, pause duck) with 5 original tracks.
- Tests: `a4.storage` (14), `a4.hud` (15), `a4.audio` (15), `a4.music` (20), `a4.ui` (16) — all green.
**Doing** —
**Blocked** —
**Next** — visual / audible pass by A1 (no browser used by A4). P2 (gamepad menu nav, touch pause button) not done.
**API notes**: `createAudio()` takes optional test hooks only; `audio.update` uses `state.phaseTimer` for tally ticks. `loadSettings(kv?)` defaults to `safeStorage()`.

## A5 — Visuals
**Done** (all P0 + P1 of §9.A5; typecheck clean for src/render + tests/a5; `npx vitest run tests/a5.` = 3 files, 37 tests green)
- Sprites: all 42 keys drawn in code (src/render/sprites/*), registry + 2x shelf-packed atlas + white-flash atlas, SpriteApi (draw/size/toCanvas). Glow padding via `SpriteDef.pad`.
- Renderer (renderer.ts, overlays.ts): §8.3 draw order, entity->sprite maps, frame selection, invuln blink + shield, hazards, hit-flash overlay, debug hitboxes, attract mode, ends at logical scale with default ctx state.
- Effects (effects.ts, particles.ts, shake.ts): 2000-particle pool, every §8.5 event effect, arc lightning, steam, boss death ghost + staggered explosions, shake, flash overlay (reduceFlashes x0.3).
- Backgrounds (background.ts, decor.ts): chapter gradients, 3 star layers, planets/nebulae, 2 s palette crossfade, warp streaks.
- Gallery (gallery.ts): scrollable grid, labels, flash variant beside frame 0.
- Tests: a5.sprites (registry, sizes, atlas packing, strict mock-canvas draw check, bounds), a5.particles, a5.render.

**Doing** — idle; waiting for A1's visual pass (gallery + waves) for fixes.
**Blocked** — nothing.
**Next** — P2 skipped as instructed (engine trail, planet parallax).

**Notes for A1 / A4**
- `sprites.draw(ctx, key, x, y, {frame, rotation, scale, alpha, flash, flipX})`; `toCanvas(key, frame)` returns the glow-padded cell with CSS size set to logical px. Sprites are built at 2x on first `createRenderer()` call (about 28 MB of canvas for both atlases).
- `render()` resets alpha, text align/baseline, line width/cap/join, dash and composite op before returning (transform left at `view.scale`, no shake).
- Renderer detects a new game by GameState object identity inside `handleEvents`, so always dispatch createGame's initial events through `handleEvents(events, state)` as planned.
- Art was checked without a browser: strict mock-canvas tests (valid calls, painted bounds inside sprite box + padding) and a throwaway canvas-to-SVG replay that I eyeballed (sprites, a populated scene, 5 chapter backgrounds). Real-canvas details (clipping, gradients, 2x downscale) are untested, so please look at `?gallery=1` first.
