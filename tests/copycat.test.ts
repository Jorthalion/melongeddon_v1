import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CANNON, CELL, createWorld, groupsFor, stepWorld, towerReadout, type TowerKind } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function onBoard() {
  const api = createWorld(() => {}, { meta: { ...ALL_UNLOCKED } });
  api.openSetup();
  api.chooseHero("ooze");
  api.beginNight();
  api.world.hud.seeds = 99999;
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

/** An open tile beside the carpet with open tiles to its right, below-right and below (for the Mimic and neighbours). */
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

test("Memec's Keeper tab holds the Mimic Chest and The Mimic", () => {
  assert.deepEqual(groupsFor("ooze").find((g) => g.id === "keeper")?.kinds, ["mimic", "copycat"]);
});

test("blank alone or on a corner; beside a melon it copies it, fittings and all, one step farther", () => {
  const api = onBoard();
  const { c, r } = findBlock(api);
  const mimic = place(api, "copycat", c, r);
  const copyOf = () => mimic.copy; // read fresh each time (no narrowing)
  assert.equal(copyOf(), undefined, "blank on its own");

  // A melon on the diagonal doesn't count.
  place(api, "melon", c + 1, r + 1);
  assert.equal(copyOf(), undefined, "a corner does not count");

  // A melon right beside it, with a fitting already on it.
  const melon = place(api, "melon", c + 1, r);
  melon.mods = ["haste"];
  api.startWave(); // fittings sync at the start of a wave
  assert.equal(copyOf()?.kind, "melon");
  assert.equal(mimic.copyFrom, melon.id);
  assert.ok(copyOf()?.mods.includes("haste"), "copied the fitting");
  const own = api.statsOf(melon.id)!;
  const copy = api.statsOf(mimic.id)!;
  assert.equal(copy.range, own.range + CANNON.mimicReach, "reaches farther");
  assert.equal(copy.dmg, own.dmg, "no more damage");
  assert.equal(copy.interval, own.interval);
});

test("with two neighbours it copies the newer; when that one goes, it falls back; alone again, it goes blank", () => {
  const api = onBoard();
  const { c, r } = findBlock(api);
  const mimic = place(api, "copycat", c, r);
  const melon = place(api, "melon", c + 1, r);
  const still = place(api, "still", c, r + 1);
  assert.equal(mimic.copyFrom, still.id, "the newest neighbour");
  assert.equal(mimic.copy?.kind, "still");

  api.pointer(still.x, still.y, "down");
  api.sellSelected();
  assert.equal(mimic.copyFrom, melon.id, "back to the melon");

  api.pointer(melon.x, melon.y, "down");
  api.sellSelected();
  assert.equal(mimic.copy, undefined, "blank");
});

test("a fitting bought later for the original reaches the copy at the start of the next wave", () => {
  const api = onBoard();
  const { c, r } = findBlock(api);
  const mimic = place(api, "copycat", c, r);
  const melon = place(api, "melon", c + 1, r);
  assert.ok(!mimic.copy?.mods.includes("reach"));
  melon.mods.push("reach");
  stepWorld(api.world, 1 / 60);
  assert.ok(!mimic.copy?.mods.includes("reach"), "not yet");
  api.startWave();
  assert.ok(mimic.copy?.mods.includes("reach"), "at the start of the wave");
});

test("each copy gets its own step: still drips sooner, mortar splashes wider, fire burns longer, freeze holds longer", () => {
  const still = towerReadout("ooze", "still", [], []);
  const stillCopy = towerReadout("ooze", "still", ["mimicstep"], []);
  assert.ok(stillCopy.interval < still.interval);
  // A melon copy hits no harder, and a Mimic on its own has no stats.
  assert.equal(towerReadout("ooze", "melon", ["mimicstep"], []).dmg, towerReadout("ooze", "melon", [], []).dmg);
  assert.deepEqual(towerReadout("ooze", "copycat", [], []), { dmg: 0, range: 0, interval: 0 });

  // Shot effects: watch the first shot from the mortar and from its copy.
  for (const kind of ["mortar", "fire", "freeze"] as const) {
    const api = onBoard();
    const { c, r } = findBlock(api);
    const mimic = place(api, "copycat", c, r);
    const orig = place(api, kind, c + 1, r);
    const w = api.world;
    const seen = new Map<string, { splash: number; fireLife: number; freezeExtra: number }>();
    api.startWave();
    for (let i = 0; i < 60 * 60 && seen.size < 2 && w.hud.phase === "combat"; i++) {
      stepWorld(w, 1 / 60);
      for (const s of w.shots) {
        // A shot moves in the frame it is fired, so match it to the tower it is still beside.
        const from = Math.hypot(s.x - mimic.x, s.y - mimic.y) < 8 ? "copy" : Math.hypot(s.x - orig.x, s.y - orig.y) < 8 ? "orig" : null;
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

test("it won't copy a cannon it isn't meant to, like the Mimic Chest or a Ballista", () => {
  const api = onBoard();
  const { c, r } = findBlock(api);
  const mimic = place(api, "copycat", c, r);
  place(api, "mimic", c + 1, r);
  place(api, "ballista", c, r + 1);
  assert.equal(mimic.copy, undefined);
});
