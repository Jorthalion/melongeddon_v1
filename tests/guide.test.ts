import { test } from "node:test";
import assert from "node:assert/strict";
import { BALANCE, CELL, createWorld, fittingsFor, stepWorld } from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

/** Build `kind` on the first open floor tile next to the carpet. */
function build(api: ReturnType<typeof createWorld>, kind: Parameters<ReturnType<typeof createWorld>["chooseBuild"]>[0]) {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++) {
    for (let c = 0; c < w.cols; c++) {
      const open = !w.pathCells.has(`${c},${r}`) && !w.towers.some((t) => t.c === c && t.r === r);
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => w.pathCells.has(`${c + dc},${r + dr}`));
      if (open && near) {
        api.pointer(center(c), center(r), "down");
        return;
      }
    }
  }
  throw new Error("no open floor");
}

/** A new player's game: the guide is still to do. */
function guided() {
  const api = createWorld(() => {}, { guide: true });
  api.continueRun();
  api.beginNight();
  return api;
}

function clearWave(api: ReturnType<typeof createWorld>) {
  api.world.towers.forEach((t) => (t.cd = 0));
  for (let i = 0; i < 60 * 120 && api.world.hud.phase === "combat"; i++) {
    for (const e of api.world.enemies) e.hp = Math.min(e.hp, 1); // keep the test about the guide, not the balance
    stepWorld(api.world, 1 / 60);
  }
}

test("a new player's Start plays Mynxi's tutorial, and Setup stays shut", () => {
  const api = createWorld(() => {}, { guide: true });
  assert.equal(api.world.hud.guideDone, false);
  api.openSetup();
  assert.equal(api.world.hud.phase, "coldopen", "New night is locked");
  api.continueRun();
  const h = api.world.hud;
  assert.equal(h.phase, "poster");
  assert.equal(h.guide, "welcome");
  assert.equal(h.tutorial, true);
  assert.equal(h.night, "midnight");
  assert.equal(h.map, "stacks");
  assert.equal(h.hero, "mynxi");
});

test("Mynxi's lessons run in order: talk, build, wave, upgrade, back room", () => {
  const api = guided();
  const h = () => api.world.hud;

  for (const talk of ["welcome", "carpet", "seeds"]) {
    assert.equal(h().guide, talk);
    api.startWave();
    assert.equal(h().phase, "prep", `no wave during "${talk}"`);
    api.guideNext();
  }
  assert.equal(h().guide, "damage");
  api.guideNext();
  assert.equal(h().guide, "damage", "Next doesn't skip a building step");
  api.startWave();
  assert.match(h().log, /Damage cannon/);

  build(api, "melon");
  assert.equal(h().guide, "range");
  api.guideNext();
  assert.equal(h().guide, "support");
  api.startWave();
  assert.equal(h().phase, "prep", "no wave before a Control or Support tower");

  build(api, "still");
  assert.equal(h().guide, "tabs");
  api.guideNext();
  assert.equal(h().guide, "start");

  api.startWave();
  assert.equal(h().phase, "combat");
  assert.equal(h().guide, "speed");
  api.nudgeSpeed(1);
  assert.equal(h().guide, "combat", "changing speed counts as the speed lesson");
  clearWave(api);
  assert.equal(h().phase, "upgrade");
  assert.equal(h().guide, "upgrade");
  api.pickUpgrade(h().offer[0].id);
  assert.equal(h().guide, "backroom");

  api.startWave();
  assert.equal(h().phase, "prep", "no wave 2 before the back room");

  const melon = api.world.towers.find((t) => t.kind === "melon")!;
  api.pointer(melon.x, melon.y, "down");
  assert.equal(h().selected, melon.id);
  const seeds = h().seeds;
  api.openShop();
  assert.equal(h().workshop, "melon", "the back room opens on the picked cannon's kind");
  api.pickMod(fittingsFor("melon")[0].id);
  assert.equal(h().seeds, seeds, "the tutorial's upgrade is free");
  assert.equal(h().guide, "sell", "one last word from Mynxi");
  assert.equal(h().guideDone, true, "Setup is open");

  api.startWave();
  assert.equal(h().phase, "combat", "the last word doesn't hold the wave");
  api.guideNext();
  assert.equal(h().guide, null);
  assert.equal(h().tutorial, true, "her tips carry on for the rest of the night");
});

