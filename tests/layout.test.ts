import { test } from "node:test";
import assert from "node:assert/strict";
import { PREF_KEYS } from "../src/lib/saves.ts";
import { LEFT_REM, RIGHT_REM, UI_SIZE_KEY, autoRootPx, layoutFor, readUiSize, rootFontFor, writeUiSize } from "../src/lib/layout.ts";

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
    assert.equal(mode(812, 375, board).mode, "normal", "a phone on its side");
  }
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
