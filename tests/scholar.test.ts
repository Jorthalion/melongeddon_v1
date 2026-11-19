import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANNON,
  CELL,
  KEEPER_START,
  MAX_LEVEL,
  UPGRADES,
  createWorld,
  emptyProgress,
  stepWorld,
  xpForLevel,
  type EnemyKind,
  type HeroId,
  type KeeperProgress,
  type TowerKind,
  type UpgradeId,
} from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function start(hero: HeroId = "scholar", keepers: KeeperProgress = emptyProgress()) {
  const api = createWorld(() => {}, { keepers });
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;

/** Build `kind` on the first open floor tile beside the carpet. */
function build(api: Api, kind: TowerKind) {
  const w = api.world;
  w.hud.seeds = Math.max(w.hud.seeds, 999);
  api.dismissSelection();
  api.chooseBuild(kind);
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) continue;
      const before = w.towers.length;
      api.pointer(center(c), center(r), "down");
      if (w.towers.length > before) return w.towers[w.towers.length - 1];
    }
  throw new Error(`no room for ${kind}`);
}

/** Play the current wave to its end. `each` runs before every frame. Returns the log at the wave's end. */
function playWave(api: Api, each?: () => void) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 300 && w.hud.phase === "combat"; i++) {
    each?.();
    stepWorld(w, 1 / 60);
  }
  return w.hud.log;
}

/** Fruit leak straight through (no damage anywhere): everything reaches the stacks. */
const noDamage = (api: Api) => () => {
  for (const t of api.world.towers) t.cd = 99;
};
/** Fruit popped the moment they appear, near the entrance. */
const popAtDoor = (api: Api) => () => {
  for (const t of api.world.towers) t.cd = 99;
  for (const e of api.world.enemies) e.hp = 0;
  api.world.enemies = [];
};

const KIND_OF: Record<string, EnemyKind> = { "The melons": "melon", "The corn": "corn", "The pumpkins": "pumpkin", Karl: "karl" };

test("he starts with 12 stacks and 150 seeds", () => {
  assert.deepEqual(KEEPER_START.scholar, { seeds: 150, lives: 12 });
  const api = createWorld(() => {}, { keepers: emptyProgress() });
  api.openSetup();
  api.chooseHero("scholar");
  api.beginNight();
  assert.equal(api.world.hud.seeds, 150);
  assert.equal(api.world.hud.lives, 12);
  assert.equal(api.world.hud.maxLives, 12);
});

test("his shelf has three upgrades and the Doctor's pick, a real fourth one; Mynxi's has three", () => {
  const api = start();
  playWave(api, noDamage(api));
  const h = api.world.hud;
  assert.equal(h.phase, "upgrade");
  assert.equal(h.offer.length, 4);
  assert.equal(h.pickCards.length, 1, "one Doctor's pick");
  const pick = h.pickCards[0];
  assert.ok(h.offer.some((u) => u.id === pick), "on the shelf");
  assert.equal(h.offer.find((u) => u.id === pick)!.name, UPGRADES[pick].name, "a real upgrade");
  assert.ok(!h.upgrades.includes(pick), "not one he owns");
  assert.equal(new Set(h.offer.map((u) => u.id)).size, 4, "no copies");

  const mynxi = start("mynxi");
  playWave(mynxi, noDamage(mynxi));
  assert.equal(mynxi.world.hud.offer.length, 3);
  assert.deepEqual(mynxi.world.hud.pickCards, []);
});

test("taking the Doctor's pick adds it for real, and it is counted", () => {
  const api = start();
  playWave(api, noDamage(api));
  const pick = api.world.hud.pickCards[0];
  api.pickUpgrade(pick);
  assert.ok(api.world.hud.upgrades.includes(pick), "he has it");
  assert.equal(api.world.runLog.doctorTaken, 1);
  assert.deepEqual(api.world.hud.cardPicks.at(-1), { id: pick, pick: true });
  assert.deepEqual(api.world.hud.pickCards, [], "the shelf is cleared");
});

test("a real card lasts the night", () => {
  const api = start();
  playWave(api, noDamage(api));
  const real = api.world.hud.offer[0].id as UpgradeId;
  api.pickUpgrade(real);
  assert.ok(api.world.hud.upgrades.includes(real));
  for (let n = 0; n < 3; n++) {
    playWave(api, noDamage(api));
    if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer[0].id);
  }
  assert.ok(api.world.hud.upgrades.includes(real), "still there three waves later");
});

test("a Lectern doesn't change a cannon's damage", () => {
  const api = start();
  const melon = build(api, "melon");
  api.dismissSelection();
  const plain = api.statsOf(melon.id)!.dmg;
  build(api, "lectern");
  api.dismissSelection();
  assert.equal(api.statsOf(melon.id)!.dmg, plain);
  playWave(api, noDamage(api));
  assert.equal(api.statsOf(melon.id)!.dmg, plain, "nor after a wave");
});

