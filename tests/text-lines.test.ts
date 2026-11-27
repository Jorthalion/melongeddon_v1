import { test } from "node:test";
import assert from "node:assert/strict";
import { theName, TOWERS } from "../src/game/engine.ts";
import { KEEPER_VOICE, winLine } from "../src/game/keeperVoice.ts";

test("tower names never read 'the The …'", () => {
  assert.equal(theName("Melon cannon"), "the Melon cannon");
  assert.equal(theName("The Dragon's Roost"), "The Dragon's Roost");
  for (const t of Object.values(TOWERS)) assert.ok(!/the The /.test(theName(t.name)), t.name);
});

test("Sir Michael doesn't say 'barely' after a win with every stack standing", () => {
  assert.ok(winLine("michael").includes("Barely"));
  assert.ok(!winLine("michael", "stacks", true).includes("arely"));
  // Keepers without a clean-win line keep their usual one.
  assert.equal(winLine("mynxi", "stacks", true), winLine("mynxi", "stacks"));
  assert.equal(KEEPER_VOICE.mynxi.winClean, undefined);
});
