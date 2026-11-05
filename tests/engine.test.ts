import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOARDS,
  CELL,
  COLS,
  ROWS,
  STATS,
  WAVE_COUNT,
  buildBoard,
  createWorld,
  endlessWave,
  hpScaleFor,
  nextBeat,
  sellValue,
  shopPrice,
  waveAt,
  type Alliance,
  type NightId,
} from "../src/game/engine.ts";
import { simulateRun } from "../scripts/sim-core.ts";

const center = (c: number) => c * CELL + CELL / 2;

function startGame(hero: "mynxi" | "michael" | "vael" = "vael") {
  const api = createWorld(() => {});
  api.openLibrary();
  api.chooseHero(hero);
  api.beginNight();
  return api;
}

test("sellValue refunds 70% of what was paid", () => {
  assert.equal(sellValue(60), 42);
  assert.equal(sellValue(45), 32);
  assert.equal(sellValue(0), 0);
});

test("selling a tower refunds 70% of build cost plus mods", () => {
  const api = startGame("vael");
  const { world } = api;
  world.hud.seeds = 1000;

  api.pointer(center(4), center(3), "down"); // open floor on The Stacks
  const tower = world.towers.find((t) => !t.ally);
  assert.ok(tower, "tower placed");
  assert.equal(tower.paid, 60);

  const price = shopPrice("vael", 0);
  api.openShop();
  assert.equal(world.hud.phase, "shop");
  api.pickMod(world.hud.modOffer[0].id);
  assert.equal(tower.paid, 60 + price);

  const before = world.hud.seeds;
  api.sellSelected();
  assert.equal(world.hud.seeds - before, sellValue(60 + price));
  assert.equal(world.towers.filter((t) => !t.ally).length, 0);
});

test("Sir Michael's starting cannon still sells for 35", () => {
  const api = startGame("michael");
  const { world } = api;
  const knight = world.towers.find((t) => !t.ally);
  assert.ok(knight);
  api.pointer(knight.x, knight.y, "down");
  const before = world.hud.seeds;
  api.sellSelected();
  assert.equal(world.hud.seeds - before, 35);
});

test("towers cannot be placed on the carpet", () => {
  const api = startGame();
  const [c, r] = BOARDS.stacks.corners[0];
  api.pointer(center(c), center(r), "down");
  assert.equal(api.world.towers.length, 0);
});

test("every board stays inside the map and keeps fixed spots off the carpet", () => {
  for (const board of Object.values(BOARDS)) {
    const { cells } = buildBoard(board.corners);
    for (const key of cells) {
      const [c, r] = key.split(",").map(Number);
      assert.ok(c >= 0 && c < COLS && r >= 0 && r < ROWS, `${board.id}: path cell ${key} off map`);
    }
    for (const [c, r] of [...board.allies, board.knight]) {
      assert.ok(!cells.has(`${c},${r}`), `${board.id}: fixed tower spot ${c},${r} is on the carpet`);
    }
  }
});

test("every wave in every branch is defined and uses known enemies", () => {
  const nights: NightId[] = ["midnight", "overflow"];
  const doors: Alliance[] = ["none", "accept", "betray", "reject"];
  for (const night of nights)
    for (const door of doors)
      for (let i = 0; i < WAVE_COUNT; i++) {
        const wave = waveAt(i, door, night);
        assert.ok(wave.spawns.length > 0, `${night}/${door} wave ${i + 1} is empty`);
        for (const s of wave.spawns) assert.ok(s.kind in STATS, `unknown enemy ${s.kind}`);
      }
});

test("betraying the knight trades the act-two upgrade for Bouncing Melons", () => {
  assert.equal(nextBeat(6, "accept"), "upgrade");
  assert.equal(nextBeat(6, "reject"), "upgrade");
  assert.equal(nextBeat(6, "betray"), "prep");
  // Overflow keeps its pick: the betrayal there happened on night one.
  assert.equal(nextBeat(6, "betray", "overflow"), "upgrade");
});

test("endless never ends and keeps generating valid, growing waves", () => {
  let lastSize = 0;
  for (let i = 0; i < 60; i++) {
    assert.notEqual(nextBeat(i + 1, "none", "endless"), "victory");
    const wave = endlessWave(i);
    assert.ok(wave.spawns.length > 0, `endless wave ${i + 1} is empty`);
    for (const s of wave.spawns) {
      assert.ok(s.kind in STATS, `unknown enemy ${s.kind}`);
      assert.ok(s.count > 0 && s.every > 0);
    }
    if (i >= 6 && (i + 1) % 5 === 0) assert.ok(wave.spawns.some((s) => s.kind === "karl"), `wave ${i + 1} should bring Karl`);
    // Compare same-theme waves four apart: they only get bigger.
    if (i >= 10 && (i - 6) % 4 === 0) {
      const size = wave.spawns.reduce((n, s) => (s.kind === "karl" ? n : n + s.count), 0);
      assert.ok(size >= lastSize, `wave ${i + 1} shrank`);
      lastSize = size;
    }
  }
  assert.ok(hpScaleFor("endless", 20) > hpScaleFor("endless", 15));
  assert.equal(hpScaleFor("endless", 5), hpScaleFor("midnight", 5));
});

test("endless offers a pick every fifth wave after act one", () => {
  assert.equal(nextBeat(6, "none", "endless"), "upgrade");
  assert.equal(nextBeat(11, "none", "endless"), "upgrade");
  assert.equal(nextBeat(16, "none", "endless"), "upgrade");
  assert.equal(nextBeat(12, "none", "endless"), "prep");
  assert.equal(nextBeat(4, "none", "endless"), "prep");
});

test("simulated runs reach an ending on every night and knight choice", () => {
  for (const night of ["midnight", "overflow"] as const)
    for (const door of ["accept", "betray", "reject"] as const) {
      const r = simulateRun({
        hero: "mynxi",
        difficulty: "normal",
        strategy: "mixed",
        night,
        map: night === "overflow" ? "overflow" : "stacks",
        door,
        seed: 1,
      });
      assert.ok(r.won || r.reachedWave >= 1, `${night}/${door} did not finish`);
      assert.equal(r.leaks.length, r.reachedWave);
    }
});

test("simulation is repeatable for the same seed", () => {
  const cfg = {
    hero: "vael",
    difficulty: "hard",
    strategy: "mixed+mods",
    night: "midnight",
    map: "annex",
    door: "betray",
    seed: 7,
  } as const;
  assert.deepEqual(simulateRun(cfg), simulateRun(cfg));
});
