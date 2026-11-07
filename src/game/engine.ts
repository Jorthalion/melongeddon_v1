import {
  CELL, COLS, ROWS, BOARDS, CANNON_UPGRADES, DIFFICULTIES, STATS, TOWERS, UPGRADES, WAVES, WAVE_COUNT,
  BALANCE, softenSlow, stacksWord, buildBoard, buildCost, killReward, hpScaleFor, buildOffer, CANNON, GLOBAL_RANGE, PASSIVE, nextBeat, rollMods, sellValue, shopPrice, towerReadout, waveAt,
  type Alliance, type Difficulty, type EnemyKind, type Guard, type HeroId, type MapId, type ModDef,
  type ModId, type NightId, type Phase, type SpawnSpec, type TowerKind, type UpgradeDef, type UpgradeId,
} from "./rules.ts";

export * from "./rules.ts";
import {
  BOOKMARK,
  BOOKMARK_VALUES,
  EMPTY_META,
  backRoomPrice,
  loadMeta,
  loadPick,
  saveMeta,
  savePick,
  unlockedIds,
  unlockedMaps,
  type BookmarkId,
  type MetaStats,
} from "./meta.ts";
export * from "./meta.ts";

interface Waypoint {
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  slow: number;
  gold: number;
  r: number;
  wp: number;
  boss: boolean;
  chill: number;
  freeze: number;
  guard: Guard;
  shell: number;
  split: boolean;
  raw: boolean;
  bread: boolean;
  reverse: boolean;
  /** Ink Well mark: seconds left, and the damage multiplier while marked. */
  ink?: number;
  inkMul?: number;
  /** Bookworm burrow: seconds left, and damage per second. */
  worm?: number;
  wormDps?: number;
}

interface Tower {
  id: number;
  c: number;
  r: number;
  x: number;
  y: number;
  cd: number;
  aim: number;
  ally: boolean;
  orange: boolean;
  kind: TowerKind;
  mods: ModId[];
  /** Seeds spent on this tower (build + shop mods). Sell refunds a share of it. */
  paid: number;
  /** Seconds until this cannon's shots can leave another pulp puddle. */
  pulpCd?: number;
}

interface Shot {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  target: number;
  dmg: number;
  life: number;
  bounces: number;
  fromAlly: boolean;
  orange: boolean;
  splash: number;
  element: "shot" | "fire" | "ice" | "mortar" | "seed" | "fly" | "ink" | "peel" | "worm";
  /** Upgrade on-hit effects (Juicy, Splatter, Electric) only fire from the classic cannons. */
  procs: boolean;
  inkTime?: number;
  inkMul?: number;
  wormDps?: number;
  splashRatio: number;
  chill: number;
  freezeExtra: number;
  fireLife: number;
  fireBurn: number;
  /** This shot leaves a pulp puddle where it lands. */
  pulp: boolean;
}

interface Pool {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  hot: boolean;
  burn: number;
}

/** Instant-hit trails (ballista spear, reader shot). */
export interface Line {
  x: number;
  y: number;
  x2: number;
  y2: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

/** Expanding rings (bell shush, compost payout). */
export interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  x2: number;
  y2: number;
  life: number;
}

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  s: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export interface Hud {
  phase: Phase;
  seeds: number;
  lives: number;
  maxLives: number;
  wave: number;
  waveCount: number;
  waveName: string;
  blurb: string;
  upgrades: UpgradeId[];
  offer: UpgradeDef[];
  alliance: Alliance;
  log: string;
  absurdity: number;
  selected: number | null;
  canPlace: boolean;
  towerCost: number;
  range: number;
  placeRange: number;
  left: number;
  waveSize: number;
  best: number;
  /** Most waves cleared in an endless run. */
  endlessBest: number;
  /** Equipped bookmark (meta perk) for this run. */
  bookmark: BookmarkId | null;
  /** Bookmarks unlocked so far, and the ones unlocked during this run. */
  unlocked: BookmarkId[];
  newUnlocks: BookmarkId[];
  /** Maps unlocked so far, and the ones unlocked during this run. */
  maps: MapId[];
  newMaps: MapId[];
  hero: HeroId | null;
  branch: UpgradeId | null;
  map: MapId;
  build: TowerKind;
  shopVisits: number;
  modOffer: ModDef[];
  shopFor: number | null;
  speed: number;
  paused: boolean;
  /** Pause menu state. While it is open the board is paused and most keys are ignored. */
  menu: "pause" | "settings" | null;
  difficulty: Difficulty;
  night: NightId;
  /** True once a setup has been saved, so the Title offers Continue instead of Start. */
  saved: boolean;
  /** Why the saved setup was changed on load (a locked map or bookmark), shown on the Title. */
  setupNote: string;
}
const BEST_KEY = "melongeddon-best-wave";
const ENDLESS_BEST_KEY = "melongeddon-endless-best";
const DOOR_KEY = "melongeddon-door";

export function readDoor(): Alliance {
  try {
    const v = localStorage.getItem(DOOR_KEY);
    if (v === "accept" || v === "betray" || v === "reject") return v;
  } catch {
    /* ignore */
  }
  return "none";
}

function writeDoor(alliance: Alliance) {
  try {
    if (alliance === "none") localStorage.removeItem(DOOR_KEY);
    else localStorage.setItem(DOOR_KEY, alliance);
  } catch {
    /* ignore */
  }
}

/** The choices behind the last night started, so "same again" is one press. */
export interface SetupRecord {
  night: NightId;
  map: MapId;
  difficulty: Difficulty;
  bookmark: BookmarkId | null;
  hero: HeroId;
  door: Alliance;
}

const SETUP_KEY = "melongeddon-setup";
const HEROES: HeroId[] = ["mynxi", "vael", "michael"];
const NIGHTS: NightId[] = ["midnight", "overflow", "endless"];

export const DEFAULT_SETUP: SetupRecord = {
  night: "midnight",
  map: "stacks",
  difficulty: "normal",
  bookmark: null,
  hero: "mynxi",
  door: "none",
};

export function loadSetup(): Partial<SetupRecord> | null {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    return raw ? (JSON.parse(raw) as Partial<SetupRecord>) : null;
  } catch {
    return null;
  }
}

function saveSetup(rec: SetupRecord) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

/**
 * Turn a saved setup into one that can start right now. Anything unknown falls back to the
 * default; a map or bookmark that is no longer unlocked falls back too, with a note saying so.
 * `needsDoor` means the Overflow was saved but there is no answer for how the first night ended.
 */
export function validateSetup(
  saved: Partial<SetupRecord> | null | undefined,
  have: { maps: MapId[]; unlocked: BookmarkId[] },
): { setup: SetupRecord; notes: string[]; needsDoor: boolean } {
  const s = saved ?? {};
  const notes: string[] = [];
  const night = NIGHTS.includes(s.night as NightId) ? (s.night as NightId) : DEFAULT_SETUP.night;
  const hero = HEROES.includes(s.hero as HeroId) ? (s.hero as HeroId) : DEFAULT_SETUP.hero;
  const difficulty = DIFFICULTIES.some((d) => d.id === s.difficulty) ? (s.difficulty as Difficulty) : DEFAULT_SETUP.difficulty;
  let map: MapId = DEFAULT_SETUP.map;
  if (night === "overflow") map = "overflow";
  else if (s.map && s.map !== "overflow" && s.map in BOARDS) {
    if (have.maps.includes(s.map)) map = s.map;
    else notes.push(`${BOARDS[s.map].name} is locked, so this starts in ${BOARDS.stacks.name}.`);
  }
  let bookmark: BookmarkId | null = null;
  if (s.bookmark && s.bookmark in BOOKMARK) {
    if (have.unlocked.includes(s.bookmark)) bookmark = s.bookmark;
    else notes.push(`${BOOKMARK[s.bookmark].name} is locked, so no bookmark is equipped.`);
  }
  const door: Alliance =
    night === "overflow" && (s.door === "accept" || s.door === "betray" || s.door === "reject") ? s.door : "none";
  return { setup: { night, map, difficulty, bookmark, hero, door }, notes, needsDoor: night === "overflow" && door === "none" };
}

export function doorMemory(alliance: Alliance): string {
  if (alliance === "accept") {
    return "You let him in. His cannons are already at the chute, and the damp pumpkins live here.";
  }
  if (alliance === "betray") return "You shot first. He did not come to ask again. The husks were the greeting.";
  if (alliance === "reject") return "You sent him away. The west door is still shut. The chute is not.";
  return "The first night has not ended yet.";
}
const STACKS = buildBoard(BOARDS.stacks.corners);

