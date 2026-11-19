import { test } from "node:test";
import assert from "node:assert/strict";
import { DROWSY, softenSlow } from "../src/game/engine.ts";
import { statusLook } from "../src/game/drawStatus.ts";
import { lab, shoot, step } from "./comboLab.ts";

/** The same lab, with Vaelithra holding the stacks. */
function vael(n = 2) {
  const l = lab(n);
  l.api.world.hud.hero = "vael";
  return l;
}

test("Vaelithra's hits make fruit drowsy: slowed, and no frost at all", () => {
  const { api, fruit } = vael(1);
  const [e] = fruit;
  shoot(api, e, { dmg: 1 });
  shoot(api, e, { dmg: 1 });
  assert.ok((e.drowsy ?? 0) > 0, "drowsy");
  assert.equal(e.frost ?? 0, 0, "never frost");
  assert.equal(e.freeze, 0, "two hits don't put it to sleep");
  step(api);
  assert.ok(Math.abs(e.slow - softenSlow(DROWSY.slow)) < 0.01, `${e.slow}`);
  step(api, DROWSY.time + 0.2);
  assert.equal(e.slow, 1, "it wears off");
});

test("drowsy: fire wakes it; a boss shakes it off sooner; a husk ignores it", () => {
  const { api, fruit } = vael(3);
  const [a, boss, husk] = fruit;
  shoot(api, a, { dmg: 1 });
  shoot(api, a, { element: "fire", dmg: 1 });
  assert.equal(a.drowsy ?? 0, 0, "fire woke it");
  boss.boss = true;
  shoot(api, boss, { dmg: 1 });
  assert.ok((boss.drowsy ?? 0) <= DROWSY.time * DROWSY.boss + 0.01);
  husk.guard = "husk";
  shoot(api, husk, { dmg: 1 });
  assert.equal(husk.drowsy ?? 0, 0);
});

test("only ice adds frost: Cold rind does; a rocket's daze doesn't; another keeper's hits don't make drowsy", () => {
  const { api, fruit } = lab(3);
  const [rind, hit, near] = fruit;
  shoot(api, rind, { chill: 0.75 });
  assert.equal(rind.frost, 1, "Cold rind frosts");
  assert.equal(rind.chill, 0, "and slows only through its frost");
  // A Quack-Liber-style burst: everything in it is dazed, with no frost.
  shoot(api, hit, { splash: 60, splashRatio: 0.5, splashChill: 1 });
  assert.ok(near.chill > 0, "dazed");
  assert.equal(near.frost ?? 0, 0, "no frost from a daze");
  assert.equal(hit.drowsy ?? 0, 0, "only Vaelithra makes fruit drowsy");
});

test("looks: drowsy gets its own tint, z's and moon pip; a daze shows a swirl, not frost", () => {
  const { api, fruit } = lab(2);
  const [d, z] = fruit;
  d.drowsy = 1;
  z.chill = 1;
  const dl = statusLook(d, api.world);
  assert.equal(dl.body, "drowsy");
  assert.ok(dl.particles.some((p) => p.kind === "zzz"));
  assert.ok(dl.pips.some((p) => p.id === "drowsy" && p.shape === "moon"));
  const zl = statusLook(z, api.world);
  assert.notEqual(zl.body, "frost");
  assert.ok(!zl.pips.some((p) => p.id === "frost"), "a daze is not frost");
  assert.ok(zl.pips.some((p) => p.id === "daze"));
});

test("drowsy: the third hit while drowsy puts it to sleep (a stop, not ice); fire wakes it; then it rests", () => {
  const { api, fruit } = vael(1);
  const [e] = fruit;
  shoot(api, e, { dmg: 1 });
  shoot(api, e, { dmg: 1 });
  assert.equal(e.freeze, 0);
  shoot(api, e, { dmg: 1 });
  assert.ok(e.freeze > 0 && e.stunBy === "sleep", "asleep");
  assert.equal(e.frost ?? 0, 0, "still no frost");
  shoot(api, e, { element: "fire", dmg: 1 });
  assert.equal(e.freeze, 0, "fire woke it");
  // Straight after, it can't nod off again: it needs its rest.
  for (let i = 0; i < 3; i++) shoot(api, e, { dmg: 1 });
  assert.equal(e.freeze, 0, "resting");
  step(api, DROWSY.sleep + DROWSY.rest + 0.2);
  for (let i = 0; i < 3; i++) shoot(api, e, { dmg: 1 });
  assert.ok(e.freeze > 0 && e.stunBy === "sleep", "asleep again after its rest");
});
