import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  CANNON,
  CELL,
  COPY_PLAIN_KINDS,
  COPY_STEP_KINDS,
  TOWERS,
  canCopy,
  createWorld,
  groupsFor,
  isSignature,
  stepWorld,
  towerReadout,
  type TowerKind,
} from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

/** Ooze on the board, with trick and heavy cannons open (`allTricks`) and plenty of seeds. */
function onBoard() {
  const api = createWorld(() => {}, { meta: { ...ALL_UNLOCKED }, allTricks: true });
  api.openSetup();
  api.chooseHero("ooze");
  api.beginNight();
  api.world.hud.seeds = 99999;
  api.world.hud.lives = 999;
  api.world.hud.maxLives = 999;
  return api;
}
type Api = ReturnType<typeof onBoard>;

const open = (api: Api, c: number, r: number) => {
  const w = api.world;
  const k = `${c},${r}`;
  return c >= 0 && r >= 0 && c < w.cols && r < w.rows && !w.pathCells.has(k) && !w.shelfCells.has(k) && !w.towers.some((t) => t.c === c && t.r === r);
};
const nearCarpet = (api: Api, c: number, r: number) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => api.world.pathCells.has(`${c + a},${r + b}`));

/** An open tile beside the carpet with open tiles to its right, below-right and below (for the Copycat and neighbours). */
function findBlock(api: Api) {
  const w = api.world;
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++)
      if (nearCarpet(api, c, r) && open(api, c, r) && open(api, c + 1, r) && open(api, c, r + 1) && open(api, c + 1, r + 1)) return { c, r };
  throw new Error("no 2×2 open block beside the carpet");
}

function place(api: Api, kind: TowerKind, c: number, r: number) {
  api.dismissSelection();
  api.chooseBuild(kind);
  api.pointer(center(c), center(r), "down");
  api.dismissSelection();
  const t = api.world.towers.find((x) => x.c === c && x.r === r);
  assert.ok(t && t.kind === kind, `${kind} at ${c},${r}`);
  return t;
}

const sell = (api: Api, t: { x: number; y: number }) => {
  api.pointer(t.x, t.y, "down");
  api.sellSelected();
};

test("Memec's Keeper tab holds the Mimic Chest and The Copycat", () => {
  assert.deepEqual(groupsFor("ooze").find((g) => g.id === "keeper")?.kinds, ["mimic", "copycat"]);
});

test("the Copycat is free: placed with 0 seeds, sold for 0, and only one at a time", () => {
  assert.equal(TOWERS.copycat.cost, 0);
  const api = onBoard();
  const { c, r } = findBlock(api);
  api.world.hud.seeds = 0;
  api.chooseBuild("copycat");
  assert.equal(api.world.hud.towerCost, 0);
  const cat = place(api, "copycat", c, r);
  assert.equal(api.world.hud.seeds, 0, "cost nothing");
  assert.equal(cat.paid, 0);

  // A second one is refused, even with seeds to spare.
  api.world.hud.seeds = 500;
  api.chooseBuild("copycat");
  api.pointer(center(c + 1), center(r + 1), "down");
  api.dismissSelection();
  assert.equal(api.world.towers.filter((t) => t.kind === "copycat").length, 1);

  sell(api, cat);
  assert.equal(api.world.towers.length, 0);
  assert.equal(api.world.hud.seeds, 500, "sells for nothing");
});

test("the Copycat goes down once a wave: sold, it can't be rebuilt until the wave is over", () => {
  const api = onBoard();
  const w = api.world;
  const { c, r } = findBlock(api);
  const cat = place(api, "copycat", c, r);
  assert.equal(w.hud.copycatPlaced, true);
  sell(api, cat);

  // Before the wave, and during it: refused, with a line saying why.
  for (const when of ["prep", "combat"]) {
    if (when === "combat") api.startWave();
    api.dismissSelection();
    api.chooseBuild("copycat");
    api.pointer(center(c + 1), center(r), "down");
    api.dismissSelection();
    assert.equal(w.towers.filter((t) => t.kind === "copycat").length, 0, `refused in ${when}`);
    assert.match(w.hud.log, /once a wave/);
  }

  // The wave ends: it can go down again (and then not a second time).
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  assert.notEqual(w.hud.phase, "combat");
  assert.equal(w.hud.copycatPlaced, false);
  if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
  place(api, "copycat", c + 1, r);
  assert.equal(w.hud.copycatPlaced, true);
});

test("the copy lists: no keeper tower, no helper, nothing on both lists", () => {
  for (const kind of [...COPY_STEP_KINDS, ...COPY_PLAIN_KINDS]) assert.ok(!isSignature(kind), kind);
  assert.equal(COPY_STEP_KINDS.filter((k) => COPY_PLAIN_KINDS.includes(k)).length, 0);
  for (const kind of ["lantern", "compost", "copycat", "mimic", "desk", "quackliber", "trebuchet"] as TowerKind[]) assert.ok(!canCopy(kind), kind);
});

