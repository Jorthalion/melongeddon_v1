/**
 * Procedural art for the newer cannons (no sprite files yet).
 * Everything is drawn around (x, y) in a ~44px box, matching the painted cannons' footprint.
 * To swap in painted art later, draw a sprite here instead (see blit() in draw.ts).
 */
import type { TowerKind } from "./rules.ts";

export const DRAWN_KINDS: TowerKind[] = ["spitter", "ballista", "reader", "bell", "hive", "lantern", "ink", "compost", "peeler", "bookworm"];

const WOOD = "#5a3a22";
const WOOD_DARK = "#2e1d12";
const BRASS = "#c6a15a";
const BRASS_LIGHT = "#ecd394";

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w = 16) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, w, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function plinth(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = WOOD_DARK;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 17, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCannon(ctx: CanvasRenderingContext2D, x: number, y: number, aim: number, kind: TowerKind, t = 0) {
  ctx.save();
  switch (kind) {
    case "spitter": {
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.translate(x, y - 1);
      ctx.rotate(aim);
      ctx.fillStyle = "#7a5a34";
      rrect(ctx, -8, -8, 16, 16, 4);
      ctx.fill();
      ctx.fillStyle = "#d8b878";
      for (const dy of [-5, 0, 5]) {
        rrect(ctx, 4, dy - 2, 15, 4, 2);
        ctx.fill();
      }
      ctx.fillStyle = WOOD_DARK;
      for (const dy of [-5, 0, 5]) {
        ctx.beginPath();
        ctx.arc(19, dy, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "ballista": {
      shadow(ctx, x, y, 18);
      plinth(ctx, x, y);
      ctx.translate(x, y - 1);
      ctx.rotate(aim);
      ctx.fillStyle = "#8a5a32";
      rrect(ctx, -10, -3, 24, 6, 2);
      ctx.fill();
      ctx.strokeStyle = "#a8743e";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-2, 0, 15, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = "#efe0c0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2 + 15 * Math.cos(-1.2), 15 * Math.sin(-1.2));
      ctx.lineTo(-9, 0);
      ctx.lineTo(-2 + 15 * Math.cos(1.2), 15 * Math.sin(1.2));
      ctx.stroke();
      ctx.fillStyle = "#c9c2b4";
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(15, -4);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "reader": {
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(x - 1.5, y - 4, 3, 10);
      ctx.translate(x, y - 4);
      ctx.rotate(aim);
      const g = ctx.createLinearGradient(0, -4, 0, 4);
      g.addColorStop(0, BRASS_LIGHT);
      g.addColorStop(1, "#8d6730");
      ctx.fillStyle = g;
      rrect(ctx, -12, -3.5, 34, 7, 3);
      ctx.fill();
      ctx.fillStyle = "#6a4a22";
      ctx.fillRect(-2, -4.5, 3, 9);
      ctx.fillStyle = "#9fd0e8";
      ctx.beginPath();
      ctx.arc(22, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bell": {
      shadow(ctx, x, y);
      ctx.fillStyle = WOOD;
      ctx.fillRect(x - 15, y - 18, 3, 30);
      ctx.fillRect(x + 12, y - 18, 3, 30);
      ctx.fillRect(x - 15, y - 20, 30, 4);
      const swing = Math.sin(t * 2) * 0.08;
      ctx.translate(x, y - 16);
      ctx.rotate(swing);
      const g = ctx.createLinearGradient(-10, 0, 10, 0);
      g.addColorStop(0, "#8d6730");
      g.addColorStop(0.45, BRASS_LIGHT);
      g.addColorStop(1, "#8d6730");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      ctx.quadraticCurveTo(-7, 14, -12, 22);
      ctx.lineTo(12, 22);
      ctx.quadraticCurveTo(7, 14, 5, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = WOOD_DARK;
      ctx.beginPath();
      ctx.arc(0, 24, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "hive": {
      shadow(ctx, x, y);
      ctx.translate(x, y);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? "#a77a32" : "#d9ab52";
        const w = 16 - i * 3;
        rrect(ctx, -w, 10 - i * 8, w * 2, 9, 4);
        ctx.fill();
      }
      ctx.fillStyle = "#2a1a10";
      ctx.beginPath();
      ctx.ellipse(0, 10, 4, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1b1410";
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + i * 2.1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 16, -10 + Math.sin(a * 1.3) * 6, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "lantern": {
      const flick = 0.85 + Math.sin(t * 9) * 0.06 + Math.sin(t * 13) * 0.04;
      const glow = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, 30);
      glow.addColorStop(0, `rgba(255,214,140,${0.55 * flick})`);
      glow.addColorStop(1, "rgba(255,214,140,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y - 6, 30, 0, Math.PI * 2);
      ctx.fill();
      shadow(ctx, x, y, 12);
      ctx.fillStyle = WOOD_DARK;
      rrect(ctx, x - 11, y + 8, 22, 6, 2);
      ctx.fill();
      ctx.fillStyle = BRASS;
      ctx.fillRect(x - 1.5, y - 4, 3, 13);
      ctx.fillStyle = `rgba(255,226,160,${0.9 * flick})`;
      rrect(ctx, x - 7, y - 20, 14, 16, 4);
      ctx.fill();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#3a6a3e";
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 18);
      ctx.lineTo(x + 12, y - 18);
      ctx.lineTo(x + 6, y - 26);
      ctx.lineTo(x - 6, y - 26);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "ink": {
      shadow(ctx, x, y, 13);
      ctx.fillStyle = "#1d2640";
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 13, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2d3b66";
      ctx.fillRect(x - 6, y - 10, 12, 6);
      ctx.fillStyle = "#0c1020";
      ctx.beginPath();
      ctx.ellipse(x, y - 10, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(160,180,230,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x - 4, y + 2, 5, 3.6, 4.6);
      ctx.stroke();
      ctx.translate(x, y - 10);
      ctx.rotate(aim);
      ctx.strokeStyle = "#efe7d6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();
      ctx.fillStyle = "#f6efe0";
      ctx.beginPath();
      ctx.ellipse(10, -3, 8, 3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "compost": {
      shadow(ctx, x, y, 18);
      ctx.fillStyle = "#4a3220";
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 18, 11, 0, Math.PI, 0);
      ctx.lineTo(x + 18, y + 10);
      ctx.lineTo(x - 18, y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6a4a2c";
      for (const [dx, dy, r] of [[-8, 2, 4], [5, -1, 5], [10, 5, 3], [-2, 6, 3]] as const) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.arc(x - 9, y - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6fae4f";
      ctx.lineWidth = 2;
      for (const dx of [-3, 3, 8]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y - 3);
        ctx.quadraticCurveTo(x + dx - 3, y - 10, x + dx + 1, y - 14);
        ctx.stroke();
      }
      ctx.fillStyle = "#8fd06a";
      ctx.beginPath();
      ctx.ellipse(x + 4, y - 14, 4, 2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "peeler": {
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.translate(x, y - 1);
      ctx.rotate(aim);
      ctx.fillStyle = "#6d4a2a";
      rrect(ctx, -9, -5, 20, 10, 3);
      ctx.fill();
      ctx.fillStyle = "#d9dde2";
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.quadraticCurveTo(24, -4, 22, 0);
      ctx.quadraticCurveTo(24, 4, 10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#8a9096";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      ctx.strokeStyle = "#e8a35a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, -10, 4, 0.2, 3.6);
      ctx.stroke();
      break;
    }
    case "bookworm": {
      shadow(ctx, x, y);
      ctx.translate(x, y + 2);
      ctx.fillStyle = "#7a2630";
      rrect(ctx, -14, -10, 28, 20, 2);
      ctx.fill();
      ctx.fillStyle = "#efe2c4";
      ctx.fillRect(-12, -9, 24, 2.5);
      ctx.fillStyle = BRASS;
      ctx.fillRect(-14, -1, 28, 2);
      const look = Math.max(-0.6, Math.min(0.6, Math.cos(aim) * 0.6));
      const bob = Math.sin(t * 4) * 1.5;
      ctx.fillStyle = "#e79ab0";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(2 + i * 3 * look, -12 - i * 4 + bob * (i / 3), 4 - i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#1b1410";
      ctx.beginPath();
      ctx.arc(2 + 9 * look + 1.5, -24 + bob, 1.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** Small projectiles for the newer cannons. */
export function drawShot(ctx: CanvasRenderingContext2D, x: number, y: number, element: string, t: number) {
  ctx.save();
  if (element === "seed") {
    ctx.fillStyle = "#e9d6a4";
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (element === "fly") {
    ctx.fillStyle = "rgba(220,230,240,0.7)";
    const flap = Math.abs(Math.sin(t * 40)) * 3 + 1;
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 2, 3, flap, -0.6, 0, Math.PI * 2);
    ctx.ellipse(x + 2, y - 2, 3, flap, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#151010";
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (element === "ink") {
    ctx.fillStyle = "#1d2640";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120,140,200,0.6)";
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (element === "peel") {
    ctx.strokeStyle = "#e8a35a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 5, t * 20, t * 20 + 4);
    ctx.stroke();
  } else if (element === "worm") {
    ctx.fillStyle = "#e79ab0";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - i * 3, y + Math.sin(t * 20 + i) * 1.5, 3 - i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draw a cannon centered in a small canvas (build bar and inspector icons). */
export function drawCannonIcon(ctx: CanvasRenderingContext2D, kind: TowerKind, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const s = Math.min(w, h) / 44;
  ctx.save();
  ctx.scale(s, s);
  drawCannon(ctx, w / s / 2, h / s / 2 + 2, kind === "ink" ? -0.4 : 0, kind, 0.4);
  ctx.restore();
}
