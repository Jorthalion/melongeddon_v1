import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_UNLOCKED,
  CELL,
  createWorld,
  emptyProgress,
  nightLength,
  stepWorld,
  type Difficulty,
  type MapId,
  type NightId,
  type WaveGroup,
} from "../src/game/engine.ts";
import { COUNTERS, unanswered } from "../src/game/counters.ts";
import { describeEnemy, fruitFromGroup } from "../src/game/enemyInfo.ts";

type Api = ReturnType<typeof createWorld>;
type Fruit = Api["world"]["enemies"][number];

function night(night: NightId, difficulty: Difficulty = "normal", map?: MapId) {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), siegeOpen: true, allTricks: true, setup: { night, map, hero: "mynxi", difficulty } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 1e6;
  api.world.hud.maxLives = 1e6;
  api.world.hud.seeds = 99999;
  return api;
}

const siegeOf = (e: Fruit) =>
  e.gosling ? "gosling" : e.matriarch ? "matriarch" : e.boxed ? "boxed" : e.para ? "para" : e.tank ? "tank" : e.general ? "general" : null;
/** One spawned enemy as the preview describes it (a gall pumpkin's own rider isn't counted: it's a note). */
const keyOfFruit = (e: Fruit) =>
  [e.kind, e.guard, e.split, e.raw, e.reverse, Boolean(e.pit), Boolean(e.borrower), e.native ?? null, siegeOf(e), Boolean(e.leader), e.boss, e.maxHp, e.speed.toFixed(4)].join("|");
const keysOfGroups = (groups: WaveGroup[]) =>
  groups.flatMap((g) => Array.from({ length: g.count }, () => [g.kind, g.guard, g.split, g.raw, g.chute, g.pit, g.borrower, g.native, g.siege, g.leader, g.boss, g.hp, g.speed.toFixed(4)].join("|")));

/** Play `waves` waves, clearing every enemy the moment it spawns, and compare each wave's preview with what came. */
function checkNight(api: Api, waves: number, label: string) {
  const w = api.world;
  let checked = 0;
  for (let n = 0; n < waves; n++) {
    for (let k = 0; k < 5 && w.hud.phase !== "prep" && w.hud.phase !== "consequence"; k++) {
      if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
      else break;
    }
    if (w.hud.phase !== "prep" && w.hud.phase !== "consequence") break;
    const index = w.hud.wave - 1;
    const preview = api.wavePreview(index);
    api.startWave();
    const seen = new Set<number>();
    const came: string[] = [];
    for (let i = 0; i < 60 * 240 && (w.hud.phase as string) === "combat"; i++) {
      stepWorld(w, 1 / 30);
      for (const e of w.enemies) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        if (e.gall || e.contents) continue; // a gall pumpkin's rider and a Parcel's corn are notes, not queue entries
        came.push(keyOfFruit(e));
      }
      w.enemies = [];
    }
    assert.deepEqual(came.sort(), keysOfGroups(preview.groups).sort(), `${label}, wave ${index + 1}`);
    checked += 1;
  }
  assert.equal(checked, waves, `${label}: every wave was played and checked`);
}

test("truthful: every wave of Midnight on every difficulty is exactly what the preview said", () => {
  for (const d of ["easy", "normal", "hard", "overdue"] as Difficulty[]) checkNight(night("midnight", d), nightLength("midnight"), `midnight ${d}`);
});

test("truthful: the Overflow, the Siege, the first 30 Endless waves, and the rooms with their own fruit", () => {
  checkNight(night("overflow"), nightLength("overflow"), "overflow");
  checkNight(night("siege"), nightLength("siege"), "siege");
  checkNight(night("endless"), 30, "endless");
  for (const map of ["sorting", "greenhouse", "belltower"] as MapId[]) checkNight(night("midnight", "normal", map), nightLength("midnight"), map);
});

test("extras: late slips show on their waves; Story has no room elites; the Overflow's last two waves carry the absurdity note", () => {
  const api = night("overflow");
  api.world.hud.slips = ["heavy", "karl"];
  const heavy = api.wavePreview(2);
  assert.ok(heavy.groups.some((g) => g.kind === "melon" && g.guard === "rind" && g.chute && g.count === 5), "Heavy Returns on wave 3");
  assert.ok(api.wavePreview(7).groups.some((g) => g.kind === "karl"), "Karl Is Early on wave 8");
  assert.ok(!api.wavePreview(1).groups.some((g) => g.chute && g.guard === "rind" && g.count === 5), "not on wave 2");
  const last = api.wavePreview(nightLength("overflow") - 1);
  assert.ok(last.notes.some((n) => n.includes("per 25 absurdity")));
  const story = night("midnight", "easy", "greenhouse");
  for (let i = 0; i < nightLength("midnight"); i++) assert.ok(!story.wavePreview(i).groups.some((g) => g.native === "squash"), `story wave ${i + 1}`);
  const normal = night("midnight", "normal", "greenhouse");
  assert.ok(Array.from({ length: 21 }, (_, i) => normal.wavePreview(i)).some((p) => p.groups.some((g) => g.native === "squash")), "Normal does get elites");
});

