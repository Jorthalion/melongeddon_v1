import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BookMarked, Brush, Map as MapIcon, UserRound, Wrench } from "lucide-react";
import { asset } from "@/lib/asset";
import { ACHIEVEMENT, ACHIEVEMENTS, SECTIONS, shownAs } from "@/game/achievements";
import { FRAGMENTS } from "@/game/catalogue";
import { BOARDS, BOOKMARK, KEEPER_NAMES, ROOM, ROOMS, TOWERS, type Hud, type Reward, type RoomId } from "@/game/engine";
import { KEEPERS } from "@/components/keeperCards";
import type { GameApi } from "@/components/ui";

/** Painted book spines, picked by shelf position so a bookcase reads as a row of different books. */
const SPINES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => asset(`sprites/cat-spine-${n}.webp`));
const ART = {
  missing: asset("sprites/cat-spine-missing.webp"),
  secret: asset("sprites/cat-spine-secret.webp"),
  shelf: asset("sprites/cat-shelf.webp"),
  lampOn: asset("sprites/cat-lamp-on.webp"),
  lampOff: asset("sprites/cat-lamp-off.webp"),
  plaque: asset("sprites/cat-plaque.webp"),
  seal: asset("sprites/cat-seal.webp"),
  fragment: asset("sprites/cat-fragment.webp"),
  header: asset("sprites/cat-header.webp"),
};
/** Rooms with a painting: restored, and (where there is one) ruined. Without a ruined one, the restored scene is shown faded. */
const ROOM_ART: Partial<Record<RoomId, { restored: string; ruined?: string }>> = {
  stacks: { restored: asset("sprites/cat-room-stacks.webp"), ruined: asset("sprites/cat-room-stacks-ruined.webp") },
  mezzanine: { restored: asset("sprites/cat-room-mezzanine.webp"), ruined: asset("sprites/cat-room-mezzanine-ruined.webp") },
  rarebooks: { restored: asset("sprites/cat-room-rarebooks.webp"), ruined: asset("sprites/cat-room-rarebooks-ruined.webp") },
  archive: { restored: asset("sprites/cat-room-archive.webp"), ruined: asset("sprites/cat-room-archive-ruined.webp") },
  greathall: { restored: asset("sprites/cat-room-greathall.webp"), ruined: asset("sprites/cat-room-greathall-ruined.webp") },
  readingroom: { restored: asset("sprites/cat-room-readingroom.webp"), ruined: asset("sprites/cat-room-readingroom-ruined.webp") },
  bindery: { restored: asset("sprites/cat-room-bindery.webp"), ruined: asset("sprites/cat-room-bindery-ruined.webp") },
  restricted: { restored: asset("sprites/cat-room-restricted.webp"), ruined: asset("sprites/cat-room-restricted-ruined.webp") },
  sorting: { restored: asset("sprites/cat-room-sorting.webp"), ruined: asset("sprites/cat-room-sorting-ruined.webp") },
  greenhouse: { restored: asset("sprites/cat-room-greenhouse.webp"), ruined: asset("sprites/cat-room-greenhouse-ruined.webp") },
  belltower: { restored: asset("sprites/cat-room-belltower.webp"), ruined: asset("sprites/cat-room-belltower-ruined.webp") },
  rotunda: { restored: asset("sprites/cat-room-rotunda.webp"), ruined: asset("sprites/cat-room-rotunda-ruined.webp") },
  halldoors: { restored: asset("sprites/cat-room-halldoors.webp"), ruined: asset("sprites/cat-room-halldoors-ruined.webp") },
  compact: { restored: asset("sprites/cat-room-compact.webp"), ruined: asset("sprites/cat-room-compact-ruined.webp") },
  basement: { restored: asset("sprites/cat-room-basement.webp"), ruined: asset("sprites/cat-room-basement-ruined.webp") },
};
/** Spines per shelf board, so each row stands on its own plank. */
const PER_SHELF = 9;

