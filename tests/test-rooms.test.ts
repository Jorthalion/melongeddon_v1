import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, BOARDS, CELL, EMPTY_META, PICKABLE_MAPS, TEST_MAPS, boardSize, buildRoutes, createWorld, shelfCells } from "../src/game/engine.ts";

const tiles = (points: Array<{ x: number; y: number }>) => {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return d / CELL;
};

test("the test rooms are the bigger Archive and Mezzanine, and stay out of the game", () => {
  assert.deepEqual(TEST_MAPS, ["archiveB", "mezzanineB"]);
  for (const id of TEST_MAPS) assert.ok(!PICKABLE_MAPS.includes(id), `${id} isn't on the room list`);
  assert.equal(BOARDS.archiveB.look, "archive");
  assert.equal(BOARDS.mezzanineB.look, "mezzanine");
  assert.equal(BOARDS.archiveB.dark, true, "the Archive's version is still dark");
});

test("both are 22 x 14 with a carpet about twice as long as the room they're a version of", () => {
  for (const [id, base] of [["archiveB", "archive"], ["mezzanineB", "mezzanine"]] as const) {
    const { cols, rows } = boardSize(id);
    assert.deepEqual([cols, rows], [22, 14], id);
    const len = tiles(buildRoutes(BOARDS[id]).points);
    const was = tiles(buildRoutes(BOARDS[base]).points);
    assert.ok(len >= 55 && len <= 64, `${id}: ${len} tiles`);
    assert.ok(len > was * 1.8, `${id} (${len}) vs ${base} (${was})`);
  }
});

test("the carpet starts and ends on the board's edge or its middle door, and no shelf or Sir Michael tile sits on it", () => {
  for (const id of TEST_MAPS) {
    const built = buildRoutes(BOARDS[id]);
    const path = new Set(built.cells);
    const shelves = shelfCells(id, path, new Set(built.verge));
    assert.equal(shelves.size, (BOARDS[id].shelves ?? []).length, `${id}: every shelf is off the carpet and in the room`);
    const [mc, mr] = BOARDS[id].michaelCannon;
    assert.ok(!path.has(`${mc},${mr}`) && !shelves.has(`${mc},${mr}`), `${id}: Sir Michael's tile is open floor`);
    assert.equal(BOARDS[id].corners[0][0], 0, `${id} starts on the left edge`);
  }
  // The Archive's switchbacks: the gaps between the runs stay open floor (the spots that reach two runs).
  const a = buildRoutes(BOARDS.archiveB);
  const shelvesA = shelfCells("archiveB", new Set(a.cells), new Set(a.verge));
  for (const c of [10, 11, 13, 14, 16, 17]) for (let r = 4; r <= 9; r++) assert.ok(!a.cells.has(`${c},${r}`) && !shelvesA.has(`${c},${r}`), `gap ${c},${r} is open`);
  // The Mezzanine's coil ends at a door in the middle of the room.
  const end = BOARDS.mezzanineB.corners.at(-1)!;
  assert.ok(end[0] > 4 && end[0] < 17 && end[1] > 3 && end[1] < 10, `the door is in the middle (${end})`);
});

test("a test room can be picked only in developer mode (or by the simulator, with everything open)", () => {
  const player = createWorld(() => {}, { meta: EMPTY_META });
  player.openSetup();
  player.chooseMap("archiveB");
  assert.notEqual(player.world.hud.map, "archiveB", "not for a player");
  const sim = createWorld(() => {}, { meta: ALL_UNLOCKED, allTricks: true });
  sim.openSetup();
  for (const id of TEST_MAPS) {
    sim.chooseMap(id);
    assert.equal(sim.world.hud.map, id);
  }
  sim.chooseHero("mynxi");
  sim.beginNight();
  sim.startWave();
  assert.equal(sim.world.hud.phase, "combat", "a night plays on it");
});
