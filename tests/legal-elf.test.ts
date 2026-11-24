import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANNON,
  CELL,
  ELF_VALUES,
  HEROES,
  MAX_LEVEL,
  UNHINGED,
  UPGRADES,
  activePerks,
  backRoomPrice,
  carpetAlong,
  createWorld,
  emptyProgress,
  loadProgress,
  nearestOnCarpet,
  perkFx,
  promptOffer,
  stepWorld,
  xpForLevel,
  type HeroId,
  type PerkPicks,
  type TowerKind,
  type UpgradeId,
} from "../src/game/engine.ts";

type Api = ReturnType<typeof createWorld>;
type W = Api["world"];
type Enemy = W["enemies"][number];
const center = (n: number) => n * CELL + CELL / 2;

/** A keeper on the Stacks with plenty of seeds and stacks; `picks` at level 10 (else no perks). */
function onBoard(hero: HeroId = "elf", picks?: PerkPicks) {
  const keepers = emptyProgress();
  if (picks) keepers[hero] = { xp: xpForLevel(MAX_LEVEL), picks };
  const api = createWorld(() => {}, { keepers });
  api.openSetup();
  api.chooseHero(hero);
  api.beginNight();
  api.world.hud.seeds = 9999;
  api.world.hud.lives = 999;
  return api;
}

const route = (w: W) => w.routes[0] ?? w.points;
const along = (w: W, e: Enemy) => carpetAlong(route(w), e.x, e.y, e.wp, Boolean(e.reverse));
const total = (w: W) => carpetAlong(route(w), route(w)[0].x, route(w)[0].y, 1, false).total;

/** Put `e` on the carpet `d` px from where it comes in. */
function putAt(w: W, e: Enemy, d: number) {
  const pts = route(w);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (acc + L >= d || i === pts.length - 1) {
      const t = Math.min(1, Math.max(0, (d - acc) / L));
      e.x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
      e.y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
      e.wp = i;
      e.reverse = false;
      e.route = 0;
      return;
    }
    acc += L;
  }
}

/** Start a wave and return `n` plain fruit of our own (the wave's own fruit are cleared away). */
function fruit(api: Api, n: number, hp = 10000): Enemy[] {
  const w = api.world;
  if (w.hud.phase !== "combat") api.startWave();
  for (let i = 0; i < 60 * 30 && !w.enemies.length; i++) {
    for (const t of w.towers) t.cd = 99;
    stepWorld(w, 1 / 60);
  }
  const tpl = w.enemies[0];
  assert.ok(tpl, "a fruit came in");
  const out: Enemy[] = [];
  for (let i = 0; i < n; i++)
    out.push({ ...tpl, id: 900000 + i, hp, maxHp: hp, guard: "none", shell: 0, boss: false, gold: 0, speed: 0, honeyed: 0, stomped: 0, halt: 0, overruled: 0, freeze: 0, chill: 0, ink: 0 });
  w.enemies = out;
  return out;
}

/** Build `kind` on the open tile beside the carpet nearest the middle of the board. */
function build(api: Api, kind: TowerKind) {
  const w = api.world;
  api.dismissSelection();
  api.chooseBuild(kind);
  const spots: Array<[number, number]> = [];
  for (let r = 0; r < w.rows; r++)
    for (let c = 0; c < w.cols; c++) {
      const k = `${c},${r}`;
      if (w.pathCells.has(k) || w.shelfCells.has(k) || w.towers.some((t) => t.c === c && t.r === r)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.pathCells.has(`${c + a},${r + b}`))) spots.push([c, r]);
    }
  spots.sort((a, b) => Math.hypot(a[0] - w.cols / 2, a[1] - w.rows / 2) - Math.hypot(b[0] - w.cols / 2, b[1] - w.rows / 2));
  for (const [c, r] of spots) {
    const before = w.towers.length;
    api.pointer(center(c), center(r), "down");
    if (w.towers.length > before) {
      const t = w.towers[w.towers.length - 1];
      api.dismissSelection();
      return t.kind === kind ? t : undefined;
    }
  }
}

/** How far along the carpet the point nearest this tower is. */
const spotFor = (w: W, t: { x: number; y: number }) => nearestOnCarpet(route(w), t.x, t.y).along;

const floated = (w: W, text: string) => w.floaters.some((f) => f.text === text);

