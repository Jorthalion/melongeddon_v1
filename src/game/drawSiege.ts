// The Siege's code-drawn art: geese, cats, the Courtyard's props, drop targets and fights.
// Stand-ins until painted sprites exist (see docs/art/ENEMY_PROMPTS.md and docs/art/PROMPTS.md).
import { CELL } from "./rules.ts";
import { barFill } from "./drawStatus.ts";

export type SiegeLook = "honker" | "gosling" | "matriarch" | "whiskers" | "boxcat" | "para" | "tank" | "general";

/** Which face a goose or cat wears (a Box Cat out of its box is an ordinary cat). Null for fruit. */
export function siegeLookOf(e: {
  kind: string;
  gosling?: boolean;
  matriarch?: boolean;
  boxed?: boolean;
  para?: boolean;
  tank?: boolean;
  general?: boolean;
}): SiegeLook | null {
  if (e.kind === "goose") return e.matriarch ? "matriarch" : e.gosling ? "gosling" : "honker";
  if (e.kind === "cat") return e.general ? "general" : e.tank ? "tank" : e.boxed ? "boxcat" : e.para ? "para" : "whiskers";
  return null;
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hp: number, boss: boolean) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = barFill(hp, boss);
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, hp)), 4);
}

function shadow(ctx: CanvasRenderingContext2D, w: number, y: number) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, y, w, w * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A goose, facing right: white body, long neck, orange beak (a gosling is small and yellow; the Matriarch wears a crest). */
function goose(ctx: CanvasRenderingContext2D, r: number, look: "honker" | "gosling" | "matriarch", anim: number, leader: boolean, stretch = 0) {
  const baby = look === "gosling";
  const body = baby ? "#f2d45c" : "#f6f3ea";
  const shade = baby ? "#d2ad38" : "#cfcabd";
  const step = Math.sin(anim * 10) * r * 0.12;
  shadow(ctx, r * 1.05, r * 0.85);
  // Feet.
  ctx.strokeStyle = "#e8862e";
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.5);
  ctx.lineTo(-r * 0.2 + step, r * 0.85);
  ctx.moveTo(r * 0.2, r * 0.5);
  ctx.lineTo(r * 0.2 - step, r * 0.85);
  ctx.stroke();
  // Tail.
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -r * 0.05);
  ctx.lineTo(-r * 1.35, -r * 0.4);
  ctx.lineTo(-r * 1.05, r * 0.25);
  ctx.closePath();
  ctx.fill();
  // Body and wing.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, r * 0.1, r * 1.05, r * (baby ? 0.85 : 0.7), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,50,40,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, r * 0.05, r * 0.6, r * 0.38, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Neck up to the head (a gosling's head sits right on its body).
  // Rallied: the neck stretched forward.
  const hx = (baby ? r * 0.75 : r * 0.85) + r * stretch;
  const hy = (baby ? -r * 0.45 : -r * 1.05) + r * stretch * 0.45;
  if (!baby) {
    ctx.strokeStyle = body;
    ctx.lineWidth = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.35, hx, hy);
    ctx.stroke();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(hx, hy, r * (baby ? 0.45 : 0.32), 0, Math.PI * 2);
  ctx.fill();
  // Beak and eye.
  ctx.fillStyle = "#f08a2a";
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.22, hy - r * 0.1);
  ctx.lineTo(hx + r * (baby ? 0.65 : 0.75), hy + r * 0.02);
  ctx.lineTo(hx + r * 0.22, hy + r * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1418";
  ctx.beginPath();
  ctx.arc(hx + r * 0.08, hy - r * 0.08, Math.max(1.2, r * 0.08), 0, Math.PI * 2);
  ctx.fill();
  if (look === "matriarch") {
    // A gold crest like a crown, and a blue sash.
    ctx.fillStyle = "#e6c36a";
    ctx.beginPath();
    const cx = hx - r * 0.05;
    const top = hy - r * 0.28;
    ctx.moveTo(cx - r * 0.3, top);
    ctx.lineTo(cx - r * 0.24, top - r * 0.38);
    ctx.lineTo(cx - r * 0.1, top - r * 0.14);
    ctx.lineTo(cx, top - r * 0.46);
    ctx.lineTo(cx + r * 0.1, top - r * 0.14);
    ctx.lineTo(cx + r * 0.24, top - r * 0.38);
    ctx.lineTo(cx + r * 0.3, top);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3d6fb0";
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -r * 0.35);
    ctx.lineTo(-r * 0.55, r * 0.6);
    ctx.stroke();
  }
  if (leader) {
    // The line's leader: a little red flag on its back.
    ctx.strokeStyle = "#5a3e22";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.4);
    ctx.lineTo(-r * 0.3, -r * 1.5);
    ctx.stroke();
    ctx.fillStyle = "#e23b4a";
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 1.5);
    ctx.lineTo(r * 0.35, -r * 1.3);
    ctx.lineTo(-r * 0.3, -r * 1.1);
    ctx.closePath();
    ctx.fill();
  }
}

