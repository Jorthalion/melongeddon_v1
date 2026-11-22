/**
 * Keyboard rules as a pure function, so they can be tested without a browser.
 * `keyAction(hud, key)` says what a key should do on the current screen; `runKeyAction`
 * applies it. The React hook in `components/hotkeys.ts` only adds DOM concerns
 * (typing in inputs, focused buttons, preventDefault).
 */
import { BOARDS, HEROES, fittingsFor, groupOf, groupsFor, tabKinds, type Hud, type UpgradeId, type createWorld } from "./engine.ts";

type Api = ReturnType<typeof createWorld>;

/** The victory card's main button (Enter does the same): on to the next night, then Endless, then again. */
export function victoryAction(night: Hud["night"]): string {
  if (night === "midnight") return "Continue to the Overflow";
  if (night === "overflow") return "Continue to the Siege";
  if (night === "siege") return "Set up Endless";
  return "Play again";
}


/** The board's phases, where Space is always the game's key (start the wave, or pause). */
const BOARD_PHASES: Array<Hud["phase"]> = ["prep", "combat", "consequence"];

/**
 * Should a key go to the focused button instead of the game? A button reached by keyboard
 * (`:focus-visible`) keeps its own Enter and Space, so keyboard players can press it, except Space on
 * the board (outside the pause menu): that is always the wave key. `focusVisibleButton` says whether
 * the key's target is a button with `:focus-visible` on.
 */
export function keyGoesToButton(hud: Pick<Hud, "phase" | "menu">, key: string, focusVisibleButton: boolean): boolean {
  if (!focusVisibleButton || (key !== "Enter" && key !== " ")) return false;
  if (key === " " && BOARD_PHASES.includes(hud.phase) && !hud.menu) return false;
  return true;
}

export type KeyAction =
  | { type: "mute" }
  | { type: "swallow" }
  | { type: "openMenu" }
  | { type: "closeMenu" }
  | { type: "checkout" }
  | { type: "closeCheckout" }
  | { type: "menuBack" }
  | { type: "backToTitle" }
  | { type: "backToSetup" }
  | { type: "keeper"; index: number }
  | { type: "begin" }
  | { type: "setupPage"; page: "who" | "night" }
  | { type: "beginNight" }
  | { type: "pickUpgrade"; index: number }
  | { type: "pickMod"; index: number }
  | { type: "closeShop" }
  | { type: "startWave" }
  | { type: "prepareFinale" }
  | { type: "endPrimary" }
  | { type: "build"; index: number }
  | { type: "tab"; index: number }
  | { type: "togglePause" }
  | { type: "sell" }
  | { type: "turnSign" }
  | { type: "crank"; bay: number }
  | { type: "aim" }
  | { type: "openShop" }
  | { type: "deselect" }
  | { type: "speed"; dir: -1 | 1 };

