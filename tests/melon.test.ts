import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, stepWorld, fittingsFor, towerReadout, upgradeAffects, CANNON, CELL, type TowerKind, type UpgradeId } from "../src/game/engine.ts";

// The melon cannon is the plain gun: its upgrades only make it hit harder, fire faster or reach farther.

test("the melon cannon's back room: reach, damage and pace, nothing elemental", () => {
  assert.deepEqual(fittingsFor("melon").map((m) => m.id), ["reach", "ripe", "haste"]);
  assert.ok(fittingsFor("spitter").some((m) => m.id === "chill"), "Cold rind stays on the spitter");
});

test("melon damage: 1.3× the base, Prize Melons and Ripe core add more, Caliber still counts", () => {
  const dmg = (mods: string[], ups: UpgradeId[]) => towerReadout(null, "melon", mods as never, ups).dmg;
  assert.equal(dmg([], []), Math.round(14 * CANNON.melonDmg));
  assert.ok(dmg([], ["bounce"]) > dmg([], []), "Prize Melons");
  assert.ok(dmg(["ripe"], []) > dmg([], []), "Ripe core");
  assert.ok(dmg([], ["caliber"]) > dmg([], []), "Heavy Caliber");
  assert.ok(towerReadout(null, "melon", [], ["rapid"]).interval < towerReadout(null, "melon", [], []).interval, "Rapid Rind");
  assert.ok(towerReadout(null, "melon", ["reach"], []).range > towerReadout(null, "melon", [], []).range, "Longer barrel");
  // The Post doesn't ride the melon cannon's boost.
  assert.equal(towerReadout(null, "pamphlet", [], []).dmg, 14 * CANNON.pamphletHit);
});

test("Juicy, Splatter and Electric skip the melon cannon but still reach the mortar", () => {
  for (const id of ["juicy", "splatter", "electric"] as UpgradeId[]) {
    assert.equal(upgradeAffects(id, "melon"), false, id);
    assert.equal(upgradeAffects(id, "mortar"), true, id);
  }
  for (const id of ["rapid", "caliber", "lamp", "bounce"] as UpgradeId[]) assert.equal(upgradeAffects(id, "melon"), true, id);
  for (const id of ["sticky", "vial", "distill"] as UpgradeId[]) assert.equal(upgradeAffects(id, "melon"), false, id);
});

test("with every effect card owned, a melon shot is a plain hit: no burst, spark, bounce, frost or puddle", () => {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  const w = api.world;
  w.hud.seeds = 99999;
  w.hud.lives = 999;
  w.hud.upgrades = ["juicy", "splatter", "electric", "sticky", "vial", "distill", "bounce"];
  api.chooseBuild("melon" as TowerKind);
  let built = false;
  for (let r = 0; r < w.rows && !built; r++)
    for (let c = 0; c < w.cols && !built; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
      built = w.towers.length > 0;
    }
  assert.ok(built);
  api.dismissSelection();
  api.startWave();
  let shots = 0;
  for (let i = 0; i < 60 * 20 && w.hud.phase === "combat"; i++) {
    stepWorld(w, 1 / 60);
    for (const s of w.shots) {
      if (s.owner !== w.towers[0].id) continue;
      shots += 1;
      assert.equal(s.procs, false);
      assert.equal(s.bounces, 0);
      assert.equal(s.chill, 0);
    }
    assert.equal(w.pools.length, 0, "no pulp puddles");
  }
  assert.ok(shots > 0, "it fired");
});
