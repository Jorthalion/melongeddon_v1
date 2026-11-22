/**
 * The spam screen: which tower, spammed with everything aimed at it, wins the most?
 *
 *   npm run sim:abuse                                  # every shared shooting tower, all keepers, 3 maps, Normal + Hard, 2 seeds
 *   npm run sim:abuse -- --kinds fire,mortar,scope     # only these
 *   npm run sim:abuse -- --base "--heroes elf --only stacks --diffs hard,overdue --seeds 5" --workers 12
 *   npm run sim:abuse -- --reuse                       # no new games: rebuild the report
 *   npm run sim:abuse -- --pairs                       # combos: every pair of PAIR_KINDS (or --kinds), each alone too
 *   npm run sim:abuse -- --pairs --kinds organ,freeze,fire,mortar --out sim-results/pairs-small
 *
 * Each tower kind is one variant of a scenario (sim-scenario.ts): the abuse bot pinned to it (`--strategies abuse
 * --abuse KIND`: it still answers shells, Box Cats and drops, lights its cannons and uses the keeper's own towers,
 * but every cannon it adds is that kind, and every fitting and shelf upgrade it can aim there goes there). The
 * baseline is the human bot on the same games; the abuse bot finding its own pick (`--strategies abuse`) is a row too.
 * A spam that beats the baseline is a candidate exploit: one tower carrying a night on its own.
 *
 * --pairs: the combo screen. Each pair of kinds is a variant (`--abuse a,b`: cannons split evenly between the two,
 * fittings and upgrades aimed at both), beside each kind spammed alone, so a pair that beats both of its halves
 * is a real combo, not just one strong tower. Default kinds: PAIR_KINDS (the best spams of the single screens plus
 * the status-combo pieces: ice for shatter and thermal shock, fire, splash, stingers). Default out:
 * sim-results/pair-screen.
 *
 * Output: sim-results/abuse-screen/report.md (the scenario report, with a ranking), one folder per variant. With
 * --pairs, the report ends with "Combos": each pair against the better of its two halves spammed alone.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TOWERS, nightLength, type TowerKind } from "../src/game/engine.ts";
import type { RunResult } from "./sim-core.ts";
import { compare, type Game } from "./scenario-stats.ts";
import { SPAM_KINDS } from "./sim-human.ts";

const args = process.argv.slice(2);
const argOf = (flag: string) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : undefined);
const PAIRS = args.includes("--pairs");
/** The pair screen's default kinds: the best single spams, and the status-combo pieces. */
const PAIR_KINDS: TowerKind[] = ["organ", "ballista", "melon", "globe", "orrery", "quill", "freeze", "fire", "mortar", "hive"];
const OUT = argOf("--out") ?? (PAIRS ? "sim-results/pair-screen" : "sim-results/abuse-screen");
// Pairs: Hard and Overdue (Normal is mostly won either way), one seed: a first screen; confirm the best with more.
const BASE = argOf("--base") ?? (PAIRS ? "--only stacks,annex,sorting --diffs hard,overdue --seeds 1" : "--only stacks,annex,sorting --diffs normal,hard --seeds 2");
const KINDS = (argOf("--kinds")?.split(",").filter(Boolean) as TowerKind[] | undefined) ?? (PAIRS ? PAIR_KINDS : SPAM_KINDS);
for (const k of KINDS) if (!(k in TOWERS)) throw new Error(`--kinds: no tower ${k}`);
const passOn = args.filter((a, i) => !["--out", "--base", "--kinds", "--pairs"].includes(a) && !["--out", "--base", "--kinds"].includes(args[i - 1]));

