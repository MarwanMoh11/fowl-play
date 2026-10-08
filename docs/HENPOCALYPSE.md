# FOWL PLAY: HENPOCALYPSE — Expansion Plan & 5-Agent Build Spec

**Version 2.0** · Lead + 5 agents (H1–H5) · Builds on v1 (`docs/SPEC.md`, still valid where this file is silent).
Stack unchanged: TypeScript + Canvas 2D + Web Audio, zero runtime dependencies, all art and audio generated in code.

---

## 0. The pitch

v1 was a faithful "chicken invasion" shooter: 5 chapters, 4 weapons, 5 bosses. HENPOCALYPSE turns it into its own IP:
a roguelite score-attack shooter with a real galaxy, a villain, builds, modes and meta progression.

**Lore.** The **Cluckhive Empire**, ruled by **EMPRESS YOLKANDA** from her throne at the galaxy's core, has begun to
*scramble* every world in the Milky Whey. The Coop Defense Force has one squadron left: you. Fly out through the
five classic sectors, then push past the Mother Coop into the Empire's heartland — Nebula Nests, the Solar Forge,
the Clockwork Coop, the Yolk Sea, Thunderhead Roost, the Black Hole Barnyard — and finally the Cluckhive Throne.
Collect **Golden Corn** from the wreckage to upgrade your hangar between runs.

**Tone.** Bright, loud, absurd, readable. Every pun is fair game; nothing copied from any existing game.

### 0.1 Before → after

| | v1 | HENPOCALYPSE |
|---|---|---|
| Chapters / waves | 5 / 50 | **12 / 120** (+ infinite Onslaught) |
| Bosses | 5 | **12 bosses + 7 mini-bosses** (multi-phase, a rebirth, a 3-form final boss) |
| Enemy types | 8 (+4 boss kinds) | **24** (+19 boss kinds), each new one with an ability |
| Weapons | 4 | **10** |
| Ships | 1 | **4** with distinct stats |
| Power-ups | — | **6 timed/charge power-ups** + extra life, golden egg |
| Run builds | — | **30 perks**, 1-of-3 draft after every boss and mini-boss |
| Score systems | score, food | + **combo chains (×8)**, **fury → overdrive**, golden chickens, chain explosions |
| Modes | campaign (+endless loop) | **Campaign, Onslaught, Boss Rush, Daily Clutch** + 8 mutators |
| Meta | high scores | **Golden Corn, Hangar (ships + 8 upgrades), 42 achievements, Codex, lifetime stats, per-mode boards** |
| Hazards | boss beams | + **gravity wells, solar flares, lightning storms** |
| Music | 5 tracks | **11 tracks** |
| Sprites | 40 keys | **117 keys** |

---

## 1. How this build runs

1. **Phase 0 — DONE by the lead** (commit `[LEAD] HENPOCALYPSE Phase 0`). Every shared contract already exists,
   compiles, and is covered by tests. Every new key has a **placeholder** (sprite, boss behavior, weapon, chapter
   table, sound mapping) so the game runs end to end today. Your job is to **replace placeholders with the real thing**.
2. **Phase 1 — H1…H5 in parallel**, each in its own files (§3). No agent waits on another.
3. **Phase 2 — the lead integrates**: full test suite, browser play-through, fixes requests, flips the final-gate
   test (`tests/a1.henpocalypse.test.ts`: `ENFORCE_NO_PLACEHOLDERS`), commits each agent's files, updates README.

---

## 2. Rules for every agent (read twice)

1. **Ownership is absolute.** Create/edit only files you own (§3). Never edit, reformat, move or delete anyone
   else's file — including tests. Need something changed elsewhere? Append a line to `docs/requests/H#.md`
   (`- [H3→LEAD] need X because Y`) and work around it.
2. **Contracts are frozen.** Lead-owned (do not edit): `src/sim/types.ts`, `events.ts`, `tuning/core.ts`,
   `tuning/loadout.ts`, `tuning/economy.ts`, `mods.ts`, `powerups.ts`, `draft.ts`, `modes.ts`, `game.ts`,
   `pickups.ts`, `combat.ts`, `collisions.ts`, `scoring.ts`, `difficulty.ts`, `debug.ts`, `rng.ts`, `math.ts`,
   `ids.ts`, `src/shared/contracts.ts`, `src/app/**`, `src/input/**`, `src/render/sprites/placeholder.ts`,
   `index.html`, `package.json`, `README.md`, `tests/a1.*`.
3. **The sim is pure and deterministic** (v1 §2.5): no `Math.random`, `Date`, DOM, audio or canvas under `src/sim/`;
   randomness only via `src/sim/rng.ts` with `state.rng` (or a local `{ s: seed }` RngState in pure generators);
   `GameState` stays JSON-safe. `tests/a1.static.test.ts` enforces this.
4. **Numbers live in tuning files / data tables** as named constants, not inline.
5. **Read before you call.** Open a function's file and read its signature before using it. Read
   `src/sim/types.ts`, `src/sim/events.ts`, `src/sim/tuning/loadout.ts` and `src/shared/contracts.ts` before starting.
6. **Small compiling steps.** The whole team shares one working tree: a file of yours that does not compile breaks
   everyone's typecheck. Make each edit leave your files compiling. Prefer targeted `Edit`s over rewriting whole files.
7. **Files ≤ 400 lines, functions ≤ 60 lines.** Split new content into new files you own (names in §3).
8. **Verification, cheaply.**
   - Typecheck: `npx tsc --noEmit 2>&1 | grep -E "<your paths>" | head -30` — fix only errors in your files.
     Errors in other people's files are theirs; ignore them (if one blocks you for long, note it in your status file).
   - Tests: run **only your own test files**, e.g. `npx vitest run tests/h3. tests/a3.` — never `npm test`,
     `npm run check`, `npm run build` or the dev server (the lead runs those; parallel full runs overload the machine).
   - Pipe long output through `tail`/`grep`. Never poll with `sleep`.
   - If the same fix fails twice, stop, rethink, or write the blocker in your status file and move on.
9. **No git.** Do not `git add`, `commit`, `stash`, `checkout` or `reset`. The lead commits your files at integration.
10. **Placeholders out.** When you replace a placeholder, delete its marker comment (`Phase-0 placeholder`,
    `Phase 0:`) and any `placeholderSprite` use in your files. The final gate fails while any remain.
11. **Status.** Keep `docs/status/H#.md` current (Done / Doing / Blocked / Not done). Record spec-silent choices in
    `docs/decisions/H#.md`, one line each (`[H2] Kraken grab telegraph width 140 (spec gives none).`).
12. **Originality.** Names, art, music, sounds, text: all original. Never reference any existing commercial game.
13. **Angles**: radians in code; y points down; straight down = +π/2. Degrees in this doc use the same convention.
14. **Work in priority order** (all P0, then P1, then P2) and don't stop early. Report with a "Not done" list.

---

## 3. Team and file ownership

| Agent | Codename | Owns |
|---|---|---|
| **LEAD** | Integrator | everything listed in §2.2 |
| **H1** | ARSENAL | `src/sim/player.ts`, `weapons.ts`, **`weapons2.ts` (new)**, `projectiles.ts`, `missile.ts`, `tuning/weapons.ts`, **`tuning/weapons2.ts` (new)**, `src/render/sprites/arsenal.ts`, `tests/h1.*.test.ts`, `tests/a2.player|a2.weapons|a2.projectiles|a2.missile|a2.helpers|a2.integration.test.ts` |
| **H2** | WARLORDS | `src/sim/bosses.ts`, `bosses.types.ts`, `src/sim/bosses/**` (new files per boss), `tuning/bosses.ts`, **`tuning/bosses2.ts` (new)**, `src/render/sprites/bosses2.ts` (+ `bosses3.ts` if needed), `tests/h2.*.test.ts`, `tests/a2.bosses|a2.bossAttacks|a2.bossHelpers|a2.fakeEnemies.ts` |
| **H3** | ARMADA | `src/sim/enemies.ts`, `behaviors.ts`, `behaviors.types.ts`, `patterns/**`, `waves.ts`, `waves.types.ts`, `chapters.ts`, `chapters2.ts`, `onslaught.ts`, **`abilities.ts`, `envHazards.ts`, `chapterKit.ts` (new)**, `tuning/enemies.ts`, `src/render/sprites/armada.ts` (+ `armada2.ts` if needed), `tests/h3.*.test.ts`, `tests/a3.*` |
| **H4** | INTERFACE | `src/ui/**`, `src/audio/**`, `tests/h4.*.test.ts`, `tests/a4.*` |
| **H5** | SPECTACLE | `src/render/**` **except** `sprites/arsenal.ts`, `sprites/armada*.ts`, `sprites/bosses2.ts`/`bosses3.ts`, `sprites/placeholder.ts`; `tests/h5.*.test.ts`, `tests/a5.*` |

Coordination files: `docs/status/H#.md`, `docs/requests/H#.md`, `docs/decisions/H#.md` — each agent only its own.

