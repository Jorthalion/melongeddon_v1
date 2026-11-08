import { asset } from "@/lib/asset";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref } from "react";
import { BookOpen, Heart, Coins, Pause, Play, Volume2, VolumeX, Crosshair, X, Menu } from "lucide-react";
import {
  BOARDS,
  CANNON_UPGRADES,
  CANNON,
  MAP_GOALS,
  PICKABLE_MAPS,
  DIFFICULTIES,
  MODS,
  TOWER_GROUPS,
  groupOf,
  groupsFor,
  KEEPER_NAMES,
  KEEPER_START,
  TOWER_TYPE,
  TYPE_INFO,
  upgradeTargetLabel,
  SIGNATURE,
  TOWERS,
  buildCost,
  doorMemory,
  sellValue,
  backRoomPrice,
  towerReadout,
  MAP_H,
  MAP_W,
  UPGRADES,
  createWorld,
  stepWorld,
  type Difficulty,
  type HeroId,
  type MapId,
  type TowerKind,
  type UpgradeId,
  type World,
  type BookmarkId,
  type Hud,
  BOOKMARK,
  BALANCE,
  SPEEDS,
  WAVE_COUNT,
  stacksWord,
} from "@/game/engine";
import { drawWorld } from "@/game/draw";
import { isMusicOn, isMuted, playSfx, setMusicMode, setMusicOn, setMuted, tone, unlockAudio } from "@/game/audio";
import { HOTKEY_HELP, useHotkeys } from "@/components/hotkeys";
import { CHUTE_TIP_KEY, ChuteTip, TUTORIAL_KEY, TutorialHint } from "@/components/TutorialHint";
import { save } from "@/lib/storage";
import { canInstall, isDesktopApp, onInstallChange, promptInstall } from "@/lib/install";
import { BookmarkPicker, NewUnlocks } from "@/components/Bookmarks";
import { LevelBadge, PerkPicker, XpSummary } from "@/components/KeeperLevels";
import { SlipPicker } from "@/components/LateSlips";
import { TowerIcon } from "@/components/TowerIcon";
import { MapPreview } from "@/components/MapPreview";
import { Dialog } from "@/components/Dialog";
import { Lock } from "lucide-react";

/** Largest uniform scale that fits the board in a w×h box, plus the offset that centers it (CSS px). */
function fitBoard(w: number, h: number) {
  const scale = Math.max(0.0001, Math.min(w / MAP_W, h / MAP_H));
  return { scale, x: (w - MAP_W * scale) / 2, y: (h - MAP_H * scale) / 2 };
}