/** Clear waves until `cleared` are done, taking the first card on every shelf (Prompt Drop's shelves are recorded). */
function playTo(api: Api, cleared: number, shelves: Array<{ after: number; ids: UpgradeId[] }>) {
  const w = api.world;
  let done = 0;
  for (let guard = 0; guard < 200 && done < cleared; guard++) {
    if (w.hud.phase === "prep" || w.hud.phase === "consequence") api.startWave();
    for (let i = 0; i < 60 * 300 && w.hud.phase === "combat"; i++) {
      w.enemies.length = 0;
      stepWorld(w, 1 / 60);
    }
    done += 1;
    for (let g = 0; g < 4 && w.hud.phase === "upgrade"; g++) {
      shelves.push({ after: done, ids: w.hud.offer.map((u) => u.id as UpgradeId) });
      api.pickUpgrade(w.hud.offer.find((u) => !UNHINGED.includes(u.id as UpgradeId))?.id as UpgradeId);
    }
  }
}

test("no discount: the Legal Elf's back-room price is everyone else's", () => {
  for (const [owned, visits] of [[0, 1], [1, 2], [3, 4]]) {
    assert.equal(backRoomPrice("elf", owned, visits, null), backRoomPrice("scholar", owned, visits, null));
    assert.equal(backRoomPrice("elf", owned, visits, null), backRoomPrice("michael", owned, visits, null));
  }
  const api = onBoard();
  assert.equal(api.shopPriceFor("melon"), 40);
  // Hard Bargain is gone from his perks.
  for (const row of perkRows("elf")) for (const p of row) assert.notEqual(p.name, "Hard Bargain");
});

function perkRows(hero: HeroId) {
  return [0, 1].map((pick) => activePerks(hero, { xp: xpForLevel(MAX_LEVEL), picks: [pick, pick, pick, pick, pick] as PerkPicks }));
}

test("Objection!: fruit on the last three tiles are thrown back 4 tiles (bosses 1) and honeyed; others are left alone", () => {
  const api = onBoard();
  const w = api.world;
  const [a, b, c, boss, far] = fruit(api, 5);
  const end = total(w);
  putAt(w, a, end - 0.5 * CELL);
  putAt(w, b, end - 1.5 * CELL);
  putAt(w, c, end - 2.5 * CELL);
  putAt(w, boss, end - 1 * CELL);
  boss.boss = true;
  putAt(w, far, end - 6 * CELL);
  const before = new Map(w.enemies.map((e) => [e.id, along(w, e).along]));
  assert.equal(w.hud.objections, 1, "one a wave");
  assert.equal(api.objection(), 4, "four overruled");
  for (const e of [a, b, c]) {
    assert.ok(Math.abs(before.get(e.id)! - along(w, e).along - ELF_VALUES.objectionBack * CELL) < 0.5, "thrown back objectionBack tiles");
    assert.ok((e.honeyed ?? 0) >= CANNON.honeyTime - 1e-6, "honeyed");
  }
  assert.ok(Math.abs(before.get(boss.id)! - along(w, boss).along - ELF_VALUES.objectionBossBack * CELL) < 0.5, "the boss budges one tile");
  assert.ok((boss.honeyed ?? 0) > 0, "the boss is honeyed too");
  assert.equal(along(w, far).along, before.get(far.id), "outside the zone: untouched");
  assert.equal(far.honeyed, 0);
  assert.ok(floated(w, "OBJECTION!") && floated(w, "overruled"));
  assert.match(w.hud.log, /Objection!/);
  // Spent: a second press this wave does nothing, even with fruit at the door.
  assert.equal(w.hud.objections, 0);
  putAt(w, far, end - 0.5 * CELL);
  const at = along(w, far).along;
  assert.equal(api.objection(), 0);
  assert.equal(along(w, far).along, at);
  assert.match(w.hud.objectionWhy, /Spent/);
});