---

## 4. What Phase 0 already gives you (read the code — it is the source of truth)

| Concept | Where | Notes |
|---|---|---|
| New unions: `WeaponId` (10), `ShipId`, `GameMode`, `MutatorId`, `PerkId`, `PowerupId`, `UpgradeId`, new `EnemyKind`s, `PickupKind`s, `ProjectileKind`s, `Phase 'perk_draft'`, `HazardKind 'gravity'` | `src/sim/types.ts` | |
| New fields | `Player`: `ship, shield, revives, fury, overdrive, powerups` · `Enemy`: `shield, maxShield, skillTimer, skillState, parentId` · `Projectile`: `homing, targetId, fuse, age` · `Hazard`: `power` · `GameState`: `mode, loadout, mods, perks, draft, combo, corn, waveCount` · `Stats`: `maxCombo, bossesKilled, goldenKills, powerups, overdrives` · `InputFrame.overdrive?` | |
| `Modifiers` (`state.mods`) | `types.ts`, built by `mods.ts` from ship + upgrades + mutators + perks | **Read `state.mods` wherever your system has a matching knob** (table §4.1) |
| Ships, upgrades, mutators, perks, power-up/combo/fury numbers | `src/sim/tuning/loadout.ts` | UI reads names/descriptions from here |
| Combo, fury, overdrive start/stop, power-up timers, drones (`droneCount`, `dronePos`), time warp (`enemyTimeScale`) | `src/sim/powerups.ts` | |
| Perk draft (`rollDraft`, `applyDraftChoice`), `choosePerk` | `draft.ts`, `game.ts` | app opens the draft screen on `perk_draft` |
| Modes: `finalChapter`, `wavesInChapter`, `currentWaveDef/Info`, `BOSS_RUSH_ORDER`, `dailyMutators`, `dailySeed` | `src/sim/modes.ts` | |
| Enemy shields absorb damage first; combo × points; fury; chain explosions | `combat.ts` | `damageEnemy` sets `e.skillTimer = 0` on shield hits (use it for regen delay) |
| Power-up / corn / life / golden-egg pickups, magnet, drop tables, gifts limited to unlocked weapons (`availableWeapons`) | `pickups.ts` | |
| Player shields & revives, ship stats in `createPlayer(d, loadout)` | `player.ts` (H1 owns from now on) | |
| Gravity wells pull the ship | `game.ts updateHazards` | any agent may spawn `{ kind: 'gravity', a: center, b: center, width: radius, power, lethal: false, ownerId }` |
| Time warp: enemies, spawner and enemy projectiles get scaled dt; enemy projectile speed × `mods.enemyShotSpeedMul` | `game.ts`, `projectiles.ts` | |
| `onBoltHit(state, bolt, enemy)` hook after every player-bolt hit | `collisions.ts` → `weapons.ts` (H1) | |
| Paged sprite atlas (≤ 3 pages of 2048×4096; sprites > 60 000 px² bake at 1.25×) | `render/sprites/atlas.ts` (H5 owns) | |
| 77 new sprite keys with placeholder art | `contracts.ts SPRITE_KEYS`; files `arsenal.ts` (H1), `armada.ts` (H3), `bosses2.ts` (H2), `loot.ts` (H5) | keep each key; you may change w/h/frames (update nothing else — the registry reads your defs) |
| UI contract: `onStart(StartOptions)`, `onDraftChoice(i)`, `showDraft(state)`, `trackEvents(events, state)`, richer `RunSummary`, `MODE_INFO`, `STORAGE_KEYS.profile/modeScores/loadout` | `contracts.ts` | |
| Debug: URL `?debug=1&mode=boss_rush&ship=bantam&mutators=turbo,feast&chapter=7&wave=5&god=1`; keys `8` power-up, `9` fill fury, `0` kill all | `app/params.ts`, `debug.ts` | use these to look at your work if you have a browser — but **don't start a dev server yourself** |
| Overdrive input: `C`, `L`, `Shift`, middle mouse | `input/input.ts` | |

### 4.1 Who reads which modifier

| `state.mods` field | Read by |
|---|---|
| `damageMul, fireRateMul, heatMul, moveSpeedMul, extraBolts, pierceBonus, boltSpeedMul, critChance, bossDamageMul, missileDamageMul, missileCooldownMul, droneCount` | **H1** |
| `enemyHpMul, enemyEggRateMul` (already applied in `spawnEnemy`), `enemySpeedMul` (H3 multiplies the `speed` passed to behaviors), `luck` (golden chickens) | **H3** |
| `pickupRadiusMul, magnetRadius, dropMul, foodMul, scoreMul, comboWindow, furyGainMul, overdriveTime, chainRadius, enemyShotSpeedMul, powerLossOnDeath, invulnBonus, shieldPerChapter` | already applied by LEAD code |

### 4.2 Event matrix (emitter → consumers). Every new event must be handled by every listed consumer.

| Event | Emitted by | H4 audio | H4 UI/HUD | H5 fx |
|---|---|---|---|---|
| `combo` / `combo_break` | lead | `combo_up` / `combo_break` | combo meter, achievements | popup text |
| `fury_full` | lead | `fury_ready` | fury bar pulse + hint | ship ring flash |
| `overdrive_start` / `overdrive_end` | lead | `overdrive_on` / `overdrive_off` | fury bar drains | shockwave, aura on/off |
| `powerup_start` / `powerup_end` | lead | `powerup_on` / `powerup_off` | timer icons | ring + sparkles / fizzle |
| `shield_absorb` | lead | `shield_pop` | shield pips | bubble shatter |
| `player_revived` | lead | `revive` | achievement | golden feather burst |
| `enemy_shield_hit` / `enemy_shield_break` | lead | `enemy_shield` / `shield_break` | — | blue sparks / shatter ring |
| `enemy_teleport`, `enemy_cloak` | **H3** (and H2 bosses) | `teleport`, `cloak` | — | smoke puffs + purple sparks |
| `enemy_heal` | **H3** | `heal` | — | green ring + "+" particles |
| `pod_hatch` | **H3** | `pod_hatch` | — | yolk splat + shell debris |
| `projectile_burst` | **H1** (cluster egg), **H3** (mine) | `burst` | — | orange ring + sparks |
| `golden_appear` / `golden_escaped` | **H3** | `golden` / `golden_gone` | achievement | sparkles / "IT GOT AWAY!" |
| `rail` | **H1** | (`fire_rail` via `player_fire`) | — | beam + impact sparks |
| `chain_explosion` | lead | `chain_pop` | — | popcorn burst |
| `crit` | **H1** | `crit` | — | "CRIT!" mini popup |
| `drone_fire` | **H1** | `drone` (throttled) | — | muzzle flashes at drones |
| `perk_draft` / `perk_chosen` | lead | `perk_draft` / `perk_pick` | draft screen, achievements | rarity sparkle at ship |
| `corn_collected` | lead | `corn` | corn counter | small sparkle |
| `player_fire` (6 new weapons) | H1 | `fire_<weapon>` | weapon name/icon | muzzle in weapon colour |
| `boss_attack` / `boss_phase` / `boss_killed` (new bosses) | **H2** | existing | boss bar | existing + per-boss colours |

---

## 5. Game modes (implemented by the lead; UI by H4)

| Mode | Rules | Ends |
|---|---|---|
| **Campaign** | Chapters 1–12 (`FINAL_CHAPTER = 12`). Chapters 6–12: wave 5 mini-boss, wave 10 boss. Perk draft after every boss/mini wave. Victory → optional endless continue (chapter 13 = chapter 1 "II", harder). | victory after ch 12 |
| **Onslaught** | Infinite sectors of 10 procedurally generated waves (H3 `onslaught.ts`). Wave 5 mini (sector ≥ 2), wave 10 boss cycling all 12. All 10 weapons drop from the start. | game over only |
| **Boss Rush** | 12 "chapters", each one boss wave in `BOSS_RUSH_ORDER`. Draft after each. | victory after the Empress |
| **Daily Clutch** | Seed and 2 mutators from the local date (`dailySeed`, `dailyMutators`), chapters 1–3, separate daily board. | victory after ch 3 |

Mutators (any mode except Daily, chosen on the loadout screen): see `MUTATORS` in `tuning/loadout.ts`.

---

## H1 — ARSENAL (player, weapons, projectiles, ships, drones)

Read first: `weapons.ts`, `projectiles.ts`, `player.ts`, `missile.ts`, `tuning/weapons.ts`, `powerups.ts`,
`tuning/loadout.ts`, `collisions.ts` (to see where `onBoltHit` is called).