test("blank alone or on a corner; beside a melon it copies it, fittings and all, one step farther", () => {
  const api = onBoard();
  const { c, r } = findBlock(api);
  const cat = place(api, "copycat", c, r);
  const copyOf = () => cat.copy; // read fresh each time (no narrowing)
  assert.equal(copyOf(), undefined, "blank on its own");

  // A melon on the diagonal doesn't count.
  place(api, "melon", c + 1, r + 1);
  assert.equal(copyOf(), undefined, "a corner does not count");

  // A melon right beside it, with a fitting already on it.
  const melon = place(api, "melon", c + 1, r);
  melon.mods = ["haste"];
  api.startWave(); // fittings sync at the start of a wave
  assert.equal(copyOf()?.kind, "melon");
  assert.equal(cat.copyFrom, melon.id);
  assert.ok(copyOf()?.mods.includes("haste"), "copied the fitting");
  assert.ok(copyOf()?.mods.includes("mimicstep"), "one step harder");
  const own = api.statsOf(melon.id)!;
  const copy = api.statsOf(cat.id)!;
  assert.equal(copy.range, own.range + CANNON.mimicReach, "reaches farther");
  assert.equal(copy.dmg, own.dmg, "no more damage");
  assert.equal(copy.interval, own.interval);
});

test("a Ballista, a Long Reader and a Paper Plane are copied exactly: no step, same damage, reach and pace", () => {
  for (const kind of ["ballista", "reader", "plane"] as TowerKind[]) {
    const api = onBoard();
    const { c, r } = findBlock(api);
    const cat = place(api, "copycat", c, r);
    const orig = place(api, kind, c + 1, r);
    assert.equal(cat.copy?.kind, kind);
    assert.ok(!cat.copy?.mods.includes("mimicstep"), `${kind}: no hidden step`);
    const a = api.statsOf(orig.id)!;
    const b = api.statsOf(cat.id)!;
    assert.deepEqual([b.dmg, b.range, b.interval], [a.dmg, a.range, a.interval], kind);
  }
});

test("heavy cannons are copied at 75% damage, same reach and pace, and each copy really fires", () => {
  for (const kind of ["scope", "press", "organ"] as TowerKind[]) {
    const api = onBoard();
    const { c, r } = findBlock(api);
    const cat = place(api, "copycat", c, r);
    const orig = place(api, kind, c + 1, r);
    assert.equal(cat.copy?.kind, kind);
    const a = api.statsOf(orig.id)!;
    const b = api.statsOf(cat.id)!;
    assert.equal(b.dmg, Math.max(1, Math.round(a.dmg * CANNON.copyHeavyDmg)), `${kind}: 75% damage`);
    assert.ok(b.dmg < a.dmg, kind);
    assert.deepEqual([b.range, b.interval], [a.range, a.interval], `${kind}: same reach and pace`);

    // Play a wave: fruit in reach takes damage from the copy (credited to the Copycat).
    const w = api.world;
    api.startWave();
    for (let i = 0; i < 60 * 120 && w.hud.phase === "combat" && !(api.tallyOf(cat.id)?.dmg ?? 0); i++) stepWorld(w, 1 / 60);
    assert.ok((api.tallyOf(cat.id)?.dmg ?? 0) > 0, `${kind}: the copy dealt damage`);
  }
});

test("every plain kind works as a copy: it hits fruit (the Shush Bell stops them instead)", () => {
  for (const kind of COPY_PLAIN_KINDS) {
    const api = onBoard();
    const { c, r } = findBlock(api);
    const cat = place(api, "copycat", c, r);
    const orig = place(api, kind, c + 1, r);
    const w = api.world;
    api.startWave();
    let stopped = false;
    const worked = () => (kind === "bell" ? stopped : (api.tallyOf(cat.id)?.dmg ?? 0) > 0);
    for (let i = 0; i < 60 * 120 && w.hud.phase === "combat" && !worked(); i++) {
      orig.cd = 99; // only the copy acts
      stepWorld(w, 1 / 60);
      if (kind === "bell" && w.enemies.some((e) => e.freeze > 0)) stopped = true;
    }
    assert.ok(worked(), `${kind}: the copy acted`);
  }
});

