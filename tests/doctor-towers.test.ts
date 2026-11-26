// Dr. Samodovol's keeper towers: the Study (a free mark on his best nearby tower each wave), the cheaper
// History Lectern that publishes two waves in, and the Archaeological Dig (a find every third wave).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANNON,
  CELL,
  DOCTOR,
  KEEPER_TOWERS,
  TOWERS,
  besideCarpet,
  createWorld,
  emptyProgress,
  stepWorld,
  type EnemyKind,
  type HeroId,
  type TowerKind,
} from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function start(hero: HeroId = "scholar") {
  const api = createWorld(() => {}, { keepers: emptyProgress() });
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.lives = 999;
  api.world.hud.maxLives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Tower = Api["world"]["towers"][number];

const free = (api: Api, c: number, r: number) => {
  const w = api.world;
  const k = `${c},${r}`;
  return !w.pathCells.has(k) && !w.shelfCells.has(k) && !w.vergeCells.has(k) && !w.trackCells.has(k) && !w.towers.some((t) => t.c === c && t.r === r);
};

/** Try to build `kind` on (c, r); the tower, or null if it wasn't placed. */
function buildAt(api: Api, kind: TowerKind, c: number, r: number): Tower | null {
  const w = api.world;
  w.hud.seeds = Math.max(w.hud.seeds, 999);
  api.dismissSelection();
  api.chooseBuild(kind);
  const before = w.towers.length;
  api.pointer(center(c), center(r), "down");
  api.dismissSelection();
  return w.towers.length > before ? w.towers[w.towers.length - 1] : null;
}

/** Build `kind` on the first free tile that passes `ok`. */
function build(api: Api, kind: TowerKind, ok: (c: number, r: number) => boolean = (c, r) => besideCarpet(api.world, c, r)): Tower {
  const w = api.world;
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      if (!free(api, c, r) || !ok(c, r)) continue;
      const t = buildAt(api, kind, c, r);
      if (t) return t;
    }
  throw new Error(`no room for ${kind}`);
}

/** Play the current wave to its end (taking the first shelf card if a shelf opens). `each` runs before every frame. */
function playWave(api: Api, each?: () => void) {
  const w = api.world;
  api.startWave();
  for (let i = 0; i < 60 * 300 && w.hud.phase === "combat"; i++) {
    each?.();
    stepWorld(w, 1 / 60);
  }
  const log = w.hud.log;
  if (w.hud.phase === "upgrade") api.pickUpgrade(w.hud.offer[0].id);
  return log;
}
/** No tower fires: every fruit walks the whole carpet. */
const noDamage = (api: Api) => () => {
  for (const t of api.world.towers) t.cd = 99;
};
const near = (a: { x: number; y: number }, b: { x: number; y: number }, d: number) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= d * d;

test("his tab has the Lectern, the Study and the Dig; the Lectern is cheaper", () => {
  assert.deepEqual(KEEPER_TOWERS.scholar, ["lectern", "study", "dig"]);
  assert.equal(TOWERS.lectern.cost, 35);
  assert.equal(TOWERS.study.cost, 90);
  assert.equal(TOWERS.dig.cost, 60);
  // Only the Doctor builds them.
  const api = start("mynxi");
  try {
    build(api, "study");
  } catch {
    // no tile took it
  }
  assert.ok(!api.world.towers.some((t) => t.kind === "study"));
});

test("the Study marks the tower in reach that did the most damage this wave: +12% damage, +6% reach", () => {
  const api = start();
  const melon = build(api, "melon");
  const study = build(api, "study", (c, r) => near(melon, { x: center(c), y: center(r) }, DOCTOR.studyReach));
  const plain = api.statsOf(melon.id)!;
  const log = playWave(api);
  assert.equal(melon.studyMarks, 1, log);
  assert.match(log, /The Study: the Melon cannon is studied \(1\/3 marks\)\./);
  const marked = api.statsOf(melon.id)!;
  assert.equal(marked.dmg, Math.max(1, Math.round(plain.dmg * (1 + DOCTOR.markDmg))));
  assert.equal(marked.range, Math.round(plain.range * (1 + DOCTOR.markRange)));
  assert.ok(study.studyMarks == null, "the Study itself gets nothing");
});

test("the Study gives one mark a wave, to the busier of two towers in reach, and none past three", () => {
  const api = start();
  const a = build(api, "melon");
  const b = build(api, "melon", (c, r) => besideCarpet(api.world, c, r) && near(a, { x: center(c), y: center(r) }, CELL * 1.5));
  build(api, "study", (c, r) => near(a, { x: center(c), y: center(r) }, DOCTOR.studyReach) && near(b, { x: center(c), y: center(r) }, DOCTOR.studyReach));
  // Only b fires this wave.
  const log = playWave(api, () => {
    a.cd = 99;
  });
  assert.equal(b.studyMarks, 1, log);
  assert.equal(a.studyMarks ?? 0, 0, "one mark a wave");
  // b is full (and, this wave, the only one firing): the mark goes to a, the only tower with room.
  b.studyMarks = DOCTOR.maxMarks;
  a.cd = 0;
  playWave(api, () => {
    b.cd = 99;
  });
  assert.equal(b.studyMarks, DOCTOR.maxMarks, "never past three");
  assert.equal(a.studyMarks, 1);
});

