import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  BOARDS,
  CELL,
  FLOOR,
  NATIVES,
  NATIVE_INFO,
  STATS,
  assignNatives,
  createWorld,
  emptyProgress,
  stepWorld,
  waveAt,
  waveQueue,
  type Difficulty,
  type MapId,
  type SpawnSpec,
} from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

/** A Midnight night on `map` with nothing built, plenty of stacks, and the first fruit on the carpet. */
function night(map: MapId, difficulty: Difficulty = "normal") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map, hero: "mynxi", difficulty } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 999;
  api.world.hud.maxLives = 999;
  api.startWave();
  for (let i = 0; i < 600 && !api.world.enemies.length; i++) stepWorld(api.world, 1 / 60);
  assert.ok(api.world.enemies.length, "a fruit is out");
  template.set(api.world, { ...api.world.enemies[0] });
  return api;
}
const template = new WeakMap<object, object>();
type Api = ReturnType<typeof night>;
type Fruit = Api["world"]["enemies"][number];

/** Keep only the first fruit, turned into `native`, and give it plenty of health. */
function only(api: Api, native: Fruit["native"], extra: Partial<Fruit> = {}): Fruit {
  const e = api.world.enemies.find((f) => f.hp > 0) ?? ({ ...template.get(api.world), id: -9000 - api.world.shots.length } as Fruit);
  api.world.enemies = [e];
  Object.assign(e, { native, hp: 1000, maxHp: 1000, chill: 0, freeze: 0, driven: 0, stomped: 0, honeyed: 0, ink: 0, guard: "none", shell: 0 }, extra);
  return e;
}

/** Put `e` in the middle of tile (c, r) heading for waypoint `wp`, step one frame, and return how far it moved. */
function stride(api: Api, e: Fruit, c: number, r: number, wp: number, set: Partial<Fruit> = {}) {
  Object.assign(e, { x: center(c), y: center(r), wp, reverse: false }, set);
  const x = e.x;
  const y = e.y;
  stepWorld(api.world, 1 / 60);
  return Math.hypot(e.x - x, e.y - y);
}

/** A direct hit (or a splash shot) on `e`, landing next frame. */
function shoot(api: Api, e: Fruit, dmg: number, splash = 0) {
  api.world.shots.push({ id: 9e6 + api.world.shots.length + Math.random(), x: e.x, y: e.y, tx: e.x, ty: e.y, target: e.id, dmg, life: 1, bounces: 0, orange: false, splash, element: "shot", procs: false, splashRatio: splash ? 0.5 : 0, chill: 0, freezeExtra: 0, fireLife: 0, fireBurn: 0, pulp: false });
}

const seconds = (api: Api, s: number) => {
  for (let i = 0; i < Math.round(s * 60); i++) stepWorld(api.world, 1 / 60);
};

const spawns = (list: SpawnSpec[]) => waveQueue(list);
const natives = (items: ReturnType<typeof waveQueue>) => items.map((q) => q.native);

// ── Swaps ──────────────────────────────────────────────────────────────────

test("swaps: from wave 4 every 4th plain corn becomes the room's common, and nothing else changes", () => {
  const list: SpawnSpec[] = [
    { kind: "corn", count: 9, every: 0.5 },
    { kind: "melon", count: 4, every: 0.5 },
  ];
  const before = spawns(list);
  assert.deepEqual(natives(assignNatives(spawns(list), BOARDS.sorting.natives, 3, "normal")), before.map(() => null), "wave 3: none yet");
  const items = assignNatives(spawns(list), BOARDS.sorting.natives, 4, "normal");
  const corn = items.filter((q) => q.kind === "corn");
  assert.deepEqual(
    corn.map((q) => q.native),
    corn.map((_, i) => ((i + 1) % NATIVES.commonEvery === 0 ? "express" : null)),
  );
  assert.ok(items.filter((q) => q.kind === "melon").every((q) => q.native === null), "melons stay melons");
  // Everything else about each fruit is untouched.
  assert.deepEqual(items.map(({ native: _n, ...rest }) => rest), before.map(({ native: _n, ...rest }) => rest));
  // The other two rooms swap in their own commons.
  assert.ok(natives(assignNatives(spawns(list), BOARDS.greenhouse.natives, 4, "normal")).includes("sprout"));
  assert.ok(natives(assignNatives(spawns(list), BOARDS.belltower.natives, 4, "normal")).includes("chimer"));
});

