import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ASSER_VALUES,
  CANNON,
  CELL,
  EMPTY_META,
  HEROES,
  KEEPER_TOWERS,
  PERK_LEVELS,
  createWorld,
  emptyProgress,
  levelFor,
  loadProgress,
  stepWorld,
  validateSetup,
  xpForLevel,
  type HeroId,
  type KeeperProgress,
} from "../src/game/engine.ts";
import { keyAction, runKeyAction } from "../src/game/keys.ts";

/** Asser at `level`, with these perk picks (0 or 1 per open tier; the rest default to 0). */
function progress(level = 1, picks: Array<0 | 1> = []): KeeperProgress {
  const p = emptyProgress();
  p.asser = { xp: xpForLevel(level), picks: PERK_LEVELS.map((at, i) => (level >= at ? (picks[i] ?? 0) : null)) };
  return p;
}

function start(hero: HeroId = "asser", keepers: KeeperProgress = progress()) {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers });
  api.openSetup();
  api.pickKeeper(hero);
  api.chooseHero(hero);
  api.beginNight();
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Start the wave and step until a fruit is out. */
function firstFruit(api: Api): Fruit {
  api.startWave();
  for (let i = 0; i < 60 * 30; i++) {
    const e = api.world.enemies.find((f) => f.hp > 0);
    if (e) return e;
    stepWorld(api.world, 1 / 60);
  }
  throw new Error("no fruit");
}

/** Step until `n` fruit are out, and return them. */
function more(api: Api, n: number): Fruit[] {
  const w = api.world;
  for (let i = 0; i < 60 * 40 && w.enemies.filter((f) => f.hp > 0).length < n; i++) stepWorld(w, 1 / 60);
  const out = w.enemies.filter((f) => f.hp > 0).slice(0, n);
  assert.equal(out.length, n, `${n} fruit out`);
  for (const f of out) f.freeze = 999;
  return out;
}

/** Walk `e` onto the door this frame. */
function leak(api: Api, e: Fruit) {
  const w = api.world;
  const last = w.points[w.points.length - 1];
  e.x = last.x;
  e.y = last.y;
  e.wp = w.points.length - 1;
  e.reverse = false;
  e.freeze = 0;
  stepWorld(w, 1 / 60);
}

/** Build a Lion Blade on the first floor tile beside the carpet. */
function buildBlade(api: Api) {
  const w = api.world;
  w.hud.seeds += 9999;
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      if (w.pathCells.has(`${c},${r}`)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      api.chooseBuild("lionblade");
      const n = w.towers.length;
      api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
      if (w.towers.length > n) {
        const t = w.towers[n];
        api.dismissSelection();
        return t;
      }
    }
  throw new Error("no tile for a blade");
}

/** A still, tough, plain fruit at (x, y). */
function hold(e: Fruit, x: number, y: number, extra: Partial<Fruit> = {}) {
  Object.assign(e, { x, y, freeze: 999, hp: 99999, maxHp: 99999, guard: "none", shell: 0, pit: false, boss: false, borrower: false, ...extra });
}

/** Clear the rest of the wave without anyone leaking. */
function clearWave(api: Api) {
  const w = api.world;
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
}

