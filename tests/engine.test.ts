import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fittingsFor,
  BOARDS,
  CELL,
  COLS,
  ROWS,
  STATS,
  WAVE_COUNT,
  MIDNIGHT_WAVES,
  nightLength,
  storyHpStep,
  buildBoard,
  createWorld,
  endlessWave,
  hpScaleFor,
  nextBeat,
  sellValue,
  shopPrice,
  waveAt,
  type NightId,
} from "../src/game/engine.ts";
import { ALL_UNLOCKED, EMPTY_META, GLOBAL_RANGE, boardSize, TOWERS as T, buildOffer, TOWER_GROUPS, backRoomPrice, stepWorld, towerReadout, type TowerKind } from "../src/game/engine.ts";
import { HEROES, KEEPER_TOWERS, SIGNATURE, SIGNATURE_KINDS, keeperOf, type HeroId } from "../src/game/engine.ts";
import { simulateRun, smartPick } from "../scripts/sim-core.ts";

const center = (c: number) => c * CELL + CELL / 2;

function startGame(hero: HeroId = "vael") {
  // Trick cannons are level-locked; these tests build every kind.
  const api = createWorld(() => {}, { allTricks: true });
  api.openSetup();
  api.chooseHero(hero);
  // Sir Michael starts only once he has said an oath; sling shoves anywhere, like before.
  if (hero === "michael") api.pickOath("sling");
  else api.beginNight();
  return api;
}

test("sellValue refunds 70% of what was paid", () => {
  assert.equal(sellValue(60), 42);
  assert.equal(sellValue(45), 32);
  assert.equal(sellValue(0), 0);
});

test("selling a tower refunds 70% of its build cost (back-room upgrades belong to the kind, not the tower)", () => {
  const api = startGame("scholar");
  const { world } = api;
  world.hud.seeds = 1000;

  api.pointer(center(4), center(3), "down"); // open floor on The Stacks
  const tower = world.towers[0];
  assert.ok(tower, "tower placed");
  api.pointer(tower.x, tower.y, "down"); // tap it to open it
  assert.equal(tower.paid, 60);

  api.openShop();
  assert.equal(world.hud.workshop, "melon");
  api.pickMod(fittingsFor("melon")[0].id);
  assert.equal(tower.mods.length, 1, "it has the upgrade");
  assert.equal(tower.paid, 60, "but the upgrade isn't part of its price");

  const before = world.hud.seeds;
  api.sellSelected();
  assert.equal(world.hud.seeds - before, sellValue(60));
  assert.equal(world.towers.length, 0);
});

test("Sir Michael has no free cannon, ordinary shots, and waits on the intro for an oath", () => {
  const api = createWorld(() => {}, { allTricks: true });
  api.openSetup();
  api.chooseHero("michael");
  const { world } = api;
  assert.equal(world.towers.length, 0, "no free cannon");
  assert.equal(world.hud.phase, "poster");
  assert.equal(world.hud.oath, null);
  assert.equal(world.hud.log, "Sir Michael is still deciding which oath to swear.");
  api.beginNight();
  assert.equal(world.hud.phase, "poster", "beginNight does not start him");
  api.pickOath("sling");
  assert.equal(world.hud.phase, "prep");
  world.hud.seeds = 999;
  api.pointer(center(4), center(3), "down");
  const melon = world.towers[0];
  assert.ok(melon);
  assert.equal(api.statsOf(melon.id)!.dmg, towerReadout(null, "melon", [], []).dmg, "the same shot as everyone else");
});

test("towers cannot be placed on the carpet", () => {
  const api = startGame();
  const [c, r] = BOARDS.stacks.corners[0];
  api.pointer(center(c), center(r), "down");
  assert.equal(api.world.towers.length, 0);
});

test("every board stays inside its own size and keeps fixed spots off the carpet", () => {
  for (const board of Object.values(BOARDS)) {
    const { cols, rows } = boardSize(board.id);
    const inside = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows;
    const { cells } = buildBoard(board.corners);
    for (const key of cells) {
      const [c, r] = key.split(",").map(Number);
      assert.ok(inside(c, r), `${board.id}: path cell ${key} off map`);
    }
    assert.equal(board.corners[0][0], 0, `${board.id}: fruit enter on the left edge`);
    for (const [c, r] of [board.michaelCannon]) {
      assert.ok(inside(c, r), `${board.id}: fixed tower spot ${c},${r} off map`);
      assert.ok(!cells.has(`${c},${r}`), `${board.id}: fixed tower spot ${c},${r} is on the carpet`);
    }
    for (const [c, r] of board.shelves ?? []) assert.ok(inside(c, r), `${board.id}: shelf ${c},${r} off map`);
  }
});

