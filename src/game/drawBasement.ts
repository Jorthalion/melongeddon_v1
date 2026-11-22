/**
 * The Flooded Basement, drawn by code until the painted tiles and props exist (docs/art/PROMPTS.md): the three
 * floor heights, the water over flooded tiles, Freeze ice, the burst pipe and the water gauge, a Sump Pump's dry
 * square, waterlogged towers, and the room fruit's snorkel and plug.
 */
import { BASEMENT, BOARDS, CELL, floodedTile, type World } from "./engine";

type Tower = World["towers"][number];
/** The loaded sprites (draw.ts's getSprites): each painted file replaces its code drawing once it has loaded. */
type Art = Partial<Record<string, HTMLImageElement>>;
const ready = (img: HTMLImageElement | undefined): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0;

/** Low flagstones, middle flags with a step edge, and wooden pallets for the high floor. */
export function drawBasementFloor(ctx: CanvasRenderingContext2D, world: World, art: Art = {}) {
  const tiles = { low: art.floorBasementLow, mid: art.floorBasementMid, high: art.floorBasementHigh };
  const cols = Math.round(world.w / CELL);
  const rows = Math.round(world.h / CELL);
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const h = world.heights.get(`${c},${r}`) ?? "high";
      const x = c * CELL;
      const y = r * CELL;
      const painted = tiles[h];
      if (ready(painted)) {
        ctx.drawImage(painted, x, y, CELL, CELL);
        if (h === "mid") stepEdges(ctx, world, c, r);
        continue;
      }
      if (h === "high") {
        ctx.fillStyle = "#6b4a2c";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.fillStyle = "#83603a";
        for (let i = 0; i < 4; i++) ctx.fillRect(x + 2, y + 2 + i * (CELL / 4), CELL - 4, CELL / 4 - 3);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 6, y + 2, 3, CELL - 4);
        ctx.fillRect(x + CELL - 9, y + 2, 3, CELL - 4);
        continue;
      }
      const seed = (c * 7 + r * 13) % 5;
      ctx.fillStyle = h === "low" ? ["#2f3434", "#323737", "#2c3131", "#343938", "#303535"][seed] : ["#5a5a54", "#5e5d57", "#575751", "#615f59", "#5b5a55"][seed];
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = h === "low" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL / 2, CELL / 2 + (seed % 2) * 6);
      ctx.strokeRect(x + CELL / 2 + 0.5, y + 0.5, CELL / 2 - 1, CELL - 1);
      // A faint tide line where the water reached last time.
      ctx.fillStyle = "rgba(210,220,215,0.06)";
      ctx.fillRect(x, y + CELL * 0.3, CELL, 2);
      if (h === "mid") stepEdges(ctx, world, c, r);
    }
  ctx.fillStyle = "rgba(16,12,14,0.25)";
  ctx.fillRect(0, 0, world.w, world.h);
}

/** A middle tile's step down to any low tile beside it. */
function stepEdges(ctx: CanvasRenderingContext2D, world: World, c: number, r: number) {
  const x = c * CELL;
  const y = r * CELL;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (world.heights.get(`${c + dc},${r + dr}`) !== "low") continue;
    if (dc === 1) ctx.fillRect(x + CELL - 4, y, 4, CELL);
    if (dc === -1) ctx.fillRect(x, y, 4, CELL);
    if (dr === 1) ctx.fillRect(x, y + CELL - 4, CELL, 4);
    if (dr === -1) ctx.fillRect(x, y, CELL, 4);
  }
}