test("Asser starts with 20 stacks and 100 seeds, no towers, his line, and no oath", () => {
  const api = start();
  const w = api.world;
  assert.equal(w.hud.phase, "prep");
  assert.equal(w.hud.lives, 20);
  assert.equal(w.hud.maxLives, 20);
  assert.equal(w.hud.seeds, 100);
  assert.equal(w.towers.length, 0);
  assert.equal(w.hud.oath, null);
  assert.match(w.hud.log, /^“I start with 20 stacks\. I'll lose some\./);
  assert.equal(w.hud.sisu, 0);
});

test("his Keeper tab holds only the Lion Blade; he and Sir Michael can't take each other's towers", () => {
  assert.deepEqual(KEEPER_TOWERS.asser, ["lionblade"]);
  const asser = start();
  asser.chooseBuild("trebuchet");
  assert.notEqual(asser.world.hud.build, "trebuchet");
  asser.chooseBuild("lionblade");
  assert.equal(asser.world.hud.build, "lionblade");
  const michael = createWorld(() => {}, { meta: EMPTY_META });
  michael.openSetup();
  michael.chooseHero("michael");
  michael.pickOath("sling");
  michael.chooseBuild("lionblade");
  assert.notEqual(michael.world.hud.build, "lionblade");
});

test("Material: a leak pays 4 seeds a stack (12 for Karl's 3), a borrower pays nothing, Bitter Ink pays 6", () => {
  const api = start();
  const w = api.world;
  firstFruit(api);
  const [e, karl, thief] = more(api, 3);
  let seeds = w.hud.seeds;
  leak(api, e);
  assert.equal(w.hud.lives, 19);
  assert.equal(w.hud.seeds - seeds, ASSER_VALUES.materialSeeds);
  assert.equal(w.hud.log, "Asser: “That one's going in the book.”");

  hold(karl, 0, 0, { boss: true, kind: "karl" });
  seeds = w.hud.seeds;
  leak(api, karl);
  assert.equal(w.hud.lives, 16);
  assert.equal(w.hud.seeds - seeds, 12);

  hold(thief, 0, 0, { borrower: true });
  w.hud.seeds = 40;
  leak(api, thief);
  assert.equal(w.hud.lives, 16, "no stack");
  assert.equal(w.hud.seeds, 40 - 12, "it takes its seeds and Material pays nothing");

  const inked = start("asser", progress(6, [0, 0, 0]));
  const f = firstFruit(inked);
  const before = inked.world.hud.seeds;
  leak(inked, f);
  assert.equal(inked.world.hud.seeds - before, 6);
});

test("Sisu: +2% a missing stack, capped at 15 stacks (19 with Hard Lessons); healing lowers it; nobody else gets it", () => {
  const api = start();
  const w = api.world;
  const blade = buildBlade(api);
  const dmg = () => api.statsOf(blade.id)!.dmg;
  const base = dmg();
  w.hud.lives = 15;
  assert.equal(dmg(), Math.round(base * 1.1));
  w.hud.lives = 5;
  assert.equal(dmg(), Math.round(base * 1.3), "capped at 30%");
  w.hud.lives = 20 - 18;
  assert.equal(dmg(), Math.round(base * 1.3), "still 30%");
  // A real leak updates the HUD figure; a Karl kill's +2 lowers it by 4 points.
  w.hud.lives = 20;
  const e = firstFruit(api);
  leak(api, e);
  assert.equal(w.hud.sisu, 2);

  const hard = start("asser", progress(6, [0, 1, 1]));
  const hb = buildBlade(hard);
  const hbase = hard.statsOf(hb.id)!.dmg;
  hard.world.hud.lives = 1; // 19 missing, his last stack
  assert.equal(hard.statsOf(hb.id)!.dmg, Math.round(hbase * 1.38), "38% with Hard Lessons");

  const mynxi = start("mynxi", emptyProgress());
  mynxi.world.hud.seeds = 999;
  mynxi.pointer(4 * CELL + CELL / 2, 3 * CELL + CELL / 2, "down");
  const melon = mynxi.world.towers[0];
  const plain = mynxi.statsOf(melon.id)!.dmg;
  mynxi.world.hud.lives = 1;
  assert.equal(mynxi.statsOf(melon.id)!.dmg, plain);
});

test("Sisu in the HUD drops 4 points when Karl's kill heals 2", () => {
  const api = start();
  const w = api.world;
  firstFruit(api);
  const [e, karl] = more(api, 2);
  w.hud.lives = 15;
  leak(api, e); // 14: 6 missing = 12%
  assert.equal(w.hud.sisu, 12);
  Object.assign(karl, { kind: "karl", boss: true, hp: 1, maxHp: 1 });
  const blade = buildBlade(api);
  karl.x = blade.x;
  karl.y = blade.y + 30;
  karl.freeze = 999;
  blade.cd = 0;
  for (let i = 0; i < 30 && karl.hp > 0; i++) stepWorld(w, 1 / 60);
  assert.ok(karl.hp <= 0, "Karl popped");
  assert.equal(w.hud.lives, 16);
  assert.equal(w.hud.sisu, 8);
});

test("the Lion Blade cleaves: every fruit in reach takes the same hit, one outside takes none, a boss too, nothing moves", () => {
  const api = start();
  const w = api.world;
  const blade = buildBlade(api);
  const reach = api.statsOf(blade.id)!.range;
  firstFruit(api);
  for (let i = 0; i < 60 * 20 && w.enemies.filter((f) => f.hp > 0).length < 4; i++) stepWorld(w, 1 / 60);
  const [a, b, c, far] = w.enemies.filter((f) => f.hp > 0);
  assert.ok(far, "four fruit out");
  w.enemies = [a, b, c, far];
  hold(a, blade.x + reach * 0.5, blade.y);
  hold(b, blade.x, blade.y - reach * 0.6);
  hold(c, blade.x - reach * 0.4, blade.y + reach * 0.4, { boss: true });
  hold(far, blade.x + reach + 30, blade.y);
  const at = w.enemies.map((e) => ({ x: e.x, y: e.y, hp: e.hp }));
  blade.cd = 0;
  stepWorld(w, 1 / 60);
  const lost = w.enemies.map((e, i) => at[i].hp - e.hp);
  assert.ok(lost[0] > 0);
  assert.equal(lost[1], lost[0]);
  assert.equal(lost[2], lost[0], "the boss takes the full hit");
  assert.equal(lost[3], 0, "outside the reach");
  w.enemies.forEach((e, i) => assert.deepEqual({ x: e.x, y: e.y }, { x: at[i].x, y: at[i].y }));
  assert.ok(reach > CELL * 1.4 && reach < CELL * 1.6, `about 1.5 tiles (${reach})`);
});

test("Rally: a leak swings the blade at once for 1.5× (2× with Battle Scar); two leaks together are still one rally", () => {
  for (const scar of [false, true]) {
    const api = start();
    const w = api.world;
    const blade = buildBlade(api);
    if (scar) blade.mods.push("scar");
    firstFruit(api);
    const [target, l1, l2] = more(api, 3);
    w.enemies = [target, l1, l2];
    hold(target, blade.x + 20, blade.y);
    hold(l1, 0, 0);
    hold(l2, 0, 0);
    // Both walk onto the door in the same frame; the blade was mid-cooldown.
    const last = w.points[w.points.length - 1];
    for (const l of [l1, l2]) Object.assign(l, { x: last.x, y: last.y, wp: w.points.length - 1, freeze: 0 });
    blade.cd = 5;
    let hp = target.hp;
    stepWorld(w, 1 / 60);
    const normal = api.statsOf(blade.id)!.dmg; // with the Sisu from those two stacks
    const mul = scar ? CANNON.bladeScar : CANNON.bladeRally;
    const rallied = hp - target.hp;
    assert.ok(Math.abs(rallied - normal * mul) < 0.01, `rally swing ${rallied}, expected ${normal * mul}`);
    assert.equal(blade.bladeRally, false);
    hp = target.hp;
    blade.cd = 0;
    stepWorld(w, 1 / 60);
    assert.ok(Math.abs(hp - target.hp - normal) < 0.01, `next swing ${hp - target.hp}, expected ${normal}`);
  }
});

test("a leak resets the blade's cooldown and arms the rally", () => {
  const api = start();
  const w = api.world;
  const blade = buildBlade(api);
  const e = firstFruit(api);
  blade.cd = 5;
  // Nothing in reach, so the rally waits.
  for (const f of w.enemies) if (f !== e) hold(f, 0, 0);
  leak(api, e);
  assert.ok(blade.cd <= 0);
  assert.equal(blade.bladeRally, true);
});

test("Mend: a blade that stood through the wave puts 2 back (3 with Field Dressing, 4 with two), never past max, not if built mid-wave", () => {
  const run = (opts: { dressing?: boolean; two?: boolean; missing: number; midWave?: boolean }) => {
    const api = start("asser", opts.two ? progress(10, [0, 0, 0, 0, 0]) : progress());
    const w = api.world;
    if (!opts.midWave) {
      const b = buildBlade(api);
      if (opts.dressing) b.mods.push("dressing");
      if (opts.two) buildBlade(api);
    }
    api.startWave();
    if (opts.midWave) buildBlade(api);
    w.hud.lives = w.hud.maxLives - opts.missing;
    clearWave(api);
    return w.hud.maxLives - w.hud.lives;
  };
  assert.equal(run({ missing: 6 }), 4);
  assert.equal(run({ missing: 6, dressing: true }), 3);
  assert.equal(run({ missing: 6, two: true }), 2);
  assert.equal(run({ missing: 0 }), 0, "never past max");
  assert.equal(run({ missing: 6, midWave: true }), 6, "built mid-wave: nothing this wave");
});

test("Second Wind: dropping to 5 gives 5 back, once a night", () => {
  const api = start("asser", progress(8, [0, 0, 0, 0]));
  const w = api.world;
  firstFruit(api);
  const [e, again] = more(api, 2);
  w.hud.lives = 6;
  leak(api, e);
  assert.equal(w.hud.lives, 10);
  assert.equal(w.hud.log, "Asser gets back up. “Not yet.”");
  w.hud.lives = 6;
  leak(api, again);
  assert.equal(w.hud.lives, 5);
});

test("key 8 on Setup picks Asser", () => {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openSetup();
  api.setupPage("who");
  const action = keyAction(api.world.hud, "8");
  assert.ok(action);
  runKeyAction(api, action, () => {});
  assert.equal(api.world.hud.hero, "asser");
  assert.equal(HEROES.length, 8);
});

test("saves from before Asser still load: he starts at level 1, and a setup naming him is kept", () => {
  const store = new Map<string, string>();
  const old = Object.fromEntries(HEROES.filter((h) => h !== "asser").map((h) => [h, { xp: 500, picks: [0] }]));
  store.set("melongeddon-keepers", JSON.stringify(old));
  const g = globalThis as { localStorage?: unknown };
  const prev = g.localStorage;
  g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
  try {
    const p = loadProgress();
    assert.equal(levelFor(p.asser.xp), 1);
    assert.ok(levelFor(p.mynxi.xp) > 1, "the others keep theirs");
  } finally {
    g.localStorage = prev;
  }
  const { setup } = validateSetup({ hero: "asser" }, { maps: ["stacks"], unlocked: [] });
  assert.equal(setup.hero, "asser");
});
