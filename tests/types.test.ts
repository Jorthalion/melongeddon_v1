import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANNON_UPGRADES,
  TOWERS,
  TOWER_TYPE,
  UPGRADES,
  towerReadout,
  upgradeAffects,
  upgradeTargetLabel,
  type TowerKind,
  type UpgradeId,
} from "../src/game/engine.ts";

const kinds = Object.keys(TOWERS) as TowerKind[];

test("every tower has a type, and the five types are all used", () => {
  for (const k of kinds) assert.ok(TOWER_TYPE[k], k);
  assert.deepEqual(new Set(Object.values(TOWER_TYPE)), new Set(["cannon", "precision", "alchemy", "creature", "utility"]));
});

test("Rapid Rind speeds up Cannon and Precision towers only", () => {
  for (const k of ["melon", "reader", "spitter"] as const) {
    assert.ok(towerReadout(null, k, [], ["rapid"]).interval < towerReadout(null, k, [], []).interval, `${k} faster`);
  }
  for (const k of ["hive", "ink", "bookworm", "bell", "cauldron"] as const) {
    assert.equal(towerReadout(null, k, [], ["rapid"]).interval, towerReadout(null, k, [], []).interval, `${k} unchanged`);
  }
});

test("Heavy Caliber hits harder on Cannons only", () => {
  assert.ok(towerReadout(null, "melon", [], ["caliber"]).dmg > towerReadout(null, "melon", [], []).dmg);
  assert.ok(towerReadout(null, "mortar", [], ["caliber"]).dmg > towerReadout(null, "mortar", [], []).dmg);
  for (const k of ["reader", "hive", "ballista"] as const) {
    assert.equal(towerReadout(null, k, [], ["caliber"]).dmg, towerReadout(null, k, [], []).dmg, k);
  }
});

test("Reading Lamp reaches Cannon and Precision, not Alchemy", () => {
  assert.ok(towerReadout(null, "melon", [], ["lamp"]).range > towerReadout(null, "melon", [], []).range);
  assert.ok(towerReadout(null, "ballista", [], ["lamp"]).range > towerReadout(null, "ballista", [], []).range);
  assert.equal(towerReadout(null, "still", [], ["lamp"]).range, towerReadout(null, "still", [], []).range);
  assert.equal(towerReadout(null, "ink", [], ["lamp"]).range, towerReadout(null, "ink", [], []).range);
});

test("a cannon upgrade still reaches its own tower whatever its type", () => {
  for (const [kind, id] of Object.entries(CANNON_UPGRADES) as Array<[TowerKind, UpgradeId]>) {
    assert.ok(upgradeAffects(id, kind), `${id} -> ${kind}`);
    assert.equal(upgradeTargetLabel(id), TOWERS[kind].name);
  }
});

test("every upgrade card has an 'affects' label", () => {
  for (const id of Object.keys(UPGRADES) as UpgradeId[]) assert.ok(upgradeTargetLabel(id).length > 0, id);
  assert.equal(upgradeTargetLabel("rapid"), "Cannon, Precision");
  assert.equal(upgradeTargetLabel("fines"), "Seeds");
});

test("Bouncing Melons belongs to the melon cannon only", () => {
  assert.ok(upgradeAffects("bounce", "melon"));
  for (const k of ["mortar", "fire", "freeze", "trebuchet", "ballista"] as const) assert.ok(!upgradeAffects("bounce", k), k);
  assert.equal(upgradeTargetLabel("bounce"), "Melon cannon");
});
