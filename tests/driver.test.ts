import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, EMPTY_META, carpetAlong, carpetLegs, createWorld, emptyProgress, stepWorld, type MapId } from "../src/game/engine.ts";

function start(night: "midnight" | "overflow" = "midnight", map: MapId = "stacks") {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), setup: { night, map, hero: "quack" } });
  api.openSetup();
  api.chooseHero("quack");
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

function driverAt(api: Api, c: number, r: number) {
  api.chooseBuild("driver");
  api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
  api.dismissSelection();
  const t = api.world.towers.find((x) => x.kind === "driver");
  assert.ok(t, "driver placed");
  return t;
}

function fruit(api: Api, n: number): Fruit[] {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 60 && w.enemies.filter((e) => e.hp > 0).length < n; i++) stepWorld(w, 1 / 60);
  const out = w.enemies.filter((e) => e.hp > 0).slice(0, n);
  w.enemies = out;
  for (const e of out) Object.assign(e, { hp: 9999, maxHp: 9999, guard: "none", shell: 0, boss: false, gall: false, freeze: 0, chill: 0, reverse: false });
  return out;
}

function onLeg(api: Api, e: Fruit, i: number, s: number, reverse = false) {
  const leg = carpetLegs(api.world.points)[i];
  const k = (s - leg.from) / leg.length;
  Object.assign(e, { x: leg.a.x + (leg.b.x - leg.a.x) * k, y: leg.a.y + (leg.b.y - leg.a.y) * k, wp: reverse ? i : i + 1, reverse });
}
const along = (api: Api, e: Fruit) => carpetAlong(api.world.points, e.x, e.y, e.wp, e.reverse).along;

/** Record `along` for each fruit every tick for `s` seconds (removing anything the wave sends). */
function track(api: Api, keep: Fruit[], s: number) {
  const out = keep.map(() => [] as number[]);
  for (let i = 0; i < Math.round(s * 60); i++) {
    api.world.enemies = api.world.enemies.filter((e) => keep.includes(e));
    stepWorld(api.world, 1 / 60);
    keep.forEach((e, k) => out[k].push(along(api, e)));
  }
  return out;
}

test("it walks the fruit furthest along back for 2.5 s, then it carries on; the one behind keeps walking; nothing is hurt", () => {
  const api = start();
  const drv = driverAt(api, 4, 3); // beside the first corner of the Stacks
  const legs = carpetLegs(api.world.points);
  const [ahead, behind] = fruit(api, 2);
  onLeg(api, ahead, 1, legs[1].from + 20);
  onLeg(api, behind, 0, legs[0].to - 40);
  drv.cd = 0;
  const [a, b] = track(api, [ahead, behind], 4);
  const at = (s: number, xs: number[]) => xs[Math.round(s * 60) - 1];
  assert.ok(at(2.3, a) < at(0.1, a), "the front fruit went backwards");
  assert.ok(at(3.8, a) > at(2.7, a), "then forwards again");
  assert.ok(at(2.3, b) > at(0.1, b), "the other kept walking");
  assert.equal(ahead.hp, 9999);
  assert.equal(behind.hp, 9999);
  assert.ok((ahead.driven ?? 0) === 0);
});

test("Karl turns for only 0.6 s; a husk is driven too", () => {
  const api = start();
  const drv = driverAt(api, 4, 3);
  const legs = carpetLegs(api.world.points);
  const [karl] = fruit(api, 1);
  karl.boss = true;
  onLeg(api, karl, 1, legs[1].from + 20);
  drv.cd = 0;
  stepWorld(api.world, 1 / 60);
  assert.equal(karl.driven, CANNON.driverKarl, "Karl turns for a moment only");

  const husk = start();
  const d2 = driverAt(husk, 4, 3);
  const [h] = fruit(husk, 1);
  h.guard = "husk";
  onLeg(husk, h, 1, legs[1].from + 20);
  d2.cd = 0;
  stepWorld(husk.world, 1 / 60);
  assert.ok((h.driven ?? 0) > 2, "the husk is walked back");
});

test("at the start of the carpet it waits instead of walking off; a chute fruit waits at the chute end", () => {
  const api = start();
  const drv = driverAt(api, 1, 4);
  const legs = carpetLegs(api.world.points);
  const [e] = fruit(api, 1);
  onLeg(api, e, 0, legs[0].from + 12);
  drv.cd = 0;
  const [xs] = track(api, [e], 2);
  assert.ok(Math.min(...xs) >= -0.01, `never off the board (${Math.min(...xs)})`);
  assert.ok(e.hp > 0);

  const over = start("overflow", "overflow");
  const ol = carpetLegs(over.world.points);
  const last = ol[ol.length - 1];
  // A tile beside the last straight, near the chute end.
  const end = last.tiles[last.tiles.length - 1];
  const d2 = driverAt(over, end[0], end[1] - 1);
  const [c] = fruit(over, 1);
  onLeg(over, c, ol.length - 1, last.to - 10, true);
  d2.cd = 0;
  const [cs] = track(over, [c], 2);
  assert.ok(Math.max(...cs) <= last.to + 0.01, `stays on the carpet (${Math.max(...cs)} vs ${last.to})`);
  assert.ok(c.hp > 0);
});

test("a fruit it has just turned can't be turned again at once, so a lone fruit always gets through", () => {
  const api = start();
  driverAt(api, 4, 3);
  const legs = carpetLegs(api.world.points);
  const [e] = fruit(api, 1);
  onLeg(api, e, 1, legs[1].from + 20);
  const [xs] = track(api, [e], 20);
  assert.ok(xs[xs.length - 1] > legs[1].to, "it made it past the Driver");
});
