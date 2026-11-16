import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  BOARDS,
  CELL,
  FLOOR,
  ROOM,
  START_ROOMS,
  buildBoard,
  createWorld,
  emptyProgress,
  floorPace,
  floorTiles,
  shelfCells,
  stepWorld,
  unlockedMaps,
  type MapId,
} from "../src/game/engine.ts";

const NEW_MAPS: MapId[] = ["sorting", "greenhouse", "belltower"];
const center = (n: number) => n * CELL + CELL / 2;

/** A night on `map` with nothing built, plenty of stacks, and the first fruit on the carpet. */
function night(map: MapId) {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map, hero: "mynxi" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 999;
  api.world.hud.maxLives = 999;
  api.startWave();
  for (let i = 0; i < 600 && !api.world.enemies.length; i++) stepWorld(api.world, 1 / 60);
  assert.ok(api.world.enemies.length, "a fruit is out");
  return api;
}
type Api = ReturnType<typeof night>;

/** Put the first fruit at the middle of tile (c, r), heading for waypoint `wp`, and return how far it moves in one frame. */
function stride(api: Api, c: number, r: number, wp: number, reverse = false) {
  const e = api.world.enemies[0];
  for (const o of api.world.enemies.slice(1)) o.hp = 0;
  api.world.enemies = [e];
  Object.assign(e, { x: center(c), y: center(r), wp, reverse, chill: 0, freeze: 0, driven: 0 });
  const x = e.x;
  const y = e.y;
  stepWorld(api.world, 1 / 60);
  return Math.hypot(e.x - x, e.y - y);
}

test("every floor tile sits on its own board's carpet, running the carpet's way", () => {
  for (const map of Object.keys(BOARDS) as MapId[]) {
    const built = buildBoard(BOARDS[map].corners);
    for (const [key, tile] of floorTiles(map)) {
      assert.ok(built.cells.has(key), `${map}: ${key} is carpet`);
      if (tile.kind === "bed") continue;
      // The next tile along the run is carpet too, or the run's last tile turns a corner.
      const [c, r] = key.split(",").map(Number);
      assert.ok(built.cells.has(`${c + tile.dc},${r + tile.dr}`), `${map}: ${key} leads on along the carpet`);
    }
  }
  assert.equal([...floorTiles("sorting").values()].filter((t) => t.kind === "belt").length, 12);
  assert.equal([...floorTiles("greenhouse").values()].filter((t) => t.kind === "bed").length, 6);
  assert.equal([...floorTiles("belltower").values()].filter((t) => t.kind === "up").length, 7);
  assert.equal([...floorTiles("belltower").values()].filter((t) => t.kind === "down").length, 7);
  // The bell stands on four shelf cells.
  const [bc, br] = BOARDS.belltower.bell!;
  const shelves = shelfCells("belltower", buildBoard(BOARDS.belltower.corners).cells);
  for (const [c, r] of [[bc, br], [bc + 1, br], [bc, br + 1], [bc + 1, br + 1]]) assert.ok(shelves.has(`${c},${r}`), `bell ${c},${r}`);
});

test("pace: belts and stairs change speed the carpet's way, and reverse it walking back", () => {
  assert.equal(floorPace("belt", false), FLOOR.belt);
  assert.equal(floorPace("belt", true), 1 / FLOOR.belt);
  assert.equal(floorPace("up", false), FLOOR.up);
  assert.equal(floorPace("down", false), FLOOR.down);
  assert.equal(floorPace("up", true), 1 / FLOOR.up);
  assert.equal(floorPace("bed", false), 1);
  assert.equal(floorPace(undefined, true), 1);
});

test("a fruit on a Sorting Room belt moves 60% further a frame; walking back against it, less", () => {
  const api = night("sorting");
  // Corners: 0 [0,3], 1 [5,3], 2 [5,7], 3 [10,7]. Tile [5,5] is plain carpet heading for corner 2; [7,7] is a belt heading for corner 3.
  const plain = stride(api, 5, 5, 2);
  const belt = stride(api, 7, 7, 3);
  assert.ok(Math.abs(belt / plain - FLOOR.belt) < 0.02, `belt ${belt} vs plain ${plain}`);
  const back = stride(api, 7, 7, 2, true);
  assert.ok(Math.abs(back / plain - 1 / FLOOR.belt) < 0.02, `against the belt ${back}`);
});

