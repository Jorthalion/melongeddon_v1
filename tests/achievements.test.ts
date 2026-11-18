import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL,
  EMPTY_META,
  HEROES,
  createWorld,
  emptyProgress,
  fittingsFor,
  stepWorld,
  type HeroId,
  type TowerKind,
} from "../src/game/engine.ts";
import {
  ACHIEVEMENT,
  ACHIEVEMENTS,
  ACHIEVEMENTS_KEY,
  SECTIONS,
  addNight,
  backfill,
  emptyLedger,
  emptyRunLog,
  emptySave,
  loadAchievements,
  newlyEarned,
  parseSave,
  saveAchievements,
  shownAs,
  type NightContext,
  type RunLog,
} from "../src/game/achievements.ts";

function start(hero: HeroId = "mynxi", setup: Record<string, unknown> = {}) {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), setup: { hero, ...setup } as never });
  api.openSetup();
  api.pickKeeper(hero);
  api.chooseHero(hero);
  if (hero === "michael") api.pickOath("door");
  else api.beginNight();
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

const center = (n: number) => n * CELL + CELL / 2;
/** Build `kind` on the first open tile beside the carpet. */
function build(api: Api, kind: TowerKind) {
  const w = api.world;
  w.hud.seeds = Math.max(w.hud.seeds, 9999);
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      const n = w.towers.length;
      api.pointer(center(c), center(r), "down");
      if (w.towers.length > n) {
        api.dismissSelection();
        return w.towers[n];
      }
    }
  throw new Error(`no room for ${kind}`);
}

/** Play the night out: every fruit popped as it appears (no kill credit), first card each pick. */
function winNight(api: Api) {
  const w = api.world;
  for (let i = 0; i < 60 * 60 * 30 && w.hud.phase !== "victory" && w.hud.phase !== "defeat"; i++) {
    if (w.hud.phase === "prep" || w.hud.phase === "consequence") api.startWave();
    else if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id as never);
    else {
      for (const e of w.enemies) e.hp = 0;
      w.enemies = [];
      stepWorld(w, 1 / 60);
    }
  }
  assert.equal(w.hud.phase, "victory");
}

/** A fruit already on the board, mid-wave, with everything else cleared. */
function oneFruit(api: Api): Fruit {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 600 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const [e] = w.enemies;
  w.enemies = [e];
  return e;
}

function ctx(over: Partial<Omit<NightContext, "log">> & { log?: Partial<RunLog> } = {}): NightContext {
  const { log, ...rest } = over;
  return {
    hero: "mynxi",
    night: "midnight",
    difficulty: "normal",
    map: "stacks",
    won: true,
    cleared: 15,
    seeds: 100,
    stacks: 10,
    slips: [],
    ledger: emptyLedger(),
    endlessBest: 0,
    fragmentsEarned: 0,
    rooms: ["stacks"],
    ...rest,
    log: { ...emptyRunLog(), built: { melon: 4 }, ...log },
  };
}
const passes = (id: string, c: NightContext) => ACHIEVEMENT[id].check(c);

test("63 achievements in six sections, unique ids", () => {
  assert.equal(ACHIEVEMENTS.length, 63);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 63);
  assert.deepEqual(
    SECTIONS.map((s) => ACHIEVEMENTS.filter((a) => a.shelf === s.id).length),
    [8, 15, 10, 14, 13, 3],
  );
});

test("the run log resets on chooseHero, restartNight and continueOverflow", () => {
  const api = start();
  build(api, "melon");
  assert.equal(api.world.runLog.built.melon, 1);
  api.restartNight();
  assert.deepEqual(api.world.runLog, emptyRunLog());
  // chooseHero (from the intro) starts a fresh log too.
  const again = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress() });
  again.openSetup();
  again.world.runLog.built.melon = 3;
  again.chooseHero("mynxi");
  assert.deepEqual(again.world.runLog.built, {});

  const night = start();
  build(night, "melon");
  winNight(night);
  night.continueOverflow();
  assert.deepEqual(night.world.runLog, emptyRunLog());
});

