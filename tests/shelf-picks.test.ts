import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL,
  PICKS,
  PICK_KINDS,
  UPGRADES,
  UPGRADE_SCOPE,
  buildOffer,
  canTake,
  createWorld,
  isTowerPick,
  nightLength,
  nextBeat,
  pickStatsFor,
  rankOf,
  stepWorld,
  towerReadout,
  upgradeAffects,
  type UpgradeId,
} from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

function nightWithMelon() {
  const api = createWorld(() => {}, { allTricks: true });
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 5000;
  api.chooseBuild("melon");
  api.pointer(center(4), center(3), "down");
  const tower = api.world.towers.find((t) => t.kind === "melon")!;
  api.dismissSelection();
  return { api, tower };
}

test("shelves come often: 7 on a 15-wave night, 11 on Midnight", () => {
  const count = (night: "overflow" | "midnight") =>
    Array.from({ length: nightLength(night) }, (_, i) => nextBeat(i + 1, night)).filter((b) => b === "upgrade").length;
  assert.equal(count("overflow"), 7);
  assert.equal(count("midnight"), 11);
});

test("the first two shelves keep the keeper's named cards; later ones lead with a pick for your most-built tower", () => {
  for (const step of [1, 2] as const)
    for (const u of buildOffer("mynxi", step, step === 1 ? [] : ["juicy"], step === 1 ? null : "juicy", ["melon", "mortar"]))
      assert.ok(!isTowerPick(u.id), `shelf ${step}: ${u.id} is a named card`);
  const later = buildOffer("mynxi", 3, ["juicy", "sticky"], "juicy", ["melon", "mortar"]);
  assert.equal(later.length, 3);
  assert.ok(later[0].id.startsWith("melon:"), `first card ${later[0].id}`);
  assert.ok(later.some((u) => u.id.startsWith("mortar:")), "a pick for the second kind too");
  assert.ok(later.some((u) => !isTowerPick(u.id)), "and one named card");
});

test("a tower pick stacks to rank 3, and the card shows the rank it would reach", () => {
  const owned: UpgradeId[] = ["melon:dmg", "melon:dmg"];
  assert.equal(rankOf(owned, "melon:dmg"), 2);
  assert.ok(canTake(owned, "melon:dmg"));
  assert.ok(!canTake([...owned, "melon:dmg"], "melon:dmg"), "maxed at 3");
  const offer = buildOffer(null, 3, owned, "juicy", ["melon"]);
  const card = offer.find((u) => u.id === "melon:dmg");
  if (card) assert.match(card.name, /III$/);
  const maxed = buildOffer(null, 3, ["melon:dmg", "melon:dmg", "melon:dmg"], "juicy", ["melon"]);
  assert.ok(!maxed.some((u) => u.id === "melon:dmg"), "a maxed pick is not offered");
});

test("tower picks move only their own tower's numbers, by PICKS per rank", () => {
  const base = towerReadout(null, "melon", [], []);
  const two = towerReadout(null, "melon", [], ["melon:dmg", "melon:dmg", "melon:rate", "melon:range"]);
  assert.equal(two.dmg, Math.round(base.dmg * (1 + 2 * PICKS.dmg)));
  assert.ok(Math.abs(two.interval - base.interval / (1 + PICKS.rate)) < 1e-9);
  assert.equal(two.range, Math.round(base.range * (1 + PICKS.range)));
  assert.deepEqual(towerReadout(null, "mortar", [], ["melon:dmg"]), towerReadout(null, "mortar", [], []));
  assert.ok(upgradeAffects("melon:dmg", "melon"));
  assert.ok(!upgradeAffects("melon:dmg", "mortar"));
});

test("every tower that gets picks has a card, a scope chip and at least one stat worth picking", () => {
  for (const kind of PICK_KINDS) {
    const stats = pickStatsFor(kind);
    assert.ok(stats.length > 0, kind);
    for (const st of stats) {
      const id = `${kind}:${st}` as UpgradeId;
      assert.ok(UPGRADES[id]?.name, id);
      assert.ok(UPGRADE_SCOPE[id] && UPGRADE_SCOPE[id].length <= 22, id);
    }
  }
  assert.ok(!pickStatsFor("still").includes("dmg"), "the Still does no damage, so no damage pick");
});

test("in play: picking a tower pick twice stacks, and the cannon really hits harder", () => {
  const { api, tower } = nightWithMelon();
  const before = api.statsOf(tower.id)!.dmg;
  for (let n = 0; n < 2; n++) {
    api.world.hud.phase = "upgrade";
    api.world.hud.offer = [UPGRADES["melon:dmg"]];
    api.pickUpgrade("melon:dmg");
  }
  assert.equal(rankOf(api.world.hud.upgrades, "melon:dmg"), 2);
  assert.equal(api.world.hud.cardPicks.filter((c) => c.id === "melon:dmg").length, 1, "listed once on the checkout card");
  assert.equal(api.world.hud.branch, null, "a tower pick doesn't set the keeper's path");
  assert.equal(api.statsOf(tower.id)!.dmg, Math.round(before * (1 + 2 * PICKS.dmg)));
  api.startWave();
  for (let i = 0; i < 60 * 90 && api.world.hud.phase === "combat"; i++) stepWorld(api.world, 1 / 60);
  assert.notEqual(api.world.hud.phase, "combat");
});

test("Seed Cache pays PICKS.seeds and can be taken again", () => {
  const { api } = nightWithMelon();
  const start = api.world.hud.seeds;
  for (let n = 0; n < 2; n++) {
    api.world.hud.phase = "upgrade";
    api.world.hud.offer = [UPGRADES.seeds];
    api.pickUpgrade("seeds");
  }
  assert.equal(api.world.hud.seeds - start, 2 * PICKS.seeds);
  assert.ok(canTake(api.world.hud.upgrades, "seeds"));
});
