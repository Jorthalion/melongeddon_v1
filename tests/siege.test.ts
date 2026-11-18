import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  BALANCE,
  BOARDS,
  CANNON,
  CELL,
  SIEGE,
  STATS,
  carpetAlong,
  createWorld,
  emptyProgress,
  hpScaleFor,
  nightFragments,
  nightLength,
  stepWorld,
  validateSetup,
  waveAt,
  waveQueue,
  type HeroId,
} from "../src/game/engine.ts";
import { ACHIEVEMENT, addNight, emptyLedger, emptyRunLog, parseSave, type Ledger, type NightContext, type RunLog } from "../src/game/achievements.ts";
import { checkoutCard } from "../src/game/checkout.ts";
import { keyAction, runKeyAction, victoryAction } from "../src/game/keys.ts";

const center = (n: number) => n * CELL + CELL / 2;

type Api = ReturnType<typeof createWorld>;
type Foe = Api["world"]["enemies"][number];
type Tower = Api["world"]["towers"][number];

/** A Siege night on the Courtyard, on the carpet with nothing built and plenty of stacks. */
function siege(hero: HeroId = "mynxi") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), siegeOpen: true, allTricks: true, setup: { night: "siege", hero, difficulty: "normal" } });
  api.openSetup();
  api.chooseHero(hero);
  if (hero === "michael") api.pickOath("sling");
  else api.beginNight();
  api.world.hud.lives = 999;
  api.world.hud.maxLives = 999;
  api.world.hud.seeds = 5000;
  return api;
}

const step = (api: Api, s: number) => {
  for (let i = 0; i < Math.round(s * 60); i++) stepWorld(api.world, 1 / 60);
};

/**
 * A wave held open for experiments: wave 1's geese all come out and are cleared away, except one parked
 * goose off the board (it never moves and can't die), so the wave doesn't end. Then the test adds its own.
 */
function lab(hero: HeroId = "mynxi") {
  const api = siege(hero);
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 600 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const park = w.enemies[0];
  Object.assign(park, { hp: 1e9, maxHp: 1e9, halt: 1e9, x: -400, y: -400, honked: true });
  for (let i = 0; i < 60 * 10; i++) {
    w.enemies = [park];
    stepWorld(w, 1 / 60);
  }
  w.enemies = [park];
  assert.equal(w.hud.phase, "combat", "the wave is held open");
  let next = 1;
  /** A goose or cat of our own at tile (c, r), heading for waypoint `wp`. */
  const add = (kind: "goose" | "cat", c: number, r: number, wp: number, extra: Partial<Foe> = {}): Foe => {
    const e = {
      ...park,
      id: 50000 + next++,
      kind,
      x: center(c),
      y: center(r),
      wp,
      hp: 100,
      maxHp: 100,
      speed: STATS[kind].speed,
      r: STATS[kind].r,
      halt: 0,
      honked: false,
      boss: false,
      reverse: false,
      ...extra,
    } as Foe;
    w.enemies.push(e);
    return e;
  };
  return { api, w, park, add };
}

/** Build `kind` on tile (c, r) and return it (quiet: it waits 10 s before its first shot). */
function build(api: Api, kind: Tower["kind"], c: number, r: number): Tower {
  api.dismissSelection();
  api.chooseBuild(kind);
  const before = api.world.towers.length;
  api.pointer(center(c), center(r), "down");
  assert.equal(api.world.towers.length, before + 1, `built a ${kind} on ${c},${r}`);
  const t = api.world.towers[api.world.towers.length - 1];
  t.cd = 10;
  return t;
}

/** A shot landing on `e` next frame (from tower `owner`, if given; `splash` hits the others near it). */
function shoot(api: Api, e: Foe, dmg: number, opts: { splash?: number; owner?: number } = {}) {
  api.world.shots.push({
    id: 9e6 + Math.random(),
    x: e.x,
    y: e.y,
    tx: e.x,
    ty: e.y,
    target: e.id,
    dmg,
    life: 1,
    bounces: 0,
    orange: false,
    splash: opts.splash ?? 0,
    element: "shot",
    procs: false,
    splashRatio: opts.splash ? 1 : 0,
    chill: 0,
    freezeExtra: 0,
    fireLife: 0,
    fireBurn: 0,
    pulp: false,
    owner: opts.owner,
  });
  stepWorld(api.world, 1 / 60);
}

