import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_ROOMS,
  ALL_UNLOCKED,
  CELL,
  EMPTY_META,
  FRAGMENTS,
  HEROES,
  ROOM,
  ROOMS,
  createWorld,
  emptyProgress,
  nightFragments,
  stepWorld,
  validateSetup,
  type RoomId,
} from "../src/game/engine.ts";
import { ACHIEVEMENT, emptyRunLog, emptySave, migrate, quietContext, settle, type AchievementSave } from "../src/game/achievements.ts";
import { KEEPER_ORDER, keyAction, runKeyAction } from "../src/game/keys.ts";

const fresh = (rooms: RoomId[] = ["stacks"], fragments = 0) => createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), rooms, fragments });
const total = (parts: Array<{ n: number }>) => parts.reduce((n, p) => n + p.n, 0);

test("a new save: only The Stacks, 0 fragments, and only Mynxi, Vaelithra and Sir Michael can be picked", () => {
  const save = emptySave();
  assert.deepEqual(save.rooms, ["stacks"]);
  assert.equal(save.fragments, 0);
  const api = fresh();
  assert.deepEqual(
    HEROES.filter((h) => !api.world.hud.lockedKeepers.includes(h)),
    ["mynxi", "vael", "michael"],
  );
  api.openSetup();
  // By click (pickKeeper), by key, and by chooseHero: all refused.
  api.pickKeeper("elf");
  assert.notEqual(api.world.hud.hero, "elf");
  assert.match(api.world.hud.log, /Restore The Mezzanine/);
  const digit = String(KEEPER_ORDER.indexOf("asser") + 1);
  const action = keyAction(api.world.hud, digit)!;
  runKeyAction(api, action, () => {});
  assert.notEqual(api.world.hud.hero, "asser");
  api.chooseHero("asser");
  assert.equal(api.world.hud.phase, "select", "no night for a locked keeper");
  api.pickKeeper("vael");
  assert.equal(api.world.hud.hero, "vael");
});

test("fragments: wins by difficulty, the Overflow, Karl, a long loss, Endless", () => {
  const base = { night: "midnight" as const, difficulty: "normal" as const, won: true, cleared: 15, karl: false };
  assert.equal(total(nightFragments(base)), 2, "a Normal win");
  assert.equal(total(nightFragments({ ...base, difficulty: "hard", karl: true })), 4, "Melongeddon + Karl");
  assert.equal(total(nightFragments({ ...base, night: "overflow" })), 3, "the Overflow on Normal");
  assert.equal(total(nightFragments({ ...base, won: false, cleared: 10 })), 1, "lost after wave 10");
  assert.equal(total(nightFragments({ ...base, won: false, cleared: 9 })), 0, "lost before it");
  assert.equal(total(nightFragments({ ...base, night: "endless", won: false, cleared: 25 })), 2, "Endless wave 25");
  assert.equal(FRAGMENTS.win.overdue, 4);
});

test("an achievement pays its tier once", () => {
  assert.equal(ACHIEVEMENT.chain.tier, 2);
  const ctx = { ...quietContext(emptySave(), 0), log: { ...emptyRunLog(), chainBest: 3 } };
  const once = settle(emptySave(), ctx);
  assert.deepEqual(once.fresh, ["chain"]);
  assert.equal(once.save.fragments, 2);
  const twice = settle(once.save, ctx);
  assert.deepEqual(twice.fresh, []);
  assert.equal(twice.save.fragments, 2);
});

test("a won night in the engine pays its fragments and lists them for the end card", () => {
  const api = fresh();
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  const w = api.world;
  for (let i = 0; i < 60 * 60 * 30 && w.hud.phase !== "victory"; i++) {
    if (w.hud.phase === "prep" || w.hud.phase === "consequence") api.startWave();
    else if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id as never);
    else {
      w.enemies = [];
      stepWorld(w, 1 / 60);
    }
  }
  assert.equal(w.hud.phase, "victory");
  const night = w.hud.nightFragments.filter((p) => !p.label.includes("restored"));
  assert.deepEqual(night, [{ label: "Night won", n: 2 }]);
  const shelves = w.hud.newShelves.reduce((n, id) => n + ACHIEVEMENT[id].tier, 0);
  assert.equal(w.hud.fragments, 2 + shelves);
  assert.equal(w.hud.canRestore, "mezzanine", "3 or more in hand: The Mezzanine is affordable");
});

test("restoring: spends the fragments and unlocks the room; unaffordable or restored does nothing", () => {
  const api = fresh(["stacks"], 3);
  assert.ok(!api.world.hud.maps.includes("mezzanine"));
  assert.equal(api.restoreRoom("rarebooks"), false, "6 is too many");
  assert.equal(api.restoreRoom("mezzanine"), true);
  // 3 spent; Restorer (tier 1) is earned by restoring a first room, and pays.
  assert.ok(api.world.hud.shelves.restorer);
  assert.equal(api.world.hud.fragments, 0 + ACHIEVEMENT.restorer.tier);
  assert.ok(api.world.hud.rooms.includes("mezzanine"));
  assert.ok(api.world.hud.maps.includes("mezzanine"));
  assert.ok(!api.world.hud.lockedKeepers.includes("elf"));
  assert.ok(api.world.hud.unlocked.includes("seedfund"));
  assert.equal(api.restoreRoom("mezzanine"), false, "already restored");
  // Not mid-night.
  const busy = fresh(["stacks"], 99);
  busy.openSetup();
  busy.chooseHero("mynxi");
  busy.beginNight();
  assert.equal(busy.restoreRoom("archive"), false);
});

