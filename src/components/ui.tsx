import type { ReactNode, Ref } from "react";
import { BOARDS, DIFFICULTIES, KEEPER_NAMES, BOOKMARK, createWorld, type Hud } from "@/game/engine";

/** What createWorld returns: the world plus every action the UI can take. */
export type GameApi = ReturnType<typeof createWorld>;

/** Props most screens take: the game, and a hook that unlocks audio on the first tap. */
export interface ScreenProps {
  api: GameApi;
  onGesture: () => void;
}

export const NIGHT_LABEL: Record<Hud["night"], string> = { midnight: "Midnight", overflow: "The Overflow", siege: "The Siege", endless: "Endless" };
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
  onHint,
}: {
  gold?: boolean;
  onClick: () => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
  /** Hover, or keyboard focus: called with the button (null when the pointer or focus leaves), for a hint card. */
  onHint?: (el: HTMLElement | null) => void;
}) {
  // Shared by every menu button (title, pause, settings): a pointer, a brighter face and a soft gold
  // glow on hover, a slight press, and a keyboard outline. Disabled buttons stay still.
  const live = !disabled;
  const motion =
    "cursor-pointer transition-[transform,background-color,border-color,box-shadow,color,filter] duration-200 ease-out " +
    "hover:scale-[1.04] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3dc9c]";
  const face = gold
    ? "relative min-h-12 w-full rounded-[5px] bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] font-display text-[1.35rem] font-semibold tracking-wide text-[#24160e] shadow-[inset_0_1px_0_rgba(255,248,220,0.75)]"
    : "relative min-h-11 w-full rounded-[5px] border border-[#e2c78a]/85 bg-[#100c10]/80 font-display text-lg tracking-wide text-[#f6efe2] shadow-[inset_0_0_0_1px_rgba(226,199,138,0.28)]";
  const hover = gold
    ? "hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,248,220,0.9),0_0_18px_rgba(248,222,150,0.6),0_6px_14px_rgba(0,0,0,0.45)]"
    : "hover:border-[#f3dc9c] hover:bg-[#3a2a17]/90 hover:text-[#fff6dc] hover:shadow-[inset_0_0_0_1px_rgba(243,220,156,0.5),0_0_16px_rgba(226,199,138,0.45),0_6px_14px_rgba(0,0,0,0.45)]";
  const mark = gold ? "bg-[#24160e]/80" : `border border-[#e2c78a] transition-colors duration-200 ${live ? "group-hover:bg-[#e2c78a]" : ""}`;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={onHint ? undefined : title}
      onPointerEnter={onHint ? (e) => e.pointerType === "mouse" && onHint(e.currentTarget) : undefined}
      onPointerLeave={onHint ? () => onHint(null) : undefined}
      // Keyboard focus only: the title focuses its first button on its own, and that shouldn't pop a card.
      onFocus={onHint ? (e) => e.currentTarget.matches(":focus-visible") && onHint(e.currentTarget) : undefined}
      onBlur={onHint ? () => onHint(null) : undefined}
      className={`group ${face} ${live ? `${motion} ${hover}` : "cursor-not-allowed opacity-45"}`}
    >
      <span className={`pointer-events-none absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rotate-45 ${mark}`} />
      <span className={`pointer-events-none absolute top-1/2 right-3 size-1.5 -translate-y-1/2 rotate-45 ${mark}`} />
      {children}
    </button>
  );
}
