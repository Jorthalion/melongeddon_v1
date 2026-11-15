import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CANNON, CELL, EMPTY_META, TOWERS, backRoomPrice, createWorld, groupsFor, stepWorld, type MetaStats, type RoomId } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function onBoard(meta: MetaStats, rooms?: RoomId[]) {
  const api = createWorld(() => {}, { meta, rooms });
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

test("it's locked until The Great Hall is restored; the old brew goal no longer opens it", () => {
  assert.ok(build(onBoard({ ...EMPTY_META }, ["stacks", "greathall"]), "flask"), "open with The Great Hall");
  const api = onBoard({ ...EMPTY_META }, ["stacks"]);
  assert.equal(build(api, "flask"), undefined);
  assert.match(api.world.hud.log, /Restore The Great Hall/);

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
  assert.ok(w.hud.lockedTowers.includes("flask"), "the brew is an achievement now, not an unlock");
});

test("it drips a slow puddle from its own tile", () => {
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

test("every carpet cell a spill can reach is wet for the rest of the night, and selling the flask doesn't dry it", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  const flask = build(api, "flask");
  assert.ok(flask);
  const w = api.world;
  assert.equal(w.wet.size, 0, "dry to start");
  const real = Math.random;
  Math.random = () => 0;
  let said = "";
  try {
    api.startWave();
    for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
      w.enemies.length = 0;
      stepWorld(w, 1 / 60);
    }
    said = w.hud.log; // before the upgrade pick writes its own line
    if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
  } finally {
    Math.random = real;
  }
  const spill = flask.spill?.[0];
  assert.ok(spill, "it spilled");
  assert.match(said, /That was not in the notes\./);
  const range = api.statsOf(flask.id)!.range;
  const reach = [...w.pathCells].filter((k) => {
    const [c, r] = k.split(",").map(Number);
    return Math.hypot((c - spill.c) * CELL, (r - spill.r) * CELL) <= range;
  });
  assert.ok(reach.length > 0);
  for (const k of reach) assert.ok(w.wet.has(k), `${k} is wet`);
  for (const k of w.wet) assert.ok(w.pathCells.has(k), `${k}: only carpet gets wet`);
  const wet = w.wet.size;
  api.pointer(flask.x, flask.y, "down");
  api.sellSelected();
  assert.equal(w.towers.length, 0);
  assert.equal(w.wet.size, wet, "still wet after selling");
});

test("spill tiles don't drip: only the flask's own tile does", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  const flask = build(api, "flask");
  assert.ok(flask);
  const w = api.world;
  const real = Math.random;
  Math.random = () => 0;
  try {
    for (let n = 0; n < 3; n++) clearWave(api);
  } finally {
    Math.random = real;
  }
  assert.ok((flask.spill ?? []).length >= 2);
  api.startWave();
  let drips = 0;
  for (let i = 0; i < 60 * 20 && w.hud.phase === "combat"; i++) {
    for (const e of w.enemies) if (e.maxHp < 99999) e.hp = e.maxHp = 99999;
    const before = w.pools.filter((p) => !p.hot).length;
    const cdBefore = flask.cd;
    stepWorld(w, 1 / 60);
    const made = w.pools.filter((p) => !p.hot).length - before;
    if (made > 0) {
      drips += made;
      assert.equal(made, 1, "one puddle at a time");
      assert.ok(flask.cd > cdBefore, "and only when the flask's own timer fired");
    }
  }
  assert.ok(drips >= 1, "it dripped");
});

