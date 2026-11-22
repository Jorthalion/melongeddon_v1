import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  BASEMENT,
  BOARDS,
  CELL,
  buildBoard,
  canCopy,
  createWorld,
  deepWave,
  emptyProgress,
  floodedTile,
  heightTiles,
  openMaps,
  roomFor,
  stepWorld,
  waterFor,
  type MapId,
  type TowerKind,
} from "../src/game/engine.ts";

const board = BOARDS.basement;
const centre = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

function start(map: MapId = "basement") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map, hero: "mynxi" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

function build(api: Api, kind: TowerKind, c: number, r: number) {
  api.chooseBuild(kind);
  api.pointer(centre(c, r).x, centre(c, r).y, "down");
  api.dismissSelection();
  const t = api.world.towers.find((x) => x.kind === kind && x.c === c && x.r === r);
  assert.ok(t, `${kind} built at ${c},${r}`);
  return t;
}
/** Start a wave and keep only its first fruit (others are cleared as they come in). */
function firstFruit(api: Api) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const f = w.enemies[0] as Fruit;
  w.enemies = [f];
  return f;
}
/** A still copy of a fruit, standing on a tile. */
function standIn(f: Fruit, id: number, c: number, r: number, extra: Partial<Fruit> = {}): Fruit {
  return { ...f, id, hp: 9999, maxHp: 9999, speed: 0, guard: "none", shell: 0, boss: false, freeze: 0, chill: 0, native: undefined, ...centre(c, r), ...extra } as Fruit;
}
/** Step, keeping only `keep` on the board. */
function run(api: Api, keep: Fruit[], secs: number, each?: () => void) {
  const w = api.world;
  for (let i = 0; i < 60 * secs; i++) {
    w.enemies = w.enemies.filter((e) => keep.includes(e));
    for (const k of keep) if (!w.enemies.includes(k) && k.hp > 0) w.enemies.push(k);
    each?.();
    stepWorld(w, 1 / 60);
  }
}
/** Play out the wave in progress with no fruit left standing, and land on the next break. */
function finishWave(api: Api) {
  const w = api.world;
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  for (let guard = 0; guard < 5 && w.hud.phase !== "prep"; guard++) {
    if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
    else if (w.hud.phase === "consequence") api.startWave();
    else break;
  }
}

test("the board: two-thirds of the carpet is low, the high floor keeps two tiles from it, other maps have no heights", () => {
  const heights = heightTiles("basement");
  const low = new Set(board.heights!.low.map(([c, r]) => `${c},${r}`));
  for (const [c, r] of board.heights!.mid) assert.ok(!low.has(`${c},${r}`), `${c},${r} has one height`);
  for (const key of heights.keys()) {
    const [c, r] = key.split(",").map(Number);
    assert.ok(c >= 0 && c < 18 && r >= 0 && r < 12, `${key} is on the board`);
  }
  const { cells } = buildBoard(board.corners);
  const carpet = [...cells];
  const lowShare = carpet.filter((k) => heights.get(k) === "low").length / carpet.length;
  assert.ok(lowShare >= 0.6 && lowShare <= 0.8, `about two-thirds of the carpet is low (${lowShare.toFixed(2)})`);
  let high = 0;
  for (let c = 0; c < 18; c++)
    for (let r = 0; r < 12; r++) {
      if (heights.has(`${c},${r}`)) continue;
      high += 1;
      for (const k of carpet) {
        const [kc, kr] = k.split(",").map(Number);
        assert.ok(Math.max(Math.abs(kc - c), Math.abs(kr - r)) >= 2, `high ${c},${r} is two tiles from the carpet`);
      }
    }
  assert.ok(high >= 12 && high <= 30, `a few pallets of high floor (${high})`);
  for (const id of Object.keys(BOARDS) as MapId[]) if (id !== "basement") assert.equal(heightTiles(id).size, 0, `${id} has no heights`);
  const stacks = start("stacks");
  stacks.world.water = 3;
  assert.equal(floodedTile(stacks.world, 4, 3), false, "other maps never flood");
});

