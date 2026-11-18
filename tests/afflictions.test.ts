import { test } from "node:test";
import assert from "node:assert/strict";
import { AFFLICT, CANNON, COMBO } from "../src/game/engine.ts";
import { ACHIEVEMENT, emptyRunLog } from "../src/game/achievements.ts";
import { ICE, MORTAR, lab, lost, shoot, step, type Api } from "./comboLab.ts";

const FLY = { element: "fly" as const, dmg: 1 };
const SEED = { element: "seed" as const, dmg: 1 };
/** Damage `e` takes over `s` seconds (from what's on it already). */
const over = (api: Api, e: { hp: number }, s: number) => {
  const hp = e.hp;
  step(api, s);
  return hp - e.hp;
};

// ── Stacking ─────────────────────────────────────────────────────────────────

test("stacking: different afflictions add up; the same one adds a stack and refreshes; the cap holds", () => {
  const { api, fruit } = lab(3, 200);
  const [e, both, capped] = fruit;
  Object.assign(e, { sting: 2, stingT: 9 });
  assert.ok(Math.abs(over(api, e, 1) - 2 * AFFLICT.stingDps) < 0.5);
  Object.assign(both, { sting: 2, stingT: 9, poison: 1, poisonT: 9, poisonDps: 6 });
  assert.ok(Math.abs(over(api, both, 1) - (2 * AFFLICT.stingDps + 6)) < 0.5, "stings and poison together");
  // The same affliction: a stack more, and the timer back to full.
  Object.assign(e, { sting: 2, stingT: 0.5 });
  shoot(api, e, FLY);
  assert.equal(e.sting, 3);
  assert.ok((e.stingT ?? 0) > AFFLICT.stingTime - 0.1);
  for (let i = 0; i < 9; i++) shoot(api, e, FLY);
  assert.equal(e.sting, AFFLICT.stingMax, "up to its max");
  Object.assign(capped, { sting: 5, stingT: 9, poison: 3, poisonT: 9, poisonDps: 30, burnT: 9, burnDps: 100 });
  assert.ok(over(api, capped, 1) <= AFFLICT.cap + 1);
});

test("Ink and Honey multiply the ticks; damage goes to the tower of the newest stack", () => {
  const { api, fruit } = lab(2, 200);
  const [plain, inked] = fruit;
  Object.assign(plain, { sting: 2, stingT: 9 });
  Object.assign(inked, { sting: 2, stingT: 9, ink: 9, inkMul: 1.5 });
  const a = over(api, plain, 1);
  const b = over(api, inked, 1);
  assert.ok(Math.abs(b - a * 1.5) < 0.5, `${a} vs ${b}`);
  // Credit: a melon tower's id on the stack.
  const tower = api.world.towers[0];
  if (tower) {
    plain.stingBy = tower.id;
    const before = api.tallyOf(tower.id)?.dmg ?? 0;
    step(api, 0.5);
    assert.ok((api.tallyOf(tower.id)?.dmg ?? 0) > before);
  }
});

test("a Cauldron puddle alone: three stacks are today's puddle damage", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  api.world.pools.push({ x: e.x, y: e.y, r: 30, life: 99, max: 99, hot: false, burn: 0, toxic: CANNON.cauldronDps });
  step(api, 2.5);
  assert.equal(e.poison, AFFLICT.poisonMax);
  const now = over(api, e, 1);
  assert.ok(Math.abs(now - CANNON.cauldronDps) < 0.5, `${now} a second, today's puddle is ${CANNON.cauldronDps}`);
});

test("a Bookworm alone does the same as before", () => {
  const run = (on: boolean) => {
    COMBO.on = on;
    try {
      const { api, fruit } = lab(1);
      const [e] = fruit;
      e.kind = "pumpkin";
      shoot(api, e, { element: "worm", dmg: 1, wormDps: 26 } as never);
      return over(api, e, 3);
    } finally {
      COMBO.on = true;
    }
  };
  assert.ok(Math.abs(run(true) - run(false)) < 0.01);
});

// ── Combos ───────────────────────────────────────────────────────────────────

test("driven in: a seed on a stung fruit adds a stack; not on an unstung one or a rind; Grit adds two", () => {
  const { api, fruit } = lab(4, 200);
  const [stung, clean, shelled, gritty] = fruit;
  shoot(api, stung, FLY);
  shoot(api, stung, SEED);
  assert.equal(stung.sting, 2);
  shoot(api, clean, SEED);
  assert.equal(clean.sting ?? 0, 0);
  Object.assign(shelled, { guard: "rind", shell: 1, sting: 1, stingT: 9 });
  shoot(api, shelled, SEED);
  assert.equal(shelled.sting, 1, "it pinged off");
  // Grit is on the Spitter that fired the seed.
  api.world.towers.push({ id: 7777, c: 0, r: 0, x: 0, y: 0, cd: 99, aim: 0, orange: false, kind: "spitter", mods: ["grit"], paid: 0 } as never);
  shoot(api, gritty, FLY);
  shoot(api, gritty, { ...SEED, owner: 7777 });
  assert.equal(gritty.sting, 1 + AFFLICT.gritStacks);
});

