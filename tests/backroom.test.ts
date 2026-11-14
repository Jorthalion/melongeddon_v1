import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, createWorld, fittingsFor, stepWorld, type HeroId, type TowerKind } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function board(hero: HeroId = "vael") {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 99999;
  return api;
}

/** Build `kind` on the first open floor tile (beside `near`, when given). */
function build(api: ReturnType<typeof board>, kind: TowerKind, near?: { c: number; r: number }) {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (near && Math.abs(near.c - c) + Math.abs(near.r - r) !== 1) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      if (w.towers.length > before) {
        api.dismissSelection();
        return w.towers[w.towers.length - 1];
      }
    }
  throw new Error(`no room for ${kind}`);
}

test("an upgrade reaches every tower of that kind, and the ones built after it, but no other kind", () => {
  const api = board();
  const a = build(api, "melon");
  const b = build(api, "melon");
  const mortar = build(api, "mortar");
  const reach = fittingsFor("melon").find((m) => m.id === "reach")!;
  const rangeBefore = api.statsOf(a.id)!.range;
  api.openShop("melon");
  api.pickMod(reach.id);
  assert.deepEqual(a.mods, ["reach"]);
  assert.deepEqual(b.mods, ["reach"]);
  assert.ok(api.statsOf(a.id)!.range > rangeBefore, "it really reaches farther");
  assert.deepEqual(mortar.mods, [], "the mortar isn't a melon cannon");
  assert.match(api.world.hud.log, /Longer barrel: every Melon cannon has it now \(all 2\)/);
  const later = build(api, "melon");
  assert.deepEqual(later.mods, ["reach"], "a melon cannon built afterwards has it too");
});

test("each kind has its own price: 40, then 30 more per upgrade it has, and other kinds don't raise it", () => {
  const api = board("scholar");
  build(api, "melon");
  build(api, "mortar");
  assert.equal(api.shopPriceFor("melon"), 40);
  assert.equal(api.shopPriceFor("mortar"), 40);
  api.openShop("melon");
  for (const [i, mod] of fittingsFor("melon").entries()) {
    const seeds = api.world.hud.seeds;
    api.pickMod(mod.id);
    assert.equal(seeds - api.world.hud.seeds, 40 + 30 * i, `upgrade ${i + 1} for the melon cannon`);
  }
  assert.equal(api.world.hud.fitted.melon?.length, fittingsFor("melon").length, "no cap: every upgrade it has");
  assert.equal(api.shopPriceFor("mortar"), 40, "melon upgrades left the mortar's price alone");
  const seeds = api.world.hud.seeds;
  api.pickMod(fittingsFor("melon")[0].id);
  assert.equal(api.world.hud.seeds, seeds, "you can't buy the same one twice");
});

test("you can look during a wave, but you buy between waves", () => {
  const api = board();
  const melon = build(api, "melon");
  api.startWave();
  assert.equal(api.world.hud.phase, "combat");
  api.openShop("melon");
  assert.equal(api.world.hud.workshop, "melon", "it opens mid-wave");
  const seeds = api.world.hud.seeds;
  api.pickMod(fittingsFor("melon")[0].id);
  assert.equal(api.world.hud.seeds, seeds);
  assert.deepEqual(melon.mods, []);
  assert.match(api.world.hud.log, /only sells between waves/);
  api.closeShop();
  assert.equal(api.world.hud.workshop, null);
});

test("a Mimic copying a cannon gets that kind's new upgrade straight away", () => {
  const api = board("ooze");
  const melon = build(api, "melon");
  const mimic = build(api, "copycat", melon);
  assert.equal(mimic.copy?.kind, "melon");
  api.openShop("melon");
  api.pickMod("reach");
  assert.ok(mimic.copy?.mods.includes("reach"), "the copy has it");
  assert.ok(mimic.copy?.mods.includes("mimicstep"), "and still its own step");
  stepWorld(api.world, 1 / 60);
});

test("upgrades last the night and start empty on the next", () => {
  const api = board();
  build(api, "melon");
  api.openShop("melon");
  api.pickMod("reach");
  assert.deepEqual(api.world.hud.fitted, { melon: ["reach"] });
  api.reset();
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  assert.deepEqual(api.world.hud.fitted, {});
  assert.equal(api.world.hud.workshop, null);
});
