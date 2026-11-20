import { test } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENT } from "../src/game/achievements.ts";
import {
  ALL_UNLOCKED,
  BOARDS,
  CELL,
  assignDoors,
  boardLegs,
  buildRoutes,
  carpetInReach,
  carpetInReachAll,
  carpetLegs,
  createWorld,
  emptyProgress,
  openDoors,
  openMaps,
  roomFor,
  stepWorld,
  waveQueue,
  type SpawnSpec,
} from "../src/game/engine.ts";

const board = BOARDS.rotunda;
const centre = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

function start(hero: "mynxi" | "quack" = "mynxi") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map: "rotunda", hero } });
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Play waves until `n` are cleared (fruit removed as they come; first pick each time). */
function clearWaves(api: Api, n: number) {
  const w = api.world;
  for (let guard = 0; guard < 400 && w.hud.wave <= n; guard++) {
    if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
    else if (w.hud.phase === "prep" || w.hud.phase === "consequence") {
      api.startWave();
      for (let i = 0; i < 60 * 240 && (w.hud.phase as string) === "combat"; i++) {
        w.enemies.length = 0;
        stepWorld(w, 1 / 60);
      }
    } else break;
  }
}

test("the Rotunda builds a route per door: each from its door to the exit, sharing the trunk", () => {
  const built = buildRoutes(board);
  assert.equal(built.routes.length, 3);
  const exit = centre(17, 3);
  const doors: Array<[number, number]> = [[5, 0], [0, 8], [2, 11]];
  built.routes.forEach((r, i) => {
    assert.deepEqual(r[0], centre(...doors[i]), `route ${i} starts at its door`);
    assert.deepEqual(r[r.length - 1], exit, `route ${i} ends at the exit`);
  });
  // North and west both run the whole trunk from the desk (10,8); the stairs join it at (10,10).
  const trunk = buildRoutes({ ...board, doors: undefined }).points;
  assert.deepEqual(built.routes[0].slice(-trunk.length), trunk);
  assert.deepEqual(built.routes[1].slice(-trunk.length), trunk);
  assert.deepEqual(built.routes[2].slice(-(trunk.length - 1)), trunk.slice(1));
  // Segments count each tile once: three door carpets and the trunk.
  assert.equal(built.segments.length, 4);
  // A one-door board is untouched: one route, its own carpet.
  const stacks = buildRoutes(BOARDS.stacks);
  assert.equal(stacks.routes.length, 1);
  assert.equal(stacks.routes[0], stacks.points);
});

test("groups alternate doors; a lone group alternates its fruit; bosses use north; the stairs only from wave 11", () => {
  const g = (kind: SpawnSpec["kind"], count = 3): SpawnSpec => ({ kind, count, every: 1 });
  assert.deepEqual(assignDoors([g("melon"), g("corn"), g("melon")], board, 1), [[0, 0, 0], [1, 1, 1], [0, 0, 0]]);
  assert.deepEqual(assignDoors([g("melon", 4)], board, 1), [[0, 1, 0, 1]]);
  assert.deepEqual(assignDoors([g("melon"), g("karl", 1), g("corn")], board, 5), [[0, 0, 0], [0], [1, 1, 1]], "Karl walks the north door");
  assert.deepEqual(openDoors(board, 10), [0, 1]);
  assert.deepEqual(openDoors(board, 11), [0, 1, 2]);
  const late = assignDoors([g("melon"), g("corn"), g("pumpkin"), g("melon")], board, 11)!;
  assert.deepEqual(late.map((d) => d[0]), [0, 1, 2, 0], "the stairs join the turn, never first");
  assert.ok(!assignDoors([g("melon"), g("corn"), g("pumpkin")], board, 10)!.flat().includes(2), "no stairs before wave 11");
  assert.equal(assignDoors([g("melon")], BOARDS.stacks, 1), undefined, "one-door boards have no doors to pick");
});

test("each door keeps its own spacing, so groups at two doors walk in together", () => {
  const spawns: SpawnSpec[] = [{ kind: "melon", count: 3, every: 1 }, { kind: "corn", count: 3, every: 1 }];
  const q = waveQueue(spawns, assignDoors(spawns, board, 1));
  const firstAt = (route: number) => Math.min(...q.filter((x) => x.route === route).map((x) => x.t));
  assert.equal(firstAt(0), firstAt(1));
  // Without doors the second group waits for the first, as before.
  const plain = waveQueue(spawns);
  assert.ok(plain.find((x) => x.kind === "corn")!.t > plain.find((x) => x.kind === "melon")!.t);
  assert.ok(plain.every((x) => x.route === undefined));
});

test("fruit walk in by their own door, and a leak is counted by the door it came through", () => {
  const api = start();
  const w = api.world;
  api.startWave();
  const seen = new Set<number>();
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    stepWorld(w, 1 / 60);
    for (const e of w.enemies) {
      seen.add(e.route ?? 0);
      // A west fruit stays on row 8 until the desk; a north fruit stays in column 5 until its first turn.
      if ((e.route ?? 0) === 1 && e.x < centre(10, 8).x - 1) assert.ok(Math.abs(e.y - centre(0, 8).y) < 1, "west fruit on the west carpet");
      if ((e.route ?? 0) === 0 && e.y < centre(5, 4).y - 1 && e.x < centre(10, 4).x) assert.ok(Math.abs(e.x - centre(5, 0).x) < 1, "north fruit on the north carpet");
    }
  }
  assert.ok(seen.has(0) && seen.has(1), "both doors used on wave 1");
  assert.ok((w.runLog.leaksByDoor.north ?? 0) > 0 && (w.runLog.leaksByDoor.west ?? 0) > 0, JSON.stringify(w.runLog.leaksByDoor));
  assert.ok(w.hud.lives < 999);
});

