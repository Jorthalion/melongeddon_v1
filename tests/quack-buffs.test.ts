import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANNON,
  CELL,
  KEEPER_START,
  KEEPER_TOWERS,
  TOWERS,
  createWorld,
  emptyProgress,
  maxedProgress,
  perkFx,
  stepWorld,
  type HeroId,
  type KeeperProgress,
  type TowerKind,
} from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function start(hero: HeroId = "quack", keepers: KeeperProgress = emptyProgress()) {
  const api = createWorld(() => {}, { keepers });
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;

const free = (api: Api, c: number, r: number) => {
  const w = api.world;
  const k = `${c},${r}`;
  return c >= 0 && r >= 0 && c < w.cols && r < w.rows && !w.pathCells.has(k) && !w.shelfCells.has(k) && !w.towers.some((t) => t.c === c && t.r === r);
};

/** Build `kind` on the first open tile that `ok` accepts (default: beside the carpet). */
function build(api: Api, kind: TowerKind, ok?: (c: number, r: number) => boolean) {
  const w = api.world;
  w.hud.seeds = Math.max(w.hud.seeds, 999);
  api.dismissSelection();
  api.chooseBuild(kind);
  const beside = (c: number, r: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`));
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      if (!free(api, c, r) || !(ok ?? beside)(c, r)) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      if (w.towers.length > before) return w.towers[w.towers.length - 1];
    }
  throw new Error(`no room for ${kind}`);
}

function playWave(api: Api, each?: () => void) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 300 && w.hud.phase === "combat"; i++) {
    each?.();
    stepWorld(w, 1 / 60);
  }
}


// ── The late-night buffs (each one has its own CANNON number; 0 or 1 turns it off) ───────────────

test("training arc: the aura gets faster with every wave cleared, up to its cap", () => {
  const api = start();
  const q = build(api, "quackliber");
  const near = build(api, "melon", (c, r) => Math.hypot(c - q.c, r - q.r) <= 1.5);
  const plain = start("mynxi");
  const base = plain.statsOf(build(plain, "melon").id)!.interval;
  api.world.hud.wave = 6; // five cleared
  const arc = Math.min(CANNON.quackArcMax, CANNON.quackArcPer * 5);
  assert.ok(arc > 0);
  assert.ok(Math.abs(api.statsOf(near.id)!.interval - base / (CANNON.quackHaste + arc)) < 1e-9);
  api.world.hud.wave = 99;
  assert.ok(Math.abs(api.statsOf(near.id)!.interval - base / (CANNON.quackHaste + CANNON.quackArcMax)) < 1e-9, "capped");
});

test("the aura adds punch: towers in it hit harder", () => {
  const api = start();
  const q = build(api, "quackliber");
  const near = build(api, "melon", (c, r) => Math.hypot(c - q.c, r - q.r) <= 1.5);
  const far = build(api, "melon", (c, r) => Math.hypot(c - q.c, r - q.r) >= 4);
  const dmg = api.statsOf(far.id)!.dmg;
  assert.equal(api.statsOf(near.id)!.dmg, Math.round(dmg * (1 + CANNON.quackPunch)));
});

test("Anti-Geese Protocol recharges instead of being used up", () => {
  const api = start();
  const g = build(api, "geese");
  g.trigger = "manual";
  api.startWave();
  const w = api.world;
  for (let i = 0; i < 60 * 120 && w.hud.phase === "combat"; i++) {
    stepWorld(w, 1 / 60);
    const range = api.statsOf(g.id)!.range;
    if (w.enemies.some((e) => e.hp > 0 && Math.hypot(e.x - g.x, e.y - g.y) <= range)) break;
  }
  api.dismissSelection();
  api.pointer(g.x, g.y, "down");
  api.engage();
  assert.ok(w.towers.includes(g), "still standing");
  assert.equal(w.hud.geeseSpent, false);
  assert.ok(Math.abs(g.cd - CANNON.geeseRecharge) < 0.1, `recharging (${g.cd})`);
});

test("power level: kills fill the meter, and a full meter makes the next ki blast hit everything near the turret", () => {
  const api = start();
  const q = build(api, "quackliber");
  const w = api.world;
  let blasted = false;
  let filled = 0;
  playWave(api, () => {
    if (w.floaters.some((f) => f.text === "FULL POWER!")) blasted = true;
    if (!blasted) w.hud.ki = CANNON.quackKiNeed;
    else filled = Math.max(filled, w.hud.ki);
  });
  assert.ok(blasted, "a full meter set off the blast");
  assert.ok(filled > 0 || w.runLog.kills > 0, "kills fill it again");
  assert.ok(api.tallyOf(q.id)!.dmg > 0);
});

test("ki finisher: a ki blast takes a share of its target's full health (bosses less)", async () => {
  const { lab, lost, shoot } = await import("./comboLab.ts");
  const { api, fruit } = lab(2, 300);
  const [plain, boss] = fruit;
  boss.boss = true;
  shoot(api, plain, { dmg: 0, splashChill: CANNON.quackSlow });
  shoot(api, boss, { dmg: 0, splashChill: CANNON.quackSlow });
  assert.ok(Math.abs(lost(plain) - plain.maxHp * CANNON.quackPct) < 1, `plain ${lost(plain)}`);
  assert.ok(Math.abs(lost(boss) - boss.maxHp * CANNON.quackPctBoss) < 1, `boss ${lost(boss)}`);
});

test("rewind combo: a fruit walking back takes more damage (Quackarot only)", () => {
  const api = start();
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.some((e) => e.hp > 0); i++) stepWorld(w, 1 / 60);
  const e = w.enemies.find((x) => x.hp > 0)!;
  Object.assign(e, { hp: 1000, maxHp: 1000, guard: "none", shell: 0, driven: 2 });
  w.shots.push({ id: 1e9, x: e.x, y: e.y, tx: e.x, ty: e.y, target: e.id, dmg: 40, life: 1, bounces: 0, orange: false, splash: 0, element: "shot", procs: false, splashRatio: 0, chill: 0, freezeExtra: 0, fireLife: 0, fireBurn: 0, pulp: false } as (typeof w.shots)[number]);
  stepWorld(w, 1 / 60);
  assert.ok(Math.abs(1000 - e.hp - 40 * CANNON.driverAmp) < 0.5, `took ${1000 - e.hp}`);
});
