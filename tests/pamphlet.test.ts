import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOARDS,
  CANNON,
  CELL,
  EMPTY_META,
  buildBoard,
  carpetAlong,
  carpetLegs,
  createWorld,
  emptyProgress,
  stepWorld,
  towerReadout,
  type MapId,
} from "../src/game/engine.ts";

function start(night: "midnight" | "overflow" = "midnight", map: MapId = "stacks") {
  const api = createWorld(() => {}, { meta: EMPTY_META, keepers: emptyProgress(), setup: { night, map, hero: "quack" } });
  api.openSetup();
  api.chooseHero("quack");
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];
const center = (n: number) => n * CELL + CELL / 2;

function place(api: Api, c: number, r: number) {
  api.chooseBuild("pamphlet");
  const n = api.world.towers.length;
  api.pointer(center(c), center(r), "down");
  api.dismissSelection();
  return api.world.towers.length > n ? api.world.towers[n] : null;
}

/** A Pamphlet on a tile beside the middle of leg `i`. */
function besideLeg(api: Api, i: number) {
  const leg = carpetLegs(api.world.points)[i];
  const mid = leg.tiles[Math.floor(leg.tiles.length / 2)];
  for (const [a, b] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const t = place(api, mid[0] + a, mid[1] + b);
    if (t && t.leg === i) return t;
    if (t) {
      api.pointer(t.x, t.y, "down");
      api.sellSelected();
    }
  }
  throw new Error(`no tile beside leg ${i}`);
}

/** `n` fruit from wave 1, everything else cleared, sturdy and plain. */
function fruit(api: Api, n: number): Fruit[] {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 60 && w.enemies.filter((e) => e.hp > 0).length < n; i++) stepWorld(w, 1 / 60);
  const out = w.enemies.filter((e) => e.hp > 0).slice(0, n);
  assert.equal(out.length, n);
  w.enemies = out;
  for (const e of out) Object.assign(e, { hp: 9999, maxHp: 9999, guard: "none", shell: 0, boss: false, pit: false, gall: false, borrower: false, freeze: 0, chill: 0, reverse: false });
  return out;
}

/** Put a fruit `s` px along leg `i` (from its start in walking order), facing its own way. */
function onLeg(api: Api, e: Fruit, i: number, s: number, reverse = false) {
  const leg = carpetLegs(api.world.points)[i];
  const k = (s - leg.from) / leg.length;
  Object.assign(e, { x: leg.a.x + (leg.b.x - leg.a.x) * k, y: leg.a.y + (leg.b.y - leg.a.y) * k, wp: reverse ? i : i + 1, reverse });
}

/** Step, removing any fruit the wave sends that isn't in `keep`. */
function run(api: Api, keep: Fruit[], s: number, each?: () => void) {
  const w = api.world;
  for (let i = 0; i < Math.round(s * 60); i++) {
    w.enemies = w.enemies.filter((e) => keep.includes(e));
    stepWorld(w, 1 / 60);
    each?.();
  }
}

/** The Pamphlet's hit: a fresh melon's, times CANNON.pamphletHit. */
const melonHit = (api: Api) => Math.round(towerReadout(api.world.hud.hero, "melon", [], api.world.hud.upgrades).dmg * CANNON.pamphletHit);

test("carpetLegs: the straights of the Stacks, the Reading Room and the Overflow", () => {
  const legs = (map: MapId) => carpetLegs(buildBoard(BOARDS[map].corners).points).map((l) => l.tiles.length);
  assert.deepEqual(legs("stacks"), [6, 3, 6, 5, 3]);
  assert.deepEqual(legs("readingroom"), [19, 4, 17, 4, 19]);
  assert.deepEqual(legs("overflow"), [3, 3, 4, 3, 4, 4, 3]);
});

test("placement: not beside a straight is refused; beside one binds it; a corner tile binds downstream and can switch in prep only", () => {
  const api = start();
  const w = api.world;
  // A floor tile touching no carpet at all.
  let far: [number, number] | null = null;
  for (let r = 0; r < w.rows && !far; r++)
    for (let c = 0; c < w.cols && !far; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      far = [c, r];
    }
  assert.equal(place(api, far![0], far![1]), null);
  assert.equal(w.hud.log, "The Pamphlet has to stand beside a straight.");

  const mid = place(api, 3, 4); // beside the middle of the first straight (row 5)
  assert.equal(mid?.leg, 0);
  api.pointer(mid!.x, mid!.y, "down");
  api.sellSelected();

  // (5,4) touches the first straight at (5,5) and the second at (6,4): a tie, so downstream.
  const corner = place(api, 5, 4)!;
  assert.equal(corner.leg, 1);
  api.pointer(corner.x, corner.y, "down");
  api.otherStraight();
  assert.equal(corner.leg, 0, "switched between waves");
  fruit(api, 1);
  api.pointer(corner.x, corner.y, "down");
  api.otherStraight();
  assert.equal(corner.leg, 0, "not during a wave");
});