test("Objection!'s fine print: overruled fruit walk 10% faster for 3 s", () => {
  const api = onBoard();
  const w = api.world;
  const [ruled, plain] = fruit(api, 2);
  const end = total(w);
  // Both in the zone; Objection throws both back to the same spot, then one forgets it was overruled.
  putAt(w, ruled, end - CELL);
  putAt(w, plain, end - CELL);
  assert.equal(api.objection(), 2);
  assert.ok(Math.abs((ruled.overruled ?? 0) - ELF_VALUES.finePrintTime) < 1e-6, "3 s of fine print");
  plain.overruled = 0;
  for (const e of [ruled, plain]) {
    e.speed = 30;
    e.honeyed = 0;
  }
  const from = along(w, ruled).along;
  stepWorld(w, 1 / 60);
  const fast = along(w, ruled).along - from;
  const slow = along(w, plain).along - from;
  assert.ok(slow > 0, "they walk");
  assert.ok(Math.abs(fast / slow - ELF_VALUES.finePrintHaste) < 0.01, `${fast} vs ${slow}`);
  for (let i = 0; i < 60 * ELF_VALUES.finePrintTime; i++) stepWorld(w, 1 / 60);
  assert.ok((ruled.overruled ?? 0) <= 0, "it wears off");
});

test("Objection! with nothing in the zone isn't spent; it recharges each wave; other keepers can't object", () => {
  const api = onBoard();
  const w = api.world;
  const [e] = fruit(api, 1);
  putAt(w, e, total(w) - 8 * CELL);
  assert.equal(api.objection(), 0);
  assert.equal(w.hud.objections, 1, "not spent");
  assert.match(w.hud.log, /No grounds for objection/);
  assert.match(w.hud.objectionWhy, /No grounds/);
  putAt(w, e, total(w) - CELL);
  assert.equal(api.objection(), 1);
  assert.equal(w.hud.objections, 0);
  // The next wave: back to one.
  playTo(api, 1, []);
  api.startWave();
  assert.equal(w.hud.objections, 1, "recharged");
  // Another keeper.
  // (Sir Michael chooses his armour before his first wave, so he sits this one out.)
  for (const hero of HEROES.filter((h) => h !== "elf" && h !== "michael")) {
    const other = onBoard(hero);
    const [o] = fruit(other, 1);
    putAt(other.world, o, total(other.world) - CELL);
    const at = along(other.world, o).along;
    assert.equal(other.world.hud.objections, 0, hero);
    assert.equal(other.objection(), 0, hero);
    assert.equal(along(other.world, o).along, at, `${hero}: nothing moved`);
  }
});

test("Sustained: two Objections a wave, not three", () => {
  const api = onBoard("elf", [0, 0, 1, 1, 0]);
  const w = api.world;
  assert.equal(perkFx("elf", { xp: xpForLevel(MAX_LEVEL), picks: [0, 0, 1, 1, 0] }).objections, 1);
  const [e] = fruit(api, 1);
  assert.equal(w.hud.objections, 2);
  for (const n of [1, 1, 0]) {
    putAt(w, e, total(w) - CELL);
    assert.equal(api.objection(), n);
    if (n && (w.hud.objections as number) === 0) assert.match(w.hud.log, /Sustained\. Again\./, "the second one's line");
  }
});

test("Foot of the Law: a plain fruit is blocked for stompStun; a honeyed one is stuck fast for twice that", () => {
  const api = onBoard();
  const w = api.world;
  const foot = build(api, "stomp");
  assert.ok(foot);
  const [plain] = fruit(api, 1);
  putAt(w, plain, spotFor(w, foot));
  foot.cd = 0;
  stepWorld(w, 1 / 60);
  assert.ok(Math.abs((plain.stomped ?? 0) - CANNON.stompStun) < 0.05, `blocked for ${plain.stomped}`);
  assert.ok(floated(w, "blocked"), "the float says blocked");
  assert.ok(!floated(w, "stuck fast"));
  assert.equal(plain.honeyed, 0, "no honey to spread");

  const api2 = onBoard();
  const w2 = api2.world;
  const foot2 = build(api2, "stomp")!;
  const [sticky, boss] = fruit(api2, 2);
  boss.boss = true;
  for (const e of [sticky, boss]) {
    putAt(w2, e, spotFor(w2, foot2));
    e.honeyed = 3;
  }
  foot2.cd = 0;
  stepWorld(w2, 1 / 60);
  assert.ok(Math.abs((sticky.stomped ?? 0) - CANNON.stompStun * 2) < 0.05, `stuck fast for ${sticky.stomped}`);
  assert.ok(Math.abs((boss.stomped ?? 0) - CANNON.stompStunBoss * 2) < 0.05, `the boss for ${boss.stomped}`);
  assert.ok(floated(w2, "stuck fast"));
  assert.ok(w2.stomps.some((s) => s.honey), "the foot is drawn with amber drips");
});

