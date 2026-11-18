/**
 * Headless balance simulator.
 *
 * Plays full runs with simple bot strategies across every hero, difficulty,
 * map/night and knight choice, then writes a report of win rates and where
 * runs leak or die.
 *
 *   npm run sim                 # 3 seeds per combination
 *   npm run sim -- --seeds 10   # more seeds, steadier numbers
 *   npm run sim -- --workers 12 # split the runs over 12 processes (default: CPU cores - 1)
 *   npm run sim -- --set COMBO.on=false --set KEEPER_START.scholar.lives=12
 *   npm run sim -- --set 'BOARDS.greenhouse.trim:={"easy":{"from":9,"count":0.8}}'   (:= adds a new key)
 *                               # change any exported rules object for this run only (JSON values)
 *   npm run sim -- --out sim-results/combos-off   # write the report somewhere else
 *   npm run sim -- --heroes scholar --diffs easy,normal --only stacks   # a quick probe
 *   npm run sim -- --from sim-results/a/runs.json,sim-results/b/runs.json --out sim-results/ab
 *                               # no new runs: rebuild the report from saved runs (a later file's run replaces the same run)
 *
 * Output: sim-results/report.md and sim-results/runs.json
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { simulateRun, type RunConfig, type RunResult, type Strategy } from "./sim-core.ts";
import * as ENGINE from "../src/game/engine.ts";
import { MIDNIGHT_WAVES } from "../src/game/engine.ts";
import type { Difficulty, HeroId, MapId, NightId } from "../src/game/engine.ts";

const args = process.argv.slice(2);
const seedArg = args.indexOf("--seeds");
const SEEDS = seedArg >= 0 ? Math.max(1, Number(args[seedArg + 1]) || 3) : 3;
// --only overflow,siege: just those scenarios (a map name, or "overflow" / "siege"), for quick tuning runs.
const onlyArg = args.indexOf("--only");
const ONLY = onlyArg >= 0 ? String(args[onlyArg + 1] ?? "").split(",").filter(Boolean) : [];
const argOf = (flag: string) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : undefined);
const OUT = argOf("--out") ?? "sim-results";
// --heroes scholar,vael and --diffs easy,normal: only those (quick probes).
const HERO_ONLY = argOf("--heroes")?.split(",").filter(Boolean) ?? [];
const DIFF_ONLY = argOf("--diffs")?.split(",").filter(Boolean) ?? [];

/** --set PATH=VALUE (repeatable): change an exported rules object, e.g. COMBO.on=false. Applied in every worker. */
const SETS: string[] = [];
args.forEach((a, i) => {
  if (a === "--set" && args[i + 1]) SETS.push(args[i + 1]);
});
for (const set of SETS) {
  // PATH:=VALUE may add a key that isn't there yet (a board's trim); PATH=VALUE must hit an existing one (catches typos).
  const eq = set.indexOf("=");
  const create = set[eq - 1] === ":";
  const path = set.slice(0, create ? eq - 1 : eq).split(".");
  const raw = set.slice(eq + 1);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = raw;
  }
  let obj = (ENGINE as Record<string, unknown>)[path[0]] as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== "object") throw new Error(`--set: no exported object ${path[0]}`);
  for (const key of path.slice(1, -1)) {
    obj = obj[key] as Record<string, unknown>;
    if (!obj || typeof obj !== "object") throw new Error(`--set: ${set} doesn't lead to an object`);
  }
  const last = path[path.length - 1];
  if (path.length < 2 || (!create && !(last in obj))) throw new Error(`--set: ${path.join(".")} doesn't exist`);
  obj[last] = value;
}

// --shard K/N: run every Nth config from K and write the results as JSON (used by --workers).
const shardArg = argOf("--shard");
const shard = shardArg ? shardArg.split("/").map(Number) : null;
const WORKERS = Math.max(1, Number(argOf("--workers") ?? Math.max(1, availableParallelism() - 1)) || 1);

const HEROES = (["mynxi", "michael", "vael", "elf", "ooze", "scholar", "quack", "asser"] as HeroId[]).filter((h) => !HERO_ONLY.length || HERO_ONLY.includes(h));
const DIFFS = (["easy", "normal", "hard", "overdue"] as Difficulty[]).filter((d) => !DIFF_ONLY.length || DIFF_ONLY.includes(d));
const STRATEGIES: Strategy[] = ["melon", "mixed", "mixed+mods", "lean"];
const SCENARIOS: Array<{ night: NightId; map: MapId }> = [
  { night: "midnight", map: "stacks" },
  { night: "midnight", map: "annex" },
  { night: "midnight", map: "mezzanine" },
  { night: "midnight", map: "rarebooks" },
  { night: "midnight", map: "archive" },
  { night: "midnight", map: "sorting" },
  { night: "midnight", map: "greenhouse" },
  { night: "midnight", map: "belltower" },
  { night: "overflow", map: "overflow" },
  { night: "siege", map: "courtyard" },
];

