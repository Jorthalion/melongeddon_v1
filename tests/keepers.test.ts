import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL,
  HEROES,
  KEEPER_START,
  SIGNATURE,
  backRoomPrice,
  createWorld,
  groupsFor,
  stepWorld,
  type HeroId,
  type TowerKind,
} from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

function start(hero: HeroId) {
  const api = createWorld(() => {});
  api.openSetup();
  api.pickKeeper(hero);
  api.chooseHero(hero);
  api.beginNight();
  return api;
}

/** Build `kind` at (4,3), beside the Stacks carpet, with plenty of seeds. */
function build(api: ReturnType<typeof createWorld>, kind: TowerKind, c = 4, r = 3) {
  api.world.hud.seeds = 5000;
  api.chooseBuild(kind);
  api.pointer(center(c), center(r), "down");
  api.dismissSelection();
  return api.world.towers.find((t) => t.kind === kind && t.c === c && t.r === r);
}

/** Step the wave, calling `watch` every frame; stops when it returns true or the wave ends. */
function runWave(api: ReturnType<typeof createWorld>, watch: () => boolean = () => false) {
  api.startWave();
  for (let i = 0; i < 60 * 120 && api.world.hud.phase === "combat"; i++) {
    stepWorld(api.world, 1 / 60);
    if (watch()) return true;
  }
  return false;
}

/** A free floor cell (not carpet, no tower), searching from the bottom-right. */
function freeCell(api: ReturnType<typeof createWorld>) {
  for (let c = 15; c >= 0; c--)
    for (let r = 9; r >= 0; r--)
      if (!api.world.pathCells.has(`${c},${r}`) && !api.world.towers.some((t) => t.c === c && t.r === r)) return { c, r };
  throw new Error("no free cell");
}

const saw = (api: ReturnType<typeof createWorld>, text: RegExp) => api.world.floaters.some((f) => text.test(f.text));

test("the new keepers start with their own seeds and stacks", () => {
  for (const hero of ["elf", "ooze", "scholar"] as const) {
    const { seeds, lives } = KEEPER_START[hero]!;
    const api = start(hero);
    assert.equal(api.world.hud.seeds, seeds, hero);
    assert.equal(api.world.hud.lives, lives, hero);
    assert.equal(api.world.hud.maxLives, lives, hero);
  }
});

test("every keeper has a Keeper tab with their own tower", () => {
  for (const hero of HEROES) {
    const tabs = groupsFor(hero);
    assert.equal(tabs.length, 4);
    assert.deepEqual(tabs[3].kinds, [SIGNATURE[hero]]);
    assert.equal(tabs[3].key, "r");
  }
});

test("a signature tower is the keeper's own, and only one at a time", () => {
  const api = start("mynxi");
  assert.ok(build(api, "catalogue"));
  const spot = freeCell(api);
  assert.equal(build(api, "catalogue", spot.c, spot.r), undefined, "second catalogue refused");
  api.chooseBuild("cauldron");
  assert.notEqual(api.world.hud.build, "cauldron", "another keeper's tower can't be chosen");
  api.world.towers = api.world.towers.filter((t) => t.kind !== "catalogue");
  assert.ok(build(api, "catalogue", spot.c, spot.r), "once it's gone, it can be built again");
});

test("Legal Elf: the back room costs 30% less", () => {
  assert.equal(backRoomPrice("elf", 0, null), Math.round(25 * 0.7));
  assert.equal(backRoomPrice("elf", 2, null), Math.round(55 * 0.7));
  assert.equal(backRoomPrice("vael", 2, null), 55);
});

test("Ooze Clues absorbs the first leak of each wave", () => {
  const lostBy = (hero: HeroId) => {
    const api = start(hero);
    const before = api.world.hud.lives;
    let absorbed = false;
    runWave(api, () => {
      absorbed ||= saw(api, /absorbed/);
      return false;
    });
    return { lost: before - api.world.hud.lives, absorbed };
  };
  const plain = lostBy("mynxi");
  const ooze = lostBy("ooze");
  assert.ok(plain.lost >= 2, "the empty board leaks");
  assert.equal(ooze.lost, plain.lost - 1);
  assert.ok(ooze.absorbed);
});

test("Dr. Samodovol sees four upgrade choices", () => {
  const api = start("scholar");
  build(api, "melon");
  build(api, "melon", 6, 3);
  runWave(api);
  assert.equal(api.world.hud.phase, "upgrade");
  assert.equal(api.world.hud.offer.length, 4);
});

test("Card Catalogue shots chain into more fruit", () => {
  const api = start("mynxi");
  build(api, "catalogue");
  assert.ok(runWave(api, () => api.world.shots.some((s) => s.bounces === 2)), "a catalogue shot carries two chains");
});

test("Bubbling Cauldron leaves a poison puddle", () => {
  const api = start("vael");
  build(api, "cauldron");
  assert.ok(runWave(api, () => api.world.pools.some((p) => (p.toxic ?? 0) > 0)));
});

test("Pumpkin Trebuchet knocks fruit back", () => {
  const api = start("michael");
  build(api, "trebuchet");
  assert.ok(runWave(api, () => api.world.rings.some((r) => r.color === "232,136,58")), "a knockback landed");
});

test("Scales of Justice takes a share of health and charges a fee on kills", () => {
  const api = start("elf");
  build(api, "scales");
  runWave(api, () => saw(api, /^fee/));
  assert.ok(saw(api, /^fee/) || api.world.hud.phase !== "combat");
});

test("Mimic Chest swallows a fruit whole", () => {
  const api = start("ooze");
  build(api, "mimic");
  assert.ok(runWave(api, () => saw(api, /gulp/)));
});

test("History Lectern boosts nearby cannons, more each wave", () => {
  const api = start("scholar");
  const melon = build(api, "melon")!;
  const plain = api.statsOf(melon.id)!.dmg;
  build(api, "lectern", 5, 3);
  const boosted = api.statsOf(melon.id)!.dmg;
  assert.ok(boosted > plain, "lectern boosts a neighbour");
  runWave(api);
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer[0].id);
  assert.ok(api.statsOf(melon.id)!.dmg >= boosted, "the boost does not shrink after a wave");
  const spot = freeCell(api);
  const far = build(api, "melon", spot.c, spot.r);
  if (far) assert.equal(api.statsOf(far.id)!.dmg, plain, "a cannon out of reach gets nothing");
});
