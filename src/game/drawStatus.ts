/**
 * How status effects look on the fruit and on the carpet. Drawing only: nothing here changes a rule.
 *
 * Five layers, one job each:
 *  1. the body: one coating on the sprite, for the most important effect (frozen, burning, frost, poison, ink, honey);
 *  2. particles above it: flames, bubbles, flies, steam, stars;
 *  3. the ground: a mark at its feet for anything that slows or stops it;
 *  4. pips: one chip per timed or stacking effect, with a shape as well as a colour;
 *  5. motion: how it walks (slower bob, rocking, flattened, turned round).
 *
 * `statusLook(e, world)` picks what shows (pure, tested without a canvas); the draw functions below paint it.
 */
import { COMBO } from "./rules.ts";
import type { World } from "./engine.ts";

type Enemy = World["enemies"][number];

/** Every drawing number for status looks: sizes, alphas, caps, lifetimes. */
export const STATUS_LOOK = {
  /** Off: the old marks only (for measuring the cost). */
  on: true,
  /** Cracks show in the ice for this many seconds before it breaks. */
  crackAt: 0.6,
  /** Trails (scorch, green drips, honey prints, frost) last this long on the carpet, and one is laid this often. */
  trailLife: 3,
  trailEvery: 0.3,
  maxMarks: 60,
  /** The frost star a shatter leaves, and a thermal shock's steam puff. */
  starLife: 1.5,
  steamLife: 0.9,
  /** Particles per fruit, and in all, each frame. */
  maxParticles: 6,
  maxParticlesTotal: 200,
  /** A board drawn narrower than this (CSS px) is a phone: particles halve. */
  smallWidth: 520,
  /** Under this share of health: cracks, juice, a wobble and a red health bar. */
  hurtAt: 0.25,
  maxPips: 4,
  pipR: 5,
  pipGap: 12,
  /** Walking bob by frost stacks (0, 1, 2); frozen or stopped: none. */
  frostBob: [1, 0.55, 0.3],
  /** Body coatings (alpha of the tinted sprite over the real one). */
  frostAlpha: [0, 0.3, 0.5],
  iceAlpha: 0.45,
  burnTint: 0.16,
  burnGlow: 0.5,
  /** Seconds of burning for the most char, and how many spots that is. */
  charMax: 4,
  charSpots: 6,
  poisonAlpha: [0.16, 0.36],
  inkAlpha: 0.32,
  /** Ink fades out over its last this-many seconds. */
  inkFade: 1.5,
  honeyAlpha: 0.38,
  /** A healed fruit glows this long after the last heal. */
  healGlow: 0.35,
  flatten: 0.45,
  rock: 0.16,
  wobble: 0.07,
  stretch: 0.28,
} as const;

/** One colour per effect, used on the fruit, its pips and the enemy card (matching the tower that causes it). */
export const STATUS_COLOR = {
  frost: "#9fd4f0", // the Freeze cannon's ice blue
  fire: "#ff8a3a",
  poison: "#5fd36a", // the Cauldron's green
  sting: "#e2a93a", // the Hive's amber
  worm: "#e79ab0",
  ink: "#6d80c4",
  honey: "#e8b040",
  stun: "#e6c36a",
  heal: "#8fdc6a",
} as const;

export type Body = "ice" | "burn" | "frost" | "poison" | "ink" | "honey";
export type PipShape = "snowflake" | "star" | "flame" | "drop" | "stinger" | "worm" | "blot" | "honeycomb";
export type ParticleKind = "stunstar" | "note" | "flame" | "smoke" | "bubble" | "fly" | "breath" | "inkdrip" | "wormhead" | "sweat" | "feather" | "plus" | "juice";
export type Ground = "frost" | "ripple" | "dust";
export interface Pip {
  id: "frost" | "stun" | "fire" | "poison" | "sting" | "worm" | "ink" | "honey";
  shape: PipShape;
  color: string;
  /** Stacks (1 when it has none). */
  n: number;
}
export interface StatusLook {
  body: Body | null;
  /** How strong the body look is, 0 to 1 (frost stacks, char, a fading ink mark). */
  amount: number;
  /** Small fixed marks on the body, whatever the body look is. */
  extras: {
    stingers: number;
    cracks: boolean;
    char: number;
    burrow: boolean;
    hurt: boolean;
    heal: boolean;
    medal: boolean;
    alert: boolean;
    stretch: boolean;
  };
  particles: Array<{ kind: ParticleKind; n: number }>;
  ground: Ground | null;
  pips: Pip[];
  motion: {
    /** Multiplies the walking bob. */
    bob: number;
    /** Facing back the way it came (flip): kept with Reduce motion, since it's a still look. */
    faceBack: boolean;
    rock: number;
    wobble: number;
    shiver: number;
    /** 0 to 1: squashed flat. */
    flatten: number;
    /** False with Reduce motion: particles stand still. */
    animated: boolean;
  };
}

