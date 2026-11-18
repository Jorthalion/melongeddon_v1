import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CANNON, CELL, createWorld, emptyProgress, stepWorld, type TowerKind } from "../src/game/engine.ts";

type Api = ReturnType<typeof createWorld>;
const center = (n: number) => n * CELL + CELL / 2;

function night() {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), allTricks: true, setup: { night: "midnight", map: "stacks", hero: "mynxi" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.seeds = 99999;
  api.world.hud.lives = 999;
  return api;
}
/** Build `kind` on the first open floor tile beside the carpet. */
function build(api: Api, kind: TowerKind) {
  const w = api.world;
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      const n = w.towers.length;
      api.chooseBuild(kind);
      api.pointer(center(c), center(r), "down");
      api.dismissSelection();
      if (w.towers.length > n) return w.towers[n];
    }
  throw new Error(`no tile for ${kind}`);
}

/** Eight fruit in a tight row on the ballista's line; fire once; how many did the spear hit? */
function spearHits(fitted: boolean) {
  const api = night();
  const w = api.world;
  if (fitted) w.hud.fitted.ballista = ["pierce"];
  const b = build(api, "ballista");
  api.startWave();
  for (let i = 0; i < 600 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const proto = w.enemies[0];
  w.enemies = Array.from({ length: 8 }, (_, k) => ({ ...proto, id: 800000 + k, hp: 1e5, maxHp: 1e5, speed: 0, x: b.x + 40 + k * 6, y: b.y }));
  b.cd = 0;
  stepWorld(w, 1 / 60);
  return w.enemies.filter((e) => e.hp < e.maxHp).length;
}

test("the Ballista's spear goes through the first four fruit; Through and through adds three", () => {
  assert.equal(spearHits(false), CANNON.ballistaPierce);
  assert.equal(spearHits(true), CANNON.ballistaPierce + CANNON.ballistaPierceMore);
});

test("its numbers say so: statsOf, previewStats and the preview with the upgrade", () => {
  const api = night();
  const b = build(api, "ballista");
  assert.equal(api.statsOf(b.id)!.pierce, CANNON.ballistaPierce);
  assert.equal(api.previewStats("ballista").pierce, CANNON.ballistaPierce);
  assert.equal(api.previewStats("ballista", undefined, ["pierce"]).pierce, CANNON.ballistaPierce + CANNON.ballistaPierceMore);
});

test("the back room: hovering an upgrade shows each tower's reach now and with it; leaving or closing clears it", () => {
  const api = night();
  const w = api.world;
  build(api, "melon");
  build(api, "melon");
  api.openShop("melon");
  api.shopHover("reach");
  assert.equal(w.hud.shopRings.length, 2, "one ring per melon");
  for (const r of w.hud.shopRings) assert.ok(r.next > r.now, `${r.now} → ${r.next}`);
  assert.ok(api.previewStats("melon", undefined, ["reach"]).range > api.previewStats("melon").range, "the With line has the longer reach");
  api.shopHover(null);
  assert.equal(w.hud.shopRings.length, 0);
  api.shopHover("reach");
  api.closeShop();
  assert.equal(w.hud.shopRings.length, 0, "closing clears it");
  // An upgrade already owned shows nothing new.
  api.openShop("melon");
  w.hud.fitted.melon = ["reach"];
  api.shopHover("reach");
  assert.equal(w.hud.shopRings.length, 0);
});

test("every back-room fitting has its own hover line, and the numbers in it are real", async () => {
  const { TOWERS, fittingDetail, fittingsFor, MODS } = await import("../src/game/engine.ts");
  for (const kind of Object.keys(TOWERS) as Array<keyof typeof TOWERS>) {
    for (const mod of fittingsFor(kind)) {
      const line = fittingDetail(kind, mod.id);
      assert.ok(line.length > 10, `${kind}/${mod.id} has a line`);
      assert.ok(!/NaN|undefined/.test(line), `${kind}/${mod.id}: ${line}`);
    }
  }
  // Every fitting in MODS has its own case, not the blurb fallback.
  for (const mod of MODS) assert.notEqual(fittingDetail(mod.kinds[0], mod.id), mod.blurb, mod.id);
  assert.equal(fittingDetail("ballista", "pierce"), "The spear goes through 7 fruit instead of 4.");
});