test("building, selling, a fitting, a leak, a chute leak and an Ooze absorb each land in the log", () => {
  const api = start();
  const t = build(api, "melon");
  build(api, "melon");
  assert.equal(api.world.runLog.built.melon, 2);
  assert.equal(api.world.runLog.peakTowers, 2);
  api.pointer(t.x, t.y, "down");
  api.sellSelected();
  assert.equal(api.world.runLog.sold, 1);
  // A fitting bought through the back room.
  const shop = start();
  build(shop, "melon");
  shop.world.hud.seeds = 9999;
  shop.chooseBuild("melon");
  shop.openShop();
  const before = shop.world.runLog.backRoomBuys;
  shop.pickMod(fittingsFor("melon")[0].id);
  assert.equal(shop.world.runLog.backRoomBuys, before + 1);

  // A leak at the door.
  const leak = start();
  leak.world.hud.lives = 10;
  const e = oneFruit(leak);
  const end = leak.world.points[leak.world.points.length - 1];
  Object.assign(e, { x: end.x, y: end.y, wp: leak.world.points.length - 1 });
  stepWorld(leak.world, 1 / 60);
  assert.equal(leak.world.runLog.stacksLost, 1);
  assert.equal(leak.world.runLog.chuteStacksLost, 0);
  assert.equal(leak.world.runLog.minStacks, 9);

  // Up the chute: a fruit walking the carpet backwards reaches the start.
  const chute = start("vael", { night: "overflow" });
  chute.world.hud.lives = 10;
  const c = oneFruit(chute);
  const s = chute.world.points[0];
  Object.assign(c, { x: s.x, y: s.y, wp: 0, reverse: true });
  stepWorld(chute.world, 1 / 60);
  assert.equal(chute.world.runLog.chuteStacksLost, 1);

  // Ooze absorbs the first leak: absorbed, not lost.
  const ooze = start("ooze");
  const o = oneFruit(ooze);
  const door = ooze.world.points[ooze.world.points.length - 1];
  Object.assign(o, { x: door.x, y: door.y, wp: ooze.world.points.length - 1 });
  stepWorld(ooze.world, 1 / 60);
  assert.equal(ooze.world.runLog.absorbed, 1);
  assert.equal(ooze.world.runLog.stacksLost, 0);
});

test("Reference: each one passes on a clean night and just misses on a close one", () => {
  assert.ok(passes("minimalist", ctx({ log: { built: { melon: 5 } } })));
  assert.ok(!passes("minimalist", ctx({ log: { built: { melon: 5, mortar: 1 } } })), "6 towers");
  assert.ok(passes("no-signature", ctx({ log: { built: { melon: 3 } } })));
  assert.ok(!passes("no-signature", ctx({ log: { built: { melon: 3, catalogue: 1 } } })));
  assert.ok(passes("signature-only", ctx({ log: { built: { melon: 3, catalogue: 2, desk: 1 } } })));
  assert.ok(!passes("signature-only", ctx({ log: { built: { melon: 3, catalogue: 2, mortar: 1 } } })));
  assert.ok(passes("hoarder", ctx({ seeds: 500 })));
  assert.ok(!passes("hoarder", ctx({ seeds: 499 })));
  assert.ok(passes("stack-saver", ctx()));
  assert.ok(!passes("stack-saver", ctx({ log: { stacksLost: 1 } })), "one stack lost");
  assert.ok(!passes("stack-saver", ctx({ hero: "ooze", log: { absorbed: 1 } })), "an absorb counts");
  assert.ok(passes("chute-master", ctx({ night: "overflow", map: "overflow", log: { stacksLost: 3 } })));
  assert.ok(!passes("chute-master", ctx({ night: "overflow", map: "overflow", log: { chuteStacksLost: 1 } })));
  assert.ok(passes("back-room-ban", ctx()));
  assert.ok(!passes("back-room-ban", ctx({ log: { backRoomBuys: 1 } })));
  assert.ok(passes("still-standing", ctx({ log: { minStacks: 1 } })));
  assert.ok(!passes("still-standing", ctx({ log: { minStacks: 2 } })));
  assert.ok(!passes("all-slips", ctx({ night: "overflow", slips: ["heavy", "damp", "karl"] })), "TODO: only three slips can be taken");
  assert.ok(passes("all-slips", ctx({ night: "overflow", slips: ["heavy", "damp", "norefund", "short", "karl"] })));
  assert.ok(passes("perfect", ctx({ difficulty: "hard" })));
  assert.ok(!passes("perfect", ctx({ difficulty: "hard", log: { sold: 1 } })));
  assert.ok(!passes("perfect", ctx({ difficulty: "hard", log: { absorbed: 1 } })), "an absorb counts");
  assert.ok(!passes("perfect", ctx({ difficulty: "normal" })));
  // All of them need the win.
  for (const id of ["minimalist", "hoarder", "stack-saver", "back-room-ban", "perfect"]) assert.ok(!passes(id, ctx({ won: false, difficulty: "hard" })), id);
});

