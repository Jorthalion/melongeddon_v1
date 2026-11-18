import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, createWorld, emptyProgress, stepWorld } from "../src/game/engine.ts";
import { STATUS_LOOK, statusLook } from "../src/game/drawStatus.ts";

type Api = ReturnType<typeof createWorld>;
type Enemy = Api["world"]["enemies"][number];

function night() {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), allTricks: true, setup: { night: "midnight", map: "stacks", hero: "mynxi" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 999;
  return api;
}

/** A fresh fruit off the first wave, with nothing on it, plus the changes asked for. */
function fruit(api: Api, extra: Partial<Enemy> = {}): Enemy {
  const w = api.world;
  if (!w.enemies.length) {
    api.startWave();
    for (let i = 0; i < 600 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  }
  const proto = w.enemies[0];
  return {
    ...proto,
    id: 900000 + Math.floor(Math.random() * 1000),
    hp: 100,
    maxHp: 100,
    chill: 0,
    freeze: 0,
    frost: 0,
    iced: 0,
    stomped: 0,
    halt: 0,
    driven: 0,
    panic: 0,
    ink: 0,
    honeyed: 0,
    worm: 0,
    sting: 0,
    poison: 0,
    burnT: 0,
    stunBy: undefined,
    mittened: false,
    rallied: 0,
    healT: 0,
    charred: 0,
    ...extra,
  };
}

test("the body look follows the priority: frozen, burning, frost, poison, ink, honey", () => {
  const api = night();
  const w = api.world;
  const all = { iced: 1, freeze: 1, burnT: 2, frost: 2, poison: 2, ink: 3, honeyed: 3 };
  assert.equal(statusLook(fruit(api, all), w).body, "ice");
  assert.equal(statusLook(fruit(api, { ...all, iced: 0, freeze: 0, frost: 0 }), w).body, "burn");
  assert.equal(statusLook(fruit(api, { frost: 1, poison: 2, ink: 3 }), w).body, "frost");
  assert.equal(statusLook(fruit(api, { poison: 2, ink: 3, honeyed: 3 }), w).body, "poison");
  assert.equal(statusLook(fruit(api, { ink: 3, honeyed: 3 }), w).body, "ink");
  assert.equal(statusLook(fruit(api, { honeyed: 3 }), w).body, "honey");
  // Stings only: no body look, but the stingers show, one per stack.
  const stung = statusLook(fruit(api, { sting: 3 }), w);
  assert.equal(stung.body, null);
  assert.equal(stung.extras.stingers, 3);
  // A plain fruit shows nothing.
  const plain = statusLook(fruit(api), w);
  assert.equal(plain.body, null);
  assert.equal(plain.pips.length, 0);
  assert.equal(plain.particles.length, 0);
  assert.equal(plain.ground, null);
});

test("pips: one per timed or stacking effect, with its shape and count, four at most, most important first", () => {
  const api = night();
  const w = api.world;
  const each: Array<[Partial<Enemy>, string, string, number]> = [
    [{ frost: 2 }, "frost", "snowflake", 2],
    [{ freeze: 1, stunBy: "bell" }, "stun", "star", 1],
    [{ burnT: 2 }, "fire", "flame", 1],
    [{ poison: 3 }, "poison", "drop", 3],
    [{ sting: 4 }, "sting", "stinger", 4],
    [{ worm: 2 }, "worm", "worm", 1],
    [{ ink: 2 }, "ink", "blot", 1],
    [{ honeyed: 2 }, "honey", "honeycomb", 1],
  ];
  for (const [fx, id, shape, n] of each) {
    const pips = statusLook(fruit(api, fx), w).pips;
    assert.equal(pips.length, 1, id);
    assert.deepEqual([pips[0].id, pips[0].shape, pips[0].n], [id, shape, n]);
  }
  const lots = statusLook(fruit(api, { frost: 2, sting: 3, poison: 2, burnT: 1, worm: 1, ink: 1, honeyed: 1 }), w).pips;
  assert.equal(lots.length, STATUS_LOOK.maxPips);
  assert.deepEqual(
    lots.map((p) => p.id),
    ["frost", "fire", "poison", "sting"],
  );
  // Frozen solid counts as a full frost meter.
  assert.equal(statusLook(fruit(api, { iced: 1, freeze: 1 }), w).pips[0].n, 3);
});

test("frozen fruit show cracks only in the last 0.6 s of the freeze", () => {
  const api = night();
  const w = api.world;
  assert.equal(statusLook(fruit(api, { iced: 1.2, freeze: 1.2 }), w).extras.cracks, false);
  assert.equal(statusLook(fruit(api, { iced: STATUS_LOOK.crackAt + 0.05, freeze: STATUS_LOOK.crackAt + 0.05 }), w).extras.cracks, false);
  assert.equal(statusLook(fruit(api, { iced: 0.5, freeze: 0.5 }), w).extras.cracks, true);
  assert.equal(statusLook(fruit(api, { iced: 0.1, freeze: 0.1 }), w).extras.cracks, true);
  // A Bell stun isn't ice: no block, no cracks, stars instead.
  const shushed = statusLook(fruit(api, { freeze: 0.3, stunBy: "bell" }), w);
  assert.notEqual(shushed.body, "ice");
  assert.equal(shushed.extras.cracks, false);
  assert.ok(shushed.particles.some((p) => p.kind === "stunstar"));
  assert.ok(statusLook(fruit(api, { freeze: 0.3, stunBy: "organ" }), w).particles.some((p) => p.kind === "note"));
});

test("walked-back fruit (driven, panicking, scattering) face backwards; a plain walker doesn't", () => {
  const api = night();
  const w = api.world;
  assert.equal(statusLook(fruit(api), w).motion.faceBack, false);
  assert.equal(statusLook(fruit(api, { driven: 1 }), w).motion.faceBack, true);
  assert.equal(statusLook(fruit(api, { panic: 20 }), w).motion.faceBack, true);
});

test("reduce motion: no animated motion, but the still looks stay", () => {
  const api = night();
  const w = api.world;
  w.reduced = true;
  const stunned = statusLook(fruit(api, { freeze: 0.5, stunBy: "bell", hp: 10 }), w);
  assert.equal(stunned.motion.rock, 0);
  assert.equal(stunned.motion.wobble, 0);
  assert.equal(stunned.motion.shiver, 0);
  assert.equal(stunned.motion.bob, 0);
  assert.equal(stunned.motion.animated, false);
  assert.equal(stunned.pips[0].id, "stun");
  const frozen = statusLook(fruit(api, { iced: 0.4, freeze: 0.4 }), w);
  assert.equal(frozen.body, "ice");
  assert.equal(frozen.extras.cracks, true);
  assert.equal(frozen.motion.shiver, 0);
  assert.equal(statusLook(fruit(api, { driven: 1 }), w).motion.faceBack, true);
  // With motion on, the same fruit rock and shiver.
  w.reduced = false;
  assert.ok(statusLook(fruit(api, { freeze: 0.5, stunBy: "bell" }), w).motion.rock > 0);
  assert.equal(statusLook(fruit(api, { iced: 0.4, freeze: 0.4 }), w).motion.shiver, 1);
});

test("particles stay under the cap, and halve on a phone", () => {
  const api = night();
  const w = api.world;
  const busy = fruit(api, { burnT: 2, poison: 5, sting: 5, ink: 2, worm: 2, driven: 1, healT: 0.3, hp: 10 });
  const count = (small: boolean) => statusLook(busy, w, { small }).particles.reduce((n, p) => n + p.n, 0);
  assert.equal(count(false), STATUS_LOOK.maxParticles);
  assert.ok(count(true) <= STATUS_LOOK.maxParticles / 2, `${count(true)}`);
});

test("trails: a burning, poisoned or honeyed fruit leaves marks as it walks, at most the cap, cleared with the wave", () => {
  for (const fx of [{ burnT: 99, burnDps: 0 }, { poison: 1, poisonT: 99, poisonDps: 0 }, { honeyed: 99 }] as Array<Partial<Enemy>>) {
    const api = night();
    const w = api.world;
    const e = fruit(api, { ...fx, hp: 1e9, maxHp: 1e9 });
    w.enemies = [e];
    for (let i = 0; i < 60; i++) stepWorld(w, 1 / 60);
    assert.ok(w.marks.length > 0, JSON.stringify(fx));
    const kind = w.marks[0].kind;
    assert.ok(["scorch", "drip", "print"].includes(kind), kind);
  }
  // Capped: a crowd of burning fruit never leaves more than the cap.
  const api = night();
  const w = api.world;
  w.enemies = Array.from({ length: 40 }, (_, k) => fruit(api, { id: 700000 + k, burnT: 99, burnDps: 0, hp: 1e9, maxHp: 1e9 }));
  for (let i = 0; i < 120; i++) {
    stepWorld(w, 1 / 60);
    assert.ok(w.marks.length <= STATUS_LOOK.maxMarks);
  }
  assert.equal(w.marks.length, STATUS_LOOK.maxMarks);
  // Cleared with the wave: end this one, then start the next.
  for (let i = 0; i < 20000 && w.hud.phase === "combat"; i++) {
    w.enemies = [];
    stepWorld(w, 1 / 30);
  }
  assert.notEqual(w.hud.phase, "combat");
  if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id as never);
  assert.equal(w.hud.phase, "prep");
  w.marks.push({ x: 0, y: 0, kind: "scorch", life: 99, max: 99, rot: 0, seed: 0 });
  api.startWave();
  assert.equal(w.marks.length, 0);
});

test("a plain walker leaves no trail", () => {
  const api = night();
  const w = api.world;
  w.enemies = [fruit(api, { hp: 1e9, maxHp: 1e9 })];
  for (let i = 0; i < 60; i++) stepWorld(w, 1 / 60);
  assert.equal(w.marks.length, 0);
});
