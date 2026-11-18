/**
 * Screen layout: how big the interface is, and whether the game screen uses the wide layout.
 * Pure helpers (no DOM except `applyUiSize`), so they can be tested.
 */

/** Settings → Interface size. "auto" grows with big screens; the rest are fixed. */
export type UiSize = "auto" | "100" | "125" | "150";
export const UI_SIZES: Array<{ id: UiSize; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "100", label: "100%" },
  { id: "125", label: "125%" },
  { id: "150", label: "150%" },
];
export const UI_SIZE_KEY = "melongeddon-ui-size";

/** The bit of Storage this needs, so tests can pass a plain object. */
interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The saved interface size ("auto" when nothing, or something unknown, is saved). */
export function readUiSize(store: Store | null): UiSize {
  let raw: string | null = null;
  try {
    raw = store?.getItem(UI_SIZE_KEY) ?? null;
  } catch {
    raw = null;
  }
  return UI_SIZES.some((s) => s.id === raw) ? (raw as UiSize) : "auto";
}

export function writeUiSize(store: Store | null, size: UiSize) {
  try {
    store?.setItem(UI_SIZE_KEY, size);
  } catch {
    /* the setting just won't persist */
  }
}

/**
 * The root font size for a setting. Auto is `styles.css`'s clamp (16 px up to about 1440 × 900,
 * growing to about 21 px at 2560 × 1440 and 22 px beyond); the others are 16 px times the percentage.
 */
export function rootFontFor(size: UiSize): string | null {
  return size === "auto" ? null : `${(16 * Number(size)) / 100}px`;
}

/** Apply a setting to the page (Tailwind sizes are rem, so the whole interface follows). */
export function applyUiSize(size: UiSize) {
  if (typeof document === "undefined") return;
  const px = rootFontFor(size);
  if (px) document.documentElement.style.setProperty("--ui-root", px);
  else document.documentElement.style.removeProperty("--ui-root");
}

/** The auto root size (px) at a viewport, matching the clamp in `styles.css`. */
export function autoRootPx(vw: number, vh: number) {
  return Math.min(22, Math.max(16, Math.min(vw / 100, (vh * 1.6) / 100) * 0.9));
}

/** The normal layout's build bar height (Start-wave bar, tabs, cards, log), in rem. */
export const FOOTER_REM = 15.25;
/** The wide layout's columns, in rem: the build column on the left, the back room on the right. */
export const LEFT_REM = 19;
export const RIGHT_REM = 20;
/** Switch to the wide layout when the board would leave more than this much empty space on each side (rem). */
export const WIDE_MARGIN_REM = 14;
/** Below this width (CSS px) the layout never switches: phones and small tablets. */
export const WIDE_MIN_PX = 1024;

/**
 * Which layout fits a `boxW` × `boxH` area (everything under the top bar, in CSS px) for a
 * `boardW` × `boardH` board (world px). It measures the normal layout: the board above the build
 * bar, scaled to fit. If that leaves more than WIDE_MARGIN_REM empty on each side, the wide
 * layout moves the build bar into a left column and docks the back room on the right.
 */
export function layoutFor(boxW: number, boxH: number, boardW: number, boardH: number, remPx: number) {
  const footer = FOOTER_REM * remPx;
  const h = Math.max(1, boxH - footer);
  const scale = Math.min(boxW / boardW, h / boardH);
  const margin = (boxW - boardW * scale) / 2;
  const wide = boxW >= WIDE_MIN_PX && margin > WIDE_MARGIN_REM * remPx;
  return {
    mode: wide ? ("wide" as const) : ("normal" as const),
    /** Empty space each side of the board in the normal layout (CSS px). */
    margin,
    left: wide ? LEFT_REM * remPx : 0,
    right: wide ? RIGHT_REM * remPx : 0,
  };
}