test("a fruit that got 75% of the way slows its kind next wave at CANNON.lectureSlow, and not the wave after", () => {
  const api = start();
  build(api, "lectern");
  api.dismissSelection();
  const log = playWave(api, noDamage(api)); // everything leaks
  const m = log.match(/(The melons|The corn|The pumpkins|Karl) got furthest\. I've taken notes\. (They|He) will be slower next time\./);
  assert.ok(m, `the Lectern speaks: "${log}"`);
  const kind = KIND_OF[m![1]];
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer[0].id);

  /** How far one fruit of `kind` moves in one frame, as a share of its full speed (no puddles about). */
  const pace = () => {
    let share: number | null = null;
    let other: number | null = null;
    playWave(api, () => {
      noDamage(api)();
      const w = api.world;
      for (const e of w.enemies) {
        if (e.hp <= 0 || e.slow !== 1 || e.wp < 1 || e.wp >= w.points.length - 1) continue;
        const wp = w.points[e.wp];
        if (Math.hypot(wp.x - e.x, wp.y - e.y) < 10) continue;
        const [x, y] = [e.x, e.y];
        stepWorld(w, 1 / 60);
        const moved = Math.hypot(e.x - x, e.y - y) / (e.speed / 60);
        if (e.kind === kind) share ??= moved;
        else other ??= moved;
        return;
      }
    });
    return { share, other };
  };
  // Next wave: that kind walks at CANNON.lectureSlow. (Sell the lectern first, so it can't take a new note.)
  const lec = api.world.towers.find((t) => t.kind === "lectern")!;
  api.pointer(lec.x, lec.y, "down");
  api.sellSelected();
  const next = pace();
  assert.ok(next.share != null, `a ${kind} walked`);
  assert.ok(Math.abs(next.share! - CANNON.lectureSlow) < 0.02, `${kind} at ${next.share}`);
  if (next.other != null) assert.ok(Math.abs(next.other - 1) < 0.02, "other kinds walk as usual");
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer[0].id);
  // The wave after: back to normal.
  const later = pace();
  if (later.share != null) assert.ok(Math.abs(later.share - 1) < 0.02, `${kind} back to full speed (${later.share})`);
});

test("a fruit that died near the entrance slows nothing", () => {
  const api = start();
  build(api, "lectern");
  api.dismissSelection();
  const log = playWave(api, popAtDoor(api));
  assert.match(log, /Nothing got far\. I have nothing to add\./);
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer[0].id);
  // Next wave every fruit walks at full speed.
  let slowest = 1;
  playWave(api, () => {
    noDamage(api)();
    const w = api.world;
    for (const e of w.enemies) {
      if (e.hp <= 0 || e.slow !== 1 || e.wp < 1 || e.wp >= w.points.length - 1) continue;
      const wp = w.points[e.wp];
      if (Math.hypot(wp.x - e.x, wp.y - e.y) < 10) continue;
      const [x, y] = [e.x, e.y];
      stepWorld(w, 1 / 60);
      slowest = Math.min(slowest, Math.hypot(e.x - x, e.y - y) / (e.speed / 60));
      return;
    }
  });
  assert.ok(slowest > 0.98, `nobody slowed (${slowest})`);
});

/** The Doctor at `level`, with these perk picks per open tier. */
const doctor = (level: number, picks: Array<0 | 1 | null>): KeeperProgress => ({ ...emptyProgress(), scholar: { xp: xpForLevel(level), picks } });

test("Annotated: taking the Doctor's pick pays 20 seeds; a normal card doesn't", () => {
  const api = start("scholar", doctor(2, [1, null, null, null, null]));
  playWave(api, noDamage(api));
  const before = api.world.hud.seeds;
  const pick = api.world.hud.pickCards[0];
  api.pickUpgrade(pick);
  assert.equal(api.world.hud.seeds - before, 20 + (pick === "seeds" ? 55 : 0));
});

test("Second Opinion: his shelves show two Doctor's picks (five cards)", () => {
  const api = start("scholar", doctor(6, [0, 0, 1, null, null]));
  playWave(api, noDamage(api));
  assert.equal(api.world.hud.pickCards.length, 2);
  assert.equal(api.world.hud.offer.length, 5);
});

test("Close Reading: each Doctor's pick taken makes his cannons fire 4% faster, up to three", () => {
  const api = start("scholar", doctor(8, [0, 0, 0, 1, null]));
  const melon = build(api, "melon");
  api.dismissSelection();
  const plain = api.statsOf(melon.id)!.interval;
  playWave(api, noDamage(api));
  api.pickUpgrade(api.world.hud.pickCards[0]);
  const after = api.statsOf(melon.id)!.interval;
  // The pick may itself be a speed card; compare against the same cards without the perk's share.
  api.world.runLog.doctorTaken = 0;
  const without = api.statsOf(melon.id)!.interval;
  assert.ok(Math.abs(after - without / 1.04) < 1e-9, `${after} vs ${without} (plain ${plain})`);
  api.world.runLog.doctorTaken = 7;
  assert.ok(Math.abs(api.statsOf(melon.id)!.interval - without / 1.12) < 1e-9, "capped at three");
});

test("Second Lectern (level 10): he can build two History Lecterns", () => {
  const api = start("scholar", doctor(MAX_LEVEL, [0, 0, 0, 0, 0]));
  build(api, "lectern");
  api.dismissSelection();
  build(api, "lectern");
  assert.equal(api.world.towers.filter((t) => t.kind === "lectern").length, 2);
});
