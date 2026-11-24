import { useEffect, useRef } from "react";
import { createWorld } from "@/game/engine";
import { keyAction, keyGoesToButton, runKeyAction } from "@/game/keys";

/**
 * Keyboard shortcuts (the rules live in `game/keys.ts`):
 *   1–5      pick a cannon in the open tab, or choice 1–3 on a pick card / Setup's keepers
 *            (on Sir Michael's intro, 1–4 pick an armour card and Enter puts it on)
 *   Q W E R T Y  Damage / Control / Support / Keeper / Trick / Heavy tab
 *   Space    start the next wave from anywhere on the board (whatever is selected, open or focused);
 *            pause / resume during a wave
 *   P        pause / resume
 *   S        sell the selected cannon
 *   X        the Hall of Doors: turn the signpost (between waves) to shut the next exit
 *   [ / ]    the Compact Stacks: turn Bay A's / Bay B's crank (between waves)
 *   O        the Legal Elf's Objection! (during a wave)
 *   B        open or close the back-room side tab (1–9 buy its upgrades while it's open)
 *   C        open or close the checkout card (everything shaping this run; pauses the board)
 *   Enter    the main button on Setup, the intro (not Sir Michael's), story cards and end cards
 *   Esc      close the back room, deselect, or open / close the pause menu (Back on Setup and the intro)
 *   + / −    game speed
 *   M        sound on / off
 */
export const HOTKEY_HELP =
  "Q/W/E/R/T tab · 1–5 build or choose (6: Sump Pump, Flooded Basement) · Space start wave (any time between waves) / pause · P pause · S sell · X signpost (Hall of Doors) · [ ] cranks (Compact Stacks) · A aim · O Objection! (Legal Elf) · B back room · C checkout card · Enter main button · Esc back/menu · +/− speed · M sound";

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

      // A button reached by keyboard keeps its own Enter and Space, except Space on the board: that
      // always starts the wave or pauses (preventDefault below stops the button clicking too).
      const focusedButton = target?.tagName === "BUTTON" && target.matches(":focus-visible");
      if (keyGoesToButton(api.world.hud, key, Boolean(focusedButton))) return;

      const action = keyAction(api.world.hud, key);
      if (!action) return;
      e.preventDefault();
      if (runKeyAction(api, action, ref.current.onMute)) ref.current.onGesture();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);
}
