/**
 * Procedural art for the newer cannons, used while their painted sprites load (see drawPaintedCannon in draw.ts).
 * Everything is drawn around (x, y) in a ~44px box, matching the painted cannons' footprint.
 * To swap in painted art later, draw a sprite here instead (see blit() in draw.ts).
 */
import type { TowerKind } from "./rules.ts";

export const DRAWN_KINDS: TowerKind[] = [
  "spitter", "ballista", "reader", "bell", "hive", "lantern", "ink", "compost", "peeler", "bookworm",
  "boomerang", "orrery", "plane",
  "catalogue", "cauldron", "trebuchet", "scales", "mimic", "lectern",
];

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
    case "boomerang": {
      // A bookend thrower: a sling arm that turns to aim, a curved bookend loaded on it.
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.translate(x, y - 2);
      ctx.rotate(aim);
      ctx.fillStyle = WOOD_DARK;
      rrect(ctx, -6, -5, 22, 10, 3);
      ctx.fill();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.rotate(-0.4);
      drawBoomerangShape(ctx, 10, 0, 11, t * 0);
      break;
    }
    case "orrery": {
      // Brass rings on a stand with a little sun in the middle.
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.translate(x, y - 6);
      ctx.strokeStyle = BRASS_LIGHT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 5, 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = BRASS;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 7, -0.6 + Math.sin(t) * 0.1, 0, Math.PI * 2);
      ctx.stroke();
      const sun = ctx.createRadialGradient(0, 0, 1, 0, 0, 6);
      sun.addColorStop(0, "#fff2c4");
      sun.addColorStop(1, "#d4a03a");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(-1.5, 5, 3, 8);
      break;
    }
    case "plane": {
      // A little launch rail with a folded paper plane ready to go.
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.translate(x, y - 2);
      ctx.rotate(aim);
      ctx.fillStyle = WOOD_DARK;
      rrect(ctx, -12, -3, 22, 6, 2);
      ctx.fill();
      drawPlaneShape(ctx, 2, 0, 12);
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
    case "catalogue": {
      // Mynxi: a card-catalogue cabinet with a brass index rod that aims.
      shadow(ctx, x, y, 17);
      ctx.translate(x, y);
      ctx.fillStyle = "#6b4426";
      rrect(ctx, -14, -10, 28, 24, 3);
      ctx.fill();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      for (const [dx, dy] of [[-7, -4], [7, -4], [-7, 6], [7, 6]]) {
        ctx.fillStyle = "#8a5c34";
        rrect(ctx, dx - 6, dy - 4, 12, 8, 1.5);
        ctx.fill();
        ctx.fillStyle = "#efe2c4";
        ctx.fillRect(dx - 3, dy - 2.5, 6, 2.5);
        ctx.fillStyle = BRASS_LIGHT;
        ctx.beginPath();
        ctx.arc(dx, dy + 2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.translate(0, -12);
      ctx.rotate(aim);
      ctx.fillStyle = BRASS;
      rrect(ctx, -3, -2.5, 22, 5, 2);
      ctx.fill();
      ctx.fillStyle = "#f5f0e2";
      ctx.fillRect(14, -5, 7, 10);
      ctx.strokeStyle = "#c23a3a";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(15, -2);
      ctx.lineTo(20, -2);
      ctx.stroke();
      break;
    }
    case "cauldron": {
      // Vael: a black cauldron on legs, bubbling green.
      shadow(ctx, x, y, 17);
      ctx.translate(x, y + 2);
      ctx.strokeStyle = "#2a2422";
      ctx.lineWidth = 3;
      for (const dx of [-10, 10]) {
        ctx.beginPath();
        ctx.moveTo(dx, 4);
        ctx.lineTo(dx * 1.3, 14);
        ctx.stroke();
      }
      ctx.fillStyle = "#e8883a";
      ctx.beginPath();
      ctx.ellipse(0, 13, 7 + Math.sin(t * 9) * 1.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#26201f";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#3a3230";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5fd36a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(190,255,170,0.85)";
      for (let i = 0; i < 3; i++) {
        const ph = (t * 1.6 + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(-6 + i * 6, -2 - ph * 12, 2.4 * (1 - ph) + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "trebuchet": {
      // Sir Michael: a wooden trebuchet with a pumpkin in the sling.
      shadow(ctx, x, y, 19);
      ctx.translate(x, y + 4);
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(-16, 8, 32, 5);
      ctx.fillStyle = WOOD;
      ctx.beginPath();
      ctx.moveTo(-10, 9);
      ctx.lineTo(0, -10);
      ctx.lineTo(10, 9);
      ctx.lineTo(7, 9);
      ctx.lineTo(0, -4);
      ctx.lineTo(-7, 9);
      ctx.closePath();
      ctx.fill();
      ctx.translate(0, -8);
      // The arm points back, away from the aim, like it is cocked.
      ctx.rotate(aim + Math.PI + Math.sin(t * 2) * 0.05);
      ctx.fillStyle = "#8a5a32";
      rrect(ctx, -8, -2, 30, 4, 2);
      ctx.fill();
      ctx.fillStyle = "#4a4a4a";
      rrect(ctx, -13, -5, 7, 10, 1.5);
      ctx.fill();
      ctx.fillStyle = "#e8883a";
      ctx.beginPath();
      ctx.arc(24, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3f7a3a";
      ctx.fillRect(23, -7, 2, 3);
      break;
    }
    case "scales": {
      // Legal Elf: gold scales of justice on a dark column with a green gem.
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.translate(x, y);
      ctx.fillStyle = "#1e1a17";
      ctx.fillRect(-2, -18, 4, 24);
      ctx.fillStyle = "#2f8a52";
      ctx.beginPath();
      ctx.arc(0, -19, 2.5, 0, Math.PI * 2);
      ctx.fill();
      const tilt = Math.sin(t * 1.5) * 0.12 + Math.cos(aim) * 0.1;
      ctx.translate(0, -15);
      ctx.rotate(tilt);
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.stroke();
      for (const dx of [-13, 13]) {
        ctx.save();
        ctx.translate(dx, 0);
        ctx.rotate(-tilt);
        ctx.strokeStyle = BRASS_LIGHT;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, 10);
        ctx.moveTo(0, 0);
        ctx.lineTo(5, 10);
        ctx.stroke();
        ctx.fillStyle = BRASS;
        ctx.beginPath();
        ctx.ellipse(0, 11, 6.5, 2.4, 0, 0, Math.PI);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "mimic": {
      // Ooze's Memec: a treasure chest with teeth and one blue eye.
      shadow(ctx, x, y, 17);
      ctx.translate(x, y + 3);
      const open = 0.25 + Math.max(0, Math.sin(t * 3)) * 0.2;
      ctx.fillStyle = "#7a4a26";
      rrect(ctx, -15, -2, 30, 15, 2);
      ctx.fill();
      ctx.fillStyle = BRASS;
      ctx.fillRect(-15, 2, 30, 2);
      ctx.fillRect(-2, -2, 4, 15);
      ctx.fillStyle = "#3a0e14";
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(13, -2);
      ctx.lineTo(13, -2 - open * 18);
      ctx.lineTo(-13, -2 - open * 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f5efe0";
      for (let i = -12; i <= 9; i += 4.2) {
        ctx.beginPath();
        ctx.moveTo(i, -2);
        ctx.lineTo(i + 2, -6);
        ctx.lineTo(i + 4, -2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(0, -2);
      ctx.rotate(-open * 0.9);
      ctx.fillStyle = "#8a5430";
      rrect(ctx, -15, -9, 30, 9, 3);
      ctx.fill();
      ctx.fillStyle = BRASS;
      ctx.fillRect(-15, -4, 30, 1.6);
      ctx.restore();
      ctx.fillStyle = "#6fc6ef";
      ctx.beginPath();
      ctx.arc(Math.cos(aim) * 3, -9 - open * 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#10202a";
      ctx.beginPath();
      ctx.arc(Math.cos(aim) * 4, -9 - open * 8, 1.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "lectern": {
      // Dr. Samodovol: a reading lectern with an open book and a soft glow.
      const glow = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, 30);
      glow.addColorStop(0, "rgba(230,195,106,0.28)");
      glow.addColorStop(1, "rgba(230,195,106,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y - 6, 30, 0, Math.PI * 2);
      ctx.fill();
      shadow(ctx, x, y);
      ctx.translate(x, y);
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(-8, 10, 16, 4);
      ctx.fillStyle = WOOD;
      ctx.fillRect(-2.5, -4, 5, 15);
      ctx.beginPath();
      ctx.moveTo(-15, -4);
      ctx.lineTo(15, -4);
      ctx.lineTo(12, -11);
      ctx.lineTo(-12, -11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f3e7c9";
      ctx.beginPath();
      ctx.moveTo(-12, -9);
      ctx.quadraticCurveTo(-6, -15, 0, -11);
      ctx.quadraticCurveTo(6, -15, 12, -9);
      ctx.lineTo(0, -6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#8d6730";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(0, -6);
      ctx.stroke();
      ctx.fillStyle = "#7a2630";
      ctx.fillRect(3, -9, 1.2, 8 + Math.sin(t * 2) * 0.8);
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
  } else if (element === "potion") {
    ctx.fillStyle = "#3fae4f";
    ctx.beginPath();
    ctx.arc(x, y + 1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9e7d0";
    ctx.fillRect(x - 1.5, y - 6, 3, 4);
    ctx.fillStyle = "rgba(220,255,210,0.8)";
    ctx.beginPath();
    ctx.arc(x - 1.5, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
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

/** A curved bookend boomerang, centered at (x, y), about `size` px across, turned by `spin`. */
export function drawBoomerangShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, spin: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = "#b8743a";
  ctx.strokeStyle = "#3a2214";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-size, size * 0.55);
  ctx.quadraticCurveTo(-size * 0.2, -size * 0.2, 0, -size * 0.55);
  ctx.quadraticCurveTo(size * 0.2, -size * 0.2, size, size * 0.55);
  ctx.quadraticCurveTo(size * 0.55, size * 0.45, 0, -size * 0.05);
  ctx.quadraticCurveTo(-size * 0.55, size * 0.45, -size, size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e6c36a";
  ctx.beginPath();
  ctx.arc(0, -size * 0.25, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A folded paper plane pointing along +x, centered at (x, y), about `size` px long. */
export function drawPlaneShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f6efe2";
  ctx.strokeStyle = "#7a6a52";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.8, -size * 0.6);
  ctx.lineTo(-size * 0.45, 0);
  ctx.lineTo(-size * 0.8, size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d8ccb4";
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.45, 0);
  ctx.lineTo(-size * 0.8, size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
