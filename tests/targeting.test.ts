import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  CELL,
  DEFAULT_TARGET,
  carpetLegs,
  createWorld,
  emptyProgress,
  stepWorld,
  targetScore,
  type HeroId,
  type TargetMode,
  type TowerKind,
} from "../src/game/engine.ts";
import { keyAction, runKeyAction } from "../src/game/keys.ts";

type Api = ReturnType<typeof createWorld>;
type Fruit = Api["world"]["enemies"][number];
type Tower = Api["world"]["towers"][number];
const center = (n: number) => n * CELL + CELL / 2;

// ── The modes, on a set of fruit with known numbers ────────────────────────

/** A fruit for scoring: `prog` is how far along it is, `d` its distance from the tower. */
interface Pick {
  name: string;
  prog: number;
  d: number;
  e: Partial<Fruit>;
}
const SET: Pick[] = [
  { name: "front", prog: 5000, d: 120, e: { hp: 30, guard: "none", shell: 0, boss: false } },
  { name: "back", prog: 1000, d: 90, e: { hp: 40, guard: "none", shell: 0, boss: false } },
  { name: "near", prog: 3000, d: 20, e: { hp: 50, guard: "none", shell: 0, boss: false } },
  { name: "tough", prog: 2000, d: 100, e: { hp: 200, guard: "none", shell: 0, boss: false } },
  { name: "husk", prog: 1500, d: 110, e: { hp: 35, guard: "husk", shell: 0, boss: false } },
  { name: "karl", prog: 800, d: 130, e: { hp: 150, guard: "none", shell: 0, boss: true } },
  { name: "frail", prog: 2500, d: 60, e: { hp: 5, guard: "none", shell: 0, boss: false } },
];
const tower = (kind: TowerKind) => ({ kind, mods: [] }) as unknown as Tower;

/** The targeting loop's choice: the highest score, a tie going to the one furthest along. */
function pick(mode: TargetMode, kind: TowerKind, set = SET) {
  let best: Pick | null = null;
  let bestScore = -Infinity;
  for (const f of set) {
    const score = targetScore(mode, tower(kind), f.e as Fruit, f.prog, f.d, []);
    if (score > bestScore || (score === bestScore && best && f.prog > best.prog)) {
      bestScore = score;
      best = f;
    }
  }
  return best!.name;
}

test("each mode picks the right fruit", () => {
  assert.equal(pick("first", "melon"), "front");
  assert.equal(pick("last", "melon"), "karl");
  assert.equal(pick("strong", "melon"), "tough");
  assert.equal(pick("weak", "melon"), "frail");
  assert.equal(pick("close", "melon"), "near");
  assert.equal(pick("armour", "melon"), "husk");
  assert.equal(pick("boss", "melon"), "karl");
  // With nothing armoured or no boss in reach, Armoured falls back to First and Boss to Strongest.
  const plain = SET.filter((f) => f.e.guard === "none" && !f.e.boss);
  assert.equal(pick("armour", "melon", plain), "front");
  assert.equal(pick("boss", "melon", plain), "tough");
});

test("defaults: the towers that aren't status towers pick exactly what they did before", () => {
  // Before: furthest along for most; the most health for the Long Reader and the Scales; the Telescope
  // a boss, then armour, then the toughest.
  const before = (kind: TowerKind) => (kind === "reader" || kind === "scales" ? "tough" : kind === "scope" ? "karl" : "front");
  for (const [kind, aim] of Object.entries(DEFAULT_TARGET) as Array<[TowerKind, (typeof DEFAULT_TARGET)[TowerKind]]>) {
    if (!aim || aim.default === "fresh") continue;
    assert.equal(pick(aim.default, kind), before(kind), kind);
  }
  // The Telescope's order: an armoured fruit beats a tougher plain one when there's no boss.
  const noBoss = SET.filter((f) => !f.e.boss);
  assert.equal(pick("boss", "scope", noBoss), "husk");
  assert.equal(pick("boss", "melon", noBoss), "tough", "other towers' Boss falls back to Strongest");
});

test("the recommended modes and the options each kind offers", () => {
  for (const kind of ["fire", "freeze", "still", "ink", "bookworm", "peeler", "honey", "cauldron"] as TowerKind[]) {
    assert.equal(DEFAULT_TARGET[kind]?.default, "fresh", kind);
    assert.deepEqual(DEFAULT_TARGET[kind]?.modes, ["fresh", "first", "last", "strong", "close"], kind);
  }
  assert.equal(DEFAULT_TARGET.reader?.default, "strong");
  assert.equal(DEFAULT_TARGET.scales?.default, "strong");
  assert.equal(DEFAULT_TARGET.scope?.default, "boss");
  assert.deepEqual(DEFAULT_TARGET.ballista?.modes, ["strong", "boss", "armour", "first", "weak"]);
  assert.equal(DEFAULT_TARGET.quackliber?.default, "first");
  for (const kind of ["bell", "organ", "lantern", "compost", "desk", "pamphlet", "gourdgate", "lionblade", "orrery", "geese", "flask", "hive", "mimic"] as TowerKind[])
    assert.equal(DEFAULT_TARGET[kind], null, `${kind} has no option`);
});

// ── In a real night ──────────────────────────────────────────────────────────

function night(hero: HeroId = "mynxi") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), allTricks: true, setup: { night: "midnight", map: "stacks", hero } });
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 99999;
  api.world.hud.lives = 999;
  return api;
}

