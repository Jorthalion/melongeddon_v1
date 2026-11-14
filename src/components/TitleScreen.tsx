import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { asset } from "@/lib/asset";
import { BOARDS, KEEPER_TOWERS, MAP_GOALS, PICKABLE_MAPS, TOWERS, TOWER_GROUPS, TOWER_TYPE, TYPE_INFO, WAVE_COUNT } from "@/game/engine";
import { HOTKEY_HELP } from "@/components/hotkeys";
import { KEEPERS } from "@/components/keeperCards";
import { MenuButton, MenuCard } from "@/components/ui";

export function TitleScreen({
  settings,
  onStart,
  onKeeper,
  saved,
  summary,
  note,
  onInstall,
  onQuit,
  guide,
  onTutorial,
}: {
  settings: ReactNode;
  /** Play Mynxi's tutorial again (shown once it has been done or skipped). */
  onTutorial?: () => void;
  /** The guided first night is still to do: New night stays locked, and it can be skipped. */
  guide?: { onSkip: () => void };
  /** Shown when the browser can install the game as an app. */
  onInstall?: () => void;
  /** Desktop app only: close the window. */
  onQuit?: () => void;
  saved: boolean;
  summary: string;
  note: string;
  onStart: () => void;
  onKeeper: () => void;
}) {
  const [view, setView] = useState<"menu" | "howto" | "settings">("menu");
  const startRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Focus the main button whenever the menu shows, so Enter starts and arrows have a place to begin.
  useEffect(() => {
    if (view === "menu") startRef.current?.focus({ preventScroll: true });
  }, [view]);
  // Esc on a sub-card returns to the menu.
  useEffect(() => {
    if (view === "menu") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setView("menu");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);
  // Up / Down move between the menu buttons, wrapping at the ends.
  const onMenuKey = (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...(menuRef.current?.querySelectorAll("button") ?? [])];
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(at < 0 ? 0 : at + step + items.length) % items.length].focus();
  };
  return (
    <div className="absolute inset-0 z-20 bg-black">
      <img src={asset("sprites/screen-title.webp")} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute top-[43%] left-1/2 w-[min(20.5rem,74vw)] -translate-x-1/2">
        {view === "menu" ? (
          <div ref={menuRef} className="flex flex-col gap-2.5" role="group" aria-label="Main menu" onKeyDown={onMenuKey}>
            <MenuButton gold ref={startRef} onClick={onStart}>
              {saved ? "Continue" : "Start"}
            </MenuButton>
            <p className="-mt-1 rounded bg-black/55 px-2 py-1 text-center text-xs leading-snug text-[#f4ead8]">
              {summary}
              {note ? <span className="mt-0.5 block text-gold">{note}</span> : null}
            </p>
            {guide ? (
              <>
                <MenuButton disabled onClick={() => {}} title="Opens after the guided first night">
                  New night (after your first night)
                </MenuButton>
                <button
                  type="button"
                  className="-mt-1 rounded bg-black/55 px-2 py-1 text-xs text-[#f4ead8] underline underline-offset-2"
                  onClick={guide.onSkip}
                >
                  Played before? Skip the guide
                </button>
              </>
            ) : (
              <MenuButton onClick={onKeeper}>New night</MenuButton>
            )}
            {onTutorial ? <MenuButton onClick={onTutorial}>Tutorial</MenuButton> : null}
            <MenuButton onClick={() => setView("howto")}>How to play</MenuButton>
            <MenuButton onClick={() => setView("settings")}>Settings</MenuButton>
            {onInstall ? <MenuButton onClick={onInstall}>Install app</MenuButton> : null}
            {onQuit ? <MenuButton onClick={onQuit}>Quit</MenuButton> : null}
          </div>
        ) : null}
      </div>
      {view !== "menu" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
          {view === "howto" ? (
            <MenuCard title="How to play" onBack={() => setView("menu")} wide>
              <HowToPlay />
            </MenuCard>
          ) : null}
          {view === "settings" ? (
            <MenuCard title="Settings" onBack={() => setView("menu")}>
              {settings}
            </MenuCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Title › How to play: controls, cannon tabs, keepers, nights and rooms. */
export function HowToPlay() {
  const h = "mt-4 mb-1 text-[10px] tracking-[0.22em] text-gold uppercase first:mt-0";
  return (
    <div className="text-left">
      <p className={h}>The basics</p>
      <p>
        Produce walks the carpet. Build cannons on the floor beside it; anything that reaches the far end costs a stack.
        Kills pay seeds. A story night is {WAVE_COUNT} waves, with an upgrade pick now and then.
      </p>
      <p className="mt-1">
        Tap a cannon to see its stats or sell it. The Back room tab on the right upgrades every cannon of a kind (between waves). Esc or the ☰ button pauses.
      </p>

      <p className={h}>Tower types</p>
      <p className="text-muted">The tabs say what a tower is for. Its type says how it does damage, and which shared upgrades change it. Every upgrade card says what it affects.</p>
      <ul className="mt-1 space-y-1">
        {(Object.keys(TYPE_INFO) as Array<keyof typeof TYPE_INFO>).map((t) => (
          <li key={t}>
            <span className="font-semibold text-parchment">{TYPE_INFO[t].name}:</span> <span className="text-muted">{TYPE_INFO[t].blurb}</span>
          </li>
        ))}
      </ul>

      <p className={h}>Cannons</p>
      <ul className="space-y-1">
        {TOWER_GROUPS.map((g) => (
          <li key={g.id}>
            <span className="font-semibold text-parchment">
              {g.name} ({g.key.toUpperCase()}):
            </span>{" "}
            <span className="text-muted">
              {g.kinds.map((k) => `${TOWERS[k].name} (${TYPE_INFO[TOWER_TYPE[k]].name.toLowerCase()}, ${TOWERS[k].role.toLowerCase()})`).join(", ")}
            </span>
          </li>
        ))}
      </ul>

      <p className={h}>Keeper towers (R)</p>
      <p className="text-muted">Each keeper has towers only they can build, one of each at a time.</p>
      <ul className="mt-1 space-y-1">
        {KEEPERS.flatMap((k) =>
          KEEPER_TOWERS[k.id].map((kind) => (
            <li key={kind}>
              <span className="font-semibold text-parchment">
                {TOWERS[kind].name} ({k.name}):
              </span>{" "}
              <span className="text-muted">{TOWERS[kind].blurb}</span>
            </li>
          )),
        )}
      </ul>

      <p className={h}>Keepers</p>
      <ul className="space-y-1">
        {KEEPERS.map((k) => (
          <li key={k.id}>
            <span className="font-semibold text-parchment">{k.name}:</span>{" "}
            <span className="text-muted">{k.line}</span>
          </li>
        ))}
      </ul>

      <p className={h}>Nights</p>
      <ul className="space-y-1 text-muted">
        <li>
          <span className="font-semibold text-parchment">Midnight:</span> the first night. Fifteen waves, and a
          finale in the last one.
        </li>
        <li>
          <span className="font-semibold text-parchment">The Overflow:</span> night two, under the returns chute. Fruit come up it and
          walk the carpet backwards. Take up to three late slips for a harder night and more keeper XP.
        </li>
        <li>
          <span className="font-semibold text-parchment">Endless:</span> no last wave. Survive as long as you can.
        </li>
      </ul>

      <p className={h}>Rooms</p>
      <ul className="space-y-1">
        {PICKABLE_MAPS.map((id) => (
          <li key={id}>
            <span className="font-semibold text-parchment">{BOARDS[id].name}:</span>{" "}
            <span className="text-muted">
              {BOARDS[id].blurb}
              {MAP_GOALS[id] ? ` Unlock: ${MAP_GOALS[id]!.goal}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <p className={h}>Keys</p>
      <p className="text-muted">{HOTKEY_HELP}</p>
    </div>
  );
}
