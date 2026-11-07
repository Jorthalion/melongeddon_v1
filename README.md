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

## Keepers

Six keepers, picked on the setup screen (keys 1–6). Each has a perk and a **signature tower**: only that keeper can build it, one at a time, from the **Keeper** tab (key R). Signature towers can't be fitted in the back room.

| Keeper | Start | Perk | Signature tower |
|---|---|---|---|
| Mynxi | 12 stacks, 150 seeds | First build 40 seeds, longer reach | **Card Catalogue** (90): long reach, each shot chains into 2 more fruit at 70% |
| Vaelithra | 11 stacks, 120 seeds | Shots slow | **Bubbling Cauldron** (85): potion puddle that slows and deals 18/s for 3 s |
| Sir Michael | 10 stacks, 110 seeds, a free cannon | Shots hit harder | **Pumpkin Trebuchet** (110): huge splash that knocks non-boss fruit back 34 px |
| Legal Elf | 12 stacks, 150 seeds | Back room 30% cheaper | **Scales of Justice** (95): hits the heaviest fruit in reach for its damage plus 12% of the target's max health (4% on Karl); kills pay a 5-seed fee |
| Ooze Clues | 13 stacks, 140 seeds | The first single-fruit leak each wave is absorbed | **Mimic Chest / Memec** (100): about every 4 s swallows one nearby fruit whole (+3 seeds); Karl takes a 120 bite instead |
| Dr. Samodovol | 12 stacks, 150 seeds | Upgrade picks offer 4 choices | **History Lectern** (65): no shot; cannons within 80 px deal +25% damage, +5% per wave since it was built, up to +60% |

Tower numbers are in `CANNON` and `PROFILE` in `src/game/rules.ts`; starting stacks and seeds for the newer keepers are in `KEEPER_START`. Portraits for the three newer keepers are `public/sprites/portrait-elf.webp`, `-ooze` and `-scholar` (square crops of their portrait art); the signature towers are drawn in code (`src/game/drawCannons.ts`) until painted sprites exist.

**Simulated balance** (bots, 1 seed per setup, so ±7 points of noise): every keeper lands in the same range as the original three. The bots pick upgrades at random and rarely use the back room, so they undersell the Doctor's fourth choice and the Elf's discount.

## Difficulty

Four levels on the setup screen. They scale enemy health and speed (`DIFFICULTIES` in `src/game/rules.ts`):

| Level | Health | Speed | Simulated bot win rate |
|---|---|---|---|
| Story | 0.75× | 0.9× | ~97% |
| Normal | 1× | 1× | ~77% |
| Melongeddon | 1.2× | 1.12× | ~41–49% |
| Overdue | 1.45× | 1.15× | ~25% |

Bots are not smart players, so read these as relative. A win on Overdue also counts as a Melongeddon win for unlocks.

## Endless mode

Pick **Endless** as the night on the setup screen (New night). You play act one's six waves, then generated waves that cycle four themes (corn swarms, shelled melons, pumpkins, a mix), grow every other wave, and add armoured variants from wave 13. Karl comes every fifth wave. You get an upgrade pick after waves 1, 2 and 6, then every fifth wave. Enemy health follows the story curve to wave 10, then grows `BALANCE.endlessGrowth` (15%) per wave. In simulation, Normal runs end around waves 17–19 and Easy around 25. Best endless score is saved separately.

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

Milestones across runs unlock bookmarks: small perks you equip one at a time on the setup screen. Progress is saved in the browser (`src/game/meta.ts`).

| Bookmark | Effect | Unlocked by |
|---|---|---|
| Seed Fund | +30 starting seeds | clearing wave 3 |
| Spare Stack | +2 stacks | popping Karl |
| Back-room Key | first fitting each run is free | buying 5 fittings |
| Bulk Order | cannons cost 5 less | winning a night |
| Late Fees | +1 seed per kill | reaching wave 15 in Endless |

Effect sizes live in `BOOKMARK_VALUES`. The simulator can equip one (`bookmark` in `RunConfig`); in testing each adds roughly 0–17 points of win rate, Late Fees the most.

## Controls

Mouse or touch to build and select. Keys: `1`–`5` pick a cannon (or choice 1–3 on upgrade, back-room and knight cards, 1–4 on the Doctor's picks, and 1–6 for the keeper on Setup), `Q`/`W`/`E`/`R` switch build tabs (R is the keeper's own tower), `Enter` presses the main button on Setup, the intro, story cards and end cards, arrows move through the Title menu, `Space` starts the wave or pauses, `P` pause, `S` sell, `B` back room, `Esc` close or open the pause menu (Back on Setup and the intro), `+`/`-` speed, `M` sound. Settings (on the Title and in the pause menu) has sound, music, default game speed, reduce motion, and "Show tips again". The Title's How to play covers controls, cannons, keepers, nights and rooms.

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
