import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOARDS,
  CANNON,
  CELL,
  EMPTY_META,
  OATH_ZONE,
  VERGE_NOTE,
  besideCarpet,
  bindLeg,
  buildBoard,
  carpetAlong,
  carpetLegs,
  createWorld,
  emptyProgress,
  floorTiles,
  oathStretch,
  roundedSpot,
  stepWorld,
  towerReadout,
  type MapId,
} from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;
const keys = (list: Array<[number, number]>) => list.map(([c, r]) => `${c},${r}`).sort();

function start(map: MapId) {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), setup: { night: "midnight", map, hero: "quack" } });
  api.openSetup();
  api.chooseHero("quack");
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** `n` fruit from wave 1, everything else cleared, sturdy and plain. */
function fruit(api: Api, n: number): Fruit[] {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 60 && w.enemies.filter((e) => e.hp > 0).length < n; i++) stepWorld(w, 1 / 60);
  const out = w.enemies.filter((e) => e.hp > 0).slice(0, n);
  assert.equal(out.length, n);
  w.enemies = out;
  for (const e of out)
    Object.assign(e, { hp: 9999, maxHp: 9999, guard: "none", shell: 0, boss: false, pit: false, gall: false, borrower: false, native: null, freeze: 0, chill: 0, reverse: false });
  return out;
}

/** Put a fruit `s` px along leg `i`. */
function onLeg(api: Api, e: Fruit, i: number, s: number) {
  const leg = carpetLegs(api.world.points)[i];
  const k = (s - leg.from) / leg.length;
  Object.assign(e, { x: leg.a.x + (leg.b.x - leg.a.x) * k, y: leg.a.y + (leg.b.y - leg.a.y) * k, wp: i + 1, reverse: false });
}
const along = (api: Api, e: Fruit) => carpetAlong(api.world.points, e.x, e.y, e.wp, e.reverse).along;
/** How far (px) `e` is off the straight line of leg `i`. */
function offLeg(api: Api, e: Fruit, i: number) {
  const { a, b, length } = carpetLegs(api.world.points)[i];
  return Math.abs((b.x - a.x) * (e.y - a.y) - (b.y - a.y) * (e.x - a.x)) / length;
}
function run(api: Api, keep: Fruit[], s: number, each?: () => void) {
  for (let i = 0; i < Math.round(s * 60); i++) {
    api.world.enemies = api.world.enemies.filter((e) => keep.includes(e));
    stepWorld(api.world, 1 / 60);
    each?.();
  }
}

// The Bell Tower's two diagonals are legs 3 ([7,1] to [10,4]) and 5 ([11,4] to [14,1]).
const DOWN = 3;
const UP = 5;

// ── buildBoard ─────────────────────────────────────────────────────────────

test("buildBoard: a 45° stretch marks the diagonal tiles as carpet and both side tiles of each step as verge", () => {
  const b = buildBoard([
    [0, 0],
    [3, 3],
  ]);
  assert.deepEqual([...b.cells].sort(), keys([[0, 0], [1, 1], [2, 2], [3, 3]]));
  assert.deepEqual([...b.verge].sort(), keys([[1, 0], [0, 1], [2, 1], [1, 2], [3, 2], [2, 3]]));
  // Straight boards have no verge.
  assert.equal(buildBoard(BOARDS.stacks.corners).verge.size, 0);
  assert.equal(buildBoard(BOARDS.sorting.corners).verge.size, 0);
});

test("buildBoard: a stretch that isn't straight or exactly 45° throws; so does a diagonal floor", () => {
  assert.throws(() =>
    buildBoard([
      [0, 0],
      [3, 1],
    ]),
  );
  const floors = BOARDS.greenhouse.floors;
  BOARDS.greenhouse.floors = [{ kind: "bed", from: [10, 5], to: [12, 7] }];
  try {
    assert.throws(() => floorTiles("greenhouse"));
  } finally {
    BOARDS.greenhouse.floors = floors;
  }
});

