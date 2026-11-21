import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  BOARDS,
  CELL,
  HALL,
  assignDoors,
  assignExits,
  boardLegs,
  buildRoutes,
  carpetLegs,
  createWorld,
  emptyProgress,
  openDoors,
  openMaps,
  roomFor,
  stepWorld,
  type SpawnSpec,
} from "../src/game/engine.ts";

const board = BOARDS.halldoors;
const centre = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
const EXITS = ["reading", "kitchens", "restricted"] as const;

function start(hero: "mynxi" | "quack" = "mynxi") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map: "halldoors", hero } });
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

/** Every tile a run of corners covers, once each. */
function tiles(corners: Array<[number, number]>) {
  const out: string[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const [c0, r0] = corners[i];
    const [c1, r1] = corners[i + 1];
    const n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let s = i === 0 ? 0 : 1; s <= n; s++) out.push(`${c0 + Math.sign(c1 - c0) * s},${r0 + Math.sign(r1 - r0) * s}`);
  }
  return out;
}

test("the Hall of Doors builds one route per entrance and exit: entrance, trunk, then that exit, out at the edge", () => {
  const built = buildRoutes(board);
  assert.equal(built.routes.length, 2 * 3);
  const doorStart = { west: centre(0, 6), lift: centre(2, 11) };
  const sign = centre(9, 6);
  built.routes.forEach((r, i) => {
    const door = built.doorOf[i]!;
    const exit = built.exitOf[i];
    const x = board.exits!.find((e) => e.id === exit)!;
    assert.deepEqual(r[0], doorStart[door as "west" | "lift"], `route ${i} starts at the ${door} door`);
    assert.deepEqual(r[r.length - 1], centre(...x.corners[x.corners.length - 1]), `route ${i} leaves by the ${exit}`);
    assert.ok(r.some((p) => p.x === sign.x && p.y === sign.y), `route ${i} passes the signpost`);
    const end = x.corners[x.corners.length - 1];
    assert.ok(end[0] === 0 || end[1] === 0 || end[0] === (board.cols ?? 0) - 1 || end[1] === (board.rows ?? 0) - 1, `${exit} ends on the edge`);
  });
  assert.deepEqual(built.doorOf, ["west", "west", "west", "lift", "lift", "lift"]);
  assert.deepEqual(built.exitOf, [...EXITS, ...EXITS]);
  // Segments: each door's own carpet, the trunk, then each exit's own; no tile counted twice except where pieces meet.
  assert.equal(built.segments.length, 2 + 1 + 3);
  const count = new Map<string, number>();
  for (const seg of [...board.doors!.map((d) => d.corners), board.corners, ...board.exits!.map((x) => x.corners)])
    for (const k of tiles(seg)) count.set(k, (count.get(k) ?? 0) + 1);
  const twice = [...count].filter(([, n]) => n > 1).map(([k]) => k);
  assert.deepEqual(twice.sort(), ["7,6", "9,6"], "only the join (7,6) and the signpost (9,6) are shared ends");
  // The Post's straights number each piece once.
  const api = start();
  assert.equal(boardLegs(api.world).length, built.segments.reduce((n, s) => n + carpetLegs(s).length, 0));
});

test("boards without exits build exactly the routes they did", () => {
  const rot = buildRoutes(BOARDS.rotunda);
  assert.equal(rot.routes.length, 3);
  assert.deepEqual(rot.doorOf, ["north", "west", "stairs"]);
  assert.deepEqual(rot.exitOf, []);
  const stacks = buildRoutes(BOARDS.stacks);
  assert.equal(stacks.routes.length, 1);
  assert.deepEqual(stacks.exitOf, []);
});

test("groups take the Reading Room and the Kitchens in turn; a boss always takes the Restricted Section", () => {
  const spawns: SpawnSpec[] = [
    { kind: "melon", count: 3, every: 1 },
    { kind: "corn", count: 2, every: 1 },
    { kind: "karl", count: 1, every: 1 },
    { kind: "pumpkin", count: 2, every: 1 },
  ];
  const exits = assignExits(spawns, board, null)!;
  assert.deepEqual(exits.map((g) => g[0]), [0, 1, 2, 0]);
  assert.ok(exits.every((g) => g.every((x) => x === g[0])), "a group keeps one exit");
  // A lone group alternates its fruit.
  assert.deepEqual(assignExits([{ kind: "melon", count: 4, every: 1 }], board, null), [[0, 1, 0, 1]]);
  // A board without exits has none to assign.
  assert.equal(assignExits(spawns, BOARDS.rotunda, null), undefined);
});

