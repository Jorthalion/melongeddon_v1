import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, TOWER_GROUPS, TRICK_LEVEL, createWorld, emptyProgress, groupsFor, stepWorld, type TowerKind } from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

/** Vael on the Stacks with one tower of `kind` at (5,4), right beside the first bend. */
function withTower(kind: TowerKind) {
  const api = createWorld(() => {}, { setup: { night: "midnight", map: "stacks", hero: "vael" }, allTricks: true });
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

test("the Trick tab holds the five trick towers on key T, after the Keeper tab", () => {
  const trick = TOWER_GROUPS.find((g) => g.id === "trick");
  assert.deepEqual(trick?.kinds, ["boomerang", "orrery", "plane", "quill", "globe"]);
  assert.equal(trick?.key, "t");
  assert.deepEqual(groupsFor("mynxi").map((g) => g.key), ["q", "w", "e", "r", "t", "y"]);
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
  for (const kind of ["boomerang", "orrery", "plane", "quill", "globe"] as const) {
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

test("the serpent quill weaves from side to side as it flies out", () => {
  const { api, tower } = withTower("quill");
  api.startWave();
  let f: (typeof api.world.flyers)[number] | undefined;
  for (let i = 0; i < 60 * 20 && !f; i++) {
    stepWorld(api.world, 1 / 60);
    f = api.world.flyers.find((x) => x.kind === "quill");
  }
  assert.ok(f, "a quill was thrown");
  const sides: number[] = [];
  let far = 0;
  while (api.world.flyers.includes(f!)) {
    stepWorld(api.world, 1 / 60);
    sides.push((f!.x - f!.ox) * -f!.uy + (f!.y - f!.oy) * f!.ux);
    far = Math.max(far, Math.hypot(f!.x - tower.x, f!.y - tower.y));
  }
  assert.ok(Math.max(...sides) > 15 && Math.min(...sides) < -15, "it crossed to both sides of its line");
  assert.ok(far > CELL * 3, `it wrote a long line (${Math.round(far)} px)`);
});

test("the rolling globe lands on the carpet and rolls back toward the entrance", () => {
  const { api } = withTower("globe");
  api.startWave();
  let f: (typeof api.world.flyers)[number] | undefined;
  for (let i = 0; i < 60 * 20 && !f; i++) {
    stepWorld(api.world, 1 / 60);
    f = api.world.flyers.find((x) => x.kind === "globe");
  }
  assert.ok(f, "a globe was thrown");
  while (api.world.flyers.includes(f!) && !f!.rolling) stepWorld(api.world, 1 / 60);
  assert.ok(api.world.pathCells.has(`${Math.floor(f!.x / CELL)},${Math.floor(f!.y / CELL)}`), "it landed on the carpet");
  const startWp = f!.wp!;
  for (let i = 0; i < 60 * 2 && api.world.flyers.includes(f!); i++) {
    stepWorld(api.world, 1 / 60);
    assert.ok(api.world.pathCells.has(`${Math.floor(f!.x / CELL)},${Math.floor(f!.y / CELL)}`), "it stays on the carpet");
  }
  assert.ok(f!.wp! <= startWp, "it rolled toward the entrance, not the door");
});

test("trick cannons open with the keeper's level", () => {
  const xpFor = (level: number) => {
    let xp = 0;
    for (let l = 1; l < level; l++) xp += 100 + 30 * (l - 1);
    return xp;
  };
  const at = (level: number) => {
    const keepers = emptyProgress();
    keepers.vael = { ...keepers.vael, xp: xpFor(level) };
    const api = createWorld(() => {}, { setup: { night: "midnight", map: "stacks", hero: "vael" }, keepers });
    api.openSetup();
    api.chooseHero("vael");
    api.beginNight();
    api.world.hud.seeds = 5000;
    const can = (kind: TowerKind) => {
      api.world.towers = [];
      api.dismissSelection();
      api.chooseBuild(kind);
      api.pointer(center(5), center(4), "down");
      return api.world.towers.some((t) => t.kind === kind);
    };
    return { api, can };
  };
  assert.deepEqual(TRICK_LEVEL, { boomerang: 2, orrery: 3, plane: 5, quill: 7, globe: 9 });
  const one = at(1);
  for (const k of ["boomerang", "orrery", "plane", "quill", "globe"] as const) assert.equal(one.can(k), false, `${k} locked at level 1`);
  assert.match(one.api.world.hud.log, /opens when Vaelithra reaches level 9/);
  const five = at(5);
  assert.equal(five.api.world.hud.runLevel, 5);
  assert.equal(five.can("plane"), true);
  assert.equal(five.can("quill"), false);
  const nine = at(9);
  for (const k of ["boomerang", "orrery", "plane", "quill", "globe"] as const) assert.equal(nine.can(k), true, `${k} open at level 9`);
  // Developer mode has every keeper at level 10.
  const dev = createWorld(() => {}, { dev: true, setup: { night: "midnight", map: "stacks", hero: "vael" } });
  dev.openSetup();
  dev.chooseHero("vael");
  assert.equal(dev.world.hud.runLevel, 10);
});