/** Keepers in on-screen order on Setup. */
export const KEEPER_ORDER = HEROES;

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

  // Space is the wave key on the board, whatever is selected, open or focused: it starts the wave
  // between waves (closing the back room or the checkout card first) and pauses during one.
  if (key === " " && (phase === "prep" || (phase === "combat" && !hud.checkout))) {
    return phase === "prep" ? { type: "startWave" } : { type: "togglePause" };
  }

  // The checkout card: Esc or C closes it; game keys are swallowed while it's open.
  if (hud.checkout) {
    if (key === "Escape" || key === "c") return { type: "closeCheckout" };
    if (key === "Enter" || key.length === 1) return { type: "swallow" };
    return null;
  }
  if (key === "c" && (phase === "prep" || phase === "combat" || phase === "upgrade" || phase === "consequence")) {
    return { type: "checkout" };
  }

  switch (phase) {
    case "coldopen":
      return null; // The Title handles its own arrows and Esc.

    case "select":
      // Two pages: who (digits pick, Enter moves on), then the night (Enter begins, Esc steps back).
      if (hud.setupPage === "night") {
        if (key === "Escape") return { type: "setupPage", page: "who" };
        if (key === "Enter") return { type: "begin" };
        return null;
      }
      if (key === "Escape") return { type: "backToTitle" };
      if (key === "Enter") return { type: "setupPage", page: "night" };
      if (digit >= 0 && digit < KEEPER_ORDER.length) return { type: "keeper", index: digit };
      return null;

    case "poster":
      if (key === "Escape") return { type: "backToSetup" };
      // Sir Michael's armour cards handle 1–4 (pick) and Enter (wear) themselves (components/ArmourIntro).
      if (hud.hero === "michael") return null;
      if (key === "Enter") return { type: "beginNight" };
      // The Overflow's and the Siege's intros lead straight onto the board: Space does what Enter does.
      if (key === " " && (hud.night === "overflow" || hud.night === "siege")) return { type: "beginNight" };
      return null;

    case "upgrade":
      if (key === "Escape") return { type: "openMenu" };
      if (digit >= 0 && digit < hud.offer.length) return { type: "pickUpgrade", index: digit };
      return null;

    case "consequence":
      // Enter or Space: back to the board to get ready. The start button (or Space again) begins the finale.
      if (key === "Escape") return { type: "openMenu" };
      if (key === "Enter" || key === " ") return { type: "prepareFinale" };
      return null;

    case "victory":
    case "defeat":
      // Esc does nothing here, so new unlocks aren't skipped by accident.
      return key === "Enter" ? { type: "endPrimary" } : null;

    case "prep":
    case "combat": {
      // The back-room side tab: number keys buy its upgrades, B or Esc close it.
      if (hud.workshop != null) {
        if (key === "Escape" || key === "b") return { type: "closeShop" };
        if (digit >= 0) return digit < fittingsFor(hud.workshop).length ? { type: "pickMod", index: digit } : { type: "swallow" };
      }
      const kinds = tabKinds(groupOf(hud.build), hud.map);
      const tab = groupsFor(hud.hero).findIndex((g) => g.key === key);
      if (digit >= 0 && digit < kinds.length) return { type: "build", index: digit };
      if (tab >= 0) return { type: "tab", index: tab };
      if (key === " ") return phase === "prep" ? { type: "startWave" } : { type: "togglePause" };
      if (key === "p") return { type: "togglePause" };
      if (key === "s" && hud.selected != null) return { type: "sell" };
      // X: the Hall of Doors' signpost (between waves): shut the next exit for the next wave.
      if (key === "x" && phase === "prep" && BOARDS[hud.map]?.exits?.length) return { type: "turnSign" };
      // [ and ]: the Compact Stacks' cranks (between waves).
      if ((key === "[" || key === "]") && phase === "prep" && BOARDS[hud.map]?.bays?.length) return { type: "crank", bay: key === "[" ? 0 : 1 };
      // A: the selected tower's next targeting mode (nothing on towers that don't aim).
      if (key === "a" && hud.selected != null) return { type: "aim" };
      if (key === "b") return { type: "openShop" };
      // Esc order: close the back room (above), then the inspector, then open the pause menu.
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
    case "checkout":
      api.openCheckout();
      return false;
    case "closeCheckout":
      api.closeCheckout();
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
    case "setupPage":
      api.setupPage(action.page);
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
      if (hud.workshop) api.pickMod(fittingsFor(hud.workshop)[action.index].id);
      return true;
    case "closeShop":
      api.closeShop();
      return false;
    case "prepareFinale":
      api.prepareFinale();
      return true;
    case "startWave":
      // Whatever is open between waves gets out of the way.
      if (hud.checkout) api.closeCheckout();
      if (hud.workshop != null) api.closeShop();
      api.startWave();
      return true;
    case "aim":
      api.cycleTarget(1);
      return true;
    case "endPrimary":
      if (hud.phase === "defeat" || hud.night === "endless") api.restartNight();
      else if (hud.night === "midnight") api.continueOverflow();
      else if (hud.night === "overflow") api.continueSiege();
      else api.tryEndless();
      return true;
    case "build":
      api.dismissSelection();
      api.chooseBuild(tabKinds(groupOf(hud.build), hud.map)[action.index]);
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
    case "turnSign":
      api.turnSign();
      return true;
    case "crank":
      api.crank(action.bay);
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