test("a stomp spreads honey to every fruit under the foot (Contempt of Court: honey or not)", () => {
  const api = onBoard();
  const w = api.world;
  const foot = build(api, "stomp")!;
  const crowd = fruit(api, 3);
  for (const e of crowd) putAt(w, e, spotFor(w, foot));
  crowd[0].honeyed = 1;
  foot.cd = 0;
  stepWorld(w, 1 / 60);
  for (const e of crowd) assert.ok((e.honeyed ?? 0) > CANNON.honeyTime - 0.05, "honeyed");

  const contempt = onBoard("elf", [0, 0, 0, 1, 0]);
  assert.equal(perkFx("elf", { xp: xpForLevel(MAX_LEVEL), picks: [0, 0, 0, 1, 0] }).stompHoney, 1);
  const cw = contempt.world;
  const cf = build(contempt, "stomp")!;
  const plain = fruit(contempt, 2);
  for (const e of plain) putAt(cw, e, spotFor(cw, cf));
  cf.cd = 0;
  stepWorld(cw, 1 / 60);
  for (const e of plain) {
    assert.ok((e.honeyed ?? 0) > CANNON.honeyTime - 0.05, "Contempt of Court honeys them");
    assert.ok(Math.abs((e.stomped ?? 0) - CANNON.stompStun) < 0.05, "but they were plain when it landed: blocked, not stuck");
  }
});

test("Billable Steps: a stomp on 5 fruit pays 3 seeds, on 2 fruit 2", () => {
  for (const [n, pay] of [[5, 3], [2, 2], [1, 1]]) {
    const api = onBoard();
    const w = api.world;
    const foot = build(api, "stomp")!;
    const crowd = fruit(api, n);
    for (const e of crowd) putAt(w, e, spotFor(w, foot));
    const seeds = w.hud.seeds;
    foot.cd = 0;
    stepWorld(w, 1 / 60);
    assert.equal(w.hud.seeds - seeds, pay, `${n} fruit`);
    assert.ok(floated(w, `+${pay}`));
  }
});

test("Heavy Footed: the foot lands 30% wider", () => {
  const reach = (picks?: PerkPicks) => {
    const api = onBoard("elf", picks);
    const w = api.world;
    const foot = build(api, "stomp")!;
    const [a, b] = fruit(api, 2);
    const at = spotFor(w, foot);
    putAt(w, a, at);
    // A second fruit 1.2 foot-widths along the carpet (whichever way stays on the straight).
    const gap = CANNON.stompRadius * 1.2;
    putAt(w, b, at + gap);
    if (Math.hypot(a.x - b.x, a.y - b.y) < gap - 1) putAt(w, b, at - gap);
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - gap) < 1, "on a straight");
    foot.cd = 0;
    stepWorld(w, 1 / 60);
    return [(a.stomped ?? 0) > 0, (b.stomped ?? 0) > 0].filter(Boolean).length;
  };
  assert.equal(reach(), 1, "a plain foot gets one");
  assert.equal(perkFx("elf", { xp: xpForLevel(MAX_LEVEL), picks: [0, 1, 0, 0, 0] }).stompWide, ELF_VALUES.heavyFooted);
  assert.equal(reach([0, 1, 0, 0, 0]), 2, "Heavy Footed gets both");
});

test("Sticky Situation: the Honeyed Heel keeps 4 prints down, and they last 10 s", () => {
  const prints = (picks?: PerkPicks) => {
    const api = onBoard("elf", picks);
    const w = api.world;
    const heel = build(api, "honey")!;
    api.startWave();
    let most = 0;
    let life = 0;
    for (let i = 0; i < 60 * 30 && w.hud.phase === "combat"; i++) {
      for (const e of w.enemies) if (e.maxHp < 99999) e.hp = e.maxHp = 99999;
      stepWorld(w, 1 / 60);
      const mine = w.pools.filter((p) => p.honey && p.owner === heel.id);
      most = Math.max(most, mine.length);
      for (const p of mine) life = Math.max(life, p.max);
    }
    return { most, life };
  };
  const plain = prints();
  assert.ok(plain.most <= CANNON.honeyMax && plain.life === CANNON.honeyLife);
  const sticky = prints([0, 0, 1, 0, 0]);
  assert.equal(sticky.most, ELF_VALUES.stickyMax);
  assert.equal(sticky.life, ELF_VALUES.stickyLife);
});