test("big maps are bigger, and whole-board range still covers them", () => {
  const big = Object.values(BOARDS).filter((b) => (b.cols ?? COLS) > COLS);
  assert.ok(big.length >= 2);
  for (const b of big) {
    const { w, h } = boardSize(b.id);
    assert.ok(Math.hypot(w, h) < GLOBAL_RANGE, `${b.id} is wider than whole-board range`);
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED, setup: { night: b.id === "courtyard" ? "siege" : "midnight", map: b.id }, siegeOpen: true });
    assert.equal(api.world.hud.map, b.id);
    assert.equal(api.world.w, w);
    assert.equal(api.world.cols, b.cols);
  }
});

test("every wave on every night is defined and uses known enemies", () => {
  const nights: NightId[] = ["midnight", "overflow", "siege"];
  for (const night of nights)
    for (let i = 0; i < nightLength(night); i++) {
      const wave = waveAt(i, night);
      assert.ok(wave.spawns.length > 0, `${night} wave ${i + 1} is empty`);
      for (const s of wave.spawns) assert.ok(s.kind in STATS, `unknown enemy ${s.kind}`);
    }
});

test("Midnight is 21 waves, the Overflow 15, and act three climbs slower than act two", () => {
  assert.equal(nightLength("midnight"), 21);
  assert.equal(MIDNIGHT_WAVES, 21);
  assert.equal(nightLength("overflow"), WAVE_COUNT);
  assert.equal(nightLength("endless"), 0);
  assert.ok(storyHpStep(13) < storyHpStep(14), "still climbing up to wave 15");
  const actTwo = storyHpStep(14) - storyHpStep(13);
  for (let c = 15; c <= 20; c++) {
    const step = storyHpStep(c) - storyHpStep(c - 1);
    assert.ok(step > 0 && step < actTwo, `act three, wave ${c + 1}: ${step}`);
  }
});

test("act three: one lesson per wave, and none of it on the Overflow", () => {
  const flags = (i: number) => {
    const sp = waveAt(i, "midnight").spawns;
    return { pit: sp.some((s) => s.pit), gall: sp.some((s) => s.gall), borrower: sp.some((s) => s.borrower), sp };
  };
  const w16 = flags(15);
  assert.ok(w16.pit && !w16.gall && !w16.borrower, "wave 16 is pits only");
  const w18 = flags(17);
  assert.ok(w18.gall && !w18.pit && !w18.borrower, "wave 18 is galls only");
  assert.ok(flags(19).borrower, "wave 20 has borrowers");
  const w21 = flags(20);
  assert.ok(w21.sp.some((s) => s.borrower && s.kind === "corn"), "wave 21 has borrower corn");
  assert.ok(w21.sp.some((s) => s.kind === "karl"), "wave 21 has Karl");
  assert.ok(!w21.pit && !w21.gall);
  assert.equal(waveAt(14, "overflow").name, "Up the chute");
  for (let i = 0; i < WAVE_COUNT; i++)
    assert.ok(!waveAt(i, "overflow").spawns.some((s) => s.pit || s.gall || s.borrower), `overflow wave ${i + 1}`);
  for (let i = 0; i < 30; i++)
    assert.ok(!waveAt(i, "endless").spawns.some((s) => s.pit || s.gall || s.borrower), `endless wave ${i + 1}`);
});

test("beats: picks after 1, 2 and 6 (and 15 on Midnight), the finale card before the last wave", () => {
  for (const night of ["midnight", "overflow"] as const) {
    const length = nightLength(night);
    for (let c = 1; c <= length; c++) {
      const want =
        c >= length
          ? "victory"
          : c === 1 || c === 2 || c === 6 || (night === "midnight" && c === WAVE_COUNT)
            ? "upgrade"
            : c === length - 1
              ? "consequence"
              : "prep";
      assert.equal(nextBeat(c, night), want, `${night} after wave ${c}`);
    }
  }
  assert.equal(nextBeat(14, "midnight"), "prep", "Midnight's old finale card is gone");
  assert.equal(nextBeat(20, "midnight"), "consequence");
  assert.equal(nextBeat(14, "overflow"), "consequence");
});