const SPEED_KEY = "melongeddon-speed";
const REDUCED_KEY = "melongeddon-reduced";
/** Game speeds the −/+ buttons step through. */
export const SPEEDS = [0.5, 1, 2, 3];

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readBest(key = BEST_KEY): number {
  try {
    return Number(localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(n: number, key = BEST_KEY) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    /* ignore */
  }
}

/** Sound cues the engine raises; the UI drains and plays them. Ignored headless. */
export type SfxKind = "fire" | "pop" | "bossPop" | "leak" | "build" | "sell" | "wave" | "clear" | "victory" | "defeat" | "turn" | "boss";
export interface Sfx {
  kind: SfxKind;
  tower?: TowerKind;
}

export interface World {
  hud: Hud;
  sfx: Sfx[];
  hover: { c: number; r: number } | null;
  anim: number;
  enemies: Enemy[];
  towers: Tower[];
  shots: Shot[];
  pools: Pool[];
  sparks: Spark[];
  lines: Line[];
  rings: Ring[];
  bits: Bit[];
  floaters: Floater[];
  shake: number;
  pathCells: Set<string>;
  points: Waypoint[];
  turns: Array<{ c: number; r: number; rot: number }>;
  reduced: boolean;
}

export interface WorldOptions {
  /** Use these stats instead of the saved ones, and never save (simulator, tests). */
  meta?: MetaStats;
  /** Start from this saved setup instead of the stored one (tests). */
  setup?: Partial<SetupRecord> | null;
}

export function createWorld(
  onChange: () => void,
  options: WorldOptions = {},
): {
  world: World;
  pointer: (x: number, y: number, kind: "move" | "down") => void;
  startWave: () => void;
  pickUpgrade: (id: UpgradeId) => void;
  chooseAlliance: (choice: Exclude<Alliance, "none">) => void;
  chooseHero: (hero: HeroId) => void;
  chooseMap: (map: MapId) => void;
  chooseBuild: (kind: TowerKind) => void;
  openShop: () => void;
  pickMod: (id: ModId) => void;
  closeShop: () => void;
  sellSelected: () => void;
  dismissSelection: () => void;
  nudgeSpeed: (dir: -1 | 1) => void;
  togglePause: () => void;
  setDifficulty: (id: Difficulty) => void;
  chooseNight: (night: NightId) => void;
  setDoor: (choice: Exclude<Alliance, "none">) => void;
  ackMemory: () => void;
  openSetup: () => void;
  beginNight: () => void;
  /** Setup: pick the keeper (kept in the HUD so it survives a return to Setup). */
  pickKeeper: (hero: HeroId) => void;
  /** Title: start the saved setup (or the defaults on a first visit). */
  continueRun: () => void;
  /** Setup → Title. */
  backToTitle: () => void;
  /** Intro → Setup, keeping the choices. */
  backToSetup: () => void;
  /** Clear the run and start the same setup again from the Intro. */
  restartNight: () => void;
  /** Clear the run and go to the Title, keeping the setup. */
  toTitle: () => void;
  /** After a Midnight win: the Overflow with this run's door answer, same keeper and difficulty. */
  continueOverflow: () => void;
  /** After an Overflow win: Setup with Endless selected. */
  tryEndless: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  menuSettings: (open: boolean) => void;
  /** Settings: default game speed (also applied now). Saved. */
  setSpeed: (speed: number) => void;
  /** Settings: reduce motion (no screen shake). Saved; overrides the system setting. */
  setReduced: (on: boolean) => void;
  /** Clear the run and go to Setup, keeping the choices. */
  reset: () => void;
  unlock: () => void;
  setBookmark: (id: BookmarkId | null) => void;
  /** Live stats for a placed tower (includes a Reading Lamp's boost). */
  statsOf: (towerId: number) => { dmg: number; range: number; interval: number; lit?: boolean } | null;
} {
  let nextId = 1;
  const id = () => nextId++;

  const world: World = {
    hud: {
      phase: "coldopen",
      seeds: 150,
      lives: 12,
      maxLives: 12,
      wave: 1,
      waveCount: WAVE_COUNT,
      waveName: WAVES[0].name,
      blurb: "Place melon cannons on the open floor. The carpet is the only road in.",
      upgrades: [],
      offer: [],
      alliance: "none",
      log: "The library is closed.",
      absurdity: 0,
      selected: null,
      canPlace: false,
      towerCost: TOWERS.melon.cost,
      range: 132,
      placeRange: 132,
      left: 0,
      waveSize: 0,
      best: 0,
      endlessBest: 0,
      bookmark: null,
      unlocked: [],
      newUnlocks: [],
      maps: [],
      newMaps: [],
      hero: null,
      branch: null,
      map: "stacks",
      build: "melon",
      shopVisits: 0,
      modOffer: [],
      shopFor: null,
      speed: 1,
      paused: false,
      menu: null,
      difficulty: "normal",
      night: "midnight",
      saved: false,
      setupNote: "",
    },
    hover: null,
    anim: 0,
    enemies: [],
    towers: [],
    shots: [],
    pools: [],
    sparks: [],
    lines: [],
    rings: [],
    bits: [],
    floaters: [],
    shake: 0,
    pathCells: STACKS.cells,
    points: STACKS.points,
    turns: STACKS.turns,
    reduced: false,
    sfx: [],
  };

  const cue = (kind: SfxKind, tower?: TowerKind) => {
    if (world.sfx.length < 48) world.sfx.push({ kind, tower });
  };

  let cleared = 0;
  let queue: Array<{ kind: EnemyKind; t: number; tough: number; guard: Guard; split: boolean; raw: boolean; chute: boolean }> = [];
  let absurdDrops = 0;
  let queueCursor = 0;
  let spawnClock = 0;
  let karlReward = false;
  const has = (u: UpgradeId) => world.hud.upgrades.includes(u);

  const persistMeta = !options.meta && typeof window !== "undefined";
  const meta: MetaStats = options.meta ? { ...options.meta } : persistMeta ? loadMeta() : { ...EMPTY_META };
  world.hud.unlocked = unlockedIds(meta);
  world.hud.maps = unlockedMaps(meta);
  {
    const stored = options.setup !== undefined ? options.setup : persistMeta ? loadSetup() : null;
    // The bookmark pick is saved whenever it changes, so it is newer than the setup record.
    const saved = persistMeta ? { ...(stored ?? {}), bookmark: loadPick() } : stored;
    const { setup, notes } = validateSetup(saved, { maps: world.hud.maps, unlocked: world.hud.unlocked });
    world.hud.saved = Boolean(stored);
    world.hud.setupNote = stored ? notes.join(" ") : "";
    world.hud.night = setup.night;
    world.hud.waveCount = setup.night === "endless" ? 0 : WAVE_COUNT;
    world.hud.map = setup.map;
    world.hud.difficulty = setup.difficulty;
    world.hud.bookmark = setup.bookmark;
    world.hud.hero = stored ? setup.hero : null;
    world.hud.alliance = setup.night === "overflow" ? (setup.door !== "none" ? setup.door : readDoor()) : "none";
  }
  const bm = (id: BookmarkId) => world.hud.bookmark === id;
  /** Update lifetime stats; announce any bookmark this unlocks. */
  const record = (change: (m: MetaStats) => void) => {
    change(meta);
    if (persistMeta) saveMeta(meta);
    const now = unlockedIds(meta);
    const fresh = now.filter((id) => !world.hud.unlocked.includes(id));
    world.hud.unlocked = now;
    const maps = unlockedMaps(meta);
    const freshMaps = maps.filter((id) => !world.hud.maps.includes(id));
    world.hud.maps = maps;
    if (freshMaps.length) world.hud.newMaps = [...world.hud.newMaps, ...freshMaps];
    const said: string[] = [];
    if (fresh.length) {
      world.hud.newUnlocks = [...world.hud.newUnlocks, ...fresh];
      said.push(`New bookmark: ${fresh.map((id) => BOOKMARK[id].name).join(", ")}. Equip it on the setup screen.`);
    }
    if (freshMaps.length) said.push(`New map: ${freshMaps.map((id) => BOARDS[id].name).join(", ")}.`);
    if (said.length) {
      world.hud.log = said.join(" ");
      cue("clear");
    }
  };
  const roomPrice = () => backRoomPrice(world.hud.hero, world.hud.shopVisits, world.hud.bookmark);

  if (typeof window !== "undefined") {
    world.hud.best = readBest();
    world.hud.endlessBest = readBest(ENDLESS_BEST_KEY);
    // Settings can override the system's reduce-motion preference.
    const reducedPref = readPref(REDUCED_KEY);
    world.reduced =
      reducedPref === "1" ? true : reducedPref === "0" ? false : (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
    const speedPref = Number(readPref(SPEED_KEY));
    if (SPEEDS.includes(speedPref)) world.hud.speed = speedPref;
  }

  const notify = () => onChange();

  const bumpBest = () => {
    if (world.hud.night === "endless") {
      if (cleared > world.hud.endlessBest) {
        world.hud.endlessBest = cleared;
        writeBest(cleared, ENDLESS_BEST_KEY);
      }
      return;
    }
    if (cleared > world.hud.best) {
      world.hud.best = cleared;
      writeBest(cleared);
    }
  };

  const burst = (x: number, y: number, color: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 90;
      world.bits.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        color,
        s: 2 + Math.random() * 3,
      });
    }
    if (world.bits.length > 240) world.bits.splice(0, world.bits.length - 240);
  };

  const float = (x: number, y: number, text: string, color: string) => {
    world.floaters.push({ x, y, text, life: 0.8, color });
  };

  const cellCenter = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

  const occupied = (c: number, r: number) => world.towers.some((t) => t.c === c && t.r === r);

  const inMap = (c: number, r: number) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

  const placedCount = () => world.towers.filter((t) => !t.ally).length;
  /** Kinds the player has on the board, most-built first (for cannon upgrades). */
  const builtKinds = () => {
    const count = new Map<TowerKind, number>();
    for (const t of world.towers) if (!t.ally) count.set(t.kind, (count.get(t.kind) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  // All player tower stats come from towerReadout(), the same function the
  // inspector panel shows, so the numbers on screen are the numbers in play.
  const ALLY_STATS = { dmg: 11, range: 150, interval: 1.05 };
  const statsFor = (tower: Tower) => {
    if (tower.ally) return ALLY_STATS;
    const base = towerReadout(world.hud.hero, tower.kind, tower.mods, world.hud.upgrades);
    if (PASSIVE.includes(tower.kind) || base.range >= GLOBAL_RANGE) return base;
    // Reading Lamp: the best lamp in reach boosts this cannon (lamps do not stack).
    let boost: { range: number; pace: number } | null = null;
    for (const lamp of world.towers) {
      if (lamp.kind !== "lantern" || lamp === tower) continue;
      const reach = towerReadout(world.hud.hero, "lantern", lamp.mods, world.hud.upgrades).range;
      if ((lamp.x - tower.x) ** 2 + (lamp.y - tower.y) ** 2 > reach * reach) continue;
      const bright = lamp.mods.includes("bright");
      const b = { range: bright ? 1.25 : CANNON.lanternRange, pace: bright ? 0.78 : CANNON.lanternPace };
      if (!boost || b.range > boost.range) boost = b;
    }
    if (!boost) return dark() ? { ...base, range: Math.round(base.range * BALANCE.archiveDark) } : base;
    return { dmg: base.dmg, range: Math.round(base.range * boost.range), interval: base.interval * boost.pace, lit: true };
  };
  /** The Archive is dark: see statsFor. */
  const dark = () => Boolean(BOARDS[world.hud.map].dark);
  const rangeFor = (kind: TowerKind) => {
    const range = towerReadout(world.hud.hero, kind, [], world.hud.upgrades).range;
    if (!dark() || PASSIVE.includes(kind) || range >= GLOBAL_RANGE) return range;
    return Math.round(range * BALANCE.archiveDark);
  };
  const priceNext = () =>
    Math.max(0, buildCost(world.hud.hero, placedCount(), world.hud.build) - (bm("discount") ? BOOKMARK_VALUES.discount : 0));
  const hasMod = (tower: Tower, id: ModId) => tower.mods.includes(id);
  const towerRange = (tower: Tower) => statsFor(tower).range;
  const syncPrice = () => {
    world.hud.towerCost = priceNext();
    world.hud.placeRange = rangeFor(world.hud.build);
    if (world.hud.selected == null) world.hud.range = world.hud.placeRange;
  };

  const tune = () => DIFFICULTIES.find((d) => d.id === world.hud.difficulty) ?? DIFFICULTIES[1];
  const spawnEnemy = (
    kind: EnemyKind,
    bonusHp = 1,
    guard: Guard = "none",
    flags: { split?: boolean; raw?: boolean; chute?: boolean; at?: { x: number; y: number; wp: number } } = {},
  ) => {
    const st = STATS[kind];
    const start = world.points[0];
    const tuned = tune();
    const hp = Math.round(st.hp * bonusHp * tuned.hp * (BOARDS[world.hud.map].hp ?? 1));
    const chute = Boolean(flags.chute) && !flags.at;
    let x = flags.at?.x ?? start.x - CELL;
    let y = flags.at?.y ?? start.y;
    let wp = flags.at?.wp ?? 0;
    if (chute && world.points.length >= 2) {
      const last = world.points[world.points.length - 1];
      const prev = world.points[world.points.length - 2];
      const dx = last.x - prev.x;
      const dy = last.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      x = last.x + (dx / len) * CELL;
      y = last.y + (dy / len) * CELL;
      wp = world.points.length - 1;
    }
    world.enemies.push({
      id: id(),
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: st.speed * tuned.speed,
      slow: 1,
      gold: killReward(st.gold),
      r: st.r,
      wp,
      boss: Boolean(st.boss),
      chill: 0,
      freeze: 0,
      guard,
      shell: guard === "rind" ? 1 : 0,
      split: Boolean(flags.split),
      raw: Boolean(flags.raw),
      bread: false,
      reverse: chute,
    });
  };

  const spill = (parent: Enemy) => {
    const st = STATS.melon;
    const tuned = tune();
    const hp = Math.round(st.hp * 0.55 * tuned.hp * hpScaleFor(world.hud.night, cleared));
    const offsets = [
      [-14, -10],
      [14, -10],
      [-14, 12],
      [14, 12],
    ];
    for (const [ox, oy] of offsets) {
      world.enemies.push({
        id: id(),
        kind: "melon",
        x: parent.x + ox,
        y: parent.y + oy,
        hp,
        maxHp: hp,
        speed: st.speed * tuned.speed,
        slow: 1,
        gold: killReward(4),
        r: st.r,
        wp: Math.min(parent.wp, world.points.length - 1),
        boss: false,
        chill: 0,
        freeze: 0,
        guard: "none",
        shell: 0,
        split: false,
        raw: false,
        bread: false,
        reverse: false,
      });
    }
    float(parent.x, parent.y - 20, "split", "#f3e2c4");
  };

  const buildQueue = (extra: SpawnSpec[] = []) => {
    const spec = waveAt(cleared, world.hud.alliance, world.hud.night);
    const list = [...spec.spawns, ...extra];
    const items: Array<{ kind: EnemyKind; t: number; tough: number; guard: Guard; split: boolean; raw: boolean; chute: boolean }> = [];
    let t = 0.35;
    for (const group of list) {
      for (let i = 0; i < group.count; i++) {
        items.push({
          kind: group.kind,
          t,
          tough: group.tough ?? 1,
          guard: group.guard ?? "none",
          split: Boolean(group.split),
          raw: Boolean(group.raw),
          chute: Boolean(group.chute),
        });
        t += group.every;
      }
    }
    items.sort((a, b) => a.t - b.t);
    queue = items;
    queueCursor = 0;
    spawnClock = 0;
  };

  const placeAllyTowers = () => {
    const spots = BOARDS[world.hud.map].allies;
    for (const [c, r] of spots) {
      if (!inMap(c, r) || world.pathCells.has(`${c},${r}`) || occupied(c, r)) continue;
      const p = cellCenter(c, r);
      world.towers.push({ id: id(), c, r, x: p.x, y: p.y, cd: 0.2, aim: 0, ally: true, orange: true, kind: "melon", mods: [], paid: 0 });
    }
  };

  const placeEarlyHusks = () => {
    for (const idx of [1, 2, 3, 4]) {
      const spot = world.points[idx];
      if (!spot) continue;
      spawnEnemy("corn", 1, "husk", { at: { x: spot.x, y: spot.y, wp: idx } });
    }
  };

  const applyBoard = (map: MapId) => {
    const built = buildBoard(BOARDS[map].corners);
    world.pathCells = built.cells;
    world.points = built.points;
    world.turns = built.turns;
    world.hud.map = map;
  };
  applyBoard(world.hud.map);

  /**
   * Clear everything a run built up (board, waves, picks, seeds, stacks) and keep the setup:
   * night, map, difficulty, bookmark, keeper and, on the Overflow, the door answer. Speed is a
   * preference and is kept too.
   */
  const resetRunState = () => {
    world.enemies = [];
    world.towers = [];
    world.shots = [];
    world.pools = [];
    world.sparks = [];
    world.lines = [];
    world.rings = [];
    world.bits = [];
    world.floaters = [];
    world.shake = 0;
    world.hover = null;
    cleared = 0;
    queue = [];
    queueCursor = 0;
    spawnClock = 0;
    karlReward = false;
    absurdDrops = 0;
    applyBoard(world.hud.map);
    const opening = waveAt(0, world.hud.night === "overflow" ? world.hud.alliance : "none", world.hud.night);
    world.hud = {
      ...world.hud,
      seeds: 150,
      lives: 12,
      maxLives: 12,
      wave: 1,
      waveName: opening.name,
      blurb: opening.blurb,
      upgrades: [],
      offer: [],
      alliance: world.hud.night === "overflow" ? world.hud.alliance : "none",
      absurdity: 0,
      selected: null,
      canPlace: false,
      towerCost: TOWERS.melon.cost,
      range: 132,
      placeRange: 132,
      left: 0,
      waveSize: 0,
      branch: null,
      build: "melon",
      shopVisits: 0,
      modOffer: [],
      shopFor: null,
      paused: false,
      menu: null,
      waveCount: world.hud.night === "endless" ? 0 : WAVE_COUNT,
      newUnlocks: [],
      newMaps: [],
    };
  };

  const removeAllies = () => {
    world.towers = world.towers.filter((t) => !t.ally);
  };

  const loseLife = (n: number, x: number, y: number) => {
    world.hud.lives = Math.max(0, world.hud.lives - n);
    world.shake = world.reduced ? 0 : 8;
    float(x, y, n > 1 ? `−${n} stacks` : "Leak", "#e23b4a");
    cue("leak");
    if (world.hud.lives <= 0) {
      cue("defeat");
      world.hud.phase = "defeat";
      world.hud.log = "The stacks are pulp. Mynxi is not speaking to you.";
      bumpBest();
      notify();
    }
  };

  const addPool = (x: number, y: number, wide = false, cling = false) => {
    const sticky = has("sticky");
    const vial = has("vial") || has("distill");
    let life = sticky ? 3.2 : vial ? 2.6 : 1.8;
    let r = sticky ? 52 : vial ? 30 : 40;
    if (wide) r += 16;
    if (cling) life += 1.2;
    world.pools.push({ x, y, r, life, max: life, hot: false, burn: 0 });
  };

  const addFire = (x: number, y: number, life = 2.4, burn = 22) => {
    world.pools.push({ x, y, r: 34, life, max: life, hot: true, burn });
  };

  const onDeath = (e: Enemy) => {
    world.hud.seeds += e.gold + (has("fines") ? 5 : 0) + (bm("latefee") ? BOOKMARK_VALUES.latefee : 0);
    world.hud.absurdity = Math.min(100, world.hud.absurdity + (e.boss ? 18 : 3));
    burst(e.x, e.y, e.kind === "pumpkin" || e.kind === "karl" ? "#e8883a" : "#e23b4a", e.boss ? 28 : 10);
    cue(e.boss ? "bossPop" : "pop");
    if (e.split) spill(e);
    if (has("blot") && (e.ink ?? 0) > 0) {
      for (const other of world.enemies) {
        if (other === e || other.hp <= 0 || Math.hypot(other.x - e.x, other.y - e.y) > CANNON.blotRadius) continue;
        other.ink = Math.max(other.ink ?? 0, CANNON.inkTime);
        other.inkMul = Math.max(other.inkMul ?? 1, e.inkMul ?? CANNON.inkBonus);
      }
      world.rings.push({ x: e.x, y: e.y, r: CANNON.blotRadius, life: 0.35, max: 0.35, color: "29,38,64" });
    }
    if (e.boss) {
      const second = karlReward;
      karlReward = true;
      world.hud.lives = Math.min(world.hud.maxLives, world.hud.lives + 2);
      world.shake = world.reduced ? 0 : 14;
      addPool(e.x, e.y);
      world.hud.log = second
        ? "The household champion is pie. +2 stacks."
        : world.hud.night === "overflow"
          ? "Karl came up the chute and left as pie. +2 stacks."
          : "Karl is pie. The library exhales. +2 stacks.";
      record((m) => (m.karls += 1));
      for (const other of world.enemies) hurt(other, e, 40, 90, "splash");
    } else if (karlReward && e.kind === "pumpkin") {
      burst(e.x, e.y, "#e8883a", 8);
      for (const other of world.enemies) hurt(other, e, 12, 48, "splash");
    }
    notify();
  };

  const hurt = (
    e: Enemy,
    from: { id: number; x: number; y: number } | null,
    amount: number,
    radius = 0,
    via: "shot" | "splash" | "burn" | "pulp" | "worm" = "shot",
  ) => {
    if (radius > 0 && from) {
      if (e.id === from.id || e.hp <= 0) return;
      if (Math.hypot(e.x - from.x, e.y - from.y) > radius) return;
    }
    if (e.hp <= 0) return;
    if (e.raw && via === "burn" && amount > 0) {
      e.raw = false;
      e.bread = true;
      e.speed *= 0.55;
      float(e.x, e.y - 18, "bread", "#e6c36a");
      return;
    }
    if (e.bread && via === "burn") return;
    if (world.hud.map === "overflow" && via === "burn") amount *= 0.55;
    if (e.guard === "rind" && e.shell > 0 && (via === "shot" || via === "splash") && amount >= 1) {
      e.shell = 0;
      float(e.x, e.y - 16, "crack", "#f3e2c4");
      return;
    }
    if (e.guard === "rind" && e.shell > 0 && (via === "burn" || via === "pulp")) amount *= 0.4;
    if (e.guard === "husk" && (via === "splash" || via === "burn")) amount *= 1.4;
    if (e.guard === "husk" && via === "shot") amount *= 0.75;
    if (e.guard === "damp" && via === "burn") amount *= 0.15;
    if (e.guard === "damp" && via === "shot") amount *= 1.15;
    if ((e.ink ?? 0) > 0) amount *= e.inkMul ?? CANNON.inkBonus;
    e.hp -= amount;
    if (amount >= 1) float(e.x, e.y - 10, String(Math.round(amount)), "#f3e2c4");
    if (e.hp <= 0) onDeath(e);
  };

  const onShotHit = (shot: Shot, e: Enemy) => {
    if (shot.element === "seed" && e.guard === "rind" && e.shell > 0) {
      float(e.x, e.y - 16, "ping", "#d8c9a8");
      return false;
    }
    if (shot.element === "peel") {
      if ((e.guard === "rind" && e.shell > 0) || e.guard === "husk" || e.guard === "damp") {
        e.shell = 0;
        e.guard = "none";
        float(e.x, e.y - 18, "peeled", "#e8a35a");
      }
    }
    if (shot.element === "ink") {
      for (const other of world.enemies) {
        if (other.hp <= 0 || Math.hypot(other.x - e.x, other.y - e.y) > 34) continue;
        other.ink = Math.max(other.ink ?? 0, shot.inkTime ?? CANNON.inkTime);
        other.inkMul = Math.max(other.inkMul ?? 1, shot.inkMul ?? CANNON.inkBonus);
      }
    }
    if (shot.element === "worm" && (e.kind === "pumpkin" || e.kind === "karl")) {
      if ((e.worm ?? 0) <= 0) float(e.x, e.y - 18, "burrow", "#e79ab0");
      e.worm = CANNON.wormTime;
      e.wormDps = Math.max(e.wormDps ?? 0, shot.wormDps ?? CANNON.wormDps);
    }
    hurt(e, null, shot.dmg);
    burst(e.x, e.y, "#3f9a5c", 6);
    if (!shot.fromAlly && world.hud.hero === "vael" && e.guard !== "husk") e.chill = Math.max(e.chill, 1.15);
    if (shot.chill > 0 && e.guard !== "husk") e.chill = Math.max(e.chill, shot.chill);
    if (shot.element === "fire" && !shot.fromAlly) addFire(e.x, e.y, shot.fireLife, shot.fireBurn);
    if (shot.element === "ice" && !shot.fromAlly && e.guard !== "husk") {
      const hold = (e.boss ? 0.6 : 1.45) + shot.freezeExtra;
      e.freeze = Math.max(e.freeze, e.guard === "damp" ? hold * 1.4 : hold);
      float(e.x, e.y - 18, "frozen", "#d5e4ee");
    }
    if (shot.pulp) {
      addPool(e.x, e.y);
      shot.pulp = false; // a bounce does not leave a second puddle
    }
    if (shot.procs && has("juicy")) {
      for (const other of world.enemies) hurt(other, e, 8, 46, "splash");
    }
    if (has("splatter") && shot.procs) {
      for (const other of world.enemies) hurt(other, e, 9, 40, "splash");
    }
    if (shot.splash > 0 && !shot.fromAlly) {
      for (const other of world.enemies)
        hurt(other, e, Math.max(6, Math.round(shot.dmg * shot.splashRatio)), shot.splash, "splash");
    }
    if (has("electric") && shot.procs) {
      let best: Enemy | null = null;
      let bestD = 92;
      for (const other of world.enemies) {
        if (other.id === e.id || other.hp <= 0) continue;
        const d = Math.hypot(other.x - e.x, other.y - e.y);
        if (d < bestD) {
          bestD = d;
          best = other;
        }
      }
      if (best) {
        hurt(best, null, 14);
        world.sparks.push({ x: e.x, y: e.y, x2: best.x, y2: best.y, life: 0.18 });
        float(best.x, best.y - 8, "zap", "#e6c36a");
      }
    }
    if (shot.bounces > 0) {
      let next: Enemy | null = null;
      let bestD = 160;
      for (const other of world.enemies) {
        if (other.id === e.id || other.hp <= 0) continue;
        const d = Math.hypot(other.x - e.x, other.y - e.y);
        if (d < bestD) {
          bestD = d;
          next = other;
        }
      }
      if (next) {
        shot.bounces -= 1;
        shot.target = next.id;
        shot.x = e.x;
        shot.y = e.y;
        shot.life = 1.4;
        return true;
      }
    }
    return false;
  };

  /** Lifetime stats for a cleared wave (after the wave's own log line, so an unlock notice shows). */
  const recordWave = () => {
    const endless = world.hud.night === "endless";
    record((m) => {
      if (endless) m.endlessBest = Math.max(m.endlessBest, cleared);
      else m.bestWave = Math.max(m.bestWave, cleared);
      if (!endless && cleared >= WAVE_COUNT) {
        m.wins += 1;
        if (world.hud.difficulty === "hard" || world.hud.difficulty === "overdue") m.hardWins += 1;
      }
    });
  };

  const endWave = () => {
    cleared += 1;
    bumpBest();
    const endless = world.hud.night === "endless";
    world.hud.wave = endless ? cleared + 1 : Math.min(WAVE_COUNT, cleared + 1);
    world.enemies = [];
    world.shots = [];
    if (world.hud.lives <= 0) return;
    // Interest is worked out on the seeds held before any heap pays, so heaps don't compound.
    const interest = has("interest") ? Math.min(CANNON.interestCap, Math.floor(world.hud.seeds * CANNON.interestRate)) : 0;
    for (const heap of world.towers) {
      if (heap.kind !== "compost") continue;
      const pay =
        Math.round(CANNON.compostSeeds * (heap.mods.includes("loam") ? 1.5 : 1)) + (has("interest") ? CANNON.interestBase + interest : 0);
      world.hud.seeds += pay;
      float(heap.x, heap.y - 24, `+${pay}`, "#e6c36a");
      world.rings.push({ x: heap.x, y: heap.y, r: 30, life: 0.6, max: 0.6, color: "120,170,90" });
    }
    const beat = nextBeat(cleared, world.hud.alliance, world.hud.night);
    const upcoming = waveAt(endless ? cleared : Math.min(cleared, WAVE_COUNT - 1), world.hud.alliance, world.hud.night);
    if (beat !== "victory") cue("clear");
    if (beat === "victory") {
      cue("victory");
      world.hud.phase = "victory";
      world.hud.blurb =
        world.hud.night === "overflow"
          ? world.hud.alliance === "accept"
            ? "The household held the chute. Karl came up it anyway."
            : world.hud.alliance === "betray"
              ? "The grudge walked in both directions. You still closed the chute."
              : "No knight. The chute still closed."
          : world.hud.alliance === "accept"
            ? "You survived the household that came back meaner."
            : world.hud.alliance === "betray"
              ? "You survived the grudge."
              : world.hud.alliance === "reject"
                ? "You sent him away, and survived the produce alone."
                : "The library holds.";
      world.hud.log = world.hud.blurb;
      recordWave();
      notify();
      return;
    }
    const step = cleared === 1 ? 1 : cleared === 2 ? 2 : 3;
    const offer =
      beat === "upgrade" ? buildOffer(world.hud.hero, step, world.hud.upgrades, world.hud.branch, world.hud.alliance, builtKinds()) : [];
    if (beat === "upgrade" && offer.length) {
      world.hud.offer = offer;
      world.hud.phase = "upgrade";
      world.hud.log =
        endless && cleared > 6
          ? "Another shelf opens. The carpet keeps going."
          : step === 3
          ? world.hud.night === "overflow"
            ? "One more shelf. Then the meter starts spending."
            : "One more shelf. Then the door you chose comes due."
          : step === 1
            ? world.hud.hero === "michael"
              ? "Sir Michael's first shelf."
              : world.hud.hero === "vael"
                ? "Vael's first shelf."
                : "Mynxi's first shelf."
            : "The last pick opened the next shelf.";
    } else if (beat === "alliance") {
      world.hud.phase = "alliance";
      world.hud.log = world.hud.hero === "michael"
        ? "Your household is at the west door."
        : "Sir Michael the Pumpkin Knight is at the west door.";
    } else if (beat === "betrayal") {
      world.hud.phase = "betrayal";
      world.hud.log = "The Pumpkin Knight is smiling with too many teeth.";
    } else if (beat === "consequence") {
      world.hud.phase = "consequence";
      world.hud.waveName = upcoming.name;
      world.hud.blurb = upcoming.blurb;
      world.hud.log = world.hud.night === "overflow" ? "Karl is not using the door." : "The choice you made at the door is on the carpet.";
    } else if (beat === "memory") {
      world.hud.phase = "memory";
      world.hud.log = "The door does not open again.";
    } else {
      world.hud.phase = "prep";
      world.hud.blurb = upcoming.blurb;
      world.hud.waveName = upcoming.name;
      world.hud.log = `Wave ${cleared} cleared.`;
    }
    recordWave();
    notify();
  };

  const tickCombat = (dt: number) => {
    const scale = hpScaleFor(world.hud.night, cleared);
    spawnClock += dt;
    while (queueCursor < queue.length && spawnClock >= queue[queueCursor].t) {
      spawnEnemy(queue[queueCursor].kind, scale * queue[queueCursor].tough, queue[queueCursor].guard, {
        split: queue[queueCursor].split,
        raw: queue[queueCursor].raw,
        chute: queue[queueCursor].chute,
      });
      queueCursor += 1;
    }
    // The Overflow's last two waves ("The meter spends", "Up the chute") drop a rind per 25 absurdity.
    if (world.hud.night === "overflow" && cleared >= WAVE_COUNT - 2) {
      const due = Math.floor(world.hud.absurdity / 25);
      while (absurdDrops < due) {
        spawnEnemy("melon", scale, "rind", { chute: true });
        absurdDrops += 1;
      }
    }

    for (const pool of world.pools) pool.life -= dt;
    world.pools = world.pools.filter((p) => p.life > 0);

    for (const e of world.enemies) {
      let slow = 1;
      let dot = 0;
      let burn = 0;
      for (const pool of world.pools) {
        if (Math.hypot(e.x - pool.x, e.y - pool.y) > pool.r) continue;
        if (pool.hot) {
          burn = Math.max(burn, pool.burn || 22);
          continue;
        }
        const crawl = has("distill") ? 0.38 : has("sticky") ? 0.45 : has("vial") ? 0.55 : 0.78;
        slow = Math.min(slow, softenSlow(crawl));
        if (has("juicy") || has("distill")) dot = has("distill") ? 16 : 10;
      }
      if (e.chill > 0) {
        e.chill -= dt;
        slow = Math.min(slow, softenSlow(has("distill") ? 0.48 : 0.62));
      }
      if (e.freeze > 0) {
        e.freeze -= dt;
        slow = 0;
      }
      if (e.guard === "husk") {
        e.chill = 0;
        e.freeze = 0;
        slow = 1;
      }
      e.slow = slow;
      if (dot) hurt(e, null, dot * dt, 0, "pulp");
      if ((e.ink ?? 0) > 0) e.ink = (e.ink ?? 0) - dt;
      if ((e.worm ?? 0) > 0) {
        e.worm = (e.worm ?? 0) - dt;
        hurt(e, null, (e.wormDps ?? 0) * dt, 0, "worm");
      }
      if (burn) hurt(e, null, burn * dt, 0, "burn");
      const wp = world.points[e.wp];
      if (!wp) continue;
      const dx = wp.x - e.x;
      const dy = wp.y - e.y;
      const dist = Math.hypot(dx, dy);
      const step = e.speed * e.slow * dt;
      if (dist <= step + 0.5) {
        e.x = wp.x;
        e.y = wp.y;
        if (e.reverse) {
          e.wp -= 1;
          if (e.wp < 0) {
            loseLife(e.boss ? 3 : 1, e.x, e.y);
            e.hp = 0;
          }
        } else {
          e.wp += 1;
          if (e.wp >= world.points.length) {
            loseLife(e.boss ? 3 : 1, e.x, e.y);
            e.hp = 0;
          }
        }
      } else if (dist > 0) {
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
      }
    }

    for (const tower of world.towers) {
      tower.cd -= dt;
      tower.pulpCd = (tower.pulpCd ?? 0) - dt;
      if (PASSIVE.includes(tower.kind)) continue;
      let target: Enemy | null = null;
      let bestProg = -Infinity;
      const stats = statsFor(tower);
      const range = stats.range;
      const inRange: Enemy[] = [];
      for (const e of world.enemies) {
        if (e.hp <= 0) continue;
        const d2 = (e.x - tower.x) ** 2 + (e.y - tower.y) ** 2;
        if (d2 > range * range) continue;
        inRange.push(e);
        let prog = e.wp * 1000 - Math.hypot(e.x - (world.points[e.wp]?.x ?? e.x), e.y - (world.points[e.wp]?.y ?? e.y));
        // Specialists look for their favourite target first.
        if (tower.kind === "reader") prog = e.hp;
        else if (tower.kind === "peeler" && ((e.guard === "rind" && e.shell > 0) || e.guard === "husk" || e.guard === "damp"))
          prog += 1e6;
        else if (tower.kind === "bookworm" && (e.kind === "pumpkin" || e.kind === "karl") && (e.worm ?? 0) < 1) prog += 1e6;
        else if (tower.kind === "ink" && (e.ink ?? 0) <= 0.5) prog += 1e6;
        if (prog > bestProg) {
          bestProg = prog;
          target = e;
        }
      }
      if (!target) continue;
      if (tower.kind === "hive") target = inRange[Math.floor(Math.random() * inRange.length)] ?? target;
      tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cd > 0) continue;
      if (tower.kind === "still") {
        tower.cd = stats.interval;
        addPool(target.x, target.y, hasMod(tower, "spread"), hasMod(tower, "cling"));
        continue;
      }
      if (tower.kind === "bell") {
        tower.cd = stats.interval;
        cue("fire", "bell");
        for (const e of inRange) {
          if (e.guard === "husk") continue;
          e.freeze = Math.max(e.freeze, e.boss ? CANNON.bellStunBoss : CANNON.bellStun);
        }
        world.rings.push({ x: tower.x, y: tower.y, r: range, life: 0.45, max: 0.45, color: "230,195,106" });
        float(tower.x, tower.y - 26, "SHHH", "#e6c36a");
        continue;
      }
      if (tower.kind === "ballista" || tower.kind === "reader") {
        tower.cd = stats.interval;
        cue("fire", tower.kind);
        const ang = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.kind === "reader") {
          if (has("footnotes")) {
            target.ink = Math.max(target.ink ?? 0, CANNON.inkTime);
            target.inkMul = Math.max(target.inkMul ?? 1, CANNON.inkBonus);
          }
          hurt(target, null, stats.dmg);
          world.lines.push({ x: tower.x, y: tower.y, x2: target.x, y2: target.y, life: 0.22, max: 0.22, color: "243,226,196", width: 2 });
          burst(target.x, target.y, "#f3e2c4", 8);
        } else {
          // The spear flies the full reach and hits everything near its line.
          const ux = Math.cos(ang);
          const uy = Math.sin(ang);
          for (const e of world.enemies) {
            if (e.hp <= 0) continue;
            const rx = e.x - tower.x;
            const ry = e.y - tower.y;
            const along = rx * ux + ry * uy;
            if (along < 0 || along > range) continue;
            if (Math.abs(rx * uy - ry * ux) > e.r + 8) continue;
            if (has("barbed") && e.guard !== "husk") e.chill = Math.max(e.chill, CANNON.barbedSlow);
            hurt(e, null, stats.dmg);
          }
          world.lines.push({
            x: tower.x,
            y: tower.y,
            x2: tower.x + ux * range,
            y2: tower.y + uy * range,
            life: 0.25,
            max: 0.25,
            color: "196,140,82",
            width: 4,
          });
        }
        continue;
      }
      tower.cd = stats.interval;
      const dmg = stats.dmg;
      // Pulp upgrades: only melon cannons leave puddles, and at most one per cannon every few seconds.
      const pulp =
        !tower.ally &&
        tower.kind === "melon" &&
        (tower.pulpCd ?? 0) <= 0 &&
        (has("juicy") || has("sticky") || has("vial") || has("distill"));
      if (pulp) tower.pulpCd = BALANCE.pulpEvery;
      if (!tower.ally) cue("fire", tower.kind);
      const element: Shot["element"] =
        tower.kind === "fire"
          ? "fire"
          : tower.kind === "freeze"
            ? "ice"
            : tower.kind === "mortar"
              ? "mortar"
              : tower.kind === "spitter"
                ? "seed"
                : tower.kind === "hive"
                  ? "fly"
                  : tower.kind === "ink"
                    ? "ink"
                    : tower.kind === "peeler"
                      ? "peel"
                      : tower.kind === "bookworm"
                        ? "worm"
                        : "shot";
      const flies = tower.kind === "hive" && hasMod(tower, "swarm") ? 2 : 1;
      for (let f = 0; f < flies; f++) {
      const aimAt = f === 0 ? target : (inRange[Math.floor(Math.random() * inRange.length)] ?? target);
      world.shots.push({
        id: id(),
        x: tower.x,
        y: tower.y,
        tx: aimAt.x,
        ty: aimAt.y,
        target: aimAt.id,
        dmg,
        life: 1.6,
        bounces: tower.ally ? 0 : (tower.kind === "melon" && has("bounce")) || (tower.kind === "hive" && has("stinging")) ? 1 : 0,
        fromAlly: tower.ally,
        orange: tower.kind === "mortar" || tower.orange,
        splash: tower.kind === "mortar" ? 46 + (hasMod(tower, "wide") ? 18 : 0) : 0,
        element,
        procs: !tower.ally && (element === "shot" || element === "fire" || element === "ice" || element === "mortar"),
        inkTime: hasMod(tower, "indelible") ? CANNON.inkTime * 1.5 : CANNON.inkTime,
        inkMul: (hasMod(tower, "indelible") ? CANNON.inkBonus + 0.1 : CANNON.inkBonus) + (has("blot") ? CANNON.blotInkBonus : 0),
        wormDps: hasMod(tower, "venom") ? CANNON.wormDps * 1.5 : CANNON.wormDps,
        splashRatio: hasMod(tower, "heavy") ? 0.8 : 0.55,
        chill: hasMod(tower, "chill") ? 0.75 : 0,
        freezeExtra: hasMod(tower, "hold") ? 0.55 : 0,
        fireLife: hasMod(tower, "lasting") ? 3.6 : 2.4,
        fireBurn: hasMod(tower, "hotter") ? 34 : 22,
        pulp,
      });
      }
    }

    for (const shot of world.shots) {
      shot.life -= dt;
      const target = world.enemies.find((e) => e.id === shot.target && e.hp > 0);
      const tx = target ? target.x : shot.tx;
      const ty = target ? target.y : shot.ty;
      shot.tx = tx;
      shot.ty = ty;
      const dx = tx - shot.x;
      const dy = ty - shot.y;
      const dist = Math.hypot(dx, dy);
      const step = 280 * dt;
      if (dist <= 12 || dist <= step) {
        shot.x = tx;
        shot.y = ty;
        if (target) {
          const keep = onShotHit(shot, target);
          if (!keep) shot.life = 0;
        } else shot.life = 0;
      } else {
        shot.x += (dx / dist) * step;
        shot.y += (dy / dist) * step;
      }
    }
    world.shots = world.shots.filter((s) => s.life > 0);

    world.enemies = world.enemies.filter((e) => e.hp > 0);
    world.hud.left = world.enemies.length + Math.max(0, queue.length - queueCursor);

    if (world.hud.phase === "combat" && queueCursor >= queue.length && world.enemies.length === 0) {
      endWave();
    }
  };

  const tickFx = (dt: number) => {
    world.anim += dt;
    world.shake = Math.max(0, world.shake - dt * 18);
    for (const b of world.bits) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 40 * dt;
    }
    world.bits = world.bits.filter((b) => b.life > 0);
    for (const s of world.sparks) s.life -= dt;
    for (const l of world.lines) l.life -= dt;
    world.lines = world.lines.filter((l) => l.life > 0);
    for (const r of world.rings) r.life -= dt;
    world.rings = world.rings.filter((r) => r.life > 0);
    world.sparks = world.sparks.filter((s) => s.life > 0);
    for (const f of world.floaters) {
      f.life -= dt;
      f.y -= 18 * dt;
    }
    world.floaters = world.floaters.filter((f) => f.life > 0);
  };

  const api = {
    world,
    pointer(x: number, y: number, kind: "move" | "down") {
      const c = Math.floor(x / CELL);
      const r = Math.floor(y / CELL);
      if (!inMap(c, r)) {
        world.hover = null;
        return;
      }
      world.hover = { c, r };
      const path = world.pathCells.has(`${c},${r}`);
      const taken = occupied(c, r);
      world.hud.canPlace =
        !path &&
        !taken &&
        world.hud.seeds >= world.hud.towerCost &&
        (world.hud.phase === "prep" || world.hud.phase === "combat");
      if (kind !== "down") return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      if (taken) {
        const tower = world.towers.find((t) => t.c === c && t.r === r && !t.ally);
        if (tower && world.hud.selected === tower.id) {
          world.hud.selected = null;
          syncPrice();
        } else {
          world.hud.selected = tower ? tower.id : null;
          if (tower) world.hud.range = towerRange(tower);
          else syncPrice();
        }
        notify();
        return;
      }
      if (path || world.hud.seeds < world.hud.towerCost) return;
      const p = cellCenter(c, r);
      const buildKind = world.hud.build;
      const tower: Tower = {
        id: id(),
        c,
        r,
        x: p.x,
        y: p.y,
        cd: 0.15,
        aim: 0,
        ally: false,
        orange: false,
        kind: buildKind,
        mods: [],
        paid: world.hud.towerCost,
      };
      world.towers.push(tower);
      cue("build", buildKind);
      world.hud.seeds -= world.hud.towerCost;
      world.hud.selected = tower.id;
      world.hud.log = `${TOWERS[buildKind].name} set.`;
      syncPrice();
      notify();
    },
    startWave() {
      if (world.hud.menu) return;
      if (world.hud.phase === "betrayal") {
        removeAllies();
        const cut = world.hud.hero === "michael" ? BALANCE.michaelTurnCut : 2;
        world.hud.lives = Math.max(0, world.hud.lives - cut);
        cue("turn");
        world.shake = world.reduced ? 0 : 12;
        world.hud.log =
          world.hud.hero === "michael"
            ? `They were his. They still turned. ${stacksWord(cut)} stacks are paste.`
            : "He turned. Two stacks are paste. His pumpkins are already moving.";
        if (world.hud.lives <= 0) {
          world.hud.phase = "defeat";
          bumpBest();
          notify();
          return;
        }
      }
      if (world.hud.phase !== "prep" && world.hud.phase !== "betrayal" && world.hud.phase !== "consequence") return;
      if (world.hud.menu) return;
      world.hud.paused = false;
      const extra: SpawnSpec[] = [];
      if (world.hud.night === "midnight" && world.hud.alliance === "betray" && cleared === 4) {
        extra.push({ kind: "pumpkin", count: 5, every: 0.7 });
      }
      if (world.hud.night === "midnight" && world.hud.alliance === "accept" && cleared === 5) {
        extra.push({ kind: "pumpkin", count: 6, every: 0.55 });
      }
      if (world.hud.night === "midnight" && world.hud.alliance === "accept" && cleared === 4) placeAllyTowers();
      if (world.hud.night === "overflow" && world.hud.alliance === "accept" && (cleared === 4 || cleared === 8)) {
        extra.push({ kind: "pumpkin", count: 3, every: 1, guard: "damp" });
      }
      const spec = waveAt(cleared, world.hud.alliance, world.hud.night);
      buildQueue(extra);
      world.hud.waveSize = queue.length;
      world.hud.left = queue.length;
      world.hud.phase = "combat";
      cue(queue.some((q) => q.kind === "karl") ? "boss" : "wave");
      world.hud.wave = cleared + 1;
      world.hud.waveName = spec.name;
      world.hud.blurb = spec.blurb;
      world.hud.log = `Wave ${cleared + 1}: ${spec.name}.`;
      notify();
    },
    pickUpgrade(upgradeId: UpgradeId) {
      if (world.hud.phase !== "upgrade") return;
      if (!world.hud.offer.some((u) => u.id === upgradeId)) return;
      if (!has(upgradeId)) world.hud.upgrades = [...world.hud.upgrades, upgradeId];
      // Cannon upgrades don't choose the keeper's path (see buildOffer).
      if (!world.hud.branch && !Object.values(CANNON_UPGRADES).includes(upgradeId)) world.hud.branch = upgradeId;
      if (upgradeId === "seeds") world.hud.seeds += 55;
      syncPrice();
      world.hud.offer = [];
      world.hud.phase = "prep";
      const next = waveAt(cleared, world.hud.alliance, world.hud.night);
      world.hud.blurb = next.blurb;
      world.hud.waveName = next.name;
      world.hud.log = `${UPGRADES[upgradeId].name} locked in for this run.`;
      notify();
    },
    chooseAlliance(choice: Exclude<Alliance, "none">) {
      if (world.hud.phase !== "alliance") return;
      world.hud.alliance = choice;
      writeDoor(choice);
      world.hud.phase = "prep";
      if (choice === "accept") {
        const own = world.hud.hero === "michael";
        world.hud.log = own
          ? "His own men will cover the shelves. He knows how this story ends."
          : "He'll cover the shelves. Mynxi does not like the look of his helmet.";
        world.hud.blurb = "Allied pumpkin cannons will join the next wave. Do not get comfortable.";
      } else if (choice === "betray") {
        // The prize comes early and replaces the act-two upgrade pick (see nextBeat).
        if (has("bounce")) {
          world.hud.seeds += BALANCE.betraySeeds;
          world.hud.log = `You shot first. You already bounce, so he paid in seeds: +${BALANCE.betraySeeds}. No prize after wave 6.`;
        } else {
          world.hud.upgrades = [...world.hud.upgrades, "bounce"];
          world.hud.log = "You shot first. Bouncing melons now, no prize after wave 6, and a grudge.";
        }
        world.hud.blurb = "He is already loading the catapults. The next wave will be personal.";
      } else {
        world.hud.log = "You sent him away. The door shuts. The war stays ordinary, briefly.";
        world.hud.blurb = WAVES[cleared].blurb;
      }
      world.hud.waveName = WAVES[cleared].name;
      notify();
    },
    sellSelected() {
      const sel = world.hud.selected;
      if (sel == null) return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      const tower = world.towers.find((t) => t.id === sel && !t.ally);
      if (!tower) return;
      world.towers = world.towers.filter((t) => t.id !== sel);
      const refund = sellValue(tower.paid);
      cue("sell");
      world.hud.seeds += refund;
      world.hud.selected = null;
      world.hud.log = tower.mods.length
        ? `Cannon sold for ${refund}. The fittings go with it.`
        : `Cannon sold for ${refund} seeds.`;
      syncPrice();
      notify();
    },
    dismissSelection() {
      if (world.hud.selected == null) return;
      world.hud.selected = null;
      syncPrice();
      notify();
    },
    chooseHero(hero: HeroId) {
      if (world.hud.phase !== "select" && world.hud.phase !== "coldopen") return;
      const overflow = world.hud.night === "overflow";
      const door = overflow ? (world.hud.alliance === "none" ? readDoor() : world.hud.alliance) : "none";
      if (overflow && door === "none") {
        world.hud.log = "The chute stays shut until you say how the first night ended.";
        notify();
        return;
      }
      world.towers = [];
      world.enemies = [];
      world.hud.hero = hero;
      world.hud.phase = "poster";
      world.hud.wave = 1;
      const opening = waveAt(0, door, world.hud.night);
      world.hud.waveName = opening.name;
      world.hud.blurb = opening.blurb;
      world.hud.upgrades = [];
      world.hud.offer = [];
      world.hud.branch = null;
      world.hud.alliance = door;
      world.hud.absurdity = 0;
      world.hud.selected = null;
      absurdDrops = 0;
      if (hero === "mynxi") {
        world.hud.seeds = 150;
        world.hud.lives = 12;
        world.hud.maxLives = 12;
        world.hud.log = overflow
          ? "The floor is wet. Her reach still looks down the carpet, including the chute."
          : "First build is 40 seeds. Hers reach farther down the carpet.";
      } else if (hero === "vael") {
        world.hud.seeds = 120;
        world.hud.lives = 11;
        world.hud.maxLives = 11;
        world.hud.log = overflow
          ? "Her shots still slow the line. The wet does not care."
          : "Her shots slow the line. They do not hit harder.";
      } else {
        world.hud.seeds = BALANCE.michaelSeeds;
        world.hud.lives = BALANCE.michaelLives;
        world.hud.maxLives = BALANCE.michaelLives;
        const [kc, kr] = BOARDS[world.hud.map].knight;
        const p = cellCenter(kc, kr);
        world.towers.push({
          id: id(),
          c: kc,
          r: kr,
          x: p.x,
          y: p.y,
          cd: 0.15,
          aim: 0,
          ally: false,
          orange: true,
          kind: "melon",
          mods: [],
          // Free with the hero; valued so it still sells for 35 like before.
          paid: 50,
        });
        world.hud.log = overflow
          ? `His cannon is already set. ${stacksWord(BALANCE.michaelLives)} stacks, and the chute is not his door.`
          : `His cannon is already set. ${stacksWord(BALANCE.michaelLives)} stacks, and the shots hit harder.`;
      }
      if (overflow && door === "accept") {
        placeAllyTowers();
        world.hud.log = "Two household cannons hold the chute. The damp ones live here.";
      } else if (overflow && door === "betray") {
        placeEarlyHusks();
        world.hud.log = "You shot first. Four husks are already on the carpet.";
      } else if (overflow && door === "reject") {
        world.hud.seeds += 45;
        world.hud.log = "You sent him away. The crates were never eaten. +45 seeds.";
      }
      world.hud.newUnlocks = [];
      world.hud.newMaps = [];
      world.hud.saved = true;
      world.hud.setupNote = "";
      world.hud.paused = false;
      world.hud.menu = null;
      if (persistMeta) {
        saveSetup({
          night: world.hud.night,
          map: world.hud.map,
          difficulty: world.hud.difficulty,
          bookmark: world.hud.bookmark,
          hero,
          door,
        });
      }
      if (bm("seedfund")) world.hud.seeds += BOOKMARK_VALUES.seedfund;
      if (bm("sparestack")) {
        world.hud.lives += BOOKMARK_VALUES.sparestack;
        world.hud.maxLives += BOOKMARK_VALUES.sparestack;
      }
      syncPrice();
      notify();
    },
    chooseMap(map: MapId) {
      if (world.hud.phase !== "select" || world.hud.night === "overflow") return;
      if (map === "overflow" || !world.hud.maps.includes(map)) return;
      applyBoard(map);
      world.hud.log = BOARDS[map].blurb;
      notify();
    },
    chooseBuild(kind: TowerKind) {
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      world.hud.build = kind;
      world.hud.log = TOWERS[kind].blurb;
      syncPrice();
      notify();
    },
    openShop() {
      if (world.hud.phase !== "prep" || world.hud.selected == null) return;
      const tower = world.towers.find((t) => t.id === world.hud.selected && !t.ally);
      if (!tower || tower.mods.length >= 2) return;
      const price = roomPrice();
      if (world.hud.seeds < price) return;
      const offer = rollMods(tower.kind, tower.mods);
      if (offer.length === 0) return;
      world.hud.modOffer = offer;
      world.hud.shopFor = tower.id;
      world.hud.phase = "shop";
      world.hud.log = price
        ? `${TOWERS[tower.kind].name}. ${price} seeds, and it stays on this cannon.`
        : `${TOWERS[tower.kind].name}. This one is on the house, and it stays on this cannon.`;
      notify();
    },
    pickMod(modId: ModId) {
      if (world.hud.phase !== "shop" || world.hud.shopFor == null) return;
      const tower = world.towers.find((t) => t.id === world.hud.shopFor && !t.ally);
      const mod = world.hud.modOffer.find((m) => m.id === modId);
      if (!tower || !mod || tower.mods.length >= 2 || tower.mods.includes(modId)) return;
      const price = roomPrice();
      if (world.hud.seeds < price) return;
      world.hud.seeds -= price;
      world.hud.shopVisits += 1;
      tower.mods = [...tower.mods, modId];
      tower.paid += price;
      world.hud.phase = "prep";
      world.hud.modOffer = [];
      world.hud.shopFor = null;
      world.hud.range = towerRange(tower);
      world.hud.log = `${mod.name} fitted. It does not leave this cannon.`;
      record((m) => (m.fittings += 1));
      syncPrice();
      world.hud.range = towerRange(tower);
      notify();
    },
    closeShop() {
      if (world.hud.phase !== "shop") return;
      world.hud.phase = "prep";
      world.hud.modOffer = [];
      world.hud.shopFor = null;
      world.hud.log = "The back room can wait.";
      notify();
    },
    setSpeed(speed: number) {
      if (!SPEEDS.includes(speed)) return;
      world.hud.speed = speed;
      if (persistMeta) writePref(SPEED_KEY, String(speed));
      notify();
    },
    setReduced(on: boolean) {
      world.reduced = on;
      if (on) world.shake = 0;
      if (persistMeta) writePref(REDUCED_KEY, on ? "1" : "0");
      notify();
    },
    nudgeSpeed(dir: -1 | 1) {
      const steps = SPEEDS;
      const at = steps.indexOf(world.hud.speed);
      const next = Math.max(0, Math.min(steps.length - 1, (at < 0 ? 1 : at) + dir));
      world.hud.speed = steps[next];
      notify();
    },
    togglePause() {
      if (world.hud.menu) return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      world.hud.paused = !world.hud.paused;
      notify();
    },
    setDifficulty(id: Difficulty) {
      if (world.hud.phase !== "select") return;
      if (!DIFFICULTIES.some((d) => d.id === id)) return;
      world.hud.difficulty = id;
      notify();
    },
    chooseNight(night: NightId) {
      if (world.hud.phase !== "select") return;
      world.hud.night = night;
      world.hud.waveCount = night === "endless" ? 0 : WAVE_COUNT;
      if (night === "overflow") {
        applyBoard("overflow");
        world.hud.alliance = readDoor();
        world.hud.log =
          world.hud.alliance === "none"
            ? "The returns come up the chute. Say how the first night ended."
            : doorMemory(world.hud.alliance);
      } else {
        if (world.hud.map === "overflow") applyBoard("stacks");
        world.hud.alliance = "none";
        world.hud.log =
          night === "endless"
            ? `No knight, no last wave. Best so far: ${world.hud.endlessBest} waves.`
            : "Choose who holds the stacks.";
      }
      notify();
    },
    setDoor(choice: Exclude<Alliance, "none">) {
      if (world.hud.phase !== "select" || world.hud.night !== "overflow") return;
      world.hud.alliance = choice;
      writeDoor(choice);
      world.hud.log = doorMemory(choice);
      notify();
    },
    ackMemory() {
      if (world.hud.phase !== "memory") return;
      world.hud.phase = "prep";
      const next = waveAt(cleared, world.hud.alliance, world.hud.night);
      world.hud.blurb = next.blurb;
      world.hud.waveName = next.name;
      world.hud.log = doorMemory(world.hud.alliance);
      notify();
    },
    openSetup() {
      if (world.hud.phase !== "coldopen") return;
      world.hud.phase = "select";
      world.hud.log = "Choose who holds the stacks.";
      notify();
    },
    beginNight() {
      if (world.hud.phase !== "poster") return;
      world.hud.phase = "prep";
      notify();
    },
    pickKeeper(hero: HeroId) {
      if (world.hud.phase !== "select" || !HEROES.includes(hero)) return;
      world.hud.hero = hero;
      notify();
    },
    continueRun() {
      if (world.hud.phase !== "coldopen") return;
      if (world.hud.night === "overflow" && world.hud.alliance === "none") {
        world.hud.phase = "select";
        world.hud.log = "The returns come up the chute. Say how the first night ended.";
        notify();
        return;
      }
      api.chooseHero(world.hud.hero ?? DEFAULT_SETUP.hero);
    },
    backToTitle() {
      if (world.hud.phase !== "select") return;
      resetRunState();
      world.hud.phase = "coldopen";
      notify();
    },
    backToSetup() {
      if (world.hud.phase !== "poster") return;
      resetRunState();
      world.hud.phase = "select";
      world.hud.log = "Choose who holds the stacks.";
      notify();
    },
    restartNight() {
      if (world.hud.phase === "coldopen" || world.hud.phase === "select") return;
      const hero = world.hud.hero ?? DEFAULT_SETUP.hero;
      resetRunState();
      world.hud.phase = "select";
      api.chooseHero(hero);
    },
    toTitle() {
      resetRunState();
      world.hud.phase = "coldopen";
      world.hud.log = "The library is closed.";
      notify();
    },
    continueOverflow() {
      if (world.hud.phase !== "victory" || world.hud.night !== "midnight") return;
      const door = world.hud.alliance;
      const hero = world.hud.hero ?? DEFAULT_SETUP.hero;
      world.hud.night = "overflow";
      applyBoard("overflow");
      world.hud.alliance = door === "none" ? readDoor() : door;
      resetRunState();
      world.hud.phase = "select";
      if (world.hud.alliance === "none") {
        world.hud.log = "The returns come up the chute. Say how the first night ended.";
        notify();
        return;
      }
      api.chooseHero(hero);
    },
    tryEndless() {
      if (world.hud.phase !== "victory") return;
      api.reset();
      api.chooseNight("endless");
    },
    openMenu() {
      const p = world.hud.phase;
      if (p === "coldopen" || p === "select" || p === "poster" || p === "victory" || p === "defeat") return;
      if (world.hud.menu) return;
      world.hud.menu = "pause";
      world.hud.paused = true;
      notify();
    },
    closeMenu() {
      if (!world.hud.menu) return;
      world.hud.menu = null;
      world.hud.paused = false;
      notify();
    },
    menuSettings(open: boolean) {
      if (!world.hud.menu) return;
      world.hud.menu = open ? "settings" : "pause";
      notify();
    },
    reset() {
      resetRunState();
      world.hud.phase = "select";
      world.hud.log = "Choose who holds the stacks.";
      notify();
    },
    unlock() {
      /* gesture hook reserved for audio in the component */
    },
    statsOf(towerId: number) {
      const tower = world.towers.find((t) => t.id === towerId);
      return tower ? statsFor(tower) : null;
    },
    setBookmark(id: BookmarkId | null) {
      if (world.hud.phase !== "select" && world.hud.phase !== "coldopen") return;
      if (id && !world.hud.unlocked.includes(id)) return;
      world.hud.bookmark = id;
      if (persistMeta) savePick(id);
      notify();
    },
  };

  const loopTick = (dt: number) => {
    tickFx(dt);
    if (world.hud.phase === "combat") tickCombat(dt);
  };

  (world as World & { step?: (dt: number) => void }).step = loopTick;

  return api;
}

export function stepWorld(world: World, dt: number) {
  const fn = (world as World & { step?: (dt: number) => void }).step;
  fn?.(dt);
}
