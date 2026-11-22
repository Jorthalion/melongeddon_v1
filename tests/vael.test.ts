import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CELL, DROWSY, ROOMS, VAEL_VALUES, createWorld, emptyProgress, stepWorld, type TowerKind } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function start(hero: "vael" | "mynxi" = "vael") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map: "stacks", hero } });
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 99999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Build `kind` on the next open floor tile beside the carpet; the tower, or undefined if it wasn't allowed. */
function build(api: Api, kind: TowerKind) {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      api.dismissSelection();
      return w.towers.length > before ? w.towers[w.towers.length - 1] : undefined;
    }
}

/** Buy every back-room upgrade for `kind` (between waves). */
function fitAll(api: Api, kind: TowerKind, leave = 0) {
  api.openShop(kind);
  const mods = api.world.hud.workshop === kind ? (["haste", "reach", "ripe"] as const) : [];
  let left = leave;
  for (const id of mods) {
    if (left-- > 0) continue;
    api.pickMod(id);
  }
  api.closeShop();
}

/** One fruit from wave 1, held still with plenty of health, placed on tile (c, r). */
function fruitAt(api: Api, c: number, r: number): Fruit {
  const w = api.world;
  if (w.hud.phase !== "combat") api.startWave();
  for (let i = 0; i < 60 * 30 && w.enemies.length === 0; i++) stepWorld(w, 1 / 60);
  const e = w.enemies.pop()!;
  Object.assign(e, { x: center(c), y: center(r), hp: 99999, maxHp: 99999, speed: 0, guard: "none", shell: 0, boss: false, freeze: 0, chill: 0, drowsy: 0, dozeHits: 0, restT: 0 });
  return e;
}

test("the ladder: fully upgraded towers open Unstoppered at 2, the Underlings at 4 and the Spire at 6, for the night", () => {
  const api = start();
  const w = api.world;
  assert.ok(build(api, "cauldron"), "the Cauldron is open from the start");
  assert.equal(build(api, "flask"), undefined, "Unstoppered starts locked");
  assert.match(w.hud.log, /opens with 2 fully upgraded towers \(0 now\)/);

  // The Reader has one back-room upgrade: buy it and every Reader counts.
  fitAll(api, "reader");
  build(api, "reader");
  assert.equal(w.hud.vaelOpen, 0);
  build(api, "reader");
  assert.equal(w.hud.fullyUpgraded, 2);
  assert.equal(w.hud.vaelOpen, 1, "two fully upgraded: Unstoppered opens");
  assert.match(w.hud.log, /Unstoppered\. Approved/);
  assert.ok(build(api, "flask"));

  // A Melon with one of its three upgrades missing doesn't count.
  fitAll(api, "melon", 1);
  build(api, "melon");
  build(api, "melon");
  assert.equal(w.hud.fullyUpgraded, 2);

  build(api, "reader");
  build(api, "reader");
  assert.equal(w.hud.vaelOpen, 2, "four: the Underlings");
  assert.ok(build(api, "underlings"));
  build(api, "reader");
  build(api, "reader");
  assert.equal(w.hud.vaelOpen, 3, "six: the Nexus Spire");
  assert.ok(build(api, "spire"));

  // Selling towers after doesn't lock anything again.
  for (const t of w.towers.filter((x) => x.kind === "reader")) {
    api.pointer(t.x, t.y, "down");
    api.sellSelected();
  }
  assert.equal(w.hud.fullyUpgraded, 0);
  assert.equal(w.hud.vaelOpen, 3);

  // The next night starts locked.
  api.restartNight();
  api.beginNight();
  assert.equal(w.hud.vaelOpen, 0);
});

test("another keeper is never held back by her ladder", () => {
  const api = start("mynxi");
  assert.equal(api.world.hud.vaelOpen, 0);
  assert.ok(build(api, "catalogue"));
});

test("Unstoppered is not a Great Hall reward any more", () => {
  const hall = ROOMS.find((r) => r.id === "greathall")!;
  assert.ok(!hall.rewards.some((w) => w.kind === "tower" && w.id === "flask"));
});

test("Nightmare: the Cauldron's potion on a sleeping, poisoned fruit sets its poison off at 1.5x, once, and it stays asleep", () => {
  const api = start();
  const w = api.world;
  const pot = build(api, "cauldron")!;
  const e = fruitAt(api, pot.c, pot.r + (w.pathCells.has(`${pot.c},${pot.r + 1}`) ? 1 : -1));
  w.enemies = [e];
  Object.assign(e, { freeze: 30, stunBy: "sleep", poison: 3, poisonDps: 10, poisonT: 3 });
  const before = e.hp;
  for (let i = 0; i < 60 * 4 && !e.nightmared; i++) stepWorld(w, 1 / 60);
  assert.equal(e.nightmared, true);
  assert.ok(before - e.hp >= 3 * 10 * 2 * VAEL_VALUES.nightmareMul, `took ${before - e.hp}`);
  assert.ok(e.freeze > 0 && e.stunBy === "sleep", "still asleep");
  // Once per sleep: a second potion on the same sleep does nothing extra.
  Object.assign(e, { poison: 3, poisonDps: 10, poisonT: 3 });
  const mid = e.hp;
  for (let i = 0; i < 60 * 4; i++) stepWorld(w, 1 / 60);
  assert.ok(mid - e.hp < 3 * 10 * 3 * VAEL_VALUES.nightmareMul, "no second Nightmare in the same sleep");
});

