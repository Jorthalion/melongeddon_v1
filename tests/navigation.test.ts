import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, EMPTY_META, CELL, createWorld, validateSetup } from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

/** A world on the Archive with Vael, hard, a bookmark, one cannon built and a wave started. */
function midRun() {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED });
  api.openLibrary();
  api.chooseMap("archive");
  api.setDifficulty("hard");
  api.setBookmark("seedfund");
  api.pickKeeper("vael");
  api.chooseHero("vael");
  api.beginNight();
  // Build on the first legal cell.
  for (let c = 0; c < 16 && api.world.towers.length === 0; c++) {
    for (let r = 0; r < 10 && api.world.towers.length === 0; r++) api.pointer(center(c), center(r), "down");
  }
  api.startWave();
  return api;
}

const setupOf = (api: ReturnType<typeof createWorld>) => {
  const h = api.world.hud;
  return { night: h.night, map: h.map, difficulty: h.difficulty, bookmark: h.bookmark, hero: h.hero };
};
const SAME = { night: "midnight", map: "archive", difficulty: "hard", bookmark: "seedfund", hero: "vael" };

test("the keeper picked on Setup is kept in the engine", () => {
  const api = createWorld(() => {});
  api.openLibrary();
  api.pickKeeper("michael");
  assert.equal(api.world.hud.hero, "michael");
  assert.equal(api.world.hud.phase, "select");
});

test("Change setup (reset) clears the run but keeps every choice", () => {
  const api = midRun();
  assert.ok(api.world.towers.length > 0);
  assert.equal(api.world.hud.phase, "combat");
  api.reset();
  assert.equal(api.world.hud.phase, "select");
  assert.deepEqual(setupOf(api), SAME);
  assert.equal(api.world.towers.length, 0);
  assert.equal(api.world.enemies.length, 0);
  assert.equal(api.world.hud.wave, 1);
});

test("restartNight starts the same setup again from the Intro with a clean board", () => {
  const api = midRun();
  api.world.hud.seeds = 3;
  api.world.hud.upgrades = ["bounce"];
  api.restartNight();
  assert.equal(api.world.hud.phase, "poster");
  assert.deepEqual(setupOf(api), SAME);
  assert.equal(api.world.towers.length, 0);
  assert.equal(api.world.hud.upgrades.length, 0);
  assert.ok(api.world.hud.seeds > 100, "fresh seeds, plus the bookmark");
});

test("toTitle clears the run, and Continue starts the same setup", () => {
  const api = midRun();
  api.toTitle();
  assert.equal(api.world.hud.phase, "coldopen");
  assert.equal(api.world.towers.length, 0);
  assert.equal(api.world.hud.saved, true);
  api.continueRun();
  assert.equal(api.world.hud.phase, "poster");
  assert.deepEqual(setupOf(api), SAME);
});

test("Back from the Intro returns to Setup and removes Sir Michael's free cannon", () => {
  const api = createWorld(() => {});
  api.openLibrary();
  api.pickKeeper("michael");
  api.chooseHero("michael");
  assert.equal(api.world.towers.length, 1);
  api.backToSetup();
  assert.equal(api.world.hud.phase, "select");
  assert.equal(api.world.hud.hero, "michael");
  assert.equal(api.world.towers.length, 0);
  api.backToTitle();
  assert.equal(api.world.hud.phase, "coldopen");
});

test("Continue on a first visit uses the defaults", () => {
  const api = createWorld(() => {});
  assert.equal(api.world.hud.saved, false);
  api.continueRun();
  assert.equal(api.world.hud.phase, "poster");
  assert.equal(api.world.hud.hero, "mynxi");
  assert.equal(api.world.hud.map, "stacks");
});

test("a saved setup is pre-selected on load", () => {
  const api = createWorld(() => {}, {
    meta: ALL_UNLOCKED,
    setup: { night: "endless", map: "mezzanine", difficulty: "easy", bookmark: "sparestack", hero: "michael" },
  });
  const h = api.world.hud;
  assert.equal(h.saved, true);
  assert.deepEqual(
    { night: h.night, map: h.map, difficulty: h.difficulty, bookmark: h.bookmark, hero: h.hero, waveCount: h.waveCount },
    { night: "endless", map: "mezzanine", difficulty: "easy", bookmark: "sparestack", hero: "michael", waveCount: 0 },
  );
  assert.equal(h.setupNote, "");
});

test("Continue falls back from a locked map or bookmark and says so", () => {
  const r = validateSetup(
    { night: "midnight", map: "archive", difficulty: "hard", bookmark: "seedfund", hero: "vael" },
    { maps: ["stacks"], unlocked: [] },
  );
  assert.equal(r.setup.map, "stacks");
  assert.equal(r.setup.bookmark, null);
  assert.equal(r.notes.length, 2);
  assert.equal(r.setup.difficulty, "hard");

  const api = createWorld(() => {}, {
    meta: EMPTY_META,
    setup: { night: "midnight", map: "archive", hero: "vael" },
  });
  assert.equal(api.world.hud.map, "stacks");
  assert.match(api.world.hud.setupNote, /locked/);
});

