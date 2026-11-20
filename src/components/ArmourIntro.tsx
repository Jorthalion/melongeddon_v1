import { useEffect, useRef, useState } from "react";
import { ARMOURS, ARMOUR_LEVEL, ARMOUR_TEXT, type ArmourId, type MapId } from "@/game/engine";
import { MapPreview } from "@/components/MapPreview";

/** How long the chosen card glows before the night starts. */
const WEAR_MS = 550;

/** Small drawn marks for each armour: a helm, scales, a glowing seam, a saddle-cloak. Blue and gold, the Dragon Knight's colours. */
function ArmourMark({ armour }: { armour: ArmourId }) {
  const common = { width: 34, height: 34, viewBox: "0 0 34 34", "aria-hidden": true } as const;
  if (armour === "azure")
    return (
      <svg {...common}>
        <path d="M7 15a10 10 0 0 1 20 0v9l-4 6H11l-4-6Z" fill="#2c4f8f" stroke="#e6c36a" strokeWidth="1.8" />
        <path d="M10 17h14" stroke="#0e1a33" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M17 5c3 0 6 2 7 5" stroke="#8fc0ff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M17 20v8" stroke="#e6c36a" strokeWidth="1.4" opacity=".7" />
      </svg>
    );
  if (armour === "dragonscale")
    return (
      <svg {...common}>
        {[
          [9, 10],
          [17, 10],
          [25, 10],
          [13, 17],
          [21, 17],
          [9, 24],
          [17, 24],
          [25, 24],
        ].map(([x, y]) => (
          <path key={`${x},${y}`} d={`M${x - 4} ${y - 3}q4 8 8 0`} fill="#3a6fc4" stroke="#e6c36a" strokeWidth="1.3" />
        ))}
      </svg>
    );
  if (armour === "ember")
    return (
      <svg {...common}>
        <path d="M8 6h18l-2 22-7 4-7-4Z" fill="#1d1a22" stroke="#4d4a58" strokeWidth="1.6" />
        <path d="M17 7v22M10 15h14" stroke="#6fb6ff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 13c-3 3-2 6 0 8 2-2 3-5 0-8Z" fill="#8fd0ff" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 22c6-10 20-10 26 0-4-2-8-2-13 6-5-8-9-8-13-6Z" fill="#24406e" stroke="#e6c36a" strokeWidth="1.5" />
      <path d="M9 13l4-6 2 5M25 13l-4-6-2 5" fill="none" stroke="#8fc0ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="16" r="2.2" fill="#e6c36a" />
    </svg>
  );
}

/**
 * Sir Michael's intro: the board, four armour cards, and "Wear it". Picking a card (click or 1–4)
 * selects it; Wear it (or Enter) puts it on and starts the night. Armours not yet open for his level
 * show the level they open at and can't be picked. Esc goes back to setup.
 */
