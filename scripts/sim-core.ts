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
  type OathId,
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
} from "../src/game/engine.ts";

/** lean = a cautious player: mixed rotation, at most 2 new towers per wave, only between waves. */
export type Strategy = "melon" | "mixed" | "mixed+mods" | "lean";

export interface RunConfig {
  hero: HeroId;
  difficulty: Difficulty;
  strategy: Strategy;
  night: NightId;
  map: MapId;
  seed: number;
  /** Sir Michael's oath on the intro (default "sling"). Ignored for other keepers. */
  oath?: OathId;
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
}

export interface RunResult {
  config: RunConfig;
  won: boolean;
  /** Wave the run ended on (the night's length on a win). */
  reachedWave: number;
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
 * Puddles first (Juicy Explosions), then what makes puddles worse to stand in (Sticky Pulp,
 * Distilled Batch), then extra hits; a cannon's own upgrade is worth more the more of it there are;
 * money only early; melon-only upgrades only with melons out. The base values come from the random
 * bots' runs (sim-results/final10), where Juicy first won 81% of Normal and Hard runs and Rapid first 48%.
 */
export function smartPick(offer: UpgradeId[], owned: UpgradeId[], board: TowerKind[], wave: number): UpgradeId {
  const count = (k: TowerKind) => board.filter((b) => b === k).length;
  const cannons = board.filter((k) => k === "melon" || k === "mortar" || k === "fire" || k === "freeze").length;
  const puddles = owned.includes("juicy") || owned.includes("vial") || owned.includes("distill");
  const own: Partial<Record<UpgradeId, TowerKind>> = { barbed: "ballista", footnotes: "reader", stinging: "hive", blot: "ink", interest: "compost" };
  const score = (id: UpgradeId): number => {
    const kind = own[id];
    if (kind) return 3 + 2 * count(kind);
    switch (id) {
      case "juicy": return 10;
      case "sticky": return puddles ? 9.5 : 5;
      case "distill": return 9;
      case "electric": return 8;
      case "rapid": return 4 + Math.min(4, cannons / 3);
      case "caliber": return 6;
      case "splatter": return 6.5;
      case "lamp": return 5;
      case "bounce": return 2 + Math.min(4, count("melon") / 2);
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
  if (config.hero === "michael") api.pickOath(config.oath ?? "sling");
  else api.beginNight();

  // Sample points along the carpet, used to score tower spots by coverage.
  const samples: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < world.points.length - 1; i++) {
    const a = world.points[i];
    const b = world.points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 6) samples.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
  }

  let placed = 0;
  let builds = 0; // every tower the bot has put down, for the opener
  const order = config.rotation ?? (config.strategy === "melon" ? ["melon" as TowerKind] : ROTATION);
  // Bots that mix cannons build the keeper's signature tower as their third cannon (once).
  const keeperOn = config.strategy !== "melon" && (!config.rotation || config.withKeeper === true);
  const signature = config.hero ? SIGNATURE[config.hero] : null;
  const nextKind = (): TowerKind => {
    if (config.opener && builds < config.opener.length) return config.opener[builds];
    const own = signature && keeperOn && placed >= 2 && !world.towers.some((t) => t.kind === signature);
    if (own) return signature!;
    // Sir Michael's big siege towers: once eight cannons are down, the bot saves up for the Bombard,
    // then the Gourd Gate (one each), like a player would, instead of buying more small cannons.
    if (config.hero === "michael" && keeperOn && placed >= 8) {
      const big = (["bombard", "gourdgate"] as TowerKind[]).find((k) => !world.towers.some((t) => t.kind === k));
      if (big) return big;
    }
    // Quackarot: once eight cannons are down, a Pamphlet beside the longest straight near the door, then a Driver near the door.
    if (config.hero === "quack" && config.quackTowers !== false && keeperOn && placed >= (config.quackFrom ?? 8)) {
      const extra = (["pamphlet", "driver"] as TowerKind[]).find((k) => !world.towers.some((t) => t.kind === k));
      if (extra) return extra;
    }
    // Ooze: once the Mimic Chest is down, the free Copycat goes beside the priciest tower it can copy.
    if (config.hero === "ooze" && config.oozeCopycat !== false && keeperOn && world.towers.some((t) => t.kind === "mimic") && !world.towers.some((t) => t.kind === "copycat") && copySpot())
      return "copycat";
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
        if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`) || world.towers.some((t) => t.c === c && t.r === r)) continue;
        return { c, r };
      }
    return null;
  };

  const bestCell = (range: number, kind: TowerKind) => {
    if (kind === "copycat") return copySpot();
    if (kind === "pamphlet" || kind === "driver") {
      // Pamphlet: beside the longest straight (the later one on a tie, so nearer the door). Driver: the open tile nearest the door.
      const legs = carpetLegs(world.points);
      let want = 0;
      legs.forEach((l, i) => {
        if (l.tiles.length >= legs[want].tiles.length) want = i;
      });
      const door = world.points[world.points.length - 1];
      let pick: { c: number; r: number } | null = null;
      let near = Infinity;
      for (let c = 0; c < world.cols; c++)
        for (let r = 0; r < world.rows; r++) {
          if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`) || world.towers.some((t) => t.c === c && t.r === r)) continue;
          if (kind === "pamphlet" && bindLeg(legs, c, r) !== want) continue;
          const d = Math.hypot(c * CELL + CELL / 2 - door.x, r * CELL + CELL / 2 - door.y);
          if (d < near) {
            near = d;
            pick = { c, r };
          }
        }
      return pick;
    }
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
          if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`) || world.towers.some((t) => t.c === c && t.r === r)) continue;
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
    for (let c = 0; c < world.cols; c++) {
      for (let r = 0; r < world.rows; r++) {
        if (world.pathCells.has(`${c},${r}`) || world.vergeCells.has(`${c},${r}`) || world.shelfCells.has(`${c},${r}`)) continue;
        if (world.towers.some((t) => t.c === c && t.r === r)) continue;
        if ((kind === "gourdgate" || kind === "desk") && !besideCarpet(world, c, r)) continue;
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2;
        let score = 0;
        for (const s of samples) if ((s.x - x) ** 2 + (s.y - y) ** 2 <= range * range) score++;
        if (score > bestScore) {
          bestScore = score;
          best = { c, r };
        }
      }
    }
    return best;
  };

  const click = (c: number, r: number) => api.pointer(c * CELL + CELL / 2, r * CELL + CELL / 2, "down");

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
    api.openShop(best.kind);
    const left = fittingsFor(best.kind).filter((m) => !(world.hud.fitted[best.kind] ?? []).includes(m.id));
    api.pickMod(left[Math.floor(rng() * left.length)].id);
    api.closeShop();
    return true;
  };

  const build = () => {
    const lean = config.strategy === "lean";
    if (lean && world.hud.phase !== "prep") return;
    const limit = lean ? 2 : 40;
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
      click(spot.c, spot.r);
      if (world.towers.length === before) break;
      builds++;
      if (kind !== signature && kind !== "copycat" && kind !== "bombard" && kind !== "gourdgate" && kind !== "pamphlet" && kind !== "driver") placed++;
    }
    api.dismissSelection();
  };

  const leaks: number[] = [];
  let t = 0;
  let sinceBuild = 0;
  let prevLives = world.hud.lives;

  while (t < MAX_SIM_SECONDS) {
    const phase = world.hud.phase;
    if (phase === "victory" || phase === "defeat") break;
    if (phase === "prep") {
      build();
      api.startWave();
    } else if (phase === "consequence") {
      api.startWave();
    } else if (phase === "upgrade") {
      const ids = world.hud.offer.map((u) => u.id);
      api.pickUpgrade(
        config.pickUpgrade
          ? config.pickUpgrade(ids)
          : config.picks === "smart"
          ? smartPick(ids, world.hud.upgrades, world.towers.map((x) => x.kind), world.hud.wave)
          : ids[Math.floor(rng() * ids.length)],
      );
    } else if (phase === "combat") {
      const w = world.hud.wave - 1;
      while (leaks.length <= w) leaks.push(0);
      prevLives = world.hud.lives;
      stepWorld(world, DT);
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
    livesLeft: world.hud.lives,
    maxLives: world.hud.maxLives,
    leaks,
    towers: world.towers.length,
    kinds: [...new Set(world.towers.map((x) => x.kind))],
    simSeconds: Math.round(t),
    upgrades: [...world.hud.upgrades],
  };
}
