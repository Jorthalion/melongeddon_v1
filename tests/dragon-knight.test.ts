import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARMOURS,
  ARMOUR_LEVEL,
  ARMOUR_TEXT,
  ARMOUR_VALUES,
  BALANCE,
  CELL,
  DRAGON,
  EMPTY_META,
  TOWERS,
  armourFrom,
  createWorld,
  emptyProgress,
  refundFor,
  stepWorld,
  towerReadout,
  type ArmourId,
} from "../src/game/engine.ts";
import { keyAction } from "../src/game/keys.ts";

/** Sir Michael on his intro. `level` sets his keeper level (by XP); `open` opens every armour. */
function intro(open = true) {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), allTricks: open });
  api.openSetup();
  api.pickKeeper("michael");
  api.chooseHero("michael");
  return api;
}
function start(armour: ArmourId = "azure") {
  const api = intro();
  api.pickArmour(armour);
  return api;
}
type Api = ReturnType<typeof intro>;
type Fruit = Api["world"]["enemies"][number];

/** Build `kind` on (c, r); returns the new tower or null. */
function buildAt(api: Api, kind: Parameters<Api["chooseBuild"]>[0], c: number, r: number) {
  const w = api.world;
  api.chooseBuild(kind);
  api.dismissSelection(); // with a tower open, a click only closes it
  const n = w.towers.length;
  api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
  api.dismissSelection();
  return w.towers.length > n ? w.towers[n] : null;
}

/** Two open floor tiles side by side (left and right), away from the carpet's edge. */
function pairOfTiles(api: Api) {
  const w = api.world;
  const free = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < w.cols && r < w.rows && !w.pathCells.has(`${c},${r}`) && !w.vergeCells.has(`${c},${r}`) && !w.shelfCells.has(`${c},${r}`);
  for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols - 1; c++) if (free(c, r) && free(c + 1, r)) return [c, r] as const;
  throw new Error("no pair of tiles");
}

function select(api: Api, id: number) {
  api.world.hud.selected = id;
}

/** Clear the rest of the wave without anyone leaking. */
function clearWave(api: Api) {
  const w = api.world;
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
  if (w.hud.phase === "consequence") api.startWave();
}

/** Start a wave, let the first fruit out and walk it onto the door. */
function leakOne(api: Api) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 40 && !w.enemies.some((f) => f.hp > 0); i++) stepWorld(w, 1 / 60);
  const e = w.enemies.find((f) => f.hp > 0) as Fruit;
  const last = w.points[w.points.length - 1];
  Object.assign(e, { x: last.x, y: last.y, wp: w.points.length - 1, reverse: false, freeze: 0, borrower: false });
  stepWorld(w, 1 / 60);
}

test("his intro: four armours, keys 1–4 and Enter left to the cards, and no night until one is on", () => {
  const api = intro();
  const w = api.world;
  assert.deepEqual(ARMOURS, ["azure", "dragonscale", "ember", "wyrm"]);
  for (const key of ["1", "2", "3", "4", "Enter"]) assert.equal(keyAction(w.hud, key), null, key);
  api.beginNight();
  assert.equal(w.hud.phase, "poster", "he hasn't chosen his armour");
  assert.equal(w.hud.armour, null);
  api.pickArmour("ember");
  assert.equal(w.hud.phase, "prep");
  assert.equal(w.hud.armour, "ember");
  assert.equal(w.hud.log, ARMOUR_TEXT.ember.log);
});

test("Emberforged and Wyrmrider open with his keeper level; Azure and Dragonscale are open from the start", () => {
  assert.deepEqual(ARMOUR_LEVEL, { azure: 1, dragonscale: 1, ember: 3, wyrm: 5 });
  const api = intro(false);
  assert.ok(api.armourOpen("azure") && api.armourOpen("dragonscale"));
  assert.ok(!api.armourOpen("ember") && !api.armourOpen("wyrm"));
  api.pickArmour("wyrm");
  assert.equal(api.world.hud.phase, "poster", "a locked armour does nothing");
  assert.match(api.world.hud.log, /opens when Sir Michael reaches level 5/);
  api.pickArmour("dragonscale");
  assert.equal(api.world.hud.phase, "prep");
});

