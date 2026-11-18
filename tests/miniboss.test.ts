import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, BALANCE, STATS, createWorld, emptyProgress, nightLength, stepWorld, type NightId } from "../src/game/engine.ts";
import { describeEnemy } from "../src/game/enemyInfo.ts";

type Api = ReturnType<typeof createWorld>;
type Foe = Api["world"]["enemies"][number];

function night(night: NightId = "midnight") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), siegeOpen: true, setup: { night, map: night === "siege" ? "courtyard" : "stacks", hero: "mynxi", difficulty: "normal" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 9999;
  api.world.hud.maxLives = 9999;
  return api;
}

/** Clear waves (first card on each shelf, carpet emptied) until wave `index` (0-based) is next. */
function skipTo(api: Api, index: number) {
  const w = api.world;
  for (let n = 0; n < 100; n++) {
    if (w.hud.phase === "upgrade") {
      api.pickUpgrade(w.hud.offer[0].id);
      continue;
    }
    if ((w.hud.phase === "prep" || w.hud.phase === "consequence") && w.hud.wave - 1 === index) return;
    api.startWave();
    for (let i = 0; i < 60 * 120 && w.hud.phase === "combat"; i++) {
      w.enemies = [];
      stepWorld(w, 1 / 30);
    }
  }
  assert.fail(`never reached wave ${index + 1}`);
}

/** Start the next wave and step until a boss is out. */
function bossOf(api: Api): Foe {
  api.startWave();
  for (let i = 0; i < 60 * 60; i++) {
    const b = api.world.enemies.find((e) => e.boss);
    if (b) return b;
    stepWorld(api.world, 1 / 60);
  }
  return assert.fail("no boss came out");
}

test("Karl on wave 4 is a mini-boss: 150% more health than a pumpkin, where the full Karl has nearly six times", () => {
  const mini = night();
  skipTo(mini, 3);
  const small = bossOf(mini);
  assert.equal(small.mini, true);
  // The same night with the mini rule turned up to a full Karl's health gives the full Karl for comparison.
  const keep = BALANCE.miniBossHp;
  BALANCE.miniBossHp = STATS.karl.hp / STATS.pumpkin.hp;
  try {
    const full = night();
    skipTo(full, 3);
    const big = bossOf(full);
    const ratio = small.maxHp / big.maxHp;
    const want = (STATS.pumpkin.hp * 2.5) / STATS.karl.hp;
    assert.ok(Math.abs(ratio - want) < 0.01, `mini Karl has ${(ratio * 100).toFixed(1)}% of a full Karl's health, want ${(want * 100).toFixed(1)}%`);
  } finally {
    BALANCE.miniBossHp = keep;
  }
  assert.ok(small.r < STATS.karl.r, "and a little smaller");
});

test("the finale's boss is the full one", () => {
  const api = night();
  skipTo(api, nightLength("midnight") - 1);
  const karl = bossOf(api);
  assert.ok(!karl.mini);
  assert.equal(karl.r, STATS.karl.r);
});

test("the Siege: the Matriarch on wave 5 is a mini-boss", () => {
  const api = night("siege");
  skipTo(api, 4);
  const m = bossOf(api);
  assert.equal(m.matriarch, true);
  assert.equal(m.mini, true);
});

test("hover card: name, health, what it is and what's on it", () => {
  const api = night();
  api.startWave();
  for (let i = 0; i < 600 && !api.world.enemies.length; i++) stepWorld(api.world, 1 / 60);
  const e = api.world.enemies[0];
  Object.assign(e, { kind: "pumpkin", split: true, freeze: 1.2, ink: 2, inkMul: 1.3, hp: 40.2, maxHp: 80 });
  const info = describeEnemy(e, api.world);
  assert.equal(info.name, "Pumpkin");
  assert.equal(info.hp, 41);
  assert.equal(info.maxHp, 80);
  assert.ok(info.traits.some((t) => t.startsWith("Split (the X)")), info.traits.join(" | "));
  assert.ok(info.effects.includes("Frozen (1.2s)"), info.effects.join(" | "));
  assert.ok(info.effects.includes("Inked: takes 30% more damage"));
  // A plain fruit has nothing to say beyond its name and health.
  Object.assign(e, { split: false, freeze: 0, ink: 0 });
  const plain = describeEnemy(e, api.world);
  assert.equal(plain.traits.length, 0);
  assert.equal(plain.effects.length, 0);
  // A mini-boss says so.
  Object.assign(e, { kind: "karl", boss: true, mini: true });
  const mini = describeEnemy(e, api.world);
  assert.equal(mini.name, "Karl (mini)");
  assert.ok(mini.traits[0].startsWith("Mini-boss: 150% more health than a pumpkin"));
});
