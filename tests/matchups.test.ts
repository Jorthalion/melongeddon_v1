import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL } from "../src/game/engine.ts";
import { lab, lost, shoot, step } from "./comboLab.ts";

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

test("a Seed Spitter seed chips a shell like any other hit", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  Object.assign(e, { guard: "rind", shell: CANNON.shellHits });
  shoot(api, e, { element: "seed", dmg: 5 });
  assert.equal(e.shell, CANNON.shellHits - 1, "one hit soaked");
});

test("a husk standing in a Still puddle feels part of the slow", () => {
  const { api, w, fruit } = lab(1);
  const [e] = fruit;
  Object.assign(e, { guard: "husk", speed: 30 });
  w.pools.push({ x: e.x, y: e.y, r: 40, life: 5, max: 5, hot: false, burn: 0 });
  step(api, 0.1);
  assert.ok(e.slow < 1 && e.slow > 0.5, `slowed a little (${e.slow})`);
});

test("the Shush Bell makes a husk stand still for a moment", () => {
  const { api, w, fruit } = lab(1);
  const [e] = fruit;
  e.guard = "husk";
  let bell;
  for (let c = 0; c < 30 && !bell; c++)
    for (let r = 0; r < 20 && !bell; r++) {
      api.dismissSelection();
      api.chooseBuild("bell");
      api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
      bell = w.towers.find((t) => t.kind === "bell");
    }
  assert.ok(bell, "a bell was built");
  Object.assign(e, { x: bell.x + 20, y: bell.y });
  bell.cd = 0;
  step(api, 2 / 60);
  assert.ok((e.halt ?? 0) > 0, "it stands still");
  assert.ok((e.halt ?? 0) <= CANNON.bellStun * CANNON.bellHusk + 0.01, "but only briefly");
  assert.equal(e.freeze, 0, "not stunned");
});