test("each armour's boost and cost", () => {
  const base = { seeds: BALANCE.michaelSeeds, lives: BALANCE.michaelLives };
  const azure = start("azure").world.hud;
  assert.equal(azure.lives, base.lives + ARMOUR_VALUES.azureLives);
  assert.equal(azure.maxLives, base.lives + ARMOUR_VALUES.azureLives);
  assert.equal(azure.seeds, base.seeds - ARMOUR_VALUES.azureSeeds);
  const scale = start("dragonscale").world.hud;
  assert.equal(scale.hoard, ARMOUR_VALUES.scaleHoard);
  assert.equal(scale.lives, base.lives - ARMOUR_VALUES.scaleLives);
  assert.equal(scale.seeds, base.seeds);
  for (const a of ["ember", "wyrm"] as const) {
    const h = start(a).world.hud;
    assert.equal(h.seeds, base.seeds, a);
    assert.equal(h.lives, base.lives, a);
    assert.equal(h.hoard, 0, a);
  }
});

test("old oaths map to armours (scripts and saves): door → Azure, mouth → Emberforged, sling → Wyrmrider", () => {
  assert.equal(armourFrom("door"), "azure");
  assert.equal(armourFrom("mouth"), "ember");
  assert.equal(armourFrom("sling"), "wyrm");
  assert.equal(armourFrom("dragonscale"), "dragonscale");
  assert.equal(armourFrom("moon"), null);
  const api = intro(false);
  api.pickOath("sling");
  assert.equal(api.world.hud.armour, "wyrm", "an old script still starts the night");
  assert.equal(api.world.hud.phase, "prep");
  const other = createWorld(() => {}, { meta: EMPTY_META });
  other.openSetup();
  other.chooseHero("vael");
  other.pickArmour("azure");
  other.pickOath("door");
  assert.equal(other.world.hud.armour, null, "only Sir Michael wears armour");
});

test("the Dragon's Hoard: 20% of ordinary spending (30% in Dragonscale), and it pays first for big towers", () => {
  const api = start("azure");
  const w = api.world;
  w.hud.seeds = 2000;
  const [c, r] = pairOfTiles(api);
  buildAt(api, "melon", c, r);
  assert.equal(w.hud.hoard, TOWERS.melon.cost * DRAGON.hoardShare);
  const scale = start("dragonscale");
  scale.world.hud.seeds = 2000;
  const [c2, r2] = pairOfTiles(scale);
  buildAt(scale, "melon", c2, r2);
  assert.equal(scale.world.hud.hoard, ARMOUR_VALUES.scaleHoard + TOWERS.melon.cost * ARMOUR_VALUES.scaleShare);

  // The Roost: the Hoard pays first, seeds the rest; the tower is worth its whole price.
  w.hud.hoard = 100;
  api.chooseBuild("bombard");
  assert.equal(w.hud.towerCost, TOWERS.bombard.cost - 100);
  const seeds = w.hud.seeds;
  let roost = null;
  for (let rr = 0; rr < w.rows && !roost; rr++) for (let cc = 0; cc < w.cols && !roost; cc++) roost = buildAt(api, "bombard", cc, rr);
  assert.ok(roost);
  assert.equal(w.hud.hoard, 0);
  assert.equal(seeds - w.hud.seeds, TOWERS.bombard.cost - 100);
  assert.equal(roost!.paid, TOWERS.bombard.cost);
  assert.equal(w.hud.hoard, 0, "big towers don't feed the Hoard");
});

test("other keepers have no Hoard", () => {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.seeds = 999;
  buildAt(api, "melon", ...pairOfTiles(api));
  assert.equal(api.world.hud.hoard, 0);
});

