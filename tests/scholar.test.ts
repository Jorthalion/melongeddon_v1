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

test("he starts poorer: 8 stacks and 100 seeds", () => {
  assert.deepEqual(KEEPER_START.scholar, { seeds: 100, lives: 8 });
  const api = createWorld(() => {}, { keepers: emptyProgress() });
  api.openSetup();
  api.chooseHero("scholar");
  api.beginNight();
  assert.equal(api.world.hud.seeds, 100);
  assert.equal(api.world.hud.lives, 8);
  assert.equal(api.world.hud.maxLives, 8);
});

test("his shelf has three real upgrades and one wrong book; Mynxi's has three real ones", () => {
  const api = start();
  playWave(api, noDamage(api));
  const h = api.world.hud;
  assert.equal(h.phase, "upgrade");
  assert.equal(h.offer.length, 4);
  const wrong = h.falseCard!;
  assert.ok(wrong, "one card is the wrong book");
  assert.ok(h.offer.some((u) => u.id === wrong));
  assert.equal(h.offer.filter((u) => u.id !== wrong).length, 3, "three real ones");
  assert.ok(!h.upgrades.includes(wrong), "it is not one he owns");
  const card = h.offer.find((u) => u.id === wrong)!;
  assert.equal(card.name, UPGRADES[wrong].name, "it looks like the real thing");
  assert.equal(card.blurb, UPGRADES[wrong].blurb);
  assert.equal(new Set(h.offer.map((u) => u.id)).size, 4, "and it isn't a copy of a card on the shelf");

  const mynxi = start("mynxi");
  playWave(mynxi, noDamage(mynxi));
  assert.equal(mynxi.world.hud.offer.length, 3);
  assert.equal(mynxi.world.hud.falseCard, null);
});

test("the wrong book adds nothing; the next wave his cannons hit softer and slower; the wave after, they don't", () => {
  const api = start();
  const melon = build(api, "melon");
  api.dismissSelection();
  const plain = api.statsOf(melon.id)!;
  playWave(api, noDamage(api));
  const h = api.world.hud;
  const owned = [...h.upgrades];
  const wrong = h.falseCard as UpgradeId;
  api.pickUpgrade(wrong);
  assert.deepEqual(h.upgrades, owned, "nothing was added");
  assert.equal(h.phase, "prep");
  assert.equal(api.world.hud.keepers.scholar.misread, true, "he has now been fooled once");

  // Next wave: the penalty.
  const during: { v: { dmg: number; interval: number } | null } = { v: null };
  playWave(api, () => {
    noDamage(api)();
    during.v ??= api.statsOf(melon.id)!;
  });
  const seen = during.v;
  assert.ok(seen, "measured during the wave");
  assert.ok(Math.abs(seen.dmg - plain.dmg * (1 - CANNON.misread)) < 1e-9, `damage ${seen.dmg} vs ${plain.dmg}`);
  assert.ok(Math.abs(seen.interval - plain.interval * (1 + CANNON.misread)) < 1e-9, "slower between shots");

  // The wave after: gone.
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer.find((u) => u.id !== api.world.hud.falseCard)!.id);
  const later: { v: { dmg: number; interval: number } | null } = { v: null };
  const base = api.statsOf(melon.id)!; // with whatever real upgrade was just taken
  playWave(api, () => {
    noDamage(api)();
    later.v ??= api.statsOf(melon.id)!;
  });
  assert.ok(later.v);
  assert.equal(later.v.dmg, base.dmg);
  assert.equal(later.v.interval, base.interval);
});

