/**
 * One headless run of Melongeddon driven by a simple bot.
 * Uses the real engine (createWorld/stepWorld), so results match the game.
 */
import {
  CELL,
  GLOBAL_RANGE,
  createWorld,
  ALL_UNLOCKED,
  fittingsFor,
  stepWorld,
  towerReadout,
  type BookmarkId,
  type Difficulty,
  type HeroId,
  type ArmourId,
  type MapId,
  type NightId,
  type TowerKind,
  type UpgradeId,
  type SlipId,
  type KeeperProgress,
  SIGNATURE,
  TOWERS,
  canCopy,
  isSignature,
  bindLeg,
  besideCarpet,
  carpetLegs,
  canBeGreat,
  DRAGON,
  boardLegs,
  VAEL_LADDER,
  PASSIVE,
} from "../src/game/engine.ts";
import { makeHuman } from "./sim-human.ts";

/**
 * lean = a cautious player: mixed rotation, at most 2 new towers per wave, only between waves.
 * human = a decent regular player (sim-human.ts): reads the next waves, builds counters and combos, saves, uses the keeper's tools.
 */
export type Strategy = "melon" | "mixed" | "mixed+mods" | "lean" | "human";

export interface RunConfig {
  hero: HeroId;
  difficulty: Difficulty;
  strategy: Strategy;
  night: NightId;
  map: MapId;
  seed: number;
  /** Sir Michael's armour on the intro (default "azure"). Ignored for other keepers. */
  armour?: ArmourId;
  /** Optional build order to cycle through instead of the strategy's (any cannon types). */
  rotation?: TowerKind[];
  /** With a `rotation`, still build the keeper's own towers the way the default bots do (default false). */
  withKeeper?: boolean;
  /** Towers to build first, in this order, before the strategy's own order takes over. */
  opener?: TowerKind[];
  /** A playstyle's name, for reports (sim.ts --styles). */
  style?: string;
  /** Optional bookmark (meta perk) to equip. */
  bookmark?: BookmarkId;
  /** Optional cap on player towers (for "how few towers can win?" probes). */
  maxTowers?: number;
  /** Optional upgrade chooser; gets the offered ids, returns one. Overrides `picks`. */
  pickUpgrade?: (offer: UpgradeId[]) => UpgradeId;
  /** How the bot chooses from the upgrade shelf: "random" (default) or "smart" (see smartPick). */
  picks?: "random" | "smart";
  /** Optional keeper levels and perk picks (default: every keeper at level 1). */
  keepers?: KeeperProgress;
  /** Optional Overflow late slips. */
  slips?: SlipId[];
  /** Quackarot's bots build the Pamphlet and the Reverse Driver (default true; false for before/after comparisons). */
  quackTowers?: boolean;
  /** Cannons down before Quackarot's bots buy the Pamphlet and the Driver (default 8). */
  quackFrom?: number;
  /** Ooze's bots place the free Copycat beside their most expensive copyable tower (default true). */
  oozeCopycat?: boolean;
  /** The human bot: kinds it never builds (--avoid), and cannons down before each keeper extra (--keeper-at, e.g. bombard: 8). */
  avoid?: TowerKind[];
  keeperAt?: Partial<Record<TowerKind, number>>;
  /** Sir Michael's bots never merge Great towers (--no-great). */
  noGreat?: boolean;
  /** Tests: called between waves, after the bot has built and just before the wave starts. */
  onPrep?: (world: ReturnType<typeof createWorld>["world"], api: ReturnType<typeof createWorld>) => void;
}

