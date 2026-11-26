import { test } from "node:test";
import assert from "node:assert/strict";
import { CANNON, CELL, MAX_LEVEL, TOWERS, createWorld, emptyProgress, groupsFor, stepWorld, xpForLevel, type HeroId } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function onBoard(hero: HeroId) {
  const api = createWorld(() => {}, {});
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 5000;
  return api;
}

/** Build `kind` on the first open tile beside the carpet; returns the tower or undefined. */
function build(api: ReturnType<typeof onBoard>, kind: "stomp" | "scales") {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      const placed = w.towers.length > before ? w.towers[w.towers.length - 1] : undefined;
      return placed?.kind === kind ? placed : undefined;
    }
}

test("the Legal Elf's Keeper tab holds his three towers", () => {
  const tab = groupsFor("elf").find((g) => g.id === "keeper");
  assert.deepEqual(tab?.kinds, ["scales", "stomp", "honey"]);
  assert.equal(TOWERS.stomp.name, "Foot of the Law");
});

test("only the Legal Elf can build the Foot of the Law, one at a time, beside his Scales", () => {
  const vael = onBoard("vael");
  assert.equal(build(vael, "stomp"), undefined, "another keeper can't");

  const elf = onBoard("elf");
  assert.ok(build(elf, "scales"), "Scales");
  assert.ok(build(elf, "stomp"), "and the Foot, both at once");
  assert.equal(build(elf, "stomp"), undefined, "but only one Foot");
  assert.match(elf.world.hud.log, /Only one Foot of the Law/);
});

test("the stomp stops fruit under it, husks included, and only bruises them", () => {
  const api = onBoard("elf");
  const foot = build(api, "stomp");
  assert.ok(foot);
  const w = api.world;
  // Put husked corn right beside the foot; pinned, they don't move.
  api.startWave();
  for (let i = 0; i < 120 && w.enemies.length === 0; i++) stepWorld(w, 1 / 60);
  const corn = w.enemies[0];
  assert.ok(corn, "a fruit is on the carpet");
  corn.guard = "husk";
  corn.x = foot.x + 20;
  corn.y = foot.y;
  corn.hp = corn.maxHp = 500;
  foot.cd = 0;
  stepWorld(w, 1 / 60);
  assert.ok((corn.stomped ?? 0) > 0, "the husk is pinned");
  assert.equal(w.stomps.length, 1, "the foot is drawn coming down");
  const pinnedAt = { x: corn.x, y: corn.y };
  for (let i = 0; i < 30; i++) stepWorld(w, 1 / 60);
  assert.ok(Math.hypot(corn.x - pinnedAt.x, corn.y - pinnedAt.y) < 0.5, "it stays put while pinned");
  const lost = 500 - corn.hp;
  assert.ok(lost > 0 && lost < 20, `a small bruise (${lost.toFixed(1)}), not a big hit`);
  assert.ok(CANNON.stompStun > 30 / 60, "pinned longer than this check");
});

test("the Legal Elf's Second Foot is a second Foot, not a second Scales", () => {
  const keepers = emptyProgress();
  // Level 10 with "Second Foot".
  keepers.elf = { xp: xpForLevel(MAX_LEVEL), picks: [0, 0, 0, 0, 1] };
  const api = createWorld(() => {}, { keepers });
  api.openSetup();
  api.chooseHero("elf");
  api.beginNight();
  api.world.hud.seeds = 5000;
  const foot = build(api, "stomp");
  assert.ok(foot);
  assert.equal(api.statsOf(foot.id)?.interval.toFixed(2), (0.9 * 3.6).toFixed(2), "the foot keeps its own pace");
  const scales = build(api, "scales");
  assert.ok(scales, "one Scales");
  assert.equal(build(api, "scales"), undefined, "still one Scales");
  assert.ok(build(api, "stomp"), "a second Foot");
  assert.equal(build(api, "stomp"), undefined, "but not a third");
});
