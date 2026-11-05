import { useEffect, useRef } from "react";
import { TOWER_GROUPS, groupOf, type UpgradeId, createWorld } from "@/game/engine";

/**
 * Keyboard shortcuts:
 *   1–5      pick a cannon in the open tab (or choice 1–3 on an upgrade / back-room screen)
 *   Q W E    Damage / Control / Support tab
 *   Space    start the next wave; pause / resume during a wave
 *   P        pause / resume
 *   S        sell the selected cannon
 *   B        open the back room for the selected cannon (between waves)
 *   Esc      close the back room, or deselect
 *   + / −    game speed
 *   M        sound on / off
 */
export const HOTKEY_HELP = "Q/W/E tab · 1–5 build · Space wave/pause · S sell · B back room · Esc close · +/− speed · M sound";

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

      const hud = api.world.hud;
      const phase = hud.phase;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const digit = /^[1-9]$/.test(key) ? Number(key) - 1 : -1;
      let handled = true;

      if (key === "m") {
        ref.current.onMute();
      } else if (phase === "upgrade" && digit >= 0 && digit < hud.offer.length) {
        ref.current.onGesture();
        api.pickUpgrade(hud.offer[digit].id as UpgradeId);
      } else if (phase === "shop" && digit >= 0 && digit < hud.modOffer.length) {
        ref.current.onGesture();
        api.pickMod(hud.modOffer[digit].id);
      } else if (phase === "shop" && key === "Escape") {
        api.closeShop();
      } else if (phase === "prep" || phase === "combat") {
        const kinds = groupOf(hud.build).kinds;
        const tab = TOWER_GROUPS.find((g) => g.key === key);
        if (digit >= 0 && digit < kinds.length) {
          ref.current.onGesture();
          api.dismissSelection();
          api.chooseBuild(kinds[digit]);
        } else if (tab) {
          ref.current.onGesture();
          api.dismissSelection();
          if (groupOf(hud.build).id !== tab.id) api.chooseBuild(tab.kinds[0]);
        } else if (key === " ") {
          ref.current.onGesture();
          if (phase === "prep") api.startWave();
          else api.togglePause();
        } else if (key === "p") {
          api.togglePause();
        } else if (key === "s" && hud.selected != null) {
          ref.current.onGesture();
          api.sellSelected();
        } else if (key === "b" && hud.selected != null && phase === "prep") {
          ref.current.onGesture();
          api.openShop();
        } else if (key === "Escape") {
          api.dismissSelection();
        } else if (key === "+" || key === "=") {
          api.nudgeSpeed(1);
        } else if (key === "-" || key === "_") {
          api.nudgeSpeed(-1);
        } else {
          handled = false;
        }
      } else {
        handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);
}