test("the water rises at 25% and 60% of a wave, to level 3 late in the warned waves only (by difficulty), and drains after", () => {
  assert.equal(waterFor(0.2, false), 0);
  assert.equal(waterFor(BASEMENT.rise[0], false), 1);
  assert.equal(waterFor(0.59, true), 1);
  assert.equal(waterFor(BASEMENT.rise[1], false), 2);
  assert.equal(waterFor(BASEMENT.rise[1], true), 2);
  assert.equal(waterFor(BASEMENT.deepRise - 0.01, true), 2);
  assert.equal(waterFor(BASEMENT.deepRise, true), 3);
  assert.equal(waterFor(1, false), 2, "never 3 on an ordinary wave");
  assert.equal(waterFor(0, false, 1), 1, "a plugged drain starts the wave at 1");
  const n = BASEMENT.deepOn.overdue!;
  assert.ok(deepWave(n, 21, "overdue") && deepWave(2 * n, 21, "overdue") && deepWave(21, 21, "overdue") && deepWave(21, 21, "hard") && deepWave(21, 21, "normal"));
  assert.ok(!deepWave(n - 1, 21, "overdue") && !deepWave(n + 1, 21, "overdue") && !deepWave(n + 1, null, "overdue"));
  assert.ok(!deepWave(n, 21, "normal"), "Normal: only the night's last wave");
  assert.ok(!deepWave(21, 21, "easy") && !deepWave(n, 21, "easy"), "Story never reaches level 3");
  // Play waves on a night where every 5th reaches level 3 (quicker than every 10th).
  const was = { ...BASEMENT.deepOn };
  BASEMENT.deepOn.normal = 5;
  const api = start();
  const w = api.world;
  for (let wave = 1; wave <= 5; wave++) {
    api.startWave();
    let top = 0;
    for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
      w.enemies.length = 0;
      stepWorld(w, 1 / 60);
      top = Math.max(top, w.water);
    }
    assert.equal(top, wave === 5 ? 3 : 2, `wave ${wave} peaks at ${wave === 5 ? 3 : 2}`);
    assert.equal(w.water, 0, `wave ${wave} drains`);
    assert.equal(w.hud.water, 0);
    finishWave(api);
  }
  BASEMENT.deepOn = was;
});

test("wading: fruit in water walk 30% slower (a boss 15%); the Water Melon 30% faster", () => {
  const api = start();
  const w = api.world;
  const f = firstFruit(api);
  // The first straight (row 1) is middle floor: dry at level 2 (the water can't fall during a wave), flooded at 3.
  const wp = w.points.findIndex((p) => p.x === centre(12, 1).x && p.y === centre(12, 1).y);
  let id = 900;
  const walk = (level: number, extra: Partial<Fruit>) => {
    const g = standIn(f, id++, 16, 1, { speed: 40, hp: 9999, wp, ...extra });
    run(api, [g], 0.5, () => (w.water = level));
    return centre(16, 1).x - g.x;
  };
  const dry = walk(2, {});
  assert.ok(dry > 10);
  assert.ok(Math.abs(walk(3, {}) / dry - BASEMENT.wadeSlow) < 0.03, "30% slower");
  assert.ok(Math.abs(walk(3, { boss: true }) / walk(2, { boss: true }) - BASEMENT.wadeSlowBoss) < 0.03, "a boss 15%");
  assert.ok(Math.abs(walk(3, { native: "watermelon" }) / walk(2, { native: "watermelon" }) - BASEMENT.snorkel) < 0.03, "the Water Melon swims");
});

test("waterlogged: a low cannon stops at level 1, a middle one at 3, a high one never; back after the wave", () => {
  const fires = (c: number, r: number, level: number) => {
    const api = start();
    const w = api.world;
    build(api, "melon", c, r);
    const f = firstFruit(api);
    const target = standIn(f, 990, c + (c > 8 ? -1 : 1), r);
    w.water = level;
    run(api, [target], 2);
    return { hit: target.hp < 9999, api };
  };
  assert.equal(fires(8, 6, 1).hit, false, "low, level 1");
  assert.equal(fires(8, 6, 0).hit, true, "low, dry");
  assert.equal(fires(1, 9, 2).hit, true, "middle, level 2");
  assert.equal(fires(1, 9, 3).hit, false, "middle, level 3");
  assert.equal(fires(16, 10, 3).hit, true, "high, level 3");
  const { api } = fires(8, 6, 1);
  finishWave(api);
  assert.equal(api.world.water, 0);
  assert.equal(floodedTile(api.world, 8, 6), false, "dry again for the next wave");
});

test("a waterlogged Reading Lamp lights nothing", () => {
  const api = start();
  const w = api.world;
  const cannon = build(api, "melon", 1, 9);
  build(api, "lantern", 2, 9);
  assert.equal(api.statsOf(cannon.id)?.lit, true, "lit while dry");
  w.water = 1;
  assert.notEqual(api.statsOf(cannon.id)?.lit, true, "dark once the lamp is in water");
});

test("fire fizzles in water: patches go out and a burning fruit that wades in stops burning", () => {
  const api = start();
  const w = api.world;
  const f = firstFruit(api);
  const g = standIn(f, 991, 6, 10, { burnT: 3, burnDps: 5 });
  w.water = 1;
  w.pools.push({ ...centre(8, 10), r: 34, life: 2, max: 2, hot: true, burn: 22 } as never);
  run(api, [g], 0.1);
  assert.equal(w.pools.filter((p) => p.hot).length, 0, "the patch went out");
  assert.equal(g.burnT ?? 0, 0, "no longer burning");
});

