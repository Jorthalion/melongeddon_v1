import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, HEROES, createWorld, emptyProgress, type NightId } from "../src/game/engine.ts";
import { KEEPER_VOICE, loseLine, openingLine, winLine } from "../src/game/keeperVoice.ts";

test("every keeper has their own opening, win and loss lines", () => {
  for (const field of ["open", "win", "lose"] as const) {
    const lines = HEROES.map((h) => KEEPER_VOICE[h][field]);
    assert.equal(new Set(lines).size, HEROES.length, `${field}: no two keepers share a line`);
  }
  for (const h of HEROES) {
    assert.ok(winLine(h).length > 0 && loseLine(h).length > 0);
    for (const night of ["midnight", "overflow", "siege", "endless"] as NightId[]) assert.ok(openingLine(h, night).length > 0);
  }
});

test("the night opens with the playing keeper's own line (Quackarot no longer borrows the Doctor's)", () => {
  for (const hero of HEROES) {
    for (const night of ["midnight", "overflow", "siege"] as NightId[]) {
      const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), siegeOpen: true, setup: { night, hero } });
      api.openSetup();
      api.chooseHero(hero);
      assert.ok(api.world.hud.log.startsWith(openingLine(hero, night)), `${hero} on ${night}: "${api.world.hud.log}"`);
    }
  }
});

test("losing a night ends on the keeper's own line", () => {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", hero: "quack" } });
  api.openSetup();
  api.chooseHero("quack");
  api.beginNight();
  api.world.hud.lives = 1;
  api.startWave();
  for (let i = 0; i < 60 * 120 && api.world.hud.phase === "combat"; i++) (api.world as unknown as { step: (dt: number) => void }).step(1 / 30);
  assert.equal(api.world.hud.phase, "defeat");
  assert.ok(api.world.hud.log.includes(KEEPER_VOICE.quack.lose), api.world.hud.log);
});
