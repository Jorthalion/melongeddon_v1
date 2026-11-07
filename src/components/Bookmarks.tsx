import { Lock } from "lucide-react";
import { BOARDS, BOOKMARK, BOOKMARKS, createWorld, type BookmarkId, type MapId } from "@/game/engine";
import { tone } from "@/game/audio";

/** Setup row: equip one unlocked bookmark (or none). Locked ones show how to earn them. */
export function BookmarkPicker({ api, onGesture }: { api: ReturnType<typeof createWorld>; onGesture: () => void }) {
  const hud = api.world.hud;
  const pick = (id: BookmarkId | null) => {
    onGesture();
    tone(id ? 300 : 200, 0.06, "triangle", 0.03);
    api.setBookmark(id);
  };
  const chosen = hud.bookmark ? BOOKMARK[hud.bookmark] : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] tracking-[0.22em] text-gold uppercase">Bookmark</p>
        <p className="text-xs text-muted">
          {hud.unlocked.length}/{BOOKMARKS.length} earned · one per run
        </p>
      </div>
      <div className="-mx-4 mt-1.5 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0" role="radiogroup" aria-label="Bookmark">
        <BookmarkButton label="None" sub="Plain run" on={hud.bookmark == null} onClick={() => pick(null)} />
        {BOOKMARKS.map((b) => {
          const open = hud.unlocked.includes(b.id);
          return (
            <BookmarkButton
              key={b.id}
              label={b.name}
              sub={open ? b.blurb : b.goal}
              locked={!open}
              on={hud.bookmark === b.id}
              onClick={() => open && pick(b.id)}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-sm text-muted">{chosen ? `${chosen.name}: ${chosen.blurb}` : "No bookmark. The run as written."}</p>
    </div>
  );
}

function BookmarkButton({
  label,
  sub,
  on,
  locked,
  onClick,
}: {
  label: string;
  sub: string;
  on: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-disabled={locked}
      title={locked ? `Locked. ${sub}` : sub}
      className={`min-h-14 w-32 shrink-0 snap-start rounded-lg border px-2 py-1.5 text-left sm:w-auto ${
        on
          ? "border-[#c6a15a] bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink"
          : locked
            ? "cursor-not-allowed border-line/50 bg-transparent text-muted"
            : "border-line/70 bg-panel text-parchment"
      }`}
      onClick={onClick}
    >
      <span className="flex items-center gap-1 text-xs font-semibold">
        {locked ? <Lock className="size-3 shrink-0" aria-hidden="true" /> : null}
        {label}
      </span>
      <span className={`mt-0.5 block text-[11px] leading-tight ${on ? "text-ink/80" : "text-muted"}`}>{sub}</span>
    </button>
  );
}

/** "New bookmark" / "New map" lines for the end-of-run card. */
export function NewUnlocks({ ids, maps = [] }: { ids: BookmarkId[]; maps?: MapId[] }) {
  if (!ids.length && !maps.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-[#c6a15a]/70 bg-[#241418] px-3 py-2">
      {maps.map((id) => (
        <p key={id} className="text-sm">
          <span className="font-semibold text-gold">New map: {BOARDS[id].name}.</span>{" "}
          <span className="text-muted">{BOARDS[id].blurb}</span>
        </p>
      ))}
      {ids.map((id) => (
        <p key={id} className="text-sm">
          <span className="font-semibold text-gold">New bookmark: {BOOKMARK[id].name}.</span>{" "}
          <span className="text-muted">{BOOKMARK[id].blurb}</span>
        </p>
      ))}
      <p className="mt-1 text-xs text-muted">
        {ids.length ? "Equip bookmarks on the setup screen (New night)." : "Pick it on the setup screen (New night)."}
      </p>
    </div>
  );
}
