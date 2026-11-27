# Melongeddon: notes for Claude

A single-player tower defense (Vite + React + TypeScript + Tailwind, packaged for Windows with Electron). The README is the full technical reference and `docs/GUIDE.md` is the player guide; read the parts you need before changing something.

## Branches and pushing

- **Work on `dev`.** The latest game is there; `master` is behind on purpose.
- After a change passes `npm test` and `npm run build`, commit it and push to `origin dev`.
- **Never commit to, merge into or push `master`** unless the owner says so at that moment.
- Commit only the files you changed. Don't commit `sim-results/` or scratch scripts.
- Releases: pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, which builds the Windows installer and publishes a GitHub Release. Ask before tagging; a release is public.

## Commands

```bash
npm install
npm run dev          # Vite dev server
npm test             # node --test over tests/**/*.test.ts
npm run typecheck
npm run build        # tsc + vite build
npm run installer    # Windows installer into release/installer (electron-builder)
npm run sim -- --strategies human --seeds 2 [--heroes mynxi,...] [--diffs hard,overdue] [--set PICKS.fines=3] --out sim-results/NAME
npm run sim:newplayer -- [--style careful] [--waves N] [--mode NAME] --out sim-results/NAME
```

If the folder path is very long, `npm run installer` can fail in NSIS ("could not open file ... .nsh"). Build from a shorter path, or map the folder to a drive letter with `subst`.

## Where things are

- `src/game/rules.ts`: every number and definition (towers, keepers, upgrades, `PICKS`, `DIFFICULTIES`, boards). `engine.ts` runs the game and re-exports rules.
- `src/components/`: the React screens (HUD, card picker, setup, back room, Mynxi's tutorial).
- `scripts/sim*.ts`: the headless simulator. `sim-human.ts` is the "human bot", the reference player for balance. **`docs/HUMAN_BOT.md` is the how-to for running it** (setup, flags, scenarios, reading reports).
- `scripts/new-player.ts`: a first-time player in a real browser (playwright-core with installed Chrome) that reports where newcomers get stuck.
- When rules change, update the README, `docs/GUIDE.md` and `public/how-to-play.html` too.

## Balance decisions the owner has made (don't undo these unasked)

- **Judge balance with the human bot** (`--strategies human`), not the old bots. Its strength (about 100% on Normal) is deliberate; don't weaken its `SKILL` settings.
- **Hard (Melongeddon) and Overdue** were tuned so the human bot wins about **65% and 33%**. The old bots doing badly there is accepted. After the shelf rework (8f705e3) the human bot is at 72% / 44%.
- **Shelf upgrades** are small and frequent on purpose (after waves 1 and 2, then every second wave; tower picks from the third shelf). Overdue Fines (3 seeds) and the Reading Lamp (+26 reach) are kept stronger than the other cards on purpose: lower values collapsed Mynxi, the Doctor, Quackarot and Asser.
- **Organ + Hive** is an accepted strong combo, not an exploit. Hive nerfs were tried and rejected.
- **Sir Michael's melon spam** is his accepted best plan. He was weakened instead (9696d56: Hoard 20%, Dragonscale 25%).
- **Legal Elf at about 84% on Normal** is accepted; don't cut his base towers.
- **Flooded Basement** keeps its simulator-tuned water rules (f26aa31), not the original brief's numbers, which won 0% of nights.
