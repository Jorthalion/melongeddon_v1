import { test } from "node:test";
import assert from "node:assert/strict";
import { shortNumber } from "../src/lib/format.ts";

test("health numbers stay exact up to 99,999 and go compact past that", () => {
  assert.equal(shortNumber(45), "45");
  assert.equal(shortNumber(45.4), "45");
  assert.equal(shortNumber(99_999), "99999");
  assert.equal(shortNumber(354_176), "354.2K");
  assert.equal(shortNumber(102_176_435), "102.2M");
  assert.equal(shortNumber(27_369_342_135), "27.4B");
  // Deep Endless (wave 200) still fits a hover card.
  assert.ok(shortNumber(32_140_186_606_200_268).length <= 10, shortNumber(32_140_186_606_200_268)); // "32,140.2T"
  assert.equal(shortNumber(Infinity), "Infinity");
});