### P0
1. **Six new weapons** in new `src/sim/weapons2.ts` (numbers in new `src/sim/tuning/weapons2.ts`, 11 power levels
   each, index = power 0…10). Remove the placeholder `default:` branch in `fireVolley` and dispatch to `weapons2.ts`.
   Replace the placeholder rate/heat entries in `WEAPON_RATE`/`WEAPON_HEAT`. All are `kind: 'bolt'` projectiles with
   their `weapon` id unless stated.

   | Weapon | Rate /s | Heat | Volley (per power level 0…10) |
   |---|---|---|---|
   | `flak` SCATTER FLAK | 3.2 | 9 | pellets `[5,6,7,7,8,9,9,10,11,12,13]` evenly over a cone of `40 + 3×level`° centred up, each pellet angle + `((i×37) % 7 − 3)`° jitter; speed 900 × (0.9 + 0.2 × ((i×53) % 11) / 10); ttl 0.38 s; radius 4; damage `[1,1,1,1,2,2,2,2,2,3,3]`; pierce 1 |
   | `flame` PLASMA TORCH | 16 | 3.2 | flames `[1,1,2,2,2,3,3,3,4,4,5]`, angle up ± (12 + 1.2×level)° spread evenly, alternate the offset sign on odd ticks; speed 620; ttl 0.32 s; radius 9; damage `[1,1,1,1,1,1,2,2,2,2,2]`; pierce 3 |
   | `sickle` SKY SICKLE | 2.2 | 10 | blades `[1,1,2,2,2,3,3,3,4,4,4]` fanned ±8° apart, vy −1100, accel ay +1500 (they fly up, stop, fall back through the ship), ttl 1.6 s, radius 13, pierce 99, damage `[2,3,3,3,4,4,5,5,6,6,7]`. Set `fuse = 1` at spawn; in `updateProjectiles`, the first tick `vel.y > 0` clear `hitIds` and set `fuse = 0` (so the return trip hits again) |
   | `homing` HIVE SEEKERS | 6 | 6 | seekers `[1,1,2,2,3,3,4,4,5,5,6]` launched at −90° ± 25°×k (alternating sides), speed 560, `homing` 5.5 rad/s, radius 5, damage `[1,1,1,1,1,2,2,2,2,2,3]`, ttl 2.2 s |
   | `rail` RAIL LANCE | 1.4 | 22 | **hitscan**: vertical segment from the nose to y = 0, width `[10,10,12,12,14,14,16,16,18,18,22]`; every non-invulnerable enemy whose circle touches it (`segmentCircleHit`) takes damage `[10,13,16,19,22,26,30,34,38,43,50]` with source `'rail'`. Emit `{ type: 'rail', x, y0: nose.y, y1: 0, width }`. `extraBolts` adds parallel lances ±24 px. Counts as 1 shot fired; 1 hit if anything was struck |
   | `prism` PRISM SPLITTER | 4 | 8 | crystals `[1,1,1,2,2,2,3,3,3,4,4]` parallel 16 px apart, speed 1000, radius 7, damage `[3,3,4,4,5,5,5,6,6,7,8]`, pierce 1. In `onBoltHit`, a primary crystal (`fuse === 0`) spawns shards `[2,3,3,3,4,4,4,5,5,6,6]` spread evenly over the upper 180° from the hit point: weapon `'prism'`, `fuse = 1` (shard, never splits), speed 700, radius 4, damage `ceil(primary/2)`, pierce 1, ttl 0.6 s, `hitIds = [enemy.id]` |
2. **Projectile behaviours** in `updateProjectiles`:
   - homing steering for any projectile with `homing > 0`: player-owned → steer toward `targetId` (re-acquire the
     nearest alive, non-invulnerable enemy above the ship when the target is gone; fly straight if none); enemy-owned
     → steer toward the player (straight if dead). Turn at most `homing × dt` radians per tick, keep speed.
   - `cluster_egg`: count `fuse` down (enemy time scale applies); at ≤ 0 → 6 `shard`s in a ring (speed 200,
     owner enemy), kill the egg, emit `projectile_burst`. Cluster eggs also splat at `GROUND_Y` like eggs (no burst).
   - `gear`: `rotation += 6 × dt`. `void_orb`, `fireball`, `shard`: straight unless `homing > 0`.
3. **Modifiers everywhere** (`state.mods`, see §4.1):
   - rate × `fireRateMul` × (`RAPID_FIRE_MUL` while `player.powerups.rapid > 0`) × (`OVERDRIVE_FIRE_MUL` while `player.overdrive > 0`);
   - heat gain × `heatMul` × (`RAPID_HEAT_MUL` while rapid) × (0 while overdrive);
   - damage × `damageMul` × (`OVERDRIVE_DAMAGE_MUL` while overdrive) for bolts, arc and rail; `pierceBonus` (+1 more in overdrive) on every bolt except flak; speeds × `boltSpeedMul`;
   - `extraBolts`: pulse +1 bolt and +6° spread per stack; neutron/laser/prism +1 parallel; flak +2 pellets; flame/homing/sickle +1; rail +1 lance; arc +1 chain target;
   - crits and boss bonus in `onBoltHit`: `extra = bolt.damage × ((enemy.isBoss ? bossDamageMul : 1) × (crit ? CRIT_MUL : 1) − 1)`, crit rolled with `rngChance(state.rng, critChance)` only when `critChance > 0`; if `extra > 0` and the enemy is alive, `damageEnemy(state, enemy, extra, 'bolt')`; emit `crit` on crits. Arc and rail apply the same multipliers inline;
   - missiles: boss damage × `missileDamageMul`, cooldown × `missileCooldownMul`;
   - ship speed (keyboard and pointer max speed) × `moveSpeedMul`.
4. **Drones**: every time the ship fires a volley and `droneCount(state) > 0`, each drone fires one `bolt`
   (weapon `'pulse'`, damage `max(1, round(level damage of the current weapon × 0.5))`, speed 900, radius 4,
   pierce 1 + `pierceBonus`) from `dronePos(state, i)` straight up — or toward the nearest enemy within a 30° cone.
   Drone volleys are capped at 8/s. Emit one `drone_fire` per volley with the first drone's position.
5. **Sprites** — replace every placeholder in `src/render/sprites/arsenal.ts` using the helpers in
   `sprites/draw.ts` and colours in `sprites/palette.ts` (look at `sprites/ship.ts` and `sprites/projectiles.ts` for the
   house style: thick dark outline `PAL.outline`, flat colours, soft glows). Ships point up, 3 frames = engine flame
   flicker (like `ship`): **Bantam** small dart-shaped green interceptor; **Bulwark** wide armoured gold gunboat with
   twin hull pods; **Phoenix** orange-red ship with swept flame-feather wings. **Drone**: small cyan orb-pod with a
   blinking light (2 frames). Projectiles point up: flak = orange pellet; flame = soft orange-white fireball
   (2 frames); sickle = cyan crescent blade (2 frames, rotated by the renderer); homing = lime micro-missile with
   flame (2 frames); rail = white-cyan lance segment; prism = magenta crystal.

### P1
6. Tests `tests/h1.weapons2.test.ts`, `tests/h1.mods.test.ts`, `tests/h1.projectiles2.test.ts`: every weapon fires at
   every level without throwing and with the table's projectile count; rail damages a column and skips invulnerable
   enemies; prism splits once (shards never split); sickle returns and re-hits; homing turns toward a target;
   flak dies within ~350 px; cluster eggs burst into 6 shards; time warp halves enemy projectile travel; drones fire;
   damage/rate/heat modifiers and overdrive apply; crit chance 1 doubles damage.
7. Balance check test: sustained DPS (single target, power 10, no mods) of every weapon is within 0.6×–1.6× pulse's
   (compute from tables; rail and sickle may use burst damage over 1 s).
8. Keep v1 tests `a2.player|weapons|projectiles|missile` green; update them only where HENPOCALYPSE changed behaviour.

### P2
9. Overdrive feel: during overdrive every volley also fires from the drones even without the power-up (2 phantom drones).
10. Weapon-specific heat colour hints are H4/H5's; no work here.

---

## H2 — WARLORDS (bosses and mini-bosses)

Read first: `bosses.ts`, `bosses/common.ts`, `bosses/hen.ts`, `bosses/rooster.ts`, `bosses/dreadnought.ts`,
`bosses/attacks*.ts`, `tuning/bosses.ts`, `BOSS_INFO` in `contracts.ts`, `combat.ts` (`onBossDamaged` runs
**before** the death check, so a boss can refuse to die there — the Phoenix uses this).

### Framework
- One behavior module per boss: `src/sim/bosses/<id>.ts` exporting a `BossBehavior`; register it in `BEHAVIORS`
  (replace each placeholder). Shared new attack helpers go in `src/sim/bosses/attacksNew.ts` (spiral, ring, aimed
  fan, telegraph→beam column, rotating beam, gravity well, summon minions). Numbers in new `tuning/bosses2.ts`.
- Replace placeholder `BOSS_DEFS` entries with the numbers below. `BOSS_INFO` names/thresholds are fixed by the lead.
- `anim(c)` returns the **sprite frame index** for the renderer (see frame notes). Set `e.invulnerable` for
  invulnerable windows, emit `boss_attack` (done by `runCycle`), `boss_phase` (done by `advancePhase`).
