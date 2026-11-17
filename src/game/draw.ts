import { asset } from "../lib/asset.ts";
import { BOARDS, CANNON, FLOOR, CARPET_DYE, CELL, VERGE_NOTE, bindLeg, carpetLegs, GLOBAL_RANGE, PASSIVE, carpetInReach, oathStretch, reachShape, roundedSpot, type OathId, type TowerKind, type World } from "./engine";
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
  // The three newest rooms' own fruit (flags on the kinds above), and the Creeping Squash's vine tile.
  express: asset("sprites/enemy-express.webp"),
  parcel: asset("sprites/enemy-parcel.webp"),
  sprout: asset("sprites/enemy-sprout.webp"),
  squash: asset("sprites/enemy-squash.webp"),
  chimer: asset("sprites/enemy-chimer.webp"),
  gargoyle: asset("sprites/enemy-gargoyle.webp"),
  tileVine: asset("sprites/tile-vine.webp"),
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
  floorSorting: asset("sprites/tile-floor-sorting.webp"),
  floorGreenhouse: asset("sprites/tile-floor-greenhouse.webp"),
  floorBelltower: asset("sprites/tile-floor-belltower.webp"),
  // Floor marks on the carpet, painted pointing right (the way the carpet runs).
  tileBelt: asset("sprites/tile-belt.webp"),
  tileStairs: asset("sprites/tile-stairs.webp"),
  tileBed: asset("sprites/tile-bed.webp"),
  chuteProp: asset("sprites/prop-returns-chute.webp"),
  // Each room's own furniture (on its shelf cells) and exit.
  archiveCabinet: asset("sprites/prop-archive-cabinet.webp"),
  archiveVault: asset("sprites/prop-archive-vault.webp"),
  rarebooksCase: asset("sprites/prop-rarebooks-case.webp"),
  rarebooksDoor: asset("sprites/prop-rarebooks-door.webp"),
  annexStorage: asset("sprites/prop-annex-storage.webp"),
  annexHatch: asset("sprites/prop-annex-hatch.webp"),
  sortingCage: asset("sprites/prop-sorting-cage.webp"),
  sortingDoor: asset("sprites/prop-sorting-door.webp"),
  greenhousePlanter: asset("sprites/prop-greenhouse-planter.webp"),
  greenhouseDoor: asset("sprites/prop-greenhouse-door.webp"),
  belltowerBeam: asset("sprites/prop-belltower-beam.webp"),
  belltowerDoor: asset("sprites/prop-belltower-door.webp"),
  bellFrame: asset("sprites/prop-bell.webp"),
  shotSeed: asset("sprites/shot-seed.webp"),
  shotFly: asset("sprites/shot-fly.webp"),
  shotInk: asset("sprites/shot-ink.webp"),
  shotPeel: asset("sprites/shot-peel.webp"),
  shotWorm: asset("sprites/shot-worm.webp"),
  carpet: asset("sprites/tile-carpet.webp"),
  corner: asset("sprites/tile-carpet-corner.webp"),
  /** The rounded ("path") carpet's fabric: a seamless damask, filled along the band. */
  carpetPath: asset("sprites/carpet-path-fabric.webp"),
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
  // Quackarot's Anti-Geese Protocol, Pamphlet and Reverse Driver.
  geese: asset("sprites/sig-geese.webp"),
  pamphlet: asset("sprites/sig-pamphlet.webp"),
  driver: asset("sprites/sig-driver.webp"),
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
  const ownFloor = ({
    rarebooks: art.floorRarebooks,
    archive: art.floorArchive,
    overflow: art.floorOverflow,
    sorting: art.floorSorting,
    greenhouse: art.floorGreenhouse,
    belltower: art.floorBelltower,
  } as Partial<Record<string, HTMLImageElement>>)[world.hud.map];
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
  if (look?.floor && floor === art.floor) {
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
  // On a rounded carpet, floors, vines and puddles stay inside the band (a bed on a turn doesn't poke out).
  ctx.save();
  if (isBand(world)) ctx.clip(bandShape(world.points));
  drawFloors(ctx, world, art);
  drawVines(ctx, world, art);
  ctx.restore();
  if (look?.light) drawRoomLight(ctx, world, look.light);
  ctx.save();
  if (isBand(world)) ctx.clip(bandShape(world.points));
  drawWet(ctx, world);
  ctx.restore();
  drawBell(ctx, world);
  if (BOARDS[world.hud.map].dark) drawDark(ctx, world);

  const hover = world.hover;
  const placing = world.hud.phase === "prep" || world.hud.phase === "combat";
  if (hover && placing) {
    const path = world.pathCells.has(`${hover.c},${hover.r}`);
    const verge = world.vergeCells.has(`${hover.c},${hover.r}`);
    const taken = world.towers.some((t) => t.c === hover.c && t.r === hover.r);
    const cx = hover.c * CELL + CELL / 2;
    const cy = hover.r * CELL + CELL / 2;
    const open = !path && !taken && !verge;
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
      if (verge && !taken) {
        // A verge: the carpet's diagonal half-covers it.
        ctx.save();
        ctx.font = "600 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const w = ctx.measureText(VERGE_NOTE).width + 10;
        const ty = hover.r === 0 ? cy + CELL / 2 + 20 : cy - CELL / 2 - 4;
        ctx.fillStyle = "rgba(20,14,18,0.85)";
        ctx.fillRect(cx - w / 2, ty - 17, w, 18);
        ctx.fillStyle = "#f3e2c4";
        ctx.fillText(VERGE_NOTE, cx, ty);
        ctx.restore();
      }
    }
  }

  // The Pamphlet's straight: while placing one, while one is selected, and (between waves) every one's.
  {
    const legs = carpetLegs(world.points);
    const shown = new Set<number>();
    if (hover && placing && world.hud.build === "pamphlet" && world.hud.canPlace) shown.add(bindLeg(legs, hover.c, hover.r));
    for (const t of world.towers) {
      if (t.kind !== "pamphlet") continue;
      if (t.id === world.hud.selected || world.hud.phase === "prep") shown.add(t.leg ?? -1);
    }
    for (const i of shown) if (legs[i]) drawLegWash(ctx, legs[i]);
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
  const band = isBand(world);
  for (const e of [...world.enemies.filter((f) => !f.gall), ...world.enemies.filter((f) => f.gall)]) {
    // On a rounded carpet, a fruit at a turn is drawn on the curve (its rules position stays on the corner).
    const drawn = band ? roundedSpot(world.points, e.x, e.y) : null;
    ctx.save();
    if (drawn) ctx.translate(drawn.x - e.x, drawn.y - e.y);
    if (e.chill > 0) {
      ctx.strokeStyle = "rgba(106,74,138,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 8, e.r + 6, e.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const next = world.points[Math.min(e.wp, world.points.length - 1)];
    // A Parcel out of its paper is a plain pumpkin.
    const look: Look | null = e.pit ? "pit" : e.gall ? "gall" : e.borrower ? "borrower" : e.native === "parcel" && !e.wrapped ? null : (e.native ?? null);
    // Reverse Driver: a little green-white swirl over a fruit being walked back.
    if ((e.driven ?? 0) > 0) {
      ctx.save();
      ctx.translate(e.x, e.y - e.r - 12);
      ctx.rotate(world.anim * 9);
      ctx.strokeStyle = "rgba(200,255,215,0.9)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, Math.PI, Math.PI * 2.2);
      ctx.stroke();
      ctx.restore();
    }
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
    const quiet = (world.bell?.quiet ?? 0) > 0;
    if (!painted && e.native === "sprout") drawSproutShape(ctx, e.x, e.y, e.r, e.hp / e.maxHp, world.anim);
    else if (!painted && e.native === "gargoyle") drawGargoyleShape(ctx, e.x, e.y, e.r, e.hp / e.maxHp, world.anim, quiet);
    else drawEnemy(ctx, e.kind, e.x, e.y, e.r, e.hp / e.maxHp, world.anim, e.boss, art, next ? next.x < e.x - 4 : false, painted ? look : null);
    if (painted && e.native === "gargoyle" && quiet) {
      // Awake: a faint pale glow while the clock silences the towers.
      ctx.fillStyle = `rgba(200,220,255,${0.25 + Math.sin(world.anim * 12) * 0.1})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!painted && e.native) drawNativeMark(ctx, e, world.anim);
    if ((e.grew ?? 0) > 0) {
      // A sprout just grew: a green ring opens out.
      const k = 1 - (e.grew ?? 0) / 0.5;
      ctx.strokeStyle = `rgba(143,220,106,${1 - k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 4 + k * 18, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    ctx.restore();
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
    // The Pamphlet: a lit fuse while armed; a shockwave down its straight when it goes off.
    if (t.kind === "pamphlet") {
      if (t.armed !== false) {
        const flick = 0.55 + Math.sin(world.anim * 14 + t.id) * 0.3;
        ctx.fillStyle = `rgba(255,190,90,${flick})`;
        ctx.beginPath();
        ctx.arc(t.x - 9, t.y - 23, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const leg = carpetLegs(world.points)[t.leg ?? -1];
      if (leg && (t.blast ?? 0) > 0) {
        const k = 1 - (t.blast ?? 0) / 0.3;
        const hx = leg.a.x + (leg.b.x - leg.a.x) * k;
        const hy = leg.a.y + (leg.b.y - leg.a.y) * k;
        ctx.save();
        ctx.strokeStyle = `rgba(232,116,42,${0.85 - k * 0.5})`;
        ctx.lineWidth = CELL * 0.55;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(leg.a.x, leg.a.y);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.restore();
      }
    }
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

  // Orrery: a faint orbit and the two planets (a Copycat's copy too).
  for (const t of world.towers.map((o) => (o.kind === "copycat" && o.copy ? o.copy : o))) {
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

/** Whether this board's carpet draws as one rounded band ("path") rather than square tiles. */
const isBand = (world: World) => BOARDS[world.hud.map].carpet === "path";

/**
 * Trace a centre line through `pts`, rounding each turn with radius `round` (0: sharp). With `lead`/`tail`
 * it starts that far before the first point and ends that far past the last, along the end stretches.
 */
function traceLine(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>, round: number, lead = 0, tail = 0) {
  if (pts.length < 2) return;
  const a = pts[0];
  const a1 = pts[1];
  const la = Math.hypot(a1.x - a.x, a1.y - a.y) || 1;
  ctx.moveTo(a.x - ((a1.x - a.x) / la) * lead, a.y - ((a1.y - a.y) / la) * lead);
  for (let k = 1; k < pts.length - 1; k++) {
    if (round > 0) ctx.arcTo(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y, round);
    else ctx.lineTo(pts[k].x, pts[k].y);
  }
  const z = pts[pts.length - 1];
  const z0 = pts[pts.length - 2];
  const lz = Math.hypot(z.x - z0.x, z.y - z0.y) || 1;
  ctx.lineTo(z.x + ((z.x - z0.x) / lz) * tail, z.y + ((z.y - z0.y) / lz) * tail);
}

/**
 * The outline of a "path" carpet as a fillable shape (for clipping): each stretch is a tile-wide strip,
 * trimmed where its turns begin, and each turn is a pie slice (inner radius 0, outer a full tile).
 */
const bandCache = new WeakMap<object, Path2D>();
function bandShape(points: Array<{ x: number; y: number }>) {
  const hit = bandCache.get(points);
  if (hit) return hit;
  const shape = new Path2D();
  const R = CELL / 2;
  const n = points.length;
  const trim = new Array(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    const a = points[k - 1];
    const p = points[k];
    const b = points[k + 1];
    const la = Math.hypot(p.x - a.x, p.y - a.y) || 1;
    const lb = Math.hypot(b.x - p.x, b.y - p.y) || 1;
    const inX = (p.x - a.x) / la;
    const inY = (p.y - a.y) / la;
    const outX = (b.x - p.x) / lb;
    const outY = (b.y - p.y) / lb;
    const turn = Math.acos(Math.max(-1, Math.min(1, inX * outX + inY * outY)));
    if (turn < 1e-3) continue;
    const t = R * Math.tan(turn / 2);
    trim[k] = t;
    const side = inX * outY - inY * outX > 0 ? 1 : -1;
    const cx = p.x - inX * t - inY * side * R;
    const cy = p.y - inY * t + inX * side * R;
    const start = Math.atan2(-(inX * side), inY * side);
    const end = start + side * turn;
    shape.moveTo(cx, cy);
    shape.arc(cx, cy, CELL, Math.min(start, end), Math.max(start, end));
    shape.closePath();
  }
  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    const s0 = i === 0 ? -CELL * 1.5 : trim[i];
    const s1 = i === n - 2 ? -CELL / 2 : trim[i + 1];
    const ax = a.x + dx * s0;
    const ay = a.y + dy * s0;
    const bx = b.x - dx * s1;
    const by = b.y - dy * s1;
    const nx = -dy * R;
    const ny = dx * R;
    shape.moveTo(ax - nx, ay - ny);
    shape.lineTo(bx - nx, by - ny);
    shape.lineTo(bx + nx, by + ny);
    shape.lineTo(ax + nx, ay + ny);
    shape.closePath();
  }
  bandCache.set(points, shape);
  return shape;
}

/**
 * A "path" carpet: one band a tile wide along the points, from a tile before the first to the door, with
 * each turn rounded (centre radius half a tile, so the outside edge sweeps a full tile). A thin gold rule
 * runs along both edges with a slight shadow inside it, like the corner tile's border; the room's dye (or
 * the Bindery colour) is clipped to the same band.
 */
function drawBand(ctx: CanvasRenderingContext2D, world: World, art: Partial<Record<SpriteName, HTMLImageElement>>) {
  const path = () => {
    ctx.beginPath();
    traceLine(ctx, world.points, CELL / 2, CELL * 1.5, CELL / 2);
  };
  ctx.save();
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  path();
  const fabric = ready(art.carpetPath) ? art.carpetPath : ready(art.carpet) ? art.carpet : null;
  const pattern = fabric ? ctx.createPattern(fabric, "repeat") : null;
  ctx.strokeStyle = "rgba(230,195,106,0.9)";
  ctx.lineWidth = CELL;
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,12,16,0.45)";
  ctx.lineWidth = CELL - 4;
  ctx.stroke();
  if (pattern) {
    ctx.strokeStyle = pattern;
    ctx.lineWidth = CELL - 6;
    ctx.stroke();
  } else {
    // Art not loaded yet: the same two reds as the tiled fallback.
    ctx.strokeStyle = "#6a2a32";
    ctx.lineWidth = CELL - 6;
    ctx.stroke();
    ctx.strokeStyle = "#8d3a42";
    ctx.lineWidth = 22;
    ctx.stroke();
  }
  const chosen = world.hud.cosmetics?.carpet ?? "crimson";
  const dye = CARPET_DYE[chosen] ?? ROOM_LOOK[world.hud.map]?.carpet;
  if (dye && pattern) {
    ctx.globalCompositeOperation = chosen === "black" ? "color" : "hue";
    ctx.strokeStyle = dye;
    ctx.lineWidth = CELL - 4;
    ctx.stroke();
    if (chosen === "black") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = "rgba(90,90,100,1)";
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCarpet(
  ctx: CanvasRenderingContext2D,
  world: World,
  art: Partial<Record<SpriteName, HTMLImageElement>>,
) {
  const cells = [...world.pathCells];
  if (BOARDS[world.hud.map].carpet === "path") drawBand(ctx, world, art);
  else {
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
/**
 * Belts, stairs and growth beds, drawn over the carpet so a fast or healing stretch never looks
 * like plain carpet: belts are dark rubber with amber chevrons that run the carpet's way, stairs are
 * treads (blue going up and slow, orange coming down and fast), beds are soil with green shoots.
 */
function drawFloors(ctx: CanvasRenderingContext2D, world: World, art: Partial<Record<SpriteName, HTMLImageElement>>) {
  if (!world.floors.size) return;
  const { tileBelt, tileStairs, tileBed } = art;
  ctx.save();
  for (const [key, tile] of world.floors) {
    const [c, r] = key.split(",").map(Number);
    const x = c * CELL;
    const y = r * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const ang = Math.atan2(tile.dr, tile.dc);
    if (tile.kind === "bed" && ready(tileBed)) {
      ctx.drawImage(tileBed, x + 1, y + 1, CELL - 2, CELL - 2);
      const glow = 0.06 + 0.06 * Math.sin(world.anim * 2.4 + c + r);
      ctx.fillStyle = `rgba(143,220,106,${glow})`;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      continue;
    }
    if (tile.kind === "bed") {
      ctx.fillStyle = "rgba(52,34,20,0.82)";
      ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
      ctx.strokeStyle = "rgba(143,220,106,0.75)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, CELL - 8, CELL - 8);
      // Shoots, swaying a little.
      for (let i = 0; i < 4; i++) {
        const sx = x + 10 + i * 9.5;
        const sway = Math.sin(world.anim * 2 + i + c) * 2;
        ctx.strokeStyle = "#8fdc6a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, y + CELL - 10);
        ctx.quadraticCurveTo(sx + sway, y + CELL - 18, sx + sway * 1.5, y + CELL - 24 - (i % 2) * 5);
        ctx.stroke();
      }
      const glow = 0.12 + 0.08 * Math.sin(world.anim * 2.4 + c + r);
      ctx.fillStyle = `rgba(143,220,106,${glow})`;
      ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
      continue;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    if (tile.kind === "belt" && ready(tileBelt)) {
      // The painted belt scrolls the carpet's way: two copies, offset by the shift.
      const h = CELL - 8;
      const w = (h * tileBelt.naturalWidth) / tileBelt.naturalHeight;
      const shift = (world.anim * 26) % w;
      ctx.beginPath();
      ctx.rect(-CELL / 2, -h / 2, CELL, h);
      ctx.clip();
      for (let px = -CELL / 2 - w + shift; px < CELL / 2; px += w) ctx.drawImage(tileBelt, px, -h / 2, w, h);
    } else if (tile.kind !== "belt" && ready(tileStairs)) {
      // Painted low on the left, high on the right: going up reads as is; coming down is mirrored.
      const up = tile.kind === "up";
      if (!up) ctx.scale(-1, 1);
      ctx.drawImage(tileStairs, -CELL / 2 + 1, -CELL / 2 + 3, CELL - 2, CELL - 6);
      ctx.fillStyle = up ? "rgba(90,150,255,0.22)" : "rgba(255,140,50,0.22)";
      ctx.fillRect(-CELL / 2 + 1, -CELL / 2 + 3, CELL - 2, CELL - 6);
      if (!up) ctx.scale(-1, 1);
      ctx.fillStyle = up ? "rgba(140,190,255,0.9)" : "rgba(255,170,80,0.95)";
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-2, -6);
      ctx.lineTo(-2, 6);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    } else if (tile.kind === "belt") {
      ctx.fillStyle = "rgba(28,26,30,0.85)";
      ctx.fillRect(-CELL / 2, -CELL / 2 + 6, CELL, CELL - 12);
      ctx.fillStyle = "rgba(150,150,160,0.5)";
      ctx.fillRect(-CELL / 2, -CELL / 2 + 6, CELL, 2);
      ctx.fillRect(-CELL / 2, CELL / 2 - 8, CELL, 2);
      // Chevrons slide along with the belt.
      const shift = ((world.anim * 40) % 16) - 8;
      ctx.strokeStyle = "rgba(240,180,60,0.9)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let k = -2; k <= 1; k++) {
        const px = k * 16 + shift + 4;
        if (px < -CELL / 2 + 4 || px > CELL / 2 - 4) continue;
        ctx.beginPath();
        ctx.moveTo(px - 5, -8);
        ctx.lineTo(px + 2, 0);
        ctx.lineTo(px - 5, 8);
        ctx.stroke();
      }
    } else {
      // Treads across the carpet; going up is slow (blue), coming down is fast (orange).
      const up = tile.kind === "up";
      for (let k = 0; k < 4; k++) {
        const px = -CELL / 2 + 6 + k * 11;
        const shade = up ? 0.18 + k * 0.08 : 0.42 - k * 0.08;
        ctx.fillStyle = `rgba(0,0,0,${shade})`;
        ctx.fillRect(px, -CELL / 2 + 4, 5, CELL - 8);
        ctx.fillStyle = up ? "rgba(140,190,255,0.55)" : "rgba(255,170,80,0.55)";
        ctx.fillRect(px + 5, -CELL / 2 + 4, 1.5, CELL - 8);
      }
      ctx.fillStyle = up ? "rgba(140,190,255,0.85)" : "rgba(255,170,80,0.9)";
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-2, -6);
      ctx.lineTo(-2, 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Creeping Squash vines: a leafy green wash over the carpet tile, fading as it withers. */
function drawVines(ctx: CanvasRenderingContext2D, world: World, art: Partial<Record<SpriteName, HTMLImageElement>>) {
  if (!world.vines.size) return;
  const img = art.tileVine;
  ctx.save();
  for (const [key, vine] of world.vines) {
    const [c, r] = key.split(",").map(Number);
    const x = c * CELL;
    const y = r * CELL;
    ctx.globalAlpha = Math.min(1, vine.life / 1);
    if (ready(img)) {
      ctx.drawImage(img, x + 1, y + 1, CELL - 2, CELL - 2);
      continue;
    }
    ctx.fillStyle = "rgba(90,170,70,0.35)";
    ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    ctx.strokeStyle = "rgba(143,220,106,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + CELL - 8);
    ctx.bezierCurveTo(x + CELL * 0.3, y + 6, x + CELL * 0.6, y + CELL - 4, x + CELL - 4, y + 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(143,220,106,0.9)";
    for (const [lx, ly] of [[0.28, 0.45], [0.55, 0.62], [0.78, 0.3]]) {
      ctx.beginPath();
      ctx.ellipse(x + CELL * lx, y + CELL * ly, 4.5, 2.4, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The Bell Tower's bell over its 2×2 frame: it swings when it strikes, and counts down the last seconds. */
function drawBell(ctx: CanvasRenderingContext2D, world: World) {
  const spot = BOARDS[world.hud.map].bell;
  if (!spot) return;
  const x = (spot[0] + 1) * CELL;
  const y = (spot[1] + 1) * CELL;
  const bell = world.bell;
  const quiet = bell?.quiet ?? 0;
  const painted = getSprites().bellFrame;
  if (ready(painted)) {
    // The painted bell in its frame: a shadow, then the whole frame rocks from the top while it strikes.
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + CELL - 8, CELL * 0.85, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    const rock = quiet > 0 ? Math.sin(world.anim * 14) * 0.07 * (quiet / FLOOR.bellQuiet) : 0;
    ctx.translate(x, y - CELL + 4);
    ctx.rotate(rock);
    const h = CELL * 2 - 4;
    const w = (h * painted.naturalWidth) / painted.naturalHeight;
    ctx.drawImage(painted, -w / 2, 0, w, h);
    ctx.restore();
  } else {
    ctx.save();
    // The frame: a dark timber square under the bell.
    ctx.fillStyle = "rgba(30,20,16,0.92)";
    ctx.fillRect(x - CELL + 3, y - CELL + 3, CELL * 2 - 6, CELL * 2 - 6);
    ctx.strokeStyle = "rgba(120,84,48,0.9)";
    ctx.lineWidth = 4;
    ctx.strokeRect(x - CELL + 5, y - CELL + 5, CELL * 2 - 10, CELL * 2 - 10);
    ctx.beginPath();
    ctx.moveTo(x - CELL + 5, y - CELL + 14);
    ctx.lineTo(x + CELL - 5, y - CELL + 14);
    ctx.stroke();
    // The bell: swings while it strikes.
    const swing = quiet > 0 ? Math.sin(world.anim * 14) * 0.35 * (quiet / 2.5) : Math.sin(world.anim * 1.2) * 0.03;
    ctx.translate(x, y - CELL + 14);
    ctx.rotate(swing);
    const g = ctx.createLinearGradient(-26, 0, 26, 0);
    g.addColorStop(0, "#8a6420");
    g.addColorStop(0.45, "#f0cf78");
    g.addColorStop(1, "#7a5618");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.quadraticCurveTo(-12, 30, -28, 52);
    ctx.lineTo(28, 52);
    ctx.quadraticCurveTo(12, 30, 10, 6);
    ctx.quadraticCurveTo(0, -2, -10, 6);
    ctx.fill();
    ctx.fillStyle = "#5a3e12";
    ctx.beginPath();
    ctx.arc(0, 56, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (!bell) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "600 13px Georgia, serif";
  if (quiet > 0) {
    // Every tower is listening: a gold hush over the room.
    ctx.fillStyle = `rgba(230,195,106,${0.08 + 0.06 * Math.sin(world.anim * 10)})`;
    ctx.fillRect(0, 0, world.w, world.h);
    ctx.fillStyle = "#f3e2c4";
    ctx.fillText("The towers are listening", x, y + CELL + 16);
  } else if (world.hud.phase === "combat" && bell.next <= FLOOR.bellWarn) {
    ctx.fillStyle = "#e6c36a";
    ctx.fillText(`Strikes in ${Math.ceil(bell.next)}`, x, y + CELL + 16);
  }
  ctx.restore();
}

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
    const round = isBand(world) ? CELL / 2 : 0;
    if (!whole) {
      ctx.beginPath();
      traceLine(ctx, points, round);
      ctx.strokeStyle = "rgba(10,6,8,0.5)";
      ctx.lineWidth = CELL - 8;
      ctx.lineJoin = round ? "round" : "miter";
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
      traceLine(ctx, run, round);
      ctx.lineJoin = round ? "round" : "miter";
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
  // The Sorting Room: grey concrete and strip lights, a mustard runner between the belts.
  sorting: { floor: ["#6a7078", 0.45], carpet: "#b88a1e", light: { x: 0.5, y: 0.0, r: 0.75, color: "220,235,255", a: 0.14 } },
  // The Greenhouse: green glass light from above, a terracotta path.
  greenhouse: { floor: ["#4f7a3a", 0.4], carpet: "#b0552e", light: { x: 0.6, y: 0.1, r: 0.8, color: "200,255,170", a: 0.18 } },
  // The Bell Tower: cold stone, a deep red runner, moonlight through the louvres.
  belltower: { floor: ["#6a6a78", 0.45], carpet: "#8a1f2a", light: { x: 0.5, y: 0.45, r: 0.5, color: "230,200,140", a: 0.14 } },
};

/** The Pamphlet's straight: a faint orange wash over its tiles and an arrowhead at the corner where it goes off. */
function drawLegWash(ctx: CanvasRenderingContext2D, leg: ReturnType<typeof carpetLegs>[number]) {
  ctx.save();
  ctx.fillStyle = "rgba(232,116,42,0.22)";
  for (const [c, r] of leg.tiles) ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
  const ang = Math.atan2(leg.b.y - leg.a.y, leg.b.x - leg.a.x);
  ctx.translate(leg.b.x - Math.cos(ang) * CELL * 0.55, leg.b.y - Math.sin(ang) * CELL * 0.55);
  ctx.rotate(ang);
  ctx.fillStyle = "rgba(255,170,90,0.9)";
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-5, -7);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

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
const ROOM_ART: Partial<Record<string, { shelf: SpriteName; door?: SpriteName }>> = {
  archive: { shelf: "archiveCabinet", door: "archiveVault" },
  rarebooks: { shelf: "rarebooksCase", door: "rarebooksDoor" },
  annex: { shelf: "annexStorage", door: "annexHatch" },
  sorting: { shelf: "sortingCage", door: "sortingDoor" },
  greenhouse: { shelf: "greenhousePlanter", door: "greenhouseDoor" },
  belltower: { shelf: "belltowerBeam", door: "belltowerDoor" },
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
  // The Bell Tower's bell stands on its own 2×2 block of shelf cells: drawn by drawBell, not here.
  const bellAt = BOARDS[world.hud.map].bell;
  const underBell = (c: number, r: number) => Boolean(bellAt && ready(art.bellFrame) && c - bellAt[0] >= 0 && c - bellAt[0] <= 1 && r - bellAt[1] >= 0 && r - bellAt[1] <= 1);
  for (const [c, r] of spots) {
    if (underBell(c, r)) continue;
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
  geese: { aim: false, w: 46, h: 54 },
  pamphlet: { aim: false, w: 52, h: 54 },
  driver: { aim: false, w: 38, h: 56 },
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
/** Act three: the stone melon is a little squat and heavy, the gall small, the borrower a lanky runner. Then the rooms' own fruit. */
const LOOK_H = { pit: 50, gall: 34, borrower: 46, express: 48, parcel: 58, sprout: 30, squash: 58, chimer: 48, gargoyle: 56 } as const;
type Look = keyof typeof LOOK_H;

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

/** A health bar over a code-drawn fruit. */
function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hp: number) {
  const bw = r * 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - bw / 2, y - r - 10, bw, 4);
  ctx.fillStyle = "#f3e2c4";
  ctx.fillRect(x - bw / 2, y - r - 10, bw * Math.max(0, hp), 4);
}

/** Sprout stand-in: a small green melon shoot with two leaves. */
function drawSproutShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hp: number, anim: number) {
  const sway = Math.sin(anim * 5 + x * 0.1) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#4f9a3a";
  ctx.beginPath();
  ctx.arc(0, 3, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#245a1c";
  ctx.lineWidth = 1.2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(0, 3, r * 0.8, -0.4 + i * 0.4, 0.4 + i * 0.4);
    ctx.stroke();
  }
  ctx.rotate(sway);
  ctx.strokeStyle = "#8fdc6a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.4);
  ctx.lineTo(0, -r * 1.3);
  ctx.stroke();
  ctx.fillStyle = "#8fdc6a";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 4, -r * 1.3, 4.5, 2.2, side * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (hp < 0.995) hpBar(ctx, x, y, r, hp);
}

/** Gargoyle Gourd stand-in: a grey stone squash with stubby wings; it glows faintly while awake. */
function drawGargoyleShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hp: number, anim: number, awake: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (awake) {
    ctx.shadowColor = "rgba(200,220,255,0.95)";
    ctx.shadowBlur = 14;
  }
  const flap = awake ? Math.sin(anim * 22) * 0.5 : 0;
  ctx.fillStyle = "#6f6f78";
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.75, -r * 0.3);
    ctx.rotate(side * (0.5 + flap));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * r * 0.75, -r * 0.45);
    ctx.lineTo(side * r * 0.55, r * 0.1);
    ctx.lineTo(side * r * 0.3, r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#8a8a92";
  ctx.beginPath();
  ctx.ellipse(0, 2, r, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(40,40,48,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(0, r * 0.7);
  ctx.moveTo(-r * 0.35, -r * 0.2);
  ctx.quadraticCurveTo(-r * 0.2, 0, -r * 0.15, r * 0.6);
  ctx.moveTo(r * 0.35, -r * 0.2);
  ctx.quadraticCurveTo(r * 0.2, 0, r * 0.15, r * 0.6);
  ctx.stroke();
  ctx.fillStyle = awake ? "#cfe0ff" : "#3a3a42";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * r * 0.3, -r * 0.15, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (hp < 0.995) hpBar(ctx, x, y, r, hp);
}

/** Room fruit marks drawn over the base fruit while their art loads. */
function drawNativeMark(ctx: CanvasRenderingContext2D, e: World["enemies"][number], anim: number) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.native === "express") {
    // A red EXPRESS stamp: a tilted ink box with two bars, no letters.
    ctx.rotate(-0.35);
    ctx.strokeStyle = "rgba(214,40,52,0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-e.r * 0.85, -e.r * 0.35, e.r * 1.7, e.r * 0.7);
    ctx.fillStyle = "rgba(214,40,52,0.85)";
    ctx.fillRect(-e.r * 0.6, -e.r * 0.15, e.r * 1.2, 2);
    ctx.fillRect(-e.r * 0.6, e.r * 0.08, e.r * 0.8, 2);
  } else if (e.native === "parcel" && e.wrapped) {
    // Brown paper over the pumpkin, tied with string.
    ctx.fillStyle = "#b08a5a";
    ctx.strokeStyle = "#6a4a28";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-e.r * 0.95, -e.r * 0.8, e.r * 1.9, e.r * 1.7, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#efe2c4";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -e.r * 0.8);
    ctx.lineTo(0, e.r * 0.9);
    ctx.moveTo(-e.r * 0.95, 0);
    ctx.lineTo(e.r * 0.95, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-4, -e.r * 0.85, 4, 2.5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(4, -e.r * 0.85, 4, 2.5, 0.4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.native === "squash") {
    // Trailing tendrils.
    ctx.strokeStyle = "#6fbf4a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * 0.6 + i * 0.9 + Math.sin(anim * 2 + i) * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.r * 0.8, Math.sin(a) * e.r * 0.8);
      ctx.quadraticCurveTo(Math.cos(a) * e.r * 1.5, Math.sin(a) * e.r * 1.1, Math.cos(a + 0.4) * e.r * 1.6, Math.sin(a + 0.4) * e.r * 1.6);
      ctx.stroke();
    }
    ctx.fillStyle = "#6fbf4a";
    ctx.beginPath();
    ctx.ellipse(e.r * 0.5, -e.r * 0.85, 5, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.native === "chimer") {
    // A little gold bell tied on, swinging.
    ctx.translate(e.r * 0.7, -e.r * 0.7);
    ctx.rotate(Math.sin(anim * 9 + e.x * 0.1) * 0.5);
    ctx.fillStyle = "#e6c36a";
    ctx.strokeStyle = "#7a5618";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-3, 4, -5, 7);
    ctx.lineTo(5, 7);
    ctx.quadraticCurveTo(3, 4, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 8, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
  look: Look | null = null,
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