export function ArmourIntro({
  map,
  title,
  kicker,
  isOpen,
  onWear,
  onBack,
}: {
  map: MapId;
  title: string;
  kicker: string;
  isOpen: (armour: ArmourId) => boolean;
  onWear: (armour: ArmourId) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<ArmourId | null>(null);
  const [worn, setWorn] = useState<ArmourId | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const wear = (armour: ArmourId | null) => {
    if (!armour || worn || !isOpen(armour)) return;
    setWorn(armour);
    timer.current = window.setTimeout(() => onWear(armour), WEAR_MS);
  };

  // Keys: 1–4 pick, Enter puts on the picked armour. (The game's own key map leaves these to this screen.)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const i = ["1", "2", "3", "4"].indexOf(ev.key);
      if (i >= 0 && !worn) {
        ev.preventDefault();
        if (isOpen(ARMOURS[i])) setPicked(ARMOURS[i]);
      } else if (ev.key === "Enter" && picked) {
        // The focused Wear button works through its own click. Anywhere else, Enter puts on the picked armour.
        const target = ev.target as HTMLElement | null;
        if (target?.dataset?.wear != null) return;
        ev.preventDefault();
        wear(picked);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#0f1220]">
      <div className="relative min-h-0 flex-1">
        <MapPreview map={map} className="absolute inset-0 h-full w-full" />
      </div>
      <div className="px-4 pt-2 pb-3 text-center [@media(max-height:520px)]:pt-1 [@media(max-height:520px)]:pb-2">
        <p className="text-xs tracking-[0.28em] text-gold uppercase [@media(max-height:520px)]:hidden">{kicker}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold [@media(max-height:520px)]:mt-0 [@media(max-height:520px)]:text-xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-parchment/90 [@media(max-height:520px)]:hidden">Choose his armour for the night.</p>
        <div
          role="radiogroup"
          aria-label="Sir Michael's armour"
          className="mx-auto mt-2 grid max-w-4xl grid-cols-2 gap-2 lg:grid-cols-4 [@media(max-height:520px)]:mt-1"
        >
          {ARMOURS.map((armour, i) => {
            const text = ARMOUR_TEXT[armour];
            const open = isOpen(armour);
            const on = picked === armour;
            const set = worn === armour;
            const faded = worn != null && worn !== armour;
            return (
              <button
                key={armour}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={!open}
                data-armour={armour}
                disabled={worn != null || !open}
                title={open ? text.look : `Opens at Sir Michael's level ${ARMOUR_LEVEL[armour]}`}
                onClick={() => open && setPicked(armour)}
                className={[
                  "group relative flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition duration-150 lg:flex-col lg:items-center lg:text-center",
                  "[@media(max-height:520px)]:py-1 lg:[@media(max-height:520px)]:flex-row lg:[@media(max-height:520px)]:text-left",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  !open
                    ? "cursor-not-allowed border-[#5a6b8f]/25 bg-[#141826] opacity-55"
                    : on
                      ? "cursor-pointer border-[#8fc0ff] bg-[linear-gradient(180deg,#1f3150_0%,#141c2e_100%)] shadow-[0_0_0_3px_rgba(143,192,255,0.25),0_8px_20px_rgba(0,0,0,0.5)]"
                      : "cursor-pointer border-[#8fc0ff]/30 bg-[linear-gradient(180deg,#1a2338_0%,#11162a_100%)] shadow-[0_4px_0_#070910] hover:-translate-y-0.5 hover:border-[#8fc0ff]/70 active:translate-y-0.5",
                  set ? "scale-[1.04] border-[#8fc0ff] shadow-[0_0_24px_rgba(143,192,255,0.55)]" : "",
                  faded ? "scale-95 opacity-40 grayscale" : "",
                ].join(" ")}
              >
                <kbd className="absolute top-1.5 right-1.5 rounded border border-gold/40 px-1.5 text-[0.625rem] leading-4 text-gold/80">{i + 1}</kbd>
                <span className="shrink-0 transition group-hover:scale-110">
                  <ArmourMark armour={armour} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-tight font-semibold text-parchment">{text.name}</span>
                  <span className="block text-xs text-parchment/60 italic [@media(max-height:520px)]:hidden">“{text.said}”</span>
                  {open ? (
                    <span className="mt-1 flex flex-wrap gap-1 lg:justify-center">
                      <span className="rounded-full bg-[#8fc0ff]/15 px-2 py-0.5 text-xs font-semibold text-[#a9d0ff]">{text.gain}</span>
                      <span className="rounded-full bg-[#e23b4a]/15 px-2 py-0.5 text-xs font-semibold text-[#ff8a8a]">{text.cost}</span>
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs font-semibold text-parchment/70">Opens at level {ARMOUR_LEVEL[armour]}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          data-wear=""
          disabled={!picked || worn != null}
          onClick={() => wear(picked)}
          className={[
            "mx-auto mt-2 block min-h-11 w-full max-w-xs rounded-lg text-lg font-semibold transition duration-150 [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:min-h-9",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            picked
              ? "cursor-pointer bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-ink shadow-[0_4px_0_#4a3418] hover:brightness-110 active:translate-y-0.5 active:shadow-[0_1px_0_#4a3418]"
              : "cursor-not-allowed border border-gold/20 text-parchment/40",
          ].join(" ")}
        >
          {worn ? "Buckled on." : picked ? `Wear it: ${ARMOUR_TEXT[picked].name}` : "Pick an armour"}
          {picked && !worn ? <span className="ml-2 text-xs opacity-60">Enter</span> : null}
        </button>
        <button
          type="button"
          disabled={worn != null}
          className="mt-1 block w-full cursor-pointer text-sm text-muted underline-offset-4 hover:text-parchment hover:underline"
          onClick={onBack}
        >
          Back to setup
        </button>
      </div>
    </div>
  );
}
