import { BookOpen, Coins, Heart, IdCard, Lock, Menu, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import {
  BOARDS,
  CANNON,
  CELL,
  GUIDE_HOLDS,
  KEEPER_NAMES,
  MODS,
  PASSIVE,
  HEAVY_SEEDS,
  HEAVY_WAVE,
  fittingsFor,
  TRICK_LEVEL,
  TOWER_GOALS,
  TOWERS,
  TOWER_TYPE,
  TYPE_INFO,
  buildCost,
  carpetLegs,
  groupOf,
  legsTouching,
  groupsFor,
  refundFor,
  towerReadout,
  type TowerKind,
  type World,
  COPY_STEP_KINDS,
  COPY_HEAVY_KINDS,
} from "@/game/engine";
import { tone } from "@/game/audio";
import { TowerIcon } from "@/components/TowerIcon";
import { checkoutCount } from "@/components/CheckoutCard";
import type { GameApi } from "@/components/ui";

/** Top bar: name (or keeper and room), seeds, stacks, absurdity, speed, pause, menu and sound. */
export function GameHeader({
  api,
  inRun,
  showPlace,
  menuable,
  muted,
  onMute,
  onGesture,
}: {
  api: GameApi;
  inRun: boolean;
  showPlace: boolean;
  menuable: boolean;
  muted: boolean;
  onMute: () => void;
  onGesture: () => void;
}) {
  const hud = api.world.hud;
  const phase = hud.phase;
  const gesture = onGesture;
  const toggleMute = onMute;
  return (
    <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2">
        <BookOpen className={`size-5 text-gold ${inRun ? "hidden sm:block" : ""}`} aria-hidden="true" />
        <div className={inRun ? "hidden sm:block" : ""}>
          <p className="font-display text-lg leading-none font-semibold">Melongeddon</p>
          <p className="text-xs text-muted">
            {phase === "coldopen"
              ? "Tonight only"
              : !inRun
                ? "Midnight Library"
                : hud.hero
                  ? KEEPER_NAMES[hud.hero].name
                  : "Midnight Library"}
            {inRun ? ` · ${BOARDS[hud.map].name}${hud.night === "endless" ? " · Endless" : ""}` : ""}
          </p>
        </div>
        {hud.dev ? (
          <span
            className="rounded border border-[#6fc6ef]/70 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-[#6fc6ef]"
            title="Developer mode: everything unlocked, nothing saved to your progress"
          >
            DEV
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-sm sm:gap-2">
        {inRun ? (
          <>
            <span className="flex items-center gap-1.5">
              <Coins className="size-5 text-gold" aria-hidden="true" />
              <span className="font-display text-lg leading-none font-semibold">{hud.seeds}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="size-5 text-flesh" aria-hidden="true" />
              <span className="font-display text-lg leading-none font-semibold">
                {hud.lives}/{hud.maxLives}
              </span>
              {hud.sisu > 0 ? (
                <span className="text-xs font-semibold whitespace-nowrap text-[#8fbcf2]" title="Sisu: Asser's towers hit harder for every stack he is missing">
                  Sisu +{hud.sisu}%
                </span>
              ) : null}
            </span>
            {menuable ? <CheckoutButton api={api} onGesture={gesture} /> : null}
            <span className="hidden text-xs text-muted sm:inline">Absurdity {hud.absurdity}</span>
            <div className="flex items-center gap-1">
              {showPlace ? (
              <>
              <button
                type="button"
                aria-label="Slow down"
                disabled={hud.speed <= 0.5}
                className="grid size-9 sm:size-11 place-items-center rounded-lg border border-line/70 text-lg disabled:opacity-40"
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
                className="grid size-9 sm:size-11 place-items-center rounded-lg border border-line/70"
                onClick={() => {
                  gesture();
                  api.togglePause();
                }}
              >
                {hud.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button
                type="button"
                aria-label="Speed up"
                disabled={hud.speed >= 3}
                className="grid size-9 sm:size-11 place-items-center rounded-lg border border-line/70 text-lg disabled:opacity-40"
                onClick={() => {
                  gesture();
                  api.nudgeSpeed(1);
                }}
              >
                +
              </button>
              <span className="hidden w-8 text-center text-xs text-muted sm:inline">{hud.paused ? "||" : `${hud.speed}×`}</span>
              </>
              ) : null}
              {menuable ? (
                <button
                  type="button"
                  aria-label="Menu"
                  aria-haspopup="dialog"
                  title="Menu (Esc)"
                  className="grid size-9 sm:size-11 place-items-center rounded-lg border border-line/70"
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
          className="grid size-9 sm:size-11 place-items-center rounded-xl border border-line bg-panel"
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
      className="relative grid size-9 place-items-center rounded-lg border border-line/70 hover:border-[#c6a15a] sm:size-11"
      onClick={() => {
        onGesture();
        api.openCheckout();
      }}
    >
      <IdCard className="size-4 text-[#f3e2c4]" aria-hidden="true" />
      {n ? (
        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] leading-none font-bold text-ink" aria-hidden="true">
          {n}
        </span>
      ) : null}
    </button>
  );
}

/** Bottom bar while building or fighting: start button or wave progress, build tabs, build bar or inspector, log. */
export function BuildFooter({ api, onGesture }: { api: GameApi; onGesture: () => void }) {
  const hud = api.world.hud;
  const phase = hud.phase;
  const gesture = onGesture;
  const selected = hud.selected == null ? null : (api.world.towers.find((t) => t.id === hud.selected) ?? null);
  /** The guide holds the wave until its current step is done (pressing it says why). */
  const held = hud.guide != null && GUIDE_HOLDS.includes(hud.guide);
  return (
    <footer className="flex shrink-0 flex-col gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3">
      {phase === "combat" ? (
        <div className="flex h-12 flex-col justify-center">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-lg leading-none font-semibold">
              {hud.waveCount ? `Wave ${Math.min(hud.wave, hud.waveCount)}/${hud.waveCount}` : `Wave ${hud.wave}`}
            </p>
            <p className="min-w-0 truncate text-sm text-muted">{hud.waveName}</p>
            <p className="shrink-0 text-sm">{hud.left} remaining</p>
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
          className={`min-h-12 w-full rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink ${held ? "opacity-45" : ""}`}
          onClick={() => {
            gesture();
            if (!held) tone(320, 0.08, "triangle", 0.04);
            api.startWave();
          }}
        >
          Start wave {hud.wave}
          <span className="ml-2 hidden text-xs font-normal opacity-70 sm:inline">Space</span>
        </button>
      )}
      <div className="flex h-7 items-center gap-2">
        <div className="flex shrink-0 gap-1" role="tablist" aria-label="Cannon type">
          {groupsFor(hud.hero).map((g) => {
            const on = groupOf(hud.build).id === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={on}
                title={`${g.name} (${g.key.toUpperCase()})`}
                className={`h-7 rounded-md px-2 text-xs font-semibold sm:px-2.5 ${on ? "bg-[#3a242c] text-gold ring-1 ring-[#c6a15a]" : "text-muted"}`}
                onClick={() => {
                  gesture();
                  api.dismissSelection();
                  if (!on) api.chooseBuild(g.kinds[0]);
                }}
              >
                {g.name}
                <span className="ml-1 hidden opacity-60 sm:inline">{g.key.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

      </div>
      {selected ? (
        <TowerInspector
          api={api}
          onGesture={gesture}
          phase={phase}
        />
      ) : (
        <div className="grid h-[5.5rem] grid-cols-5 gap-2">
          {groupOf(hud.build).kinds.map((id, slot) => {
            const placed = api.world.towers.length;
            const cost = Math.max(0, buildCost(hud.hero, placed, id, hud.builtKinds) - (hud.bookmark === "discount" ? 5 : 0));
            const on = hud.build === id;
            const built = groupOf(id).id === "keeper" && api.world.towers.some((t) => t.kind === id);
            // The Anti-Geese Protocol went off this wave: it comes back when the wave is over.
            const spent = id === "geese" && hud.geeseSpent;
            // Trick cannons open with the keeper's level (as it was when this night started).
            const needs = TRICK_LEVEL[id] ?? 0;
            // Keeper towers with an unlock goal (the Reserve Desk) stay locked until it's met.
            const goal = hud.lockedTowers.includes(id) ? TOWER_GOALS[id]?.goal : undefined;
            // Heavy cannons wait for wave 6, or 200 seeds in hand tonight.
            const heavyWait = groupOf(id).id === "heavy" && !hud.heavyOpen;
            const locked = needs > hud.runLevel || goal != null || heavyWait;
            // Its numbers before you build it (with the upgrades you hold that reach it).
            const read = towerReadout(hud.hero, id, [], hud.upgrades);
            return (
              <button
                key={id}
                type="button"
                title={
                  goal
                    ? `${TOWERS[id].name}: locked. ${goal} ${TOWERS[id].blurb}`
                    : heavyWait
                    ? `${TOWERS[id].name}: opens at wave ${HEAVY_WAVE}, or once you have ${HEAVY_SEEDS} seeds in hand. ${TOWERS[id].blurb}`
                    : locked
                    ? `${TOWERS[id].name}: opens at keeper level ${needs}. ${TOWERS[id].blurb}`
                    : `${TOWERS[id].name} (${slot + 1}) · ${TYPE_INFO[TOWER_TYPE[id]].name}: ${TOWERS[id].blurb}\n${describeStats(id, read)}`
                }
                className={`relative h-full min-w-0 rounded-lg border px-1 py-1.5 text-center ${on ? "border-[#c6a15a] bg-[#3a242c]" : "border-line/70 bg-panel"} ${hud.seeds < cost || built || spent || locked ? "opacity-55" : ""}`}
                onClick={() => {
                  gesture();
                  api.chooseBuild(id);
                }}
              >
                <span className="absolute top-1 left-1.5 hidden text-[10px] text-muted sm:block">{slot + 1}</span>
                <span className="relative block">
                  <TowerIcon kind={id} className={`mx-auto block h-7 w-full ${locked ? "grayscale" : ""}`} />
                  {locked ? <Lock className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-gold" aria-hidden="true" /> : null}
                </span>
                <span className="mt-0.5 block truncate text-xs leading-tight font-semibold">{SHORT_NAME[id]}</span>
                <span className="block truncate text-[11px] leading-tight text-parchment"><CardStat kind={id} read={read} /></span>
                <span className="block truncate text-[11px] leading-tight text-muted">
                  {goal ? "Locked" : heavyWait ? `Wave ${HEAVY_WAVE}` : locked ? `Level ${needs}` : built ? "Built" : spent ? "Spent" : cost === 0 ? "Free" : cost}
                  <span className="hidden sm:inline"> · {TOWERS[id].role}</span>
                </span>
              </button>
            );
          })}
          {groupOf(hud.build).id === "keeper" ? (
            <div
              className={`${["col-span-4", "col-span-4", "col-span-3", "col-span-2"][Math.min(3, groupOf(hud.build).kinds.length)]} flex min-w-0 flex-col justify-center rounded-lg border border-line/50 px-3 py-1.5`}
            >
              <p className="truncate font-display text-sm font-semibold text-gold">{TOWERS[hud.build].name}</p>
              <p className="truncate text-xs text-parchment">{describeStats(hud.build, towerReadout(hud.hero, hud.build, [], hud.upgrades))}</p>
              <p className="line-clamp-2 text-xs text-muted">
                {hud.lockedTowers.includes(hud.build)
                  ? `Locked: ${TOWER_GOALS[hud.build]?.goal}`
                  : TOWER_LINE[hud.build]
                    ? `${TOWER_LINE[hud.build]} One at a time.`
                    : `${TOWERS[hud.build].blurb} One at a time.`}
              </p>
            </div>
          ) : null}
        </div>
      )}
      <p className="line-clamp-2 h-8 text-xs text-muted">{hud.log}</p>
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
  quackliber: "Quack-Liber",
  geese: "Anti-Geese",
  lionblade: "Lion Blade",
  gourdgate: "Gourd Gate",
  bombard: "Bombard",
  pamphlet: "Pamphlet",
  driver: "Driver",
};
/** Quackarot's newest towers: the one line under them on the build bar and in the inspector. */
const TOWER_LINE: Partial<Record<TowerKind, string>> = {
  pamphlet: "He holds it until the straight is full. Then the pamphlet goes off.",
  driver: "One fruit is walked back. The others are not his problem.",
};

/** The build card's one-line number: damage (and pace, on wider screens) for anything that hits. */
function CardStat({ kind, read }: { kind: TowerKind; read: { dmg: number; interval: number } }) {
  if (kind === "geese") return <>Throws back {CANNON.geeseShove / CELL} tiles</>;
  if (kind === "gourdgate") return <>Holds {CANNON.gateHold}s</>;
  if (kind === "pamphlet") return <>Hits a straight</>;
  if (kind === "driver") return <>Walks one back</>;
  if (read.dmg <= 0 || PASSIVE.includes(kind) || kind === "flask" || kind === "copycat") return <>No damage</>;
  const dmg = Number.isInteger(read.dmg) ? String(read.dmg) : read.dmg.toFixed(1);
  if (kind === "scales") return <>{dmg} + {Math.round(CANNON.scalesShare * 100)}% hp</>;
  return (
    <>
      {dmg} dmg<span className="hidden sm:inline"> · {read.interval.toFixed(1)}s</span>
    </>
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

function describeStats(kind: TowerKind, read: { dmg: number; range: number; interval: number; lit?: boolean; quick?: boolean }) {
  const tiles = read.range >= 900 ? "whole board" : `${(read.range / 48).toFixed(1)} tiles`;
  // "lit" by a Reading Lamp; "quick" beside a Quack-Liber.
  const lit = (read.lit ? " · lit" : "") + (read.quick ? " · quick" : "");
  if (kind === "compost") return "No shot · pays seeds every wave";
  if (kind === "flask") return `No shot · puddle every ${read.interval.toFixed(1)}s from each tile · ${tiles} · spills to ${CANNON.flaskMaxTiles} tiles`;
  if (kind === "desk") return `No shot · banks ${CANNON.deskBank} a wave · melons within ${tiles} eat it`;
  if (kind === "lectern") return "No shot · notes the fruit that got furthest; that kind is slower next wave";
  if (kind === "mimic") return `Swallows one fruit · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "scales") return `DMG ${read.dmg} + ${Math.round(CANNON.scalesShare * 100)}% of max health · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "catalogue") return `DMG ${read.dmg} · chains ×${CANNON.catalogueChains} · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "lantern") return `Boosts cannons within ${tiles}`;
  if (kind === "quackliber")
    return `DMG ${read.dmg} rockets · burst slows · ${tiles} · ${read.interval.toFixed(1)}s · towers within ${(CANNON.quackAura / 48).toFixed(0)} tiles fire ${Math.round((CANNON.quackHaste - 1) * 100)}% faster`;
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
  if (kind === "driver") return `No damage · walks the furthest fruit back ${CANNON.driverTime}s (Karl ${CANNON.driverKarl}s) · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "gourdgate") return `Holds the carpet beside it ${CANNON.gateHold}s (${CANNON.gateHoldOath}s in his oath's zone) every ${read.interval.toFixed(1)}s · ${read.dmg} dmg/s to held fruit${lit}`;
  if (kind === "bombard") return `DMG ${read.dmg} + ${Math.round(read.dmg * CANNON.bombardSplashRatio)} splash · whole board · shoves 1 tile · burns · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "lionblade") return `DMG ${read.dmg} to every fruit in ${tiles} · ${read.interval.toFixed(1)}s · a lost stack: swings now, +${Math.round((CANNON.bladeRally - 1) * 100)}%${lit}`;
  if (kind === "geese") return `One use · throws every fruit in ${tiles} back ${CANNON.geeseShove / CELL} tiles (geese twice as far) · ${CANNON.geeseDamage} dmg`;
  if (kind === "stomp") return `DMG ${read.dmg} + ${CANNON.stompStun}s stop · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "still") return `No shot · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  return `DMG ${read.dmg} · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
}

function TowerInspector({
  api,
  onGesture,
  phase,
}: {
  api: GameApi;
  onGesture: () => void;
  phase: World["hud"]["phase"];
}) {
  const hud = api.world.hud;
  const tower = api.world.towers.find((t) => t.id === hud.selected);
  if (!tower) return null;
  const read = api.statsOf(tower.id) ?? towerReadout(hud.hero, tower.kind, tower.mods, hud.upgrades);
  const canFit = fittingsFor(tower.kind).length > 0;
  return (
    <div className="relative flex h-[5.5rem] items-center gap-3 rounded-lg border border-[#c6a15a]/60 bg-[#241418] py-1.5 pr-9 pl-3">
      <TowerIcon kind={tower.kind} className="h-12 w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg leading-none font-semibold">{TOWERS[tower.kind].name}</p>
        <p className="mt-1 truncate text-[10px] tracking-[0.16em] text-gold uppercase">
          {TYPE_INFO[TOWER_TYPE[tower.kind]].name} · {TOWERS[tower.kind].role}
        </p>
        <p className="mt-1 truncate text-xs text-muted sm:text-sm">
          {tower.kind === "copycat"
            ? tower.copy
              ? `Copying: ${TOWERS[tower.copy.kind].name}${COPY_STEP_KINDS.includes(tower.copy.kind) ? ", one step harder" : COPY_HEAVY_KINDS.includes(tower.copy.kind) ? ", 75% damage" : ""} · ${describeStats(tower.copy.kind, read)}`
              : "Blank: put a shared tower right beside it (not on a corner)"
            : tower.kind === "pamphlet"
              ? `Hit: ${read.dmg} per fruit on the straight · ${tower.armed === false ? "spent" : "armed"}`
              : describeStats(tower.kind, read)}
        </p>
        {TOWER_LINE[tower.kind] ? <p className="truncate text-[11px] text-muted italic">{TOWER_LINE[tower.kind]}</p> : null}
        <p className="mt-0.5 h-4 truncate text-xs">
          <ReachNote reach={api.reachOf(tower.id)} />
          <NightTally tally={api.tallyOf(tower.id)} />
          {tower.mods.length ? <span className="text-gold"> · {tower.mods.map((id) => MODS.find((m) => m.id === id)?.name).join(" · ")}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
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
                  className={`h-9 cursor-pointer rounded-lg border px-2 text-xs ${on ? "border-[#c6a15a] bg-[#c6a15a]/25 text-parchment" : "border-line text-muted hover:border-[#c6a15a]"}`}
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
              className="h-9 cursor-pointer rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] px-2 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                onGesture();
                api.engage();
              }}
            >
              Engage
            </button>
          </span>
        ) : null}
        {tower.kind === "pamphlet" && legsTouching(carpetLegs(api.world.points), tower.c, tower.r).length > 1 ? (
          <button
            type="button"
            title="Watch the other straight beside this tile (between waves)"
            disabled={api.world.hud.phase !== "prep"}
            className="h-9 rounded-lg border border-[#c6a15a] px-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              onGesture();
              api.otherStraight();
            }}
          >
            Other straight
          </button>
        ) : null}
        {tower.kind === "quackliber" ? (
          tower.aimMode ? (
            <span className="grid h-9 place-items-center rounded-lg border border-line px-3 text-xs text-muted" title="A Quack-Liber can be retargeted once">
              {tower.aimMode === "strong" ? "Aims: toughest" : "Aims: rearmost"}
            </span>
          ) : (
            <span className="flex gap-1" role="group" aria-label="Retarget once">
              <button
                type="button"
                title="Retarget once: the toughest fruit in reach"
                className="h-9 rounded-lg border border-[#c6a15a] px-2 text-xs"
                onClick={() => {
                  onGesture();
                  api.retarget("strong");
                }}
              >
                Toughest
              </button>
              <button
                type="button"
                title="Retarget once: the fruit furthest back in reach"
                className="h-9 rounded-lg border border-[#c6a15a] px-2 text-xs"
                onClick={() => {
                  onGesture();
                  api.retarget("rear");
                }}
              >
                Rearmost
              </button>
            </span>
          )
        ) : null}
        {canFit ? (
          <button
            type="button"
            title="Back room (B): upgrades for every tower of this kind"
            className="h-9 rounded-lg border border-[#c6a15a] px-3 text-sm"
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
          title="Sell (S)"
          className="h-9 rounded-lg border border-flesh px-3 text-sm text-flesh"
          onClick={() => {
            onGesture();
            api.sellSelected();
          }}
        >
          Sell {refundFor(tower.kind, tower.paid) + (tower.bank ?? 0)}
        </button>
      </div>
      <button
        type="button"
        aria-label="Close (Esc)"
        title="Close (Esc)"
        className="absolute top-0 right-0 grid size-9 place-items-center text-muted"
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
