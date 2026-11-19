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

test("honey doesn't slow: it sticks, and sticky fruit (husks too) take 25% more damage for a while", () => {
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
    assert.equal(e.slow, 1, `${e.guard}: not slowed`);
    assert.equal(e.hp, 500, "no damage of its own");
    assert.ok((e.honeyed ?? 0) > CANNON.honeyTime - 0.1, `${e.guard}: sticky`);
  }
  // A plain fruit and a sticky one take the same hit: the sticky one loses 25% more.
  const fresh = { ...plain, honeyed: 0, hp: 500, guard: "none" as const, id: -1 };
  w.pools = [];
  w.enemies.push(fresh);
  const shot = (e: typeof plain) => w.shots.push({ id: 9e6 + e.id, x: e.x, y: e.y, tx: e.x, ty: e.y, target: e.id, dmg: 40, life: 1, bounces: 0, orange: false, splash: 0, element: "shot", procs: false, splashRatio: 0, chill: 0, freezeExtra: 0, fireLife: 0, fireBurn: 0 });
  plain.guard = "none";
  for (const e of [plain, fresh]) { e.speed = 0; e.ink = 0; shot(e); }
  for (const t of w.towers) t.cd = 99;
  stepWorld(w, 1 / 60);
  const lostSticky = 500 - plain.hp;
  const lostPlain = 500 - fresh.hp;
  assert.ok(lostPlain > 0, "the plain one was hit");
  assert.ok(Math.abs(lostSticky - lostPlain * CANNON.honeyAmp) < 0.01, `sticky lost ${lostSticky}, plain ${lostPlain}`);
  // It wears off.
  for (let i = 0; i < 60 * (CANNON.honeyTime + 0.5); i++) stepWorld(w, 1 / 60);
  assert.ok((plain.honeyed ?? 0) <= 0, "the honey wears off");
});
