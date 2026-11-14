# Melongeddon: project overview for review

This document describes the whole project so an outside reviewer can judge the game design, the code and the release setup without opening the repository. The numbers come from the **`dev` branch** after v0.5.0 (14 November 2026). v0.5.0 itself is commit 714814c on `master`; `dev` adds the Heavy tab, more keeper towers, the per-kind back room, damage stats, and removes the knight's door. Section 12 lists the questions we would most like answered.

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

**Tone:** dry and absurd. One keeper is a pumpkin knight, the boss is a melon called Karl, and the "Absurdity" meter fills up as you pop fruit.

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
MelonGame.tsx (game shell + loop) → GameHUD, Shop, CardPicker, SetupScreen, TitleScreen, PauseMenu, …
   └──► draw.ts / drawCannons.ts (canvas)   audio.ts (Web Audio)
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
- running a night: `startWave`, `pickUpgrade`;
- the back room (side tab): `openShop(kind?)`, `shopKind`, `pickMod`, `closeShop`, `shopPriceFor`;
- reading a tower: `statsOf` (live numbers), `tallyOf` (tonight's damage, pops and share);
- setup choices: `chooseHero`, `chooseMap`, `setDifficulty`, `chooseNight`, `toggleSlip`, `setPerk`, `setBookmark`;
- moving between screens: `openSetup`, `beginNight`, `restartNight`, `continueOverflow`, `tryEndless`;
- controls and tools: `setSpeed`, `togglePause`, `devSeeds`.

`world.hud` is the state the React layer reads. The game's phases are a string union:

`select → coldopen → poster → prep ⇄ combat → upgrade | consequence → victory | defeat`

`nextBeat(cleared, night)` in rules.ts decides what comes after each wave. The back room is not a phase: it's a side tab (`hud.workshop`) over the board during prep and combat.

### File map (about 11,900 lines of TypeScript, plus about 3,100 lines of tests)

| File | Lines | Role |
|---|---|---|
| `src/game/engine.ts` | 3,145 | World state, combat, targeting, phases, saving |
| `src/game/rules.ts` | 1,662 | All game data and balance knobs |
| `src/game/draw.ts` | 1,326 | Canvas renderer: board, enemies, shots, effects |
| `src/game/drawCannons.ts` | 1,128 | Code-drawn cannons and the fallbacks for missing art |
| `src/components/GameHUD.tsx` | 470 | Header, build bar, tower inspector |
| `src/components/MelonGame.tsx` | 307 | Game shell: the loop, canvas input, which screen shows |
| `src/components/SetupScreen.tsx`, `TitleScreen.tsx`, `CardPicker.tsx`, `Shop.tsx`, `PauseMenu.tsx`, … | ~1,900 | One component per screen or panel (`Shop.tsx` is the back-room side tab) |
| `src/game/levels.ts` | 348 | Keeper XP curve, perk data, `perkFx` |
| `src/game/audio.ts` | 324 | Synthesized sound effects and music |
| `scripts/sim-core.ts` | 277 | Headless bot player for balance runs |
| `src/game/keys.ts`, `components/hotkeys.ts` | ~250 | Keyboard handling |
| `src/game/meta.ts`, `src/lib/saves.ts` | ~300 | Lifetime stats, bookmarks, unlock goals; save versioning and migrations |
| `tests/*.test.ts` | ~3,100 | 176 tests in 25 files |

Art is 80 painted `.webp` sprites in `public/sprites/`: towers, shots, enemies, portraits, floor tiles and the title screen. A tower with no painted sprite is drawn with canvas paths instead.

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

### 4.2 Towers (23 shared + 11 keeper towers)

There are six build tabs (keys Q, W, E, R, T, Y), and each tab holds up to five towers (keys 1 to 5).

| Tab | Towers (cost) |
|---|---|
| Damage (Q) | Melon cannon 60, Pumpkin mortar 75, Seed Spitter 50, Shelf Ballista 80, Long Reader 95 |
| Control (W) | Still 45, Fire cannon 70, Freeze cannon 65, Shush Bell 70, Fly Hive 65 |
| Support (E) | Reading Lamp 60, Ink Well 55, Peeler 60, Bookworm 75, Compost Heap 70 |
| Keeper (R) | The chosen keeper's own towers, one of each at a time (section 4.3) |
| Trick (T) | Boomerang Bookend 70, Orrery 80, Paper Plane 85, Serpent Quill 75, Rolling Globe 100; each opens at a keeper level |
| Heavy (Y) | Printing Press 200, Pipe Organ 220, Brass Telescope 250; locked until wave 6, or 200 seeds in hand that night |

**Trick towers** have curved shot paths (boomerang loops, orbiting planets, a steering paper plane, a weaving quill, a globe that lands and rolls back up the carpet). They are `Flyer` objects moved by `moveFlyer`; the Orrery's planets are computed per tower in `spinOrrery`.

**Heavy cannons** each do two jobs: the Press slides a sheet down the carpet that hits every fruit once and inks it (+25% damage taken); the Organ hits everything in reach and slows it, and every third chord stops it; the Telescope fires an instant beam that ignores all armour and aims for armoured fruit first.

**Tower types** decide which shared upgrade picks affect a tower: Cannon, Precision, Alchemy, Creature, Utility (no damage). The upgrade card shows this as a plain-words tag ("Cannons", "Puddles", "The ledger").

Each tower's stats come from a base cannon and a `PROFILE` row (damage, fire rate and range multipliers), with upgrade picks, back-room upgrades and perks applied by `towerReadout`. The build cards show each tower's damage before you build it, and the inspector shows what a placed tower has done tonight (`tallyOf`: damage, pops, share of all damage; puddles, fire and worms count for the tower that made them).

**Selling** refunds 70% of the build price (`sellValue`). Two exceptions: the Unstoppered sells for a flat 35 however far it spilled (the Sell button says "Sell 35"), and the Reserve Desk adds its banked seeds.

### 4.3 Keepers (heroes)

There are six keepers. Each has a starting kit, a perk and a signature tower that only they can build. Four have more keeper towers on the same tab (`KEEPER_TOWERS`):

- **Mynxi:** Reserve Desk (30; banks 8 seeds a wave, a passing melon eats the bank; unlocks after a night ending with 200+ seeds).
- **Vaelithra:** Unstoppered (150; a tipped flask that drips slow puddles and may spill onto more floor tiles; unlocks after a win with a Still and a puddle pick).
- **Legal Elf:** Foot of the Law (85; stamps the carpet, pinning everything under it, husks included) and Honeyed Heel (75; sticky footprints: fruit that step in take +25% damage for 4 s; no slow).
- **Ooze Clues:** the Copycat (160; copies the cannon right beside it, one step harder). Not Memec's Mimic Chest.

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

### 4.4 Upgrade picks and the back room

**Upgrade picks** come after waves 1, 2 and 6. The player picks one of three cards (four for Dr. Samodovol). There are 17 upgrades:

- General: Rapid Rind, Reading Lamp, Heavy Caliber, Juicy Explosions, Knight's Splatter, Electrified Melons, Bouncing Melons, three slowing-puddle upgrades, Seed Cache and Overdue Fines.
- Tower-specific: five upgrades, each offered only once that tower is on the board.
- A keeper's own cards (Mynxi: Overdue Fines, Reading Lamp; Sir Michael: Heavy Caliber, Knight's Splatter; Vaelithra: Trial Vial, Distilled Batch) have a gold edge and the keeper's name.

