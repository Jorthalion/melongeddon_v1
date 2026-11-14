import { Coins, Crosshair, Heart, Lock } from "lucide-react";
import { BOARDS, DIFFICULTIES, KEEPER_TOWERS, MAP_GOALS, PICKABLE_MAPS, TOWERS, type Difficulty } from "@/game/engine";
import { tone } from "@/game/audio";
import { BookmarkPicker } from "@/components/Bookmarks";
import { LevelBadge, PerkPicker } from "@/components/KeeperLevels";
import { SlipPicker } from "@/components/LateSlips";
import { MapPreview } from "@/components/MapPreview";
import { KEEPERS } from "@/components/keeperCards";
import type { GameApi } from "@/components/ui";

/** New night: night, room (or late slips), keeper, perks, difficulty and bookmark, then Begin. */
export function SetupScreen({
  api,
  onGesture,
}: {
  api: GameApi;
  onGesture: () => void;
}) {
  const hud = api.world.hud;
  const keeper = hud.hero;
  const chosen = KEEPERS.find((k) => k.id === keeper) ?? null;
  const hard = hud.difficulty === "hard" || hud.difficulty === "overdue";
  const ready = keeper != null;
  const reason = !keeper ? "Pick a keeper." : "";
  const picked = "bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink";
  const idle = "bg-transparent text-parchment";
  const label = "text-[10px] tracking-[0.22em] text-gold uppercase";

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="absolute inset-0 bg-ink/92 backdrop-blur-[3px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(80,40,28,0.18)_0%,rgba(8,4,6,0.78)_68%)]" />

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4 sm:pt-6">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-xs tracking-[0.28em] text-gold uppercase">New night</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:mt-3 sm:text-5xl">Who holds the stacks?</h1>
          <p className="mt-2 max-w-xl text-base sm:mt-4 sm:text-lg">
            {hud.night === "overflow"
              ? "The first night is over. The returns came back."
              : hud.night === "endless"
                ? `No last wave. Your best: ${hud.endlessBest} wave${hud.endlessBest === 1 ? "" : "s"}.`
                : "Pick the room. Pick the keeper. The carpet does not care."}
          </p>
          <p className="mt-1 hidden max-w-xl text-sm text-muted sm:block">
            {hud.night === "overflow"
              ? "Take late slips if you want more XP. Then name who goes downstairs."
              : "The first cannon is the only one that comes free."}
          </p>

          {/* 1. Night */}
          <div className="mt-4 sm:mt-6">
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

          {/* 2. Room, or the Overflow's late slips */}
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

          {/* 3. Keeper. Phones get three portraits and the chosen keeper's details underneath. */}
          <div className="mt-5">
            <p className={label}>Keeper</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2 md:gap-4" role="radiogroup" aria-label="Keeper">
              {KEEPERS.map((hero) => {
                const on = keeper === hero.id;
                return (
                  <button
                    key={hero.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${hero.name}, ${hero.role}`}
                    className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition duration-200 hover:-translate-y-1 md:min-h-[26rem] ${
                      on
                        ? "border-[#c6a15a] shadow-[0_0_22px_rgba(226,59,74,0.35),inset_0_0_28px_rgba(198,161,90,0.22)]"
                        : "border-line/80 hover:border-[#c6a15a]"
                    } bg-[linear-gradient(165deg,#3a242c_0%,#241418_48%,#161014_100%)]`}
                    onClick={() => {
                      onGesture();
                      tone(hero.toneHz, 0.08, "triangle", 0.04);
                      api.pickKeeper(hero.id);
                    }}
                  >
                    <span className="pointer-events-none absolute top-2 left-2 hidden size-3 border-t border-l border-[#c6a15a] md:block" />
                    <span className="pointer-events-none absolute top-2 right-2 hidden size-3 border-t border-r border-[#c6a15a] md:block" />
                    <span className="pointer-events-none absolute bottom-2 left-2 hidden size-3 border-b border-l border-[#c6a15a] md:block" />
                    <span className="pointer-events-none absolute right-2 bottom-2 hidden size-3 border-r border-b border-[#c6a15a] md:block" />
                    <span className="relative h-28 overflow-hidden sm:h-40 md:h-[58%] md:min-h-48">
                      <img
                        src={hero.portrait}
                        alt=""
                        className="h-full w-full object-cover object-[center_18%]"
                        style={{ filter: hero.filter }}
                      />
                      <span className="absolute inset-0 bg-[linear-gradient(to_top,#241418_0%,rgba(36,20,24,0.15)_42%,rgba(90,40,28,0.18)_100%)]" />
                      <span className="absolute inset-0 shadow-[inset_0_0_24px_rgba(20,8,10,0.55)]" />
                      <LevelBadge hud={hud} hero={hero.id} />
                    </span>
                    <span className={`truncate px-2 py-1.5 text-center font-display text-sm font-semibold md:hidden ${on ? "text-gold" : ""}`}>
                      {hero.name}
                    </span>
                    <span className="hidden flex-1 flex-col px-4 pt-3 pb-4 md:flex">
                      <span className="font-display text-2xl font-semibold">{hero.name}</span>
                      <span className="text-xs tracking-[0.16em] text-gold uppercase">{hero.role}</span>
                      <span className="mt-2 text-sm text-muted">{hero.flavor}</span>
                      <span className="mt-auto pt-3">
                        <KeeperTraits traits={hero.traits} />
                        <span className="mt-1.5 block text-xs text-gold">
                          {KEEPER_TOWERS[hero.id].length > 1 ? "Towers" : "Tower"}: {KEEPER_TOWERS[hero.id].map((k) => TOWERS[k].name).join(", ")}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 rounded-lg border border-line/60 bg-panel/60 px-3 py-2 md:hidden" aria-live="polite">
              {chosen ? (
                <>
                  <p className="text-xs tracking-[0.16em] text-gold uppercase">{chosen.role}</p>
                  <p className="mt-0.5 text-sm text-muted">{chosen.flavor}</p>
                  <div className="mt-1">
                    <KeeperTraits traits={chosen.traits} />
                  </div>
                  {KEEPER_TOWERS[chosen.id].map((k) => (
                    <p key={k} className="mt-1 text-xs text-gold">
                      {TOWERS[k].name}. {TOWERS[k].blurb}
                    </p>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted">Tap a portrait to see what each keeper brings.</p>
              )}
            </div>
          </div>

          {/* 3b. The chosen keeper's level and perks */}
          <div className="mt-5">
            <PerkPicker api={api} onGesture={onGesture} />
          </div>

          {/* 4. Difficulty */}
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

          {/* 5. Bookmark */}
          <div className="mt-5">
            <BookmarkPicker api={api} onGesture={onGesture} />
          </div>
        </div>
      </div>

      {/* Pinned footer: Back on the left, Begin on the right, and why Begin is off. */}
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
                api.backToTitle();
              }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={!ready}
              className="min-h-12 flex-1 rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink disabled:opacity-40"
              onClick={() => {
                if (!keeper) return;
                onGesture();
                tone(280, 0.1, "triangle", 0.05);
                api.chooseHero(keeper);
              }}
            >
              Begin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeeperTraits({ traits }: { traits: Array<{ icon: "coins" | "aim" | "heart"; text: string }> }) {
  return (
    <>
      {traits.map((trait) => (
        <span key={trait.text} className="mt-1 flex items-center gap-2 text-sm">
          {trait.icon === "heart" ? (
            <Heart className="size-3.5 shrink-0 text-flesh" aria-hidden="true" />
          ) : trait.icon === "coins" ? (
            <Coins className="size-3.5 shrink-0 text-gold" aria-hidden="true" />
          ) : (
            <Crosshair className="size-3.5 shrink-0 text-gold" aria-hidden="true" />
          )}
          {trait.text}
        </span>
      ))}
    </>
  );
}