export interface LookOptions {
  /** A phone-sized board: particles halve. */
  small?: boolean;
}

const pos = (n: number | undefined) => (n ?? 0) > 0;

/** What one enemy shows right now. */
export function statusLook(e: Enemy, world: Pick<World, "pools" | "reduced">, opts: LookOptions = {}): StatusLook {
  const stun = e.freeze > 0 && e.stunBy ? e.stunBy : null;
  const frostN = Math.floor(e.frost ?? 0);
  const ice = pos(e.iced) || frostN >= COMBO.frostMax || (e.freeze > 0 && !stun);
  const iceLeft = Math.max(e.freeze, e.iced ?? 0);
  const frost = ice ? 0 : Math.min(2, Math.max(frostN, e.chill > 0 ? 1 : 0));
  const burning = pos(e.burnT) || world.pools.some((p) => p.hot && Math.hypot(e.x - p.x, e.y - p.y) <= p.r);
  const poison = e.poison ?? 0;
  const sting = Math.min(5, e.sting ?? 0);
  const inked = pos(e.ink);
  const honey = pos(e.honeyed);
  const burrow = pos(e.worm);
  const stomped = pos(e.stomped);
  const halted = pos(e.halt);
  const puddle = world.pools.some((p) => !p.hot && !p.toxic && !p.honey && Math.hypot(e.x - p.x, e.y - p.y) < p.r);
  const back = pos(e.driven) || pos(e.panic);
  const hurt = e.hp > 0 && e.hp / e.maxHp < STATUS_LOOK.hurtAt;
  const char = Math.min(1, (e.charred ?? 0) / STATUS_LOOK.charMax);

  let body: Body | null = null;
  let amount = 0;
  if (ice) {
    body = "ice";
    amount = 1;
  } else if (burning) {
    body = "burn";
    amount = char;
  } else if (frost > 0) {
    body = "frost";
    amount = frost / 2;
  } else if (poison > 0) {
    body = "poison";
    amount = Math.min(1, poison / 3);
  } else if (inked) {
    body = "ink";
    amount = Math.min(1, (e.ink ?? 0) / STATUS_LOOK.inkFade);
  } else if (honey) {
    body = "honey";
    amount = 1;
  }

  // Particles, most important first, capped per fruit (halved on a phone).
  const want: Array<{ kind: ParticleKind; n: number }> = [];
  if (stun) want.push({ kind: stun === "organ" ? "note" : "stunstar", n: 3 });
  if (burning) want.push({ kind: "flame", n: e.r > 18 ? 3 : 2 }, { kind: "smoke", n: 1 });
  if (poison > 0) want.push({ kind: "bubble", n: Math.min(5, poison) });
  if (sting > 0) want.push({ kind: "fly", n: sting >= 3 ? 2 : 1 });
  else if (honey) want.push({ kind: "fly", n: 1 });
  if (frost > 0) want.push({ kind: "breath", n: 1 });
  if (inked) want.push({ kind: "inkdrip", n: 1 });
  if (burrow) want.push({ kind: "wormhead", n: 1 });
  if (back) want.push({ kind: "sweat", n: 1 });
  if (pos(e.panic) && e.kind === "goose") want.push({ kind: "feather", n: 2 });
  if (pos(e.healT)) want.push({ kind: "plus", n: 2 });
  if (hurt) want.push({ kind: "juice", n: 1 });
  const cap = opts.small ? Math.floor(STATUS_LOOK.maxParticles / 2) : STATUS_LOOK.maxParticles;
  const particles: StatusLook["particles"] = [];
  let used = 0;
  for (const p of want) {
    const n = Math.min(opts.small ? Math.ceil(p.n / 2) : p.n, cap - used);
    if (n <= 0) break;
    particles.push({ kind: p.kind, n });
    used += n;
  }

  const ground: Ground | null = ice || frost > 0 ? "frost" : stomped ? "dust" : puddle ? "ripple" : null;

  // Pips: every timed or stacking effect, most important first, four at most.
  const pips: Pip[] = [];
  if (ice || frostN > 0) pips.push({ id: "frost", shape: "snowflake", color: STATUS_COLOR.frost, n: ice ? COMBO.frostMax : frostN });
  if (stun) pips.push({ id: "stun", shape: "star", color: STATUS_COLOR.stun, n: 1 });
  if (burning) pips.push({ id: "fire", shape: "flame", color: STATUS_COLOR.fire, n: 1 });
  if (poison > 0) pips.push({ id: "poison", shape: "drop", color: STATUS_COLOR.poison, n: poison });
  if (sting > 0) pips.push({ id: "sting", shape: "stinger", color: STATUS_COLOR.sting, n: e.sting ?? 0 });
  if (burrow) pips.push({ id: "worm", shape: "worm", color: STATUS_COLOR.worm, n: 1 });
  if (inked) pips.push({ id: "ink", shape: "blot", color: STATUS_COLOR.ink, n: 1 });
  if (honey) pips.push({ id: "honey", shape: "honeycomb", color: STATUS_COLOR.honey, n: 1 });

  const still = ice || Boolean(stun) || stomped || halted;
  const moving = !world.reduced;
  return {
    body,
    amount,
    extras: {
      stingers: sting,
      cracks: ice && iceLeft > 0 && iceLeft <= STATUS_LOOK.crackAt,
      char: burning || char > 0 ? char : 0,
      burrow,
      hurt,
      heal: pos(e.healT),
      medal: Boolean(e.mittened),
      alert: halted && !pos(e.brawl),
      stretch: pos(e.rallied),
    },
    particles,
    ground,
    pips: pips.slice(0, STATUS_LOOK.maxPips),
    motion: {
      bob: !moving || still ? 0 : (STATUS_LOOK.frostBob[frost] ?? 1),
      faceBack: back,
      rock: moving && stun ? STATUS_LOOK.rock : 0,
      wobble: moving && hurt && !still ? STATUS_LOOK.wobble : 0,
      shiver: moving && ice && iceLeft <= STATUS_LOOK.crackAt ? 1 : 0,
      flatten: stomped ? STATUS_LOOK.flatten * Math.min(1, (e.stomped ?? 0) / 0.15) : 0,
      animated: moving,
    },
  };
}

