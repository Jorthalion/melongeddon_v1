import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  BOARDS,
  CELL,
  NATIVES,
  bayShelves,
  buildBoard,
  buildRoutes,
  createWorld,
  emptyProgress,
  openMaps,
  pathFor,
  roomFor,
  shelfCells,
  stepWorld,
  type HeroId,
} from "../src/game/engine.ts";

const board = BOARDS.compact;
const centre = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
const AISLES = [2, 5, 8];

function start(hero: HeroId = "mynxi") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map: "compact", hero } });
  api.openSetup();
  api.chooseHero(hero);
  if (hero === "michael") api.pickOath("azure");
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Play out the wave in progress with no fruit left standing, and land on the next break. */
function finishWave(api: Api) {
  const w = api.world;
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  for (let guard = 0; guard < 5 && w.hud.phase !== "prep"; guard++) {
    if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
    else if (w.hud.phase === "consequence") api.startWave();
    else break;
  }
}

test("all nine paths run from the west door to the east door, through each bay's open aisle", () => {
  const lengths = new Map<string, number>();
  for (const a of AISLES)
    for (const b of AISLES) {
      const corners = pathFor(board, [a, b]);
      assert.deepEqual(corners[0], [0, 9], `${a},${b} starts at the west door`);
      assert.deepEqual(corners[corners.length - 1], [19, 2], `${a},${b} ends at the east door`);
      // Every corner joined by a straight run (buildBoard throws on anything else).
      for (let i = 0; i < corners.length - 1; i++)
        assert.ok(corners[i][0] === corners[i + 1][0] || corners[i][1] === corners[i + 1][1], `${a},${b}: straight between corners`);
      const cells = buildBoard(corners).cells;
      for (let c = 4; c <= 9; c++) assert.ok(cells.has(`${c},${a}`), `bay A's aisle ${a} is carpet`);
      for (let c = 13; c <= 18; c++) assert.ok(cells.has(`${c},${b}`), `bay B's aisle ${b} is carpet`);
      const shelves = bayShelves(board, [a, b]);
      for (const k of shelves) assert.ok(!cells.has(k), `${k} is shelving, not carpet`);
      assert.equal(shelves.size, 2 * (6 * 9 - 6));
      lengths.set(`${a},${b}`, cells.size);
    }
  const all = [...lengths.values()];
  assert.equal(lengths.get("8,2"), Math.min(...all), "bottom then top is (one of) the shortest");
  assert.equal(lengths.get("2,8"), Math.max(...all), "top then bottom is the longest");
  assert.ok(Math.max(...all) > Math.min(...all), "the cranks change the path's length");
  assert.deepEqual(pathFor(board, [5, 5]), board.corners, "the opening carpet is middle and middle");
});

test("a crank opens the next aisle (top, middle, bottom, top), once a break, never in a wave or on a jammed bay", () => {
  const api = start();
  const w = api.world;
  assert.deepEqual(w.hud.aisles, [5, 5]);
  const seen: number[] = [];
  for (let i = 0; i < 3; i++) {
    w.hud.cranked = false;
    api.crank(0);
    seen.push(w.hud.aisles[0]);
  }
  assert.deepEqual(seen, [8, 2, 5], "middle → bottom → top → middle");
  w.hud.cranked = false;
  api.crank(1);
  assert.deepEqual(w.hud.aisles, [5, 8]);
  api.crank(0);
  assert.deepEqual(w.hud.aisles, [5, 8], "one crank a break");
  w.hud.cranked = false;
  w.hud.jammed = [0];
  api.crank(0);
  assert.equal(w.hud.aisles[0], 5, "a jammed bay won't turn");
  assert.match(api.crankPreview(0).why, /Jammed/);
  w.hud.jammed = [];
  api.startWave();
  api.crank(0);
  assert.equal(w.hud.aisles[0], 5, "not during a wave");
  finishWave(api);
  assert.equal(w.hud.cranked, false, "free again next break");
  api.crank(0);
  assert.equal(w.hud.aisles[0], 8);
  api.restartNight();
  assert.deepEqual(w.hud.aisles, [5, 5], "a new night starts middle and middle");
});

