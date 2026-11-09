import { useEffect, useRef } from "react";
import type { TowerKind } from "@/game/engine";
import { drawCannonIcon } from "@/game/drawCannons";
import { asset } from "@/lib/asset";

/** Painted sprites for every cannon; the canvas drawing is a fallback for any kind not listed. */
const PAINTED: Partial<Record<TowerKind, string>> = {
  melon: asset("sprites/cannon-barrel.webp"),
  mortar: asset("sprites/pumpkin-barrel.webp"),
  still: asset("sprites/still.webp"),
  fire: asset("sprites/fire-barrel.webp"),
  freeze: asset("sprites/freeze-barrel.webp"),
  spitter: asset("sprites/spitter-barrel.webp"),
  ballista: asset("sprites/ballista-barrel.webp"),
  reader: asset("sprites/reader-barrel.webp"),
  ink: asset("sprites/ink-barrel.webp"),
  peeler: asset("sprites/peeler-barrel.webp"),
  bookworm: asset("sprites/bookworm-barrel.webp"),
  bell: asset("sprites/bell.webp"),
  hive: asset("sprites/hive.webp"),
  lantern: asset("sprites/lamp.webp"),
  compost: asset("sprites/compost.webp"),
  catalogue: asset("sprites/sig-catalogue.webp"),
  cauldron: asset("sprites/sig-cauldron.webp"),
  trebuchet: asset("sprites/sig-trebuchet.webp"),
  scales: asset("sprites/sig-scales.webp"),
  mimic: asset("sprites/sig-mimic.webp"),
  lectern: asset("sprites/sig-lectern.webp"),
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