const configs: RunConfig[] = [];
for (const hero of HEROES)
  for (const difficulty of DIFFS)
    for (const strategy of STRATEGIES)
      for (const sc of SCENARIOS.filter((x) => !ONLY.length || ONLY.includes(x.night === "midnight" ? x.map : x.night)))
        for (let seed = 1; seed <= SEEDS; seed++)
          configs.push({ hero, difficulty, strategy, night: sc.night, map: sc.map, seed });

const started = Date.now();
let results: RunResult[] = [];
const FROM = argOf("--from")?.split(",").filter(Boolean) ?? [];
if (FROM.length) {
  const byKey = new Map<string, RunResult>();
  const key = (c: RunConfig) => [c.hero, c.difficulty, c.strategy, c.night, c.map, c.seed].join("|");
  for (const file of FROM) for (const r of JSON.parse(readFileSync(file, "utf8")) as RunResult[]) byKey.set(key(r.config), r);
  results = [...byKey.values()];
} else if (shard) {
  const [k, n] = shard;
  const mine = configs.filter((_, i) => i % n === k).map((cfg) => simulateRun(cfg));
  writeFileSync(argOf("--shard-out")!, JSON.stringify(mine));
  process.exit(0);
} else if (WORKERS > 1) {
  // Fan out to child processes, each with the same flags, and gather their runs back in config order.
  mkdirSync(OUT, { recursive: true });
  const self = fileURLToPath(import.meta.url);
  const parts = await Promise.all(
    Array.from({ length: WORKERS }, (_, k) => {
      const file = `${OUT}/.shard-${k}.json`;
      return new Promise<RunResult[]>((done, fail) => {
        const child = spawn(process.execPath, [...process.execArgv, self, ...args, "--shard", `${k}/${WORKERS}`, "--shard-out", file], { stdio: "inherit" });
        child.on("exit", (code) => {
          if (code !== 0) return fail(new Error(`worker ${k} exited ${code}`));
          const got = JSON.parse(readFileSync(file, "utf8")) as RunResult[];
          rmSync(file);
          done(got);
        });
      });
    }),
  );
  results = configs.map((_, i) => parts[i % WORKERS][Math.floor(i / WORKERS)]);
} else {
  for (const cfg of configs) results.push(simulateRun(cfg));
}
const secs = ((Date.now() - started) / 1000).toFixed(1);

// ---------- report ----------

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const winRate = (rs: RunResult[]) => pct(rs.filter((r) => r.won).length, rs.length);

function table(title: string, rowsKey: (r: RunResult) => string, colsKey: (r: RunResult) => string, rows: string[], cols: string[], pool = results) {
  const out = [`### ${title}`, "", `| | ${cols.join(" | ")} | all |`, `|---|${cols.map(() => "---").join("|")}|---|`];
  for (const row of rows) {
    const inRow = pool.filter((r) => rowsKey(r) === row);
    const cells = cols.map((col) => winRate(inRow.filter((r) => colsKey(r) === col)));
    out.push(`| **${row}** | ${cells.join(" | ")} | ${winRate(inRow)} |`);
  }
  return out.join("\n");
}

const scenarioOf = (r: RunResult) => (r.config.night === "midnight" ? r.config.map : r.config.night);
const scenarioNames = SCENARIOS.filter((x) => !ONLY.length || ONLY.includes(x.night === "midnight" ? x.map : x.night)).map((s) => (s.night === "midnight" ? s.map : s.night));

const lines: string[] = [];
lines.push("# Melongeddon balance report", "");
if (SETS.length) lines.push(`Rules changed for this run: ${SETS.map((x) => "`" + x + "`").join(", ")}.`, "");
lines.push(
  (FROM.length
    ? `${results.length} simulated runs, read from ${FROM.map((f) => "`" + f + "`").join(", ")}. `
    : `${results.length} simulated runs (${SEEDS} seed${SEEDS > 1 ? "s" : ""} per combination) in ${secs}s. `) +
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
lines.push(table("Map × difficulty", scenarioOf, (r) => r.config.difficulty, scenarioNames, DIFFS), "");
// Night two and three each get their own keeper table (they are tuned against each other).
for (const night of ["overflow", "siege"] as const) {
  const pool = results.filter((r) => r.config.night === night);
  if (pool.length) lines.push(table(`Hero × difficulty: ${night === "siege" ? "the Siege" : "the Overflow"}`, (r) => r.config.hero, (r) => r.config.difficulty, HEROES, DIFFS, pool), "");
}

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
for (let w = 1; w <= MIDNIGHT_WAVES; w++) lines.push(`| ${w} | ${deaths.get(w) ?? 0} |`);
lines.push("");

lines.push("## Leaks per wave (Normal difficulty)", "");
lines.push("Average stacks lost on each wave, counting only runs that reached it.", "");
lines.push(`| wave | ${STRATEGIES.join(" | ")} |`, `|---|${STRATEGIES.map(() => "---").join("|")}|`);
for (let w = 0; w < MIDNIGHT_WAVES; w++) {
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

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/report.md`, lines.join("\n"));
writeFileSync(`${OUT}/runs.json`, JSON.stringify(results, null, 1));
console.log(lines.join("\n"));
console.log(`\nWrote ${OUT}/report.md and ${OUT}/runs.json`);
