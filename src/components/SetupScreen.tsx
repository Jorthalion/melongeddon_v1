import { Coins, Heart, Lock, Star } from "lucide-react";
import type { ReactNode } from "react";
import {
  BOARDS,
  DIFFICULTIES,
  KEEPER_TOWERS,
  MAP_GOALS,
  PERK_LEVELS,
  PICKABLE_MAPS,
  TEST_MAPS,
  TOWER_GOALS,
  TOWERS,
  activePerks,
  levelFor,
  roomFor,
  unlockNote,
  type HeroId,
  type Hud,
  type CardFrame,
  type Difficulty,
} from "@/game/engine";
import { FragmentIcon } from "@/components/GrandCatalogue";
import { tone } from "@/game/audio";
import { BookmarkPicker } from "@/components/Bookmarks";
import { LevelBadge, PerkPicker } from "@/components/KeeperLevels";
import { SlipPicker } from "@/components/LateSlips";
import { MapPreview } from "@/components/MapPreview";
import { TowerIcon } from "@/components/TowerIcon";
import { KEEPERS } from "@/components/keeperCards";
import { KEEPER_SHEETS } from "@/game/keeperSheets";
import { type GameApi } from "@/components/ui";
import { UnlockLink, openCatalogue } from "@/components/catalogueLink";

/** Keeper-card frames (Bindery and Restricted Section cosmetics): the card's border when it isn't picked. */
const FRAME: Record<CardFrame, string> = {
  plain: "border-line/80",
  gold: "border-[#c6a15a]/80 shadow-[inset_0_0_0_1px_rgba(230,195,106,0.35)]",
  ink: "border-2 border-[#1d2640] shadow-[inset_0_0_0_1px_rgba(120,150,210,0.35)]",
  archivist: "border-2 border-[#e6c36a] shadow-[0_0_10px_rgba(230,195,106,0.45),inset_0_0_0_2px_rgba(20,12,16,0.8),inset_0_0_0_3px_rgba(230,195,106,0.6)]",
};

/**
 * New night, in two pages. "Who": seven faces and the chosen keeper's one line and every tower only they can build.
 * "The night": night, room (or late slips), difficulty, bookmark, and perks once the keeper has any.
 */
export function SetupScreen({
  api,
  onGesture,
}: {
  api: GameApi;
  onGesture: () => void;
}) {
  const hud = api.world.hud;
  const page = hud.setupPage === "night" && hud.hero ? "night" : "who";
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="absolute inset-0 bg-ink/92 backdrop-blur-[3px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(80,40,28,0.18)_0%,rgba(8,4,6,0.78)_68%)]" />
      {page === "who" ? <WhoPage api={api} onGesture={onGesture} /> : <NightPage api={api} onGesture={onGesture} />}
    </div>
  );
}

const label = "text-[0.625rem] tracking-[0.22em] text-gold uppercase";
const picked = "bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink";
const idle = "bg-transparent text-parchment";

