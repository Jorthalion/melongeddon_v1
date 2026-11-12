import { useEffect, useRef } from "react";
import { createWorld } from "@/game/engine";
import { keyAction, runKeyAction } from "@/game/keys";

/**
 * Keyboard shortcuts (the rules live in `game/keys.ts`):
 *   1–5      pick a cannon in the open tab, or choice 1–3 on a pick card / the knight / Setup's keepers
 *   Q W E R T  Damage / Control / Support / Keeper / Trick tab
 *   Space    start the next wave; pause / resume during a wave
 *   P        pause / resume
 *   S        sell the selected cannon
 *   B        open the back room for the selected cannon (between waves)
 *   Enter    the main button on Setup, the intro, story cards and end cards
 *   Esc      close the back room, deselect, or open / close the pause menu (Back on Setup and the intro)
 *   + / −    game speed
 *   M        sound on / off
 */
export const HOTKEY_HELP =
  "Q/W/E/R/T tab · 1–5 build or choose · Space wave/pause · P pause · S sell · B back room · Enter main button · Esc back/menu · +/− speed · M sound";

export function useHotkeys(
  api: ReturnType<typeof createWorld>,
  handlers: { onGesture: () => void; onMute: () => void },
) {
  // Keep the latest handlers without re-binding the listener every render.
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      // A button reached by keyboard keeps its own Enter and Space. A button that only has focus
      // because it was clicked does not (Space still starts the wave, Enter still begins).
      if (target?.tagName === "BUTTON" && (key === "Enter" || key === " ") && target.matches(":focus-visible")) return;

      const action = keyAction(api.world.hud, key);
      if (!action) return;
      e.preventDefault();
      if (runKeyAction(api, action, ref.current.onMute)) ref.current.onGesture();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);
}
