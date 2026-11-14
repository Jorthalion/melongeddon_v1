# Melongeddon: Setup and Player Guide

Melongeddon is a single-player tower defense game that runs in the browser. Melons, corn and pumpkins march down the library carpet; you build cannons on the floor beside it and keep them from reaching the far end.

This guide has two parts:

- **[Part 1: Setting it up](#part-1-setting-it-up)**: play it online, install it (Windows app or browser app), run it on your own computer, build it, and publish your own copy.
- **[Part 2: How to play](#part-2-how-to-play)**: the screens, controls, keepers, towers, upgrades, enemies, nights, and strategy.

---

# Part 1: Setting it up

## Option A: Play online (no setup)

If GitHub Pages is switched on for this repo, the game is playable at:

**https://jorthalion.github.io/melongeddon_v1/**

It works in any modern browser on desktop or phone. Your progress (unlocks, best waves, last setup, settings) is saved in that browser.

> Repo owner: Pages has to be switched on once. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**. Then open the **Actions** tab and re-run **Deploy to GitHub Pages** (or push any commit). From then on, every push to `master` rebuilds and republishes the game automatically.

## Option B: Install it

There are two ways to install Melongeddon so it opens like any other app, in its own window, offline.

### Windows app (installer)

1. Open the repo's **[Releases](https://github.com/Jorthalion/melongeddon_v1/releases)** page and download **`Melongeddon-Setup-<version>.exe`** from the latest release (about 110 MB).
2. Run it. Windows may show **"Windows protected your PC"**, because the installer isn't code-signed (signing costs money). Click **More info → Run anyway**.
3. Choose where to install it, and it adds a Start-menu shortcut and a desktop shortcut.

In the app, **F11** toggles fullscreen and the Title screen has a **Quit** button. Closing the window during a night asks before throwing the run away.

To uninstall: **Settings → Apps → Installed apps → Melongeddon → Uninstall**.

> The desktop app keeps its own saves, separate from any browser. Unlocks earned in the browser don't carry over, and vice versa.

> No release yet? The repo owner makes one by pushing a version tag (see [Making a release](#making-a-release)), or you can [build the installer yourself](#building-the-windows-installer).

### Browser app (any device)

The online version can be installed straight from the browser:

| Device | How |
|---|---|
| **Chrome or Edge** (Windows, macOS, Linux, ChromeOS) | Open the game, then click **Install app** on the Title screen, or the install icon at the right end of the address bar |
| **Android** (Chrome) | Open the game, tap **Install app** on the Title screen, or **⋮ → Add to Home screen** |
| **iPhone / iPad** (Safari) | Open the game, tap **Share → Add to Home Screen** |

After the first visit it works with no internet connection, and it updates itself whenever you're online.

## Option C: Run it on your own computer

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
| `npm run app` | Builds, then opens the game as a desktop app (Electron) |
| `npm run installer` | Builds the Windows installer into `release/installer/` (Windows only) |
| `npm run icons` | Redraws the app icons from the melon shapes (needs Python with Pillow) |

## Building the Windows installer

On Windows, after `npm install`:

```bash
npm run installer
```

This builds the game, packages it with Electron, and writes **`release/installer/Melongeddon-Setup-<version>.exe`**. The first run downloads the Electron runtime and the installer tools, which takes a few minutes; later builds are quicker. The version number comes from `version` in `package.json`.

To check the packaged app starts, without opening a window:

```powershell
$env:MELONGEDDON_SMOKE = "1"; .\release\installer\win-unpacked\Melongeddon.exe
```

It prints one line ending in `"ok":true` when the Title screen loaded.

The app's code is in `electron/` (`main.cjs` opens the window; `preload.cjs` gives the page its Quit button), and the installer settings are under `"build"` in `package.json`. Icons come from `build/icon.ico` and `public/icons/`.

## Making a release

The workflow in `.github/workflows/release.yml` builds the installer on GitHub's Windows machines, smoke-tests it, and publishes it as a GitHub Release:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The tag becomes the installer's version. A few minutes later the release appears on the repo's **Releases** page with `Melongeddon-Setup-0.2.0.exe` attached. To get an installer without publishing a release, open **Actions → Build Windows installer → Run workflow**, and download it from the run's **Artifacts**.

## Publishing your own copy

The build uses relative paths, so the `dist/` folder runs from any web address or folder.

- **GitHub Pages** (free): fork or push the repo to your own GitHub account, then set **Settings → Pages → Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` tests, builds and deploys on every push to `main` or `master`. Your copy appears at `https://<your-name>.github.io/<repo-name>/`.
- **Netlify** (free): connect the repo at [app.netlify.com](https://app.netlify.com) (the settings come from `netlify.toml`), or run `npm run build` and drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
- **itch.io**: run `npm run package` and follow [itch/ITCH.md](itch/ITCH.md), which has the page settings, description, tags, cover and screenshots ready to paste.

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
| `npm run installer` fails with `!include: could not open file` | The project folder's path is too long for the installer tool (Windows' old 260-character limit). Move the project somewhere short, like `C:\melongeddon`, or map a drive letter to it first: `subst M: "C:\long\path\to\melongeddon_v1"`, then `cd M:\` and run the command there (`subst M: /D` removes it). |
| Windows says "Windows protected your PC" when installing | The installer isn't code-signed. Click **More info → Run anyway**. |
| No **Install app** button on the Title screen | Your browser doesn't offer installs (Firefox, Safari on desktop, or an embedded browser), or the game is already installed. On iPhone use **Share → Add to Home Screen**. The button never shows in the desktop app. |
| The installed browser app shows an old version | Open it while online and reload once; the new version is used the next time it starts. |
| You want to reset your progress | Browser: clear the site data for the game's address. Desktop app: delete `%APPDATA%\Melongeddon`. Unlocks, best waves, saved setup and settings are all stored there. |

---

# Part 2: How to play

## The goal

Fruit walk the **carpet** from the entrance on the left to the door at the far end. Each fruit that gets through costs you a **stack** (Karl, the boss, costs 3). Lose all your stacks and the night is over.

Build cannons on the open **floor** beside the carpet: never on the carpet itself, and never on a **bookshelf** (the shelves are part of the room). Every fruit you pop pays **seeds**; spend them on more cannons, fittings and upgrades. Survive all **15 waves** of a night to win.

## Getting started

1. **Title screen.**
   - **Start** (first visit) or **Continue** plays right away with your last setup. The line under it shows what that setup is.
   - **New night** opens Setup, where you pick everything yourself.
   - **How to play** is a quick reference inside the game.
   - **Settings** has sound, music, game speed, reduce motion, "Show tips again" and **Developer mode** (see below).
   - **Install app** appears when your browser can install the game; **Quit** appears in the desktop app.
2. **Setup (New night)** has two pages.
   - **Who holds the stacks?** Six faces (keys `1`–`6`). Tap one to see that keeper's one line (the thing you'll feel on wave one) and every tower only they can build, with its cost (the signature first; locked ones show a padlock and how to unlock them). The **Lv** badge is their level (see [Keepers](#keepers)). Press **Next: the night** (`Enter`).
   - **The night**, with your keeper's face in the corner (tap it, or press `Esc`, to change keeper):
     - **Night**: Midnight (night one), The Overflow (night two) or Endless.
     - **Room**: the map. More unlock as you play. On the Overflow, you choose **late slips** instead (see [Late slips](#late-slips)).
     - **Difficulty**: Story, Normal, Melongeddon or Overdue.
     - **Bookmark**: one small perk you've earned (see [Bookmarks](#bookmarks)).
     - **Perks**: only once the keeper has reached level 2: their perk choices, one per row (see [Keeper levels and perks](#keeper-levels-and-perks)).

   Then press **Begin** (`Enter`).
3. **Intro.** A picture of the room, exactly as you will play it. Press **To the carpet** (or **Cover the chute** on the Overflow).
4. **Between waves.** Build cannons, then press **Start wave**.
5. **During a wave.** Keep building if you can afford it. When the wave is cleared you may get a story card or an upgrade pick, then it's back to building.

**Your first night is Mynxi's tutorial.** The first time you press **Start**, Mynxi (the head librarian) talks you through a night on the Stacks. It's made very easy: the fruit are much softer and slower, and you start with extra seeds and stacks. She covers:

- the carpet, your stacks and your seeds;
- building a Damage cannon, then a Control or Support tower;
- the build tabs, her own Card Catalogue (R) and the trick cannons (T);
- starting the wave, game speed and pausing;
- picking an upgrade card;
- the back room (your first upgrade is free) and selling.

Press **Next** when she's just talking. When she asks you to do something, the wave waits until you've done it. After the lessons, **New night** opens on the title screen, and she stays for the rest of the night to point out leaks, Karl, when you can afford her Card Catalogue, and when your seeds are piling up unspent.

Played before? Press **Skip** on her box, or **Skip the guide** on the title screen. If you already had progress from an older version, the tutorial is skipped for you. Play it again any time with **Tutorial** on the title screen.

After the guide, the next waves show short tips. Bring them back any time with **Settings → Show tips again**.

## The screen

- **Header (top):** seeds, stacks, absurdity, game speed (− and +), pause, the menu button (☰), and sound.
- **Board (middle):** the carpet, your cannons and the fruit. Tap the floor to build; tap a cannon to select it.
- **Footer (bottom):**
  - **Start wave** (between waves) or the wave progress bar (during a wave).
  - **Build tabs:** Damage, Control, Support, your Keeper tab and Trick.
  - **Build bar:** after you build, the same cannon stays picked, so each tap on the floor builds another until you pick something else or run out of seeds; tap a built cannon to open it. Up to five cannons with their damage (and, on wider screens, seconds between shots) and price, so you can compare before you build. Towers that never deal damage say "No damage". Hover a card for its full numbers. On the Keeper tab the box beside the cards shows the picked tower's full numbers too. Pick one, then tap the floor.
  - **Inspector** (when a cannon is selected): its type, stats, its kind's upgrades, **Upgrades** (opens the back room on its kind) and **Sell**. Below the stats, **Tonight** shows what it has done this night: damage dealt, fruit popped, and its share of all your damage. A cannon gets credit for its own puddles, fire patches and burrowing worms too. The count starts again each night.
  - **Log line:** what just happened.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Build | Pick a cannon in the build bar, tap the floor | `1`–`5` pick a cannon, then click |
| Switch build tab | Tap the tab | `Q` Damage · `W` Control · `E` Support · `R` Keeper · `T` Trick |
| Select a cannon | Tap it (tap again to deselect) | `Esc` deselects |
| Sell | **Sell** in the inspector (refunds 70% of what you spent on it) | `S` |
| Upgrade a kind of cannon (between waves) | The **Back room** tab on the right, or **Upgrades** in the inspector | `B`, then `1`–`9` |
| Start the next wave | **Start wave** | `Space` |
| Pause | Pause button in the header | `P`, or `Space` during a wave |
| Pause menu | ☰ button | `Esc` (when nothing is selected) |
| Game speed | − / + in the header (0.5×, 1×, 2×, 3×) | `-` / `+` |
| Pick a card choice | Tap it | `1`–`3` (`1`–`4` for Dr. Samodovol's upgrade picks) |
| Press a card's main button | Tap it | `Enter` |
| Sound on/off | Speaker button | `M` |

The **pause menu** has **Resume**, **Settings**, **Restart night** and **Leave to title** (both of the last two ask first). On a phone, the system **Back** gesture steps back one screen instead of leaving the game, and opens the pause menu during a night.

## Keepers

Each keeper changes your start and has a **signature tower** that only they can build. It's on the **Keeper** tab (`R`), and you can have one on the board at a time. Four keepers have more keeper towers on the same tab (the Legal Elf has three), and you can have one of each:

- **Mynxi's Reserve Desk** (30 seeds). Locked at first: **finish a night with at least 200 seeds still in hand** to open it. It has no shot, and it must be built right beside the carpet. After every wave you survive it banks 8 seeds (the gold tag above it shows how much). Sell it to collect the bank plus the usual refund, or win the night and it pays out on its own. But if a **melon walks past the desk** (comes within about a tile of it), the melon eats the whole bank. Corn and pumpkins leave it alone. Put it beside the last stretch of carpet, behind your cannons, where few melons ever get to. On the Overflow, remember that fruit come up the chute at the door end, so that stretch isn't safe there.
- **Vaelithra's Unstoppered** (150 seeds). Locked at first: **win a night as Vaelithra after building a Still and taking Trial Vial or Distilled Batch**. It's a tipped flask that never shoots. It drips a slow puddle from the tile it stands on. After each wave there's a 1 in 3 chance it spills onto a neighbouring floor tile, up to four tiles. It only spills where the new tile can reach the carpet, never onto the carpet, a bookshelf or a tile with a cannon, and it heads for carpet it hasn't soaked yet. Spill tiles don't drip and can't be built on. Instead, **every stretch of carpet a spill tile can reach is wet for the rest of the night** (a cool sheen with ripples), and the log says "That was not in the notes." On wet carpet, **fire burns 40% weaker and goes out 40% sooner**, and **every other puddle (Still, Cauldron, the flask's own drip) lasts half again as long**. Selling the flask doesn't dry the carpet. The Still's back-room upgrades work on its drip. Selling it pays a flat 35, however far it spilled.
- **The Legal Elf's Foot of the Law** (85 seeds): see the table above.
- **The Legal Elf's Honeyed Heel** (75 seeds). A big bare foot dipped in honey. Every few seconds it steps onto the carpet just ahead of the fruit and leaves a **sticky footprint** that lasts 7 seconds (up to three at once). It doesn't slow anything. Anything walking through gets honey on it (a little amber drip on top) and **takes 25% more damage from everything for 4 seconds**, husks included. It does no damage of its own, so put it where your hardest hitters are aiming.
- **Ooze Clues' Copycat** (160 seeds). On its own it does nothing. Put it on the floor **right beside** (not on a corner of) a Melon, Mortar, Still, Fire or Freeze cannon and it becomes a copy of that cannon, back-room upgrades and all, **one step harder**: a Melon copy reaches farther, a Mortar copy splashes wider, a Still copy drips a broader puddle sooner, a Fire copy's patch burns longer, a Freeze copy holds longer. It never hits harder than the original. If two cannons touch it, it copies the newer one, and a thin gold line shows which. Sell that one and it switches to the other, or goes blank. An upgrade you buy later for that kind shows up on the copy straight away. It won't copy anything else (Ballistas, trick cannons, keeper towers).

Perks that name a keeper's signature tower ("The Scales fire 25% faster") don't affect the Foot.

| Keeper | Starts with | Perk | Signature tower |
|---|---|---|---|
| **Mynxi**, Head librarian | 12 stacks, 150 seeds | Her first cannon costs 40; her cannons reach farther | **Card Catalogue** (90): long reach; every shot chains into two more fruit. Also **Reserve Desk** (30): see below |
| **Vaelithra**, Potions division | 11 stacks, 120 seeds | Her shots slow what they hit. **The glass costs more, the formula costs less:** the first tower of each kind she places in a night costs 20 seeds more (the second is the normal price, and selling the first doesn't bring the extra back), and her back-room upgrades cost 25, then 15 more per upgrade that kind has | **Bubbling Cauldron** (85, so 105 the first time): a potion puddle that slows and poisons. Also **Unstoppered** (150): see below |
| **Sir Michael**, Pumpkin Knight | 10 stacks, 110 seeds, one cannon already built | His shots hit harder | **Pumpkin Trebuchet** (110): a huge, slow splash that knocks fruit back down the carpet |
| **Legal Elf**, Legal advisor | 12 stacks, 150 seeds | The back room costs 30% less | **Scales of Justice** (95): hits the heaviest fruit in reach for a share of its health; kills pay a fee. Also **Foot of the Law** (85): a giant foot stamps the busiest stretch of carpet in reach every few seconds, for a little damage and a short stop on everything under it, husks included. And **Honeyed Heel** (75): sticky footprints that slow everything, husks included |
| **Ooze Clues**, Astral adventurer | 13 stacks, 140 seeds | The first fruit that leaks each wave is absorbed | **Mimic Chest (Memec)** (100): swallows a nearby fruit whole every few seconds; Karl only loses a big bite. Also **The Copycat** (160): see below |
| **Dr. Samodovol**, The Scholar | 12 stacks, 150 seeds | Upgrade picks offer four choices instead of three | **History Lectern** (65): no shot; nearby cannons hit harder, and more so every wave it stands |

## Developer mode

For trying everything without earning it first. Open **Settings** (on the title screen or in the pause menu) and press **Developer mode**. The game reloads with:

- every map, bookmark and keeper perk unlocked, and every keeper at level 10 (so every trick cannon is open);
- a blue **DEV** badge next to the game's name;
- a **Dev: +500 seeds** button in the pause menu during a night.

Nothing you do in developer mode counts: wins, best waves, lifetime stats and keeper XP are not saved. Press **Developer mode** again to switch it off; the game reloads with your real progress exactly as it was. Your last setup is kept, so if it uses a map you haven't unlocked yet, the game falls back to the Stacks and says so.

## Keeper levels and perks

Every keeper has their own level, from 1 to 10, saved between runs. A keeper earns XP only when you play them:

- **10 XP for every wave cleared**, in any night, including Endless.
- **+50 XP for winning** Midnight or the Overflow.
- Difficulty scales both: Story ×0.5, Normal ×1, Melongeddon ×1.5, Overdue ×2.
- On the Overflow, [late slips](#late-slips) add more on top.

A Normal win is worth 200 XP. Level 2 takes 100 XP, and each level after costs 30 more than the last, so level 10 (1,980 XP in total) takes roughly 10–20 nights. The end-of-night card shows the XP you earned and your progress.

At levels **2, 4, 6, 8 and 10** a new row of two perks opens on the setup screen. One perk per row is active (the first is picked for you when the row opens). You can swap any open row before any night; perks can't be changed mid-run, and a level reached during a night applies from the next one.

**Mynxi**

| Level | Option A | Option B |
|---|---|---|
| 2 | **Petty Cash**: Start with 30 more seeds. | **Late Returns**: Every kill pays 1 more seed. |
| 4 | **Cross-Reference**: The Card Catalogue chains to one more fruit. | **Long Desk**: The Card Catalogue reaches 20% farther. |
| 6 | **Quiet, Please**: All your cannons hit 8% harder. | **Overdue Notices**: +10 seeds after every wave. |
| 8 | **Card Index**: The Card Catalogue hits 30% harder. | **Reserved Shelf**: The Card Catalogue costs 30 seeds less. |
| 10 | **Second Catalogue**: You can build two Card Catalogues. | **Dewey's Decree**: Catalogue chains lose no damage. |

**Vaelithra**

| Level | Option A | Option B |
|---|---|---|
| 2 | **Pocket Money**: Start with 30 more seeds. | **Spare Flask**: Start with two more stacks. |
| 4 | **Slow Simmer**: Cauldron puddles last 50% longer. | **Wide Pot**: Cauldron puddles are 30% wider. |
| 6 | **Cold Hands**: Her slow lasts 60% longer. | **Potent**: All your cannons hit 8% harder. |
| 8 | **Reduction**: The Cauldron hits 40% harder, puddles too. | **Quick Stir**: The Cauldron fires 25% faster. |
| 10 | **Second Cauldron**: You can build two Bubbling Cauldrons. | **Philosopher's Tip**: +15 seeds after every wave. |

**Sir Michael**

| Level | Option A | Option B |
|---|---|---|
| 2 | **War Chest**: Start with 20 more seeds. | **Squire**: Start with one more stack. |
| 4 | **Heavier Pumpkins**: Trebuchet knockback is 50% stronger. | **Wide Splat**: Trebuchet splash is 25% wider. |
| 6 | **Patrol Pay**: +6 seeds after every wave. | **Steady Arm**: All your cannons hit 5% harder. |
| 8 | **Siege Crew**: The Trebuchet fires 20% faster. | **Requisition**: The Trebuchet costs 30 seeds less. |
| 10 | **Second Trebuchet**: You can build two Pumpkin Trebuchets. | **Harvest Oath**: Every kill pays 1 more seed. |

**Legal Elf**

| Level | Option A | Option B |
|---|---|---|
| 2 | **Signing Bonus**: Start with 30 more seeds. | **Indemnity**: Start with two more stacks. |
| 4 | **Hard Bargain**: The back room costs 40% less instead of 30%. | **Billable Hours**: Scales fees pay 5 more seeds. |
| 6 | **Fine Print**: Every kill pays 1 more seed. | **Retainer**: +10 seeds after every wave. |
| 8 | **Precedent**: The Scales take 18% of health instead of 12%. | **Swift Ruling**: The Scales fire 25% faster. |
| 10 | **Second Scales**: You can build two Scales of Justice. | **Class Action**: All your cannons hit 12% harder. |

**Ooze Clues**

| Level | Option A | Option B |
|---|---|---|
| 2 | **Shiny Finds**: Start with 30 more seeds. | **Thick Skin**: Start with two more stacks. |
| 4 | **Gelatinous**: Absorbs two leaks each wave instead of one. | **Astral Sight**: All your cannons reach 10% farther. |
| 6 | **Snack Budget**: Memec finds 4 more seeds in every meal. | **Treasure Sense**: Every kill pays 1 more seed. |
| 8 | **Big Appetite**: Memec eats 25% faster. | **Long Tongue**: Memec reaches 35% farther. |
| 10 | **Second Mimic**: You can build two Mimic Chests. | **Bottomless**: Absorbs one more leak each wave. |

**Dr. Samodovol**

| Level | Option A | Option B |
|---|---|---|
| 2 | **Research Grant**: Start with 50 more seeds. | **Sabbatical**: Start with three more stacks. |
| 4 | **Annotated**: The Lectern's bonus starts at 35% instead of 25%. | **Wide Reading**: The Lectern reaches 30% farther. |
| 6 | **Tenure**: +15 seeds after every wave. | **Peer Review**: All your cannons hit 12% harder. |
| 8 | **Thesis**: The Lectern grows faster and caps at 85% instead of 60%. | **Lecture Notes**: The Lectern costs 25 seeds less. |
| 10 | **Second Lectern**: You can build two History Lecterns. | **Fifth Book**: Every shelf offers one more upgrade. |

## Towers

### Build tabs

| Tab | Towers |
|---|---|
| **Damage** (`Q`) | Melon cannon, Pumpkin mortar, Seed Spitter, Shelf Ballista, Long Reader |
| **Control** (`W`) | Still, Fire cannon, Freeze cannon, Shush Bell, Fly Hive |
| **Support** (`E`) | Reading Lamp, Ink Well, Peeler, Bookworm, Compost Heap |
| **Keeper** (`R`) | Your keeper's own towers (the Legal Elf has two) |
| **Trick** (`T`) | Boomerang Bookend, Orrery, Paper Plane, Serpent Quill, Rolling Globe: curved shots that pass through fruit. Each opens at a keeper level (below) |
| **Heavy** (`Y`) | Printing Press, Pipe Organ, Brass Telescope: expensive cannons that each do two jobs |

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
| Boomerang Bookend | 70 | Throws a bookend in a wide loop out to the lead fruit and back; hits everything it passes, once each way |
| Orrery | 80 | Three brass planets circle it nonstop and hit any fruit they sweep through. Put it on a corner so the carpet crosses the orbit twice |
| Paper Plane | 85 | Launches a paper plane that glides for a few seconds in wide, swooping arcs, cutting through fruit each time it passes |
| Serpent Quill | 75 | Flicks a quill that snakes out in a wavy line, well past its target, hitting every fruit it crosses |
| Rolling Globe | 100 | Lobs a globe onto the carpet just ahead of the lead fruit. It lands with a thud and rolls back toward the entrance, hitting everything in its way |

### Heavy cannons

The **Heavy** tab (`Y`) holds three expensive cannons, open to every keeper. They're locked at the start of a night: they open at **wave 6**, or as soon as you have **200 seeds in hand**, whichever comes first, and stay open for the rest of the night. Each one does two jobs at once:

| Tower | Cost | What it does |
|---|---|---|
| **Printing Press** | 200 | Every few seconds a pressed sheet lands on the lead fruit and slides back up the carpet, hitting every fruit along a long stretch once. Everything it touches is **inked**: all your cannons hit it 25% harder for a few seconds. |
| **Pipe Organ** | 220 | Plays a chord that hits **every fruit** in a wide circle and slows them. **Every third chord is a crescendo** that also stops them for a moment (Karl only briefly). Husks take the damage but ignore the slow and the stop. |
| **Brass Telescope** | 250 | Very long reach and a fast, instant shot that **ignores armour**: shells, husks and damp count for nothing. It aims for Karl first, then armoured fruit, then the toughest. |

Their back-room upgrades: **Broadsheet** (the sheet slides half again as far) and **Wet ink** (ink lasts twice as long) for the Press; **Bigger pipes** (wider circle) and **Crescendo stop** (every second chord is a crescendo) for the Organ; **Longer barrel** and **Quick wick** for the Telescope. Shared upgrade picks follow their type: the Press is a Cannon, the Telescope is Precision, the Organ is Utility (no picks).

### Trick cannons open with keeper levels

The Trick tab starts locked. Each trick cannon opens when the keeper you're playing reaches its level:

| Level | Opens |
|---|---|
| 2 | Boomerang Bookend |
| 3 | Orrery |
| 5 | Paper Plane |
| 7 | Serpent Quill |
| 9 | Rolling Globe |

Every keeper levels on their own, so switching keepers means opening them again. A level reached during a night opens its cannon from the next night. Locked cannons show a lock and the level they need.

### Tower types

Every tower also has a **type**. The type decides which shared upgrades affect it, and each upgrade card says what it affects. The inspector shows a selected tower's type.

| Type | Towers |
|---|---|
| **Cannon** | Melon cannon, Pumpkin mortar, Fire cannon, Freeze cannon, Pumpkin Trebuchet, Printing Press |
| **Precision** | Seed Spitter, Shelf Ballista, Long Reader, Peeler, Boomerang Bookend, Orrery, Paper Plane, Serpent Quill, Rolling Globe, Brass Telescope, Card Catalogue, Scales of Justice |
| **Alchemy** | Still, Ink Well, Bubbling Cauldron, Unstoppered |
| **Creature** | Fly Hive, Bookworm, Mimic Chest, Copycat |
| **Utility** (no upgrade picks apply) | Shush Bell, Reading Lamp, Compost Heap, History Lectern, Foot of the Law, Honeyed Heel, Reserve Desk, Pipe Organ |

### Back room (upgrades for a whole kind)

The **Back room** is a tab on the right edge of the board (on a phone it opens as a sheet from the bottom, so the carpet above stays in view). Open it with the tab, with `B`, or with **Upgrades** in a cannon's inspector (that opens it on the cannon's kind). At the top are the same groups as the build bar (Damage, Control, Support, Trick, Heavy, and Keeper when a keeper tower takes upgrades). Tap one to fold it open and pick a tower kind; a small ×2 under a kind means two are on the floor, and a gold number shows how many upgrades it has. Below are **all** of that kind's upgrades, each with its price.

- **An upgrade belongs to the kind, not to one tower.** Buy Longer barrel for the Melon cannon and every Melon cannon on the floor reaches farther, and so does every one you build later tonight. A Mimic copying a Melon cannon gets it too.
- **Each kind has its own price.** A kind's first upgrade costs 40 seeds, then 30 more for each upgrade it already has (40, 70, 100…). Upgrading Melon cannons never makes Mortar upgrades dearer.
- **No cap.** Buy every upgrade a kind has, if you can pay for it. Each one can be bought once.
- **Between waves only.** You can open the tab and look during a wave; buying waits until it's over.
- **They last the night.** Upgrades aren't part of a tower's price, so selling a tower refunds 70% of what you paid to build it, and its kind keeps the upgrades.

Mynxi's first upgrade of the night costs 15, the Legal Elf pays 30% less, and the Back-room Key bookmark makes the first upgrade free. While the tab is open, `1`–`9` buy that kind's upgrades and `B` or `Esc` close it. Keeper towers have no upgrades.

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

### Armour and guards

Some fruit wear armour. Each kind only shows up on one kind of fruit, and each has its own look on the carpet:

| Armour | Worn by | How to spot it |
|---|---|---|
| **Shell** | Melons | A pale ring around the melon |
| **Husk** | Corn | A gold ring around the corn |
| **Damp** | Pumpkins | A blue-grey film over the pumpkin |
| **Raw** | Pumpkins | A dashed orange ring |
| **Split** | Pumpkins | A pale X on the pumpkin |
| **Tough** | Pumpkins (late waves) | Nothing: it just has 20–35% more health |

#### Damage kinds

Every hit belongs to one of five kinds, and armour treats each kind differently:

| Kind | Comes from |
|---|---|
| **Direct hit** | Melon, Seed Spitter, Ballista, Long Reader, Fly Hive, Ink Well, Peeler, the Printing Press's sheet, every trick cannon, the keepers' own towers, the hit itself from Mortars, Fire and Freeze cannons, and Electrified Melons' zap |
| **Splash** | The blast around a Mortar or Pumpkin Trebuchet hit, the Foot of the Law's stomp, the Pipe Organ's chord, Juicy Explosions, Knight's Splatter, and the burst when Karl pops |
| **Fire** | The flames a Fire cannon leaves on the carpet |
| **Puddle** | Puddles that hurt: pulp with Juicy or Distilled, and the Cauldron's poison |
| **Bookworm** | The Bookworm burrowing into pumpkins and Karl |

#### What each armour blocks

100% means normal damage. "Blocked" means the hit does nothing.

| Armour | Direct hit | Splash | Fire | Puddle | Bookworm | Slows, freezes, stuns |
|---|---|---|---|---|---|---|
| **Shell** (until cracked) | First hit blocked, cracks it ("crack") | First hit blocked, cracks it | 40% | 40% | 100% | Work normally |
| **Husk** | 75% | 140% | 140% | 100% | 100% | **Immune to all of them**, except the Legal Elf's Foot of the Law |
| **Damp** | 115% | 100% | 15% | 100% | 100% | Freezes last 40% longer |
| **Raw** | 100% | 100% | First burn bakes it into "bread" instead of hurting it | 100% | 100% | Work normally |

- **Shell:** whatever lands first is wasted, however big it is, but the hit after that does full damage. Seed Spitter seeds **bounce off** ("ping") without cracking it, so a spitter on its own never gets through. One Mortar blast cracks every shell it touches at once.
- **Husk:** "all of them" means the Still's puddles, Freeze, the Shush Bell, Barbed Spears, Vaelithra's slowing shots, the Cold rind upgrade and the Cauldron's slow. Three things still work: the Legal Elf's **Foot of the Law** pins husks like anything else, knockback from the Trebuchet still pushes them, and the Ink Well's mark still sticks.
- **Raw:** once baked, the pumpkin crawls at 55% speed for the rest of its walk, but fire can't hurt it any more. Finish it with anything else.
- **Split:** not armour. When popped, it breaks into four small melons with about half a melon's health, which have no armour.

#### Ways around armour

- **The Brass Telescope** (Heavy, 250 seeds) ignores all armour on whatever it shoots: no crack, no reduction, and the shell stays on for everyone else.
- **The Peeler** (Support, 60 seeds) strips shell, husk and damp off whatever it hits, and aims for armoured fruit first. Raw and Split aren't armour, so it leaves those alone.
- **Ink** makes everything hit the marked fruit harder, armour or not.
- **On the Overflow,** all fire does 55% damage on top of these numbers, since the room is flooded.
- **Damp Powder** (a late slip) cuts every kind of damage by 20%, on top of these numbers too.

#### Quick answers

| You see | Bring | Avoid relying on |
|---|---|---|
| Shelled melons | Mortar (cracks many at once), Peeler, any fast cannon | Seed Spitter, fire alone |
| Husked corn | Mortar, Trebuchet, fire, Peeler, the Foot of the Law | Still, Freeze, Shush Bell, Vaelithra's slow |
| Damp pumpkins | Melon, Ballista, Long Reader, Freeze | Fire |
| Raw pumpkins | One touch of fire, then direct hits | Fire alone |
| Split pumpkins | Splash and fast cannons for the four melons | One slow, big hitter |

## Nights

### Midnight (night one)

Fifteen waves. You get an upgrade pick after waves 1, 2 and 6. After wave 14, a card warns you the finale is next: Unchaperoned, the busiest wave of the night.

Winning Midnight offers **Continue to the Overflow** on the victory screen. It opens the setup screen with the Overflow chosen and your keeper kept, so you can take late slips first.

### The Overflow (night two)

Fifteen waves on a flooded map with a **returns chute** at the far end of the carpet. It's night two, so every fruit has **40% more health** than on Midnight, and you start with 45 extra seeds.

**The chute:** from wave 6, some fruit come **up the chute**. They appear past the far end and walk the carpet backwards; one that reaches the entrance costs a stack. A **CHUTE** marker shows that end of the carpet and glows when the current or next wave uses it. The last two waves also send an extra shelled melon up the chute for every 25 **absurdity** you've built (you gain absurdity for every kill), and the final wave sends Karl up the chute.

Fire is weaker on the wet floor. Keep cannons covering **both ends** of the carpet.

#### Late slips

Before the Overflow you can take up to **three late slips** on the setup screen. Each one makes the night harder and raises the keeper XP it pays (bonuses add, so three slips can mean up to +75%). They are optional, and your picks are remembered for next time.

| Slip | What gets harder | XP |
|---|---|---|
| **Heavy Returns** | The chute opens on wave 3, not 6: waves 3–5 each send 5 shelled melons up it. | +15% |
| **Damp Powder** | All your towers deal 20% less damage. | +25% |
| **No Refunds** | Selling a tower gives no seeds back. | +10% |
| **Short Shelf** | Start with 4 fewer stacks. | +20% |
| **Karl Is Early** | An extra Karl joins wave 8. | +25% |

The end-of-night card shows the bonus with your XP.

### Endless

No last wave. Waves keep coming and keep getting tougher, Karl arrives every fifth wave, and you get an upgrade pick after waves 1, 2 and 6, then every fifth wave. Your best Endless wave is saved separately.

## Rooms (maps)

| Room | What's different | Unlock |
|---|---|---|
| The Stacks | The original carpet | Always open |
| The Annex | The carpet folds back on itself, so one cannon can cover two stretches | Always open |
| The Mezzanine | A balcony across the top, the floor across the bottom, an open middle | Clear wave 5 |
| Rare Books | A spiral to a door in the middle; fruit have 25% more health | Pop Karl |
| The Archive | Dark: cannons have 20% less reach unless a Reading Lamp reaches them | Win a night |
| The Great Hall | **Big map** (22 × 14). One very long carpet snaking up and down the hall; fruit have 20% more health | Win two nights |
| The Reading Room | **Big map** (22 × 14). Three long lanes between the tables, so a cannon between two lanes covers both; fruit have 40% more health | Win a night on Melongeddon or Overdue |

On the big maps the whole room still fits on screen, so towers and fruit are drawn about a third smaller.

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
| Back-room Key | Your first back-room upgrade each night is free | Buy 5 back-room upgrades |
| Bulk Order | Every cannon costs 5 less | Win a night |
| Late Fees | +1 seed per kill | Reach wave 15 in Endless |

## Strategy tips

- **Build early.** Spend your starting seeds before wave 1; seeds in your pocket don't pop fruit.
- **Corners are gold.** A cannon on the inside of a bend covers two stretches of carpet.
- **Mix your tabs.** Damage pops fruit, Control slows them so damage has time to work, and Support makes everything else better. A Freeze or Still in front of a Mortar is a classic pair.
- **Read the guards.** Shelled melons laugh at Seed Spitters; husked corn ignores slows; damp pumpkins don't burn. One Peeler fixes all three.
- **Use your keeper's tower.** Place Memec's Mimic Chest right next to the carpet, the History Lectern among your cannons, and the Card Catalogue where its long reach covers the most carpet.
- **Pick upgrades that match your towers.** The small tag beside each card's name says what it reaches ("Cannons", "Puddles", "The ledger"): Heavy Caliber does nothing for a board of Fly Hives.
- **Save for Karl.** He has a lot of health and costs 3 stacks if he gets through. A Long Reader or Bookworm helps.
- **On the Overflow, guard both ends.** Put at least one cannon and a Peeler near the chute before wave 6.
- **Speed up quiet waves.** Use `+` for 2× or 3× when a wave is under control, and `P` to pause and think.

Good luck. The produce does not send condolences.