- Minions you spawn: `spawnEnemy(state, kind, x, y, behavior, { counted: false })`, then set `parentId = boss.id`.
  Shared behaviors you may use: `seek`, `stream`, `lane`, `drift` (moves by `vel`). Make `isMinion` cover anything
  you spawn so `onBossKilled` cleans it up (extend it to "`parentId` is a boss id").
- Gravity wells: push a hazard `{ kind: 'gravity', a: c, b: c, width: radius, power, ttl, lethal: false, ownerId: e.id }`
  (extend `addHazard` in `common.ts` to accept `'gravity'` and a `power`). Clear them in `onBossKilled` (already: `killHazards`).
- Fairness: every beam is preceded by a telegraph ≥ 0.8 s; never cover > 85% of the screen width at once; leave a
  gap in every ring; projectile caps (`MAX_PROJECTILES`, `MAX_HAZARDS`) respected.

### Major bosses (P0) — `BOSS_DEFS`: kind `boss_<id>`, homes, entry 3.0 s (empress 3.5 s)

| Boss | HP / radius / points | Sprite (w×h×frames) | Movement |
|---|---|---|---|
| `broodmother` BROODMOTHER NEBULA (ch 6) | 4200 / 120 / 60 000 | 300×240×2 (wing flap) | slow figure-8, ampX 300, ampY 40, period 9 s around (640,170) |
| `rotisserie` ROTISSERIE TITAN (ch 7) | 4800 / 130 / 70 000 | 320×260×3 (frame = phase) | horizontal patrol x 260–1020, speed 80 → 100 → 120 per phase |
| `colossus` CLUCKWORK COLOSSUS (ch 8) | 5600 / 140 / 80 000 | 340×280×3 (frame = min(phase,2)) | steps between x = 360/640/920 every 3 s (eased 0.8 s), y 175 |
| `kraken` YOLK KRAKEN (ch 9) | 6000 / 135 / 90 000 | 320×300×2 (tentacle sway) | bob x 640 ± 150 (period 8 s), y 160 ± 30 (period 3 s) |
| `phoenix` STORM PHOENIX (ch 10) | 6400 / 115 / 100 000 | 300×240×2 (frame 1 after rebirth) | fast figure-8 like the Rooster (ampX 380, freq 0.8) |
| `scrambler` THE SCRAMBLER (ch 11) | 7200 / 130 / 120 000 | 300×300×2 (swirl) | slow orbit radius 60 around (640,200) |
| `empress` EMPRESS YOLKANDA (ch 12) | 9000 / 150 / 250 000 | 380×300×3 (form 0/1/2) | p0 glide x ± 200 period 10 s; p1–p2 ± 360 period 7 s; p3 erratic (two sines) |

Attack cycles (phase = number of thresholds passed; `gap` per phase in brackets):

- **Broodmother** [1.4, 1.1, 0.9]. `nebula_spiral` 3 s two-arm spiral of `enemy_shot`, 14/s, speed 200, step 13°.
  `pod_drop` 3 `egg_pod`s across her wingspan with behavior `{ type: 'drift', spin: 0 }` and `vel (0, 45)` (H3's
  ability hatches them after 6 s). `feather_storm` (p≥1) 3 aimed fans of 7 `feather_knife` ±30°, 0.4 s apart.
  `cloak` (p2) 2 s invulnerable + `enemy_cloak`, then teleports to x ∈ [300, 980] (`enemy_teleport`) and fires a
  24-shot ring. Cycles: p0 `[nebula_spiral, pod_drop]`, p1 `[nebula_spiral, feather_storm, pod_drop]`,
  p2 `[cloak, feather_storm, nebula_spiral, pod_drop]`.
- **Rotisserie Titan** [1.3, 1.0, 0.8]. `spit_spin` 2.5 s, 4 arms of `fireball` rotating 50°/s, each arm every
  0.18 s, speed 220. `grease_rain` 2.5 s of `egg` from random x along the top, 14/s. `flame_sweep` (p≥1) telegraph
  0.8 s then a width-34 beam sweeping 60°→120° over 1.6 s from the spit. `roast_burst` (p2) 3 rings of 18 fireballs
  0.4 s apart, alternate offset by half a step. Cycles p0 `[spit_spin, grease_rain]`, p1 `[spit_spin, flame_sweep,
  grease_rain]`, p2 `[roast_burst, flame_sweep, spit_spin]`.
- **Cluckwork Colossus** [1.3, 1.1, 0.9, 0.55]. `gear_toss` 5 `gear`s aimed ±20° (9 in p3), speed 260.
  `piston_slam` telegraph 3 columns at player x and ±180 (0.9 s) → beams 0.5 s. `clock_hands` (p≥1) 1 s telegraph,
  then two beams from the centre rotating 40°/s and 110°/s for 3 s, length 700, width 20, both starting straight
  down-left/down-right (never straight down). `cuckoo_swarm` (p≥2) 8 `chick` minions with `seek`. Cycles p0
  `[gear_toss, piston_slam]`, p1 `[gear_toss, clock_hands, piston_slam]`, p2/p3 `[cuckoo_swarm, clock_hands,
  gear_toss, piston_slam]`.
- **Yolk Kraken** [1.3, 1.0, 0.85]. `tentacle_slam` telegraphs from the boss toward 60° and 120° (1.0 s) → beams 0.6 s.
  `ink_cloud` 3 `void_orb`s, `homing` 1.0 rad/s, speed 140. `sucker_rings` 4 rings of 16 `boss_egg` 0.45 s apart,
  each rotated 11°. `whirlpool` (p≥1) gravity well at the boss (radius 520, power 160, ttl 4 s) + a slow 1-arm spiral.
  `grab` (p2) twice: telegraph column at player x (width 140, 1.0 s) → beam 0.5 s. Cycles p0 `[sucker_rings,
  tentacle_slam, ink_cloud]`, p1 `[whirlpool, sucker_rings, tentacle_slam]`, p2 `[grab, whirlpool, sucker_rings, ink_cloud]`.
- **Storm Phoenix** [1.1, 0.9, 0.8]. `fire_fan` 3 volleys of 11 fireballs 50°–130°. `lightning_strikes` 4 telegraphed
  columns at rng x (0.8 s → beam 0.35 s), 0.3 s apart. `dive_bomb` = the Rooster dive (reuse it). `ash_ring` 2 rings
  of 28 `feather_knife`. **Rebirth**: in `onBossDamaged`, if the Phoenix would die (`hp <= 0`) and
  `rt.data.reborn !== 1`: set `hp = maxHp × 0.5`, `rt.data.reborn = 1`, invulnerable 2.5 s, clear enemy projectiles,
  emit `boss_phase` with phase 2 and `boss_attack` `'rebirth'`, `anim` → frame 1. Cycles p0 `[fire_fan,
  lightning_strikes, dive_bomb]`, p1 `[fire_fan, lightning_strikes, dive_bomb, fire_fan]`, reborn
  `[ash_ring, lightning_strikes, dive_bomb, fire_fan]` with gapMul 0.8.
- **The Scrambler** [1.2, 1.0, 0.85]. Permanent gravity well on the boss, renewed every 1 s (ttl 1.1): radius 600,
  power 70 / 110 / 150 per phase. `galaxy_arms` 3.5 s, 4-arm spiral, 16 shots/s total, speed 180, 23° per step.
  `event_horizon` ring of 32 `enemy_shot` placed at radius 380 around the boss, moving **inward** at 120 px/s with a
  3-shot gap aimed at the player's side. `spaghettify` (p≥1) telegraph 4 radial lines from the boss toward the player
  ±15° and ±35° (0.9 s) → beams 0.5 s. `swallow` (p2) converts up to 12 enemy projectiles on screen into homing
  `void_orb`s (homing 1.2, speed 150). Cycles p0 `[galaxy_arms, event_horizon]`, p1 `[galaxy_arms, spaghettify,
  event_horizon]`, p2 `[swallow, galaxy_arms, spaghettify, event_horizon]`.
- **Empress Yolkanda** [1.2, 1.0, 0.9, 0.75]. Every phase change: invulnerable 1.5 s, clear enemy projectiles.
  `royal_decree` 5 aimed bursts of 3 `boss_egg`, 0.25 s apart. `crown_spiral` 3-arm spiral of `gear`s 3 s.
  `summon_guard` (p≥1) 4 `chicken_elite` with `lane` behavior (laneY 300/360, ≤ 6 alive). `cross_laser` (p≥2)
  1 s telegraph, then 2 beams forming an X through her, rotating 90° over 2 s. `yolk_nova` (p3) 3 rings of 36
  fireballs + a gravity well (radius 450, power 140, 2.5 s). `egg_apocalypse` (p3) 4 s of eggs 24/s across the
  screen leaving 2 safe lanes (each 160 px) that drift. Cycles p0 `[royal_decree, crown_spiral]`, p1 `[summon_guard,
  royal_decree, crown_spiral]`, p2 `[cross_laser, royal_decree, crown_spiral, summon_guard]`, p3 `[yolk_nova,
  egg_apocalypse, cross_laser, crown_spiral]`. Frame: p0–1 → 0, p2 → 1, p3 → 2.

