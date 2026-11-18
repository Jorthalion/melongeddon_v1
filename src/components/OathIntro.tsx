import { useEffect, useRef, useState } from "react";
import { OATHS, OATH_TEXT, type MapId, type OathId } from "@/game/engine";
import { MapPreview } from "@/components/MapPreview";

/** How long the chosen card stamps and the other two show "refused" before the night starts. */
const SWEAR_MS = 550;

/** Small drawn marks for each oath: the door, the way in, the pumpkin. */
function OathMark({ oath }: { oath: OathId }) {
  const common = { width: 34, height: 34, viewBox: "0 0 34 34", "aria-hidden": true } as const;
  if (oath === "door")
    return (
      <svg {...common}>
        <path d="M8 31V13a9 9 0 0 1 18 0v18Z" fill="#5a3a22" stroke="#e6c36a" strokeWidth="2" />
        <path d="M17 6v25" stroke="#e6c36a" strokeWidth="1.2" opacity=".6" />
        <circle cx="21" cy="20" r="1.6" fill="#e6c36a" />
        <path d="M4 31h26" stroke="#e6c36a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  if (oath === "mouth")
    return (
      <svg {...common}>
        <path d="M3 17h17" stroke="#e6c36a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M14 10l7 7-7 7" fill="none" stroke="#e6c36a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 6v22" stroke="#e6c36a" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 9v16" stroke="#e6c36a" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      </svg>
    );
  return (
    <svg {...common}>
      <ellipse cx="17" cy="20" rx="12" ry="10" fill="#e8883a" stroke="#7a3d12" strokeWidth="1.5" />
      <path d="M17 10v20M11 11c-2 5-2 13 0 18M23 11c2 5 2 13 0 18" stroke="#7a3d12" strokeWidth="1.2" fill="none" />
      <path d="M17 10c0-3 2-5 4-6" stroke="#4f7a2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Sir Michael's intro: the board, three oath cards, and "Swear it". Picking a card (click or 1–3)
 * selects it and shows its zone on the board; Swear it (or Enter) stamps it, greys out the other
 * two as refused, and then starts the night. Esc goes back to setup.
 */
export function OathIntro({
  map,
  title,
  kicker,
  onSwear,
  onBack,
}: {
  map: MapId;
  title: string;
  kicker: string;
  onSwear: (oath: OathId) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<OathId | null>(null);
  const [hover, setHover] = useState<OathId | null>(null);
  const [sworn, setSworn] = useState<OathId | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const swear = (oath: OathId | null) => {
    if (!oath || sworn) return;
    setSworn(oath);
    timer.current = window.setTimeout(() => onSwear(oath), SWEAR_MS);
  };

  // Keys: 1–3 pick, Enter swears the picked oath. (The game's own key map leaves these to this screen.)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const i = ["1", "2", "3"].indexOf(ev.key);
      if (i >= 0 && !sworn) {
        ev.preventDefault();
        setPicked(OATHS[i]);
      } else if (ev.key === "Enter" && picked) {
        // The focused Swear button swears through its own click. Anywhere else (a focused card
        // included, so it isn't re-picked), Enter swears the picked oath.
        const target = ev.target as HTMLElement | null;
        if (target?.dataset?.swear != null) return;
        ev.preventDefault();
        swear(picked);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shown = sworn ?? hover ?? picked;
  const band = shown && shown !== "sling" ? shown : null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#140e12]">
      <div className="relative min-h-0 flex-1">
        <MapPreview map={map} band={band} className="absolute inset-0 h-full w-full" />
      </div>
      <div className="px-4 pt-2 pb-3 text-center [@media(max-height:520px)]:pt-1 [@media(max-height:520px)]:pb-2">
        <p className="text-xs tracking-[0.28em] text-gold uppercase [@media(max-height:520px)]:hidden">{kicker}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold [@media(max-height:520px)]:mt-0 [@media(max-height:520px)]:text-xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-parchment/90 [@media(max-height:520px)]:hidden">
          Choose his oath. The other two are refused tonight.
        </p>
        <div role="radiogroup" aria-label="Sir Michael's oath" className="mx-auto mt-2 grid max-w-3xl gap-2 sm:grid-cols-3 [@media(max-height:520px)]:mt-1">
          {OATHS.map((oath, i) => {
            const text = OATH_TEXT[oath];
            const on = picked === oath;
            const refused = sworn != null && sworn !== oath;
            const stamped = sworn === oath;
            return (
              <button
                key={oath}
                type="button"
                role="radio"
                aria-checked={on}
                data-oath={oath}
                disabled={sworn != null}
                onClick={() => setPicked(oath)}
                onPointerEnter={() => setHover(oath)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(oath)}
                onBlur={() => setHover(null)}
                className={[
                  "group relative flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition duration-150 sm:flex-col sm:items-center sm:text-center",
                  "[@media(max-height:520px)]:py-1 sm:[@media(max-height:520px)]:flex-row sm:[@media(max-height:520px)]:text-left",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  on
                    ? "border-gold bg-[linear-gradient(180deg,#3a2a1a_0%,#24170f_100%)] shadow-[0_0_0_3px_rgba(230,195,106,0.25),0_8px_20px_rgba(0,0,0,0.5)]"
                    : "border-gold/30 bg-[linear-gradient(180deg,#2a1d16_0%,#1a1210_100%)] shadow-[0_4px_0_#0b0708] hover:-translate-y-0.5 hover:border-gold/70 hover:shadow-[0_6px_0_#0b0708,0_10px_18px_rgba(0,0,0,0.45)] active:translate-y-0.5 active:shadow-[0_1px_0_#0b0708]",
                  stamped ? "scale-[1.04] border-gold shadow-[0_0_24px_rgba(230,195,106,0.55)]" : "",
                  refused ? "scale-95 opacity-40 grayscale" : "",
                  sworn != null ? "cursor-default" : "",
                ].join(" ")}
              >
                <kbd className="absolute top-1.5 right-1.5 rounded border border-gold/40 px-1.5 text-[0.625rem] leading-4 text-gold/80">{i + 1}</kbd>
                <span className="shrink-0 transition group-hover:scale-110">
                  <OathMark oath={oath} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-tight font-semibold text-parchment">{text.title}</span>
                  <span className="block text-xs text-parchment/60 italic [@media(max-height:520px)]:hidden">“{text.said}”</span>
                  <span className="mt-1 flex flex-wrap gap-1 sm:justify-center">
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-gold">{text.gain}</span>
                    <span className="rounded-full bg-[#e23b4a]/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-[#ff8a8a]">{text.cost}</span>
                  </span>
                </span>
                {refused ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="-rotate-12 rounded border-2 border-[#ff8a8a] px-2 font-display text-lg font-bold tracking-widest text-[#ff8a8a] uppercase">
                      Refused
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          data-swear=""
          disabled={!picked || sworn != null}
          onClick={() => swear(picked)}
          className={[
            "mx-auto mt-2 block min-h-11 w-full max-w-xs rounded-lg text-lg font-semibold transition duration-150 [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:min-h-9",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            picked
              ? "cursor-pointer bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-ink shadow-[0_4px_0_#4a3418] hover:brightness-110 active:translate-y-0.5 active:shadow-[0_1px_0_#4a3418]"
              : "cursor-not-allowed border border-gold/20 text-parchment/40",
          ].join(" ")}
        >
          {sworn ? "Sworn." : picked ? `Swear it: ${OATH_TEXT[picked].title}` : "Pick an oath"}
          {picked && !sworn ? <span className="ml-2 text-xs opacity-60">Enter</span> : null}
        </button>
        <button
          type="button"
          disabled={sworn != null}
          className="mt-1 block w-full cursor-pointer text-sm text-muted underline-offset-4 hover:text-parchment hover:underline"
          onClick={onBack}
        >
          Back to setup
        </button>
      </div>
    </div>
  );
}
