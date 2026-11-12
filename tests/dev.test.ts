import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKMARKS,
  DEV_SEEDS,
  HEROES,
  MAX_LEVEL,
  PICKABLE_MAPS,
  createWorld,
  levelFor,
} from "../src/game/engine.ts";

test("developer mode unlocks every map, bookmark and keeper level", () => {
  const h = createWorld(() => {}, { dev: true }).world.hud;
  assert.equal(h.dev, true);
  assert.deepEqual([...h.maps].sort(), [...PICKABLE_MAPS].sort());
  assert.deepEqual([...h.unlocked].sort(), BOOKMARKS.map((b) => b.id).sort());
  for (const hero of HEROES) {
    assert.equal(levelFor(h.keepers[hero].xp), MAX_LEVEL, hero);
    assert.ok(h.keepers[hero].picks.every((p) => p !== null), `${hero}: every perk tier open`);
  }
});

test("without developer mode a fresh game starts locked", () => {
  const h = createWorld(() => {}).world.hud;
  assert.equal(h.dev, false);
  assert.ok(h.maps.length < PICKABLE_MAPS.length);
  assert.equal(levelFor(h.keepers.mynxi.xp), 1);
});

test("the dev seed button works only in developer mode, during a night", () => {
  for (const dev of [true, false]) {
    const api = createWorld(() => {}, { dev });
    api.devSeeds(); // title screen: ignored
    api.openSetup();
    api.pickKeeper("vael");
    api.chooseHero("vael");
    api.beginNight();
    const before = api.world.hud.seeds;
    api.devSeeds();
    assert.equal(api.world.hud.seeds - before, dev ? DEV_SEEDS : 0, `dev ${dev}`);
  }
});

test("developer mode can start a night on a locked map", () => {
  const api = createWorld(() => {}, { dev: true, setup: { night: "midnight", map: "readingroom", hero: "mynxi" } });
  assert.equal(api.world.hud.map, "readingroom");
  assert.equal(api.world.w, 22 * 48);
});
