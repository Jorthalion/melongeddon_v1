import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, createWorld, emptyProgress, nightLength, type NightId } from "../src/game/engine.ts";
import { chipsFor } from "../src/game/chips.ts";

function night(night: NightId) {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), siegeOpen: true, setup: { night, hero: "mynxi", difficulty: "normal" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  return api;
}

test("the Siege's Old grudges shows one cat chip and one goose chip, not fourteen ×1s", () => {
  const api = night("siege");
  const index = Array.from({ length: nightLength("siege") }, (_, i) => i).find((i) => api.wavePreview(i).name === "Old grudges")!;
  assert.ok(index != null, "found Old grudges");
  const { groups } = api.wavePreview(index);
  assert.ok(groups.length > 10, "the engine still lists them in spawn order");
  const chips = chipsFor(groups);
  assert.deepEqual(chips.map((c) => [c.kind, c.count, c.mixed]), [["cat", 7, true], ["goose", 7, true]]);
});

test("every night: chips keep every enemy, and no two chips are the same enemy", () => {
  for (const id of ["midnight", "overflow", "siege"] as NightId[]) {
    const api = night(id);
    for (let i = 0; i < nightLength(id); i++) {
      const { groups } = api.wavePreview(i);
      const chips = chipsFor(groups);
      const total = (xs: Array<{ count: number }>) => xs.reduce((n, g) => n + g.count, 0);
      assert.equal(total(chips), total(groups), `${id} wave ${i + 1}`);
      const keys = chips.map(({ count, mixed, ...rest }) => JSON.stringify(rest));
      assert.equal(new Set(keys).size, keys.length, `${id} wave ${i + 1}: duplicate chips`);
      // A wave with no repeats keeps its chips exactly.
      if (groups.length === chips.length) assert.ok(chips.every((c) => !c.mixed));
    }
  }
});

test("chipsFor doesn't change the preview it's given", () => {
  const api = night("siege");
  const g = api.wavePreview(10).groups;
  const before = JSON.stringify(g);
  chipsFor(g);
  assert.equal(JSON.stringify(g), before);
});
