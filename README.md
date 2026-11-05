# Melongeddon

A single-player tower defense: defend the Midnight Library from melons, corn, and pumpkins.

Standalone Vite + React + Tailwind project, extracted from the original Grok app-builder export.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm test         # engine tests
npm run sim      # balance simulator -> sim-results/report.md (add -- --seeds 10 for more runs)
```

## Publishing

The build uses relative paths, so `dist/` runs from any folder or domain.

- **itch.io:** `npm run package` writes `release/melongeddon-web.zip`. On itch.io, create a project with Kind = HTML, upload the zip, tick "This file will be played in the browser", and set the embed size to 1280×800 (or "click to launch in fullscreen" for phones).
- **Netlify:** connect the repo (settings come from `netlify.toml`), or drag the `dist/` folder onto app.netlify.com/drop.
- **GitHub Pages:** push to GitHub, then in the repo's Settings → Pages set Source to "GitHub Actions". `.github/workflows/pages.yml` tests, builds and deploys on every push to `main`/`master`.

Optional: once you know the final URL, make `og:image` in `index.html` an absolute URL so link previews show the poster.

## Endless mode

Pick **Endless** as the night on the keeper screen. You play act one's six waves, then generated waves that cycle four themes (corn swarms, shelled melons, pumpkins, a mix), grow every other wave, and add armoured variants from wave 13. Karl comes every fifth wave. You get an upgrade pick after waves 1, 2 and 6, then every fifth wave. Enemy health follows the story curve to wave 10, then grows `BALANCE.endlessGrowth` (15%) per wave. In simulation, Normal runs end around waves 17–19 and Easy around 25. Best endless score is saved separately.

## Controls

Mouse or touch to build and select. Keys: `1`–`5` pick a cannon (or choice 1–3 on upgrade and back-room screens), `Space` starts the wave or pauses, `P` pause, `S` sell, `B` back room, `Esc` close, `+`/`-` speed, `M` sound. Music has its own toggle in Settings and the header.

All sound is synthesized in `src/game/audio.ts`; the engine raises cues in `world.sfx` and the UI plays them.

## Layout

- `src/game/rules.ts` – towers, upgrades, mods, maps, waves, enemy stats (pure data)
- `src/game/engine.ts` – the simulation: world state, combat, phases (no DOM)
- `src/game/draw.ts` – canvas renderer
- `src/game/audio.ts` – Web Audio tones
- `src/components/MelonGame.tsx` – HUD, menus, overlays
- `public/sprites/` – art
- `scripts/sim.ts`, `scripts/sim-core.ts` – headless bot runs for balance testing
- `tests/` – engine tests (`node --test`)
- `docs/balance-baseline.md` – simulator report before any rebalancing
- `docs/balance-current.md` – simulator report for the current numbers

## Tuning

The main knobs are in `BALANCE` in `src/game/rules.ts` (enemy health curve, kill rewards, pulp puddle rate, slow strength, Sir Michael's start, the betrayal payout, endless health growth), plus `DIFFICULTIES` in the same file. After changing them, run `npm run sim` and compare against `docs/balance-current.md`.

Targets used for the current numbers: a cautious player (2 towers per wave) wins ~90% on Story, ~60–70% on Stacks, ~35–45% on Melongeddon; a player who builds whenever they can wins ~90% on Stacks and ~50% on Melongeddon.
