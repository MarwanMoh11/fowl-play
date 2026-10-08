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

See `docs/SPEC.md` §5. `src/sim` is a pure, deterministic simulation stepped at 60 Hz; `src/render`, `src/ui`, `src/audio` react to its events and read its state each frame; `src/app` wires everything together.
