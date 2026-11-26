import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKMARK,
  CANNON,
  EMPTY_META,
  ARMOUR_TEXT,
  PERKS,
  PERK_LEVELS,
  SLIP,
  SLIP_VALUES,
  UPGRADES,
  createWorld,
  emptyProgress,
  stepWorld,
  xpForLevel,
  type HeroId,
  type KeeperProgress,
  type SlipId,
  type UpgradeId,
} from "../src/game/engine.ts";
import { CHECKOUT_EMPTY, checkoutCard } from "../src/game/checkout.ts";
import { keyAction, runKeyAction } from "../src/game/keys.ts";

/** `hero` at `level` with the first perk of every open tier. */
function at(hero: HeroId, level: number, misread = false): KeeperProgress {
  const p = emptyProgress();
  p[hero] = { xp: xpForLevel(level), picks: PERK_LEVELS.map((lv) => (level >= lv ? 0 : null)), ...(misread ? { misread: true } : {}) };
  return p;
}

function start(hero: HeroId = "mynxi", keepers: KeeperProgress = emptyProgress()) {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers });
  api.openSetup();
  api.pickKeeper(hero);
  api.chooseHero(hero);
  if (hero === "michael") api.pickOath("door");
  else api.beginNight();
  api.world.hud.lives = 999;
  api.world.hud.maxLives = 999;
  return api;
}
type Api = ReturnType<typeof start>;

/** Play the wave out with nothing firing, then return. */
function playWave(api: Api) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 300 && w.hud.phase === "combat"; i++) {
    for (const t of w.towers) t.cd = 99;
    stepWorld(w, 1 / 60);
  }
}

const group = (api: Api, id: string) => checkoutCard(api.world.hud).groups.find((g) => g.id === id);
const press = (api: Api, key: string) => {
  const a = keyAction(api.world.hud, key);
  if (a) runKeyAction(api, a, () => {});
  return a;
};

test("a fresh run: no cards, the empty message, and a levelled keeper's perks", () => {
  const plain = start();
  const card = checkoutCard(plain.world.hud);
  assert.equal(card.groups.find((g) => g.id === "cards"), undefined);
  assert.equal(card.count, 0);
  assert.equal(card.totals.length, 0, "no buffs, no totals");
  assert.match(CHECKOUT_EMPTY, /waves 1 and 2, then every second wave/);

  const levelled = start("mynxi", at("mynxi", 4));
  const perks = group(levelled, "perks")!;
  assert.equal(perks.title, "Perks (level 4)");
  assert.deepEqual(
    perks.entries.map((e) => e.name),
    [PERKS.mynxi[0][0].name, PERKS.mynxi[1][0].name],
  );
});

test("cards are listed in pick order with their names and blurbs", () => {
  const api = start();
  const picked: UpgradeId[] = [];
  for (let n = 0; n < 2; n++) {
    while (api.world.hud.phase !== "upgrade") playWave(api);
    const id = api.world.hud.offer[0].id as UpgradeId;
    picked.push(id);
    api.pickUpgrade(id);
  }
  const cards = group(api, "cards")!;
  assert.deepEqual(
    cards.entries.map((e) => [e.name, e.blurb]),
    picked.map((id) => [UPGRADES[id].name, UPGRADES[id].blurb]),
  );
  assert.equal(checkoutCard(api.world.hud).count, 2);
});

test("the bookmark has its own group; Overflow slips are drawbacks", () => {
  const api = start();
  api.world.hud.bookmark = "seedfund";
  assert.deepEqual(group(api, "bookmark")!.entries, [{ name: BOOKMARK.seedfund.name, blurb: BOOKMARK.seedfund.blurb, tone: "buff" }]);

  const over = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), setup: { night: "overflow", hero: "vael" } });
  over.openSetup();
  for (const id of ["damp", "karl"] as SlipId[]) over.toggleSlip(id);
  over.chooseHero("vael");
  const slips = checkoutCard(over.world.hud).groups.find((g) => g.id === "slips")!;
  assert.deepEqual(slips.entries.map((e) => [e.name, e.tone]), [
    [SLIP.damp.name, "drawback"],
    [SLIP.karl.name, "drawback"],
  ]);
});

test("damage totals multiply the way the engine does: +8% perk with Damp Powder is one −14% line", () => {
  const keepers = at("mynxi", 6); // tier 3, first pick: Quiet, Please (all cannons ×1.08)
  assert.equal(PERKS.mynxi[2][0].fx.allDmg, 1.08);
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers, setup: { night: "overflow", hero: "mynxi" } });
  api.openSetup();
  api.toggleSlip("damp");
  api.chooseHero("mynxi");
  const totals = checkoutCard(api.world.hud).totals.filter((t) => t.includes("damage"));
  const real = Math.round((1.08 * SLIP_VALUES.dampDamage - 1) * 100);
  assert.deepEqual(totals, [`All cannons −${-real}% damage`]);
});