export function MelonGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<ReturnType<typeof createWorld> | null>(null);
  const notifyRef = useRef<() => void>(() => {});
  const [, setTick] = useState(0);
  const [muted, setMutedUi] = useState(isMuted);
  const [music, setMusicUi] = useState(isMusicOn);
  const [installable, setInstallable] = useState(canInstall);
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);
  const leftSeen = useRef(-1);

  if (!worldRef.current) {
    worldRef.current = createWorld(() => notifyRef.current());
  }
  const api = worldRef.current;
  notifyRef.current = () => setTick((n) => n + 1);
  const hud = api.world.hud;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (api.world.hud.paused) {
        acc = 0;
      } else {
        acc += dt * api.world.hud.speed;
        let steps = 0;
        while (acc >= 1 / 60 && steps < 12) {
          stepWorld(api.world, 1 / 60);
          acc -= 1 / 60;
          steps += 1;
        }
      }
      const sfx = api.world.sfx;
      if (sfx.length) {
        for (const cue of sfx) playSfx(cue);
        sfx.length = 0;
      }
      setMusicMode(api.world.hud.phase === "combat" ? "combat" : "calm");
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const bw = Math.max(1, Math.round(rect.width * dpr));
      const bh = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      // Clear the whole canvas, then draw the board at one uniform scale,
      // centered, so it never stretches on screens that aren't 16:10.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#140e12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const view = fitBoard(rect.width, rect.height);
      ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.x * dpr, view.y * dpr);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, MAP_W, MAP_H);
      ctx.clip();
      drawWorld(ctx, api.world);
      ctx.restore();
      if (api.world.hud.left !== leftSeen.current) {
        leftSeen.current = api.world.hud.left;
        setTick((n) => n + 1);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [api]);

  const toWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const view = fitBoard(rect.width, rect.height);
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  };

  const gesture = () => {
    unlockAudio();
    tone(180, 0.05, "triangle", 0.03);
  };

  const toggleMute = () => {
    const next = !isMuted();
    setMuted(next);
    setMutedUi(next);
    if (!next) gesture();
  };
  const toggleMusic = () => {
    gesture();
    const next = !isMusicOn();
    setMusicOn(next);
    setMusicUi(next);
  };

  useHotkeys(api, { onGesture: gesture, onMute: toggleMute });

  // Closing or reloading the tab mid-run asks first.
  useEffect(() => {
    const p = hud.phase;
    const live = p !== "coldopen" && p !== "select" && p !== "poster" && p !== "victory" && p !== "defeat";
    if (!live) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [hud.phase]);

  // Browser / phone Back steps back one screen instead of leaving the site. Away from the Title
  // the page keeps one extra history entry; each Back uses it up, does the in-game back step,
  // and puts it back unless that step reached the Title.
  const historyGuard = useRef(false);
  const skipPop = useRef(false);
  useEffect(() => {
    const away = hud.phase !== "coldopen";
    if (away && !historyGuard.current) {
      window.history.pushState({ melongeddon: true }, "");
      historyGuard.current = true;
    } else if (!away && historyGuard.current) {
      // Reached the Title with a button: drop the spare entry so Back leaves the site as usual.
      historyGuard.current = false;
      skipPop.current = true;
      window.history.back();
    }
  }, [hud.phase]);
  useEffect(() => {
    const onPop = () => {
      if (skipPop.current) {
        skipPop.current = false;
        return;
      }
      historyGuard.current = false;
      const h = api.world.hud;
      if (h.phase === "select") api.backToTitle();
      else if (h.phase === "poster") api.backToSetup();
      else if (h.phase === "victory" || h.phase === "defeat") {
        /* end cards: Back does nothing, so unlocks aren't skipped by accident */
      } else if (h.menu === "settings") api.menuSettings(false);
      else if (h.menu) api.closeMenu();
      else if (h.phase === "shop") api.closeShop();
      else api.openMenu();
      if (api.world.hud.phase !== "coldopen") {
        window.history.pushState({ melongeddon: true }, "");
        historyGuard.current = true;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [api]);

  const phase = hud.phase;
  const showPlace = phase === "prep" || phase === "combat";
  /** The keeper is also set on Setup now, so "in a run" is decided by phase. */
  const inRun = hud.hero != null && phase !== "coldopen" && phase !== "select";
  const menuable = inRun && phase !== "poster" && phase !== "victory" && phase !== "defeat";
  const runLive = menuable;
  const selected = hud.selected == null ? null : (api.world.towers.find((t) => t.id === hud.selected) ?? null);
  const roomPrice = backRoomPrice(hud.hero, hud.shopVisits, hud.bookmark);

  return (
    <main className="relative flex h-dvh flex-col bg-ink text-parchment">
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
              </span>
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

      <div className="relative min-h-0 flex-1 sm:px-3">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none bg-ink sm:rounded-xl sm:border sm:border-line"
          onPointerMove={(e) => {
            const p = toWorld(e.clientX, e.clientY);
            api.pointer(p.x, p.y, "move");
          }}
          onPointerDown={(e) => {
            gesture();
            const p = toWorld(e.clientX, e.clientY);
            api.pointer(p.x, p.y, "down");
            tone(240, 0.06, "square", 0.03);
          }}
        />
        {hud.paused && !hud.menu && showPlace ? (
          <div className="pointer-events-none absolute inset-3 grid place-items-center">
            <p className="rounded-xl border border-line bg-ink/80 px-4 py-2 font-display text-xl">Paused</p>
          </div>
        ) : null}
        {phase === "prep" || phase === "combat" ? <TutorialHint api={api} /> : null}
        {phase === "prep" || phase === "combat" ? <ChuteTip api={api} /> : null}
        {phase === "select" ? <SelectScreen api={api} onGesture={gesture} /> : null}
        {phase !== "combat" && phase !== "prep" && phase !== "select" && phase !== "coldopen" && phase !== "poster" ? (
          <Overlay hudPhase={phase} api={api} onGesture={gesture} />
        ) : null}
      </div>

      {!showPlace ? null : (
      <footer className="flex shrink-0 flex-col gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3">
        {showPlace ? (
          <>
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
                className="min-h-12 w-full rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink"
                onClick={() => {
                  gesture();
                  tone(320, 0.08, "triangle", 0.04);
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
                      className={`h-7 rounded-md px-2.5 text-xs font-semibold ${on ? "bg-[#3a242c] text-gold ring-1 ring-[#c6a15a]" : "text-muted"}`}
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
              <p className="min-w-0 flex-1 truncate text-right text-xs text-muted">{hud.upgrades.map((id) => UPGRADES[id].name).join(" · ")}</p>
            </div>
            {selected ? (
              <TowerInspector
                api={api}
                onGesture={gesture}
                roomPrice={roomPrice}
                phase={phase}
              />
            ) : (
              <div className="grid h-[5.5rem] grid-cols-5 gap-2">
                {groupOf(hud.build).kinds.map((id, slot) => {
                  const placed = api.world.towers.filter((t) => !t.ally).length;
                  const cost = Math.max(0, buildCost(hud.hero, placed, id) - (hud.bookmark === "discount" ? 5 : 0));
                  const on = hud.build === id;
                  const built = groupOf(id).id === "keeper" && api.world.towers.some((t) => t.kind === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      title={`${TOWERS[id].name} (${slot + 1}) · ${TYPE_INFO[TOWER_TYPE[id]].name}: ${TOWERS[id].blurb}`}
                      className={`relative h-full min-w-0 rounded-lg border px-1 py-1.5 text-center ${on ? "border-[#c6a15a] bg-[#3a242c]" : "border-line/70 bg-panel"} ${hud.seeds < cost || built ? "opacity-55" : ""}`}
                      onClick={() => {
                        gesture();
                        api.chooseBuild(id);
                      }}
                    >
                      <span className="absolute top-1 left-1.5 hidden text-[10px] text-muted sm:block">{slot + 1}</span>
                      <TowerIcon kind={id} className="mx-auto block h-9 w-full" />
                      <span className="mt-1 block truncate text-xs font-semibold">{SHORT_NAME[id]}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {built ? "Built" : cost}
                        <span className="hidden sm:inline"> · {TOWERS[id].role}</span>
                      </span>
                    </button>
                  );
                })}
                {groupOf(hud.build).id === "keeper" ? (
                  <div className="col-span-4 flex min-w-0 flex-col justify-center rounded-lg border border-line/50 px-3 py-1.5">
                    <p className="truncate font-display text-sm font-semibold text-gold">{TOWERS[groupOf(hud.build).kinds[0]].name}</p>
                    <p className="line-clamp-2 text-xs text-muted">{TOWERS[groupOf(hud.build).kinds[0]].blurb} One at a time.</p>
                  </div>
                ) : null}
              </div>
            )}
            <p className="line-clamp-2 h-8 text-xs text-muted">{hud.log}</p>
          </>
        ) : null}
      </footer>
      )}
      {phase === "coldopen" ? (
        <TitleScreen
          settings={<SettingsPanel api={api} muted={muted} music={music} onMute={toggleMute} onMusic={toggleMusic} onGesture={gesture} />}
          saved={hud.saved}
          summary={`${setupSummary(hud)}${hud.saved || hud.hero ? "" : ". Pick your own with New night."}`}
          note={hud.setupNote}
          onStart={() => {
            gesture();
            tone(220, 0.08, "triangle", 0.04);
            api.continueRun();
          }}
          onKeeper={() => {
            gesture();
            tone(240, 0.06, "triangle", 0.04);
            api.openSetup();
          }}
          onInstall={installable ? () => void promptInstall() : undefined}
          onQuit={isDesktopApp() ? () => window.melongeddonDesktop?.quit() : undefined}
        />
      ) : null}
      {phase === "poster" ? (
        (
          <RoomScreen
            src={MAP_ART[hud.map] ?? MAP_ART.stacks!}
            dim={Boolean(BOARDS[hud.map].dark) && !MAP_ART[hud.map]}
            kicker={KEEPER_NAMES[hud.hero ?? "mynxi"].role}
            title={BOARDS[hud.map].name}
            joke={ROOM_JOKE[hud.map] ?? ROOM_JOKE.stacks!}
            action={hud.night === "overflow" ? "Cover the chute" : "To the carpet"}
            onAction={() => {
              gesture();
              tone(260, 0.08, "triangle", 0.04);
              api.beginNight();
            }}
            onBack={() => {
              gesture();
              api.backToSetup();
            }}
          />
        )
      ) : null}
      {hud.menu && runLive ? (
        <PauseMenu api={api} muted={muted} music={music} onMute={toggleMute} onMusic={toggleMusic} onGesture={gesture} />
      ) : null}
    </main>
  );
}

const NIGHT_LABEL: Record<Hud["night"], string> = { midnight: "Midnight", overflow: "The Overflow", endless: "Endless" };
const DOOR_LABEL: Record<Hud["alliance"], string> = {
  accept: "you let him in",
  betray: "you shot first",
  reject: "you sent him away",
  none: "door not answered",
};

/** One line for the Title's Continue: night, map or door answer, keeper, difficulty, bookmark. */
function setupSummary(hud: Hud) {
  const where = hud.night === "overflow" ? DOOR_LABEL[hud.alliance] : BOARDS[hud.map].name;
  const level = DIFFICULTIES.find((d) => d.id === hud.difficulty)?.name ?? "";
  const parts = [NIGHT_LABEL[hud.night], where, KEEPER_NAMES[hud.hero ?? "mynxi"].name, `${level} difficulty`];
  if (hud.bookmark) parts.push(BOOKMARK[hud.bookmark].name);
  return parts.join(" · ");
}

/** Resume / Settings / Restart night / Leave to title. Restart and Leave ask first. */
function PauseMenu({
  api,
  muted,
  music,
  onMute,
  onMusic,
  onGesture,
}: {
  api: ReturnType<typeof createWorld>;
  muted: boolean;
  music: boolean;
  onMute: () => void;
  onMusic: () => void;
  onGesture: () => void;
}) {
  const hud = api.world.hud;
  const [confirm, setConfirm] = useState<"restart" | "leave" | null>(null);
  const view = hud.menu === "settings" ? "settings" : confirm ?? "pause";
  const wave = hud.waveCount ? `Wave ${Math.min(hud.wave, hud.waveCount)} of ${hud.waveCount}` : `Wave ${hud.wave}`;

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink/80 p-4 backdrop-blur-[2px]">
      <Dialog
        key={view}
        labelledBy="pause-title"
        className="max-h-full w-full max-w-xs overflow-y-auto rounded-md border border-[#d7b56a]/70 bg-[#100c0e]/95 px-4 py-5 text-center shadow-[inset_0_0_0_1px_rgba(215,181,106,0.22)] outline-none"
      >
        {view === "pause" ? (
          <>
            <p id="pause-title" className="font-display text-2xl font-semibold text-[#f6e7b4]">Paused</p>
            <p className="mt-1 text-sm text-muted">
              {NIGHT_LABEL[hud.night]} · {BOARDS[hud.map].name} · {wave}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <MenuButton gold onClick={() => { onGesture(); api.closeMenu(); }}>
                Resume
              </MenuButton>
              <MenuButton onClick={() => { onGesture(); api.menuSettings(true); }}>Settings</MenuButton>
              <MenuButton onClick={() => { onGesture(); setConfirm("restart"); }}>Restart night</MenuButton>
              <MenuButton onClick={() => { onGesture(); setConfirm("leave"); }}>Leave to title</MenuButton>
            </div>
          </>
        ) : null}

        {view === "restart" || view === "leave" ? (
          <>
            <p id="pause-title" className="font-display text-2xl font-semibold text-[#f6e7b4]">
              {view === "restart" ? "Restart from wave 1?" : "Leave to the title?"}
            </p>
            <p className="mt-2 text-sm text-[#f4ead8]">This run's progress is lost. Your setup is kept.</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <MenuButton onClick={() => { onGesture(); setConfirm(null); }}>
                Keep playing
              </MenuButton>
              <MenuButton
                gold
                onClick={() => {
                  onGesture();
                  if (view === "restart") api.restartNight();
                  else api.toTitle();
                }}
              >
                {view === "restart" ? "Restart night" : "Leave to title"}
              </MenuButton>
            </div>
          </>
        ) : null}

        {view === "settings" ? (
          <>
            <p id="pause-title" className="font-display text-2xl font-semibold text-[#f6e7b4]">Settings</p>
            <div className="mt-3">
              <SettingsPanel api={api} muted={muted} music={music} onMute={onMute} onMusic={onMusic} onGesture={onGesture} />
            </div>
            <div className="mt-4">
              <MenuButton onClick={() => { onGesture(); api.menuSettings(false); }}>Back</MenuButton>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
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
  catalogue: "Catalogue",
  cauldron: "Cauldron",
  trebuchet: "Trebuchet",
  scales: "Scales",
  mimic: "Memec",
  lectern: "Lectern",
};

function describeStats(kind: TowerKind, read: { dmg: number; range: number; interval: number; lit?: boolean }) {
  const tiles = read.range >= 900 ? "whole board" : `${(read.range / 48).toFixed(1)} tiles`;
  const lit = read.lit ? " · lit" : "";
  if (kind === "compost") return "No shot · pays seeds every wave";
  if (kind === "lectern") return `No shot · boosts damage within ${tiles}, more each wave`;
  if (kind === "mimic") return `Swallows one fruit · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "scales") return `DMG ${read.dmg} + ${Math.round(CANNON.scalesShare * 100)}% of max health · ${tiles} · ${read.interval.toFixed(1)}s`;
  if (kind === "catalogue") return `DMG ${read.dmg} · chains ×${CANNON.catalogueChains} · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "lantern") return `Boosts cannons within ${tiles}`;
  if (kind === "bell") return `Stun · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  if (kind === "still") return `No shot · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
  return `DMG ${read.dmg} · ${tiles} · ${read.interval.toFixed(1)}s${lit}`;
}

function TowerInspector({
  api,
  onGesture,
  roomPrice,
  phase,
}: {
  api: ReturnType<typeof createWorld>;
  onGesture: () => void;
  roomPrice: number;
  phase: World["hud"]["phase"];
}) {
  const hud = api.world.hud;
  const tower = api.world.towers.find((t) => t.id === hud.selected);
  if (!tower) return null;
  const read = api.statsOf(tower.id) ?? towerReadout(hud.hero, tower.kind, tower.mods, hud.upgrades);
  const canFit = MODS.some((m) => m.kinds.includes(tower.kind) && !tower.mods.includes(m.id));
  return (
    <div className="relative flex h-[5.5rem] items-center gap-3 rounded-lg border border-[#c6a15a]/60 bg-[#241418] py-1.5 pr-9 pl-3">
      <TowerIcon kind={tower.kind} className="h-12 w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg leading-none font-semibold">{TOWERS[tower.kind].name}</p>
        <p className="mt-1 truncate text-[10px] tracking-[0.16em] text-gold uppercase">
          {TYPE_INFO[TOWER_TYPE[tower.kind]].name} · {TOWERS[tower.kind].role}
        </p>
        <p className="mt-1 truncate text-xs text-muted sm:text-sm">
          {describeStats(tower.kind, read)}
        </p>
        <p className="mt-0.5 h-4 truncate text-xs text-gold">{tower.mods.map((id) => MODS.find((m) => m.id === id)?.name).join(" · ")}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        {tower.mods.length < 2 && canFit ? (
          <button
            type="button"
            title={phase === "prep" ? "Back room (B)" : "The back room opens between waves"}
            disabled={phase !== "prep" || hud.seeds < roomPrice}
            className="h-9 rounded-lg border border-[#c6a15a] px-3 text-sm disabled:opacity-40"
            onClick={() => {
              onGesture();
              tone(200, 0.06, "triangle", 0.03);
              api.openShop();
            }}
          >
            {phase === "prep" ? `Back room ${roomPrice}` : "Between waves"}
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
          Sell {sellValue(tower.paid)}
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

function TitleScreen({
  settings,
  onStart,
  onKeeper,
  saved,
  summary,
  note,
  onInstall,
  onQuit,
}: {
  settings: ReactNode;
  /** Shown when the browser can install the game as an app. */
  onInstall?: () => void;
  /** Desktop app only: close the window. */
  onQuit?: () => void;
  saved: boolean;
  summary: string;
  note: string;
  onStart: () => void;
  onKeeper: () => void;
}) {
  const [view, setView] = useState<"menu" | "howto" | "settings">("menu");
  const startRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Focus the main button whenever the menu shows, so Enter starts and arrows have a place to begin.
  useEffect(() => {
    if (view === "menu") startRef.current?.focus({ preventScroll: true });
  }, [view]);
  // Esc on a sub-card returns to the menu.
  useEffect(() => {
    if (view === "menu") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setView("menu");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);
  // Up / Down move between the menu buttons, wrapping at the ends.
  const onMenuKey = (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...(menuRef.current?.querySelectorAll("button") ?? [])];
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(at < 0 ? 0 : at + step + items.length) % items.length].focus();
  };
  return (
    <div className="absolute inset-0 z-20 bg-black">
      <img src={asset("sprites/screen-title.webp")} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute top-[43%] left-1/2 w-[min(20.5rem,74vw)] -translate-x-1/2">
        {view === "menu" ? (
          <div ref={menuRef} className="flex flex-col gap-2.5" role="group" aria-label="Main menu" onKeyDown={onMenuKey}>
            <MenuButton gold ref={startRef} onClick={onStart}>
              {saved ? "Continue" : "Start"}
            </MenuButton>
            <p className="-mt-1 rounded bg-black/55 px-2 py-1 text-center text-xs leading-snug text-[#f4ead8]">
              {summary}
              {note ? <span className="mt-0.5 block text-gold">{note}</span> : null}
            </p>
            <MenuButton onClick={onKeeper}>New night</MenuButton>
            <MenuButton onClick={() => setView("howto")}>How to play</MenuButton>
            <MenuButton onClick={() => setView("settings")}>Settings</MenuButton>
            {onInstall ? <MenuButton onClick={onInstall}>Install app</MenuButton> : null}
            {onQuit ? <MenuButton onClick={onQuit}>Quit</MenuButton> : null}
          </div>
        ) : null}
      </div>
      {view !== "menu" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
          {view === "howto" ? (
            <MenuCard title="How to play" onBack={() => setView("menu")} wide>
              <HowToPlay />
            </MenuCard>
          ) : null}
          {view === "settings" ? (
            <MenuCard title="Settings" onBack={() => setView("menu")}>
              {settings}
            </MenuCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuCard({ title, onBack, wide, children }: { title: string; onBack: () => void; wide?: boolean; children: ReactNode }) {
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

/** Title › How to play: controls, cannon tabs, keepers, nights and rooms. */
function HowToPlay() {
  const h = "mt-4 mb-1 text-[10px] tracking-[0.22em] text-gold uppercase first:mt-0";
  return (
    <div className="text-left">
      <p className={h}>The basics</p>
      <p>
        Produce walks the carpet. Build cannons on the floor beside it; anything that reaches the far end costs a stack.
        Kills pay seeds. A story night is {WAVE_COUNT} waves, with an upgrade pick now and then.
      </p>
      <p className="mt-1">
        Tap a cannon to see its stats, sell it, or (between waves) fit it in the back room. Esc or the ☰ button pauses.
      </p>

      <p className={h}>Tower types</p>
      <p className="text-muted">The tabs say what a tower is for. Its type says how it does damage, and which shared upgrades change it. Every upgrade card says what it affects.</p>
      <ul className="mt-1 space-y-1">
        {(Object.keys(TYPE_INFO) as Array<keyof typeof TYPE_INFO>).map((t) => (
          <li key={t}>
            <span className="font-semibold text-parchment">{TYPE_INFO[t].name}:</span> <span className="text-muted">{TYPE_INFO[t].blurb}</span>
          </li>
        ))}
      </ul>

      <p className={h}>Cannons</p>
      <ul className="space-y-1">
        {TOWER_GROUPS.map((g) => (
          <li key={g.id}>
            <span className="font-semibold text-parchment">
              {g.name} ({g.key.toUpperCase()}):
            </span>{" "}
            <span className="text-muted">
              {g.kinds.map((k) => `${TOWERS[k].name} (${TYPE_INFO[TOWER_TYPE[k]].name.toLowerCase()}, ${TOWERS[k].role.toLowerCase()})`).join(", ")}
            </span>
          </li>
        ))}
      </ul>

      <p className={h}>Keeper towers (R)</p>
      <p className="text-muted">Each keeper has one tower only they can build, one at a time.</p>
      <ul className="mt-1 space-y-1">
        {KEEPERS.map((k) => (
          <li key={k.id}>
            <span className="font-semibold text-parchment">
              {TOWERS[SIGNATURE[k.id]].name} ({k.name}):
            </span>{" "}
            <span className="text-muted">{TOWERS[SIGNATURE[k.id]].blurb}</span>
          </li>
        ))}
      </ul>

      <p className={h}>Keepers</p>
      <ul className="space-y-1">
        {KEEPERS.map((k) => (
          <li key={k.id}>
            <span className="font-semibold text-parchment">{k.name}:</span>{" "}
            <span className="text-muted">{k.traits.map((t) => t.text).join(", ")}.</span>
          </li>
        ))}
      </ul>

      <p className={h}>Nights</p>
      <ul className="space-y-1 text-muted">
        <li>
          <span className="font-semibold text-parchment">Midnight:</span> the first night. A knight comes to the door, and what you
          answer changes the rest of it.
        </li>
        <li>
          <span className="font-semibold text-parchment">The Overflow:</span> night two, under the returns chute. Your answer to the
          knight decides who is waiting. Take up to three late slips for a harder night and more keeper XP.
        </li>
        <li>
          <span className="font-semibold text-parchment">Endless:</span> no knight and no last wave. Survive as long as you can.
        </li>
      </ul>

      <p className={h}>Rooms</p>
      <ul className="space-y-1">
        {PICKABLE_MAPS.map((id) => (
          <li key={id}>
            <span className="font-semibold text-parchment">{BOARDS[id].name}:</span>{" "}
            <span className="text-muted">
              {BOARDS[id].blurb}
              {MAP_GOALS[id] ? ` Unlock: ${MAP_GOALS[id]!.goal}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <p className={h}>Keys</p>
      <p className="text-muted">{HOTKEY_HELP}</p>
    </div>
  );
}

/** One Settings panel for the Title and the pause menu. */
function SettingsPanel({
  api,
  muted,
  music,
  onMute,
  onMusic,
  onGesture,
}: {
  api: ReturnType<typeof createWorld>;
  muted: boolean;
  music: boolean;
  onMute: () => void;
  onMusic: () => void;
  onGesture: () => void;
}) {
  const [tipsReset, setTipsReset] = useState(false);
  const speed = api.world.hud.speed;
  const reduced = api.world.reduced;
  const label = "mb-1 text-[10px] tracking-[0.22em] text-gold uppercase";
  return (
    <div className="flex flex-col gap-2.5 text-center">
      <MenuButton onClick={onMute}>{muted ? "Sound: off" : "Sound: on"}</MenuButton>
      <MenuButton onClick={onMusic}>{music ? "Music: on" : "Music: off"}</MenuButton>
      <div>
        <p className={label}>Game speed</p>
        <div className="grid grid-cols-4 overflow-hidden rounded-[5px] border border-[#e2c78a]/85" role="radiogroup" aria-label="Game speed">
          {SPEEDS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={speed === v}
              className={`min-h-10 text-sm font-semibold ${speed === v ? "bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] text-[#24160e]" : "bg-[#100c10]/80 text-[#f6efe2]"}`}
              onClick={() => {
                onGesture();
                api.setSpeed(v);
              }}
            >
              {v}×
            </button>
          ))}
        </div>
      </div>
      <MenuButton
        onClick={() => {
          onGesture();
          api.setReduced(!reduced);
        }}
      >
        {reduced ? "Reduce motion: on" : "Reduce motion: off"}
      </MenuButton>
      <MenuButton
        onClick={() => {
          onGesture();
          save(TUTORIAL_KEY, "");
          save(CHUTE_TIP_KEY, "");
          setTipsReset(true);
        }}
      >
        Show tips again
      </MenuButton>
      {tipsReset ? (
        <p className="text-xs text-gold" role="status">
          Tips will show on your next night.
        </p>
      ) : null}
      <p className="text-xs text-muted">Keys: {HOTKEY_HELP}</p>
    </div>
  );
}

function MenuButton({
  gold,
  onClick,
  children,
  ref,
}: {
  gold?: boolean;
  onClick: () => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={
        gold
          ? "relative min-h-12 w-full rounded-[5px] bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] font-display text-[1.35rem] font-semibold tracking-wide text-[#24160e] shadow-[inset_0_1px_0_rgba(255,248,220,0.75)]"
          : "relative min-h-11 w-full rounded-[5px] border border-[#e2c78a]/85 bg-[#100c10]/80 font-display text-lg tracking-wide text-[#f6efe2] shadow-[inset_0_0_0_1px_rgba(226,199,138,0.28)]"
      }
    >
      <span
        className={`pointer-events-none absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rotate-45 ${gold ? "bg-[#24160e]/80" : "border border-[#e2c78a]"}`}
      />
      <span
        className={`pointer-events-none absolute top-1/2 right-3 size-1.5 -translate-y-1/2 rotate-45 ${gold ? "bg-[#24160e]/80" : "border border-[#e2c78a]"}`}
      />
      {children}
    </button>
  );
}

const ROOM_JOKE: Partial<Record<MapId, string>> = {
  stacks: "The library is closed. The melons have a reservation.",
  annex: "The carpet folded. Nobody told the corn.",
  mezzanine: "The balcony creaks. The melons like the view.",
  rarebooks: "Please do not touch the first editions. The pumpkins did not read the sign.",
  archive: "Somebody turned the lights off. Somebody round and green.",
  overflow: "The chute is open. The returns have opinions.",
};

/** Map banners; any map without one is drawn by MapPreview. */
const MAP_ART: Partial<Record<MapId, string>> = {
  stacks: asset("sprites/screen-stacks.webp"),
  annex: asset("sprites/screen-annex.webp"),
  mezzanine: asset("sprites/screen-mezzanine.webp"),
  rarebooks: asset("sprites/screen-rarebooks.webp"),
  archive: asset("sprites/screen-archive.webp"),
  overflow: asset("sprites/screen-overflow.webp"),
};

function RoomScreen({
  src,
  dim = false,
  kicker,
  title,
  joke,
  action,
  onAction,
  onBack,
}: {
  src: string;
  dim?: boolean;
  kicker: string;
  title: string;
  joke: string;
  action: string;
  onAction: () => void;
  onBack: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20">
      <img src={src} alt="" className={`absolute inset-0 h-full w-full object-cover object-center ${dim ? "brightness-[0.35]" : ""}`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,4,6,0.2)_0%,rgba(8,4,6,0)_40%,rgba(8,4,6,0.88)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-8 text-center">
        <p className="text-xs tracking-[0.28em] text-gold uppercase">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm">{joke}</p>
        <button
          type="button"
          className="mt-5 min-h-12 w-full max-w-xs rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink"
          onClick={onAction}
        >
          {action}
        </button>
        <button
          type="button"
          className="mt-3 block w-full text-sm text-muted underline-offset-4 hover:text-parchment hover:underline"
          onClick={onBack}
        >
          Back to setup
        </button>
      </div>
    </div>
  );
}

const KEEPERS: Array<{
  id: HeroId;
  name: string;
  role: string;
  flavor: string;
  toneHz: number;
  portrait: string;
  filter: string;
  traits: Array<{ icon: "coins" | "aim" | "heart"; text: string }>;
}> = [
  {
    id: "mynxi",
    name: "Mynxi",
    role: "Head librarian",
    flavor: "She files the disaster while it is still happening.",
    toneHz: 300,
    portrait: asset("sprites/portrait-mynxi.webp"),
    filter: "sepia(0.22) saturate(0.82) contrast(1.05)",
    traits: [
      { icon: "coins", text: "First build is 40 seeds" },
      { icon: "aim", text: "Cannons reach farther" },
      { icon: "heart", text: "12 stacks" },
    ],
  },
  {
    id: "vael",
    name: "Vaelithra",
    role: "Potions division",
    flavor: "The formula slows them. It does not apologize.",
    toneHz: 250,
    portrait: asset("sprites/portrait-vael.webp"),
    filter: "sepia(0.48) saturate(0.72) brightness(0.92) hue-rotate(-10deg)",
    traits: [
      { icon: "aim", text: "Shots slow the line" },
      { icon: "coins", text: "Damage stays ordinary" },
      { icon: "heart", text: "11 stacks, 120 seeds" },
    ],
  },
  {
    id: "michael",
    name: "Sir Michael",
    role: "Pumpkin Knight",
    flavor: "His cannon is already on the floor. So is the grudge.",
    toneHz: 220,
    portrait: asset("sprites/portrait-michael.webp"),
    filter: "sepia(0.28) saturate(0.78) brightness(0.96)",
    traits: [
      { icon: "aim", text: "One cannon already set" },
      { icon: "coins", text: "Shots hit harder" },
      { icon: "heart", text: `${BALANCE.michaelLives} stacks, ${BALANCE.michaelSeeds} seeds` },
    ],
  },
  {
    id: "elf",
    name: "Legal Elf",
    role: "Legal advisor",
    flavor: "Witty, confident, sharp. Objects to fruit on principle.",
    toneHz: 330,
    portrait: asset("sprites/portrait-elf.webp"),
    filter: "sepia(0.2) saturate(0.85) contrast(1.05)",
    traits: [
      { icon: "coins", text: "Back room costs 30% less" },
      { icon: "aim", text: "Ordinary shots" },
      { icon: "heart", text: `${KEEPER_START.elf!.lives} stacks, ${KEEPER_START.elf!.seeds} seeds` },
    ],
  },
  {
    id: "ooze",
    name: "Ooze Clues",
    role: "Astral adventurer",
    flavor: "The world is a game, and she is here to 100% it.",
    toneHz: 360,
    portrait: asset("sprites/portrait-ooze.webp"),
    filter: "sepia(0.22) saturate(0.8) contrast(1.04)",
    traits: [
      { icon: "heart", text: "First leak each wave is absorbed" },
      { icon: "aim", text: "Ordinary shots" },
      { icon: "coins", text: `${KEEPER_START.ooze!.lives} stacks, ${KEEPER_START.ooze!.seeds} seeds` },
    ],
  },
  {
    id: "scholar",
    name: "Dr. Samodovol",
    role: "The Scholar",
    flavor: "History is not a collection of victories. It is a collection of lessons.",
    toneHz: 200,
    portrait: asset("sprites/portrait-scholar.webp"),
    filter: "sepia(0.3) saturate(0.8) brightness(0.95)",
    traits: [
      { icon: "aim", text: "Upgrade picks show 4 choices" },
      { icon: "coins", text: "Ordinary shots" },
      { icon: "heart", text: `${KEEPER_START.scholar!.lives} stacks, ${KEEPER_START.scholar!.seeds} seeds` },
    ],
  },
];

function SelectScreen({
  api,
  onGesture,
}: {
  api: ReturnType<typeof createWorld>;
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
                ? `No knight, no last wave. Your best: ${hud.endlessBest} wave${hud.endlessBest === 1 ? "" : "s"}.`
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
                  const art = MAP_ART[id];
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
                        {art ? (
                          <img src={art} alt="" className={`block h-16 w-full object-cover sm:h-20 ${locked ? "opacity-30 grayscale" : ""}`} />
                        ) : (
                          <MapPreview map={id} className={`block h-16 w-full sm:h-20 ${locked ? "opacity-30 grayscale" : ""}`} />
                        )}
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
                        <span className="mt-1.5 block text-xs text-gold">Tower: {TOWERS[SIGNATURE[hero.id]].name}</span>
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
                  <p className="mt-1 text-xs text-gold">Tower: {TOWERS[SIGNATURE[chosen.id]].name}. {TOWERS[SIGNATURE[chosen.id]].blurb}</p>
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

function Overlay({
  hudPhase,
  api,
  onGesture,
}: {
  hudPhase: World["hud"]["phase"];
  api: ReturnType<typeof createWorld>;
  onGesture: () => void;
}) {
  const hud = api.world.hud;
  return (
    // While the pause menu sits on top, the card underneath is inert: one modal dialog at a time.
    <div className="absolute inset-0 flex items-center justify-center bg-ink/75 p-4" inert={hud.menu != null}>
      <Dialog key={hudPhase} labelledBy="card-title" className="max-h-full w-full max-w-md overflow-auto rounded-xl border border-line bg-panel p-5 outline-none">
        {hudPhase === "shop" ? (
          <>
            <h2 id="card-title" className="font-display text-2xl font-semibold">The back room</h2>
            <p className="mt-1 text-sm text-muted">
              {backRoomPrice(hud.hero, hud.shopVisits, hud.bookmark) || "Free, this once"}{backRoomPrice(hud.hero, hud.shopVisits, hud.bookmark) ? " seeds" : ""}. It fits this cannon only, and a cannon holds two.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {hud.modOffer.map((mod, i) => (
                <button
                  key={mod.id}
                  type="button"
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-panel-2 px-4 py-3 text-left"
                  onClick={() => {
                    onGesture();
                    tone(280, 0.08, "triangle", 0.04);
                    api.pickMod(mod.id);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{mod.name}</span>
                    <span className="mt-1 block text-sm text-muted">{mod.blurb}</span>
                  </span>
                  <kbd className="ml-auto hidden shrink-0 rounded border border-line px-1.5 font-sans text-[11px] text-muted sm:block">{i + 1}</kbd>
                </button>
              ))}
              <button
                type="button"
                className="min-h-11 rounded-xl border border-line px-4 py-3"
                onClick={() => {
                  onGesture();
                  api.closeShop();
                }}
              >
                Not now <span className="ml-1 hidden text-xs text-muted sm:inline">Esc</span>
              </button>
            </div>
          </>
        ) : null}

        {hudPhase === "upgrade" ? (
          <>
            <h2 id="card-title" className="font-display text-2xl font-semibold">Between the waves</h2>
            <p className="mt-1 text-sm text-muted">
              {hud.night === "overflow" && hud.upgrades.length >= 2
                ? "One more shelf. Then the meter starts spending."
                : hud.upgrades.length >= 2
                  ? "One more shelf. Then the door you chose comes due."
                  : hud.branch
                    ? "The last pick opened this shelf. It lasts the rest of the run."
                    : `${KEEPER_NAMES[hud.hero ?? "mynxi"].short} picks first. It lasts the rest of the run.`}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {hud.offer.map((u, i) => {
                const forKind = (Object.keys(CANNON_UPGRADES) as TowerKind[]).find((k) => CANNON_UPGRADES[k] === u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-panel-2 px-4 py-3 text-left"
                    onClick={() => {
                      onGesture();
                      tone(360, 0.09, "triangle", 0.04);
                      api.pickUpgrade(u.id as UpgradeId);
                    }}
                  >
                    {forKind ? <TowerIcon kind={forKind} className="h-10 w-10 shrink-0" /> : null}
                    <span className="min-w-0">
                      <span className="block font-semibold">{u.name}</span>
                      <span className="mt-1 block text-sm text-muted">{u.blurb}</span>
                      <span className="mt-1 block text-[11px] tracking-wide text-gold uppercase">Affects: {upgradeTargetLabel(u.id as UpgradeId)}</span>
                    </span>
                    <kbd className="ml-auto hidden shrink-0 rounded border border-line px-1.5 font-sans text-[11px] text-muted sm:block">{i + 1}</kbd>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {hudPhase === "alliance" ? (
          <>
            <div className="flex items-start gap-3">
              <img
                src={asset("sprites/portrait-michael.webp")}
                alt=""
                className="size-16 shrink-0 rounded-xl object-cover"
              />
              <h2 id="card-title" className="font-display text-2xl font-semibold">
                {hud.hero === "michael" ? "Your own men are at the door" : "Sir Michael is at the door"}
              </h2>
            </div>
            <p className="mt-3 text-sm text-muted">
              {hud.hero === "michael"
                ? "They will cover the west shelves for one wave. You have read this plot."
                : hud.hero === "vael"
                  ? "She has already priced his loyalty. He will lend cannons for one wave."
                  : hud.hero === "elf"
                    ? "He offers cannons for one wave. The Legal Elf has read the contract, and the fine print has teeth."
                    : hud.hero === "ooze"
                      ? "A side quest! He will lend cannons for one wave. Memec does not trust him."
                      : hud.hero === "scholar"
                        ? "He will lend cannons for one wave. The Doctor knows how alliances like this end in the history books."
                        : "The Pumpkin Knight will lend cannons for the next wave. Mynxi has read this plot before."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="min-h-11 rounded-xl bg-rind px-4 py-3 font-semibold text-ink"
                onClick={() => {
                  onGesture();
                  api.chooseAlliance("accept");
                }}
              >
                Accept the alliance <span className="ml-1 hidden text-xs opacity-60 sm:inline">1</span>
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl bg-flesh px-4 py-3 font-semibold text-parchment"
                onClick={() => {
                  onGesture();
                  api.chooseAlliance("betray");
                }}
              >
                Betray him now <span className="ml-1 hidden text-xs opacity-60 sm:inline">2</span>
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-line px-4 py-3"
                onClick={() => {
                  onGesture();
                  api.chooseAlliance("reject");
                }}
              >
                Send him away <span className="ml-1 hidden text-xs opacity-60 sm:inline">3</span>
              </button>
            </div>
          </>
        ) : null}

        {hudPhase === "betrayal" ? (
          <>
            <div className="flex items-start gap-3">
              <img
                src={asset("sprites/portrait-michael.webp")}
                alt=""
                className="size-16 shrink-0 rounded-xl object-cover"
              />
              <h2 id="card-title" className="font-display text-2xl font-semibold">He turned.</h2>
            </div>
            <p className="mt-3 text-sm text-muted">
              {hud.hero === "michael"
                ? `The allied cannons are scrap. ${stacksWord(BALANCE.michaelTurnCut)} stacks go with them.`
                : "The allied cannons are scrap. Two stacks go with them, and his pumpkins are already on the carpet."}
            </p>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl bg-flesh px-4 py-3 font-semibold text-parchment"
              onClick={() => {
                onGesture();
                api.startWave();
              }}
            >
              Brace <span className="ml-1 hidden text-xs font-normal opacity-70 sm:inline">Enter</span>
            </button>
          </>
        ) : null}

        {hudPhase === "consequence" ? (
          <>
            <p className="text-xs tracking-wide text-gold uppercase">The choice comes due</p>
            <h2 id="card-title" className="mt-1 font-display text-2xl font-semibold">{hud.waveName}</h2>
            <p className="mt-3 text-sm text-muted">{hud.blurb}</p>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl bg-flesh px-4 py-3 font-semibold text-parchment"
              onClick={() => {
                onGesture();
                api.startWave();
              }}
            >
              Face it <span className="ml-1 hidden text-xs font-normal opacity-70 sm:inline">Enter</span>
            </button>
          </>
        ) : null}

        {hudPhase === "memory" ? (
          <>
            <p className="text-xs tracking-wide text-gold uppercase">The door stays shut</p>
            <h2 id="card-title" className="mt-1 font-display text-2xl font-semibold">No visitor</h2>
            <p className="mt-3 text-sm text-muted">{doorMemory(hud.alliance)}</p>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl bg-rind px-4 py-3 font-semibold text-ink"
              onClick={() => {
                onGesture();
                api.ackMemory();
              }}
            >
              The chute is next <span className="ml-1 hidden text-xs font-normal opacity-70 sm:inline">Enter</span>
            </button>
          </>
        ) : null}

        {hudPhase === "victory" ? (
          <EndCard
            title={hud.night === "overflow" ? "The chute holds." : "The stacks hold."}
            body={`${hud.blurb} Absurdity ${hud.absurdity}. ${
              hud.hero === "michael"
                ? "Sir Michael kept the door. Barely."
                : hud.hero === "vael"
                  ? "Vael files the result. The formula held."
                  : hud.hero === "elf"
                    ? "Case closed. The Legal Elf bills the produce for his time."
                    : hud.hero === "ooze"
                      ? "Quest complete. Memec is still chewing."
                      : hud.hero === "scholar"
                        ? "The Doctor writes it down. History will remember this one."
                        : "Mynxi is filing this under accidents that worked."
            }`}
            action={hud.night === "midnight" ? "Continue to the Overflow" : hud.night === "overflow" ? "Set up Endless" : "Play again"}
            unlocks={hud.newUnlocks}
            maps={hud.newMaps}
            hud={hud}
            onAction={() => {
              onGesture();
              if (hud.night === "midnight") api.continueOverflow();
              else if (hud.night === "overflow") api.tryEndless();
              else api.restartNight();
            }}
            more={[
              ...(hud.night === "endless" ? [] : [{ label: "Play again", run: api.restartNight }]),
              { label: "Change setup", run: api.reset },
              { label: "Title", run: api.toTitle },
            ]}
            onGesture={onGesture}
          />
        ) : null}

        {hudPhase === "defeat" ? (
          <EndCard
            title="The carpet won."
            body={
              hud.night === "endless"
                ? `You held ${hud.wave - 1} wave${hud.wave === 2 ? "" : "s"}. Your endless best is ${hud.endlessBest}. The produce does not send condolences.`
                : `You cleared ${hud.best} wave${hud.best === 1 ? "" : "s"} at best. The produce does not send condolences.`
            }
            action="Try again"
            unlocks={hud.newUnlocks}
            maps={hud.newMaps}
            hud={hud}
            onAction={() => {
              onGesture();
              api.restartNight();
            }}
            more={[
              { label: "Change setup", run: api.reset },
              { label: "Title", run: api.toTitle },
            ]}
            onGesture={onGesture}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function EndCard({
  title,
  body,
  action,
  onAction,
  unlocks = [],
  maps = [],
  more = [],
  hud,
  onGesture,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  unlocks?: BookmarkId[];
  maps?: MapId[];
  /** Secondary buttons under the main one. */
  more?: Array<{ label: string; run: () => void }>;
  /** For the XP earned this run. */
  hud?: Hud;
  onGesture: () => void;
}) {
  return (
    <>
      <h2 id="card-title" role="status" className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
      {hud ? <XpSummary hud={hud} /> : null}
      <NewUnlocks ids={unlocks} maps={maps} />
      <button
        type="button"
        data-autofocus
        className="mt-4 min-h-11 w-full rounded-xl bg-rind px-4 py-3 font-semibold text-ink"
        onClick={onAction}
      >
        {action}
        <span className="ml-2 hidden text-xs font-normal opacity-70 sm:inline">Enter</span>
      </button>
      {more.length ? (
        <div className={`mt-2 grid gap-2 ${more.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {more.map((b) => (
            <button
              key={b.label}
              type="button"
              className="min-h-11 rounded-xl border border-line px-2 py-2 text-sm"
              onClick={() => {
                onGesture();
                b.run();
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