test("Staff Room: a win as a keeper earns that keeper's shelf only; Full Staff needs every keeper", () => {
  const api = start("quack");
  winNight(api);
  const staff = api.world.hud.newShelves.filter((id) => id.startsWith("win-"));
  assert.deepEqual(staff, ["win-quack"]);
  assert.ok(api.world.hud.newShelves.includes("first-night"));

  const most = emptyLedger();
  for (const h of HEROES.slice(0, -1)) most.winsByKeeper[h] = 1;
  assert.ok(!passes("full-staff", ctx({ ledger: most })));
  most.winsByKeeper[HEROES[HEROES.length - 1]] = 1;
  assert.ok(passes("full-staff", ctx({ ledger: most })));
});

test("Workshop: Justice Served only when the Scales pop Karl", () => {
  assert.ok(passes("justice", ctx({ log: { karlKilledBy: ["melon", "scales"] } })));
  assert.ok(!passes("justice", ctx({ log: { karlKilledBy: ["melon"] } })));

  const api = start("elf");
  const scales = build(api, "scales");
  const karl = oneFruit(api);
  Object.assign(karl, { boss: true, kind: "karl", hp: 1, maxHp: 1000, x: scales.x + 30, y: scales.y, guard: "none" });
  for (let i = 0; i < 600 && karl.hp > 0; i++) stepWorld(api.world, 1 / 60);
  assert.ok(karl.hp <= 0);
  assert.deepEqual(api.world.runLog.karlKilledBy, ["scales"]);
});

test("Workshop: Chain Reaction counts kills from one Catalogue shot, not across shots", () => {
  assert.ok(passes("chain", ctx({ log: { chainBest: 3 } })));
  const api = start("mynxi");
  const cat = build(api, "catalogue");
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 900 && w.enemies.length < 3; i++) stepWorld(w, 1 / 60);
  const three = w.enemies.slice(0, 3);
  w.enemies = three;
  three.forEach((e, k) => Object.assign(e, { hp: 1, maxHp: 50, guard: "none", shell: 0, x: cat.x + 40 + k * 20, y: cat.y, speed: 0 }));
  cat.cd = 0;
  for (let i = 0; i < 300 && three.some((e) => e.hp > 0); i++) stepWorld(w, 1 / 60);
  assert.equal(w.runLog.chainBest, 3, "one shot, three pops");

  // Three fruit popped one at a time: three kills, but never three from one shot.
  const solo = start("mynxi");
  const c2 = build(solo, "catalogue");
  const sw = solo.world;
  solo.startWave();
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < 900 && !sw.enemies.some((e) => e.hp > 0); i++) stepWorld(sw, 1 / 60);
    const [e] = sw.enemies.filter((f) => f.hp > 0);
    sw.enemies = [e];
    Object.assign(e, { hp: 1, maxHp: 50, guard: "none", shell: 0, x: c2.x + 40, y: c2.y, speed: 0 });
    c2.cd = 0;
    for (let i = 0; i < 300 && e.hp > 0; i++) stepWorld(sw, 1 / 60);
  }
  assert.ok(sw.runLog.killsBy.catalogue! >= 3);
  assert.equal(sw.runLog.chainBest, 1);
});

test("Workshop: Knockback counts only fruit the Trebuchet actually moved", () => {
  assert.ok(passes("knockback", ctx({ log: { knocks: 30 } })));
  assert.ok(!passes("knockback", ctx({ log: { knocks: 29 } })));
  const api = start("michael");
  const treb = build(api, "trebuchet");
  const w = api.world;
  const e = oneFruit(api);
  // At the very start of the carpet, there is nowhere back to shove it.
  const p0 = w.points[0];
  Object.assign(e, { hp: 1e6, maxHp: 1e6, guard: "none", x: p0.x, y: p0.y, wp: 1, speed: 0 });
  treb.cd = 0;
  for (let i = 0; i < 400 && w.runLog.knocks === 0 && !w.shots.length; i++) stepWorld(w, 1 / 60);
  for (let i = 0; i < 200 && w.shots.length; i++) stepWorld(w, 1 / 60);
  assert.equal(w.runLog.knocks, 0, "it didn't move");
  // Further along it does.
  const mid = w.points[2];
  Object.assign(e, { x: mid.x, y: mid.y, wp: 3 });
  treb.cd = 0;
  for (let i = 0; i < 600 && w.runLog.knocks === 0; i++) stepWorld(w, 1 / 60);
  assert.equal(w.runLog.knocks, 1);
});

