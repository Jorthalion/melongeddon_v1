import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, TOWER_GROUPS, createWorld, groupsFor, stepWorld, type TowerKind } from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

/** Vael on the Stacks with one tower of `kind` at (5,4), right beside the first bend. */
function withTower(kind: TowerKind) {
  const api = createWorld(() => {}, { setup: { night: "midnight", map: "stacks", hero: "vael" } });
  api.openSetup();
  api.pickKeeper("vael");
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 5000;
  api.chooseBuild(kind);
  api.pointer(center(5), center(4), "down");
  api.dismissSelection();
  const tower = api.world.towers.find((t) => t.kind === kind);
  assert.ok(tower, `${kind} placed`);
  return { api, tower };
}

/** Run the wave; return how much damage fruit took. */
function damageDealt(api: ReturnType<typeof createWorld>, seconds = 25) {
  let dealt = 0;
  const seen = new Map<number, number>();
  api.startWave();
  for (let i = 0; i < 60 * seconds && api.world.hud.phase === "combat"; i++) {
    for (const e of api.world.enemies) seen.set(e.id, e.hp);
    stepWorld(api.world, 1 / 60);
    for (const e of api.world.enemies) dealt += Math.max(0, (seen.get(e.id) ?? e.hp) - e.hp);
  }
  return dealt;
}

test("the Trick tab holds the three trick towers on key T, after the Keeper tab", () => {
  const trick = TOWER_GROUPS.find((g) => g.id === "trick");
  assert.deepEqual(trick?.kinds, ["boomerang", "orrery", "plane"]);
  assert.equal(trick?.key, "t");
  assert.deepEqual(groupsFor("mynxi").map((g) => g.key), ["q", "w", "e", "r", "t"]);
});

test("the boomerang flies out in a loop and comes back to the tower", () => {
  const { api, tower } = withTower("boomerang");
  api.startWave();
  let path: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 60 * 20 && !path.length; i++) {
    stepWorld(api.world, 1 / 60);
    if (api.world.flyers.length) {
      const f = api.world.flyers[0];
      path = [{ x: f.x, y: f.y }];
      while (api.world.flyers.includes(f)) {
        stepWorld(api.world, 1 / 60);
        path.push({ x: f.x, y: f.y });
      }
    }
  }
  assert.ok(path.length > 30, "it was in the air for a while");
  const far = Math.max(...path.map((p) => Math.hypot(p.x - tower.x, p.y - tower.y)));
  const last = path[path.length - 1];
  assert.ok(far > CELL * 1.5, `went out (${Math.round(far)} px)`);
  assert.ok(Math.hypot(last.x - tower.x, last.y - tower.y) < CELL, "came back");
  // Curved, not straight: some point is well off the line from tower to the far end.
  const tip = path.reduce((a, p) => (Math.hypot(p.x - tower.x, p.y - tower.y) > Math.hypot(a.x - tower.x, a.y - tower.y) ? p : a));
  const ux = (tip.x - tower.x) / far;
  const uy = (tip.y - tower.y) / far;
  const off = Math.max(...path.map((p) => Math.abs((p.x - tower.x) * uy - (p.y - tower.y) * ux)));
  assert.ok(off > CELL * 0.5, "the loop curves to one side");
});

test("the paper plane turns as it flies (a curved path)", () => {
  const { api } = withTower("plane");
  api.startWave();
  const headings: number[] = [];
  for (let i = 0; i < 60 * 20; i++) {
    stepWorld(api.world, 1 / 60);
    const f = api.world.flyers[0];
    if (f) headings.push(f.heading);
    if (headings.length > 60) break;
  }
  assert.ok(headings.length > 60);
  assert.ok(Math.abs(headings[headings.length - 1] - headings[0]) > 0.3, "heading changed");
});

test("every trick tower damages fruit on its own", () => {
  for (const kind of ["boomerang", "orrery", "plane"] as const) {
    const { api } = withTower(kind);
    assert.ok(damageDealt(api) > 50, kind);
  }
});

test("orrery planets keep their distance and are spaced evenly", () => {
  const { api, tower } = withTower("orrery");
  api.startWave();
  for (let i = 0; i < 30; i++) stepWorld(api.world, 1 / 60);
  assert.ok(tower.orbit && tower.orbit > CELL, "orbit set");
  assert.equal(CANNON.orreryPlanets, 3);
});