test("a real card lasts the night", () => {
  const api = start();
  playWave(api, noDamage(api));
  const real = api.world.hud.offer.find((u) => u.id !== api.world.hud.falseCard)!.id as UpgradeId;
  api.pickUpgrade(real);
  assert.ok(api.world.hud.upgrades.includes(real));
  for (let n = 0; n < 3; n++) {
    playWave(api, noDamage(api));
    if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer.find((u) => u.id !== api.world.hud.falseCard)!.id);
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

test("a fruit that got 75% of the way slows its kind next wave at 0.85, and not the wave after", () => {
  const api = start();
  build(api, "lectern");
  api.dismissSelection();
  const log = playWave(api, noDamage(api)); // everything leaks
  const m = log.match(/(The melons|The corn|The pumpkins|Karl) got furthest\. (They|He) will be slower\./);
  assert.ok(m, `the Lectern speaks: "${log}"`);
  const kind = KIND_OF[m![1]];
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer.find((u) => u.id !== api.world.hud.falseCard)!.id);

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
  // Next wave: that kind walks at 0.85. (Sell the lectern first, so it can't take a new note.)
  const lec = api.world.towers.find((t) => t.kind === "lectern")!;
  api.pointer(lec.x, lec.y, "down");
  api.sellSelected();
  const next = pace();
  assert.ok(next.share != null, `a ${kind} walked`);
  assert.ok(Math.abs(next.share! - CANNON.lectureSlow) < 0.02, `${kind} at ${next.share}`);
  if (next.other != null) assert.ok(Math.abs(next.other - 1) < 0.02, "other kinds walk as usual");
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer.find((u) => u.id !== api.world.hud.falseCard)!.id);
  // The wave after: back to normal.
  const later = pace();
  if (later.share != null) assert.ok(Math.abs(later.share - 1) < 0.02, `${kind} back to full speed (${later.share})`);
});

test("a fruit that died near the entrance slows nothing", () => {
  const api = start();
  build(api, "lectern");
  api.dismissSelection();
  const log = playWave(api, popAtDoor(api));
  assert.match(log, /Nothing reached the stacks\. I have nothing to add\./);
  if (api.world.hud.phase === "upgrade") api.pickUpgrade(api.world.hud.offer.find((u) => u.id !== api.world.hud.falseCard)!.id);
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

test("Marginalia: once he's been fooled, a later shelf's wrong book is the one marked \"sic\"", () => {
  const top = (misread: boolean): KeeperProgress => ({
    ...emptyProgress(),
    scholar: { xp: xpForLevel(MAX_LEVEL), picks: [0, 0, 0, 0, 0], misread },
  });
  const fresh = start("scholar", top(false));
  playWave(fresh, noDamage(fresh));
  assert.ok(fresh.world.hud.falseCard);
  assert.equal(fresh.world.hud.sicCard, null, "not before he's ever been fooled");
  // Take it: now he has been.
  fresh.pickUpgrade(fresh.world.hud.falseCard!);
  assert.equal(fresh.world.hud.keepers.scholar.misread, true);
  playWave(fresh, noDamage(fresh));
  if (fresh.world.hud.phase === "upgrade") {
    assert.ok(fresh.world.hud.falseCard);
    assert.equal(fresh.world.hud.sicCard, fresh.world.hud.falseCard, "this night's next shelf is marked");
  }
  // And on a later night.
  const later = start("scholar", top(true));
  playWave(later, noDamage(later));
  assert.ok(later.world.hud.falseCard);
  assert.equal(later.world.hud.sicCard, later.world.hud.falseCard);
  // Without Marginalia (below level 10), never.
  const low = start("scholar", { ...emptyProgress(), scholar: { xp: xpForLevel(8), picks: [0, 0, 0, 0, null], misread: true } });
  playWave(low, noDamage(low));
  assert.equal(low.world.hud.sicCard, null);
});

test("his perks bend the wrong book, never the numbers: Erratum and Margin", () => {
  // Erratum (level 2, first): the penalty is 8%.
  const erratum: KeeperProgress = { ...emptyProgress(), scholar: { xp: xpForLevel(2), picks: [0, null, null, null, null] } };
  const api = start("scholar", erratum);
  const melon = build(api, "melon");
  api.dismissSelection();
  const plain = api.statsOf(melon.id)!.dmg;
  playWave(api, noDamage(api));
  api.pickUpgrade(api.world.hud.falseCard!);
  const during: { v: number | null } = { v: null };
  playWave(api, () => {
    noDamage(api)();
    during.v ??= api.statsOf(melon.id)!.dmg;
  });
  assert.ok(during.v != null && Math.abs(during.v - plain * 0.92) < 1e-9, `8% softer (${during.v} vs ${plain})`);

  // Margin (level 8, second): the wrong book's description is shorter than the real one's.
  const margin: KeeperProgress = { ...emptyProgress(), scholar: { xp: xpForLevel(8), picks: [0, 0, 0, 1, null] } };
  const m = start("scholar", margin);
  playWave(m, noDamage(m));
  const wrong = m.world.hud.falseCard!;
  const card = m.world.hud.offer.find((u) => u.id === wrong)!;
  assert.equal(card.name, UPGRADES[wrong].name, "same name");
  assert.ok(card.blurb.length < UPGRADES[wrong].blurb.length, `shorter: "${card.blurb}"`);
});
