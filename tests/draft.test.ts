import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL,
  DRAFT,
  KEEPER_TOWERS,
  MIDNIGHT_WAVES,
  SIGNATURE,
  createWorld,
  draftPool,
  draftStart,
  drawTowers,
  fittingsFor,
  nextBeat,
  nightLength,
  stepWorld,
  type HeroId,
  type TowerKind,
} from "../src/game/engine.ts";
import { keyAction, runKeyAction } from "../src/game/keys.ts";

const center = (n: number) => n * CELL + CELL / 2;

/** An Acquisitions run, on the board and ready to build. */
function draftRun(hero: HeroId = "mynxi", options: Parameters<typeof createWorld>[1] = {}) {
  const api = createWorld(() => {}, options);
  api.openSetup();
  api.chooseNight("draft");
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 99999;
  return api;
}
type Api = ReturnType<typeof draftRun>;

/** Try to build `kind` on the first open floor tile. Returns the tower, or null if the build was refused. */
function tryBuild(api: Api, kind: TowerKind) {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      api.dismissSelection();
      return w.towers.length > before ? w.towers[w.towers.length - 1] : null;
    }
  return null;
}

/** Start a wave and clear it without anything leaking. */
function clearWave(api: Api) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
}

test("Acquisitions is 21 waves with a draft after every one and a victory at the end", () => {
  assert.equal(nightLength("draft"), MIDNIGHT_WAVES);
  for (let cleared = 1; cleared < MIDNIGHT_WAVES; cleared++) assert.equal(nextBeat(cleared, "draft"), "upgrade");
  assert.equal(nextBeat(MIDNIGHT_WAVES, "draft"), "victory");
});

test("the lineup starts with the Melon cannon and the keeper's signature, for every keeper", () => {
  for (const hero of Object.keys(SIGNATURE) as HeroId[]) {
    assert.deepEqual(draftStart(hero), ["melon", SIGNATURE[hero]]);
  }
});

