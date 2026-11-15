import { test } from "node:test";
import assert from "node:assert/strict";
import { CELL, EMPTY_META, OATH_TEXT, OATH_VALUES, carpetAlong, carpetInReach, createWorld, oathStretch, stepWorld, type OathId } from "../src/game/engine.ts";
import { keyAction, runKeyAction } from "../src/game/keys.ts";

function intro() {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openSetup();
  api.pickKeeper("michael");
  api.chooseHero("michael");
  return api;
}
type Api = ReturnType<typeof intro>;
type Fruit = Api["world"]["enemies"][number];

const press = (api: Api, key: string) => {
  const action = keyAction(api.world.hud, key);
  if (action) runKeyAction(api, action, () => {});
};

test("on his intro the game's keys leave 1–3 and Enter to the oath cards; beginNight waits; pickOath starts", () => {
  const api = intro();
  const w = api.world;
  assert.equal(w.hud.phase, "poster");
  for (const key of ["1", "2", "3", "Enter"]) assert.equal(keyAction(w.hud, key), null, key);
  assert.deepEqual(keyAction(w.hud, "Escape"), { type: "backToSetup" });
  press(api, "Enter");
  api.beginNight();
  assert.equal(w.hud.phase, "poster", "he has not said where he stands");
  assert.equal(w.hud.oath, null);
  api.pickOath("door");
  assert.equal(w.hud.phase, "prep");
  assert.equal(w.hud.oath, "door");
  assert.equal(w.hud.log, OATH_TEXT.door.log);
  for (const oath of ["mouth", "sling"] as const) {
    const b = intro();
    b.pickOath(oath);
    assert.equal(b.world.hud.oath, oath);
    assert.equal(b.world.hud.log, OATH_TEXT[oath].log);
  }
});

test("other keepers still begin with Enter, and digits do nothing on their intro", () => {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openSetup();
  api.chooseHero("vael");
  press(api, "1");
  assert.equal(api.world.hud.phase, "poster");
  api.pickOath("door");
  assert.equal(api.world.hud.oath, null, "only Sir Michael swears");
  press(api, "Enter");
  assert.equal(api.world.hud.phase, "prep");
});

/** A point `along` px down the carpet, and the waypoint a forward walker there is heading to. */
function spotAt(points: Array<{ x: number; y: number }>, along: number) {
  let left = along;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= d) return { x: a.x + ((b.x - a.x) / d) * left, y: a.y + ((b.y - a.y) / d) * left, wp: k };
    left -= d;
  }
  throw new Error("past the end");
}

/**
 * A trebuchet on the board, three still, tough fruit on the carpet (1.5 tiles past the start,
 * the middle, 1.5 tiles before the end), and `hit(e)`: one real trebuchet shot landing on `e`.
 */
function range(oath: OathId) {
  const api = intro();
  api.pickOath(oath);
  const w = api.world;
  w.hud.seeds = 999;
  w.hud.lives = 999;
  api.chooseBuild("trebuchet");
  api.pointer(4 * CELL + CELL / 2, 3 * CELL + CELL / 2, "down");
  const treb = w.towers.find((t) => t.kind === "trebuchet");
  assert.ok(treb, "trebuchet placed");
  api.startWave();
  let template: (typeof w.shots)[number] | undefined;
  for (let i = 0; i < 60 * 60 && !(template && w.enemies.length >= 3); i++) {
    stepWorld(w, 1 / 60);
    template ??= w.shots.find((s) => s.owner === treb!.id && s.knock);
  }
  assert.ok(template, "the trebuchet fired");
  assert.ok(w.enemies.length >= 3);
  treb!.cd = 999;
  w.shots = [];
  const { total } = carpetAlong(w.points, 0, 0, 0, false);
  const fruit = w.enemies.slice(0, 3);
  w.enemies = fruit;
  const at = [1.5 * CELL, total / 2, total - 1.5 * CELL];
  fruit.forEach((e, i) => {
    Object.assign(e, spotAt(w.points, at[i]), { freeze: 999, hp: 99999, maxHp: 99999, reverse: false, boss: false, guard: "none", shell: 0, pit: false });
  });
  const shot = template!;
  let n = 0;
  const hit = (e: Fruit) => {
    w.shots.push({ ...shot, id: -1000 - n++, target: e.id, x: e.x, y: e.y, tx: e.x, ty: e.y, life: 1 });
    stepWorld(w, 1 / 60);
  };
  const along = (e: Fruit) => carpetAlong(w.points, e.x, e.y, e.wp, e.reverse).along;
  return { api, w, mouth: fruit[0], middle: fruit[1], door: fruit[2], hit, along };
}

