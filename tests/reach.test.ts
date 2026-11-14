import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, createWorld, carpetInReach, emptyProgress, reachShape, stepWorld } from "../src/game/engine.ts";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

test("a straight carpet: the stretch inside the circle, exactly", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ];
  const r = carpetInReach(line, 100, 30, 50);
  // 50² - 30² = 40², so 40 px either side of x = 100.
  assert.equal(r.stretches.length, 1);
  assert.ok(near(r.stretches[0].x1, 60) && near(r.stretches[0].x2, 140));
  assert.ok(near(r.length, 80));
  assert.equal(carpetInReach(line, 100, 60, 50).length, 0, "too far from the carpet");
});

test("an L-shaped carpet counts both arms, and a hole cuts the middle out", () => {
  const ell = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];
  const r = carpetInReach(ell, 100, 0, 30);
  assert.ok(near(r.length, 60), `got ${r.length}`);
  const ring = carpetInReach(
    [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ],
    100,
    0,
    50,
    20,
  );
  assert.equal(ring.stretches.length, 2);
  assert.ok(near(ring.length, 60), "50-20 on each side");
});

test("a tower aims only at fruit on the lit stretch", () => {
  const api = createWorld(() => {}, { keepers: emptyProgress() });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  const w = api.world;
  w.hud.seeds = 999;
  w.hud.lives = 999;
  api.chooseBuild("melon");
  let tower = null as (typeof w.towers)[number] | null;
  for (let r = 0; r < w.rows && !tower; r++)
    for (let c = 0; c < w.cols && !tower; c++) {
      if (w.pathCells.has(`${c},${r}`) || w.shelfCells.has(`${c},${r}`)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      const n = w.towers.length;
      api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
      if (w.towers.length > n) tower = w.towers[n];
    }
  const t = tower!;
  const range = api.statsOf(t.id)!.range;
  const lit = carpetInReach(w.points, t.x, t.y, range).stretches;
  const onLit = (x: number, y: number) =>
    lit.some((s) => {
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
      const k = ((x - s.x1) * (s.x2 - s.x1) + (y - s.y1) * (s.y2 - s.y1)) / (len * len);
      const px = s.x1 + (s.x2 - s.x1) * k;
      const py = s.y1 + (s.y2 - s.y1) * k;
      return k >= -0.01 && k <= 1.01 && Math.hypot(px - x, py - y) < 1.5;
    });
  api.startWave();
  let checked = 0;
  for (let i = 0; i < 60 * 60 && w.hud.phase === "combat"; i++) {
    const before = new Set(w.shots.map((s) => s.id));
    stepWorld(w, 1 / 60);
    for (const s of w.shots) {
      if (before.has(s.id) || s.owner !== t.id) continue;
      const target = w.enemies.find((e) => e.id === s.target);
      if (!target) continue;
      // Fruit still walking in from off the board (before the carpet's first point) don't count.
      const offBoard = target.x < 0 || target.y < 0 || target.x > w.w || target.y > w.h;
      assert.ok(offBoard || onLit(target.x, target.y), `shot at a fruit off the lit carpet (${target.x}, ${target.y})`);
      checked++;
    }
  }
  assert.ok(checked > 0, "it fired");
  const reach = api.reachOf(t.id)!;
  assert.equal(typeof reach.tiles, "number");
});

test("what each kind shows", () => {
  assert.equal(reachShape("melon", 132).mode, "carpet");
  assert.equal(reachShape("lantern", 72).mode, "towers");
  assert.equal(reachShape("compost", 0).mode, "none");
  assert.equal(reachShape("lectern", 80).mode, "none");
  assert.ok(reachShape("orrery", 80).inner > 0);
  assert.equal(reachShape("quackliber", 140).aura, true);
});
