import { test } from "node:test";
import assert from "node:assert/strict";
import { KEEPER_UPGRADES, UPGRADES, UPGRADE_SCOPE, buildOffer, isKeeperUpgrade, signatureOf, type HeroId, type UpgradeId } from "../src/game/engine.ts";

test("every upgrade card has a short scope chip in player words", () => {
  for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
    assert.ok(UPGRADE_SCOPE[id], id);
    assert.ok(UPGRADE_SCOPE[id].length <= 22, `${id}: "${UPGRADE_SCOPE[id]}" is short`);
  }
  assert.equal(UPGRADE_SCOPE.fines, "The ledger");
  assert.equal(UPGRADE_SCOPE.bounce, "Melon cannons");
});

test("a keeper's own cards are the ones only they are offered first, plus their signature", () => {
  for (const [hero, ids] of Object.entries(KEEPER_UPGRADES) as Array<[HeroId, UpgradeId[]]>) {
    const first = buildOffer(hero, 1, [], null).map((u) => u.id);
    assert.ok(first.includes(ids[0]), `${hero}'s first shelf offers ${ids[0]}`);
    assert.equal(ids[1], signatureOf(hero), `${hero}'s second card is their signature`);
    for (const id of ids) assert.ok(isKeeperUpgrade(hero, id));
  }
  assert.equal(isKeeperUpgrade("mynxi", "juicy"), false);
  assert.equal(isKeeperUpgrade("michael", "fines"), false, "Overdue Fines is Mynxi's, not Sir Michael's");
  assert.equal(isKeeperUpgrade(null, "fines"), false);
});