test("the Greenhouse and the Bell Tower: no shelf, floor, bell or free tile on the carpet or a verge", () => {
  for (const map of ["greenhouse", "belltower"] as const) {
    const b = BOARDS[map];
    const built = buildBoard(b.corners);
    assert.ok(built.verge.size > 0, `${map} has a diagonal`);
    const off = (k: string) => !built.cells.has(k) && !built.verge.has(k);
    for (const [c, r] of b.shelves!) assert.ok(off(`${c},${r}`), `${map}: shelf ${c},${r}`);
    for (const k of floorTiles(map).keys()) assert.ok(built.cells.has(k), `${map}: floor ${k} is on the carpet`);
    assert.ok(off(b.michaelCannon.join(",")), `${map}: the free tile`);
    if (b.bell) for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]]) assert.ok(off(`${b.bell[0] + dc},${b.bell[1] + dr}`), `${map}: the bell`);
  }
});

test("carpetLegs on the Bell Tower: the two diagonals are legs of √2 × 3 tiles, with three carpet tiles each", () => {
  const legs = carpetLegs(buildBoard(BOARDS.belltower.corners).points);
  for (const i of [DOWN, UP]) {
    assert.ok(Math.abs(legs[i].length - Math.SQRT2 * 3 * CELL) < 1e-6, `leg ${i} length`);
    assert.equal(legs[i].tiles.length, 3);
    assert.equal(legs[i].verge.length, 6);
  }
  assert.deepEqual(keys(legs[DOWN].tiles), keys([[7, 1], [8, 2], [9, 3]]));
  // The straights still count their own tiles.
  assert.equal(legs[1].tiles.length, 11);
});

// ── Placement ─────────────────────────────────────────────────────────────

test("placement: a verge tile is refused with its own message; a floor tile beside the band is fine", () => {
  const api = start("greenhouse");
  const w = api.world;
  assert.ok(w.vergeCells.has("11,5"));
  api.chooseBuild("melon");
  api.pointer(center(11), center(5), "move");
  assert.equal(w.hud.canPlace, false, "the ghost says no");
  api.pointer(center(11), center(5), "down");
  assert.equal(w.towers.length, 0);
  assert.equal(w.hud.log, VERGE_NOTE);
  // [12,5] touches two verge tiles but no carpet.
  assert.ok(!w.pathCells.has("12,5") && !w.vergeCells.has("12,5"));
  assert.ok(besideCarpet(w, 12, 5), "beside the band counts as beside the carpet");
  api.pointer(center(12), center(5), "down");
  assert.equal(w.towers.length, 1);
});

// ── Movement ─────────────────────────────────────────────────────────────

test("a fruit walks a diagonal at its normal speed", () => {
  const api = start("belltower");
  const legs = carpetLegs(api.world.points);
  const [e] = fruit(api, 1);
  onLeg(api, e, DOWN, legs[DOWN].from);
  let t = 0;
  let worst = 0;
  run(api, [e], 7, () => {
    if (e.wp === DOWN + 1) {
      t += 1 / 60;
      worst = Math.max(worst, offLeg(api, e, DOWN));
    }
  });
  const expect = legs[DOWN].length / e.speed;
  assert.ok(Math.abs(t - expect) <= 2 / 60 + expect * 0.02, `took ${t.toFixed(3)} s, expected ${expect.toFixed(3)} s`);
  assert.ok(worst < 0.5, "it stayed on the diagonal");
});

test("knockback on a diagonal pushes the fruit back along the diagonal", () => {
  const api = start("belltower");
  const legs = carpetLegs(api.world.points);
  const [e] = fruit(api, 1);
  onLeg(api, e, DOWN, legs[DOWN].from + legs[DOWN].length / 2);
  e.speed = 0;
  const before = along(api, e);
  api.world.shots.push({ id: 9e6, x: e.x, y: e.y, tx: e.x, ty: e.y, target: e.id, dmg: 1, life: 1, bounces: 0, orange: false, splash: 1, knock: 40, element: "shot", procs: false, splashRatio: 0, chill: 0, freezeExtra: 0, fireLife: 0, fireBurn: 0, pulp: false });
  run(api, [e], 0.1);
  assert.ok(Math.abs(before - along(api, e) - 40) < 1, `pushed ${(before - along(api, e)).toFixed(1)} px back`);
  assert.ok(offLeg(api, e, DOWN) < 0.5, "and it's still on the diagonal");
});