test("validateSetup ignores junk", () => {
  const r = validateSetup({ night: "brunch" as never, hero: "karl" as never, difficulty: "x" as never }, { maps: [], unlocked: [] });
  assert.deepEqual(r.setup, { night: "midnight", map: "stacks", difficulty: "normal", bookmark: null, hero: "mynxi", door: "none" });
});

test("Continue on the Overflow with no door answer opens Setup instead", () => {
  const api = createWorld(() => {}, { setup: { night: "overflow", hero: "vael" } });
  assert.equal(validateSetup({ night: "overflow" }, { maps: [], unlocked: [] }).needsDoor, true);
  api.continueRun();
  assert.equal(api.world.hud.phase, "select");
  assert.equal(api.world.hud.night, "overflow");
  assert.match(api.world.hud.log, /first night/);
});

test("Continue on the Overflow with a saved door answer starts it", () => {
  const api = createWorld(() => {}, { setup: { night: "overflow", hero: "vael", door: "reject" } });
  api.continueRun();
  assert.equal(api.world.hud.phase, "poster");
  assert.equal(api.world.hud.alliance, "reject");
  assert.equal(api.world.hud.map, "overflow");
});

test("Continue to the Overflow after Midnight uses this run's door answer", () => {
  const api = midRun();
  api.world.hud.alliance = "betray";
  api.world.hud.phase = "victory";
  api.continueOverflow();
  const h = api.world.hud;
  assert.equal(h.phase, "poster");
  assert.equal(h.night, "overflow");
  assert.equal(h.map, "overflow");
  assert.equal(h.alliance, "betray");
  assert.equal(h.hero, "vael");
  assert.equal(h.difficulty, "hard");
  // Shooting first means husks are already on the carpet.
  assert.ok(api.world.enemies.length > 0);
});

test("Try Endless after the Overflow opens Setup on Endless", () => {
  const api = createWorld(() => {}, { setup: { night: "overflow", hero: "vael", door: "accept" } });
  api.continueRun();
  api.world.hud.phase = "victory";
  api.tryEndless();
  assert.equal(api.world.hud.phase, "select");
  assert.equal(api.world.hud.night, "endless");
  assert.notEqual(api.world.hud.map, "overflow");
});

test("the pause menu pauses, blocks quick pause and waves, and Resume unpauses", () => {
  const api = createWorld(() => {});
  api.continueRun();
  api.beginNight();
  api.togglePause();
  assert.equal(api.world.hud.paused, true);
  api.openMenu();
  assert.equal(api.world.hud.menu, "pause");
  assert.equal(api.world.hud.paused, true);
  api.togglePause();
  assert.equal(api.world.hud.paused, true, "quick pause is ignored under the menu");
  api.startWave();
  assert.equal(api.world.hud.phase, "prep", "no wave starts under the menu");
  api.menuSettings(true);
  assert.equal(api.world.hud.menu, "settings");
  api.menuSettings(false);
  api.closeMenu();
  assert.equal(api.world.hud.menu, null);
  assert.equal(api.world.hud.paused, false, "Resume leaves the game running even if it was quick-paused");
});

test("starting a wave always unpauses", () => {
  const api = createWorld(() => {});
  api.continueRun();
  api.beginNight();
  api.togglePause();
  api.startWave();
  assert.equal(api.world.hud.phase, "combat");
  assert.equal(api.world.hud.paused, false);
});

test("the menu does not open on the Title, Setup, Intro or end cards", () => {
  const api = createWorld(() => {});
  api.openMenu();
  assert.equal(api.world.hud.menu, null);
  api.openLibrary();
  api.openMenu();
  assert.equal(api.world.hud.menu, null);
  api.pickKeeper("mynxi");
  api.chooseHero("mynxi");
  api.openMenu();
  assert.equal(api.world.hud.menu, null);
  api.beginNight();
  api.world.hud.phase = "defeat";
  api.openMenu();
  assert.equal(api.world.hud.menu, null);
});

test("quick pause only works on the board", () => {
  const api = createWorld(() => {});
  api.togglePause();
  assert.equal(api.world.hud.paused, false);
});

test("Settings: game speed accepts only the listed speeds and survives a restart", () => {
  const api = createWorld(() => {});
  api.setSpeed(2);
  assert.equal(api.world.hud.speed, 2);
  api.setSpeed(7);
  assert.equal(api.world.hud.speed, 2);
  api.continueRun();
  api.beginNight();
  api.restartNight();
  assert.equal(api.world.hud.speed, 2);
});

test("Settings: reduce motion turns off screen shake", () => {
  const api = createWorld(() => {});
  api.world.shake = 10;
  api.setReduced(true);
  assert.equal(api.world.reduced, true);
  assert.equal(api.world.shake, 0);
  api.setReduced(false);
  assert.equal(api.world.reduced, false);
});
