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

## Nights

Each story night is 15 waves. Midnight plays act one (waves 1-6), the knight's choice, then nine waves for that choice ending in its finale (The Household, The Grudge or Unchaperoned). The Overflow ends with "The meter spends" and "Up the chute", when absurdity drops rinds down the chute. Enemy health climbs the full curve through wave 6, then `BALANCE.storyHpPace` (0.375) of a step per wave after that, so wave 15 is as tough as the old 10-wave finale.

## Endless mode

Pick **Endless** as the night on the keeper screen. You play act one's six waves, then generated waves that cycle four themes (corn swarms, shelled melons, pumpkins, a mix), grow every other wave, and add armoured variants from wave 13. Karl comes every fifth wave. You get an upgrade pick after waves 1, 2 and 6, then every fifth wave. Enemy health follows the story curve to wave 10, then grows `BALANCE.endlessGrowth` (15%) per wave. In simulation, Normal runs end around waves 17–19 and Easy around 25. Best endless score is saved separately.

## Cannons

15 cannons in three build tabs (`Q`/`W`/`E`, then `1`–`5`):

- **Damage:** Melon, Mortar, Seed Spitter (rapid, pings off shells), Shelf Ballista (pierces a line), Long Reader (whole-board sniper, hits the toughest)
- **Control:** Still, Fire, Freeze, Shush Bell (area stun; husks are deaf), Fly Hive (homing, whole board)
- **Support:** Reading Lamp (boosts neighbours), Ink Well (+25% damage taken), Peeler (strips shells/husks/damp), Bookworm (damage over time on pumpkins and Karl), Compost Heap (seeds every wave)

**Cannon upgrades.** Five of the new cannons have an upgrade in the between-wave picks: Barbed Spears (Ballista: spear slows), Footnotes (Reader: hits ink the target), Stinging Flies (Hive: each fly hits a second fruit), Ink Blot (Ink Well: popped marked fruit splash ink, marks sting harder) and Interest (Compost: +20 per heap plus 10% of unspent seeds, up to 20). Each also makes its own cannon fire faster. One is offered only once you've built that cannon, never at the first pick, and it takes the middle slot so the keeper's own pick stays. It doesn't change which picks come next. Knobs are in `CANNON` (`upgradePace`, `readerUpgradePace`, `inkUpgradePace`, `blotInkBonus`, `blotRadius`, `interestBase`, `interestRate`, `interestCap`).

In simulation (bot always takes the cannon upgrade vs never), Barbed Spears, Footnotes and Stinging Flies are about level with the general pick they replace. Ink Blot and Interest still trail by roughly 20 points: both boost other cannons or reward saving seeds, which the bot doesn't plan for. The simulator accepts a `pickUpgrade` chooser in `RunConfig` for this kind of test.

The ten newer cannons are drawn in code (`src/game/drawCannons.ts`) until there is painted art. Their stats are in `PROFILE` and `CANNON` in `src/game/rules.ts`. Upgrade on-hit effects (Juicy, Splatter, Electric) only fire from the original four shooting cannons, so rapid-fire cannons don't multiply them.

## Maps

Night one (and Endless) can be played on any unlocked map. Night two is always the Overflow. Boards are defined in `BOARDS` in `src/game/rules.ts` as a list of carpet corners, plus fixed spots for ally and knight cannons.

| Map | What's different | Unlocked by |
|---|---|---|
| The Stacks | the original carpet | always open |
| The Annex | the carpet folds back on itself | always open |
| The Mezzanine | balcony across the top, floor across the bottom, open middle | clearing wave 5 |
| Rare Books | spiral to a door in the middle; fruit have 25% more health (`hp` on the board) | popping Karl |
| The Archive | dark: cannons have 20% less range unless a Reading Lamp reaches them (`BALANCE.archiveDark`) | winning a night |

Map unlock goals are `MAP_GOALS` in `src/game/meta.ts`. Maps without painted art get a drawn preview (`src/components/MapPreview.tsx`). In simulation all five play within a few points of the Stacks. Rare Books is the easiest without its health bonus; the Archive is the hardest for the bot, which doesn't plan lamp placement.

## Bookmarks (meta unlocks)

Milestones across runs unlock bookmarks: small perks you equip one at a time on the keeper screen. Progress is saved in the browser (`src/game/meta.ts`).

| Bookmark | Effect | Unlocked by |
|---|---|---|
| Seed Fund | +30 starting seeds | clearing wave 3 |
| Spare Stack | +2 stacks | popping Karl |
| Back-room Key | first fitting each run is free | buying 5 fittings |
| Bulk Order | cannons cost 5 less | winning a night |
| Late Fees | +1 seed per kill | reaching wave 15 in Endless |

Effect sizes live in `BOOKMARK_VALUES`. The simulator can equip one (`bookmark` in `RunConfig`); in testing each adds roughly 0–17 points of win rate, Late Fees the most.

## Controls

Mouse or touch to build and select. Keys: `1`–`5` pick a cannon (or choice 1–3 on upgrade, back-room and knight cards, and the keeper on Setup), `Enter` presses the main button on Setup, the intro, story cards and end cards, arrows move through the Title menu, `Space` starts the wave or pauses, `P` pause, `S` sell, `B` back room, `Esc` close or open the pause menu (Back on Setup and the intro), `+`/`-` speed, `M` sound. Music has its own toggle in Settings and the header.

The pause menu (`Esc` or the menu button) has Resume, Settings, Restart night and Leave to title. The game remembers your last setup: the Title's Continue starts it again, and the end cards offer Play again, Change setup and Title.

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

The main knobs are in `BALANCE` in `src/game/rules.ts` (enemy health curve, story-night pace, kill rewards, pulp puddle rate, slow strength, Sir Michael's start, the betrayal payout, endless health growth), plus `DIFFICULTIES` in the same file. After changing them, run `npm run sim` and compare against `docs/balance-current.md`.

Targets used for the current numbers: a cautious player (2 towers per wave) wins ~90% on Story, ~60–70% on Stacks, ~35–45% on Melongeddon; a player who builds whenever they can wins ~90% on Stacks and ~50% on Melongeddon.
