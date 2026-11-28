# Phone fixes (branch `phone-fixes`)

These are fixes for the 13 issues in `D:\Users\AI melongeddon\phonebot\ISSUES.md`, found by the touch-only phone bot.

**Status:** all 13 are fixed. Nothing is pushed or merged; the branch sits on top of `dev` (047d377).

**Commits:**

| Commit | Issues |
|---|---|
| `298cd3f` | #1: keep a night across a reload, "Resume wave N" |
| `4f29c08` | #2: snap board taps, board zoom |
| `94b574c` | #13: Chaos Librarian |
| `692d417` | #5 and #10, plus the zoom button's final place (#2) |
| `d0164cf` | #3, #4, #6–#9, #11, #12 |

## Desktop doesn't change

Every phone change is behind one of these:
- the new Tailwind variant `touch:` (`@media (pointer: coarse)`, in `src/styles.css`);
- `phoneland:` (touch, landscape, at most 500 px tall);
- `coarsePointer()` (`src/lib/inputMode.ts`);
- `pointerType === "touch"`;
- widths under 400 px.

`phone-check/desktop-same.mjs` checks this. It takes the same mouse steps (title, a night, building a cannon) on the `dev` build (`game/dist` on :4174) and on this build. The screenshots are byte-identical at 1440×900 and 1024×700. At 1920×1080, `dev` differs from itself between runs, so that size can't be compared that way.

Tablets also have a coarse pointer, so they get the touch changes too. The six-profile `e2e/mobile.spec.ts`, which includes the iPad Mini both ways up, passes against this build.

## Checks

- **`npm test`:** 639 of 639 pass. Five new tests in `tests/snap-tap.test.ts` and four in `tests/resume-run.test.ts`. Three source-pinning tests are updated to the new class names: `tests/header-fit.test.ts` and `tests/tips-layout.test.ts`.
- **`npm run typecheck` and `npm run build`:** both pass.
- **`e2e/mobile.spec.ts`** from the test project, run against this build: 18 of 18 pass on 6 profiles. Run it with:
  ```
  npx playwright test -c game-phone-fixes/phone-check/e2e-mobile.config.ts
  ```
- **Phone screenshots:** `phone-check/shots.mjs` drives the six devices in the report with touch only, in Chromium with Playwright's device profiles. Its scenes are real saved nights made by the engine (`phone-check/scenarios.ts`), loaded through the new Resume button. It writes `phone-shots/after/*.png` and `phone-shots/after/report.json`, which holds tile sizes, covered tiles, targets under 44 px, text under 12 px, keyboard hints on screen, frame times and the reload check.
- **Before shots:** `phone-shots/before/` holds copies of the phone bot's shots that ISSUES.md cites. They were taken from the `dev` build before these fixes.
- **Port:** the build was served on **:4177**, not :4175, because :4175 is taken by the fun playtester's `playtest/cycle/dist-next` server. I didn't stop it.

`phone-check/` and `phone-shots/` are not committed: they're check scripts with paths to this PC, and screenshots.

### Final audit

Every scene on every phone is clean: no target under 44 px, no text under 12 px, no keyboard hints, no sideways scroll, no page errors.

| Phone | Tile before | Tile now | Tile zoomed | Board tiles covered | Reload |
|---|---|---|---|---|---|
| Pixel 7 | 25.8 | 25.8 | 46.4 | 0 | resumes |
| Pixel 7 sideways | 22.4 | 22.8 | 41.1 | 0 (was 0) | resumes |
| iPhone 15 | 24.6 | 24.6 | 44.2 | 0 | resumes |
| iPhone SE | 20.0 | 20.0 | 36.0 | 0 | resumes |
| Galaxy S9+ | 20 | 20.0 | 36.0 | 0 | resumes |
| Galaxy S5 sideways | 23.2 | 22.8 | 41.1 | 0 (was 16) | resumes |

---

## Per issue

### 1. Reloading mid-night threw the night away: fixed

