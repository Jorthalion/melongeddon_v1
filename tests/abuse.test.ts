import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON_UPGRADES, PASSIVE, isSignature, upgradeAffects, type TowerKind } from "../src/game/engine.ts";
import { simulateRun } from "../scripts/sim-core.ts";
import { SPAM_KINDS } from "../scripts/sim-human.ts";

test("the spam screen's kinds are shared towers that shoot, not keeper towers or support", () => {
  assert.ok(SPAM_KINDS.includes("melon") && SPAM_KINDS.includes("mortar") && SPAM_KINDS.includes("scope"));
  for (const k of SPAM_KINDS) {
    assert.ok(!isSignature(k), `${k} is a keeper tower`);
    assert.ok(!PASSIVE.includes(k), `${k} doesn't shoot`);
  }
  assert.ok(!SPAM_KINDS.includes("peeler") && !SPAM_KINDS.includes("ink"));
});

test("the abuse bot pinned to a kind spams it, aims every fitting at it, and takes upgrades that reach it", () => {
  const fitted = new Set<TowerKind>();
  const r = simulateRun({
    hero: "mynxi",
    difficulty: "normal",
    strategy: "abuse",
    abuse: "fire",
    night: "midnight",
    map: "stacks",
    seed: 1,
    onPrep: (world) => {
      for (const [k, mods] of Object.entries(world.hud.fitted)) if ((mods ?? []).length) fitted.add(k as TowerKind);
    },
  });
  assert.equal(r.abused, "fire");
  const shooters = Object.entries(r.builtBy).filter(([k]) => SPAM_KINDS.includes(k as TowerKind));
  const fire = r.builtBy.fire ?? 0;
  const others = shooters.reduce((a, [k, n]) => a + (k === "fire" ? 0 : n ?? 0), 0);
  assert.ok(fire > others, `fire ${fire} against ${others} other cannons`);
  for (const k of fitted) assert.equal(k, "fire", `a fitting went to ${k}`);
  // Every upgrade it took either reaches fire or came from a shelf with nothing for fire.
  const reach = r.upgrades.filter((id) => upgradeAffects(id, "fire") || CANNON_UPGRADES.fire === id);
  assert.ok(reach.length >= 1, `no upgrade reaches fire: ${r.upgrades.join(", ")}`);
  // The same game again plays out the same (the run's own settings aside: this one carried the watcher).
  const again = simulateRun({ hero: "mynxi", difficulty: "normal", strategy: "abuse", abuse: "fire", night: "midnight", map: "stacks", seed: 1 });
  assert.deepEqual({ ...r, config: null }, { ...again, config: null });
});

test("the abuse bot on its own tries several kinds early, then spams one, with no Ink Wells or Organs", () => {
  const r = simulateRun({ hero: "elf", difficulty: "normal", strategy: "abuse", night: "midnight", map: "annex", seed: 2 });
  assert.ok(r.abused && SPAM_KINDS.includes(r.abused as TowerKind), `it spams ${r.abused}`);
  assert.ok((r.tactics?.explore ?? 0) >= 2, "it tried at least two candidates");
  assert.ok((r.tactics?.abuse ?? 0) >= 1, "it spammed its pick");
  assert.equal(r.builtBy.ink ?? 0, 0);
  assert.equal(r.builtBy.organ ?? 0, r.abused === "organ" ? r.builtBy.organ ?? 0 : 0);
});

test("the abuse bot pinned to a pair splits its cannons between the two and aims fittings at both", () => {
  const fitted = new Set<TowerKind>();
  const r = simulateRun({
    hero: "elf",
    difficulty: "hard",
    strategy: "abuse",
    abuse: ["freeze", "fire"],
    night: "midnight",
    map: "stacks",
    seed: 3,
    onPrep: (world) => {
      for (const [k, mods] of Object.entries(world.hud.fitted)) if ((mods ?? []).length) fitted.add(k as TowerKind);
    },
  });
  assert.equal(r.abused, "freeze+fire");
  const [ice, fire] = [r.builtBy.freeze ?? 0, r.builtBy.fire ?? 0];
  assert.ok(ice >= 2 && fire >= 2, `freeze ${ice}, fire ${fire}`);
  assert.ok(Math.abs(ice - fire) <= 2, `an even split: freeze ${ice}, fire ${fire}`);
  const others = Object.entries(r.builtBy).filter(([k]) => SPAM_KINDS.includes(k as TowerKind) && k !== "freeze" && k !== "fire").reduce((a, [, n]) => a + (n ?? 0), 0);
  assert.ok(ice + fire > others, `the pair ${ice + fire} against ${others} other cannons`);
  for (const k of fitted) assert.ok(k === "freeze" || k === "fire", `a fitting went to ${k}`);
});

test("a kind named twice in a combo gets twice the cannons", () => {
  const r = simulateRun({ hero: "elf", difficulty: "hard", strategy: "abuse", abuse: ["freeze", "fire", "fire"], night: "midnight", map: "stacks", seed: 3 });
  const [ice, fire] = [r.builtBy.freeze ?? 0, r.builtBy.fire ?? 0];
  assert.ok(ice >= 2, `freeze ${ice}`);
  assert.ok(Math.abs(fire - 2 * ice) <= 2, `two Fires a Freeze: freeze ${ice}, fire ${fire}`);
});