test("the Study leaves a tower outside its reach alone", () => {
  const api = start();
  const melon = build(api, "melon");
  build(api, "study", (c, r) => !near(melon, { x: center(c), y: center(r) }, DOCTOR.studyReach * 2));
  playWave(api);
  assert.equal(melon.studyMarks ?? 0, 0);
});

/** How far each kind moves in one frame next wave, as a share of its full speed (no tower fires). */
function paces(api: Api) {
  const seen = new Map<EnemyKind, number>();
  playWave(api, () => {
    noDamage(api)();
    const w = api.world;
    for (const e of w.enemies) {
      if (seen.has(e.kind) || e.hp <= 0 || e.slow !== 1 || e.wp < 1 || e.wp >= w.points.length - 1) continue;
      const wp = w.points[e.wp];
      if (Math.hypot(wp.x - e.x, wp.y - e.y) < 10) continue;
      const [x, y] = [e.x, e.y];
      stepWorld(w, 1 / 60);
      seen.set(e.kind, Math.hypot(e.x - x, e.y - y) / (e.speed / 60));
      return;
    }
  });
  return seen;
}
const NOTED = /(The melons|The corn|The pumpkins|Karl|The geese|The cats) got furthest/;
const KIND_OF: Record<string, EnemyKind> = { "The melons": "melon", "The corn": "corn", "The pumpkins": "pumpkin", Karl: "karl", "The geese": "goose", "The cats": "cat" };

test("the Lectern publishes two waves after it's built: every kind it noted walks slower for the rest of the night", () => {
  const api = start();
  build(api, "lectern");
  const first = playWave(api, noDamage(api));
  assert.doesNotMatch(first, /published/, "not after one wave");
  const firstKind = KIND_OF[first.match(NOTED)![1]];
  const second = playWave(api, noDamage(api));
  assert.match(second, /The Lectern's notes are published/);
  // Wave 2 opens a shelf: the pick's message keeps the Doctor's lines, so the player still reads them.
  assert.match(api.world.hud.log, /locked in for this run\. .*The Lectern's notes are published/);
  const lastKind = KIND_OF[second.match(NOTED)![1]];
  const third = paces(api);
  for (const [kind, share] of third) {
    const want = kind === lastKind ? CANNON.lectureSlow : kind === firstKind ? DOCTOR.archiveSlow : 1;
    assert.ok(Math.abs(share - want) < 0.02, `${kind} walks at ${share}, want ${want}`);
  }
  // It says so once.
  const later = api.world.hud.log;
  assert.doesNotMatch(later, /published/);
});

test("a sold Lectern's archive stops slowing", () => {
  const api = start();
  const lec = build(api, "lectern");
  playWave(api, noDamage(api));
  playWave(api, noDamage(api));
  api.pointer(lec.x, lec.y, "down");
  api.sellSelected();
  for (const [kind, share] of paces(api)) assert.ok(Math.abs(share - CANNON.lectureSlow) < 0.02 || Math.abs(share - 1) < 0.02, `${kind} at ${share}`);
});

test("the Dig can't go beside the carpet", () => {
  const api = start();
  const w = api.world;
  let tried = false;
  for (let r = 0; r < w.rows && !tried; r++)
    for (let c = 0; c < w.cols && !tried; c++) {
      if (!free(api, c, r) || !besideCarpet(w, c, r)) continue;
      tried = true;
      assert.equal(buildAt(api, "dig", c, r), null);
      assert.match(w.hud.log, /not right beside the carpet/);
    }
  assert.ok(tried);
  assert.ok(build(api, "dig", (c, r) => !besideCarpet(w, c, r)));
});

test("the Dig turns up a find every third wave, and you choose seeds, stacks or a Study mark", () => {
  const api = start();
  const melon = build(api, "melon");
  build(api, "dig", (c, r) => !besideCarpet(api.world, c, r));
  const h = api.world.hud;
  playWave(api);
  playWave(api);
  assert.equal(h.digFinds, 0);
  const log = playWave(api);
  assert.equal(h.digFinds, 1, log);
  assert.match(log, /The Dig turned something up/);
  const seeds = h.seeds;
  api.digFind("seeds");
  assert.equal(h.seeds, seeds + DOCTOR.digSeeds);
  assert.equal(h.digFinds, 0);
  api.digFind("seeds");
  assert.equal(h.seeds, seeds + DOCTOR.digSeeds, "nothing waiting, nothing paid");

  // Stacks: two back, never past the most you can hold.
  h.digFinds = 2;
  h.maxLives = 12;
  h.lives = 9;
  api.digFind("stacks");
  assert.equal(h.lives, 11);
  api.digFind("stacks");
  assert.equal(h.lives, 12);

  // A mark: on the best tower tonight.
  h.digFinds = 1;
  api.digFind("mark");
  assert.equal(melon.studyMarks, 1);
  assert.equal(api.world.runLog.digFinds, 1);
});