/** Water over every flooded tile (carpet too), ice sheets, the pipe and the gauge, and a pump's dry square. */
export function drawBasement(ctx: CanvasRenderingContext2D, world: World, art: Art = {}) {
  const board = BOARDS[world.hud.map];
  if (!board.heights) return;
  const t = world.anim;
  if (world.water > 0) {
    const grow = 1 - Math.min(1, world.waterRise / BASEMENT.riseTime);
    const alpha = (world.water >= 2 ? 0.5 : 0.36) * (0.4 + 0.6 * grow);
    ctx.save();
    // The painted water surface (it tiles and drifts slowly), or a flat blue by code.
    const surface = ready(art.waterOverlay) ? ctx.createPattern(art.waterOverlay, "repeat") : null;
    surface?.setTransform(new DOMMatrix().translateSelf((t * 6) % 256, (t * 3) % 256));
    for (const key of world.heights.keys()) {
      const [c, r] = key.split(",").map(Number);
      if (!floodedTile(world, c, r)) continue;
      const x = c * CELL;
      const y = r * CELL;
      if (surface) {
        ctx.globalAlpha = Math.min(1, alpha * 2);
        ctx.fillStyle = surface;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = `rgba(46,96,122,${alpha})`;
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = `rgba(190,225,240,${0.18 * grow})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const yy = y + CELL * (0.3 + i * 0.4) + Math.sin(t * 2 + c + r * 1.7 + i) * 2;
        ctx.moveTo(x + 6, yy);
        ctx.quadraticCurveTo(x + CELL / 2, yy - 3, x + CELL - 6, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const ice of world.ice) {
    const a = Math.min(1, ice.left / 0.5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(196,228,248,0.82)";
    ctx.beginPath();
    ctx.arc(ice.x, ice.y, ice.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + ice.x * 0.01;
      ctx.moveTo(ice.x, ice.y);
      ctx.lineTo(ice.x + Math.cos(ang) * ice.r * 0.85, ice.y + Math.sin(ang) * ice.r * 0.85);
    }
    ctx.stroke();
    ctx.restore();
  }
  if (board.pipe) {
    const [c, r] = board.pipe;
    const x = c * CELL + CELL / 2;
    const y = r * CELL + CELL / 2;
    ctx.save();
    if (ready(art.pipeProp)) {
      ctx.drawImage(art.pipeProp, x - CELL / 2, y - CELL / 2, CELL, CELL);
    } else {
      ctx.fillStyle = "#5c5f63";
      ctx.fillRect(x - CELL / 2, y - 6, CELL, 12);
      ctx.fillStyle = "#7a7e83";
      ctx.fillRect(x + 6, y - 9, 6, 18);
    }
    // The burst: water spraying out while a wave is on.
    if (world.hud.phase === "combat") {
      ctx.fillStyle = "rgba(170,210,235,0.75)";
      for (let i = 0; i < 9; i++) {
        const k = (t * 1.6 + i / 9) % 1;
        ctx.beginPath();
        ctx.arc(x + 12 + k * 26, y + Math.sin(i * 2.1) * 6 + k * k * 22, 2.2 * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  if (board.gauge) {
    const [c, r] = board.gauge;
    const x = c * CELL + 10;
    const y = r * CELL + 4;
    const w = CELL - 20;
    const h = CELL - 8;
    ctx.save();
    const level = Math.min(3, world.water) / 3;
    if (ready(art.gaugeProp)) {
      // The painted board, with the water level laid over it by code.
      ctx.drawImage(art.gaugeProp, c * CELL, r * CELL, CELL, CELL);
      ctx.fillStyle = "rgba(46,96,122,0.55)";
      ctx.fillRect(x + 2, y + h - 2 - (h - 4) * level, w - 4, (h - 4) * level);
    } else {
      ctx.fillStyle = "#d9cfb6";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(46,96,122,0.85)";
      ctx.fillRect(x + 2, y + h - 2 - (h - 4) * level, w - 4, (h - 4) * level);
      ctx.fillStyle = "#2a1c22";
      ctx.font = "700 9px 'Outfit Variable', Outfit, sans-serif";
      ctx.textAlign = "right";
      for (let i = 1; i <= 3; i++) {
        const yy = y + h - 2 - ((h - 4) * i) / 3;
        ctx.fillRect(x, yy, 5, 1.5);
        ctx.fillText(String(i), x + w - 1, yy + 8);
      }
    }
    ctx.restore();
  }
  // A Sump Pump's dry square: while placing one, and while one is selected.
  const squares: Array<[number, number]> = [];
  if (world.hover && world.hud.build === "pump" && (world.hud.phase === "prep" || world.hud.phase === "combat")) squares.push([world.hover.c, world.hover.r]);
  const sel = world.towers.find((x) => x.id === world.hud.selected && x.kind === "pump");
  if (sel) squares.push([sel.c, sel.r]);
  for (const [c, r] of squares) {
    ctx.save();
    ctx.fillStyle = "rgba(235,225,190,0.16)";
    ctx.fillRect((c - 1) * CELL, (r - 1) * CELL, CELL * 3, CELL * 3);
    ctx.strokeStyle = "rgba(235,225,190,0.7)";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect((c - 1) * CELL + 1, (r - 1) * CELL + 1, CELL * 3 - 2, CELL * 3 - 2);
    ctx.restore();
  }
}

/** A tower standing in the water: half under it, ripples round it, and a tag. */
export function drawSoaked(ctx: CanvasRenderingContext2D, world: World, tower: Tower) {
  if (!floodedTile(world, tower.c, tower.r)) return;
  ctx.save();
  ctx.fillStyle = "rgba(46,96,122,0.62)";
  ctx.fillRect(tower.x - CELL / 2, tower.y + 2, CELL, CELL / 2 - 2);
  ctx.strokeStyle = "rgba(200,230,245,0.55)";
  ctx.lineWidth = 1.2;
  const k = (world.anim * 0.8 + tower.id * 0.37) % 1;
  ctx.beginPath();
  ctx.ellipse(tower.x, tower.y + 4, 12 + k * 12, 4 + k * 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "700 10px 'Outfit Variable', Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#9fd3ec";
  ctx.fillText("waterlogged", tower.x, tower.y + CELL * 0.62);
  ctx.restore();
}

/** The Water Melon's snorkel and the Drain Gourd's grey skin and plug, over the ordinary fruit drawing. */
export function drawBasementFruit(ctx: CanvasRenderingContext2D, native: string | undefined, x: number, y: number, r: number) {
  if (native === "watermelon") {
    ctx.save();
    ctx.fillStyle = "rgba(20,70,30,0.35)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8b03a";
    ctx.fillRect(x + r * 0.35, y - r * 1.5, 4, r * 1.2);
    ctx.fillStyle = "#3a8ec4";
    ctx.fillRect(x - r * 0.55, y - r * 0.4, r * 1.1, r * 0.35);
    ctx.restore();
  } else if (native === "draingourd") {
    ctx.save();
    ctx.fillStyle = "rgba(120,124,128,0.55)";
    ctx.beginPath();
    ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#2b2b2e";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.1, r * 0.4, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b8b8b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.2);
    ctx.lineTo(x, y - r * 0.75);
    ctx.stroke();
    ctx.restore();
  }
}