test("after a crank the carpet, shelves and routes follow, and fruit walk the new path", () => {
  const api = start();
  const w = api.world;
  api.crank(0);
  assert.ok(w.pathCells.has("6,8") && !w.pathCells.has("6,5"), "bay A: bottom aisle open, middle shut");
  assert.ok(w.shelfCells.has("6,5") && !w.shelfCells.has("6,8"));
  assert.deepEqual(w.routes[0], buildRoutes({ ...board, corners: pathFor(board, [8, 5]) }).points);
  // Nothing can be built in a bay or on a track tile a crank could cover.
  api.chooseBuild("melon");
  for (const [c, r] of [[6, 5], [6, 3], [11, 3], [2, 4], [19, 6], [6, 10]] as Array<[number, number]>) {
    const n = w.towers.length;
    api.pointer(centre(c, r).x, centre(c, r).y, "down");
    assert.equal(w.towers.length, n, `nothing built at ${c},${r}`);
  }
  api.dismissSelection();
  api.startWave();
  let onNew = false;
  for (let i = 0; i < 60 * 60 && !onNew && w.hud.phase === "combat"; i++) {
    stepWorld(w, 1 / 60);
    onNew = w.enemies.some((e) => Math.floor(e.y / CELL) === 8 && Math.floor(e.x / CELL) >= 4 && Math.floor(e.x / CELL) <= 9);
    assert.ok(!w.enemies.some((e) => Math.floor(e.y / CELL) === 5 && Math.floor(e.x / CELL) >= 4 && Math.floor(e.x / CELL) <= 9), "nobody in the shut middle aisle");
  }
  assert.ok(onNew, "fruit walk bay A's bottom aisle");
});

test("'first' follows the new carpet", () => {
  const api = start();
  const w = api.world;
  api.crank(0);
  api.chooseBuild("melon");
  api.pointer(centre(10, 6).x, centre(10, 6).y, "down");
  api.dismissSelection();
  const cannon = w.towers.find((t) => t.kind === "melon")!;
  assert.ok(cannon);
  api.startWave();
  for (let i = 0; i < 60 * 30 && w.enemies.filter((e) => e.hp > 0).length < 2; i++) stepWorld(w, 1 / 60);
  const [a, b] = w.enemies.slice(0, 2) as Fruit[];
  w.enemies = [a, b];
  const still = { hp: 9999, maxHp: 9999, speed: 0, guard: "none", shell: 0, boss: false, freeze: 0, chill: 0, reverse: false } as const;
  const pts = w.points;
  const wpOf = (c: number, r: number) => pts.findIndex((p) => p.x === centre(c, r).x && p.y === centre(c, r).y);
  // A at the end of bay A's bottom aisle (9,8); B further on, up the corridor at (11,6).
  Object.assign(a, still, { wp: wpOf(11, 8), ...centre(9, 8) });
  Object.assign(b, still, { wp: wpOf(11, 5), ...centre(11, 6) });
  for (let i = 0; i < 60 * 3; i++) stepWorld(w, 1 / 60);
  assert.ok(b.hp < 9999, "the fruit further along the new carpet is shot first");
  assert.equal(a.hp, 9999);
});

test("a Dragon Gate whose carpet rolls away goes idle, the preview warns first, and it wakes when the carpet comes back", () => {
  const api = start("michael");
  const w = api.world;
  w.hud.hoard = 9999;
  api.chooseBuild("gourdgate");
  api.pointer(centre(10, 4).x, centre(10, 4).y, "down");
  api.dismissSelection();
  const gate = w.towers.find((t) => t.kind === "gourdgate")!;
  assert.ok(gate, "gate built beside the middle carpet");
  const before = { aisles: [...w.hud.aisles], cells: w.pathCells.size };
  const p = api.crankPreview(0);
  assert.deepEqual(p.idle, [gate.id], "the preview names the gate");
  assert.notDeepEqual(p.corners, pathFor(board, [5, 5]), "and the new carpet");
  assert.equal(p.from, w.pathCells.size, "and the length now");
  assert.deepEqual(w.hud.aisles, before.aisles, "the preview changes nothing");
  assert.equal(w.pathCells.size, before.cells);
  api.crank(0);
  assert.equal(gate.idle, true, "idle once its carpet rolled away");
  api.startWave();
  for (let i = 0; i < 60 * 40 && w.hud.phase === "combat"; i++) stepWorld(w, 1 / 60);
  assert.ok(!gate.gate, "an idle gate never picks a spot");
  finishWave(api);
  api.crank(0);
  assert.equal(w.hud.aisles[0], 2, "bay A on its top aisle: the corridor runs past the gate again");
  assert.equal(gate.idle, false, "awake again");
  api.startWave();
  for (let i = 0; i < 60 * 20 && !gate.gate && w.hud.phase === "combat"; i++) stepWorld(w, 1 / 60);
  assert.ok(gate.gate, "it finds its new portcullis spot");
  const spot = gate.gate as unknown as { x: number; y: number };
  assert.ok(w.pathCells.has(`${Math.floor(spot.x / CELL)},${Math.floor(spot.y / CELL)}`), "on the carpet");
});

