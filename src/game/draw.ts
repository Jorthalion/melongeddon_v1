import { asset } from "../lib/asset.ts";
import { CELL, MAP_H, MAP_W, type TowerKind, type World } from "./engine";
import { DRAWN_KINDS, drawCannon, drawShot } from "./drawCannons.ts";

const SPRITE_SRC = {
  melon: asset("sprites/melon.webp"),
  corn: asset("sprites/corn.webp"),
  pumpkin: asset("sprites/pumpkin.webp"),
  karl: asset("sprites/karl.webp"),
  base: asset("sprites/cannon-base.webp"),
  barrel: asset("sprites/cannon-barrel.webp"),
  allyBarrel: asset("sprites/pumpkin-barrel.webp"),
  fireBarrel: asset("sprites/fire-barrel.webp"),
  freezeBarrel: asset("sprites/freeze-barrel.webp"),
  still: asset("sprites/still.webp"),
  shot: asset("sprites/shot-melon.webp"),
  allyShot: asset("sprites/shot-pumpkin.webp"),
  shotFire: asset("sprites/shot-fire.webp"),
  shotIce: asset("sprites/shot-ice.webp"),
  shotMortar: asset("sprites/shot-mortar.webp"),
  floor: asset("sprites/tile-floor.webp"),
  carpet: asset("sprites/tile-carpet.webp"),
  corner: asset("sprites/tile-carpet-corner.webp"),
  shelf: asset("sprites/tile-shelf.webp"),
  door: asset("sprites/prop-stacks.webp"),
} as const;

type SpriteName = keyof typeof SPRITE_SRC;

let sprites: Partial<Record<SpriteName, HTMLImageElement>> | null = null;

function getSprites() {
  if (sprites) return sprites;
  if (typeof window === "undefined") return {};
  sprites = {};
  for (const name of Object.keys(SPRITE_SRC) as SpriteName[]) {
    const img = new Image();
    img.decoding = "async";
    img.src = SPRITE_SRC[name];
    sprites[name] = img;
  }
  return sprites;
}

function ready(img: HTMLImageElement | undefined): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}