/** One Scales weighing of a fruit set up by `prep`: what it lost, and the seeds the hit paid. */
function weigh(prep: (e: Enemy) => void, hp = 10000, maxHp = hp) {
  const api = onBoard();
  const w = api.world;
  const scales = build(api, "scales")!;
  const [e] = fruit(api, 1, hp);
  e.maxHp = maxHp;
  putAt(w, e, spotFor(w, scales));
  prep(e);
  const seeds = w.hud.seeds;
  scales.cd = 0;
  stepWorld(w, 1 / 60);
  return { lost: hp - Math.max(0, e.hp), paid: w.hud.seeds - seeds, dmg: api.statsOf(scales.id)!.dmg, w };
}

test("the Scales take the court share from a stopped or honeyed fruit, and the plain share otherwise (bosses too)", () => {
  const M = 10000;
  for (const boss of [false, true]) {
    const plainShare = boss ? CANNON.scalesBossShare : CANNON.scalesShare;
    const courtShare = boss ? CANNON.scalesCourtBossShare : CANNON.scalesCourtShare;
    const plain = weigh((e) => (e.boss = boss));
    // However a boss's hits are scaled, the same scale applies to both weighings.
    const k = plain.lost / (plain.dmg + M * plainShare);
    const stomped = weigh((e) => {
      e.boss = boss;
      e.stomped = 5;
    });
    assert.ok(Math.abs(stomped.lost - k * (stomped.dmg + M * courtShare)) < 1, `boss ${boss}: stomped ${stomped.lost}`);
    assert.ok(floated(stomped.w, "guilty"));
    assert.ok(!floated(plain.w, "guilty"));
    const halted = weigh((e) => {
      e.boss = boss;
      e.halt = 5;
    });
    assert.ok(Math.abs(halted.lost - stomped.lost) < 1, "halted counts as stopped");
    // A honeyed fruit is in court too (and takes the honey's extra on top).
    const honeyed = weigh((e) => {
      e.boss = boss;
      e.honeyed = 5;
    });
    assert.ok(Math.abs(honeyed.lost - stomped.lost * CANNON.honeyAmp) < 1, `boss ${boss}: honeyed ${honeyed.lost}`);
  }
});

test("a kill from a court weighing pays double the fee", () => {
  const plain = weigh(() => {}, 1, 1000);
  assert.equal(plain.paid, CANNON.scalesFee);
  const court = weigh((e) => (e.stomped = 5), 1, 1000);
  assert.equal(court.paid, CANNON.scalesFee * 2);
  assert.ok(floated(court.w, `fee +${CANNON.scalesFee * 2}`));
});

test("Billable Hours is a back-room upgrade for the Scales: 5 more seeds a fee", () => {
  const api = onBoard();
  const w = api.world;
  const scales = build(api, "scales")!;
  scales.mods.push("billable");
  const [e] = fruit(api, 1, 1);
  e.maxHp = 1000;
  e.stomped = 5;
  putAt(w, e, spotFor(w, scales));
  const seeds = w.hud.seeds;
  scales.cd = 0;
  stepWorld(w, 1 / 60);
  assert.equal(w.hud.seeds - seeds, (CANNON.scalesFee + CANNON.scalesBillable) * 2);
});

test("the Scales' aim: between two fruit within 10% health, the one in court", () => {
  const aimed = (heavyHp: number, courtHp: number) => {
    const api = onBoard();
    const w = api.world;
    const scales = build(api, "scales")!;
    const [heavy, court] = fruit(api, 2);
    for (const e of [heavy, court]) putAt(w, e, spotFor(w, scales));
    heavy.hp = heavyHp;
    court.hp = courtHp;
    court.honeyed = 5;
    scales.cd = 99;
    stepWorld(w, 1 / 60);
    return scales.aimAt === court.id ? "court" : "heavy";
  };
  assert.equal(aimed(1000, 950), "court");
  assert.equal(aimed(1000, 800), "heavy");
  assert.equal(aimed(900, 1000), "court", "the heaviest anyway");
});

