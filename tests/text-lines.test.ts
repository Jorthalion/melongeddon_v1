import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { theName, TheName, TOWERS } from "../src/game/engine.ts";
import { KEEPER_VOICE, winLine } from "../src/game/keeperVoice.ts";

test("tower names never read 'the The …'", () => {
  assert.equal(theName("Melon cannon"), "the Melon cannon");
  assert.equal(theName("The Dragon's Roost"), "The Dragon's Roost");
  for (const t of Object.values(TOWERS)) assert.ok(!/the The /.test(theName(t.name)), t.name);
});

test("Sir Michael doesn't say 'barely' after a win with every stack standing", () => {
  assert.ok(winLine("michael").includes("Barely"));
  assert.ok(!winLine("michael", "stacks", true).includes("arely"));
  // Keepers without a clean-win line keep their usual one.
  assert.equal(winLine("mynxi", "stacks", true), winLine("mynxi", "stacks"));
  assert.equal(KEEPER_VOICE.mynxi.winClean, undefined);
});

test("the defeat card says how many waves this night held, then the record", () => {
  // hud.best is the record across every night; the card used to say "You cleared 21 waves at best"
  // after losing on wave 3, which read as this night.
  const src = readFileSync(new URL("../src/components/CardPicker.tsx", import.meta.url), "utf8");
  assert.ok(!src.includes("at best."), "the old line is back");
  assert.match(src, /`You held \$\{hud\.wave - 1\} wave\$\{hud\.wave === 2 \? "" : "s"\}\. Your best is \$\{hud\.best\}\./);
});

test("sentences that start with a tower's name never say 'The The …'", () => {
  assert.equal(TheName("Melon cannon"), "The Melon cannon");
  assert.equal(TheName("The Post"), "The Post");
  for (const t of Object.values(TOWERS)) assert.ok(!/^The The /.test(TheName(t.name)), t.name);
  const engine = readFileSync(new URL("../src/game/engine.ts", import.meta.url), "utf8");
  assert.ok(!/`The \$\{TOWERS\[/.test(engine), "a log line puts 'The' before a tower name again; use TheName()");
});