for (const oath of ["door", "mouth", "sling"] as const) {
  test(`${oath} oath: the trebuchet shoves one tile at either end of the carpet`, () => {
    const r = range(oath);
    for (const end of ["door", "mouth"] as const) {
      const e = r[end];
      const before = r.along(e);
      const hp = e.hp;
      r.hit(e);
      assert.ok(e.hp < hp, `${end}: the hit lands`);
      const moved = before - r.along(e);
      assert.ok(Math.abs(moved - CELL) < 4, `${end}: moved ${moved}, expected about ${CELL}`);
    }
    // A boss is never shoved.
    r.middle.boss = true;
    const at = { x: r.middle.x, y: r.middle.y };
    r.hit(r.middle);
    assert.deepEqual({ x: r.middle.x, y: r.middle.y }, at);
  });
}

test("mouth oath: fruit on the first three tiles take 30% more from the same shot", () => {
  const r = range("mouth");
  const lost = (e: Fruit) => {
    const hp = e.hp;
    r.hit(e);
    return hp - e.hp;
  };
  const inZone = lost(r.mouth);
  const outside = lost(r.middle);
  assert.ok(Math.abs(inZone / outside - OATH_VALUES.mouthAmp) < 0.01, `ratio ${inZone / outside}`);
  const s = range("sling");
  const a = s.mouth.hp;
  s.hit(s.mouth);
  const b = s.middle.hp;
  s.hit(s.middle);
  assert.ok(Math.abs((a - s.mouth.hp) - (b - s.middle.hp)) < 0.01, "no bonus under another oath");
});

test("door oath: a tower reaching the last three tiles fires 20% faster; one out of reach does not", () => {
  const stats = (oath: OathId) => {
    const api = intro();
    api.pickOath(oath);
    const w = api.world;
    w.hud.seeds = 99999;
    const zone = oathStretch(w.points, "door");
    let near: number | null = null;
    let far: number | null = null;
    for (let r = 0; r < w.rows; r++)
      for (let c = 0; c < w.cols; c++) {
        const n = w.towers.length;
        api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");
        if (w.towers.length === n) continue;
        const t = w.towers[n];
        api.dismissSelection();
        const reaches = carpetInReach(zone, t.x, t.y, api.statsOf(t.id)!.range).length > 0;
        if (reaches && near == null) near = t.id;
        if (!reaches && far == null) far = t.id;
      }
    return { near: api.statsOf(near!)!, far: api.statsOf(far!)! };
  };
  const sworn = stats("door");
  const plain = stats("sling");
  assert.ok(Math.abs(plain.near.interval / sworn.near.interval - OATH_VALUES.doorHaste) < 1e-6);
  assert.equal(sworn.near.quick, true);
  assert.equal(sworn.far.interval, plain.far.interval);
});

test("what each oath costs: door two stacks, mouth 10 seeds, sling makes the Trebuchet 30 cheaper", () => {
  const start = (oath: OathId) => {
    const api = intro();
    api.pickOath(oath);
    api.chooseBuild("trebuchet");
    return api.world.hud;
  };
  const door = start("door");
  const mouth = start("mouth");
  const sling = start("sling");
  assert.equal(door.lives, sling.lives - OATH_VALUES.doorStacks);
  assert.equal(door.maxLives, sling.maxLives - OATH_VALUES.doorStacks);
  assert.equal(mouth.seeds, sling.seeds - OATH_VALUES.mouthSeeds);
  assert.equal(sling.towerCost, door.towerCost - OATH_VALUES.slingDiscount);
});

test("restartNight brings him back to the intro with no oath; backToSetup leaves none", () => {
  const api = intro();
  api.pickOath("door");
  api.restartNight();
  assert.equal(api.world.hud.phase, "poster");
  assert.equal(api.world.hud.oath, null);
  api.beginNight();
  assert.equal(api.world.hud.phase, "poster", "he has to say it again");
  api.pickOath("mouth");
  assert.equal(api.world.hud.phase, "prep");

  const b = intro();
  b.backToSetup();
  assert.equal(b.world.hud.oath, null);
  b.chooseHero("michael");
  assert.equal(b.world.hud.oath, null);
  assert.equal(b.world.towers.length, 0);
});
