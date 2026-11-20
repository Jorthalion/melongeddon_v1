import { useEffect, useRef, useState } from "react";
import { BOARDS, KEEPER_NAMES, createWorld, stepWorld } from "@/game/engine";
import { drawWorld } from "@/game/draw";
import { isMusicOn, isMuted, playSfx, setMusicMode, setMusicOn, setMuted, tone, unlockAudio } from "@/game/audio";
import { useHotkeys } from "@/components/hotkeys";
import { TipFit, Tips } from "@/components/TutorialHint";

import { MynxiTutor } from "@/components/MynxiTutor";
import { canInstall, isDesktopApp, onInstallChange, promptInstall } from "@/lib/install";
import { BuildFooter, GameHeader } from "@/components/GameHUD";
import { CardOverlay } from "@/components/CardPicker";
import { BackRoomTab } from "@/components/Shop";
import { PauseMenu } from "@/components/PauseMenu";
import { CheckoutPanel } from "@/components/CheckoutCard";
import { GrandCatalogue } from "@/components/GrandCatalogue";
import { ROOM_JOKE, RoomScreen, SIEGE_JOKE } from "@/components/RoomScreen";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SetupScreen } from "@/components/SetupScreen";
import { TitleScreen } from "@/components/TitleScreen";
import { setupSummary } from "@/components/ui";
import { NARROW_PX, layoutFor } from "@/lib/layout";
import { EnemyCard, type EnemyHover } from "@/components/EnemyCard";
import { useCatalogueRequest } from "@/components/catalogueLink";
import { ComingUpBar } from "@/components/ComingUpBar";
import { MenuCard } from "@/components/ui";

