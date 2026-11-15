import { asset } from "../lib/asset.ts";
import { BOARDS, CANNON, CARPET_DYE, CELL, GLOBAL_RANGE, PASSIVE, carpetInReach, oathStretch, reachShape, type OathId, type TowerKind, type World } from "./engine";
import { DRAWN_KINDS, drawBoomerangShape, drawCannon, drawGlobeShape, drawPlaneShape, drawQuillShape, drawShot, drawFootShape, drawSpillTile } from "./drawCannons.ts";

const SPRITE_SRC = {
  melon: asset("sprites/melon.webp"),
  corn: asset("sprites/corn.webp"),
  pumpkin: asset("sprites/pumpkin.webp"),
  karl: asset("sprites/karl.webp"),
  // Act three fruit: flags on the kinds above, with their own faces.
  pit: asset("sprites/enemy-pit.webp"),
  gall: asset("sprites/enemy-gall.webp"),
  borrower: asset("sprites/enemy-borrower.webp"),
  base: asset("sprites/cannon-base.webp"),
  barrel: asset("sprites/cannon-barrel.webp"),
  allyBarrel: asset("sprites/pumpkin-barrel.webp"),
  fireBarrel: asset("sprites/fire-barrel.webp"),
  freezeBarrel: asset("sprites/freeze-barrel.webp"),
  still: asset("sprites/still.webp"),
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
  shot: asset("sprites/shot-melon.webp"),
  allyShot: asset("sprites/shot-pumpkin.webp"),
  shotFire: asset("sprites/shot-fire.webp"),
  shotIce: asset("sprites/shot-ice.webp"),
  shotMortar: asset("sprites/shot-mortar.webp"),
  floor: asset("sprites/tile-floor.webp"),
  floorRarebooks: asset("sprites/tile-floor-rarebooks.webp"),
  floorArchive: asset("sprites/tile-floor-archive.webp"),
  floorOverflow: asset("sprites/tile-floor-overflow.webp"),
  chuteProp: asset("sprites/prop-returns-chute.webp"),
  // Each room's own furniture (on its shelf cells) and exit.
  archiveCabinet: asset("sprites/prop-archive-cabinet.webp"),
  archiveVault: asset("sprites/prop-archive-vault.webp"),
  rarebooksCase: asset("sprites/prop-rarebooks-case.webp"),
  rarebooksDoor: asset("sprites/prop-rarebooks-door.webp"),
  annexStorage: asset("sprites/prop-annex-storage.webp"),
  annexHatch: asset("sprites/prop-annex-hatch.webp"),
  shotSeed: asset("sprites/shot-seed.webp"),
  shotFly: asset("sprites/shot-fly.webp"),
  shotInk: asset("sprites/shot-ink.webp"),
  shotPeel: asset("sprites/shot-peel.webp"),
  shotWorm: asset("sprites/shot-worm.webp"),
  carpet: asset("sprites/tile-carpet.webp"),
  corner: asset("sprites/tile-carpet-corner.webp"),
  shelf: asset("sprites/tile-shelf.webp"),
  door: asset("sprites/prop-stacks.webp"),
  catalogue: asset("sprites/sig-catalogue.webp"),
  cauldron: asset("sprites/sig-cauldron.webp"),
  trebuchet: asset("sprites/sig-trebuchet.webp"),
  scales: asset("sprites/sig-scales.webp"),
  desk: asset("sprites/sig-desk.webp"),
  flask: asset("sprites/sig-flask.webp"),
  copycat: asset("sprites/sig-copycat.webp"),
  stomp: asset("sprites/sig-stomp.webp"),
  honey: asset("sprites/sig-honey.webp"),
  mimic: asset("sprites/sig-mimic.webp"),
  lectern: asset("sprites/sig-lectern.webp"),
  quackliber: asset("sprites/sig-quackliber.webp"),
  // Asser's Lion Blade (the code-drawn sword is only a fallback while it loads).
  lionblade: asset("sprites/sig-lionblade.webp"),
  // Sir Michael's second and third: the Gourd Gate (and its portcullis) and the Harvest Bombard (and its pumpkin).
  gourdgate: asset("sprites/sig-gourdgate.webp"),
  bombard: asset("sprites/sig-bombard.webp"),
  flyBombard: asset("sprites/fly-bombard.webp"),
  portcullis: asset("sprites/fly-portcullis.webp"),
  flyQuack: asset("sprites/fly-quack.webp"),
  // Trick cannons, and what they throw.
  boomerang: asset("sprites/trick-boomerang.webp"),
  orrery: asset("sprites/trick-orrery.webp"),
  plane: asset("sprites/trick-plane.webp"),
  quill: asset("sprites/trick-quill.webp"),
  globe: asset("sprites/trick-globe.webp"),
  press: asset("sprites/heavy-press.webp"),
  organ: asset("sprites/heavy-organ.webp"),
  scope: asset("sprites/heavy-scope.webp"),
  flyBoomerang: asset("sprites/fly-boomerang.webp"),
  flyPlane: asset("sprites/fly-plane.webp"),
  flyQuill: asset("sprites/fly-quill.webp"),
  flySheet: asset("sprites/fly-sheet.webp"),
  flyStomp: asset("sprites/fly-stomp.webp"),
  flyGlobe: asset("sprites/fly-globe.webp"),
  honeyPrint: asset("sprites/honey-print.webp"),
  spillFlask: asset("sprites/spill-flask.webp"),
  planetGold: asset("sprites/fly-planet-gold.webp"),
  planetBlue: asset("sprites/fly-planet-blue.webp"),
  planetRed: asset("sprites/fly-planet-red.webp"),
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

/** True once every sprite has loaded (or failed), so a still picture can stop redrawing. */
export function spritesSettled(): boolean {
  const all = Object.values(getSprites());
  return all.length > 0 && all.every((img) => img.complete);
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

  const g = ctx.createLinearGradient(0, 0, 0, world.h);
  g.addColorStop(0, "#1b1418");
  g.addColorStop(1, "#100c0e");
  ctx.fillStyle = g;
  ctx.fillRect(-8, -8, world.w + 16, world.h + 16);

  const art = getSprites();
  const ownFloor =
    world.hud.map === "rarebooks"
      ? art.floorRarebooks
      : world.hud.map === "archive"
        ? art.floorArchive
        : world.hud.map === "overflow"
          ? art.floorOverflow
          : undefined;
  const floor = ready(ownFloor) ? ownFloor : art.floor;
  if (ready(floor)) {
    const pattern = ctx.createPattern(floor, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, world.w, world.h);
      ctx.fillStyle = "rgba(16,12,14,0.38)";
      ctx.fillRect(0, 0, world.w, world.h);
    }
  }
  const look = ROOM_LOOK[world.hud.map];
  if (look?.floor) {
    // A colour wash over the shared floor, so rooms without their own tile still feel like their own room.
    ctx.save();
    ctx.globalCompositeOperation = "color";
    ctx.globalAlpha = look.floor[1];
    ctx.fillStyle = look.floor[0];
    ctx.fillRect(0, 0, world.w, world.h);
    ctx.restore();
  }

  drawShelves(ctx, world, art);
  drawCarpet(ctx, world, art);
  if (look?.light) drawRoomLight(ctx, world, look.light);
  drawWet(ctx, world);
  if (BOARDS[world.hud.map].dark) drawDark(ctx, world);

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
      drawTower(ctx, cx, cy, 0, world.hud.build, world.hud.build === "mortar", false, art, world.anim);
      ctx.restore();
      drawReach(ctx, world, cx, cy, world.hud.build, world.hud.placeRange, null, true);
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
  if (selected) {
    const kind = selected.kind === "copycat" && selected.copy ? selected.copy.kind : selected.kind;
    drawReach(ctx, world, selected.x, selected.y, kind, world.hud.range, selected, false);
  }

  // Juice stains where fruit popped: a blob with a few droplets, fading out.
  for (const st of world.stains) {
    const a = Math.min(1, st.life / st.max / 0.5) * 0.55;
    ctx.globalAlpha = a;
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.ellipse(st.x, st.y + 4, st.r, st.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const ang = st.seed * 0.37 + i * 1.07;
      const d = st.r * (1.05 + ((st.seed * (i + 3)) % 7) / 14);
      const dr = 1.5 + ((st.seed + i * 5) % 4);
      ctx.beginPath();
      ctx.arc(st.x + Math.cos(ang) * d, st.y + 4 + Math.sin(ang) * d * 0.62, dr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
    } else if (pool.honey && ready(art.honeyPrint)) {
      // Honeyed Heel: the painted footprint, toes pointing the way the fruit walk, fading out at the end.
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.6) * 0.9;
      blitFit(ctx, art.honeyPrint, pool.x, pool.y, pool.r * 2.3, pool.r * 1.6, pool.rot ?? 0);
      ctx.restore();
    } else if (pool.honey) {
      // Honeyed Heel: a glossy amber footprint, toes pointing the way the fruit walk.
      ctx.save();
      ctx.translate(pool.x, pool.y);
      ctx.rotate(pool.rot ?? 0);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.fillStyle = "rgba(214,150,40,0.55)";
      ctx.beginPath();
      ctx.ellipse(-3, 0, pool.r * 0.72, pool.r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(240,184,74,0.75)";
      ctx.beginPath();
      ctx.ellipse(-4, 0, pool.r * 0.55, pool.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      [-8, -3, 2, 6, 10].forEach((dy, i) => {
        ctx.beginPath();
        ctx.arc(pool.r * 0.62 - Math.abs(dy) * 0.25, dy * 0.9, i === 0 ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "rgba(255,240,200,0.55)";
      ctx.beginPath();
      ctx.ellipse(-8, -4, 5, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (pool.toxic) {
      // Bubbling Cauldron puddle.
      ctx.fillStyle = `rgba(80,190,90,${0.32 * a})`;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(190,255,170,${0.5 * a})`;
      for (let i = 0; i < 3; i++) {
        const ang = world.anim * 1.3 + i * 2.1;
        ctx.beginPath();
        ctx.arc(pool.x + Math.cos(ang) * pool.r * 0.5, pool.y + Math.sin(ang) * pool.r * 0.4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = `rgba(226,59,74,${0.28 * a})`;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Galls last, so a rider is never hidden under the pumpkin walking behind its host.
  for (const e of [...world.enemies.filter((f) => !f.gall), ...world.enemies.filter((f) => f.gall)]) {
    if (e.chill > 0) {
      ctx.strokeStyle = "rgba(106,74,138,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 8, e.r + 6, e.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const next = world.points[Math.min(e.wp, world.points.length - 1)];
    const look = e.pit ? "pit" : e.gall ? "gall" : e.borrower ? "borrower" : null;
    // A gall's mark is what it does: a pulsing green thread to the fruit it is healing.
    const host = e.gall && e.mends != null ? world.enemies.find((o) => o.id === e.mends && o.hp > 0) : undefined;
    if (host) {
      const pulse = 0.55 + Math.sin(world.anim * 6) * 0.25;
      ctx.save();
      ctx.strokeStyle = `rgba(150,235,90,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -world.anim * 30;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(host.x, host.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(150,235,90,${pulse})`;
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", host.x + 20, host.y - 20);
      ctx.restore();
    }
    const painted = look != null && ready(art[look]);
    drawEnemy(ctx, e.kind, e.x, e.y, e.r, e.hp / e.maxHp, world.anim, e.boss, art, next ? next.x < e.x - 4 : false, painted ? look : null);
    // Act three marks, while their art loads: a stone ring on a pit, a green dot on a gall, a gold ring on a borrower.
    if (painted) {
      // The art says it.
    } else if (e.pit) {
      ctx.strokeStyle = "rgba(176,168,150,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.gall) {
      ctx.fillStyle = "#6fbf4a";
      ctx.beginPath();
      ctx.arc(e.x, e.y - e.r - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.borrower) {
      ctx.strokeStyle = "#e6c36a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    if ((e.honeyed ?? 0) > 0) {
      // Honeyed Heel: an amber drip on top of the fruit.
      ctx.fillStyle = "rgba(232,176,64,0.9)";
      ctx.beginPath();
      ctx.ellipse(e.x - e.r * 0.3, e.y - e.r * 0.75, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e.x - e.r * 0.3 + 2, e.y - e.r * 0.75 + 5, 1.8, 0, Math.PI * 2);
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

  // Unstoppered spill tiles sit on the floor under everything else.
  for (const t of world.towers)
    for (const s of t.spill ?? []) {
      if (ready(art.spillFlask)) blitFit(ctx, art.spillFlask, s.x, s.y + 2, 50, 42);
      else drawSpillTile(ctx, s.x, s.y, world.anim);
    }
  for (const t of world.towers) {
    if (t.kind === "copycat" && t.copy) {
      // The Copycat draws as what it copies, with a thin gold line to the original and Memec's eye on top.
      const src = world.towers.find((o) => o.id === t.copyFrom);
      if (src) {
        ctx.strokeStyle = "rgba(230,195,106,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(src.x, src.y);
        ctx.stroke();
      }
      drawTower(ctx, t.x, t.y, t.copy.aim, t.copy.kind, t.copy.orange, t.id === world.hud.selected, art, world.anim);
      ctx.fillStyle = "rgba(20,12,16,0.85)";
      ctx.beginPath();
      ctx.arc(t.x + 14, t.y - 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6fc6ef";
      ctx.beginPath();
      ctx.ellipse(t.x + 14, t.y - 16, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    drawTower(ctx, t.x, t.y, t.aim, t.kind, t.orange, t.id === world.hud.selected, art, world.anim);
    // Gourd Gate: the portcullis down across the carpet while it holds (it slams in from above).
    if (t.kind === "gourdgate" && (t.gateDown ?? 0) > 0 && t.gate) {
      const drop = Math.max(0, 1 - (t.gateAge ?? 0) / 0.12) * 18;
      if (ready(art.portcullis)) blitFit(ctx, art.portcullis, t.gate.x, t.gate.y - drop, CELL - 4, CELL - 4);
      else {
        ctx.strokeStyle = "#c6a15a";
        ctx.lineWidth = 3;
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.moveTo(t.gate.x + k * 8, t.gate.y - 20 - drop);
          ctx.lineTo(t.gate.x + k * 8, t.gate.y + 18 - drop);
          ctx.stroke();
        }
      }
    }
    // Lion Blade: a blue-white flare while a rally swing is waiting.
    if (t.bladeRally) {
      const pulse = 0.55 + 0.45 * Math.sin(world.anim * 10);
      const g = ctx.createRadialGradient(t.x, t.y - 12, 2, t.x, t.y - 12, 26);
      g.addColorStop(0, `rgba(220,236,255,${0.75 * pulse})`);
      g.addColorStop(1, "rgba(111,168,239,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 12, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    if (t.kind === "desk" && t.bank) {
      // What the Reserve Desk is holding, on a small gold tag.
      const label = String(t.bank);
      ctx.font = "bold 11px system-ui, sans-serif";
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = "rgba(20,12,16,0.85)";
      ctx.fillRect(t.x - w / 2, t.y - 40, w, 15);
      ctx.strokeStyle = "#c6a15a";
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x - w / 2, t.y - 40, w, 15);
      ctx.fillStyle = "#e6c36a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, t.x, t.y - 32.5);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }
    if (t.mods.length) {
      ctx.fillStyle = "#e6c36a";
      for (let i = 0; i < t.mods.length; i++) {
        ctx.beginPath();
        ctx.arc(t.x - 5 + i * 10, t.y - 24, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Orrery: a faint orbit and the two planets.
  for (const t of world.towers) {
    if (t.kind !== "orrery") continue;
    const orbit = t.orbit ?? 80;
    const spin = t.spin ?? world.anim * 2.6;
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = "rgba(230,195,106,0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, orbit, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (let p = 0; p < CANNON.orreryPlanets; p++) {
      const ang = spin + (p * Math.PI * 2) / CANNON.orreryPlanets;
      const px = t.x + Math.cos(ang) * orbit;
      const py = t.y + Math.sin(ang) * orbit;
      // A short arc behind each planet shows which way it spins.
      ctx.strokeStyle = "rgba(230,195,106,0.45)";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(t.x, t.y, orbit, ang - 0.5, ang);
      ctx.stroke();
      const planet = [art.planetGold, art.planetBlue, art.planetRed][p % 3];
      if (ready(planet)) {
        blit(ctx, planet, px, py, 17);
        continue;
      }
      const g = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, 9);
      g.addColorStop(0, ["#fff2c4", "#cfe6f2", "#f6c6b4"][p % 3]);
      g.addColorStop(1, ["#b07a2a", "#3f7f9f", "#a0402a"][p % 3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,12,8,0.7)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // Trick shots: a curved trail through their recent positions, then the thrown thing.
  for (const f of world.flyers) {
    if (f.trail.length > 1) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < f.trail.length; i++) {
        const a = i / f.trail.length;
        ctx.strokeStyle =
          f.kind === "plane"
            ? `rgba(246,239,226,${0.6 * a})`
            : f.kind === "quill"
              ? `rgba(40,58,120,${0.8 * a})`
              : f.kind === "globe"
                ? `rgba(120,90,50,${0.35 * a})`
                : f.kind === "sheet"
                  ? `rgba(30,26,48,${0.45 * a})`
                : `rgba(216,184,120,${0.7 * a})`;
        ctx.lineWidth = f.kind === "globe" ? 6 + 6 * a : 2 + 5 * a;
        ctx.beginPath();
        ctx.moveTo(f.trail[i - 1].x, f.trail[i - 1].y);
        ctx.lineTo(f.trail[i].x, f.trail[i].y);
        ctx.stroke();
      }
    }
    if (f.kind === "boomerang" && ready(art.flyBoomerang)) blit(ctx, art.flyBoomerang, f.x, f.y, 28, f.t * 18);
    else if (f.kind === "plane" && ready(art.flyPlane)) blitFit(ctx, art.flyPlane, f.x, f.y, 32, 24, f.heading);
    else if (f.kind === "quill" && ready(art.flyQuill)) blitFit(ctx, art.flyQuill, f.x, f.y, 36, 12, f.heading);
    else if (f.kind === "boomerang") drawBoomerangShape(ctx, f.x, f.y, 13, f.t * 18);
    else if (f.kind === "quill") {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.heading);
      drawQuillShape(ctx, 0, 0, 16);
      ctx.restore();
    } else if (f.kind === "globe") {
      // In the air it rises on an arc with its shadow on the floor; on the carpet it spins as it rolls.
      const h = f.rolling ? 0 : Math.sin(Math.min(1, f.t / CANNON.globeLob) * Math.PI) * 46;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 10, 12 - h * 0.08, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (ready(art.flyGlobe)) {
        // A plain spin (blitFit would flip it upright every half turn).
        ctx.save();
        ctx.translate(f.x, f.y - h);
        ctx.rotate(f.t * (f.rolling ? 9 : 3));
        ctx.drawImage(art.flyGlobe, -14, -14, 28, 28);
        ctx.restore();
      }
      else drawGlobeShape(ctx, f.x, f.y - h, 13, f.t * (f.rolling ? 9 : 3));
    } else if (f.kind === "sheet" && ready(art.flySheet)) {
      blitFit(ctx, art.flySheet, f.x, f.y, 26, 30);
    } else if (f.kind === "sheet") {
      // A pressed sheet sliding along the carpet, fresh ink lines on it.
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.heading);
      ctx.fillStyle = "#efe2c2";
      ctx.strokeStyle = "#8d6730";
      ctx.lineWidth = 1;
      ctx.fillRect(-11, -14, 22, 28);
      ctx.strokeRect(-11, -14, 22, 28);
      ctx.fillStyle = "#2a2440";
      for (let i = 0; i < 5; i++) ctx.fillRect(-8, -10 + i * 5, i === 4 ? 9 : 16, 1.6);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.heading);
      drawPlaneShape(ctx, 0, 0, 13);
      ctx.restore();
    }
  }

  for (const s of world.shots) {
    shotTrail(ctx, s.x, s.y, s.tx, s.ty, shotColor(s.element, s.orange));
    if (s.element === "potion") {
      drawShot(ctx, s.x, s.y, s.element, world.anim);
      continue;
    }
    if (s.element === "seed" || s.element === "fly" || s.element === "ink" || s.element === "peel" || s.element === "worm") {
      const look = NEW_SHOT[s.element];
      const img = art[look.sprite];
      if (ready(img)) {
        // Seeds and worms point where they fly; peel spins; the fly wobbles.
        const heading = Math.atan2(s.ty - s.y, s.tx - s.x);
        const rot =
          s.element === "seed" ? heading + Math.PI / 2 : s.element === "worm" ? heading : s.element === "peel" ? world.anim * 14 : s.element === "fly" ? Math.sin(world.anim * 30) * 0.25 : 0;
        blit(ctx, img, s.x, s.y, look.size * 1.3, rot);
      } else drawShot(ctx, s.x, s.y, s.element, world.anim);
      continue;
    }
    // Harvest Bombard: the flaming giant pumpkin, pointing where it flies.
    if (s.bombard) {
      if (ready(art.flyBombard)) blitFit(ctx, art.flyBombard, s.x, s.y, 44, 24, Math.atan2(s.ty - s.y, s.tx - s.x));
      else {
        ctx.fillStyle = "#e8742a";
        ctx.beginPath();
        ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
    // Quack-Liber rockets: the duck-nosed rocket, pointing where it flies.
    if (s.splashChill && ready(art.flyQuack)) {
      blitFit(ctx, art.flyQuack, s.x, s.y, 30, 14, Math.atan2(s.ty - s.y, s.tx - s.x));
      continue;
    }
    const img =
      s.element === "fire"
        ? art.shotFire
        : s.element === "ice"
          ? art.shotIce
          : s.element === "mortar"
            ? art.shotMortar
            : s.orange
              ? art.allyShot
              : art.shot;
    if (ready(img)) blit(ctx, img, s.x, s.y, s.element === "ice" ? 18 : 23);
    else {
      ctx.fillStyle = "#e23b4a";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
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
  // Foot of the Law: the foot drops onto the carpet, then lifts away.
  for (const st of world.stomps) {
    const k = 1 - st.life / st.max;
    const drop = k < 0.35 ? (1 - k / 0.35) * 46 : 0;
    const fade = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(st.x, st.y + 8, 30 * (0.6 + 0.4 * Math.min(1, k / 0.35)), 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ready(art.flyStomp)) {
      // The painted foot: its sole sits about a fifth of the way up from the bottom, so lift the centre to land it on the spot.
      blitFit(ctx, art.flyStomp, st.x, st.y - drop - 26, 104, 90);
    } else {
      ctx.translate(st.x, st.y - drop);
      drawFootShape(ctx, 1.9);
    }
    ctx.restore();
  }
  for (const r of world.rings) {
    const k = 1 - r.life / r.max;
    if (r.fill) {
      // Splash area: grows fast to its true radius, then fades.
      const grow = Math.min(1, k * 4);
      const rad = Math.max(1, r.r * (0.35 + 0.65 * grow));
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad);
      g.addColorStop(0, `rgba(${r.color},${0.42 * (1 - k)})`);
      g.addColorStop(0.8, `rgba(${r.color},${0.3 * (1 - k)})`);
      g.addColorStop(1, `rgba(${r.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${r.color},${(1 - k) * 0.95})`;
      ctx.lineWidth = 3.5 * (1 - k) + 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
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
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.s / 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.font = "600 13px 'Outfit Variable', Outfit, sans-serif";
  ctx.textAlign = "center";
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  const vig = ctx.createRadialGradient(world.w / 2, world.h / 2, world.w * 0.22, world.w / 2, world.h / 2, world.w * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(8,4,6,0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, world.w, world.h);

  ctx.restore();
}

let darkLayer: HTMLCanvasElement | null = null;

/** The Archive: dim the room, with light around lamps, cannons and the door. */
function drawDark(ctx: CanvasRenderingContext2D, world: World) {
  if (typeof document === "undefined") return;
  darkLayer ??= document.createElement("canvas");
  const layer = darkLayer;
  if (layer.width !== world.w || layer.height !== world.h) {
    layer.width = world.w;
    layer.height = world.h;
  }
  const d = layer.getContext("2d");
  if (!d) return;
  d.globalCompositeOperation = "source-over";
  d.clearRect(0, 0, world.w, world.h);
  d.fillStyle = "rgba(4,3,10,0.62)";
  d.fillRect(0, 0, world.w, world.h);
  d.globalCompositeOperation = "destination-out";
  const hole = (x: number, y: number, r: number, a: number) => {
    const g = d.createRadialGradient(x, y, r * 0.4, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    d.fillStyle = g;
    d.beginPath();
    d.arc(x, y, r, 0, Math.PI * 2);
    d.fill();
  };
  for (const t of world.towers) {
    if (t.kind === "lantern") hole(t.x, t.y, (t.mods.includes("wick") ? 102 : 72) + 18, 0.95);
    else hole(t.x, t.y, 30, 0.45);
  }
  const end = world.points[world.points.length - 1];
  hole(end.x, end.y, 66, 0.7);
  ctx.drawImage(layer, 0, 0);
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

  // Corners first, so the dye below covers them too.
  if (ready(art.corner)) {
    for (const turn of world.turns) {
      blit(ctx, art.corner, turn.c * CELL + CELL / 2, turn.r * CELL + CELL / 2, CELL, turn.rot);
    }
  }

  // Each room's own carpet colour: the same weave, a different dye.
  // A Bindery carpet colour (a cosmetic) replaces the room's own dye; black needs colour and a darker pass.
  const chosen = world.hud.cosmetics?.carpet ?? "crimson";
  const dye = CARPET_DYE[chosen] ?? ROOM_LOOK[world.hud.map]?.carpet;
  if (dye) {
    ctx.save();
    ctx.globalCompositeOperation = chosen === "black" ? "color" : "hue";
    ctx.fillStyle = dye;
    for (const key of cells) {
      const [c, r] = key.split(",").map(Number);
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
    const start = world.points[0];
    ctx.fillRect(start.x - CELL * 1.5, start.y - CELL / 2, CELL, CELL);
    if (chosen === "black") {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(90,90,100,1)";
      for (const key of cells) {
        const [c, r] = key.split(",").map(Number);
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
      ctx.fillRect(start.x - CELL * 1.5, start.y - CELL / 2, CELL, CELL);
    }
    ctx.restore();
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
  // The room's own exit if it has one (Archive vault, Rare Books door, Annex hatch), else the stacks.
  const ownDoor = ROOM_ART[world.hud.map]?.door;
  const roomDoor = ownDoor ? art[ownDoor] : undefined;
  if (ready(roomDoor)) {
    // Wider than the Stacks' door: keep it on the board when the carpet ends at an edge.
    const h = 70;
    const half = (h * roomDoor.naturalWidth) / roomDoor.naturalHeight / 2;
    blit(ctx, roomDoor, Math.max(half + 2, Math.min(world.w - half - 2, end.x - 2)), Math.max(h / 2 + 2, end.y - 12), h);
  } else if (ready(art.door)) {
    blit(ctx, art.door, end.x - 2, end.y - 16, 88);
  } else {
    ctx.fillStyle = "#e6c36a";
    roundRect(ctx, end.x - 16, end.y - 22, 32, 44, 4);
    ctx.fill();
    ctx.fillStyle = "#2a1c22";
    ctx.font = "700 11px 'Outfit Variable', Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STACKS", end.x, end.y + 4);
  }

  if (world.hud.map === "overflow" && world.points.length >= 2) drawChute(ctx, world, end, getSprites().chuteProp);
  const oath = world.hud.oath;
  if (oath && (world.hud.phase === "prep" || world.hud.phase === "combat")) drawOathBand(ctx, world.points, oath, 0.6);
}

/**
 * Sir Michael's oath zone: a faint gold band over the two tiles of carpet where his Trebuchet may
 * shove (door: the last two, mouth: the first two; sling draws nothing). Gold and still, unlike the
 * blue moving chute chevrons. `strength` 1 is the bright intro hover; play uses less.
 */
export function drawOathBand(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, oath: OathId, strength = 1) {
  const run = oathStretch(points, oath);
  if (run.length < 2) return;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(run[0].x, run[0].y);
  for (const p of run.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = `rgba(240,205,120,${0.42 * strength})`;
  ctx.lineWidth = CELL - 6;
  ctx.stroke();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = `rgba(255,228,150,${0.95 * strength})`;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let k = 0; k < run.length; k++) {
      // Edge lines either side of the band, offset along each segment's normal.
      const a = run[Math.max(0, k - 1)];
      const b = run[Math.min(run.length - 1, k === 0 ? 1 : k)];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = (-(b.y - a.y) / len) * side * (CELL / 2 - 4);
      const ny = ((b.x - a.x) / len) * side * (CELL / 2 - 4);
      if (k === 0) ctx.moveTo(run[k].x + nx, run[k].y + ny);
      else ctx.lineTo(run[k].x + nx, run[k].y + ny);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The Overflow's returns chute: fruit marked `chute` come in past the end of the carpet and walk it
 * backwards. A "CHUTE" plate by the door and chevrons pointing back toward the entrance show where.
 * They glow and move while the current or next wave uses the chute, and sit dim otherwise.
 */
function drawChute(ctx: CanvasRenderingContext2D, world: World, end: { x: number; y: number }, prop?: HTMLImageElement) {
  const prev = world.points[world.points.length - 2];
  const len = Math.hypot(end.x - prev.x, end.y - prev.y) || 1;
  // Unit vector pointing back along the carpet, the way chute fruit walk.
  const bx = (prev.x - end.x) / len;
  const by = (prev.y - end.y) / len;
  const active = world.hud.chuteWave;
  const pulse = active ? 0.55 + Math.sin(world.anim * 4) * 0.35 : 0;

  ctx.save();
  if (active) {
    const glow = ctx.createRadialGradient(end.x, end.y, 4, end.x, end.y, 70);
    glow.addColorStop(0, `rgba(111,198,239,${0.35 * pulse + 0.1})`);
    glow.addColorStop(1, "rgba(111,198,239,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 70, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chevrons on the last stretch of carpet, drifting back toward the entrance when active.
  const drift = active ? (world.anim * 0.9) % 1 : 0;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    const along = CELL * (0.55 + (i + drift) * 0.55);
    const cx = end.x + bx * along;
    const cy = end.y + by * along;
    const fade = active ? 0.9 - ((i + drift) / 3) * 0.6 : 0.28;
    ctx.strokeStyle = active ? `rgba(111,198,239,${fade})` : `rgba(230,195,106,${fade})`;
    // The point of the chevron leads in the walking direction (b); the arms trail behind.
    const px = -by;
    const py = bx;
    ctx.beginPath();
    ctx.moveTo(cx - bx * 6 + px * 8, cy - by * 6 + py * 8);
    ctx.lineTo(cx + bx * 4, cy + by * 4);
    ctx.lineTo(cx - bx * 6 - px * 8, cy - by * 6 - py * 8);
    ctx.stroke();
  }

  // The returns chute beside the door (painted when the art is loaded, a "CHUTE" plate otherwise), kept inside the board.
  if (ready(prop)) {
    // Up and back from the door (along the carpet), so it never covers the door itself.
    const size = 50;
    const side = end.y - CELL * 1.05 - size / 2 >= 2 ? -1 : 1;
    const x = Math.max(size / 2 + 2, Math.min(world.w - size / 2 - 2, end.x + bx * CELL * 1.1));
    const y = end.y + side * CELL * 1.05;
    if (active) {
      const halo = ctx.createRadialGradient(x, y, 6, x, y, size * 0.8);
      halo.addColorStop(0, `rgba(111,198,239,${0.3 + pulse * 0.3})`);
      halo.addColorStop(1, "rgba(111,198,239,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = active ? 1 : 0.85;
    blitFit(ctx, prop, x, y, size, size);
    ctx.restore();
    return;
  }
  const w = 50;
  const h = 16;
  const side = end.y - CELL * 0.85 - h / 2 >= 2 ? -1 : 1;
  const x = Math.max(w / 2 + 2, Math.min(world.w - w / 2 - 2, end.x - 4));
  const y = end.y + side * CELL * 0.85;
  ctx.fillStyle = "rgba(20,16,18,0.9)";
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = active ? `rgba(111,198,239,${0.6 + pulse * 0.4})` : "rgba(230,195,106,0.7)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 4);
  ctx.stroke();
  ctx.fillStyle = active ? "#bfe6f7" : "#e6c36a";
  ctx.font = "700 10px 'Outfit Variable', Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CHUTE", x, y + 0.5);
  ctx.restore();
}

/** The Unstoppered's wet carpet: a cool sheen and a few slow ripples on each soaked cell. */
function drawWet(ctx: CanvasRenderingContext2D, world: World) {
  if (!world.wet.size) return;
  ctx.save();
  for (const key of world.wet) {
    const [c, r] = key.split(",").map(Number);
    const x = c * CELL;
    const y = r * CELL;
    ctx.fillStyle = "rgba(70,120,150,0.22)";
    ctx.fillRect(x, y, CELL, CELL);
    const t = (world.anim * 0.6 + ((c * 7 + r * 13) % 10) / 10) % 1;
    ctx.strokeStyle = `rgba(170,215,235,${0.35 * (1 - t)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x + CELL * 0.5, y + CELL * 0.55, 4 + t * 14, 2 + t * 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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

/**
 * A tower's reach, shown as what it can actually hit: the stretch of carpet inside its range glows and the
 * rest of the carpet dims (fruit only walk the carpet's centre line, so this is exact). Towers that help
 * other towers ring the towers in reach. The range circle stays, faint. While placing, a label says how
 * many tiles of carpet that spot covers.
 */
function drawReach(
  ctx: CanvasRenderingContext2D,
  world: World,
  x: number,
  y: number,
  kind: TowerKind,
  range: number,
  self: World["towers"][number] | null,
  placing: boolean,
) {
  const shape = reachShape(kind, range);
  const points = world.points;
  const whole = range >= GLOBAL_RANGE;
  ctx.save();
  if (shape.mode !== "none" && !whole) {
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(198,161,90,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  let label = "";
  if (shape.mode === "carpet" && points.length > 1) {
    const reach = whole
      ? { stretches: points.slice(1).map((p, i) => ({ x1: points[i].x, y1: points[i].y, x2: p.x, y2: p.y })), length: 0 }
      : carpetInReach(points, x, y, range, shape.inner);
    // Dim the carpet it can't reach...
    if (!whole) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "rgba(10,6,8,0.5)";
      ctx.lineWidth = CELL - 8;
      ctx.lineJoin = "miter";
      ctx.lineCap = "butt";
      ctx.stroke();
    }
    // ...and light the stretches it can: a warm band, a bright centre line, and a tick at each end.
    // Stretches that meet at a bend are drawn as one run, so the bend isn't lit twice.
    const runs: Array<Array<{ x: number; y: number }>> = [];
    for (const s of reach.stretches) {
      const run = runs[runs.length - 1];
      const end = run?.[run.length - 1];
      if (end && Math.hypot(end.x - s.x1, end.y - s.y1) < 0.5) run.push({ x: s.x2, y: s.y2 });
      else runs.push([{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]);
    }
    for (const run of runs) {
      ctx.beginPath();
      ctx.moveTo(run[0].x, run[0].y);
      for (const p of run.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.lineJoin = "miter";
      ctx.strokeStyle = "rgba(230,195,106,0.24)";
      ctx.lineWidth = CELL - 8;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(243,226,196,0.85)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    if (!whole) {
      ctx.fillStyle = "rgba(243,226,196,0.95)";
      for (const s of reach.stretches)
        for (const [px, py] of [
          [s.x1, s.y1],
          [s.x2, s.y2],
        ]) {
          // Only where coverage starts or stops (not at a carpet bend inside reach).
          if (points.some((p) => Math.hypot(p.x - px, p.y - py) < 0.5)) continue;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    const tiles = Math.round((reach.length / CELL) * 2) / 2;
    label = whole ? "Whole carpet" : tiles > 0 ? `${tiles} ${tiles === 1 ? "tile" : "tiles"} of carpet` : "No carpet in reach";
  }
  // Towers it helps: the Reading Lamp's reach, or the Quack-Liber's speed-up.
  const helps = shape.mode === "towers" ? range : shape.aura ? world.hud.quackAura : 0;
  if (helps > 0) {
    let n = 0;
    for (const t of world.towers) {
      if (t === self || PASSIVE.includes(t.kind)) continue;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 > helps * helps) continue;
      n++;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(111,198,239,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (shape.mode === "towers") label = n ? `Boosts ${n} ${n === 1 ? "tower" : "towers"}` : "No towers in reach";
    else if (n) label += ` · speeds up ${n}`;
  }
  if (placing && label) {
    ctx.font = "600 11px 'Outfit Variable', Outfit, sans-serif";
    const w = ctx.measureText(label).width + 12;
    const lx = Math.max(w / 2 + 2, Math.min(world.w - w / 2 - 2, x));
    const ly = y - CELL * 0.5 - 12 < 10 ? y + CELL * 0.5 + 12 : y - CELL * 0.5 - 12;
    ctx.fillStyle = "rgba(20,12,16,0.85)";
    roundRect(ctx, lx - w / 2, ly - 9, w, 18, 9);
    ctx.fill();
    ctx.fillStyle = "#f3e2c4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, lx, ly);
  }
  ctx.restore();
}

/**
 * How each room is lit and dyed, on top of the shared art: a colour wash over the floor ([colour, strength]),
 * the carpet's dye (its hue only, so the weave shows through), and where the room's light falls
 * (x and y as shares of the board, its reach as a share of the board's width, and its colour).
 * The Stacks keep the original look; the Archive keeps its dark (that's its rule).
 */
const ROOM_LOOK: Partial<
  Record<string, { floor?: [string, number]; carpet?: string; light?: { x: number; y: number; r: number; color: string; a: number } }>
> = {
  // Storage overflow: dusty, cooler, a faded rust-brown runner, one bare bulb.
  annex: { floor: ["#6f7a6a", 0.35], carpet: "#b0582a", light: { x: 0.7, y: 0.25, r: 0.45, color: "236,226,190", a: 0.16 } },
  // The balcony: warm lamplight from above, a royal-blue runner.
  mezzanine: { floor: ["#a8742a", 0.3], carpet: "#2f4fa8", light: { x: 0.5, y: 0.05, r: 0.7, color: "255,196,110", a: 0.2 } },
  // Rare Books: green baize under the glass cases.
  rarebooks: { carpet: "#1f7a4a", light: { x: 0.5, y: 0.5, r: 0.4, color: "255,214,140", a: 0.14 } },
  // The Great Hall: cold stone and moonlight through high windows, a purple carpet of state.
  greathall: { floor: ["#5a6a8a", 0.4], carpet: "#6a2fa0", light: { x: 0.15, y: 0.0, r: 0.8, color: "170,196,255", a: 0.16 } },
  // The Reading Room: honey wood and green banker's lamps, a teal runner.
  readingroom: { floor: ["#b08a3a", 0.3], carpet: "#1f7f86", light: { x: 0.5, y: 0.5, r: 0.6, color: "190,255,190", a: 0.1 } },
};

/** A soft pool of the room's own light. */
function drawRoomLight(ctx: CanvasRenderingContext2D, world: World, l: { x: number; y: number; r: number; color: string; a: number }) {
  const x = l.x * world.w;
  const y = l.y * world.h;
  const r = l.r * world.w;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${l.color},${l.a})`);
  g.addColorStop(1, `rgba(${l.color},0)`);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, world.w, world.h);
  ctx.restore();
}

/** Rooms with their own furniture on the shelf cells and their own exit (the rest use the Stacks' shelves and door). */
const ROOM_ART: Partial<Record<string, { shelf: SpriteName; door: SpriteName }>> = {
  archive: { shelf: "archiveCabinet", door: "archiveVault" },
  rarebooks: { shelf: "rarebooksCase", door: "rarebooksDoor" },
  annex: { shelf: "annexStorage", door: "annexHatch" },
};

function drawShelves(
  ctx: CanvasRenderingContext2D,
  world: World,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
) {
  // The same cells the engine keeps clear of cannons.
  const spots = [...world.shelfCells].map((k) => k.split(",").map(Number) as [number, number]);
  const ownShelf = ROOM_ART[world.hud.map]?.shelf;
  const furniture = ownShelf ? art[ownShelf] : undefined;
  const shelf = art.shelf;
  for (const [c, r] of spots) {
    const x = c * CELL + CELL / 2;
    const y = r * CELL + CELL / 2;
    if (ready(furniture)) {
      // Furniture stands square (no tilt), a touch bigger or smaller cell to cell.
      ctx.save();
      ctx.translate(x, y + 1);
      const scale = 0.94 + ((c * 7 + r * 3) % 3) * 0.03;
      ctx.scale(scale, scale);
      fit(ctx, furniture, 0, 0, CELL - 2, CELL - 2);
      ctx.restore();
      continue;
    }
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

/** Painted art for the newer cannons: aiming ones sit on the shared base and turn; the rest stand. Sizes are the max box in px. */
const PAINTED_CANNON: Partial<Record<TowerKind, { aim: boolean; w: number; h: number }>> = {
  spitter: { aim: true, w: 44, h: 34 },
  ballista: { aim: true, w: 56, h: 34 },
  reader: { aim: true, w: 58, h: 24 },
  ink: { aim: true, w: 44, h: 36 },
  peeler: { aim: true, w: 54, h: 26 },
  bookworm: { aim: true, w: 46, h: 36 },
  bell: { aim: false, w: 40, h: 48 },
  hive: { aim: false, w: 34, h: 52 },
  lantern: { aim: false, w: 28, h: 50 },
  compost: { aim: false, w: 44, h: 42 },
  // Keeper signature towers: a little larger than the rest so they stand out.
  catalogue: { aim: false, w: 44, h: 56 },
  cauldron: { aim: false, w: 46, h: 54 },
  trebuchet: { aim: false, w: 48, h: 56 },
  scales: { aim: false, w: 44, h: 58 },
  desk: { aim: false, w: 56, h: 48 },
  press: { aim: false, w: 54, h: 54 },
  organ: { aim: false, w: 42, h: 62 },
  scope: { aim: false, w: 56, h: 56 },
  flask: { aim: false, w: 54, h: 50 },
  copycat: { aim: false, w: 42, h: 58 },
  stomp: { aim: false, w: 44, h: 60 },
  honey: { aim: false, w: 44, h: 58 },
  mimic: { aim: false, w: 44, h: 54 },
  lectern: { aim: false, w: 46, h: 56 },
  quackliber: { aim: false, w: 48, h: 56 },
  lionblade: { aim: false, w: 40, h: 60 },
  gourdgate: { aim: false, w: 58, h: 58 },
  bombard: { aim: false, w: 62, h: 60 },
  // Trick cannons.
  boomerang: { aim: false, w: 46, h: 50 },
  orrery: { aim: false, w: 38, h: 58 },
  plane: { aim: false, w: 44, h: 54 },
  quill: { aim: false, w: 42, h: 56 },
  globe: { aim: false, w: 46, h: 56 },
};

/** Draw an image fitted into a w×h box around (x, y), turned by rot. Flips upright when aiming left. */
function blitFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, maxW: number, maxH: number, rot = 0) {
  const ar = img.naturalWidth / img.naturalHeight;
  let h = maxH;
  let w = h * ar;
  if (w > maxW) {
    w = maxW;
    h = w / ar;
  }
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (Math.cos(rot) < 0) ctx.scale(1, -1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * The Brass Telescope's art in two pieces: the tripod stays put, and the tube turns on its mount
 * toward the target (mirrored when the target is to the left, and kept to a believable tilt).
 */
function drawScopeArt(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, maxW: number, maxH: number, aim: number) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const k = Math.min(maxW / W, maxH / H);
  const left = Math.cos(aim) < 0;
  // In the painting the tube points up and to the right at about this angle.
  const rest = -0.245;
  const want = left ? Math.atan2(Math.sin(aim), -Math.cos(aim)) : aim;
  const turn = Math.max(-1, Math.min(0.75, want)) - rest;
  const cut = 0.41 * H; // where the tube's mount meets the tripod
  const legX = 0.12 * W; // leave out the dangling lens cap, which belongs to the tube
  const px = 0.445 * W; // the mount the tube turns on
  const py = 0.38 * H;
  ctx.save();
  ctx.translate(cx, cy);
  if (left) ctx.scale(-1, 1);
  ctx.drawImage(img, legX, cut, W - legX, H - cut, (legX - W / 2) * k, (cut - H / 2) * k, (W - legX) * k, (H - cut) * k);
  ctx.translate((px - W / 2) * k, (py - H / 2) * k);
  ctx.rotate(turn);
  ctx.drawImage(img, 0, 0, W, cut, -px * k, -py * k, W * k, cut * k);
  ctx.restore();
}

function drawPaintedCannon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  aim: number,
  kind: TowerKind,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
  t: number,
): boolean {
  const spec = PAINTED_CANNON[kind];
  const img = art[kind as SpriteName];
  if (!spec || !ready(img)) return false;
  if (spec.aim && !ready(art.base)) return false;
  if (kind === "lantern") {
    const flick = 0.85 + Math.sin(t * 9) * 0.06 + Math.sin(t * 13) * 0.04;
    const glow = ctx.createRadialGradient(x, y - 10, 2, x, y - 10, 34);
    glow.addColorStop(0, `rgba(255,214,140,${0.5 * flick})`);
    glow.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 10, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 17, spec.aim ? 16 : spec.w * 0.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (spec.aim) {
    blit(ctx, art.base!, x, y + 6, 46);
    blitFit(ctx, img, x, y - 2, spec.w, spec.h, aim);
    return true;
  }
  if (kind === "scope") {
    drawScopeArt(ctx, img, x, y + 18 - spec.h / 2, spec.w, spec.h, aim);
    return true;
  }
  const sway = kind === "bell" ? Math.sin(t * 2) * 0.04 : 0;
  blitFit(ctx, img, x, y + 18 - spec.h / 2, spec.w, spec.h, sway);
  if (kind === "hive") {
    ctx.fillStyle = "#1b1410";
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.1;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 18, y - 12 + Math.sin(a * 1.3) * 7, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return true;
}

/** Sprites and on-board sizes (px) for the newer cannons' shots. */
const NEW_SHOT = {
  seed: { sprite: "shotSeed", size: 10 },
  fly: { sprite: "shotFly", size: 13 },
  ink: { sprite: "shotInk", size: 13 },
  peel: { sprite: "shotPeel", size: 14 },
  worm: { sprite: "shotWorm", size: 14 },
} as const satisfies Record<string, { sprite: SpriteName; size: number }>;

const UNIT_H = { melon: 52, corn: 48, pumpkin: 58, karl: 108 } as const;
/** Act three: the stone melon is a little squat and heavy, the gall small, the borrower a lanky runner. */
const LOOK_H = { pit: 50, gall: 34, borrower: 46 } as const;

function drawTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  aim: number,
  kind: TowerKind,
  orange: boolean,
  selected: boolean,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
  t = 0,
) {
  if (DRAWN_KINDS.includes(kind)) {
    if (!drawPaintedCannon(ctx, x, y, aim, kind, art, t)) drawCannon(ctx, x, y, aim, kind, t);
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
        : kind === "mortar" || orange
          ? art.allyBarrel
          : art.barrel;
  if (ready(base) && ready(barrel)) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    blit(ctx, base, x, y + 6, 46);
    const tall = kind === "fire" || kind === "freeze" ? 32 : kind === "mortar" ? 34 : 28;
    blit(ctx, barrel, x, y - 2, tall, aim);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#2a1c16";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(aim);
    ctx.fillStyle = kind === "mortar" ? "#c46a28" : "#2f6b3e";
    roundRect(ctx, 0, -6, 22, 12, 4);
    ctx.fill();
    ctx.fillStyle = kind === "mortar" ? "#e8883a" : "#e23b4a";
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
  look: "pit" | "gall" | "borrower" | null = null,
) {
  const img = art[look ?? kind];
  const height = look ? LOOK_H[look] : UNIT_H[kind];
  if (ready(img)) {
    const bob = Math.sin(anim * 3 + x * 0.05) * (boss ? 0 : 1.2);
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(x, y + height * 0.36, height * 0.28, height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y + bob);
    if (faceLeft) ctx.scale(-1, 1);
    // The gall glows lime, so the small healer reads on the carpet next to fruit twice its size.
    ctx.shadowColor = look === "gall" ? "rgba(160,240,90,0.95)" : "rgba(243,226,196,0.55)";
    ctx.shadowBlur = look === "gall" ? 12 : 7;
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

/** Trail color for each kind of shot (r,g,b). */
function shotColor(element: string, orange: boolean): string {
  if (orange) return "232,136,58";
  switch (element) {
    case "fire":
      return "255,150,60";
    case "ice":
      return "170,215,240";
    case "mortar":
      return "232,136,58";
    case "potion":
      return "120,220,110";
    case "ink":
      return "120,140,200";
    case "seed":
    case "peel":
      return "240,210,120";
    case "fly":
      return "200,200,170";
    case "worm":
      return "231,154,176";
    default:
      return "255,90,100";
  }
}

/**
 * Make a shot easy to spot on the dark floor: a short fading streak behind it
 * and a soft glow with a dark rim under it.
 */
function shotTrail(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, color: string) {
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const tail = 34;
  const g = ctx.createLinearGradient(x, y, x - ux * tail, y - uy * tail);
  g.addColorStop(0, `rgba(${color},0.95)`);
  g.addColorStop(0.4, `rgba(${color},0.55)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.strokeStyle = g;
  ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * tail, y - uy * tail);
  ctx.stroke();
  const glow = ctx.createRadialGradient(x, y, 3, x, y, 22);
  glow.addColorStop(0, `rgba(${color},0.7)`);
  glow.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  // Dark disc with a bright rim, so the sprite pops off any floor.
  ctx.fillStyle = "rgba(10,6,8,0.6)";
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${color},0.9)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