test("Prompt Drop: wave 5 brings an extra shelf with exactly one unhinged card; without it, no extra shelf", () => {
  const drop = onBoard("elf", [0, 0, 0, 0, 0]);
  assert.equal(perkFx("elf", { xp: xpForLevel(MAX_LEVEL), picks: [0, 0, 0, 0, 0] }).promptDrop, 1);
  const shelves: Array<{ after: number; ids: UpgradeId[] }> = [];
  playTo(drop, 5, shelves);
  const unhinged = (ids: UpgradeId[]) => ids.filter((id) => UNHINGED.includes(id)).length;
  for (const s of shelves.filter((s) => s.after < 5)) assert.equal(unhinged(s.ids), 0, `wave ${s.after}: an ordinary shelf`);
  const five = shelves.filter((s) => s.after === 5);
  assert.equal(five.length, 1, "one extra shelf after wave 5");
  assert.equal(unhinged(five[0].ids), 1, "with exactly one unhinged card");
  assert.equal(five[0].ids.length, 3);
  assert.equal(drop.world.hud.phase, "prep", "then back to the board");

  const none = onBoard("elf", [0, 0, 1, 0, 0]);
  const plain: Array<{ after: number; ids: UpgradeId[] }> = [];
  playTo(none, 5, plain);
  assert.equal(plain.filter((s) => s.after === 5).length, 0);
  assert.ok(plain.every((s) => unhinged(s.ids) === 0), "nobody else sees them");
  // Only the Legal Elf's Prompt Drop builds that shelf; an ordinary shelf never has them.
  assert.equal(unhinged(promptOffer([], null).map((u) => u.id as UpgradeId)), 1);
  assert.deepEqual(promptOffer([...UNHINGED], null), [], "none left: no shelf");
});

/** Take an unhinged card as if Prompt Drop offered it. */
function take(api: Api, id: UpgradeId) {
  const w = api.world;
  w.hud.offer = [UPGRADES[id]];
  w.hud.phase = "upgrade";
  api.pickUpgrade(id);
  assert.ok(w.hud.upgrades.includes(id));
}

/** Seeds one stomp kill of a fruit worth `gold` pays. */
function stompKill(api: Api, gold: number) {
  const w = api.world;
  const foot = build(api, "stomp")!;
  const [e] = fruit(api, 1, 0.1);
  e.gold = gold;
  putAt(w, e, spotFor(w, foot));
  const seeds = w.hud.seeds;
  foot.cd = 0;
  stepWorld(w, 1 / 60);
  assert.ok(e.hp <= 0, "killed");
  return w.hud.seeds - seeds;
}

test("each unhinged card applies its boost and its drawback", () => {
  // Billable in Advance: +60 now, 2 less a kill.
  const plain = onBoard();
  const advance = onBoard();
  const seeds = advance.world.hud.seeds;
  take(advance, "advance");
  assert.equal(advance.world.hud.seeds - seeds, ELF_VALUES.advanceSeeds);
  assert.equal(stompKill(plain, 5) - stompKill(advance, 5), ELF_VALUES.advanceKill);
  assert.equal(stompKill(onBoardWith("advance"), 1), CANNON.stompFee, "a kill never pays less than nothing");

  // Malpractice Insurance: +3 stacks, the back room 25% dearer.
  const mal = onBoard();
  const lives = mal.world.hud.lives;
  const max = mal.world.hud.maxLives;
  take(mal, "malpractice");
  assert.equal(mal.world.hud.lives - lives, ELF_VALUES.malpracticeLives);
  assert.equal(mal.world.hud.maxLives - max, ELF_VALUES.malpracticeLives);
  assert.equal(mal.shopPriceFor("melon"), Math.round(40 * ELF_VALUES.malpracticeMarkup));

  // Unhinged Cyberpop: 40% harder, and they shoot whatever's in reach.
  const base = onBoard();
  const pop = onBoardWith("cyberpop");
  const m1 = build(base, "melon")!;
  const m2 = build(pop, "melon")!;
  assert.equal(pop.statsOf(m2.id)!.dmg, Math.max(1, Math.round(base.statsOf(m1.id)!.dmg * ELF_VALUES.cyberpopDmg)));
  {
    const w = pop.world;
    const scales = build(pop, "scales")!;
    const crowd = fruit(pop, 6);
    for (const [i, e] of crowd.entries()) {
      putAt(w, e, spotFor(w, scales));
      e.hp = 1000 + i * 1000;
    }
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) {
      scales.cd = 99;
      stepWorld(w, 1 / 60);
      if (scales.aimAt != null) seen.add(scales.aimAt);
    }
    assert.ok(seen.size > 1, "not always the heaviest");
  }

  // Pro Bono: a stack back each wave, and the Scales work for free.
  const bono = onBoardWith("probono");
  bono.world.hud.lives = 5;
  bono.world.hud.maxLives = 12;
  playTo(bono, 1, []);
  assert.equal(bono.world.hud.lives, 5 + ELF_VALUES.probonoLives);
  const free = onBoardWith("probono");
  const w = free.world;
  const scales = build(free, "scales")!;
  const [e] = fruit(free, 1, 1);
  e.maxHp = 1000;
  putAt(w, e, spotFor(w, scales));
  const before = w.hud.seeds;
  scales.cd = 0;
  stepWorld(w, 1 / 60);
  assert.ok(e.hp <= 0);
  assert.equal(w.hud.seeds - before, 0, "no fee");
});