test("Great towers: two matching neighbours merge into one over both tiles, 2.5× damage and farther reach", () => {
  const api = start("azure");
  const w = api.world;
  w.hud.seeds = 2000;
  const [c, r] = pairOfTiles(api);
  const a = buildAt(api, "melon", c, r)!;
  select(api, a.id);
  assert.equal(api.greatOffer(a.id).partner, null, "needs a pair");
  api.makeGreat();
  assert.equal(w.towers.length, 1, "nothing happens alone");
  const b = buildAt(api, "melon", c + 1, r)!;
  const plain = api.statsOf(a.id)!;
  const offer = api.greatOffer(a.id);
  assert.equal(offer.partner, b.id);
  assert.equal(offer.cost, Math.round(TOWERS.melon.cost * DRAGON.greatCost));
  const hoard = (w.hud.hoard = 10);
  const seeds = w.hud.seeds;
  const paid = a.paid + b.paid;
  select(api, a.id);
  api.makeGreat();
  assert.equal(w.towers.length, 1, "two became one");
  assert.deepEqual(a.great, { c: c + 1, r });
  assert.equal(w.hud.hoard, 0, "the Hoard paid first");
  assert.equal(seeds - w.hud.seeds, offer.cost - hoard);
  assert.equal(a.paid, paid + offer.cost);
  const great = api.statsOf(a.id)!;
  assert.equal(great.dmg, Math.round(plain.dmg * DRAGON.greatDmg));
  assert.equal(great.range, Math.round(plain.range * DRAGON.greatRange));
  assert.equal(a.x, (c + 1) * CELL, "it stands between its two tiles");
  // Both tiles are taken, and a click on either opens it.
  assert.equal(buildAt(api, "melon", c + 1, r), null);
  api.pointer((c + 1) * CELL + CELL / 2, r * CELL + CELL / 2, "down");
  assert.equal(w.hud.selected, a.id);
  // Selling it refunds the share of everything paid.
  const before = w.hud.seeds;
  api.sellSelected();
  assert.equal(w.hud.seeds - before, refundFor("melon", a.paid));
  assert.ok(buildAt(api, "melon", c + 1, r), "the tile is free again");
});

test("keeper towers and helpers can't be Great; another keeper can't merge", () => {
  const api = start("azure");
  const w = api.world;
  w.hud.seeds = 5000;
  const [c, r] = pairOfTiles(api);
  const lamp = buildAt(api, "lantern", c, r)!;
  buildAt(api, "lantern", c + 1, r);
  assert.equal(api.greatOffer(lamp.id).partner, null);
  const other = createWorld(() => {}, { meta: EMPTY_META });
  other.openSetup();
  other.chooseHero("mynxi");
  other.beginNight();
  other.world.hud.seeds = 999;
  const [oc, or] = pairOfTiles(other);
  const m = buildAt(other, "melon", oc, or)!;
  buildAt(other, "melon", oc + 1, or);
  select(other, m.id);
  other.makeGreat();
  assert.equal(other.world.towers.length, 2);
});

test("Emberforged: Great towers hit 20% harder and merging costs 25% more", () => {
  const api = start("ember");
  api.world.hud.seeds = 2000;
  const [c, r] = pairOfTiles(api);
  const a = buildAt(api, "melon", c, r)!;
  buildAt(api, "melon", c + 1, r);
  assert.equal(api.greatOffer(a.id).cost, Math.round(TOWERS.melon.cost * DRAGON.greatCost * ARMOUR_VALUES.emberMerge));
  select(api, a.id);
  api.makeGreat();
  const plain = towerReadout("michael", "melon", [], []).dmg;
  assert.equal(api.statsOf(a.id)!.dmg, Math.round(Math.round(plain * DRAGON.greatDmg) * ARMOUR_VALUES.emberDmg));
});

