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
 *   npm run sim -- --strategies human,mixed+mods   # only these bots (default: melon,mixed,mixed+mods,lean)
 *                               # human = a decent regular player (scripts/sim-human.ts): looks two waves ahead and builds
 *                               # answers (Peeler for shells, a Box Cat seer, chute and paratrooper cover, a Mortar for crowds),
 *                               # lamps and ink beside its cannons, saves for what's next, buys fittings when they beat a
 *                               # cannon, and uses each keeper's own towers. It always picks shelf upgrades the smart way.
 *   npm run sim -- --strategies human --heroes michael --avoid bombard --no-great --keeper-at gourdgate=10
 *   npm run sim -- --strategies human --ban juicy,reach   # never pick the Juicy shelf upgrade or buy the reach fitting
 *                               # human bot probes: never build these kinds; Sir Michael makes no Great towers;
 *                               # build a keeper extra only once this many cannons are down
 *   npm run sim -- --opener melon,melon,melon,lantern --max-towers 4   # build these first (any bot); stop at 4 towers
 *   npm run sim:scenario -- scripts/scenarios/lamp-three-melons.json   # one question, A against B: see sim-scenario.ts
 *   npm run sim -- --strategies abuse,human   # abuse = find the strongest thing and spam it (scripts/sim-human.ts, ABUSE)
 *   npm run sim -- --strategies abuse --abuse fire   # the abuse bot spams one kind from the start
 *   npm run sim -- --strategies abuse --abuse fire,freeze   # ...or a combo, cannons split evenly between them
 *   npm run sim -- --strategies abuse --abuse freeze,fire,fire,fire   # ...in a ratio: one Freeze for every three Fires
 *   npm run sim -- --picks smart  # bots choose shelf upgrades by what suits their board (default: random)
 *   npm run sim -- --heroes michael --armours azure,dragonscale,ember,wyrm   # Sir Michael once per armour (default: azure)
 *   npm run sim -- --styles scripts/styles/playstyles.json   # play these named playstyles instead of the four strategies
 *                               # each: {"name", "strategy", "rotation"?: [tower kinds], "withKeeper"?: true}
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
import type { ArmourId, Difficulty, HeroId, MapId, NightId } from "../src/game/engine.ts";

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
const PICKS = argOf("--picks") === "smart" ? "smart" : "random";
const AVOID = (argOf("--avoid")?.split(",").filter(Boolean) ?? []) as ENGINE.TowerKind[];
for (const k of AVOID) if (!(k in ENGINE.TOWERS)) throw new Error(`--avoid: no tower ${k}`);
// --ban juicy,reach: shelf upgrades no bot picks while anything else is offered, and fittings the human bot never buys.
const BAN = argOf("--ban")?.split(",").filter(Boolean) ?? [];
const KNOWN = new Set<string>([...Object.values(ENGINE.UPGRADES).map((u) => u.id), ...Object.values(ENGINE.MODS).map((m) => m.id)]);
for (const id of BAN) if (!KNOWN.has(id)) throw new Error(`--ban: no shelf upgrade or fitting ${id}`);
const NO_GREAT = args.includes("--no-great");
// --opener melon,melon,lantern: every bot builds these first, in order. --max-towers N: and stops at N towers.
const OPENER = (argOf("--opener")?.split(",").filter(Boolean) ?? []) as ENGINE.TowerKind[];
for (const k of OPENER) if (!(k in ENGINE.TOWERS)) throw new Error(`--opener: no tower ${k}`);
const MAX_TOWERS = argOf("--max-towers") != null ? Number(argOf("--max-towers")) : undefined;
// --abuse KIND: the abuse bot spams this kind from the start instead of finding the strongest.
// --abuse fire,freeze: a combo, its cannons split evenly between the kinds; a kind named twice gets twice the share.
const ABUSE_KINDS = (argOf("--abuse")?.split(",").filter(Boolean) ?? []) as ENGINE.TowerKind[];
for (const k of ABUSE_KINDS) if (!(k in ENGINE.TOWERS)) throw new Error(`--abuse: no tower ${k}`);
const ABUSE_KIND = ABUSE_KINDS.length > 1 ? ABUSE_KINDS : ABUSE_KINDS[0];
const KEEPER_AT: Partial<Record<ENGINE.TowerKind, number>> = {};
for (const pair of argOf("--keeper-at")?.split(",").filter(Boolean) ?? []) {
  const [k, n] = pair.split("=");
  if (!(k in ENGINE.TOWERS) || !Number.isFinite(Number(n))) throw new Error(`--keeper-at: want kind=cannons, got ${pair}`);
  KEEPER_AT[k as ENGINE.TowerKind] = Number(n);
}
const ARMOUR_LIST = (argOf("--armours")?.split(",").filter(Boolean) ?? ["azure"]) as ArmourId[];
for (const a of ARMOUR_LIST) if (!ENGINE.ARMOURS.includes(a)) throw new Error(`--armours: no armour ${a}`);

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
const ALL_STRATEGIES: Strategy[] = ["melon", "mixed", "mixed+mods", "lean", "human", "abuse"];
const STRATEGIES: Strategy[] = (argOf("--strategies")?.split(",").filter(Boolean) as Strategy[] | undefined) ?? ["melon", "mixed", "mixed+mods", "lean"];
for (const s of STRATEGIES) if (!ALL_STRATEGIES.includes(s)) throw new Error(`--strategies: no bot ${s} (${ALL_STRATEGIES.join(", ")})`);
interface Style {
  name: string;
  strategy: Strategy;
  rotation?: ENGINE.TowerKind[];
  withKeeper?: boolean;
}
const STYLE_FILE = argOf("--styles");
const STYLES: Style[] = STYLE_FILE ? JSON.parse(readFileSync(STYLE_FILE, "utf8")) : STRATEGIES.map((strategy) => ({ name: strategy, strategy }));
for (const st of STYLES) for (const k of st.rotation ?? []) if (!(k in ENGINE.TOWERS)) throw new Error(`--styles ${st.name}: no tower ${k}`);
const SCENARIOS: Array<{ night: NightId; map: MapId }> = [
  { night: "midnight", map: "stacks" },
  { night: "midnight", map: "annex" },
  { night: "midnight", map: "mezzanine" },
  { night: "midnight", map: "rarebooks" },
  { night: "midnight", map: "archive" },
  { night: "midnight", map: "greathall" },
  { night: "midnight", map: "readingroom" },
  { night: "midnight", map: "sorting" },
  { night: "midnight", map: "greenhouse" },
  { night: "midnight", map: "belltower" },
  { night: "midnight", map: "rotunda" },
  { night: "midnight", map: "halldoors" },
  { night: "midnight", map: "compact" },
  { night: "midnight", map: "basement" },
  { night: "overflow", map: "overflow" },
  { night: "siege", map: "courtyard" },
  // Test rooms and rooms' layout B run only when asked for by name: --only archiveB,mezzanineB.
  ...(Object.keys(ENGINE.BOARDS) as MapId[])
    .filter((map) => (ENGINE.TEST_MAPS.includes(map) || ENGINE.BOARDS[map].variantOf) && ONLY.includes(map))
    .map((map) => ({ night: "midnight" as NightId, map })),
];

