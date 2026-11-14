import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, BALANCE, createWorld, type HeroId } from "../src/game/engine.ts";

test("on the Overflow, the crates line comes after the keeper's opening line instead of erasing it", () => {
  for (const hero of ["mynxi", "michael", "elf"] as HeroId[]) {
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED, setup: { night: "overflow", map: "overflow" } });
    api.openSetup();
    api.chooseHero(hero);
    api.beginNight();
    const log = api.world.hud.log;
    assert.equal(api.world.hud.night, "overflow");
    assert.ok(log.includes(`+${BALANCE.overflowSeeds} seeds`), `${hero}: the crates`);
    const before = log.split("The crates by the chute")[0].trim();
    assert.ok(before.length > 10, `${hero}: the keeper still speaks first ("${log}")`);
    assert.doesNotMatch(log, /knight/i);
  }
});
