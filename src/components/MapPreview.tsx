import { useEffect, useRef } from "react";
import { BOARDS, COLS, ROWS, buildBoard, type MapId } from "@/game/engine";

/** A small drawn plan of a board's carpet, for maps without painted art. */
export function MapPreview({ map, className = "" }: { map: MapId; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 240;
    const h = canvas.clientHeight || 96;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const board = BOARDS[map];
    const { cells } = buildBoard(board.corners);
    // Fit the whole board so the full carpet shape is readable.
    const cell = Math.min(w / COLS, h / ROWS);
    const ox = (w - cell * COLS) / 2;
    const oy = (h - cell * ROWS) / 2;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#3a2a24");
    g.addColorStop(1, "#211714");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Shelves along the floor, for a library feel.
    ctx.fillStyle = "rgba(255,240,220,0.04)";
    ctx.fillRect(ox, oy, cell * COLS, cell * ROWS);
    ctx.fillStyle = "rgba(90,58,40,0.55)";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (cells.has(`${c},${r}`) || (c * 7 + r * 3) % 5 !== 0) continue;
        ctx.fillRect(ox + c * cell + cell * 0.15, oy + r * cell + cell * 0.25, cell * 0.7, cell * 0.5);
      }
    }

    for (const key of cells) {
      const [c, r] = key.split(",").map(Number);
      ctx.fillStyle = "#8d3a42";
      ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.5, cell + 0.5);
    }
    ctx.strokeStyle = "rgba(230,195,106,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    };
    for (const key of cells) {
      const [c, r] = key.split(",").map(Number);
      const x = ox + c * cell;
      const y = oy + r * cell;
      if (!cells.has(`${c},${r - 1}`)) seg(x, y + 0.5, x + cell, y + 0.5);
      if (!cells.has(`${c},${r + 1}`)) seg(x, y + cell - 0.5, x + cell, y + cell - 0.5);
      if (!cells.has(`${c - 1},${r}`)) seg(x + 0.5, y, x + 0.5, y + cell);
      if (!cells.has(`${c + 1},${r}`)) seg(x + cell - 0.5, y, x + cell - 0.5, y + cell);
    }
    ctx.stroke();

    const [ec, er] = board.corners[board.corners.length - 1];
    const ex = ox + (ec + 0.5) * cell;
    const ey = oy + (er + 0.5) * cell;
    if (board.dark) {
      ctx.fillStyle = "rgba(4,3,10,0.7)";
      ctx.fillRect(0, 0, w, h);
      const light = ctx.createRadialGradient(ex, ey, 2, ex, ey, cell * 2.2);
      light.addColorStop(0, "rgba(255,214,140,0.35)");
      light.addColorStop(1, "rgba(255,214,140,0)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = "#e6c36a";
    ctx.fillRect(ex - cell * 0.3, ey - cell * 0.4, cell * 0.6, cell * 0.8);
  }, [map]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
