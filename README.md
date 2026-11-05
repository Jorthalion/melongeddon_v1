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
