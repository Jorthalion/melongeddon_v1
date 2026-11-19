import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { asset } from "@/lib/asset";
import { BOARDS, KEEPER_TOWERS, MAP_GOALS, PICKABLE_MAPS, TOWERS, TOWER_GROUPS, TOWER_TYPE, TYPE_INFO, MIDNIGHT_WAVES, WAVE_COUNT } from "@/game/engine";
import { HOTKEY_HELP } from "@/components/hotkeys";
import { KEEPERS } from "@/components/keeperCards";
import { MenuButton, MenuCard } from "@/components/ui";

export function TitleScreen({
  settings,
  catalogue,
  catalogueNote,
  onCatalogue,
  gilded,
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
  /** The Grand Catalogue (rooms and shelves), shown from the menu. */
  catalogue: ReactNode;
  /** One-time note after the move to the Grand Catalogue (cleared when it's opened). */
  catalogueNote?: string;
  onCatalogue?: () => void;
  /** The Restricted Section's gilded title screen (a cosmetic). */
  gilded?: boolean;
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
  const [view, setView] = useState<"menu" | "howto" | "settings" | "catalogue">("menu");
  const startRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** The menu button under the pointer (or keyboard focus), and the line that says what it does. */
  const [hint, setHint] = useState<{ text: string; rect: DOMRect } | null>(null);
  const hintFor = (text: string) => (el: HTMLElement | null) => setHint(el ? { text, rect: el.getBoundingClientRect() } : null);
  useEffect(() => {
    if (view !== "menu") setHint(null);
  }, [view]);
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
      {/* The gilded title (a Restricted Section cosmetic): gold trim around the whole screen. */}
      {gilded ? (
        <div
          className="pointer-events-none absolute inset-2 rounded-md border-2 border-[#e6c36a]/80 shadow-[inset_0_0_0_4px_rgba(20,12,16,0.6),inset_0_0_0_5px_rgba(230,195,106,0.55),0_0_24px_rgba(230,195,106,0.35)]"
          aria-hidden="true"
        />
      ) : null}
      <div className="absolute top-[43%] left-1/2 w-[min(20.5rem,74vw)] -translate-x-1/2">
        {view === "menu" ? (
          <div ref={menuRef} className="flex flex-col gap-2.5" role="group" aria-label="Main menu" onKeyDown={onMenuKey}>
            <MenuButton
              gold
              ref={startRef}
              onClick={onStart}
              onHint={hintFor(
                guide
                  ? "Start your first night: Mynxi walks you through it in a few short lessons."
                  : saved
                    ? "Jump straight back in with the same night, room, keeper and difficulty as last time (shown just below)."
                    : "Play right away with the setup shown just below.",
              )}
            >
              {saved ? "Continue" : "Start"}
            </MenuButton>
            <p className="-mt-1 rounded bg-black/55 px-2 py-1 text-center text-xs leading-snug text-[#f4ead8]">
              {summary}
              {note ? <span className="mt-0.5 block text-gold">{note}</span> : null}
            </p>
            {guide ? (
              <>
                <MenuButton disabled onClick={() => {}} onHint={hintFor("Opens after the guided first night. Then you pick your own keeper, room and difficulty.")}>
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
              <MenuButton onClick={onKeeper} onHint={hintFor("Set up a night yourself: choose your keeper, then the room, difficulty and night to play.")}>
                New night
              </MenuButton>
            )}
            <MenuButton
              onClick={() => {
                onCatalogue?.();
                setView("catalogue");
              }}
              onHint={hintFor(
                "The library is in pieces. Spend the Catalogue Fragments you earn from nights and achievements to restore its rooms, and each room opens something for good: a new map, keeper, bookmark, keeper tower or look.",
              )}
            >
              Grand Catalogue
            </MenuButton>
            {catalogueNote ? (
              <p className="-mt-1 rounded bg-black/55 px-2 py-1 text-center text-xs leading-snug text-gold" role="status">
                {catalogueNote}
              </p>
            ) : null}
            {onTutorial ? (
              <MenuButton onClick={onTutorial} onHint={hintFor("Play Mynxi's guided first night again, with her lessons.")}>
                Tutorial
              </MenuButton>
            ) : null}
            <MenuButton onClick={() => setView("howto")} onHint={hintFor("A quick reference: controls, the tower tabs, keepers, nights and rooms.")}>
              How to play
            </MenuButton>
            <MenuButton onClick={() => setView("settings")} onHint={hintFor("Sound, music, game speed, reduced motion and showing the tips again.")}>
              Settings
            </MenuButton>
            {onInstall ? (
              <MenuButton onClick={onInstall} onHint={hintFor("Install Melongeddon so it opens in its own window and plays offline.")}>
                Install app
              </MenuButton>
            ) : null}
            {onQuit ? (
              <MenuButton onClick={onQuit} onHint={hintFor("Close the game. Your progress is saved.")}>
                Quit
              </MenuButton>
            ) : null}
          </div>
        ) : null}
        {view === "menu" && hint ? <MenuHint text={hint.text} rect={hint.rect} /> : null}
      </div>
      {view !== "menu" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
          {view === "howto" ? (
            <MenuCard title="How to play" onBack={() => setView("menu")} wide>
              <HowToPlay />
            </MenuCard>
          ) : null}
          {view === "catalogue" ? (
            <MenuCard title="Grand Catalogue" onBack={() => setView("menu")} wide>
              {catalogue}
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

/**
 * The full how-to-play page (public/how-to-play.html). On the web it sits next to the game; the desktop
 * app loads from file://, so it opens the published copy in the normal browser instead.
 */
const GUIDE_URL =
  typeof location !== "undefined" && location.protocol === "file:"
    ? "https://jorthalion.github.io/melongeddon_v1/how-to-play.html"
    : "how-to-play.html";

/** Title › How to play: controls, cannon tabs, keepers, nights and rooms. */
export function HowToPlay() {
  const h = "mt-4 mb-1 text-[0.625rem] tracking-[0.22em] text-gold uppercase first:mt-0";
  return (
    <div className="text-left">
      <a
        href={GUIDE_URL}
        target="_blank"
        rel="noopener"
        className="mb-3 block rounded-md border border-gold/60 bg-ink/40 px-3 py-2 text-center font-semibold text-gold hover:bg-ink/60"
      >
        Read the full guide, with an index of every section ↗
      </a>
      <p className={h}>The basics</p>
      <p>
        Produce walks the carpet. Build cannons on the floor beside it; anything that reaches the far end costs a stack.
        Kills pay seeds. Midnight is {MIDNIGHT_WAVES} waves. The Overflow and the Siege are {WAVE_COUNT}. There is an upgrade pick now and then.
      </p>
      <p className="mt-1">
        Tap a cannon to see its stats or sell it. The Back room (B) upgrades every cannon of a kind (between waves). Esc or the ☰ button pauses.
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
          <span className="font-semibold text-parchment">The Siege:</span> night three, in the courtyard, once you've won the
          Overflow. No fruit: geese, then cats, then both. Geese and cats hate each other, so let them meet.
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

/**
 * What a title-menu button does: a card beside the menu (to its right, else its left), or above the button
 * when the screen is too narrow for either side.
 */
function MenuHint({ text, rect }: { text: string; rect: DOMRect }) {
  const width = 256;
  const gap = 14;
  const right = window.innerWidth - rect.right >= width + gap + 8;
  const left = rect.left >= width + gap + 8;
  const top = Math.max(8, Math.min(rect.top + rect.height / 2 - 28, window.innerHeight - 140));
  const style: React.CSSProperties = right
    ? { left: rect.right + gap, top, width }
    : left
      ? { right: window.innerWidth - rect.left + gap, top, width }
      : { left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(width, rect.width) - 8)), bottom: window.innerHeight - rect.top + 8, width: Math.min(width, rect.width) };
  return createPortal(
    <div
      role="tooltip"
      data-menu-hint
      style={style}
      className="pointer-events-none fixed z-50 rounded-md border border-[#d7b56a]/70 bg-[#100c0e]/94 px-3 py-2 text-sm leading-snug text-[#f4ead8] shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
    >
      {text}
    </div>,
    document.body,
  );
}
