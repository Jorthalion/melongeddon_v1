import { test } from "node:test";
import assert from "node:assert/strict";
import { COMBO } from "../src/game/engine.ts";
import { ACHIEVEMENT, emptyRunLog } from "../src/game/achievements.ts";
import { ICE, MORTAR, lab, lost, shoot, step } from "./comboLab.ts";

// ── Frost ────────────────────────────────────────────────────────────────────

test("frost: a Freeze hit gives 2 stacks, a chill 1; three freezes solid; stacks drain one at a time", () => {
  const { api, fruit } = lab(2);
  const [e, f] = fruit;
  shoot(api, e, ICE);
  assert.equal(e.frost, 2);
  shoot(api, f, { element: "shot", dmg: 1, chill: 1 });
  assert.equal(f.frost, 1);
  shoot(api, f, ICE);
  assert.equal(f.frost, 3, "full");
  assert.ok(f.freeze > 0, "frozen solid");
  // e: no new frost after the hit, so its meter drains a stack once its freeze is over.
  step(api, 1.45 + COMBO.frostDrain + 0.1);
  assert.equal(e.frost, 1);
});

test("frost: a frozen-solid fruit drops to two stacks when its freeze runs out", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  Object.assign(e, { frost: 3, frostT: 9, freeze: 0.1 });
  step(api, 0.2);
  assert.equal(e.frost, 2);
});

test("frost: a boss stops at two; a husk gets none; damp drains slower", () => {
  const { api, fruit } = lab(3);
  const [boss, husk, damp] = fruit;
  boss.boss = true;
  shoot(api, boss, ICE);
  shoot(api, boss, ICE);
  assert.equal(boss.frost, 2);
  husk.guard = "husk";
  shoot(api, husk, ICE);
  assert.equal(husk.frost ?? 0, 0);
  damp.guard = "damp";
  shoot(api, damp, { element: "shot", dmg: 1, chill: 1 });
  step(api, COMBO.frostDrain + 0.1);
  assert.equal(damp.frost, 1, "a plain fruit would have drained by now");
  step(api, COMBO.frostDrain);
  assert.equal(damp.frost, 0);
});

test("frost slows: 0.8 at one stack, 0.55 at two", () => {
  const { api, fruit } = lab(2);
  Object.assign(fruit[0], { frost: 1, frostT: 9 });
  Object.assign(fruit[1], { frost: 2, frostT: 9 });
  step(api);
  assert.ok(Math.abs(fruit[0].slow - COMBO.frostSlow[1]) < 0.01, `${fruit[0].slow}`);
  assert.ok(Math.abs(fruit[1].slow - COMBO.frostSlow[2]) < 0.01, `${fruit[1].slow}`);
});

test("Deep Freeze adds three; Black Ice: a fruit with three frost takes 15% more", () => {
  const { api, fruit } = lab(2);
  api.world.hud.fitted.freeze = ["deepfreeze", "blackice"];
  const [e, f] = fruit;
  shoot(api, e, ICE);
  assert.equal(e.frost, 3);
  const before = lost(e);
  shoot(api, e, { element: "shot", dmg: 10 });
  assert.ok(Math.abs(lost(e) - before - 10 * COMBO.blackIce) < 0.01);
  shoot(api, f, { element: "shot", dmg: 10 });
  assert.equal(lost(f), 10);
});

// ── Shatter ──────────────────────────────────────────────────────────────────

test("shatter: a splash on a 2-stack fruit does +50%, clears its frost and hits a neighbour for 25% (40% at 3)", () => {
  for (const stacks of [2, 3]) {
    const plain = lab(2);
    shoot(plain.api, plain.fruit[0], MORTAR);
    const base = lost(plain.fruit[0]);
    const splashOnly = lost(plain.fruit[1]);
    const { api, fruit } = lab(2);
    const [e, n] = fruit;
    // Three stacks is frozen solid (held), or the tick would drop it back to two.
    Object.assign(e, { frost: stacks, frostT: 9, freeze: stacks === 3 ? 5 : 0 });
    shoot(api, e, MORTAR);
    assert.ok(Math.abs(lost(e) - base * (1 + COMBO.shatterBonus)) < 0.01, `${stacks}: ${lost(e)} vs ${base}`);
    assert.equal(e.frost, 0);
    const shard = base * (1 + COMBO.shatterBonus) * COMBO.shardShare[stacks];
    assert.ok(Math.abs(lost(n) - splashOnly - shard) < 0.01, `${stacks}: shards ${lost(n) - splashOnly} vs ${shard}`);
    assert.equal(api.world.runLog.shatters, 1);
  }
});

test("no shatter from an aimed shot, or on a 1-stack fruit", () => {
  const { api, fruit } = lab(2, 200);
  const [e, f] = fruit;
  shoot(api, e, ICE);
  shoot(api, e, { element: "shot", dmg: 10 });
  assert.equal(e.frost, 2, "a melon shot just hits");
  Object.assign(f, { frost: 1, frostT: 9 });
  shoot(api, f, MORTAR);
  assert.equal(api.world.runLog.shatters, 0);
});

test("Shrapnel widens the shards", () => {
  const far = (wide: boolean) => {
    const { api, fruit } = lab(2, 60);
    if (wide) api.world.hud.fitted.freeze = ["shrapnel"];
    Object.assign(fruit[0], { frost: 2, frostT: 9 });
    shoot(api, fruit[0], { ...MORTAR, splash: 20 });
    return lost(fruit[1]);
  };
  assert.equal(far(false), 0, "60 px is out of reach");
  assert.ok(far(true) > 0, "with Shrapnel it isn't");
});

