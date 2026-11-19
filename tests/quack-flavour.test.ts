import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CANNON,
  CELL,
  HEROES,
  MAX_LEVEL,
  PERK_LEVELS,
  activePerks,
  createWorld,
  emptyProgress,
  maxedProgress,
  stepWorld,
  xpForLevel,
  type KeeperProgress,
} from "../src/game/engine.ts";
import { openingLine, winLine } from "../src/game/keeperVoice.ts";
import { ACHIEVEMENTS, emptyLedger, emptyRunLog, type NightContext } from "../src/game/achievements.ts";

// ── His own lines ────────────────────────────────────────────────────────────

test("Quackarot's opening and victory lines are his own, on Midnight, the Overflow and the Siege", () => {
  for (const night of ["midnight", "overflow", "siege"] as const) {
    const his = openingLine("quack", night);
    for (const other of HEROES.filter((h) => h !== "quack")) assert.notEqual(his, openingLine(other, night), `${night}: same as ${other}`);
    assert.doesNotMatch(his, /one more book/i);
  }
  const win = winLine("quack");
  assert.match(win, /^Quackarot: /);
  for (const other of HEROES.filter((h) => h !== "quack")) assert.notEqual(win.replace(/^[^:]+: /, ""), winLine(other).replace(/^[^:]+: /, ""));
  assert.doesNotMatch(win, /accidents that worked/i);
  // And the night actually opens with it.
  const api = createWorld(() => {}, { keepers: emptyProgress() });
  api.openSetup();
  api.chooseHero("quack");
  assert.equal(api.world.hud.log, openingLine("quack", "midnight"));
});

// ── Puns only ────────────────────────────────────────────────────────────────

test("no real Dragon Ball names or terms in anything a player reads", () => {
  const files = [
    "src/game/rules.ts",
    "src/game/levels.ts",
    "src/game/engine.ts",
    "src/game/achievements.ts",
    "src/game/keeperVoice.ts",
    "src/game/keeperSheets.ts",
    "src/game/catalogue.ts",
    "src/components/keeperCards.ts",
    "src/components/GameHUD.tsx",
    "src/components/MynxiTutor.tsx",
  ];
  const banned = /kamehameha|saiyan|senzu|goku|kakarot|spirit bomb|instant transmission|dragon ?ball/i;
  for (const f of files) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    const hit = text.match(banned);
    assert.equal(hit, null, `${f}: ${hit?.[0]}`);
  }
});

// ── Over Nine Thousand Quacks ────────────────────────────────────────────────

const center = (n: number) => n * CELL + CELL / 2;

/** A Quackarot night with every tier's pick at `pick` (1: Over Nine Thousand Quacks at tier 4), and a Melon cannon. */
function night(pick: 0 | 1, lives: number) {
  const keepers: KeeperProgress = maxedProgress(pick);
  const api = createWorld(() => {}, { keepers });
  api.openSetup();
  api.chooseHero("quack");
  api.beginNight();
  const w = api.world;
  w.hud.seeds = 999;
  // A Melon cannon somewhere off the carpet (no Quack-Liber on the board, so no aura).
  api.chooseBuild("melon");
  for (let r = 0; r < w.rows && !w.towers.length; r++)
    for (let c = 0; c < w.cols && !w.towers.length; c++) {
      if (w.pathCells.has(`${c},${r}`) || w.shelfCells.has(`${c},${r}`)) continue;
      api.pointer(center(c), center(r), "down");
    }
  const melon = w.towers[0];
  assert.ok(melon, "a melon to watch");
  w.hud.lives = lives;
  return { api, w, melon };
}

/** Walk fruit straight to the door until `done` (or the wave ends). */
function leakUntil(api: ReturnType<typeof night>["api"], done: () => boolean) {
  const w = api.world;
  if (w.hud.phase !== "combat") api.startWave();
  for (let i = 0; i < 60 * 240 && w.hud.phase === "combat" && !done(); i++) {
    for (const e of w.enemies) e.hp = Math.max(e.hp, 1e6);
    stepWorld(w, 1 / 60);
  }
}