/** --perks 00010: every keeper at level 10 with these perk picks (one digit per tier). Default: level 1, no perks. */
const PERK_ARG = argOf("--perks");
const KEEPERS: ENGINE.KeeperProgress | undefined = PERK_ARG
  ? (() => {
      const p = ENGINE.emptyProgress();
      for (const h of Object.keys(p) as HeroId[]) p[h] = { xp: ENGINE.xpForLevel(ENGINE.MAX_LEVEL), picks: [...PERK_ARG].map(Number) as ENGINE.PerkPicks };
      return p;
    })()
  : undefined;

const configs: RunConfig[] = [];
for (const hero of HEROES)
  for (const difficulty of DIFFS)
    for (const st of STYLES)
      for (const sc of SCENARIOS.filter((x) => !ONLY.length || ONLY.includes(x.night === "midnight" ? x.map : x.night)))
        for (const armour of hero === "michael" ? ARMOUR_LIST : [undefined])
          for (let seed = 1; seed <= SEEDS; seed++)
            configs.push({
              hero,
              difficulty,
              strategy: st.strategy,
              night: sc.night,
              map: sc.map,
              seed,
              picks: PICKS,
              ...(AVOID.length ? { avoid: AVOID } : {}),
              ...(BAN.length ? { ban: BAN } : {}),
              ...(NO_GREAT ? { noGreat: true } : {}),
              ...(OPENER.length ? { opener: OPENER } : {}),
              ...(MAX_TOWERS != null ? { maxTowers: MAX_TOWERS } : {}),
              ...(ABUSE_KIND ? { abuse: ABUSE_KIND } : {}),
              ...(Object.keys(KEEPER_AT).length ? { keeperAt: KEEPER_AT } : {}),
              ...(KEEPERS ? { keepers: KEEPERS } : {}),
              ...(armour ? { armour } : {}),
              ...(STYLE_FILE ? { style: st.name, ...(st.rotation ? { rotation: st.rotation } : {}), ...(st.withKeeper ? { withKeeper: true } : {}) } : {}),
            });

