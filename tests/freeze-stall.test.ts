import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CELL, THAW, createWorld, emptyProgress, stepWorld, type TowerKind } from "../src/game/engine.ts";

// Issue 1b (phone bot, the Greenhouse, wave 14): a Freeze cannon that fires faster than its freeze
// lasts held the last fruit of a wave frozen for 36 minutes, with no damage tower in reach, so the
// wave never ended. One unbroken freeze now lasts THAW.hold at most, then the fruit walks a moment before
// it can freeze again, so it always creeps on.
function start() {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map: "greenhouse", hero: "vael" } });
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 99999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;

/** Build where it will stand, trying tiles nearest a spot until one takes. */
function buildNear(api: Api, kind: TowerKind, x: number, y: number) {
  const w = api.world;
  const cells: [number, number, number][] = [];
  for (let c = 0; c < 40; c++) for (let r = 0; r < 30; r++) cells.push([c, r, Math.hypot(c * CELL + CELL / 2 - x, r * CELL + CELL / 2 - y)]);
  cells.sort((a, b) => a[2] - b[2]);
  for (const [c, r] of cells) {
    api.chooseBuild(kind);
    api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
    api.dismissSelection();
    const t = w.towers.find((t) => t.kind === kind && t.c === c && t.r === r);
    if (t) return t;
  }
  throw new Error(`no room for ${kind}`);
}

test("a Freeze cannon can't hold the last fruit of a wave forever", () => {
  const api = start();
  const w = api.world;
  const bend = w.points[3];
  const freeze = buildNear(api, "freeze", bend.x, bend.y);
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  // One fruit no shot can kill, standing at the bend under the cannon (the bot's pumpkin).
  const f = w.enemies[0];
  Object.assign(f, { x: bend.x, y: bend.y, wp: 3, hp: 1e9, maxHp: 1e9, guard: "none", shell: 0, boss: false });
  const at = { x: f.x, y: f.y };
  let held = 0;
  let longest = 0;
  for (let i = 0; i < 60 * 30; i++) {
    w.enemies = [f];
    // The worst case: the cannon is always ready to fire again.
    freeze.cd = Math.min(freeze.cd, 0.2);
    stepWorld(w, 1 / 60);
    held = f.slow === 0 ? held + 1 / 60 : 0;
    longest = Math.max(longest, held);
  }
  assert.ok(Math.hypot(f.x - at.x, f.y - at.y) > CELL, `it crept on (${Math.round(Math.hypot(f.x - at.x, f.y - at.y))} px in 30 s)`);
  assert.ok(longest <= THAW.hold + 0.05, `held ${longest.toFixed(2)} s at a stretch (at most ${THAW.hold})`);
});

test("one Freeze hit still holds its full time, and a fresh fruit freezes as before", () => {
  const api = start();
  const w = api.world;
  const bend = w.points[3];
  const freeze = buildNear(api, "freeze", bend.x, bend.y);
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const f = w.enemies[0];
  Object.assign(f, { x: bend.x, y: bend.y, wp: 3, hp: 1e9, maxHp: 1e9, guard: "none", shell: 0, boss: false });
  freeze.cd = 0;
  for (let i = 0; i < 60 && f.freeze <= 0; i++) {
    w.enemies = [f];
    stepWorld(w, 1 / 60);
  }
  assert.ok(f.freeze > 1.3, `frozen by the first hit (${f.freeze.toFixed(2)} s)`);
  // No more shots: it stays held until the hit's time runs out, then walks.
  freeze.cd = 999;
  let still = 0;
  while (f.freeze > 0 && still < 5) {
    w.enemies = [f];
    stepWorld(w, 1 / 60);
    still += 1 / 60;
  }
  assert.ok(still > 1.2, `held ${still.toFixed(2)} s`);
  assert.ok((f.thawT ?? 0) > 0, "thawing");
});
