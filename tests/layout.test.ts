import { test } from "node:test";
import assert from "node:assert/strict";
import { PREF_KEYS } from "../src/lib/saves.ts";
import { LEFT_REM, RIGHT_REM, SIDE_LEFT_SHARE, UI_SIZE_KEY, autoRootPx, layoutFor, readUiSize, rootFontFor, writeUiSize } from "../src/lib/layout.ts";

// Boards in world px: The Stacks (16 × 10) and the Great Hall (22 × 14), 48 px a tile.
const STACKS = [768, 480] as const;
const HALL = [1056, 672] as const;

/** The area under the top bar for a window, at the auto root size (the top bar is about 4.5 rem). */
function box(vw: number, vh: number) {
  const rem = autoRootPx(vw, vh);
  return { w: vw, h: vh - 4.5 * rem, rem };
}
const mode = (vw: number, vh: number, board: readonly [number, number]) => {
  const b = box(vw, vh);
  return layoutFor(b.w, b.h, board[0], board[1], b.rem);
};

test("the auto interface size: 16 px up to 1440 × 900, about 21 px at 2560 × 1440, at most 22 px", () => {
  assert.equal(autoRootPx(375, 812), 16);
  assert.equal(autoRootPx(1280, 720), 16);
  assert.equal(autoRootPx(1440, 900), 16);
  assert.ok(autoRootPx(2560, 1440) >= 20 && autoRootPx(2560, 1440) <= 22);
  assert.equal(autoRootPx(3840, 2160), 22);
});

test("layoutFor: phones and tablets keep the normal layout", () => {
  for (const board of [STACKS, HALL]) {
    assert.equal(mode(375, 812, board).mode, "normal");
    assert.equal(mode(768, 1024, board).mode, "normal");
    assert.equal(mode(1024, 768, board).mode, "normal", "a tablet on its side");
  }
});

test("layoutFor: a phone on its side gets the side layout (build column left, no back-room column)", () => {
  // Under the normal layout's build bar there was no height left: at 812 × 375 the Stacks was drawn 24 px wide.
  for (const [vw, vh] of [[812, 375], [844, 390], [667, 375], [740, 360], [915, 412]])
    for (const board of [STACKS, HALL]) {
      const l = mode(vw, vh, board);
      assert.equal(l.mode, "side", `${vw}×${vh}, ${board[0]}×${board[1]}`);
      assert.equal(l.left, Math.min(LEFT_REM * box(vw, vh).rem, Math.round(vw * SIDE_LEFT_SHARE)));
      assert.equal(l.right, 0);
      assert.ok(l.sideBoard > 3 * l.normalBoard, `${vw}×${vh}: side ${l.sideBoard} vs normal ${l.normalBoard}`);
    }
  // Portrait screens never take it, however short.
  assert.notEqual(mode(390, 640, STACKS).mode, "side");
  assert.notEqual(mode(600, 700, STACKS).mode, "side");
});

test("layoutFor: big wide screens switch to the wide layout, with the two columns", () => {
  for (const [vw, vh] of [
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ])
    for (const board of [STACKS, HALL]) {
      const l = mode(vw, vh, board);
      assert.equal(l.mode, "wide", `${vw}×${vh}, ${board[0]}×${board[1]}`);
      const rem = box(vw, vh).rem;
      assert.equal(l.left, LEFT_REM * rem);
      assert.equal(l.right, RIGHT_REM * rem);
    }
  const normal = mode(768, 1024, STACKS);
  assert.equal(normal.left, 0);
  assert.equal(normal.right, 0);
});

test("layoutFor: a tall window keeps the normal layout; the 16 × 10 and 22 × 14 boards switch at different widths", () => {
  // A portrait monitor: the board is limited by width, so there is no side space.
  assert.equal(layoutFor(1440, 2400, ...STACKS, 16).mode, "normal");
  // At a fixed height, find the narrowest window that goes wide for each board.
  const switchAt = (board: readonly [number, number]) => {
    for (let w = 1024; w <= 4000; w += 8) if (layoutFor(w, 1000, board[0], board[1], 16).mode === "wide") return w;
    return Infinity;
  };
  const stacks = switchAt(STACKS);
  const hall = switchAt(HALL);
  assert.ok(Number.isFinite(stacks) && Number.isFinite(hall));
  assert.notEqual(stacks, hall);
  assert.ok(stacks > hall, `the Stacks (16:10) needs a wider window (${stacks}) than the Great Hall (${hall}) at this height`);
});

test("layoutFor picks the layout that draws the bigger board (1366 × 768 to 2560 × 1440)", () => {
  for (const [vw, vh] of [
    [1366, 768],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
  ])
    for (const board of [STACKS, HALL]) {
      const l = mode(vw, vh, board);
      const chosen = l.mode === "wide" ? l.wideBoard : l.normalBoard;
      const other = l.mode === "wide" ? l.normalBoard : l.wideBoard;
      assert.ok(chosen >= other - 4, `${vw}×${vh} ${board[0]}×${board[1]}: ${l.mode} gives ${Math.round(chosen)} px, the other ${Math.round(other)} px`);
    }
  // On a laptop the wide layout only wins when its board really is bigger.
  const laptop = mode(1440, 900, STACKS);
  assert.equal(laptop.mode, "normal", `1440×900: normal ${Math.round(laptop.normalBoard)}, wide ${Math.round(laptop.wideBoard)}`);
});

test("Interface size: Auto by default, saves and loads, and unknown values fall back to Auto", () => {
  const data = new Map<string, string>();
  const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  assert.equal(readUiSize(store), "auto");
  assert.equal(readUiSize(null), "auto");
  writeUiSize(store, "125");
  assert.equal(data.get(UI_SIZE_KEY), "125");
  assert.equal(readUiSize(store), "125");
  data.set(UI_SIZE_KEY, "300");
  assert.equal(readUiSize(store), "auto");
  assert.equal(rootFontFor("auto"), null);
  assert.equal(rootFontFor("100"), "16px");
  assert.equal(rootFontFor("150"), "24px");
  assert.ok((PREF_KEYS as readonly string[]).includes(UI_SIZE_KEY), "kept with the other preferences");
});