test("ice: a Freeze hit in water holds the fruit round it for 3 s (a boss 0.5 s), and fire melts it", () => {
  const api = start();
  const w = api.world;
  const freeze = build(api, "freeze", 1, 9);
  const f = firstFruit(api);
  const hitOne = standIn(f, 992, 3, 10);
  const nextTo = standIn(f, 993, 3, 10, { x: centre(3, 10).x + 20, boss: true });
  w.water = 1;
  run(api, [hitOne, nextTo], 0.8, () => {
    if (w.ice.length) freeze.cd = 999;
  });
  assert.equal(w.ice.length, 1, "the water froze");
  assert.ok((nextTo.stomped ?? 0) <= 0 || (w.ice[0].held.get(nextTo.id) ?? 0) >= 0, "the boss was held");
  // The boss lets go after half a second; the ordinary fruit is still held.
  run(api, [hitOne, nextTo], 0.5);
  assert.ok((hitOne.stomped ?? 0) > 0, "still iced in");
  assert.ok((nextTo.stomped ?? 0) <= 0, "the boss broke free");
  assert.ok((w.ice[0].held.get(nextTo.id) ?? 0) > BASEMENT.iceHoldBoss);
  // A fire hit on the ice melts it at once.
  build(api, "fire", 1, 11);
  run(api, [hitOne, nextTo], 1.2);
  assert.equal(w.ice.length, 0, "melted");
});

test("puddles spread 50% wider in water", () => {
  const width = (level: number) => {
    const api = start();
    const w = api.world;
    // The Still on a high pallet (never in water), the fruit on the middle floor beside it.
    build(api, "still", 1, 7);
    const f = firstFruit(api);
    const g = standIn(f, 994, 1, 8);
    let r = 0;
    run(api, [g], 3, () => {
      w.water = level;
      for (const p of w.pools) if (!p.hot) r = Math.max(r, p.r);
    });
    return r;
  };
  // On the middle floor: dry at level 2, flooded at 3.
  const dry = width(2);
  assert.ok(dry > 0);
  assert.ok(Math.abs(width(3) / dry - BASEMENT.puddleWide) < 0.01);
});

test("the Electric spark jumps 50% farther between two fruit in water", () => {
  const sparks = (level: number) => {
    const api = start();
    const w = api.world;
    w.hud.upgrades = [...w.hud.upgrades, "electric"];
    build(api, "mortar", 1, 7);
    const f = firstFruit(api);
    // 120 px apart: past the dry reach (92), inside the wet one (138). The near one is on the middle floor.
    const a = standIn(f, 996, 1, 8);
    const b = standIn(f, 997, 1, 8, { x: centre(1, 8).x + 120 });
    let n = 0;
    run(api, [a, b], 4, () => {
      w.water = level;
      n += w.sparks.filter((s) => s.life >= 0.17).length;
    });
    return n;
  };
  assert.equal(sparks(2), 0, "dry: too far for the spark");
  assert.ok(sparks(3) > 0, "both in water: it jumps");
});

test("a Drain Gourd that gets through plugs the drain; popping it lets the water go", () => {
  const api = start();
  const w = api.world;
  const f = firstFruit(api);
  const exitWp = w.points.length - 1;
  const gourd = standIn(f, 995, 1, 10, { native: "draingourd", speed: 200, wp: exitWp, hp: 50, maxHp: 50 });
  run(api, [gourd], 1);
  w.enemies = [];
  finishWave(api);
  assert.equal(w.hud.plugged, true, "plugged");
  assert.equal(w.water, 1, "the low floor stays flooded through the break");
  assert.equal(floodedTile(w, 8, 6), true);
  api.startWave();
  stepWorld(w, 1 / 60);
  assert.equal(w.water, 1, "the next wave starts at level 1");
  finishWave(api);
  assert.equal(w.hud.plugged, false);
  assert.equal(w.water, 0, "no Drain Gourd got through: it drains");
});

test("the Sump Pump keeps its tile and the eight round it dry; only on this map; never copied", () => {
  const api = start();
  const w = api.world;
  build(api, "pump", 8, 6);
  for (const level of [1, 2, 3]) {
    w.water = level;
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) assert.equal(floodedTile(w, 8 + dc, 6 + dr), false, `${8 + dc},${6 + dr} dry at ${level}`);
    assert.equal(floodedTile(w, 10, 6), true, `two tiles off floods at ${level}`);
  }
  assert.equal(canCopy("pump"), false);
  const stacks = start("stacks");
  const before = stacks.world.hud.build;
  stacks.chooseBuild("pump");
  assert.equal(stacks.world.hud.build, before, "no pump on other maps");
});

test("the Flooded Basement is unlocked by its own Catalogue room", () => {
  assert.equal(roomFor("map", "basement")?.id, "basement");
  assert.ok(openMaps(["stacks", "basement"]).includes("basement"));
  assert.ok(!openMaps(["stacks"]).includes("basement"));
});
