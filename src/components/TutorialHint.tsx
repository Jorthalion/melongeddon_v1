import { useState } from "react";
import { createWorld } from "@/game/engine";
import { HOTKEY_HELP } from "@/components/hotkeys";

const KEY = "melongeddon:tutorial";
const store = typeof localStorage === "undefined" ? null : localStorage;

/** Hints for a player's first two waves. Reads game state each render; dismiss once and it stays gone. */
export function TutorialHint({ api }: { api: ReturnType<typeof createWorld> }) {
  const [done, setDone] = useState(() => store?.getItem(KEY) === "done");
  if (done) return null;

  const { hud, towers } = api.world;
  const built = towers.filter((t) => !t.ally).length;
  const finish = () => {
    store?.setItem(KEY, "done");
    setDone(true);
  };

  let title = "";
  let body = "";
  if (hud.phase === "prep" && hud.wave === 1 && built === 0) {
    title = "Build on the floor";
    body = "Produce walks the carpet. Tap a floor tile beside it to set a melon cannon. Anything that reaches the far end costs a stack.";
  } else if (hud.phase === "prep" && hud.wave === 1) {
    title = "Then start the wave";
    body = "Spend what you like, then press Start wave. You can keep building during the wave, too.";
  } else if (hud.phase === "combat" && hud.wave === 1) {
    title = "Kills pay seeds";
    body = "Tap a cannon to see its stats or sell it. Between waves, the back room fits it with upgrades.";
  } else if (hud.phase === "prep" && hud.wave === 2) {
    title = "Mix your cannons";
    body = `Mortars splash crowds, freeze holds, fire burns, the still slows. Keys: ${HOTKEY_HELP}.`;
  } else if (hud.wave >= 2) {
    // Past the basics: retire the hints for good.
    store?.setItem(KEY, "done");
    return null;
  } else {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-3">
      <div
        role="status"
        className="pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-[#c6a15a]/70 bg-ink/90 px-3 py-2 shadow-lg"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight font-semibold text-gold">{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-parchment">{body}</p>
        </div>
        <button type="button" className="shrink-0 rounded px-2 py-1 text-xs text-muted underline" onClick={finish}>
          Hide tips
        </button>
      </div>
    </div>
  );
}