test("swaps: from wave 10 the first plain pumpkin is the elite; in act three the first two; never on Story", () => {
  const list: SpawnSpec[] = [{ kind: "pumpkin", count: 4, every: 1 }];
  assert.deepEqual(natives(assignNatives(spawns(list), BOARDS.sorting.natives, 9, "normal")), [null, null, null, null]);
  assert.deepEqual(natives(assignNatives(spawns(list), BOARDS.sorting.natives, 10, "normal")), ["parcel", null, null, null]);
  assert.deepEqual(natives(assignNatives(spawns(list), BOARDS.sorting.natives, NATIVES.actThreeFrom, "normal")), ["parcel", "parcel", null, null]);
  assert.deepEqual(natives(assignNatives(spawns(list), BOARDS.greenhouse.natives, 21, "hard")), ["squash", "squash", null, null]);
  assert.deepEqual(natives(assignNatives(spawns(list), BOARDS.belltower.natives, 12, "overdue")), ["gargoyle", null, null, null]);
  // Story: commons still come, elites never.
  const story = assignNatives(spawns([...list, { kind: "corn", count: 4, every: 0.5 }]), BOARDS.sorting.natives, 18, "easy");
  assert.ok(!natives(story).includes("parcel"), "no elite on Story");
  assert.ok(natives(story).includes("express"), "commons on Story");
});

test("swaps: the Stacks and the other rooms have none; flagged fruit, Karl and chute fruit are never swapped", () => {
  for (const map of Object.keys(BOARDS) as MapId[]) {
    if (map === "sorting" || map === "greenhouse" || map === "belltower") continue;
    assert.equal(BOARDS[map].natives, undefined, map);
  }
  const busy: SpawnSpec[] = [
    { kind: "corn", count: 8, every: 0.3, guard: "husk" },
    { kind: "corn", count: 8, every: 0.3, borrower: true },
    { kind: "corn", count: 8, every: 0.3, chute: true },
    { kind: "pumpkin", count: 3, every: 0.5, gall: true },
    { kind: "pumpkin", count: 3, every: 0.5, pit: true },
    { kind: "pumpkin", count: 3, every: 0.5, guard: "rind" },
    { kind: "pumpkin", count: 3, every: 0.5, chute: true },
    { kind: "karl", count: 1, every: 1 },
  ];
  assert.ok(natives(assignNatives(spawns(busy), BOARDS.sorting.natives, 18, "normal")).every((n) => n === null), "nothing flagged is swapped");
  assert.ok(natives(assignNatives(spawns([...busy, { kind: "corn", count: 4, every: 0.5 }]), BOARDS.stacks.natives, 18, "normal")).every((n) => n === null), "the Stacks");
  // With plain fruit added, only those are swapped.
  const mixed = assignNatives(spawns([...busy, { kind: "corn", count: 4, every: 0.5 }, { kind: "pumpkin", count: 1, every: 0.5 }]), BOARDS.sorting.natives, 18, "normal");
  for (const q of mixed) if (q.native) assert.ok(q.guard === "none" && !q.borrower && !q.chute && !q.gall && !q.pit && q.kind !== "karl");
  assert.equal(mixed.filter((q) => q.native === "express").length, 1);
  assert.equal(mixed.filter((q) => q.native === "parcel").length, 1);
});

test("a room's fruit spawn into a real wave with their log line, and only on their own room", () => {
  // Midnight wave 5 has enough plain corn for one swap.
  const corn = waveQueue(waveAt(4, "midnight").spawns).filter((q) => q.kind === "corn" && q.guard === "none" && !q.borrower && !q.chute).length;
  assert.ok(corn >= NATIVES.commonEvery, "wave 5 has a 4th plain corn");
  for (const [map, native] of [["sorting", "express"], ["stacks", null]] as const) {
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map, hero: "mynxi" } });
    api.openSetup();
    api.chooseHero("mynxi");
    api.beginNight();
    const w = api.world;
    w.hud.lives = 999;
    // Clear waves 1-4 (emptying the carpet, taking the first card on every shelf) until wave 5 is next.
    const fifth = waveAt(4, "midnight").name;
    for (let n = 0; n < 20; n++) {
      if (w.hud.phase === "upgrade") {
        api.pickUpgrade(w.hud.offer[0].id);
        continue;
      }
      if (w.hud.phase === "prep" && w.hud.waveName === fifth) break;
      api.startWave();
      for (let i = 0; i < 60 * 240 && (w.hud.phase as string) === "combat"; i++) {
        w.enemies.length = 0;
        stepWorld(w, 1 / 60);
      }
    }
    api.startWave();
    assert.equal(w.hud.wave, 5);
    let seen: string | null = null;
    for (let i = 0; i < 60 * 30 && !seen; i++) {
      stepWorld(w, 1 / 60);
      const e = w.enemies.find((f) => f.native);
      if (e) seen = e.native ?? null;
      for (const f of w.enemies) f.hp = Math.max(f.hp, 1);
    }
    assert.equal(seen, native, map);
    if (native) {
      assert.deepEqual(w.hud.nativesSeen, [native]);
      assert.equal(w.hud.log, NATIVE_INFO[native].line);
    } else assert.deepEqual(w.hud.nativesSeen, []);
  }
});

