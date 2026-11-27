import { Check, ChevronDown, Crosshair, BookOpen, Coins, Gavel, Heart, IdCard, Lock, Menu, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import {
  BOARDS,
  CANNON,
  CELL,
  GUIDE_HOLDS,
  KEEPER_NAMES,
  fittingName,
  PASSIVE,
  HEAVY_SEEDS,
  HEAVY_WAVE,
  VAEL_LADDER,
  VAEL_VALUES,
  vaelLockLine,
  fittingsFor,
  TRICK_LEVEL,
  TOWER_GOALS,
  TOWERS,
  TOWER_TYPE,
  TYPE_INFO,
  TARGET_LABEL,
  TARGET_HINT,
  buildCost,
  boardLegs,
  groupOf,
  tabKinds,
  legsTouching,
  groupsFor,
  refundFor,
  roomFor,
  towerReadout,
  type PreviewStats,
  type TowerKind,
  type World,
  COPY_STEP_KINDS,
  COPY_HEAVY_KINDS,
  DRAGON,
  DOCTOR,
  GLOBAL_RANGE,
  ROOST_STAGES,
  theName,
} from "@/game/engine";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { tone } from "@/game/audio";
import { TowerIcon } from "@/components/TowerIcon";
import { checkoutCount } from "@/components/CheckoutCard";
import { openCatalogue } from "@/components/catalogueLink";
import type { GameApi } from "@/components/ui";
import { asset } from "@/lib/asset";

/** Quackarot powered up, shown in the GOLDEN badge while Over Nine Thousand Quacks lasts. */
const GOLDEN_PORTRAIT = asset("sprites/portrait-quack-golden.webp");

/** Top bar: name (or keeper and room), seeds, stacks, absurdity, speed, pause, menu and sound. */
export function GameHeader({
  api,
  inRun,
  showPlace,
  menuable,
  muted,
  onMute,
  onGesture,
  wide = false,
}: {
  api: GameApi;
  inRun: boolean;
  showPlace: boolean;
  menuable: boolean;
  muted: boolean;
  onMute: () => void;
  onGesture: () => void;
  /** The wide layout: a roomier bar with a larger seeds and stacks readout. */
  wide?: boolean;
}) {
  const hud = api.world.hud;
  const phase = hud.phase;
  const gesture = onGesture;
  const toggleMute = onMute;
  return (
    <header data-board-controls className={`flex items-center justify-between gap-2 border-b border-line px-2 py-2 touch:py-1 sm:gap-3 sm:px-4 sm:py-3 ${wide ? "sm:px-6" : ""}`}>
      <div className={`flex min-w-0 items-center gap-2 ${inRun ? "max-lg:hidden" : ""}`}>
        {/* During a night the title needs the room the controls use, so it comes back only on wide screens. */}
        <BookOpen className={`size-5 shrink-0 text-gold ${inRun ? "hidden lg:block" : ""}`} aria-hidden="true" />
        <div className={`min-w-0 ${inRun ? "hidden lg:block" : ""}`}>
          <p className="font-display text-lg leading-none font-semibold">Melongeddon</p>
          <p className="text-[0.8125rem] text-muted">
            {phase === "coldopen"
              ? "Tonight only"
              : !inRun
                ? "Midnight Library"
                : hud.hero
                  ? <span className={hud.golden > 0 ? "font-semibold text-[#ffd65a] [text-shadow:0_0_8px_rgba(255,214,90,0.8)]" : ""}>{KEEPER_NAMES[hud.hero].name}</span>
                  : "Midnight Library"}
            {inRun ? ` · ${BOARDS[hud.map].name}${hud.night === "endless" ? " · Endless" : ""}` : ""}
          </p>
        </div>
        {hud.dev ? (
          <span
            className={`rounded border border-[#6fc6ef]/70 px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.18em] text-[#6fc6ef] ${inRun ? "hidden lg:inline" : ""}`}
            title="Developer mode: everything unlocked, nothing saved to your progress"
          >
            DEV
          </span>
        ) : null}
      </div>
      <div className={`flex min-w-0 items-center justify-end gap-1 text-sm touch:gap-2 sm:gap-2 ${wide ? "sm:gap-4" : ""}`}>
        {inRun ? (
          <>
            <span className="flex shrink-0 items-center gap-1.5 max-[399px]:gap-0.5">
              <Coins className={`text-gold max-[399px]:size-3.5 ${wide ? "size-6" : "size-5"}`} aria-hidden="true" />
              <span className={`font-display leading-none font-semibold ${wide ? "text-2xl" : "text-lg"}`}>{hud.seeds}</span>
            </span>
            {/* Keeper readouts (Power, Hoard, Sisu…) wrap under the stacks on narrow screens instead of pushing the buttons off. */}
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0 max-[399px]:ml-1">
              <span className="flex shrink-0 items-center gap-1.5 max-[399px]:gap-0.5">
                <Heart className={`text-flesh max-[399px]:size-3.5 ${wide ? "size-6" : "size-5"}`} aria-hidden="true" />
                <span className={`font-display leading-none font-semibold ${wide ? "text-2xl" : "text-lg"}`}>
                  {hud.lives}/{hud.maxLives}
                </span>
              </span>
              {hud.golden > 0 ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-[#ffd65a] bg-[#ffd65a]/15 py-px pr-1.5 pl-px text-[0.75rem] font-bold whitespace-nowrap text-[#ffd65a] shadow-[0_0_10px_rgba(255,214,90,0.6)]"
                  title={`Quackarot is golden: every tower fires ${Math.round((CANNON.overQuackHaste - 1) * 100)}% faster`}
                >
                  <img src={GOLDEN_PORTRAIT} alt="" className="h-5 w-5 rounded-full object-cover object-[center_25%]" />
                  GOLDEN {Math.ceil(hud.golden)}s
                </span>
              ) : null}
              {hud.sisu > 0 ? (
                <span className="text-[0.8125rem] font-semibold whitespace-nowrap text-[#8fbcf2]" title="Sisu: Asser's towers hit harder for every stack he is missing">
                  Sisu +{hud.sisu}%
                </span>
              ) : null}
              {hud.hero === "quack" && CANNON.quackKiNeed > 0 ? (
                <span
                  className={`text-[0.8125rem] font-semibold whitespace-nowrap ${hud.ki >= CANNON.quackKiNeed ? "text-[#ffd65a] [text-shadow:0_0_8px_rgba(255,214,90,0.8)]" : "text-[#f3ce78]"}`}
                  title={`Power level: every kill while a Quack-Liber stands fills it. Full at ${CANNON.quackKiNeed}: the next ki blast hits everything around the turret for ${Math.round(CANNON.quackKiShare * 100)}% of its health`}
                >
                  Power {hud.ki}/{CANNON.quackKiNeed}
                </span>
              ) : null}
              {hud.hero === "michael" ? (
                <span
                  className="text-[0.8125rem] font-semibold whitespace-nowrap text-[#8fc0ff]"
                  title="The Dragon's Hoard: part of what he spends on ordinary towers is saved here, and pays first for the Dragon Gate, the Roost, feeding it and Great towers"
                >
                  Hoard {Math.floor(hud.hoard)}
                </span>
              ) : null}
              {hud.hero === "michael" && hud.zone > 0 ? (
                <span
                  className="text-[0.8125rem] font-semibold whitespace-nowrap text-[#a9d0ff]"
                  title="In the Zone: every wave with no stack lost adds damage to his Great towers, Gate and Roost. A lost stack resets it."
                >
                  Zone +{Math.round(hud.zone * 100)}%
                </span>
              ) : null}
            </span>
            {menuable ? <CheckoutButton api={api} onGesture={gesture} /> : null}
            {hud.night === "overflow" ? (
              <span
                className="hidden text-[0.8125rem] whitespace-nowrap text-muted md:inline"
                title="Absurdity: rises with every fruit popped tonight. In the Overflow's last two waves, every 25 Absurdity sends one more shelled melon up the chute."
              >
                Absurdity {hud.absurdity}
              </span>
            ) : null}
            <div className="flex shrink-0 items-center gap-1 max-[399px]:gap-0.5 touch:gap-2 touch:max-[359px]:gap-1.5">
              {showPlace ? (
              <>
              <button
                type="button"
                aria-label="Slow down"
                disabled={hud.speed <= 0.5}
                className="touch:hidden grid size-7 min-[400px]:size-8 md:size-11 place-items-center rounded-lg border border-line/70 text-lg disabled:opacity-40"
                onClick={() => {
                  gesture();
                  api.nudgeSpeed(-1);
                }}
              >
                −
              </button>
              <button
                type="button"
                aria-label={hud.paused ? "Resume" : "Pause"}
                className="touch-hit grid size-7 min-[400px]:size-8 touch:size-10 touch:max-[359px]:size-9 md:size-11 place-items-center rounded-lg border border-line/70"
                onClick={() => {
                  gesture();
                  api.togglePause();
                }}
              >
                {hud.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              {hud.hero === "elf" ? <ObjectionButton api={api} onGesture={gesture} /> : null}
              <button
                type="button"
                aria-label="Speed up"
                disabled={hud.speed >= 3}
                className="touch:hidden grid size-7 min-[400px]:size-8 md:size-11 place-items-center rounded-lg border border-line/70 text-lg disabled:opacity-40"
                onClick={() => {
                  gesture();
                  api.nudgeSpeed(1);
                }}
              >
                +
              </button>
              {/* Touch: one button steps the speed round (½× → 1× → 2× → 3× → ½×), away from Pause. */}
              <button
                type="button"
                aria-label={`Game speed ${hud.speed}×, tap to change`}
                className="touch-hit hidden size-10 max-[359px]:size-9 place-items-center rounded-lg border border-line/70 text-[0.8125rem] font-semibold touch:grid"
                onClick={() => {
                  gesture();
                  if (hud.speed >= 3) {
                    for (let i = 0; i < 4 && api.world.hud.speed > 0.5; i++) api.nudgeSpeed(-1);
                  } else api.nudgeSpeed(1);
                }}
              >
                {hud.speed === 0.5 ? "½×" : `${hud.speed}×`}
              </button>
              <span className="hidden w-8 text-center text-[0.8125rem] text-muted md:inline touch:hidden">{hud.paused ? "||" : `${hud.speed}×`}</span>
              </>
              ) : null}
              {menuable ? (
                <button
                  type="button"
                  aria-label="Menu"
                  aria-haspopup="dialog"
                  title="Menu (Esc)"
                  className="touch-hit grid size-7 min-[400px]:size-8 touch:ml-2 touch:max-[359px]:ml-1 touch:size-10 touch:max-[359px]:size-9 md:size-11 place-items-center rounded-lg border border-line/70"
                  onClick={() => {
                    gesture();
                    api.openMenu();
                  }}
                >
                  <Menu className="size-4" />
                </button>
              ) : null}
            </div>
          </>
        ) : phase === "select" ? (
          <span className="text-sm text-muted">New night</span>
        ) : null}
        <button
          type="button"
          className={`touch-hit grid size-7 min-[400px]:size-8 shrink-0 touch:size-10 touch:max-[359px]:size-9 md:size-11 place-items-center rounded-xl border border-line bg-panel ${inRun ? "touch:hidden" : ""}`}
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          title="Sound (M)"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </header>
  );
}

/** The checkout card's button: a library card with the number of things checked out tonight. */
function CheckoutButton({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const n = checkoutCount(api);
  return (
    <button
      type="button"
      aria-label={`Checkout card, ${n} item${n === 1 ? "" : "s"}`}
      aria-haspopup="dialog"
      title="Checkout card (C)"
      className="touch-hit relative grid size-7 min-[400px]:size-8 shrink-0 touch:size-10 touch:max-[359px]:size-9 place-items-center rounded-lg border border-line/70 hover:border-[#c6a15a] md:size-11"
      onClick={() => {
        onGesture();
        api.openCheckout();
      }}
    >
      <IdCard className="size-4 text-[#f3e2c4]" aria-hidden="true" />
      {n ? (
        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.8125rem] leading-none font-bold text-ink" aria-hidden="true">
          {n}
        </span>
      ) : null}
    </button>
  );
}

/** Bottom bar while building or fighting: start button or wave progress, build tabs, build bar or inspector, log. */
export function BuildFooter({
  api,
  onGesture,
  column = false,
  backRoom = null,
  tools = null,
}: {
  /** Touch: the board's zoom button, at the end of the tab row. */
  tools?: ReactNode;
  api: GameApi;
  onGesture: () => void;
  column?: boolean;
  /** Phones: the back room button, at the end of the tab row (off the board). */
  backRoom?: ReactNode;
}) {
  const hud = api.world.hud;
  const phase = hud.phase;
  const gesture = onGesture;
  const selected = hud.selected == null ? null : (api.world.towers.find((t) => t.id === hud.selected) ?? null);
  /** The guide holds the wave until its current step is done (pressing it says why). */
  const held = hud.guide != null && GUIDE_HOLDS.includes(hud.guide);
  return (
    <footer
      data-board-controls
      className={
        column
          ? "flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto border-r border-line px-3 py-3"
          : "flex shrink-0 flex-col gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3"
      }
    >
      {/* Side column: Start wave (and the Back room) stay pinned at the top while the column scrolls. */}
      <div className={column && backRoom ? "sticky top-0 z-10 -mt-3 flex shrink-0 items-stretch gap-2 bg-ink pt-3" : backRoom ? "flex shrink-0 items-stretch gap-2" : "contents"}>
      {phase === "combat" ? (
        <div className={`flex min-h-12 shrink-0 flex-col justify-center ${backRoom ? "min-w-0 flex-1" : ""}`}>
          <div className={`flex items-baseline justify-between gap-3 ${column ? "flex-wrap gap-y-0.5" : ""}`}>
            {/* The wave count stays on one line; on a phone the wave's name gives way first. */}
            <p className="shrink-0 font-display text-lg leading-none font-semibold whitespace-nowrap">
              {hud.waveCount ? `Wave ${Math.min(hud.wave, hud.waveCount)}/${hud.waveCount}` : `Wave ${hud.wave}`}
            </p>
            <p className="min-w-0 flex-1 truncate text-center text-sm text-muted">{hud.waveName}</p>
            <p className="shrink-0 text-sm">{hud.left} remaining</p>
            {hud.map === "basement" ? <WaterGauge level={hud.water} plugged={hud.plugged} /> : null}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-panel-2">
            <div
              className="h-full bg-[#c6a15a]"
              style={{ width: `${hud.waveSize ? Math.min(100, ((hud.waveSize - hud.left) / hud.waveSize) * 100) : 0}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-disabled={held}
          title="Space: start the wave (works any time between waves)"
          className={`min-h-12 w-full shrink-0 rounded-lg ${backRoom ? "min-w-0 flex-1" : ""} bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink ${held ? "opacity-45" : ""}`}
          onClick={() => {
            gesture();
            if (!held) tone(320, 0.08, "triangle", 0.04);
            api.startWave();
          }}
        >
          {hud.night !== "endless" && hud.waveCount && hud.wave === hud.waveCount ? "Start the last wave" : `Start wave ${hud.wave}`}
          <span data-keycap className="ml-2 hidden text-[0.8125rem] font-normal opacity-70 sm:inline">Space</span>
        </button>
      )}
      {backRoom}
      </div>
      <div className={`flex items-center gap-2 ${column ? "shrink-0 flex-wrap" : "h-7 touch:h-11"}`}>
        {/* Narrow phones: the tabs tighten, and on the very narrowest the row scrolls on its own (never the page). */}
        <div className={`flex gap-1 ${column ? "flex-wrap" : "min-w-0 overflow-x-auto touch:pr-6 touch:[mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]"}`} role="tablist" aria-label="Cannon type">
          {groupsFor(hud.hero).map((g) => {
            const on = groupOf(hud.build).id === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={on}
                title={`${g.name} (${g.key.toUpperCase()})`}
                className={`h-7 touch:h-11 touch:min-w-11 shrink-0 rounded-md px-1.5 text-[0.8125rem] font-semibold min-[400px]:px-2 sm:px-2.5 ${on ? "bg-[#3a242c] text-gold ring-1 ring-[#c6a15a]" : "text-muted"}`}
                onClick={() => {
                  gesture();
                  api.dismissSelection();
                  if (!on) api.chooseBuild(g.kinds[0]);
                }}
              >
                {g.name}
                <span data-keycap className="ml-1 hidden opacity-60 sm:inline">{g.key.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        {tools ? <div className="ml-auto shrink-0">{tools}</div> : null}
      </div>
      {/* Touch: a waiting Dig find shows in the build bar, not only inside the Dig's own panel (a 6 px "!" on a phone). */}
      {!selected && phase === "prep" && hud.digFinds > 0 && api.world.towers.some((t) => t.kind === "dig") ? (
        <div className="hidden shrink-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[#e6c36a]/60 bg-[#e6c36a]/10 px-2 py-1 touch:flex">
          <span className="text-[0.8125rem] font-semibold text-gold">Dig find ready{hud.digFinds > 1 ? ` (${hud.digFinds})` : ""}:</span>
          <DigButtons api={api} onGesture={gesture} />
        </div>
      ) : null}
      {selected ? (
        <TowerInspector
          api={api}
          onGesture={gesture}
          phase={phase}
          column={column}
        />
      ) : (
        <div className={column ? "flex shrink-0 flex-col gap-1.5" : `grid h-[5.5rem] ${tabKinds(groupOf(hud.build), hud.map).length > 5 || (groupOf(hud.build).id === "keeper" && tabKinds(groupOf(hud.build), hud.map).length >= 4) ? "grid-cols-6" : "grid-cols-5"} gap-2 max-[359px]:gap-1`}>
          {tabKinds(groupOf(hud.build), hud.map).map((id, slot) => {
            const placed = api.world.towers.length;
            const cost = Math.max(0, buildCost(hud.hero, placed, id, hud.builtKinds) - (hud.bookmark === "discount" ? 5 : 0));
            const on = hud.build === id;
            const built = groupOf(id).id === "keeper" && api.world.towers.some((t) => t.kind === id);
            // The Anti-Geese Protocol went off this wave: it comes back when the wave is over.
            const spent = id === "geese" && hud.geeseSpent;
            // The Copycat goes down once a wave: sold this wave, it waits for the next.
            const waits = id === "copycat" && hud.copycatPlaced && !built;
            // Trick cannons open with the keeper's level (as it was when this night started).
            const needs = TRICK_LEVEL[id] ?? 0;
            // Keeper towers with an unlock goal (the Reserve Desk) stay locked until it's met.
            const goal = hud.lockedTowers.includes(id) ? TOWER_GOALS[id]?.goal : undefined;
            // Heavy cannons wait for wave 6, or 200 seeds in hand tonight.
            const heavyWait = groupOf(id).id === "heavy" && !hud.heavyOpen;
            // Vaelithra's ladder: her later towers open tonight as she fully upgrades towers.
            const step = hud.hero === "vael" ? VAEL_LADDER.indexOf(id) : -1;
            const vaelWait = step >= 0 && step >= hud.vaelOpen;
            const locked = needs > hud.runLevel || goal != null || heavyWait || vaelWait;
            // The numbers it will really have once built: fittings, perks, the room (api.previewStats).
            const read = api.previewStats(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                title={
                  goal
                    ? `${TOWERS[id].name}: locked. ${goal} ${TOWERS[id].blurb}`
                    : vaelWait
                    ? `${vaelLockLine(id, hud.fullyUpgraded)} ${TOWERS[id].blurb}`
                    : heavyWait
                    ? `${TOWERS[id].name}: opens at wave ${HEAVY_WAVE}, or once you have ${HEAVY_SEEDS} seeds in hand. ${TOWERS[id].blurb}`
                    : locked
                    ? `${TOWERS[id].name}: opens at keeper level ${needs}. ${TOWERS[id].blurb}`
                    : `${TOWERS[id].name} (${slot + 1}) · ${TYPE_INFO[TOWER_TYPE[id]].name}: ${TOWERS[id].blurb}\n${describeStats(id, read)}${whyText(read)}`
                }
                className={`relative min-w-0 rounded-lg border ${column ? "flex items-center gap-2.5 px-2 py-1.5 text-left" : "h-full px-1 py-1.5 text-center max-[359px]:px-0.5"} ${on ? "border-[#c6a15a] bg-[#3a242c]" : "border-line/70 bg-panel"} ${hud.seeds < cost || built || spent || waits || locked ? "opacity-55" : ""}`}
                onClick={() => {
                  gesture();
                  // Locked by a Grand Catalogue room: open the Catalogue there instead.
                  const room = goal ? roomFor("tower", id) : null;
                  if (room && !hud.rooms.includes(room.id)) {
                    openCatalogue({ room: room.id, reward: { kind: "tower", id } });
                    return;
                  }
                  api.chooseBuild(id);
                }}
              >
                <span data-keycap className={`absolute text-[0.6875rem] text-muted ${column ? "top-0.5 right-1.5" : "top-1 left-1.5 hidden sm:block"}`}>{slot + 1}</span>
                <span className={`relative block ${column ? "size-10 shrink-0" : ""}`}>
                  <TowerIcon kind={id} className={`mx-auto block ${column ? "h-10 w-10" : "h-7 w-full"} ${locked ? "grayscale" : ""}`} />
                  {locked ? <Lock className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-gold" aria-hidden="true" /> : null}
                </span>
                <span className={column ? "block min-w-0 flex-1" : "contents"}>
                <span className={`block truncate leading-tight font-semibold ${column ? "text-sm" : "mt-0.5 text-[0.8125rem] max-[359px]:text-xs max-[359px]:tracking-tight"}`}>{column ? TOWERS[id].name : SHORT_NAME[id]}</span>
                <span className={`block truncate leading-tight text-parchment ${column ? "text-[0.8125rem]" : "text-[0.8125rem] max-[359px]:text-xs max-[359px]:tracking-tight"}`}><CardStat kind={id} read={read} /></span>
                <span className={`block truncate leading-tight text-muted ${column ? "text-[0.8125rem]" : "text-[0.8125rem] max-[359px]:text-xs"}`}>
                  {goal ? "Locked" : vaelWait ? `${hud.fullyUpgraded}/${VAEL_VALUES.unlocks[step]} upgraded` : heavyWait ? `Wave ${HEAVY_WAVE}` : locked ? `Level ${needs}` : built ? "Built" : spent ? "Spent" : waits ? "Next wave" : cost === 0 ? "Free" : cost}
                  <span className="hidden sm:inline"> · {TOWERS[id].role}</span>
                </span>
                </span>
              </button>
            );
          })}
          {/* The keeper box takes the rest of the row: four keeper towers (Vaelithra, Quackarot) share six columns with it. */}
          {groupOf(hud.build).id === "keeper" ? (
            <div
              className={`${column ? "" : ["col-span-4", "col-span-3", "col-span-2", "col-span-2"][Math.min(4, Math.max(1, tabKinds(groupOf(hud.build), hud.map).length)) - 1]} flex min-w-0 flex-col justify-center rounded-lg border border-line/50 px-3 py-1.5`}
            >
              <p className="truncate font-display text-sm font-semibold text-gold">{TOWERS[hud.build].name}</p>
              <BuildLine api={api} kind={hud.build} />
              <p className="line-clamp-2 text-[0.8125rem] text-muted">
                {hud.lockedTowers.includes(hud.build)
                  ? `Locked: ${TOWER_GOALS[hud.build]?.goal}`
                  : hud.hero === "vael" && VAEL_LADDER.indexOf(hud.build) >= hud.vaelOpen
                  ? vaelLockLine(hud.build, hud.fullyUpgraded)
                  : TOWER_LINE[hud.build]
                    ? `${TOWER_LINE[hud.build]} One at a time.`
                    : `${TOWERS[hud.build].blurb} One at a time.`}
              </p>
            </div>
          ) : null}
        </div>
      )}
      {/* Short touch screens (an iPhone SE): one line of log, so the board keeps its height. */}
      <p className={column ? "mt-auto shrink-0 text-[0.8125rem] text-muted" : "line-clamp-2 h-8 text-[0.8125rem] text-muted [@media(pointer:coarse)_and_(max-height:700px)]:line-clamp-1 [@media(pointer:coarse)_and_(max-height:700px)]:h-4"}>{hud.log}</p>
    </footer>
  );
}

/** Build-bar labels (the full names are too long for five across on a phone). */
const SHORT_NAME: Record<TowerKind, string> = {
  melon: "Melon",
  mortar: "Mortar",
  still: "Still",
  fire: "Fire",
  freeze: "Freeze",
  spitter: "Spitter",
  ballista: "Ballista",
  reader: "Reader",
  bell: "Bell",
  hive: "Hive",
  lantern: "Lamp",
  ink: "Ink Well",
  compost: "Compost",
  peeler: "Peeler",
  bookworm: "Bookworm",
  boomerang: "Boomerang",
  orrery: "Orrery",
  plane: "Plane",
  quill: "Quill",
  globe: "Globe",
  press: "Press",
  organ: "Organ",
  scope: "Telescope",
  catalogue: "Catalogue",
  desk: "Desk",
  cauldron: "Cauldron",
  flask: "Flask",
  trebuchet: "Trebuchet",
  scales: "Scales",
  stomp: "Foot",
  honey: "Honey",
  mimic: "Memec",
  copycat: "Copycat",
  lectern: "Lectern",
  study: "Study",
  dig: "Dig",
  quackliber: "Quack-Liber",
  geese: "Anti-Geese",
  lionblade: "Lion Blade",
  gourdgate: "Dragon Gate",
  bombard: "Roost",
  pamphlet: "The Post",
  driver: "Quackmission",
  underlings: "Underlings",
  spire: "Spire",
  pump: "Sump Pump",
};
/** The Flooded Basement's water level (0–3) as three little bars. */
function WaterGauge({ level, plugged }: { level: number; plugged: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-muted" title={plugged ? "A Drain Gourd plugged the drain: the low floor stays flooded" : "The water: 1 floods the low floor, 3 the middle floor too"}>
      Water
      {[1, 2, 3].map((i) => (
        <span key={i} className={`inline-block h-2.5 w-1.5 rounded-sm ${level >= i ? "bg-[#4f9cc4]" : "bg-panel-2"}`} />
      ))}
    </span>
  );
}
/** Quackarot's newest towers: the one line under them on the build bar and in the inspector. */
const TOWER_LINE: Partial<Record<TowerKind, string>> = {
  pamphlet: "He drafts it until the straight is full. Then he hits post.",
  driver: "Two feathers to the forehead. One fruit blinks back. The others are not his problem.",
};

/** A number that's better than plain (fittings, perks, a lamp) in gold with ▲; worse (the dark) muted with ▼. */
function Marked({ text, now, base, lowerIsBetter = false }: { text: string; now: number; base: number; lowerIsBetter?: boolean }) {
  const better = lowerIsBetter ? now < base - 1e-6 : now > base + 1e-6;
  const worse = lowerIsBetter ? now > base + 1e-6 : now < base - 1e-6;
  if (better) return <span className="font-semibold text-gold">{text}▲</span>;
  if (worse) return <span className="text-muted">{text}▼</span>;
  return <>{text}</>;
}

/** "Reach 4.3 tiles (Longer barrel +0.6 tiles, Reading Lamp nearby +25%)": what moved each number, for a tooltip. */
function whyText(read: PreviewStats) {
  const lines = [
    read.why.dmg.length ? `Damage ${read.dmg} (${read.why.dmg.join(", ")})` : "",
    read.why.range.length ? `Reach ${(read.range / CELL).toFixed(1)} tiles (${read.why.range.join(", ")})` : "",
    read.why.interval.length ? `Every ${read.interval.toFixed(1)}s (${read.why.interval.join(", ")})` : "",
  ].filter(Boolean);
  return lines.length ? `\n${lines.join("\n")}` : "";
}

/** The build card's one-line number: damage (and pace and reach, on wider screens), marked where upgrades moved it. */
function CardStat({ kind, read }: { kind: TowerKind; read: PreviewStats }) {
  if (kind === "geese") return <>Throws back {CANNON.geeseShove / CELL} tiles</>;
  if (kind === "gourdgate") return <>Holds {CANNON.gateHold}s</>;
  if (kind === "pamphlet") return <>Ratios a straight</>;
  if (kind === "driver") return <>Blinks one back</>;
  if (read.dmg <= 0 || PASSIVE.includes(kind) || kind === "flask" || kind === "copycat") return <>No damage</>;
  const dmg = Number.isInteger(read.dmg) ? String(read.dmg) : read.dmg.toFixed(1);
  const reachMoved = Math.abs(read.range - read.base.range) > 1e-6 && read.range < 900;
  if (kind === "scales")
    return (
      <>
        <Marked text={dmg} now={read.dmg} base={read.base.dmg} /> + {Math.round(CANNON.scalesShare * 100)}% hp
      </>
    );
  return (
    <>
      <Marked text={`${dmg} dmg`} now={read.dmg} base={read.base.dmg} />
      <span className="hidden sm:inline">
        {" "}
        · <Marked text={`${read.interval.toFixed(1)}s`} now={read.interval} base={read.base.interval} lowerIsBetter />
        {reachMoved ? (
          <>
            {" "}
            · <Marked text={`${(read.range / CELL).toFixed(1)}t`} now={read.range} base={read.base.range} />
          </>
        ) : null}
      </span>
    </>
  );
}

/**
 * The keeper tab's build line: what the picked tower will really have, on the floor tile under the pointer
 * if there is one (a lamp or the Quack-Liber nearby counts), marked where it's better or worse than plain.
 */
function BuildLine({ api, kind }: { api: GameApi; kind: TowerKind }) {
  const [, setTick] = useState(0);
  // The pointer moves without a re-render: look again a few times a second.
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 200);
    return () => window.clearInterval(t);
  }, []);
  const w = api.world;
  const h = w.hover;
  const onFloor = h && !w.pathCells.has(`${h.c},${h.r}`) && !w.shelfCells.has(`${h.c},${h.r}`) && !w.vergeCells.has(`${h.c},${h.r}`);
  const read = api.previewStats(kind, onFloor ? h : undefined);
  const moved = read.why.dmg.length + read.why.range.length + read.why.interval.length > 0;
  return (
    <p className="truncate text-[0.8125rem] text-parchment" title={`${describeStats(kind, read)}${whyText(read)}`}>
      {describeStats(kind, read)}
      {moved ? (
        <span className={read.range < read.base.range && !read.why.dmg.length ? "text-muted" : "text-gold"}>
          {" "}
          {read.range < read.base.range && !read.why.dmg.length && !read.why.interval.length ? "▼" : "▲"}
        </span>
      ) : null}
    </p>
  );
}

/** "Reaches 6.5 tiles of carpet · ": what this tower can hit where it stands (the board lights the same stretch). */
function ReachNote({ reach }: { reach: { tiles: number | "all" | null; towers: number } | null }) {
  if (!reach) return null;
  const parts: string[] = [];
  if (reach.tiles === "all") parts.push("Reaches the whole carpet");
  else if (reach.tiles != null) parts.push(reach.tiles > 0 ? `Reaches ${reach.tiles} ${reach.tiles === 1 ? "tile" : "tiles"} of carpet` : "No carpet in reach");
  if (reach.towers) parts.push(`${reach.tiles == null ? "Boosts" : "speeds up"} ${reach.towers} ${reach.towers === 1 ? "tower" : "towers"}`);
  if (!parts.length) return null;
  return <span className="text-gold" title="What this tower can reach from here: the lit stretch of carpet on the board">{parts.join(" · ")} · </span>;
}

/** "Tonight: 1,240 dmg · 18 pops · 31% of all": what a placed tower has done so far tonight. */
function NightTally({ tally }: { tally: { dmg: number; pops: number; share: number } | null }) {
  if (!tally) return null;
  const share = tally.share > 0 ? ` · ${Math.round(tally.share * 100)}% of all` : "";
  return (
    <span className="text-parchment" title="Damage this tower has done tonight, fruit it popped, and its share of all the damage">
      Tonight: {Math.round(tally.dmg).toLocaleString()} dmg · {tally.pops} {tally.pops === 1 ? "pop" : "pops"}
      {share}
    </span>
  );
}

export function describeStats(kind: TowerKind, read: { dmg: number; range: number; interval: number; lit?: boolean; quick?: boolean; powered?: boolean; pierce?: number }) {
  const tiles = read.range >= 900 ? "whole board" : `${(read.range / 48).toFixed(1)} tiles`;
  // "lit" by a Reading Lamp; "powered up" in a Quack-Liber's aura (or Quackarot golden); "quick" from another speed-up.
  const lit = (read.lit ? " · lit" : "") + (read.powered ? " · powered up" : read.quick ? " · quick" : "");
  if (kind === "compost") return "No shot · pays seeds every wave";
  if (kind === "pump") return "No shot · keeps its tile and the eight round it dry";
  if (kind === "underlings")
    return `DMG ${read.dmg} vials at the drowsiest fruit · a sleeper hit: +${Math.round((VAEL_VALUES.reportAmp - 1) * 100)}% from her towers for ${VAEL_VALUES.reportTime}s · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "spire") return `No damage · Lights Out every ${VAEL_VALUES.lightsOutEvery}s: every drowsy fruit falls asleep`;
  if (kind === "flask") return `No shot · puddle every ${read.interval.toFixed(1)}s from each tile · ${tiles} · spills to ${CANNON.flaskMaxTiles} tiles`;
  if (kind === "desk") return `No shot · banks ${CANNON.deskBank} a wave · melons within ${tiles} eat it`;
  if (kind === "lectern") return `No shot · notes the fruit that got furthest; that kind is slower next wave · publishes after ${DOCTOR.publishAfter} waves`;
  if (kind === "study") return `No shot · each wave marks its best tower within ${tiles}: +${Math.round(DOCTOR.markDmg * 100)}% damage, +${Math.round(DOCTOR.markRange * 100)}% reach (${DOCTOR.maxMarks} at most)`;
  if (kind === "dig") return `No shot · a find every ${DOCTOR.digEvery} waves: ${DOCTOR.digStacks} stacks, ${DOCTOR.digSeeds} seeds, or a Study mark`;
  if (kind === "mimic") return `Swallows one fruit · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "scales") return `DMG ${read.dmg} + ${Math.round(CANNON.scalesShare * 100)}% of max health · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "catalogue") return `DMG ${read.dmg} · chains ×${CANNON.catalogueChains} · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "lantern") return `Boosts cannons within ${tiles}`;
  if (kind === "quackliber")
    return `DMG ${read.dmg} ki blasts · burst dazes · ${tiles} · ${read.interval.toFixed(1)}s · towers within ${(CANNON.quackAura / 48).toFixed(0)} tiles powered up ${Math.round((CANNON.quackHaste - 1) * 100)}% faster`;
  if (kind === "orrery") return `DMG ${read.dmg} per sweep · orbit ${tiles}${lit}`;
  if (kind === "boomerang") return `DMG ${read.dmg} out and back · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "quill") return `DMG ${read.dmg} per fruit · writes ${((read.range * CANNON.quillReach) / 48).toFixed(1)} tiles · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "globe") return `DMG ${read.dmg} per fruit · rolls back down the carpet · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "plane") return `DMG ${read.dmg} per pass · glides ${CANNON.planeLife}s · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "bell") return `Stun · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "press") return `DMG ${read.dmg} per fruit along a sheet · inks · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "organ") return `DMG ${read.dmg} to all within ${tiles} · slows · every ${CANNON.organEvery}rd chord stops · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "scope") return `DMG ${read.dmg} · pierces armour · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "honey") return `No damage · sticky footprint every ${read.interval.toFixed(1)}s: +${Math.round((CANNON.honeyAmp - 1) * 100)}% damage taken for ${CANNON.honeyTime}s · ${tiles}`;
  if (kind === "pamphlet") return `Hit: ${read.dmg} per fruit on the straight · goes off at its corner when 2+ are on it`;
  if (kind === "driver") return `No damage · blinks the furthest fruit back ${CANNON.driverTime}s (Karl ${CANNON.driverKarl}s) · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "gourdgate") return `Holds the carpet beside it ${CANNON.gateHold}s every ${read.interval.toFixed(1)}s · ${read.dmg} dmg/s to held fruit${lit}`;
  if (kind === "bombard")
    return read.dmg <= 0
      ? `An egg: hatches into a Whelp after ${DRAGON.roostGrow[0]} waves`
      : `DMG ${read.dmg} + ${Math.round(read.dmg * CANNON.bombardSplashRatio)} splash · ${read.range >= GLOBAL_RANGE ? "whole board" : tiles} · burns · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "lionblade") return `DMG ${read.dmg} to every fruit in ${tiles} · ${read.interval.toFixed(1)}s · a lost stack: swings now, +${Math.round((CANNON.bladeRally - 1) * 100)}%${lit}`;
  if (kind === "geese") return `One use · throws every fruit in ${tiles} back ${CANNON.geeseShove / CELL} tiles (geese twice as far) · ${CANNON.geeseDamage} dmg`;
  if (kind === "stomp") return `DMG ${read.dmg} + ${CANNON.stompStun}s stop · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "still") return `No shot · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "ballista") return `DMG ${read.dmg} · through ${read.pierce ?? CANNON.ballistaPierce} fruit · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  return `DMG ${read.dmg} · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
}

/**
 * "Aims at: Strongest ▾": the selected tower's targeting mode as a menu. Each mode with one line on what it
 * picks, the recommended one marked, the current one ticked. A cycles it from the keyboard. Nothing for
 * towers that don't aim.
 */
function AimMenu({ api, towerId, onGesture, compact = false }: { api: GameApi; towerId: number; onGesture: () => void; compact?: boolean }) {
  const aim = api.targetOf(towerId);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Close on a click elsewhere, or Esc (before Esc deselects the tower).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  if (!aim) return null;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`What it aims at among the fruit in reach. ${TARGET_HINT[aim.mode]} (A cycles it.)`}
        className={`touch-hit flex w-full items-center gap-1.5 rounded-md border border-[#c6a15a]/70 bg-[#1a1014] text-left hover:border-[#c6a15a] ${compact ? "h-7 touch:h-9 px-2 text-[0.8125rem]" : "h-8 touch:h-9 px-2.5 text-sm"}`}
        onClick={() => {
          onGesture();
          setOpen((o) => !o);
        }}
      >
        <Crosshair className="size-3.5 shrink-0 text-gold" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-semibold text-parchment">{TARGET_LABEL[aim.mode]}</span>
        {aim.mode === aim.recommended && !compact ? <span className="shrink-0 rounded bg-gold/15 px-1 text-[0.8125rem] text-gold">best</span> : null}
        <ChevronDown className={`size-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="What it aims at"
          className="absolute bottom-full left-0 z-30 mb-1.5 w-[17rem] overflow-hidden rounded-lg border border-[#c6a15a]/70 bg-[#1a1014] py-1 shadow-2xl"
        >
          <li className="px-3 pt-1 pb-1.5 text-[0.6875rem] tracking-[0.16em] text-gold uppercase">Aims at · A cycles</li>
          {aim.modes.map((mode) => {
            const on = mode === aim.mode;
            return (
              <li key={mode} role="option" aria-selected={on}>
                <button
                  type="button"
                  className={`flex w-full items-start gap-2 px-3 py-1.5 touch:py-2.5 text-left hover:bg-[#3a242c] ${on ? "bg-[#2c1b21]" : ""}`}
                  onClick={() => {
                    onGesture();
                    api.setTarget(mode);
                    setOpen(false);
                  }}
                >
                  <Check className={`mt-0.5 size-3.5 shrink-0 ${on ? "text-gold" : "text-transparent"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className={`text-sm font-semibold ${on ? "text-gold" : "text-parchment"}`}>{TARGET_LABEL[mode]}</span>
                      {mode === aim.recommended ? <span className="rounded bg-gold/15 px-1 text-[0.8125rem] text-gold">recommended</span> : null}
                    </span>
                    <span className="block text-[0.8125rem] leading-snug text-muted">{TARGET_HINT[mode]}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** A small uppercase label over a section of the inspector. */
const Label = ({ children }: { children: string }) => <p className="text-[0.6875rem] leading-none tracking-[0.16em] text-gold/80 uppercase">{children}</p>;

/** The selected tower's numbers: what it does (and its line), then its reach and tonight's tally. */
function InspectorNumbers({
  api,
  tower,
  read,
  column,
}: {
  api: GameApi;
  tower: World["towers"][number];
  read: ReturnType<typeof towerReadout>;
  column: boolean;
}) {
  const clip = column ? "" : "truncate";
  const what =
    tower.kind === "copycat"
      ? tower.copy
        ? `Copying ${TOWERS[tower.copy.kind].name}${COPY_STEP_KINDS.includes(tower.copy.kind) ? ", one step harder" : COPY_HEAVY_KINDS.includes(tower.copy.kind) ? ", 75% damage" : ""} · ${describeStats(tower.copy.kind, read)}`
        : "Blank: put a shared tower right beside it (not on a corner)"
      : tower.kind === "pamphlet"
        ? `Hit: ${read.dmg} per fruit on the straight · ${tower.armed === false ? "spent" : "armed"}`
        : describeStats(tower.kind, read);
  const reach = api.reachOf(tower.id);
  const tally = api.tallyOf(tower.id);
  return (
    <div className="min-w-0 sm:flex-1">
      <span className="hidden sm:block">
        <Label>Does</Label>
      </span>
      <p className={`mt-0.5 text-[0.8125rem] text-parchment sm:mt-1 sm:text-sm ${clip}`} title={what}>
        {what}
      </p>
      {TOWER_LINE[tower.kind] && column ? <p className="text-[0.8125rem] text-muted italic">{TOWER_LINE[tower.kind]}</p> : null}
      <p className={`mt-0.5 text-[0.8125rem] text-muted ${clip}`}>
        <ReachNote reach={reach} />
        <NightTally tally={tally} />
        {tower.mods.length ? <span className="text-gold"> · {tower.mods.map((id) => fittingName(tower.kind === "copycat" && tower.copy ? tower.copy.kind : tower.kind, id)).join(", ")}</span> : null}
      </p>
    </div>
  );
}

/** Sir Michael's tower buttons: Make it Great (a matching neighbour), and Feed the dragon on the Roost. */
function DragonButtons({ api, towerId, onGesture }: { api: GameApi; towerId: number; onGesture: () => void }) {
  const hud = api.world.hud;
  if (hud.hero !== "michael") return null;
  const tower = api.world.towers.find((t) => t.id === towerId);
  if (!tower) return null;
  const split = (cost: number) => {
    const fromHoard = Math.min(Math.floor(hud.hoard), cost);
    return { fromHoard, fromSeeds: cost - fromHoard };
  };
  const btn =
    "h-9 cursor-pointer rounded-lg border border-[#8fc0ff] bg-[#8fc0ff]/10 px-2 text-[0.8125rem] text-parchment disabled:cursor-not-allowed disabled:opacity-40";
  if (tower.kind === "bombard") {
    const roost = api.roostOf(towerId);
    if (!roost || roost.next == null) return null;
    const { fromHoard, fromSeeds } = split(DRAGON.roostFeed);
    return (
      <button
        type="button"
        className={btn}
        disabled={hud.phase !== "prep" || hud.roostFed || hud.seeds < fromSeeds}
        title={`One more wave of growth (once between waves). ${roost.grown} grown; the next stage at ${roost.next}. Costs ${DRAGON.roostFeed}: ${fromHoard} from the Hoard, ${fromSeeds} seeds.`}
        onClick={() => {
          onGesture();
          api.feedRoost();
        }}
      >
        {hud.roostFed ? "Fed" : `Feed ${DRAGON.roostFeed}`}
      </button>
    );
  }
  if (tower.great) return null;
  const offer = api.greatOffer(towerId);
  if (offer.partner == null && !offer.why) return null;
  const { fromHoard, fromSeeds } = split(offer.cost);
  return (
    <button
      type="button"
      className={btn}
      disabled={offer.partner == null || hud.seeds < fromSeeds}
      title={
        offer.partner == null
          ? offer.why
          : `Merge with ${theName(TOWERS[tower.kind].name)} beside it into one Great tower (${DRAGON.greatDmg}× damage, +${Math.round((DRAGON.greatRange - 1) * 100)}% reach). Costs ${offer.cost}: ${fromHoard} from the Hoard, ${fromSeeds} seeds.`
      }
      onClick={() => {
        onGesture();
        api.makeGreat();
      }}
    >
      {offer.partner == null ? "Great: needs a pair" : `Make Great ${offer.cost}`}
    </button>
  );
}

/** Dr. Samodovol's Archaeological Dig: choose what a waiting find is. */
function DigButtons({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const hud = api.world.hud;
  if (hud.digFinds <= 0) return <span className="self-center text-[0.8125rem] text-muted">Digging…</span>;
  const finds = [
    { id: "stacks" as const, label: `+${DOCTOR.digStacks} stacks`, title: `A box of old books: ${DOCTOR.digStacks} stacks back (up to your most).`, off: hud.lives >= hud.maxLives },
    { id: "seeds" as const, label: `+${DOCTOR.digSeeds} seeds`, title: `A jar of old seeds: ${DOCTOR.digSeeds} seeds.`, off: false },
    { id: "mark" as const, label: "Study mark", title: `A lost treatise: a Study mark on your best tower tonight (+${Math.round(DOCTOR.markDmg * 100)}% damage, +${Math.round(DOCTOR.markRange * 100)}% reach).`, off: false },
  ];
  return (
    <span className="flex flex-wrap gap-1" role="group" aria-label={`Dig find${hud.digFinds > 1 ? `s (${hud.digFinds})` : ""}`}>
      {finds.map((f) => (
        <button
          key={f.id}
          type="button"
          title={f.title}
          disabled={f.off}
          className="h-9 touch:h-11 cursor-pointer rounded-lg border border-[#e6c36a] bg-[#e6c36a]/10 px-2 text-[0.8125rem] text-parchment disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            onGesture();
            tone(320, 0.08, "triangle", 0.04);
            api.digFind(f.id);
          }}
        >
          {f.label}
        </button>
      ))}
    </span>
  );
}

function TowerInspector({
  api,
  onGesture,
  phase,
  column = false,
}: {
  api: GameApi;
  onGesture: () => void;
  phase: World["hud"]["phase"];
  /** The wide layout's left column: stacked, as tall as it needs. */
  column?: boolean;
}) {
  const hud = api.world.hud;
  const tower = api.world.towers.find((t) => t.id === hud.selected);
  // Sell has no undo, so a tap arms it and a second tap sells. It disarms after a few seconds.
  const [sellArmed, setSellArmed] = useState<unknown>(null);
  useEffect(() => {
    if (sellArmed == null) return;
    const t = window.setTimeout(() => setSellArmed(null), 3000);
    return () => window.clearTimeout(t);
  }, [sellArmed]);
  if (!tower) return null;
  const armed = sellArmed === tower.id;
  const read = api.statsOf(tower.id) ?? towerReadout(hud.hero, tower.kind, tower.mods, hud.upgrades);
  const canFit = fittingsFor(tower.kind).length > 0;
  const aims = api.targetOf(tower.id) != null;
  return (
    <div
      className={`relative rounded-lg border border-[#c6a15a]/60 bg-[#241418] ${column ? "flex shrink-0 flex-col gap-2 py-2.5 pr-9 pl-3" : "flex h-[5.5rem] items-center gap-3 py-1.5 pr-9 pl-3"}`}
    >
      <div className={column ? "flex items-center gap-3" : "contents"}>
      <TowerIcon kind={tower.kind} className="h-12 w-12 shrink-0" />
      {/* Name and type, then the numbers: side by side on wider screens, one under the other on phones. */}
      <div className={`min-w-0 flex-1 ${column ? "" : "sm:flex sm:items-center sm:gap-4"}`}>
        <div className={`min-w-0 ${column ? "" : "sm:w-48 sm:shrink-0"}`}>
        <p className={`font-display text-lg leading-none font-semibold ${column ? "" : "truncate"}`}>
          {tower.great ? `Great ${TOWERS[tower.kind].name}` : TOWERS[tower.kind].name}
        </p>
        {/* Phones: the aim menu takes the type line's place, so the panel keeps its height. */}
        <p
          className={`mt-1 text-[0.6875rem] tracking-[0.16em] text-gold uppercase ${column ? "" : "truncate"} ${!column && aims ? "hidden sm:block" : ""}`}
        >
          {TYPE_INFO[TOWER_TYPE[tower.kind]].name} · {TOWERS[tower.kind].role}
          {tower.kind === "bombard" && api.roostOf(tower.id) ? <span className="text-[#8fc0ff]"> · {ROOST_STAGES[api.roostOf(tower.id)!.stage]}</span> : null}
          {tower.studyMarks ? <span className="text-parchment"> · Studied {tower.studyMarks}/{DOCTOR.maxMarks}</span> : null}
        </p>
        {!column && aims ? (
          <div className="mt-1 w-full max-w-[7.5rem] sm:hidden">
            <AimMenu api={api} towerId={tower.id} onGesture={onGesture} compact />
          </div>
        ) : null}
        </div>
        {column ? null : <InspectorNumbers api={api} tower={tower} read={read} column={false} />}
        {!column && aims ? (
          <div className="hidden w-44 shrink-0 sm:block">
            <Label>Aims at</Label>
            <div className="mt-1">
              <AimMenu api={api} towerId={tower.id} onGesture={onGesture} />
            </div>
          </div>
        ) : null}
      </div>
      </div>
      {column ? <InspectorNumbers api={api} tower={tower} read={read} column /> : null}
      {column && aims ? (
        <div>
          <Label>Aims at</Label>
          <div className="mt-1">
            <AimMenu api={api} towerId={tower.id} onGesture={onGesture} />
          </div>
        </div>
      ) : null}
      <div className={`flex shrink-0 gap-1.5 ${column ? "flex-wrap" : "flex-col"}`}>
        {tower.kind === "geese" ? (
          <span className="flex gap-1" role="group" aria-label="Anti-Geese Protocol trigger">
            {(["auto", "manual"] as const).map((mode) => {
              const on = (tower.trigger ?? "auto") === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={on}
                  title={mode === "auto" ? "Goes off on its own when fruit crowd in or near the door" : "Goes off only when you press Engage"}
                  className={`h-9 cursor-pointer rounded-lg border px-2 text-[0.8125rem] ${on ? "border-[#c6a15a] bg-[#c6a15a]/25 text-parchment" : "border-line text-muted hover:border-[#c6a15a]"}`}
                  onClick={() => {
                    onGesture();
                    api.setTrigger(mode);
                  }}
                >
                  {mode === "auto" ? "Auto" : "Manual"}
                </button>
              );
            })}
            <button
              type="button"
              title="Set it off now: every fruit in the ring is thrown back"
              disabled={api.world.hud.phase !== "combat"}
              className="h-9 cursor-pointer rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] px-2 text-[0.8125rem] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                onGesture();
                api.engage();
              }}
            >
              Engage
            </button>
          </span>
        ) : null}
        {tower.kind === "pamphlet" && legsTouching(boardLegs(api.world), tower.c, tower.r).length > 1 ? (
          <button
            type="button"
            title="Watch the other straight beside this tile (between waves)"
            disabled={api.world.hud.phase !== "prep"}
            className="h-9 rounded-lg border border-[#c6a15a] px-2 text-[0.8125rem] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              onGesture();
              api.otherStraight();
            }}
          >
            Other straight
          </button>
        ) : null}
        <DragonButtons api={api} towerId={tower.id} onGesture={onGesture} />
        {tower.kind === "dig" ? <DigButtons api={api} onGesture={onGesture} /> : null}
        {canFit ? (
          <button
            type="button"
            title="Back room (B): upgrades for every tower of this kind"
            className="touch-hit h-9 rounded-lg border border-[#c6a15a] px-3 text-sm"
            onClick={() => {
              onGesture();
              tone(200, 0.06, "triangle", 0.03);
              api.openShop(tower.kind);
            }}
          >
            Upgrades {api.shopPriceFor(tower.kind) || "free"}
          </button>
        ) : null}
        <button
          type="button"
          title={armed ? "Tap again to sell: there's no undo" : "Sell (S)"}
          className={`touch-hit h-9 rounded-lg border border-flesh px-3 text-sm ${armed ? "bg-flesh font-semibold text-ink" : "text-flesh"}`}
          onClick={() => {
            onGesture();
            if (!armed) return setSellArmed(tower.id);
            setSellArmed(null);
            api.sellSelected();
          }}
        >
          {armed ? "Sure? Sell" : "Sell"} {refundFor(tower.kind, tower.paid) + (tower.bank ?? 0)}
        </button>
      </div>
      <button
        type="button"
        aria-label="Close (Esc)"
        title="Close (Esc)"
        className="touch-hit absolute top-0 right-0 grid size-9 place-items-center text-muted"
        onClick={() => {
          onGesture();
          api.dismissSelection();
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/**
 * The Legal Elf's Objection!, next to Pause: ready (gold), spent or with nothing to hit (grey, the reason
 * as its title). O does the same.
 */
function ObjectionButton({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const hud = api.world.hud;
  const why = hud.phase === "combat" ? hud.objectionWhy : "Objections are for during a wave.";
  const ready = !why;
  const spent = hud.phase === "combat" && hud.objections <= 0;
  return (
    <button
      type="button"
      aria-label={ready ? `Objection! (O), ${hud.objections} left this wave` : `Objection! ${why}`}
      aria-disabled={!ready}
      title={ready ? `Objection! Throw back what's at the door (O). ${hud.objections} left this wave.` : why}
      className={`touch-hit relative grid h-7 min-[400px]:h-8 touch:h-10 touch:max-[359px]:h-9 md:h-11 place-items-center rounded-lg border px-2 max-[399px]:px-1.5 text-[0.8125rem] font-semibold ${
        ready ? "border-[#e6c36a] bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-ink" : "border-line/70 text-muted opacity-50"
      }`}
      onClick={() => {
        onGesture();
        api.objection();
      }}
    >
      <span className="flex items-center gap-1">
        <Gavel className="size-4" />
        <span className="hidden md:inline">{spent ? "Spent" : "Objection!"}</span>
      </span>
      {hud.objections > 1 && hud.phase === "combat" ? (
        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-ink px-1 text-[0.625rem] leading-4 text-gold">×{hud.objections}</span>
      ) : null}
    </button>
  );
}