test("beside a Reading Lamp, a Compost Heap, the Mimic Chest or another keeper's tower it stays blank", () => {
  for (const kind of ["lantern", "compost", "mimic"] as TowerKind[]) {
    const api = onBoard();
    const { c, r } = findBlock(api);
    const cat = place(api, "copycat", c, r);
    place(api, kind, c + 1, r);
    api.startWave();
    assert.equal(cat.copy, undefined, kind);
  }
  // Ooze can't build another keeper's tower (not even in developer mode), so turn a melon into Sir Michael's Trebuchet.
  const api = createWorld(() => {}, { dev: true, allTricks: true });
  api.openSetup();
  api.chooseHero("ooze");
  api.beginNight();
  api.world.hud.seeds = 99999;
  const { c, r } = findBlock(api as Api);
  const cat = place(api as Api, "copycat", c, r);
  const melon = place(api as Api, "melon", c + 1, r);
  assert.equal(cat.copy?.kind, "melon");
  melon.kind = "trebuchet";
  api.startWave();
  assert.equal(cat.copy, undefined, "a keeper tower is never copied");
});

test("beside a Melon and a newer Ballista it copies the Ballista; selling the Ballista goes back to the Melon; alone, blank", () => {
  const api = onBoard();
  const { c, r } = findBlock(api);
  const cat = place(api, "copycat", c, r);
  const melon = place(api, "melon", c + 1, r);
  const ballista = place(api, "ballista", c, r + 1);
  assert.equal(cat.copyFrom, ballista.id, "the newest neighbour");
  assert.equal(cat.copy?.kind, "ballista");

  sell(api, ballista);
  assert.equal(cat.copyFrom, melon.id, "back to the melon");
  assert.equal(cat.copy?.kind, "melon");
  assert.ok(cat.copy?.mods.includes("mimicstep"));

  sell(api, melon);
  assert.equal(cat.copy, undefined, "blank");
});

test("a fitting bought for a copied Ballista between waves reaches the copy at the next wave start", () => {
  const api = onBoard();
  const { c, r } = findBlock(api);
  const cat = place(api, "copycat", c, r);
  const ballista = place(api, "ballista", c + 1, r);
  api.openShop("ballista");
  api.pickMod("reach");
  api.closeShop();
  assert.ok(ballista.mods.includes("reach"), "fitted on the original");
  // A fitting added some other way (not through the back room) still arrives at the wave start.
  ballista.mods.push("haste");
  stepWorld(api.world, 1 / 60);
  assert.ok(!cat.copy?.mods.includes("haste"), "not yet");
  api.startWave();
  assert.deepEqual(cat.copy?.mods, ["reach", "haste"], "at the start of the wave, exactly (no step)");
  assert.equal(api.statsOf(cat.id)!.range, api.statsOf(ballista.id)!.range);
});

test("each step copy gets its own step: still drips sooner, mortar splashes wider, fire burns longer, freeze holds longer", () => {
  const still = towerReadout("ooze", "still", [], []);
  const stillCopy = towerReadout("ooze", "still", ["mimicstep"], []);
  assert.ok(stillCopy.interval < still.interval);
  // A melon copy hits no harder, and a Copycat on its own has no stats.
  assert.equal(towerReadout("ooze", "melon", ["mimicstep"], []).dmg, towerReadout("ooze", "melon", [], []).dmg);
  assert.deepEqual(towerReadout("ooze", "copycat", [], []), { dmg: 0, range: 0, interval: 0 });

  // Shot effects: watch the first shot from the original and from its copy.
  for (const kind of ["mortar", "fire", "freeze"] as const) {
    const api = onBoard();
    const { c, r } = findBlock(api);
    const cat = place(api, "copycat", c, r);
    const orig = place(api, kind, c + 1, r);
    const w = api.world;
    const seen = new Map<string, { splash: number; fireLife: number; freezeExtra: number }>();
    api.startWave();
    for (let i = 0; i < 60 * 60 && seen.size < 2 && w.hud.phase === "combat"; i++) {
      stepWorld(w, 1 / 60);
      for (const s of w.shots) {
        // A shot moves in the frame it is fired, so match it to the tower it is still beside.
        const from = Math.hypot(s.x - cat.x, s.y - cat.y) < 8 ? "copy" : Math.hypot(s.x - orig.x, s.y - orig.y) < 8 ? "orig" : null;
        if (from && !seen.has(from)) seen.set(from, { splash: s.splash, fireLife: s.fireLife, freezeExtra: s.freezeExtra });
      }
    }
    const a = seen.get("orig");
    const b = seen.get("copy");
    assert.ok(a && b, `${kind}: both fired`);
    if (kind === "mortar") assert.equal(b.splash, a.splash + CANNON.mimicSplash);
    if (kind === "fire") assert.equal(b.fireLife, a.fireLife + CANNON.mimicBurn);
    if (kind === "freeze") assert.equal(b.freezeExtra, a.freezeExtra + CANNON.mimicFreeze);
  }
});
