import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, createWorld, decodeRun, encodeRun, runSummary, stepWorld } from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

/** A seeded Math.random, so two worlds can be run side by side. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startNight() {
  const api = createWorld(() => {}, { allTricks: true });
  api.openSetup();
  api.chooseHero("scholar");
  api.beginNight();
  return api;
}

const run = (api: ReturnType<typeof createWorld>, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) stepWorld(api.world, 1 / 60);
};

const state = (api: ReturnType<typeof createWorld>) => ({
  phase: api.world.hud.phase,
  wave: api.world.hud.wave,
  seeds: api.world.hud.seeds,
  lives: api.world.hud.lives,
  enemies: api.world.enemies.map((e) => [e.kind, Math.round(e.hp), Math.round(e.x), Math.round(e.y)]),
  towers: api.world.towers.map((t) => [t.kind, t.c, t.r]),
});

test("encodeRun keeps Sets, Maps and Infinity", () => {
  const raw = encodeRun({ v: 1, a: new Set(["x"]), b: new Map([[1, { c: Infinity }]]) });
  const back = JSON.parse(raw);
  assert.deepEqual(back.a, { __set: ["x"] });
  assert.equal(decodeRun(raw), null, "not a saved night");
});

test("saveRun is null outside a night", () => {
  const api = createWorld(() => {}, { allTricks: true });
  assert.equal(api.saveRun(), null);
  api.openSetup();
  assert.equal(api.saveRun(), null);
});

test("a night saved mid-wave resumes paused, and then plays on exactly as the original would", () => {
  const real = Math.random;
  try {
    Math.random = seeded(7);
    const a = startNight();
    a.world.hud.seeds = 1000;
    for (const [c, r] of [[4, 3], [6, 3], [8, 5]]) a.pointer(center(c), center(r), "down");
    a.dismissSelection();
    assert.ok(a.world.towers.length >= 2, "towers placed");
    a.startWave();
    run(a, 3);
    assert.equal(a.world.hud.phase, "combat");
    const raw = a.saveRun();
    assert.ok(raw, "saved");
    const sum = runSummary(raw);
    assert.equal(sum?.wave, a.world.hud.wave);
    assert.equal(sum?.hero, "scholar");

    const b = createWorld(() => {}, { allTricks: true });
    assert.equal(b.resumeRun(raw!), true);
    assert.equal(b.world.hud.phase, "combat");
    assert.equal(b.world.hud.paused, true, "a wave comes back paused");
    assert.deepEqual(state(b), state(a));
    b.togglePause();

    Math.random = seeded(99);
    run(a, 1);
    const mid = state(a);
    run(a, 39);
    const after = state(a);
    Math.random = seeded(99);
    run(b, 1);
    assert.ok(mid.enemies.length > 0, "still mid-wave");
    assert.deepEqual(state(b), mid, "same fruit a second on");
    run(b, 39);
    assert.deepEqual(state(b), after, "same night after 40 more seconds");
  } finally {
    Math.random = real;
  }
});

test("a night saved between waves resumes between waves; a broken save is refused", () => {
  const a = startNight();
  a.pointer(center(4), center(3), "down");
  const raw = a.saveRun()!;
  const b = createWorld(() => {}, { allTricks: true });
  assert.equal(b.resumeRun("{nope"), false);
  assert.equal(b.resumeRun(raw.replace('"v":1', '"v":999')), false);
  assert.equal(b.world.hud.phase, "coldopen");
  assert.equal(b.resumeRun(raw), true);
  assert.equal(b.world.hud.phase, "prep");
  assert.equal(b.world.towers.length, 1);
  b.startWave();
  run(b, 60);
  assert.notEqual(b.world.hud.phase, "combat", "the resumed wave ends");
});