/** The green desk lamp: lit for a restored room or a full bookcase. */
function LampIcon({ lit, className = "h-5" }: { lit: boolean; className?: string }) {
  return <img src={lit ? ART.lampOn : ART.lampOff} alt={lit ? "Lamp lit" : "Lamp unlit"} className={`w-auto shrink-0 ${className} ${lit ? "drop-shadow-[0_0_6px_rgba(230,195,106,0.7)]" : "opacity-70"}`} />;
}
/** The fragment: a torn, glowing corner of an index card. */
export function FragmentIcon({ className = "h-4" }: { className?: string }) {
  return <img src={ART.fragment} alt="" aria-hidden="true" className={`inline-block w-auto align-[-0.2em] ${className}`} />;
}

const fmt = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const COSMETIC_NAME = { carpets: "Carpet colours", frames: "Keeper-card frames", gilded: "Gilded title screen", archivist: "The Archivist's frame" } as const;

/** A reward's display name. */
export function rewardName(w: Reward): string {
  if (w.kind === "map") return BOARDS[w.id].name;
  if (w.kind === "keeper") return KEEPER_NAMES[w.id].name;
  if (w.kind === "bookmark") return BOOKMARK[w.id].name;
  if (w.kind === "tower") return TOWERS[w.id].name;
  return COSMETIC_NAME[w.id];
}
const COSMETIC_BLURB = {
  carpets: "Dye the carpet blue, green or black on every map (Settings › Appearance).",
  frames: "Gold or ink frames for the keeper cards on Setup (Settings › Appearance).",
  gilded: "Gold trim around the title screen (Settings › Appearance).",
  archivist: "A glowing gold frame for the keeper cards (Settings › Appearance).",
} as const;
/** Keeper towers a room opens, in one line (their full text is long). */
const TOWER_BLURB: Partial<Record<string, string>> = {
  desk: "Mynxi's bank: no shot, it saves 8 seeds every wave you survive, until a melon walks past and eats it.",
  flask: "Vaelithra's leaking flask: drips a slowing puddle and spreads, soaking the carpet so fire burns weaker and puddles last longer.",
};
/** The first sentence of a longer description. */
const firstSentence = (text: string) => text.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? text;

/** One line on what a reward actually does, for the tap-to-read line under a room. */
export function rewardBlurb(w: Reward): string {
  if (w.kind === "map") return BOARDS[w.id].blurb;
  if (w.kind === "keeper") {
    const k = KEEPERS.find((x) => x.id === w.id);
    return k ? `${k.role}. ${k.line}` : "";
  }
  if (w.kind === "bookmark") return `Bookmark: ${BOOKMARK[w.id].blurb}`;
  if (w.kind === "tower") return `${TOWERS[w.id].cost ? `${TOWERS[w.id].cost} seeds` : "Free"}. ${TOWER_BLURB[w.id] ?? firstSentence(TOWERS[w.id].blurb)}`;
  return COSMETIC_BLURB[w.id];
}

const REWARD_ICON = { map: MapIcon, keeper: UserRound, bookmark: BookMarked, tower: Wrench, cosmetic: Brush } as const;
const KIND_LABEL = { map: "Map", keeper: "Keeper", bookmark: "Bookmark", tower: "Keeper tower", cosmetic: "Cosmetic" } as const;

/**
 * The Grand Catalogue: fragments, rooms to restore (Rooms, first) and achievements on bookcases (Shelves).
 * Shown from the Title, from Setup, and from anything locked anywhere (`openCatalogue`): then `focus` is the
 * room that unlocks it (scrolled to and lit) and `reward` the locked thing (its chip explained).
 */