const variants: Record<string, string> = { "human bot (baseline)": "--strategies human" };
if (!PAIRS) variants["abuse bot, its own pick"] = "--strategies abuse";
for (const k of KINDS) variants[`spam ${k}`] = `--strategies abuse --abuse ${k}`;
if (PAIRS) for (let i = 0; i < KINDS.length; i++) for (let j = i + 1; j < KINDS.length; j++) variants[`${KINDS[i]} + ${KINDS[j]}`] = `--strategies abuse --abuse ${KINDS[i]},${KINDS[j]}`;
mkdirSync(OUT, { recursive: true });
const file = `${OUT}/abuse-screen.json`;
writeFileSync(
  file,
  JSON.stringify(
    {
      question: PAIRS ? "Which pair of towers, spammed together with everything aimed at them, wins the most?" : "Which tower, spammed with everything aimed at it, wins the most?",
      base: BASE,
      variants,
    },
    null,
    2,
  ),
);
const runner = fileURLToPath(new URL("./sim-scenario.ts", import.meta.url));
const r = spawnSync(process.execPath, [...process.execArgv, runner, file, "--out", OUT, ...passOn], { stdio: "inherit" });
if (r.status !== 0 || !PAIRS) process.exit(r.status ?? 1);

// ---------- combos: does the pair beat the better of its two halves, game by game? ----------
const folder = (name: string) => `${OUT}/${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`; // as sim-scenario names them
const runsOf = (name: string): RunResult[] => JSON.parse(readFileSync(`${folder(name)}/runs.json`, "utf8"));
const gameOf = (x: RunResult): Game => ({
  key: [x.config.hero, x.config.difficulty, x.config.night, x.config.map, x.config.seed, x.config.armour ?? ""].join("|"),
  won: x.won,
  wave: x.reachedWave,
  waves: nightLength(x.config.night),
  livesLeft: x.livesLeft,
  maxLives: x.maxLives,
});
const winOf = (rs: RunResult[]) => rs.filter((x) => x.won).length / Math.max(1, rs.length);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const rows = Object.keys(variants)
  .filter((n) => n.includes(" + "))
  .map((name) => {
    const [a, b] = name.split(" + ");
    const pair = runsOf(name);
    const [ra, rb] = [runsOf(`spam ${a}`), runsOf(`spam ${b}`)];
    const better = winOf(ra) >= winOf(rb) ? a : b;
    const c = compare((better === a ? ra : rb).map(gameOf), pair.map(gameOf));
    const dmg = (k: string) => pair.reduce((s, x) => s + (x.damageBy?.[k as TowerKind] ?? 0), 0);
    const all = pair.reduce((s, x) => s + Object.values(x.damageBy ?? {}).reduce((p, q) => p + (q ?? 0), 0), 0);
    return { name, a, b, win: winOf(pair), wa: winOf(ra), wb: winOf(rb), better, c, share: all ? (dmg(a) + dmg(b)) / all : 0 };
  })
  .sort((x, y) => y.win - x.win || y.c.winDiff - x.c.winDiff);
const out = [
  "",
  "## Combos: each pair against the better of its halves",
  "",
  "Each pair spammed together (cannons split evenly), against whichever of its two towers did better spammed alone, " +
    "over the same games. **real combo** when the pair wins more than its better half and the 95% range doesn't cross zero; " +
    "**worse** when it wins less; otherwise too close. \"Pair's damage\" is the share of all damage done by the pair's two towers.",
  "",
  "| rank | pair | pair wins | first alone | second alone | against the better half | | pair's damage |",
  "|---|---|---|---|---|---|---|---|",
  ...rows.map((x, i) => {
    const d = Math.round(x.c.winDiff * 100);
    const call = x.c.winDiff !== 0 && Math.abs(x.c.winDiff) > x.c.winCI ? (x.c.winDiff > 0 ? "**real combo**" : "**worse**") : "too close";
    return `| ${i + 1} | ${x.name} | ${pct(x.win)} | ${x.a} ${pct(x.wa)} | ${x.b} ${pct(x.wb)} | ${d > 0 ? "+" : ""}${d} ± ${Math.round(x.c.winCI * 100)} vs ${x.better} | ${call} | ${pct(x.share)} |`;
  }),
  "",
];
appendFileSync(`${OUT}/report.md`, out.join("\n"));
console.log(out.join("\n"));