export interface RunResult {
  config: RunConfig;
  won: boolean;
  /** Wave the run ended on (the night's length on a win). */
  reachedWave: number;
  /** Vaelithra: the wave each step of her ladder opened on (Unstoppered, the Underlings, the Spire). */
  vaelSteps?: number[];
  livesLeft: number;
  maxLives: number;
  /** Stacks lost on each wave played, index 0 = wave 1. */
  leaks: number[];
  towers: number;
  /** Tower kinds standing at the end of the run. */
  kinds: TowerKind[];
  simSeconds: number;
  /** Upgrades held at the end of the run. */
  upgrades: UpgradeId[];
  /** How often the status combos went off (from the run log), and the most stings / afflictions on one fruit. */
  combos: { shatters: number; thermals: number; wildfires: number; contagion: number; maxStung: number; maxAfflictions: number };
  /** The Hall of Doors: fruit that got out by each exit. */
  leaksByExit?: Partial<Record<string, number>>;
  /** Damage dealt by each tower kind still standing at the end. */
  damageBy: Partial<Record<TowerKind, number>>;
  /** Who hurts what: each kind's damage by fruit kind ("corn"), by the armour the fruit wore ("~shell"), and shells it cracked ("#cracks"). */
  vsBy?: Partial<Record<TowerKind, Record<string, number>>>;
  /** Fruit popped by each tower kind still standing at the end. */
  popsBy: Partial<Record<TowerKind, number>>;
  /** Seeds (and Sir Michael's Hoard) spent on each kind: building it, its back-room mods, Great merges, Roost feeding. */
  spentBy: Partial<Record<TowerKind, number>>;
  /** How many of each kind the bot built. */
  builtBy: Partial<Record<TowerKind, number>>;
  /** The human bot only: why it built what it built ("core", "lamp", "shells ahead", "keeper", "back room"...), counted. */
  tactics?: Record<string, number>;
}

const DT = 1 / 60;
const MAX_SIM_SECONDS = 60 * 60 * 3;
const BUILD_EVERY = 1; // seconds between bot build checks during combat
const ROTATION: TowerKind[] = ["melon", "mortar", "melon", "freeze", "fire", "still"];

/** Small seeded PRNG so runs are repeatable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A thoughtful player's shelf pick: score each card by what it does for the board standing now.
 * Juicy Explosions first, then what makes puddles worse to stand in (Sticky Pulp,
 * Distilled Batch), then extra hits; a cannon's own upgrade is worth more the more of it there are;
 * money only early; melon-only upgrades only with melons out. Juicy, Splatter and Electric skip
 * the melon cannon, so they count only the other cannons. The base values come from the random
 * bots' runs (sim-results/final10), where Juicy first won 81% of Normal and Hard runs and Rapid first 48%.
 */
export function smartPick(offer: UpgradeId[], owned: UpgradeId[], board: TowerKind[], wave: number): UpgradeId {
  const count = (k: TowerKind) => board.filter((b) => b === k).length;
  const cannons = board.filter((k) => k === "melon" || k === "mortar" || k === "fire" || k === "freeze").length;
  // Juicy, Splatter and Electric never go off from a melon cannon.
  const effectCannons = cannons - count("melon");
  const effects = (full: number) => (board.length && effectCannons === 0 ? 2 : full);
  const puddles = owned.includes("vial") || owned.includes("distill") || count("still") > 0;
  const own: Partial<Record<UpgradeId, TowerKind>> = { barbed: "ballista", footnotes: "reader", stinging: "hive", blot: "ink", interest: "compost" };
  const score = (id: UpgradeId): number => {
    const kind = own[id];
    if (kind) return 3 + 2 * count(kind);
    switch (id) {
      case "juicy": return effects(10);
      case "sticky": return puddles ? 9.5 : 5;
      case "distill": return 9;
      case "electric": return effects(8);
      case "rapid": return 4 + Math.min(4, cannons / 3);
      case "caliber": return 6;
      case "splatter": return effects(6.5);
      case "lamp": return 5;
      case "bounce": return 3 + Math.min(5, count("melon") / 2);
      case "fines": return wave <= 3 ? 5.5 : 3;
      case "seeds": return wave <= 3 ? 4 : 2.5;
      case "vial": return 4;
      default: return 1;
    }
  };
  return offer.reduce((best, id) => (score(id) > score(best) ? id : best), offer[0]);
}