// ── The Sorting Room ─────────────────────────────────────────────────────

test("Express Corn: on a belt nothing slows, stops, sticks or drives it, and it rides at 2×; off the belt everything works", () => {
  const api = night("sorting");
  const e = only(api, "express");
  // Sorting corners: 0 [0,3], 1 [6,3], 2 [6,10]. [3,3] is plain carpet; [6,6] is a belt.
  const plain = stride(api, e, 3, 3, 1);
  const belt = stride(api, e, 6, 6, 2);
  assert.ok(Math.abs(belt / plain - NATIVES.expressBelt) < 0.02, `belt ${belt / plain}`);
  const held = stride(api, e, 6, 6, 2, { freeze: 3, chill: 3, stomped: 3, honeyed: 3, driven: 3 });
  assert.ok(Math.abs(held / plain - NATIVES.expressBelt) < 0.02, `held on a belt ${held / plain}`);
  for (const k of ["freeze", "chill", "stomped", "honeyed", "driven"] as const) assert.equal(e[k], 0, `${k} cleared on the belt`);
  // A puddle on the belt doesn't slow it either.
  api.world.pools.push({ x: center(6), y: center(6), r: 40, life: 5, max: 5, hot: false, burn: 0 });
  assert.ok(Math.abs(stride(api, e, 6, 6, 2) / plain - NATIVES.expressBelt) < 0.02, "a puddle on the belt");
  api.world.pools = [];
  // Off the belt it is an ordinary corn.
  assert.equal(stride(api, e, 3, 3, 1, { freeze: 3 }), 0, "frozen off the belt");
  assert.ok(stride(api, e, 3, 3, 1, { freeze: 0, chill: 3 }) < plain * 0.9, "chilled off the belt");
  assert.ok((e.chill ?? 0) > 0);
  stride(api, e, 3, 3, 1, { chill: 0, stomped: 3 });
  assert.ok((e.stomped ?? 0) > 0, "stunned off the belt");
  Object.assign(e, { stomped: 0, driven: 2, x: center(3), y: center(3), wp: 1 });
  const x0 = e.x;
  stepWorld(api.world, 1 / 60);
  assert.ok(e.x < x0, "driven back off the belt");
  // A plain corn on the belt is still stopped by a freeze.
  const plainCorn = only(api, undefined);
  assert.equal(stride(api, plainCorn, 6, 6, 2, { freeze: 3 }), 0, "a plain corn freezes on the belt");
});

test("Parcel: direct hits do half while wrapped; one splash hit tears the paper; popping drops 3 corn that pay nothing", () => {
  const api = night("sorting");
  const w = api.world;
  const e = only(api, "parcel", { wrapped: true, speed: 0, x: center(3), y: center(3), wp: 1 });
  shoot(api, e, 40);
  stepWorld(w, 1 / 60);
  assert.ok(Math.abs(1000 - e.hp - 40 * NATIVES.parcelWrapped) < 0.01, `wrapped direct hit: lost ${1000 - e.hp}`);
  assert.equal(e.wrapped, true);
  // A splash shot on a decoy beside it.
  const decoy = { ...e, id: -77, native: undefined, wrapped: false, hp: 1000, maxHp: 1000 };
  w.enemies.push(decoy);
  shoot(api, decoy, 40, 60);
  stepWorld(w, 1 / 60);
  assert.equal(e.wrapped, false, "splash tore the paper");
  w.enemies = [e];
  const before = e.hp;
  shoot(api, e, 40);
  stepWorld(w, 1 / 60);
  assert.ok(Math.abs(before - e.hp - 40) < 0.01, `unwrapped: full damage (${before - e.hp})`);
  // A burning pool tears it too.
  const other = only(api, "parcel", { wrapped: true, speed: 0 });
  w.pools.push({ x: other.x, y: other.y, r: 30, life: 5, max: 5, hot: true, burn: 22 });
  stepWorld(w, 1 / 60);
  assert.equal(other.wrapped, false, "fire tore the paper");
  w.pools = [];
  // Popping it: three corn walk out where it stood.
  const at = { x: other.x, y: other.y };
  other.hp = 1;
  const seeds = w.hud.seeds;
  shoot(api, other, 40);
  stepWorld(w, 1 / 60);
  const contents = w.enemies.filter((f) => f.contents && f.hp > 0);
  assert.equal(contents.length, NATIVES.parcelContents);
  for (const c of contents) {
    assert.equal(c.kind, "corn");
    assert.equal(c.native, undefined, "ordinary corn, not Express");
    assert.ok(Math.hypot(c.x - at.x, c.y - at.y) < 30, "where it stood");
  }
  assert.ok(w.hud.seeds > seeds, "the parcel itself pays");
  const paid = w.hud.seeds;
  for (const c of contents) {
    c.hp = 1;
    shoot(api, c, 40);
  }
  stepWorld(w, 1 / 60);
  assert.equal(w.enemies.filter((f) => f.contents && f.hp > 0).length, 0, "all three popped");
  assert.equal(w.hud.seeds, paid, "the contents pay nothing");
  // Killed still wrapped counts for Opened by Mistake.
  const sealed = only(api, "parcel", { wrapped: true, speed: 0, hp: 1 });
  shoot(api, sealed, 40);
  stepWorld(w, 1 / 60);
  assert.equal(w.runLog.parcelWrappedKills, 1);
});

