import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  CELL,
  PASSIVE,
  createWorld,
  emptyProgress,
  groupsFor,
  maxedProgress,
  towerReadout,
  type HeroId,
  type MapId,
  type TowerKind,
} from "../src/game/engine.ts";

type Api = ReturnType<typeof createWorld>;
const center = (n: number) => n * CELL + CELL / 2;

function night(hero: HeroId = "mynxi", map: MapId = "stacks", keepers = emptyProgress()) {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers, allTricks: true, setup: { night: "midnight", map, hero } });
  api.openSetup();
  api.chooseHero(hero);
  if (hero === "michael") api.pickOath("sling");
  else api.beginNight();
  api.world.hud.seeds = 99999;
  return api;
}

/** Open floor tiles beside the carpet (in board order). */
function floorTiles(api: Api) {
  const w = api.world;
  const out: Array<{ c: number; r: number }> = [];
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.vergeCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      out.push({ c, r });
    }
  return out;
}

/** Build `kind` on `at`, returning the new tower (or null if it couldn't be built there). */
function build(api: Api, kind: TowerKind, at: { c: number; r: number }) {
  const n = api.world.towers.length;
  api.chooseBuild(kind);
  api.pointer(center(at.c), center(at.r), "down");
  api.dismissSelection();
  return api.world.towers.length > n ? api.world.towers[n] : null;
}
const same = (a: { dmg: number; range: number; interval: number }, b: { dmg: number; range: number; interval: number }, what: string) => {
  assert.equal(a.dmg, b.dmg, `${what}: dmg`);
  assert.equal(a.range, b.range, `${what}: range`);
  assert.ok(Math.abs(a.interval - b.interval) < 1e-9, `${what}: interval ${a.interval} vs ${b.interval}`);
};

test("fittings: Longer barrel bought for the Melon shows in its preview, and a Melon built then matches", () => {
  const api = night();
  const before = api.previewStats("melon");
  api.openShop("melon");
  api.pickMod("reach");
  assert.ok((api.world.hud.fitted.melon ?? []).includes("reach"), "bought");
  const after = api.previewStats("melon");
  assert.ok(after.range > before.range, "the preview reaches farther");
  assert.ok(after.why.range.some((w) => w.startsWith("Longer barrel")), after.why.range.join(" | "));
  const tile = floorTiles(api)[0];
  const at = api.previewStats("melon", tile);
  const t = build(api, "melon", tile)!;
  same(api.statsOf(t.id)!, at, "built melon");
});

test("perks: with a keeper's perks, the preview matches the built tower", () => {
  for (const pick of [0, 1] as const) {
    const api = night("mynxi", "stacks", maxedProgress(pick));
    const tile = floorTiles(api)[2];
    const at = api.previewStats("melon", tile);
    const t = build(api, "melon", tile)!;
    same(api.statsOf(t.id)!, at, `perks ${pick}`);
  }
});

test("the Archive: the preview shows the dark; on a tile in a Reading Lamp's light, the lamp; built towers match", () => {
  const api = night("mynxi", "archive");
  const anywhere = api.previewStats("melon");
  assert.ok(anywhere.range < anywhere.base.range, "darkened");
  assert.ok(anywhere.why.range.some((w) => w.startsWith("the dark")));
  const tiles = floorTiles(api);
  const lamp = build(api, "lantern", tiles[0])!;
  const near = floorTiles(api).find((t) => Math.hypot(center(t.c) - lamp.x, center(t.r) - lamp.y) <= CELL * 1.2)!;
  const lit = api.previewStats("melon", near);
  assert.ok(lit.lit && lit.range > anywhere.range, "the lamp lights it");
  assert.ok(lit.why.range.some((w) => w.startsWith("Reading Lamp nearby")));
  const t = build(api, "melon", near)!;
  same(api.statsOf(t.id)!, lit, "built under the lamp");
});

test("Quack-Liber haste: a tile in its aura previews the faster pace; a tile outside doesn't", () => {
  const api = night("quack");
  const tiles = floorTiles(api);
  const q = build(api, "quackliber", tiles[0])!;
  const inside = floorTiles(api).find((t) => Math.hypot(center(t.c) - q.x, center(t.r) - q.y) <= api.world.hud.quackAura - 1)!;
  const outside = floorTiles(api).find((t) => Math.hypot(center(t.c) - q.x, center(t.r) - q.y) > api.world.hud.quackAura + CELL)!;
  const fast = api.previewStats("melon", inside);
  const slow = api.previewStats("melon", outside);
  assert.ok(fast.interval < slow.interval, `${fast.interval} vs ${slow.interval}`);
  assert.ok(fast.quick);
  assert.ok(fast.why.interval.some((w) => w.startsWith("Quack-Liber aura")));
});

test("every kind: building it on a tile gives the numbers previewed for that tile", () => {
  for (const hero of ["mynxi", "vael", "elf", "ooze", "quack", "michael", "asser", "scholar"] as HeroId[]) {
    const api = night(hero);
    for (const g of groupsFor(hero))
      for (const kind of g.kinds) {
        if (kind === "copycat" || kind === "pamphlet") continue;
        const tile = floorTiles(api).find(Boolean);
        if (!tile) break;
        const at = api.previewStats(kind, tile);
        const t = build(api, kind, tile);
        if (!t) continue; // one at a time, or locked: nothing to compare
        same(api.statsOf(t.id)!, at, `${hero} ${kind}`);
      }
  }
});

test("base is the plain numbers: no fittings, no perks", () => {
  const api = night("mynxi", "stacks", maxedProgress(0));
  api.openShop("melon");
  api.pickMod("reach");
  for (const kind of ["melon", "mortar", "spitter", "ballista", "reader"] as TowerKind[]) {
    const plain = towerReadout(api.world.hud.hero, kind, [], api.world.hud.upgrades);
    const { base } = api.previewStats(kind);
    assert.deepEqual(base, plain, kind);
  }
  assert.ok(PASSIVE.length > 0);
});
