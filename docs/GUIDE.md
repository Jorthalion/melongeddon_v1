# Melongeddon: Setup and Player Guide

Melongeddon is a single-player tower defense game that runs in the browser. Melons, corn and pumpkins march down the library carpet; you build cannons on the floor beside it and keep them from reaching the far end.

This guide has two parts:

- **[Part 1: Setting it up](#part-1-setting-it-up)**: play it online, run it on your own computer, build it, and publish your own copy.
- **[Part 2: How to play](#part-2-how-to-play)**: the screens, controls, keepers, towers, upgrades, enemies, nights, and strategy.

---

# Part 1: Setting it up

## Option A: Play online (no setup)

If GitHub Pages is switched on for this repo, the game is playable at:

**https://jorthalion.github.io/melongeddon_v1/**

It works in any modern browser on desktop or phone. Your progress (unlocks, best waves, last setup, settings) is saved in that browser.

> Repo owner: Pages has to be switched on once. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**. Then open the **Actions** tab and re-run **Deploy to GitHub Pages** (or push any commit). From then on, every push to `master` rebuilds and republishes the game automatically.

## Option B: Run it on your own computer

### 1. Install the tools

You need two free programs:

| Tool | Version | Get it |
|---|---|---|
| **Node.js** | 24 or newer | [nodejs.org](https://nodejs.org) (choose the LTS download) |
| **Git** | any recent | [git-scm.com](https://git-scm.com/downloads) |

On Windows you can install both from a terminal instead:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

On macOS with Homebrew: `brew install node git`.

Close and reopen your terminal afterwards, then check they work:

```bash
node --version   # should print v24.x or higher
git --version
```

> **Why Node 24?** The game itself only needs a recent Node, but the tests and the balance simulator run TypeScript files directly, which needs Node 23.6 or newer. The GitHub and Netlify builds use Node 24.

### 2. Download the project

```bash
git clone https://github.com/Jorthalion/melongeddon_v1.git
cd melongeddon_v1
```

No Git? On the repo page, click **Code → Download ZIP**, unzip it, and open a terminal in that folder.

### 3. Install the project's packages

```bash
npm install
```

This downloads React, Vite, Tailwind and TypeScript into a `node_modules` folder (about a minute the first time).

### 4. Start the game

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. The page reloads by itself when you change any source file. Press `Ctrl+C` in the terminal to stop it.

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the game locally at http://localhost:5173, with live reload |
| `npm run build` | Type-checks, then builds the finished game into `dist/` |
| `npm run preview` | Serves the `dist/` build locally (http://localhost:4173) to check it before publishing |
| `npm test` | Runs the engine tests (about 10 seconds) |
| `npm run typecheck` | Type-checks without building |
| `npm run sim` | Balance simulator: bots play thousands of runs and write `sim-results/report.md` (several minutes; add `-- --seeds 10` for steadier numbers) |
| `npm run package` | Builds, then zips the game into `release/melongeddon-web.zip` for itch.io |

## Publishing your own copy

The build uses relative paths, so the `dist/` folder runs from any web address or folder.

- **GitHub Pages** (free): fork or push the repo to your own GitHub account, then set **Settings → Pages → Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` tests, builds and deploys on every push to `main` or `master`. Your copy appears at `https://<your-name>.github.io/<repo-name>/`.
- **Netlify** (free): connect the repo at [app.netlify.com](https://app.netlify.com) (the settings come from `netlify.toml`), or run `npm run build` and drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
- **itch.io**: run `npm run package`, create a new itch.io project with **Kind of project: HTML**, upload `release/melongeddon-web.zip`, tick **This file will be played in the browser**, and set the embed size to **1280 × 800** (or "Click to launch in fullscreen" for phones).

Optional: once you know your final address, change `og:image` in `index.html` to an absolute URL so links shared on social media show the poster.

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm` or `node` is "not recognized" | Node isn't installed, or the terminal was open before you installed it. Reopen the terminal. |
| Windows PowerShell says "running scripts is disabled" | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use `npm.cmd run dev` instead of `npm run dev`. |
| `npm test` or `npm run sim` fails with a syntax error about types | Your Node is older than 23.6. Install Node 24. |
| `npm install` warns about `allow-scripts` | Harmless. Newer npm versions ask before running packages' install scripts; the game runs, tests and builds without approving any. |
| Port 5173 is already in use | Vite picks the next free port and prints it (for example 5174). Open that address instead. |
| A blank page after deploying | Make sure you deployed the contents of `dist/` (from `npm run build`), not the project folder. |
| GitHub Pages workflow fails at "deploy" | Pages isn't switched on yet: **Settings → Pages → Source: GitHub Actions**, then re-run the workflow. |
| You want to reset your progress | Clear the site data for the game's address in your browser settings. Unlocks, best waves, saved setup and settings are all stored there. |

---

# Part 2: How to play

## The goal

Fruit walk the **carpet** from the entrance on the left to the door at the far end. Each fruit that gets through costs you a **stack** (Karl, the boss, costs 3). Lose all your stacks and the night is over.

Build cannons on the **floor** beside the carpet (never on it). Every fruit you pop pays **seeds**; spend them on more cannons, fittings and upgrades. Survive all **15 waves** of a night to win.

## Getting started

1. **Title screen.**
   - **Start** (first visit) or **Continue** plays right away with your last setup. The line under it shows what that setup is.
   - **New night** opens Setup, where you pick everything yourself.
   - **How to play** is a quick reference inside the game.
   - **Settings** has sound, music, game speed, reduce motion, and "Show tips again".
2. **Setup (New night).** Choose, top to bottom:
   - **Night**: Midnight (night one), The Overflow (night two) or Endless.
   - **Room**: the map. More unlock as you play. On the Overflow, you instead say how the first night ended.
   - **Keeper**: your hero, each with a perk and a signature tower (see [Keepers](#keepers)).
   - **Difficulty**: Story, Normal, Melongeddon or Overdue.
   - **Bookmark**: one small perk you've earned (see [Bookmarks](#bookmarks)).

   Then press **Begin**.
3. **Intro.** A banner for the room. Press **To the carpet** (or **Cover the chute** on the Overflow).
4. **Between waves.** Build cannons, then press **Start wave**.
5. **During a wave.** Keep building if you can afford it. When the wave is cleared you may get a story card or an upgrade pick, then it's back to building.

The first two waves show short tips. Bring them back any time with **Settings → Show tips again**.

## The screen

- **Header (top):** seeds, stacks, absurdity, game speed (− and +), pause, the menu button (☰), and sound.
- **Board (middle):** the carpet, your cannons and the fruit. Tap the floor to build; tap a cannon to select it.
- **Footer (bottom):**
  - **Start wave** (between waves) or the wave progress bar (during a wave).
  - **Build tabs:** Damage, Control, Support and your Keeper tab.
  - **Build bar:** five cannons with their price. Pick one, then tap the floor.
  - **Inspector** (when a cannon is selected): its type, stats, fittings, **Back room** and **Sell**.
  - **Log line:** what just happened.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Build | Pick a cannon in the build bar, tap the floor | `1`–`5` pick a cannon, then click |
| Switch build tab | Tap the tab | `Q` Damage · `W` Control · `E` Support · `R` Keeper |
| Select a cannon | Tap it (tap again to deselect) | `Esc` deselects |
| Sell | **Sell** in the inspector (refunds 70% of what you spent on it) | `S` |
| Fit a cannon (between waves) | **Back room** in the inspector | `B` |
| Start the next wave | **Start wave** | `Space` |
| Pause | Pause button in the header | `P`, or `Space` during a wave |
| Pause menu | ☰ button | `Esc` (when nothing is selected) |
| Game speed | − / + in the header (0.5×, 1×, 2×, 3×) | `-` / `+` |
| Pick a card choice | Tap it | `1`–`3` (`1`–`4` for Dr. Samodovol's upgrade picks) |
| Press a card's main button | Tap it | `Enter` |
| Sound on/off | Speaker button | `M` |

The **pause menu** has **Resume**, **Settings**, **Restart night** and **Leave to title** (both of the last two ask first). On a phone, the system **Back** gesture steps back one screen instead of leaving the game, and opens the pause menu during a night.

## Keepers

Each keeper changes your start and has one **signature tower** that only they can build. It's on the **Keeper** tab (`R`), and you can have one on the board at a time.

| Keeper | Starts with | Perk | Signature tower |
|---|---|---|---|
| **Mynxi**, Head librarian | 12 stacks, 150 seeds | Her first cannon costs 40; her cannons reach farther | **Card Catalogue** (90): long reach; every shot chains into two more fruit |
| **Vaelithra**, Potions division | 11 stacks, 120 seeds | Her shots slow what they hit | **Bubbling Cauldron** (85): a potion puddle that slows and poisons |
| **Sir Michael**, Pumpkin Knight | 10 stacks, 110 seeds, one cannon already built | His shots hit harder | **Pumpkin Trebuchet** (110): a huge, slow splash that knocks fruit back down the carpet |
| **Legal Elf**, Legal advisor | 12 stacks, 150 seeds | The back room costs 30% less | **Scales of Justice** (95): hits the heaviest fruit in reach for a share of its health; kills pay a fee |
| **Ooze Clues**, Astral adventurer | 13 stacks, 140 seeds | The first fruit that leaks each wave is absorbed | **Mimic Chest (Memec)** (100): swallows a nearby fruit whole every few seconds; Karl only loses a big bite |
| **Dr. Samodovol**, The Scholar | 12 stacks, 150 seeds | Upgrade picks offer four choices instead of three | **History Lectern** (65): no shot; nearby cannons hit harder, and more so every wave it stands |

## Towers

### Build tabs

| Tab | Towers |
|---|---|
| **Damage** (`Q`) | Melon cannon, Pumpkin mortar, Seed Spitter, Shelf Ballista, Long Reader |
| **Control** (`W`) | Still, Fire cannon, Freeze cannon, Shush Bell, Fly Hive |
| **Support** (`E`) | Reading Lamp, Ink Well, Peeler, Bookworm, Compost Heap |
| **Keeper** (`R`) | Your keeper's signature tower |

### What each tower does

| Tower | Cost | Role |
|---|---|---|
| Melon cannon | 60 | Steady shot at whoever is furthest along the carpet |
| Pumpkin mortar | 75 | Slow lob; the splash hits everyone nearby |
| Seed Spitter | 50 | Very fast, tiny seeds, short reach. Great on corn; bounces off shells |
| Shelf Ballista | 80 | A spear that goes through everything in a straight line |
| Long Reader | 95 | Sees the whole board; one huge, slow shot at the toughest fruit |
| Still | 45 | No shot; leaves a slowing puddle on a timer |
| Fire cannon | 70 | Leaves fire on the carpet that burns whoever stands in it |
| Freeze cannon | 65 | Stops fruit cold for a moment |
| Shush Bell | 70 | Every few seconds, stuns everything nearby (husked corn can't hear it) |
| Fly Hive | 65 | Fruit flies that find targets anywhere on the board |
| Reading Lamp | 60 | No shot; cannons next to it reach farther and fire faster |
| Ink Well | 55 | Marks fruit so they take 25% more damage from everything |
| Peeler | 60 | Strips shells, husks and damp so other cannons hit normally |
| Bookworm | 75 | Burrows into pumpkins and Karl for heavy damage over time |
| Compost Heap | 70 | No shot; pays seeds at the end of every wave |

### Tower types

Every tower also has a **type**. The type decides which shared upgrades affect it, and each upgrade card says what it affects. The inspector shows a selected tower's type.

| Type | Towers |
|---|---|
| **Cannon** | Melon cannon, Pumpkin mortar, Fire cannon, Freeze cannon, Pumpkin Trebuchet |
| **Precision** | Seed Spitter, Shelf Ballista, Long Reader, Peeler, Card Catalogue, Scales of Justice |
| **Alchemy** | Still, Ink Well, Bubbling Cauldron |
| **Creature** | Fly Hive, Bookworm, Mimic Chest |
| **Utility** (no damage) | Shush Bell, Reading Lamp, Compost Heap, History Lectern |

### Back room (fittings)

Between waves, select a cannon and press **Back room** (`B`). You're offered up to three **fittings** for that cannon: pick one, or **Not now**. A fitting stays on that one cannon, and a cannon holds two.

The price starts at 25 seeds and rises by 15 with every fitting you buy. Mynxi's first visit costs 15, the Legal Elf pays 30% less, and the Back-room Key bookmark makes the first fitting free. Signature towers can't be fitted.

## Upgrade picks

After waves **1**, **2** and **6**, you choose one upgrade from three (four for Dr. Samodovol). Upgrades last for the whole night, and each choice shapes which ones come next.

| Upgrade | What it does | Affects |
|---|---|---|
| Rapid Rind | Fire 30% faster | Cannon, Precision |
| Reading Lamp | See farther down the carpet | Cannon, Precision |
| Heavy Caliber | Hit harder, reload slower | Cannon |
| Juicy Explosions | Hits burst; the pulp puddle burns | Cannon |
| Knight's Splatter | Each hit chips everyone near the target | Cannon |
| Electrified Melons | Impacts spark into a nearby fruit | Cannon |
| Bouncing Melons | Shots ricochet into a second fruit | Melon cannon |
| Sticky Pulp / Trial Vial / Distilled Batch | Stronger, longer-lasting slowing puddles | Alchemy, and melon-cannon pulp |
| Seed Cache | +55 seeds now | Seeds |
| Overdue Fines | Every kill pays 5 extra seeds | Seeds |
| Barbed Spears, Footnotes, Stinging Flies, Ink Blot, Interest | Each boosts one specific tower (Ballista, Long Reader, Fly Hive, Ink Well, Compost Heap). Offered only once you've built that tower | That tower |

## Enemies

| Fruit | Notes |
|---|---|
| **Melon** | The basic fruit |
| **Corn** | Small and fast; comes in swarms |
| **Pumpkin** | Slow and tough |
| **Karl** | The boss. Leaking him costs 3 stacks; popping him gives back 2 stacks and splashes everything around him |

Some fruit come with a **guard**:

| Guard | Effect | Answer |
|---|---|---|
| **Shell** (shows "crack") | The first hit only cracks it | Hit it twice, or use a Peeler. Seed Spitters bounce off |
| **Husk** | Takes less from direct shots and ignores slows, freezes and bells; takes extra from splash and fire | Mortars, fire, or a Peeler |
| **Damp** | Barely burns | Direct shots, freeze, or a Peeler |
| **Raw** (pumpkin) | The first burn bakes it into slow "bread" instead of hurting it | Burn it once, then shoot it |
| **Split** (pumpkin) | Breaks into four small melons when popped | Splash and fast cannons |

## Nights

### Midnight (night one)

Fifteen waves.
1. **After wave 4**, Sir Michael the Pumpkin Knight comes to the door, and your choice changes the rest of the night:
   - **Accept the alliance:** his cannons help you for a wave, but after wave 5 he turns on you. You lose 2 stacks (3 for Sir Michael himself) and his pumpkins attack.
   - **Betray him now:** you get Bouncing Melons immediately (or seeds if you already have it), skip the wave-6 upgrade pick, and he comes back with a grudge.
   - **Send him away:** no help, no betrayal. You face the produce alone.
2. **After wave 14**, "The choice comes due": the finale wave is the consequence of what you chose at the door.

Winning Midnight offers **Continue to the Overflow** on the victory screen.

### The Overflow (night two)

Fifteen waves on a flooded map with a **returns chute** at the far end of the carpet. How you answered the knight carries over:
- **Let him in:** two household cannons already guard the chute.
- **Shot first:** four husked corn are already on the carpet.
- **Sent him away:** +45 seeds.

**The chute:** from wave 6, some fruit come **up the chute**. They appear past the far end and walk the carpet backwards; one that reaches the entrance costs a stack. A **CHUTE** marker shows that end of the carpet and glows when the current or next wave uses it. The last two waves also send an extra shelled melon up the chute for every 25 **absurdity** you've built (you gain absurdity for every kill), and the final wave sends Karl up the chute.

Fire is weaker on the wet floor. Keep cannons covering **both ends** of the carpet.

### Endless

No knight and no last wave. Waves keep coming and keep getting tougher, Karl arrives every fifth wave, and you get an upgrade pick after waves 1, 2 and 6, then every fifth wave. Your best Endless wave is saved separately.

## Rooms (maps)

| Room | What's different | Unlock |
|---|---|---|
| The Stacks | The original carpet | Always open |
| The Annex | The carpet folds back on itself, so one cannon can cover two stretches | Always open |
| The Mezzanine | A balcony across the top, the floor across the bottom, an open middle | Clear wave 5 |
| Rare Books | A spiral to a door in the middle; fruit have 25% more health | Pop Karl |
| The Archive | Dark: cannons have 20% less reach unless a Reading Lamp reaches them | Win a night |

## Difficulty

| Level | Fruit health | Fruit speed |
|---|---|---|
| Story | 0.75× | 0.9× |
| Normal | 1× | 1× |
| Melongeddon | 1.2× | 1.12× |
| Overdue | 1.45× | 1.15× |

Harder levels change only the fruit; your towers, seeds and upgrades work the same on every level.

## Bookmarks

Bookmarks are permanent unlocks you earn across runs. Equip one at a time on the setup screen.

| Bookmark | Effect | How to unlock |
|---|---|---|
| Seed Fund | +30 starting seeds | Clear wave 3 |
| Spare Stack | +2 stacks | Pop Karl |
| Back-room Key | Your first fitting each night is free | Buy 5 fittings |
| Bulk Order | Every cannon costs 5 less | Win a night |
| Late Fees | +1 seed per kill | Reach wave 15 in Endless |

## Strategy tips

- **Build early.** Spend your starting seeds before wave 1; seeds in your pocket don't pop fruit.
- **Corners are gold.** A cannon on the inside of a bend covers two stretches of carpet.
- **Mix your tabs.** Damage pops fruit, Control slows them so damage has time to work, and Support makes everything else better. A Freeze or Still in front of a Mortar is a classic pair.
- **Read the guards.** Shelled melons laugh at Seed Spitters; husked corn ignores slows; damp pumpkins don't burn. One Peeler fixes all three.
- **Use your keeper's tower.** Place the Mimic Chest right next to the carpet, the History Lectern among your cannons, and the Card Catalogue where its long reach covers the most carpet.
- **Pick upgrades that match your towers.** Check "Affects" on each card: Heavy Caliber does nothing for a board of Fly Hives.
- **Save for Karl.** He has a lot of health and costs 3 stacks if he gets through. A Long Reader or Bookworm helps.
- **On the Overflow, guard both ends.** Put at least one cannon and a Peeler near the chute before wave 6.
- **Speed up quiet waves.** Use `+` for 2× or 3× when a wave is under control, and `P` to pause and think.

Good luck. The produce does not send condolences.
