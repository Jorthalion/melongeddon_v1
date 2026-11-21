import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { compare, flagsOf, progress, type Game } from "../scripts/scenario-stats.ts";
import { simulateRun } from "../scripts/sim-core.ts";

const game = (key: string, won: boolean, wave = 21, livesLeft = 6): Game => ({ key, won, wave, waves: 21, livesLeft, maxLives: 12 });

test("scenario sums: progress ranks a win above a loss and a close win below an easy one", () => {
  assert.equal(progress(game("a", false, 1)), 0);
  assert.ok(progress(game("a", false, 21)) < 1);
  assert.equal(progress(game("a", true, 21, 6)), 1.5);
  assert.ok(progress(game("a", true, 21, 12)) > progress(game("a", true, 21, 1)));
});

test("scenario sums: a variant that wins every game the baseline lost is called the winner", () => {
  const a = Array.from({ length: 20 }, (_, i) => game(`k${i}`, i % 2 === 0));
  const b = Array.from({ length: 20 }, (_, i) => game(`k${i}`, true));
  const c = compare(a, b, "base", "lamp");
  assert.equal(c.paired, 20);
  assert.equal(c.onlyB, 10);
  assert.equal(c.onlyA, 0);
  assert.equal(Math.round(c.winDiff * 100), 50);
  assert.match(c.verdict, /^lamp wins more: 50 points/);
});

test("scenario sums: identical games, or a single flip in many, are no clear difference", () => {
  const a = Array.from({ length: 30 }, (_, i) => game(`k${i}`, i < 15));
  assert.match(compare(a, a).verdict, /No clear difference/);
  const b = a.map((g, i) => (i === 20 ? { ...g, won: true } : g));
  assert.match(compare(a, b).verdict, /No clear difference/);
  // Games only in one variant are left out.
  assert.equal(compare(a, [game("other", true)]).paired, 0);
});

test("scenario flags read as a string or a list", () => {
  assert.deepEqual(flagsOf("--heroes mynxi  --seeds 20"), ["--heroes", "mynxi", "--seeds", "20"]);
  assert.deepEqual(flagsOf(["--set", "CANNON.mortarDmg=2"]), ["--set", "CANNON.mortarDmg=2"]);
  assert.deepEqual(flagsOf(""), []);
});

test("every example scenario has a question and at least two variants", () => {
  for (const f of readdirSync("scripts/scenarios").filter((x) => x.endsWith(".json"))) {
    const sc = JSON.parse(readFileSync(`scripts/scenarios/${f}`, "utf8"));
    assert.ok(typeof sc.question === "string" && sc.question.endsWith("?"), `${f}: question`);
    assert.ok(Object.keys(sc.variants).length >= 2, `${f}: variants`);
  }
});

test("the human bot builds its opener first, in order, even a kind it otherwise avoids, and stops at max towers", () => {
  let first: string[] = [];
  const r = simulateRun({
    hero: "mynxi",
    difficulty: "normal",
    strategy: "human",
    night: "midnight",
    map: "stacks",
    seed: 1,
    opener: ["melon", "melon", "melon", "lantern"],
    avoid: ["lantern"],
    maxTowers: 5,
    onPrep: (world) => {
      if (world.towers.length >= 4 && !first.length) first = [...world.towers].sort((x, y) => x.id - y.id).slice(0, 4).map((t) => t.kind);
    },
  });
  assert.ok(r.towers <= 5, `at most 5 towers, had ${r.towers}`);
  assert.equal(r.builtBy.lantern, 1, "exactly the opener's lamp");
  assert.equal(r.tactics?.opener, 4);
  assert.deepEqual(first, ["melon", "melon", "melon", "lantern"], "the opener, in order");
});
