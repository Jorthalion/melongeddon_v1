/**
 * One question, answered by simulation: the same games played two (or more) ways, compared game by game.
 *
 *   npm run sim:scenario -- scripts/scenarios/lamp-three-melons.json
 *   npm run sim:scenario -- scripts/scenarios/lamp-three-melons.json --seeds 40 --workers 12
 *                               # flags after the file are added to every variant (they win over the file's)
 *   npm run sim:scenario -- scripts/scenarios/lamp-three-melons.json --reuse   # no new games: rebuild the report
 *
 * A scenario file (see scripts/scenarios/):
 *   {
 *     "question": "How much does a Reading Lamp beside three melon cannons add on the Stacks, Hard?",
 *     "base": "--strategies human --only stacks --diffs hard --seeds 20",
 *     "variants": {
 *       "three melons, no lamp": "--opener melon,melon,melon --avoid lantern",
 *       "three melons and a lamp": "--opener melon,melon,melon,lantern --avoid lantern"
 *     },
 *     "focus": "lantern"
 *   }
 * `base` and each variant are ordinary `npm run sim` flags (sim.ts header): bots, keepers, maps, difficulties, seeds,
 * --set rule changes, --opener, --avoid, --max-towers, --no-great, --keeper-at, --armours, --perks.
 * The first variant is the baseline; each other one is compared with it game by game (same keeper, difficulty,
 * night, map, seed, and armour when every variant plays the same ones). `focus` (optional): a tower kind to report how often it was built and what it did.
 *
 * Output: sim-results/scenario-<file name>/report.md, plus each variant's full sim report in a folder of its own.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunResult } from "./sim-core.ts";
import { PASSIVE, nightLength, type TowerKind } from "../src/game/engine.ts";
import { compare, flagsOf, pairByArmour, progress, type Game } from "./scenario-stats.ts";

interface Scenario {
  question: string;
  base?: string | string[];
  variants: Record<string, string | string[]>;
  focus?: string;
}

const args = process.argv.slice(2);
const file = args[0];
if (!file || file.startsWith("--")) throw new Error("Usage: npm run sim:scenario -- path/to/scenario.json [more sim flags]");
const extra = args.slice(1);
const sc = JSON.parse(readFileSync(file, "utf8")) as Scenario;
const names = Object.keys(sc.variants ?? {});
if (names.length < 2) throw new Error(`${file}: a scenario needs at least two variants to compare`);
const slug = basename(file).replace(/\.json$/, "");
const OUT = extra.includes("--out") ? extra[extra.indexOf("--out") + 1] : `sim-results/scenario-${slug}`;
const REUSE = extra.includes("--reuse");
const passOn = extra.filter((_, i) => extra[i] !== "--out" && extra[i - 1] !== "--out" && extra[i] !== "--reuse");
const folder = (name: string) => `${OUT}/${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "variant"}`;
mkdirSync(OUT, { recursive: true });

// Each variant is its own sim.ts run (its own processes, so its --set changes stay its own).
const sim = fileURLToPath(new URL("./sim.ts", import.meta.url));
const runs = new Map<string, RunResult[]>();
const started = Date.now();
for (const name of names) {
  const flags = [...flagsOf(sc.base), ...flagsOf(sc.variants[name]), ...passOn, "--out", folder(name)];
  if (REUSE) {
    runs.set(name, JSON.parse(readFileSync(`${folder(name)}/runs.json`, "utf8")));
    continue;
  }
  console.log(`\n▶ ${name}: npm run sim -- ${flags.join(" ")}`);
  const t = Date.now();
  const r = spawnSync(process.execPath, [...process.execArgv, sim, ...flags], { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error(`variant "${name}" failed (exit ${r.status})`);
  runs.set(name, JSON.parse(readFileSync(`${folder(name)}/runs.json`, "utf8")));
  console.log(`  ${runs.get(name)!.length} games in ${((Date.now() - t) / 1000).toFixed(0)}s`);
}

// ---------- report ----------
// Variants that differ only by armour still pair game by game: armour leaves the key when the variants play different ones.
const byArmour = pairByArmour(names.map((n) => runs.get(n)!.map((r) => r.config.armour)));
const keyOf = (r: RunResult) => [r.config.hero, r.config.difficulty, r.config.night, r.config.map, r.config.seed, byArmour ? (r.config.armour ?? "") : ""].join("|");
const gameOf = (r: RunResult): Game => ({
  key: keyOf(r),
  won: r.won,
  wave: r.reachedWave,
  waves: nightLength(r.config.night),
  livesLeft: r.livesLeft,
  maxLives: r.maxLives,
});
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const base = names[0];
const lines: string[] = [];
lines.push(`# ${sc.question}`, "");
lines.push(`Scenario \`${file}\`, ${((Date.now() - started) / 60000).toFixed(1)} minutes. Common flags: \`${[...flagsOf(sc.base), ...passOn].join(" ") || "(none)"}\`.`, "");

lines.push("## Answer", "");
// Many variants (a screen): one ranked table against the baseline instead of a paragraph each.
if (names.length > 3) {
  const rows = names.slice(1).map((name) => {
    const c = compare(runs.get(base)!.map(gameOf), runs.get(name)!.map(gameOf));
    const rs = runs.get(name)!;
    return { name, c, win: rs.filter((r) => r.won).length / Math.max(1, rs.length), far: avg(rs.map((r) => progress(gameOf(r)))) };
  });
  rows.sort((a, b) => b.win - a.win || b.far - a.far);
  const baseRuns = runs.get(base)!;
  lines.push(
    `Ranked by win rate. Baseline "${base}": ${pct(baseRuns.filter((r) => r.won).length, baseRuns.length)}. ` +
      "\"Against the baseline\" is the win-rate difference over the same games, give or take a 95% range; " +
      "**better** or **worse** only when the range doesn't cross zero.",
    "",
    "| rank | variant | win rate | how far (0–2) | against the baseline | |",
    "|---|---|---|---|---|---|",
  );
  rows.forEach((x, i) => {
    const d = Math.round(x.c.winDiff * 100);
    const ci = Math.round(x.c.winCI * 100);
    const call = Math.abs(x.c.winDiff) > x.c.winCI && x.c.winDiff !== 0 ? (x.c.winDiff > 0 ? "**better**" : "**worse**") : "too close";
    lines.push(`| ${i + 1} | ${x.name} | ${pct(x.win, 1)} | ${x.far.toFixed(2)} | ${d > 0 ? "+" : ""}${d} ± ${ci} | ${call} |`);
  });
  lines.push("");
}
for (const name of names.length > 3 ? [] : names.slice(1)) {
  const c = compare(runs.get(base)!.map(gameOf), runs.get(name)!.map(gameOf), `"${base}"`, `"${name}"`);
  lines.push(`**"${name}" against "${base}":** ${c.verdict}`, "");
  lines.push(
    `Out of ${c.paired} games played both ways, "${name}" won ${c.winB} and "${base}" ${c.winA}. ` +
      `${c.onlyB} were won only by "${name}", ${c.onlyA} only by "${base}"; the rest went the same way both times.`,
    "",
  );
}

lines.push("## Each variant", "");
const focus = sc.focus;
lines.push(
  `| variant | flags | games | win rate | average wave reached | stacks kept in wins | how far (0–2) |${focus ? ` ${focus} built in | ${focus} damage share |` : ""}`,
  `|---|---|---|---|---|---|---|${focus ? "---|---|" : ""}`,
);
for (const name of names) {
  const rs = runs.get(name)!;
  const wins = rs.filter((r) => r.won);
  const cells = [
    name,
    "`" + flagsOf(sc.variants[name]).join(" ") + "`",
    String(rs.length),
    pct(wins.length, rs.length),
    avg(rs.map((r) => r.reachedWave)).toFixed(1),
    wins.length ? pct(avg(wins.map((r) => r.livesLeft / r.maxLives)), 1) : "–",
    avg(rs.map((r) => progress(gameOf(r)))).toFixed(2),
  ];
  if (focus) {
    const k = focus as keyof RunResult["builtBy"];
    const dmg = rs.reduce((a, r) => a + (r.damageBy?.[k] ?? 0), 0);
    const all = rs.reduce((a, r) => a + Object.values(r.damageBy ?? {}).reduce((x, y) => x + (y ?? 0), 0), 0);
    cells.push(pct(rs.filter((r) => (r.builtBy?.[k] ?? 0) > 0).length, rs.length), dmg ? pct(dmg, all) : PASSIVE.includes(focus as TowerKind) ? "boosts, no shot" : "–");
  }
  lines.push(`| ${cells.join(" | ")} |`);
}
lines.push("");

// Broken down by whatever the scenario varies over (keeper, map, difficulty), when it covers more than one.
const facets: Array<[string, (r: RunResult) => string]> = [
  ["keeper", (r) => r.config.hero],
  ["map", (r) => (r.config.night === "midnight" ? r.config.map : r.config.night)],
  ["difficulty", (r) => r.config.difficulty],
  ["armour", (r) => r.config.armour ?? "–"],
];
for (const [label, of] of facets) {
  // Armour only means something for Sir Michael: compare armours only when the scenario plays several.
  const values = [...new Set(runs.get(base)!.map(of))].filter((v) => label !== "armour" || v !== "–");
  if (values.length < 2) continue;
  lines.push(`### Win rate by ${label}`, "", `| ${label} | ${names.join(" | ")} |`, `|---|${names.map(() => "---").join("|")}|`);
  for (const v of values) lines.push(`| ${v} | ${names.map((n) => { const rs = runs.get(n)!.filter((r) => of(r) === v); return pct(rs.filter((r) => r.won).length, rs.length); }).join(" | ")} |`);
  lines.push("");
}

lines.push(
  "How to read this: every game is played once per variant with the same keeper, map, difficulty and seed, so the variants face the same fruit. " +
    "\"Give or take\" is a 95% range: if it is wider than the difference, the difference may be chance. " +
    "\"How far\" ranks games on one scale: a loss counts the share of the night survived (0 to 1), a win counts 1 plus the share of stacks kept. " +
    "Each variant's full simulator report is in its own folder beside this one.",
  "",
);

writeFileSync(`${OUT}/report.md`, lines.join("\n"));
console.log("\n" + lines.join("\n"));
console.log(`\nWrote ${OUT}/report.md`);