test("on wet carpet, fire burns at 0.6 for 0.6 as long, and a Still's puddle lasts 1.5 times as long", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  const w = api.world;
  const cell = [...w.pathCells][3];
  const [c, r] = cell.split(",").map(Number);
  const x = center(c);
  const y = center(r);
  /** Get a fruit standing still on the cell, with every tower holding fire. */
  const fruitOnCell = () => {
    api.startWave();
    for (let i = 0; i < 600 && w.enemies.length === 0; i++) {
      for (const t of w.towers) t.cd = 99;
      stepWorld(w, 1 / 60);
    }
    const e = w.enemies[0];
    e.x = x;
    e.y = y;
    e.speed = 0;
    e.hp = e.maxHp = 9999;
    w.enemies = [e];
    w.shots = [];
    w.pools = [];
    return e;
  };
  const done = () => {
    w.enemies = [];
    w.hud.phase = "prep";
  };
  // A Fire cannon's shot landing on the fruit leaves a fire patch.
  const patch = (wet: boolean) => {
    const e = fruitOnCell();
    w.wet = wet ? new Set([cell]) : new Set();
    w.shots.push({ id: 1e7, x, y, tx: x, ty: y, target: e.id, dmg: 0, life: 1, bounces: 0, orange: false, splash: 0, element: "fire", procs: false, splashRatio: 0, chill: 0, freezeExtra: 0, fireLife: 2.4, fireBurn: 22, pulp: false });
    for (const t of w.towers) t.cd = 99;
    stepWorld(w, 1 / 60);
    const pool = w.pools.find((p) => p.hot)!;
    assert.ok(pool, "a fire patch");
    done();
    return pool;
  };
  const dry = patch(false);
  const wet = patch(true);
  assert.ok(Math.abs(wet.burn - dry.burn * CANNON.wetFire) < 1e-9, `burn ${wet.burn} vs ${dry.burn}`);
  assert.ok(Math.abs(wet.max - dry.max * CANNON.wetFire) < 1e-9, "and it goes out sooner");

  // A Still's puddle on the same cell.
  const still = build(api, "still");
  assert.ok(still);
  const puddle = (wet: boolean) => {
    fruitOnCell();
    w.wet = wet ? new Set([cell]) : new Set();
    for (const t of w.towers) t.cd = t === still ? 0 : 99;
    still.x = x + 30;
    still.y = y;
    stepWorld(w, 1 / 60);
    const pool = w.pools.find((p) => !p.hot && Math.hypot(p.x - x, p.y - y) < 4);
    assert.ok(pool, "the Still dripped on the cell");
    done();
    return pool.max;
  };
  const dryLife = puddle(false);
  const wetLife = puddle(true);
  assert.ok(Math.abs(wetLife - dryLife * CANNON.wetPuddle) < 1e-9, `puddle ${wetLife} vs ${dryLife}`);
});

test("Vaelithra pays 20 more for the first of each kind tonight; the second is the normal price", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  const w = api.world;
  const paid = (kind: "melon" | "still") => {
    const before = w.hud.seeds;
    assert.ok(build(api, kind), kind);
    return before - w.hud.seeds;
  };
  assert.equal(TOWERS.melon.cost + CANNON.vaelFirstPremium, 80);
  assert.equal(paid("melon"), 80, "first melon");
  assert.equal(paid("melon"), 60, "second melon");
  assert.equal(paid("still"), TOWERS.still.cost + 20, "first Still");
  assert.equal(paid("still"), TOWERS.still.cost, "second Still");
  // Selling the first doesn't bring the premium back.
  const melon = w.towers.find((t) => t.kind === "melon")!;
  api.pointer(melon.x, melon.y, "down");
  api.sellSelected();
  assert.equal(paid("melon"), 60, "after selling one, still the normal price");
  // The build bar shows the price she'll pay, keeper towers included.
  api.chooseBuild("mortar");
  assert.equal(w.hud.towerCost, TOWERS.mortar.cost + 20);
  api.chooseBuild("cauldron");
  assert.equal(w.hud.towerCost, TOWERS.cauldron.cost + 20);
});

test("a new night clears the list of kinds she has built", () => {
  const api = onBoard({ ...ALL_UNLOCKED });
  assert.ok(build(api, "melon"));
  assert.deepEqual(api.world.hud.builtKinds, ["melon"]);
  api.restartNight();
  api.beginNight();
  assert.deepEqual(api.world.hud.builtKinds, []);
  api.world.hud.seeds = 5000;
  api.chooseBuild("melon");
  assert.equal(api.world.hud.towerCost, 80, "the premium is back");
});

test("Vaelithra's back room: 25, then 15 more per upgrade the kind has; the Elf's and others' prices don't change", () => {
  assert.equal(backRoomPrice("vael", 0, 1, null), 25);
  assert.equal(backRoomPrice("vael", 1, 2, null), 40);
  assert.equal(backRoomPrice("vael", 2, 3, null), 55);
  assert.equal(backRoomPrice("elf", 0, 1, null), Math.round(40 * 0.7));
  assert.equal(backRoomPrice("elf", 1, 2, null), Math.round(70 * 0.7));
  assert.equal(backRoomPrice("scholar", 0, 1, null), 40);
  assert.equal(backRoomPrice("mynxi", 0, 0, null), 15, "Mynxi's first is still 15");
  assert.equal(backRoomPrice("vael", 0, 0, null), 25, "only Mynxi gets the 15");
  // In the game: the price shown is the price paid.
  const api = onBoard({ ...ALL_UNLOCKED });
  assert.ok(build(api, "melon"));
  api.openShop("melon");
  assert.equal(api.shopPriceFor("melon"), 25);
  const seeds = api.world.hud.seeds;
  api.pickMod("reach");
  assert.equal(seeds - api.world.hud.seeds, 25);
  assert.equal(api.shopPriceFor("melon"), 40);
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