/** Largest uniform scale that fits the board in a w×h box, plus the offset that centers it (CSS px). */
function fitBoard(w: number, h: number, bw: number, bh: number) {
  const scale = Math.max(0.0001, Math.min(w / bw, h / bh));
  return { scale, x: (w - bw * scale) / 2, y: (h - bh * scale) / 2 };
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
  /** The fruit under the mouse (hover card). */
  const [foe, setFoe] = useState<EnemyHover | null>(null);
  /** Everything under the top bar: measured to pick the normal or the wide layout. */
  const bodyRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, rem: 16 });
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setBox((b) => (b.w === rect.width && b.h === rect.height && b.rem === rem ? b : { w: rect.width, h: rect.height, rem }));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    watch.observe(document.documentElement);
    return () => watch.disconnect();
  }, []);

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
      const rect = canvas.getBoundingClientRect();
      // The backing store follows the board's real on-screen size, so sprites stay sharp on 4K screens
      // (capped at about 4096 px wide for performance).
      const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 4096 / Math.max(1, rect.width)));
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
      const view = fitBoard(rect.width, rect.height, api.world.w, api.world.h);
      ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.x * dpr, view.y * dpr);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, api.world.w, api.world.h);
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
    const view = fitBoard(rect.width, rect.height, api.world.w, api.world.h);
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
      if (h.phase === "select" && h.setupPage === "night") api.setupPage("who");
      else if (h.phase === "select") api.backToTitle();
      else if (h.phase === "poster") api.backToSetup();
      else if (h.phase === "victory" || h.phase === "defeat") {
        /* end cards: Back does nothing, so unlocks aren't skipped by accident */
      } else if (h.menu === "settings") api.menuSettings(false);
      else if (h.menu) api.closeMenu();
      else if (h.workshop != null) api.closeShop();
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
  // The Grand Catalogue, opened from anything locked (any screen). During a wave it holds the board still.
  const [catalogueAt, closeCatalogue] = useCatalogueRequest();
  const heldForCatalogue = useRef(false);
  useEffect(() => {
    if (catalogueAt && api.world.hud.phase === "combat" && !api.world.hud.paused) {
      api.togglePause();
      heldForCatalogue.current = true;
    } else if (!catalogueAt && heldForCatalogue.current) {
      heldForCatalogue.current = false;
      if (api.world.hud.paused) api.togglePause();
    }
  }, [catalogueAt, api]);
  // Wide screens: the build bar becomes a left column and the back room docks on the right.
  const layout = layoutFor(box.w, box.h, api.world.w, api.world.h, box.rem);
  const wide = layout.mode === "wide" && showPlace;
  /** Phones: the back room button and the tips go in the bottom area, off the board. */
  const narrow = !wide && box.w < NARROW_PX;
  // The tips have one place, never over the board or the Coming up bar (see TipCard).
  const tipDock = (where: string, fit: "full" | "line") => (
    <TipFit.Provider value={fit}>
      <div data-tip-dock={where} className={`flex shrink-0 flex-col gap-1.5 empty:hidden ${where === "side" ? "pb-2" : where === "bottom" ? "px-3 pt-1.5" : "pb-1.5"}`}>
        <Tips api={api} tutorial={!hud.tutorial && !hud.guide} />
      </div>
    </TipFit.Provider>
  );

  return (
    <main className="relative flex h-dvh flex-col bg-ink text-parchment">
      <GameHeader
        api={api}
        inRun={inRun}
        showPlace={showPlace}
        menuable={menuable}
        muted={muted}
        onMute={toggleMute}
        onGesture={gesture}
        wide={wide}
      />

      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
      {wide ? (
        <aside aria-label="Build" className="flex min-h-0 shrink-0 flex-col" style={{ width: layout.left }}>
          <BuildFooter api={api} onGesture={gesture} column />
        </aside>
      ) : null}
      <div data-board-controls className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${wide ? "py-3" : "sm:px-3"}`}>
        {showPlace ? <ComingUpBar api={api} /> : null}
        {showPlace && !wide && !narrow ? tipDock("top", "line") : null}
        <canvas
          ref={canvasRef}
          className="min-h-0 w-full flex-1 touch-none bg-ink sm:rounded-xl sm:border sm:border-line"
          onPointerMove={(e) => {
            const p = toWorld(e.clientX, e.clientY);
            api.pointer(p.x, p.y, "move");
            // Mouse over a fruit: show what it is and what's on it.
            if (e.pointerType !== "mouse") return;
            let near: { id: number; d: number } | null = null;
            for (const f of api.world.enemies) {
              if (f.hp <= 0) continue;
              const d = Math.hypot(f.x - p.x, f.y - p.y);
              if (d <= f.r + 8 && (!near || d < near.d)) near = { id: f.id, d };
            }
            const box = e.currentTarget.parentElement!.getBoundingClientRect();
            setFoe(near ? { id: near.id, x: e.clientX - box.left, y: e.clientY - box.top } : null);
          }}
          onPointerLeave={() => setFoe(null)}
          onPointerDown={(e) => {
            gesture();
            const p = toWorld(e.clientX, e.clientY);
            api.pointer(p.x, p.y, "down");
            tone(240, 0.06, "square", 0.03);
          }}
        />
        {foe && showPlace && !hud.menu ? <EnemyCard api={api} hover={foe} boxW={box.w - layout.left - layout.right} /> : null}
        {hud.paused && !hud.menu && !hud.checkout && showPlace ? (
          <div className="pointer-events-none absolute inset-3 grid place-items-center">
            <p className="rounded-xl border border-line bg-ink/80 px-4 py-2 font-display text-xl">Paused</p>
          </div>
        ) : null}
        {(phase === "prep" || phase === "combat") && !hud.menu && !wide && (!narrow || hud.workshop != null) ? <BackRoomTab api={api} onGesture={gesture} /> : null}
        {phase === "select" ? <SetupScreen api={api} onGesture={gesture} /> : null}
        {phase !== "combat" && phase !== "prep" && phase !== "select" && phase !== "coldopen" && phase !== "poster" ? (
          <CardOverlay hudPhase={phase} api={api} onGesture={gesture} />
        ) : null}
        {/* Mynxi's tutorial sits above the board and any card, but under the pause menu. */}
        {phase !== "coldopen" && phase !== "select" && phase !== "poster" && !hud.menu ? <MynxiTutor api={api} onGesture={gesture} /> : null}
      </div>
      {wide ? (
        <aside aria-label="Back room column" className="relative flex min-h-0 shrink-0 flex-col py-3 pr-3" style={{ width: layout.right }}>
          {tipDock("side", "full")}
          {!hud.menu ? <BackRoomTab api={api} onGesture={gesture} docked /> : null}
        </aside>
      ) : null}
      </div>

      {showPlace && narrow ? tipDock("bottom", "line") : null}
      {showPlace && !wide ? (
        <BuildFooter
          api={api}
          onGesture={gesture}
          backRoom={narrow && !hud.menu && (phase === "prep" || phase === "combat") ? <BackRoomTab api={api} onGesture={gesture} compact /> : null}
        />
      ) : null}
      </div>
      {phase === "coldopen" ? (
        <TitleScreen
          catalogue={<GrandCatalogue api={api} onGesture={gesture} />}
          catalogueNote={hud.catalogueNote}
          onCatalogue={() => api.dismissCatalogueNote()}
          gilded={hud.cosmetics.gilded}
          settings={<SettingsPanel api={api} muted={muted} music={music} onMute={toggleMute} onMusic={toggleMusic} onGesture={gesture} />}
          saved={hud.saved}
          summary={
            hud.guideDone
              ? `${setupSummary(hud)}${hud.saved || hud.hero ? "" : ". Pick your own with New night."}`
              : "Your first night is Mynxi's tutorial: a few short lessons, then the full setup opens."
          }
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
          onTutorial={
            hud.guideDone
              ? () => {
                  gesture();
                  tone(220, 0.08, "triangle", 0.04);
                  api.startTutorial();
                }
              : undefined
          }
          guide={
            hud.guideDone
              ? undefined
              : {
                  onSkip: () => {
                    gesture();
                    api.skipGuide();
                  },
                }
          }
        />
      ) : null}
      {phase === "poster" ? (
        (
          <RoomScreen
            map={hud.map}
            kicker={hud.night === "siege" ? "Night three" : KEEPER_NAMES[hud.hero ?? "mynxi"].role}
            title={hud.night === "siege" ? "The Siege" : BOARDS[hud.map].name}
            joke={hud.night === "siege" ? SIEGE_JOKE : (ROOM_JOKE[hud.map] ?? ROOM_JOKE.stacks!)}
            action={hud.night === "overflow" ? "Cover the chute" : hud.night === "siege" ? "Hold the courtyard" : "To the carpet"}
            onAction={() => {
              gesture();
              tone(260, 0.08, "triangle", 0.04);
              api.beginNight();
            }}
            onBack={() => {
              gesture();
              api.backToSetup();
            }}
            armours={
              hud.hero === "michael"
                ? {
                    isOpen: (armour) => api.armourOpen(armour),
                    onWear: (armour) => {
                      gesture();
                      tone(260, 0.08, "triangle", 0.04);
                      api.pickArmour(armour);
                    },
                  }
                : undefined
            }
          />
        )
      ) : null}
      {hud.checkout && runLive && !hud.menu ? <CheckoutPanel api={api} onGesture={gesture} /> : null}
      {catalogueAt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <MenuCard title="Grand Catalogue" onBack={closeCatalogue} wide>
            <GrandCatalogue key={`${catalogueAt.room}:${catalogueAt.reward?.id ?? ""}`} api={api} onGesture={gesture} focus={catalogueAt.room} reward={catalogueAt.reward} inRun={runLive} />
          </MenuCard>
        </div>
      ) : null}
      {hud.menu && runLive ? (
        <PauseMenu api={api} muted={muted} music={music} onMute={toggleMute} onMusic={toggleMusic} onGesture={gesture} />
      ) : null}
    </main>
  );
}