/** A tabby cat, facing right (the General is grey with a white chest). */
function cat(ctx: CanvasRenderingContext2D, r: number, anim: number, grey = false) {
  const fur = grey ? "#8e8c98" : "#d08a3e";
  const stripe = grey ? "#5f5d68" : "#8a5222";
  const sway = Math.sin(anim * 4) * 0.25;
  shadow(ctx, r * 1.05, r * 0.85);
  // Tail.
  ctx.strokeStyle = fur;
  ctx.lineWidth = r * 0.24;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, r * 0.1);
  ctx.quadraticCurveTo(-r * 1.4, -r * 0.2, -r * (1.1 + sway * 0.3), -r * 0.9);
  ctx.stroke();
  // Body and legs.
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, r * 0.2, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.7, r * 0.4, r * 0.25, r * 0.45);
  ctx.fillRect(r * 0.35, r * 0.4, r * 0.25, r * 0.45);
  ctx.strokeStyle = stripe;
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.15 + i * r * 0.35, -r * 0.35);
    ctx.lineTo(-r * 0.05 + i * r * 0.35, r * 0.1);
    ctx.stroke();
  }
  if (grey) {
    ctx.fillStyle = "#f1eee6";
    ctx.beginPath();
    ctx.ellipse(r * 0.45, r * 0.25, r * 0.3, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Head, ears, face.
  const hx = r * 0.7;
  const hy = -r * 0.4;
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.arc(hx, hy, r * 0.52, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + side * r * 0.42, hy - r * 0.18);
    ctx.lineTo(hx + side * r * 0.32, hy - r * 0.8);
    ctx.lineTo(hx + side * r * 0.02, hy - r * 0.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#1a1418";
  ctx.beginPath();
  ctx.arc(hx + r * 0.05, hy - r * 0.02, Math.max(1.2, r * 0.08), 0, Math.PI * 2);
  ctx.arc(hx + r * 0.3, hy - r * 0.02, Math.max(1.2, r * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e88a9a";
  ctx.beginPath();
  ctx.arc(hx + r * 0.2, hy + r * 0.14, Math.max(1, r * 0.07), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.3, hy + r * 0.16);
  ctx.lineTo(hx + r * 0.75, hy + r * 0.08);
  ctx.moveTo(hx + r * 0.3, hy + r * 0.2);
  ctx.lineTo(hx + r * 0.75, hy + r * 0.28);
  ctx.stroke();
  return { hx, hy };
}

/** The little army helmet Private Whiskers and the paratroopers wear. */
function helmet(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number) {
  ctx.fillStyle = "#5d6b3a";
  ctx.beginPath();
  ctx.arc(hx + r * 0.05, hy - r * 0.18, r * 0.48, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#47522c";
  ctx.fillRect(hx - r * 0.52, hy - r * 0.2, r * 1.15, r * 0.12);
}

/** A cardboard box (Box Cat), with ears and eyes peeking over the top. */
function box(ctx: CanvasRenderingContext2D, r: number, anim: number) {
  const bob = Math.abs(Math.sin(anim * 6)) * r * 0.08;
  shadow(ctx, r * 1.1, r * 0.9);
  ctx.save();
  ctx.translate(0, -bob);
  // Ears and eyes first, so the box front covers their bottoms.
  ctx.fillStyle = "#d08a3e";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.5, -r * 0.55);
    ctx.lineTo(side * r * 0.35, -r * 1.15);
    ctx.lineTo(side * r * 0.1, -r * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#f3e2a0";
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.62, r * 0.1, 0, Math.PI * 2);
  ctx.arc(r * 0.2, -r * 0.62, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c49a62";
  ctx.fillRect(-r * 0.95, -r * 0.6, r * 1.9, r * 1.35);
  ctx.strokeStyle = "#7a5a32";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-r * 0.95, -r * 0.6, r * 1.9, r * 1.35);
  // Flaps and tape.
  ctx.fillStyle = "#b08850";
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 0.6);
  ctx.lineTo(-r * 1.25, -r * 0.95);
  ctx.lineTo(-r * 0.55, -r * 0.95);
  ctx.lineTo(-r * 0.4, -r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.95, -r * 0.6);
  ctx.lineTo(r * 1.25, -r * 0.95);
  ctx.lineTo(r * 0.55, -r * 0.95);
  ctx.lineTo(r * 0.4, -r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(230,215,170,0.75)";
  ctx.fillRect(-r * 0.12, -r * 0.6, r * 0.24, r * 1.35);
  ctx.restore();
}

/** A cardboard tank, facing right: treads, a box hull, a turret with a paper-tube barrel and ears in the hatch. */
function tank(ctx: CanvasRenderingContext2D, r: number, anim: number) {
  shadow(ctx, r * 1.2, r * 0.7);
  ctx.fillStyle = "#3a2e26";
  ctx.beginPath();
  ctx.roundRect(-r * 1.1, r * 0.2, r * 2.2, r * 0.5, r * 0.25);
  ctx.fill();
  ctx.fillStyle = "#6a5a4a";
  for (let i = 0; i < 5; i++) {
    const x = -r * 0.85 + i * r * 0.42 + ((anim * 30) % (r * 0.42)) * 0;
    ctx.beginPath();
    ctx.arc(x, r * 0.45, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#c49a62";
  ctx.fillRect(-r * 1, -r * 0.35, r * 2, r * 0.6);
  ctx.strokeStyle = "#7a5a32";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-r * 1, -r * 0.35, r * 2, r * 0.6);
  // Front armour: a thicker, darker plate on the nose.
  ctx.fillStyle = "#8a6638";
  ctx.fillRect(r * 0.75, -r * 0.35, r * 0.25, r * 0.6);
  // Turret and barrel.
  ctx.fillStyle = "#b8905a";
  ctx.fillRect(-r * 0.45, -r * 0.8, r * 0.9, r * 0.48);
  ctx.strokeRect(-r * 0.45, -r * 0.8, r * 0.9, r * 0.48);
  ctx.fillStyle = "#e8dcc0";
  ctx.fillRect(r * 0.4, -r * 0.65, r * 0.85, r * 0.16);
  ctx.fillStyle = "#d08a3e";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.3, -r * 0.8);
    ctx.lineTo(side * r * 0.2, -r * 1.15);
    ctx.lineTo(side * r * 0.05, -r * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  // Packing tape along the hull.
  ctx.fillStyle = "rgba(230,215,170,0.75)";
  ctx.fillRect(-r * 1, -r * 0.12, r * 1.75, r * 0.14);
}

/** General Mittens' peaked cap and epaulettes. */
function generalKit(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number) {
  ctx.fillStyle = "#2f4a32";
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.05, hy - r * 0.42, r * 0.55, r * 0.22, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(hx - r * 0.45, hy - r * 0.45, r * 1, r * 0.14);
  ctx.fillStyle = "#1c2a1d";
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.35, hy - r * 0.3, r * 0.35, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e6c36a";
  ctx.fillRect(hx - r * 0.45, hy - r * 0.4, r * 1, r * 0.05);
  ctx.beginPath();
  ctx.arc(hx + r * 0.05, hy - r * 0.55, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.2, -r * 0.35, r * 0.45, r * 0.14);
}

/** Draw a goose or cat by code (a painted sprite replaces this once it exists). */
export function drawSiegeShape(
  ctx: CanvasRenderingContext2D,
  look: SiegeLook,
  x: number,
  y: number,
  r: number,
  hp: number,
  anim: number,
  boss: boolean,
  faceLeft: boolean,
  leader = false,
  stretch = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  if (faceLeft) ctx.scale(-1, 1);
  if (look === "honker" || look === "gosling" || look === "matriarch") goose(ctx, r, look, anim, leader, stretch);
  else if (look === "boxcat") box(ctx, r, anim);
  else if (look === "tank") tank(ctx, r, anim);
  else {
    const head = cat(ctx, r, anim, look === "general");
    if (look === "general") generalKit(ctx, head.hx, head.hy, r);
    else helmet(ctx, head.hx, head.hy, r);
    if (look === "para") {
      // The parachute pack on its back.
      ctx.fillStyle = "#5d6b3a";
      ctx.fillRect(-r * 0.55, -r * 0.45, r * 0.5, r * 0.45);
    }
  }
  ctx.restore();
  bar(ctx, x, y - r * (look === "honker" || look === "matriarch" ? 1.75 : 1.4) - 6, Math.min(44, r * 2), hp, boss);
}

/** A paratrooper's canopy over (x, y), `k` from 1 (just jumped) to 0 (landed). */
export function drawParachute(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 3);
  const top = y - r * 2.6;
  ctx.strokeStyle = "rgba(240,230,210,0.8)";
  ctx.lineWidth = 1;
  for (const side of [-1, -0.35, 0.35, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * r * 1.3, top);
    ctx.lineTo(x, y - r * 0.6);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(x - r * 1.4, 0, x + r * 1.4, 0);
  g.addColorStop(0, "#c9cfb0");
  g.addColorStop(0.5, "#f4f1e2");
  g.addColorStop(1, "#9aa37a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, top, r * 1.4, r * 0.75, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A trimmed box hedge on a shelf cell, a little different cell to cell. */
export function drawHedge(ctx: CanvasRenderingContext2D, c: number, r: number) {
  const x = c * CELL;
  const y = r * CELL;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 4, y + 10, CELL - 6, CELL - 10);
  ctx.fillStyle = "#24502a";
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 5, CELL - 6, CELL - 9, 8);
  ctx.fill();
  const leaf = ["#3a7a3a", "#2f6a33", "#4a8a44"];
  for (let i = 0; i < 9; i++) {
    const lx = x + 9 + ((i * 13 + c * 7) % (CELL - 18));
    const ly = y + 10 + ((i * 11 + r * 5) % (CELL - 20));
    ctx.fillStyle = leaf[(i + c + r) % leaf.length];
    ctx.beginPath();
    ctx.arc(lx, ly, 5 + ((i + c) % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(160,220,140,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 5, CELL - 6, CELL - 9, 8);
  ctx.stroke();
  ctx.restore();
}

/** A stone statue on a plinth (the Courtyard's other shelf cells). */
export function drawStatue(ctx: CanvasRenderingContext2D, c: number, r: number) {
  const x = c * CELL + CELL / 2;
  const y = r * CELL + CELL / 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 17, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8c8a84";
  ctx.fillRect(x - 14, y + 6, 28, 12);
  ctx.fillStyle = "#a8a59c";
  ctx.fillRect(x - 11, y + 2, 22, 6);
  // A robed figure reading a book.
  ctx.fillStyle = "#b8b4aa";
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 3);
  ctx.lineTo(x - 6, y - 12);
  ctx.lineTo(x + 6, y - 12);
  ctx.lineTo(x + 9, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 16, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a968c";
  ctx.fillRect(x - 6, y - 9, 12, 5);
  ctx.strokeStyle = "rgba(60,58,54,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x, y - 4);
  ctx.stroke();
  ctx.restore();
}

/** The dry fountain across a 2×2 block; (x, y) is the block's centre. */
export function drawFountain(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, CELL * 0.95, CELL * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  // The basin: a stone ring, dry and leafy inside.
  ctx.fillStyle = "#9a978e";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, CELL * 0.92, CELL * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a4238";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, CELL * 0.74, CELL * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a5a32";
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * CELL * 0.45, y + 4 + Math.sin(a) * CELL * 0.3, 4, 2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // The pedestal and the upper bowl.
  ctx.fillStyle = "#b5b1a6";
  ctx.fillRect(x - 6, y - 24, 12, 26);
  ctx.beginPath();
  ctx.ellipse(x, y - 24, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8c887e";
  ctx.beginPath();
  ctx.ellipse(x, y - 25, 15, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8c4b8";
  ctx.beginPath();
  ctx.arc(x, y - 34, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let stones: HTMLCanvasElement | null = null;
/** Flagstones for the Courtyard's floor, as a repeating pattern (until tile-floor-courtyard is painted). */
export function flagstones(ctx: CanvasRenderingContext2D): CanvasPattern | string {
  if (typeof document === "undefined") return "#5a5a56";
  if (!stones) {
    stones = document.createElement("canvas");
    stones.width = CELL * 2;
    stones.height = CELL * 2;
    const g = stones.getContext("2d");
    if (g) {
      g.fillStyle = "#3a3834";
      g.fillRect(0, 0, CELL * 2, CELL * 2);
      const tones = ["#5d5b55", "#66635c", "#57554f", "#6b675f", "#5f5c54"];
      // Irregular rectangles in a running bond, with mortar between.
      const rows = [
        [0, 0, 40, 30], [40, 0, 56, 30],
        [0, 30, 26, 34], [26, 30, 44, 34], [70, 30, 26, 34],
        [0, 64, 52, 32], [52, 64, 44, 32],
      ];
      rows.forEach(([x, y, w, h], i) => {
        g.fillStyle = tones[i % tones.length];
        g.beginPath();
        g.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 3);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.05)";
        g.fillRect(x + 3, y + 3, w - 8, 3);
      });
      g.fillStyle = "rgba(90,120,70,0.35)";
      for (const [x, y] of [[40, 30], [70, 64], [26, 64], [52, 96]]) g.fillRect(x - 1, y - 2, 3, 4);
    }
  }
  return ctx.createPattern(stones, "repeat") ?? "#5a5a56";
}

/**
 * A paratrooper drop point: a faint chalk target on the carpet. `active` (a wave lands on it) makes it glow,
 * and `soon` (seconds until the next landing, or null) pulses it hard with a countdown ring.
 */
export function drawDropMarker(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean, soon: number | null, anim: number) {
  ctx.save();
  const pulse = soon != null ? 0.6 + Math.sin(anim * 12) * 0.4 : active ? 0.55 + Math.sin(anim * 3) * 0.25 : 0;
  if (pulse > 0) {
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 34);
    glow.addColorStop(0, `rgba(250,240,200,${0.45 * pulse})`);
    glow.addColorStop(1, "rgba(250,240,200,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(245,240,225,${0.35 + pulse * 0.5})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 22, y);
  ctx.lineTo(x - 12, y);
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x + 22, y);
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x, y - 12);
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x, y + 22);
  ctx.stroke();
  if (soon != null) {
    ctx.strokeStyle = "rgba(255,214,120,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, soon / 3)));
    ctx.stroke();
  }
  ctx.restore();
}

/** A goose and a cat fighting: a dust cloud with feathers and fur flying out. */
export function drawBrawl(ctx: CanvasRenderingContext2D, b: { x: number; y: number; life: number; max: number }, anim: number) {
  const k = b.life / b.max;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2.5);
  for (let i = 0; i < 6; i++) {
    const a = anim * 5 + i * 1.05;
    const d = 9 + Math.sin(anim * 7 + i) * 3;
    ctx.fillStyle = i % 2 ? "rgba(200,190,170,0.75)" : "rgba(170,160,140,0.7)";
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7, 8 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Feathers (white) and tufts of fur (orange) spinning out.
  for (let i = 0; i < 4; i++) {
    const a = anim * 3 + i * 1.6;
    const d = 18 + (1 - k) * 14;
    ctx.save();
    ctx.translate(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7 - 6);
    ctx.rotate(a * 2);
    ctx.fillStyle = i % 2 ? "#f6f3ea" : "#d08a3e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#fff4d0";
  ctx.font = "700 12px 'Outfit Variable', Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(Math.sin(anim * 9) > 0 ? "!!" : "#@!", b.x, b.y - 22);
  ctx.restore();
}