test("the Doctor's pick shows on the card, marked as his", () => {
  const api = start("scholar");
  playWave(api);
  const pick = api.world.hud.pickCards[0] as UpgradeId;
  api.pickUpgrade(pick);
  assert.ok(api.world.hud.upgrades.includes(pick), "a real upgrade");
  const entry = group(api, "cards")!.entries.find((e) => e.name === UPGRADES[pick].name)!;
  assert.deepEqual(entry, { name: UPGRADES[pick].name, blurb: UPGRADES[pick].blurb, tone: "buff", note: "Doctor's pick" });
});


test("Sir Michael's armour and Hoard and Asser's Sisu show under Keeper", () => {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress() });
  api.openSetup();
  api.pickKeeper("michael");
  api.chooseHero("michael");
  assert.equal(group(api as Api, "keeper")!.entries[0].name, "No armour yet");
  api.pickArmour("azure");
  assert.equal(group(api as Api, "keeper")!.entries[0].name, ARMOUR_TEXT.azure.name);
  assert.equal(group(api as Api, "keeper")!.entries[1].name, "Dragon's Hoard: 0");

  const asser = start("asser");
  asser.world.hud.maxLives = 25;
  asser.world.hud.lives = 20;
  assert.equal(group(asser, "keeper")!.entries[0].name, "Sisu +10%");
  assert.ok(checkoutCard(asser.world.hud).totals.includes("All cannons +10% damage"));
});

test("C opens it in prep; Esc closes it; in combat it pauses and puts the pause back how it was", () => {
  const api = start();
  assert.deepEqual(press(api, "c"), { type: "checkout" });
  assert.equal(api.world.hud.checkout, true);
  assert.deepEqual(press(api, "s"), { type: "swallow" }, "game keys are swallowed");
  assert.equal(api.world.hud.phase, "prep");
  press(api, "Escape");
  assert.equal(api.world.hud.checkout, false);
  // Space is the exception between waves: it closes the card and starts the wave.
  press(api, "c");
  press(api, " ");
  assert.equal(api.world.hud.checkout, false);
  assert.equal(api.world.hud.phase, "combat");

  assert.equal(api.world.hud.paused, false);
  press(api, "c");
  assert.equal(api.world.hud.paused, true, "opening it pauses");
  press(api, "c");
  assert.equal(api.world.hud.paused, false, "closing it resumes");
  press(api, "p");
  press(api, "c");
  press(api, "c");
  assert.equal(api.world.hud.paused, true, "paused by P, still paused");

  // Not on the title or setup.
  const title = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress() });
  assert.equal(keyAction(title.world.hud, "c"), null);
  title.openSetup();
  assert.equal(keyAction(title.world.hud, "c"), null);
});

test("opening it closes the back room and the inspector; the pause menu replaces it; picks wait while it's open", () => {
  const api = start();
  api.world.hud.workshop = "melon";
  api.openCheckout();
  assert.equal(api.world.hud.workshop, null);
  api.openMenu();
  assert.equal(api.world.hud.checkout, false, "never both at once");
  assert.equal(api.world.hud.menu, "pause");
  api.closeMenu();

  playWave(api);
  assert.equal(api.world.hud.phase, "upgrade");
  api.openCheckout();
  api.pickUpgrade(api.world.hud.offer[0].id as UpgradeId);
  assert.equal(api.world.hud.phase, "upgrade", "picking is blocked while the card is open");
  api.closeCheckout();
});

test("restartNight and backToSetup clear the picks and close the card", () => {
  const api = start("scholar");
  playWave(api);
  api.pickUpgrade(api.world.hud.pickCards[0] as UpgradeId);
  api.openCheckout();
  api.restartNight();
  assert.deepEqual(api.world.hud.cardPicks, []);
  assert.deepEqual(api.world.hud.pickCards, []);
  assert.equal(api.world.hud.checkout, false);

  api.beginNight();
  api.world.hud.lives = 999;
  playWave(api);
  api.pickUpgrade(api.world.hud.offer[0].id as UpgradeId);
  api.restartNight(); // back on the intro poster
  api.world.hud.cardPicks = [{ id: "seeds", pick: false }];
  api.backToSetup();
  assert.deepEqual(api.world.hud.cardPicks, []);
});