**The back room** is a side tab over the board (a bottom sheet on phones):

- **Upgrades belong to a tower kind.** Buying one gives it to every tower of that kind on the floor and every one built later that night (and to a Copycat copying one). There are 26 back-room upgrades, such as Longer barrel, Quick wick or Deeper frost.
- **Each kind has its own price:** 40 seeds, then 30 more for each upgrade that kind already has. Other kinds' upgrades don't raise it. No cap; each upgrade once.
- **Between waves only.** The tab can be opened and read during a wave.
- Mynxi's first upgrade of the night costs 15, the Legal Elf pays 30% less, and the Back-room Key bookmark makes the first one free. Keeper towers have none, except the Unstoppered, which takes the Still's.
- Upgrades aren't part of a tower's sell price.

### 4.5 Nights and story

- **Midnight (night one, 15 waves).** Two acts: waves 1–6 teach the fruit and their armour; act two (waves 7–15) is thicker and mixes the armour types, ending on "The last wave" card before Karl. There is no mid-night choice any more: the knight's door (accept, betray or send away, with three endings) was removed on `dev`. Sir Michael is now only a keeper you can pick.
- **The Overflow (night two, 15 waves).** A flooded map with a **returns chute**:
  - From wave 6, some fruit come up the chute and walk the carpet *backwards*.
  - Fire is weaker on the wet floor.
  - The last two waves add a shelled melon up the chute for every 25 Absurdity.
  - Karl comes up the chute on wave 15.
  - It starts with 45 extra seeds (the crates by the chute), added after the keeper's opening line.
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
- **Lifetime stats:** wins, hard wins, Karl pops, back-room upgrades bought and best waves. These unlock maps and bookmarks.
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

- It covers keepers × difficulties × strategies × maps.
- `Math.random` is replaced with a seeded `mulberry32` generator, so runs can be repeated.
- The bot places towers where they cover the most carpet and picks upgrades at random. The `mixed+mods` bot also buys back-room upgrades, but only for a kind it has at least two of, and only when the price per tower is under 60% of a new tower. On `dev` (Midnight, three maps, all keepers, 72 runs each) it won 83% on Normal and 57% on Hard, against 86% and 53% for the same bot without upgrades, so the per-kind back room doesn't drain a night.
- `RunConfig` also accepts keeper levels, a bookmark, late slips and a custom upgrade chooser.