test("the Reverse Driver walks a fruit back along a diagonal", () => {
  const api = start("belltower");
  api.chooseBuild("driver");
  api.pointer(center(10), center(1), "down");
  api.dismissSelection();
  assert.ok(api.world.towers.some((t) => t.kind === "driver"), "driver placed");
  const legs = carpetLegs(api.world.points);
  const [e] = fruit(api, 1);
  onLeg(api, e, DOWN, legs[DOWN].from + 100); // the nearest point of the diagonal to the Driver
  api.world.towers.find((t) => t.kind === "driver")!.cd = 0;
  const before = along(api, e);
  let worst = 0;
  let driven = false;
  run(api, [e], 1, () => {
    if ((e.driven ?? 0) > 0) driven = true;
    if (e.wp === DOWN + 1) worst = Math.max(worst, offLeg(api, e, DOWN));
  });
  assert.ok(driven, "it was driven");
  assert.ok(along(api, e) < before, "it walked back");
  assert.ok(worst < 0.5, "along the diagonal");
});

test("the Pamphlet binds to a diagonal and fires when the front fruit reaches its end with another on it", () => {
  const api = start("belltower");
  const legs = carpetLegs(api.world.points);
  assert.equal(bindLeg(legs, 10, 2), DOWN, "beside the verge counts as beside the diagonal");
  api.chooseBuild("pamphlet");
  api.pointer(center(10), center(2), "down");
  api.dismissSelection();
  const pam = api.world.towers.find((t) => t.kind === "pamphlet");
  assert.ok(pam);
  assert.equal(pam.leg, DOWN);
  const [front, back] = fruit(api, 2);
  onLeg(api, front, DOWN, legs[DOWN].to - 3);
  onLeg(api, back, DOWN, legs[DOWN].from + 30);
  run(api, [front, back], 0.6);
  const hit = Math.round(towerReadout(api.world.hud.hero, "melon", [], api.world.hud.upgrades).dmg * CANNON.pamphletHit);
  assert.equal(9999 - front.hp, hit);
  assert.equal(9999 - back.hp, hit);
});

test("Sir Michael's oath zones are measured along the carpet on the new layouts", () => {
  for (const map of ["greenhouse", "belltower"] as const) {
    const points = buildBoard(BOARDS[map].corners).points;
    for (const oath of ["door", "mouth"] as const) {
      const run = oathStretch(points, oath);
      let len = 0;
      for (let k = 1; k < run.length; k++) len += Math.hypot(run[k].x - run[k - 1].x, run[k].y - run[k - 1].y);
      assert.ok(Math.abs(len - OATH_ZONE) < 1e-6, `${map} ${oath}: ${len}`);
    }
  }
});

test("furthest along works on a diagonal: carpetAlong grows by the distance walked", () => {
  const points = buildBoard(BOARDS.belltower.corners).points;
  const leg = carpetLegs(points)[DOWN];
  for (const d of [5, 30, 60]) {
    const k = d / leg.length;
    const x = leg.a.x + (leg.b.x - leg.a.x) * k;
    const y = leg.a.y + (leg.b.y - leg.a.y) * k;
    assert.ok(Math.abs(carpetAlong(points, x, y, DOWN + 1, false).along - (leg.from + d)) < 1e-6);
  }
});

// ── Drawing ─────────────────────────────────────────────────────────────

test("rounded drawing: a fruit at a turn is drawn on the curve, within a third of a tile of where it really is", () => {
  const points = buildBoard(BOARDS.greenhouse.corners).points;
  const R = CELL / 2;
  // A right-angle turn: [4,11] (in from the west, out to the north).
  const p = points[1];
  for (const s of [-20, -8, 0, 8, 20]) {
    const at = s < 0 ? { x: p.x + s, y: p.y } : { x: p.x, y: p.y - s };
    const drawn = roundedSpot(points, at.x, at.y);
    assert.ok(Math.hypot(drawn.x - at.x, drawn.y - at.y) <= CELL / 3, `within a third of a tile at ${s}`);
    // The quarter-circle's centre is half a tile in from the corner on both sides.
    assert.ok(Math.abs(Math.hypot(drawn.x - (p.x - R), drawn.y - (p.y - R)) - R) < 1e-6, `on the curve at ${s}`);
  }
  // A 45° turn ([10,5], into the diagonal) also bends, but less.
  const q = points[4];
  const bent = roundedSpot(points, q.x, q.y);
  assert.ok(Math.hypot(bent.x - q.x, bent.y - q.y) > 0.5 && Math.hypot(bent.x - q.x, bent.y - q.y) <= CELL / 3);
  // Away from a turn nothing moves.
  const mid = { x: p.x, y: p.y - 3 * CELL };
  assert.deepEqual(roundedSpot(points, mid.x, mid.y), mid);
});