/** The colour an enemy-card "Right now" line is drawn in (matching its pip), or null for a plain one. */
export function effectColor(text: string): string | null {
  if (/^(Frozen|Frost|Chilled)/.test(text)) return STATUS_COLOR.frost;
  if (/^(Burning|On fire|Flaring)/.test(text)) return STATUS_COLOR.fire;
  if (/^Poisoned/.test(text)) return STATUS_COLOR.poison;
  if (/^Stung/.test(text)) return STATUS_COLOR.sting;
  if (/^Bookworm/.test(text)) return STATUS_COLOR.worm;
  if (/^Inked/.test(text)) return STATUS_COLOR.ink;
  if (/^Honeyed/.test(text)) return STATUS_COLOR.honey;
  if (/^(Stunned|Pinned|Stopped)/.test(text)) return STATUS_COLOR.stun;
  if (/^Healing/.test(text)) return STATUS_COLOR.heal;
  return null;
}

/** A health bar's fill: red once badly hurt, gold for a boss, parchment otherwise. */
export function barFill(hp: number, boss: boolean) {
  return hp < STATUS_LOOK.hurtAt ? "#e2454f" : boss ? "#e6c36a" : "#f3e2c4";
}

// ── Drawing ─────────────────────────────────────────────────────────────────

let particlesLeft: number = STATUS_LOOK.maxParticlesTotal;
let smallBoard = false;

/** Call once per frame before the enemies: resets the particle budget and checks for a phone-sized board. */
export function beginStatusFrame(ctx: CanvasRenderingContext2D): LookOptions {
  particlesLeft = STATUS_LOOK.maxParticlesTotal;
  const canvas = ctx.canvas as HTMLCanvasElement | undefined;
  smallBoard = Boolean(canvas && typeof canvas.clientWidth === "number" && canvas.clientWidth > 0 && canvas.clientWidth < STATUS_LOOK.smallWidth);
  return { small: smallBoard };
}