test("targeting compares fruit on different routes by distance to the stacks", () => {
  const api = start();
  const w = api.world;
  api.chooseBuild("melon");
  const at = centre(11, 7);
  api.pointer(at.x, at.y, "down");
  api.dismissSelection();
  const cannon = w.towers.find((t) => t.kind === "melon");
  assert.ok(cannon, "cannon built in the pocket");
  api.startWave();
  for (let i = 0; i < 60 * 30 && w.enemies.filter((e) => e.hp > 0).length < 2; i++) stepWorld(w, 1 / 60);
  const [a, b] = w.enemies.slice(0, 2) as Fruit[];
  w.enemies = [a, b];
  const still = { hp: 9999, maxHp: 9999, speed: 0, guard: "none", shell: 0, boss: false, freeze: 0, chill: 0, reverse: false } as const;
  // A: north route, two tiles above the desk (18 tiles to go). B: west route, one tile before the desk (17 to go).
  Object.assign(a, still, { route: 0, wp: 3, ...centre(10, 6) });
  Object.assign(b, still, { route: 1, wp: 1, ...centre(9, 8) });
  for (let i = 0; i < 60 * 3; i++) stepWorld(w, 1 / 60);
  assert.ok(b.hp < 9999, "the west fruit, closer to the stacks, is shot first");
  assert.equal(a.hp, 9999, "the north fruit (a bigger waypoint number, but further away) waits");
});

test("walked back (Instant Quackmission), a fruit goes back along its own door's carpet and stops at that door", () => {
  const api = start("quack");
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.some((e) => (e.route ?? 0) === 1); i++) stepWorld(w, 1 / 60);
  const e = w.enemies.find((x) => (x.route ?? 0) === 1)!;
  w.enemies = [e];
  Object.assign(e, { hp: 9999, maxHp: 9999, wp: 1, driven: 30, ...centre(6, 8) });
  for (let i = 0; i < 60 * 20; i++) {
    stepWorld(w, 1 / 60);
    assert.ok(Math.abs(e.y - centre(0, 8).y) < 1, "it stays on the west carpet");
  }
  assert.ok(Math.abs(e.x - centre(0, 8).x) < 1, "and waits at the west door");
});

test("the Post's straights: every door's carpet and the trunk, each numbered once", () => {
  const api = start();
  const legs = boardLegs(api.world);
  const want = buildRoutes(board).segments.reduce((n, s) => n + carpetLegs(s).length, 0);
  assert.equal(legs.length, want);
  // A one-door board keeps its own numbering.
  const plain = createWorld(() => {}, { meta: ALL_UNLOCKED, setup: { night: "midnight", map: "stacks" } });
  assert.deepEqual(boardLegs(plain.world), carpetLegs(plain.world.points));
});

test("the reach preview counts the trunk once", () => {
  const api = start();
  const w = api.world;
  const at = centre(12, 9);
  const range = api.previewStats("melon", { c: 12, r: 9 }).range;
  api.chooseBuild("melon");
  api.pointer(at.x, at.y, "down");
  api.dismissSelection();
  const t = w.towers.find((x) => x.kind === "melon")!;
  const tiles = api.reachOf(t.id)!.tiles as number;
  const half = (px: number) => Math.round((px / CELL) * 2) / 2;
  assert.equal(tiles, half(carpetInReachAll(w.segments, at.x, at.y, range).length));
  // Counted route by route, the trunk beside (12,9) would be counted once for each open door.
  const perRoute = w.routes.slice(0, 2).reduce((n, r) => n + carpetInReach(r, at.x, at.y, range).length, 0);
  assert.ok(half(perRoute) > tiles, `${half(perRoute)} vs ${tiles}`);
});

test("the back stairs are boarded until wave 11: heard after wave 9, open after wave 10", () => {
  const api = start();
  const w = api.world;
  const stairs = w.doors.find((d) => d.id === "stairs")!;
  assert.equal(stairs.open, false);
  assert.equal(w.segments.length, 3, "two open doors and the trunk");
  // Closed or not, its tiles are carpet: nothing can be built on them.
  api.chooseBuild("melon");
  const before = w.towers.length;
  const tile = centre(5, 10);
  api.pointer(tile.x, tile.y, "down");
  assert.equal(w.towers.length, before, "no building on the boarded stairs' carpet");
  api.dismissSelection();
  clearWaves(api, 9);
  assert.match(w.hud.log, /boards off the back stairs/);
  assert.equal(stairs.open, false);
  clearWaves(api, 10);
  assert.match(w.hud.log, /back stairs are open/);
  assert.equal(stairs.open, true);
  assert.equal(w.segments.length, 4);
});

test("the Rotunda is unlocked by its own Catalogue room, and Every Door Watched needs a clean west door", () => {
  assert.equal(roomFor("map", "rotunda")?.id, "rotunda");
  assert.ok(openMaps(["stacks", "rotunda"]).includes("rotunda"));
  assert.ok(!openMaps(["stacks"]).includes("rotunda"));
  const a = ACHIEVEMENT["every-door"];
  const ctx = (won: boolean, west: number, night = "midnight", map = "rotunda") =>
    ({ won, night, map, log: { leaksByDoor: west ? { west } : { north: 3 } } }) as unknown as Parameters<typeof a.check>[0];
  assert.equal(a.check(ctx(true, 0)), true);
  assert.equal(a.check(ctx(true, 1)), false);
  assert.equal(a.check(ctx(false, 0)), false);
  assert.equal(a.check(ctx(true, 0, "endless")), false);
  assert.equal(a.check(ctx(true, 0, "midnight", "stacks")), false);
});
