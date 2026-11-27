import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, createWorld } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function startNight() {
  const api = createWorld(() => {}, { allTricks: true });
  api.openSetup();
  api.chooseHero("scholar");
  api.beginNight();
  api.world.hud.seeds = 1000;
  return api;
}

/** A carpet tile with open floor right of it, and nothing useful on its other sides. */
function carpetBesideFloor(api: ReturnType<typeof createWorld>) {
  const w = api.world;
  const blocked = (c: number, r: number) => {
    const k = `${c},${r}`;
    return w.pathCells.has(k) || w.vergeCells.has(k) || w.shelfCells.has(k) || w.trackCells.has(k);
  };
  for (const k of w.pathCells) {
    const [c, r] = k.split(",").map(Number);
    if (c + 1 < w.cols && !blocked(c + 1, r)) return { c, r };
  }
  throw new Error("no carpet beside floor");
}

test("a tap on open floor stays where it is", () => {
  const api = startNight();
  assert.deepEqual(api.snapTap(center(4) + 5, center(3) - 7), { x: center(4) + 5, y: center(3) - 7 });
});

test("a tap on the carpet near open floor moves onto that floor tile", () => {
  const api = startNight();
  const { c, r } = carpetBesideFloor(api);
  // On the carpet, a fifth of a tile from the floor on its right.
  const tap = { x: (c + 0.8) * CELL, y: center(r) };
  const at = api.snapTap(tap.x, tap.y);
  const cc = Math.floor(at.x / CELL);
  const rr = Math.floor(at.y / CELL);
  assert.ok(!api.world.pathCells.has(`${cc},${rr}`), "landed off the carpet");
  assert.ok(Math.abs(cc - c) <= 1 && Math.abs(rr - r) <= 1, "on a neighbouring tile");
  // And the snapped tap builds there.
  api.pointer(at.x, at.y, "down");
  assert.equal(api.world.towers.length, 1);
  assert.equal(api.world.towers[0].c, cc);
  assert.equal(api.world.towers[0].r, rr);
});

test("with a tower open, a tap is never moved (it only closes the tower)", () => {
  const api = startNight();
  const { c, r } = carpetBesideFloor(api);
  api.pointer(center(c + 1), center(r), "down");
  const t = api.world.towers[0];
  api.pointer(t.x, t.y, "down");
  assert.equal(api.world.hud.selected, t.id);
  const tap = { x: (c + 0.8) * CELL, y: center(r) };
  assert.deepEqual(api.snapTap(tap.x, tap.y), tap);
});

test("a tap on the carpet next to a tower opens that tower", () => {
  const api = startNight();
  const { c, r } = carpetBesideFloor(api);
  api.pointer(center(c + 1), center(r), "down");
  api.dismissSelection();
  const at = api.snapTap((c + 0.9) * CELL, center(r));
  api.pointer(at.x, at.y, "down");
  assert.equal(api.world.hud.selected, api.world.towers[0].id);
});

test("off the board a tap is left alone", () => {
  const api = startNight();
  assert.deepEqual(api.snapTap(-30, -30), { x: -30, y: -30 });
});