/** A small fixed pseudo-random number in [0, 1) for this enemy and slot, so marks don't jump between frames. */
const seed = (id: number, k: number) => {
  const s = Math.sin(id * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const TINT: Record<Body, string> = {
  ice: "#d6eef9",
  frost: "#a9d8f2",
  burn: "#ff8a3a",
  poison: "#5fd36a",
  ink: "#1d2640",
  honey: "#e8a830",
};

const tintCache = new WeakMap<CanvasImageSource, Map<Body, HTMLCanvasElement | OffscreenCanvas>>();

/** The sprite filled with a body look's colour, made once per sprite and look and then reused. */
export function tintedSprite(img: HTMLImageElement, body: Body): HTMLCanvasElement | OffscreenCanvas | null {
  let byBody = tintCache.get(img);
  if (!byBody) {
    byBody = new Map();
    tintCache.set(img, byBody);
  }
  const hit = byBody.get(body);
  if (hit) return hit;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  // Small is plenty for a tint: a fruit is drawn well under 128 px tall.
  const k = Math.min(1, 160 / h);
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  // A plain canvas, not an OffscreenCanvas: Chrome draws an OffscreenCanvas onto the board about 60 times slower.
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
  } else if (typeof OffscreenCanvas !== "undefined") canvas = new OffscreenCanvas(cw, ch);
  else return null;
  const c = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!c) return null;
  c.drawImage(img, 0, 0, cw, ch);
  c.globalCompositeOperation = "source-atop";
  c.fillStyle = TINT[body];
  c.fillRect(0, 0, cw, ch);
  byBody.set(body, canvas);
  return canvas;
}

/** How much of the tinted sprite to lay over a painted one this frame (0: none). */
export function bodyTintAlpha(look: StatusLook, anim: number): number {
  switch (look.body) {
    case "ice":
      return STATUS_LOOK.iceAlpha;
    case "frost":
      return STATUS_LOOK.frostAlpha[Math.round(look.amount * 2)] ?? 0;
    case "burn":
      return STATUS_LOOK.burnTint;
    case "poison": {
      const [lo, hi] = STATUS_LOOK.poisonAlpha;
      const pulse = look.motion.animated ? 0.5 + Math.sin(anim * 4) * 0.5 : 0.5;
      return (lo + (hi - lo) * pulse) * (0.6 + look.amount * 0.4);
    }
    case "ink":
      return STATUS_LOOK.inkAlpha * look.amount;
    case "honey":
      return STATUS_LOOK.honeyAlpha;
    default:
      return 0;
  }
}

