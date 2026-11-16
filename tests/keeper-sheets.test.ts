import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_META, HEROES, createWorld, emptyProgress } from "../src/game/engine.ts";
import { KEEPER_SHEETS } from "../src/game/keeperSheets.ts";

test("every keeper has a sheet, and its stacks and seeds match a real night's start", () => {
  for (const hero of HEROES) {
    const sheet = KEEPER_SHEETS[hero];
    assert.ok(sheet, hero);
    assert.ok(sheet.rules.length >= 2 && sheet.suits, `${hero}: rules and who it suits`);
    const api = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), setup: { night: "midnight", map: "stacks", hero } });
    api.openSetup();
    api.chooseHero(hero);
    // Sir Michael chooses his oath on the intro; his sheet shows the numbers before any oath.
    assert.equal(api.world.hud.lives, sheet.stacks, `${hero}: stacks`);
    assert.equal(api.world.hud.seeds, sheet.seeds, `${hero}: seeds`);
  }
});
