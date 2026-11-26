import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, TRICKS, createWorld, stepWorld, type TowerKind } from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

/** Vael on the Stacks with one tower of `kind` at (5,4), right beside the first bend; the wave started. */
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
  api.startWave();
  return { api, tower };
}

/** Step up to `seconds` of combat, calling `each` before every step; stop early when `done` says so. */
function run(api: ReturnType<typeof createWorld>, seconds: number, each: () => void, done: () => boolean = () => false) {
  for (let i = 0; i < 60 * seconds && api.world.hud.phase === "combat" && !done(); i++) {
    each();
    stepWorld(api.world, 1 / 60);
  }
}

/** Make every fruit on the board too tough to pop, so damage taken can be read off its health. */
function tough(api: ReturnType<typeof createWorld>) {
  for (const e of api.world.enemies) if (e.maxHp < 1e6) e.hp = e.maxHp = 1e6;
}

/** Run a test with TRICKS switched to `on`, putting it back after. */
function withTricks<T>(on: boolean, fn: () => T): T {
  const was = TRICKS.on;
  TRICKS.on = on;
  try {
    return fn();
  } finally {
    TRICKS.on = was;
  }
}

test("Read through: the Long Reader's target takes 20% more for good (tricks off: no mark)", () => {
  for (const on of [true, false]) {
    withTricks(on, () => {
      const { api } = withTower("reader");
      run(api, 20, () => tough(api), () => api.world.enemies.some((e) => (e.readT ?? 0) > 0));
      const read = api.world.enemies.filter((e) => (e.readT ?? 0) > 0);
      if (on) {
        assert.ok(read.length, "a fruit was read through");
        for (const e of read) assert.equal(e.readT, e.boss ? TRICKS.readBossTime : Infinity);
      } else assert.equal(read.length, 0);
    });
  }
});

test("Read through: a marked fruit takes about TRICKS.readThrough× from a melon cannon", () => {
  const dealt = (mark: boolean) => {
    const { api } = withTower("melon");
    run(api, 12, () => {
      tough(api);
      if (mark) for (const e of api.world.enemies) e.readT = Infinity;
    });
    // Nothing pops: what's missing from each fruit is what it took.
    return api.world.enemies.reduce((sum, e) => sum + Math.max(0, e.maxHp - e.hp), 0);
  };
  const ratio = withTricks(true, () => dealt(true)) / withTricks(true, () => dealt(false));
  assert.ok(ratio > 1.1 && ratio < 1.3, `ratio ${ratio.toFixed(2)}`);
});

test("Globe shatter: the rolling globe shatters frozen fruit (tricks off: it doesn't)", () => {
  for (const on of [true, false]) {
    withTricks(on, () => {
      const { api } = withTower("globe");
      run(api, 25, () => {
        for (const e of api.world.enemies) if (e.hp > 0 && e.guard !== "husk") e.frost = 3;
      }, () => api.world.runLog.shatters > 0);
      if (on) assert.ok(api.world.runLog.shatters > 0, "a globe shattered a fruit");
      else assert.equal(api.world.runLog.shatters, 0);
    });
  }
});

test("Carry: a bookend through a fire patch sets the fruit it hits next burning", () => {
  withTricks(true, () => {
    const { api, tower } = withTower("boomerang");
    let lit = false;
    run(
      api,
      25,
      () => {
        // Drop a fire patch under every bookend that isn't carrying anything yet.
        for (const f of api.world.flyers) {
          if (!f.carry) (api.world as unknown as { pools: unknown[] }).pools.push({ x: f.x, y: f.y, r: 10, life: 0.1, max: 0.1, hot: true, burn: 30 });
        }
        lit ||= api.world.enemies.some((e) => (e.burnT ?? 0) > 0 && e.burnBy === tower.id);
      },
      () => lit,
    );
    assert.ok(api.world.flyers.some((f) => f.carry === "fire") || lit, "the bookend picked up the fire");
    assert.ok(lit, "a fruit it hit is burning, credited to the bookend");
    assert.ok(api.world.hud.comboTips.includes("carry"), "the carry tip shows");
  });
});

test("Carry: a quill that hits an inked fruit inks the fruit after it", () => {
  withTricks(true, () => {
    const { api } = withTower("quill");
    const inkedByUs = new Set<number>();
    let spread = false;
    run(
      api,
      25,
      () => {
        // Ink only the lead fruit; any other inked fruit got it from the quill.
        const lead = api.world.enemies.find((e) => e.hp > 0);
        if (lead) {
          lead.ink = 5;
          lead.inkMul = 1.25;
          inkedByUs.add(lead.id);
        }
        spread ||= api.world.enemies.some((e) => e.hp > 0 && (e.ink ?? 0) > 0 && !inkedByUs.has(e.id));
      },
      () => spread,
    );
    assert.ok(spread, "the quill carried the ink to another fruit");
  });
});