test("a Bookworm Gourd in a bay can't be aimed at, splash reaches it, outside it's ordinary, and walking out jams the bay", () => {
  const api = start();
  const w = api.world;
  api.chooseBuild("melon");
  api.pointer(centre(10, 4).x, centre(10, 4).y, "down");
  api.dismissSelection();
  assert.ok(w.towers.some((t) => t.kind === "melon"));
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const worm = w.enemies[0] as Fruit;
  w.enemies = [worm];
  const still = { hp: 9999, maxHp: 9999, speed: 0, guard: "none", shell: 0, boss: false, freeze: 0, chill: 0, native: "wormgourd" } as const;
  const wpOf = (c: number, r: number) => w.points.findIndex((p) => p.x === centre(c, r).x && p.y === centre(c, r).y);
  Object.assign(worm, still, { wp: wpOf(19, 5), ...centre(8, 5) });
  for (let i = 0; i < 60 * 3; i++) stepWorld(w, 1 / 60);
  assert.equal(worm.hp, 9999, "the melon cannon can't aim at it in the shelves");
  // A mortar's lob reaches it.
  api.chooseBuild("mortar");
  api.pointer(centre(10, 6).x, centre(10, 6).y, "down");
  api.dismissSelection();
  for (let i = 0; i < 60 * 4; i++) stepWorld(w, 1 / 60);
  assert.ok(worm.hp < 9999, "the mortar's splash does");
  // Out in the corridor it's an ordinary fruit.
  for (const t of w.towers) if (t.kind === "mortar") t.cd = 999;
  const hp = worm.hp;
  Object.assign(worm, { ...centre(11, 5) });
  for (let i = 0; i < 60 * 3; i++) stepWorld(w, 1 / 60);
  assert.ok(worm.hp < hp, "the melon cannon hits it in the corridor");
  // Walking out of a bay alive jams it.
  Object.assign(worm, { hp: 9999, speed: 60, ...centre(8, 5), bay: undefined });
  for (let i = 0; i < 60 * 3 && Math.floor(worm.x / CELL) <= 9; i++) stepWorld(w, 1 / 60);
  for (const t of w.towers) t.cd = 999;
  w.enemies = [];
  finishWave(api);
  assert.deepEqual(w.hud.jammed, [0], "bay A jammed for this break");
  assert.equal(w.runLog.jams, 1);
});

test("a Bookworm Queen's cocoon hatches two if left alone, and none if fire reaches it", () => {
  for (const burn of [false, true]) {
    const api = start();
    const w = api.world;
    // A melon cannon in the corridor pops her (out of the shelves, so it can aim at her).
    api.chooseBuild("melon");
    api.pointer(centre(10, 6).x, centre(10, 6).y, "down");
    api.dismissSelection();
    const cannon = w.towers.find((t) => t.kind === "melon")!;
    api.startWave();
    for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
    const queen = w.enemies[0] as Fruit;
    w.enemies = [queen];
    const wpOf = (c: number, r: number) => w.points.findIndex((p) => p.x === centre(c, r).x && p.y === centre(c, r).y);
    Object.assign(queen, { native: "wormqueen", speed: 0, guard: "none", shell: 0, ...centre(11, 5), wp: wpOf(19, 5), hp: 1, maxHp: 1 });
    for (let i = 0; i < 60 * 3 && !w.cocoons.length; i++) stepWorld(w, 1 / 60);
    assert.equal(w.cocoons.length, 1, "a cocoon where she popped");
    cannon.cd = 9999;
    const k = w.cocoons[0];
    if (burn) w.pools.push({ x: k.x, y: k.y, r: 34, life: 2, max: 2, hot: true, burn: 22 } as never);
    for (let i = 0; i < 60 * (NATIVES.cocoonTime + 0.5); i++) {
      stepWorld(w, 1 / 60);
      for (const e of w.enemies) e.speed = 0;
    }
    const hatched = w.enemies.filter((e) => e.native === "wormgourd").length;
    assert.equal(hatched, burn ? 0 : NATIVES.cocoonHatch, burn ? "burnt away" : "two hatch");
  }
});

test("the Compact Stacks is unlocked by its own Catalogue room; other maps keep their boards and shelves", () => {
  assert.equal(roomFor("map", "compact")?.id, "compact");
  assert.ok(openMaps(["stacks", "compact"]).includes("compact"));
  assert.ok(!openMaps(["stacks"]).includes("compact"));
  for (const map of ["stacks", "rotunda", "halldoors", "greathall"] as const) {
    assert.deepEqual(pathFor(BOARDS[map], [2, 8]), BOARDS[map].corners, `${map}: no bays, its own carpet`);
    const built = buildRoutes(BOARDS[map]);
    const a = shelfCells(map, built.cells, built.verge);
    const b = shelfCells(map, built.cells, built.verge, [2, 8]);
    assert.deepEqual([...a].sort(), [...b].sort(), `${map}: shelves don't depend on aisles`);
  }
});