test("a whole Midnight plays through with no knight and no visitor card", () => {
  const api = startGame("vael");
  const w = api.world;
  const seen = new Set<string>();
  for (let n = 0; n < 200 && w.hud.phase !== "victory" && w.hud.phase !== "defeat"; n++) {
    const p = w.hud.phase;
    seen.add(p);
    if (p === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
    else if (p === "prep" || p === "consequence") {
      api.startWave();
      for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
        w.enemies.length = 0;
        stepWorld(w, 1 / 60);
      }
    } else break;
  }
  assert.equal(w.hud.phase, "victory");
  assert.deepEqual([...seen].sort(), ["consequence", "prep", "upgrade"]);
});

test("endless never ends and keeps generating valid, growing waves", () => {
  let lastSize = 0;
  for (let i = 0; i < 60; i++) {
    assert.notEqual(nextBeat(i + 1, "endless"), "victory");
    const wave = endlessWave(i);
    assert.ok(wave.spawns.length > 0, `endless wave ${i + 1} is empty`);
    for (const s of wave.spawns) {
      assert.ok(s.kind in STATS, `unknown enemy ${s.kind}`);
      assert.ok(s.count > 0 && s.every > 0);
    }
    if (i >= 6 && (i + 1) % 5 === 0) assert.ok(wave.spawns.some((s) => s.kind === "karl"), `wave ${i + 1} should bring Karl`);
    // Compare same-theme waves four apart: they only get bigger.
    if (i >= 10 && (i - 6) % 4 === 0) {
      const size = wave.spawns.reduce((n, s) => (s.kind === "karl" ? n : n + s.count), 0);
      assert.ok(size >= lastSize, `wave ${i + 1} shrank`);
      lastSize = size;
    }
  }
  assert.ok(hpScaleFor("endless", 20) > hpScaleFor("endless", 15));
  assert.equal(hpScaleFor("endless", 5), hpScaleFor("midnight", 5));
});

test("endless offers a pick every fifth wave after act one", () => {
  assert.equal(nextBeat(6, "endless"), "upgrade");
  assert.equal(nextBeat(11, "endless"), "upgrade");
  assert.equal(nextBeat(16, "endless"), "upgrade");
  assert.equal(nextBeat(12, "endless"), "prep");
  assert.equal(nextBeat(4, "endless"), "prep");
});

test("locked bookmarks cannot be equipped", () => {
  const api = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks"] });
  api.openSetup();
  api.setBookmark("seedfund");
  assert.equal(api.world.hud.bookmark, null);
  assert.deepEqual(api.world.hud.unlocked, []);
});

test("bookmarks change the run start and prices", () => {
  const start = (id: "seedfund" | "sparestack" | "discount" | "backroom" | null) => {
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED });
    api.openSetup();
    api.setBookmark(id);
    api.chooseHero("scholar");
    api.beginNight();
    return api;
  };
  const plain = start(null).world.hud;
  assert.equal(start("seedfund").world.hud.seeds, plain.seeds + 30);
  assert.equal(start("sparestack").world.hud.maxLives, plain.maxLives + 2);
  assert.equal(start("discount").world.hud.towerCost, T.melon.cost - 5);
  assert.equal(backRoomPrice("scholar", 0, 0, "backroom"), 0);
  assert.equal(backRoomPrice("scholar", 0, 1, "backroom"), shopPrice("scholar", 0, 1));

  // Back-room Key: the first upgrade costs nothing.
  const api = start("backroom");
  api.pointer(center(4), center(3), "down");
  const before = api.world.hud.seeds;
  api.openShop();
  api.pickMod(fittingsFor("melon")[0].id);
  assert.equal(api.world.hud.seeds, before);
  assert.equal(api.world.towers[0]?.mods.length, 1);
});