**Targets:**

- A cautious bot (2 towers per wave) should win about 90% on Story, 60–70% on Normal and 35–45% on Melongeddon.
- An aggressive bot should win about 90% on Normal and 50% on Melongeddon.

**Recent results** (measured at v0.5.0, before the Heavy tab and the per-kind back room; Midnight on the Stacks unless noted):

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

There are **176 tests**, all passing, in about 11 seconds (`npm test`). They cover:

- engine flow (phases, waves, leaks, victory and defeat);
- keyboard and menu navigation;
- keeper perks and levels;
- the Overflow's chute;
- late slips;
- tower types and upgrade targeting;
- developer mode;
- trick tower behaviour, for example the boomerang hitting a fruit once on the way out and once on the way back;
- Heavy cannons and their wave-6 / 200-seed gate, every keeper tower, the per-kind back room and its prices, damage tallies, the upgrade card's scope tags, and save migrations.

**Not automated:** visual rendering, audio, touch input and the installed desktop app. Rendering was checked by hand, by drawing the canvas in a page and looking at screenshots. CI smoke-tests the packaged Electron app: it must load the title screen and print `"ok":true`. Nobody has hand-installed the v0.5.0 .exe yet, and `dev` has no release build.

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

- **Large engine.** `engine.ts` (3,100 lines) still does too much: one closure-based `createWorld` holds every system. The UI has been split into one component per screen (`MelonGame.tsx` is now a 300-line shell).
- **Global randomness.** The engine calls `Math.random` directly (17 call sites), and the simulator makes runs repeatable by overwriting the global. An injected random number generator would be cleaner.
- **`stepWorld` reaches into a hidden `step` property** on the world through a type cast rather than a typed API.
- **Saved data.** Saves are several separate `localStorage` keys with hand validation (`validateSetup`, `cleanSlips`). They now carry a version number with migrations (`src/lib/saves.ts`; version 2 removed the knight's door).

**Game:**

- **Upgrade on-hit effects** (Juicy, Splatter, Electric) only fire from the original four shooting cannons, so rapid-fire towers don't multiply them. That was on purpose, but players may find it surprising.
- **Balance confidence** rests on simple bots, and support towers are probably mis-valued.

**Art and docs:**

- **Missing art.** The Great Hall and Reading Room still use the plain library floor. Prompts are written in `docs/art/PROMPTS.md`.

**Release:**

- Pages isn't switched on.
- The installer is unsigned.
- There is no macOS or Linux desktop build.
- There are no phone app store builds; the decision so far is itch.io only.

---

## 10. Roadmap ideas under consideration

- **Night Three:** a new story night with a new mechanic. This was the recommended next major goal.
- Painted art for the last code-drawn towers and floor tiles.
- Publishing on itch.io and switching on GitHub Pages.
- Splitting `engine.ts` into systems (targeting, projectiles, effects, phases, persistence).
- A smarter simulator bot that plans support towers.
- Possibly a small mid-night choice to replace the removed knight's door (section 4.5).

---

## 11. How to run it

```bash
git clone https://github.com/Jorthalion/melongeddon_v1.git
cd melongeddon_v1
npm install
npm run dev        # http://localhost:5173
npm test           # 176 tests, ~11 s (Node 24)
npm run sim        # balance report -> sim-results/report.md
npm run build      # typecheck + production build
```

---

## 12. What we'd like from the reviewer

Please be specific: name files, functions and numbers where you can.

1. **Game design:**
   - Does the core loop (build, wave, upgrade pick, back room) have enough decisions?
   - Which systems overlap or feel redundant? Possible examples: upgrade picks vs back-room upgrades vs perks vs bookmarks.
2. **Difficulty and pacing:**
   - Are the win-rate targets in section 5 sensible for a casual tower defense?
   - Is 15 waves per night the right length?
3. **Trick towers:** are the boomerang, orrery and plane distinct enough from the existing 15 regular towers? Is there a better fourth idea?
4. **Night Three:** what new mechanic would best follow the backwards chute (the Overflow)? Midnight no longer has a story choice.
5. **Architecture:**
   - Given section 9, what refactor would pay off most before adding Night Three?
   - Is the closure-based engine a problem worth fixing?
6. **Onboarding:** with 6 keepers, 34 towers, 17 upgrade picks, 26 back-room upgrades and 8 maps, where will a new player get lost first?
7. **itch.io launch:** what should be in place before the first public upload? For example: a save-version scheme, analytics, a feedback link, or a trailer GIF.
8. **Anything else** that looks risky, unclear or unfinished from this description.