// ── Thermal shock ────────────────────────────────────────────────────────────

test("ice, then fire: fire on a frosted fruit bursts for +60% and thaws it; it doesn't bake a raw pumpkin", () => {
  const { api, fruit } = lab(2);
  const [e, raw] = fruit;
  shoot(api, e, ICE);
  const before = lost(e);
  shoot(api, e, { element: "fire", dmg: 20, fireLife: 0.01, fireBurn: 0 });
  assert.equal(e.frost, 0);
  assert.equal(e.freeze, 0);
  assert.ok(lost(e) - before >= 20 * (1 + COMBO.thermalBonus) - 0.5, `took ${lost(e) - before}`);
  assert.equal(api.world.runLog.thermals, 1);
  Object.assign(raw, { kind: "pumpkin", raw: true, frost: 2, frostT: 9 });
  shoot(api, raw, { element: "fire", dmg: 20, fireLife: 0.01, fireBurn: 0 });
  assert.equal(raw.bread, false, "the burst isn't burning");
});

test("fire, then ice: a Freeze hit on a burning fruit stops its burn for 1.5 s", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  api.world.pools.push({ x: e.x, y: e.y, r: 30, life: 99, max: 99, hot: true, burn: 30 });
  step(api, 0.2);
  shoot(api, e, ICE);
  assert.ok((e.doused ?? 0) > 1.4);
  const before = e.hp;
  step(api, 1.3);
  assert.equal(e.hp, before, "no burn while doused");
});

// ── Wildfire ─────────────────────────────────────────────────────────────────

test("wildfire: a burning, slowed fruit sets a neighbour alight; a frozen one doesn't", () => {
  const slowed = lab(2);
  Object.assign(slowed.fruit[0], { burnT: 5, burnDps: 20, frost: 1, frostT: 9 });
  step(slowed.api, 1.05);
  assert.ok((slowed.fruit[1].burnT ?? 0) > 0);
  assert.equal(slowed.api.world.runLog.wildfires, 1);
  const iced = lab(2);
  Object.assign(iced.fruit[0], { burnT: 5, burnDps: 20, freeze: 5 });
  step(iced.api, 1.05);
  assert.equal(iced.fruit[1].burnT ?? 0, 0);
});

test("wildfire: damp halves it, the Wildfire fitting doubles it", () => {
  const spreads = (setup: (a: ReturnType<typeof lab>) => void, s: number) => {
    const a = lab(2);
    Object.assign(a.fruit[0], { burnT: 9, burnDps: 20, frost: 1, frostT: 99 });
    setup(a);
    step(a.api, s);
    return (a.fruit[1].burnT ?? 0) > 0;
  };
  assert.equal(spreads(() => {}, 1.05), true);
  assert.equal(spreads((a) => (a.fruit[0].guard = "damp"), 1.05), false, "damp: not yet");
  assert.equal(spreads((a) => (a.fruit[0].guard = "damp"), 2.05), true, "damp: after two seconds");
  assert.equal(spreads((a) => (a.api.world.hud.fitted.fire = ["wildfire"]), 0.55), true, "the fitting: after half a second");
});

// ── Explosions ───────────────────────────────────────────────────────────────

test("explosions grow a puddle once, flare a fire patch, and sparks jump further to a frosted fruit", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  api.world.pools.push(
    { x: e.x + 10, y: e.y, r: 20, life: 99, max: 99, hot: false, burn: 0, toxic: 5 },
    { x: e.x - 10, y: e.y, r: 20, life: 99, max: 99, hot: true, burn: 20 },
  );
  shoot(api, e, MORTAR);
  shoot(api, e, MORTAR);
  assert.equal(api.world.pools.find((p) => p.toxic === 5)!.r, 20 * COMBO.puddleGrow, "once");
  assert.ok((api.world.pools.find((p) => p.hot)!.flare ?? 0) > 0);

  const spark = (frost: number) => {
    const a = lab(2, 150);
    a.api.world.hud.upgrades = [...a.api.world.hud.upgrades, "electric"];
    Object.assign(a.fruit[1], { frost, frostT: 99 });
    shoot(a.api, a.fruit[0], { element: "shot", dmg: 1, procs: true });
    return lost(a.fruit[1]);
  };
  assert.equal(spark(0), 0, "150 px is too far for a spark");
  assert.ok(spark(1) > 0, "to a frosted fruit it reaches");
});

// ── Achievements ─────────────────────────────────────────────────────────────

test("Cold Snap, Steam Engine and Brush Fire award on their counts, not before", () => {
  const ctx = (log: Partial<ReturnType<typeof emptyRunLog>>) => ({ log: { ...emptyRunLog(), ...log } }) as never;
  const passes = (id: string, c: never) => ACHIEVEMENT[id].check(c);
  assert.ok(passes("shatter", ctx({ shatters: 25 })));
  assert.ok(!passes("shatter", ctx({ shatters: 24 })));
  assert.ok(passes("thermal", ctx({ thermals: 15 })));
  assert.ok(!passes("thermal", ctx({ thermals: 14 })));
  assert.ok(passes("wildfire", ctx({ wildfires: 30 })));
  assert.ok(!passes("wildfire", ctx({ wildfires: 29 })));
});

test("with COMBO off, none of it happens", () => {
  COMBO.on = false;
  try {
    const { api, fruit } = lab(1);
    shoot(api, fruit[0], ICE);
    assert.equal(fruit[0].frost ?? 0, 0);
  } finally {
    COMBO.on = true;
  }
});
