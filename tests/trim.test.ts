import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, BOARDS, BOX_SEERS, DIFFICULTIES, createWorld, emptyProgress, trimSpawns, waveAt } from "../src/game/engine.ts";

test("a room's trim: fewer fruit from its wave on its difficulty only; bosses and single fruit untouched", () => {
  const trim = { easy: { from: 9, count: 0.75 } };
  const wave = [
    { kind: "pumpkin" as const, count: 8, every: 0.7 },
    { kind: "karl" as const, count: 1, every: 0.4 },
    { kind: "corn" as const, count: 2, every: 0.3 },
  ];
  assert.deepEqual(trimSpawns(wave, trim, "easy", 9).map((g) => g.count), [6, 1, 2]);
  assert.deepEqual(trimSpawns(wave, trim, "easy", 8).map((g) => g.count), [8, 1, 2], "before its wave");
  assert.deepEqual(trimSpawns(wave, trim, "normal", 12).map((g) => g.count), [8, 1, 2], "other difficulties");
  assert.equal(trimSpawns(wave, undefined, "easy", 12), wave);
});

test("the Greenhouse is trimmed and the Courtyard slowed on Story; Overdue never is", () => {
  assert.ok(BOARDS.greenhouse.trim?.easy);
  assert.ok((BOARDS.courtyard.pace?.easy ?? 1) < 1);
  for (const b of Object.values(BOARDS)) {
    assert.equal(b.trim?.overdue, undefined, b.id);
    assert.equal(b.pace?.overdue, undefined, b.id);
  }
  // The Courtyard's later waves on Normal have fewer animals than on Overdue.
  const late = waveAt(9, "siege").spawns;
  const total = (d: "normal" | "overdue") => trimSpawns(late, BOARDS.courtyard.trim, d, 10).reduce((n, g) => n + g.count, 0);
  assert.ok(total("normal") < total("overdue"));
});

test("a room's pace slows its fruit on that difficulty only", () => {
  const speedOn = (difficulty: "easy" | "overdue") => {
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), siegeOpen: true, setup: { night: "siege", map: "courtyard", hero: "mynxi", difficulty } });
    api.openSetup();
    api.chooseHero("mynxi");
    api.beginNight();
    return api.wavePreview(0).groups[0].speed;
  };
  const d = (id: string) => DIFFICULTIES.find((x) => x.id === id)!.speed;
  const easy = speedOn("easy") / d("easy");
  const overdue = speedOn("overdue") / d("overdue");
  assert.ok(Math.abs(easy / overdue - BOARDS.courtyard.pace!.easy!) < 0.02, `${easy} vs ${overdue}`);
});

test("the Cauldron and the Quack-Liber lob area shots, so they see Box Cats", () => {
  assert.ok(BOX_SEERS.includes("cauldron"));
  assert.ok(BOX_SEERS.includes("quackliber"));
  assert.ok(!BOX_SEERS.includes("melon"), "an aimed cannon still can't");
});
