import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL,
  HEROES,
  KEEPER_START,
  MAX_LEVEL,
  PERKS,
  PERK_LEVELS,
  SIGNATURE,
  createWorld,
  emptyProgress,
  levelFor,
  levelProgress,
  maxedProgress,
  normalizeRecord,
  perkFx,
  stepWorld,
  waveXp,
  winXp,
  xpForLevel,
  type HeroId,
  type KeeperProgress,
} from "../src/game/engine.ts";

const center = (c: number) => c * CELL + CELL / 2;

function start(hero: HeroId, keepers?: KeeperProgress) {
  const api = createWorld(() => {}, keepers ? { keepers } : {});
  api.openSetup();
  api.pickKeeper(hero);
  api.chooseHero(hero);
  api.beginNight();
  return api;
}

/** One keeper at `level`, picking `pick` on every open tier. */
function at(hero: HeroId, level: number, pick: 0 | 1 = 0): KeeperProgress {
  const p = emptyProgress();
  p[hero] = normalizeRecord({ xp: xpForLevel(level), picks: PERK_LEVELS.map(() => pick) });
  return p;
}

function build(api: ReturnType<typeof createWorld>, kind: Parameters<ReturnType<typeof createWorld>["chooseBuild"]>[0], c: number, r: number) {
  api.world.hud.seeds = 5000;
  api.chooseBuild(kind);
  api.pointer(center(c), center(r), "down");
  api.dismissSelection();
  return api.world.towers.find((t) => t.kind === kind && t.c === c && t.r === r);
}

test("levels run 1 to 10 and each costs a little more than the last", () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(xpForLevel(2) - 1), 1);
  assert.equal(levelFor(xpForLevel(2)), 2);
  assert.equal(levelFor(xpForLevel(MAX_LEVEL) + 99999), MAX_LEVEL);
  for (let l = 2; l < MAX_LEVEL; l++) assert.ok(xpForLevel(l + 1) - xpForLevel(l) > xpForLevel(l) - xpForLevel(l - 1));
  assert.deepEqual(levelProgress(xpForLevel(MAX_LEVEL)), { level: MAX_LEVEL, into: 0, need: 0 });
  // A Normal win is worth about two levels early on; the top takes many nights.
  const win = 15 * waveXp("normal") + winXp("normal");
  assert.equal(levelFor(win), 2);
  assert.ok(xpForLevel(MAX_LEVEL) / win >= 8);
});

test("every keeper has five tiers of two perks, each with a name and an effect", () => {
  for (const hero of HEROES) {
    assert.equal(PERKS[hero].length, PERK_LEVELS.length, hero);
    for (const pair of PERKS[hero])
      for (const perk of pair) {
        assert.ok(perk.name && perk.blurb, hero);
        assert.ok(Object.keys(perk.fx).length > 0, `${hero} ${perk.name}`);
      }
  }
});

test("perk picks follow the level: locked tiers have none, open tiers default to the first", () => {
  const rec = normalizeRecord({ xp: xpForLevel(5), picks: [1, null, 1, 1, 1] });
  assert.deepEqual(rec.picks, [1, 0, null, null, null]);
});

test("clearing a wave gives the keeper XP, more on harder difficulties", () => {
  for (const [difficulty, rate] of [["normal", 1], ["hard", 1.5]] as const) {
    const api = createWorld(() => {}, { keepers: emptyProgress(), setup: { difficulty } });
    api.openSetup();
    api.pickKeeper("vael");
    api.chooseHero("vael");
    api.beginNight();
    build(api, "melon", 4, 3);
    api.startWave();
    for (let i = 0; i < 60 * 120 && api.world.hud.phase === "combat"; i++) stepWorld(api.world, 1 / 60);
    assert.notEqual(api.world.hud.phase, "combat");
    assert.equal(api.world.hud.xpRun, Math.round(10 * rate), difficulty);
    assert.equal(api.world.hud.keepers.vael.xp, Math.round(10 * rate));
    assert.equal(api.world.hud.keepers.mynxi.xp, 0, "only the playing keeper earns");
  }
});

