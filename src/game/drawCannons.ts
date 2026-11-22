/**
 * Procedural art for the newer cannons, used while their painted sprites load (see drawPaintedCannon in draw.ts).
 * Everything is drawn around (x, y) in a ~44px box, matching the painted cannons' footprint.
 * To swap in painted art later, draw a sprite here instead (see blit() in draw.ts).
 */
import type { TowerKind } from "./rules.ts";

export const DRAWN_KINDS: TowerKind[] = [
  "spitter", "ballista", "reader", "bell", "hive", "lantern", "ink", "compost", "peeler", "bookworm",
  "boomerang", "orrery", "plane", "quill", "globe",
  "press", "organ", "scope",
  "catalogue", "desk", "cauldron", "flask", "trebuchet", "scales", "stomp", "honey", "mimic", "copycat", "lectern", "quackliber", "geese", "lionblade", "gourdgate", "bombard", "pamphlet", "driver", "underlings", "spire",
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
    case "flask": {
      // Vael: a big glass flask tipped on its side, stopper gone, green potion running out of the neck.
      shadow(ctx, x, y, 18);
      ctx.translate(x, y + 2);
      ctx.fillStyle = "rgba(111,190,90,0.55)";
      ctx.beginPath();
      ctx.ellipse(10, 9, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(-0.35);
      // Body and liquid.
      ctx.fillStyle = "rgba(200,225,235,0.35)";
      ctx.beginPath();
      ctx.arc(-6, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5fae4a";
      ctx.beginPath();
      ctx.arc(-6, 0, 12, 0.2, Math.PI - 0.2);
      ctx.closePath();
      ctx.fill();
      // Neck.
      ctx.fillStyle = "rgba(200,225,235,0.45)";
      ctx.fillRect(4, -4, 12, 8);
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-6, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(4, -4, 12, 8);
      ctx.fillStyle = BRASS_LIGHT;
      ctx.fillRect(15, -5, 2.5, 10);
      // A highlight on the glass.
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-6, 0, 8, -2.4, -1.4);
      ctx.stroke();
      break;
    }
    case "press": {
      // A squat iron printing press: two posts, a platen, a big brass screw wheel on top, a sheet in the bed.
      shadow(ctx, x, y, 19);
      ctx.translate(x, y);
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(-18, 2, 36, 10);
      ctx.fillStyle = "#efe2c2";
      ctx.fillRect(-14, 0, 28, 4);
      ctx.fillStyle = "#2c2a2e";
      ctx.fillRect(-16, -18, 5, 22);
      ctx.fillRect(11, -18, 5, 22);
      ctx.fillRect(-16, -20, 32, 5);
      ctx.fillRect(-12, -8, 24, 4);
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(0, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -23, 11, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = BRASS_LIGHT;
      ctx.beginPath();
      ctx.arc(0, -23, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "organ": {
      // A little pipe organ: a carved wooden case with a row of brass pipes, the middle ones tallest.
      shadow(ctx, x, y, 19);
      ctx.translate(x, y);
      ctx.fillStyle = WOOD;
      rrect(ctx, -18, -4, 36, 16, 2);
      ctx.fill();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const heights = [14, 20, 26, 30, 26, 20, 14];
      heights.forEach((h, i) => {
        const px = -15 + i * 5;
        const g = ctx.createLinearGradient(px, 0, px + 4, 0);
        g.addColorStop(0, "#8d6730");
        g.addColorStop(0.5, BRASS_LIGHT);
        g.addColorStop(1, "#8d6730");
        ctx.fillStyle = g;
        ctx.fillRect(px, -4 - h, 4, h);
        ctx.fillStyle = "#2a1a12";
        ctx.fillRect(px + 1, -4 - h * 0.35, 2, 2);
      });
      ctx.fillStyle = "#efe2c2";
      ctx.fillRect(-14, 4, 28, 3);
      break;
    }
    case "scope": {
      // A long brass telescope on a wooden tripod, swung to aim.
      shadow(ctx, x, y);
      ctx.translate(x, y);
      ctx.strokeStyle = WOOD_DARK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(-11, 14);
      ctx.moveTo(0, -4);
      ctx.lineTo(11, 14);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 15);
      ctx.stroke();
      ctx.rotate(aim);
      const g = ctx.createLinearGradient(0, -5, 0, 5);
      g.addColorStop(0, BRASS_LIGHT);
      g.addColorStop(1, "#8d6730");
      ctx.fillStyle = g;
      ctx.fillRect(-12, -4, 18, 8);
      ctx.fillRect(4, -5.5, 16, 11);
      ctx.fillStyle = "#1e1a17";
      ctx.fillRect(18, -4, 3, 8);
      ctx.fillStyle = "#9fd3ee";
      ctx.fillRect(20, -3, 1.5, 6);
      break;
    }
    case "copycat": {
      // Memec's Mimic, blank: a small closed chest with one sleepy eye peeking from under the lid.
      shadow(ctx, x, y);
      ctx.translate(x, y + 2);
      ctx.fillStyle = WOOD;
      rrect(ctx, -14, -8, 28, 18, 3);
      ctx.fill();
      ctx.fillStyle = "#7a4d2c";
      rrect(ctx, -15, -14, 30, 9, 4);
      ctx.fill();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-14, -8, 28, 18);
      ctx.fillRect(-2, -8, 4, 6);
      ctx.fillStyle = "#6fc6ef";
      ctx.beginPath();
      ctx.ellipse(6, -5, 3.2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "desk": {
      // Mynxi: a small reserve desk, an open ledger and a brass cash box on top.
      shadow(ctx, x, y, 18);
      ctx.translate(x, y);
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(-17, -2, 4, 16);
      ctx.fillRect(13, -2, 4, 16);
      const top = ctx.createLinearGradient(0, -10, 0, 2);
      top.addColorStop(0, "#7a4d2c");
      top.addColorStop(1, WOOD);
      ctx.fillStyle = top;
      rrect(ctx, -19, -10, 38, 12, 2);
      ctx.fill();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Ledger (left) and cash box (right).
      ctx.fillStyle = "#efe2c2";
      ctx.fillRect(-15, -15, 13, 6);
      ctx.strokeStyle = "#8a2b2b";
      ctx.beginPath();
      ctx.moveTo(-8.5, -15);
      ctx.lineTo(-8.5, -9);
      ctx.stroke();
      ctx.fillStyle = BRASS;
      rrect(ctx, 2, -19, 13, 10, 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a14";
      ctx.fillRect(6, -16, 5, 1.5);
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
    case "quill": {
      // An inkwell with a long quill that turns to aim.
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.fillStyle = "#1c2440";
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#3b4f8f";
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(x, y - 3);
      ctx.rotate(aim);
      drawQuillShape(ctx, 6, 0, 15);
      break;
    }
    case "globe": {
      // A library globe on a brass stand.
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(x - 1.5, y - 2, 3, 9);
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, y - 8, 12, Math.PI * 0.15, Math.PI * 1.15);
      ctx.stroke();
      drawGlobeShape(ctx, x, y - 8, 10, t * 0.6);
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
      // Sir Michael's Dragonfire Trebuchet: a wooden trebuchet with a blue-burning pumpkin in the sling.
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
    case "honey": {
      // Legal Elf: a squat honey pot dripping amber, the heel of a big foot dipped into it.
      shadow(ctx, x, y, 17);
      ctx.translate(x, y + 2);
      ctx.fillStyle = "#b8742a";
      ctx.beginPath();
      ctx.ellipse(0, 4, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8b84a";
      ctx.beginPath();
      ctx.ellipse(0, -6, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = WOOD_DARK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-13, -1);
      ctx.lineTo(13, -1);
      ctx.stroke();
      // Drips down the side.
      ctx.fillStyle = "#e8b84a";
      ctx.fillRect(-9, -4, 3, 8);
      ctx.fillRect(5, -4, 3, 5);
      // The foot, heel down in the honey, toes up.
      ctx.fillStyle = "#e9c3a0";
      ctx.beginPath();
      ctx.ellipse(2, -16, 6, 11, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d9ad88";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(8 + i * 1.5, -25 + i * 3, 2.2 - i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(232,184,74,0.9)";
      ctx.beginPath();
      ctx.ellipse(-2, -8, 6, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "stomp": {
      // Legal Elf: a giant green-stockinged foot on a gavel-block plinth, heel up, ready to come down.
      shadow(ctx, x, y);
      plinth(ctx, x, y);
      ctx.translate(x, y);
      const lift = Math.sin(t * 2.2) * 1.5;
      ctx.translate(0, -6 + lift);
      drawFootShape(ctx, 1);
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
    case "underlings": {
      // Vaelithra's Underlings (stand-in): a dark desk with a purple neon lamp, a stack of vials and a small hooded intern.
      shadow(ctx, x, y, 18);
      ctx.translate(x, y);
      ctx.fillStyle = "#17121c";
      rrect(ctx, -16, 0, 32, 10, 2);
      ctx.fill();
      ctx.fillStyle = "#2a2133";
      rrect(ctx, -16, -3, 32, 5, 2);
      ctx.fill();
      ctx.strokeStyle = "#b9b4c8";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-16, -3, 32, 5);
      // The lamp: a neon arc and its glow.
      const lamp = ctx.createRadialGradient(-10, -10, 1, -10, -10, 12);
      lamp.addColorStop(0, `rgba(190,110,255,${0.55 + Math.sin(t * 3) * 0.12})`);
      lamp.addColorStop(1, "rgba(190,110,255,0)");
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(-10, -10, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d9a8ff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-10, -6, 4, Math.PI, 0);
      ctx.stroke();
      // Vials.
      for (const [vx, c] of [[2, "#9d6bff"], [6, "#c49bff"], [10, "#7a4fd8"]] as const) {
        ctx.fillStyle = c;
        rrect(ctx, vx, -9, 3, 6, 1);
        ctx.fill();
      }
      // A hooded intern with a purple lanyard.
      ctx.fillStyle = "#231a2c";
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.quadraticCurveTo(12, -2, 17, -6);
      ctx.quadraticCurveTo(22, -2, 24, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#b9a2ea";
      ctx.fillRect(16.4, -1, 1.2, 6);
      break;
    }
    case "spire": {
      // Vaelithra's Nexus Spire (stand-in): a black corporate tower with purple neon windows on a round dark base.
      shadow(ctx, x, y, 15);
      ctx.translate(x, y);
      ctx.fillStyle = "#141018";
      ctx.beginPath();
      ctx.ellipse(0, 12, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0d0a10";
      ctx.beginPath();
      ctx.moveTo(-8, 12);
      ctx.lineTo(-5, -22);
      ctx.lineTo(0, -28);
      ctx.lineTo(5, -22);
      ctx.lineTo(8, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#a8a2b8";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      for (let row = 0; row < 6; row++) {
        const on = (Math.floor(t * 2) + row) % 5 !== 0;
        ctx.fillStyle = on ? "#b16cff" : "#3b2a4d";
        ctx.fillRect(-4, 8 - row * 5, 2.5, 2);
        ctx.fillRect(1.5, 8 - row * 5, 2.5, 2);
      }
      ctx.fillStyle = "#d9a8ff";
      ctx.beginPath();
      ctx.arc(0, -28, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "pamphlet": {
      // Quackarot's Pamphlet (stand-in): a stubby orange megaphone launcher on a round base, a rolled pamphlet in its mouth, a fuse on top.
      shadow(ctx, x, y, 17);
      ctx.translate(x, y);
      ctx.fillStyle = "#1d1a1c";
      ctx.beginPath();
      ctx.ellipse(0, 10, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // The megaphone: narrow at the back, wide at the mouth.
      ctx.fillStyle = "#e8742a";
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.lineTo(8, -10);
      ctx.lineTo(8, 10);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1d1a1c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -4.5);
      ctx.lineTo(-6, 5.5);
      ctx.stroke();
      // The rolled pamphlet sticking out of the mouth.
      ctx.fillStyle = "#f3e2c4";
      rrect(ctx, 6, -4, 10, 8, 3);
      ctx.fill();
      ctx.strokeStyle = "#b9a37c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(15, 0, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      // The fuse.
      ctx.strokeStyle = "#3a2618";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -5);
      ctx.quadraticCurveTo(-8, -13, -2, -16);
      ctx.stroke();
      break;
    }
    case "driver": {
      // Quackarot's Instant Quackmission (stand-in): a chunky orange-and-black hand tool upright in a little stand, its tip glowing green-white.
      shadow(ctx, x, y, 15);
      ctx.translate(x, y);
      ctx.fillStyle = "#2a2426";
      rrect(ctx, -10, 8, 20, 6, 2);
      ctx.fill();
      ctx.fillStyle = "#e8742a";
      rrect(ctx, -5, -6, 10, 15, 3);
      ctx.fill();
      ctx.fillStyle = "#1d1a1c";
      ctx.fillRect(-5, -1, 10, 2.5);
      ctx.fillRect(-5, 3.5, 10, 2.5);
      ctx.fillStyle = "#5a5056";
      rrect(ctx, -2.5, -17, 5, 12, 1.5);
      ctx.fill();
      const pulse = 0.6 + Math.sin(t * 9) * 0.3;
      ctx.fillStyle = `rgba(200,255,215,${pulse})`;
      ctx.beginPath();
      ctx.arc(0, -18, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(120,255,160,0.25)";
      ctx.beginPath();
      ctx.arc(0, -18, 6.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "quackliber": {
      // Quackarot: his orange-and-black backpack turret, two barrels, a duck on the side.
      shadow(ctx, x, y, 18);
      ctx.translate(x, y);
      // The pack: black, orange straps.
      ctx.fillStyle = "#1d1a1c";
      rrect(ctx, -13, -4, 26, 18, 5);
      ctx.fill();
      ctx.fillStyle = "#e8742a";
      ctx.fillRect(-9, -4, 3, 18);
      ctx.fillRect(6, -4, 3, 18);
      // Duck emblem.
      ctx.fillStyle = "#f2c94c";
      ctx.beginPath();
      ctx.arc(0, 7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1.5, 3.4, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8742a";
      ctx.beginPath();
      ctx.moveTo(3.6, 3.2);
      ctx.lineTo(6.4, 3.8);
      ctx.lineTo(3.6, 4.6);
      ctx.closePath();
      ctx.fill();
      // The turret on top turns; two barrels, the near one recoils a touch.
      ctx.translate(0, -6);
      ctx.rotate(aim);
      ctx.fillStyle = "#e8742a";
      rrect(ctx, -8, -7, 16, 14, 4);
      ctx.fill();
      ctx.fillStyle = "#2a2426";
      const kick = Math.max(0, Math.sin(t * 6)) * 1.2;
      rrect(ctx, 3 - kick, -6, 17, 4.5, 1.5);
      ctx.fill();
      rrect(ctx, 3, 1.5, 17, 4.5, 1.5);
      ctx.fill();
      ctx.fillStyle = "#e8742a";
      ctx.fillRect(18 - kick, -6, 2, 4.5);
      ctx.fillRect(18, 1.5, 2, 4.5);
      ctx.fillStyle = "#1d1a1c";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "gourdgate": {
      // Sir Michael's Dragon Gate (stand-in until its art exists): a grey stone gatehouse with a dragon's-head arch,
      // blue banners and a portcullis grille.
      shadow(ctx, x, y, 18);
      ctx.translate(x, y);
      ctx.fillStyle = "#5d6270";
      rrect(ctx, -17, -10, 34, 26, 4);
      ctx.fill();
      ctx.fillStyle = "#454a57";
      for (const k of [-17, -7, 3, 13]) ctx.fillRect(k, -14, 5, 5);
      ctx.fillStyle = "#1c2233";
      rrect(ctx, -8, -2, 16, 18, 6);
      ctx.fill();
      ctx.strokeStyle = "#c6a15a";
      ctx.lineWidth = 1.5;
      for (const k of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(k, 0);
        ctx.lineTo(k, 15);
        ctx.stroke();
      }
      // The dragon's head over the arch: a blue snout and two gold horns.
      ctx.fillStyle = "#2c4f8f";
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(0, -12);
      ctx.lineTo(6, -4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#e6c36a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -9);
      ctx.lineTo(-8, -15);
      ctx.moveTo(4, -9);
      ctx.lineTo(8, -15);
      ctx.stroke();
      ctx.fillStyle = "#8fd0ff";
      ctx.fillRect(-3, -8, 2, 2);
      ctx.fillRect(1, -8, 2, 2);
      // Blue banners either side.
      ctx.fillStyle = "#2c4f8f";
      ctx.fillRect(-16, -6, 5, 10);
      ctx.fillRect(11, -6, 5, 10);
      break;
    }
    case "bombard": {
      // The Dragon's Roost as an icon (on the board it draws by stage: drawRoost): a nest with a blue egg.
      ctx.translate(x, y);
      drawNest(ctx);
      drawEgg(ctx, 0, -2, t);
      break;
    }
    case "lionblade": {
      // Asser's Lion Blade: a longsword standing point-down in a grey stone, a blue-and-white
      // Nordic-cross pennant tied below the crossguard.
      shadow(ctx, x, y, 16);
      ctx.translate(x, y);
      // The stone.
      ctx.fillStyle = "#6b6560";
      ctx.beginPath();
      ctx.ellipse(0, 10, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#857f78";
      ctx.beginPath();
      ctx.ellipse(-1, 7, 12, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // The blade, going into the stone.
      ctx.fillStyle = "#d9dee6";
      ctx.beginPath();
      ctx.moveTo(-2.4, 7);
      ctx.lineTo(-2.4, -16);
      ctx.lineTo(2.4, -16);
      ctx.lineTo(2.4, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#9aa3ad";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, -15);
      ctx.stroke();
      // Crossguard, grip and pommel.
      ctx.fillStyle = "#8a6a3a";
      rrect(ctx, -9, -18.5, 18, 3, 1.2);
      ctx.fill();
      ctx.fillStyle = "#4a3222";
      ctx.fillRect(-1.6, -25, 3.2, 6.5);
      ctx.fillStyle = "#b08a4a";
      ctx.beginPath();
      ctx.arc(0, -26.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      // Pennant: white with a blue Nordic cross, fluttering off the guard.
      const flap = Math.sin(t * 4) * 1.5;
      ctx.fillStyle = "#f2f2ee";
      ctx.beginPath();
      ctx.moveTo(3, -15);
      ctx.lineTo(15, -13 + flap);
      ctx.lineTo(13, -9 + flap);
      ctx.lineTo(15, -5 + flap);
      ctx.lineTo(3, -7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2a5db0";
      ctx.fillRect(6, -15, 2.2, 8);
      ctx.beginPath();
      ctx.moveTo(3, -11.8);
      ctx.lineTo(14, -10.5 + flap);
      ctx.lineTo(14, -8.7 + flap);
      ctx.lineTo(3, -10);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "geese": {
      // Quackarot's Anti-Geese Protocol: a squat round stone tower in his orange, a crowned-duck
      // banner, and a brass sight on top that blinks while it's armed.
      shadow(ctx, x, y, 17);
      ctx.translate(x, y);
      // Stone drum.
      ctx.fillStyle = "#5d5650";
      rrect(ctx, -14, -6, 28, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#77706a";
      ctx.beginPath();
      ctx.ellipse(0, -6, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3e3833";
      ctx.lineWidth = 1;
      for (const yy of [2, 9]) {
        ctx.beginPath();
        ctx.moveTo(-14, yy);
        ctx.lineTo(14, yy);
        ctx.stroke();
      }
      // Orange band and the crowned duck.
      ctx.fillStyle = "#e8742a";
      ctx.fillRect(-14, -3, 28, 4);
      ctx.fillStyle = "#1d1a1c";
      rrect(ctx, -5, 0, 10, 13, 1.5);
      ctx.fill();
      ctx.fillStyle = "#f2c94c";
      ctx.beginPath();
      ctx.arc(0, 8, 2.6, 0, Math.PI * 2);
      ctx.arc(1, 5.4, 1.6, 0, Math.PI * 2);
      ctx.fill();
      // Brass sight on a post.
      ctx.strokeStyle = "#c6a15a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, -15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -19, 5, 0, Math.PI * 2);
      ctx.stroke();
      const blink = 0.45 + 0.55 * Math.max(0, Math.sin(t * 5));
      ctx.fillStyle = `rgba(255,140,40,${blink})`;
      ctx.beginPath();
      ctx.arc(0, -19, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,140,40,${blink})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -19);
      ctx.lineTo(4, -19);
      ctx.moveTo(0, -23);
      ctx.lineTo(0, -15);
      ctx.stroke();
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
  } else if (element === "vial") {
    // An intern's sleeping draught: a small violet vial with a silver stopper.
    ctx.fillStyle = "#9d6bff";
    ctx.beginPath();
    ctx.arc(x, y + 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9c4d6";
    ctx.fillRect(x - 1, y - 4.5, 2, 3);
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

/** A quill pen pointing along +x, nib at the front, centered at (x, y), about `size` px long. */
export function drawQuillShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  // Feather vane.
  ctx.fillStyle = "#f2ead8";
  ctx.strokeStyle = "#6b5a40";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(size * 0.55, 0);
  ctx.quadraticCurveTo(-size * 0.1, -size * 0.42, -size * 0.85, -size * 0.12);
  ctx.lineTo(-size * 0.7, 0);
  ctx.lineTo(-size * 0.85, size * 0.14);
  ctx.quadraticCurveTo(-size * 0.1, size * 0.3, size * 0.55, 0);
  ctx.fill();
  ctx.stroke();
  // Shaft and inked nib.
  ctx.strokeStyle = "#8a7656";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-size * 0.8, 0);
  ctx.lineTo(size * 0.75, 0);
  ctx.stroke();
  ctx.fillStyle = "#1c2440";
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(size * 0.7, -size * 0.07);
  ctx.lineTo(size * 0.7, size * 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A small globe: blue sea, two green continents that turn with `spin`, a brass meridian. */
export function drawGlobeShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number) {
  ctx.save();
  const sea = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  sea.addColorStop(0, "#9fd0e6");
  sea.addColorStop(1, "#24557a");
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = "#6f9a4a";
  for (let i = 0; i < 2; i++) {
    const a = spin + i * Math.PI;
    const cx = x + Math.sin(a) * r * 0.6;
    const w = Math.max(0.05, Math.cos(a)) * r * 0.45;
    ctx.beginPath();
    ctx.ellipse(cx, y - r * 0.15 + i * r * 0.35, w, r * 0.32, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(20,12,8,0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#e6c36a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.35, r, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * The Foot of the Law, sole down, toe pointing right, centred on (0, 0) about 40px long at scale 1:
 * a slim green-stockinged leg and a buckled brown shoe with a long curled elf toe.
 * Used by the tower and by the stomp effect on the carpet.
 */
export function drawFootShape(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  // Leg: a slim stocking leaning back slightly, with a darker garter band.
  ctx.fillStyle = "#2f6b3e";
  ctx.beginPath();
  ctx.moveTo(-11, -3);
  ctx.lineTo(-13, -30);
  ctx.quadraticCurveTo(-9, -33, -4, -30);
  ctx.lineTo(-2, -3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1f4a2b";
  ctx.fillRect(-13, -24, 10, 3);
  // Shoe: rounded heel at the left, a long toe that sweeps up into a curl at the right.
  const g = ctx.createLinearGradient(0, -8, 0, 7);
  g.addColorStop(0, "#8a5530");
  g.addColorStop(1, "#4a2a16");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-15, 6);
  ctx.quadraticCurveTo(-17, -4, -10, -6);
  ctx.quadraticCurveTo(0, -8, 10, -3);
  ctx.quadraticCurveTo(20, 0, 23, -6);
  ctx.quadraticCurveTo(28, -11, 25, -13);
  ctx.quadraticCurveTo(29, -6, 24, 2);
  ctx.quadraticCurveTo(20, 7, 12, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a160b";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Sole and a small heel block.
  ctx.fillStyle = "#24140b";
  ctx.fillRect(-15, 5, 28, 2.5);
  ctx.fillRect(-15, 2, 6, 5.5);
  // Brass buckle on the instep.
  ctx.strokeStyle = BRASS_LIGHT;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-3, -7, 6, 5);
  ctx.restore();
}

/** An Unstoppered spill tile: a spreading green puddle with glass shards, centred on (x, y). */
export function drawSpillTile(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y + 4);
  const wob = Math.sin(t * 1.6 + x * 0.05) * 1.2;
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  g.addColorStop(0, "rgba(140,210,110,0.85)");
  g.addColorStop(1, "rgba(70,140,60,0.55)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-17, 0);
  ctx.bezierCurveTo(-18, -9 - wob, -4, -12, 4, -9);
  ctx.bezierCurveTo(14, -12 + wob, 19, -3, 16, 3);
  ctx.bezierCurveTo(19, 10, 5, 12 + wob, -3, 9);
  ctx.bezierCurveTo(-12, 12, -19, 8, -17, 0);
  ctx.fill();
  ctx.strokeStyle = "rgba(200,240,170,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // A couple of glass shards.
  ctx.fillStyle = "rgba(220,235,240,0.75)";
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.lineTo(-4, -6);
  ctx.lineTo(-5, -1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, 2);
  ctx.lineTo(11, 0);
  ctx.lineTo(9, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The Dragon's Roost's nest: a ring of twigs on a stone, around (0, 0). */
function drawNest(ctx: CanvasRenderingContext2D) {
  shadow(ctx, 0, 0, 20);
  ctx.fillStyle = "#4b4f5a";
  ctx.beginPath();
  ctx.ellipse(0, 9, 19, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6b4a2a";
  ctx.lineWidth = 2.2;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 15, 6 + Math.sin(a) * 6);
    ctx.lineTo(Math.cos(a + 0.9) * 15, 6 + Math.sin(a + 0.9) * 6);
    ctx.stroke();
  }
  ctx.fillStyle = "#2e1d12";
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A blue, speckled dragon egg that hums. */
function drawEgg(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const glow = 0.25 + Math.sin(t * 3) * 0.12;
  ctx.fillStyle = `rgba(111,182,255,${glow})`;
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a6fc4";
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8fc0ff";
  for (const [a, b] of [[-3, -4], [2, -1], [-1, 4], [4, 5]]) {
    ctx.beginPath();
    ctx.arc(x + a, y + b, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#e6c36a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 10.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * The Dragon's Roost on the board, by stage: 0 a humming egg in the nest, 1 a small Whelp with its head up,
 * 2 a Drake with folded wings, 3 a Great Dragon with its wings spread and a blue glow. Faces `aim`.
 */
export function drawRoost(ctx: CanvasRenderingContext2D, x: number, y: number, stage: number, aim: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (stage >= 3) {
    const glow = ctx.createRadialGradient(0, -4, 6, 0, -4, 40);
    glow.addColorStop(0, "rgba(111,182,255,0.35)");
    glow.addColorStop(1, "rgba(111,182,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -4, 40, 0, Math.PI * 2);
    ctx.fill();
  }
  drawNest(ctx);
  if (stage <= 0) {
    drawEgg(ctx, 0, -2, t);
    ctx.restore();
    return;
  }
  const size = stage === 1 ? 0.7 : stage === 2 ? 0.95 : 1.25;
  const face = Math.cos(aim) < 0 ? -1 : 1;
  ctx.scale(size * face, size);
  // Wings: folded for a Drake, spread wide for the Great Dragon (with a slow beat).
  if (stage >= 2) {
    const spread = stage >= 3 ? 1 + Math.sin(t * 2.4) * 0.12 : 0.45;
    ctx.fillStyle = "#24406e";
    ctx.strokeStyle = "#8fc0ff";
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 4, -6);
      ctx.lineTo(side * 26 * spread, -22 * spread);
      ctx.lineTo(side * 20 * spread, -4);
      ctx.lineTo(side * 12 * spread, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // Body, neck and head.
  ctx.fillStyle = "#3a6fc4";
  ctx.beginPath();
  ctx.ellipse(0, 1, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.quadraticCurveTo(10, -10, 9, -16);
  ctx.lineTo(13, -16);
  ctx.quadraticCurveTo(15, -8, 8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(13, -17, 6, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Horns, eye and belly.
  ctx.strokeStyle = "#e6c36a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(10, -20);
  ctx.lineTo(7, -25);
  ctx.moveTo(13, -21);
  ctx.lineTo(12, -26);
  ctx.stroke();
  ctx.fillStyle = "#e6f4ff";
  ctx.beginPath();
  ctx.arc(14.5, -18, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8fc0ff";
  ctx.beginPath();
  ctx.ellipse(1, 3, 6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // A wisp of blue fire at the mouth.
  const lick = 0.5 + Math.sin(t * 8) * 0.3;
  ctx.fillStyle = `rgba(143,208,255,${lick})`;
  ctx.beginPath();
  ctx.ellipse(21, -16, 3 + lick * 2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The plinth under a Great tower: a blue-and-gold slab across both tiles it covers. */
export function drawGreatPlinth(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, t: number) {
  const x = Math.min(ax, bx) - 22;
  const y = Math.min(ay, by) - 18;
  const w = Math.abs(bx - ax) + 44;
  const h = Math.abs(by - ay) + 40;
  ctx.save();
  ctx.fillStyle = "rgba(20,30,52,0.75)";
  rrect(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.strokeStyle = `rgba(143,192,255,${0.55 + Math.sin(t * 2) * 0.15})`;
  ctx.lineWidth = 2;
  rrect(ctx, x, y, w, h, 9);
  ctx.stroke();
  ctx.strokeStyle = "rgba(230,195,106,0.7)";
  ctx.lineWidth = 1;
  rrect(ctx, x + 3, y + 3, w - 6, h - 6, 7);
  ctx.stroke();
  ctx.restore();
}
