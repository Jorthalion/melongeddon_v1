/**
 * Keyboard rules as a pure function, so they can be tested without a browser.
 * `keyAction(hud, key)` says what a key should do on the current screen; `runKeyAction`
 * applies it. The React hook in `components/hotkeys.ts` only adds DOM concerns
 * (typing in inputs, focused buttons, preventDefault).
 */
import { HEROES, groupOf, groupsFor, type Hud, type UpgradeId, type createWorld } from "./engine.ts";

type Api = ReturnType<typeof createWorld>;

export type KeyAction =
  | { type: "mute" }
  | { type: "swallow" }
  | { type: "openMenu" }
  | { type: "closeMenu" }
  | { type: "menuBack" }
  | { type: "backToTitle" }
  | { type: "backToSetup" }
  | { type: "keeper"; index: number }
  | { type: "begin" }
  | { type: "beginNight" }
  | { type: "pickUpgrade"; index: number }
  | { type: "pickMod"; index: number }
  | { type: "closeShop" }
  | { type: "alliance"; choice: "accept" | "betray" | "reject" }
  | { type: "startWave" }
  | { type: "ackMemory" }
  | { type: "endPrimary" }
  | { type: "build"; index: number }
  | { type: "tab"; index: number }
  | { type: "togglePause" }
  | { type: "sell" }
  | { type: "openShop" }
  | { type: "deselect" }
  | { type: "speed"; dir: -1 | 1 };

/** Keepers in on-screen order on Setup. */
export const KEEPER_ORDER = HEROES;
/** Knight choices in on-screen order. */
export const ALLIANCE_ORDER = ["accept", "betray", "reject"] as const;

/**
 * `key` is `KeyboardEvent.key`, with single characters lower-cased.
 * Returns null when the key means nothing here (so the browser keeps its default).
 */
export function keyAction(hud: Hud, key: string): KeyAction | null {
  const phase = hud.phase;
  const digit = /^[1-9]$/.test(key) ? Number(key) - 1 : -1;

  if (key === "m") return { type: "mute" };

  // Pause menu open: Esc steps back out of it; game keys are swallowed.
  if (hud.menu) {
    if (key === "Escape") return hud.menu === "settings" ? { type: "menuBack" } : { type: "closeMenu" };
    if (key === " " || key === "p" || key === "+" || key === "=" || key === "-" || key === "_" || digit >= 0) {
      return { type: "swallow" };
    }
    return null;
  }

  switch (phase) {
    case "coldopen":
      return null; // The Title handles its own arrows and Esc.

    case "select":
      if (key === "Escape") return { type: "backToTitle" };
      if (key === "Enter") return { type: "begin" };
      if (digit >= 0 && digit < KEEPER_ORDER.length) return { type: "keeper", index: digit };
      return null;

    case "poster":
      if (key === "Escape") return { type: "backToSetup" };
      if (key === "Enter") return { type: "beginNight" };
      return null;

    case "upgrade":
      if (key === "Escape") return { type: "openMenu" };
      if (digit >= 0 && digit < hud.offer.length) return { type: "pickUpgrade", index: digit };
      return null;

    case "shop":
      if (key === "Escape") return { type: "closeShop" };
      if (digit >= 0 && digit < hud.modOffer.length) return { type: "pickMod", index: digit };
      return null;

    case "alliance":
      if (key === "Escape") return { type: "openMenu" };
      if (digit >= 0 && digit < ALLIANCE_ORDER.length) return { type: "alliance", choice: ALLIANCE_ORDER[digit] };
      return null;

    case "betrayal":
    case "consequence":
      if (key === "Escape") return { type: "openMenu" };
      if (key === "Enter") return { type: "startWave" };
      return null;

    case "memory":
      if (key === "Escape") return { type: "openMenu" };
      if (key === "Enter") return { type: "ackMemory" };
      return null;

    case "victory":
    case "defeat":
      // Esc does nothing here, so new unlocks aren't skipped by accident.
      return key === "Enter" ? { type: "endPrimary" } : null;

    case "prep":
    case "combat": {
      const kinds = groupOf(hud.build).kinds;
      const tab = groupsFor(hud.hero).findIndex((g) => g.key === key);
      if (digit >= 0 && digit < kinds.length) return { type: "build", index: digit };
      if (tab >= 0) return { type: "tab", index: tab };
      if (key === " ") return phase === "prep" ? { type: "startWave" } : { type: "togglePause" };
      if (key === "p") return { type: "togglePause" };
      if (key === "s" && hud.selected != null) return { type: "sell" };
      if (key === "b" && hud.selected != null && phase === "prep") return { type: "openShop" };
      // Esc order: close the inspector, then open the pause menu (the back room is its own phase).
      if (key === "Escape") return hud.selected != null ? { type: "deselect" } : { type: "openMenu" };
      if (key === "+" || key === "=") return { type: "speed", dir: 1 };
      if (key === "-" || key === "_") return { type: "speed", dir: -1 };
      return null;
    }
  }
  return null;
}

/** Apply an action. Returns true when it should count as a user gesture (sound unlock, click tone). */
export function runKeyAction(api: Api, action: KeyAction, onMute: () => void): boolean {
  const hud = api.world.hud;
  switch (action.type) {
    case "mute":
      onMute();
      return false;
    case "swallow":
      return false;
    case "openMenu":
      api.openMenu();
      return false;
    case "closeMenu":
      api.closeMenu();
      return false;
    case "menuBack":
      api.menuSettings(false);
      return false;
    case "backToTitle":
      api.backToTitle();
      return true;
    case "backToSetup":
      api.backToSetup();
      return true;
    case "keeper":
      api.pickKeeper(KEEPER_ORDER[action.index]);
      return true;
    case "begin":
      if (hud.hero) api.chooseHero(hud.hero);
      return true;
    case "beginNight":
      api.beginNight();
      return true;
    case "pickUpgrade":
      api.pickUpgrade(hud.offer[action.index].id as UpgradeId);
      return true;
    case "pickMod":
      api.pickMod(hud.modOffer[action.index].id);
      return true;
    case "closeShop":
      api.closeShop();
      return false;
    case "alliance":
      api.chooseAlliance(action.choice);
      return true;
    case "startWave":
      api.startWave();
      return true;
    case "ackMemory":
      api.ackMemory();
      return true;
    case "endPrimary":
      if (hud.phase === "defeat" || hud.night === "endless") api.restartNight();
      else if (hud.night === "midnight") api.continueOverflow();
      else api.tryEndless();
      return true;
    case "build":
      api.dismissSelection();
      api.chooseBuild(groupOf(hud.build).kinds[action.index]);
      return true;
    case "tab": {
      const tab = groupsFor(hud.hero)[action.index];
      api.dismissSelection();
      if (groupOf(hud.build).id !== tab.id) api.chooseBuild(tab.kinds[0]);
      return true;
    }
    case "togglePause":
      api.togglePause();
      return false;
    case "sell":
      api.sellSelected();
      return true;
    case "openShop":
      api.openShop();
      return true;
    case "deselect":
      api.dismissSelection();
      return false;
    case "speed":
      api.nudgeSpeed(action.dir);
      return false;
  }
}