export function GrandCatalogue({
  api,
  onGesture,
  focus = null,
  reward,
  inRun = false,
}: {
  api: GameApi;
  onGesture?: () => void;
  focus?: RoomId | null;
  reward?: Reward;
  /** Opened during a night: what you restore opens from the next one. */
  inRun?: boolean;
}) {
  const hud = api.world.hud;
  const [tab, setTab] = useState<"rooms" | "shelves">("rooms");
  const shelves = ACHIEVEMENTS.filter((a) => hud.shelves[a.id]).length;
  return (
    <div className="text-left">
      {/* The catalogue itself: the great ledger, being restored. */}
      <img src={ART.header} alt="" aria-hidden="true" className="mx-auto -mt-1 mb-1 h-16 w-auto sm:h-20" />
      <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5 text-center text-sm text-[#f4ead8]">
        <span>
          <FragmentIcon className="mr-1 h-4" />
          <span className="font-semibold text-gold">{fmt(hud.fragments)}</span> {hud.fragments === 1 ? "fragment" : "fragments"}
        </span>
        <span className="text-muted">
          Rooms {hud.rooms.length} of {ROOMS.length}
        </span>
        <span className="text-muted">
          Shelves {shelves} of {ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-[5px] border border-[#e2c78a]/70" role="tablist" aria-label="Grand Catalogue">
        {(["rooms", "shelves"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`min-h-9 font-display text-base ${tab === t ? "bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] text-[#24160e]" : "bg-[#100c10]/80 text-[#f6efe2]"}`}
            onClick={() => setTab(t)}
          >
            {t === "rooms" ? "Rooms" : "Shelves"}
          </button>
        ))}
      </div>
      {tab === "rooms" ? <RoomsTab api={api} onGesture={onGesture} focus={focus} reward={reward} inRun={inRun} /> : <ShelvesTab hud={hud} />}
    </div>
  );
}

/** How fragments are earned and what rooms do: read from FRAGMENTS, so it can't drift from the rules. */
function EarnGuide({ open }: { open: boolean }) {
  const w = FRAGMENTS.win;
  return (
    <details open={open} className="group rounded-[4px] border border-[#c6a15a]/60 bg-[#f3e2c4] px-3 py-2 text-[#2a1c22]">
      <summary className="cursor-pointer list-none font-display text-base font-semibold select-none">
        <FragmentIcon className="mr-1.5 h-4" />
        How to earn fragments
        <span className="ml-1 text-xs font-normal text-[#7a5a3a] group-open:hidden">(tap to read)</span>
      </summary>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-[#4a3428]">
        <li>
          <b>Win a night:</b> {w.easy} on Easy, {w.normal} on Normal, {w.hard} on Hard, {w.overdue} on Overdue.
        </li>
        <li>
          <b>+{FRAGMENTS.overflowBonus}</b> for winning the Overflow, <b>+{FRAGMENTS.siegeBonus}</b> for winning the Siege.
        </li>
        <li>
          <b>+{FRAGMENTS.karl}</b> for popping Karl, win or lose.
        </li>
        <li>
          <b>Lost?</b> Holding {FRAGMENTS.lossFrom} waves or more still pays {FRAGMENTS.loss}.
        </li>
        <li>
          <b>Endless:</b> 1 for every {FRAGMENTS.endlessEvery} waves cleared.
        </li>
        <li>
          <b>Shelves:</b> every achievement pays 1 to 3, once. See them on the Shelves tab.
        </li>
      </ul>
      <p className="mt-1.5 text-xs text-[#6b5040]">
        Fragments are counted at the end of each night. Spend them on any room, in any order: each one opens what's listed under it. Tap a
        chip to see what it does.
      </p>
    </details>
  );
}

function RoomsTab({
  api,
  onGesture,
  focus,
  reward,
  inRun,
}: {
  api: GameApi;
  onGesture?: () => void;
  focus: RoomId | null;
  reward?: Reward;
  inRun: boolean;
}) {
  const hud = api.world.hud;
  const [confirm, setConfirm] = useState<RoomId | null>(null);
  const [opened, setOpened] = useState<RoomId | null>(null);
  /** The reward chip tapped for its explanation, as "room:kind:id" (at first, the locked thing you came for). */
  const [info, setInfo] = useState<string | null>(focus && reward ? `${focus}:${reward.kind}:${reward.id}` : null);
  // Sent here from something locked: scroll to its room.
  const focusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);
  const target = focus ? ROOM[focus] : null;
  // Up / Down move between the room cards' buttons, like the title menu.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-room]")];
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(at < 0 ? 0 : at + step + items.length) % items.length].focus();
  };
  return (
    <div className="mt-3 flex flex-col gap-2" onKeyDown={onKey}>
      {/* Open for a new player (only the Stacks restored); folded once they've restored a room. */}
      <EarnGuide open={hud.rooms.length <= 1 && !focus} />
      {opened ? (
        <div className="rounded-[4px] border border-gold/70 bg-[#f3e2c4] px-3 py-2 text-[#2a1c22]" role="status">
          <p className="font-display text-base font-semibold">{ROOM[opened].name} is restored.</p>
          <p className="text-xs text-[#6b5040]">Unlocked: {ROOM[opened].rewards.map(rewardName).join(", ")}.</p>
        </div>
      ) : null}
      {ROOMS.map((room) => {
        const restored = hud.rooms.includes(room.id);
        const short = room.cost - hud.fragments;
        const asking = confirm === room.id;
        return (
          <article
            key={room.id}
            ref={room.id === focus ? focusRef : undefined}
            style={{ overflow: "hidden" }}
            className={`rounded-[5px] border px-3 py-2.5 ${room.id === focus && !restored ? "ring-2 ring-gold ring-offset-2 ring-offset-[#100c0e]" : ""} ${
              restored
                ? "border-gold/70 bg-[radial-gradient(ellipse_at_top,rgba(230,195,106,0.22),transparent_75%)] shadow-[inset_0_0_0_1px_rgba(230,195,106,0.25),0_0_14px_rgba(230,195,106,0.18)]"
                : "border-line/80 bg-[#140e12]/80"
            }`}
            aria-label={room.name}
          >
            {ROOM_ART[room.id] ? (
              // The room's painting: restored, or ruined (the restored scene in the dark, if there's no ruined one).
              <img
                src={restored ? ROOM_ART[room.id]!.restored : (ROOM_ART[room.id]!.ruined ?? ROOM_ART[room.id]!.restored)}
                alt=""
                aria-hidden="true"
                className={`-mx-3 -mt-2.5 mb-2 block h-24 w-[calc(100%+1.5rem)] max-w-none object-cover sm:h-28 ${
                  !restored && !ROOM_ART[room.id]!.ruined ? "brightness-[0.35] grayscale-[0.7] sepia-[0.3]" : ""
                } ${restored ? "" : "opacity-90"}`}
              />
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className={`flex items-center gap-1.5 font-display text-base font-semibold ${restored ? "text-[#f6e7b4]" : "text-[#cbb9a4]"}`}>
                  <LampIcon lit={restored} />
                  {room.name}
                </h3>
                <p className="text-xs text-muted">{room.blurb}</p>
              </div>
              <div className="shrink-0 text-right">
                {restored ? (
                  <span className="flex items-center gap-1 text-xs font-semibold tracking-wide text-gold uppercase">
                    {/* The catalogue's wax seal: this room is done. */}
                    <img src={ART.seal} alt="" aria-hidden="true" className="h-7 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                    Restored
                  </span>
                ) : asking ? (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      data-room
                      autoFocus
                      className="min-h-9 rounded-[4px] bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] px-2.5 text-sm font-semibold text-[#24160e]"
                      onClick={() => {
                        onGesture?.();
                        if (api.restoreRoom(room.id)) setOpened(room.id);
                        setConfirm(null);
                      }}
                    >
                      Spend {room.cost}
                    </button>
                    <button type="button" data-room className="min-h-9 rounded-[4px] border border-line px-2 text-sm text-parchment" onClick={() => setConfirm(null)}>
                      Not yet
                    </button>
                  </span>
                ) : short <= 0 ? (
                  <button
                    type="button"
                    data-room
                    className="min-h-9 rounded-[4px] bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] px-3 font-display text-sm font-semibold text-[#24160e] transition-transform hover:scale-[1.04] motion-reduce:hover:scale-100"
                    onClick={() => {
                      onGesture?.();
                      setConfirm(room.id);
                    }}
                  >
                    Restore ({room.cost})
                  </button>
                ) : (
                  // How close: a small gold bar and "have / cost".
                  <span className="flex w-24 flex-col items-end gap-1">
                    <span className="text-xs text-muted">
                      <span className="font-semibold text-[#f4ead8]">{hud.fragments}</span> / {room.cost} fragments
                    </span>
                    <span
                      className="block h-1.5 w-full overflow-hidden rounded-full bg-[#2a1c22] shadow-[inset_0_0_0_1px_rgba(226,199,138,0.3)]"
                      role="progressbar"
                      aria-label={`${room.name}: ${hud.fragments} of ${room.cost} fragments`}
                      aria-valuemin={0}
                      aria-valuemax={room.cost}
                      aria-valuenow={Math.min(hud.fragments, room.cost)}
                    >
                      <span className="block h-full rounded-full bg-[linear-gradient(90deg,#b89249,#e6c87a)]" style={{ width: `${Math.min(100, (hud.fragments / room.cost) * 100)}%` }} />
                    </span>
                    <span className="text-right text-[0.625rem] leading-tight text-muted">
                      {short} more,
                      <span className="block whitespace-nowrap">about {plural(Math.ceil(short / FRAGMENTS.win.normal), "Normal win")}</span>
                    </span>
                  </span>
                )}
              </div>
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Unlocks">
              {room.rewards.map((w) => {
                const Icon = REWARD_ICON[w.kind];
                const key = `${room.id}:${w.kind}:${w.id}`;
                const on = info === key;
                return (
                  <li key={key}>
                    {/* Tap (or hover) for what it does. */}
                    <button
                      type="button"
                      aria-expanded={on}
                      title={`${KIND_LABEL[w.kind]}: ${rewardBlurb(w)}`}
                      onClick={() => setInfo(on ? null : key)}
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] hover:border-gold ${
                        on ? "border-gold bg-gold/15 text-[#f6e7b4]" : restored ? "border-gold/50 text-[#f4ead8]" : "border-line/70 text-muted"
                      }`}
                    >
                      <Icon className="size-3" aria-hidden="true" />
                      <span className="sr-only">{KIND_LABEL[w.kind]}: </span>
                      {rewardName(w)}
                    </button>
                  </li>
                );
              })}
            </ul>
            {room.id === focus && target && !restored && opened !== target.id ? (
        <div className="mt-2 rounded-[4px] border border-gold/70 bg-[#241418] px-3 py-2 text-left" role="status">
          <p className="font-display text-base font-semibold text-gold">
            {!reward
              ? `Restore ${target.name}.`
              : rewardName(reward) === target.name
                ? `Restore ${target.name} to play it.`
                : `To unlock ${rewardName(reward)}, restore ${target.name}.`}
          </p>
          <p className="text-xs text-[#f4ead8]">
            {hud.fragments >= target.cost
              ? `It takes ${target.cost} fragments and you have ${hud.fragments}: press Restore on it below.`
              : `It takes ${target.cost} fragments; you have ${hud.fragments}. Win nights to earn more (harder difficulties pay more).`}
            {inRun ? " What you restore now opens from your next night." : ""}
          </p>
        </div>
      ) : null}
            {info?.startsWith(`${room.id}:`) ? (
              (() => {
                const w = room.rewards.find((r) => `${room.id}:${r.kind}:${r.id}` === info)!;
                return (
                  <p className="mt-1.5 rounded-[3px] bg-ink/60 px-2 py-1 text-xs text-[#f4ead8]" role="status">
                    <span className="font-semibold text-gold">
                      {KIND_LABEL[w.kind]} · {rewardName(w)}.
                    </span>{" "}
                    {rewardBlurb(w)}
                  </p>
                );
              })()
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function ShelvesTab({ hud }: { hud: Hud }) {
  const [picked, setPicked] = useState<string | null>(null);
  const earned = hud.shelves;
  const sel = picked ? ACHIEVEMENT[picked] : null;
  return (
    <div className="mt-2">
      {/* What the tapped shelf is: name, blurb, fragments, and when (or how close). */}
      <div className="sticky top-0 z-10 min-h-[4.5rem] rounded-[4px] border border-[#c6a15a]/60 bg-[#f3e2c4] px-3 py-2 text-[#2a1c22]" aria-live="polite">
        {sel ? (
          (() => {
            const has = Boolean(earned[sel.id]);
            const shown = shownAs(sel, has);
            const prog =
              !has && !sel.secret && sel.progress
                ? sel.progress(hud.ledger, hud.endlessBest, { fragmentsEarned: hud.fragmentsEarned, rooms: hud.rooms })
                : null;
            return (
              <>
                <p className="font-display text-base leading-tight font-semibold">
                  {shown.name}
                  {sel.set ? <span className="ml-1.5 text-[0.6875rem] font-normal text-[#7a5a3a]">{sel.set}</span> : null}
                </p>
                <p className="text-xs text-[#6b5040]">
                  {has ? shown.blurb : sel.secret ? `A secret. Hint: ${sel.hint ?? "keep playing."}` : `To restore: ${shown.blurb}`}
                </p>
                <p className="mt-0.5 text-[0.6875rem] font-semibold text-[#7a5a3a]">
                  {sel.secret && !has ? "" : `${plural(sel.tier, "fragment")} · `}
                  {has
                    ? `Restored ${new Date(earned[sel.id]).toLocaleDateString()}`
                    : prog
                      ? `${fmt(Math.min(prog[0], prog[1]))} / ${fmt(prog[1])}`
                      : "Not yet restored"}
                </p>
              </>
            );
          })()
        ) : (
          <p className="text-xs text-[#6b5040] italic">Tap a book to see how to earn it. Coloured books are restored; dusty gaps are still to earn; chained books are secrets (tap for a hint). Each pays 1 to 3 fragments once, at the end of the night you earn it.</p>
        )}
      </div>

      {SECTIONS.map((section) => {
        const list = ACHIEVEMENTS.filter((a) => a.shelf === section.id);
        const done = list.filter((a) => earned[a.id]).length;
        const lit = done === list.length;
        return (
          <section key={section.id} className="mt-4" aria-label={section.name}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <LampIcon lit={lit} className="h-7" />
                {/* The section's brass nameplate. */}
                <h3
                  className="bg-contain bg-center bg-no-repeat px-5 py-1 font-display text-sm font-semibold whitespace-nowrap text-[#2a1808] [text-shadow:0_1px_0_rgba(255,240,200,0.5)] sm:text-base"
                  style={{ backgroundImage: `url(${ART.plaque})`, backgroundSize: "100% 100%" }}
                >
                  {section.name}
                </h3>
              </span>
              <span className="text-[0.6875rem] text-muted">
                {done} of {list.length} restored
              </span>
            </div>
            {/* The bookcase: rows of spines, each standing on its own carved plank. A named set (the Courtyard) starts its own row. */}
            {shelfRows(list).map(({ set, books, start }, row) => (
              <div key={row}>
              {set ? <p className="mt-2 text-[0.625rem] tracking-[0.22em] text-gold uppercase">{set}</p> : null}
              <div className={`relative mt-1 ${lit ? "drop-shadow-[0_0_10px_rgba(230,195,106,0.2)]" : ""}`}>
                <img src={ART.shelf} alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 w-full select-none" />
                <div className="relative flex items-end gap-[0.1875rem] px-[4%] pb-[8%]">
              {books.map((a, j) => {
                const i = start + j;
                const has = Boolean(earned[a.id]);
                const shown = shownAs(a, has);
                const active = picked === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-label={`${shown.name}${has ? ", restored" : ", not restored"}`}
                    aria-pressed={active}
                    title={shown.name}
                    onClick={() => setPicked(a.id)}
                    className={`relative h-16 w-[1.625rem] shrink-0 outline-offset-1 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none sm:w-7 ${
                      active ? "-translate-y-1 drop-shadow-[0_0_6px_rgba(230,195,106,0.9)]" : ""
                    }`}
                  >
                    {/* Restored: a painted spine with its title in gold. Missing: a dusty outline. Secret: chained shut. */}
                    <img
                      src={has ? SPINES[i % SPINES.length] : a.secret ? ART.secret : ART.missing}
                      alt=""
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 h-full w-full ${has ? "drop-shadow-[1px_0_1px_rgba(0,0,0,0.6)]" : ""}`}
                    />
                    {has ? (
                      <span
                        className="absolute inset-x-0 top-[22%] bottom-[22%] flex items-center justify-center overflow-hidden font-display text-[0.5rem] leading-none font-semibold whitespace-nowrap text-[#f6e7b4] [text-shadow:0_1px_1px_rgba(0,0,0,0.9)] [writing-mode:vertical-rl]"
                        aria-hidden="true"
                      >
                        {shown.name}
                      </span>
                    ) : null}
                  </button>
                );
              })}
                </div>
              </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** A bookcase's rows: up to PER_SHELF books each, and a named set (the Atlas Room's Courtyard books) on rows of its own. */
function shelfRows(list: typeof ACHIEVEMENTS) {
  const rows: Array<{ set?: string; books: typeof ACHIEVEMENTS; start: number }> = [];
  let start = 0;
  for (const set of [...new Set(list.map((a) => a.set))]) {
    const books = list.filter((a) => a.set === set);
    for (let k = 0; k < books.length; k += PER_SHELF) {
      rows.push({ set: k === 0 ? set : undefined, books: books.slice(k, k + PER_SHELF), start });
      start += Math.min(PER_SHELF, books.length - k);
    }
  }
  return rows;
}

/** End cards: fragments earned that night (with the breakdown), shelves restored, and a room now in reach. */
export function NightRewards({ hud }: { hud: Hud }) {
  const parts = hud.nightFragments;
  const total = parts.reduce((n, p) => n + p.n, 0);
  const ids = hud.newShelves;
  if (!total && !ids.length) return null;
  const shown = ids.slice(0, 3);
  return (
    <div className="mt-3 rounded-[4px] border border-gold/50 bg-ink/40 px-3 py-2 text-sm">
      {total ? (
        <p className="text-[#f4ead8]" title={parts.map((p) => `${p.label}: +${p.n}`).join(" · ")}>
          <FragmentIcon className="mr-1 h-4" />
          <span className="font-semibold text-gold">+{plural(total, "fragment")}</span>
          <span className="block text-xs text-muted">{parts.map((p) => `${p.label} +${p.n}`).join(" · ")}</span>
        </p>
      ) : null}
      {shown.map((id) => (
        <p key={id} className="text-[#f4ead8]">
          Shelf restored: <span className="font-semibold text-gold">{ACHIEVEMENT[id]?.name ?? id}</span>
        </p>
      ))}
      {ids.length > shown.length ? <p className="text-xs text-muted">+{ids.length - shown.length} more</p> : null}
      {hud.canRestore ? <p className="mt-1 text-gold">You can restore {ROOM[hud.canRestore].name}.</p> : null}
    </div>
  );
}
