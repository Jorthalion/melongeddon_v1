import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { BOARDS, KEEPER_NAMES, RUN_KEY, createWorld, runSummary, stepWorld } from "@/game/engine";
import { coarsePointer } from "@/lib/inputMode";
import { drop, load, save } from "@/lib/storage";
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

/** Touch screens can zoom the board (pinch, or the zoom button): this far in at most. */
const MAX_ZOOM = 3;
/** The zoom button goes at least this far in (or far enough to fill the board's box, if that's more). */
const ZOOM_STEP = 1.8;
/** Touch screens draw the board at most this many backing pixels per CSS px (see the frame loop). */
const TOUCH_DPR = 2;
/** A touch that moves further than this (CSS px) is a pan, not a tap. */
const TAP_SLOP = 10;

/** Zoom that fills the w×h box (one side of the board then runs off and pans). */
function fillZoom(w: number, h: number, bw: number, bh: number) {
  return Math.max(w / bw, h / bh) / Math.min(w / bw, h / bh);
}

/**
 * The board in its box at a zoom (1 = the whole board, as fitBoard) looking at world point (cx, cy).
 * A side that fits stays centred; a side that runs over is clamped so the board never leaves a gap.
 * Writes the clamped centre back into `view`.
 */
function boardView(w: number, h: number, bw: number, bh: number, view: { zoom: number; cx: number; cy: number }) {
  const base = fitBoard(w, h, bw, bh);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, view.zoom));
  const scale = base.scale * zoom;
  const axis = (box: number, size: number, c: number) => {
    const drawn = size * scale;
    if (drawn <= box + 0.5) return { off: (box - drawn) / 2, c: size / 2 };
    const half = box / 2 / scale;
    const cc = Math.min(size - half, Math.max(half, c));
    return { off: box / 2 - cc * scale, c: cc };
  };
  const ax = axis(w, bw, view.cx);
  const ay = axis(h, bh, view.cy);
  view.zoom = zoom;
  view.cx = ax.c;
  view.cy = ay.c;
  return { scale, x: ax.off, y: ay.off };
}

const phase0 = (p: string) => p === "coldopen";

