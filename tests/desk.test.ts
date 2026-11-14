import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CANNON, CELL, EMPTY_META, WAVE_COUNT, createWorld, groupsFor, sellValue, stepWorld, type MetaStats } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function onBoard(meta: MetaStats) {
  const api = createWorld(() => {}, { meta });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.seeds = 5000;
  return api;
}

/** Build the desk on the open floor tile beside the carpet that is farthest from any carpet bend (or the first one). */
function buildDesk(api: ReturnType<typeof onBoard>) {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild("desk");
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      const t = w.towers[w.towers.length - 1];
      return w.towers.length > before && t.kind === "desk" ? t : undefined;
    }
}

/** Finish the current wave with no fruit ever reaching anything (they're cleared as they appear). */
function clearWave(api: ReturnType<typeof onBoard>) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
}

test("Mynxi's Keeper tab holds the Card Catalogue and the Reserve Desk", () => {
  assert.deepEqual(groupsFor("mynxi").find((g) => g.id === "keeper")?.kinds, ["catalogue", "desk"]);
});

test("the Reserve Desk stays locked until a night ends with 200 seeds in hand", () => {
  const locked = onBoard({ ...EMPTY_META, richest: 199 });
  assert.equal(buildDesk(locked), undefined);
  assert.match(locked.world.hud.log, /200 seeds/);
  assert.ok(buildDesk(onBoard({ ...EMPTY_META, richest: 200 })), "open at 200");
});

test("it banks 8 a wave, a passing melon eats the bank, and selling collects it", () => {
  const api = onBoard({ ...EMPTY_META, richest: 999 });
  const desk = buildDesk(api);
  assert.ok(desk);
  clearWave(api);
  clearWave(api);
  assert.equal(desk.bank, 2 * CANNON.deskBank);

  // Selling pays the refund plus the bank.
  const seeds = api.world.hud.seeds;
  api.dismissSelection();
  api.pointer(desk.x, desk.y, "down");
  api.sellSelected();
  assert.equal(api.world.hud.seeds - seeds, sellValue(desk.paid) + 2 * CANNON.deskBank);

  // A new desk, a wave banked, then a melon wanders past.
  const desk2 = buildDesk(api);
  assert.ok(desk2);
  clearWave(api);
  assert.equal(desk2.bank, CANNON.deskBank);
  api.startWave();
  const w = api.world;
  for (let i = 0; i < 120 && w.enemies.length === 0; i++) stepWorld(w, 1 / 60);
  const fruit = w.enemies[0];
  assert.ok(fruit);
  fruit.kind = "melon";
  fruit.x = desk2.x + 10;
  fruit.y = desk2.y;
  stepWorld(w, 1 / 60);
  assert.equal(desk2.bank, 0, "the bank is eaten");
  assert.match(w.hud.log, /ate the bank/);
});

test("winning pays the bank out and counts toward the 200-seed goal, which opens the desk", () => {
  const api = onBoard({ ...EMPTY_META });
  assert.ok(api.world.hud.lockedTowers.includes("desk"));
  for (let n = 0; n < 200 && api.world.hud.phase !== "victory"; n++) clearWave(api);
  assert.equal(api.world.hud.phase, "victory");
  assert.equal(api.world.hud.wave, WAVE_COUNT);
  // 5000 seeds in hand at the win: the goal is met and the desk opens.
  assert.ok(!api.world.hud.lockedTowers.includes("desk"));
  assert.match(api.world.hud.log, /New keeper tower: Reserve Desk/);

  // With a desk on the board, the win pays out what it holds.
  // Everything already unlocked, so no unlock notice replaces the payout line.
  const rich = onBoard({ ...ALL_UNLOCKED });
  const desk = buildDesk(rich);
  assert.ok(desk);
  for (let n = 0; n < 200 && rich.world.hud.phase !== "victory"; n++) clearWave(rich);
  assert.equal(desk.bank, 0, "paid out");
  assert.match(rich.world.hud.log, /Reserve Desk pays out \d+/);
});

test("the Reserve Desk only goes right beside the carpet", () => {
  const api = onBoard({ ...EMPTY_META, richest: 999 });
  const w = api.world;
  api.chooseBuild("desk");
  // An open tile with no carpet next to it.
  let far: [number, number] | null = null;
  for (let r = 0; r < w.rows && !far; r++)
    for (let c = 0; c < w.cols && !far; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) far = [c, r];
    }
  assert.ok(far, "the board has an open tile away from the carpet");
  api.pointer(center(far[0]), center(far[1]), "move");
  assert.equal(w.hud.canPlace, false);
  api.pointer(center(far[0]), center(far[1]), "down");
  assert.equal(w.towers.length, 0);
  assert.match(w.hud.log, /beside the carpet/);
});
