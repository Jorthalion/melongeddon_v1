import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, TOWER_GROUPS, createWorld, groupsFor, stepWorld, type TowerKind } from "../src/game/engine.ts";
import { keyAction } from "../src/game/keys.ts";

const center = (n: number) => n * CELL + CELL / 2;
type Enemy = ReturnType<typeof createWorld>["world"]["enemies"][number];

/** Mynxi's board with lots of seeds and one `kind` built near the Stacks carpet. */
function withHeavy(kind: TowerKind) {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.seeds = 99999;
  stepWorld(api.world, 1 / 60); // 200+ seeds in hand opens the Heavy tab
  api.chooseBuild(kind);
  api.pointer(center(5), center(3), "down");
  api.dismissSelection();
  const tower = api.world.towers.find((t) => t.kind === kind);
  assert.ok(tower, `${kind} built`);
  api.world.hud.lives = 999;
  return { api, tower };
}

/** Start the wave and wait for `n` fruit to be on the carpet. */
function fruit(api: ReturnType<typeof withHeavy>["api"], n: number) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && w.enemies.length < n; i++) {
    // Hold fire while we wait, so the cannon can't pop the first ones before the rest arrive.
    for (const t of w.towers) t.cd = 99;
    stepWorld(w, 1 / 60);
  }
  assert.ok(w.enemies.length >= n, `${n} fruit arrived`);
  return w.enemies.slice(0, n);
}

test("the Heavy tab holds the three heavy cannons on key Y, after Trick", () => {
  const heavy = TOWER_GROUPS.find((g) => g.id === "heavy");
  assert.deepEqual(heavy?.kinds, ["press", "organ", "scope"]);
  assert.equal(heavy?.key, "y");
  assert.deepEqual(groupsFor("vael").map((g) => g.key), ["q", "w", "e", "r", "t", "y"]);
  const { api } = withHeavy("melon");
  assert.deepEqual(keyAction(api.world.hud, "y"), { type: "tab", index: groupsFor("mynxi").length - 1 });
});

test("the Printing Press's sheet slides along the carpet, hits a line of fruit once each, and inks them", () => {
  const { api } = withHeavy("press");
  const w = api.world;
  api.startWave();
  let most = 0;
  let inked = 0;
  for (let i = 0; i < 60 * 60 && w.hud.phase === "combat"; i++) {
    // Tough fruit, so they live long enough to show the ink.
    for (const e of w.enemies) if (e.maxHp < 3000) e.hp = e.maxHp = 3000;
    stepWorld(w, 1 / 60);
    for (const f of w.flyers) if (f.kind === "sheet") most = Math.max(most, f.hits.size);
    inked = Math.max(inked, w.enemies.filter((e) => (e.ink ?? 0) > 0 && (e.inkMul ?? 1) >= CANNON.pressInk).length);
  }
  assert.ok(most >= 2, `one sheet hit ${most} fruit`);
  assert.ok(inked >= 1, "fruit were inked");
});

test("the Pipe Organ hits everything in reach and slows it; the third chord stops it; husks are hit but not slowed", () => {
  const { api, tower } = withHeavy("organ");
  const w = api.world;
  const [a, b, husk] = fruit(api, 3);
  const place = (e: Enemy, dx: number) => {
    e.x = tower.x + dx;
    e.y = tower.y + 20;
    e.hp = e.maxHp = 2000;
    e.speed = 0;
  };
  place(a, -30);
  place(b, 30);
  place(husk, 0);
  husk.guard = "husk";
  w.enemies = [a, b, husk];
  for (let chord = 1; chord <= 3; chord++) {
    tower.cd = 0;
    stepWorld(w, 1 / 60);
    if (chord < 3) assert.equal(a.freeze, 0, `no stop on chord ${chord}`);
  }
  for (const e of [a, b, husk]) assert.ok(e.hp < 2000, "hit");
  assert.ok(a.chill > 0 && b.chill > 0, "slowed");
  assert.ok(a.freeze > 0 && b.freeze > 0, "the crescendo stops them");
  assert.equal(husk.chill, 0);
  assert.equal(husk.freeze, 0);
});

test("a crescendo can't stop the same fruit again until its cooldown passes, so many organs can't chain stops", () => {
  const { api, tower } = withHeavy("organ");
  const w = api.world;
  const [a] = fruit(api, 1);
  a.x = tower.x + 20;
  a.y = tower.y + 20;
  a.hp = a.maxHp = 1e6;
  a.speed = 0;
  w.enemies = [a];
  const crescendo = () => {
    for (let i = 0; i < CANNON.organEvery; i++) {
      tower.cd = 0;
      stepWorld(w, 1 / 60);
    }
  };
  crescendo();
  assert.ok(a.freeze > 0, "the first crescendo stops it");
  const ready = a.organReady ?? 0;
  assert.ok(ready >= w.anim + CANNON.organStunImmune, "cooldown set past the stop");
  a.freeze = 0;
  crescendo();
  assert.equal(a.freeze, 0, "a second crescendo inside the cooldown doesn't stop it");
  w.anim = ready;
  crescendo();
  assert.ok(a.freeze > 0, "after the cooldown it can be stopped again");
});

