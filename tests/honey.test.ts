import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, createWorld, stepWorld } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

/** The Legal Elf with a Honeyed Heel beside the Stacks carpet, and a fruit walking. */
function withHoney() {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero("elf");
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.chooseBuild("honey");
  api.pointer(center(5), center(3), "down");
  api.dismissSelection();
  const tower = api.world.towers.find((t) => t.kind === "honey");
  assert.ok(tower, "honey built");
  api.world.hud.lives = 999;
  return { api, tower };
}

test("the Honeyed Heel lays sticky footprints on the carpet, at most three at a time", () => {
  const { api, tower } = withHoney();
  const w = api.world;
  api.startWave();
  let most = 0;
  for (let i = 0; i < 60 * 60 && w.hud.phase === "combat"; i++) {
    for (const e of w.enemies) if (e.maxHp < 99999) e.hp = e.maxHp = 99999; // keep fruit around to step on
    stepWorld(w, 1 / 60);
    const prints = w.pools.filter((p) => p.honey && p.owner === tower.id);
    most = Math.max(most, prints.length);
    for (const p of prints) {
      const k = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
      assert.ok(w.pathCells.has(k), `footprint ${k} is on the carpet`);
    }
    if (i > 60 * 20) break;
  }
  assert.ok(most >= 1, "it stepped");
  assert.ok(most <= CANNON.honeyMax, `never more than ${CANNON.honeyMax} (${most})`);
});

test("honey slows fruit to a crawl, husks included, and does no damage", () => {
  const { api, tower } = withHoney();
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && w.enemies.length < 2; i++) {
    tower.cd = 99; // hold the foot while fruit arrive
    stepWorld(w, 1 / 60);
  }
  const [plain, husk] = w.enemies;
  husk.guard = "husk";
  for (const e of [plain, husk]) e.hp = e.maxHp = 500;
  // A footprint right under both.
  for (const e of [plain, husk]) w.pools.push({ x: e.x, y: e.y, r: CANNON.honeyRadius, life: 5, max: 5, hot: false, burn: 0, honey: true, owner: tower.id });
  stepWorld(w, 1 / 60);
  for (const e of [plain, husk]) {
    assert.ok(e.slow <= CANNON.honeySlow + 1e-9, `${e.guard}: crawling (${e.slow})`);
    assert.equal(e.hp, 500, "no damage");
  }
});