/** Clear waves (taking the first card on each shelf, emptying the carpet) until wave `index` (0-based) is next. */
function skipTo(api: Api, index: number) {
  const w = api.world;
  for (let n = 0; n < 100; n++) {
    if (w.hud.phase === "upgrade") {
      api.pickUpgrade(w.hud.offer[0].id);
      continue;
    }
    if ((w.hud.phase === "prep" || w.hud.phase === "consequence") && w.hud.wave - 1 === index) return;
    api.startWave();
    for (let i = 0; i < 60 * 120 && w.hud.phase === "combat"; i++) {
      w.enemies = [];
      stepWorld(w, 1 / 30);
    }
  }
  assert.fail(`never reached wave ${index + 1}`);
}

const along = (api: Api, e: Foe) => carpetAlong(api.world.points, e.x, e.y, e.wp, e.reverse).along;

function press(api: Api, key: string) {
  const action = keyAction(api.world.hud, key);
  if (action) runKeyAction(api, action, () => {});
}

// ── Flow ────────────────────────────────────────────────────────────────────

test("flow: the Siege is locked until the Overflow has been won, then pickable on the Courtyard", () => {
  const locked = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress() });
  locked.openSetup();
  assert.equal(locked.world.hud.siegeOpen, false);
  locked.chooseNight("siege");
  assert.equal(locked.world.hud.night, "midnight", "a locked Siege can't be picked");
  assert.equal(locked.world.hud.log, "Win the Overflow first.");
  // A saved Siege setup falls back to Midnight while it's locked.
  const back = validateSetup({ night: "siege", hero: "vael" }, { maps: ["stacks"], unlocked: [], siege: false });
  assert.equal(back.setup.night, "midnight");
  assert.equal(back.notes.length, 1);

  // An Overflow win goes in the ledger, and the ledger opens the Siege.
  const won = addNight(emptyLedger(), { log: emptyRunLog(), hero: "vael", night: "overflow", difficulty: "normal", map: "overflow", won: true, cleared: 15, seeds: 0, stacks: 5, slips: [] });
  assert.equal(won.winsByNight.overflow, 1);
  const open = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), ledger: won });
  open.openSetup();
  assert.equal(open.world.hud.siegeOpen, true);
  open.chooseNight("siege");
  assert.equal(open.world.hud.night, "siege");
  assert.equal(open.world.hud.map, "courtyard");
  assert.equal(open.world.hud.waveCount, 15);
  open.chooseMap("greathall");
  assert.equal(open.world.hud.map, "courtyard", "the Courtyard belongs to the Siege");
  // Not a room you can pick on its own.
  open.chooseNight("midnight");
  open.chooseMap("courtyard");
  assert.notEqual(open.world.hud.map, "courtyard");
});

test("flow: old saves that already show an Overflow win open the Siege", () => {
  assert.equal(parseSave({ ledger: { winsByMap: { overflow: 2 } } }).ledger.winsByNight.overflow, 2, "a win on its map");
  assert.equal(parseSave({ earned: { overflow: 1700000000000 } }).ledger.winsByNight.overflow, 1, "The Chute Holds");
  assert.equal(parseSave({ ledger: { winsByNight: { overflow: 3, siege: 1 } } }).ledger.winsByNight.siege, 1);
  assert.equal(parseSave({}).ledger.winsByNight.overflow, undefined, "nothing to show for it");
});