test("Bell Tower stairs: slow going up, fast coming down", () => {
  const api = night("belltower");
  // Corners: 0 [0,9], 1 [2,9], 2 [2,1], 3 [13,1], 4 [13,9]. Row 1 between them is plain carpet.
  const plain = stride(api, 6, 1, 3);
  const up = stride(api, 2, 5, 2);
  const down = stride(api, 13, 5, 4);
  assert.ok(Math.abs(up / plain - FLOOR.up) < 0.02, `up ${up} vs ${plain}`);
  assert.ok(Math.abs(down / plain - FLOOR.down) < 0.02, `down ${down} vs ${plain}`);
});

test("a growth bed heals a hurt fruit, but not while it burns", () => {
  const api = night("greenhouse");
  const e = api.world.enemies[0];
  for (const o of api.world.enemies.slice(1)) o.hp = 0;
  api.world.enemies = [e];
  // Corners: 2 [3,2], 3 [8,2]. Tile [5,2] is a bed; hold the fruit still on it.
  Object.assign(e, { x: center(5), y: center(2), wp: 3, freeze: 99 });
  e.hp = e.maxHp / 2;
  for (let i = 0; i < 60; i++) stepWorld(api.world, 1 / 60);
  const healed = e.hp - e.maxHp / 2;
  assert.ok(Math.abs(healed - e.maxHp * FLOOR.bedHeal) < e.maxHp * 0.005, `healed ${healed}`);

  e.hp = e.maxHp / 2;
  api.world.pools.push({ x: e.x, y: e.y, r: 30, life: 5, max: 5, hot: true, burn: 22 });
  stepWorld(api.world, 1 / 60);
  assert.ok(e.hp < e.maxHp / 2, "burning: no healing, and it hurts");
});

test("off a bed nothing heals; the Greenhouse is damp, so burning does 45% less", () => {
  const damp = night("greenhouse");
  const dry = night("stacks");
  const burnt = (api: Api, c: number, r: number, wp: number) => {
    const e = api.world.enemies[0];
    for (const o of api.world.enemies.slice(1)) o.hp = 0;
    api.world.enemies = [e];
    Object.assign(e, { x: center(c), y: center(r), wp, freeze: 99, guard: "none", shell: 0 });
    e.hp = e.maxHp;
    api.world.pools.push({ x: e.x, y: e.y, r: 30, life: 5, max: 5, hot: true, burn: 22 });
    for (let i = 0; i < 30; i++) stepWorld(api.world, 1 / 60);
    return e.maxHp - e.hp;
  };
  const a = burnt(damp, 3, 5, 2); // plain carpet in the Greenhouse
  const b = burnt(dry, 3, 5, 1); // plain carpet in the Stacks
  assert.ok(Math.abs(a / b - 0.55) < 0.02, `damp ${a} vs dry ${b}`);
});

test("the Bell Tower strikes every 24 s of a wave: towers go quiet for 2.5 s, then carry on", () => {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map: "belltower", hero: "mynxi" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 999;
  api.world.hud.seeds = 9999;
  // A melon beside the stairs.
  api.chooseBuild("melon");
  api.pointer(center(3), center(5), "down");
  api.dismissSelection();
  const tower = api.world.towers[0];
  assert.ok(tower, "built");
  api.startWave();
  const w = api.world;
  assert.deepEqual(w.bell, { next: FLOOR.bellEvery, quiet: 0 });
  for (let i = 0; i < Math.ceil(FLOOR.bellEvery * 60) + 1; i++) stepWorld(w, 1 / 60);
  assert.ok(w.bell!.quiet > 0, "struck");
  // While it rings nothing fires: the tower's cooldown holds.
  const cd = tower.cd;
  const shots = w.shots.length;
  for (let i = 0; i < 60; i++) stepWorld(w, 1 / 60);
  assert.equal(tower.cd, cd, "the tower waits");
  assert.ok(w.shots.length <= shots, "no new shots");
  for (let i = 0; i < 120; i++) stepWorld(w, 1 / 60);
  assert.equal(w.bell!.quiet, 0, "quiet over");
  assert.notEqual(tower.cd, cd, "and it acts again");
});

test("boards without a bell never go quiet", () => {
  const api = night("sorting");
  assert.equal(api.world.bell, null);
});

test("the new maps open with their Grand Catalogue rooms", () => {
  for (const map of NEW_MAPS) {
    assert.ok(!unlockedMaps(START_ROOMS).includes(map), `${map} locked at the start`);
    assert.deepEqual(ROOM[map as "sorting"].rewards, [{ kind: "map", id: map }]);
    assert.ok(unlockedMaps([...START_ROOMS, map as "sorting"]).includes(map), `${map} open once restored`);
  }
});