function blit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  height: number,
  rot = 0,
) {
  const w = height * (img.naturalWidth / img.naturalHeight);
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -height / 2, w, height);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx: CanvasRenderingContext2D, world: World) {
  const shake = world.shake;
  const ox = shake ? (Math.random() - 0.5) * shake : 0;
  const oy = shake ? (Math.random() - 0.5) * shake : 0;
  ctx.save();
  ctx.translate(ox, oy);

  const g = ctx.createLinearGradient(0, 0, 0, MAP_H);
  g.addColorStop(0, "#1b1418");
  g.addColorStop(1, "#100c0e");
  ctx.fillStyle = g;
  ctx.fillRect(-8, -8, MAP_W + 16, MAP_H + 16);

  const art = getSprites();
  if (ready(art.floor)) {
    const pattern = ctx.createPattern(art.floor, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, MAP_W, MAP_H);
      ctx.fillStyle = "rgba(16,12,14,0.38)";
      ctx.fillRect(0, 0, MAP_W, MAP_H);
    }
  }

  drawShelves(ctx, world, art);
  drawCarpet(ctx, world, art);

  const hover = world.hover;
  const placing = world.hud.phase === "prep" || world.hud.phase === "combat";
  if (hover && placing) {
    const path = world.pathCells.has(`${hover.c},${hover.r}`);
    const taken = world.towers.some((t) => t.c === hover.c && t.r === hover.r);
    const cx = hover.c * CELL + CELL / 2;
    const cy = hover.r * CELL + CELL / 2;
    const open = !path && !taken;
    if (open && world.hud.canPlace) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawTower(ctx, cx, cy, 0, world.hud.build, false, world.hud.build === "mortar", false, art, world.anim);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, world.hud.placeRange, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(198,161,90,0.05)";
      ctx.fill();
      ctx.strokeStyle = "rgba(198,161,90,0.4)";
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.strokeStyle = "rgba(198,161,90,0.85)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hover.c * CELL + 3, hover.r * CELL + 3, CELL - 6, CELL - 6);
    } else if (!open) {
      ctx.strokeStyle = "rgba(226,59,74,0.65)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hover.c * CELL + 3, hover.r * CELL + 3, CELL - 6, CELL - 6);
    }
  }

  const selected = world.towers.find((t) => t.id === world.hud.selected);
  if (selected && !selected.ally) {
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, world.hud.range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(198,161,90,0.045)";
    ctx.fill();
    ctx.strokeStyle = "rgba(198,161,90,0.42)";
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }

  for (const pool of world.pools) {
    const a = Math.max(0, pool.life / pool.max);
    if (pool.hot) {
      ctx.fillStyle = `rgba(232,136,58,${0.45 * a})`;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(230,195,106,${0.55 * a})`;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y - 2, pool.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(226,59,74,${0.28 * a})`;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const e of world.enemies) {
    if (e.chill > 0) {
      ctx.strokeStyle = "rgba(106,74,138,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 8, e.r + 6, e.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const next = world.points[Math.min(e.wp, world.points.length - 1)];
    drawEnemy(ctx, e.kind, e.x, e.y, e.r, e.hp / e.maxHp, world.anim, e.boss, art, next ? next.x < e.x - 4 : false);
    if (e.guard === "rind" && e.shell > 0) {
      ctx.strokeStyle = "rgba(243,226,196,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.guard === "husk") {
      ctx.strokeStyle = "rgba(230,195,106,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.guard === "damp") {
      ctx.fillStyle = "rgba(90,140,170,0.28)";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.split) {
      ctx.strokeStyle = "rgba(243,226,196,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x - 8, e.y - 8);
      ctx.lineTo(e.x + 8, e.y + 8);
      ctx.moveTo(e.x + 8, e.y - 8);
      ctx.lineTo(e.x - 8, e.y + 8);
      ctx.stroke();
    }
    if (e.bread) {
      ctx.fillStyle = "rgba(196,132,58,0.88)";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 4, e.r * 0.95, e.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f3d7a1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x - e.r * 0.55, e.y + 2);
      ctx.lineTo(e.x + e.r * 0.55, e.y + 2);
      ctx.stroke();
    } else if (e.raw) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "rgba(232,181,106,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (e.freeze > 0) {
      ctx.fillStyle = "rgba(186,220,232,0.38)";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if ((e.ink ?? 0) > 0) {
      ctx.fillStyle = "rgba(29,38,64,0.85)";
      ctx.beginPath();
      ctx.arc(e.x + e.r * 0.5, e.y - e.r * 0.6, 4, 0, Math.PI * 2);
      ctx.arc(e.x + e.r * 0.5 + 4, e.y - e.r * 0.6 + 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if ((e.worm ?? 0) > 0) {
      ctx.fillStyle = "#e79ab0";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(e.x - e.r * 0.4 + i * 2.5, e.y + Math.sin(world.anim * 12 + i) * 1.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (const t of world.towers) {
    if (t.kind !== "lantern") continue;
    const reach = t.mods.includes("wick") ? 102 : 72;
    const light = ctx.createRadialGradient(t.x, t.y, 8, t.x, t.y, reach);
    light.addColorStop(0, "rgba(255,214,140,0.16)");
    light.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(t.x, t.y, reach, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const t of world.towers) {
    drawTower(ctx, t.x, t.y, t.aim, t.kind, t.ally, t.orange, t.id === world.hud.selected, art, world.anim);
    if (t.mods.length) {
      ctx.fillStyle = "#e6c36a";
      for (let i = 0; i < t.mods.length; i++) {
        ctx.beginPath();
        ctx.arc(t.x - 5 + i * 10, t.y - 24, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (const s of world.shots) {
    if (s.element === "seed" || s.element === "fly" || s.element === "ink" || s.element === "peel" || s.element === "worm") {
      drawShot(ctx, s.x, s.y, s.element, world.anim);
      continue;
    }
    const img =
      s.element === "fire"
        ? art.shotFire
        : s.element === "ice"
          ? art.shotIce
          : s.element === "mortar"
            ? art.shotMortar
            : s.orange || s.fromAlly
              ? art.allyShot
              : art.shot;
    if (ready(img)) blit(ctx, img, s.x, s.y, s.element === "ice" ? 14 : 18);
    else {
      ctx.fillStyle = s.fromAlly ? "#e8883a" : "#e23b4a";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.fromAlly ? 6 : 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const l of world.lines) {
    ctx.strokeStyle = `rgba(${l.color},${Math.max(0, l.life / l.max)})`;
    ctx.lineWidth = l.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  }
  for (const r of world.rings) {
    const k = 1 - r.life / r.max;
    ctx.strokeStyle = `rgba(${r.color},${(1 - k) * 0.8})`;
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(1, r.r * (0.25 + 0.75 * k)), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const spark of world.sparks) {
    ctx.strokeStyle = `rgba(230,195,106,${Math.min(1, spark.life * 6)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spark.x, spark.y);
    ctx.lineTo(spark.x2, spark.y2);
    ctx.stroke();
  }

  for (const b of world.bits) {
    ctx.globalAlpha = Math.max(0, b.life / b.max);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.s, b.s);
    ctx.globalAlpha = 1;
  }

  ctx.font = "600 13px Outfit, sans-serif";
  ctx.textAlign = "center";
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  const vig = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_W * 0.22, MAP_W / 2, MAP_H / 2, MAP_W * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(8,4,6,0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  ctx.restore();
}

function drawCarpet(
  ctx: CanvasRenderingContext2D,
  world: World,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
) {
  const cells = [...world.pathCells];
  if (ready(art.carpet)) {
    const pattern = ctx.createPattern(art.carpet, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      for (const key of cells) {
        const [c, r] = key.split(",").map(Number);
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
      const start = world.points[0];
      ctx.fillRect(start.x - CELL * 1.5, start.y - CELL / 2, CELL, CELL);
    }
  } else {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#6a2a32";
    ctx.lineWidth = 36;
    ctx.beginPath();
    const pts = world.points;
    ctx.moveTo(pts[0].x - CELL, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.strokeStyle = "#8d3a42";
    ctx.lineWidth = 22;
    ctx.stroke();
  }

  if (world.hud.map === "overflow") {
    ctx.fillStyle = "rgba(70, 130, 160, 0.28)";
    for (const key of cells) {
      const [c, r] = key.split(",").map(Number);
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }

  ctx.strokeStyle = "rgba(230,195,106,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const key of cells) {
    const [c, r] = key.split(",").map(Number);
    const x = c * CELL;
    const y = r * CELL;
    if (!world.pathCells.has(`${c},${r - 1}`)) {
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + CELL, y + 1);
    }
    if (!world.pathCells.has(`${c},${r + 1}`)) {
      ctx.moveTo(x, y + CELL - 1);
      ctx.lineTo(x + CELL, y + CELL - 1);
    }
    if (!world.pathCells.has(`${c - 1},${r}`)) {
      ctx.moveTo(x + 1, y);
      ctx.lineTo(x + 1, y + CELL);
    }
    if (!world.pathCells.has(`${c + 1},${r}`)) {
      ctx.moveTo(x + CELL - 1, y);
      ctx.lineTo(x + CELL - 1, y + CELL);
    }
  }
  ctx.stroke();

  if (ready(art.corner)) {
    for (const turn of world.turns) {
      blit(ctx, art.corner, turn.c * CELL + CELL / 2, turn.r * CELL + CELL / 2, CELL, turn.rot);
    }
  }

  const end = world.points[world.points.length - 1];
  const doorLight = ctx.createRadialGradient(end.x, end.y, 6, end.x, end.y, 78);
  doorLight.addColorStop(0, "rgba(230,195,106,0.22)");
  doorLight.addColorStop(1, "rgba(230,195,106,0)");
  ctx.fillStyle = doorLight;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 78, 0, Math.PI * 2);
  ctx.fill();
  const start = world.points[0];
  const breath = 0.18 + Math.sin(world.anim * 2.2) * 0.08;
  ctx.fillStyle = `rgba(160,36,48,${breath})`;
  ctx.beginPath();
  ctx.ellipse(start.x - 18, start.y, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (ready(art.door)) {
    blit(ctx, art.door, end.x - 2, end.y - 16, 88);
  } else {
    ctx.fillStyle = "#e6c36a";
    roundRect(ctx, end.x - 16, end.y - 22, 32, 44, 4);
    ctx.fill();
    ctx.fillStyle = "#2a1c22";
    ctx.font = "700 11px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STACKS", end.x, end.y + 4);
  }

  if (world.hud.map === "overflow" && world.points.length >= 2) {
    const prev = world.points[world.points.length - 2];
    const dx = end.x - prev.x;
    const dy = end.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const x = end.x + (dx / len) * CELL * 0.95;
    const y = end.y + (dy / len) * CELL * 0.95;
    ctx.fillStyle = "rgba(28, 22, 20, 0.92)";
    ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.strokeStyle = "#e6c36a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 16, y - 16, 32, 32);
    ctx.fillStyle = "#8d3a42";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  const ar = img.naturalWidth / img.naturalHeight;
  let h = maxH;
  let w = h * ar;
  if (w > maxW) {
    w = maxW;
    h = w / ar;
  }
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
}

function drawShelves(
  ctx: CanvasRenderingContext2D,
  world: World,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
) {
  const spots: Array<[number, number]> = [
    [1, 1],
    [2, 1],
    [3, 1],
    [8, 0],
    [9, 0],
    [10, 0],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [13, 1],
    [14, 1],
    [8, 8],
    [9, 8],
    [13, 4],
    [14, 4],
    [0, 2],
    [1, 2],
  ];
  const shelf = art.shelf;
  for (const [c, r] of spots) {
    if (world.pathCells.has(`${c},${r}`)) continue;
    const x = c * CELL + CELL / 2;
    const y = r * CELL + CELL / 2;
    if (ready(shelf)) {
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.rotate(((((c * 3 + r * 5) % 5) - 2) * 0.03));
      const scale = 0.92 + ((c + r) % 3) * 0.05;
      ctx.scale(scale, scale);
      fit(ctx, shelf, 0, 0, CELL - 4, CELL - 6);
      ctx.restore();
      continue;
    }
    const left = c * CELL + 6;
    const top = r * CELL + 8;
    ctx.fillStyle = "#3a241c";
    roundRect(ctx, left, top, CELL - 12, CELL - 16, 3);
    ctx.fill();
    const hues = ["#e23b4a", "#3f9a5c", "#e6c36a", "#6a4a8a", "#d8c4a4", "#2a6f8f"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = hues[(c + r + i) % hues.length];
      ctx.fillRect(left + 4 + i * 5.4, top + 6, 4, CELL - 30);
    }
  }
}

const UNIT_H = { melon: 52, corn: 48, pumpkin: 58, karl: 108 } as const;

function drawTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  aim: number,
  kind: TowerKind,
  ally: boolean,
  orange: boolean,
  selected: boolean,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
  t = 0,
) {
  if (DRAWN_KINDS.includes(kind)) {
    drawCannon(ctx, x, y, aim, kind, t);
    if (selected) ring(ctx, x, y);
    return;
  }
  const base = art.base;
  if (kind === "fire" || kind === "freeze") {
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 36);
    glow.addColorStop(0, kind === "fire" ? "rgba(232,136,58,0.28)" : "rgba(150,190,210,0.2)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === "still") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ready(art.still)) blit(ctx, art.still, x, y + 2, 52);
    else if (ready(base)) {
      blit(ctx, base, x, y + 8, 40);
      ctx.fillStyle = "#6a4a8a";
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (selected) ring(ctx, x, y);
    return;
  }
  const barrel =
    kind === "fire" && ready(art.fireBarrel)
      ? art.fireBarrel
      : kind === "freeze" && ready(art.freezeBarrel)
        ? art.freezeBarrel
        : kind === "mortar" || ally || orange
          ? art.allyBarrel
          : art.barrel;
  if (ready(base) && ready(barrel)) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    blit(ctx, base, x, y + 6, 46);
    const tall = kind === "fire" || kind === "freeze" ? 32 : kind === "mortar" ? 34 : ally ? 30 : 28;
    blit(ctx, barrel, x, y - 2, tall, aim);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#2a1c16";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(aim);
    ctx.fillStyle = kind === "mortar" || ally ? "#c46a28" : "#2f6b3e";
    roundRect(ctx, 0, -6, 22, 12, 4);
    ctx.fill();
    ctx.fillStyle = kind === "mortar" || ally ? "#e8883a" : "#e23b4a";
    ctx.beginPath();
    ctx.arc(16, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (selected) ring(ctx, x, y);
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = "#e6c36a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  kind: "melon" | "corn" | "pumpkin" | "karl",
  x: number,
  y: number,
  r: number,
  hp: number,
  anim: number,
  boss: boolean,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
  faceLeft: boolean,
) {
  const img = art[kind];
  const height = UNIT_H[kind];
  if (ready(img)) {
    const bob = Math.sin(anim * 3 + x * 0.05) * (boss ? 0 : 1.2);
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(x, y + height * 0.36, height * 0.28, height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y + bob);
    if (faceLeft) ctx.scale(-1, 1);
    ctx.shadowColor = "rgba(243,226,196,0.55)";
    ctx.shadowBlur = 7;
    const w = height * (img.naturalWidth / img.naturalHeight);
    ctx.drawImage(img, -w / 2, -height / 2, w, height);
    ctx.restore();
    if (hp < 0.995) {
      const bw = Math.min(44, height * 0.55);
      const top = y - height * 0.48;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x - bw / 2, top, bw, 4);
      ctx.fillStyle = boss ? "#e6c36a" : "#f3e2c4";
      ctx.fillRect(x - bw / 2, top, bw * Math.max(0, hp), 4);
    }
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  if (kind === "corn") {
    ctx.fillStyle = "#e6c36a";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6a20";
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, i * 3);
      ctx.lineTo(r * 0.5, i * 3);
      ctx.stroke();
    }
  } else if (kind === "pumpkin" || kind === "karl") {
    ctx.fillStyle = boss ? "#d8661e" : "#e8883a";
    ctx.beginPath();
    ctx.ellipse(0, 2, r, r * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,40,10,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(0, r * 0.7);
    ctx.moveTo(-r * 0.35, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.2, 0, -r * 0.15, r * 0.6);
    ctx.moveTo(r * 0.35, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.2, 0, r * 0.15, r * 0.6);
    ctx.stroke();
    ctx.fillStyle = "#2f6b3e";
    ctx.fillRect(-3, -r - 2, 6, 10);
    if (boss) {
      ctx.strokeStyle = "#e6c36a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4 + Math.sin(anim * 4) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#2f8f4e";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#14301c";
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r, -0.4 + i * 0.35, 0.4 + i * 0.35);
      ctx.stroke();
    }
    ctx.fillStyle = "#e23b4a";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const bw = r * 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - bw / 2, y - r - 10, bw, 4);
  ctx.fillStyle = boss ? "#e6c36a" : "#f3e2c4";
  ctx.fillRect(x - bw / 2, y - r - 10, bw * Math.max(0, hp), 4);
}
