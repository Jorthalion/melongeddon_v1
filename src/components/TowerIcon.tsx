import { useEffect, useRef } from "react";
import type { TowerKind } from "@/game/engine";
import { drawCannonIcon } from "@/game/drawCannons";
import { asset } from "@/lib/asset";

/** Painted sprites for the original cannons; the newer ones are drawn in code. */
const PAINTED: Partial<Record<TowerKind, string>> = {
  melon: asset("sprites/cannon-barrel.webp"),
  mortar: asset("sprites/pumpkin-barrel.webp"),
  still: asset("sprites/still.webp"),
  fire: asset("sprites/fire-barrel.webp"),
  freeze: asset("sprites/freeze-barrel.webp"),
};

export function TowerIcon({ kind, className = "" }: { kind: TowerKind; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const src = PAINTED[kind];

  useEffect(() => {
    if (src) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 48;
    const h = canvas.clientHeight || 40;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCannonIcon(ctx, kind, w, h);
  }, [kind, src]);

  if (src) return <img src={src} alt="" className={`object-contain ${className}`} />;
  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
