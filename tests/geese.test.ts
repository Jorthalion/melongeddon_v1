import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, EMPTY_META, KEEPER_TOWERS, TOWERS, carpetAlong, createWorld, stepWorld } from "../src/game/engine.ts";

function start() {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openSetup();
  api.chooseHero("quack");
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Build the protocol on the open floor tile nearest the door. */
function buildByDoor(api: Api) {
  const w = api.world;
  const door = w.points[w.points.length - 1];
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) cells.push([c, r]);
  cells.sort((a, b) => Math.hypot(a[0] * CELL - door.x, a[1] * CELL - door.y) - Math.hypot(b[0] * CELL - door.x, b[1] * CELL - door.y));
  api.chooseBuild("geese");
  for (const [c, r] of cells) {
    api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
    const t = w.towers.find((x) => x.kind === "geese");
    if (t) {
      api.dismissSelection();
      return t;
    }
  }
  throw new Error("no tile for the protocol");
}

const along = (api: Api, e: Fruit) => carpetAlong(api.world.points, e.x, e.y, e.wp, e.reverse).along;

test("the Anti-Geese Protocol is Quackarot's second tower, 60 seeds, his alone", () => {
  assert.deepEqual(KEEPER_TOWERS.quack, ["quackliber", "geese", "pamphlet", "driver"]);
  assert.equal(TOWERS.geese.cost, 60);
  const other = createWorld(() => {}, { meta: EMPTY_META });
  other.openSetup();
  other.chooseHero("mynxi");
  other.beginNight();
  other.chooseBuild("geese");
  assert.notEqual(other.world.hud.build, "geese");
});

test("on Auto it goes off by itself near the door: fruit in the ring are thrown back, then it's gone", () => {
  const api = start();
  const w = api.world;
  buildByDoor(api);
  api.startWave();
  let fired = false;
  for (let i = 0; i < 60 * 120 && w.hud.phase === "combat" && !fired; i++) {
    const before = new Map(w.enemies.map((e) => [e.id, along(api, e)]));
    stepWorld(w, 1 / 60);
    if (!w.towers.some((t) => t.kind === "geese")) {
      fired = true;
      const moved = w.enemies.filter((e) => before.has(e.id) && before.get(e.id)! - along(api, e) > CELL);
      assert.ok(moved.length > 0, "something was thrown back more than a tile");
      for (const e of moved) assert.ok(before.get(e.id)! - along(api, e) <= CANNON.geeseShove + 4, "no farther than three tiles");
    }
  }
  assert.ok(fired, "it went off");
  assert.equal(w.hud.geeseSpent, true);
  assert.match(w.hud.log, /Anti-Geese Protocol/);
});

test("on Manual it waits for Engage; Engage with nothing in the ring does nothing", () => {
  const api = start();
  const w = api.world;
  const t = buildByDoor(api);
  api.pointer(t.x, t.y, "down");
  api.setTrigger("manual");
  assert.equal(t.trigger, "manual");
  api.startWave();
  w.hud.selected = t.id;
  api.engage();
  assert.ok(w.towers.includes(t), "nothing in range yet, so it stays");
  assert.match(w.hud.log, /Nothing in the ring/);
  // Let fruit walk all the way to the door: on Manual it never goes off by itself.
  let inRing = false;
  for (let i = 0; i < 60 * 120 && w.hud.phase === "combat" && !inRing; i++) {
    stepWorld(w, 1 / 60);
    inRing = w.enemies.some((e) => e.hp > 0 && Math.hypot(e.x - t.x, e.y - t.y) <= api.statsOf(t.id)!.range - 4);
  }
  assert.ok(inRing, "a fruit reached the ring");
  for (let i = 0; i < 10; i++) stepWorld(w, 1 / 60);
  assert.ok(w.towers.includes(t), "still standing on Manual");
  w.hud.selected = t.id;
  api.engage();
  assert.ok(!w.towers.includes(t), "Engage set it off");
});

test("once spent it can't be rebuilt until the wave is over", () => {
  const api = start();
  const w = api.world;
  const t = buildByDoor(api);
  api.startWave();
  for (let i = 0; i < 60 * 120 && w.towers.includes(t); i++) stepWorld(w, 1 / 60);
  assert.ok(!w.towers.includes(t));
  api.chooseBuild("geese");
  const n = w.towers.length;
  api.pointer(t.x, t.y, "down");
  assert.equal(w.towers.length, n, "spent this wave");
  assert.match(w.hud.log, /spent/);
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  assert.notEqual(w.hud.phase, "combat");
  assert.equal(w.hud.geeseSpent, false);
  if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
  api.chooseBuild("geese");
  api.pointer(t.x, t.y, "down");
  assert.ok(w.towers.some((x) => x.kind === "geese"), "rebuilt after the wave");
});

test("a boss in the ring takes the knock but isn't thrown back", () => {
  const api = start();
  const w = api.world;
  const t = buildByDoor(api);
  api.pointer(t.x, t.y, "down");
  api.setTrigger("manual");
  api.startWave();
  let boss: Fruit | undefined;
  for (let i = 0; i < 60 * 30 && !boss; i++) {
    stepWorld(w, 1 / 60);
    boss = w.enemies.find((e) => e.hp > 0);
  }
  assert.ok(boss);
  boss.boss = true;
  boss.freeze = 999;
  boss.x = t.x;
  boss.y = t.y + 10;
  const at = { x: boss.x, y: boss.y, hp: boss.hp };
  w.hud.selected = t.id;
  api.engage();
  assert.ok(!w.towers.includes(t), "it went off");
  assert.equal(boss.x, at.x);
  assert.equal(boss.y, at.y);
  assert.ok(boss.hp < at.hp, "but it took the knock");
});