### Mini-bosses (P1) — one threshold (0.5), entry 2.0 s, home (640, 150)

| Mini | HP / r / pts | Sprite | Attacks (p0 → p1 adds) |
|---|---|---|---|
| `mini_brigadier` BRIGADIER BROILER (ch 6) | 900 / 70 / 15 000 | 160×140×2 | patrol x ±300; `shotgun` aimed 5-egg fan ×3; `salute` 2 telegraphed columns → beams → p1 adds `brood` (4 seeking chicks) |
| `mini_ace` ACE OF SAUCERS (ch 7) | 1000 / 70 / 16 000 | 170×120×2 | zips between 4 waypoints; `strafe` stream of shots straight down while moving; `ring` 16 shots → p1 adds 2 UFO escorts (`lane`) |
| `mini_cuckoo` THE CUCKOO CLOCK (ch 8) | 1100 / 72 / 17 000 | 150×170×2 | stationary; `tick_tock` pendulum beam 60°↔120° 2 s (telegraph first); `gear_burst` 8 gears radial → p1: both 30% faster |
| `mini_jelly` YOLK JELLY (ch 9) | 1200 / 72 / 18 000 | 160×160×2 | drifts; `drip` eggs from 3 tentacle columns 2 s; `pulse_ring` 24 `boss_egg` → p1 adds 2 homing `void_orb`s |
| `mini_stormcrow` STORMCROW (ch 10) | 1300 / 70 / 19 000 | 170×140×2 | swoops; `thunder` 3 lightning columns; `feather_fan` 9 knives → p1 adds the Rooster dive |
| `mini_scarecrow` SCARECROW SENTINEL (ch 11) | 1400 / 72 / 20 000 | 150×170×2 | stationary pole; `crow_call` 5 seeking chicks; `hay_spin` 2.5 s spiral → p1 adds a small gravity well (r 300, power 90) |
| `mini_guard` ROYAL EGG GUARD (ch 12) | 1600 / 74 / 22 000 | 160×160×2 | starts with `shield = maxShield = 300` (combat absorbs it); `lance_charge` (telegraph + dash down + return); `royal_volley` 3×3 aimed `boss_egg` → p1 restores shield 200 once |

### Sprites (P0 for majors, P1 for minis) — `src/render/sprites/bosses2.ts`
House style from `sprites/bosses.ts`/`warships.ts`. Big, readable silhouettes with a bright core colour each:
Broodmother — translucent violet mega-hen with a glowing nest belly full of eggs; Rotisserie — chrome grill mech on a
spit with flaming skewers and a chef-hat dome (frames add more fire per phase); Colossus — brass clockwork hen mech,
gears on the chest, piston legs, cracked/steaming at higher frames; Kraken — golden yolk-blob head with tentacles
and egg-white mantle; Phoenix — blazing storm bird, lightning crest (frame 1: blue-white reborn flames); Scrambler —
dark hen whose body is an accretion-disk swirl with a black core and two glaring eyes; Empress — crowned hen queen on
a hovering throne (frame 1: wings unfurled, frame 2: cracked crown, blazing eyes, throne broken).
Minis: helmeted red hen general; purple ace saucer with goggled pilot; wooden cuckoo clock with hen popping out;
yellow jelly with yolk core; storm crow; scarecrow on a pole; egg-shaped knight with a gold lance and shield.
If 3 atlas pages are not enough (test `a5.sprites`), shrink sizes a little — never above the table.

### P1 tests — `tests/h2.bosses2.test.ts`
For every new boss id: spawns (HP = table × difficulty), enters, runs every attack in its cycle within 120 s of a
god-mode run, phases advance at thresholds, never exceeds entity caps, state stays JSON-safe, dies and clears its
minions/hazards. Phoenix revives exactly once. Empress runs all 4 phases. Keep `a2.bosses`/`a2.bossAttacks` green.

---

## H3 — ARMADA (enemies, abilities, patterns, chapters 6–12, onslaught, environment)

Read first: `enemies.ts`, `behaviors.ts`, `patterns/*`, `waves.ts`, `waves.types.ts`, `chapters.ts`,
`chapters2.ts`, `onslaught.ts`, `modes.ts`, `tuning/enemies.ts`, `combat.ts`.

### P0
1. **Final enemy numbers** in `ENEMY_BASE` (replace placeholders; keep radius ≈ sprite size × 0.4):

   | Kind | Letter | HP | Points | Eggs/s | Shield | Notes |
   |---|---|---|---|---|---|---|
   | `chicken_ninja` | N | 3 | 350 | 0.05 | — | ability below |
   | `chicken_bomber` | X | 4 | 400 | 0 | — | drops cluster eggs instead of eggs |
   | `egg_pod` | (pattern) | 6 | 300 | 0 | — | no food; hatches |
   | `chicken_jet` | J (pattern) | 2 | 300 | 0 | — | very fast |
   | `chicken_turret` | T | 10 | 600 | 0 | — | aimed bursts |
   | `chicken_shield` | S | 4 | 500 | 0.06 | 8 (regen) | |
   | `chicken_mech` | W | 20 | 1000 | 0 | — | grenades |
   | `space_mine` | (pattern) | 3 | 150 | 0 | — | bursts on death / proximity |
   | `chicken_ghost` | G | 4 | 450 | 0.06 | — | phases |
   | `chicken_healer` | H | 5 | 600 | 0.03 | — | heals |
   | `chicken_sniper` | K | 4 | 550 | 0 | — | telegraphed shot |
   | `chicken_mother` | M | 15 | 900 | 0.04 | — | spawns chicks |
   | `chicken_void` | V | 6 | 700 | 0 | — | teleports, void orbs |
   | `chicken_gold` | — | 8 | 5000 | 0 | — | bonus event; drops golden egg + 10 corn (lead code) |
   | `chicken_elite` | E | 14 | 1200 | 0.06 | 10 (regen) | spreads |
   | `comet` | (pattern) | 2 | 150 | 0 | — | fast rock, no split |

   Set `shield`/`maxShield` in `spawnEnemy` from a new `shield` column. Multiply the `speed` you pass to behaviors by
   `state.mods.enemySpeedMul` (in `updateEnemies`).
2. **Abilities** — new `src/sim/abilities.ts`, `updateAbility(state, e, dt)` called from `updateEnemies` after the
   behavior. Use `e.skillTimer` / `e.skillState`. All numbers in `tuning/enemies.ts` (`ABILITY` table). Enemy shots via
   `spawnProjectile` (owner enemy, apply `DIFFICULTY.shotSpeed`) and emit `enemy_shot`/`egg_dropped` like v1.
   - **ninja**: every 3.0 s → 0.6 s cloak (`invulnerable = true`, emit `enemy_cloak` on/off), then throw 1
     `feather_knife` aimed at the player (speed 380). Only while on screen.
   - **bomber**: instead of eggs, `cluster_egg` at 0.12/s while in the egg zone, `fuse` random 0.9–1.4 s (H1 bursts it).
   - **egg_pod**: after 6 s alive, hatch: 3 `chick`s with `seek` (speed 240, `parentId` = pod), emit `pod_hatch`,
     remove the pod silently (`alive = false`, no points, no drops). Killing it earlier = normal kill.
   - **turret**: every 2.5 s a burst of 3 aimed `enemy_shot`s 0.12 s apart (speed 300).
   - **shield / elite**: if `skillTimer` ≥ 3 s since the last shield hit (combat resets it to 0), regenerate
     2 shield/s up to `maxShield`. Elite also fires a 5-way `enemy_shot` spread every 3 s.
   - **mech**: every 3 s a `boss_egg` straight down (speed 220).
   - **space_mine**: if the player is within 90 px → detonate (alive = false, no points) ; on death or detonation →
     8 `shard`s radial (speed 220) + `projectile_burst`. (Hook death bursts in `onEnemyKilled`.)
   - **ghost**: 4 s cycle, invulnerable for the last 1.5 s (emit `enemy_cloak`).
   - **healer**: every 2 s heal every other non-boss enemy within 160 px by 15% of its maxHp (capped), emit `enemy_heal`.
   - **sniper**: every 4 s: telegraph hazard (`kind 'telegraph'`, width 4, ttl 0.9, `ownerId` = sniper) from the
     sniper toward the player's current position; when it ends, fire one `enemy_shot` along it at 700 px/s.
   - **mother**: every 4 s spawn 2 `chick`s with `seek` (counted: false, `parentId`) if fewer than 24 chicks are alive.
   - **void**: (movement behavior `blink`, below) every 2.5 s teleport to a random point in x ∈ [120, 1160],
     y ∈ [80, 360] (emit `enemy_teleport`), then fire one `void_orb` (homing 1.2, speed 160, ttl 6).
   - **gold**: never shoots. **comet**, **jet**: no ability.