test("an old bookmark milestone no longer unlocks it; its room does", () => {
  const api = createWorld(() => {}, { meta: { ...EMPTY_META, fittings: 4 }, rooms: ["stacks"] });
  api.openSetup();
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 1000;
  api.pointer(center(4), center(3), "down");
  api.openShop();
  api.pickMod(fittingsFor("melon")[0].id);
  assert.ok(!api.world.hud.unlocked.includes("backroom"));
  assert.deepEqual(api.world.hud.newUnlocks, []);
  const hall = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks", "greathall"] });
  assert.ok(hall.world.hud.unlocked.includes("backroom"));
});

test("every shared cannon is in exactly one build tab of at most five; keeper towers belong to one keeper each", () => {
  const all = TOWER_GROUPS.flatMap((g) => g.kinds);
  assert.equal(all.length + SIGNATURE_KINDS.length, Object.keys(T).length);
  assert.equal(new Set(SIGNATURE_KINDS).size, SIGNATURE_KINDS.length);
  for (const h of HEROES) assert.equal(KEEPER_TOWERS[h][0], SIGNATURE[h], `${h}: the signature comes first`);
  for (const k of SIGNATURE_KINDS) assert.ok(!all.includes(k), `${k} is not in a shared tab`);
  assert.equal(new Set(all).size, all.length);
  for (const g of TOWER_GROUPS) assert.ok(g.kinds.length >= 1 && g.kinds.length <= 5, g.id);
});

/** A board with lots of seeds and one cannon of `kind` at (4,3), near the Stacks carpet (the desk at (5,3), touching it). */
function withCannon(kind: TowerKind) {
  const owner = keeperOf(kind) ?? "vael";
  const api = startGame(owner);
  api.world.hud.seeds = 5000;
  api.chooseBuild(kind);
  // (4,3) is open floor near the carpet; the Reserve Desk, the Gourd Gate and the Pamphlet must touch the carpet, so they go one tile over.
  api.pointer(center(kind === "desk" || kind === "gourdgate" || kind === "pamphlet" ? 5 : 4), center(3), "down");
  const tower = api.world.towers.find((t) => t.kind === kind);
  assert.ok(tower, `${kind} placed`);
  api.dismissSelection();
  return { api, tower };
}

test("every new cannon can be built and survives a wave", () => {
  for (const kind of Object.keys(T) as TowerKind[]) {
    const { api } = withCannon(kind);
    api.startWave();
    for (let i = 0; i < 60 * 90 && api.world.hud.phase === "combat"; i++) stepWorld(api.world, 1 / 60);
    assert.notEqual(api.world.hud.phase, "combat", `${kind}: wave 1 never ended`);
  }
});

test("Reading Lamp boosts a neighbour's range and fire rate", () => {
  const { api, tower } = withCannon("melon");
  const before = api.statsOf(tower.id)!;
  api.chooseBuild("lantern");
  api.pointer(center(5), center(3), "down");
  const after = api.statsOf(tower.id)!;
  assert.ok(after.range > before.range);
  assert.ok(after.interval < before.interval);
  assert.equal(after.lit, true);
});

function startOn(map: "stacks" | "mezzanine" | "rarebooks" | "archive") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED });
  api.openSetup();
  api.chooseMap(map);
  api.chooseHero("vael");
  api.beginNight();
  api.world.hud.seeds = 5000;
  return api;
}

test("new maps stay locked until their room is restored", () => {
  const api = createWorld(() => {}, { meta: { ...EMPTY_META, bestWave: 15, karls: 3, wins: 5, hardWins: 2 }, rooms: ["stacks"] });
  api.openSetup();
  assert.deepEqual(api.world.hud.maps, ["stacks", "annex"], "old goals met, still locked");
  api.chooseMap("archive");
  assert.equal(api.world.hud.map, "stacks");
  const open = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks", "mezzanine", "rarebooks", "archive"] });
  open.openSetup();
  assert.deepEqual(open.world.hud.maps, ["stacks", "annex", "mezzanine", "rarebooks", "archive"]);
  open.chooseMap("archive");
  assert.equal(open.world.hud.map, "archive");
});

