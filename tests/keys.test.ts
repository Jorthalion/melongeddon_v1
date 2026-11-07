import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, createWorld } from "../src/game/engine.ts";
import { keyAction, runKeyAction } from "../src/game/keys.ts";

const center = (c: number) => c * CELL + CELL / 2;

/** Press a key the way the hook does: decide, then apply. */
function press(api: ReturnType<typeof createWorld>, key: string) {
  const action = keyAction(api.world.hud, key);
  if (action) runKeyAction(api, action, () => {});
  return action;
}

function onBoard() {
  const api = createWorld(() => {});
  api.continueRun();
  api.beginNight();
  return api;
}

test("Esc order on the board: deselect, then open the menu, then close it", () => {
  const api = onBoard();
  for (let c = 0; c < 16 && api.world.towers.length === 0; c++) {
    for (let r = 0; r < 10 && api.world.towers.length === 0; r++) api.pointer(center(c), center(r), "down");
  }
  assert.notEqual(api.world.hud.selected, null);
  assert.deepEqual(press(api, "Escape"), { type: "deselect" });
  assert.equal(api.world.hud.selected, null);
  assert.equal(api.world.hud.menu, null);
  assert.deepEqual(press(api, "Escape"), { type: "openMenu" });
  assert.equal(api.world.hud.menu, "pause");
  press(api, "Escape");
  assert.equal(api.world.hud.menu, null);
  assert.equal(api.world.hud.paused, false);
});

test("Esc in the menu's Settings goes back to the menu first", () => {
  const api = onBoard();
  press(api, "Escape");
  api.menuSettings(true);
  press(api, "Escape");
  assert.equal(api.world.hud.menu, "pause");
  press(api, "Escape");
  assert.equal(api.world.hud.menu, null);
});

test("game keys are swallowed while the menu is open; M still works", () => {
  const api = onBoard();
  press(api, "Escape");
  for (const key of [" ", "p", "1", "+", "-"]) {
    assert.deepEqual(keyAction(api.world.hud, key), { type: "swallow" }, key);
  }
  press(api, " ");
  assert.equal(api.world.hud.phase, "prep", "Space did not start a wave");
  assert.equal(api.world.hud.paused, true, "P did not unpause under the menu");
  assert.deepEqual(keyAction(api.world.hud, "m"), { type: "mute" });
  assert.equal(keyAction(api.world.hud, "Tab"), null, "Tab is left to the browser");
});

test("Space starts a wave even when quick-paused, and the wave runs", () => {
  const api = onBoard();
  press(api, "p");
  assert.equal(api.world.hud.paused, true);
  press(api, " ");
  assert.equal(api.world.hud.phase, "combat");
  assert.equal(api.world.hud.paused, false);
  press(api, " ");
  assert.equal(api.world.hud.paused, true, "Space pauses during a wave");
});

test("Setup: digits pick a keeper, Enter begins, Esc goes back", () => {
  const api = createWorld(() => {});
  api.openSetup();
  assert.equal(keyAction(api.world.hud, "Enter")?.type, "begin");
  press(api, "Enter");
  assert.equal(api.world.hud.phase, "select", "Enter does nothing with no keeper");
  press(api, "3");
  assert.equal(api.world.hud.hero, "michael");
  press(api, "2");
  assert.equal(api.world.hud.hero, "vael");
  press(api, "Enter");
  assert.equal(api.world.hud.phase, "poster");
  press(api, "Escape");
  assert.equal(api.world.hud.phase, "select");
  press(api, "Escape");
  assert.equal(api.world.hud.phase, "coldopen");
});

test("Intro: Enter goes to the carpet", () => {
  const api = createWorld(() => {});
  api.continueRun();
  press(api, "Enter");
  assert.equal(api.world.hud.phase, "prep");
});

test("the knight card takes 1–3 in on-screen order; Esc opens the menu", () => {
  const api = onBoard();
  api.world.hud.phase = "alliance";
  assert.deepEqual(keyAction(api.world.hud, "1"), { type: "alliance", choice: "accept" });
  assert.deepEqual(keyAction(api.world.hud, "2"), { type: "alliance", choice: "betray" });
  assert.deepEqual(keyAction(api.world.hud, "3"), { type: "alliance", choice: "reject" });
  assert.equal(keyAction(api.world.hud, "4"), null);
  press(api, "Escape");
  assert.equal(api.world.hud.menu, "pause");
});

test("single-button story cards: Enter presses the button", () => {
  const api = onBoard();
  for (const phase of ["betrayal", "consequence"] as const) {
    api.world.hud.phase = phase;
    assert.deepEqual(keyAction(api.world.hud, "Enter"), { type: "startWave" }, phase);
  }
  api.world.hud.phase = "memory";
  press(api, "Enter");
  assert.equal(api.world.hud.phase, "prep");
});

test("end cards: Enter is the main button, Esc does nothing", () => {
  const api = onBoard();
  api.world.hud.phase = "defeat";
  assert.equal(keyAction(api.world.hud, "Escape"), null);
  press(api, "Enter");
  assert.equal(api.world.hud.phase, "poster", "Try again restarts the same setup");

  api.beginNight();
  api.world.hud.alliance = "reject";
  api.world.hud.phase = "victory";
  press(api, "Enter");
  assert.equal(api.world.hud.night, "overflow", "after Midnight, Enter continues to the Overflow");
});

test("the back room: digits fit, Esc means Not now", () => {
  const api = onBoard();
  api.world.hud.phase = "shop";
  api.world.hud.modOffer = [{ id: "x" } as never, { id: "y" } as never];
  assert.deepEqual(keyAction(api.world.hud, "2"), { type: "pickMod", index: 1 });
  assert.equal(keyAction(api.world.hud, "3"), null);
  assert.deepEqual(keyAction(api.world.hud, "Escape"), { type: "closeShop" });
});

test("the Title leaves keys to its own buttons", () => {
  const api = createWorld(() => {});
  for (const key of ["Enter", "Escape", " ", "1", "ArrowDown"]) assert.equal(keyAction(api.world.hud, key), null, key);
});
