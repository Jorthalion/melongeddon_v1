/**
 * One keeper's build guide, by simulation: which perk at each level, which bookmark, and which towers
 * to open with. Bots play mixed+mods with smart upgrade picks on Normal and Hard, on every board.
 *
 *   npm run sim:keeper -- --hero mynxi                 # perks, bookmarks and openers
 *   npm run sim:keeper -- --hero mynxi --seeds 5 --workers 12
 *   npm run sim:keeper -- --hero mynxi --diffs overdue --opener-level 1   # harder nights; openers for a new keeper
 *   npm run sim:keeper -- --hero mynxi --openers melon,still,mortar/desk,melon,melon   # your own openers (/ between them)
 *
 * Perks and bookmarks are tested at level 10. Openers are tested at level 10 with the best perks found,
 * or at --opener-level 1 with no perks.
 * Output: sim-results/keeper-<hero>/report.md and runs.json
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { simulateRun, type RunConfig, type RunResult } from "./sim-core.ts";
import { BOOKMARKS, type BookmarkId } from "../src/game/meta.ts";
import { HEROES, KEEPER_TOWERS, SIGNATURE, type Difficulty, type HeroId, type MapId, type NightId, type TowerKind } from "../src/game/rules.ts";
import { MAX_LEVEL, PERKS, emptyProgress, xpForLevel, type KeeperProgress, type PerkPicks } from "../src/game/levels.ts";

const args = process.argv.slice(2);
const argOf = (flag: string) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : undefined);
const HERO = (argOf("--hero") ?? "mynxi") as HeroId;
if (!HEROES.includes(HERO)) throw new Error(`--hero: no keeper ${HERO}`);
const SEEDS = Math.max(1, Number(argOf("--seeds") ?? 3) || 3);
const WORKERS = Math.max(1, Number(argOf("--workers") ?? Math.max(1, availableParallelism() - 1)) || 1);
const OUT = argOf("--out") ?? `sim-results/keeper-${HERO}`;
const DIFFS = (argOf("--diffs")?.split(",").filter(Boolean) ?? ["normal", "hard"]) as Difficulty[];
const OPENER_LEVEL = Number(argOf("--opener-level") ?? MAX_LEVEL);
const SCENARIOS: Array<{ night: NightId; map: MapId }> = [
  ...(["stacks", "annex", "mezzanine", "rarebooks", "archive", "sorting", "greenhouse", "belltower"] as MapId[]).map((map) => ({ night: "midnight" as NightId, map })),
  { night: "overflow", map: "overflow" },
  { night: "siege", map: "courtyard" },
];

const tiers = PERKS[HERO];
/** Every combination of perk picks, as strings like "01001" (one digit per tier). */
const combos: string[] = [""];
for (const tier of tiers) combos.splice(0, combos.length, ...combos.flatMap((c) => tier.map((_, i) => c + i)));
const progress = (picks: string): KeeperProgress => {
  const p = emptyProgress();
  p[HERO] = { xp: xpForLevel(MAX_LEVEL), picks: [...picks].map(Number) as PerkPicks };
  return p;
};
const perkNames = (picks: string) => [...picks].map((d, t) => tiers[t][Number(d)].name).join(", ");

// Openers: the first tower alone, then three-tower starts built around the keeper's own towers.
const SHARED: TowerKind[] = ["melon", "mortar", "still", "fire", "freeze", "spitter", "ballista", "bell", "hive", "ink", "compost", "lantern", "peeler", "bookworm"];
const own = KEEPER_TOWERS[HERO];
const sig = SIGNATURE[HERO];
const userOpeners = argOf("--openers")?.split("/").map((o) => o.split(",").filter(Boolean) as TowerKind[]);
const OPENERS: TowerKind[][] = userOpeners ?? [
  ...[...SHARED, ...own].map((k) => [k]),
  ["melon", "melon", sig],
  ["melon", sig, "melon"],
  [sig, "melon", "melon"],
  ["melon", "still", sig],
  ["melon", "mortar", sig],
  ["melon", "freeze", sig],
  ["still", "melon", sig],
  ["melon", "hive", sig],
  ...own.filter((k) => k !== sig).flatMap((k) => [[k, "melon", "melon"] as TowerKind[], ["melon", sig, k] as TowerKind[]]),
];

type Exp = "perks" | "bookmark" | "opener";
const configsFor = (bestPicks: string): RunConfig[] => {
  const out: RunConfig[] = [];
  const push = (style: string, extra: Partial<RunConfig>) => {
    for (const difficulty of DIFFS)
      for (const sc of SCENARIOS)
        for (let seed = 1; seed <= SEEDS; seed++)
          out.push({ hero: HERO, difficulty, strategy: "mixed+mods", night: sc.night, map: sc.map, seed, picks: "smart", style, ...extra });
  };
  if (!bestPicks) {
    for (const c of combos) push(`perks:${c}`, { keepers: progress(c) });
    for (const b of [null, ...BOOKMARKS.map((x) => x.id)]) push(`bookmark:${b ?? "none"}`, { keepers: progress("0".repeat(tiers.length)), ...(b ? { bookmark: b as BookmarkId } : {}) });
  } else {
    for (const o of OPENERS) push(`opener:${o.join(",")}`, { keepers: OPENER_LEVEL >= MAX_LEVEL ? progress(bestPicks) : emptyProgress(), opener: o });
  }
  return out;
};