test("building early skips the lessons it covers", () => {
  const api = guided();
  build(api, "lantern");
  build(api, "melon");
  api.guideNext(); // welcome
  api.guideNext(); // carpet
  api.guideNext(); // seeds -> damage is done -> range
  assert.equal(api.world.hud.guide, "range");
  api.guideNext(); // range -> support is done -> tabs
  assert.equal(api.world.hud.guide, "tabs");
});

test("skipping the tutorial opens Setup and releases the wave", () => {
  const api = guided();
  api.skipGuide();
  assert.equal(api.world.hud.guide, null);
  assert.equal(api.world.hud.tutorial, false);
  assert.equal(api.world.hud.guideDone, true);
  api.startWave();
  assert.equal(api.world.hud.phase, "combat");
  api.toTitle();
  api.openSetup();
  assert.equal(api.world.hud.phase, "select");
});

test("restarting the tutorial goes back to building; leaving keeps Setup shut", () => {
  const api = guided();
  build(api, "melon");
  api.restartNight();
  assert.equal(api.world.hud.guide, "damage");
  assert.equal(api.world.hud.tutorial, true);
  api.toTitle();
  assert.equal(api.world.hud.guide, null);
  assert.equal(api.world.hud.guideDone, false);
  api.openSetup();
  assert.equal(api.world.hud.phase, "coldopen");
});

test("the tutorial can be replayed from the title once it's done", () => {
  const api = createWorld(() => {});
  assert.equal(api.world.hud.guideDone, true);
  api.startTutorial();
  assert.equal(api.world.hud.guide, "welcome");
  assert.equal(api.world.hud.hero, "mynxi");
  api.toTitle();
  api.continueRun();
  assert.equal(api.world.hud.guide, null, "Continue is an ordinary night");
  assert.equal(api.world.hud.tutorial, false);
});

test("the tutorial night is very easy: soft, slow fruit and a bigger start", () => {
  const plain = createWorld(() => {});
  plain.continueRun();
  const tut = guided();
  assert.equal(tut.world.hud.seeds, plain.world.hud.seeds + BALANCE.tutorialSeeds);
  assert.equal(tut.world.hud.maxLives, plain.world.hud.maxLives + BALANCE.tutorialStacks);
  for (const api of [tut, plain]) {
    api.beginNight();
    api.world.hud.guide = null;
    api.startWave();
    for (let i = 0; i < 600 && !api.world.enemies.length; i++) stepWorld(api.world, 1 / 60);
  }
  const a = tut.world.enemies[0];
  const b = plain.world.enemies[0];
  assert.ok(a.maxHp <= Math.ceil(b.maxHp * BALANCE.tutorialHp) + 1, `tutorial fruit ${a.maxHp} vs ${b.maxHp}`);
  assert.ok(a.speed < b.speed);
  // Restarting keeps it easy.
  tut.restartNight();
  assert.equal(tut.world.hud.maxLives, plain.world.hud.maxLives + BALANCE.tutorialStacks);
});

test("tests, the simulator and developer mode never see the guide", () => {
  assert.equal(createWorld(() => {}).world.hud.guideDone, true);
  assert.equal(createWorld(() => {}, { dev: true }).world.hud.guideDone, true);
});

test("the guided night's poster goes back to the title, not into the locked Setup", () => {
  const api = createWorld(() => {}, { guide: true });
  api.continueRun();
  assert.equal(api.world.hud.phase, "poster");
  api.backToSetup();
  assert.equal(api.world.hud.phase, "coldopen");
  assert.equal(api.world.hud.guide, null);
});

test("after the support lesson the Melon cannon is picked again", () => {
  const api = guided();
  for (let i = 0; i < 3; i++) api.guideNext();
  build(api, "melon");
  api.guideNext();
  assert.equal(api.world.hud.guide, "support");
  build(api, "still");
  assert.equal(api.world.hud.guide, "tabs");
  assert.equal(api.world.hud.build, "melon", "the next floor tap builds damage, not another Still");
  assert.match(api.world.hud.log, /Melon cannon is picked again/);
});

test("tapping the carpet says why nothing was built", () => {
  const api = guided();
  const [key] = api.world.pathCells;
  const [c, r] = key.split(",").map(Number);
  const towers = api.world.towers.length;
  api.pointer(center(c), center(r), "down");
  assert.equal(api.world.towers.length, towers);
  assert.match(api.world.hud.log, /carpet/i);
});
