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
import { ALL_UNLOCKED, EMPTY_META, TOWERS as T, TOWER_GROUPS, backRoomPrice, stepWorld, type TowerKind } from "../src/game/engine.ts";
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

test("locked bookmarks cannot be equipped", () => {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openLibrary();
  api.setBookmark("seedfund");
  assert.equal(api.world.hud.bookmark, null);
  assert.deepEqual(api.world.hud.unlocked, []);
});

test("bookmarks change the run start and prices", () => {
  const start = (id: "seedfund" | "sparestack" | "discount" | "backroom" | null) => {
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED });
    api.openLibrary();
    api.setBookmark(id);
    api.chooseHero("vael");
    api.beginNight();
    return api;
  };
  const plain = start(null).world.hud;
  assert.equal(start("seedfund").world.hud.seeds, plain.seeds + 30);
  assert.equal(start("sparestack").world.hud.maxLives, plain.maxLives + 2);
  assert.equal(start("discount").world.hud.towerCost, T.melon.cost - 5);
  assert.equal(backRoomPrice("vael", 0, "backroom"), 0);
  assert.equal(backRoomPrice("vael", 1, "backroom"), shopPrice("vael", 1));

  // Back-room Key: the first fitting costs nothing and adds nothing to the refund.
  const api = start("backroom");
  api.pointer(center(4), center(3), "down");
  const before = api.world.hud.seeds;
  api.openShop();
  api.pickMod(api.world.hud.modOffer[0].id);
  assert.equal(api.world.hud.seeds, before);
  assert.equal(api.world.towers.find((t) => !t.ally)?.paid, 60);
});

test("reaching a milestone unlocks a bookmark mid-run", () => {
  const api = createWorld(() => {}, { meta: { ...EMPTY_META, fittings: 4 } });
  api.openLibrary();
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 1000;
  api.pointer(center(4), center(3), "down");
  api.openShop();
  api.pickMod(api.world.hud.modOffer[0].id);
  assert.ok(api.world.hud.unlocked.includes("backroom"));
  assert.deepEqual(api.world.hud.newUnlocks, ["backroom"]);
  assert.match(api.world.hud.log, /New bookmark: Back-room Key/);
});

test("every cannon is in exactly one build tab of five", () => {
  const all = TOWER_GROUPS.flatMap((g) => g.kinds);
  assert.equal(all.length, Object.keys(T).length);
  assert.equal(new Set(all).size, all.length);
  for (const g of TOWER_GROUPS) assert.equal(g.kinds.length, 5);
});

/** A board with lots of seeds and one cannon of `kind` at (4,3), right beside the Stacks carpet. */
function withCannon(kind: TowerKind) {
  const api = startGame("vael");
  api.world.hud.seeds = 5000;
  api.chooseBuild(kind);
  api.pointer(center(4), center(3), "down");
  const tower = api.world.towers.find((t) => t.kind === kind);
  assert.ok(tower, `${kind} placed`);
  api.dismissSelection();
  return { api, tower };
}

test("every new cannon can be built and survives a wave", () => {
  for (const kind of Object.keys(T) as TowerKind[]) {
    const { api } = withCannon(kind);
    api.startWave();
    for (let i = 0; i < 60 * 90 && api.world.hud.phase === "combat"; i++) stepWorld(api.world, 1 / 60);
    assert.notEqual(api.world.hud.phase, "combat", `${kind}: wave 1 never ended`);
  }
});

test("Reading Lamp boosts a neighbour's range and fire rate", () => {
  const { api, tower } = withCannon("melon");
  const before = api.statsOf(tower.id)!;
  api.chooseBuild("lantern");
  api.pointer(center(5), center(3), "down");
  const after = api.statsOf(tower.id)!;
  assert.ok(after.range > before.range);
  assert.ok(after.interval < before.interval);
  assert.equal(after.lit, true);
});

test("Compost Heap pays seeds when a wave ends", () => {
  const { api } = withCannon("compost");
  api.startWave();
  let seedsAtEnd = 0;
  for (let i = 0; i < 60 * 90 && api.world.hud.phase === "combat"; i++) {
    seedsAtEnd = api.world.hud.seeds;
    stepWorld(api.world, 1 / 60);
  }
  assert.equal(api.world.hud.seeds - seedsAtEnd, 15);
});

test("ballista spear damages enemies on its line", () => {
  const { api } = withCannon("ballista");
  api.startWave();
  let damaged = 0;
  for (let i = 0; i < 60 * 30 && api.world.lines.length === 0; i++) {
    const hp = new Map(api.world.enemies.map((e) => [e.id, e.hp]));
    const seeds = api.world.hud.seeds;
    stepWorld(api.world, 1 / 60);
    if (api.world.lines.length) {
      damaged = api.world.enemies.filter((e) => (hp.get(e.id) ?? e.hp) > e.hp).length + (api.world.hud.seeds > seeds ? 1 : 0);
    }
  }
  assert.ok(api.world.lines.length >= 1, "ballista fired");
  assert.ok(damaged >= 1, "spear hurt something");
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
