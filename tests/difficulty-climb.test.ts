import { test } from "node:test";
import assert from "node:assert/strict";
import { DIFFICULTIES, difficultyHp } from "../src/game/engine.ts";

const of = (id: string) => DIFFICULTIES.find((d) => d.id === id)!;

test("Story and Normal health stays flat all night", () => {
  for (const id of ["easy", "normal"]) for (const w of [0, 10, 20]) assert.equal(difficultyHp(of(id), w, 21), of(id).hp);
});

test("Melongeddon and Overdue health climbs from hp on the first wave to hpLate on the last, slowly at first", () => {
  for (const id of ["hard", "overdue"]) {
    const d = of(id);
    assert.equal(difficultyHp(d, 0, 21), d.hp);
    assert.equal(difficultyHp(d, 20, 21), d.hpLate);
    // A 15-wave night reaches the top on its own last wave too.
    assert.equal(difficultyHp(d, 14, 15), d.hpLate);
    // Bent: halfway through, less than halfway up.
    assert.ok(difficultyHp(d, 10, 21) < (d.hp + d.hpLate!) / 2);
    let last = 0;
    for (let w = 0; w < 21; w++) {
      const hp = difficultyHp(d, w, 21);
      assert.ok(hp >= last);
      last = hp;
    }
  }
  // Overdue stays tougher than Melongeddon on every wave.
  for (let w = 0; w < 21; w++) assert.ok(difficultyHp(of("overdue"), w, 21) > difficultyHp(of("hard"), w, 21));
});

test("Endless climbs over Midnight's length and then holds", () => {
  const d = of("hard");
  assert.equal(difficultyHp(d, 40, Infinity), d.hpLate);
});