test("shutting the Kitchens sends every ordinary group to the Reading Room; the preview matches the wave", () => {
  const spawns: SpawnSpec[] = [
    { kind: "melon", count: 3, every: 1 },
    { kind: "corn", count: 2, every: 1 },
  ];
  assert.deepEqual(assignExits(spawns, board, "kitchens"), [[0, 0, 0], [0, 0]]);
  const api = start();
  const w = api.world;
  assert.equal(w.hud.shutExit, null);
  api.turnSign();
  assert.equal(w.hud.shutExit, "reading");
  api.turnSign();
  assert.equal(w.hud.shutExit, "kitchens");
  assert.match(w.hud.log, /Kitchens are closed for the next wave/);
  const preview = api.comingUp();
  assert.ok(preview.groups.length > 0);
  assert.ok(preview.groups.every((g) => g.exit === "reading" || g.exit === "restricted"), JSON.stringify(preview.groups.map((g) => g.exit)));
  // The wave uses the exits it previewed.
  api.startWave();
  const seen = new Set<string>();
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    stepWorld(w, 1 / 60);
    for (const e of w.enemies) seen.add(w.exits[w.routeExit[e.route ?? 0]]?.id ?? "?");
  }
  assert.ok(!seen.has("kitchens"), [...seen].join(","));
  assert.ok(seen.has("reading"));
  // It resets when the wave ends.
  assert.equal(w.hud.shutExit, null);
});

test("the signpost turns only between waves, and skips the Restricted Section when a boss is coming", () => {
  const api = start();
  const w = api.world;
  // Wave 1 has no boss: none → Reading → Kitchens → Restricted → none.
  const seen: Array<string | null> = [];
  for (let i = 0; i < 4; i++) {
    api.turnSign();
    seen.push(w.hud.shutExit);
  }
  assert.deepEqual(seen, ["reading", "kitchens", "restricted", null]);
  api.startWave();
  api.turnSign();
  assert.equal(w.hud.shutExit, null, "not during a wave");
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  // Find a wave with Karl in it and check the cycle there.
  for (let guard = 0; guard < 60; guard++) {
    if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
    else if (w.hud.phase === "prep" && api.comingUp().groups.some((g) => g.boss)) break;
    else clearWaves(api, w.hud.wave);
  }
  assert.ok(api.comingUp().groups.some((g) => g.boss), "found a boss wave");
  const cycle: Array<string | null> = [];
  for (let i = 0; i < 3; i++) {
    api.turnSign();
    cycle.push(w.hud.shutExit);
  }
  assert.deepEqual(cycle, ["reading", "kitchens", null]);
  assert.ok(api.comingUp().groups.filter((g) => g.boss).every((g) => g.exit === "restricted"), "the boss still takes the Restricted Section");
});

test("what a leak costs: a stack at the Reading Room, seeds at the Kitchens (a stack when short), double at the Restricted Section", () => {
  const api = start();
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const proto = w.enemies[0] as Fruit;
  w.enemies = [];
  const routeFor = (exit: string) => w.routeExit.findIndex((x, i) => w.exits[x].id === exit && w.routeDoor[i] === 0);
  /** Put a fruit one step from the end of its exit and let it leave. */
  const leak = (exit: string, extra: Partial<Fruit> = {}) => {
    const route = routeFor(exit);
    const pts = w.routes[route];
    const end = pts[pts.length - 1];
    const e = { ...structuredClone(proto), ...extra, route, wp: pts.length - 1, x: end.x, y: end.y + (end.y === pts[pts.length - 2].y ? 0 : 1), hp: 999, maxHp: 999 } as Fruit;
    if (end.y === pts[pts.length - 2].y) e.x = end.x - 1;
    w.enemies = [e];
    for (let i = 0; i < 30 && w.enemies.length; i++) stepWorld(w, 1 / 60);
  };
  let lives = w.hud.lives;
  let seeds = w.hud.seeds;
  leak("reading");
  assert.equal(lives - w.hud.lives, 1, "Reading Room: a stack");
  assert.equal(w.hud.seeds, seeds);
  lives = w.hud.lives;
  leak("kitchens");
  assert.equal(seeds - w.hud.seeds, HALL.kitchenSeeds, "Kitchens: 10 seeds");
  assert.equal(w.hud.lives, lives, "and no stack");
  w.hud.seeds = HALL.kitchenSeeds - 1;
  seeds = w.hud.seeds;
  leak("kitchens");
  assert.equal(lives - w.hud.lives, 1, "Kitchens with a short purse: a stack");
  assert.equal(w.hud.seeds, seeds);
  lives = w.hud.lives;
  leak("restricted", { boss: true, kind: "karl" });
  assert.equal(lives - w.hud.lives, 6, "a boss at the Restricted Section: twice its 3 stacks");
  assert.deepEqual(w.runLog.leaksByExit, { reading: 1, kitchens: 2, restricted: 1 });
});