test("Fumes and Deep sleep: a drowsy fruit in her puddle nods off from the fumes, and sleeps half again as long", () => {
  const nap = (withFlask: boolean) => {
    const api = start();
    const w = api.world;
    if (withFlask) {
      w.hud.vaelOpen = 3;
      build(api, "flask");
      // Keep it from dripping on its own: only our puddle matters here.
      for (const t of w.towers) t.cd = 1e9;
    }
    const e = fruitAt(api, 0, 5);
    w.enemies = [e];
    Object.assign(e, { drowsy: 99, dozeHits: 1 });
    w.pools.push({ x: e.x, y: e.y, r: 40, life: 99, max: 99, hot: false, burn: 0, vael: true } as never);
    let longest = 0;
    for (let i = 0; i < 60 * 4; i++) {
      stepWorld(w, 1 / 60);
      if (e.stunBy === "sleep") longest = Math.max(longest, e.freeze);
    }
    return longest;
  };
  const deep = nap(true);
  assert.ok(deep >= DROWSY.sleep * VAEL_VALUES.deepSleep - 0.05, `slept ${deep}`);
  assert.equal(nap(false), 0, "no Unstoppered on the board: no fumes, so it never nods off");
});

test("the Underlings throw at the drowsiest fruit, and a sleeping fruit they hit has a report filed on it", () => {
  const api = start();
  const w = api.world;
  w.hud.vaelOpen = 3;
  const desk = build(api, "underlings")!;
  const near = (dc: number) => ({ c: desk.c + dc, r: desk.r });
  const a = fruitAt(api, near(1).c, near(1).r);
  const b = fruitAt(api, near(-1).c, near(-1).r);
  w.enemies = [a, b];
  Object.assign(a, { drowsy: 9, dozeHits: 0, wp: 5 });
  Object.assign(b, { drowsy: 9, dozeHits: 2, wp: 1, freeze: 30, stunBy: "sleep" });
  desk.cd = 0;
  let aimed: number | null = null;
  for (let i = 0; i < 30 && aimed == null; i++) {
    stepWorld(w, 1 / 60);
    aimed = w.shots.find((s) => s.element === "vial")?.target ?? null;
  }
  assert.equal(aimed, b.id, "the one with the most doze hits, though it's further back");
  for (let i = 0; i < 60 * 2 && !(b.reportT ?? 0); i++) stepWorld(w, 1 / 60);
  assert.ok((b.reportT ?? 0) > VAEL_VALUES.reportTime - 1, "report filed");
});

test("Lights Out puts every drowsy fruit to sleep at once (bosses for less) and skips the resting, husks and the wide awake", () => {
  const api = start();
  const w = api.world;
  w.hud.vaelOpen = 3;
  const spire = build(api, "spire")!;
  const [drowsy, resting, husk, boss, awake] = [0, 1, 2, 3, 4].map((i) => fruitAt(api, i, 5));
  w.enemies = [drowsy, resting, husk, boss, awake];
  for (const e of [drowsy, resting, husk, boss]) e.drowsy = 9;
  resting.restT = 5;
  husk.guard = "husk";
  boss.boss = true;
  spire.armed = true;
  spire.cd = 0;
  stepWorld(w, 1 / 60);
  assert.equal(drowsy.stunBy, "sleep");
  assert.ok(Math.abs(drowsy.freeze - DROWSY.sleep) < 0.05);
  assert.equal(boss.stunBy, "sleep");
  assert.ok(Math.abs(boss.freeze - DROWSY.sleepBoss) < 0.05);
  for (const e of [resting, husk, awake]) assert.notEqual(e.stunBy, "sleep");
  assert.ok((w.lightsOut ?? 0) > 0, "the board dims");
  assert.ok(Math.abs(spire.cd - VAEL_VALUES.lightsOutEvery) < 0.05, "next one in 15 s");
});

test("the Shush Bell stops a drowsy fruit no longer than a wide-awake one: only her own towers cash in on sleep", () => {
  const api = start();
  const w = api.world;
  const bell = build(api, "bell")!;
  assert.ok(bell, "bell built");
  const a = fruitAt(api, bell.c + 1, bell.r);
  const b = fruitAt(api, bell.c - 1, bell.r);
  w.enemies = [a, b];
  Object.assign(a, { drowsy: 9, dozeHits: 1 });
  bell.cd = 0;
  for (let i = 0; i < 60 && !(a.stunBy === "bell" && b.stunBy === "bell"); i++) stepWorld(w, 1 / 60);
  assert.equal(a.stunBy, "bell");
  assert.equal(b.stunBy, "bell");
  assert.ok(Math.abs(a.freeze - b.freeze) < 1e-9, `drowsy ${a.freeze} vs awake ${b.freeze}`);
  assert.ok("stun" in DROWSY === false, "no drowsy stun bonus left");
});
