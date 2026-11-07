/**
 * Headless balance simulator.
 *
 * Plays full runs with simple bot strategies across every hero, difficulty,
 * map/night and knight choice, then writes a report of win rates and where
 * runs leak or die.
 *
 *   npm run sim                 # 3 seeds per combination
 *   npm run sim -- --seeds 10   # more seeds, steadier numbers
 *
 * Output: sim-results/report.md and sim-results/runs.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { simulateRun, type RunConfig, type RunResult, type Strategy } from "./sim-core.ts";
import { WAVE_COUNT } from "../src/game/engine.ts";
import type { Alliance, Difficulty, HeroId, MapId, NightId } from "../src/game/engine.ts";

const args = process.argv.slice(2);
const seedArg = args.indexOf("--seeds");
const SEEDS = seedArg >= 0 ? Math.max(1, Number(args[seedArg + 1]) || 3) : 3;

const HEROES: HeroId[] = ["mynxi", "michael", "vael"];
const DIFFS: Difficulty[] = ["easy", "normal", "hard", "overdue"];
const STRATEGIES: Strategy[] = ["melon", "mixed", "mixed+mods", "lean"];
const DOORS: Exclude<Alliance, "none">[] = ["accept", "betray", "reject"];
const SCENARIOS: Array<{ night: NightId; map: MapId }> = [
  { night: "midnight", map: "stacks" },
  { night: "midnight", map: "annex" },
  { night: "midnight", map: "mezzanine" },
  { night: "midnight", map: "rarebooks" },
  { night: "midnight", map: "archive" },
  { night: "overflow", map: "overflow" },
];

const configs: RunConfig[] = [];
for (const hero of HEROES)
  for (const difficulty of DIFFS)
    for (const strategy of STRATEGIES)
      for (const sc of SCENARIOS)
        for (const door of DOORS)
          for (let seed = 1; seed <= SEEDS; seed++)
            configs.push({ hero, difficulty, strategy, night: sc.night, map: sc.map, door, seed });

const started = Date.now();
const results: RunResult[] = [];
for (const cfg of configs) results.push(simulateRun(cfg));
const secs = ((Date.now() - started) / 1000).toFixed(1);

// ---------- report ----------

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const winRate = (rs: RunResult[]) => pct(rs.filter((r) => r.won).length, rs.length);

function table(title: string, rowsKey: (r: RunResult) => string, colsKey: (r: RunResult) => string, rows: string[], cols: string[]) {
  const out = [`### ${title}`, "", `| | ${cols.join(" | ")} | all |`, `|---|${cols.map(() => "---").join("|")}|---|`];
  for (const row of rows) {
    const inRow = results.filter((r) => rowsKey(r) === row);
    const cells = cols.map((col) => winRate(inRow.filter((r) => colsKey(r) === col)));
    out.push(`| **${row}** | ${cells.join(" | ")} | ${winRate(inRow)} |`);
  }
  return out.join("\n");
}

const scenarioOf = (r: RunResult) => `${r.config.night === "overflow" ? "overflow" : r.config.map} / ${r.config.door}`;
const scenarioNames = SCENARIOS.flatMap((s) => DOORS.map((d) => `${s.night === "overflow" ? "overflow" : s.map} / ${d}`));

const lines: string[] = [];
lines.push("# Melongeddon balance report", "");
lines.push(
  `${results.length} simulated runs (${SEEDS} seed${SEEDS > 1 ? "s" : ""} per combination) in ${secs}s. ` +
    `Overall win rate: **${winRate(results)}**.`,
  "",
  "Bots place towers where they cover the most carpet, pick upgrades at random, and build between and during waves. " +
    "They are not smart players: treat these as relative numbers, not absolute difficulty.",
  "",
  "**Strategies:** `melon` = only melon cannons. `mixed` = rotates melon, mortar, freeze, fire, still. " +
    "`mixed+mods` = mixed, and buys back-room mods when they are cheaper than a new tower. " +
    "`lean` = a cautious player: mixed, at most 2 new towers per wave, only between waves.",
  "",
);
lines.push("## Win rates", "");
lines.push(table("Hero × difficulty", (r) => r.config.hero, (r) => r.config.difficulty, HEROES, DIFFS), "");
lines.push(table("Strategy × difficulty", (r) => r.config.strategy, (r) => r.config.difficulty, STRATEGIES, DIFFS), "");
lines.push(table("Map / knight choice × difficulty", scenarioOf, (r) => r.config.difficulty, scenarioNames, DIFFS), "");

lines.push("### Towers on the board at the end (average)", "");
lines.push(`| strategy | ${DIFFS.join(" | ")} |`, `|---|${DIFFS.map(() => "---").join("|")}|`);
for (const s of STRATEGIES) {
  const cells = DIFFS.map((d) => avg(results.filter((r) => r.config.strategy === s && r.config.difficulty === d).map((r) => r.towers)).toFixed(1));
  lines.push(`| ${s} | ${cells.join(" | ")} |`);
}
lines.push("");

lines.push("## Where runs end", "");
lines.push("Wave each losing run died on (all difficulties).", "");
const deaths = new Map<number, number>();
for (const r of results) if (!r.won) deaths.set(r.reachedWave, (deaths.get(r.reachedWave) ?? 0) + 1);
lines.push("| wave | losses |", "|---|---|");
for (let w = 1; w <= WAVE_COUNT; w++) lines.push(`| ${w} | ${deaths.get(w) ?? 0} |`);
lines.push("");

lines.push("## Leaks per wave (Normal difficulty)", "");
lines.push("Average stacks lost on each wave, counting only runs that reached it.", "");
lines.push(`| wave | ${STRATEGIES.join(" | ")} |`, `|---|${STRATEGIES.map(() => "---").join("|")}|`);
for (let w = 0; w < WAVE_COUNT; w++) {
  const cells = STRATEGIES.map((s) => {
    const rs = results.filter((r) => r.config.difficulty === "normal" && r.config.strategy === s && r.leaks.length > w);
    return rs.length ? avg(rs.map((r) => r.leaks[w])).toFixed(2) : "–";
  });
  lines.push(`| ${w + 1} | ${cells.join(" | ")} |`);
}
lines.push("");

lines.push("## Winning runs: how close was it?", "");
lines.push("Average stacks left at victory, as a share of starting stacks.", "");
lines.push(`| hero | ${DIFFS.join(" | ")} |`, `|---|${DIFFS.map(() => "---").join("|")}|`);
for (const hero of HEROES) {
  const cells = DIFFS.map((d) => {
    const rs = results.filter((r) => r.won && r.config.hero === hero && r.config.difficulty === d);
    return rs.length ? pct(avg(rs.map((r) => r.livesLeft / r.maxLives)), 1) : "–";
  });
  lines.push(`| ${hero} | ${cells.join(" | ")} |`);
}
lines.push("");

mkdirSync("sim-results", { recursive: true });
writeFileSync("sim-results/report.md", lines.join("\n"));
writeFileSync("sim-results/runs.json", JSON.stringify(results, null, 1));
console.log(lines.join("\n"));
console.log(`\nWrote sim-results/report.md and sim-results/runs.json`);
