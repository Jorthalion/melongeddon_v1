import { Lock } from "lucide-react";
import { BOARDS, DIFFICULTIES, KEEPER_TOWERS, MAP_GOALS, PERK_LEVELS, PICKABLE_MAPS, TOWERS, levelFor, type Difficulty } from "@/game/engine";
import { tone } from "@/game/audio";
import { BookmarkPicker } from "@/components/Bookmarks";
import { LevelBadge, PerkPicker } from "@/components/KeeperLevels";
import { SlipPicker } from "@/components/LateSlips";
import { MapPreview } from "@/components/MapPreview";
import { TowerIcon } from "@/components/TowerIcon";
import { KEEPERS } from "@/components/keeperCards";
import type { GameApi } from "@/components/ui";

/**
 * New night, in two pages. "Who": six faces and the chosen keeper's one line and signature tower.
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

const label = "text-[10px] tracking-[0.22em] text-gold uppercase";
const picked = "bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink";
const idle = "bg-transparent text-parchment";

/** Page one: pick the person. */
function WhoPage({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const hud = api.world.hud;
  const keeper = hud.hero;
  const chosen = KEEPERS.find((k) => k.id === keeper) ?? null;
  const signature = chosen ? KEEPER_TOWERS[chosen.id][0] : null;
  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4 sm:pt-6">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-xs tracking-[0.28em] text-gold uppercase">New night</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:mt-3 sm:text-5xl">Who holds the stacks?</h1>
          <p className="mt-2 max-w-xl text-base text-muted sm:mt-3 sm:text-lg">Pick the person first. The carpet can wait one screen.</p>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3" role="radiogroup" aria-label="Keeper">
            {KEEPERS.map((hero, i) => {
              const on = keeper === hero.id;
              return (
                <button
                  key={hero.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${hero.name}, ${hero.role}`}
                  className={`relative flex flex-col overflow-hidden rounded-lg border text-left transition duration-200 hover:-translate-y-0.5 ${
                    on
                      ? "border-[#c6a15a] shadow-[0_0_20px_rgba(226,59,74,0.32),inset_0_0_22px_rgba(198,161,90,0.2)]"
                      : "border-line/80 hover:border-[#c6a15a]"
                  } bg-[#1c1216]`}
                  onClick={() => {
                    onGesture();
                    tone(hero.toneHz, 0.08, "triangle", 0.04);
                    api.pickKeeper(hero.id);
                  }}
                >
                  <span className="relative block aspect-[4/5] overflow-hidden">
                    {/* Their own colours: the hair and the clothes are the difference. */}
                    <img src={hero.portrait} alt="" className="h-full w-full object-cover object-[center_18%]" />
                    <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(20,12,16,0.85),transparent)]" />
                    <LevelBadge hud={hud} hero={hero.id} />
                    <kbd className="absolute top-1.5 left-1.5 hidden rounded-[4px] border border-b-2 border-line bg-ink/70 px-1 font-sans text-[10px] leading-4 text-muted sm:block">
                      {i + 1}
                    </kbd>
                  </span>
                  <span className={`truncate px-2 py-1.5 text-center font-display text-sm font-semibold ${on ? "text-gold" : ""}`}>{hero.name}</span>
                </button>
              );
            })}
          </div>

          {/* The chosen keeper: who they are, the one thing you'll feel on wave one, and their own tower. */}
          <div className="mt-3 min-h-[8.5rem] rounded-lg border border-line/60 bg-panel/60 px-4 py-3" aria-live="polite">
            {chosen && signature ? (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="font-display text-2xl font-semibold">{chosen.name}</p>
                  <p className="text-xs tracking-[0.16em] text-gold uppercase">{chosen.role}</p>
                </div>
                <p className="mt-1 text-lg leading-snug">{chosen.line}</p>
                <p className="mt-1 text-sm text-muted italic">{chosen.flavor}</p>
                <div className="mt-2.5 flex items-center gap-2.5 border-t border-line/50 pt-2.5">
                  <TowerIcon kind={signature} className="size-9 shrink-0" />
                  <p className="min-w-0 text-sm">
                    <span className="font-semibold text-gold">{TOWERS[signature].name}.</span>{" "}
                    <span className="text-muted">{TOWERS[signature].blurb}</span>
                  </p>
                </div>
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
              <span className="text-[10px] text-muted underline">Change</span>
            </button>
          </div>

          {/* Night */}
          <div className="mt-4 sm:mt-5">
            <p className={label}>Night</p>
            <div className="mt-1.5 grid grid-cols-3 overflow-hidden rounded-lg border border-line/70 sm:max-w-xl" role="radiogroup" aria-label="Night">
              {(
                [
                  ["midnight", "Midnight"],
                  ["overflow", "The Overflow"],
                  ["endless", "Endless"],
                ] as const
              ).map(([id, text]) => {
                const on = hud.night === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`min-h-11 px-2 py-2 text-sm font-semibold ${on ? picked : idle}`}
                    onClick={() => {
                      onGesture();
                      api.chooseNight(id);
                    }}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room, or the Overflow's late slips */}
          {hud.night === "overflow" ? (
            <div className="mt-5">
              <SlipPicker api={api} onGesture={onGesture} />
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
                            ? "cursor-not-allowed border-line/50"
                            : "border-line/70"
                      }`}
                      onClick={() => {
                        if (locked) return;
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
                      <span className="line-clamp-2 block px-3 pb-3 text-xs text-muted sm:line-clamp-none">
                        {locked ? `Locked: ${MAP_GOALS[id]?.goal ?? ""}` : board.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
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
