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
  assert.match(game, /!wide && \(!\(narrow \|\| side\) \|\| hud\.workshop != null\) \? <BackRoomTab/);
  assert.match(game, /backRoom=\{narrow[^}]*<BackRoomTab[^>]*compact/);
  // A phone on its side too: the button heads the build column instead of covering the board's right edge.
  assert.match(game, /backRoom=\{side[^}]*<BackRoomTab[^>]*compact/);
});

test("Mynxi's lesson card sits above the board, never over it or the Coming up bar", () => {
  const tutor = src("MynxiTutor.tsx");
  assert.ok(!/absolute/.test(tutor), "Mynxi's card floats over the board again");
  const game = src("MelonGame.tsx");
  const bar = game.indexOf("<ComingUpBar");
  const box = game.lastIndexOf("<MynxiTutor");
  const canvas = game.indexOf("<canvas");
  assert.ok(bar >= 0 && box > bar && canvas > box, "order: Coming up bar, Mynxi, board");
  // Two places, never both: over the board column normally, at the head of the build column on short
  // landscape screens (the side layout), where the board column has no height to spare.
  assert.equal(game.split("<MynxiTutor").length, 3);
  // Capped and scrollable there, so a long lesson never pushes its Next button off a short screen.
  // Keyed on the lesson, so each new lesson starts scrolled to the top.
  assert.match(game, /\{side && tutorOn \? <div key=\{hud\.guide \?\? "tips"\} className="max-h-\[55%\] shrink-0 overflow-y-auto pt-2"><MynxiTutor/);
  assert.match(game, /\{tutorOn && !side \? <MynxiTutor/);
  assert.ok(game.indexOf("<MynxiTutor") < game.indexOf("<BuildFooter\n            api={api}\n            onGesture={gesture}\n            column\n"), "in the build column, above the build bar");
  // The between-wave card shares the board's box, so it starts below Mynxi too.
  assert.ok(game.indexOf("<CardOverlay") > canvas);
});

test("side layout (a phone on its side): the tips head the build column, not the board column", () => {
  const game = src("MelonGame.tsx");
  assert.match(game, /\{side \? <div className="max-h-\[40%\] shrink-0 overflow-y-auto px-3 pt-2">\{tipDock\("side", "line"\)\}<\/div> : null\}/);
  assert.match(game, /\{showPlace && !column && !narrow \? tipDock\("top", "line"\) : null\}/);
  // The Back room tab never overhangs a short board.
  assert.match(src("Shop.tsx"), /absolute top-1\/2 right-0 z-10 flex max-h-\[calc\(100%-0\.5rem\)\]/);
});
