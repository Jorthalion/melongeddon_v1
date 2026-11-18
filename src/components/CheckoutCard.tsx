import { X } from "lucide-react";
import { KEEPER_NAMES } from "@/game/engine";
import { CHECKOUT_EMPTY, checkoutCard } from "@/game/checkout";
import { Dialog } from "@/components/Dialog";
import { KEEPERS } from "@/components/keeperCards";
import { NIGHT_LABEL, type GameApi } from "@/components/ui";

const INK = "#2a1c22";
/** Faint blue rules every 1.75rem and a red margin line, like a library index card. */
const RULED = {
  backgroundColor: "#f3e2c4",
  backgroundImage:
    "linear-gradient(90deg, transparent 1.6rem, rgba(226,59,74,0.35) 1.6rem, rgba(226,59,74,0.35) calc(1.6rem + 1px), transparent calc(1.6rem + 1px)), repeating-linear-gradient(180deg, transparent 0, transparent calc(1.75rem - 1px), rgba(70,110,160,0.22) calc(1.75rem - 1px), rgba(70,110,160,0.22) 1.75rem)",
} as const;

/** The keeper's line from their setup card, for keepers with no live rule to show. */
const lineFor = (hero: string | null) => KEEPERS.find((k) => k.id === hero)?.line;

/** Top-bar badge count without building the whole card in the header every frame. */
export function checkoutCount(api: GameApi) {
  const hud = api.world.hud;
  return checkoutCard(hud, lineFor(hud.hero)).count;
}

/**
 * The checkout card: everything shaping tonight's run, on a cream index card stamped DUE: DAWN.
 * A side panel on wide screens, a sheet from the bottom on phones. The board is paused while it's open.
 */
export function CheckoutPanel({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const hud = api.world.hud;
  const card = checkoutCard(hud, lineFor(hud.hero));
  const wave = hud.waveCount ? `wave ${Math.min(hud.wave, hud.waveCount)} of ${hud.waveCount}` : `wave ${hud.wave}`;
  const close = () => {
    onGesture();
    api.closeCheckout();
  };
  const empty = !card.groups.some((g) => g.id === "cards");

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-ink/60 sm:items-stretch sm:justify-end" onClick={close}>
      <Dialog
        labelledBy="checkout-title"
        className="checkout-slide relative flex max-h-[85%] w-full flex-col overflow-hidden rounded-t-md border border-[#d7b56a]/70 shadow-[0_0_0_1px_rgba(215,181,106,0.22),0_-8px_30px_rgba(0,0,0,0.45)] outline-none sm:m-3 sm:max-h-none sm:w-[24rem] sm:rounded-md"
      >
        {/* The Dialog has no click handler of its own, so stop clicks here from closing it. */}
        <div className="flex min-h-0 flex-1 flex-col" style={{ ...RULED, color: INK }} onClick={(e) => e.stopPropagation()}>
          <div className="relative shrink-0 border-b border-[#c6a15a]/60 px-4 pt-3 pb-2 pl-9">
            <p className="text-[0.6875rem] font-semibold tracking-[0.2em] text-[#7a5a3a] uppercase">Checkout card</p>
            <h2 id="checkout-title" className="font-display text-xl leading-tight font-semibold">
              {KEEPER_NAMES[hud.hero ?? "mynxi"].name}
            </h2>
            <p className="text-xs text-[#6b5040]">
              {NIGHT_LABEL[hud.night]} · {wave}
            </p>
            {/* The due-date stamp, a little crooked. */}
            <span
              className="pointer-events-none absolute top-3 right-14 rotate-[-8deg] rounded-[3px] border-2 border-[#b8323a]/75 px-1.5 py-0.5 font-display text-[0.6875rem] font-bold tracking-[0.15em] text-[#b8323a]/80"
              aria-hidden="true"
            >
              DUE: DAWN
            </span>
            <button
              type="button"
              data-autofocus
              aria-label="Close (C or Esc)"
              title="Close (C or Esc)"
              className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-lg border border-[#c6a15a]/70 bg-[#f6ead2] text-[#2a1c22] hover:bg-[#fff3dc]"
              onClick={close}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-5 pl-9">
            {card.totals.length ? (
              <ul className="mb-3 rounded-[4px] border border-[#c6a15a]/70 bg-[#fbf1dc]/80 px-3 py-2 text-sm font-semibold" aria-label="Totals">
                {card.totals.map((t) => (
                  <li key={t} className={t.includes("−") ? "text-[#b8323a]" : ""}>
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}
            {empty ? <p className="mb-3 text-sm text-[#6b5040] italic">{CHECKOUT_EMPTY}</p> : null}

            {card.groups.map((g) => (
              <section key={g.id} className="mb-3" aria-labelledby={`checkout-${g.id}`}>
                <h3 id={`checkout-${g.id}`} className="text-[0.6875rem] font-semibold tracking-[0.18em] text-[#7a5a3a] uppercase">
                  {g.title}
                </h3>
                <ul>
                  {g.entries.map((e, i) => (
                    <li key={`${e.name}-${i}`} className="relative border-b border-[#466ea0]/15 py-1.5 pr-10">
                      <p className={`font-display text-[0.9375rem] leading-snug font-semibold ${e.tone === "drawback" ? "text-[#e23b4a]" : ""}`}>{e.name}</p>
                      <p className={`text-xs leading-snug ${e.tone === "drawback" ? "text-[#b8323a]/90" : "text-[#6b5040]"}`}>{e.blurb}</p>
                      {e.tone === "drawback" ? (
                        <span className="absolute top-2 right-0 rotate-[-6deg] rounded-[2px] border border-[#e23b4a]/70 px-1 text-[0.625rem] font-bold tracking-widest text-[#e23b4a] uppercase" aria-hidden="true">
                          late
                        </span>
                      ) : null}
                      {/* The Doctor's pick, marked as on the shelf. */}
                      {e.note ? (
                        <span className="pointer-events-none absolute right-1 bottom-1 font-display text-[0.625rem] text-[#7a5a3a] italic">
                          {e.note}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