test("two fruit on the straight: when the front one turns the corner both take one hit (twice a fresh melon's); one past the corner takes nothing", () => {
  const api = start();
  const pam = besideLeg(api, 0);
  const legs = carpetLegs(api.world.points);
  const [front, back, past] = fruit(api, 3);
  onLeg(api, front, 0, legs[0].to - 3);
  onLeg(api, back, 0, legs[0].from + 80);
  onLeg(api, past, 1, legs[1].from + 40);
  run(api, [front, back, past], 0.6);
  const hit = melonHit(api);
  assert.ok(hit > 0);
  assert.equal(api.statsOf(pam.id)!.dmg, hit, "the inspector shows the same number");
  assert.equal(9999 - front.hp, hit);
  assert.equal(9999 - back.hp, hit);
  assert.equal(past.hp, 9999);
  assert.equal(pam.armed, true, "one fruit left on the straight, so it has re-armed");
});

test("one fruit alone, or Karl alone, sets nothing off", () => {
  for (const boss of [false, true]) {
    const api = start();
    const pam = besideLeg(api, 0);
    const legs = carpetLegs(api.world.points);
    const [e] = fruit(api, 1);
    e.boss = boss;
    onLeg(api, e, 0, legs[0].to - 3);
    run(api, [e], 1);
    assert.equal(e.hp, 9999, boss ? "Karl alone" : "one alone");
    assert.equal(pam.armed, true, "still armed");
  }
});

test("a steady stream of six fires once; it fires again only after the straight empties and a new pair arrives", () => {
  const api = start();
  const pam = besideLeg(api, 0);
  const legs = carpetLegs(api.world.points);
  const six = fruit(api, 6);
  six.forEach((e, k) => onLeg(api, e, 0, legs[0].to - 3 - k * 34));
  let fires = 0;
  let was = pam.armed;
  const count = () => {
    if (was && !pam.armed) fires++;
    was = pam.armed;
  };
  run(api, six, 8, count);
  assert.equal(fires, 1, "one blast for the stream");
  assert.equal(pam.armed, true, "re-armed once fewer than two were left");
  // A new pair.
  const [a, b] = six;
  onLeg(api, a, 0, legs[0].to - 3);
  onLeg(api, b, 0, legs[0].from + 60);
  run(api, [a, b], 1, count);
  assert.equal(fires, 2);
});

test("armour: a shelled melon spends the hit like a melon shot; a pit takes it in full", () => {
  const api = start();
  besideLeg(api, 0);
  const legs = carpetLegs(api.world.points);
  const [shell, pit] = fruit(api, 2);
  Object.assign(shell, { guard: "rind", shell: 1 });
  pit.pit = true;
  onLeg(api, shell, 0, legs[0].to - 3);
  onLeg(api, pit, 0, legs[0].from + 80);
  run(api, [shell, pit], 0.6);
  assert.equal(shell.hp, 9999, "the shell took it");
  assert.equal(shell.shell, 0, "and cracked");
  assert.equal(9999 - pit.hp, melonHit(api));
});

test("the Overflow: a chute fruit walking backwards sets it off at the upstream corner", () => {
  const api = start("overflow", "overflow");
  besideLeg(api, 3);
  const legs = carpetLegs(api.world.points);
  const [front, other] = fruit(api, 2);
  onLeg(api, front, 3, legs[3].from + 3, true);
  onLeg(api, other, 3, legs[3].to - 20, true);
  const before = carpetAlong(api.world.points, front.x, front.y, front.wp, true).along;
  run(api, [front, other], 0.6);
  assert.ok(carpetAlong(api.world.points, front.x, front.y, front.wp, true).along < before, "it walked backwards");
  assert.equal(9999 - front.hp, melonHit(api));
  assert.equal(9999 - other.hp, melonHit(api));
});