// ── The Greenhouse ───────────────────────────────────────────────────────

test("Sprout: 2 s on the beds grows it into a melon at the same health share; burning stops it; killed early it never grows", () => {
  const api = night("greenhouse");
  const w = api.world;
  // Greenhouse corners: 2 [4,2], 3 [10,2]; [7,2] is a bed. Hold it still on the bed.
  const e = only(api, "sprout", { bedTime: 0, kind: "corn", r: NATIVES.sproutR, speed: STATS.corn.speed, x: center(7), y: center(2), wp: 3, freeze: 99 });
  e.hp = e.maxHp = 180;
  seconds(api, NATIVES.sproutGrow - 0.2);
  assert.equal(e.kind, "corn", "not yet");
  e.hp = e.maxHp * 0.6;
  seconds(api, 0.25);
  assert.equal(e.kind, "melon", "grew");
  assert.equal(e.native, undefined);
  assert.equal(e.maxHp, Math.round((180 * STATS.melon.hp) / STATS.corn.hp));
  assert.ok(Math.abs(e.hp / e.maxHp - 0.6) < 0.03, `share ${e.hp / e.maxHp}`);
  assert.ok(Math.abs(e.speed - STATS.melon.speed) < 0.01, `melon speed ${e.speed}`);
  assert.equal(w.runLog.sproutsGrown, 1);

  // Burning on the bed: no growing.
  const burning = only(api, "sprout", { bedTime: 0, kind: "corn", x: center(7), y: center(2), wp: 3, freeze: 99, hp: 100000, maxHp: 100000 });
  w.pools.push({ x: burning.x, y: burning.y, r: 30, life: 9, max: 9, hot: true, burn: 22 });
  seconds(api, NATIVES.sproutGrow + 1);
  assert.equal(burning.kind, "corn", "a burning sprout doesn't grow");
  w.pools = [];

  // Killed off the beds: never grows.
  const early = only(api, "sprout", { bedTime: 0, kind: "corn", x: center(4), y: center(8), wp: 2, hp: 1 });
  shoot(api, early, 40);
  seconds(api, 3);
  assert.ok(early.hp <= 0);
  assert.equal(early.kind, "corn");
  assert.equal(w.runLog.sproutsGrown, 1, "still only the first");
});

