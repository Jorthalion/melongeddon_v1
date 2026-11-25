import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, BOARDS, CELL, EMPTY_META, LOOP, PICKABLE_MAPS, STATS, TEST_MAPS, boardSize, buildRoutes, createWorld, openMaps, roomFor, shelfCells, stepWorld, takesShortcut } from "../src/game/engine.ts";

const centre = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
const tiles = (points: Array<{ x: number; y: number }>) => {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return d / CELL;
};

/** A night on the Cloister (the simulator's way in: everything open), at prep with plenty of stacks. */
function start() {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, allTricks: true });
  api.openSetup();
  api.chooseMap("loop");
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Start a wave and return its first fruit, made still and tough, with everything else cleared away. */
function oneFruit(api: Api): Fruit {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.some((e) => e.hp > 0); i++) stepWorld(w, 1 / 60);
  const e = w.enemies.find((f) => f.hp > 0)!;
  w.enemies = [e];
  Object.assign(e, { hp: 9999, maxHp: 9999, boss: false, borrower: false });
  return e;
}

/** Put a fruit just short of the end of the first lap (the junction), walking toward it. */
function atJunction(api: Api, e: Fruit) {
  const from = BOARDS.loop.shortcut!.from;
  const j = centre(6, 6);
  Object.assign(e, { x: j.x, y: j.y + 6, wp: from, reverse: false, route: 0 });
  for (let i = 0; i < 30 && e.wp <= from; i++) stepWorld(api.world, 1 / 60);
}

test("the Cloister is a room of its own: 22 x 14, opened by restoring it in the Grand Catalogue", () => {
  assert.equal(BOARDS.loop.name, "The Cloister");
  assert.ok(PICKABLE_MAPS.includes("loop"));
  assert.ok(!TEST_MAPS.includes("loop"), "not a test room any more");
  assert.deepEqual(Object.values(boardSize("loop")).slice(0, 2), [22, 14]);
  assert.equal(roomFor("map", "loop")?.id, "loop");
  assert.ok(openMaps(["stacks", "loop"]).includes("loop"));
  assert.ok(!openMaps(["stacks"]).includes("loop"));
  const locked = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks"] as never });
  locked.openSetup();
  locked.chooseMap("loop");
  assert.notEqual(locked.world.hud.map, "loop", "locked until the room is restored");
  const open = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks", "loop"] as never });
  open.openSetup();
  open.chooseMap("loop");
  assert.equal(open.world.hud.map, "loop");
});

test("two routes: the whole carpet (two laps) and the shortcut after one lap, sharing every point to the junction", () => {
  const built = buildRoutes(BOARDS.loop);
  assert.equal(built.routes.length, 2);
  const [full, cut] = built.routes;
  const from = BOARDS.loop.shortcut!.from;
  assert.deepEqual(full.slice(0, from + 1), cut.slice(0, from + 1), "the same carpet up to the end of the first lap");
  assert.deepEqual(full[from], centre(6, 6), "the junction is the ring's left side");
  // Both end at the east door, and the second lap is the whole difference.
  assert.deepEqual(full.at(-1), centre(21, 6));
  assert.deepEqual(cut.at(-1), centre(21, 6));
  const ring = 2 * (9 + 5);
  assert.equal(Math.round(tiles(full)), 6 + ring + ring + 15);
  assert.equal(Math.round(tiles(cut)), 6 + ring + 15);
  // Segments count each tile once: one lap and the crossing.
  assert.equal(Math.round(built.segments.reduce((n, s) => n + tiles(s), 0)), 6 + ring + 15);
});

test("no shelf or Sir Michael tile is on the carpet, and the inside of the ring is open floor", () => {
  const built = buildRoutes(BOARDS.loop);
  const path = new Set(built.cells);
  const shelves = shelfCells("loop", path, new Set(built.verge));
  assert.equal(shelves.size, BOARDS.loop.shelves!.length);
  const [mc, mr] = BOARDS.loop.michaelCannon;
  assert.ok(!path.has(`${mc},${mr}`) && !shelves.has(`${mc},${mr}`));
  for (let c = 7; c <= 14; c++)
    for (const r of [5, 7, 8]) assert.ok(!path.has(`${c},${r}`) && !shelves.has(`${c},${r}`), `inside ${c},${r} is open`);
});

test("who takes the shortcut: fast fruit or never-hit fruit, never a boss", () => {
  assert.equal(LOOP.fastSpeed, 60);
  assert.ok(STATS.corn.speed >= LOOP.fastSpeed && STATS.melon.speed < LOOP.fastSpeed);
  assert.equal(takesShortcut({ kind: "melon", hp: 30, maxHp: 30 }), true, "a melon nobody has hit");
  assert.equal(takesShortcut({ kind: "melon", hp: 29, maxHp: 30 }), false, "a melon that's been hit walks the second lap");
  assert.equal(takesShortcut({ kind: "corn", hp: 1, maxHp: 30 }), true, "corn is fast: it cuts across whatever you do");
  assert.equal(takesShortcut({ kind: "karl", hp: 460, maxHp: 460, boss: true }), false, "bosses never do");
});

test("in a night: an unhurt fruit cuts across at the end of the first lap; a hit one walks the second lap", () => {
  const api = start();
  const fresh = oneFruit(api);
  Object.assign(fresh, { kind: "melon" });
  atJunction(api, fresh);
  assert.equal(fresh.route, 1, "it took the shortcut");
  assert.equal(api.world.runLog.shortcuts, 1);
  assert.match(api.world.hud.log, /cut across the middle/);
  // On the shortcut its next stop is the east door, straight across.
  assert.deepEqual(api.world.routes[1][fresh.wp], centre(21, 6));

  const hit = oneFruit(api);
  Object.assign(hit, { kind: "melon", hp: 5000 });
  atJunction(api, hit);
  assert.equal(hit.route ?? 0, 0, "it stays on the whole carpet");
  assert.deepEqual(api.world.routes[0][hit.wp], centre(6, 4), "and heads up the ring for its second lap");
});

test("a fruit on the second lap passes the junction again without switching", () => {
  const api = start();
  const e = oneFruit(api);
  Object.assign(e, { kind: "melon" });
  // At the end of the second lap (corner 11, the same tile as the junction), unhurt or not, it just walks out.
  const j = centre(6, 6);
  Object.assign(e, { x: j.x, y: j.y + 6, wp: 11, reverse: false, route: 0 });
  for (let i = 0; i < 30 && e.wp <= 11; i++) stepWorld(api.world, 1 / 60);
  assert.equal(e.route ?? 0, 0);
  assert.deepEqual(api.world.routes[0][e.wp], centre(21, 6));
});