export function MelonGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Touch zoom: 1 is the whole board; cx, cy the world point in the middle of the box. */
  const viewRef = useRef({ zoom: 1, cx: 0, cy: 0 });
  const [zoomed, setZoomed] = useState(false);
  /** The canvas box (CSS px), for the zoom button. */
  const [canvasBox, setCanvasBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const watch = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setCanvasBox((b) => (Math.abs(b.width - r.width) < 1 && Math.abs(b.height - r.height) < 1 ? b : { width: r.width, height: r.height }));
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  /** Touches on the board: where each finger is, and how the gesture started. */
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ tap: boolean; sx: number; sy: number; pinch: { d: number; zoom: number; wx: number; wy: number } | null; pan: { x: number; y: number } | null } | null>(null);
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
    const touchScreen = coarsePointer();
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
      // Touch screens cap it at 2: phones report 2.6-4.5, and drawing a 412 px board 1080+ px wide every frame
      // halved the frame rate on a mid-range phone for detail nobody can see at that size.
      const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, touchScreen ? TOUCH_DPR : Infinity, 4096 / Math.max(1, rect.width)));
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
      const view = boardView(rect.width, rect.height, api.world.w, api.world.h, viewRef.current);
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
    const view = boardView(rect.width, rect.height, api.world.w, api.world.h, viewRef.current);
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  };

  // Touch on the board. A tap acts when the finger lifts, on the nearest tile it can use (api.snapTap), so a
  // thumb a little off a 20 px tile still lands. Two fingers pinch the board bigger; one finger pans it while zoomed.
  const setZoom = (zoom: number) => {
    viewRef.current.zoom = Math.min(MAX_ZOOM, Math.max(1, zoom));
    setZoomed(viewRef.current.zoom > 1.01);
  };
  const touchDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...touches.current.values()];
    if (pts.length === 1) {
      gestureRef.current = { tap: true, sx: e.clientX, sy: e.clientY, pinch: null, pan: null };
      // Show where it would go (the build ghost and its reach) while the finger is down.
      const p = toWorld(e.clientX, e.clientY);
      const at = api.snapTap(p.x, p.y);
      api.pointer(at.x, at.y, "move");
    } else if (pts.length === 2 && gestureRef.current) {
      const [a, b] = pts;
      const mid = toWorld((a.x + b.x) / 2, (a.y + b.y) / 2);
      gestureRef.current.tap = false;
      gestureRef.current.pan = null;
      gestureRef.current.pinch = { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: viewRef.current.zoom, wx: mid.x, wy: mid.y };
    }
  };
  const touchMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gestureRef.current;
    if (!g || !touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...touches.current.values()];
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    if (g.pinch && pts.length >= 2) {
      const [a, b] = pts;
      setZoom(g.pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / g.pinch.d));
      // Keep the world point that started under the fingers there.
      const base = fitBoard(rect.width, rect.height, api.world.w, api.world.h);
      const scale = base.scale * viewRef.current.zoom;
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      viewRef.current.cx = g.pinch.wx + (rect.width / 2 - mx) / scale;
      viewRef.current.cy = g.pinch.wy + (rect.height / 2 - my) / scale;
      return;
    }
    if (g.tap && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > TAP_SLOP) {
      g.tap = false;
      if (viewRef.current.zoom > 1.01) g.pan = { x: e.clientX, y: e.clientY };
    }
    if (g.pan) {
      const scale = fitBoard(rect.width, rect.height, api.world.w, api.world.h).scale * viewRef.current.zoom;
      viewRef.current.cx -= (e.clientX - g.pan.x) / scale;
      viewRef.current.cy -= (e.clientY - g.pan.y) / scale;
      g.pan = { x: e.clientX, y: e.clientY };
      return;
    }
    if (g.tap) {
      const p = toWorld(e.clientX, e.clientY);
      const at = api.snapTap(p.x, p.y);
      api.pointer(at.x, at.y, "move");
    }
  };
  const touchUp = (e: React.PointerEvent<HTMLCanvasElement>, lifted: boolean) => {
    if (!touches.current.delete(e.pointerId)) return;
    const g = gestureRef.current;
    if (touches.current.size > 0) {
      // One finger of a pinch lifted: the other one pans from here (no tap).
      if (g) {
        g.pinch = null;
        const [rest] = [...touches.current.values()];
        g.pan = viewRef.current.zoom > 1.01 ? { x: rest.x, y: rest.y } : null;
      }
      return;
    }
    gestureRef.current = null;
    if (!lifted || !g?.tap) return;
    const p = toWorld(e.clientX, e.clientY);
    const at = api.snapTap(p.x, p.y);
    api.pointer(at.x, at.y, "down");
    tone(240, 0.06, "square", 0.03);
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

  // Phones: keep the night in play, so a reload (or the phone dropping the tab while another app is open)
  // doesn't lose it. Saved at every new wave or card and whenever the page is hidden; dropped when the night
  // ends or another one starts. Desktop keeps its leave prompt instead.
  const [savedRun, setSavedRun] = useState(() => (coarsePointer() ? load(RUN_KEY) : null));
  const lastPhase = useRef(hud.phase);
  useEffect(() => {
    if (!coarsePointer()) return;
    const p = hud.phase;
    const was = lastPhase.current;
    lastPhase.current = p;
    const over = p === "victory" || p === "defeat" || p === "poster" || p === "select" || (p === "coldopen" && was !== "coldopen");
    if (over) {
      drop(RUN_KEY);
      setSavedRun(null);
      return;
    }
    const raw = api.saveRun();
    if (raw) save(RUN_KEY, raw);
  }, [hud.phase, hud.wave, api]);
  useEffect(() => {
    if (!coarsePointer()) return;
    const keep = () => {
      const raw = api.saveRun();
      if (raw) save(RUN_KEY, raw);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") keep();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", keep);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", keep);
    };
  }, [api]);
  const resumable = phase0(hud.phase) ? runSummary(savedRun) : null;

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
  const coarse = coarsePointer();
  /** How much bigger the tiles get when the board fills its box (the zoom button's step). */
  const fillGain = canvasBox.width > 0 && canvasBox.height > 0 ? fillZoom(canvasBox.width, canvasBox.height, api.world.w, api.world.h) : 1;
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
  const layout = layoutFor(box.w, box.h, api.world.w, api.world.h, box.rem, coarse);
  const wide = layout.mode === "wide" && showPlace;
  /** Short landscape screens (a phone on its side): the build column on the left, the back room stays a tab on the board. */
  const side = layout.mode === "side" && showPlace;
  /** The build bar is a left column (wide and side layouts). */
  const column = wide || side;
  /** Phones: the back room button and the tips go in the bottom area, off the board. */
  const narrow = !column && box.w < NARROW_PX;
  /** Mynxi's tutorial: above the board and any card (never over them), hidden under the pause menu. */
  const tutorOn = phase !== "coldopen" && phase !== "select" && phase !== "poster" && !hud.menu;
  // The tips have one place, never over the board or the Coming up bar (see TipCard).
  const tipDock = (where: string, fit: "full" | "line") => (
    <TipFit.Provider value={fit}>
      <div data-tip-dock={where} className={`relative z-20 flex shrink-0 flex-col gap-1.5 empty:hidden ${where === "side" ? "pb-2" : where === "bottom" ? "px-3 pt-1.5" : "pb-1.5"}`}>
        <Tips api={api} tutorial={!hud.tutorial && !hud.guide} />
      </div>
    </TipFit.Provider>
  );

  // Touch: the zoom button sits at the end of the build bar's tab row, off the board.
  const zoomButton = showPlace && !hud.menu && coarse ? (
          <button
            type="button"
            aria-label={zoomed ? "Show the whole board" : "Zoom the board in"}
            aria-pressed={zoomed}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-line/70 text-parchment"
            onClick={() => {
              gesture();
              if (zoomed) setZoom(1);
              else {
                viewRef.current.cx = api.world.w / 2;
                viewRef.current.cy = api.world.h / 2;
                setZoom(Math.max(ZOOM_STEP, fillGain));
              }
            }}
          >
            {zoomed ? <ZoomOut className="size-5" aria-hidden="true" /> : <ZoomIn className="size-5" aria-hidden="true" />}
          </button>
  ) : null;

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
      {column ? (
        <aside aria-label="Build" className="flex min-h-0 shrink-0 flex-col" style={{ width: layout.left }}>
          {/* Short landscape screens: Mynxi's box heads the build column, so the board keeps all its height. */}
          {side && tutorOn ? <div key={hud.guide ?? "tips"} className="max-h-[55%] shrink-0 overflow-y-auto pt-2"><MynxiTutor api={api} onGesture={gesture} small /></div> : null}
          {/* Side layout: the tips also head the build column (capped, scrolling), never the board column. */}
          {side ? <div className="max-h-[40%] shrink-0 overflow-y-auto px-3 pt-2">{tipDock("side", "line")}</div> : null}
          <BuildFooter
            api={api}
            onGesture={gesture}
            column
            tools={zoomButton}
            backRoom={side && !hud.menu && (phase === "prep" || phase === "combat") ? <BackRoomTab api={api} onGesture={gesture} compact /> : null}
          />
        </aside>
      ) : null}
      <div data-board-controls className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${column ? "py-3 touch:py-1.5" : "sm:px-3"}`}>
        {showPlace ? <ComingUpBar api={api} /> : null}
        {showPlace && !column && !narrow ? tipDock("top", "line") : null}
        {/* Mynxi's box goes above the board, not over it: the board (and any card) shrinks to fit below. */}
        {tutorOn && !side ? <MynxiTutor api={api} onGesture={gesture} small={narrow} /> : null}
        <div className="relative flex min-h-0 flex-1 flex-col">
        <canvas
          ref={canvasRef}
          className="min-h-0 w-full flex-1 touch-none bg-ink sm:rounded-xl sm:border sm:border-line"
          onPointerMove={(e) => {
            if (e.pointerType === "touch") return touchMove(e);
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
            setFoe(near ? { id: near.id, x: e.clientX - box.left, y: e.clientY - box.top, w: box.width } : null);
          }}
          onPointerLeave={() => setFoe(null)}
          onPointerDown={(e) => {
            gesture();
            if (e.pointerType === "touch") return touchDown(e);
            const p = toWorld(e.clientX, e.clientY);
            api.pointer(p.x, p.y, "down");
            tone(240, 0.06, "square", 0.03);
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "touch") touchUp(e, true);
          }}
          onPointerCancel={(e) => {
            if (e.pointerType === "touch") touchUp(e, false);
          }}
        />
        {foe && showPlace && !hud.menu ? <EnemyCard api={api} hover={foe} boxW={box.w - layout.left - layout.right} /> : null}
        {hud.paused && !hud.menu && !hud.checkout && showPlace ? (
          <div className="pointer-events-none absolute inset-3 grid place-items-center">
            <p className="rounded-xl border border-line bg-ink/80 px-4 py-2 font-display text-xl">Paused</p>
          </div>
        ) : null}
        {(phase === "prep" || phase === "combat") && !hud.menu && !wide && (!(narrow || side) || hud.workshop != null) ? <BackRoomTab api={api} onGesture={gesture} /> : null}
        {phase === "select" ? <SetupScreen api={api} onGesture={gesture} /> : null}
        {phase !== "combat" && phase !== "prep" && phase !== "select" && phase !== "coldopen" && phase !== "poster" ? (
          <CardOverlay hudPhase={phase} api={api} onGesture={gesture} />
        ) : null}
        </div>
      </div>
      {wide ? (
        <aside aria-label="Back room column" className="relative flex min-h-0 shrink-0 flex-col py-3 pr-3" style={{ width: layout.right }}>
          {tipDock("side", "full")}
          {!hud.menu ? <BackRoomTab api={api} onGesture={gesture} docked /> : null}
        </aside>
      ) : null}
      </div>

      {showPlace && narrow ? tipDock("bottom", "line") : null}
      {showPlace && !column ? (
        <BuildFooter
          api={api}
          onGesture={gesture}
          tools={zoomButton}
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
          resume={
            resumable
              ? {
                  label: resumable.night !== "endless" ? `Resume wave ${resumable.wave} of ${resumable.waveCount}` : `Resume wave ${resumable.wave}`,
                  detail: `${KEEPER_NAMES[resumable.hero].name}: ${resumable.seeds} seeds, ${resumable.lives}/${resumable.maxLives} stacks.`,
                  onResume: () => {
                    gesture();
                    tone(220, 0.08, "triangle", 0.04);
                    if (!savedRun || !api.resumeRun(savedRun)) {
                      drop(RUN_KEY);
                      setSavedRun(null);
                    }
                  },
                }
              : undefined
          }
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
            backLabel={hud.guide != null && !hud.guideDone ? "Back to title" : undefined}
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