test("the Archive cuts range unless a Reading Lamp reaches the cannon", () => {
  const lit = startOn("stacks");
  lit.pointer(center(4), center(3), "down");
  const normal = lit.statsOf(lit.world.towers[0].id)!.range;

  const api = startOn("archive");
  assert.equal(api.world.hud.placeRange, Math.round(normal * 0.8));
  api.pointer(center(5), center(3), "down");
  const melon = api.world.towers.find((t) => t.kind === "melon")!;
  assert.equal(api.statsOf(melon.id)!.range, Math.round(normal * 0.8));
  api.dismissSelection();
  api.chooseBuild("lantern");
  api.pointer(center(6), center(3), "down");
  assert.ok(api.statsOf(melon.id)!.range > normal, "a lit cannon sees further than normal");
});

test("Rare Books fruit are 25% tougher", () => {
  const firstHp = (map: "stacks" | "rarebooks") => {
    const api = startOn(map);
    api.startWave();
    for (let i = 0; i < 600 && !api.world.enemies.length; i++) stepWorld(api.world, 1 / 60);
    return api.world.enemies[0].maxHp;
  };
  assert.equal(firstHp("rarebooks"), Math.round(firstHp("stacks") * 1.25));
});

test("every pickable map plays a full simulated night", () => {
  for (const map of ["mezzanine", "rarebooks", "archive"] as const) {
    const r = simulateRun({ hero: "vael", difficulty: "normal", strategy: "mixed", night: "midnight", map, seed: 1 });
    assert.ok(r.reachedWave >= 3, `${map}: only reached wave ${r.reachedWave}`);
  }
});

test("Compost Heap pays seeds when a wave ends", () => {
  const { api } = withCannon("compost");
  api.startWave();
  let seedsAtEnd = 0;
  for (let i = 0; i < 60 * 90 && api.world.hud.phase === "combat"; i++) {
    seedsAtEnd = api.world.hud.seeds;
    stepWorld(api.world, 1 / 60);
  }
  assert.equal(api.world.hud.seeds - seedsAtEnd, 15);
});

test("ballista spear damages enemies on its line", () => {
  const { api } = withCannon("ballista");
  api.startWave();
  let damaged = 0;
  for (let i = 0; i < 60 * 30 && api.world.lines.length === 0; i++) {
    const hp = new Map(api.world.enemies.map((e) => [e.id, e.hp]));
    const seeds = api.world.hud.seeds;
    stepWorld(api.world, 1 / 60);
    if (api.world.lines.length) {
      damaged = api.world.enemies.filter((e) => (hp.get(e.id) ?? e.hp) > e.hp).length + (api.world.hud.seeds > seeds ? 1 : 0);
    }
  }
  assert.ok(api.world.lines.length >= 1, "ballista fired");
  assert.ok(damaged >= 1, "spear hurt something");
});

test("cannon upgrades are offered only for cannons you have built", () => {
  const ids = (step: 1 | 2, built: TowerKind[], owned: Parameters<typeof buildOffer>[2] = []) =>
    buildOffer("vael", step, owned, step === 1 ? null : "juicy", built).map((u) => u.id);
  // Never at the first pick: that pick sets the keeper's path.
  assert.deepEqual(ids(1, ["ballista"]), ["juicy", "rapid", "vial"]);
  assert.deepEqual(ids(2, []), ["sticky", "electric", "distill"]);
  assert.deepEqual(ids(2, ["melon", "ballista"]), ["sticky", "barbed", "distill"]);
  assert.deepEqual(ids(2, ["compost", "ballista"]), ["sticky", "interest", "distill"]);
  assert.deepEqual(ids(2, ["ballista"], ["juicy", "barbed"]), ["sticky", "electric", "distill"]);
});

/** Run a wave until `done` says so (or 30 s pass). */
function runUntil(api: ReturnType<typeof createWorld>, done: () => boolean, each?: () => void) {
  api.startWave();
  for (let i = 0; i < 60 * 30 && !done(); i++) {
    each?.();
    stepWorld(api.world, 1 / 60);
  }
}

test("Barbed Spears slow what the spear passes through", () => {
  const { api } = withCannon("ballista");
  api.world.hud.upgrades = ["barbed"];
  runUntil(api, () => api.world.lines.length > 0);
  assert.ok(api.world.enemies.some((e) => e.chill > 0));
});