test("sticky stings: a honeyed fruit gets two stacks a fly; a shell blocks stings until it cracks", () => {
  const { api, fruit } = lab(2, 200);
  const [sticky, shelled] = fruit;
  sticky.honeyed = 9;
  shoot(api, sticky, FLY);
  assert.equal(sticky.sting, 2);
  Object.assign(shelled, { guard: "rind", shell: 1 });
  shoot(api, shelled, FLY);
  assert.equal(shelled.sting ?? 0, 0, "the fly cracked the shell");
  shoot(api, shelled, FLY);
  assert.equal(shelled.sting, 1);
});

test("flammable: fire on a poisoned fruit burns ×1.5, and the poison is spent when the fire goes out", () => {
  const plain = lab(1);
  plain.api.world.pools.push({ x: plain.fruit[0].x, y: plain.fruit[0].y, r: 30, life: 1, max: 1, hot: true, burn: 20 });
  const dry = over(plain.api, plain.fruit[0], 0.5);
  const { api, fruit } = lab(1);
  const [e] = fruit;
  Object.assign(e, { poison: 3, poisonT: 9, poisonDps: 0.0001 });
  api.world.pools.push({ x: e.x, y: e.y, r: 30, life: 1, max: 1, hot: true, burn: 20 });
  const wet = over(api, e, 0.5);
  assert.ok(Math.abs(wet - dry * AFFLICT.flammable) < 0.5, `${wet} vs ${dry}`);
  assert.equal(e.poison, 3, "still poisoned while it burns");
  step(api, 0.7);
  assert.equal(e.poison, 0, "spent when the fire went out");
});

test("worms follow stingers: a Bookworm burrows into a melon with 3 stings, not 2", () => {
  const { api, fruit } = lab(2, 200);
  const [three, two] = fruit;
  Object.assign(three, { sting: 3, stingT: 9 });
  Object.assign(two, { sting: 2, stingT: 9 });
  shoot(api, three, { element: "worm", dmg: 1, wormDps: 26 } as never);
  shoot(api, two, { element: "worm", dmg: 1, wormDps: 26 } as never);
  assert.ok((three.worm ?? 0) > 0);
  assert.equal(two.worm ?? 0, 0);
});

test("contagion: dying with 3 stacks spreads one of each to a fruit within a tile, not further; worms don't spread", () => {
  const { api, fruit } = lab(3, 40);
  const [e, near] = fruit;
  const far = fruit[2];
  far.x = e.x + 200;
  Object.assign(e, { sting: 3, stingT: 9, poison: 1, poisonT: 9, poisonDps: 6, worm: 9, wormDps: 1, hp: 1 });
  shoot(api, e, { element: "shot", dmg: 50 });
  assert.equal(near.sting, 1);
  assert.equal(near.poison, 1);
  assert.equal(near.worm ?? 0, 0);
  assert.equal(far.sting ?? 0, 0);
  assert.equal(api.world.runLog.contagion, 2);
});

test("a shatter spends the stings and poison on a frozen fruit at once", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  shoot(api, e, ICE);
  Object.assign(e, { sting: 2, stingT: 2, poison: 1, poisonT: 2, poisonDps: 6 });
  const left = 2 * AFFLICT.stingDps * 2 + 6 * 2;
  const before = lost(e);
  shoot(api, e, MORTAR);
  assert.equal(e.sting, 0);
  assert.equal(e.poison, 0);
  assert.ok(lost(e) - before >= left, `took ${lost(e) - before}, the afflictions alone were worth ${left}`);
});

test("armour: husks and pits take stings in full; damp takes poison in full", () => {
  const { api, fruit } = lab(4, 200);
  const [plain, husk, pit, damp] = fruit;
  for (const e of [plain, husk, pit]) Object.assign(e, { sting: 2, stingT: 9 });
  husk.guard = "husk";
  pit.pit = true;
  Object.assign(damp, { guard: "damp", poison: 1, poisonT: 9, poisonDps: 6 });
  step(api, 1);
  assert.ok(Math.abs(lost(husk) - lost(plain)) < 0.01);
  assert.ok(Math.abs(lost(pit) - lost(plain)) < 0.01);
  assert.ok(Math.abs(lost(damp) - 6) < 0.5);
});

// ── Achievements ─────────────────────────────────────────────────────────────

test("Hornet's Nest, House Special and Outbreak award on their condition, not before", () => {
  const ctx = (log: Partial<ReturnType<typeof emptyRunLog>>) => ({ log: { ...emptyRunLog(), ...log } }) as never;
  const passes = (id: string, c: never) => ACHIEVEMENT[id].check(c);
  assert.ok(passes("stung", ctx({ maxStung: 5 })));
  assert.ok(!passes("stung", ctx({ maxStung: 4 })));
  assert.ok(passes("cocktail", ctx({ maxAfflictions: 4 })));
  assert.ok(!passes("cocktail", ctx({ maxAfflictions: 3 })));
  assert.ok(passes("contagion", ctx({ contagion: 50 })));
  assert.ok(!passes("contagion", ctx({ contagion: 49 })));
});

test("one fruit carrying four afflictions is counted", () => {
  const { api, fruit } = lab(1);
  const [e] = fruit;
  Object.assign(e, { sting: 1, stingT: 9, poison: 1, poisonT: 9, poisonDps: 1, burnT: 9, burnDps: 1, worm: 9, wormDps: 1, frost: 1, frostT: 9 });
  step(api);
  assert.equal(api.world.runLog.maxAfflictions, 5);
  assert.ok(api.world.hud.comboTips.includes("mixed"), "the tip shows");
});
