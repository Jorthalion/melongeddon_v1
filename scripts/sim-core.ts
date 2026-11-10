/**
 * One headless run of Melongeddon driven by a simple bot.
 * Uses the real engine (createWorld/stepWorld), so results match the game.
 */
import {
  CELL,
  GLOBAL_RANGE,
  createWorld,
  ALL_UNLOCKED,
  WAVE_COUNT,
  backRoomPrice,
  stepWorld,
  towerReadout,
  type Alliance,
  type BookmarkId,
  type Difficulty,
  type HeroId,
  type MapId,
  type NightId,
  type TowerKind,
  type UpgradeId,
  type SlipId,
  type KeeperProgress,
  SIGNATURE,
} from "../src/game/engine.ts";

/** lean = a cautious player: mixed rotation, at most 2 new towers per wave, only between waves. */
export type Strategy = "melon" | "mixed" | "mixed+mods" | "lean";

export interface RunConfig {
  hero: HeroId;
  difficulty: Difficulty;
  strategy: Strategy;
  night: NightId;
  map: MapId;
  /** Knight choice. Midnight: picked at the door after wave 4. Overflow: how night one ended. Ignored in endless. */
  door: Exclude<Alliance, "none">;
  seed: number;
  /** Optional build order to cycle through instead of the strategy's (any cannon types). */
  rotation?: TowerKind[];
  /** Optional bookmark (meta perk) to equip. */
  bookmark?: BookmarkId;
  /** Optional cap on player towers (for "how few towers can win?" probes). */
  maxTowers?: number;
  /** Optional upgrade chooser; gets the offered ids, returns one. Default: random. */
  pickUpgrade?: (offer: UpgradeId[]) => UpgradeId;
  /** Optional keeper levels and perk picks (default: every keeper at level 1). */
  keepers?: KeeperProgress;
  /** Optional Overflow late slips. */
  slips?: SlipId[];
}

export interface RunResult {
  config: RunConfig;
  won: boolean;
  /** Wave the run ended on (WAVE_COUNT on a win). */
  reachedWave: number;
  livesLeft: number;
  maxLives: number;
  /** Stacks lost on each wave played, index 0 = wave 1. */
  leaks: number[];
  towers: number;
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
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: config.keepers });
  const { world } = api;

  api.openSetup();
  api.setDifficulty(config.difficulty);
  if (config.night === "overflow") {
    api.chooseNight("overflow");
    api.setDoor(config.door);
    for (const id of config.slips ?? []) api.toggleSlip(id);
  } else {
    api.chooseNight(config.night);
    api.chooseMap(config.map);
  }
  if (config.bookmark) api.setBookmark(config.bookmark);
  api.chooseHero(config.hero);
  api.beginNight();

  // Sample points along the carpet, used to score tower spots by coverage.
  const samples: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < world.points.length - 1; i++) {
    const a = world.points[i];
    const b = world.points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 6) samples.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
  }

  let placed = 0;
  const order = config.rotation ?? (config.strategy === "melon" ? ["melon" as TowerKind] : ROTATION);
  // Bots that mix cannons build the keeper's signature tower as their third cannon (once).
  const signature = config.hero ? SIGNATURE[config.hero] : null;
  const nextKind = (): TowerKind => {
    const own = signature && config.strategy !== "melon" && !config.rotation && placed >= 2 && !world.towers.some((t) => t.kind === signature);
    return own ? signature! : order[placed % order.length];
  };

  const bestCell = (range: number, kind: TowerKind) => {
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
          if (world.pathCells.has(`${c},${r}`) || world.towers.some((t) => t.c === c && t.r === r)) continue;
          const x = c * CELL + CELL / 2;
          const y = r * CELL + CELL / 2;
          let v = 0;
          if (kind === "lantern" || kind === "lectern") {
            for (const t of world.towers) if (!t.ally && t.kind !== "lantern" && t.kind !== "compost" && (t.x - x) ** 2 + (t.y - y) ** 2 <= 72 * 72) v++;
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
        if (world.pathCells.has(`${c},${r}`)) continue;
        if (world.towers.some((t) => t.c === c && t.r === r)) continue;
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
    const price = backRoomPrice(world.hud.hero, world.hud.shopVisits, world.hud.bookmark);
    if (world.hud.seeds < price || price >= world.hud.towerCost) return false;
    const tower = world.towers.find((t) => !t.ally && t.mods.length < 2);
    if (!tower) return false;
    if (world.hud.selected !== tower.id) click(tower.c, tower.r);
    api.openShop();
    if ((world.hud.phase as string) !== "shop") return false;
    const offer = world.hud.modOffer;
    api.pickMod(offer[Math.floor(rng() * offer.length)].id);
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
      if (config.maxTowers != null && world.towers.filter((x) => !x.ally).length >= config.maxTowers) break;
      const range = towerReadout(world.hud.hero, kind, [], world.hud.upgrades).range;
      const spot = bestCell(range, kind);
      if (!spot) break;
      const before = world.towers.length;
      click(spot.c, spot.r);
      if (world.towers.length === before) break;
      if (kind !== signature) placed++;
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
    } else if (phase === "betrayal" || phase === "consequence") {
      api.startWave();
    } else if (phase === "upgrade") {
      const ids = world.hud.offer.map((u) => u.id);
      api.pickUpgrade(config.pickUpgrade ? config.pickUpgrade(ids) : ids[Math.floor(rng() * ids.length)]);
    } else if (phase === "alliance") {
      api.chooseAlliance(config.door);
    } else if (phase === "memory") {
      api.ackMemory();
    } else if (phase === "shop") {
      api.closeShop();
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
    reachedWave: won ? WAVE_COUNT : world.hud.wave,
    livesLeft: world.hud.lives,
    maxLives: world.hud.maxLives,
    leaks,
    towers: world.towers.filter((x) => !x.ally).length,
    simSeconds: Math.round(t),
    upgrades: [...world.hud.upgrades],
  };
}
