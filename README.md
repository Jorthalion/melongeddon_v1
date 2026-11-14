# Melongeddon

A single-player tower defense: defend the Midnight Library from melons, corn, and pumpkins.

Standalone Vite + React + Tailwind project, extracted from the original Grok app-builder export.

**New here? Read the [Setup and Player Guide](docs/GUIDE.md)**: how to install and run it, publish your own copy, and how to play (controls, keepers, towers, upgrades, enemies, nights and tips).

Play online (once GitHub Pages is on): https://jorthalion.github.io/melongeddon_v1/

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm test         # engine tests
npm run sim      # balance simulator -> sim-results/report.md (add -- --seeds 10 for more runs)
```

## Publishing

The build uses relative paths, so `dist/` runs from any folder or domain.

- **Windows installer:** `npm run installer` writes `release/installer/Melongeddon-Setup-<version>.exe` (Electron; code in `electron/`, settings under `"build"` in `package.json`). Pushing a tag like `v0.2.0` runs `.github/workflows/release.yml`, which builds, smoke-tests (`MELONGEDDON_SMOKE=1`) and publishes it as a GitHub Release. See the guide for the long-path workaround.
- **Installable web app:** the hosted build is a PWA (`public/manifest.webmanifest`, `public/sw.js`). The build writes `dist/precache.json` (every file) so the service worker can cache the whole game for offline play; the Title shows **Install app** when the browser offers it. Fonts are bundled (`@fontsource-variable`), so offline copies look the same.

- **itch.io:** `npm run package` writes `release/melongeddon-web.zip`. Full step-by-step page setup, description, tags, cover and screenshots: [docs/itch/ITCH.md](docs/itch/ITCH.md).
- **Netlify:** connect the repo (settings come from `netlify.toml`), or drag the `dist/` folder onto app.netlify.com/drop.
- **GitHub Pages:** push to GitHub, then in the repo's Settings → Pages set Source to "GitHub Actions". `.github/workflows/pages.yml` tests, builds and deploys on every push to `main`/`master`.

Optional: once you know the final URL, make `og:image` in `index.html` an absolute URL so link previews show the poster.

## Nights

Each story night is 15 waves. Midnight plays act one (waves 1-6), then nine act-two waves ending in the finale, Unchaperoned. Nobody comes to the door: the knight's visit, its alliance and its betrayal were removed. The Overflow ends with "The meter spends" and "Up the chute", when absurdity drops rinds down the chute. Enemy health climbs the full curve through wave 6, then `BALANCE.storyHpPace` (0.375) of a step per wave after that, so wave 15 is as tough as the old 10-wave finale. The Overflow multiplies enemy health by `BALANCE.overflowHp` (1.4): at 1.0 the simulator won 96% of Overflow nights on Normal against 69% for Midnight; at 1.4 it is 72% on Normal and 35% on Melongeddon (Midnight: 38%).

**The Overflow's chute.** From wave 6, some fruit come up the returns chute: they appear past the far end of the carpet and walk it backwards, and one that reaches the entrance costs a stack. Waves 6–9, 11, 13 and 14 send shelled melons up it; waves 14 and 15 also drop a shelled melon per 25 absurdity, and wave 15 sends Karl. A **CHUTE** plate and arrows mark that end of the carpet: they glow blue and move while the current or next wave uses the chute (`hud.chuteWave`), and sit dim otherwise. The first chute wave also shows a one-time tip (`melongeddon:chute-tip`; Settings › Show tips again brings it back).

## Keepers

Seven keepers, picked on the setup screen (keys 1–7). Each has a perk and a **signature tower**: only that keeper can build it, one at a time, from the **Keeper** tab (key R). Mynxi's, Vaelithra's, the Legal Elf's and Ooze Clues' tabs also hold more keeper towers (the Legal Elf has three): the Reserve Desk, the Unstoppered, the Foot of the Law, the Honeyed Heel and the Copycat (`KEEPER_TOWERS` in `rules.ts`; `SIGNATURE` is the first of each list). A keeper tower can have an unlock goal (`TOWER_GOALS` in `meta.ts`, tracked in `MetaStats`); until it's met the tower shows a lock on the build bar. Keeper perks that name the signature tower apply to it only. Keeper towers can't be fitted in the back room, except the Unstoppered, which takes a Still's fittings.

| Keeper | Start | Perk | Signature tower |
|---|---|---|---|
| Mynxi | 12 stacks, 150 seeds | First build 40 seeds, longer reach | **Card Catalogue** (90): long reach, each shot chains into 2 more fruit at 70%. Also **Reserve Desk** (30, locked until a night is won with 200+ seeds in hand): no shot, built only beside the carpet; banks 8 seeds after every wave survived, paid out when sold or at a win; a melon within 60 px eats the bank |
| Vaelithra | 11 stacks, 120 seeds | Shots slow; the first tower of each kind each night costs `CANNON.vaelFirstPremium` (20) more (`buildCost` with `hud.builtKinds`, cleared each night); back-room upgrades 25 + 15 per upgrade the kind has (`shopPrice`) | **Bubbling Cauldron** (85): potion puddle that slows and deals 18/s for 3 s. Also **Unstoppered** (150, locked until she wins a night with a Still built and Trial Vial or Distilled Batch taken; `MetaStats.brews`): no shot; drips a slow puddle from its own tile only; after each wave a 1 in 3 chance (`CANNON.flaskSpillChance`) to spill onto a neighbouring open tile that reaches the carpet, preferring one that reaches new carpet, up to 4 tiles; every carpet cell a spill tile reaches joins `world.wet` for the night (selling doesn't clear it): fire there ×`CANNON.wetFire` (0.6) damage and duration, other puddles ×`CANNON.wetPuddle` (1.5) life; log "That was not in the notes."; takes the Still's back-room upgrades; sells for a flat 35 (`refundFor`) |
| Sir Michael | 10 stacks, 110 seeds, a free cannon | Shots hit harder | **Pumpkin Trebuchet** (110): huge splash that knocks non-boss fruit back 34 px |
| Legal Elf | 12 stacks, 150 seeds | Back room 30% cheaper | **Scales of Justice** (95): hits the heaviest fruit in reach for its damage plus 12% of the target's max health (4% on Karl); kills pay a 5-seed fee. Also **Foot of the Law** (85): every 3.2 s a giant foot stamps the most crowded spot of carpet in reach, for 7 damage (splash) and a 1.1 s stop (0.4 s on Karl) on everything under it, husks included. And **Honeyed Heel** (75): no damage; every 3.2 s it leaves a sticky honey footprint on the carpet just ahead of the fruit (radius 30, lasts 7 s, up to 3 at once); no slow: anything that steps in it is sticky for 4 s and takes +25% damage from everything, husks included (`CANNON.honeyAmp`, `honeyTime`) |
| Ooze Clues | 13 stacks, 140 seeds | The first single-fruit leak each wave is absorbed | **Mimic Chest / Memec** (100): about every 4 s swallows one nearby fruit whole (+3 seeds); Karl takes a 120 bite instead. Also **The Copycat** (160, kind `copycat`): blank until a Melon, Mortar, Still, Fire or Freeze cannon sits orthogonally beside it; then it acts as a copy of the newest such neighbour (a shadow tower in `Tower.copy`, synced by `syncMimics`), with that kind's back-room upgrades plus a hidden `mimicstep` step: melon +30 reach, mortar +16 splash, still +12 puddle and drips 25% sooner, fire patch +1.2 s, freeze +0.4 s (`CANNON.mimic*`). Never more damage. Upgrades bought later for that kind reach the copy at once; a thin gold line shows the source |
| Dr. Samodovol | 8 stacks, 100 seeds (the weakest keeper, on purpose) | Every shelf has his 3 real upgrades plus one **wrong book** (`hud.falseCard`, added by `withWrongBook`): it shows a real upgrade's name and blurb, gives nothing, and the next combat his cannons deal ×0.85 damage and take ×1.15 between shots (`CANNON.misread`). His record remembers he's been fooled (`KeeperRecord.misread`) | **History Lectern** (65): no shot, no buff. After each wave, if any fruit got 75% along the carpet (`CANNON.lectureAt`) or leaked, the kind that got furthest walks at ×0.85 (`CANNON.lectureSlow`) next wave only; one kind, one Lectern |
| Quackarot | 11 stacks, 130 seeds | While a Quack-Liber stands, every other tower within 2 tiles (`CANNON.quackAura`) fires 10% faster (`CANNON.quackHaste`; the best turret counts, they don't stack; `quick` in `statsOf`) | **Quack-Liber** (95): two-barrel rocket turret. Rockets burst (`CANNON.quackSplash`, 60% of the hit) and slow everything in the burst for 0.6 s (`CANNON.quackSlow`; husks shrug it off). It can be retargeted once after placing (`api.retarget`, `Tower.aimMode`: toughest or rearmost fruit in reach) |

Tower numbers are in `CANNON` and `PROFILE` in `src/game/rules.ts`; starting stacks and seeds for the newer keepers are in `KEEPER_START`. Portraits for the three newer keepers are `public/sprites/portrait-elf.webp`, `-ooze` and `-scholar` (square crops of their portrait art); the signature towers are painted sprites (`public/sprites/sig-*.webp`), with code-drawn fallbacks in `src/game/drawCannons.ts`. Quackarot's portrait is `portrait-quack.webp`; his Quack-Liber has no painted sprite yet and is drawn in code. The Archive, Rare Books and Annex have their own furniture on the shelf cells and their own exit (`prop-archive-cabinet` / `-vault`, `prop-rarebooks-case` / `-door`, `prop-annex-storage` / `-hatch`; `ROOM_ART` in `src/game/draw.ts`); it's art only, and the grid and carpet are unchanged.

**Simulated balance** (bots, 1 seed per setup, so ±7 points of noise): every keeper lands in the same range as the original three. The bots pick upgrades at random and rarely use the back room, so they undersell the Doctor's fourth choice and the Elf's discount.

## Difficulty

Four levels on the setup screen. They scale enemy health and speed (`DIFFICULTIES` in `src/game/rules.ts`):

| Level | Health | Speed | Simulated bot win rate |
|---|---|---|---|
| Story | 0.75× | 0.9× | ~97% |
| Normal | 1× | 1× | ~77% |
| Melongeddon | 1.2× | 1.12× | ~41–49% |
| Overdue | 1.45× | 1.15× | ~25% |

Bots are not smart players, so read these as relative. Wins on Melongeddon and Overdue are counted in the saved stats (`hardWins`); the first one unlocks the Reading Room.

## Endless mode

Pick **Endless** as the night on the setup screen (New night). You play act one's six waves, then generated waves that cycle four themes (corn swarms, shelled melons, pumpkins, a mix), grow every other wave, and add armoured variants from wave 13. Karl comes every fifth wave. You get an upgrade pick after waves 1, 2 and 6, then every fifth wave. Enemy health follows the story curve to wave 10, then grows `BALANCE.endlessGrowth` (15%) per wave. In simulation, Normal runs end around waves 17–19 and Easy around 25. Best endless score is saved separately.

## Cannons

23 cannons in five build tabs (`Q`/`W`/`E`/`T`/`Y`, then `1`–`5`; `R` is the keeper's own):

- **Damage:** Melon, Mortar, Seed Spitter (rapid, pings off shells), Shelf Ballista (pierces a line), Long Reader (whole-board sniper, hits the toughest)
- **Control:** Still, Fire, Freeze, Shush Bell (area stun; husks are deaf), Fly Hive (homing, whole board; each fly does 60% of a melon shot). Shots live as long as their trip needs (`shotLife` in the engine: the distance at `SHOT_SPEED`, plus a second), so the hive and the Reader land anywhere on the biggest maps.
- **Support:** Reading Lamp (boosts neighbours), Ink Well (+25% damage taken), Peeler (strips shells/husks/damp), Bookworm (damage over time on pumpkins and Karl), Compost Heap (seeds every wave)
- **Trick:** Boomerang Bookend (elliptical loop out and back, pierces, one hit each way), Orrery (three planets orbit the tower and hit what they sweep, 0.5 s per planet per fruit), Paper Plane (a glider that steers toward the nearest fruit at a limited turn rate, so it swoops in arcs; 0.45 s between hits on the same fruit), Serpent Quill (a quill that flies out in a sine wave to 1.6× its range, hitting each fruit it crosses once), Rolling Globe (lobs a globe onto the carpet just ahead of the lead fruit; the landing thuds everything within 34 px, then it rolls back along the carpet toward the entrance, hitting each fruit in its way once)
- **Heavy** (`Y`, every keeper; locked until wave 6 or 200 seeds in hand that night, `HEAVY_WAVE` / `HEAVY_SEEDS`): Printing Press (200: every 2.9 s a sheet lands on the lead fruit and slides back up the carpet 220 px, hitting each fruit once for 70 and inking it: +25% damage taken for 4 s), Pipe Organ (220: every 2.5 s a chord hits every fruit within 1.25× reach for 59 and slows it 1.2 s; every third chord also stops it 1 s, 0.35 s on Karl; husks take the damage but ignore the slow and the stop), Brass Telescope (250: 3.2× reach, instant shots of 168 every 0.77 s that ignore shells, husks and damp; aims for Karl, then armoured fruit, then the toughest). Each has its own fittings: Broadsheet and Wet ink for the Press, Bigger pipes and Crescendo stop for the Organ, Longer barrel and Quick wick for the Telescope. Tuned in the simulator (melons plus one kind, all keepers, 3 maps) to about the Ballista's level, before counting the ink, slows and armour piercing the bots don't use: Press 67% Normal / 33% Hard, Organ 65% / 28%, Telescope 67% / 22% (melons alone 59% / 24%, melons + Ballista 76% / 33%). Knobs: `PROFILE.press/organ/scope` and `CANNON.press*` / `CANNON.organ*` in `rules.ts`.

**Trick shots.** Boomerangs, planes, quills and globes are `Flyer`s (`world.flyers`), moved by `moveFlyer` in the engine; the Orrery's planets are computed per tower in `spinOrrery`. Numbers are the `boomerang*`, `orrery*`, `plane*`, `quill*` and `globe*` keys in `CANNON` plus their `PROFILE` rows. In simulation (Midnight, the Stacks, bot builds melons plus one other kind), win rates are: melons only 58%, + Ballista 61%, + Paper Plane 69–70%, + Serpent Quill 72%, + Orrery 74%, + Boomerang 75–80%, + Rolling Globe 76%.

**Trick cannons open with keeper levels** (`TRICK_LEVEL` in `src/game/rules.ts`): Boomerang Bookend at level 2, Orrery 3, Paper Plane 5, Serpent Quill 7, Rolling Globe 9. It's the playing keeper's level when the night starts (`hud.runLevel`), so each keeper opens them separately, and a level reached mid-night counts from the next night (the level-up message names the cannon). Locked cards show a lock and "Level N" in the build bar. Developer mode has every keeper at level 10. The simulator and most tests pass `allTricks: true` to `createWorld` so bots can build any of them. The trick cannons, the boomerang, plane and quill in flight, and the three orrery planets are painted sprites (`public/sprites/trick-*.webp`, `fly-*.webp`); the globe in flight is still drawn in code. Image prompts are in [docs/art/TRICK_PROMPTS.md](docs/art/TRICK_PROMPTS.md).

**Cannon upgrades.** Five of the new cannons have an upgrade in the between-wave picks: Barbed Spears (Ballista: spear slows), Footnotes (Reader: hits ink the target), Stinging Flies (Hive: each fly hits a second fruit), Ink Blot (Ink Well: popped marked fruit splash ink, marks sting harder) and Interest (Compost: +20 per heap plus 10% of unspent seeds, up to 20). Each also makes its own cannon fire faster. One is offered only once you've built that cannon, never at the first pick, and it takes the middle slot so the keeper's own pick stays. It doesn't change which picks come next. Knobs are in `CANNON` (`upgradePace`, `readerUpgradePace`, `inkUpgradePace`, `blotInkBonus`, `blotRadius`, `interestBase`, `interestRate`, `interestCap`).

In simulation (bot always takes the cannon upgrade vs never), Barbed Spears, Footnotes and Stinging Flies are about level with the general pick they replace. Ink Blot and Interest still trail by roughly 20 points: both boost other cannons or reward saving seeds, which the bot doesn't plan for. The simulator accepts a `pickUpgrade` chooser in `RunConfig` for this kind of test.

The ten newer cannons are drawn in code (`src/game/drawCannons.ts`) until there is painted art. Their stats are in `PROFILE` and `CANNON` in `src/game/rules.ts`. Upgrade on-hit effects (Juicy, Splatter, Electric) only fire from the original four shooting cannons, so rapid-fire cannons don't multiply them.

## Tower types

The build tabs (Damage / Control / Support) say what a tower is for. Each tower also has a **type**, which says how it does damage and decides which shared upgrades change it (`TOWER_TYPE` and `UPGRADE_TARGETS` in `src/game/rules.ts`):

| Type | Towers |
|---|---|
| Cannon | Melon cannon, Pumpkin mortar, Fire cannon, Freeze cannon, Pumpkin Trebuchet, Printing Press |
| Precision | Seed Spitter, Shelf Ballista, Long Reader, Peeler, Boomerang Bookend, Orrery, Paper Plane, Serpent Quill, Rolling Globe, Brass Telescope, Card Catalogue, Scales of Justice |
| Alchemy | Still, Ink Well, Bubbling Cauldron, Unstoppered |
| Creature | Fly Hive, Bookworm, Mimic Chest, Copycat |
| Utility (no upgrade picks apply) | Shush Bell, Reading Lamp, Compost Heap, History Lectern, Foot of the Law, Honeyed Heel, Reserve Desk, Pipe Organ |

| Upgrade | Affects |
|---|---|
| Rapid Rind, Reading Lamp | Cannon, Precision |
| Heavy Caliber, Juicy Explosions, Knight's Splatter, Electrified Melons | Cannon |
| Bouncing Melons | Melon cannon |
| Sticky Pulp, Trial Vial, Distilled Batch | Alchemy, and the pulp cannons leave (they also make the Bubbling Cauldron's puddle bigger or stronger) |
| Seed Cache, Overdue Fines | Seeds only |
| Barbed Spears, Footnotes, Stinging Flies, Ink Blot, Interest | Their own cannon |

Every upgrade card has a 40px mark (the tower's picture, or a drawn mark for shared upgrades) and a small tag in player words saying what it reaches ("Melon cannons", "Cannons and precision", "The ledger"). The keeper's own cards (Mynxi: Overdue Fines and Reading Lamp; Sir Michael: Heavy Caliber and Knight's Splatter; Vaelithra: Trial Vial and Distilled Batch) have a gold edge and the keeper's name; hover and keyboard focus show the same gold edge. Hotkeys 1–3 are keycaps in each card's top corner. The cannon inspector shows the tower's type.

## Maps

Night one (and Endless) can be played on any unlocked map. Night two is always the Overflow. Boards are defined in `BOARDS` in `src/game/rules.ts` as a list of carpet corners, plus the fixed spot for Sir Michael's cannon and the bookshelf cells (`shelves`, default `DEFAULT_SHELVES`). **Bookshelves block building:** `shelfCells(map, path)` gives the blocked cells (never on the carpet or on Sir Michael's spot), the world keeps them as `world.shelfCells`, the build marker and `pointer` refuse them ("That's a bookshelf"), the bots skip them, and the board draws its shelves from the same set. With shelves blocking, melon-only bots on the Stacks win 54% (58% before) and melon + Boomerang 76% (80%), within the simulator's noise.

| Map | What's different | Unlocked by |
|---|---|---|
| The Stacks | the original carpet | always open |
| The Annex | the carpet folds back on itself | always open |
| The Mezzanine | balcony across the top, floor across the bottom, open middle | clearing wave 5 |
| Rare Books | spiral to a door in the middle; fruit have 25% more health (`hp` on the board) | popping Karl |
| The Archive | dark: cannons have 20% less range unless a Reading Lamp reaches them (`BALANCE.archiveDark`) | winning a night |
| The Great Hall | big (22 × 14): one very long snaking carpet; fruit have 20% more health | winning two nights |
| The Reading Room | big (22 × 14): three long lanes, cannons between lanes cover two; fruit have 40% more health | winning a night on Melongeddon or harder |

**Board size.** A board may set `cols`/`rows` (default 16 × 10); `boardSize(map)` gives cells and world pixels, and the world carries them as `world.cols/rows/w/h`. Drawing, input (`fitBoard`), previews and the simulator all read the world's size, so a bigger board simply draws at a smaller scale. `GLOBAL_RANGE` (1400 px) is larger than the biggest board's diagonal. Without their health bonus the long carpets made the big maps much easier (Midnight on Normal: Great Hall 89%, Reading Room 97%, Stacks 71%). With `hp` 1.2 and 1.4 they simulate at 69% / 46% (Great Hall) and 82% / 32% (Reading Room) on Normal / Melongeddon, against 71% / 42% for the Stacks.

Map unlock goals are `MAP_GOALS` in `src/game/meta.ts`. Map cards and the intro screen draw the real board (`src/components/MapPreview.tsx`). In simulation the five classic maps play within a few points of the Stacks. Rare Books is the easiest without its health bonus; the Archive is the hardest for the bot, which doesn't plan lamp placement.

## Late slips

The Overflow's setup screen offers up to three optional **late slips** (`src/game/slips.ts`): Heavy Returns (chute opens on wave 3), Damp Powder (−20% damage), No Refunds (selling pays 0), Short Shelf (−4 stacks) and Karl Is Early (extra Karl on wave 8). Each adds keeper XP (+10% to +25%, bonuses add). Picks save with the setup record; the simulator takes them through `slips` in `RunConfig`.

## Mynxi's tutorial (guided first night)

A new player's first **Start** plays Mynxi's tutorial: Midnight on the Stacks as Mynxi, on Normal, made very easy. Fruit have 30% of their health and 80% of their speed, and the night starts with +80 seeds and +8 stacks (`tutorialHp`, `tutorialSpeed`, `tutorialSeeds`, `tutorialStacks` in `BALANCE`; applied through `tune()` and `tutorialStart()` while `hud.tutorial` is on, restarts included). In simulation, a player who builds only the two cannons the lessons ask for holds with no leaks to wave 8; one who adds a cannon every third or fourth wave wins; one who adds a cannon a wave wins without a leak. She talks the player through 13 lessons in a speech box (`src/components/MynxiTutor.tsx`):

1. **Talk** (Next): welcome, the carpet and stacks, seeds.
2. **Build** a Damage cannon, then the range ring (talk).
3. **Build** a Control or Support tower, then the five tabs, the keeper tower and trick cannons (talk).
4. **Start** the wave, then speed and pause (Next, or change the speed), and holding the carpet.
5. **Pick** an upgrade card after wave 1.
6. **Open** the back-room tab before wave 2 and buy an upgrade (that one is free).
7. A last word on selling (talk).

Talk steps have a Next button; the others wait for the player, and building early skips the lessons it covers. The wave won't start while a step before it is open (`GUIDE_HOLDS`); pressing Start wave says why. Leaving the back room saves `melongeddon-guide` = `done` and opens **New night**. For the rest of that night (`hud.tutorial`) she chips in once each for a leak, Karl, affording her Card Catalogue, and the win or loss. **Skip** (on the box, or **Skip the guide** on the Title) ends it, and **Tutorial** on the Title replays it (`api.startTutorial()`). The steps are `GuideStep` / `GUIDE_STEPS` / `GUIDE_TALK` in the engine; her lines are `LESSON` and `TIPS` in the component. Her four expressions (`FACE`) all use the portrait until the art in [docs/art/MYNXI_PROMPTS.md](docs/art/MYNXI_PROMPTS.md) arrives. Tests and the simulator never see the tutorial unless they pass `guide: true` to `createWorld`.

## Saves

Saves are separate `localStorage` keys; `melongeddon-save-version` says which layout they are in (`SAVE_VERSION` in `src/lib/saves.ts`, now 1). `migrateSaves()` runs before anything reads them: saves with no version (v0.5.0 and earlier) count as version 0 and are migrated (players with progress skip the guided night); an unreadable version clears progress but keeps preferences; a newer version is left alone; a save that isn't valid JSON is dropped. To change a save layout, bump `SAVE_VERSION` and add a step to `MIGRATIONS`.

## Developer mode

Settings › **Developer mode** (`melongeddon-dev` in localStorage) reloads the game with `ALL_UNLOCKED` stats and `maxedProgress(0)` keepers, a DEV badge, and `api.devSeeds()` (+`DEV_SEEDS`, 500) in the pause menu. While it is on, lifetime stats, best waves and keeper XP are not written (`persistStats`, `persistKeepers`), so switching it off restores the real progress. Tests can pass `dev: true` to `createWorld`.

## Keeper levels

Each keeper levels from 1 to 10 by clearing waves as that keeper (10 XP a wave, +50 for a win, scaled by difficulty: Story ×0.5 up to Overdue ×2). Levels 2, 4, 6, 8 and 10 each open a choice of two perks, picked on the setup screen and swappable before any night. Level 10 offers a second copy of the keeper's signature tower or a keeper-specific capstone. Data, XP curve and storage live in `src/game/levels.ts`; the engine applies the merged effects (`perkFx`) when a run starts. The full perk list is in [docs/GUIDE.md](docs/GUIDE.md#keeper-levels-and-perks).

Simulated win rates (all strategies, maps and doors, one seed): level 1 is 69% on Normal and 38% on Melongeddon; a level 10 keeper is about 80% and 50%. Ooze gets slightly bigger perks and Sir Michael smaller ones. Dr. Samodovol is the weakest keeper on purpose: his perks only bend the wrong book and the Lectern (Erratum, Shorter Lecture, Cited Edition, Midpoint, Carried Note, Different Hand, Lecture Notes, Margin, and Marginalia alone at level 10), never damage, seeds or stacks. Quackarot's perks bend his turret: its reach and speed-up (Wide Wake, Steady Hands), its burst (Heavy Payload), a speed-up after its kills (Quiet Confidence), a slowing patch every fourth rocket (Lane Lockdown), sticky targets (Covering Fire), and at level 10 a second turret with a slowing line between the two (Defensive Perimeter). The simulator takes keeper levels through `keepers` in `RunConfig`.

## Bookmarks (meta unlocks)

Milestones across runs unlock bookmarks: small perks you equip one at a time on the setup screen. Progress is saved in the browser (`src/game/meta.ts`).

| Bookmark | Effect | Unlocked by |
|---|---|---|
| Seed Fund | +30 starting seeds | clearing wave 3 |
| Spare Stack | +2 stacks | popping Karl |
| Back-room Key | first back-room upgrade each run is free | buying 5 back-room upgrades |
| Bulk Order | cannons cost 5 less | winning a night |
| Late Fees | +1 seed per kill | reaching wave 15 in Endless |

Effect sizes live in `BOOKMARK_VALUES`. The simulator can equip one (`bookmark` in `RunConfig`); in testing each adds roughly 0–17 points of win rate, Late Fees the most.

## Controls

Mouse or touch to build and select. Keys: `1`–`5` pick a cannon (or choice 1–3 on upgrade cards, an upgrade while the back-room tab is open, 1–4 on the Doctor's picks, and 1–7 for the keeper on Setup), `Q`/`W`/`E`/`R`/`T`/`Y` switch build tabs (R is the keeper's own towers, T the trick shots, Y the heavy cannons), `Enter` presses the main button on Setup, the intro, story cards and end cards, arrows move through the Title menu, `Space` starts the wave or pauses, `P` pause, `S` sell, `B` opens or closes the back-room tab, `Esc` close or open the pause menu (Back on Setup and the intro), `+`/`-` speed, `M` sound. Settings (on the Title and in the pause menu) has sound, music, default game speed, reduce motion, and "Show tips again". The Title's How to play covers controls, cannons, keepers, nights and rooms.

The pause menu (`Esc` or the menu button) has Resume, Settings, Restart night and Leave to title. The game remembers your last setup: the Title's Continue starts it again, and the end cards offer Play again, Change setup and Title.

All sound is synthesized in `src/game/audio.ts`; the engine raises cues in `world.sfx` and the UI plays them.

## Layout

- `src/game/rules.ts` – towers, upgrades, mods, maps, waves, enemy stats (pure data)
- `src/game/engine.ts` – the simulation: world state, combat, phases (no DOM)
- `src/game/draw.ts` – canvas renderer
- `src/game/audio.ts` – Web Audio tones
- `src/components/MelonGame.tsx` – the shell: game loop, canvas input, Back gesture, and which screen shows
- `src/components/TitleScreen.tsx`, `SetupScreen.tsx`, `RoomScreen.tsx` – Title (with How to play), New night setup, the intro
- `src/components/GameHUD.tsx` – header, build footer and tower inspector; `PauseMenu.tsx`, `SettingsPanel.tsx`
- `src/components/CardPicker.tsx` – the between-wave cards and end cards; `Shop.tsx` – the back-room side tab (upgrades per tower kind: every tower of that kind gets them; each kind's price is 40, then +30 per upgrade it has; bought between waves)
- `src/components/ui.tsx` – shared buttons, the `GameApi` type and labels; `keeperCards.ts` – keeper card data
- `src/lib/saves.ts` – save version and migrations (runs at startup)
- `public/sprites/` – art
- `scripts/sim.ts`, `scripts/sim-core.ts` – headless bot runs for balance testing
- `tests/` – engine tests (`node --test`)
- `docs/balance-baseline.md` – simulator report before any rebalancing
- `docs/balance-current.md` – simulator report for the current numbers

## Tuning

The main knobs are in `BALANCE` in `src/game/rules.ts` (enemy health curve, story-night pace, kill rewards, pulp puddle rate, slow strength, Sir Michael's start, endless health growth), plus `DIFFICULTIES` in the same file. After changing them, run `npm run sim` and compare against `docs/balance-current.md`.

Targets used for the current numbers: a cautious player (2 towers per wave) wins ~90% on Story, ~60–70% on Stacks, ~35–45% on Melongeddon; a player who builds whenever they can wins ~90% on Stacks and ~50% on Melongeddon.
