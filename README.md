# Melongeddon

A single-player tower defense: defend the Midnight Library from melons, corn, and pumpkins.

Standalone Vite + React + Tailwind project, extracted from the original Grok app-builder export.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
```

## Layout

- `src/game/engine.ts` – rules, waves, simulation (no DOM)
- `src/game/draw.ts` – canvas renderer
- `src/game/audio.ts` – Web Audio tones
- `src/components/MelonGame.tsx` – HUD, menus, overlays
- `public/sprites/` – art