test("In the Zone: +5% a clean wave on his big towers, up to 25% (15% in Wyrmrider); a lost stack resets it", () => {
  const api = start("azure");
  const w = api.world;
  w.hud.seeds = 2000;
  w.hud.lives = 99;
  const [c, r] = pairOfTiles(api);
  const a = buildAt(api, "melon", c, r)!;
  const plainMelon = buildAt(api, "melon", c, r + 1) ?? buildAt(api, "melon", c, r - 1);
  buildAt(api, "melon", c + 1, r);
  select(api, a.id);
  api.makeGreat();
  const great = api.statsOf(a.id)!.dmg;
  const plain = plainMelon ? api.statsOf(plainMelon.id)!.dmg : null;
  api.startWave();
  clearWave(api);
  assert.equal(w.hud.zone, DRAGON.zoneStep);
  assert.equal(api.statsOf(a.id)!.dmg, Math.round(great * (1 + DRAGON.zoneStep)));
  if (plainMelon) assert.equal(api.statsOf(plainMelon.id)!.dmg, plain, "ordinary towers don't get it");
  for (let k = 0; k < 8; k++) {
    api.startWave();
    clearWave(api);
  }
  assert.equal(w.hud.zone, DRAGON.zoneCap);
  leakOne(api);
  assert.equal(w.hud.zone, 0, "a lost stack ends it");
  clearWave(api);
  assert.equal(w.hud.zone, 0, "and that wave doesn't count");

  const wyrm = start("wyrm");
  wyrm.world.hud.lives = 99;
  for (let k = 0; k < 6; k++) {
    wyrm.startWave();
    clearWave(wyrm);
  }
  assert.equal(wyrm.world.hud.zone, ARMOUR_VALUES.wyrmZoneCap);
});

test("the Dragon's Roost grows with the waves it stands through, and feeding it counts as one more (once a break)", () => {
  const api = start("azure");
  const w = api.world;
  w.hud.seeds = 5000;
  let roost = null;
  for (let r = 0; r < w.rows && !roost; r++) for (let c = 0; c < w.cols && !roost; c++) roost = buildAt(api, "bombard", c, r);
  assert.ok(roost);
  assert.deepEqual(api.roostOf(roost!.id), { stage: 0, grown: 0, next: DRAGON.roostGrow[0] });
  select(api, roost!.id);
  const seeds = w.hud.seeds;
  api.feedRoost();
  assert.equal(seeds - w.hud.seeds, DRAGON.roostFeed);
  assert.equal(api.roostOf(roost!.id)!.grown, 1);
  api.feedRoost();
  assert.equal(api.roostOf(roost!.id)!.grown, 1, "once between waves");
  api.startWave();
  api.feedRoost();
  assert.equal(api.roostOf(roost!.id)!.grown, 1, "not during a wave");
  clearWave(api);
  assert.equal(api.roostOf(roost!.id)!.grown, 2);
  assert.equal(api.roostOf(roost!.id)!.stage, 1, "a Whelp");
  for (let k = 0; k < DRAGON.roostGrow[2] - 2; k++) {
    api.startWave();
    clearWave(api);
  }
  assert.equal(api.roostOf(roost!.id)!.stage, 3, "a Great Dragon");
  assert.equal(api.statsOf(roost!.id)!.dmg, Math.round(towerReadout("michael", "bombard", [], w.hud.upgrades).dmg * (1 + w.hud.zone)));
});

test("Wyrmrider: the Roost starts as a Whelp", () => {
  const api = start("wyrm");
  const w = api.world;
  w.hud.seeds = 5000;
  let roost = null;
  for (let r = 0; r < w.rows && !roost; r++) for (let c = 0; c < w.cols && !roost; c++) roost = buildAt(api, "bombard", c, r);
  assert.equal(api.roostOf(roost!.id)!.stage, 1);
});

test("a Roost built mid-wave doesn't grow that wave", () => {
  const api = start("azure");
  const w = api.world;
  w.hud.seeds = 5000;
  api.startWave();
  let roost = null;
  for (let r = 0; r < w.rows && !roost; r++) for (let c = 0; c < w.cols && !roost; c++) roost = buildAt(api, "bombard", c, r);
  clearWave(api);
  assert.equal(api.roostOf(roost!.id)!.grown, 0);
});
