import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL,
  MAX_SLIPS,
  SLIPS,
  SLIP_VALUES,
  cleanSlips,
  createWorld,
  emptyProgress,
  slipXp,
  stepWorld,
  validateSetup,
  waveXp,
  type SlipId,
  type UpgradeId,
} from "../src/game/engine.ts";

type Api = ReturnType<typeof createWorld>;
const center = (c: number) => c * CELL + CELL / 2;

/** An Overflow run with these slips, on the Intro poster. */
function overflow(slips: SlipId[] = [], hero: "vael" | "mynxi" = "vael"): Api {
  const api = createWorld(() => {}, { keepers: emptyProgress(), setup: { night: "overflow", hero, door: "reject" } });
  api.openSetup();
  for (const id of slips) api.toggleSlip(id);
  api.chooseHero(hero);
  return api;
}

/** Place a plain cannon on the first open cell. */
function placeAny(api: Api) {
  api.world.hud.seeds = 5000;
  api.chooseBuild("melon");
  for (let r = 0; r < 12; r++)
    for (let c = 0; c < 20; c++) {
      const n = api.world.towers.length;
      api.pointer(center(c), center(r), "down");
      if (api.world.towers.length > n) return api.world.towers[api.world.towers.length - 1];
    }
  throw new Error("no open cell");
}

/** Clear waves (popping every fruit) until the board waits on `wave`; note what spawned in each. */
function playTo(api: Api, wave: number) {
  const seen: Array<Set<string>> = [];
  for (let guard = 0; guard < 40 && !(api.world.hud.phase === "prep" && api.world.hud.wave === wave); guard++) {
    const h = api.world.hud;
    if (h.phase === "upgrade") api.pickUpgrade(h.offer[0].id as UpgradeId);
    else if (h.phase === "memory") api.ackMemory();
    else if (h.phase === "prep" || h.phase === "consequence") {
      const kinds = new Set<string>();
      seen[h.wave] = kinds;
      api.startWave();
      for (let i = 0; i < 60 * 120 && api.world.hud.phase === "combat"; i++) {
        for (const e of api.world.enemies) {
          kinds.add(e.kind);
          e.hp = 0;
        }
        stepWorld(api.world, 1 / 60);
      }
    } else break;
  }
  assert.equal(api.world.hud.wave, wave, `reached wave ${wave}`);
  return seen;
}

test("five slips, each with a name, a cost and an XP bonus", () => {
  assert.equal(SLIPS.length, 5);
  for (const s of SLIPS) assert.ok(s.name && s.blurb && s.xp > 0, s.id);
  assert.equal(MAX_SLIPS, 3);
  assert.deepEqual(cleanSlips(["karl", "junk", "heavy", "heavy", "damp", "short"]), ["heavy", "damp", "short"]);
  assert.deepEqual(cleanSlips("nope"), []);
  assert.equal(slipXp(["heavy", "norefund"]), 0.25);
});

test("toggleSlip: Overflow setup only, three at most, and a second press drops it", () => {
  const api = createWorld(() => {}, { keepers: emptyProgress(), setup: { night: "overflow", hero: "vael" } });
  api.openSetup();
  api.toggleSlip("heavy");
  api.toggleSlip("damp");
  api.toggleSlip("short");
  api.toggleSlip("karl"); // fourth: refused
  assert.deepEqual(api.world.hud.slips, ["heavy", "damp", "short"]);
  assert.match(api.world.hud.log, /Three slips/);
  api.toggleSlip("damp");
  assert.deepEqual(api.world.hud.slips, ["heavy", "short"]);
  api.chooseNight("midnight");
  api.toggleSlip("karl");
  assert.equal(api.world.hud.slips.includes("karl"), false, "not on Midnight");
  api.chooseHero("vael");
  assert.deepEqual(api.world.hud.slips, [], "a Midnight run carries no slips");
});

test("the setup screen no longer asks how the first night ended", () => {
  const r = validateSetup({ night: "overflow", slips: ["karl", "bogus"] as SlipId[] }, { maps: [], unlocked: [] });
  assert.equal(r.needsDoor, false);
  assert.deepEqual(r.setup.slips, ["karl"]);
  const api = overflow();
  assert.equal(api.world.hud.phase, "poster");
});

test("slips raise the keeper XP for each wave", () => {
  const plain = overflow();
  plain.beginNight();
  playTo(plain, 2);
  const slipped = overflow(["heavy", "damp"]);
  slipped.beginNight();
  playTo(slipped, 2);
  assert.equal(plain.world.hud.xpRun, waveXp("normal"));
  assert.equal(slipped.world.hud.xpRun, Math.round(waveXp("normal") * 1.4));
});

test("Short Shelf starts with four fewer stacks", () => {
  const plain = overflow();
  const short = overflow(["short"]);
  assert.equal(short.world.hud.lives, plain.world.hud.lives - SLIP_VALUES.shortStacks);
  assert.equal(short.world.hud.maxLives, plain.world.hud.maxLives - SLIP_VALUES.shortStacks);
});

test("No Refunds: selling gives nothing back", () => {
  for (const [slips, refunds] of [
    [[], true],
    [["norefund"], false],
  ] as const) {
    const api = overflow([...slips]);
    api.beginNight();
    const t = placeAny(api);
    api.dismissSelection();
    api.pointer(t.x, t.y, "down");
    const before = api.world.hud.seeds;
    api.sellSelected();
    assert.equal(api.world.hud.seeds > before, refunds);
  }
});

test("Heavy Returns opens the chute on wave 3", () => {
  const plain = overflow();
  plain.beginNight();
  playTo(plain, 3);
  assert.equal(plain.world.hud.chuteWave, false);
  const heavy = overflow(["heavy"]);
  heavy.beginNight();
  playTo(heavy, 3);
  assert.equal(heavy.world.hud.chuteWave, true);
  const plainSize = (plain.startWave(), plain.world.hud.waveSize);
  const heavySize = (heavy.startWave(), heavy.world.hud.waveSize);
  assert.equal(heavySize, plainSize + SLIP_VALUES.heavyCount);
});

test("Karl Is Early sends a Karl on wave 8", () => {
  const plain = playTo((() => { const a = overflow(); a.beginNight(); return a; })(), 9);
  const early = playTo((() => { const a = overflow(["karl"]); a.beginNight(); return a; })(), 9);
  assert.equal(plain[8]?.has("karl"), false);
  assert.equal(early[8]?.has("karl"), true);
});

test("Damp Powder: hits do 20% less damage", () => {
  const firstHit = (slips: SlipId[]) => {
    const api = overflow(slips);
    api.beginNight();
    placeAny(api);
    api.dismissSelection();
    api.startWave();
    for (let i = 0; i < 60 * 60; i++) {
      stepWorld(api.world, 1 / 60);
      const hit = api.world.enemies.find((e) => e.hp < e.maxHp && e.hp > 0);
      if (hit) return hit.maxHp - hit.hp;
    }
    throw new Error("no hit");
  };
  const ratio = firstHit(["damp"]) / firstHit([]);
  assert.ok(Math.abs(ratio - SLIP_VALUES.dampDamage) < 0.02, `ratio ${ratio}`);
});