test("starting perks add seeds and stacks", () => {
  const plain = start("scholar", emptyProgress()).world.hud;
  assert.equal(plain.seeds, KEEPER_START.scholar!.seeds);
  const grant = start("scholar", at("scholar", 2, 0)).world.hud;
  assert.equal(grant.seeds, KEEPER_START.scholar!.seeds + 50);
  const sabbatical = start("scholar", at("scholar", 2, 1)).world.hud;
  assert.equal(sabbatical.lives, KEEPER_START.scholar!.lives + 3);
  assert.equal(sabbatical.maxLives, KEEPER_START.scholar!.lives + 3);
});

test("setPerk only works on open tiers, and only on the setup screen", () => {
  const api = createWorld(() => {}, { keepers: at("elf", 4) });
  api.openSetup();
  api.pickKeeper("elf");
  api.setPerk(1, 1);
  assert.deepEqual(api.world.hud.keepers.elf.picks.slice(0, 3), [0, 1, null]);
  api.setPerk(2, 1); // level 6 tier: still locked
  assert.equal(api.world.hud.keepers.elf.picks[2], null);
  api.chooseHero("elf");
  api.beginNight();
  api.setPerk(1, 0); // mid-run: ignored
  assert.equal(api.world.hud.keepers.elf.picks[1], 1);
});

test("signature perks change the keeper's own tower in the inspector numbers", () => {
  // Mynxi level 4, Long Desk: the Card Catalogue reaches 20% farther.
  const base = start("mynxi", emptyProgress());
  const plain = build(base, "catalogue", 4, 3)!;
  const desk = start("mynxi", at("mynxi", 4, 1));
  const far = build(desk, "catalogue", 4, 3)!;
  assert.equal(desk.statsOf(far.id)!.range, Math.round(base.statsOf(plain.id)!.range * 1.2));
  // ...and a plain cannon is unchanged.
  const melonA = build(base, "melon", 13, 8)!;
  const melonB = build(desk, "melon", 13, 8)!;
  assert.equal(desk.statsOf(melonB.id)!.range, base.statsOf(melonA.id)!.range);
});

test("the level 10 perk allows a second signature tower", () => {
  for (const hero of HEROES) {
    const one = start(hero, emptyProgress());
    const two = start(hero, at(hero, 10, 0));
    const kind = SIGNATURE[hero];
    const cells: Array<[number, number]> = [
      [4, 3],
      [13, 8],
      [14, 8],
    ];
    const placed = (api: ReturnType<typeof createWorld>) => {
      for (const [c, r] of cells) build(api, kind, c, r);
      return api.world.towers.filter((t) => t.kind === kind).length;
    };
    assert.equal(placed(one), 1, hero);
    assert.equal(placed(two), 2, hero);
  }
});

test("Fifth Book gives the Doctor one more upgrade on every shelf", () => {
  const fx = perkFx("scholar", maxedProgress(1).scholar);
  assert.equal(fx.offer, 1);
  assert.equal(perkFx("scholar", maxedProgress(0).scholar).offer, 0);
});

test("Ooze's Gelatinous perk absorbs two leaks a wave", () => {
  for (const [keepers, absorbs] of [
    [emptyProgress(), 1],
    [at("ooze", 4, 0), 2],
  ] as const) {
    const api = start("ooze", keepers);
    const lives = api.world.hud.lives;
    api.startWave();
    // No towers: everything leaks.
    for (let i = 0; i < 60 * 120 && api.world.hud.phase === "combat"; i++) stepWorld(api.world, 1 / 60);
    const leaked = lives - api.world.hud.lives;
    const sent = api.world.hud.waveSize;
    assert.equal(leaked, Math.min(lives, sent - absorbs), `absorbs ${absorbs}`);
  }
});

test("merged effects: multipliers multiply, bonuses add", () => {
  const fx = perkFx("vael", maxedProgress(0).vael);
  assert.equal(fx.seeds, 30);
  assert.equal(fx.poolLife, 1.5);
  assert.equal(fx.chill, 1.6);
  assert.equal(fx.sigDmg, 1.4);
  assert.equal(fx.sigExtra, 1);
  assert.equal(perkFx(null, undefined).allDmg, 1);
});
