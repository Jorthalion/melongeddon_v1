import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The tips and the Coming up bar share the top of the board: the bar owns it, the tips sit in a dock
// in the page flow (under the bar, in the side column, or above the build bar on a phone), so they can
// never overlap the bar or the board. Measured by hand at 1920×1080, 1366×768, 1280×720, 1440×900 and
// 375×812 (bounding rects: no overlap). These checks keep the structure that guarantees it.
const src = (f: string) => readFileSync(new URL(`../src/components/${f}`, import.meta.url), "utf8");

test("no tip floats over the board: every tip is a TipCard in the dock, none absolutely placed", () => {
  const tips = src("TutorialHint.tsx");
  assert.ok(!/\babsolute\b/.test(tips), "a tip is positioned absolutely again");
  for (const name of ["TutorialHint", "ChuteTip", "SiegeTip", "ComboTip", "NativesTip"]) {
    const body = tips.slice(tips.indexOf(`export function ${name}(`));
    const end = body.indexOf("\nexport ", 1);
    assert.match(end > 0 ? body.slice(0, end) : body, /<TipCard/, `${name} doesn't use TipCard`);
  }
});

test("the tip dock comes after the Coming up bar and before the board; phones dock it above the build bar", () => {
  const game = src("MelonGame.tsx");
  const bar = game.indexOf("<ComingUpBar");
  const top = game.indexOf('tipDock("top"');
  const canvas = game.indexOf("<canvas");
  assert.ok(bar >= 0 && top > bar && canvas > top, "order: bar, tip dock, board");
  const bottom = game.indexOf('tipDock("bottom"');
  assert.ok(bottom > canvas && bottom < game.lastIndexOf("<BuildFooter"), "phones: the dock sits between the board and the build bar");
  assert.ok(game.includes('tipDock("side"'), "wide layout: the dock is in the side column");
  assert.ok(!/<Tips\b[^>]*\/>\s*\n\s*<canvas/.test(game));
});

test("phones: the back room button leaves the board for the build bar", () => {
  const game = src("MelonGame.tsx");
  assert.match(game, /!wide && \(!narrow \|\| hud\.workshop != null\) \? <BackRoomTab/);
  assert.match(game, /backRoom=\{narrow[^}]*<BackRoomTab[^>]*compact/);
});

test("Mynxi's lesson card starts below the Coming up bar", () => {
  const tutor = src("MynxiTutor.tsx");
  const m = tutor.match(/absolute inset-x-0 top-\[(\d+(?:\.\d+)?)rem\]/);
  assert.ok(m, "Mynxi's card lost its offset");
  const layout = readFileSync(new URL("../src/lib/layout.ts", import.meta.url), "utf8");
  const bar = Number(layout.match(/BAR_REM = ([\d.]+)/)![1]);
  assert.ok(Number(m[1]) >= bar, `${m[1]} rem is inside the ${bar} rem bar`);
});
