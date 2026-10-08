# DECISIONS

Append-only, one line per spec-silent decision.

- [A1] Dependencies installed at the §4.1 majors (typescript 5, vite 6, vitest 3, @types/node 22); no substitutions needed.
- [A1] createGame's initial events (`wave_start`, `boss_warning`) are dispatched by the app right after createGame, since step() clears events first. Same for events from `continueEndless` and debug commands.
- [A1] The step loop also stops early inside a frame once the screen leaves `playing` (game over / victory), so no extra ticks run behind the overlay.
- [A1] Victory banner ttl = 999 s (spec gives none), same as GAME OVER.
- [A1] `continueEndless` also sets the "WARP TO CHAPTER n" banner, replacing the 999 s victory banner.
- [A1] Boss-wave banner falls back to "BOSS APPROACHING" if `spawnBoss` did not set `bossName`.
- [A1] Pickups are clamped to x ∈ [16, 1264]. Sway pickups move with the derivative of a sine offset, so they sway ±amp around their spawn column.
- [A1] Gift "gentle spin" = 1 rad/s; power cores don't spin.
- [A1] Boss drops: the 2 power cores spawn at boss x ± 60, the gift at the boss center; they fall with their normal motion.
- [A1] Non-boss random drop is one roll r: r < core chance → power core; else r < core + 1.2% → gift.
- [A1] Food drop rolls the rng only when `foodChance < 1` (chick 20%).
- [A1] Debug `chapter`/`wave` URL params apply to every game started in that page session (Play and Retry), only with `debug=1`. `gallery=1` works without `debug=1`.
- [A1] Esc/P only pause; resuming is the pause menu's job (A4).
- [A1] Debug `jumpToBoss` is ignored in `game_over` / `victory`.
