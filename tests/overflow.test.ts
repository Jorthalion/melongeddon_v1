import { test } from "node:test";
import assert from "node:assert/strict";
import { BALANCE, hpScaleFor } from "../src/game/engine.ts";

test("Overflow fruit are tougher than Midnight's on every wave (night two is harder)", () => {
  assert.ok(BALANCE.overflowHp > 1);
  for (let cleared = 0; cleared < 15; cleared++) {
    const ratio = hpScaleFor("overflow", cleared) / hpScaleFor("midnight", cleared);
    assert.ok(Math.abs(ratio - BALANCE.overflowHp) < 1e-9, `wave ${cleared + 1}`);
  }
  assert.equal(hpScaleFor("endless", 3), hpScaleFor("midnight", 3), "Endless is unchanged");
});
