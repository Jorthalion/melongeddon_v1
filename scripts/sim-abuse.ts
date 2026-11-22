/**
 * The spam screen: which tower, spammed with everything aimed at it, wins the most?
 *
 *   npm run sim:abuse                                  # every shared shooting tower, all keepers, 3 maps, Normal + Hard, 2 seeds
 *   npm run sim:abuse -- --kinds fire,mortar,scope     # only these
 *   npm run sim:abuse -- --base "--heroes elf --only stacks --diffs hard,overdue --seeds 5" --workers 12
 *   npm run sim:abuse -- --reuse                       # no new games: rebuild the report
 *
 * Each tower kind is one variant of a scenario (sim-scenario.ts): the abuse bot pinned to it (`--strategies abuse
 * --abuse KIND`: it still answers shells, Box Cats and drops, lights its cannons and uses the keeper's own towers,
 * but every cannon it adds is that kind, and every fitting and shelf upgrade it can aim there goes there). The
 * baseline is the human bot on the same games; the abuse bot finding its own pick (`--strategies abuse`) is a row too.
 * A spam that beats the baseline is a candidate exploit: one tower carrying a night on its own.
 *
 * Output: sim-results/abuse-screen/report.md (the scenario report, with a ranking), one folder per variant.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TOWERS, type TowerKind } from "../src/game/engine.ts";
import { SPAM_KINDS } from "./sim-human.ts";

const args = process.argv.slice(2);
const argOf = (flag: string) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : undefined);
const OUT = argOf("--out") ?? "sim-results/abuse-screen";
const BASE = argOf("--base") ?? "--only stacks,annex,sorting --diffs normal,hard --seeds 2";
const KINDS = (argOf("--kinds")?.split(",").filter(Boolean) as TowerKind[] | undefined) ?? SPAM_KINDS;
for (const k of KINDS) if (!(k in TOWERS)) throw new Error(`--kinds: no tower ${k}`);
const passOn = args.filter((a, i) => !["--out", "--base", "--kinds"].includes(a) && !["--out", "--base", "--kinds"].includes(args[i - 1]));

const variants: Record<string, string> = { "human bot (baseline)": "--strategies human", "abuse bot, its own pick": "--strategies abuse" };
for (const k of KINDS) variants[`spam ${k}`] = `--strategies abuse --abuse ${k}`;
mkdirSync(OUT, { recursive: true });
const file = `${OUT}/abuse-screen.json`;
writeFileSync(
  file,
  JSON.stringify({ question: "Which tower, spammed with everything aimed at it, wins the most?", base: BASE, variants }, null, 2),
);
const runner = fileURLToPath(new URL("./sim-scenario.ts", import.meta.url));
const r = spawnSync(process.execPath, [...process.execArgv, runner, file, "--out", OUT, ...passOn], { stdio: "inherit" });
process.exit(r.status ?? 1);