test("old goals are gone: Pop Karl no longer opens Rare Books; restoring it does", () => {
  const api = createWorld(() => {}, { meta: { ...EMPTY_META, karls: 5 }, rooms: ["stacks"] });
  assert.ok(!api.world.hud.maps.includes("rarebooks"));
  assert.ok(!api.world.hud.unlocked.includes("sparestack"));
  const open = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks", "rarebooks"] });
  assert.ok(open.world.hud.maps.includes("rarebooks"));
  assert.ok(!open.world.hud.lockedKeepers.includes("ooze"));
});

test("validateSetup: a locked keeper or map falls back, with a note", () => {
  const r = validateSetup({ night: "midnight", map: "readingroom", hero: "asser" }, { maps: ["stacks", "annex"], unlocked: [], keepers: ["mynxi", "vael", "michael"] });
  assert.equal(r.setup.hero, "mynxi");
  assert.equal(r.setup.map, "stacks");
  assert.equal(r.notes.length, 2);
  assert.match(r.notes.join(" "), /Asser.*Reading Room/);
  const api = createWorld(() => {}, { meta: EMPTY_META, rooms: ["stacks"], setup: { hero: "quack" } });
  assert.equal(api.world.hud.hero, "mynxi");
  assert.match(api.world.hud.setupNote, /Great Hall/);
});

test("migration: old progress restores its rooms for free, pays for achievements, runs once", () => {
  const meta = { ...EMPTY_META, bestWave: 15, wins: 2, karls: 1 };
  const moved = migrate(emptySave(), meta, ["quack"]);
  assert.deepEqual(moved.save.rooms, ["stacks", "mezzanine", "rarebooks", "archive", "greathall"]);
  assert.ok(!moved.save.rooms.includes("readingroom"), "hardWins 0");
  assert.match(moved.note, /Grand Catalogue is open/);

  const asser = migrate(emptySave(), EMPTY_META, ["asser"]);
  assert.deepEqual(asser.save.rooms, ["stacks", "readingroom"]);

  const earned: AchievementSave = { ...emptySave(), earned: { "first-night": 1, chain: 1 } };
  const paid = migrate(earned, EMPTY_META, []);
  // First Night (1) + Chain Reaction (2); no room besides The Stacks, so no Restorer.
  assert.equal(paid.save.fragments, 3);
  assert.equal(paid.save.migrated, true);
  assert.deepEqual(migrate(paid.save, meta, ["quack"]).save, paid.save, "only once");

  const brandNew = migrate(emptySave(), EMPTY_META, []);
  assert.deepEqual(brandNew.save.rooms, ["stacks"]);
  assert.equal(brandNew.save.fragments, 0);
  assert.equal(brandNew.note, "");

  // Rooms restored by the migration count for Restorer.
  assert.ok(moved.save.earned.restorer);
});

test("dev mode, ALL_UNLOCKED and the simulator see every room", () => {
  assert.equal(createWorld(() => {}, { dev: true, keepers: emptyProgress() }).world.hud.rooms.length, ROOMS.length);
  const all = createWorld(() => {}, { meta: ALL_UNLOCKED });
  assert.deepEqual(all.world.hud.rooms, ALL_ROOMS);
  assert.deepEqual(all.world.hud.lockedKeepers, []);
  assert.deepEqual(all.world.hud.lockedTowers, []);
});

test("cosmetics: hidden until The Bindery; a carpet colour changes nothing in play", () => {
  const locked = fresh(["stacks"]);
  locked.setCosmetics({ carpet: "blue", frame: "gold", gilded: true });
  assert.deepEqual(locked.world.hud.cosmetics, { carpet: "crimson", frame: "plain", gilded: false });

  const bound = fresh(["stacks", "bindery"]);
  bound.openSetup();
  bound.chooseHero("mynxi");
  bound.beginNight();
  bound.chooseBuild("melon");
  const w = bound.world;
  for (let r = 0; r < w.rows && !w.towers.length; r++)
    for (let c = 0; c < w.cols && !w.towers.length; c++) bound.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
  const before = { stats: bound.statsOf(w.towers[0].id), seeds: w.hud.seeds, lives: w.hud.lives };
  bound.setCosmetics({ carpet: "blue", frame: "ink", gilded: true });
  assert.equal(w.hud.cosmetics.carpet, "blue");
  assert.equal(w.hud.cosmetics.frame, "ink");
  assert.equal(w.hud.cosmetics.gilded, false, "the gilded title is The Restricted Section's");
  assert.deepEqual({ stats: bound.statsOf(w.towers[0].id), seeds: w.hud.seeds, lives: w.hud.lives }, before);
  assert.equal(ROOM.bindery.cost, 12);
});
