# Melongeddon: project overview for review

This document describes the whole project so an outside reviewer can judge the game design, the code and the release setup without opening the repository. The numbers come from the code at **v0.5.0** (commit 714814c, 12 November 2026). Section 12 lists the questions we would most like answered.

- **Repository:** https://github.com/Jorthalion/melongeddon_v1
- **Latest release:** [v0.5.0](https://github.com/Jorthalion/melongeddon_v1/releases/tag/v0.5.0), a Windows installer of about 116 MB
- **Origin:** the first version came out of the Grok app-builder. It was then pulled out into a standalone Vite project and has been rebuilt and extended a great deal since.

---

## 1. What the game is

Melongeddon is a single-player **tower defense** game with a comic gothic-library setting. Melons, corn, pumpkins and a boss melon named **Karl** walk a red carpet through the Midnight Library toward a door. The player builds cannons on the floor beside the carpet; they can never build on it. Each fruit that gets through costs a **stack** of books, which works as a life (Karl costs 3). Each pop pays **seeds**, the currency. A story night is **15 waves**.

It runs in three places:

- in a browser (desktop or phone), where it can be installed as an offline web app (PWA);
- as a Windows desktop app (Electron, NSIS installer);
- on itch.io as an HTML5 game. The upload kit is ready, but nothing has been uploaded yet.

**Tone:** dry and absurd. The knight is a pumpkin, the boss is a melon called Karl, and the "Absurdity" meter fills up as you pop fruit.

---

## 2. Tech stack

| Area | Choice |
|---|---|
| Language | TypeScript 5.7 (strict, `tsc --noEmit` runs before every build) |
| UI | React 19, Tailwind CSS v4, lucide-react icons, bundled variable fonts (Fraunces, Outfit) |
| Build | Vite 7, relative asset paths so `dist/` runs from any folder or domain |
| Rendering | One HTML5 `<canvas>` with a hand-written 2D renderer; no game engine |
| Audio | Web Audio only, every sound synthesized in code (no audio files) |
| Desktop | Electron 45 + electron-builder 26 (NSIS, x64) |
| Tests | Node's built-in test runner, running `.ts` directly (Node 24) |
| CI | GitHub Actions: Pages deploy on push, and an installer build on `v*` tags |
| Saves | `localStorage` only, through a wrapper that never throws |

There is no runtime dependency beyond React; everything else is a dev dependency bundled at build time.

---

## 3. Architecture

The design rule is that **the simulation knows nothing about the DOM**. That lets the same engine run in the browser, in Node tests and in a headless balance simulator.

```
rules.ts  (pure data: towers, enemies, waves, maps, upgrades, balance knobs)
   │
engine.ts (createWorld → world state + api; combat, phases, saves)  ← tests/, scripts/sim-core.ts
   │
MelonGame.tsx (React HUD, menus, cards)  ──►  draw.ts / drawCannons.ts (canvas)   audio.ts (Web Audio)
```

### Game loop

`MelonGame.tsx` drives a `requestAnimationFrame` loop with a **fixed 1/60 s step**:

- Frame time is capped at 0.05 s and multiplied by the game speed (0.5×, 1×, 2× or 3×).
- The accumulated time is spent in 1/60 s steps of `stepWorld`, at most 12 per frame.
- After stepping, the loop plays the sound cues the engine queued in `world.sfx`, then redraws the canvas.

The board is drawn at one uniform scale, centered, with `fitBoard(w, h, …)`, so it never stretches.

### Engine API

`createWorld(onChange, options)` returns an object holding `world` plus action methods. All UI input goes through these, for example:

- building and selecting: `pointer`, `chooseBuild`, `sellSelected`;
- running a night: `startWave`, `pickUpgrade`, `chooseAlliance`;
- the back room: `openShop`, `pickMod`;
- setup choices: `chooseHero`, `chooseMap`, `setDifficulty`, `chooseNight`, `toggleSlip`, `setPerk`, `setBookmark`;
- moving between screens: `openSetup`, `beginNight`, `restartNight`, `continueOverflow`, `tryEndless`;
- controls and tools: `setSpeed`, `togglePause`, `devSeeds`.

`world.hud` is the state the React layer reads. The game's phases are a string union:

`select → coldopen → poster → prep ⇄ combat → upgrade | alliance | betrayal | consequence | memory | shop → victory | defeat`

`nextBeat(cleared, alliance, night)` in rules.ts decides what comes after each wave.

### File map (about 11,800 lines of TypeScript)

| File | Lines | Role |
|---|---|---|
| `src/game/engine.ts` | 2,519 | World state, combat, targeting, phases, saving |
| `src/components/MelonGame.tsx` | 1,854 | Whole React UI: title, setup, HUD, build bar, inspector, cards, settings |
| `src/game/rules.ts` | 1,630 | All game data and balance knobs |
| `src/game/draw.ts` | 1,135 | Canvas renderer: board, enemies, shots, effects |
| `src/game/drawCannons.ts` | 724 | Code-drawn cannons and the fallbacks for missing art |
| `src/game/levels.ts` | 348 | Keeper XP curve, perk data, `perkFx` |
| `src/game/audio.ts` | 310 | Synthesized sound effects and music |
| `scripts/sim-core.ts` | 270 | Headless bot player for balance runs |
| `src/game/keys.ts`, `components/hotkeys.ts` | 257 | Keyboard handling |
| `src/game/meta.ts` | 143 | Lifetime stats, bookmarks, map unlock goals |
| `src/game/slips.ts` | 51 | Late slips (optional Overflow modifiers) |
| `tests/*.test.ts` | ~1,600 | 112 tests in 11 files |

Art is 50 painted `.webp` sprites in `public/sprites/`: towers, shots, enemies, portraits, floor tiles and the title screen. A tower with no painted sprite is drawn with canvas paths instead.

---

## 4. Game systems

### 4.1 Enemies

Base stats (`STATS` in rules.ts):

| Fruit | HP | Speed (px/s) | Seeds | Notes |
|---|---|---|---|---|
| Melon | 32 | 46 | 8 | Basic |
| Corn | 18 | 78 | 10 | Fast; comes in swarms |
| Pumpkin | 78 | 32 | 14 | Slow and tough |
| Karl (boss) | 460 | 20 | 70 | Costs 3 stacks if he leaks; popping him gives 2 stacks back and splashes everything near him |

Fruit can also carry a **guard**, and each guard has a counter:

| Guard | Effect | Counter |
|---|---|---|
| Shell | The first hit only cracks it | Hit it twice, or use a Peeler |
| Husk | Resists direct shots and ignores slows; takes extra from splash and fire | Mortars, fire, or a Peeler |
| Damp | Barely burns | Direct shots, freeze, or a Peeler |

Two variants are pumpkin-only:

- **Raw:** the first burn bakes it into slow "bread" instead of hurting it.
- **Split:** it breaks into four small melons when popped.

**Health scaling:**

- Base curve: `1 + 0.55 × step²`.
- Story nights use the full curve through wave 6. After that the step grows by only 0.375 per wave, so wave 15 is about as tough as the old 10-wave finale.
- The Overflow multiplies health by a further 1.4.
- Endless follows the curve to wave 10, then adds 15% per wave.
- Difficulty multiplies health and speed:

  | Difficulty | Health | Speed |
  |---|---|---|
  | Story | 0.75× | 0.9× |
  | Normal | 1× | 1× |
  | Melongeddon | 1.2× | 1.12× |
  | Overdue | 1.45× | 1.15× |

### 4.2 Towers (18 regular + 6 signature)

There are five build tabs (keys Q, W, E, R, T), and each tab holds up to five towers (keys 1 to 5).

| Tab | Towers (cost) |
|---|---|
| Damage (Q) | Melon cannon 60, Pumpkin mortar 75, Seed Spitter 50, Shelf Ballista 80, Long Reader 95 |
| Control (W) | Still 45, Fire cannon 70, Freeze cannon 65, Shush Bell 70, Fly Hive 65 |
| Support (E) | Reading Lamp 60, Ink Well 55, Peeler 60, Bookworm 75, Compost Heap 70 |
| Keeper (R) | The chosen keeper's signature tower, one at a time (two with a level-10 perk) |
| Trick (T) | Boomerang Bookend 70, Orrery 80, Paper Plane 85 |

**Trick towers** (added in v0.5.0) have curved shot paths:

- **Boomerang Bookend:** flies an elliptical loop out to the lead fruit and back. It hits each fruit once on the way out and once on the way back.
- **Orrery:** three planets orbit the tower all the time and hit whatever they sweep through. The same planet can hit the same fruit at most once every 0.5 s.
- **Paper Plane:** a glider that steers toward the nearest fruit with a limited turn rate, so it swoops in arcs. It lasts 3.5 s and can hit the same fruit at most once every 0.45 s.

Boomerangs and planes are `Flyer` objects moved by `moveFlyer`. The Orrery's planets are computed per tower in `spinOrrery`.

**Tower types** decide which shared upgrades affect a tower:

| Type | Towers |
|---|---|
| Cannon | Melon cannon, Pumpkin mortar, Fire cannon, Freeze cannon, Pumpkin Trebuchet |
| Precision | Seed Spitter, Shelf Ballista, Long Reader, Peeler, the three trick towers, Card Catalogue, Scales of Justice |
| Alchemy | Still, Ink Well, Bubbling Cauldron |
| Creature | Fly Hive, Bookworm, Mimic Chest |
| Utility (no damage) | Shush Bell, Reading Lamp, Compost Heap, History Lectern |

Each tower's stats come from a base cannon and a `PROFILE` row (damage, fire rate and range multipliers), with upgrades, fittings and perks applied by `towerReadout`.

**Selling** refunds 70% of what you paid.

### 4.3 Keepers (heroes)

There are six keepers. Each has a starting kit, a perk and a signature tower that only they can build.

| Keeper | Start | Perk | Signature tower |
|---|---|---|---|
| Mynxi | 12 stacks, 150 seeds | First build costs 40; longer reach | Card Catalogue (90): shots chain into 2 more fruit at 70% |
| Vaelithra | 11 stacks, 120 seeds | Shots slow | Bubbling Cauldron (85): a puddle that slows and deals 18/s for 3 s |
| Sir Michael | 10 stacks, 110 seeds, a free cannon | Shots hit harder | Pumpkin Trebuchet (110): a huge splash that knocks non-boss fruit back 34 px |
| Legal Elf | 12 stacks, 150 seeds | Back room costs 30% less | Scales of Justice (95): damage plus 12% of the target's max health (4% on Karl); kills pay a 5-seed fee |
| Ooze Clues | 13 stacks, 140 seeds | Absorbs the first single-fruit leak each wave | Mimic Chest (100): swallows one nearby fruit whole about every 4 s (Karl only loses a 120 bite) |
| Dr. Samodovol | 12 stacks, 150 seeds | Upgrade picks offer 4 choices instead of 3 | History Lectern (65): no shot; nearby cannons deal +25% damage, rising 5% per wave up to +60% |

**Keeper levels (1–10)** are saved per keeper:

- XP: 10 per wave cleared, plus 50 for a win.
- Difficulty scales XP from ×0.5 (Story) to ×2 (Overdue).
- Level 2 takes 100 XP, and each later level costs 30 more than the one before (1,980 XP in total).
- At levels 2, 4, 6, 8 and 10 the keeper chooses one of two perks. The choice can be swapped before any night.
- Level 10 offers either a second signature tower or a keeper-specific capstone.

### 4.4 Upgrades and fittings

**Upgrade picks** come after waves 1, 2 and 6. The player picks one of three cards (four for Dr. Samodovol), and each card says which tower types it affects. There are 17 upgrades:

- General: Rapid Rind, Reading Lamp, Heavy Caliber, Juicy Explosions, Knight's Splatter, Electrified Melons, Bouncing Melons, three slowing-puddle upgrades, Seed Cache and Overdue Fines.
- Tower-specific: five upgrades, each offered only once that tower is on the board.

**Back room fittings** are bought between waves:

- There are 22 fittings, each for particular towers, such as Longer barrel, Quick wick or Deeper frost.
- Each fitting stays on one tower, and a tower holds two.
- The price starts at 25 seeds and rises 15 with each purchase.
- Signature towers can't be fitted.

### 4.5 Nights and story

- **Midnight (night one, 15 waves).** After wave 4, Sir Michael the Pumpkin Knight comes to the door. The player chooses:
  - **Accept:** he helps for a wave, then betrays you after wave 5, costing stacks.
  - **Betray him:** you get an immediate upgrade instead of the wave-6 pick, and he returns with a grudge.
  - **Send him away:** nothing happens now.

  After wave 14, "The choice comes due", and the finale depends on that choice.
- **The Overflow (night two, 15 waves).** A flooded map with a **returns chute**:
  - From wave 6, some fruit come up the chute and walk the carpet *backwards*.
  - Fire is weaker on the wet floor.
  - The last two waves add a shelled melon up the chute for every 25 Absurdity.
  - Karl comes up the chute on wave 15.
  - The Midnight door choice carries over: household cannons, husked corn already on the carpet, or +45 seeds.
- **Late slips (Overflow only).** The player may take up to three optional handicaps, each adding keeper XP:

  | Slip | Effect | XP |
  |---|---|---|
  | Heavy Returns | The chute opens on wave 3 | +15% |
  | Damp Powder | −20% damage | +25% |
  | No Refunds | Selling pays nothing | +10% |
  | Short Shelf | −4 stacks | +20% |
  | Karl Is Early | An extra Karl on wave 8 | +25% |

- **Endless.** Act one's six waves, then generated waves that cycle four themes and add armoured variants from wave 13. Karl comes every fifth wave, and there is an upgrade pick every fifth wave. The best wave is saved.

### 4.6 Maps (8 boards)

Each board is a list of carpet corners plus fixed spots for ally cannons. A board can set its own grid size; the default is 16 × 10 cells of 48 px.

| Map | Feature | Unlock |
|---|---|---|
| The Stacks | The original carpet | Always open |
| The Annex | The carpet folds back on itself | Always open |
| The Mezzanine | A balcony and a floor with an open middle | Clear wave 5 |
| Rare Books | Spirals to a door in the middle; fruit health ×1.25 | Pop Karl |
| The Archive | Dark: −20% range unless a Reading Lamp reaches the cannon | Win a night |
| The Great Hall | 22 × 14, one long snaking carpet; fruit health ×1.2 | Win two nights |
| The Reading Room | 22 × 14, three lanes; fruit health ×1.4 | Win a night on Melongeddon or harder |
| The Overflow | The night-two board with the chute | Reached through the story |

### 4.7 Meta progression

- **Bookmarks:** five permanent perks, one equipped at a time. They are Seed Fund, Spare Stack, Back-room Key, Bulk Order and Late Fees.
- **Lifetime stats:** wins, hard wins, Karl pops, fittings bought and best waves. These unlock maps and bookmarks.
- **Developer mode:** a Settings switch that reloads the game with everything unlocked, every keeper at level 10, and a "+500 seeds" button. While it is on, nothing is saved, so switching it off restores the real progress.

### 4.8 Presentation and controls

**Rendering:**

- Painted sprites, with code-drawn stand-ins for any art that is missing.
- Shots glow and leave trails.
- Splash areas are drawn as circular gradient rings, and popped fruit leave juice stains.
- Map previews on the setup screen draw the real board, so they always match play.

**Audio:** procedural sound effects plus calm and combat music modes.

**Input:**

- Mouse and touch.
- A full keyboard layout: Q/W/E/R/T and 1–5 to build, Space to start a wave, P to pause, S to sell, B for the back room, +/− for speed and M for sound.
- On phones, the Back gesture steps back one screen.

**Settings:** sound, music, default speed, reduce motion, show tips again and developer mode.

**Onboarding:** tips during the first two waves, a one-time tip for the chute, and a How to play screen.

---

## 5. Balance method

A headless **bot simulator** (`npm run sim`) plays thousands of runs through the real engine:

- It covers keepers × difficulties × strategies × maps × door choices.
- `Math.random` is replaced with a seeded `mulberry32` generator, so runs can be repeated.
- The bot places towers where they cover the most carpet and picks upgrades at random.
- `RunConfig` also accepts keeper levels, a bookmark, late slips and a custom upgrade chooser.

**Targets:**

- A cautious bot (2 towers per wave) should win about 90% on Story, 60–70% on Normal and 35–45% on Melongeddon.
- An aggressive bot should win about 90% on Normal and 50% on Melongeddon.

**Recent results** (Midnight on the Stacks unless noted):

| Scenario | Normal | Melongeddon |
|---|---|---|
| Overall by difficulty | ~77% | ~41–49% (Story ~97%, Overdue ~25%) |
| Overflow at health ×1.0 (before tuning) | 96% | 75% |
| Overflow at health ×1.4 (now) | 72% | 35% |
| Great Hall (health ×1.2) | 69% | 46% |
| Reading Room (health ×1.4) | 82% | 32% |
| Keeper level 1 vs level 10 | 69% → ~80% | 38% → ~50% |

Trick tower check: the bot built melon cannons plus one other kind. Win rates were:

| Second tower | Win rate |
|---|---|
| None (melon cannons only) | 58% |
| Shelf Ballista | 61% |
| Paper Plane | 69% |
| Orrery | 74% |
| Boomerang Bookend | 75% |

**Caveats we know about:**

- The bots are not smart players.
- One seed per setup means about ±7 points of noise.
- The bots rarely use the back room and don't plan lamp placement. They undervalue support tools such as Ink Blot and Interest, which still trail by about 20 points in simulation.

---

## 6. Testing

There are **112 tests**, all passing, in about 8 seconds (`npm test`). They cover:

- engine flow (phases, waves, leaks, victory and defeat);
- keyboard and menu navigation;
- keeper perks and levels;
- the Overflow's chute;
- late slips;
- tower types and upgrade targeting;
- developer mode;
- trick tower behaviour, for example the boomerang hitting a fruit once on the way out and once on the way back.

**Not automated:** visual rendering, audio, touch input and the installed desktop app. Rendering was checked by hand, by drawing the canvas in a page and looking at screenshots. CI smoke-tests the packaged Electron app: it must load the title screen and print `"ok":true`. Nobody has hand-installed the v0.5.0 .exe yet.

---

## 7. Build and release

| Target | How |
|---|---|
| Web (GitHub Pages) | `.github/workflows/pages.yml` tests, builds and deploys on push. **It needs Pages switched on in the repo settings, which hasn't happened yet.** |
| PWA | `manifest.webmanifest` plus a service worker that precaches every built file (`dist/precache.json`); the cache name carries a build id. Registration is skipped inside iframes such as itch.io. |
| Windows | Pushing a `v*` tag makes `.github/workflows/release.yml` run the tests, build the NSIS installer, smoke-test it and publish a GitHub Release. The installer is **not code-signed**, so SmartScreen warns. |
| itch.io | `npm run package` writes `release/melongeddon-web.zip`. Page copy, tags, the cover (630×500) and screenshots are in `docs/itch/`. Not uploaded yet. |
| Netlify | `netlify.toml` is ready, but the site isn't set up. |

**Electron security:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. New windows and navigation away from the app are blocked, and the preload exposes only a Quit function.

**Release history:**

| Version | What it added |
|---|---|
| v0.2.0 | Keeper levels and perks |
| v0.3.0 | Late slips; painted signature towers; map previews drawn from the real boards |
| v0.4.0 | Big maps; tougher Overflow; itch.io kit |
| v0.5.0 | Trick towers; developer mode; clearer shots and splash areas |

---

## 8. How it got here (main milestones)

1. Pulled the Grok app-builder export out into a standalone Vite, React and TypeScript project. Split the code into pure rules, a DOM-free engine and the UI. Added tests and the bot simulator.
2. A balance pass driven by the simulator. The before and after reports are `docs/balance-baseline.md` and `docs/balance-current.md`.
3. Ten new cannons and a tabbed build bar. Three unlockable maps. Story nights went from 10 to 15 waves.
4. Menu rework in four phases: pause menu, saved setup, keyboard everywhere, phone layout and the Back gesture, and one Settings panel. The design is documented in `docs/menu-navigation.md`.
5. Overdue difficulty; three new keepers; a signature tower for every keeper; tower types, so shared upgrades only change the types they name.
6. Windows installer and installable web app.
7. Keeper levels and perks (v0.2.0).
8. Late slips replaced a dull "how did night one end?" question. Map previews were changed to drawings of the real boards (v0.3.0).
9. Big 22×14 maps and Overflow tuning (v0.4.0).
10. Developer mode, clearer effects and trick towers (v0.5.0).

---

## 9. Known weaknesses and technical debt

This is what we already know about.

**Code:**

- **Large files.** `engine.ts` (2,500 lines) and `MelonGame.tsx` (1,850 lines) each do too much. The engine has one closure-based `createWorld` holding every system, and the UI is one component file with every screen in it.
- **Global randomness.** The engine calls `Math.random` directly (17 call sites), and the simulator makes runs repeatable by overwriting the global. An injected random number generator would be cleaner.
- **`stepWorld` reaches into a hidden `step` property** on the world through a type cast rather than a typed API.
- **Saved data.** Saves are several separate `localStorage` keys with hand validation (`validateSetup`, `cleanSlips`). There is no save version number or migration path.

**Game:**

- **Upgrade on-hit effects** (Juicy, Splatter, Electric) only fire from the original four shooting cannons, so rapid-fire towers don't multiply them. That was on purpose, but players may find it surprising.
- **Balance confidence** rests on simple bots, and support towers are probably mis-valued.

**Art and docs:**

- **Missing art.** The three trick towers and their thrown objects are still drawn in code, and the Overflow has no wet-floor tile. Prompts are written in `docs/art/PROMPTS.md`.

**Release:**

- Pages isn't switched on.
- The installer is unsigned.
- There is no macOS or Linux desktop build.
- There are no phone app store builds; the decision so far is itch.io only.

---

## 10. Roadmap ideas under consideration

- **Night Three:** a new story night with a new mechanic. This was the recommended next major goal.
- Painted art for the trick towers and the Overflow floor.
- Publishing on itch.io and switching on GitHub Pages.
- Splitting `engine.ts` into systems (targeting, projectiles, effects, phases, persistence), and `MelonGame.tsx` into one component per screen.
- A smarter simulator bot that plans support towers and fittings.

---

## 11. How to run it

```bash
git clone https://github.com/Jorthalion/melongeddon_v1.git
cd melongeddon_v1
npm install
npm run dev        # http://localhost:5173
npm test           # 112 tests, ~8 s (Node 24)
npm run sim        # balance report -> sim-results/report.md
npm run build      # typecheck + production build
```

---

## 12. What we'd like from the reviewer

Please be specific: name files, functions and numbers where you can.

1. **Game design:**
   - Does the core loop (build, wave, upgrade pick, back room) have enough decisions?
   - Which systems overlap or feel redundant? Possible examples: upgrades vs fittings vs perks vs bookmarks.
2. **Difficulty and pacing:**
   - Are the win-rate targets in section 5 sensible for a casual tower defense?
   - Is 15 waves per night the right length?
3. **Trick towers:** are the boomerang, orrery and plane distinct enough from the existing 15 regular towers? Is there a better fourth idea?
4. **Night Three:** what new mechanic would best follow the knight's betrayal (Midnight) and the backwards chute (the Overflow)?
5. **Architecture:**
   - Given section 9, what refactor would pay off most before adding Night Three?
   - Is the closure-based engine a problem worth fixing?
6. **Onboarding:** with 6 keepers, 24 towers, 17 upgrades, 22 fittings and 8 maps, where will a new player get lost first?
7. **itch.io launch:** what should be in place before the first public upload? For example: a save-version scheme, analytics, a feedback link, or a trailer GIF.
8. **Anything else** that looks risky, unclear or unfinished from this description.
