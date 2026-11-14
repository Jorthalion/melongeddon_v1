import type { ReactNode, Ref } from "react";
import { BOARDS, DIFFICULTIES, KEEPER_NAMES, BOOKMARK, createWorld, type Hud } from "@/game/engine";

/** What createWorld returns: the world plus every action the UI can take. */
export type GameApi = ReturnType<typeof createWorld>;

/** Props most screens take: the game, and a hook that unlocks audio on the first tap. */
export interface ScreenProps {
  api: GameApi;
  onGesture: () => void;
}

export const NIGHT_LABEL: Record<Hud["night"], string> = { midnight: "Midnight", overflow: "The Overflow", endless: "Endless" };
/** One line for the Title's Continue: night, map, keeper, difficulty, bookmark. */
export function setupSummary(hud: Hud) {
  const level = DIFFICULTIES.find((d) => d.id === hud.difficulty)?.name ?? "";
  const parts = [NIGHT_LABEL[hud.night], BOARDS[hud.map].name, KEEPER_NAMES[hud.hero ?? "mynxi"].name, `${level} difficulty`];
  if (hud.bookmark) parts.push(BOOKMARK[hud.bookmark].name);
  return parts.join(" · ");
}

export function MenuCard({ title, onBack, wide, children }: { title: string; onBack: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex max-h-full w-full flex-col rounded-md border border-[#d7b56a]/70 bg-[#100c0e]/92 px-4 py-4 text-center shadow-[inset_0_0_0_1px_rgba(215,181,106,0.22)] ${wide ? "max-w-lg" : "max-w-xs"}`}
      role="region"
      aria-label={title}
    >
      <p className="font-display text-2xl font-semibold text-[#f6e7b4]">{title}</p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed text-[#f4ead8]">{children}</div>
      <div className="mt-4 shrink-0">
        <MenuButton onClick={onBack}>Back</MenuButton>
      </div>
    </div>
  );
}

export function MenuButton({
  gold,
  onClick,
  children,
  ref,
  disabled,
  title,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: {
  gold?: boolean;
  onClick: () => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      className={
        "group relative w-full overflow-hidden rounded-[5px] text-center transition-[transform,filter,box-shadow,background-color,border-color] duration-150 ease-out motion-safe:hover:-translate-y-[1px] motion-safe:active:translate-y-[1px] motion-safe:active:scale-[0.99] motion-reduce:transition-none " +
        (disabled ? "pointer-events-none opacity-45 " : "") +
        (gold
          ? "min-h-12 bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] font-display text-[1.35rem] font-semibold tracking-wide text-[#24160e] shadow-[inset_0_1px_0_rgba(255,248,220,0.75)] hover:brightness-110 hover:shadow-[0_0_24px_rgba(230,195,106,0.5)] focus-visible:brightness-110"
          : "min-h-11 border border-[#e2c78a]/85 bg-[#100c10]/80 font-display text-lg tracking-wide text-[#f6efe2] shadow-[inset_0_0_0_1px_rgba(226,199,138,0.28)] hover:border-[#fff0bd] hover:bg-[#261920]/95 hover:shadow-[0_0_20px_rgba(230,195,106,0.3),inset_0_0_0_1px_rgba(226,199,138,0.38)] focus-visible:border-[#fff0bd] focus-visible:bg-[#261920]/95")
      }
    >
      <span
        className={`pointer-events-none absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rotate-45 transition-transform duration-150 group-hover:scale-125 group-focus-visible:scale-125 ${gold ? "bg-[#24160e]/80" : "border border-[#e2c78a]"}`}
      />
      <span
        className={`pointer-events-none absolute top-1/2 right-3 size-1.5 -translate-y-1/2 rotate-45 transition-transform duration-150 group-hover:scale-125 group-focus-visible:scale-125 ${gold ? "bg-[#24160e]/80" : "border border-[#e2c78a]"}`}
      />
      {children}
    </button>
  );
}
