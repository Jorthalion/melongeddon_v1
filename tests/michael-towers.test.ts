import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, EMPTY_META, KEEPER_TOWERS, TOWERS, carpetAlong, createWorld, stepWorld, type OathId } from "../src/game/engine.ts";

function start(oath: OathId = "sling") {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openSetup();
  api.chooseHero("michael");
  api.pickOath(oath);
  api.world.hud.seeds = 99999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Build `kind` on the first tile (scanning rows) where it goes down; `beside` = touching the carpet. */
function build(api: Api, kind: "gourdgate" | "bombard", beside = true, from = 0) {
  const w = api.world;
  api.chooseBuild(kind);
  let i = 0;
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      if (i++ < from) continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`));
      if (beside !== touches) continue;
      const n = w.towers.length;
      api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
      if (w.towers.length > n) {
        api.dismissSelection();
        return w.towers[n];
      }
    }
  return null;
}

/** Build the Gourd Gate on the carpet-side tile nearest a point. */
function gateNear(api: Api, p: { x: number; y: number }) {
  const w = api.world;
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) cells.push([c, r]);
  cells.sort((a, b) => Math.hypot(a[0] * CELL + 24 - p.x, a[1] * CELL + 24 - p.y) - Math.hypot(b[0] * CELL + 24 - p.x, b[1] * CELL + 24 - p.y));
  api.chooseBuild("gourdgate");
  for (const [c, r] of cells) {
    const n = w.towers.length;
    api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
    if (w.towers.length > n) {
      api.dismissSelection();
      return w.towers[n];
    }
  }
  throw new Error("no tile for the gate");
}

function fruit(api: Api, n: number): Fruit[] {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 40 && w.enemies.filter((f) => f.hp > 0).length < n; i++) stepWorld(w, 1 / 60);
  const out = w.enemies.filter((f) => f.hp > 0).slice(0, n);
  assert.equal(out.length, n);
  w.enemies = out;
  for (const f of out) Object.assign(f, { hp: 99999, maxHp: 99999, guard: "none", shell: 0, pit: false, boss: false, freeze: 0 });
  return out;
}

/** A point `along` px down the carpet, and the waypoint a walker there heads to. */
function spotAt(api: Api, along: number) {
  const pts = api.world.points;
  let left = along;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= d) return { x: a.x + ((b.x - a.x) / d) * left, y: a.y + ((b.y - a.y) / d) * left, wp: k };
    left -= d;
  }
  throw new Error("past the end");
}

const seconds = (api: Api, s: number) => {
  for (let i = 0; i < Math.round(s * 60); i++) stepWorld(api.world, 1 / 60);
};

test("Sir Michael's three towers: Trebuchet, Gourd Gate (300), Harvest Bombard (400), his alone", () => {
  assert.deepEqual(KEEPER_TOWERS.michael, ["trebuchet", "gourdgate", "bombard"]);
  assert.equal(TOWERS.gourdgate.cost, 300);
  assert.equal(TOWERS.bombard.cost, 400);
  const other = createWorld(() => {}, { meta: EMPTY_META });
  other.openSetup();
  other.chooseHero("mynxi");
  other.beginNight();
  other.chooseBuild("bombard");
  assert.notEqual(other.world.hud.build, "bombard");
});

test("the Bombard is 50 less under the pumpkin oath", () => {
  const sling = start("sling");
  sling.chooseBuild("bombard");
  const door = start("door");
  door.chooseBuild("bombard");
  assert.equal(sling.world.hud.towerCost, door.world.hud.towerCost - CANNON.bombardSlingDiscount);
});

test("the Gourd Gate must touch the carpet", () => {
  const api = start();
  assert.equal(build(api, "gourdgate", false), null, "not off the carpet");
  assert.ok(build(api, "gourdgate", true), "beside it is fine");
});

/** A Gate and a fruit walking up to its portcullis; returns how far the fruit got in `s` seconds. */
function heldFor(oath: OathId, s: number, boss = false, near = 0.5) {
  const api = start(oath);
  const total = carpetAlong(api.world.points, 0, 0, 0, false).total;
  const gate = gateNear(api, spotAt(api, Math.max(CELL, total * near)));
  const [e] = fruit(api, 1);
  e.boss = boss;
  const g = gate.gate!;
  Object.assign(e, spotAt(api, g.along - 20), { reverse: false });
  const at = carpetAlong(api.world.points, e.x, e.y, e.wp, false).along;
  const hp = e.hp;
  seconds(api, s);
  return { moved: carpetAlong(api.world.points, e.x, e.y, e.wp, false).along - at, lost: hp - e.hp, api, gate };
}

test("the portcullis holds a fruit for 3 s and its crossbows hit it; then it walks on", () => {
  const held = heldFor("sling", 2.5);
  assert.ok(held.moved < 1, `held (moved ${held.moved})`);
  assert.ok(held.lost > 2 * held.api.statsOf(held.gate.id)!.dmg * 0.9, `shot while held (${held.lost})`);
  const later = heldFor("sling", CANNON.gateHold + 1.2);
  assert.ok(later.moved > 10, `walked on after (moved ${later.moved})`);
});

test("Karl is only held for 1 s", () => {
  const karl = heldFor("sling", 2.2, true);
  assert.ok(karl.moved > 10, `Karl got going (moved ${karl.moved})`);
});

test("inside his oath's zone the portcullis holds 4 s", () => {
  // The gate tile nearest the start of the carpet sits in the mouth zone.
  const zone = heldFor("mouth", CANNON.gateHold + 0.6, false, 0);
  const outside = heldFor("sling", CANNON.gateHold + 0.6, false, 0);
  assert.ok(zone.moved < 1, `held longer in the zone (moved ${zone.moved})`);
  assert.ok(outside.moved > 1, `outside the zone it let go (moved ${outside.moved})`);
});

test("the Bombard lands on the biggest crowd: full hit there, 60% around it, a one-tile shove (not Karl), and fire", () => {
  const api = start();
  const w = api.world;
  const bomb = build(api, "bombard", false)!;
  const [a, b, c, lone] = fruit(api, 4);
  const total = carpetAlong(w.points, 0, 0, 0, false).total;
  const mid = spotAt(api, total * 0.5);
  for (const e of [a, b, c, lone]) e.freeze = 999;
  Object.assign(a, spotAt(api, total * 0.5));
  Object.assign(b, spotAt(api, total * 0.5 + 20));
  Object.assign(c, spotAt(api, total * 0.5 - 20), { boss: true });
  Object.assign(lone, spotAt(api, Math.min(total - 30, total * 0.5 + 200)));
  const before = new Map([a, b, c, lone].map((e) => [e.id, { hp: e.hp, along: carpetAlong(w.points, e.x, e.y, e.wp, false).along }]));
  bomb.cd = 0;
  const pools = w.pools.length;
  let shot: (typeof w.shots)[number] | undefined;
  for (let i = 0; i < 60 * 10; i++) {
    stepWorld(w, 1 / 60);
    shot ??= w.shots.find((s) => s.bombard);
    if (shot && !w.shots.includes(shot)) break;
  }
  assert.ok(shot, "it fired");
  assert.ok([a.id, b.id, c.id].includes(shot!.target), "at the crowd, not the lone fruit");
  bomb.cd = 999;
  const dmg = api.statsOf(bomb.id)!.dmg;
  const lost = (e: Fruit) => before.get(e.id)!.hp - e.hp;
  const target = [a, b, c].find((e) => e.id === shot!.target)!;
  assert.ok(lost(target) >= dmg, `the target takes the full hit (${lost(target)} of ${dmg})`);
  for (const e of [a, b, c]) if (e !== target) assert.ok(lost(e) >= dmg * CANNON.bombardSplashRatio, `splash on the others (${lost(e)})`);
  assert.equal(lost(lone), 0, "the lone fruit is out of the blast");
  const shoved = (e: Fruit) => before.get(e.id)!.along - carpetAlong(w.points, e.x, e.y, e.wp, false).along;
  for (const e of [a, b]) assert.ok(Math.abs(shoved(e) - CELL) < 4, `shoved a tile (${shoved(e)})`);
  assert.ok(Math.abs(shoved(c)) < 0.5, "Karl isn't shoved");
  assert.ok(w.pools.length > pools && w.pools.some((p) => p.hot), "a burning patch");
  void mid;
});
