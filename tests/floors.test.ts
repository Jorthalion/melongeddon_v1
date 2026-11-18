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
  assert.equal([...floorTiles("sorting").values()].filter((t) => t.kind === "belt").length, 18);
  assert.equal([...floorTiles("greenhouse").values()].filter((t) => t.kind === "bed").length, 9);
  // The Greenhouse's middle bed moved one tile along when its middle drop became a diagonal.
  assert.equal(floorTiles("greenhouse").get("13,8")?.kind, "bed");
  assert.equal(floorTiles("greenhouse").get("14,8")?.kind, "bed");
  assert.ok(!floorTiles("greenhouse").has("12,8"));
  assert.deepEqual(BOARDS.greenhouse.corners.slice(3, 6), [[10, 2], [10, 5], [13, 8]]);
  assert.deepEqual(BOARDS.belltower.corners.slice(3, 7), [[7, 1], [10, 4], [11, 4], [14, 1]]);
  for (const map of NEW_MAPS) assert.equal(BOARDS[map].carpet, "path", `${map} draws a rounded carpet`);
  assert.equal([...floorTiles("belltower").values()].filter((t) => t.kind === "up").length, 10);
  assert.equal([...floorTiles("belltower").values()].filter((t) => t.kind === "down").length, 10);
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
  // Corners: 0 [0,3], 1 [6,3], 2 [6,10]. Tile [3,3] is plain carpet heading for corner 1; [6,6] is a belt heading for corner 2.
  const plain = stride(api, 3, 3, 1);
  const belt = stride(api, 6, 6, 2);
  assert.ok(Math.abs(belt / plain - FLOOR.belt) < 0.02, `belt ${belt} vs plain ${plain}`);
  const back = stride(api, 6, 6, 1, true);
  assert.ok(Math.abs(back / plain - 1 / FLOOR.belt) < 0.02, `against the belt ${back}`);
});

test("Bell Tower stairs: slow going up, fast coming down", () => {
  const api = night("belltower");
  // Corners: 0 [0,12], 1 [3,12], 2 [3,1], 3 [8,1] … 7 [18,1], 8 [18,12]. Row 1 from [3,1] to [8,1] is plain carpet.
  const plain = stride(api, 5, 1, 3);
  const up = stride(api, 3, 6, 2);
  const down = stride(api, 18, 6, 8);
  assert.ok(Math.abs(up / plain - FLOOR.up) < 0.02, `up ${up} vs ${plain}`);
  assert.ok(Math.abs(down / plain - FLOOR.down) < 0.02, `down ${down} vs ${plain}`);
});

test("a growth bed heals a hurt fruit, but not while it burns", () => {
  const api = night("greenhouse");
  const e = api.world.enemies[0];
  for (const o of api.world.enemies.slice(1)) o.hp = 0;
  api.world.enemies = [e];
  // Corners: 2 [4,2], 3 [10,2]. Tile [7,2] is a bed; hold the fruit still on it.
  Object.assign(e, { x: center(7), y: center(2), wp: 3, freeze: 99 });
  e.hp = e.maxHp / 2;
  for (let i = 0; i < 60; i++) stepWorld(api.world, 1 / 60);
  const healed = e.hp - e.maxHp / 2;
  assert.ok(Math.abs(healed - e.maxHp * FLOOR.bedHeal) < e.maxHp * 0.005, `healed ${healed}`);

  e.hp = e.maxHp / 2;
  api.world.pools.push({ x: e.x, y: e.y, r: 30, life: 5, max: 5, hot: true, burn: 22 });
  stepWorld(api.world, 1 / 60);
  assert.ok(e.hp < e.maxHp / 2, "burning: no healing, and it hurts");
});

test("a doused fruit is still steaming: no fire, but the bed doesn't heal it", () => {
  const api = night("greenhouse");
  const e = api.world.enemies[0];
  api.world.enemies = [e];
  Object.assign(e, { x: center(7), y: center(2), wp: 3, freeze: 99, doused: 1 });
  e.hp = e.maxHp / 2;
  for (let i = 0; i < 30; i++) stepWorld(api.world, 1 / 60);
  assert.equal(e.hp, e.maxHp / 2, "steaming: neither burnt nor healed");
  for (let i = 0; i < 60; i++) stepWorld(api.world, 1 / 60);
  assert.ok(e.hp > e.maxHp / 2, "the steam clears, then the bed heals");
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
  const a = burnt(damp, 4, 6, 2); // plain carpet in the Greenhouse
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
  api.pointer(center(4), center(6), "down");
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

test("the three big rooms: 22 × 14, shelves along the walls, never on the carpet or Michael's spot", () => {
  for (const map of NEW_MAPS) {
    const b = BOARDS[map];
    assert.equal(b.cols, 22, `${map} cols`);
    assert.equal(b.rows, 14, `${map} rows`);
    const carpet = buildBoard(b.corners).cells;
    const shelves = new Set((b.shelves ?? []).map(([c, r]) => `${c},${r}`));
    assert.equal(shelves.size, b.shelves!.length, `${map}: no shelf listed twice`);
    for (const key of shelves) {
      const [c, r] = key.split(",").map(Number);
      assert.ok(c >= 0 && r >= 0 && c < 22 && r < 14, `${map}: shelf ${key} on the board`);
      assert.ok(!carpet.has(key), `${map}: shelf ${key} is off the carpet`);
    }
    const mc = `${b.michaelCannon[0]},${b.michaelCannon[1]}`;
    assert.ok(!shelves.has(mc) && !carpet.has(mc), `${map}: Michael's spot is open floor`);
    // About 12–18% of the floor.
    const share = shelves.size / (22 * 14 - carpet.size);
    assert.ok(share >= 0.12 && share <= 0.18, `${map}: shelves ${Math.round(share * 100)}% of the floor`);
    // Every straight has open floor beside it somewhere.
    for (let i = 1; i < b.corners.length; i++) {
      const [a, z] = [b.corners[i - 1], b.corners[i]];
      const dc = Math.sign(z[0] - a[0]);
      const dr = Math.sign(z[1] - a[1]);
      let open = false;
      for (let [c, r] = a; ; c += dc, r += dr) {
        for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
          const k = `${nc},${nr}`;
          if (nc >= 0 && nr >= 0 && nc < 22 && nr < 14 && !carpet.has(k) && !shelves.has(k)) open = true;
        }
        if (c === z[0] && r === z[1]) break;
      }
      assert.ok(open, `${map}: the straight from ${a} to ${z} has open floor beside it`);
    }
  }
  const [bc, br] = BOARDS.belltower.bell!;
  const listed = new Set(BOARDS.belltower.shelves!.map(([c, r]) => `${c},${r}`));
  for (const [c, r] of [[bc, br], [bc + 1, br], [bc, br + 1], [bc + 1, br + 1]]) assert.ok(listed.has(`${c},${r}`), `bell ${c},${r} is listed`);
});

test("a saved setup on one of the big rooms (only the map id is saved) loads the new layout", () => {
  for (const map of NEW_MAPS) {
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map, hero: "mynxi" } });
    api.openSetup();
    api.chooseHero("mynxi");
    api.beginNight();
    assert.equal(api.world.hud.map, map);
    assert.equal(api.world.w, 22 * CELL);
    assert.equal(api.world.h, 14 * CELL);
    api.startWave();
    for (let i = 0; i < 300; i++) stepWorld(api.world, 1 / 60);
    assert.ok(api.world.enemies.length > 0, `${map}: fruit walk the new carpet`);
  }
});