test("during a wave the bar counts down, and paratroopers on the way are listed until they land", () => {
  const api = night("midnight");
  const w = api.world;
  const before = api.comingUp().groups.reduce((n, g) => n + g.count, 0);
  api.startWave();
  for (let i = 0; i < 60 * 3; i++) stepWorld(w, 1 / 60);
  const now = api.comingUp().groups.reduce((n, g) => n + g.count, 0);
  assert.ok(now < before, `${now} left of ${before}`);
  // The Siege: the first wave with paratroopers.
  const siege = night("siege");
  const s = siege.world;
  for (let k = 0; k < 20; k++) {
    if (siege.wavePreview(s.hud.wave - 1).groups.some((g) => g.siege === "para")) break;
    siege.startWave();
    for (let i = 0; i < 60 * 240 && s.hud.phase === "combat"; i++) {
      stepWorld(s, 1 / 30);
      s.enemies = [];
    }
    if (s.hud.phase === "upgrade") siege.pickUpgrade(s.hud.offer[0].id);
  }
  siege.startWave();
  let sawOnTheWay = false;
  for (let i = 0; i < 60 * 240 && s.hud.phase === "combat"; i++) {
    stepWorld(s, 1 / 30);
    s.enemies = s.enemies.filter((e) => e.para);
    if (s.landings.length && siege.comingUp().groups.some((g) => g.siege === "para")) sawOnTheWay = true;
    s.enemies = [];
  }
  assert.ok(sawOnTheWay);
});

test("threat: the finale has at least 4 pips, wave 1 has 1, and the arrow follows the threat", () => {
  for (const n of ["midnight", "overflow", "siege"] as NightId[]) {
    const api = night(n);
    const len = nightLength(n);
    assert.equal(api.wavePreview(0).pips, 1, `${n} wave 1`);
    assert.ok(api.wavePreview(len - 1).pips >= 4, `${n} finale`);
    for (let i = 1; i < len; i++) {
      const p = api.wavePreview(i);
      const prev = api.wavePreview(i - 1).threat;
      const want = p.threat > prev * 1.05 ? "up" : p.threat < prev * 0.95 ? "down" : null;
      assert.equal(p.trend, want, `${n} wave ${i + 1}`);
    }
  }
});

test("warnings: a husk wave with only melons warns; add a mortar and it doesn't", () => {
  const api = night("midnight");
  const w = api.world;
  const huskWave = Array.from({ length: 21 }, (_, i) => api.wavePreview(i)).find((p) => p.groups.some((g) => g.guard === "husk"));
  assert.ok(huskWave, "Midnight has a husk wave");
  const build = (kinds: string[]) => ({ kinds: new Set(kinds) as never, upgrades: w.hud.upgrades, dropsCovered: true });
  assert.deepEqual(unanswered(["husk"], build(["melon"])), ["husk"]);
  assert.deepEqual(unanswered(["husk"], build(["melon", "mortar"])), []);
  assert.deepEqual(unanswered(["shell"], build(["melon"])), ["shell"]);
  assert.deepEqual(unanswered(["shell"], build(["peeler"])), []);
  assert.deepEqual(unanswered(["boxed"], build(["melon"])), ["boxed"]);
  assert.deepEqual(unanswered(["boxed"], build(["still"])), []);
  assert.deepEqual(unanswered(["para"], { kinds: new Set(), upgrades: [], dropsCovered: false }), ["para"]);
  assert.ok(CELL > 0);
});

test("the hover card's 'Beaten by' and the warnings read the same table", () => {
  const api = night("midnight");
  const g: WaveGroup = { kind: "corn", guard: "husk", split: false, raw: false, chute: false, pit: false, gall: false, borrower: false, native: null, siege: null, leader: false, boss: false, mini: false, count: 3, hp: 20, speed: 70 };
  const info = describeEnemy(fruitFromGroup(g), api.world);
  assert.deepEqual(info.beats, [COUNTERS.husk.beats]);
});