3. **Grids accept the new letters**: extend `KIND_LETTERS` / `KindLetter` with `N X S G H K E W M T` (abilities work
   in any movement pattern).
4. **New patterns** (`patterns/*.ts`, new `GroupSpec`s in `waves.types.ts`, builders in new `chapterKit.ts`), each
   with an exact `planned` count:
   - `jets(count, perV, { y?: number[], speed?: number })` — V-formations of `chicken_jet` streaking across from
     alternating sides at y from the list (default [140, 220, 300]), speed 460 (× chapter speed), sine wobble 20 px,
     removed after leaving the far side (they count as cleared). A V every 1.2 s.
   - `pods(count, interval)` — `egg_pod`s fall in from y = −30 at random x ∈ [120, 1160], `drift` vel (0, 40).
   - `mines(count, rate)` — `space_mine`s drift down from the top at 30–60 px/s with slow horizontal sway.
   - `voids(count)` — `chicken_void`s with new behavior `blink` (`{ type: 'blink' }`: hover in place, ability moves them).
   - `comets(duration, rate)` — like asteroids, kind `comet`, speed 380–520, diagonal from the top corners.
   - `turrets(count, delay?)` — `chicken_turret`s fly down to parking slots spread across y = 110 and stay.
   - `mothers(count)` — `chicken_mother`s hover in a wide slow sine at y 140–200.
   - New behavior `flee` (`{ type: 'flee'; dir: 1 | -1; speed: number; baseY: number; t: number }`) for gold chickens.
5. **Chapters 6–12** — replace `chapters2.ts` placeholders with exactly these tables (builders as in `chapters.ts`
   plus the new ones; `ring(kind, n, r, omega)`; `later(g, delay)`). Palettes are fixed in the placeholder file.

   | # | Ch 6 Nebula Nests | Ch 7 Solar Forge | Ch 8 Clockwork Coop |
   |---|---|---|---|
   | 1 | Shadow Flock `grid('NBBB',8)` | Afterburners `jets(18,6)` | Shield Wall `grid('SSRRB',10)` |
   | 2 | Pod Rain `pods(10,1.4)`, `later(grid('BBB',8),2)` | Sun Turrets `turrets(4)`, `later(grid('RRB',8),1)` | Minefield `mines(30,1.5)`, `later(grid('RRB',8),2)` |
   | 3 | Carpet Bombers `grid('XRRB',8)` | Forge Line `grid('TRRBB',10)` | Iron Walkers `grid('WWRB',6)` |
   | 4 | Ninja Parade `swoop('NNRB',8)` | Solar Wind `jets(24,6,{speed:520})`, `later(stream(2,10,'R','LR',[260,330]),3)` | Gearbox `rings(ring('S',8,80,1.1),ring('W',6,150,-0.6),ring('R',16,220,1.1))` |
   | 5 | MINI `boss('mini_brigadier')` | MINI `boss('mini_ace')` | MINI `boss('mini_cuckoo')` |
   | 6 | Nebula Spin `rings(ring('N',10,90,1.0),ring('R',16,170,-1.0))` | Bomb Run `grid('XXRRB',10)` | Clockwork Parade `swoop('SWRRB',10)` |
   | 7 | Nest Guard `grid('XNRRB',10)`, `pods(6,2.0)` | Heat Shimmer `swoop('NTRRB',10)` | Tick Tock `divers('SSRRB',10,1.4,2)`, `mines(16,1.0)` |
   | 8 | Hatchery `pods(14,1.0)`, `later(swarm(24),3)` | Corona `rings(ring('T',6,70,0.8),ring('X',12,140,-0.9),ring('R',18,210,1.0))` | Turret Gallery `turrets(6)`, `later(grid('SSB',10),2)` |
   | 9 | Night Raid `divers('NNXRB',10,1.6,2)` | Meltdown `divers('XTNRB',10,1.3,2)`, `later(jets(12,6),4)` | Overclock `grid('WSSRRB',12,{descendRate:4})` |
   | 10 | BOSS `boss('broodmother')` | BOSS `boss('rotisserie')` | BOSS `boss('colossus')` |

   | # | Ch 9 The Yolk Sea | Ch 10 Thunderhead Roost | Ch 11 Black Hole Barnyard | Ch 12 The Cluckhive Throne |
   |---|---|---|---|---|
   | 1 | Phantoms `grid('GGBB',8)` | Sharpshooters `grid('KRRBB',10)` | Event Horizon `voids(6)`, `later(grid('RRB',8),2)` | Royal Guard `grid('EESSRR',10)` |
   | 2 | Medics `grid('HRRBB',10)` | Thunder Jets `jets(24,8)` | Mother Load `mothers(3)` | Imperial Jets `jets(30,6,{speed:560})`, `turrets(4,3)` |
   | 3 | Yolk Comets `comets(25,1.6)` | Storm Front `stream(4,12,'R','LRLR',[150,210,270,330],{amp:90,speed:280})` | Spaghetti Stream `stream(4,14,'G','LRLR',[150,210,270,330],{amp:70})` | Court of Ghosts `grid('GHGHRR',12)` |
   | 4 | Haunted Rings `rings(ring('G',10,90,1.1),ring('H',6,150,-0.7),ring('R',18,210,1.1))` | Crosshairs `turrets(4)`, `grid('KKRB',8)` | Singularity `rings(ring('V',6,80,0.8),ring('M',4,150,-0.5),ring('A',16,220,1.0))` | Throne Rings `rings(ring('E',8,80,1.3),ring('V',10,150,-1.0),ring('K',16,220,1.3))` |
   | 5 | MINI `mini_jelly` | MINI `mini_stormcrow` | MINI `mini_scarecrow` | MINI `mini_guard` |
   | 6 | Ghost Parade `swoop('GHRRB',10)` | Downpour `grid('XXKRB',10)`, `pods(8,1.5)` | Dark Matter `voids(10)`, `mines(20,1.2)` | Hatchling Horde `mothers(4)`, `pods(12,1.0)` |
   | 7 | Albumen Storm `comets(30,2.0)`, `later(stream(3,10,'G','LRL',[200,260,320]),4)` | Static Rings `rings(ring('K',8,80,1.2),ring('N',14,150,-1.2),ring('R',20,220,1.2))` | Barn Burner `grid('MXSRRB',12)` | Gauntlet of Steel `grid('WWEESS',12,{descendRate:5})` |
   | 8 | Triage `grid('HGSRRB',12)` | Eye of the Storm `swarm(60)`, `turrets(2,3)` | Wormhole `swoop('VNGRB',10)`, `comets(20,1.2)` | Armageddon Parade `swoop('EVGKXN',12)` |
   | 9 | Deep Dive `divers('GGHRR',12,1.2,3)` | Lightning Rod `divers('KKNXR',12,1.0,3)` | Collapse `divers('VMSKR',12,1.0,3)` | Last Line `divers('EESSKK',12,0.9,4)`, `mines(20,1.0)` |
   | 10 | BOSS `kraken` | BOSS `phoenix` | BOSS `scrambler` | BOSS `empress` |

   Stream/ring/swoop/divers must accept the new letters (V/M in rings: use the letter's kind; `blink` is only for the
   `voids` pattern — in rings, a void chicken follows the ring and still teleports? No: in non-`voids` patterns the
   void ability only fires orbs, no teleport).
6. **Golden chickens** (`waves.ts`): during `wave_active` of non-boss waves, each second roll
   `0.006 × state.mods.luck`; at most one alive; spawn at x = −40 or 1320, y ∈ [120, 260], behavior `flee` (speed 300,
   zigzag ±80 px at 1.5 Hz), `counted: false`; emit `golden_appear`. When it leaves the far side: `alive = false` +
   `golden_escaped`. `isWaveComplete` ignores gold chickens (and kills a live one silently when the wave completes).
7. **Environmental hazards** — new `src/sim/envHazards.ts`, called from `updateWaveSpawner` during `wave_active` of
   non-boss waves, `ownerId: -1` (render colours by chapter):
   ch 7 **solar flares**: every 9 s a telegraph column (width 90, 1.2 s) at a random x, then a beam (0.6 s);
   ch 10 **lightning**: every 6 s telegraph (width 50, 0.9 s) → beam 0.3 s, twice 0.4 s apart;
   ch 11 **gravity well**: one well (radius 380, power 90) drifting slowly across y = 200 for the whole wave.
   Same for the matching onslaught sectors (sector index mod 12). No hazards in boss waves.

### P1
8. **Onslaught generator** (`onslaught.ts`, pure, local RngState seeded from `seed ^ hash(sector, wave)`):
   wave 10 → `boss(BOSS_RUSH_ORDER[(sector−1) % 12])`; wave 5 of sector ≥ 2 → a mini (cycle the 7); otherwise 1–3
   groups from a template pool (every pattern above + v1 patterns) under a threat budget
   `B = 18 + 6×sector + 2×wave` (give each template a cost ≈ its HP sum / 4); kind letters unlocked by sector
   (1: B R A · 2: + C U N X · 3: + S T J · 4: + G H W · 5+: all). Names: random adjective + noun from two 24-word
   lists ("Feral Flock", "Molten Murder", …). `onslaughtSectorName(n)` → "Sector n — <name>" from a 12-entry list.