async function runAll(configs: RunConfig[], phase: string): Promise<RunResult[]> {
  const shard = argOf("--shard");
  if (shard) {
    const [k, n] = shard.split("/").map(Number);
    writeFileSync(argOf("--shard-out")!, JSON.stringify(configs.filter((_, i) => i % n === k).map(simulateRun)));
    process.exit(0);
  }
  mkdirSync(OUT, { recursive: true });
  const self = fileURLToPath(import.meta.url);
  const parts = await Promise.all(
    Array.from({ length: WORKERS }, (_, k) => {
      const file = `${OUT}/.shard-${phase}-${k}.json`;
      return new Promise<RunResult[]>((done, fail) => {
        const child = spawn(process.execPath, [...process.execArgv, self, ...args, "--phase", phase, "--shard", `${k}/${WORKERS}`, "--shard-out", file], { stdio: "inherit" });
        child.on("exit", (code) => {
          if (code !== 0) return fail(new Error(`worker ${k} exited ${code}`));
          const got = JSON.parse(readFileSync(file, "utf8")) as RunResult[];
          rmSync(file);
          done(got);
        });
      });
    }),
  );
  return configs.map((_, i) => parts[i % WORKERS][Math.floor(i / WORKERS)]);
}

const win = (rs: RunResult[]) => (rs.length ? rs.filter((r) => r.won).length / rs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const byStyle = (rs: RunResult[], prefix: Exp) => {
  const m = new Map<string, RunResult[]>();
  for (const r of rs) if (r.config.style?.startsWith(prefix + ":")) m.set(r.config.style.slice(prefix.length + 1), [...(m.get(r.config.style.slice(prefix.length + 1)) ?? []), r]);
  return [...m.entries()].map(([name, list]) => ({
    name,
    all: win(list),
    diffs: DIFFS.map((d) => win(list.filter((r) => r.config.difficulty === d))),
    siege: win(list.filter((r) => r.config.night === "siege")),
    n: list.length,
  }));
};

// A worker runs one phase's configs; the phase's best perks ride along on the command line.
const phaseArg = argOf("--phase");
if (phaseArg === "perks") await runAll(configsFor(""), "perks");
if (phaseArg === "opener") await runAll(configsFor(argOf("--best")!), "opener");

const started = Date.now();
const first = await runAll(configsFor(""), "perks");
const perks = byStyle(first, "perks").sort((a, b) => b.all - a.all);
const best = perks[0].name;
args.push("--best", best);
const second = await runAll(configsFor(best), "opener");
const results = [...first, ...second];
const bookmarks = byStyle(first, "bookmark").sort((a, b) => b.all - a.all);
const openers = byStyle(second, "opener").sort((a, b) => b.all - a.all);

// Each tier on its own: the win rate of every combination holding that perk.
const tierRows = tiers.map((tier, t) =>
  tier.map((perk, i) => ({ tier: t, perk: perk.name, blurb: perk.blurb, all: win(first.filter((r) => r.config.style?.startsWith("perks:") && r.config.style[6 + t] === String(i))) })),
);

const lines: string[] = [];
lines.push(`# ${HERO}: build guide by simulation`, "");
lines.push(`${results.length} runs in ${((Date.now() - started) / 1000).toFixed(0)}s: mixed+mods bots with smart upgrade picks, ${DIFFS.join(" and ")}, all 10 boards, ${SEEDS} seed(s) each.`, "");
lines.push("## Perks, one tier at a time", "", "Win rate of every combination holding that perk (the other tiers vary).", "", "| level | perk | what it does | win rate |", "|---|---|---|---|");
tierRows.forEach((tier, t) => tier.forEach((p) => lines.push(`| ${[2, 4, 6, 8, 10][t]} | ${p.perk} | ${p.blurb} | ${pct(p.all)} |`)));
lines.push("", "## Best perk combinations", "", `| picks | ${DIFFS.join(" | ")} | siege | all |`, `|---|${DIFFS.map(() => "---|").join("")}---|---|`);
for (const p of perks.slice(0, 5)) lines.push(`| ${perkNames(p.name)} | ${p.diffs.map(pct).join(" | ")} | ${pct(p.siege)} | ${pct(p.all)} |`);
const worst = perks[perks.length - 1];
lines.push(`| worst: ${perkNames(worst.name)} | ${worst.diffs.map(pct).join(" | ")} | ${pct(worst.siege)} | ${pct(worst.all)} |`);
lines.push("", "## Bookmarks (level 10, first perk of each tier)", "", `| bookmark | ${DIFFS.join(" | ")} | siege | all |`, `|---|${DIFFS.map(() => "---|").join("")}---|---|`);
for (const b of bookmarks) lines.push(`| ${b.name} | ${b.diffs.map(pct).join(" | ")} | ${pct(b.siege)} | ${pct(b.all)} |`);
lines.push("", OPENER_LEVEL >= MAX_LEVEL ? `## Openers (level 10, best perks: ${perkNames(best)})` : "## Openers (level 1, no perks)", "", "The first towers built, in order; after them the bot plays its usual mix.", "", `| opener | ${DIFFS.join(" | ")} | siege | all |`, `|---|${DIFFS.map(() => "---|").join("")}---|---|`);
for (const o of openers) lines.push(`| ${o.name.replaceAll(",", " → ")} | ${o.diffs.map(pct).join(" | ")} | ${pct(o.siege)} | ${pct(o.all)} |`);
lines.push("");

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/report.md`, lines.join("\n"));
writeFileSync(`${OUT}/runs.json`, JSON.stringify(results, null, 1));
console.log(lines.join("\n"));
