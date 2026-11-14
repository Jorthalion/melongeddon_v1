import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CANNON, CELL, EMPTY_META, createWorld, groupsFor, stepWorld, type MetaStats } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function onBoard(meta: MetaStats) {
  const api = createWorld(() => {}, { meta });
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 5000;
  return api;
}

type Api = ReturnType<typeof onBoard>;

/** Build `kind` on the first open tile beside the carpet (skipping `skip` of them). */
function build(api: Api, kind: "flask" | "still" | "melon", skip = 0) {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      if (skip-- > 0) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      const t = w.towers[w.towers.length - 1];
      api.dismissSelection();
      return w.towers.length > before && t.kind === kind ? t : undefined;
    }
}

/** Finish the wave with nothing leaking (fruit are cleared as they appear). */
function clearWave(api: Api) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
}

test("Vaelithra's Keeper tab holds the Cauldron and the Unstoppered", () => {
  assert.deepEqual(groupsFor("vael").find((g) => g.id === "keeper")?.kinds, ["cauldron", "flask"]);
});

test("it's locked until Vaelithra wins a night with a Still and Trial Vial or Distilled Batch", () => {
  const api = onBoard({ ...EMPTY_META });
  assert.equal(build(api, "flask"), undefined);
  assert.match(api.world.hud.log, /Trial Vial or Distilled Batch/);

  // Build a Still, take Trial Vial at the first pick, and win.
  assert.ok(build(api, "still"));
  const w = api.world;
  for (let n = 0; n < 200 && w.hud.phase !== "victory"; n++) {
    api.startWave();
    for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
      w.enemies.length = 0;
      stepWorld(w, 1 / 60);
    }
    if (w.hud.phase === "upgrade") api.pickUpgrade((w.hud.offer.find((u) => u.id === "vial") ?? w.hud.offer[0]).id);
  }
  assert.equal(w.hud.phase, "victory");
  assert.ok(w.hud.upgrades.includes("vial"));
  assert.ok(!w.hud.lockedTowers.includes("flask"), "unlocked");
});

test("it drips puddles onto the carpet like a Still", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  const flask = build(api, "flask");
  assert.ok(flask);
  const w = api.world;
  api.startWave();
  let pooled = false;
  for (let i = 0; i < 60 * 30 && !pooled; i++) {
    stepWorld(w, 1 / 60);
    pooled = w.pools.some((p) => !p.hot);
  }
  assert.ok(pooled, "a puddle appeared");
});

test("it spills onto open floor that reaches the carpet, never onto the carpet or a cannon, and stops at four tiles", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  const flask = build(api, "flask");
  assert.ok(flask);
  const w = api.world;
  const real = Math.random;
  Math.random = () => 0; // the spill always cooperates
  try {
    for (let n = 0; n < 8; n++) clearWave(api);
  } finally {
    Math.random = real;
  }
  const tiles = [{ c: flask.c, r: flask.r }, ...(flask.spill ?? [])];
  assert.equal(tiles.length, CANNON.flaskMaxTiles);
  for (const s of flask.spill ?? []) {
    const key = `${s.c},${s.r}`;
    assert.ok(!w.pathCells.has(key) && !w.shelfCells.has(key), `${key} is open floor`);
    assert.ok(tiles.some((t) => t !== s && Math.abs(t.c - s.c) + Math.abs(t.r - s.r) === 1), `${key} touches the flask`);
    assert.ok(
      [...w.pathCells].some((k) => {
        const [c, r] = k.split(",").map(Number);
        return Math.hypot((c - s.c) * CELL, (r - s.r) * CELL) <= api.statsOf(flask.id)!.range;
      }),
      `${key} reaches the carpet`,
    );
    assert.equal(w.towers.filter((t) => t.c === s.c && t.r === s.r).length, 0, `${key} holds no cannon`);
  }

  // A spill tile can't be built on, and tapping it picks the flask.
  const s = flask.spill![0];
  api.chooseBuild("melon");
  const before = w.towers.length;
  api.pointer(center(s.c), center(s.r), "down");
  assert.equal(w.towers.length, before, "no cannon on a spill tile");
  assert.equal(w.hud.selected, flask.id);
});

test("selling it pays a flat 35, however far it spilled", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  const flask = build(api, "flask");
  assert.ok(flask);
  const real = Math.random;
  Math.random = () => 0;
  try {
    for (let n = 0; n < 4; n++) clearWave(api);
  } finally {
    Math.random = real;
  }
  assert.ok((flask.spill ?? []).length > 0);
  const seeds = api.world.hud.seeds;
  api.dismissSelection();
  api.pointer(flask.x, flask.y, "down");
  api.sellSelected();
  assert.equal(api.world.hud.seeds - seeds, CANNON.flaskRefund);
  assert.equal(api.world.towers.length, 0);
});