9. **Sprites** — `src/render/sprites/armada.ts` (split into `armada2.ts` if > 400 lines). House style from
   `sprites/hens.ts` and `enemies.ts`, 2-frame wing flaps for chickens: ninja = black-masked chicken with headband
   tails; bomber = round green chicken with a bomb-bay belly and goggles; egg pod = speckled pod-egg with a glowing
   crack (frame 1 more cracked); jet = sleek chicken in a rocket harness with flame; turret = chicken in a gun
   emplacement; shield = blue chicken with a visor (the bubble is drawn by H5); mech = chicken pilot in a bipedal
   walker; mine = spiked red-black sphere with a blinking light; ghost = pale translucent chicken with a wavy tail;
   healer = green chicken with a white cross cap; sniper = dark red chicken with a scope monocle; mother = huge white
   hen with a nest/apron; void = indigo chicken with star-speckled body; gold = shining gold chicken with sparkles;
   elite = gold-armoured royal chicken with a plume; comet = flaming rock (3 frames). Projectiles: cluster egg =
   green speckled egg with a fuse spark; shard = small yellow fragment; void orb = purple swirl orb (2 frames);
   fireball = orange fireball pointing up (2 frames); gear = brass cog.
10. Tests `tests/h3.*.test.ts`: every ability (with fake time), every new pattern's planned count equals spawns, the
    7 new chapters spawn and clear (extend `a1.alltables`-style checks in your own file for chapters 6–12),
    golden chicken spawns/escapes, onslaught generator is deterministic and valid for sectors 1–30, env hazards spawn
    only in their chapters. Keep `a3.*` green.

### P2
11. Sprinkle 1–2 new enemy letters into a few classic waves of chapters 4–5 only if all tests stay green.

---

## H4 — INTERFACE (menus, HUD, meta progression, achievements, audio)

Read first: `src/ui/*` (menu, nav, widgets, screens/*), `hud*.ts`, `storage.ts`, `highscores.ts`, `audio/*`,
`contracts.ts`, `tuning/loadout.ts`, `app/app.ts` (to see what it calls).

### P0
1. **Profile** — new `src/ui/profile.ts` stored at `STORAGE_KEYS.profile` through the existing `KV` helpers, with a
   defensive parser (bad/missing data → defaults, never throws):
   `{ v: 2, corn, ships: ShipId[] (falcon always), upgrades: Partial<Record<UpgradeId, number>>, achievements:
   Record<string, string /* ISO date */>, seenEnemies: EnemyKind[], seenBosses: BossId[], weaponsFired: WeaponId[],
   stats: { runs, kills, bossesKilled, cornEarned, goldenKills, victories, perksTaken, bestCombo, overdrives,
   shieldsPopped, missiles, food }, best: Partial<Record<GameMode, number>> }`.
   `recordRun(summary, kv)` → adds lifetime stats, awards corn = `summary.corn + floor(score / 20 000) + 15 × bossesKilled`
   + achievement rewards, returns `{ cornEarned, unlocked: AchievementId[] }`. End screens show
   "+N GOLDEN CORN" and any unlocked achievements.
2. **Title flow**: logo "FOWL PLAY" with a new subtitle line **HENPOCALYPSE**; `GAME_VERSION = 'v2.0'`.
   Menu: PLAY · HANGAR · ACHIEVEMENTS · CODEX · HIGH SCORES · SETTINGS · HOW TO PLAY · CREDITS.
   **PLAY → Mode select** (4 cards from `MODE_INFO`, each with the profile's best score; Daily shows today's 2 mutators)
   **→ Loadout** (ship picker using `sprites.toCanvas('ship' | 'ship_bantam' | …)` with name/desc/stat bars from
   `SHIPS`; locked ships show their cost and can't be picked; difficulty selector; mutator toggles with their score
   multipliers — not for Daily) **→ START** calls `cb.onStart({ difficulty, mode, loadout: { ship, upgrades:
   profile.upgrades, mutators } })`. Remember the last loadout at `STORAGE_KEYS.loadout`.
3. **Draft screen** (`screens/draft.ts`, replace the Phase-0 version): title "CHOOSE YOUR UPGRADE", 3 large cards
   (rarity border colours: common `#9AA7B8`, rare `#4CC9F0`, epic `#F72585`; perk `color` accent; name; desc;
   stacks "2/5"); keys 1/2/3, arrows + Enter, mouse; ignore input for 400 ms after opening; list the run's perks
   underneath. Calls `cb.onDraftChoice(i)`.
4. **HUD** (canvas, logical px; new files `hud-meters.ts`, `hud-powerups.ts` as needed):
   combo meter right of centre at y ≈ 92 when `combo.count ≥ 5` ("×3 · 57 CHAIN" + a bar draining with
   `combo.timer / mods.comboWindow`, colour by tier); **fury bar** in the bottom bar next to heat (fills magenta,
   pulses and shows "OVERDRIVE READY — C / SHIFT" when full, drains during overdrive with
   `player.overdrive / mods.overdriveTime`); **power-up timers** (icons `icon_pu_*` with shrinking arcs) above the
   bottom bar, left; **shield pips** (`icon_shield` × `player.shield`) and revives next to lives; **corn**
   (`icon_corn` + `state.corn`) under the score; mode label instead of "CHAPTER n · WAVE w/10" for other modes
   ("ONSLAUGHT · SECTOR n · WAVE w", "BOSS RUSH · n/12", "DAILY CLUTCH · CH n"). Mini-bosses use the boss bar.
   Weapon name/icon for the 6 new weapons (`WEAPON_INFO`, `icon_weapon_*`).
5. **`trackEvents`** in `ui/index.ts`: feed achievements + profile "seen" lists (enemy kinds from `enemy_killed`,
   bosses from `boss_killed`, weapons from `player_fire`) and show **toasts** (DOM, top-centre, 3 s, queued).
6. **Pause screen**: list current perks (name × stacks) and active mutators.

### P1
7. **Hangar** screen: corn balance; 4 ships (buy with `SHIPS[s].cost`); 8 upgrades (`UPGRADES`, level pips, next
   cost, BUY); disabled when unaffordable/maxed; `purchase` sound.
8. **Achievements** — `src/ui/achievements.ts` (data + checks) and a screen with progress. Reward corn:
   bronze 25 · silver 75 · gold 200. The 42 achievements (id — name — condition — tier):
   `first_blood` First Feather — first kill — B · `kills_1k` Poultry in Motion — 1 000 lifetime kills — B ·
   `kills_10k` Fowl Executioner — 10 000 — S · `kills_100k` Extinction Event — 100 000 — G ·
   `combo_25` Chain Reaction — 25 chain — B · `combo_100` Hundred-Hen Combo — 100 chain — S ·
   `combo_400` Clucking Unstoppable — ×8 multiplier — G · `boss_first` Hen-tervention — any boss — B ·
   `boss_all` Coop de Grâce — all 12 major bosses (lifetime) — G · `mini_all` Small Fry — all 7 minis — S ·
   `empress` Regicide — defeat Empress Yolkanda — G · `phoenix` Ashes to Ashes — defeat the Storm Phoenix — S ·
   `classic` Classic Hero — clear chapter 5 — B · `victory` Coop Liberated — finish the campaign — S ·
   `victory_hard` Hard-Boiled — finish on Hard — G · `flawless` Untouchable — clear a chapter without dying — S ·
   `hardcore` One Egg Basket — finish the campaign with Hardcore — G · `sector5` Deep Space — Onslaught sector 5 — S ·
   `sector20` Infinite Omelette — Onslaught sector 20 — G · `rush` Rush Hour — clear Boss Rush — G ·
   `daily_play` Daily Grind — play a Daily Clutch — B · `daily_win` Daily Hero — clear a Daily Clutch — S ·
   `arsenal` Arms Dealer — fire all 10 weapons (lifetime) — S · `max_power` Maximum Overcluck — power 10 — B ·
   `overdrive5` Seeing Red — 5 overdrives in one run — S · `missiles100` Bunker Buster — 100 missiles (lifetime) — S ·
   `cool` Cool Customer — clear a chapter without overheating — S · `perk_first` Taste of Power — first perk — B ·
   `perks10` Overloaded — 10 perk stacks in one run — S · `devil` Deal with the Devil — take Devil's Bargain — B ·
   `maxed` Maxed Out — max any perk — S · `corn100` Corn Fed — 100 corn (lifetime) — B ·
   `corn5k` Corn Baron — 5 000 corn (lifetime) — G · `golden1` Golden Goose — kill a golden chicken — B ·
   `golden10` Midas Touch — 10 golden chickens — S · `food10k` Gourmet — 10 000 food (lifetime) — S ·
   `hangar` Full Hangar — own all ships — G · `upgraded` Fully Upgraded — max every upgrade — G ·
   `bubble` Bubble Boy — 25 shield pops (lifetime) — S · `revive` Not Today — get revived — B ·
   `million` Millionaire — 1 000 000 in one run — S · `ten_million` Deca-Millionaire — 10 000 000 — G.