test("the Brass Telescope aims for armour first and its shots ignore it", () => {
  const { api, tower } = withHeavy("scope");
  const w = api.world;
  const [plain, shelled] = fruit(api, 2);
  for (const e of [plain, shelled]) {
    e.x = tower.x + 60;
    e.y = tower.y;
    e.speed = 0;
    e.hp = e.maxHp = 5000;
  }
  plain.hp = plain.maxHp = 9000; // tougher, but not armoured
  shelled.guard = "rind";
  shelled.shell = 1;
  w.enemies = [plain, shelled];
  w.shots = []; // anything it fired while the fruit were arriving
  tower.cd = 0;
  stepWorld(w, 1 / 60);
  // The shot is instant: the shelled melon is hit, for full damage, and the tougher plain one isn't.
  assert.equal(plain.hp, 9000, "armour first");
  assert.equal(5000 - shelled.hp, api.statsOf(tower.id)!.dmg, "full damage, the shell didn't block it");
  assert.equal(shelled.shell, 1, "it went straight through the shell");
});

test("click a built cannon, click off, click it again: it opens again, and clicking off never builds", () => {
  for (const seeds of [150, 5000]) {
    // 150: can't afford another Press (clicking off used to do nothing, leaving it selected).
    // 5000: can afford one (clicking off used to build a second Press).
    const { api, tower } = withHeavy("press");
    const w = api.world;
    w.hud.seeds = seeds;
    api.chooseBuild("press"); // the Heavy tab is still picked, as it would be after building
    api.pointer(tower.x, tower.y, "down");
    assert.equal(w.hud.selected, tower.id, "clicking it opens it");
    // Click off: an empty floor tile two over.
    let off: [number, number] | null = null;
    for (let r = 0; r < w.rows && !off; r++)
      for (let c = 0; c < w.cols && !off; c++) {
        const k = `${c},${r}`;
        if (!w.pathCells.has(k) && !w.shelfCells.has(k) && !w.towers.some((t) => t.c === c && t.r === r)) off = [c, r];
      }
    const count = w.towers.length;
    api.pointer(center(off![0]), center(off![1]), "down");
    assert.equal(w.hud.selected, null, `${seeds}: clicking off closes it`);
    assert.equal(w.towers.length, count, `${seeds}: clicking off doesn't build`);
    api.pointer(tower.x, tower.y, "down");
    assert.equal(w.hud.selected, tower.id, `${seeds}: clicking back on opens it again`);
  }
});

test("trying to build something you can't afford says so", () => {
  const { api } = withHeavy("melon");
  const w = api.world;
  api.dismissSelection();
  w.hud.seeds = 10;
  api.chooseBuild("scope");
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      api.pointer(center(c), center(r), "down");
      assert.match(w.hud.log, /Not enough seeds: the Brass Telescope costs 250/);
      return;
    }
});

test("the Heavy tab waits for wave 6, or for 200 seeds in hand tonight", () => {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  const w = api.world;
  assert.equal(w.hud.heavyOpen, false, "closed at the start");
  w.hud.seeds = 199;
  stepWorld(w, 1 / 60);
  api.chooseBuild("press");
  api.pointer(center(5), center(3), "down");
  assert.equal(w.towers.length, 0, "no Press yet");
  assert.match(w.hud.log, /Heavy cannons open at wave 6/);
  w.hud.seeds = 200;
  stepWorld(w, 1 / 60);
  assert.equal(w.hud.heavyOpen, true, "200 in hand opens it");
  w.hud.seeds = 50;
  stepWorld(w, 1 / 60);
  assert.equal(w.hud.heavyOpen, true, "and it stays open after spending");

  const later = createWorld(() => {}, {});
  later.openSetup();
  later.chooseHero("vael");
  later.beginNight();
  later.world.hud.wave = 6;
  stepWorld(later.world, 1 / 60);
  assert.equal(later.world.hud.heavyOpen, true, "wave 6 opens it");
});

test("building a tower keeps you in build mode: the next tap on the floor builds another of the same kind", () => {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  const w = api.world;
  w.hud.seeds = 999;
  api.chooseBuild("spitter");
  api.pointer(center(4), center(3), "down");
  assert.equal(w.towers.length, 1);
  assert.equal(w.hud.selected, null, "the new tower isn't opened");
  assert.equal(w.hud.build, "spitter", "the same kind is still picked");
  api.pointer(center(5), center(3), "down");
  assert.equal(w.towers.length, 2, "a second tap builds a second one");
  assert.ok(w.towers.every((t) => t.kind === "spitter"));
  api.pointer(w.towers[0].x, w.towers[0].y, "down");
  assert.equal(w.hud.selected, w.towers[0].id, "tapping a built tower still opens it");
});