const started = Date.now();
let results: RunResult[] = [];
const FROM = argOf("--from")?.split(",").filter(Boolean) ?? [];
if (FROM.length) {
  const byKey = new Map<string, RunResult>();
  const key = (c: RunConfig) => [c.hero, c.difficulty, c.strategy, c.night, c.map, c.seed, c.armour ?? "azure", c.picks ?? "random", c.style ?? ""].join("|");
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
if (AVOID.length || NO_GREAT || Object.keys(KEEPER_AT).length)
  lines.push(`Bot probes: ${[AVOID.length ? `never builds ${AVOID.join(", ")}` : "", NO_GREAT ? "no Great towers" : "", ...Object.entries(KEEPER_AT).map(([k, n]) => `${k} from ${n} cannons`)].filter(Boolean).join("; ")}.`, "");
lines.push(
  (FROM.length
    ? `${results.length} simulated runs, read from ${FROM.map((f) => "`" + f + "`").join(", ")}. `
    : `${results.length} simulated runs (${SEEDS} seed${SEEDS > 1 ? "s" : ""} per combination) in ${secs}s. `) +
    `Overall win rate: **${winRate(results)}**.`,
  "",
  `Bots place towers where they cover the most carpet, pick upgrades ${
    results.every((r) => r.config.picks === "smart") ? "by what suits their board (`--picks smart`)" : results.some((r) => r.config.picks === "smart") ? "at random or by what suits their board (mixed runs)" : "at random"
  }, and build between and during waves. ` +
    "They are not smart players: treat these as relative numbers, not absolute difficulty.",
  "",
  "**Strategies:** `melon` = only melon cannons. `mixed` = rotates melon, mortar, freeze, fire, still. " +
    "`mixed+mods` = mixed, and buys back-room mods when they are cheaper than a new tower. " +
    "`lean` = a cautious player: mixed, at most 2 new towers per wave, only between waves. " +
    "`human` = a decent regular player: reads the next two waves and builds answers, puts lamps and ink beside its cannons, saves for what's next, buys fittings when they beat a cannon, uses the keeper's own towers, and picks upgrades the smart way. " +
    "`abuse` = the same player with one plan: try the strongest-looking towers early, then spam whichever did the most damage per seed, with every fitting and upgrade it can aim at it (`--abuse KIND` picks the kind).",
  "",
);
lines.push("## Win rates", "");
lines.push(table("Hero × difficulty", (r) => r.config.hero, (r) => r.config.difficulty, HEROES, DIFFS), "");
const styleNames = [...new Set(results.map((r) => r.config.style).filter((x): x is string => !!x))];
if (styleNames.length) {
  lines.push(table("Playstyle × difficulty", (r) => r.config.style ?? "", (r) => r.config.difficulty, styleNames, DIFFS), "");
  const hard = results.filter((r) => r.config.difficulty === "normal" || r.config.difficulty === "hard");
  if (hard.length) lines.push(table("Playstyle × keeper (Normal and Hard)", (r) => r.config.style ?? "", (r) => r.config.hero, styleNames, HEROES, hard), "");
} else {
  lines.push(table("Strategy × difficulty", (r) => r.config.strategy, (r) => r.config.difficulty, STRATEGIES, DIFFS), "");
  const hard = results.filter((r) => r.config.difficulty === "normal" || r.config.difficulty === "hard");
  if (STRATEGIES.length > 1 && HEROES.length > 1 && hard.length) lines.push(table("Strategy × keeper (Normal and Hard)", (r) => r.config.strategy, (r) => r.config.hero, STRATEGIES, HEROES, hard), "");
}
lines.push(table("Map × difficulty", scenarioOf, (r) => r.config.difficulty, scenarioNames, DIFFS), "");
// Night two and three each get their own keeper table (they are tuned against each other).
for (const night of ["overflow", "siege"] as const) {
  const pool = results.filter((r) => r.config.night === night);
  if (pool.length) lines.push(table(`Hero × difficulty: ${night === "siege" ? "the Siege" : "the Overflow"}`, (r) => r.config.hero, (r) => r.config.difficulty, HEROES, DIFFS, pool), "");
}

// Sir Michael by armour, when the runs hold more than one.
const michael = results.filter((r) => r.config.hero === "michael");
const armoursRun = ENGINE.ARMOURS.filter((a) => michael.some((r) => (r.config.armour ?? "azure") === a));
if (armoursRun.length > 1) {
  lines.push(table("Sir Michael by armour × difficulty", (r) => r.config.armour ?? "azure", (r) => r.config.difficulty, armoursRun, DIFFS, michael), "");
  lines.push(table("Sir Michael by armour × map", (r) => r.config.armour ?? "azure", scenarioOf, armoursRun, scenarioNames, michael), "");
}

lines.push("### Towers on the board at the end (average)", "");
lines.push(`| strategy | ${DIFFS.join(" | ")} |`, `|---|${DIFFS.map(() => "---").join("|")}|`);
for (const s of STRATEGIES) {
  const cells = DIFFS.map((d) => avg(results.filter((r) => r.config.strategy === s && r.config.difficulty === d).map((r) => r.towers)).toFixed(1));
  lines.push(`| ${s} | ${cells.join(" | ")} |`);
}
lines.push("");

// Per-tower breakdown: what each kind did for what was spent on it, and how runs went with it built.
{
  const kinds = [...new Set(results.flatMap((r) => Object.keys(r.builtBy ?? {}) as ENGINE.TowerKind[]))];
  const row = (k: ENGINE.TowerKind) => {
    const withK = results.filter((r) => (r.builtBy?.[k] ?? 0) > 0);
    const without = results.filter((r) => !((r.builtBy?.[k] ?? 0) > 0));
    const spent = withK.reduce((a, r) => a + (r.spentBy?.[k] ?? 0), 0);
    const dmg = withK.reduce((a, r) => a + (r.damageBy?.[k] ?? 0), 0);
    const pops = withK.reduce((a, r) => a + (r.popsBy?.[k] ?? 0), 0);
    const all = withK.reduce((a, r) => a + Object.values(r.damageBy ?? {}).reduce((x, y) => x + (y ?? 0), 0), 0);
    const built = withK.reduce((a, r) => a + (r.builtBy?.[k] ?? 0), 0);
    const per = (n: number) => (spent ? ((n / spent) * 100).toFixed(n / spent >= 1 ? 0 : 1) : "–");
    const wins = DIFFS.map((d) => `${winRate(withK.filter((r) => r.config.difficulty === d))} / ${winRate(without.filter((r) => r.config.difficulty === d))}`);
    return { k, withK: withK.length, spent, line: `| ${k} | ${withK.length} | ${(built / Math.max(1, withK.length)).toFixed(1)} | ${Math.round(spent / Math.max(1, withK.length))} | ${per(dmg)} | ${per(pops)} | ${pct(dmg, all)} | ${wins.join(" | ")} |` };
  };
  const head = [`| tower | runs built | built per run | seeds per run | damage per 100 seeds | pops per 100 seeds | damage share | ${DIFFS.map((d) => `${d} with / without`).join(" | ")} |`, `|---|---|---|---|---|---|---|${DIFFS.map(() => "---").join("|")}|`];
  const shared = kinds.filter((k) => !ENGINE.isSignature(k)).map(row).sort((a, b) => b.withK - a.withK);
  const keeper = kinds.filter((k) => ENGINE.isSignature(k)).map(row).sort((a, b) => b.withK - a.withK);
  lines.push("## Towers", "");
  lines.push(
    "Per tower kind, over the runs that built at least one. Seeds spent counts building it, its back-room mods, Great merges and feeding the Roost. " +
      "Damage and pops count only towers still standing at the end. Win rates: runs that built it / runs that didn't (they also differ in strategy and keeper, so read them alongside the playstyle table).",
    "",
  );
  lines.push("### Shared towers", "", ...head, ...shared.map((x) => x.line), "");
  if (keeper.length) lines.push("### Keeper-only towers", "", ...head, ...keeper.map((x) => x.line), "");
}

// The human bot: why it built what it built.
{
  for (const bot of ["human", "abuse"] as Strategy[]) {
    const humans = results.filter((r) => r.tactics && r.config.strategy === bot);
    if (!humans.length) continue;
    const whys = [...new Set(humans.flatMap((r) => Object.keys(r.tactics!)))].sort();
    lines.push(`## The ${bot} bot's reasons`, "");
    lines.push("Average builds (and back-room fittings) per run, by why it made them, per keeper.", "");
    lines.push(`| keeper | ${whys.join(" | ")} |`, `|---|${whys.map(() => "---").join("|")}|`);
    for (const hero of HEROES) {
      const rs = humans.filter((r) => r.config.hero === hero);
      if (rs.length) lines.push(`| ${hero} | ${whys.map((w) => avg(rs.map((r) => r.tactics![w] ?? 0)).toFixed(1)).join(" | ")} |`);
    }
    lines.push("");
  }
}

// The abuse bot: what it found strongest and spammed, and how that went.
{
  const abusers = results.filter((r) => r.config.strategy === "abuse" && r.abused);
  if (abusers.length) {
    const kinds = [...new Set(abusers.map((r) => r.abused!))].sort((a, b) => abusers.filter((r) => r.abused === b).length - abusers.filter((r) => r.abused === a).length);
    lines.push("## What the abuse bot spammed", "");
    lines.push("The kind it ended each run spamming (most damage per seed per wave stood, measured on the board), how often, and its win rate.", "");
    lines.push(`| tower | runs | share | ${DIFFS.join(" | ")} | keepers that picked it most |`, `|---|---|---|${DIFFS.map(() => "---").join("|")}|---|`);
    for (const k of kinds) {
      const rs = abusers.filter((r) => r.abused === k);
      const fans = HEROES.filter((h) => {
        const mine = abusers.filter((r) => r.config.hero === h);
        const top = [...new Set(mine.map((r) => r.abused!))].sort((a, b) => mine.filter((r) => r.abused === b).length - mine.filter((r) => r.abused === a).length)[0];
        return top === k;
      });
      lines.push(`| ${k} | ${rs.length} | ${pct(rs.length, abusers.length)} | ${DIFFS.map((d) => winRate(rs.filter((r) => r.config.difficulty === d))).join(" | ")} | ${fans.join(", ") || "–"} |`);
    }
    lines.push("");
  }
}

// Who hurts what: how good each tower is against each kind of fruit, next to how good it is overall.
{
  const total: Record<string, number> = {};
  const byKind = new Map<string, Record<string, number>>();
  let all = 0;
  for (const r of results)
    for (const [k, vs] of Object.entries(r.vsBy ?? {})) {
      const mine = byKind.get(k) ?? {};
      byKind.set(k, mine);
      for (const [key, v] of Object.entries(vs ?? {})) {
        mine[key] = (mine[key] ?? 0) + v;
        total[key] = (total[key] ?? 0) + v;
      }
    }
  for (const [key, v] of Object.entries(total)) if (!key.startsWith("~") && !key.startsWith("#")) all += v;
  if (all > 0) {
    const FRUIT = ["melon", "corn", "pumpkin", "karl", "goose", "cat"].filter((f) => (total[f] ?? 0) > all * 0.002);
    const ARMOUR = ["~plain", "~shell", "~cracked", "~husk", "~damp", "~pit", "~parcel"].filter((f) => (total[f] ?? 0) > all * 0.002);
    const cols = [...FRUIT, ...ARMOUR];
    const label = (c: string) => (c.startsWith("~") ? c.slice(1) : c);
    lines.push("## Who hurts what", "");
    lines.push(
      "How good each tower is against each kind of fruit, next to how good it is overall. 1.0 = its usual share of the damage; " +
        "2.0 = it does twice its usual share against that fruit (a specialist); 0.5 = half (that fruit resists it, or it rarely reaches it). " +
        "Armour columns are what the fruit wore when hit (cracked = a shell already broken). Shells cracked: this tower's share of all the shells broken (a shell blocks the first hit).",
      "",
    );
    lines.push(`| share of all damage | ${cols.map((c) => `${label(c)} ${pct(total[c] ?? 0, all)}`).join(" | ")} |`, "");
    lines.push(`| tower | damage share | ${cols.map(label).join(" | ")} | shells cracked |`, `|---|---|${cols.map(() => "---").join("|")}|---|`);
    const rows = [...byKind.entries()]
      .map(([k, vs]) => {
        const mine = FRUIT.reduce((a, f) => a + (vs[f] ?? 0), 0);
        return { k, vs, mine };
      })
      .filter((x) => x.mine > all * 0.001)
      .sort((a, b) => b.mine - a.mine);
    for (const { k, vs, mine } of rows) {
      const share = mine / all;
      const cells = cols.map((c) => (total[c] ? ((vs[c] ?? 0) / total[c] / share).toFixed(1) : "–"));
      lines.push(`| ${k} | ${pct(mine, all)} | ${cells.join(" | ")} | ${pct(vs["#cracks"] ?? 0, total["#cracks"] ?? 0)} |`);
    }
    lines.push("");
  }
}

lines.push("## Where runs end", "");
lines.push("Wave each losing run died on (all difficulties).", "");
const deaths = new Map<number, number>();
for (const r of results) if (!r.won) deaths.set(r.reachedWave, (deaths.get(r.reachedWave) ?? 0) + 1);
lines.push("| wave | losses |", "|---|---|");
for (let w = 1; w <= MIDNIGHT_WAVES; w++) lines.push(`| ${w} | ${deaths.get(w) ?? 0} |`);
lines.push("");

{
  // The Hall of Doors: where fruit got out, so the exits' costs can be judged.
  const hall = results.filter((r) => r.config.map === "halldoors");
  if (hall.length) {
    lines.push("## The Hall of Doors: leaks by exit", "");
    lines.push("Fruit that got out by each exit, per run (Reading Room: a stack; Kitchens: seeds, or a stack when short; Restricted Section: double stacks, bosses only).", "");
    lines.push(`| difficulty | runs | Reading Room | Kitchens | Restricted Section |`, `|---|---|---|---|---|`);
    for (const d of DIFFS) {
      const rs = hall.filter((r) => r.config.difficulty === d);
      if (!rs.length) continue;
      const per = (k: string) => avg(rs.map((r) => r.leaksByExit?.[k] ?? 0)).toFixed(2);
      lines.push(`| ${d} | ${rs.length} | ${per("reading")} | ${per("kitchens")} | ${per("restricted")} |`);
    }
    lines.push("");
  }
}

{
  // The Flooded Basement: how much of each wave towers spend waterlogged, and how often a Drain Gourd plugs the drain.
  const cellar = results.filter((r) => r.config.map === "basement");
  if (cellar.length) {
    lines.push("## The Flooded Basement: waterlogged towers", "");
    lines.push("Per run: the share of tower-time in waves spent waterlogged, and drains a Drain Gourd plugged.", "");
    lines.push(`| difficulty | runs | waterlogged | plugs |`, `|---|---|---|---|`);
    for (const d of DIFFS) {
      const rs = cellar.filter((r) => r.config.difficulty === d);
      if (!rs.length) continue;
      lines.push(`| ${d} | ${rs.length} | ${(avg(rs.map((r) => r.soaked ?? 0)) * 100).toFixed(1)}% | ${avg(rs.map((r) => r.plugs ?? 0)).toFixed(2)} |`);
    }
    lines.push("");
  }
}

{
  // The Compact Stacks: how often the bot cranks, and how often a bookworm jams a bay.
  const stacks = results.filter((r) => r.config.map === "compact");
  if (stacks.length) {
    lines.push("## The Compact Stacks: cranks and jams", "");
    lines.push("Per run: cranks the bot turned (at most one a break) and bays a Bookworm Gourd jammed.", "");
    lines.push(`| difficulty | runs | cranks | jams |`, `|---|---|---|---|`);
    for (const d of DIFFS) {
      const rs = stacks.filter((r) => r.config.difficulty === d);
      if (!rs.length) continue;
      lines.push(`| ${d} | ${rs.length} | ${avg(rs.map((r) => r.cranks ?? 0)).toFixed(1)} | ${avg(rs.map((r) => r.jams ?? 0)).toFixed(2)} |`);
    }
    lines.push("");
  }
}

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