**What changed**
- **Engine:** two new calls, `api.saveRun()` and `api.resumeRun(raw)`.
  - `saveRun()` snapshots the whole world plus the engine's per-night counters (queue, spawn clock, tallies, lecture, water and so on). Sets, Maps and Infinity are kept.
  - `resumeRun()` restores it. Progress that is saved as it happens (XP, rooms, fragments, achievements, records) comes from storage, not from the snapshot, so nothing earned since then is rolled back.
  - The night's perks are recomputed from the XP it started with.
  - A save is about 6–13 KB.
- **UI, touch screens only:**
  - The night is saved under `melongeddon-run` at each new wave or card, and on `visibilitychange` (hidden) or `pagehide`.
  - The save is dropped when the night ends, when a new one starts, or on quitting to the Title.
  - The Title then shows **Resume wave N of M**, with "Keeper: seeds, stacks" under it; Continue becomes "Start it fresh".
  - A wave comes back paused.
- **Not saved:** tutorial nights.
- **Desktop:** keeps its leave prompt and doesn't save. Widening this to desktop is a one-line change: drop the `coarsePointer()` checks.

**Files:** `src/game/engine.ts`, `src/components/MelonGame.tsx`, `src/components/TitleScreen.tsx`, `src/lib/saves.ts` (the key is in `PROGRESS_KEYS`, so a reset clears it), `src/lib/storage.ts`, `src/lib/inputMode.ts`.

