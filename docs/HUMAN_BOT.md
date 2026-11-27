# The human bot: a guide for running balance tests

This guide is for a Claude (or a person) who has just cloned the repo and wants to test balance with the simulator's **human bot**. It covers setup, running, asking a question with a scenario, reading the answer, and changing the bot. The README's "Tuning" section has the full reference; read `CLAUDE.md` first for the project's rules.

## 1. What it is

- **The simulator** (`npm run sim`) plays whole nights of Melongeddon with no screen, as fast as the computer allows. It drives the real game engine (`src/game/engine.ts`), so a rule change shows up in the sim exactly as in the game.
- **The human bot** (`--strategies human`, `scripts/sim-human.ts`) is the reference player for balance. It plays like a decent regular player:
  - it reads this wave and the next, and builds answers first (a Peeler for shells, a Still before Box Cats, a Mortar for a crowd);
  - it keeps one shopping list and saves up for the next thing on it;
  - it places towers where they really cover the carpet, and uses lamps, Ink Wells, fittings, shelf picks and each keeper's own towers.
- **Its strength is set on purpose:** about 100% on Normal, about 65% on Melongeddon (Hard) and about 33% on Overdue as tuned. Current numbers are in the README. **Don't weaken its `SKILL` settings**; the owner decided this.
- **The other bots** (`melon`, `mixed`, `mixed+mods`, `lean`, `abuse`) still exist. Judge balance with `human`. Use `abuse` to look for exploits.

## 2. Setup

You need Node 24 (it runs the TypeScript files directly) and git.

```bash
git clone https://github.com/Jorthalion/melongeddon_v1.git melongeddon
cd melongeddon
git checkout dev          # the latest game; master is behind on purpose
npm install
npm test                  # about 1.5 minutes; every test should pass
```

## 3. A first run (a few seconds)

```bash
npm run sim -- --strategies human --heroes mynxi --diffs normal --only stacks --seeds 1 --out sim-results/first
```

That plays 1 keeper × 1 map × 1 difficulty × 1 seed. It writes:

- `sim-results/first/report.md`: the readable report (win rates, waves reached, what the bot built and why).
- `sim-results/first/runs.json`: every game, for re-reports with `--from`.

`sim-results/` is in `.gitignore`. Reports stay on your machine; never commit them.

## 4. The flags you'll use

The sim plays every combination of keeper × map × difficulty × seed that the filters allow, and each flag narrows or changes that. All flags also work inside scenario files.

| Flag | What it does | Example |
|---|---|---|
| `--strategies` | Which bots play (default: the four old ones, so always pass `human`) | `--strategies human` |
| `--heroes` | Only these keepers: mynxi, michael, vael, elf, ooze, scholar, quack, asser | `--heroes michael,vael` |
| `--diffs` | Only these difficulties: easy, normal, hard, overdue | `--diffs hard,overdue` |
| `--only` | Only these maps, or `overflow` / `siege` nights | `--only stacks,annex,sorting` |
| `--seeds` | Games per combination; more is steadier | `--seeds 2` |
| `--workers` | Processes to split the games over (default: CPU cores − 1) | `--workers 12` |
| `--out` | Where the report goes | `--out sim-results/mortar` |
| `--set` | Change any exported rules value for this run only; repeatable | `--set CANNON.mortarDmg=2.0` |
| `--opener` | Build these towers first, in order (then play normally) | `--opener melon,melon,quill,quill` |
| `--avoid` | Never build these towers | `--avoid hive,organ` |
| `--max-towers` | Stop building at N towers | `--max-towers 4` |
| `--ban` | Never take these shelf upgrades or fittings | `--ban juicy,reach` |
| `--picks smart` | The old bots choose shelf upgrades by board (the human bot always does) | `--picks smart` |
| `--armours` | Sir Michael once per armour (default: azure only) | `--armours azure,dragonscale,ember,wyrm` |
| `--perks` | Every keeper at level 10 with these perk picks, one digit per tier | `--perks 00010` |
| `--slips` | Overflow nights take these late slips (challenges) | `--only overflow --slips damp,karl` |
| `--no-great`, `--keeper-at K=N` | Sir Michael probes: no Great merges; a keeper tower only from N cannons | `--keeper-at gourdgate=10` |
| `--abuse KIND[,KIND]` | With `--strategies abuse`: spam this tower (or pair) | `--abuse fire,freeze` |
| `--from` | Re-report saved `runs.json` files without replaying | `--from sim-results/a/runs.json` |

- **Map ids:** stacks, annex, mezzanine, rarebooks, archive, loop, greathall, readingroom, sorting, greenhouse, belltower, courtyard, rotunda, halldoors, compact, basement (plus overflow for that night). Test rooms such as `archiveB` run only when named.
- **Tower ids:** the keys of `TOWERS` in `src/game/rules.ts`. Shared ones include melon, mortar, still, fire, freeze, spitter, ballista, reader, bell, hive, press, organ, scope, lantern, ink, peeler, bookworm, boomerang, orrery, plane, quill and globe.
- **`--set` paths:** any exported object in `rules.ts`, e.g. `PICKS.fines=3`, `KEEPER_START.scholar.lives=12`, `TRICKS.on=false`, `COMBO.on=false`. A typo stops the run with an error, so you can't silently test nothing. Use `:=` to add a new key.

## 5. Asking a question: scenarios (the main tool)

A scenario plays **the same games two or more ways** and compares them game by game, so luck cancels out. Write a JSON file:

```json
{
  "question": "Would a good player feel the Mortar going from x2.4 back to x2.0 damage?",
  "base": "--strategies human --only stacks,annex,sorting --diffs normal,hard --seeds 4",
  "variants": {
    "Mortar x2.4 (now)": "",
    "Mortar x2.0": "--set CANNON.mortarDmg=2.0"
  },
  "focus": "mortar"
}
```

- `base` is shared by every variant; each variant adds its own flags.
- **The first variant is the baseline;** every other variant is compared with it.
- `focus` (optional) names a tower to report how often it was built and its share of the damage.

Run it:

```bash
npm run sim:scenario -- scripts/scenarios/mortar-damage.json --out sim-results/mortar --workers 12
```

Flags after the file are added to every variant (`--workers 12`, `--heroes mynxi`). They can't override a flag the `base` already has, because the first one wins. To change `--only`, `--diffs` or `--seeds`, edit the file or copy it. More examples are in `scripts/scenarios/`.

### Reading the report (`<out>/report.md`)

- **"Answer"** ranks the variants by win rate. "Against the baseline" is the difference over the same games, give or take a 95% range.
  - **better** / **worse** means the range doesn't cross zero, so it's real.
  - **too close** means it may be chance: add seeds or maps before concluding anything.
- **"How far" (0–2)** is a finer score: a loss counts the share of the night survived, and a win counts 1 plus the share of stacks kept. Use it when win rates tie.
- **Breakdowns by keeper, map and difficulty** follow. Check them: an average can hide one keeper collapsing.
- **Rough noise:** with 96 games per variant the range is about ±10 points. Differences under that need more games.

## 6. Recipes

**Is a tower worth building?** Compare openings, and include a fair control:

```json
"base": "--only stacks,annex,sorting,rotunda,basement,greathall --diffs hard,overdue --seeds 1",
"variants": {
  "good player, as it plays": "--strategies human",
  "control: four melons first": "--strategies human --opener melon,melon,melon,melon",
  "two Quills": "--strategies human --opener melon,melon,quill,quill"
}
```

The control matters. Forcing any opening costs the bot some flexibility, so judge a tower against "four melons first", not only against the free baseline.

**Testing a new rule:** put it behind a switch in `rules.ts` (like `TRICKS.on` or `COMBO.on`), then make the variants "new rules" vs "old rules" with `--set X.on=false`. To tune a number, give each value its own variant (`--set TRICKS.dizzyBack=0.1`, `=0.2`, `=0.3`).

**Looking for exploits:** use `npm run sim:abuse` (every shared tower spammed, against the human bot) or `npm run sim:abuse -- --pairs` (two-tower combos). A spam marked **better** than the human bot is a candidate exploit. Some strong combos are accepted on purpose; see the list in `CLAUDE.md`.

**Cutting down on games:** six maps × Hard and Overdue × 8 keepers × 1 seed is 96 games per variant. That takes about 5 minutes per variant on 12 workers. A 16-variant scenario takes about 80 minutes.

## 7. Working habits that matter

- **Run long sims in the background** and keep working. Use `--workers` to match the machine's cores.
- **Use a git worktree** if other sessions share the checkout (`git worktree add --detach ../wt origin/dev`, then link or install `node_modules`). Never stash, reset or switch branches in a shared checkout.
- **Don't change balance numbers on your own.** Measure, explain the options in plain words with a table, and let the owner pick. Then commit the picked value and say in the commit message which sim it came from.
- **Before pushing a change:** `npm test` and `npm run build` must pass. Push to `dev`, never `master`.
- **When rules change,** update the README, `docs/GUIDE.md` and `public/how-to-play.html`, and the tower's in-game blurb in `rules.ts`.

## 8. How the bot is built (for changing it)

| File | What's in it |
|---|---|
| `scripts/sim.ts` | The command line: reads the flags, builds the list of games, splits them over workers, writes the report |
| `scripts/sim-core.ts` | `simulateRun(config)`: plays one night with a bot and returns a `RunResult`. Also the old bots and `smartPick` (shelf choices) |
| `scripts/sim-human.ts` | The human bot (`makeHuman`) and the abuse bot (`ABUSE`) |
| `scripts/sim-scenario.ts`, `scenario-stats.ts` | Scenarios: runs each variant, compares them game by game (`compare`), writes the ranked answer |
| `scripts/sim-abuse.ts` | The spam and pair screens |
| `tests/human-bot.test.ts`, `tests/scenario.test.ts`, `tests/abuse.test.ts` | Tests for the bots |

Inside `sim-human.ts`:

- **`SKILL`** `{ near: 0.92, top: 3, lookAhead: 2 }`: it takes one of the 3 best tiles within 8% of the best, and looks 2 waves ahead. This is its strength dial; leave it.
- **`KEEPER_PLAN`**: when each keeper's own towers get built (e.g. the signature at two cannons) and where.
- **`PLACE_OF`**: where each tower kind likes to stand (by the carpet, near the door, among cannons...).
- **The shopping list and answers** live in `makeHuman`. It uses the game's own API (`api.wavePreview`, `api.previewStats`, `api.chooseBuild`, `api.pointer`...), the same calls the UI makes, so it can't cheat.
- **`RunResult.tactics`** records why it built each thing; the report's "human bot's reasons" table shows them.
- **`RunConfig.onPrep`** lets a test look at the board before every wave. Use it to check a new behaviour in `tests/human-bot.test.ts`.

To teach it something new (say, to build a new tower sensibly), add a `PLACE_OF` entry. Add a shopping-list rule in `makeHuman` if it needs one, and a test with `onPrep`. Then run a scenario comparing the bot before and after on Normal and Hard. Check it didn't get stronger or weaker overall; that would shift every balance number measured with it.