export function simulateRun(config: RunConfig): RunResult {
  const realRandom = Math.random;
  const rng = mulberry32(config.seed * 7919 + config.hero.length * 31 + config.difficulty.length);
  Math.random = rng; // engine uses Math.random for mod rolls and particles
  try {
    return play(config, rng);
  } finally {
    Math.random = realRandom;
  }
}

function play(config: RunConfig, rng: () => number): RunResult {
  // Everything unlocked so any map can be chosen; bookmarks only apply when one is set.
  // Trick cannons normally open with keeper levels; the bots may build any of them.
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: config.keepers, allTricks: true, siegeOpen: true });
  const { world } = api;

  api.openSetup();
  api.setDifficulty(config.difficulty);
  if (config.night === "overflow") {
    api.chooseNight("overflow");
    for (const id of config.slips ?? []) api.toggleSlip(id);
  } else {
    api.chooseNight(config.night);
    api.chooseMap(config.map);
  }
  if (config.bookmark) api.setBookmark(config.bookmark);
  api.chooseHero(config.hero);
  // The bots may wear any armour (they play with every tower open, so the level check is skipped too).
  if (config.hero === "michael") api.pickOath(config.armour ?? "azure");
  else api.beginNight();

  // Sample points along the carpet, used to score tower spots by coverage. A board with doors: every open piece
  // of carpet, each once (worked out again when a door opens), with each door's own samples kept apart.
  const sampleLine = (pts: Array<{ x: number; y: number }>) => {
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d < len; d += 6) out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
    }
    return out;
  };
  let samples: Array<{ x: number; y: number }> = [];
  let doorSamples: Array<Array<{ x: number; y: number }>> = [];
  let sampledFor: unknown = null;
  const resample = () => {
    if (sampledFor === world.segments) return;
    sampledFor = world.segments;
    samples = world.segments.flatMap(sampleLine);
    doorSamples = world.doors.filter((d) => d.open).map((d) => sampleLine(d.seg));
  };
  resample();

  let placed = 0;
  const spentBy: Partial<Record<TowerKind, number>> = {};
  const builtBy: Partial<Record<TowerKind, number>> = {};
  const purse = () => world.hud.seeds + Math.floor(world.hud.hoard ?? 0);
  const spend = (kind: TowerKind, before: number) => {
    const d = before - purse();
    if (d > 0) spentBy[kind] = (spentBy[kind] ?? 0) + d;
  };
  let builds = 0; // every tower the bot has put down, for the opener
  const order = config.rotation ?? (config.strategy === "melon" ? ["melon" as TowerKind] : ROTATION);
  // Bots that mix cannons build the keeper's signature tower as their third cannon (once).
  const keeperOn = config.strategy !== "melon" && (!config.rotation || config.withKeeper === true);
  const signature = config.hero ? SIGNATURE[config.hero] : null;
  const nextKind = (): TowerKind => {
    if (config.opener && builds < config.opener.length) return config.opener[builds];
    const own = signature && keeperOn && placed >= 2 && !world.towers.some((t) => t.kind === signature);
    if (own) return signature!;
    // Sir Michael builds big: the Dragon's Roost early (it grows all night), then the Dragon Gate once
    // eight cannons are down. His Hoard pays for most of both.
    if (config.hero === "michael" && keeperOn) {
      if (placed >= 3 && !world.towers.some((t) => t.kind === "bombard")) return "bombard";
      if (placed >= 8 && !world.towers.some((t) => t.kind === "gourdgate")) return "gourdgate";
    }
    // Quackarot: once eight cannons are down, a Pamphlet beside the longest straight near the door, then a Driver near the door.
    if (config.hero === "quack" && config.quackTowers !== false && keeperOn && placed >= (config.quackFrom ?? 8)) {
      const extra = (["pamphlet", "driver"] as TowerKind[]).find((k) => !world.towers.some((t) => t.kind === k));
      if (extra) return extra;
    }
    // Ooze: once the Mimic Chest is down, the free Copycat goes beside the priciest tower it can copy.
    if (config.hero === "ooze" && config.oozeCopycat !== false && keeperOn && world.towers.some((t) => t.kind === "mimic") && !world.towers.some((t) => t.kind === "copycat") && copySpot())
      return "copycat";
    // Vaelithra: each of her later towers as soon as her ladder opens it.
    if (config.hero === "vael" && keeperOn) {
      const ready = VAEL_LADDER.slice(0, world.hud.vaelOpen).find((k) => !world.towers.some((t) => t.kind === k));
      if (ready) return ready;
    }
    // Keeper towers are one of each: once one is down, the rotation moves past it.
    for (let i = 0; i < order.length; i++) {
      const kind = order[(placed + i) % order.length];
      if (!isSignature(kind) || !world.towers.some((t) => t.kind === kind)) return kind;
    }
    return "melon";
  };

  /** An open tile right beside the most expensive tower the Copycat can copy (the newest on a tie). */
  const copySpot = () => {
    const sources = world.towers.filter((t) => canCopy(t.kind)).sort((a, b) => TOWERS[b.kind].cost - TOWERS[a.kind].cost || b.id - a.id);
    for (const s of sources)
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = s.c + a;
        const r = s.r + b;
        if (c < 0 || r < 0 || c >= world.cols || r >= world.rows) continue;
        if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`) || taken(c, r)) continue;
        return { c, r };
      }
    return null;
  };

  const bestCell = (range: number, kind: TowerKind) => {
    if (kind === "copycat") return copySpot();
    if (kind === "pamphlet" || kind === "driver") {
      // Pamphlet: beside the longest straight (the later one on a tie, so nearer the door). Driver: the open tile nearest the door.
      const legs = boardLegs(world);
      let want = 0;
      legs.forEach((l, i) => {
        if (l.tiles.length >= legs[want].tiles.length) want = i;
      });
      const door = world.points[world.points.length - 1];
      let pick: { c: number; r: number } | null = null;
      let near = Infinity;
      for (let c = 0; c < world.cols; c++)
        for (let r = 0; r < world.rows; r++) {
          if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`) || taken(c, r)) continue;
          if (kind === "pamphlet" && bindLeg(legs, c, r) !== want) continue;
          const d = Math.hypot(c * CELL + CELL / 2 - door.x, r * CELL + CELL / 2 - door.y);
          if (d < near) {
            near = d;
            pick = { c, r };
          }
        }
      return pick;
    }
    resample();
    // Whole-board cannons score spots like a normal cannon would; anywhere works for them.
    if (range >= GLOBAL_RANGE) range = 132;
    let best: { c: number; r: number } | null = null;
    let bestScore = 0;
    if (kind === "lantern" || kind === "compost" || kind === "lectern") {
      // Lamp: next to the most cannons. Compost: the spot least useful for shooting.
      let pick: { c: number; r: number } | null = null;
      let score = -Infinity;
      for (let c = 0; c < world.cols; c++)
        for (let r = 0; r < world.rows; r++) {
          if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`) || taken(c, r)) continue;
          const x = c * CELL + CELL / 2;
          const y = r * CELL + CELL / 2;
          let v = 0;
          if (kind === "lantern" || kind === "lectern") {
            for (const t of world.towers) if (t.kind !== "lantern" && t.kind !== "compost" && (t.x - x) ** 2 + (t.y - y) ** 2 <= 72 * 72) v++;
          } else {
            for (const p of samples) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= 132 * 132) v--;
          }
          if (v > score) {
            score = v;
            pick = { c, r };
          }
        }
      // A lamp with no cannons to light yet just goes on the best shooting spot.
      if (kind === "compost" || score > 0) return pick;
    }
    const scores = new Map<string, number>();
    // A board with doors: open where the carpets meet (the best spot, as a player would), then cover each open
    // door before stacking it. While a door's own carpet has no shooting tower in reach, spots are scored on that
    // door's carpet only.
    const shooters = world.towers.filter((t) => !PASSIVE.includes(t.kind));
    const bare = shooters.length < 2 ? undefined : doorSamples.find((line) => !line.some((p) => shooters.some((t) => (t.x - p.x) ** 2 + (t.y - p.y) ** 2 <= 132 * 132)));
    const pool = bare ?? samples;
    for (let c = 0; c < world.cols; c++) {
      for (let r = 0; r < world.rows; r++) {
        if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`)) continue;
        if (taken(c, r)) continue;
        if ((kind === "gourdgate" || kind === "desk") && !besideCarpet(world, c, r)) continue;
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2;
        let score = 0;
        for (const s of pool) if ((s.x - x) ** 2 + (s.y - y) ** 2 <= range * range) score++;
        scores.set(`${c},${r}`, score);
        if (score > bestScore) {
          bestScore = score;
          best = { c, r };
        }
      }
    }
    // Sir Michael: a second tower of a kind goes right beside the first if the spot is nearly as good, so it can be made Great.
    if (config.hero === "michael" && canBeGreat(kind)) {
      let pair: { c: number; r: number } | null = null;
      let pairScore = bestScore * 0.75;
      for (const t of world.towers) {
        if (t.kind !== kind || t.great) continue;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const s = scores.get(`${t.c + a},${t.r + b}`) ?? -1;
          if (s >= pairScore) {
            pairScore = s;
            pair = { c: t.c + a, r: t.r + b };
          }
        }
      }
      if (pair) return pair;
    }
    return best;
  };

  /** A tile with a tower on it (a Great tower covers two; an Unstoppered's spills count too). */
  const taken = (c: number, r: number) =>
    world.towers.some((t) => (t.c === c && t.r === r) || (t.great?.c === c && t.great?.r === r) || (t.spill?.some((x) => x.c === c && x.r === r) ?? false));

  /** Sir Michael between builds: merge a matching pair into a Great tower, and feed the Roost, when he can afford it. */
  const dragonChores = () => {
    if (config.hero !== "michael" || !keeperOn) return;
    for (const t of config.noGreat ? [] : world.towers) {
      if (t.great || !canBeGreat(t.kind)) continue;
      const offer = api.greatOffer(t.id);
      if (offer.partner == null) continue;
      const fromSeeds = offer.cost - Math.min(Math.floor(world.hud.hoard), offer.cost);
      if (world.hud.seeds - fromSeeds < world.hud.towerCost * 0.5) continue;
      world.hud.selected = t.id;
      const before = purse();
      api.makeGreat();
      spend(t.kind, before);
      api.dismissSelection();
      break;
    }
    const roost = world.towers.find((t) => t.kind === "bombard");
    if (roost && world.hud.phase === "prep" && !world.hud.roostFed && Math.floor(world.hud.hoard) >= DRAGON.roostFeed && api.roostOf(roost.id)?.next != null) {
      world.hud.selected = roost.id;
      const before = purse();
      api.feedRoost();
      spend("bombard", before);
      api.dismissSelection();
    }
  };

  const click = (c: number, r: number) => api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");

  /** Vaelithra's plan: finish the kinds closest to fully upgraded, so her ladder opens her towers. */
  const tryLadder = () => {
    if (config.hero === "vael" && world.hud.phase === "prep" && world.hud.vaelOpen < VAEL_LADDER.length) {
      let pick: { kind: TowerKind; left: number; count: number } | null = null;
      for (const kind of new Set(world.towers.map((t) => t.kind))) {
        if (kind === "copycat") continue;
        const left = fittingsFor(kind).filter((m) => !(world.hud.fitted[kind] ?? []).includes(m.id)).length;
        if (!left) continue;
        const count = world.towers.filter((t) => t.kind === kind).length;
        if (!pick || left < pick.left || (left === pick.left && count > pick.count)) pick = { kind, left, count };
      }
      // Only with the next tower's seeds still in hand: the ladder shouldn't cost the board its defence.
      if (pick && world.hud.seeds >= api.shopPriceFor(pick.kind) + world.hud.towerCost) {
        const before = purse();
        api.openShop(pick.kind);
        const left = fittingsFor(pick.kind).filter((m) => !(world.hud.fitted[pick!.kind] ?? []).includes(m.id));
        api.pickMod(left[0].id);
        api.closeShop();
        spend(pick.kind, before);
        return true;
      }
    }
    return false;
  };
  const tryMod = () => {
    if (config.strategy !== "mixed+mods" || world.hud.phase !== "prep") return false;
    // An upgrade reaches every tower of its kind, so it's worth most on the kind there are most of.
    // Buy for a kind with at least two on the floor, when the price per tower is under 60% of a new
    // tower and the upgrade doesn't eat the seeds for the next one.
    let best: { kind: TowerKind; price: number; count: number } | null = null;
    for (const kind of new Set(world.towers.map((t) => t.kind))) {
      const left = fittingsFor(kind).filter((m) => !(world.hud.fitted[kind] ?? []).includes(m.id));
      if (!left.length) continue;
      const count = world.towers.filter((t) => t.kind === kind).length;
      if (count < 2) continue;
      const price = api.shopPriceFor(kind);
      if (!best || price / count < best.price / best.count) best = { kind, price, count };
    }
    if (!best || world.hud.seeds < best.price || best.price / best.count > world.hud.towerCost * 0.6) return false;
    const before = purse();
    api.openShop(best.kind);
    const left = fittingsFor(best.kind).filter((m) => !(world.hud.fitted[best.kind] ?? []).includes(m.id));
    api.pickMod(left[Math.floor(rng() * left.length)].id);
    api.closeShop();
    spend(best.kind, before);
    return true;
  };

  // The human bot decides for itself (sim-human.ts); this file still drives the phases and counts the results.
  const human =
    config.strategy === "human"
      ? makeHuman({
          api,
          world,
          rng,
          taken,
          spend,
          purse,
          kitCell: (range, kind) => bestCell(range, kind),
          dragonChores,
          avoid: config.avoid,
          keeperAt: config.keeperAt,
          noGreat: config.noGreat,
          opener: config.opener,
          maxTowers: config.maxTowers,
          place: (kind, spot) => {
            const before = world.towers.length;
            const paid = purse();
            click(spot.c, spot.r);
            if (world.towers.length === before) return false;
            spend(kind, paid);
            builtBy[kind] = (builtBy[kind] ?? 0) + 1;
            builds++;
            return true;
          },
        })
      : null;

  const build = () => {
    if (human) return human.build();
    const lean = config.strategy === "lean";
    if (lean && world.hud.phase !== "prep") return;
    const limit = lean ? 2 : 40;
    dragonChores();
    // Her ladder's upgrades don't use up a build (the cautious bot only builds twice a wave).
    for (let n = 0; n < 12 && tryLadder(); n++);
    for (let guard = 0; guard < limit; guard++) {
      if (tryMod()) continue;
      const kind = nextKind();
      api.chooseBuild(kind);
      if (world.hud.seeds < world.hud.towerCost) break;
      if (config.maxTowers != null && world.towers.length >= config.maxTowers) break;
      const range = towerReadout(world.hud.hero, kind, [], world.hud.upgrades).range;
      const spot = bestCell(range, kind);
      if (!spot) break;
      const before = world.towers.length;
      api.dismissSelection(); // a click with a tower selected only closes it
      const paid = purse();
      click(spot.c, spot.r);
      if (world.towers.length === before) break;
      spend(kind, paid);
      builtBy[kind] = (builtBy[kind] ?? 0) + 1;
      builds++;
      if (kind !== signature && kind !== "copycat" && kind !== "bombard" && kind !== "gourdgate" && kind !== "pamphlet" && kind !== "driver") placed++;
    }
    api.dismissSelection();
  };

  const leaks: number[] = [];
  /** Vaelithra: the wave each step of her ladder opened on. */
  const vaelSteps: number[] = [];
  let t = 0;
  let sinceBuild = 0;
  let prevLives = world.hud.lives;

  while (t < MAX_SIM_SECONDS) {
    const phase = world.hud.phase;
    if (phase === "victory" || phase === "defeat") break;
    if (phase === "prep") {
      build();
      config.onPrep?.(world, api);
      // The Hall of Doors' signpost: shut the Kitchens while seeds are short (a leak there costs seeds), else the
      // Reading Room. The sign itself skips the Restricted Section on a boss wave.
      if (world.exits.length) {
        const want = world.hud.seeds < 100 ? "kitchens" : "reading";
        for (let i = 0; i < 4 && world.hud.shutExit !== want; i++) api.turnSign();
      }
      api.startWave();
    } else if (phase === "consequence") {
      api.startWave();
    } else if (phase === "upgrade") {
      const ids = world.hud.offer.map((u) => u.id);
      api.pickUpgrade(
        config.pickUpgrade
          ? config.pickUpgrade(ids)
          : config.picks === "smart" || human
          ? smartPick(ids, world.hud.upgrades, world.towers.map((x) => x.kind), world.hud.wave)
          : ids[Math.floor(rng() * ids.length)],
      );
    } else if (phase === "combat") {
      const w = world.hud.wave - 1;
      while (leaks.length <= w) leaks.push(0);
      prevLives = world.hud.lives;
      stepWorld(world, DT);
      while (vaelSteps.length < world.hud.vaelOpen) vaelSteps.push(world.hud.wave);
      t += DT;
      if (world.hud.lives < prevLives) leaks[w] += prevLives - world.hud.lives;
      sinceBuild += DT;
      if (sinceBuild >= BUILD_EVERY && world.hud.phase === "combat") {
        sinceBuild = 0;
        build();
      }
      continue;
    } else {
      throw new Error(`Bot stuck in phase ${phase}`);
    }
    if (world.hud.phase === phase && phase !== "prep") {
      throw new Error(`Bot could not leave phase ${phase}`);
    }
  }

  const won = world.hud.phase === "victory";
  return {
    config,
    won,
    reachedWave: won ? world.hud.waveCount : world.hud.wave,
    vaelSteps,
    livesLeft: world.hud.lives,
    maxLives: world.hud.maxLives,
    leaks,
    towers: world.towers.length,
    kinds: [...new Set(world.towers.map((x) => x.kind))],
    simSeconds: Math.round(t),
    upgrades: [...world.hud.upgrades],
    combos: {
      shatters: world.runLog.shatters,
      thermals: world.runLog.thermals,
      wildfires: world.runLog.wildfires,
      contagion: world.runLog.contagion,
      maxStung: world.runLog.maxStung,
      maxAfflictions: world.runLog.maxAfflictions,
    },
    leaksByExit: { ...world.runLog.leaksByExit },
    vsBy: world.towers.reduce<Partial<Record<TowerKind, Record<string, number>>>>((acc, x) => {
      const vs = api.tallyOf(x.id)?.vs ?? {};
      const mine = (acc[x.kind] ??= {});
      for (const [key, v] of Object.entries(vs)) mine[key] = Math.round((mine[key] ?? 0) + v);
      return acc;
    }, {}),
    damageBy: world.towers.reduce<Partial<Record<TowerKind, number>>>((acc, x) => {
      acc[x.kind] = Math.round((acc[x.kind] ?? 0) + (api.tallyOf(x.id)?.dmg ?? 0));
      return acc;
    }, {}),
    popsBy: world.towers.reduce<Partial<Record<TowerKind, number>>>((acc, x) => {
      acc[x.kind] = (acc[x.kind] ?? 0) + (api.tallyOf(x.id)?.pops ?? 0);
      return acc;
    }, {}),
    spentBy,
    builtBy,
    ...(human ? { tactics: human.why } : {}),
  };
}
