import { test } from "node:test";
import assert from "node:assert/strict";
import { BOARDS, CELL, buildBoard, createWorld, shelfCells, type MapId } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;
const MAPS = Object.keys(BOARDS) as MapId[];

test("every map has bookshelves, none on the carpet or on Sir Michael's spot", () => {
  for (const map of MAPS) {
    const path = buildBoard(BOARDS[map].corners).cells;
    const shelves = shelfCells(map, path);
    assert.ok(shelves.size > 0, `${map} has shelves`);
    for (const key of shelves) assert.ok(!path.has(key), `${map}: shelf ${key} is not on the carpet`);
    for (const [c, r] of [BOARDS[map].knight]) assert.ok(!shelves.has(`${c},${r}`), `${map}: ${c},${r} stays buildable`);
  }
});

test("a cannon can't be built on a bookshelf, and says why", () => {
  const api = createWorld(() => {}, { setup: { night: "midnight", map: "stacks", hero: "vael" } });
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 999;
  const [c, r] = [...api.world.shelfCells][0].split(",").map(Number);
  api.pointer(center(c), center(r), "move");
  assert.equal(api.world.hud.canPlace, false, "no build marker on a shelf");
  api.pointer(center(c), center(r), "down");
  assert.equal(api.world.towers.length, 0);
  assert.match(api.world.hud.log, /bookshelf/);
});

test("every map still leaves plenty of open floor beside the carpet", () => {
  for (const map of MAPS) {
    const api = createWorld(() => {}, { setup: { night: map === "overflow" ? "overflow" : "midnight", map, hero: "vael" } });
    const w = api.world;
    let open = 0;
    for (let r = 0; r < w.rows; r++)
      for (let c = 0; c < w.cols; c++) {
        const key = `${c},${r}`;
        if (w.pathCells.has(key) || w.shelfCells.has(key)) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) open++;
      }
    assert.ok(open >= 20, `${map}: ${open} open tiles beside the carpet`);
  }
});
