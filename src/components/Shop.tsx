import { useState } from "react";
import { Check, ChevronDown, Wrench, X } from "lucide-react";
import { TOWERS, TRICK_LEVEL, fittingsFor, groupOf, groupsFor, type TowerKind } from "@/game/engine";
import { tone } from "@/game/audio";
import { TowerIcon } from "@/components/TowerIcon";
import type { ScreenProps } from "@/components/ui";

/**
 * The back room, as a tab on the side of the board. Upgrades belong to a tower kind: buying one
 * gives it to every tower of that kind, now and for the rest of the night. Each kind has its own
 * price (40, then 30 more per upgrade it has), and you can buy them only between waves.
 */
export function BackRoomTab({ api, onGesture }: ScreenProps) {
  const hud = api.world.hud;
  const kind = hud.workshop;
  /** Which build tab's kinds are folded open (one at a time); null = follow the kind being shown. */
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [shownFor, setShownFor] = useState<TowerKind | null>(kind);
  // When the back room switches kind from outside (Upgrades on a cannon), open that kind's tab.
  if (shownFor !== kind) {
    setShownFor(kind);
    setOpenTab(null);
  }

  if (kind == null) {
    return (
      <button
        type="button"
        title="Back room (B): upgrade every tower of a kind"
        className="absolute top-1/2 right-0 z-10 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-lg border border-r-0 border-[#c6a15a]/70 bg-[#241418]/95 px-1.5 py-3 text-gold shadow-lg sm:right-3"
        onClick={() => {
          onGesture();
          tone(200, 0.06, "triangle", 0.03);
          api.openShop();
        }}
      >
        <Wrench className="size-4" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-wide [writing-mode:vertical-rl]">Back room</span>
        <kbd className="hidden rounded border border-line px-1 font-sans text-[10px] text-muted sm:block">B</kbd>
      </button>
    );
  }

  // The same tabs as the build bar (Damage, Control, Support, Trick, Heavy), each folding open to
  // its kinds that take upgrades. Keeper towers have none, so their tab isn't here.
  const has = (k: TowerKind) => fittingsFor(k).length > 0 && (TRICK_LEVEL[k] ?? 0) <= hud.runLevel;
  const tabs = groupsFor(hud.hero)
    .map((g) => ({ ...g, kinds: g.kinds.filter(has) }))
    .filter((g) => g.kinds.length > 0);
  const open = openTab ?? groupOf(kind).id;
  const built = (k: TowerKind) => api.world.towers.filter((t) => t.kind === k).length;
  const owned = hud.fitted[kind] ?? [];
  const price = api.shopPriceFor(kind);
  const between = hud.phase === "prep";
  const count = api.world.towers.filter((t) => t.kind === kind).length;

  const chip = (k: TowerKind) => (
    <button
      key={k}
      type="button"
      title={`${TOWERS[k].name}${(hud.fitted[k]?.length ?? 0) ? ` · ${hud.fitted[k]!.length} upgrade${hud.fitted[k]!.length > 1 ? "s" : ""}` : ""}`}
      aria-pressed={k === kind}
      className={`relative size-10 shrink-0 rounded-lg border p-0.5 ${k === kind ? "border-[#c6a15a] bg-[#3a242c]" : "border-line/70 bg-panel"}`}
      onClick={() => {
        onGesture();
        api.shopKind(k);
      }}
    >
      <TowerIcon kind={k} className="h-full w-full" />
      {built(k) ? (
        <span className="absolute -bottom-1 -left-1 rounded bg-ink px-0.5 text-[9px] leading-tight text-parchment">×{built(k)}</span>
      ) : null}
      {(hud.fitted[k]?.length ?? 0) > 0 ? (
        <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-gold text-[10px] font-bold text-ink">
          {hud.fitted[k]!.length}
        </span>
      ) : null}
    </button>
  );

  return (
    <aside
      aria-label="Back room"
      className="absolute inset-y-0 right-0 z-10 flex w-80 max-w-[88%] flex-col border-l border-[#c6a15a]/60 bg-[#1c1216]/97 shadow-2xl sm:inset-y-0 sm:right-3 sm:rounded-r-xl"
    >
      <div className="flex items-start gap-2 border-b border-line/60 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-tight font-semibold text-gold">Back room</h2>
          <p className="text-xs text-muted">Upgrades every tower of a kind, and any you build later.</p>
        </div>
        <button
          type="button"
          title="Close (B or Esc)"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted"
          onClick={() => {
            onGesture();
            api.closeShop();
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        <div className="flex flex-col gap-1">
          {tabs.map((g) => {
            const isOpen = open === g.id;
            const onFloor = g.kinds.reduce((n, k) => n + built(k), 0);
            return (
              <div key={g.id} className={`rounded-lg border ${isOpen ? "border-[#c6a15a]/60 bg-[#241418]" : "border-line/60"}`}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
                  onClick={() => {
                    onGesture();
                    setOpenTab(isOpen ? "" : g.id);
                  }}
                >
                  <span className={`text-sm font-semibold ${isOpen || g.id === groupOf(kind).id ? "text-gold" : ""}`}>{g.name}</span>
                  <span className="text-xs text-muted">{onFloor ? `${onFloor} on the floor` : ""}</span>
                  <ChevronDown className={`ml-auto size-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {isOpen ? <div className="flex flex-wrap gap-1.5 px-2.5 pt-1 pb-2.5">{g.kinds.map(chip)}</div> : null}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-line/60 pt-2.5">
          <TowerIcon kind={kind} className="size-9 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-display text-base leading-tight font-semibold">{TOWERS[kind].name}</p>
            <p className="text-xs text-muted">
              {count ? `${count} on the floor` : "None built yet"} · next upgrade{" "}
              <span className="text-parchment">{price ? `${price} seeds` : "free"}</span>
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          {fittingsFor(kind).map((mod, i) => {
            const got = owned.includes(mod.id);
            const short = !got && hud.seeds < price;
            return (
              <button
                key={mod.id}
                type="button"
                disabled={got}
                aria-disabled={got || !between || short}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left ${got ? "border-rind/60 bg-rind-deep/20" : "border-line bg-panel-2"} ${!got && (!between || short) ? "opacity-60" : ""}`}
                onClick={() => {
                  onGesture();
                  if (!got && between && !short) tone(280, 0.08, "triangle", 0.04);
                  api.pickMod(mod.id);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{mod.name}</span>
                  <span className="block text-xs text-muted">{mod.blurb}</span>
                </span>
                {got ? (
                  <Check className="size-4 shrink-0 text-rind" aria-label="Owned" />
                ) : (
                  <span className="shrink-0 text-right text-xs">
                    <span className="block font-semibold text-gold">{price || "Free"}</span>
                    <kbd className="hidden font-sans text-[10px] text-muted sm:block">{i + 1}</kbd>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {between
            ? "Each upgrade for this kind raises only this kind's next price."
            : "You can look now; buying opens when the wave is over."}
        </p>
      </div>
    </aside>
  );
}