test("Footnotes ink the Reader's target", () => {
  const { api } = withCannon("reader");
  api.world.hud.upgrades = ["footnotes"];
  // Tough fruit, so the Reader's big hit doesn't pop the target (and its ink) at once.
  const saved = STATS.melon.hp;
  STATS.melon.hp = 9999;
  try {
    runUntil(api, () => api.world.lines.length > 0);
  } finally {
    STATS.melon.hp = saved;
  }
  assert.ok(api.world.enemies.some((e) => (e.ink ?? 0) > 0));
});

test("Stinging Flies get a second target", () => {
  const { api } = withCannon("hive");
  api.world.hud.upgrades = ["stinging"];
  runUntil(api, () => api.world.shots.some((s) => s.element === "fly"));
  assert.equal(api.world.shots.find((s) => s.element === "fly")?.bounces, 1);
});

test("Ink Blot spreads ink when a marked fruit pops", () => {
  const { api } = withCannon("melon");
  api.world.hud.upgrades = ["blot"];
  let a: (typeof api.world.enemies)[number] | undefined;
  let b: (typeof api.world.enemies)[number] | undefined;
  runUntil(
    api,
    () => Boolean(a && a.hp <= 0) || Boolean(a && !api.world.enemies.includes(a)),
    () => {
      if (!a && api.world.enemies.length >= 2) [a, b] = api.world.enemies;
      if (a && b) {
        a.ink = 4;
        a.hp = Math.min(a.hp, 1);
        b.ink = 0;
        b.hp = Math.max(b.hp, 999); // a melon shot one-shots a plain melon now; keep the neighbour standing
        b.x = a.x + 10;
        b.y = a.y;
      }
    },
  );
  assert.ok(a && b, "two enemies spawned");
  assert.ok((b!.ink ?? 0) > 0, "ink splashed onto the neighbour");
});

test("Interest adds to each Compost Heap payout", () => {
  const { api } = withCannon("compost");
  api.world.hud.upgrades = ["interest"];
  api.startWave();
  let seedsAtEnd = 0;
  for (let i = 0; i < 60 * 90 && api.world.hud.phase === "combat"; i++) {
    seedsAtEnd = api.world.hud.seeds;
    stepWorld(api.world, 1 / 60);
  }
  assert.equal(api.world.hud.seeds - seedsAtEnd, 15 + 20 + 20, "5000 seeds held: interest hits its 20 cap");
});

test("simulated runs reach an ending on every night", () => {
  for (const night of ["midnight", "overflow"] as const) {
    const r = simulateRun({
      hero: "mynxi",
      difficulty: "normal",
      strategy: "mixed",
      night,
      map: night === "overflow" ? "overflow" : "stacks",
      seed: 1,
    });
    assert.ok(r.won || r.reachedWave >= 1, `${night} did not finish`);
    assert.equal(r.leaks.length, r.reachedWave);
  }
});

test("simulation is repeatable for the same seed", () => {
  const cfg = {
    hero: "vael",
    difficulty: "hard",
    strategy: "mixed+mods",
    night: "midnight",
    map: "annex",
    seed: 7,
  } as const;
  assert.deepEqual(simulateRun(cfg), simulateRun(cfg));
});

test("the smart sim bot picks by its board: Juicy first, Sticky once it has puddles, a cannon's own upgrade when it has several", () => {
  assert.equal(smartPick(["juicy", "rapid", "fines"], [], ["melon", "mortar"], 1), "juicy");
  // Juicy skips the melon cannon, so a melons-only board doesn't want it.
  assert.notEqual(smartPick(["juicy", "rapid", "fines"], [], ["melon", "melon"], 1), "juicy");
  assert.equal(smartPick(["sticky", "electric", "lamp"], ["vial"], ["mortar"], 2), "sticky");
  assert.equal(smartPick(["sticky", "electric", "lamp"], ["rapid"], ["mortar"], 2), "electric");
  assert.equal(smartPick(["sticky", "stinging", "lamp"], ["rapid"], ["hive", "hive", "hive", "hive"], 3), "stinging");
  const cfg = { hero: "michael", difficulty: "normal", strategy: "mixed", night: "midnight", map: "stacks", seed: 2, picks: "smart", oath: "door" } as const;
  const r = simulateRun(cfg);
  assert.equal(r.upgrades[0], "juicy");
  assert.deepEqual(r, simulateRun(cfg));
});
