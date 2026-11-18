import { useState } from "react";
import { Check, ChevronDown, Wrench, X } from "lucide-react";
import { CELL, TOWERS, TRICK_LEVEL, fittingName, fittingsFor, groupOf, groupsFor, type ModId, type TowerKind } from "@/game/engine";
import { describeStats } from "@/components/GameHUD";
import { tone } from "@/game/audio";
import { TowerIcon } from "@/components/TowerIcon";
import type { ScreenProps } from "@/components/ui";

/**
 * The shown kind's numbers now (with the upgrades it owns), and, while an upgrade is hovered, what they'd be
 * with it: changed numbers in gold. The board draws each tower's reach now and with it at the same time.
 */
function ShopNumbers({ api, kind, hovered }: { api: ScreenProps["api"]; kind: TowerKind; hovered: ModId | null }) {
  const owned = api.world.hud.fitted[kind] ?? [];
  const now = api.previewStats(kind);
  const next = hovered ? api.previewStats(kind, undefined, [hovered]) : null;
  const diff = (a: number, b: number, fmt: (n: number) => string, lowerIsBetter = false) =>
    Math.abs(a - b) < 1e-6 ? null : (lowerIsBetter ? b < a : b > a) ? `${fmt(a)} → ${fmt(b)}` : `${fmt(a)} → ${fmt(b)}`;
  const changes = next
    ? [
        diff(now.dmg, next.dmg, (n) => `${Math.round(n)} dmg`),
        diff(now.range, next.range, (n) => `${(n / CELL).toFixed(1)} tiles`),
        diff(now.interval, next.interval, (n) => `${n.toFixed(1)}s`, true),
        diff(now.pierce ?? 0, next.pierce ?? 0, (n) => `through ${n}`),
      ].filter(Boolean)
    : [];
  return (
    <div className="mt-2 rounded-lg border border-line/60 bg-[#140e12]/70 px-2.5 py-2 text-[0.8125rem]">
      <p>
        <span className="text-[0.6875rem] tracking-[0.16em] text-gold uppercase">Now </span>
        <span className="text-parchment">{describeStats(kind, now)}</span>
      </p>
      <p className="mt-0.5 text-muted">{owned.length ? `Owned: ${owned.map((id) => fittingName(kind, id)).join(", ")}` : "No upgrades yet."}</p>
      {hovered ? (
        <p className="mt-1 border-t border-line/50 pt-1">
          <span className="text-[0.6875rem] tracking-[0.16em] text-gold uppercase">With {fittingName(kind, hovered)} </span>
          <span className="font-semibold text-gold">{changes.length ? changes.join(" · ") : "no change to these numbers"}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * The back room, as a tab on the side of the board. Upgrades belong to a tower kind: buying one
 * gives it to every tower of that kind, now and for the rest of the night. Each kind has its own
 * price (40, then 30 more per upgrade it has), and you can buy them only between waves.
 */
export function BackRoomTab({ api, onGesture, docked = false, compact = false }: ScreenProps & { docked?: boolean; compact?: boolean }) {
  const hud = api.world.hud;
  const kind = hud.workshop;
  /** Which build tab's kinds are folded open (one at a time); null = follow the kind being shown. */
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [shownFor, setShownFor] = useState<TowerKind | null>(kind);
  /** The upgrade under the pointer (or focused): its numbers show beside the current ones, its reach on the board. */
  const [hovered, setHovered] = useState<ModId | null>(null);
  const hoverMod = (id: ModId | null) => {
    setHovered(id);
    api.shopHover(id);
  };
  // When the back room switches kind from outside (Upgrades on a cannon), open that kind's tab.
  if (shownFor !== kind) {
    setShownFor(kind);
    setOpenTab(null);
    setHovered(null);
  }

  if (compact) {
    // Phones: a small button in the build bar's tab row, so nothing sits on the board. The panel opens over the board as usual.
    if (kind != null) return null;
    return (
      <button
        type="button"
        data-board-controls
        data-backroom-button
        title="Back room: upgrade every tower of a kind"
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-[#c6a15a] bg-[#2c1a20] px-3 text-sm leading-tight font-semibold text-gold"
        onClick={() => {
          onGesture();
          tone(200, 0.06, "triangle", 0.03);
          api.openShop();
        }}
      >
        <Wrench className="size-4" aria-hidden="true" />
        Back room
      </button>
    );
  }
  if (kind == null && docked) {
    // Wide layout: the column waits with a plain button at its top.
    return (
      <button
        type="button"
        data-board-controls
        title="Back room (B): upgrade every tower of a kind"
        className="flex w-full items-center gap-2.5 rounded-xl border border-[#c6a15a] bg-[#2c1a20]/95 px-3.5 py-3.5 text-left text-gold shadow-[0_0_14px_rgba(198,161,90,0.3)] hover:bg-[#3a242c]"
        onClick={() => {
          onGesture();
          tone(200, 0.06, "triangle", 0.03);
          api.openShop();
        }}
      >
        <Wrench className="size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Back room</span>
          <span className="block text-[0.8125rem] text-muted">Upgrade every tower of a kind</span>
        </span>
        <kbd className="rounded border border-line px-1 font-sans text-[0.6875rem] text-muted">B</kbd>
      </button>
    );
  }
  if (kind == null) {
    return (
      <button
        type="button"
        data-board-controls
        title="Back room (B): upgrade every tower of a kind"
        className="absolute top-1/2 right-0 z-10 flex -translate-y-1/2 flex-col items-center gap-2.5 rounded-l-xl border border-r-0 border-[#c6a15a] bg-[#2c1a20]/95 px-3 py-6 text-gold shadow-[0_0_14px_rgba(198,161,90,0.35)] hover:bg-[#3a242c] sm:right-3"
        onClick={() => {
          onGesture();
          tone(200, 0.06, "triangle", 0.03);
          api.openShop();
        }}
      >
        <Wrench className="size-6" aria-hidden="true" />
        <span className="text-base font-semibold tracking-wide [writing-mode:vertical-rl]">Back room</span>
        <kbd className="hidden rounded border border-line px-1 font-sans text-[0.6875rem] text-muted sm:block">B</kbd>
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
        <span className="absolute -bottom-1 -left-1 rounded bg-ink px-0.5 text-[0.8125rem] leading-tight text-parchment">×{built(k)}</span>
      ) : null}
      {(hud.fitted[k]?.length ?? 0) > 0 ? (
        <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-gold text-[0.8125rem] font-bold text-ink">
          {hud.fitted[k]!.length}
        </span>
      ) : null}
    </button>
  );

  return (
    <aside
      data-board-controls
      aria-label="Back room"
      // Phones: a sheet up from the bottom, so the carpet above stays in view. Wider: a 20rem panel down the
      // right side. Wide layout: it fills its own column beside the board.
      className={
        docked
          ? "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-[#c6a15a]/60 bg-[#1c1216]"
          : "absolute inset-x-0 bottom-0 z-10 flex max-h-[58%] flex-col overflow-hidden rounded-t-xl border-t border-[#c6a15a]/60 bg-[#1c1216]/97 shadow-2xl sm:inset-x-auto sm:inset-y-0 sm:right-3 sm:max-h-none sm:w-[20rem] sm:max-w-[calc(100%-1.5rem)] sm:rounded-t-none sm:rounded-r-xl sm:border-t-0 sm:border-l"
      }
    >
      <div className="flex items-start gap-2 border-b border-line/60 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-tight font-semibold text-gold">Back room</h2>
          <p className="text-[0.8125rem] text-muted">Upgrades every tower of a kind, and any you build later.</p>
        </div>
        <button
          type="button"
          title="Close (B or Esc)"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted"
          onClick={() => {
            onGesture();
            hoverMod(null);
            api.closeShop();
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2.5 break-words">
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
                  <span className="text-[0.8125rem] text-muted">{onFloor ? `${onFloor} on the floor` : ""}</span>
                  <ChevronDown className={`ml-auto size-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {isOpen ? <div className="flex flex-wrap gap-1.5 px-2.5 pt-1 pb-2.5">{g.kinds.map(chip)}</div> : null}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-line/60 pt-2.5">
          <TowerIcon kind={kind} className="size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base leading-tight font-semibold">{TOWERS[kind].name}</p>
            <p className="text-[0.8125rem] text-muted">
              {count ? `${count} on the floor` : "None built yet"} · next upgrade{" "}
              <span className="text-parchment">{price ? `${price} seeds` : "free"}</span>
            </p>
          </div>
        </div>
        <ShopNumbers api={api} kind={kind} hovered={hovered} />

        <div className="mt-2 flex flex-col gap-1.5">
          {fittingsFor(kind).map((mod, i) => {
            const got = owned.includes(mod.id);
            const short = !got && hud.seeds < price;
            return (
              <button
                key={mod.id}
                type="button"
                disabled={got}
                onPointerEnter={() => hoverMod(got ? null : mod.id)}
                onPointerLeave={() => hoverMod(null)}
                onFocus={() => hoverMod(got ? null : mod.id)}
                onBlur={() => hoverMod(null)}
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
                  <span className="block text-[0.8125rem] text-muted">{mod.blurb}</span>
                </span>
                {got ? (
                  <Check className="size-4 shrink-0 text-rind" aria-label="Owned" />
                ) : (
                  <span className="shrink-0 text-right text-[0.8125rem]">
                    <span className="block font-semibold text-gold">{price || "Free"}</span>
                    <kbd className="hidden font-sans text-[0.6875rem] text-muted sm:block">{i + 1}</kbd>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[0.8125rem] text-muted">
          {between
            ? "Each upgrade for this kind raises only this kind's next price."
            : "You can look now; buying opens when the wave is over."}
        </p>
      </div>
    </aside>
  );
}