test("secret shelves are ??? until earned", () => {
  const secret = ACHIEVEMENTS.filter((a) => a.secret);
  assert.equal(secret.length, 3);
  for (const a of secret) {
    assert.deepEqual(shownAs(a, false), { name: "???", blurb: "???" });
    assert.equal(shownAs(a, true).name, a.name);
  }
  assert.equal(shownAs(ACHIEVEMENT["first-night"], false).name, "First Night");
});

test("a defeat can still earn shelves that need no win", () => {
  const ledger = { ...emptyLedger(), kills: 990 };
  const c = ctx({ won: false, log: { kills: 10 } });
  const after = addNight(ledger, c);
  const got = newlyEarned(emptySave(), { ...c, ledger: after });
  assert.deepEqual(got, ["massacre"]);

  // In the engine: running out of stacks ends the night and checks it.
  const api = start();
  api.world.hud.lives = 1;
  const e = oneFruit(api);
  const end = api.world.points[api.world.points.length - 1];
  Object.assign(e, { x: end.x, y: end.y, wp: api.world.points.length - 1 });
  stepWorld(api.world, 1 / 60);
  assert.equal(api.world.hud.phase, "defeat");
  assert.ok(Array.isArray(api.world.hud.newShelves));
  assert.ok(!api.world.hud.newShelves.includes("first-night"));
});

test("saving: survives a reload, corrupt saves load empty, the backfill proves only what it can", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { localStorage?: Storage };
  const had = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage;
  try {
    // First load: backfill from old stats, and it's written.
    const first = loadAchievements({ ...EMPTY_META, wins: 1 });
    assert.deepEqual(Object.keys(first.earned), ["first-night"], "a win proves First Night and nothing else");
    assert.ok(store.has(ACHIEVEMENTS_KEY));
    // Earn one more, save, load again.
    first.earned["hoarder"] = 123;
    first.ledger.kills = 50;
    saveAchievements(first);
    const again = loadAchievements({ ...EMPTY_META, wins: 5, hardWins: 2 });
    assert.deepEqual(Object.keys(again.earned).sort(), ["first-night", "hoarder"], "no second backfill");
    assert.equal(again.ledger.kills, 50);
    // Corrupt.
    store.set(ACHIEVEMENTS_KEY, "{not json");
    assert.deepEqual(loadAchievements(EMPTY_META), emptySave());
  } finally {
    g.localStorage = had;
  }
  // Defensive parsing: unknown ids dropped, bad numbers become 0.
  const parsed = parseSave({ earned: { "first-night": 5, nope: 3, hoarder: "x" }, ledger: { kills: -4, killsBy: { quackliber: "12" }, oathsWon: ["door", "moon"] } });
  assert.deepEqual(parsed.earned, { "first-night": 5 });
  assert.equal(parsed.ledger.kills, 0);
  assert.equal(parsed.ledger.killsBy.quackliber, 12);
  assert.deepEqual(parsed.ledger.oathsWon, ["door"]);
  // Hard wins prove Librarian and Melongeddon Survivor; Karl's Nightmare can't be proved.
  const hard = backfill({ ...EMPTY_META, wins: 2, hardWins: 1, karls: 3 }, 1);
  assert.deepEqual(Object.keys(hard.earned).sort(), ["first-night", "librarian", "melongeddon"]);
});

test("dev mode and options.meta runs save nothing", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { localStorage?: Storage; window?: unknown };
  const had = { ls: g.localStorage, win: g.window };
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage;
  g.window = globalThis;
  try {
    for (const opts of [{ dev: true, keepers: emptyProgress() }, { meta: EMPTY_META, keepers: emptyProgress() }]) {
      const api = createWorld(() => {}, opts);
      api.openSetup();
      api.chooseHero("mynxi");
      api.beginNight();
      winNight(api as Api);
      assert.ok(api.world.hud.newShelves.includes("first-night"), "earned in memory");
      assert.ok(!store.has(ACHIEVEMENTS_KEY), "but never saved");
    }
  } finally {
    g.localStorage = had.ls;
    g.window = had.win;
  }
});