test("flow: the Overflow's victory offers the Siege and Enter goes there; the Siege's offers Endless", () => {
  assert.equal(victoryAction("midnight"), "Continue to the Overflow");
  assert.equal(victoryAction("overflow"), "Continue to the Siege");
  assert.equal(victoryAction("siege"), "Set up Endless");
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), siegeOpen: true, setup: { night: "overflow", hero: "elf", difficulty: "hard" } });
  api.continueRun();
  api.world.hud.phase = "victory";
  press(api, "Enter");
  const h = api.world.hud;
  assert.equal(h.phase, "select");
  assert.equal(h.night, "siege");
  assert.equal(h.map, "courtyard");
  assert.equal(h.hero, "elf");
  assert.equal(h.difficulty, "hard");
  api.chooseHero("elf");
  assert.equal(h.phase, "poster");
  api.world.hud.phase = "victory";
  press(api, "Enter");
  assert.equal(api.world.hud.night, "endless");
  assert.equal(api.world.hud.phase, "select");
});

test("the Siege: 15 waves of geese and cats only, three acts, bosses on 5, 10 and 15, extra seeds at the start", () => {
  assert.equal(nightLength("siege"), 15);
  for (let i = 0; i < 15; i++) for (const s of waveAt(i, "siege").spawns) assert.ok(s.kind === "goose" || s.kind === "cat", `wave ${i + 1}`);
  const kinds = (i: number) => new Set(waveAt(i, "siege").spawns.map((s) => s.kind));
  for (let i = 0; i < 5; i++) assert.deepEqual([...kinds(i)], ["goose"], `act one, wave ${i + 1}`);
  for (let i = 5; i < 10; i++) assert.deepEqual([...kinds(i)], ["cat"], `act two, wave ${i + 1}`);
  // Act three mixes them, except wave 14: paratroopers and tanks.
  for (const i of [10, 11, 12, 14]) assert.equal(kinds(i).size, 2, `act three, wave ${i + 1}`);
  assert.ok(waveAt(4, "siege").spawns.some((s) => s.matriarch));
  assert.ok(waveAt(9, "siege").spawns.some((s) => s.general));
  assert.ok(waveAt(14, "siege").spawns.some((s) => s.matriarch) && waveAt(14, "siege").spawns.some((s) => s.general));
  assert.ok(waveAt(13, "siege").spawns.some((s) => s.para) && waveAt(13, "siege").spawns.some((s) => s.tank));
  assert.equal(waveAt(14, "siege").blurb, "Both of them, at once. They still hate each other.");
  assert.equal(hpScaleFor("siege", 7), hpScaleFor("midnight", 7), "health climbs the story curve");
  assert.equal(BOARDS.courtyard.carpet, "path");
  assert.ok(BOARDS.courtyard.drops?.length === 2);
  const api = siege("vael");
  assert.ok(api.world.hud.log.includes(`+${BALANCE.siegeSeeds} seeds`));
  assert.deepEqual(
    checkoutCard(api.world.hud).groups.find((g) => g.id === "night")?.entries.map((e) => e.name),
    ["Stores by the back door"],
  );
  assert.deepEqual(nightFragments({ night: "siege", difficulty: "hard", won: true, cleared: 15, karl: false }), [
    { label: "Night won", n: 3 },
    { label: "The Siege", n: 1 },
  ]);
});

// ── Geese ───────────────────────────────────────────────────────────────────

test("Honker: the first hit makes towers within 1.5 tiles skip one shot; the second hit doesn't honk", () => {
  const { api, add } = lab();
  const near = build(api, "melon", 12, 1);
  const far = build(api, "melon", 14, 4);
  const goose = add("goose", 12, 2, 6, { hp: 500, maxHp: 500 });
  shoot(api, goose, 5);
  assert.equal(goose.honked, true);
  assert.equal(near.honked, true, "within a tile and a half");
  assert.ok(!far.honked, "too far to hear it");
  assert.ok(api.world.floaters.some((f) => f.text === "HONK!"));
  // Its next shot is skipped...
  near.cd = 0;
  api.world.shots = [];
  stepWorld(api.world, 1 / 60);
  assert.equal(api.world.shots.filter((s) => s.owner === near.id).length, 0, "the honked tower misses its shot");
  assert.ok(!near.honked);
  // ...and the one after is not.
  near.cd = 0;
  stepWorld(api.world, 1 / 60);
  assert.equal(api.world.shots.filter((s) => s.owner === near.id).length, 1, "then it fires as usual");
  // A second hit doesn't honk again.
  near.cd = 10;
  shoot(api, goose, 5);
  assert.ok(!near.honked);
});

