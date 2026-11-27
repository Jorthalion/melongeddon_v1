/**
 * Which input the player used last (mouse/touch or keyboard), and keyboard focus that only keyboard
 * players keep:
 * - a mouse or touch click on a board control (anything inside `[data-board-controls]`) doesn't leave
 *   focus on the button, so the next key goes to the game, not the button;
 * - a dialog closed by a click drops focus to the board; closed by a key (Esc) it gives focus back to
 *   whatever opened it, so keyboard players keep their place.
 */
export type InputKind = "pointer" | "key";

let last: InputKind = "pointer";
let started = false;

/** The input used last. */
export const lastInput = (): InputKind => last;

/** Whether a dialog should give focus back to its opener when it closes, after `input`. */
export function restoreFocusOnClose(input: InputKind): boolean {
  return input === "key";
}

/** Whether a pointer-up should drop focus from the button it landed on (mouse or touch on a board control). */
export function blurAfterPointer(pointerType: string, onBoardControl: boolean): boolean {
  return pointerType !== "" && onBoardControl;
}

/** Start watching (once). Safe to call before the page has a window (does nothing then). */
export function watchInput() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("pointerdown", () => (last = "pointer"), true);
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Shift" && e.key !== "Control" && e.key !== "Alt" && e.key !== "Meta") last = "key";
    },
    true,
  );
  window.addEventListener(
    "pointerup",
    (e) => {
      const button = (e.target as Element | null)?.closest?.("button, [role='button']") as HTMLElement | null;
      // Not inside a dialog: those keep focus inside themselves (their own Tab trap).
      const onBoard = Boolean(button?.closest("[data-board-controls]")) && !button?.closest("[role='dialog']");
      if (!button || !blurAfterPointer(e.pointerType, onBoard)) return;
      // After the click has gone through.
      requestAnimationFrame(() => {
        if (document.activeElement === button) button.blur();
      });
    },
    true,
  );
}

/** A touch screen is the main pointer (phones, tablets). Phone-only fixes key off this, so desktop never changes. */
export function coarsePointer(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}
