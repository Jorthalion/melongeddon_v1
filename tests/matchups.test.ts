import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON } from "../src/game/engine.ts";
import { lab, lost, shoot } from "./comboLab.ts";

test("a shell soaks CANNON.shellHits hits, then the next one lands in full", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  Object.assign(e, { guard: "rind", shell: CANNON.shellHits });
  for (let i = 0; i < CANNON.shellHits; i++) shoot(api, e, { dmg: 50 });
  assert.equal(lost(e), 0, "every hit before the crack is wasted");
  assert.equal(e.shell, 0, "cracked");
  shoot(api, e, { dmg: 50 });
  assert.ok(Math.abs(lost(e) - 50) < 0.01, `then full damage (${lost(e)})`);
});

test("a husk lets through CANNON.huskShot of a direct shot", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  e.guard = "husk";
  shoot(api, e, { dmg: 40 });
  assert.ok(Math.abs(lost(e) - 40 * CANNON.huskShot) < 0.01, `${lost(e)}`);
});

test("the Peeler strips armour and leaves the fruit taking more damage for a while", () => {
  const { api, fruit } = lab(2, 200);
  const [peeled, plain] = fruit;
  peeled.guard = "husk";
  shoot(api, peeled, { element: "peel", dmg: 1 });
  assert.equal(peeled.guard, "none", "peeled");
  shoot(api, plain, { element: "peel", dmg: 1 });
  assert.ok((plain.ink ?? 0) > 0 && (plain.inkMul ?? 1) >= CANNON.peelExpose, "even an unarmoured fruit is exposed");
  const a = lost(peeled);
  shoot(api, peeled, { dmg: 40 });
  assert.ok(Math.abs(lost(peeled) - a - 40 * CANNON.peelExpose) < 0.01, `exposed: ${lost(peeled) - a}`);
});
