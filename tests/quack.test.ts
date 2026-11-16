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

test("Quackarot starts with 11 stacks and 150 seeds, and the Quack-Liber is his alone at 95", () => {
  assert.deepEqual(KEEPER_START.quack, { seeds: 150, lives: 11 });
  const api = start();
  assert.equal(api.world.hud.seeds, 150);
  assert.equal(api.world.hud.lives, 999); // set by the test; the start was checked above
  assert.deepEqual(KEEPER_TOWERS.quack, ["quackliber", "geese", "pamphlet", "driver"]);
  assert.equal(TOWERS.quackliber.cost, 95);
  const other = start("mynxi");
  other.world.hud.seeds = 999;
  other.chooseBuild("quackliber");
  assert.notEqual(other.world.hud.build, "quackliber", "no one else can pick it");
});

test("towers within three tiles of the Quack-Liber fire 15% faster; farther ones don't", () => {
  const api = start();
  const q = build(api, "quackliber");
  const near = build(api, "melon", (c, r) => Math.hypot(c - q.c, r - q.r) <= 1.5);
  const far = build(api, "melon", (c, r) => Math.hypot(c - q.c, r - q.r) >= 4);
  const plain = start("mynxi");
  const alone = build(plain, "melon");
  const base = plain.statsOf(alone.id)!.interval;
  const n = api.statsOf(near.id)!;
  assert.ok(Math.abs(n.interval - base / CANNON.quackHaste) < 1e-9, `near ${n.interval} vs ${base}`);
  assert.equal(n.quick, true);
  assert.ok(Math.abs(api.statsOf(far.id)!.interval - base) < 1e-9, "far is unchanged");
  // Sold: the speed-up goes with it.
  api.dismissSelection();
  api.pointer(q.x, q.y, "down");
  api.sellSelected();
  assert.ok(Math.abs(api.statsOf(near.id)!.interval - base) < 1e-9);
});

test("rockets burst and slow what they hit", () => {
  const api = start();
  const q = build(api, "quackliber");
  let slowed = false;
  playWave(api, () => {
    for (const t of api.world.towers) if (t !== q) t.cd = 99;
    if (api.world.enemies.some((e) => e.chill > 0)) slowed = true;
  });
  assert.ok(slowed, "something was slowed");
  assert.ok(api.tallyOf(q.id)!.dmg > 0, "the rockets did damage");
});

test("it can be retargeted once, and only once", () => {
  const api = start();
  const q = build(api, "quackliber");
  api.dismissSelection();
  api.pointer(q.x, q.y, "down");
  assert.equal(api.world.hud.selected, q.id);
  api.retarget("strong");
  assert.equal(q.aimMode, "strong");
  api.retarget("rear");
  assert.equal(q.aimMode, "strong", "the second change is refused");
});

test("retargeted to the toughest, it shoots the fruit with the most health in reach", () => {
  const api = start();
  const q = build(api, "quackliber");
  api.dismissSelection();
  api.pointer(q.x, q.y, "down");
  api.retarget("strong");
  let checked = false;
  playWave(api, () => {
    if (checked || q.cd > 1 / 60) return;
    const reach = api.statsOf(q.id)!.range;
    const inReach = api.world.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - q.x, e.y - q.y) <= reach);
    if (inReach.length < 2) return;
    const before = new Set(api.world.shots.map((s) => s.id));
    stepWorld(api.world, 1 / 60);
    const shot = api.world.shots.find((s) => !before.has(s.id) && s.owner === q.id);
    if (!shot) return;
    const target = inReach.find((e) => e.id === shot.target);
    if (!target) return;
    assert.equal(target.hp, Math.max(...inReach.map((e) => e.hp)));
    checked = true;
  });
  assert.ok(checked, "saw a shot with two fruit in reach");
});

test("his perks: Defensive Perimeter allows a second turret; nothing touches the other keepers", () => {
  const fx = perkFx("quack", maxedProgress(0).quack);
  assert.equal(fx.sigExtra, 1);
  assert.equal(fx.perimeter, 1);
  const alt = perkFx("quack", maxedProgress(1).quack);
  assert.ok(Math.abs(alt.auraHaste - 0.1) < 1e-9, "Steady Hands");
  for (const hero of ["mynxi", "vael", "michael", "elf", "ooze", "scholar"] as const) {
    const other = perkFx(hero, maxedProgress(0)[hero]);
    assert.equal(other.auraReach, 1);
    assert.equal(other.perimeter + other.lockdown + other.covering + other.confidence + other.auraHaste, 0);
  }
  const api = start("quack", maxedProgress(0));
  build(api, "quackliber");
  build(api, "quackliber");
  assert.equal(api.world.towers.filter((t) => t.kind === "quackliber").length, 2);
});

test("Lane Lockdown leaves a patch on the carpet every fourth rocket", () => {
  const api = start("quack", maxedProgress(1)); // tier 3 pick 1 = Lane Lockdown
  assert.equal(perkFx("quack", maxedProgress(1).quack).lockdown, 1);
  const q = build(api, "quackliber");
  let patch = false;
  playWave(api, () => {
    if (api.world.pools.some((p) => p.owner === q.id)) patch = true;
  });
  assert.ok(patch);
});