/** Build `kind` on the first open floor tile beside the carpet's first straight (from the given end). */
function build(api: Api, kind: TowerKind, skip = 0): Tower {
  const w = api.world;
  const leg = carpetLegs(w.points)[0];
  let seen = 0;
  for (const [c, r] of leg.tiles)
    for (const [a, b] of [[0, -1], [0, 1]]) {
      const k = `${c + a},${r + b}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c + a && t.r === r + b)) continue;
      if (seen++ < skip) continue;
      api.chooseBuild(kind);
      const n = w.towers.length;
      api.pointer(center(c + a), center(r + b), "down");
      if (w.towers.length > n) {
        api.dismissSelection();
        return w.towers[n];
      }
    }
  throw new Error(`could not build ${kind}`);
}

/** `n` sturdy plain fruit from wave 1, the rest cleared, lined up on the first straight from `at` px back. */
function fruit(api: Api, n: number): Fruit[] {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 60 && w.enemies.filter((e) => e.hp > 0).length < n; i++) stepWorld(w, 1 / 60);
  const out = w.enemies.filter((e) => e.hp > 0).slice(0, n);
  w.enemies = out;
  for (const e of out) Object.assign(e, { hp: 9999, maxHp: 9999, guard: "none", shell: 0, boss: false, speed: 0, freeze: 0, chill: 0, reverse: false });
  return out;
}
function onLeg(api: Api, e: Fruit, s: number) {
  const leg = carpetLegs(api.world.points)[0];
  const k = s / leg.length;
  Object.assign(e, { x: leg.a.x + (leg.b.x - leg.a.x) * k, y: leg.a.y + (leg.b.y - leg.a.y) * k, wp: 1 });
}

test("fresh: a Fire cannon sets the dry fruit alight before the burning one in front; with all burning, the front", () => {
  const api = night();
  const fire = build(api, "fire", 2);
  const [front, behind] = fruit(api, 2);
  onLeg(api, front, 150);
  onLeg(api, behind, 110);
  api.world.pools.push({ x: front.x, y: front.y, r: 20, life: 99, max: 99, hot: true, burn: 0 });
  stepWorld(api.world, 1 / 60);
  assert.equal(fire.aimAt, behind.id, "the dry one");
  api.world.pools.push({ x: behind.x, y: behind.y, r: 20, life: 99, max: 99, hot: true, burn: 0 });
  stepWorld(api.world, 1 / 60);
  assert.equal(fire.aimAt, front.id, "all burning: the front one");
});

test("fresh: a Freeze cannon skips a frozen fruit", () => {
  const api = night();
  const ice = build(api, "freeze", 2);
  const [front, behind] = fruit(api, 2);
  onLeg(api, front, 150);
  onLeg(api, behind, 110);
  front.freeze = 5;
  stepWorld(api.world, 1 / 60);
  assert.equal(ice.aimAt, behind.id);
});

test("choosing: A cycles only the kind's modes; a new tower remembers tonight's choice; a new night resets", () => {
  const api = night();
  const melon = build(api, "melon");
  api.pointer(melon.x, melon.y, "down");
  assert.equal(api.targetOf(melon.id)!.mode, "first");
  const seen: TargetMode[] = [];
  for (let i = 0; i < 7; i++) {
    runKeyAction(api, keyAction(api.world.hud, "a")!, () => {});
    seen.push(api.targetOf(melon.id)!.mode);
  }
  assert.deepEqual(seen, ["last", "strong", "weak", "close", "armour", "boss", "first"], "melon: the plain list, in order, back round");
  // Set Strongest: the next melon starts on it.
  api.cycleTarget();
  api.cycleTarget();
  assert.equal(melon.target, "strong");
  api.dismissSelection();
  const second = build(api, "melon", 1);
  assert.equal(api.targetOf(second.id)!.mode, "strong");
  // A Ballista offers only the sniper list.
  const bal = build(api, "ballista", 2);
  api.pointer(bal.x, bal.y, "down");
  assert.deepEqual(api.targetOf(bal.id)!.modes, ["strong", "boss", "armour", "first", "weak"]);
  // It starts on First (its default); next in its list is Weakest, then back round to Strongest.
  api.cycleTarget();
  assert.equal(bal.target, "weak");
  api.cycleTarget();
  assert.equal(bal.target, "strong");
  // A new night: defaults again.
  api.dismissSelection();
  api.restartNight();
  if (api.world.hud.phase === "poster") api.beginNight();
  api.world.hud.seeds = 99999;
  const fresh = build(api, "melon");
  assert.equal(api.targetOf(fresh.id)!.mode, "first");
});

test("towers that don't aim show no option, and A does nothing on them", () => {
  const api = night();
  const bell = build(api, "bell");
  api.pointer(bell.x, bell.y, "down");
  assert.equal(api.targetOf(bell.id), null);
  runKeyAction(api, keyAction(api.world.hud, "a")!, () => {});
  assert.equal(bell.target, undefined);
});

test("the Fly Hive still picks at random", () => {
  const api = night();
  const hive = build(api, "hive", 2);
  const set = fruit(api, 3);
  set.forEach((e, i) => onLeg(api, e, 100 + i * 25));
  const aims = new Set<number>();
  for (let i = 0; i < 120; i++) {
    stepWorld(api.world, 1 / 60);
    if (hive.aimAt != null) aims.add(hive.aimAt);
  }
  assert.ok(aims.size > 1, "more than one fruit was aimed at");
});

test("the Mimic Chest keeps its own rule: the first fruit that isn't a boss", () => {
  const api = night("ooze");
  const mimic = build(api, "mimic", 2);
  const [front, behind] = fruit(api, 2);
  onLeg(api, front, 150);
  onLeg(api, behind, 110);
  front.boss = true;
  mimic.cd = 99;
  stepWorld(api.world, 1 / 60);
  assert.equal(mimic.aimAt, behind.id);
  assert.equal(api.targetOf(mimic.id), null, "no option shown");
});
