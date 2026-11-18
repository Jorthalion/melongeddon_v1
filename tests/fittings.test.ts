import { test } from "node:test";
import assert from "node:assert/strict";
import { FITTING_NAMES, MODS, fittingName, fittingsFor, type TowerKind } from "../src/game/engine.ts";

test("the shared reach and pace fittings are named for each tower; the Melon keeps its Longer barrel", () => {
  assert.equal(fittingName("orrery", "reach"), "Wider orbit");
  assert.equal(fittingName("bell", "haste"), "Lighter clapper");
  assert.equal(fittingName("hive", "haste"), "Queen bee");
  assert.equal(fittingName("melon", "reach"), "Longer barrel");
  assert.equal(fittingName("melon", "haste"), "Oiled breech");
  // No wick or barrel left on a tower that has neither.
  const shared = MODS.filter((m) => m.id === "reach" || m.id === "haste");
  for (const m of shared)
    for (const kind of m.kinds) {
      const name = fittingName(kind, m.id);
      if (kind !== "melon") assert.ok(name !== "Longer barrel" && name !== "Quick wick", `${kind} ${m.id}: ${name}`);
    }
});

test("fittingsFor gives the tower's own names, same ids and kinds; every override is a fitting that kind takes", () => {
  const list = fittingsFor("orrery");
  assert.ok(list.some((m) => m.id === "reach" && m.name === "Wider orbit" && m.blurb.includes("planets")));
  for (const [kind, names] of Object.entries(FITTING_NAMES) as Array<[TowerKind, Record<string, unknown>]>)
    for (const id of Object.keys(names)) assert.ok(MODS.find((m) => m.id === id)?.kinds.includes(kind), `${kind} doesn't take ${id}`);
});