/** Page one: pick the person. */
function WhoPage({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const hud = api.world.hud;
  const keeper = hud.hero;
  const chosen = KEEPERS.find((k) => k.id === keeper) ?? null;
  const towers = chosen ? KEEPER_TOWERS[chosen.id] : [];
  // A locked keeper was tapped (or its number pressed): the engine says which room opens them.
  const lockNote = hud.log.includes("is locked. Restore") ? hud.log : "";
  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4 sm:pt-6">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-xs tracking-[0.28em] text-gold uppercase">New night</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:mt-3 sm:text-5xl">Who holds the stacks?</h1>
          <p className="mt-2 max-w-xl text-base text-muted sm:mt-3 sm:text-lg">Pick the person first. The carpet can wait one screen.</p>

          <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2" role="radiogroup" aria-label="Keeper">
            {KEEPERS.map((hero, i) => {
              const on = keeper === hero.id;
              const locked = hud.lockedKeepers.includes(hero.id);
              const room = locked ? roomFor("keeper", hero.id) : null;
              return (
                <button
                  key={hero.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={locked}
                  aria-label={locked ? `${hero.name}, locked: restore ${room?.name}` : `${hero.name}, ${hero.role}`}
                  className={`relative flex flex-col overflow-hidden rounded-lg border text-left transition duration-200 ${
                    on
                      ? "border-[#c6a15a] shadow-[0_0_20px_rgba(226,59,74,0.32),inset_0_0_22px_rgba(198,161,90,0.2)]"
                      : locked
                        ? "border-line/50"
                        : `${FRAME[hud.cosmetics.frame]} hover:-translate-y-0.5 hover:border-[#c6a15a]`
                  } bg-[#1c1216]`}
                  onClick={() => {
                    onGesture();
                    // A soft, low "locked" tone, and the Grand Catalogue opens at the room that unlocks them.
                    tone(locked ? 140 : hero.toneHz, 0.08, locked ? "sine" : "triangle", locked ? 0.03 : 0.04);
                    api.pickKeeper(hero.id);
                    if (locked && room) openCatalogue({ room: room.id, reward: { kind: "keeper", id: hero.id } });
                  }}
                >
                  <span className="relative block aspect-[4/5] overflow-hidden">
                    {/* Their own colours: the hair and the clothes are the difference. */}
                    <img src={hero.portrait} alt="" className={`h-full w-full object-cover object-[center_18%] ${locked ? "opacity-35 grayscale" : ""}`} />
                    {locked ? <Lock className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-gold" aria-hidden="true" /> : null}
                    <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(20,12,16,0.85),transparent)]" />
                    <LevelBadge hud={hud} hero={hero.id} />
                    <kbd className="absolute top-1.5 left-1.5 hidden rounded-[4px] border border-b-2 border-line bg-ink/70 px-1 font-sans text-[0.625rem] leading-4 text-muted sm:block">
                      {i + 1}
                    </kbd>
                  </span>
                  <span className={`line-clamp-2 px-1 py-1.5 text-center font-display text-sm leading-tight font-semibold tracking-tight sm:text-xs lg:text-[0.8125rem] ${on ? "text-gold" : locked ? "text-muted" : ""}`}>{hero.name}</span>
                  {room ? (
                    <span className="-mt-1 line-clamp-2 px-1 pb-1.5 text-center text-[0.625rem] leading-tight text-gold/90 underline decoration-gold/40 underline-offset-2">
                      Unlock: {room.name}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-sm text-flesh" role="status">
              {lockNote}
            </p>
            {/* Locked keepers point somewhere: the Grand Catalogue, over Setup. */}
            <button type="button" className="text-sm text-gold underline decoration-gold/50 underline-offset-2 hover:decoration-gold" onClick={() => openCatalogue()}>
              <FragmentIcon className="mr-1 h-4" />
              {hud.fragments} fragment{hud.fragments === 1 ? "" : "s"}, Grand Catalogue
            </button>
          </div>

          {/* The chosen keeper: who they are, the one thing you'll feel on wave one, and their own tower. */}
          <div className="mt-3 min-h-[8.5rem] rounded-lg border border-line/60 bg-panel/60 px-4 py-3" aria-live="polite">
            {chosen ? (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="font-display text-2xl font-semibold">{chosen.name}</p>
                  <p className="text-xs tracking-[0.16em] text-gold uppercase">{chosen.role}</p>
                </div>
                <p className="mt-1 text-lg leading-snug">{chosen.line}</p>
                <p className="mt-1 text-sm text-muted italic">{chosen.flavor}</p>
                <KeeperSheet hud={hud} hero={chosen.id} />
                {/* Every tower only this keeper can build: the signature first, then the rest of the Keeper tab. */}
                <p className="mt-2.5 border-t border-line/50 pt-2.5 text-[0.625rem] tracking-[0.22em] text-gold uppercase">
                  {towers.length > 1 ? `${chosen.name}'s towers` : `${chosen.name}'s tower`}
                </p>
                <ul className="mt-1.5 flex flex-col gap-2">
                  {towers.map((kind, i) => {
                    const goal = hud.lockedTowers.includes(kind) ? TOWER_GOALS[kind]?.goal : undefined;
                    return (
                      <li key={kind} className="flex items-start gap-2.5">
                        <span className="relative shrink-0">
                          <TowerIcon kind={kind} className={`size-9 ${goal ? "opacity-50 grayscale" : ""}`} />
                          {goal ? <Lock className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-gold" aria-hidden="true" /> : null}
                        </span>
                        <p className="min-w-0 text-sm">
                          <span className="font-semibold text-gold">{TOWERS[kind].name}</span>
                          <span className="text-muted">
                            {" "}
                            · {TOWERS[kind].cost ? `${TOWERS[kind].cost} seeds` : "Free"}{i === 0 ? " · signature" : ""}. {TOWERS[kind].blurb}
                          </span>
                          {goal ? (
                            <UnlockLink hud={hud} reward={{ kind: "tower", id: kind }} className="mt-0.5" onGesture={onGesture} />
                          ) : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">Tap a face to see what each keeper brings.</p>
            )}
          </div>
        </div>
      </div>
      <Footer
        reason={keeper ? "" : "Pick a keeper."}
        back={() => api.backToTitle()}
        next={{
          text: "Next: the night",
          ready: keeper != null,
          go: () => api.setupPage("night"),
        }}
        onGesture={onGesture}
      />
    </>
  );
}

/** Page two: when, where and how hard. */
function NightPage({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const hud = api.world.hud;
  const keeper = hud.hero!;
  const chosen = KEEPERS.find((k) => k.id === keeper)!;
  const hard = hud.difficulty === "hard" || hud.difficulty === "overdue";
  const hasPerks = levelFor(hud.keepers[keeper].xp) >= PERK_LEVELS[0];
  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4 sm:pt-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs tracking-[0.28em] text-gold uppercase">New night</p>
              <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">The night</h1>
              <p className="mt-1.5 max-w-xl text-base text-muted">
                {hud.night === "overflow"
                  ? "The first night is over. The returns came back."
                  : hud.night === "siege"
                    ? "Night three. No fruit: geese and cats, and they hate each other."
                  : hud.night === "endless"
                    ? `No last wave. Your best: ${hud.endlessBest} wave${hud.endlessBest === 1 ? "" : "s"}.`
                    : "Pick the room. The carpet does not care."}
              </p>
            </div>
            {/* The chosen face, small, in the corner. Tap to change. */}
            <button
              type="button"
              title="Change keeper (Esc)"
              className="flex shrink-0 flex-col items-center gap-1"
              onClick={() => {
                onGesture();
                api.setupPage("who");
              }}
            >
              <img
                src={chosen.portrait}
                alt=""
                className="size-14 rounded-lg border border-[#c6a15a]/70 object-cover object-[center_18%] sm:size-16"
              />
              <span className="text-xs font-semibold text-gold">{chosen.name}</span>
              <span className="text-[0.625rem] text-muted underline">Change</span>
            </button>
          </div>

          {/* Night */}
          <div className="mt-4 sm:mt-5">
            <p className={label}>Night</p>
            <div className="mt-1.5 grid grid-cols-4 overflow-hidden rounded-lg border border-line/70 sm:max-w-xl" role="radiogroup" aria-label="Night">
              {(
                [
                  ["midnight", "Midnight"],
                  ["overflow", "The Overflow"],
                  ["siege", "The Siege"],
                  ["endless", "Endless"],
                ] as const
              ).map(([id, text]) => {
                const on = hud.night === id;
                const locked = id === "siege" && !hud.siegeOpen;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-disabled={locked}
                    title={locked ? "Win the Overflow first." : undefined}
                    className={`min-h-11 px-1.5 py-2 text-sm leading-tight font-semibold ${on ? picked : locked ? "cursor-not-allowed text-muted" : idle}`}
                    onClick={() => {
                      onGesture();
                      api.chooseNight(id);
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {locked ? <Lock className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                      {text}
                    </span>
                  </button>
                );
              })}
            </div>
            {!hud.siegeOpen ? <p className="mt-1 text-xs text-muted">The Siege: win the Overflow first.</p> : null}
          </div>

          {/* Room, or the Overflow's late slips, or the Siege's own courtyard */}
          {hud.night === "overflow" ? (
            <div className="mt-5">
              <SlipPicker api={api} onGesture={onGesture} />
            </div>
          ) : hud.night === "siege" ? (
            <div className="mt-5">
              <p className={label}>Room</p>
              <div className="mt-1.5 flex max-w-xl gap-3 overflow-hidden rounded-lg border border-[#c6a15a] shadow-[0_0_18px_rgba(198,161,90,0.28)]">
                <MapPreview map="courtyard" className="block aspect-[16/10] w-36 shrink-0 sm:w-48" />
                <span className="min-w-0 py-2 pr-3">
                  <span className="block font-display text-base font-semibold">{BOARDS.courtyard.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">{BOARDS.courtyard.blurb}</span>
                </span>
              </div>
            </div>
          ) : (

            <div className="mt-5">
              <p className={label}>Room</p>
              {/* Phones: one row that scrolls sideways. Wider screens: a grid. */}
              <div className="-mx-4 mt-1.5 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {PICKABLE_MAPS.map((id) => {
                  const board = BOARDS[id];
                  const on = hud.map === id;
                  const locked = !hud.maps.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      aria-disabled={locked}
                      title={locked ? `Locked. ${MAP_GOALS[id]?.goal ?? ""}` : board.blurb}
                      className={`w-40 shrink-0 snap-start overflow-hidden rounded-lg border text-left sm:w-auto ${
                        on
                          ? "border-[#c6a15a] shadow-[0_0_18px_rgba(198,161,90,0.28)]"
                          : locked
                            ? "border-line/50 hover:border-[#c6a15a]/70"
                            : "border-line/70"
                      }`}
                      onClick={() => {
                        if (locked) {
                          // Locked: the Catalogue opens at the room that unlocks it.
                          const room = roomFor("map", id);
                          if (room) openCatalogue({ room: room.id, reward: { kind: "map", id } });
                          return;
                        }
                        onGesture();
                        tone(210, 0.05, "triangle", 0.03);
                        api.chooseMap(id);
                      }}
                    >
                      <span className="relative block">
                        <MapPreview map={id} className={`block aspect-[16/10] w-full ${locked ? "opacity-30 grayscale" : ""}`} />
                        {locked ? (
                          <Lock className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className={`block px-3 pt-2 font-display text-base font-semibold ${locked ? "text-muted" : ""}`}>{board.name}</span>
                      <span className="line-clamp-3 block px-3 pb-3 text-xs text-muted sm:line-clamp-none">
                        {locked ? (
                          <>
                            <span className="text-flesh">Locked. {unlockNote("map", id, hud.rooms, hud.fragments)?.text ?? MAP_GOALS[id]?.goal ?? ""}</span>{" "}
                            <span className="font-semibold text-gold underline decoration-gold/50 underline-offset-2">Tap to open the Catalogue.</span>
                          </>
                        ) : (
                          board.blurb
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Developer mode only: test rooms (new versions of rooms) that aren't in the game yet. */}
              {hud.dev ? (
                <>
                  <p className={`${label} mt-4`}>Test rooms (dev only)</p>
                  <div className="-mx-4 mt-1.5 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                    {TEST_MAPS.map((id) => {
                      const board = BOARDS[id];
                      const on = hud.map === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={on}
                          title={board.blurb}
                          className={`w-40 shrink-0 snap-start overflow-hidden rounded-lg border border-dashed text-left sm:w-auto ${
                            on ? "border-[#c6a15a] shadow-[0_0_18px_rgba(198,161,90,0.28)]" : "border-[#6fa8ef]/60"
                          }`}
                          onClick={() => {
                            onGesture();
                            tone(210, 0.05, "triangle", 0.03);
                            api.chooseMap(id);
                          }}
                        >
                          <MapPreview map={id} className="block aspect-[22/14] w-full" />
                          <span className="block px-3 pt-2 font-display text-base font-semibold">{board.name}</span>
                          <span className="line-clamp-3 block px-3 pb-3 text-xs text-muted sm:line-clamp-none">{board.blurb}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Difficulty */}
          <div className="mt-5">
            <p className={label}>Difficulty</p>
            <div className="mt-1.5 grid grid-cols-4 overflow-hidden rounded-lg border border-line/70 sm:max-w-xl" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => {
                const on = hud.difficulty === d.id;
                const menace = on && (d.id === "hard" || d.id === "overdue");
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`min-h-11 px-1 py-2 text-xs font-semibold sm:px-2 sm:text-sm ${menace ? (d.id === "overdue" ? "bg-[#4a0f1a] text-parchment" : "bg-[#6a2430] text-parchment") : on ? picked : idle}`}
                    onClick={() => {
                      onGesture();
                      api.setDifficulty(d.id as Difficulty);
                    }}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
            <p className={`mt-1.5 text-sm ${hard ? "text-flesh" : "text-muted"}`}>
              {hud.difficulty === "hard" ? "Thicker fruit. They do not stroll. They arrive." : DIFFICULTIES.find((d) => d.id === hud.difficulty)?.blurb}
            </p>
          </div>

          {/* Bookmark */}
          <div className="mt-5">
            <BookmarkPicker api={api} onGesture={onGesture} />
          </div>

          {/* Perks: only once this keeper has reached level 2 and has one to choose. */}
          {hasPerks ? (
            <div className="mt-5">
              <PerkPicker api={api} onGesture={onGesture} />
            </div>
          ) : null}
        </div>
      </div>
      <Footer
        reason=""
        back={() => api.setupPage("who")}
        next={{
          text: "Begin",
          ready: true,
          go: () => {
            tone(280, 0.1, "triangle", 0.05);
            api.chooseHero(keeper);
          },
        }}
        onGesture={onGesture}
      />
    </>
  );
}

/** Pinned footer: Back on the left, the main button on the right, and why it's off. */
function Footer({
  reason,
  back,
  next,
  onGesture,
}: {
  reason: string;
  back: () => void;
  next: { text: string; ready: boolean; go: () => void };
  onGesture: () => void;
}) {
  return (
    <div className="relative shrink-0 border-t border-line bg-ink/95 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-5xl">
        {reason ? (
          <p className="mb-2 text-center text-sm text-flesh" role="status">
            {reason}
          </p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            className="min-h-12 shrink-0 rounded-lg border border-line/80 px-5 text-lg text-parchment"
            onClick={() => {
              onGesture();
              back();
            }}
          >
            Back
          </button>
          <button
            type="button"
            disabled={!next.ready}
            className="min-h-12 flex-1 rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink disabled:opacity-40"
            onClick={() => {
              if (!next.ready) return;
              onGesture();
              next.go();
            }}
          >
            {next.text}
            <span className="ml-2 hidden text-xs font-normal opacity-70 sm:inline">Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** How hard each keeper is to play well: a colour, and how many of four pips are lit. */
const DIFFICULTY_LOOK = {
  Easy: { tone: "text-[#7fc98f]", fill: "bg-[#7fc98f]", pips: 1 },
  Medium: { tone: "text-gold", fill: "bg-gold", pips: 2 },
  Advanced: { tone: "text-[#e8a35a]", fill: "bg-[#e8a35a]", pips: 3 },
  Expert: { tone: "text-flesh", fill: "bg-flesh", pips: 4 },
} as const;

/** One stat on the keeper sheet: an icon or meter, the value, and a small label under it. */
function SheetStat({ icon, value, label, title }: { icon: ReactNode; value: ReactNode; label: string; title?: string }) {
  return (
    <div title={title} className="flex min-w-0 items-center gap-2 rounded-lg border border-line/60 bg-[#140e12]/70 px-2.5 py-1.5">
      <span className="grid size-5 shrink-0 place-items-center" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-parchment">{value}</span>
        <span className="block text-[0.625rem] tracking-[0.14em] text-muted uppercase">{label}</span>
      </span>
    </div>
  );
}

/** The keeper sheet: what they start with, how forgiving they are, how they play, who they suit, and their perks. */
function KeeperSheet({ hud, hero }: { hud: Hud; hero: HeroId }) {
  const sheet = KEEPER_SHEETS[hero];
  const rec = hud.keepers[hero];
  const level = levelFor(rec.xp);
  const perks = activePerks(hero, rec);
  const next = PERK_LEVELS.find((at) => at > level);
  const diff = DIFFICULTY_LOOK[sheet.difficulty];
  return (
    <div className="mt-2.5 border-t border-line/50 pt-2.5">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <SheetStat
          icon={<Heart className="size-4 text-flesh" />}
          value={sheet.stacks}
          label="Stacks"
          title="Stacks: your lives. A fruit that reaches the door costs one."
        />
        <SheetStat icon={<Coins className="size-4 text-gold" />} value={sheet.seeds} label="Seeds" title="Seeds to build with at the start of the night." />
        <SheetStat
          icon={
            <span className="flex h-3.5 items-end gap-[2px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`w-[3px] rounded-sm ${i < diff.pips ? diff.fill : "bg-line"}`} style={{ height: `${6 + i * 2.5}px` }} />
              ))}
            </span>
          }
          value={<span className={diff.tone}>{sheet.difficulty}</span>}
          label="Difficulty"
          title="How hard this keeper is to play well: Easy, Medium, Advanced or Expert."
        />
        <SheetStat icon={<Star className="size-4 text-gold" />} value={`Level ${level}`} label="Keeper" title="This keeper's level. New perks open as it rises." />
      </div>
      <p className="mt-2.5 text-[0.625rem] tracking-[0.22em] text-gold uppercase">How they play</p>
      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-sm leading-snug marker:text-gold/70">
        {sheet.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-1.5 text-sm text-muted">
        <span className="font-semibold text-parchment">Good for:</span> {sheet.suits}
      </p>
      <p className="mt-1.5 text-sm text-muted">
        <span className="font-semibold text-parchment">Perks:</span>{" "}
        {perks.length ? perks.map((p) => p.name).join(", ") : "none yet"}
        {next ? ` · the next opens at level ${next}` : " · all five open"}
        {perks.length ? " (choose them on the next page)" : ""}
      </p>
    </div>
  );
}