9. **Codex** screen: tabs ENEMIES · BOSSES · WEAPONS · PERKS. Seen entries show `toCanvas` art, name and an original
   one-line flavour text you write (e.g. ninja: "Trained in the ancient art of the hidden drumstick."); unseen show
   a dark silhouette and "???".
10. **Sound effects** — add to `SOUND_IDS` + recipes (pure synthesis like v1) and map every event from §4.2:
    `fire_flak, fire_flame, fire_sickle, fire_homing, fire_rail, fire_prism, combo_up, combo_break, fury_ready,
    overdrive_on, overdrive_off, powerup_on, powerup_off, shield_pop, revive, enemy_shield, shield_break, teleport,
    cloak, heal, pod_hatch, burst, golden, golden_gone, chain_pop, crit, drone, perk_draft, perk_pick, corn,
    achievement, purchase`. Throttle the frequent ones (flame, drone, corn, crit, enemy_shield). Replace the Phase-0
    `FIRE_SOUND` borrowing.
11. **Music** — 6 new original tracks in new `music-tracks-c.ts`/`music-tracks-d.ts`: `nebula` (ch 6–8, synthwave,
    E minor 132 BPM), `abyss` (ch 9–11, darker, D minor 120), `throne` (ch 12 + boss rush, epic, C minor 140),
    `boss2` (new bosses, 150), `empress` (final boss, 156, 16 bars), `draft` (calm, 90, for the draft/hangar/loadout
    screens). `chooseTrack`: screen `draft` → `draft`; boss alive → `empress` if kind `boss_empress`, `boss2` for other
    HENPOCALYPSE bosses/minis, else `boss`; game track by chapter (1–5 `game`, 6–8 `nebula`, 9–11 `abyss`, 12 `throne`;
    onslaught by sector mod 12, boss rush `throne`). Title menus keep `title`. Update `a4.music` expectations.
12. **High scores per mode**: campaign keeps the v1 table; onslaught/boss rush at `modeScores + mode`, daily at
    `modeScores + 'daily.' + YYYYMMDD`. HIGH SCORES screen gets mode tabs. Name entry as v1.
13. **How to Play**: pages for controls (+ overdrive), power-ups, combos/fury, perks, modes.

### P2
14. Stats screen (lifetime numbers). Credits with the lore paragraph from §0. Settings toggle "Show combo meter".

Tests `tests/h4.*.test.ts`: profile parse/save/recordRun math, achievement checks (pure), track selection per
chapter/boss/mode, sfx map covers every new event, draft/loadout screens build without throwing (jsdom is not
available — keep DOM-building functions testable the way v1 `a4.ui` does, or test the pure helpers).

---

## H5 — SPECTACLE (renderer, effects, backgrounds, loot art)

Read first: `render/renderer.ts`, `effects.ts`, `particles.ts`, `background.ts`, `decor.ts`, `overlays.ts`,
`sprites/atlas.ts`, `sprites/pickups.ts`, `powerups.ts` (`droneCount`, `dronePos`), `tuning/loadout.ts`.

### P0
1. **Renderer** (split into `render-entities.ts` etc. if `renderer.ts` would pass 400 lines):
   ship sprite by `player.ship` (`falcon` → `ship`, others → `ship_<id>`); **player shield** bubble
   (`fx_shield_bubble`, gentle pulse, one ring per extra charge) while `player.shield > 0`; **overdrive aura**
   (additive glow cycling magenta→gold + speed streaks) while `player.overdrive > 0`; **drones** at
   `dronePos(state, i)` for `i < droneCount(state)` (sprite `drone`, 2-frame blink, slight bob);
   **enemy shields** (`fx_shield_bubble` scaled to `radius × 2.4`, alpha by `shield / maxShield`);
   **cloaked non-boss enemies** (`invulnerable`) at alpha 0.3 with flicker; gold chicken sparkle trail; comet and jet
   fire trails; boss frames for new kinds `clamp(floor(e.anim), 0, frames − 1)`; chicken-style 2-frame flap for new
   chickens; mine blink; pod crack by age.
   Projectiles: flak (no rotation), flame (scale 0.6 → 1.6 and fade with `age / ttl`), sickle (rotation = age × 18),
   homing/prism/shard/fireball (velocity rotation), void orb (frame pulse), gear (`rotation`), cluster egg (wobble).
   Hazards: **gravity wells** (`fx_gravity` rotating, scaled to `width × 2 / 128`, plus swirl particles drawn inward);
   environment beams/telegraphs (`ownerId === -1`) tinted by chapter (ch 7 orange flare, ch 10 electric blue,
   others as boss beams).
2. **Effects for every new event** in §4.2 (pool cap may rise to 3000): combo popups ("COMBO ×2!" sized by mult),
   overdrive shockwave + magenta flash + shake, power-up rings in the power-up colour, shield shatter, revive feather
   burst, enemy shield sparks/shatter, teleport smoke + sparks (`fx_smoke`), heal rings, pod hatch shell debris,
   projectile bursts, golden sparkle + "IT GOT AWAY!", **rail beam** (bright core + glow, width from the event,
   0.15 s fade, impact sparks along the column), chain explosions, "CRIT!" popups, drone muzzles, perk sparkle,
   corn sparkle. Respect `settings.reduceFlashes` and `screenShake`.
3. **Backgrounds** for chapters 6–12 (`CHAPTER_PALETTES` → 12 entries from `chapters2.ts`, decor per chapter):
   6 Nebula Nests — pink/violet nebula clouds with drifting nest silhouettes; 7 Solar Forge — a huge sun at the
   top-right edge with corona glow and heat-haze bands; 8 Clockwork Coop — large slow-turning brass gear silhouettes;
   9 Yolk Sea — golden nebula ripples and floating yolk planets; 10 Thunderhead Roost — layered storm clouds with
   random background lightning flashes (render clock only; dimmed by `reduceFlashes`); 11 Black Hole Barnyard —
   accretion-disk spiral at top centre with a lensing ring and streaked stars; 12 Cluckhive Throne — crimson nebula,
   a giant crown constellation, gold dust. Onslaught: palette by sector (mod 12); Boss Rush: palette of the boss's
   campaign chapter. Keep the 2 s crossfade and warp.
4. **Loot art** — replace every placeholder in `sprites/loot.ts`: 6 gift boxes in the style of `pickups.ts`
   (weapon colour + letter from `WEAPON_INFO`); 6 power-up capsules (2-frame shimmer) with clear glyphs — shield
   hexagon, magnet horseshoe, rapid double chevron, drones mini-pods, time-warp hourglass, ×2; life-up (ship + "+");
   golden egg (shine, 2 frames); corn kernel/cob; weapon icons ×6; `icon_shield`, `icon_fury` (flame fist),
   `icon_corn`, 5 power-up icons; `fx_shield_bubble` (cyan ring, soft inside), `fx_smoke` (grey puff), `fx_gravity`
   (purple spiral, transparent centre).

### P1
5. Atlas budget: keep ≤ 3 pages (test `a5.sprites`). If H2/H3 sprites push past it, lower `BIG_SPRITE_SCALE`
   or the threshold (and keep sprites sharp enough to read).
6. Gallery handles 117 keys (scroll, labels); attract mode shows a parade of new enemy kinds and an occasional
   boss silhouette crossing the background.
7. Performance: render CPU < 4 ms/frame in chapter 12 wave 9 (in-page timing test helper or a mock-ctx count test:
   draw calls per frame bounded); particle pool cap respected.
8. Tests `tests/h5.*.test.ts`: every new event handled without throwing (mock ctx), new mappings complete,
   backgrounds for chapters 1–24 draw, drones/shields drawn when present. Keep `a5.*` green.

### P2
9. Boss intro splash: on `boss_warning`, a 1.5 s canvas portrait (the boss sprite sliding in + speed lines) behind
   the HUD banner.

---

## 6. Integration and final gate (lead)

1. Wait for all agents; read `docs/status/*`, `docs/requests/*`.
2. `npm run check` once; fix integration bugs (or hand them back), resolve requests.
3. Browser pass: title → each mode → loadout → a boss, a mini, the draft, overdrive, every power-up, chapter 7/10/11
   hazards, `?gallery=1` (all 117 sprites), no console errors.
4. Flip `ENFORCE_NO_PLACEHOLDERS` in `tests/a1.henpocalypse.test.ts`; full suite green.
5. Commit per agent (`[H1] …` … `[H5] …`), update README (modes, controls, perks, debug keys) and `docs/STATUS.md`.
