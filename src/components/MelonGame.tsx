import { asset } from "@/lib/asset";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, Heart, Coins, Pause, Play, Volume2, VolumeX, Crosshair, X, Music } from "lucide-react";
import {
  BOARDS,
  DIFFICULTIES,
  MODS,
  TOWERS,
  buildCost,
  doorMemory,
  sellValue,
  shopPrice,
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
  BALANCE,
  stacksWord,
} from "@/game/engine";
import { drawWorld } from "@/game/draw";
import { isMusicOn, isMuted, playSfx, setMusicMode, setMusicOn, setMuted, tone, unlockAudio } from "@/game/audio";
import { useHotkeys } from "@/components/hotkeys";
import { TutorialHint } from "@/components/TutorialHint";

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

  const phase = hud.phase;
  const showPlace = phase === "prep" || phase === "combat";
  const selected = hud.selected == null ? null : (api.world.towers.find((t) => t.id === hud.selected) ?? null);
  const roomPrice = shopPrice(hud.hero, hud.shopVisits);

  return (
    <main className="relative flex h-dvh flex-col bg-ink text-parchment">
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-gold" aria-hidden="true" />
          <div className={hud.hero ? "hidden sm:block" : ""}>
            <p className="font-display text-lg leading-none font-semibold">Melongeddon</p>
            <p className="text-xs text-muted">
              {phase === "coldopen"
                ? "Tonight only"
                : hud.hero === "michael"
                  ? "Sir Michael"
                  : hud.hero === "vael"
                    ? "Vael"
                    : hud.hero === "mynxi"
                      ? "Mynxi"
                      : "Midnight Library"}
              {hud.hero ? ` · ${BOARDS[hud.map].name}${hud.night === "endless" ? " · Endless" : ""}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5 text-sm sm:gap-2">
          {hud.hero ? (
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
              </div>
            </>
          ) : phase === "select" ? (
            <span className="text-sm text-muted">Pick a keeper</span>
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
          <button
            type="button"
            className={`hidden size-11 place-items-center rounded-xl border border-line bg-panel sm:grid ${music ? "" : "opacity-45"}`}
            aria-label={music ? "Music off" : "Music on"}
            aria-pressed={music}
            title="Music"
            onClick={toggleMusic}
          >
            <Music className="size-4" />
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
        {hud.paused && phase !== "select" && phase !== "coldopen" && phase !== "poster" ? (
          <div className="pointer-events-none absolute inset-3 grid place-items-center">
            <p className="rounded-xl border border-line bg-ink/80 px-4 py-2 font-display text-xl">Paused</p>
          </div>
        ) : null}
        {phase === "prep" || phase === "combat" ? <TutorialHint api={api} /> : null}
        {phase === "select" ? <SelectScreen api={api} onGesture={gesture} /> : null}
        {phase !== "combat" && phase !== "prep" && phase !== "select" && phase !== "coldopen" && phase !== "poster" ? (
          <Overlay hudPhase={phase} api={api} onGesture={gesture} />
        ) : null}
      </div>

      {phase === "coldopen" || phase === "poster" || phase === "select" ? null : (
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
            <p className="h-4 truncate text-xs text-muted">{hud.upgrades.map((id) => UPGRADES[id].name).join(" · ")}</p>
            {selected ? (
              <TowerInspector
                api={api}
                onGesture={gesture}
                roomPrice={roomPrice}
                phase={phase}
              />
            ) : (
              <div className="grid h-[5.5rem] grid-cols-5 gap-2">
                {(Object.keys(TOWERS) as TowerKind[]).map((id) => {
                  const placed = api.world.towers.filter((t) => !t.ally).length;
                  const cost = buildCost(hud.hero, placed, id);
                  const on = hud.build === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={`${TOWERS[id].name} (${(Object.keys(TOWERS) as TowerKind[]).indexOf(id) + 1})`}
                      className={`relative h-full min-w-0 rounded-lg border px-1 py-1.5 text-center ${on ? "border-[#c6a15a] bg-[#3a242c]" : "border-line/70 bg-panel"} ${hud.seeds < cost ? "opacity-55" : ""}`}
                      onClick={() => {
                        gesture();
                        api.chooseBuild(id);
                      }}
                    >
                      <span className="absolute top-1 left-1.5 hidden text-[10px] text-muted sm:block">{(Object.keys(TOWERS) as TowerKind[]).indexOf(id) + 1}</span>
                      <img src={TOWER_ART[id]} alt="" className="mx-auto h-9 w-full object-contain" />
                      <span className="mt-1 block text-xs font-semibold">
                        {id === "mortar" ? "Mortar" : TOWERS[id].name.replace(" cannon", "")}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {cost}
                        <span className="hidden sm:inline"> · {TOWERS[id].role}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="line-clamp-2 h-8 text-xs text-muted">{hud.log}</p>
          </>
        ) : (
          <p className="text-sm text-muted">{hud.log}</p>
        )}
      </footer>
      )}
      {phase === "coldopen" ? (
        <TitleScreen
          muted={muted}
          music={music}
          onMusic={toggleMusic}
          onStart={() => {
            gesture();
            tone(220, 0.08, "triangle", 0.04);
            api.chooseHero("mynxi");
          }}
          onKeeper={() => {
            gesture();
            tone(240, 0.06, "triangle", 0.04);
            api.openLibrary();
          }}
          onMute={(next) => {
            gesture();
            setMuted(next);
            setMutedUi(next);
            tone(next ? 140 : 280, 0.06, "triangle", 0.04);
          }}
        />
      ) : null}
      {phase === "poster" ? (
        hud.night === "overflow" ? (
          <Poster
            kicker={hud.hero === "michael" ? "Pumpkin Knight" : hud.hero === "vael" ? "Potions division" : "Head librarian"}
            title="The Overflow"
            joke="The chute is open. The returns have opinions."
            action="Cover the chute"
            onAction={() => {
              gesture();
              tone(260, 0.08, "triangle", 0.04);
              api.beginNight();
            }}
          />
        ) : (
          <RoomScreen
            src={hud.map === "annex" ? asset("sprites/screen-annex.webp") : asset("sprites/screen-stacks.webp")}
            kicker={hud.hero === "michael" ? "Pumpkin Knight" : hud.hero === "vael" ? "Potions division" : "Head librarian"}
            title={hud.map === "annex" ? "The Annex" : "The Stacks"}
            joke={
              hud.map === "annex"
                ? "The carpet folded. Nobody told the corn."
                : "The library is closed. The melons have a reservation."
            }
            action="To the carpet"
            onAction={() => {
              gesture();
              tone(260, 0.08, "triangle", 0.04);
              api.beginNight();
            }}
          />
        )
      ) : null}
    </main>
  );
}

const TOWER_ART: Record<TowerKind, string> = {
  melon: asset("sprites/cannon-barrel.webp"),
  mortar: asset("sprites/pumpkin-barrel.webp"),
  still: asset("sprites/still.webp"),
  fire: asset("sprites/fire-barrel.webp"),
  freeze: asset("sprites/freeze-barrel.webp"),
};

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
  const read = towerReadout(hud.hero, tower.kind, tower.mods, hud.upgrades);
  return (
    <div className="relative flex h-[5.5rem] items-center gap-3 rounded-lg border border-[#c6a15a]/60 bg-[#241418] py-1.5 pr-9 pl-3">
      <img src={TOWER_ART[tower.kind]} alt="" className="h-12 w-12 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg leading-none font-semibold">{TOWERS[tower.kind].name}</p>
        <p className="mt-1 truncate text-[10px] tracking-[0.16em] text-gold uppercase">{TOWERS[tower.kind].role}</p>
        <p className="mt-1 truncate text-xs text-muted sm:text-sm">
          {tower.kind === "still" ? "No shot" : `DMG ${read.dmg}`} · {(read.range / 48).toFixed(1)} tiles · {read.interval.toFixed(1)}s
        </p>
        <p className="mt-0.5 h-4 truncate text-xs text-gold">{tower.mods.map((id) => MODS.find((m) => m.id === id)?.name).join(" · ")}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        {phase === "prep" && tower.mods.length < 2 ? (
          <button
            type="button"
            title="Back room (B)"
            disabled={hud.seeds < roomPrice}
            className="h-9 rounded-lg border border-[#c6a15a] px-3 text-sm disabled:opacity-40"
            onClick={() => {
              onGesture();
              tone(200, 0.06, "triangle", 0.03);
              api.openShop();
            }}
          >
            Back room {roomPrice}
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
  muted,
  music,
  onMusic,
  onStart,
  onKeeper,
  onMute,
}: {
  muted: boolean;
  music: boolean;
  onMusic: () => void;
  onStart: () => void;
  onKeeper: () => void;
  onMute: (next: boolean) => void;
}) {
  const [view, setView] = useState<"menu" | "library" | "settings" | "quit">("menu");
  return (
    <div className="absolute inset-0 z-20 bg-black">
      <img src={asset("sprites/screen-title.webp")} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute top-[43%] left-1/2 w-[min(20.5rem,74vw)] -translate-x-1/2">
        {view === "menu" ? (
          <div className="flex flex-col gap-2.5">
            <MenuButton gold onClick={onStart}>
              Start
            </MenuButton>
            <MenuButton onClick={onKeeper}>Choose Keeper</MenuButton>
            <MenuButton onClick={() => setView("library")}>Library</MenuButton>
            <MenuButton onClick={() => setView("settings")}>Settings</MenuButton>
            <MenuButton onClick={() => setView("quit")}>Quit</MenuButton>
          </div>
        ) : null}
        {view === "library" ? (
          <MenuCard title="The shelves" onBack={() => setView("menu")}>
            <p>Mynxi keeps the long shots. Vaelithra slows whatever is on the carpet. Sir Michael hits harder, and one cannon is already down.</p>
            <p className="mt-2">The Stacks are the first room. The Annex folds. The Overflow is the wet night under the chute. Endless never stops: survive as long as you can.</p>
          </MenuCard>
        ) : null}
        {view === "settings" ? (
          <MenuCard title="The hall" onBack={() => setView("menu")}>
            <p>The candles stay. The noise does not have to.</p>
            <div className="flex flex-col gap-2">
              <MenuButton onClick={() => onMute(!muted)}>{muted ? "Sound is off" : "Sound is on"}</MenuButton>
              <MenuButton onClick={onMusic}>{music ? "Music is on" : "Music is off"}</MenuButton>
            </div>
            <p className="mt-3 text-xs text-muted">Keys: 1–5 build · Space wave · S sell · B back room · Esc close · +/− speed · M sound</p>
          </MenuCard>
        ) : null}
        {view === "quit" ? (
          <MenuCard title="The doors" onBack={() => setView("menu")}>
            <p>They open inward. The produce is still in the stacks, and it is not leaving.</p>
          </MenuCard>
        ) : null}
      </div>
    </div>
  );
}

function MenuCard({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#d7b56a]/70 bg-[#100c0e]/88 px-4 py-4 text-center shadow-[inset_0_0_0_1px_rgba(215,181,106,0.22)]">
      <p className="font-display text-2xl font-semibold text-[#f6e7b4]">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-[#f4ead8]">{children}</div>
      <div className="mt-4">
        <MenuButton onClick={onBack}>Back</MenuButton>
      </div>
    </div>
  );
}

function MenuButton({ gold, onClick, children }: { gold?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
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

function RoomScreen({
  src,
  kicker,
  title,
  joke,
  action,
  onAction,
}: {
  src: string;
  kicker: string;
  title: string;
  joke: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20">
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
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
      </div>
    </div>
  );
}

function Poster({
  kicker,
  title,
  joke,
  action,
  onAction,
}: {
  kicker: string;
  title: string;
  joke: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/88 p-4">
      <div className="w-full max-w-md border-4 border-gold bg-panel px-6 py-8 text-center">
        <p className="text-xs tracking-[0.28em] text-gold uppercase">{kicker}</p>
        <h1 className="mt-3 font-display text-5xl leading-none font-semibold">{title}</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" />
        <p className="mt-4 text-lg">{joke}</p>
        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-xl bg-rind px-4 py-3 font-semibold text-ink"
          onClick={onAction}
        >
          {action}
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
];

function SelectScreen({
  api,
  onGesture,
}: {
  api: ReturnType<typeof createWorld>;
  onGesture: () => void;
}) {
  const hud = api.world.hud;
  const [keeper, setKeeper] = useState<HeroId | null>(null);
  const hard = hud.difficulty === "hard";
  const doorReady = hud.night !== "overflow" || hud.alliance !== "none";
  const ready = keeper != null && doorReady;
  const picked = "bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink";
  const idle = "bg-transparent text-parchment";

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/92 backdrop-blur-[3px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(80,40,28,0.18)_0%,rgba(8,4,6,0.78)_68%)]" />
      <div className="relative max-h-full w-full max-w-5xl overflow-auto">
        <p className="text-xs tracking-[0.28em] text-gold uppercase">Choose a keeper</p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Who holds the stacks?</h1>
        <p className="mt-4 max-w-xl text-lg">
          {hud.night === "overflow"
            ? "The first night is over. The returns came back."
            : hud.night === "endless"
              ? `No knight, no last wave. Your best: ${hud.endlessBest} wave${hud.endlessBest === 1 ? "" : "s"}.`
              : "Pick the room. Pick the keeper. The carpet does not care."}
        </p>
        <p className="mt-1 mb-6 max-w-xl text-sm text-muted">
          {hud.night === "overflow"
            ? "Say how the door ended. Then name who goes downstairs."
            : "The first cannon is the only one that comes free."}
        </p>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-gold uppercase">Night</p>
            <div className="mt-1.5 grid grid-cols-3 overflow-hidden rounded-lg border border-line/70" role="radiogroup" aria-label="Night">
              {(
                [
                  ["midnight", "Midnight"],
                  ["overflow", "The Overflow"],
                  ["endless", "Endless"],
                ] as const
              ).map(([id, label]) => {
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
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.22em] text-gold uppercase">Difficulty</p>
            <div className="mt-1.5 grid grid-cols-3 overflow-hidden rounded-lg border border-line/70" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => {
                const on = hud.difficulty === d.id;
                const menace = on && d.id === "hard";
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`min-h-11 px-2 py-2 text-sm font-semibold ${menace ? "bg-[#6a2430] text-parchment" : on ? picked : idle}`}
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
              {hard ? "Thicker fruit. They do not stroll. They arrive." : DIFFICULTIES.find((d) => d.id === hud.difficulty)?.blurb}
            </p>
          </div>
        </div>

        {hud.night === "overflow" ? (
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.22em] text-gold uppercase">How the first night ended</p>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["accept", "I let him in"],
                  ["betray", "I shot first"],
                  ["reject", "I sent him away"],
                ] as const
              ).map(([id, label]) => {
                const on = hud.alliance === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${on ? "border-[#c6a15a] bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink" : "border-line/70 text-parchment"}`}
                    onClick={() => {
                      onGesture();
                      api.setDoor(id);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-sm text-muted">{doorMemory(hud.alliance)}</p>
          </div>
        ) : (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {(Object.keys(BOARDS) as MapId[])
              .filter((id) => id !== "overflow")
              .map((id) => {
                const board = BOARDS[id];
                const on = hud.map === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`overflow-hidden rounded-lg border text-left ${on ? "border-[#c6a15a] shadow-[0_0_18px_rgba(198,161,90,0.28)]" : "border-line/70"}`}
                    onClick={() => {
                      onGesture();
                      tone(210, 0.05, "triangle", 0.03);
                      api.chooseMap(id);
                    }}
                  >
                    <img
                      src={id === "annex" ? asset("sprites/screen-annex.webp") : asset("sprites/screen-stacks.webp")}
                      alt=""
                      className="h-24 w-full object-cover"
                    />
                    <span className="block px-3 pt-2 font-display text-lg font-semibold">{board.name}</span>
                    <span className="block px-3 pb-3 text-sm text-muted">{board.blurb}</span>
                  </button>
                );
              })}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {KEEPERS.map((hero) => {
            const on = keeper === hero.id;
            return (
              <button
                key={hero.id}
                type="button"
                aria-pressed={on}
                className={`group relative flex min-h-[26rem] flex-col overflow-hidden rounded-lg border text-left transition duration-200 hover:-translate-y-1 ${
                  on
                    ? "border-[#c6a15a] shadow-[0_0_22px_rgba(226,59,74,0.35),inset_0_0_28px_rgba(198,161,90,0.22)]"
                    : "border-line/80 hover:border-[#c6a15a]"
                } bg-[linear-gradient(165deg,#3a242c_0%,#241418_48%,#161014_100%)]`}
                onClick={() => {
                  onGesture();
                  tone(hero.toneHz, 0.08, "triangle", 0.04);
                  setKeeper(hero.id);
                }}
              >
                <span className="pointer-events-none absolute top-2 left-2 size-3 border-t border-l border-[#c6a15a]" />
                <span className="pointer-events-none absolute top-2 right-2 size-3 border-t border-r border-[#c6a15a]" />
                <span className="pointer-events-none absolute bottom-2 left-2 size-3 border-b border-l border-[#c6a15a]" />
                <span className="pointer-events-none absolute right-2 bottom-2 size-3 border-r border-b border-[#c6a15a]" />
                <span className="relative h-[58%] min-h-48 overflow-hidden">
                  <img
                    src={hero.portrait}
                    alt=""
                    className="h-full w-full object-cover object-[center_18%]"
                    style={{ filter: hero.filter }}
                  />
                  <span className="absolute inset-0 bg-[linear-gradient(to_top,#241418_0%,rgba(36,20,24,0.15)_42%,rgba(90,40,28,0.18)_100%)]" />
                  <span className="absolute inset-0 shadow-[inset_0_0_24px_rgba(20,8,10,0.55)]" />
                </span>
                <span className="flex flex-1 flex-col px-4 pt-3 pb-4">
                  <span className="font-display text-2xl font-semibold">{hero.name}</span>
                  <span className="text-xs tracking-[0.16em] text-gold uppercase">{hero.role}</span>
                  <span className="mt-2 text-sm text-muted">{hero.flavor}</span>
                  <span className="mt-auto pt-3">
                    {hero.traits.map((trait) => (
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
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!ready}
          className="mt-5 min-h-12 w-full rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink disabled:opacity-40"
          onClick={() => {
            if (!keeper) return;
            onGesture();
            tone(280, 0.1, "triangle", 0.05);
            api.chooseHero(keeper);
          }}
        >
          Begin siege
        </button>
        {!doorReady ? <p className="mt-2 text-center text-sm text-muted">The chute stays shut until you say how the door ended.</p> : null}
      </div>
    </div>
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
    <div className="absolute inset-0 flex items-center justify-center bg-ink/75 p-4">
      <div className="max-h-full w-full max-w-md overflow-auto rounded-xl border border-line bg-panel p-5">
        {hudPhase === "shop" ? (
          <>
            <h2 className="font-display text-2xl font-semibold">The back room</h2>
            <p className="mt-1 text-sm text-muted">
              {shopPrice(hud.hero, hud.shopVisits)} seeds. It fits this cannon only, and a cannon holds two.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {hud.modOffer.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  className="min-h-11 rounded-xl border border-line bg-panel-2 px-4 py-3 text-left"
                  onClick={() => {
                    onGesture();
                    tone(280, 0.08, "triangle", 0.04);
                    api.pickMod(mod.id);
                  }}
                >
                  <span className="block font-semibold">{mod.name}</span>
                  <span className="mt-1 block text-sm text-muted">{mod.blurb}</span>
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
                Not now
              </button>
            </div>
          </>
        ) : null}

        {hudPhase === "upgrade" ? (
          <>
            <h2 className="font-display text-2xl font-semibold">Between the waves</h2>
            <p className="mt-1 text-sm text-muted">
              {hud.night === "overflow" && hud.upgrades.length >= 2
                ? "One more shelf. Then the meter starts spending."
                : hud.upgrades.length >= 2
                  ? "One more shelf. Then the door you chose comes due."
                  : hud.branch
                    ? "The last pick opened this shelf. It lasts the rest of the run."
                    : `${hud.hero === "michael" ? "Sir Michael" : hud.hero === "vael" ? "Vael" : "Mynxi"} picks first. It lasts the rest of the run.`}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {hud.offer.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="min-h-11 rounded-xl border border-line bg-panel-2 px-4 py-3 text-left"
                  onClick={() => {
                    onGesture();
                    tone(360, 0.09, "triangle", 0.04);
                    api.pickUpgrade(u.id as UpgradeId);
                  }}
                >
                  <span className="block font-semibold">{u.name}</span>
                  <span className="mt-1 block text-sm text-muted">{u.blurb}</span>
                </button>
              ))}
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
              <h2 className="font-display text-2xl font-semibold">
                {hud.hero === "michael" ? "Your own men are at the door" : "Sir Michael is at the door"}
              </h2>
            </div>
            <p className="mt-3 text-sm text-muted">
              {hud.hero === "michael"
                ? "They will cover the west shelves for one wave. You have read this plot."
                : hud.hero === "vael"
                  ? "She has already priced his loyalty. He will lend cannons for one wave."
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
                Accept the alliance
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl bg-flesh px-4 py-3 font-semibold text-parchment"
                onClick={() => {
                  onGesture();
                  api.chooseAlliance("betray");
                }}
              >
                Betray him now
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-line px-4 py-3"
                onClick={() => {
                  onGesture();
                  api.chooseAlliance("reject");
                }}
              >
                Send him away
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
              <h2 className="font-display text-2xl font-semibold">He turned.</h2>
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
              Brace
            </button>
          </>
        ) : null}

        {hudPhase === "consequence" ? (
          <>
            <p className="text-xs tracking-wide text-gold uppercase">The choice comes due</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{hud.waveName}</h2>
            <p className="mt-3 text-sm text-muted">{hud.blurb}</p>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl bg-flesh px-4 py-3 font-semibold text-parchment"
              onClick={() => {
                onGesture();
                api.startWave();
              }}
            >
              Face it
            </button>
          </>
        ) : null}

        {hudPhase === "memory" ? (
          <>
            <p className="text-xs tracking-wide text-gold uppercase">The door stays shut</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">No visitor</h2>
            <p className="mt-3 text-sm text-muted">{doorMemory(hud.alliance)}</p>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl bg-rind px-4 py-3 font-semibold text-ink"
              onClick={() => {
                onGesture();
                api.ackMemory();
              }}
            >
              The chute is next
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
                  : "Mynxi is filing this under accidents that worked."
            }`}
            action="Run it back"
            onAction={() => {
              onGesture();
              api.reset();
            }}
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
            onAction={() => {
              onGesture();
              api.reset();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function EndCard({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded-xl bg-rind px-4 py-3 font-semibold text-ink"
        onClick={onAction}
      >
        {action}
      </button>
    </>
  );
}
