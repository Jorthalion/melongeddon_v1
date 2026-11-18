import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { unlockNote, type Hud, type Reward, type RoomId } from "@/game/engine";

/**
 * Open the Grand Catalogue from anywhere something is locked: one window event, caught by
 * `MelonGame`, which shows the Catalogue over whatever screen you're on, scrolled to the room that
 * unlocks it.
 */
export interface CatalogueRequest {
  /** The room to show (null: just open it). */
  room: RoomId | null;
  /** The locked thing that sent you there (its chip is highlighted and explained). */
  reward?: Reward;
}

const EVENT = "melongeddon:catalogue";

export function openCatalogue(request: CatalogueRequest = { room: null }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CatalogueRequest>(EVENT, { detail: request }));
}

/** The open request (null when closed), and a way to close it. Esc closes it before anything else sees the key. */
export function useCatalogueRequest(): [CatalogueRequest | null, () => void] {
  const [request, setRequest] = useState<CatalogueRequest | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setRequest((e as CustomEvent<CatalogueRequest>).detail ?? { room: null });
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);
  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      setRequest(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [request]);
  return [request, () => setRequest(null)];
}

/**
 * The line under anything locked by a Catalogue room: what to restore and how close you are, with a
 * button that opens the Catalogue at that room. Nothing if it isn't locked by a room.
 */
export function UnlockLink({
  hud,
  reward,
  className = "",
  onGesture,
}: {
  hud: Pick<Hud, "rooms" | "fragments">;
  reward: Reward;
  className?: string;
  onGesture?: () => void;
}) {
  const note = unlockNote(reward.kind, reward.id, hud.rooms, hud.fragments);
  if (!note) return null;
  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs ${className}`}>
      <span className="text-flesh">
        <Lock className="mr-1 inline size-3 align-[-0.1em]" aria-hidden="true" />
        Locked. {note.text}
      </span>
      <button
        type="button"
        className={`font-semibold underline underline-offset-2 ${note.ready ? "text-gold decoration-gold" : "text-gold/90 decoration-gold/50"} hover:decoration-gold`}
        onClick={(e) => {
          e.stopPropagation();
          onGesture?.();
          openCatalogue({ room: note.room.id, reward });
        }}
      >
        {note.ready ? "Restore it now" : "Open the Catalogue"}
      </button>
    </span>
  );
}