test("Gosling Lines: lines of five with a leader; killing the leader stops its line for 2 seconds, another gosling doesn't", () => {
  const q = waveQueue([{ kind: "goose", count: 10, every: 0.3, gosling: true }]);
  assert.deepEqual(q.map((i) => i.line), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
  assert.deepEqual(q.map((i) => i.leader), [true, false, false, false, false, true, false, false, false, false]);

  const api = siege();
  skipTo(api, 1);
  api.startWave();
  const w = api.world;
  for (let i = 0; i < 60 * 6 && w.enemies.filter((e) => e.gosling).length < 10; i++) stepWorld(w, 1 / 60);
  const goslings = w.enemies.filter((e) => e.gosling);
  assert.equal(goslings.length, 10);
  for (const g of goslings) assert.equal(g.r, g.leader ? SIEGE.leader.r : SIEGE.gosling.r);
  const [a, b] = [...new Set(goslings.map((g) => g.line))];
  const leader = goslings.find((g) => g.line === a && g.leader)!;
  shoot(api, leader, 1e6);
  const lineA = goslings.filter((g) => g.line === a && g !== leader);
  const lineB = goslings.filter((g) => g.line === b);
  assert.ok(lineA.every((g) => (g.halt ?? 0) > SIEGE.goslingStun - 0.1), "its line stops");
  assert.ok(lineB.every((g) => !(g.halt ?? 0)), "the other line keeps walking");
  const stood = { x: lineA[0].x, y: lineA[0].y };
  step(api, 1.5);
  assert.deepEqual({ x: lineA[0].x, y: lineA[0].y }, stood, "standing still");
  step(api, 0.7);
  assert.notDeepEqual({ x: lineA[0].x, y: lineA[0].y }, stood, "then on it goes");
  // A gosling that isn't the leader stops nobody.
  shoot(api, lineB.find((g) => !g.leader)!, 1e6);
  assert.ok(lineB.every((g) => !(g.halt ?? 0)));
});

test("Matriarch: her rally speeds every goose 50% for 3 seconds and doesn't speed cats", () => {
  const { api, add } = lab();
  const boss = add("goose", 15, 6, 7, { matriarch: true, boss: true, rallyCd: 0.001, hp: 1e6, maxHp: 1e6, speed: 0.0001 });
  const goose = add("goose", 12, 2, 6, { speed: 60 });
  const cat = add("cat", 5, 8, 2, { speed: 60 });
  const stride = (e: Foe, c: number, r: number, wp: number) => {
    Object.assign(e, { x: center(c), y: center(r), wp });
    const x = e.x;
    const y = e.y;
    stepWorld(api.world, 1 / 60);
    return Math.hypot(e.x - x, e.y - y);
  };
  stepWorld(api.world, 1 / 60);
  assert.ok((goose.rallied ?? 0) > SIEGE.rallyTime - 0.1, "the goose is rallied");
  assert.ok(!(cat.rallied ?? 0), "the cat is not");
  assert.ok(api.world.floaters.some((f) => f.text === "RALLY!"));
  const fast = stride(goose, 12, 2, 6);
  const plain = stride(cat, 5, 8, 2);
  assert.ok(Math.abs(fast - (60 * SIEGE.rallySpeed) / 60) < 0.01, `goose ${fast}`);
  assert.ok(Math.abs(plain - 1) < 0.01, `cat ${plain}`);
  step(api, SIEGE.rallyTime);
  assert.ok(!(goose.rallied ?? 0), "it wears off");
  assert.ok(Math.abs(stride(goose, 12, 2, 6) - 1) < 0.01, "back to its own pace");
  assert.ok((boss.rallyCd ?? 0) > 0, "she rallies again in a few seconds");
});

// ── Cats ────────────────────────────────────────────────────────────────────

test("Private Whiskers: a lethal hit leaves it at 30% once; the next lethal hit kills it; one big hit from full kills it outright", () => {
  const { api, w, add } = lab();
  const cat = add("cat", 5, 8, 2, { lives9: true });
  shoot(api, cat, 120);
  assert.ok(w.enemies.includes(cat), "back on its feet");
  assert.equal(cat.hp, 100 * SIEGE.nineLives);
  assert.ok(w.floaters.some((f) => f.text === "8"));
  shoot(api, cat, 50);
  assert.ok(!w.enemies.includes(cat), "the ninth life was the last");
  assert.equal(w.runLog.oneLife, 0);
  // From full health, one hit worth both lives.
  const big = add("cat", 5, 8, 2, { lives9: true });
  shoot(api, big, 100 * SIEGE.oneLife);
  assert.ok(!w.enemies.includes(big));
  assert.equal(w.runLog.oneLife, 1);
  // The same hit on a scratched one only uses up the first life.
  const scratched = add("cat", 5, 8, 2, { lives9: true, hp: 90 });
  shoot(api, scratched, 100 * SIEGE.oneLife);
  assert.equal(scratched.hp, 100 * SIEGE.nineLives);
});

test("Box Cat: aimed shots can't target it; splash or burn knocks the box off, then aimed shots work; a Reading Lamp does it too", () => {
  const { api, w, add } = lab();
  const cannon = build(api, "melon", 12, 1);
  const boxed = add("cat", 12, 2, 6, { boxed: true, speed: 0.0001 });
  cannon.cd = 0;
  step(api, 0.2);
  assert.equal(w.shots.filter((s) => s.target === boxed.id).length, 0, "nothing aims at a box");
  // A splash next to it.
  const dummy = add("cat", 12, 2, 6, { x: boxed.x + 30, speed: 0.0001 });
  cannon.cd = 10;
  shoot(api, dummy, 5, { splash: 40 });
  assert.equal(boxed.boxed, false, "the splash knocked it off");
  w.enemies = w.enemies.filter((e) => e !== dummy);
  cannon.cd = 0;
  w.shots = [];
  stepWorld(w, 1 / 60);
  assert.equal(w.shots.filter((s) => s.target === boxed.id).length, 1, "an ordinary cat now");
  assert.ok(!boxed.lives9, "and no Nine Lives");

  // Fire on the carpet does it too.
  const burnt = add("cat", 13, 2, 6, { boxed: true, speed: 0.0001 });
  w.pools.push({ x: burnt.x, y: burnt.y, r: 30, life: 1, max: 1, hot: true, burn: 22 });
  stepWorld(w, 1 / 60);
  assert.equal(burnt.boxed, false);
  // And a Reading Lamp's light.
  const lit = add("cat", 8, 9, 4, { boxed: true, speed: 0.0001 });
  build(api, "lantern", 9, 9);
  stepWorld(w, 1 / 60);
  assert.equal(lit.boxed, false);
  assert.equal(w.runLog.boxesOff, 3);
});

test("Paratroopers: the drop point glows for 3 seconds, then they land on it, not at the entrance", () => {
  const api = siege();
  const w = api.world;
  skipTo(api, 7);
  assert.deepEqual(w.hud.dropWave, [0], "the wave's drop point is marked before it starts");
  api.startWave();
  let t = 0;
  while (!w.landings.length && t < 20) {
    stepWorld(w, 1 / 60);
    t += 1 / 60;
  }
  assert.ok(w.landings.length, "a drop is on the way");
  assert.ok(w.hud.dropSeen);
  assert.ok(!w.enemies.some((e) => e.para), "nobody has landed yet");
  const [c, r] = BOARDS.courtyard.drops![0];
  step(api, SIEGE.dropGlow - 0.1);
  assert.ok(!w.enemies.some((e) => e.para), "still glowing");
  step(api, 0.2);
  const para = w.enemies.find((e) => e.para)!;
  assert.ok(para, "landed");
  assert.ok(Math.hypot(para.x - center(c), para.y - center(r)) < 1, "on the drop point");
  assert.ok((para.descend ?? 0) > 0, "still under its parachute");
  const entrance = w.points[0];
  assert.ok(Math.hypot(para.x - entrance.x, para.y - entrance.y) > CELL * 5, "nowhere near the entrance");
  // Once down, it walks on along the carpet from there.
  const from = along(api, para);
  step(api, SIEGE.dropFall + 0.5);
  assert.ok(along(api, para) > from);
});

test("Cardboard Tank: a hit from a tower ahead does half, from behind the full amount; a leak costs 2", () => {
  const { api, w, add } = lab();
  const ahead = build(api, "melon", 14, 1);
  const behind = build(api, "melon", 10, 1);
  const tank = add("cat", 12, 2, 6, { tank: true, hp: 1000, maxHp: 1000, speed: 0.0001 });
  shoot(api, tank, 40, { owner: ahead.id });
  assert.equal(tank.hp, 1000 - 40 * SIEGE.tankArmour, "into the front armour");
  shoot(api, tank, 40, { owner: behind.id });
  assert.equal(tank.hp, 1000 - 40 * SIEGE.tankArmour - 40, "from behind");
  // Splash is judged from where the shot lands: just ahead of the tank, or just behind it.
  const front = add("goose", 12, 2, 6, { x: tank.x + 30, honked: true, speed: 0.0001 });
  const hp = tank.hp;
  // (A splash always does at least 6.)
  shoot(api, front, 1, { splash: 40, owner: behind.id });
  assert.equal(tank.hp, hp - 6 * SIEGE.tankArmour, "splash landing in front of it");
  const rear = add("goose", 12, 2, 6, { x: tank.x - 30, honked: true, speed: 0.0001 });
  shoot(api, rear, 1, { splash: 40, owner: ahead.id });
  assert.equal(tank.hp, hp - 6 * SIEGE.tankArmour - 6, "splash landing behind it");
  w.enemies = w.enemies.filter((e) => e !== front && e !== rear);

  const lives = w.hud.lives;
  const last = w.points[w.points.length - 1];
  add("cat", 21, 12, w.points.length - 1, { tank: true, x: last.x - 0.2, y: last.y });
  stepWorld(w, 1 / 60);
  assert.equal(w.hud.lives, lives - SIEGE.tank.leak);
});

test("General Mittens: while she's alive cats have +25% health (new and old); when she dies they walk back 2 s and lose it", () => {
  const api = siege();
  const w = api.world;
  skipTo(api, 9);
  api.startWave();
  const base = Math.round(STATS.cat.hp * hpScaleFor("siege", 9));
  let early: Foe[] = [];
  for (let i = 0; i < 60 * 10 && !w.enemies.some((e) => e.general); i++) {
    stepWorld(w, 1 / 60);
    if (!w.enemies.some((e) => e.general)) early = w.enemies.filter((e) => e.kind === "cat");
  }
  const general = w.enemies.find((e) => e.general)!;
  assert.ok(general && general.boss);
  assert.ok(early.length > 0, "cats were already on the carpet");
  for (const c of early) {
    assert.ok(c.mittened);
    assert.ok(Math.abs(c.maxHp - base * SIEGE.generalBonus) < 1e-6, "the ones already here");
  }
  for (let i = 0; i < 60 * 6 && !w.enemies.some((e) => e.boxed); i++) stepWorld(w, 1 / 60);
  const late = w.enemies.find((e) => e.boxed)!;
  assert.ok(late.mittened && Math.abs(late.maxHp - base * SIEGE.generalBonus) < 1e-6, "new ones too");
  shoot(api, general, 1e7);
  assert.ok(!w.enemies.includes(general));
  const cats = w.enemies.filter((e) => e.kind === "cat");
  assert.ok(cats.length >= early.length);
  for (const c of cats) {
    assert.ok(!c.mittened);
    assert.ok(Math.abs(c.maxHp - base) < 1e-6, "the bonus is gone");
    assert.ok((c.driven ?? 0) > SIEGE.scatter - 0.1, "scattering back down the carpet");
  }
  const cat = cats[0];
  const from = along(api, cat);
  step(api, 1);
  assert.ok(along(api, cat) < from, "walking back");
});

// ── The feud ────────────────────────────────────────────────────────────────

test("the feud: a goose and a cat within half a tile both stop 2 s and lose 10% of max health, once per pair; bosses don't stop", () => {
  const { api, w, add } = lab();
  const goose = add("goose", 12, 2, 6, { honked: true });
  const cat = add("cat", 12, 2, 6, { x: center(12) + 10 });
  stepWorld(w, 1 / 60);
  assert.equal(goose.hp, 100 - 100 * SIEGE.feudHit);
  assert.equal(cat.hp, 100 - 100 * SIEGE.feudHit);
  assert.ok((goose.halt ?? 0) > SIEGE.feudTime - 0.1 && (cat.halt ?? 0) > SIEGE.feudTime - 0.1);
  assert.equal(w.runLog.feuds, 1);
  assert.equal(w.hud.feuds, 1);
  assert.equal(w.brawls.length, 1, "a dust cloud");
  const at = { x: goose.x, y: goose.y };
  step(api, 1.5);
  assert.deepEqual({ x: goose.x, y: goose.y }, at, "both stand still");
  step(api, 0.7);
  assert.notDeepEqual({ x: goose.x, y: goose.y }, at, "then walk on");
  // The same pair doesn't fight twice.
  Object.assign(cat, { x: goose.x + 5, y: goose.y, wp: goose.wp });
  stepWorld(w, 1 / 60);
  assert.equal(goose.hp, 90);
  assert.equal(w.runLog.feuds, 1);

  // One fight at a time: a second goose that walks up to a cat mid-fight goes past.
  const cat2 = add("cat", 5, 7, 2);
  const first = add("goose", 5, 7, 2, { y: center(7) - 10, honked: true });
  stepWorld(w, 1 / 60);
  assert.equal(w.runLog.feuds, 2);
  const second = add("goose", 5, 7, 2, { y: cat2.y + 10, honked: true });
  stepWorld(w, 1 / 60);
  assert.equal(w.runLog.feuds, 2, "the cat is busy");
  assert.equal(second.hp, 100);
  assert.ok(!(second.halt ?? 0), "so this goose walks on");
  void first;
  void cat2;

  // A boss never stops for it, and a cat doesn't pick a fight with one.
  const boss = add("goose", 15, 6, 7, { matriarch: true, boss: true, rallyCd: 99, hp: 1000, maxHp: 1000 });
  const brave = add("cat", 15, 6, 7, { x: center(15), y: center(6) + 8 });
  stepWorld(w, 1 / 60);
  assert.equal(boss.hp, 1000);
  assert.ok(!(boss.halt ?? 0));
  assert.equal(brave.hp, 100);
  assert.equal(w.runLog.feuds, 2);
});

// ── Quackarot's payoff ──────────────────────────────────────────────────────

test("the Anti-Geese Protocol: a goose is thrown twice as far as a cat and walks back 2 more tiles; a boss only takes the knock", () => {
  const { api, w, add } = lab("quack");
  const protocol = build(api, "geese", 16, 6);
  api.pointer(protocol.x, protocol.y, "down");
  api.setTrigger("manual");
  const cat = add("cat", 15, 7, 7, { hp: 1000, maxHp: 1000 });
  const goose = add("goose", 15, 5, 7, { hp: 1000, maxHp: 1000 });
  const boss = add("goose", 15, 6, 7, { matriarch: true, boss: true, rallyCd: 99, hp: 1000, maxHp: 1000 });
  const before = { cat: along(api, cat), goose: along(api, goose), boss: along(api, boss) };
  api.engage();
  assert.ok(!w.towers.includes(protocol), "spent");
  assert.ok(Math.abs(before.cat - along(api, cat) - CANNON.geeseShove) < 0.5, "a cat goes three tiles");
  assert.ok(Math.abs(before.goose - along(api, goose) - CANNON.geeseShove * SIEGE.protocolThrow) < 0.5, "a goose twice as far");
  assert.ok(Math.abs(before.boss - along(api, boss)) < 0.5, "the Matriarch isn't moved");
  assert.equal(boss.hp, 1000 - CANNON.geeseDamage, "she takes the knock");
  assert.equal(goose.panic, SIEGE.protocolPanic);
  assert.ok(!cat.panic, "only geese panic");
  assert.equal(w.runLog.protocolGeese, 1);
  // The panic: two more tiles back, then on again.
  const thrown = along(api, goose);
  for (let i = 0; i < 60 * 5 && (goose.panic ?? 0) > 0; i++) stepWorld(w, 1 / 60);
  assert.ok(Math.abs(thrown - along(api, goose) - SIEGE.protocolPanic) < 2, `${thrown - along(api, goose)}`);
  const settled = along(api, goose);
  step(api, 0.3);
  assert.ok(along(api, goose) > settled, "walking on");
});

// ── Achievements ────────────────────────────────────────────────────────────

function night(over: Partial<Omit<NightContext, "log">> & { log?: Partial<RunLog> } = {}): NightContext {
  const { log, ...rest } = over;
  return {
    hero: "mynxi",
    night: "siege",
    difficulty: "normal",
    map: "courtyard",
    won: true,
    cleared: 15,
    seeds: 100,
    stacks: 10,
    slips: [],
    ledger: emptyLedger() as Ledger,
    endlessBest: 0,
    fragmentsEarned: 0,
    rooms: ["stacks"],
    ...rest,
    log: { ...emptyRunLog(), ...log },
  };
}
const passes = (id: string, c: NightContext) => ACHIEVEMENT[id].check(c);

test("Courtyard achievements: each awards on its condition and not otherwise", () => {
  for (const id of ["siege", "siege-hard", "feud", "protocol", "out-of-box", "nine-lives"]) {
    assert.equal(ACHIEVEMENT[id].shelf, "atlas", id);
    assert.equal(ACHIEVEMENT[id].set, "Courtyard", id);
  }
  assert.deepEqual(
    ["siege", "siege-hard", "feud", "protocol", "out-of-box", "nine-lives"].map((id) => ACHIEVEMENT[id].tier),
    [2, 3, 2, 2, 1, 1],
  );
  const quiet = night({ won: false, cleared: 7 });
  for (const id of ["siege", "siege-hard", "feud", "protocol", "out-of-box", "nine-lives"]) assert.ok(!passes(id, quiet), id);

  assert.ok(passes("siege", night()));
  assert.ok(!passes("siege", night({ night: "overflow", map: "overflow" })), "another night");
  assert.ok(!passes("siege", night({ won: false })));

  assert.ok(passes("siege-hard", night({ difficulty: "hard" })));
  assert.ok(passes("siege-hard", night({ difficulty: "overdue" })));
  assert.ok(!passes("siege-hard", night({ difficulty: "normal" })));
  assert.ok(!passes("siege-hard", night({ difficulty: "hard", night: "midnight", map: "stacks" })));

  assert.ok(passes("feud", night({ won: false, log: { feuds: 25 } })), "won or not");
  assert.ok(!passes("feud", night({ log: { feuds: 24 } })));
  assert.ok(passes("protocol", night({ won: false, log: { protocolGeese: 10 } })));
  assert.ok(!passes("protocol", night({ log: { protocolGeese: 9 } })));
  assert.ok(passes("out-of-box", night({ won: false, log: { boxesOff: 20 } })));
  assert.ok(!passes("out-of-box", night({ log: { boxesOff: 19 } })));
  assert.ok(passes("nine-lives", night({ won: false, log: { oneLife: 1 } })));
  assert.ok(!passes("nine-lives", night({ log: { oneLife: 0 } })));
});

test("Courtyard achievements count from real play: fights, Protocol throws, boxes and one-hit kills land in the run log", () => {
  const { api, w, add } = lab("quack");
  const goose = add("goose", 12, 2, 6, { honked: true });
  add("cat", 12, 2, 6, { x: center(12) + 8 });
  stepWorld(w, 1 / 60);
  assert.equal(w.runLog.feuds, 1);
  const boxed = add("cat", 8, 9, 4, { boxed: true, speed: 0.0001 });
  w.pools.push({ x: boxed.x, y: boxed.y, r: 30, life: 1, max: 1, hot: true, burn: 22 });
  stepWorld(w, 1 / 60);
  assert.equal(w.runLog.boxesOff, 1);
  const whiskers = add("cat", 5, 8, 2, { lives9: true });
  shoot(api, whiskers, 200);
  assert.equal(w.runLog.oneLife, 1);
  void goose;
});
