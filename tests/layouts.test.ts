import { test } from "node:test";
import assert from "node:assert/strict";
import { addNight, emptyLedger, emptyRunLog } from "../src/game/achievements.ts";
import { BOARDS, CELL, EMPTY_META, PICKABLE_MAPS, TEST_MAPS, baseMap, boardSize, buildRoutes, createWorld, layoutsOf, shelfCells, withLayouts } from "../src/game/engine.ts";

const tiles = (points: Array<{ x: number; y: number }>) => {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return d / CELL;
};

/** A world with these Catalogue rooms restored, at Setup. */
function setup(rooms: string[]) {
  const api = createWorld(() => {}, { meta: EMPTY_META, rooms: rooms as never });
  api.openSetup();
  return api;
}

test("the Archive and the Mezzanine each have a layout B; it isn't a room of its own", () => {
  assert.deepEqual(layoutsOf("archive"), ["archive", "archiveB"]);
  assert.deepEqual(layoutsOf("mezzanine"), ["mezzanine", "mezzanineB"]);
  assert.deepEqual(layoutsOf("archiveB"), ["archive", "archiveB"], "from either layout");
  assert.deepEqual(layoutsOf("stacks"), ["stacks"], "other rooms have one layout");
  assert.equal(baseMap("archiveB"), "archive");
  assert.equal(baseMap("mezzanineB"), "mezzanine");
  for (const id of ["archiveB", "mezzanineB"] as const) assert.ok(!PICKABLE_MAPS.includes(id), `${id} isn't on the room list`);
  assert.deepEqual(TEST_MAPS, [], "no test rooms left");
  assert.equal(BOARDS.archiveB.look, "archive");
  assert.equal(BOARDS.mezzanineB.look, "mezzanine");
  assert.equal(BOARDS.archiveB.dark, true, "the Archive's layout B is still dark");
  assert.deepEqual(withLayouts(["stacks", "archive"]), ["stacks", "archive", "archiveB"]);
});

test("both B layouts are 22 x 14 with a carpet about twice as long as layout A", () => {
  for (const [id, base] of [["archiveB", "archive"], ["mezzanineB", "mezzanine"]] as const) {
    const { cols, rows } = boardSize(id);
    assert.deepEqual([cols, rows], [22, 14], id);
    const len = tiles(buildRoutes(BOARDS[id]).points);
    const was = tiles(buildRoutes(BOARDS[base]).points);
    assert.ok(len >= 55 && len <= 64, `${id}: ${len} tiles`);
    assert.ok(len > was * 1.8, `${id} (${len}) vs ${base} (${was})`);
  }
});

test("no shelf or Sir Michael tile sits on a B carpet; the switchback gaps and the coil's door are where they should be", () => {
  for (const id of ["archiveB", "mezzanineB"] as const) {
    const built = buildRoutes(BOARDS[id]);
    const path = new Set(built.cells);
    const shelves = shelfCells(id, path, new Set(built.verge));
    assert.equal(shelves.size, (BOARDS[id].shelves ?? []).length, `${id}: every shelf is off the carpet and in the room`);
    const [mc, mr] = BOARDS[id].michaelCannon;
    assert.ok(!path.has(`${mc},${mr}`) && !shelves.has(`${mc},${mr}`), `${id}: Sir Michael's tile is open floor`);
  }
  const a = buildRoutes(BOARDS.archiveB);
  const shelvesA = shelfCells("archiveB", new Set(a.cells), new Set(a.verge));
  for (const c of [10, 11, 13, 14, 16, 17]) for (let r = 4; r <= 9; r++) assert.ok(!a.cells.has(`${c},${r}`) && !shelvesA.has(`${c},${r}`), `gap ${c},${r} is open`);
  const end = BOARDS.mezzanineB.corners.at(-1)!;
  assert.ok(end[0] > 4 && end[0] < 17 && end[1] > 3 && end[1] < 10, `the door is in the middle (${end})`);
});

test("layout B opens with its room: picked when the room is restored, refused when it isn't", () => {
  const locked = setup(["stacks"]);
  locked.chooseMap("archiveB");
  assert.notEqual(locked.world.hud.map, "archiveB", "the Archive isn't restored");
  const open = setup(["stacks", "archive", "mezzanine"]);
  open.chooseMap("archiveB");
  assert.equal(open.world.hud.map, "archiveB");
  open.chooseMap("archive");
  assert.equal(open.world.hud.map, "archive", "and back to layout A");
  open.chooseMap("mezzanineB");
  assert.equal(open.world.hud.map, "mezzanineB");
  open.chooseHero("mynxi");
  open.beginNight();
  open.startWave();
  assert.equal(open.world.hud.phase, "combat", "a night plays on it");
});

test("a saved setup on layout B loads when the room is open", () => {
  const api = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks", "mezzanine"] as never, setup: { night: "midnight", map: "mezzanineB" } as never });
  assert.equal(api.world.hud.map, "mezzanineB");
  const closed = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks"] as never, setup: { night: "midnight", map: "mezzanineB" } as never });
  assert.notEqual(closed.world.hud.map, "mezzanineB");
});

test("a win on layout B counts as a win on its room", () => {
  const log = emptyRunLog();
  const after = addNight(emptyLedger(), { log, hero: "mynxi", night: "midnight", difficulty: "normal", map: "archiveB", won: true, cleared: 15, seeds: 0, stacks: 5, slips: [] });
  assert.equal(after.winsByMap.archive, 1);
  assert.equal(after.winsByMap.archiveB, undefined);
});
