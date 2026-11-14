import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, createWorld, stepWorld, type TowerKind } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

/** Mynxi's board with lots of seeds and `kinds` built on open tiles beside the carpet. */
function board(kinds: TowerKind[]) {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  const w = api.world;
  w.hud.seeds = 99999;
  w.hud.lives = 999;
  for (const kind of kinds) {
    api.dismissSelection();
    api.chooseBuild(kind);
    let built = false;
    for (let r = 0; r < w.rows && !built; r++)
      for (let c = 0; c < w.cols && !built; c++) {
        const k = `${c},${r}`;
        if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
        const before = w.towers.length;
        api.pointer(center(c), center(r), "down");
        built = w.towers.length > before;
      }
    assert.ok(built, `${kind} built`);
  }
  api.dismissSelection();
  return api;
}

test("each tower counts its own damage and pops through a wave, and the shares add up", () => {
  const api = board(["melon", "melon", "mortar"]);
  const w = api.world;
  api.startWave();
  let popped = 0;
  for (let i = 0; i < 60 * 90 && w.hud.phase === "combat"; i++) {
    const alive = w.enemies.filter((e) => e.hp > 0).length;
    stepWorld(w, 1 / 60);
    popped += Math.max(0, alive - w.enemies.length);
  }
  const tallies = w.towers.map((t) => api.tallyOf(t.id)!);
  for (const [i, t] of tallies.entries()) assert.ok(t.dmg > 0, `tower ${i} did damage`);
  const pops = tallies.reduce((n, t) => n + t.pops, 0);
  assert.ok(pops > 0 && pops <= popped, `${pops} pops credited of ${popped} popped`);
  const share = tallies.reduce((n, t) => n + t.share, 0);
  assert.ok(Math.abs(share - 1) < 1e-9, `shares add to 100% (${share})`);
  assert.equal(api.tallyOf(99999), null, "no tower, no tally");
});

test("a fire puddle's burn counts for the cannon that left it", () => {
  const api = board(["fire"]);
  const w = api.world;
  const fire = w.towers[0];
  api.startWave();
  for (let i = 0; i < 600 && w.enemies.length === 0; i++) {
    fire.cd = 99;
    stepWorld(w, 1 / 60);
  }
  const fruit = w.enemies[0];
  assert.ok(fruit, "a fruit arrived");
  fruit.hp = fruit.maxHp = 5000;
  fruit.speed = 0;
  w.pools.push({ x: fruit.x, y: fruit.y, r: 34, life: 2, max: 2, hot: true, burn: 22, owner: fire.id });
  const start = api.tallyOf(fire.id)!.dmg;
  for (let i = 0; i < 60; i++) {
    fire.cd = 99; // no new shots: only the puddle
    w.shots = [];
    stepWorld(w, 1 / 60);
  }
  const burned = api.tallyOf(fire.id)!.dmg - start;
  assert.ok(burned > 5, `burned ${burned.toFixed(1)} for the fire cannon`);
  // At least all of this fruit's burn (others walking through the puddle count too).
  assert.ok(burned >= 5000 - fruit.hp - 0.01, `${burned} for ${5000 - fruit.hp} burned off this fruit`);
});

test("a new night starts every count at zero", () => {
  const api = board(["melon"]);
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && w.hud.phase === "combat"; i++) stepWorld(w, 1 / 60);
  assert.ok(api.tallyOf(w.towers[0].id)!.dmg > 0);
  api.reset();
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  w.hud.seeds = 999;
  api.chooseBuild("melon");
  const before = api.world.towers.length;
  for (let r = 0; r < w.rows && api.world.towers.length === before; r++)
    for (let c = 0; c < w.cols && api.world.towers.length === before; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k)) continue;
      api.pointer(center(c), center(r), "down");
    }
  const fresh = api.world.towers[api.world.towers.length - 1];
  assert.deepEqual(api.tallyOf(fresh.id), { dmg: 0, pops: 0, share: 0 });
});