test("only drafted towers can be built; other nights are unaffected", () => {
  const api = draftRun("mynxi");
  assert.deepEqual(api.world.hud.drafted, ["melon", "catalogue"]);
  assert.ok(tryBuild(api, "melon"), "the Melon cannon is in the lineup");
  assert.ok(tryBuild(api, "catalogue"), "so is Mynxi's Card Catalogue");
  assert.equal(tryBuild(api, "mortar"), null, "the mortar isn't drafted yet");
  assert.match(api.world.hud.log, /isn't in your lineup/);

  const midnight = createWorld(() => {}, {});
  midnight.openSetup();
  midnight.chooseNight("midnight");
  midnight.chooseHero("mynxi");
  midnight.beginNight();
  midnight.world.hud.seeds = 99999;
  assert.deepEqual(midnight.world.hud.drafted, []);
  assert.ok(tryBuild(midnight as Api, "mortar"), "Midnight builds anything");
});

test("after a wave the draft offers two new towers and an upgrade; taking a tower adds it to the lineup", () => {
  const api = draftRun("mynxi");
  tryBuild(api, "melon");
  clearWave(api);
  const hud = api.world.hud;
  assert.equal(hud.phase, "upgrade");
  assert.equal(hud.draftOffer.length, DRAFT.towers);
  assert.equal(hud.offer.length, DRAFT.upgrades);
  for (const k of hud.draftOffer) assert.ok(!hud.drafted.includes(k), `${k} isn't already drafted`);
  const pick = hud.draftOffer[0];
  api.draftTower(pick);
  assert.equal(hud.phase, "prep");
  assert.ok(hud.drafted.includes(pick));
  assert.equal(hud.build, pick, "the new tower is ready to place");
  assert.deepEqual(hud.draftOffer, []);
  assert.deepEqual(hud.upgrades, [], "taking a tower costs the upgrade");
  assert.ok(tryBuild(api, pick), "and it can be built now");
});

test("taking the upgrade card instead leaves the lineup as it was", () => {
  const api = draftRun("vael");
  tryBuild(api, "melon");
  clearWave(api);
  const hud = api.world.hud;
  const before = [...hud.drafted];
  const up = hud.offer[0].id;
  api.pickUpgrade(up);
  assert.equal(hud.phase, "prep");
  assert.deepEqual(hud.drafted, before);
  assert.deepEqual(hud.upgrades, [up]);
  assert.deepEqual(hud.draftOffer, []);
});

test("number keys take the tower cards first, then the upgrades", () => {
  const api = draftRun("mynxi");
  tryBuild(api, "melon");
  clearWave(api);
  const hud = api.world.hud;
  const third = keyAction(hud, "3");
  assert.ok(third, "key 3 is the upgrade card");
  const up = hud.offer[0].id;
  runKeyAction(api, third!, () => {});
  assert.deepEqual(hud.upgrades, [up]);

  clearWave(api);
  const tower = hud.draftOffer[1];
  runKeyAction(api, keyAction(hud, "2")!, () => {});
  assert.ok(hud.drafted.includes(tower));
});

test("the pool respects unlocks: trick cannons by keeper level, heavy cannons until the Heavy tab opens", () => {
  const opts = { runLevel: 1, lockedTowers: [] as TowerKind[], heavyOpen: false };
  const pool = draftPool("mynxi", draftStart("mynxi"), opts);
  assert.ok(!pool.includes("boomerang"), "the Boomerang opens at level 2");
  assert.ok(!pool.includes("press"), "heavy cannons wait");
  assert.ok(!pool.includes("melon") && !pool.includes("catalogue"), "already drafted");
  assert.ok(pool.includes("mortar") && pool.includes("desk"), "shared towers and Mynxi's other tower");
  assert.ok(!pool.some((k) => KEEPER_TOWERS.vael.includes(k)), "no other keeper's towers");

  const later = draftPool("mynxi", [], { runLevel: 10, lockedTowers: ["desk"], heavyOpen: true });
  assert.ok(later.includes("boomerang") && later.includes("globe") && later.includes("press"));
  assert.ok(!later.includes("desk"), "a room-locked keeper tower stays out");
});

test("drawTowers gives different towers, no more than the pool holds", () => {
  const drawn = drawTowers(["mortar", "fire", "freeze"], 2, () => 0);
  assert.equal(new Set(drawn).size, 2);
  assert.deepEqual(drawTowers(["mortar"], 2), ["mortar"]);
  assert.deepEqual(drawTowers([], 2), []);
});

test("with no towers left to draft, the draft is all upgrades", () => {
  const api = draftRun("mynxi", { allTricks: true });
  const hud = api.world.hud;
  hud.drafted = [...hud.drafted, ...draftPool("mynxi", hud.drafted, { runLevel: 99, lockedTowers: [], heavyOpen: true, allTricks: true })];
  tryBuild(api, "melon");
  clearWave(api);
  assert.equal(hud.phase, "upgrade");
  assert.deepEqual(hud.draftOffer, []);
  assert.equal(hud.offer.length, DRAFT.size);
});

test("the back room doesn't sell fittings for a tower that isn't drafted", () => {
  const api = draftRun("mynxi");
  const mod = fittingsFor("mortar")[0];
  api.openShop("mortar");
  api.pickMod(mod.id);
  assert.deepEqual(api.world.hud.fitted.mortar ?? [], []);
});

test("a full Acquisitions run reaches victory after 21 waves", () => {
  const api = draftRun("elf");
  tryBuild(api, "melon");
  const hud = api.world.hud;
  for (let n = 0; n < MIDNIGHT_WAVES && hud.phase !== "victory"; n++) {
    clearWave(api);
    if (hud.phase === "upgrade") {
      if (hud.draftOffer.length) api.draftTower(hud.draftOffer[0]);
      else api.pickUpgrade(hud.offer[0].id);
    }
  }
  assert.equal(hud.phase, "victory");
  assert.ok(hud.drafted.length > 2, "the lineup grew");
});
