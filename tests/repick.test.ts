import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, createWorld, type HeroId } from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

function start(hero: HeroId) {
  const api = createWorld(() => {});
  api.openSetup();
  api.pickKeeper(hero);
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 5000;
  return api;
}

/** A tap on (c, r) with whatever is picked, the card closed again. */
function tap(api: ReturnType<typeof createWorld>, c: number, r: number) {
  api.pointer(center(c), center(r), "down");
  api.dismissSelection();
}

test("placing a one-at-a-time tower hands the pick back to the card before it", () => {
  const api = start("mynxi");
  api.chooseBuild("freeze");
  api.chooseBuild("catalogue");
  tap(api, 4, 3);
  assert.ok(api.world.towers.some((t) => t.kind === "catalogue"), "the Catalogue went down");
  assert.equal(api.world.hud.build, "freeze", "the Freeze cannon is picked again");
  assert.match(api.world.hud.log, /Freeze cannon is picked again/);
  // So the next floor tap builds, instead of "Only one Card Catalogue at a time."
  tap(api, 5, 3);
  assert.ok(api.world.towers.some((t) => t.kind === "freeze"));
});

test("with nothing picked before it, the pick goes back to the Melon cannon", () => {
  const api = start("mynxi");
  api.chooseBuild("catalogue");
  tap(api, 4, 3);
  assert.equal(api.world.hud.build, "melon");
});

test("a tower you can place again keeps its pick", () => {
  const api = start("mynxi");
  api.chooseBuild("freeze");
  tap(api, 4, 3);
  assert.equal(api.world.hud.build, "freeze");
});