**How it was checked**
- `tests/resume-run.test.ts` saves a night mid-wave and resumes it in a fresh world. Then it runs both worlds with the same seeded random numbers: they match one second later (every fruit's position and health) and 40 seconds later.
- On all six phones, `shots.mjs` reloads mid-wave, taps Resume, and checks that seeds and stacks match.

**Shots:** before `before/se-23-before-reload.png` → `before/se-24-after-reload.png`; after `after/*-09-after-reload-title.png` and `after/*-10-after-reload-resumed.png`.

### 2. Board tiles 20–26 px on portrait phones: fixed (snapping plus zoom)

**What changed.** The report's option (c), plus fitting the board to its box. All of it applies to touch input only; the mouse and pen are unchanged.
- **Tap on lift, with snapping:** a tap acts when the finger lifts. If it lands on carpet, a shelf or a track, it moves to the nearest tile within 0.6 of a tile that has a tower, a crank or the signpost, or that the picked cannon can go on (`api.snapTap`). The build ghost follows the finger while it's down. With a tower open, taps aren't moved.
- **Pinch and pan:** two fingers pinch the board up to 3×; one finger pans while zoomed. At zoom 1 the board is drawn exactly as before.
- **Zoom button**, at the end of the build bar's tab row (never on the board): it zooms to fill the board's box, or 1.8×, whichever is more. That gives 36–46 px tiles (table above).
- I didn't build the placement loupe (option b): snapping plus zoom was the smaller change.

**Files:** `src/game/engine.ts` (`snapTap`, `SNAP_REACH`), `src/components/MelonGame.tsx` (`boardView`, the touch handlers, the zoom button), `src/components/GameHUD.tsx` (`tools` slot in the tab row).

**How it was checked**
- `tests/snap-tap.test.ts`: floor taps stay put; a carpet tap near floor builds there; a carpet tap next to a tower opens it; taps aren't moved while a tower is open or off the board.
- Shots: `after/*-03-zoomed.png`.

**Shots:** before `before/pixel7-08-built.png`, `before/se-08-built.png` → after `after/pixel7-02-board.png`, `after/pixel7-03-zoomed.png`, `after/se-03-zoomed.png`.

### 3. Seeds and stacks ran together on 320 px phones: fixed

**What changed.** The coin and heart icons stay at every width (3.5 units under 400 px instead of hidden), and there's a gap between the two readouts. "50 12/12" no longer reads as "5012/12".

**File:** `src/components/GameHUD.tsx`.

**How it was checked:** `after/se-02-board.png`, `after/s9plus-07-dig.png`.

### 4. Top-bar buttons 28–32 px, build tabs 28 px: fixed

**What changed (touch screens)**
- **Top bar buttons:** 40 px (36 px under 360 px), with a hit area 4 px bigger on every side (`.touch-hit::after`), so 44–48 px to the finger.
- **Pause and Menu** are further apart.
- **Speed:** −/+ become one speed button that steps 1×, 2×, 3×, then ½×, so speed-up no longer sits next to Pause.
- **Mute** leaves the top bar during a night; it's in Menu → Settings.
- **Build tabs:** 44 px tall.
- **Also 44 px:** the inspector's targeting control, Upgrades, Sell and Close; the Coming-up chips; "Your card"; the Back room chips and Close; the poster's back link.

**Files:** `src/components/GameHUD.tsx`, `src/components/ComingUpBar.tsx`, `src/components/CardPicker.tsx`, `src/components/Shop.tsx`, `src/components/RoomScreen.tsx`, `src/styles.css`.

**How it was checked:** the audit finds no target under 44 px in any scene on any phone.

**Shots:** before `before/iphone15-09-inspector.png` → after `after/iphone15-04-inspector.png`.

### 5. Sideways: board 42% of the width, Back room tab over the door column: fixed

**What changed**
- In the side layout, the Back room button heads the build column next to Start wave, so nothing overlays the board.
- On touch screens the build column is at most 32% of the width (it was 42%).
- The board column has less padding, which gives back some height.
- Start wave stays pinned at the top while the column scrolls.

The board is limited by height sideways, so a narrower column doesn't grow the tiles at zoom 1. It gives the zoom room: 41 px tiles zoomed.

**Files:** `src/lib/layout.ts` (`SIDE_LEFT_SHARE_TOUCH`, a `touch` argument), `src/components/MelonGame.tsx`, `src/components/GameHUD.tsx`.

**How it was checked:** 0 board tiles covered on the Galaxy S5 sideways (it was 16). `tests/tips-layout.test.ts` pins the button's new place.

**Shots:** before `before/s5-land-07-board.png` → after `after/s5-land-02-board.png`, `after/pixel7-land-02-board.png`.

### 6. Back room covered the board, fittings below the fold: fixed

**What changed (touch screens).** The Back room is a full-height sheet:
- every kind in one horizontal strip of 44 px chips at the top;
- the shown kind under it;
- then its fittings, all on the first screen.

The group accordions are hidden on touch screens.

It still covers the board in portrait (all 160 tiles), on purpose. It's a between-waves menu, and the report asked for a full-height sheet. Sideways it's the existing 20 rem side panel, with the same new order.

**File:** `src/components/Shop.tsx`.

**Shots:** before `before/pixel7-11-backroom-open.png` (fittings under the build bar) → after `after/pixel7-05-backroom.png`, `after/s5-land-05-backroom.png`.

### 7. Keyboard hints on touch phones: fixed

**What changed.** On touch screens, every `<kbd>` and every `data-keycap` element is hidden: Space, Q–Y, the 1–5 slot numbers, B, the 1/2/3 card keycaps, Enter.

**Files:** `src/styles.css`, `src/components/GameHUD.tsx`, `src/components/CardPicker.tsx`.

**How it was checked:** the audit finds no keyboard hint on screen on any phone.

**Shots:** before `before/pixel7-land-08-built.png` → after `after/pixel7-land-02-board.png`.

### 8. Heavy tab off the end on 320 px; card labels cut short: fixed

**What changed**
- On touch screens the tab row's right edge fades, and the row has end padding, so a tab past the edge shows that the row scrolls.
- I tried wrapping the tabs into two rows. It cost the iPhone SE board height (tiles fell to 18.6 px), so I used the fade instead.
- Under 360 px the build cards use 12 px labels and tighter gaps, so "Ballista", "Reader" and "34 dmg" show in full.

**File:** `src/components/GameHUD.tsx`.

**Shots:** before `before/se-08-built.png` → after `after/se-02-board.png`, `after/s9plus-07-dig.png`.

### 9. Upgrade cards sideways: third choice half hidden: fixed

**What changed.** On phones held sideways (`phoneland:`), the three choices sit side by side with less padding, and the choice icon is dropped to give the text room.

**File:** `src/components/CardPicker.tsx`.

**Shots:** before `before/n006-s5-land-win-scholar-02-card.png`, `before/pixel7-17-rotated-landscape.png` → after `after/s5-land-06-card.png`, `after/pixel7-land-06-card.png`.

### 10. Slow frames on a mid-range phone: partly fixed

**What changed.** Touch screens draw the board at most 2 backing px per CSS px (`TOUCH_DPR`). Phones report 2.6–4.5.

**Measured** at 3× speed with a 4× slower CPU, in headless Chromium (as in the report):

| Phone | Before | After |
|---|---|---|
| Pixel 7 | 10–11 fps, p95 100–117 ms | 17–18 fps, p95 67 ms |
| iPhone 15 | 9 fps | 19 fps |
| Galaxy S5 sideways | 11 fps | 17 fps |

**Left alone:** caching static layers (floor, shelves) to an offscreen canvas. It's a bigger change to `draw.ts`, and the report says to check a real device before acting. These numbers are still headless Chromium.

**File:** `src/components/MelonGame.tsx`.

### 11. Text under 12 px: fixed

**What changed (touch screens)**
- The 10 px and 11 px sizes (`text-[0.625rem]`, `text-[0.6875rem]`) become 12 px. That covers "Next · wave 1", the setup labels, the card tags and the Catalogue notes.
- The poster's "Back to setup" link gets a 44 px target.
- One 8 px book-spine label in the Grand Catalogue is decoration and is left alone.

**Files:** `src/styles.css`, `src/components/RoomScreen.tsx`.

**How it was checked:** the audit finds no text under 12 px in any scene.

### 12. Dig find easy to miss: fixed

**What changed.** On touch screens, between waves, a waiting Dig find shows in the build bar: "Dig find ready:" with +2 stacks, +40 seeds and Study mark (44 px). It's no longer only inside the Dig's own panel.

**File:** `src/components/GameHUD.tsx`.

**How it was checked:** the chip is visible on all six phones.

**Shots:** before `before/n011-s9plus-win-scholar-04-loop.png` → after `after/*-07-dig.png`.

### 13. "Chaos Librarian" couldn't be earned: fixed

**What changed.** It now asks you to "Win the Overflow with three late slips on (the most the desk will stamp)". `MAX_SLIPS` is 3, and it used to need all five. The id stays `all-slips`. README, `docs/GUIDE.md` and `public/how-to-play.html` say the new goal. `CLAUDE.md` has no owner decision about achievements.

**Files:** `src/game/achievements.ts`, `tests/achievements.test.ts`, README.md, `docs/GUIDE.md`, `public/how-to-play.html`.

### 1b. A Freeze cannon could hold the last fruit frozen forever (soft-lock): fixed

**What changed.** Every Freeze hit topped a running freeze back up to 1.45 s, so a cannon firing faster than that held one fruit for good. New rule `THAW` in `rules.ts`: one unbroken freeze lasts at most `THAW.hold` (3 s), however many hits top it up. Then the fruit can't freeze again until it has walked `THAW.walk` (0.8 s). Hits while it thaws still land and add frost. A single hit still holds its full time (0.6–2.8 s), and "First, not affected" aiming skips a thawing fruit. Stuns, sleep and Basement ice don't count. This is an engine bug, so it applies on every device. **Files:** `src/game/rules.ts`, `src/game/engine.ts`, `tests/freeze-stall.test.ts`. **Checked:** the new test fails before the fix (on the Greenhouse with a hit every 0.2 s, the fruit moved 8 px in 30 s) and passes after. A second test checks that one hit still holds 1.45 s. A human-bot balance run with and without the rule (`--set THAW.hold=999 --set THAW.walk=0`) was still running at commit time.

---

## For the phone bot and other harnesses

- **Speed buttons:** on touch, the top bar no longer has the `Speed up` / `Slow down` buttons. It has one button named `Game speed N×, tap to change`.
  - `phonebot/campaign.mjs` line 295 taps `/^Speed up$/`. On this build it will find nothing and play at 1×.
  - `e2e/helpers.ts` `maxSpeed` is used only by the desktop project, so it's fine.
- **Taps:** board taps on touch act on lift and may snap. `page.tap` and `touchscreen.tap` still work, as before.
- **Side layout:** the Back room button is in the build column now (`data-backroom-button`), not a tab on the board.
- **Mute:** on touch it's under Menu → Settings during a night.