test("Over Nine Thousand Quacks: golden once, the first time stacks reach CANNON.overQuackAt; every tower faster for its time, then back", () => {
  const { api, w, melon } = night(1, CANNON.overQuackAt + 1);
  const plain = api.statsOf(melon.id)!.interval;
  leakUntil(api, () => w.hud.golden > 0);
  assert.ok(w.hud.golden > 0, "golden");
  assert.ok(w.hud.lives <= CANNON.overQuackAt);
  assert.ok(w.runLog.wentGolden);
  const gold = api.statsOf(melon.id)!;
  assert.ok(Math.abs(gold.interval - plain / CANNON.overQuackHaste) < 1e-6, `${gold.interval} vs ${plain}`);
  assert.ok(gold.powered, "shown as powered up");
  // Then back to normal after its time.
  w.hud.lives = 999;
  const left = w.hud.golden;
  // It counts down in combat only, so a wave break doesn't use it up.
  if (w.hud.phase === "combat") {
    for (let i = 0; i < 60 * 60 && w.hud.golden > 0 && w.hud.phase === "combat"; i++) stepWorld(w, 1 / 60);
  }
  if (w.hud.golden > 0) {
    const held = w.hud.golden;
    for (let i = 0; i < 60; i++) stepWorld(w, 1 / 60);
    assert.equal(w.hud.golden, held, "between waves it waits");
    w.hud.golden = 0.05;
    w.hud.phase = "combat";
    stepWorld(w, 0.1);
  }
  assert.equal(w.hud.golden, 0, "over after its time");
  void left;
  assert.ok(Math.abs(api.statsOf(melon.id)!.interval - plain) < 1e-6);
  // Never twice in a night, even at fewer stacks.
  w.hud.lives = 3;
  leakUntil(api, () => w.hud.lives < 3);
  assert.equal(w.hud.golden, 0, "only once a night");
});

test("Over Nine Thousand Quacks: nothing without the perk", () => {
  const { api, w } = night(0, CANNON.overQuackAt + 1);
  leakUntil(api, () => w.hud.lives <= CANNON.overQuackAt - 1);
  assert.ok(w.hud.lives <= CANNON.overQuackAt - 1, "fruit did leak");
  assert.equal(w.hud.golden, 0);
  assert.ok(!w.runLog.wentGolden);
});

test("Power Level: Absurd: a Quackarot win after going golden, and not otherwise", () => {
  const ach = ACHIEVEMENTS.find((a) => a.id === "power-level")!;
  assert.equal(ach.shelf, "staff");
  assert.equal(ach.tier, 2);
  const ctx = (won: boolean, golden: boolean, hero: "quack" | "mynxi" = "quack"): NightContext => ({
    log: { ...emptyRunLog(), wentGolden: golden },
    hero,
    night: "midnight",
    difficulty: "normal",
    map: "stacks",
    won,
    cleared: 21,
    seeds: 0,
    stacks: 3,
    slips: [],
    ledger: emptyLedger(),
    endlessBest: 0,
    fragmentsEarned: 0,
    rooms: [],
  });
  assert.ok(ach.check(ctx(true, true)));
  assert.ok(!ach.check(ctx(true, false)));
  assert.ok(!ach.check(ctx(false, true)));
  assert.ok(!ach.check(ctx(true, true, "mynxi")));
});

// ── Saved picks ──────────────────────────────────────────────────────────────

test("perk picks saved before the rename load to the same tier and index", () => {
  const rec = { xp: xpForLevel(MAX_LEVEL), picks: [0, 1, 0, 1, 1] as Array<0 | 1 | null> };
  const names = activePerks("quack", rec).map((p) => p.name);
  assert.equal(names.length, PERK_LEVELS.length);
  assert.deepEqual(names, ["Bean Bag", "Bigger Blasts", "Quack-hameha", "Over Nine Thousand Quacks", "Focused Ki"]);
  const other = activePerks("quack", { ...rec, picks: [1, 0, 1, 0, 0] }).map((p) => p.name);
  assert.deepEqual(other, ["Plot Armour", "Big Aura", "Ground Pound", "Blinded by the Light", "Tag Team"]);
});
