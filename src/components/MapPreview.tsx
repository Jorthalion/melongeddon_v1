import { useEffect, useRef } from "react";
import { ALL_UNLOCKED, MAP_H, MAP_W, createWorld, type MapId, type World } from "@/game/engine";
import { drawWorld, spritesSettled } from "@/game/draw";

/** One empty world per map, drawn with the game's own renderer so previews always match play. */
const worlds = new Map<MapId, World>();
function previewWorld(map: MapId): World {
  let w = worlds.get(map);
  if (!w) {
    const night = map === "overflow" ? "overflow" : "midnight";
    w = createWorld(() => {}, { meta: ALL_UNLOCKED, setup: { night, map, door: "reject" } }).world;
    w.reduced = true;
    worlds.set(map, w);
  }
  return w;
}

/**
 * The real board for `map`, scaled to fit the canvas (whole board visible).
 * `top` places the board that share of the spare height from the top (0.5 = centered).
 */
export function MapPreview({ map, className = "", top = 0.5 }: { map: MapId; className?: string; top?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const world = previewWorld(map);
    let timer = 0;
    let tries = 0;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth || 240;
      const h = canvas.clientHeight || 150;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#140e12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(w / MAP_W, h / MAP_H);
      const x = (w - MAP_W * scale) / 2;
      const y = (h - MAP_H * scale) * top;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, x * dpr, y * dpr);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, MAP_W, MAP_H);
      ctx.clip();
      drawWorld(ctx, world);
      ctx.restore();
    };
    const loop = () => {
      draw();
      // Redraw while sprites are still loading (about 5 seconds at most).
      if (!spritesSettled() && tries++ < 25) timer = window.setTimeout(loop, 200);
    };
    loop();
    const resize = new ResizeObserver(() => draw());
    resize.observe(canvas);
    return () => {
      window.clearTimeout(timer);
      resize.disconnect();
    };
  }, [map, top]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