function onBoardWith(id: UpgradeId) {
  const api = onBoard();
  take(api, id);
  return api;
}

test("his perk rows: half about the feet, and none of the old discount perks", () => {
  const names = perkRows("elf").flat().map((p) => p.name);
  for (const name of ["Signing Bonus", "Indemnity", "Sustained", "Heavy Footed", "Prompt Drop", "Sticky Situation", "Precedent", "Contempt of Court", "Class Action", "Second Foot"])
    assert.ok(names.includes(name), name);
  for (const gone of ["Hard Bargain", "Billable Hours", "Fine Print", "Retainer", "Swift Ruling", "Second Scales"]) assert.ok(!names.includes(gone), gone);
  // Precedent raises both shares.
  const fx = perkFx("elf", { xp: xpForLevel(MAX_LEVEL), picks: [0, 0, 0, 0, 0] });
  assert.ok(Math.abs(CANNON.scalesShare + fx.share - 0.18) < 1e-9);
  assert.ok(Math.abs(CANNON.scalesCourtShare + fx.share - 0.26) < 1e-9);
});

test("a save holding a removed perk loads without error, as the new perk in that row", () => {
  const g = globalThis as unknown as { localStorage?: Storage };
  const had = g.localStorage;
  const store = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  try {
    // Picked before the rework: Hard Bargain, Retainer, Swift Ruling, Second Scales (picks are kept by row and side).
    store.set("melongeddon-keepers", JSON.stringify({ elf: { xp: xpForLevel(MAX_LEVEL), picks: [1, 0, 1, 1, 0] } }));
    const progress = loadProgress();
    const names = activePerks("elf", progress.elf).map((p) => p.name);
    assert.deepEqual(names, ["Indemnity", "Sustained", "Sticky Situation", "Contempt of Court", "Class Action"]);
    const api = createWorld(() => {}, { keepers: progress });
    api.openSetup();
    api.chooseHero("elf");
    api.beginNight();
    assert.equal(api.world.hud.phase, "prep");
  } finally {
    g.localStorage = had;
  }
});

test("Prompt Drop before the last wave: its shelf, then the last-wave card", () => {
  const api = onBoard("elf", [0, 0, 0, 0, 0]);
  const w = api.world;
  const shelves: Array<{ after: number; ids: UpgradeId[] }> = [];
  // playTo starts the finale from the consequence card itself, so stop one wave short and finish by hand.
  playTo(api, 19, shelves);
  assert.equal(w.hud.phase, "prep");
  api.startWave();
  for (let i = 0; i < 60 * 300 && (w.hud.phase as string) === "combat"; i++) {
    w.enemies.length = 0;
    stepWorld(w, 1 / 60);
  }
  assert.equal(w.hud.phase as string, "upgrade", "the drop's shelf first");
  assert.equal(w.hud.offer.filter((u) => UNHINGED.includes(u.id as UpgradeId)).length, 1);
  api.pickUpgrade(w.hud.offer[0].id as UpgradeId);
  assert.equal(w.hud.phase as string, "consequence", "then the last wave's card");
});
