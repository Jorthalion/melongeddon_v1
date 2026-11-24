import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PICKABLE_MAPS } from "../src/game/meta.ts";

// sim.ts runs the simulator when it loads, so its room list is read as text.
test("the simulator plays every room a player can pick", () => {
  const src = readFileSync(new URL("../scripts/sim.ts", import.meta.url), "utf8");
  const list = src.slice(src.indexOf("const SCENARIOS"), src.indexOf("];", src.indexOf("const SCENARIOS")));
  const played = new Set([...list.matchAll(/night: "midnight", map: "(\w+)"/g)].map((m) => m[1]));
  for (const map of PICKABLE_MAPS) assert.ok(played.has(map), `${map} is a room players can pick, but scripts/sim.ts never plays it`);
});