test("Creeping Squash: a vine every 1.5 s heals like a bed; never on a bed or another vine; fire burns it; it withers after the squash", () => {
  const api = night("greenhouse");
  const w = api.world;
  // [4,6] is plain carpet on the Greenhouse's long climb.
  const sq = only(api, "squash", { vineCd: NATIVES.vineEvery, x: center(4), y: center(6), wp: 2, freeze: 99 });
  seconds(api, NATIVES.vineEvery - 0.1);
  assert.equal(w.vines.size, 0, "not yet");
  seconds(api, 0.2);
  assert.ok(w.vines.has("4,6"), "a vine where it stands");
  // Another 1.5 s on the same tile: no second vine stacked there.
  seconds(api, NATIVES.vineEvery);
  assert.equal(w.vines.size, 1);
  assert.ok(w.vines.get("4,6")!.life < NATIVES.vineLife - 1, "the first vine wasn't renewed");
  // A hurt fruit on the vine heals.
  const hurt = { ...sq, id: -91, native: undefined, vineCd: undefined, hp: 500, maxHp: 1000, freeze: 99 };
  w.enemies.push(hurt);
  seconds(api, 1);
  assert.ok(Math.abs(hurt.hp - 500 - 1000 * FLOOR.bedHeal) < 6, `healed ${hurt.hp - 500}`);
  // Fire on the tile burns the vine away.
  w.pools.push({ x: center(4), y: center(6), r: 20, life: 2, max: 2, hot: true, burn: 1 });
  stepWorld(w, 1 / 60);
  assert.equal(w.vines.size, 0, "burnt");
  w.pools = [];
  w.enemies = [sq];
  // On a bed: no vine.
  Object.assign(sq, { x: center(7), y: center(2), wp: 3, vineCd: 0.05 });
  seconds(api, 0.2);
  assert.ok(!w.vines.has("7,2"), "no vine on a real bed");
  // Back on plain carpet, lay one, then the squash dies: it withers within a second.
  Object.assign(sq, { x: center(4), y: center(7), wp: 2, vineCd: 0.05 });
  seconds(api, 0.2);
  assert.ok(w.vines.has("4,7"));
  sq.hp = 0;
  seconds(api, NATIVES.vineWither + 0.05);
  assert.equal(w.vines.size, 0, "withered");
});

// ── The Bell Tower ───────────────────────────────────────────────────────

test("Chimer: each one alive runs the clock 25% faster (two: 1.5×), capped at 2×; with none the clock is normal", () => {
  const api = night("belltower");
  const w = api.world;
  const base = only(api, undefined, { freeze: 99 });
  const run = (n: number) => {
    w.enemies = [base];
    for (let i = 0; i < n; i++) w.enemies.push({ ...base, id: -200 - i, native: "chimer" });
    w.bell = { next: FLOOR.bellEvery, quiet: 0 };
    seconds(api, 1);
    return FLOOR.bellEvery - w.bell.next;
  };
  assert.ok(Math.abs(run(0) - 1) < 0.02, "none: normal");
  assert.ok(Math.abs(run(2) - 1.5) < 0.02, "two: 1.5×");
  assert.ok(Math.abs(run(6) - NATIVES.chimerMax) < 0.02, "six: capped at 2×");
  // A rushed strike counts against Quiet Hours.
  w.runLog.chimerEarly = 0;
  w.enemies = [base, { ...base, id: -300, native: "chimer" }];
  w.bell = { next: 0.5, quiet: 0 };
  seconds(api, 0.5);
  assert.ok(w.bell.quiet > 0, "struck");
  assert.equal(w.runLog.chimerEarly, 1);
});

test("Gargoyle Gourd: 3× speed while the towers are silent, 25% less damage otherwise, and the stairs still apply", () => {
  const api = night("belltower");
  const w = api.world;
  const e = only(api, "gargoyle");
  // Bell Tower corners: 1 [3,12], 2 [3,1], 3 [8,1]. [5,1] is plain carpet; [3,6] is an up stair.
  w.bell = { next: 99, quiet: 0 };
  const calm = stride(api, e, 5, 1, 3);
  w.bell = { next: 99, quiet: 2 };
  const awakeStep = stride(api, e, 5, 1, 3);
  assert.ok(Math.abs(awakeStep / calm - NATIVES.gargoyleAwake) < 0.03, `awake ${awakeStep / calm}`);
  w.bell = { next: 99, quiet: 2 };
  const upstairs = stride(api, e, 3, 6, 2);
  assert.ok(Math.abs(upstairs / calm - NATIVES.gargoyleAwake * FLOOR.up) < 0.03, `awake on the stairs ${upstairs / calm}`);
  // Stone skin between strikes; full damage while it's awake.
  w.bell = { next: 99, quiet: 0 };
  Object.assign(e, { hp: 1000, speed: 0 });
  shoot(api, e, 40);
  stepWorld(w, 1 / 60);
  assert.ok(Math.abs(1000 - e.hp - 40 * NATIVES.gargoyleSkin) < 0.01, `skin: lost ${1000 - e.hp}`);
  w.bell = { next: 99, quiet: 2 };
  e.hp = 1000;
  shoot(api, e, 40);
  stepWorld(w, 1 / 60);
  assert.ok(Math.abs(1000 - e.hp - 40) < 0.01, `awake: lost ${1000 - e.hp}`);
  // Killed while the clock silences the towers: Caught Napping.
  e.hp = 1;
  shoot(api, e, 40);
  stepWorld(w, 1 / 60);
  assert.equal(w.runLog.gargoyleQuietKills, 1);
});
