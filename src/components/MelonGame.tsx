import { useEffect, useRef, useState } from "react";
import { BOARDS, KEEPER_NAMES, createWorld, stepWorld } from "@/game/engine";
import { drawWorld } from "@/game/draw";
import { isMusicOn, isMuted, playSfx, setMusicMode, setMusicOn, setMuted, tone, unlockAudio } from "@/game/audio";
import { useHotkeys } from "@/components/hotkeys";
import { ChuteTip, TutorialHint } from "@/components/TutorialHint";
import { MynxiTutor } from "@/components/MynxiTutor";
import { canInstall, isDesktopApp, onInstallChange, promptInstall } from "@/lib/install";
import { BuildFooter, GameHeader } from "@/components/GameHUD";
import { CardOverlay } from "@/components/CardPicker";
import { BackRoomTab } from "@/components/Shop";
import { PauseMenu } from "@/components/PauseMenu";
import { ROOM_JOKE, RoomScreen } from "@/components/RoomScreen";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SetupScreen } from "@/components/SetupScreen";
import { TitleScreen } from "@/components/TitleScreen";
import { setupSummary } from "@/components/ui";

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
      />

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
        {(phase === "prep" || phase === "combat") && !hud.tutorial && !hud.guide ? <TutorialHint api={api} /> : null}
        {phase === "prep" || phase === "combat" ? <ChuteTip api={api} /> : null}
        {(phase === "prep" || phase === "combat") && !hud.menu ? <BackRoomTab api={api} onGesture={gesture} /> : null}
        {phase === "select" ? <SetupScreen api={api} onGesture={gesture} /> : null}
        {phase !== "combat" && phase !== "prep" && phase !== "select" && phase !== "coldopen" && phase !== "poster" ? (
          <CardOverlay hudPhase={phase} api={api} onGesture={gesture} />
        ) : null}
        {/* Mynxi's tutorial sits above the board and any card, but under the pause menu. */}
        {phase !== "coldopen" && phase !== "select" && phase !== "poster" && !hud.menu ? <MynxiTutor api={api} onGesture={gesture} /> : null}
      </div>

      {showPlace ? <BuildFooter api={api} onGesture={gesture} /> : null}
      {phase === "coldopen" ? (
        <TitleScreen
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