test("the service lift opens at wave 8, and its fruit still split between the exits", () => {
  assert.deepEqual(openDoors(board, 7), [0]);
  assert.deepEqual(openDoors(board, 8), [0, 1]);
  const spawns: SpawnSpec[] = [
    { kind: "melon", count: 2, every: 1 },
    { kind: "corn", count: 2, every: 1 },
    { kind: "pumpkin", count: 2, every: 1 },
    { kind: "melon", count: 2, every: 1 },
  ];
  const doors = assignDoors(spawns, board, 8)!;
  const exits = assignExits(spawns, board, null)!;
  const pairs = new Set(doors.map((g, i) => `${g[0]}:${exits[i][0]}`));
  assert.ok([...pairs].some((p) => p.startsWith("1:")), "the lift is used");
  assert.ok(pairs.has("1:0") || pairs.has("1:1"), [...pairs].join(" "));
  const api = start();
  clearWaves(api, 7);
  assert.equal(api.world.doors[1].open, true, "open for wave 8");
});

test("towers read progress on every route: 'first' takes the fruit nearest its own exit", () => {
  const api = start();
  const w = api.world;
  api.chooseBuild("melon");
  const at = centre(10, 7);
  api.pointer(at.x, at.y, "down");
  api.dismissSelection();
  assert.ok(w.towers.some((t) => t.kind === "melon"), "built beside the signpost");
  api.startWave();
  for (let i = 0; i < 60 * 30 && w.enemies.filter((e) => e.hp > 0).length < 2; i++) stepWorld(w, 1 / 60);
  const [a, b] = w.enemies.slice(0, 2) as Fruit[];
  w.enemies = [a, b];
  const still = { hp: 9999, maxHp: 9999, speed: 0, guard: "none", shell: 0, boss: false, freeze: 0, chill: 0, reverse: false } as const;
  const route = (exit: string) => w.routeExit.findIndex((x, i) => w.exits[x].id === exit && w.routeDoor[i] === 0);
  const ra = route("reading");
  const rb = route("kitchens");
  // A: on the Reading Room's branch at (9,4): 2 + 3 + 3 = 8+ tiles to go. B: on the Kitchens' branch at (9,8): 1 + 3 + 2 = 6 to go.
  const wpOf = (r: number, p: { x: number; y: number }) => w.routes[r].findIndex((q) => q.y === p.y && q.x === p.x);
  Object.assign(a, still, { route: ra, wp: wpOf(ra, centre(9, 3)), ...centre(9, 4) });
  Object.assign(b, still, { route: rb, wp: wpOf(rb, centre(9, 9)), ...centre(9, 8) });
  for (let i = 0; i < 60 * 3; i++) stepWorld(w, 1 / 60);
  assert.ok(b.hp < 9999, "the Kitchens fruit, nearer its exit, is shot first");
  assert.equal(a.hp, 9999);
});

test("the Anti-Geese Protocol on Auto goes off for a fruit near any exit", () => {
  for (const exit of ["kitchens", "reading"] as const) {
    const api = start("quack");
    const w = api.world;
    const x = board.exits!.find((e) => e.id === exit)!;
    const end = x.corners[x.corners.length - 1];
    const prev = x.corners[x.corners.length - 2];
    // A tile beside the last stretch, one tile in from the edge.
    const step = [Math.sign(end[0] - prev[0]), Math.sign(end[1] - prev[1])];
    const near: [number, number] = [end[0] - step[0] + (step[0] ? 0 : 1), end[1] - step[1] + (step[1] ? 0 : 1)];
    api.chooseBuild("geese");
    api.pointer(centre(...near).x, centre(...near).y, "down");
    api.dismissSelection();
    assert.ok(w.towers.some((t) => t.kind === "geese"), `built by the ${exit}`);
    api.startWave();
    for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
    const e = w.enemies[0] as Fruit;
    w.enemies = [e];
    const route = w.routeExit.findIndex((xi, i) => w.exits[xi].id === exit && w.routeDoor[i] === 0);
    const pts = w.routes[route];
    const last = pts[pts.length - 1];
    const before = pts[pts.length - 2];
    const k = 1.5 * CELL / Math.hypot(last.x - before.x, last.y - before.y);
    Object.assign(e, { route, wp: pts.length - 1, hp: 9999, maxHp: 9999, speed: 0, x: last.x + (before.x - last.x) * k, y: last.y + (before.y - last.y) * k });
    for (let i = 0; i < 30; i++) stepWorld(w, 1 / 60);
    assert.equal(w.hud.geeseSpent, true, `went off by the ${exit}`);
  }
});

test("the Hall of Doors is unlocked by its own Catalogue room", () => {
  assert.equal(roomFor("map", "halldoors")?.id, "halldoors");
  assert.ok(openMaps(["stacks", "halldoors"]).includes("halldoors"));
  assert.ok(!openMaps(["stacks"]).includes("halldoors"));
});