/** The marks fruit leave on the carpet: scorch, green drips, honey prints, frost patches, shatter stars, steam. */
export function drawStatusMarks(ctx: CanvasRenderingContext2D, world: World) {
  for (const m of world.marks) {
    const k = Math.max(0, m.life / m.max);
    const fade = Math.min(1, k * 2.5);
    ctx.save();
    ctx.translate(m.x, m.y);
    if (m.kind === "scorch") {
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = "#2a1610";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 + m.seed * 3, 4 + m.seed * 2, m.seed * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35 * fade;
      ctx.fillStyle = "#ff8a3a";
      if (k > 0.75) {
        ctx.beginPath();
        ctx.arc(1, -1, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (m.kind === "drip") {
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillStyle = STATUS_COLOR.poison;
      ctx.beginPath();
      ctx.arc(0, 0, 2.6 + m.seed * 1.5, 0, Math.PI * 2);
      ctx.arc(4 + m.seed * 3, 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.kind === "print") {
      ctx.rotate(m.rot);
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillStyle = "rgba(232,168,48,0.9)";
      const side = m.seed > 0.5 ? 3 : -3;
      ctx.beginPath();
      ctx.ellipse(0, side, 4, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const dy of [-1.6, 0, 1.6]) {
        ctx.beginPath();
        ctx.arc(5, side + dy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (m.kind === "frost") {
      ctx.globalAlpha = 0.45 * fade;
      ctx.fillStyle = "#cfeaf7";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 + m.seed * 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) {
        const a = m.seed * 6 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 3.5);
        ctx.stroke();
      }
    } else if (m.kind === "star") {
      // A shatter's frost star.
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = "#e4f4fb";
      ctx.lineWidth = 2;
      const r = 16 + (1 - k) * 8;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + m.seed;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(207,234,247,0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.55, r * 0.33, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.kind === "steam") {
      // Thermal shock: a big puff of steam rising and spreading.
      const up = (1 - k) * 22;
      ctx.globalAlpha = 0.55 * k;
      ctx.fillStyle = "#eef0f2";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + m.seed * 3;
        const d = 6 + (1 - k) * 12;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, -up + Math.sin(a) * d * 0.5, 6 + (1 - k) * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** The ground layer: frost at its feet, puddle ripples, a stomp's dust ring. */
export function drawStatusGround(ctx: CanvasRenderingContext2D, e: Enemy, look: StatusLook, anim: number) {
  if (!look.ground) return;
  const r = e.r;
  const fy = e.y + r * 0.55;
  ctx.save();
  if (look.ground === "frost") {
    const big = look.body === "ice" ? 1.35 : 1 + look.amount * 0.2;
    ctx.fillStyle = "rgba(196,230,246,0.42)";
    ctx.beginPath();
    ctx.ellipse(e.x, fy, (r + 6) * big, (r * 0.45 + 2) * big, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,250,255,0.75)";
    ctx.lineWidth = 1;
    const spikes = look.body === "ice" ? 8 : 5;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + seed(e.id, i);
      const d = (r + 6) * big;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(a) * d * 0.55, fy + Math.sin(a) * d * 0.25);
      ctx.lineTo(e.x + Math.cos(a) * d * 1.05, fy + Math.sin(a) * d * 0.45);
      ctx.stroke();
    }
  } else if (look.ground === "ripple") {
    ctx.strokeStyle = "rgba(200,225,240,0.6)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
      const k = look.motion.animated ? (anim * 0.9 + i * 0.5) % 1 : 0.3 + i * 0.4;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.ellipse(e.x, fy, r * (0.5 + k * 0.9), r * (0.2 + k * 0.35), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (look.ground === "dust") {
    ctx.fillStyle = "rgba(196,170,130,0.45)";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * (r + 5), fy + Math.sin(a) * (r * 0.4 + 2), 3 + seed(e.id, i) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * The motion layer, as a transform around the fruit's feet: flattened, rocking, wobbling, shivering.
 * Call inside a save/restore, before drawing the body.
 */
export function applyStatusMotion(ctx: CanvasRenderingContext2D, e: Enemy, look: StatusLook, anim: number) {
  const m = look.motion;
  if (!m.flatten && !m.rock && !m.wobble && !m.shiver) return;
  const fx = e.x;
  const fy = e.y + e.r * 0.8;
  ctx.translate(fx + (m.shiver ? Math.sin(anim * 70 + e.id) * 0.9 : 0), fy);
  const tilt = m.rock * Math.sin(anim * 7 + e.id) + m.wobble * Math.sin(anim * 4.5 + e.id * 0.7);
  if (tilt) ctx.rotate(tilt);
  if (m.flatten) ctx.scale(1 + m.flatten * 0.5, 1 - m.flatten);
  ctx.translate(-fx, -fy);
}

/**
 * The body layer for what the sprite tint can't do (painted sprites get their tint in drawEnemy): the ice block,
 * the burning underglow and char, ink splatter, honey gloss; a code-drawn stand-in also gets its coating here.
 * Then the fixed extras: stingers, burrow bulges, hurt cracks, healing glow.
 */
export function drawStatusBody(ctx: CanvasRenderingContext2D, e: Enemy, look: StatusLook, anim: number, painted: boolean) {
  const r = e.r;
  const { x, y } = e;
  ctx.save();
  // A code-drawn stand-in has no sprite to tint: a soft coat over its round body instead.
  if (!painted && look.body && look.body !== "ice" && look.body !== "burn") {
    ctx.globalAlpha = bodyTintAlpha(look, anim);
    ctx.fillStyle = TINT[look.body];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (look.body === "frost") {
    // Frosting creeping in from the edge: a pale rim, thicker per stack, with a few specks.
    ctx.strokeStyle = `rgba(214,238,249,${0.35 + look.amount * 0.35})`;
    ctx.lineWidth = 1.5 + look.amount * 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 2 + look.amount * 4; i++) {
      const a = seed(e.id, i) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (look.body === "ice") {
    // Encased in an ice block, with a highlight and two icicles.
    const w = r * 2.35;
    const h = r * 2.4;
    const left = x - w / 2;
    const top = y - h * 0.55;
    ctx.fillStyle = "rgba(186,226,245,0.38)";
    ctx.strokeStyle = "rgba(240,250,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect?.(left, top, w, h, r * 0.35);
    if (!ctx.roundRect) ctx.rect(left, top, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + w * 0.18, top + h * 0.55);
    ctx.lineTo(left + w * 0.18, top + h * 0.18);
    ctx.lineTo(left + w * 0.42, top + h * 0.12);
    ctx.stroke();
    ctx.fillStyle = "rgba(220,242,252,0.9)";
    for (const at of [0.3, 0.72]) {
      ctx.beginPath();
      ctx.moveTo(left + w * at - 3, top + h);
      ctx.lineTo(left + w * at + 3, top + h);
      ctx.lineTo(left + w * at, top + h + r * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    if (look.extras.cracks) {
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 1.3;
      for (let c = 0; c < 3; c++) {
        let px = left + w * (0.25 + seed(e.id, c) * 0.5);
        let py = top + h * 0.1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let s = 0; s < 4; s++) {
          px += (seed(e.id, c * 7 + s) - 0.5) * r * 0.7;
          py += h * 0.2;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  } else if (look.body === "burn") {
    // Orange underglow.
    const g = ctx.createRadialGradient(x, y + r * 0.6, 1, x, y + r * 0.6, r * 1.4);
    const flick = look.motion.animated ? 0.85 + Math.sin(anim * 13 + e.id) * 0.15 : 1;
    g.addColorStop(0, `rgba(255,150,60,${STATUS_LOOK.burnGlow * flick})`);
    g.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y + r * 0.6, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
    if (!painted) {
      ctx.globalAlpha = STATUS_LOOK.burnTint;
      ctx.fillStyle = TINT.burn;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else if (look.body === "ink") {
    ctx.globalAlpha = 0.85 * look.amount;
    ctx.fillStyle = "#1d2640";
    for (let i = 0; i < 4; i++) {
      const a = seed(e.id, i + 20) * Math.PI * 2;
      const d = seed(e.id, i + 30) * r * 0.6;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y - r * 0.15 + Math.sin(a) * d, (i ? 2 : 4) + seed(e.id, i) * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (look.body === "honey") {
    // A glossy amber glaze: a shine on top and a drip.
    ctx.fillStyle = "rgba(255,236,180,0.6)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - r * 0.55, r * 0.35, r * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(232,176,64,0.9)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y - r * 0.7, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.35 + 1.5, y - r * 0.7 + 4.5, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const ex = look.extras;
  if (ex.char > 0) {
    // Char spots that build up the longer it has burned.
    ctx.fillStyle = "rgba(40,22,14,0.75)";
    const n = Math.max(1, Math.round(ex.char * STATUS_LOOK.charSpots));
    for (let i = 0; i < n; i++) {
      const a = seed(e.id, i + 40) * Math.PI * 2;
      const d = (0.2 + seed(e.id, i + 50) * 0.5) * r;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 1.5 + seed(e.id, i + 60) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (ex.burrow) {
    // Two holes and a bulge moving under the skin.
    ctx.fillStyle = "rgba(30,16,14,0.8)";
    ctx.beginPath();
    ctx.arc(x - r * 0.45, y + r * 0.1, 1.8, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y - r * 0.35, 1.5, 0, Math.PI * 2);
    ctx.fill();
    const k = look.motion.animated ? Math.sin(anim * 3 + e.id) : 0.3;
    ctx.strokeStyle = "rgba(231,154,176,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + k * r * 0.35, y + r * 0.05, r * 0.22, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  if (ex.stingers > 0) {
    // One small stinger stuck in it per stack.
    for (let i = 0; i < ex.stingers; i++) {
      const a = -Math.PI * 0.9 + (i + 0.5) * ((Math.PI * 0.8) / ex.stingers) + (seed(e.id, i + 70) - 0.5) * 0.3;
      const ix = x + Math.cos(a) * r * 0.72;
      const iy = y + Math.sin(a) * r * 0.72;
      const ox = x + Math.cos(a) * (r + 6);
      const oy = y + Math.sin(a) * (r + 6);
      ctx.strokeStyle = "rgba(20,12,8,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox, oy);
      ctx.stroke();
      ctx.strokeStyle = STATUS_COLOR.sting;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = STATUS_COLOR.sting;
      ctx.beginPath();
      ctx.arc(ox, oy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (ex.hurt) {
    ctx.strokeStyle = "rgba(40,20,20,0.7)";
    ctx.lineWidth = 1.2;
    for (let c = 0; c < 2; c++) {
      let px = x + (seed(e.id, c + 80) - 0.5) * r;
      let py = y - r * 0.6;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let s = 0; s < 3; s++) {
        px += (seed(e.id, c * 5 + s + 90) - 0.5) * r * 0.5;
        py += r * 0.3;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  if (ex.heal) {
    ctx.fillStyle = "rgba(143,220,106,0.28)";
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const d = i % 2 ? inner : outer;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

const JUICE: Record<string, string> = { pumpkin: "#e8883a", karl: "#e8883a", corn: "#e6c36a", goose: "#f4f1e8", cat: "#c89a5a" };

/** Particles above, and the fixed marks over the head: the General's medal, a "!" for standing still. */
export function drawStatusAbove(ctx: CanvasRenderingContext2D, e: Enemy, look: StatusLook, anim: number, faceLeft: boolean) {
  const r = e.r;
  const { x, y } = e;
  const t = look.motion.animated ? anim : 0.37;
  const dir = faceLeft ? -1 : 1;
  ctx.save();
  for (const p of look.particles) {
    const n = Math.min(p.n, particlesLeft);
    if (n <= 0) break;
    particlesLeft -= n;
    for (let i = 0; i < n; i++) {
      const s = seed(e.id, i + 100);
      const ph = (t * 0.8 + s + i / n) % 1;
      switch (p.kind) {
        case "flame": {
          const fx = x + (i - (n - 1) / 2) * r * 0.5;
          const base = y - r * 0.55;
          const h = r * (0.55 + 0.25 * Math.sin(t * 14 + i * 2.3 + e.id));
          ctx.fillStyle = "rgba(255,120,40,0.9)";
          ctx.beginPath();
          ctx.moveTo(fx - r * 0.2, base);
          ctx.quadraticCurveTo(fx - r * 0.18, base - h * 0.6, fx + Math.sin(t * 9 + i) * 2, base - h);
          ctx.quadraticCurveTo(fx + r * 0.18, base - h * 0.6, fx + r * 0.2, base);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255,220,110,0.9)";
          ctx.beginPath();
          ctx.ellipse(fx, base - h * 0.25, r * 0.09, h * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "smoke":
          ctx.fillStyle = `rgba(90,84,80,${0.4 * (1 - ph)})`;
          ctx.beginPath();
          ctx.arc(x + Math.sin(ph * 5 + s * 6) * 4, y - r * 1.1 - ph * r * 1.4, 2.5 + ph * 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "bubble":
          ctx.strokeStyle = `rgba(150,240,140,${0.9 * (1 - ph)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x + Math.sin(i * 2.3 + s * 6) * r * 0.6, y + r * 0.2 - ph * r * 1.6, 1.6 + s * 1.4, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "fly": {
          const a = t * 5 + i * Math.PI + s;
          const fx = x + Math.cos(a) * (r + 6);
          const fy = y - r * 0.4 + Math.sin(a) * r * 0.45;
          ctx.fillStyle = "rgba(230,240,250,0.6)";
          ctx.beginPath();
          ctx.ellipse(fx - 1.5, fy - 1.5, 1.8, 1, -0.5, 0, Math.PI * 2);
          ctx.ellipse(fx + 1.5, fy - 1.5, 1.8, 1, 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#1b1410";
          ctx.beginPath();
          ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "breath":
          ctx.fillStyle = `rgba(230,244,252,${0.55 * (1 - ph)})`;
          ctx.beginPath();
          ctx.arc(x + dir * (r * 0.9 + ph * 8), y - r * 0.2 - ph * 3, 2 + ph * 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "inkdrip":
          ctx.fillStyle = "rgba(29,38,64,0.85)";
          ctx.beginPath();
          ctx.ellipse(x + r * 0.35, y - r * 0.1 + ph * r * 0.9, 1.6, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "wormhead":
          if (ph < 0.3) {
            const a = s * Math.PI * 2;
            const wx = x + Math.cos(a) * r * 0.75;
            const wy = y + Math.sin(a) * r * 0.75;
            ctx.fillStyle = STATUS_COLOR.worm;
            ctx.beginPath();
            ctx.arc(wx, wy, 2.6 * Math.sin((ph / 0.3) * Math.PI), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#1b1014";
            ctx.beginPath();
            ctx.arc(wx + 0.8, wy - 0.6, 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case "stunstar":
        case "note": {
          const a = t * 4 + (i / n) * Math.PI * 2;
          const sx = x + Math.cos(a) * r * 0.85;
          const sy = y - r - 7 + Math.sin(a) * 3;
          if (p.kind === "stunstar") {
            ctx.fillStyle = STATUS_COLOR.stun;
            star(ctx, sx, sy, 3.6, 1.6);
            ctx.fill();
          } else {
            ctx.fillStyle = "#c9b2ec";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(i % 2 ? "♫" : "♪", sx, sy);
          }
          break;
        }
        case "sweat":
          ctx.fillStyle = `rgba(170,215,245,${0.9 * (1 - ph)})`;
          ctx.beginPath();
          ctx.ellipse(x - dir * r * 0.7, y - r * 0.6 + ph * r * 0.6, 1.4, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "feather": {
          const fx = x + Math.sin(ph * 6 + s * 5) * r * 0.8;
          const fy = y - r * 0.6 + ph * r * 1.5;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(Math.sin(ph * 8) * 0.8);
          ctx.globalAlpha = 1 - ph;
          ctx.fillStyle = "#f6f3ea";
          ctx.beginPath();
          ctx.ellipse(0, 0, 4, 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "plus":
          ctx.fillStyle = `rgba(143,220,106,${1 - ph})`;
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", x + (s - 0.5) * r * 1.4, y - r * 0.3 - ph * r * 1.2);
          break;
        case "juice":
          ctx.fillStyle = JUICE[e.kind] ?? "#e23b4a";
          ctx.globalAlpha = 1 - ph;
          ctx.beginPath();
          ctx.ellipse(x + (s - 0.5) * r * 0.6, y + r * 0.5 + ph * r * 0.5, 1.5, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
      }
    }
  }
  if (look.extras.medal) {
    // Carrying the General's bonus: a small gold medal on a red ribbon.
    const mx = x - r - 3;
    const my = y - r + 1;
    ctx.fillStyle = "#b8323d";
    ctx.beginPath();
    ctx.moveTo(mx - 3, my - 7);
    ctx.lineTo(mx + 3, my - 7);
    ctx.lineTo(mx + 1.5, my - 2);
    ctx.lineTo(mx - 1.5, my - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e6c36a";
    ctx.beginPath();
    ctx.arc(mx, my + 1, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6a20";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  if (look.extras.alert) {
    ctx.font = "800 14px 'Outfit Variable', Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(20,14,18,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeText("!", x, y - r - 12);
    ctx.fillStyle = "#f3e2c4";
    ctx.fillText("!", x, y - r - 12);
  }
  ctx.restore();
}

/** One pip's shape, centred on (x, y), in its colour. */
function pipShape(ctx: CanvasRenderingContext2D, shape: PipShape, x: number, y: number, s: number) {
  switch (shape) {
    case "snowflake":
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        ctx.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s);
        ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
      }
      ctx.stroke();
      break;
    case "star":
      star(ctx, x, y, s, s * 0.45);
      ctx.fill();
      break;
    case "flame":
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x + s, y, x, y + s);
      ctx.quadraticCurveTo(x - s, y, x, y - s);
      ctx.fill();
      break;
    case "drop":
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x + s, y + s * 0.2, x, y + s);
      ctx.quadraticCurveTo(x - s, y + s * 0.2, x, y - s);
      ctx.fill();
      break;
    case "stinger":
      ctx.beginPath();
      ctx.moveTo(x - s * 0.55, y - s * 0.6);
      ctx.lineTo(x + s * 0.55, y - s * 0.6);
      ctx.lineTo(x, y + s);
      ctx.closePath();
      ctx.fill();
      break;
    case "worm":
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.quadraticCurveTo(x - s * 0.5, y - s, x, y);
      ctx.quadraticCurveTo(x + s * 0.5, y + s, x + s, y);
      ctx.stroke();
      break;
    case "blot":
      ctx.beginPath();
      ctx.arc(x - s * 0.15, y, s * 0.7, 0, Math.PI * 2);
      ctx.arc(x + s * 0.55, y + s * 0.45, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "honeycomb":
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
        else ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
      }
      ctx.closePath();
      ctx.fill();
      break;
  }
}

/** Pips under the fruit: a shape and colour per effect, most important first, with the stack count. */
export function drawStatusPips(ctx: CanvasRenderingContext2D, e: Enemy, look: StatusLook) {
  const pips = look.pips;
  if (!pips.length) return;
  const { pipR, pipGap } = STATUS_LOOK;
  const x0 = e.x - (pips.length * pipGap) / 2;
  const y = e.y + e.r + 7;
  ctx.save();
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  pips.forEach((p, i) => {
    const x = x0 + i * pipGap + pipGap / 2;
    ctx.fillStyle = "rgba(20,14,18,0.85)";
    ctx.beginPath();
    ctx.arc(x, y, pipR + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    pipShape(ctx, p.shape, x, y, pipR - 1.3);
    if (p.n > 1) {
      ctx.fillStyle = "rgba(20,14,18,0.9)";
      ctx.beginPath();
      ctx.arc(x + pipR - 0.5, y + pipR - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f3e2c4";
      ctx.fillText(String(p.n), x + pipR - 0.5, y + pipR - 0.6);
    }
  });
  ctx.restore();
}
