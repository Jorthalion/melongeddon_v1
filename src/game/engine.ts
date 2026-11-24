import {
  CELL, BOARDS, baseMap, withLayouts, takesShortcut, boardSize, CANNON_UPGRADES, DIFFICULTIES, STATS, TOWERS, UPGRADES, WAVES, WAVE_COUNT, nightLength, carpetInReach, reachShape,
  BALANCE, DROWSY, softenSlow, flyMiss, stacksWord, buildBoard, buildCost, killReward, hpScaleFor, difficultyHp, buildOffer, CANNON, GLOBAL_RANGE, PASSIVE, HEAVY_WAVE, HEAVY_SEEDS, nextBeat, fittingsFor, refundFor, shopPrice, towerReadout, waveAt,
  type Difficulty, type EnemyKind, type Guard, type HeroId, type MapId,
  type ModId, type NightId, type Phase, type SpawnSpec, type TowerKind, type UpgradeDef, type UpgradeId,
  HEROES, KEEPER_NAMES, KEEPER_START, SIGNATURE, KEEPER_TOWERS, isSignature, TOWER_TYPE, groupOf, TRICK_LEVEL, shelfCells,
  ARMOURS, ARMOUR_TEXT, ARMOUR_VALUES, ARMOUR_LEVEL, ARMOUR_FOR_OATH, DRAGON, BIG_KINDS, ROOST_STAGES, canBeGreat, roostStageFor, type ArmourId, type OathId,
  ASSER_VALUES, carpetAlong,
  nearestOnCarpet, gateStrip, VAEL_VALUES, VAEL_LADDER, vaelLockLine, buildRoutes, assignDoors, carpetInReachAll, nearestSegment, type DoorId,
  assignExits, combineRoutes, EXIT_NAME, HALL, type Exit, type ExitId,
  pathFor, trackCells, type Bay, BASEMENT, deepWave, waterFor, underWater, heightTiles, type Height, ROOM_TOWERS, ROOM_TOWER_KINDS,
  carpetLegs, legOf, legsTouching, bindLeg, besideCarpet, VERGE_NOTE, DEFAULT_TARGET, TARGET_LABEL, type TargetMode, COPY_STEP_KINDS, COPY_HEAVY_KINDS, canCopy,
  FLOOR, floorTiles, floorPace, type FloorTile, COMBO, AFFLICT, hiveCrowd, fittingName, ballistaPierce,
  NATIVES, NATIVE_INFO, waveQueue, trimSpawns, assignNatives, type NativeId, type QueueItem,
  SIEGE, type SiegeVariant,
} from "./rules.ts";
import { GUIDE_KEY } from "../lib/saves.ts";
import { KEEPER_VOICE, openingLine } from "./keeperVoice.ts";
import { STATUS_LOOK } from "./drawStatus.ts";

export * from "./rules.ts";
// Dev only: the open game keeps its world (and its api) across hot updates, so a changed engine or
// rules file would leave it calling old code. Reload the page instead of patching it in place.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
import {
  BOOKMARK,
  BOOKMARK_VALUES,
  ALL_UNLOCKED,
  EMPTY_META,
  backRoomPrice,
  loadMeta,
  loadPick,
  saveMeta,
  savePick,
  unlockedIds,
  unlockedMaps,
  TEST_MAPS,
  lockedTowers,
  TOWER_GOALS,
  type BookmarkId,
  type MetaStats,
} from "./meta.ts";
export * from "./meta.ts";
import {
  emptyProgress,
  levelFor,
  loadProgress,
  maxedProgress,
  normalizeRecord,
  perkFx,
  saveProgress,
  waveXp,
  winXp,
  PERK_LEVELS,
  PERKS,
  type KeeperProgress,
} from "./levels.ts";
export * from "./levels.ts";
import { SLIP_VALUES, cleanSlips, slipXp, type SlipId } from "./slips.ts";
import {
  addNight,
  emptyLedger,
  emptyRunLog,
  emptySave,
  loadAchievements,
  migrate,
  quietContext,
  saveAchievements,
  settle,
  tierSum,
  type Ledger,
  type RunLog,
} from "./achievements.ts";
export * from "./slips.ts";
import {
  ALL_ROOMS,
  ROOM,
  affordable,
  allowedCosmetics,
  nightFragments,
  openKeepers,
  restoreText,
  roomFor,
  type Cosmetics,
  type RoomId,
} from "./catalogue.ts";
export * from "./catalogue.ts";

interface Waypoint {
  x: number;
  y: number;
}

/** Act three: how far (px) a gall rides behind its host along the carpet. */
const CANNON_GALL_GAP = 36;

interface Enemy {
  id: number;
  kind: EnemyKind;
  /** A board with doors: the route it walks (an index into world.routes; 0 if unset). */
  route?: number;
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
  /** A plain slow with no frost (the Organ's chord, Barbed Spears, a Quack-Liber ki blast; Cold rind with combos off): "dazed". */
  chill: number;
  /** Vaelithra's sleeping draught: seconds left drowsy (slowed; fire wakes it). Never frost. */
  drowsy?: number;
  freeze: number;
  /** Foot of the Law: seconds left pinned under the foot. Unlike freeze, husks feel it. */
  stomped?: number;
  /** The Flooded Basement: this fruit has been iced in once (the note floats only the first time). */
  icedIn?: boolean;
  guard: Guard;
  shell: number;
  split: boolean;
  raw: boolean;
  bread: boolean;
  reverse: boolean;
  /** Ink Well mark: seconds left, and the damage multiplier while marked. */
  ink?: number;
  inkMul?: number;
  /** Honeyed Heel: seconds left sticky (takes more damage from everything). */
  honeyed?: number;
  /** Bookworm burrow: seconds left, and damage per second. */
  worm?: number;
  wormDps?: number;
  /** The tower whose bookworm is burrowing (for its damage count). */
  wormBy?: number;
  /** Act three. Pit: stone, shrugs off splash, burn and pulp. Gall: a rider healing the enemy `mends` while that one lives. Borrower: takes seeds at the door instead of a stack. */
  /** Instant Quackmission: seconds left walking back the way it came, and the world time it can be driven again. */
  driven?: number;
  driveReady?: number;
  /** Pipe Organ: the world time a crescendo can stop this fruit again (so many organs can't chain their stops). */
  organReady?: number;
  pit?: boolean;
  gall?: boolean;
  mends?: number;
  borrower?: boolean;
  /** A room's own fruit (the Sorting Room, the Greenhouse, the Bell Tower). See NATIVES. */
  native?: NativeId;
  /** Parcel: still in its paper (direct hits do half). */
  wrapped?: boolean;
  /** A Bookworm: the bay it's walking through (-1: none), to know when it walks out. */
  bay?: number;
  /** Fell out of a Parcel: pays no seeds. */
  contents?: boolean;
  /** Sprout: seconds spent on beds so far. */
  bedTime?: number;
  /** Creeping Squash: seconds until it lays the next vine. */
  vineCd?: number;
  /** A sprout that just grew into a melon (seconds left of its pop). */
  grew?: number;
  /** The Siege, geese: a gosling (its line, and whether it leads), the Matriarch (seconds to her next rally), honked already, seconds left rallied. */
  gosling?: boolean;
  line?: number;
  leader?: boolean;
  matriarch?: boolean;
  rallyCd?: number;
  honked?: boolean;
  rallied?: number;
  /** The Siege, cats: Nine Lives still to use (Private Whiskers), in a box, a paratrooper (seconds left coming down), a tank,
   * General Mittens, and carrying her extra health. */
  lives9?: boolean;
  boxed?: boolean;
  para?: boolean;
  descend?: number;
  tank?: boolean;
  general?: boolean;
  mittened?: boolean;
  /** Seconds left standing still: a gosling whose leader fell, or a goose and a cat in a fight. */
  halt?: number;
  /** Seconds left in a fight with a goose or a cat (it won't start another until this one is over). */
  brawl?: number;
  /** Anti-Geese Protocol: px left to walk back in a panic (geese only). */
  panic?: number;
  /** A boss before its night's last wave: a mini-boss with much less health (BALANCE.miniBossHp). */
  mini?: boolean;
  /** Status combos (COMBO). Frost: 0–3 stacks, and seconds until the next one drains. Iced: seconds left held by a Freeze cannon's hit. */
  frost?: number;
  frostT?: number;
  iced?: number;
  /** Fire, then ice: seconds its fire stays out. Poison is flammable: seconds burning hotter. */
  doused?: number;
  blaze?: number;
  /** Afflictions: stings (Fly Hive), poison (Cauldron puddles) and a fire of its own (wildfire); stacks, seconds left, and who did it. */
  sting?: number;
  stingT?: number;
  stingBy?: number;
  poison?: number;
  poisonT?: number;
  poisonCd?: number;
  poisonBy?: number;
  poisonDps?: number;
  burnT?: number;
  burnDps?: number;
  burnBy?: number;
  /** It burned while poisoned: the poison is spent when the fire goes out. */
  flamed?: boolean;
  /** Wildfire: progress toward setting the next neighbour alight (1 = now). */
  wildAcc?: number;
  /** Drawing only: what stopped it, when `freeze` is a stun rather than ice (stars for the Bell, notes for the Organ). */
  stunBy?: "bell" | "organ" | "sleep";
  /** Vaelithra: hits taken while drowsy (the third puts it to sleep), and seconds before it can nod off again. */
  dozeHits?: number;
  restT?: number;
  /** Vaelithra: a Nightmare went off this sleep; a report is filed (seconds left); Fumes' next doze hit. */
  nightmared?: boolean;
  reportT?: number;
  fumeCd?: number;
  /** Drawing only: seconds it has burned lately (char spots build up), seconds since it was last healed, and the trail timer. */
  charred?: number;
  healT?: number;
  markCd?: number;
}

/** Drawing only: a status trail on the carpet (scorch, green drip, honey print, frost), a shatter's frost star or a thermal shock's steam. */
export interface StatusMark {
  x: number;
  y: number;
  kind: "scorch" | "drip" | "print" | "frost" | "star" | "steam";
  life: number;
  max: number;
  /** Which way it was walking (honey prints), and a fixed random number for its shape. */
  rot: number;
  seed: number;
}

/** One group of identical enemies in a wave preview, in spawn order: what one of them will really have. */
export interface WaveGroup {
  kind: EnemyKind;
  guard: Guard;
  split: boolean;
  raw: boolean;
  chute: boolean;
  pit: boolean;
  gall: boolean;
  borrower: boolean;
  native: NativeId | null;
  siege: SiegeVariant | null;
  leader: boolean;
  boss: boolean;
  mini: boolean;
  count: number;
  hp: number;
  speed: number;
  /** A board with doors: the door this group walks in by. */
  door?: DoorId;
  /** A board with exits (the Hall of Doors): the exit this group leaves by. */
  exit?: ExitId;
}

/** What a wave brings (api.wavePreview / api.comingUp). */
export interface WavePreview {
  /** 0-based wave index. */
  index: number;
  name: string;
  groups: WaveGroup[];
  /** What can't be counted up front (mid-wave extras). */
  notes: string[];
  /** Sum of health × speed (bosses and tanks × their leak cost), its 1–5 rank tonight, and against the wave before. */
  threat: number;
  pips: number;
  trend: "up" | "down" | null;
  /** Short warnings, most important first (at most three). */
  flags: string[];
  /** Paratrooper drop points this wave uses. */
  drops: number[];
}

/** A not-yet-built tower's numbers (api.previewStats). */
export interface PreviewStats {
  dmg: number;
  range: number;
  interval: number;
  /** Shelf Ballista: fruit the spear goes through. */
  pierce?: number;
  lit?: boolean;
  quick?: boolean;
  base: { dmg: number; range: number; interval: number };
  why: { dmg: string[]; range: string[]; interval: string[] };
}

/** What the Bookworm's worms bite at full strength: pumpkins, Karl and (status combos) anything with three stingers. The rest take `CANNON.wormOther` of it. */
const wormFavours = (e: Enemy) => e.kind === "pumpkin" || e.kind === "karl" || (COMBO.on && (e.sting ?? 0) >= AFFLICT.wormStings);
/** Shelled (until cracked), husked or damp. */
const armoured = (e: Enemy) => (e.guard === "rind" && e.shell > 0) || e.guard === "husk" || e.guard === "damp";
const standingIn = (e: Enemy, pools: Pool[], is: (p: Pool) => boolean) => pools.some((p) => is(p) && Math.hypot(e.x - p.x, e.y - p.y) < p.r);

/**
 * "First, not affected" (`fresh`): whether a fruit hasn't got this tower's effect yet. A new status tower
 * adds one line here. Kinds not listed treat every fruit as fresh, so `fresh` is the same as First for them.
 */
export const FRESH_TEST: Partial<Record<TowerKind, (e: Enemy, pools: Pool[], tower: Tower) => boolean>> = {
  fire: (e, pools) => !standingIn(e, pools, (p) => p.hot),
  freeze: (e) => e.freeze <= 0 && (e.stomped ?? 0) <= 0 && (e.halt ?? 0) <= 0,
  still: (e, pools) => !standingIn(e, pools, (p) => !p.hot && !p.toxic && !p.honey),
  ink: (e) => (e.ink ?? 0) <= 0.5,
  // Pumpkins and Karl, and (status combos) anything with three stingers in it.
  bookworm: (e) => wormFavours(e) && (e.worm ?? 0) < 1,
  peeler: (e) => armoured(e),
  honey: (e) => (e.honeyed ?? 0) <= 0,
  cauldron: (e, pools) => !standingIn(e, pools, (p) => Boolean(p.toxic)),
  // The Cold rind fitting: one with no frost yet (combos off: not chilled yet).
  spitter: (e, _p, t) => !t.mods.includes("chill") || (COMBO.on ? (e.frost ?? 0) < 1 : e.chill <= 0),
};

/**
 * How much `tower` wants `e` under `mode` (higher wins; a tie goes to the one furthest along).
 * `prog` is how far along the carpet it is, `d` its distance from the tower.
 */
export function targetScore(mode: TargetMode, tower: Tower, e: Enemy, prog: number, d: number, pools: Pool[]) {
  switch (mode) {
    case "first":
      return prog;
    case "last":
      return -prog;
    case "strong":
      return e.hp;
    case "weak":
      return -e.hp;
    case "close":
      return -d;
    case "armour":
      return (armoured(e) ? 1e9 : 0) + prog;
    case "boss":
      // The Brass Telescope's own order: a boss, then armour, then the toughest.
      if (tower.kind === "scope") return (e.boss ? 2e6 : 0) + (armoured(e) ? 1e6 : 0) + e.hp;
      return (e.boss ? 1e9 : 0) + e.hp;
    case "fresh": {
      const test = FRESH_TEST[tower.kind];
      // The Bookworm: an unwormed pumpkin or Karl first, then any unwormed fruit, then the front one.
      if (tower.kind === "bookworm") return (test?.(e, pools, tower) ? 2e9 : 0) + ((e.worm ?? 0) < 1 ? 1e9 : 0) + prog;
      return (!test || test(e, pools, tower) ? 1e9 : 0) + prog;
    }
  }
}

/** Towers that work on an area rather than aiming a shot: they can see a Box Cat (and their puddles, chords and stamps knock the box off). */
// The Cauldron and the Quack-Liber lob area shots (a puddle, a rocket's burst), so they see one too.
/** Towers that reach a Bookworm burrowed in the shelves: the Box Cat's seers, and the lobs and fire. */
export const BURROW_SEERS: TowerKind[] = ["mortar", "trebuchet", "fire"];
export const BOX_SEERS: TowerKind[] = ["still", "organ", "bell", "stomp", "lionblade", "honey", "bombard", "geese", "cauldron", "quackliber"];

interface Tower {
  id: number;
  c: number;
  r: number;
  x: number;
  y: number;
  cd: number;
  aim: number;
  orange: boolean;
  kind: TowerKind;
  mods: ModId[];
  /** Reserve Desk: seeds banked so far (paid out on sale or at a win, eaten by a passing melon). */
  bank?: number;
  /** The Copycat: the copy it is running right now (fires in its place), and the cannon it copies. */
  copy?: Tower;
  copyFrom?: number;
  /** This tower is a Copycat's copy (heavy cannons hit for `CANNON.copyHeavyDmg`). */
  copied?: boolean;
  /** Pipe Organ: chords played (every third is a crescendo). */
  chord?: number;
  /** Unstoppered: the extra tiles it has spilled onto, each dripping on its own timer. */
  spill?: Array<{ c: number; r: number; x: number; y: number; cd: number }>;
  /** Seeds spent on this tower (build + shop mods). Sell refunds a share of it. */
  paid: number;
  /** Waves cleared when it was built (the History Lectern grows with each wave since). */
  born?: number;
  /** The Compact Stacks: a carpet-side tower whose carpet rolled away; it does nothing until carpet is beside it again. */
  idle?: boolean;
  /** Orrery: the planets' current angle and orbit radius. */
  spin?: number;
  orbit?: number;
  /** Orrery: per planet and fruit, the time it may hit again. */
  orbitHits?: Map<string, number>;
  /** What it aims at among the fruit in reach (unset = its kind's recommended mode, DEFAULT_TARGET). */
  target?: TargetMode;
  /** The fruit it aimed at last tick (drawn with a ring while the tower is selected). */
  aimAt?: number;
  /** Quack-Liber: ki blast fired (Ground Pound counts them), and seconds left of Quack-hameha. */
  volley?: number;
  rally?: number;
  /** Gourd Gate: the carpet point its portcullis drops on (with how far along the carpet that is), seconds it stays down, and seconds since it dropped. */
  gate?: { x: number; y: number; along: number; total: number; seg?: number };
  /** The Post (pamphlet): its straight (index into carpetLegs), whether it's armed, each fruit's place along the carpet last tick, and the shockwave's time left. */
  leg?: number;
  armed?: boolean;
  prevAlong?: Record<number, number>;
  blast?: number;
  gateDown?: number;
  gateAge?: number;
  /** Lion Blade: a lost stack rallied it; its next swing hits harder (they don't add up). */
  bladeRally?: boolean;
  /** Lion Blade: it was standing when this wave started, so it mends when the wave is cleared. */
  mendReady?: boolean;
  /** Anti-Geese Protocol: fire on its own (auto, the default) or only when Engage is pressed (manual). */
  trigger?: "auto" | "manual";
  /** Anti-Geese Protocol: the world time it has recharged (see `CANNON.geeseRecharge`). */
  geeseReady?: number;
  /** A Honker honked close by: this tower skips its next shot. */
  honked?: boolean;
  /** Sir Michael's Great tower: the second tile it covers (it stands between the two). */
  great?: { c: number; r: number };
  /** The Dragon's Roost: waves of growth so far (DRAGON.roostGrow), and whether it stood through the whole of this wave. */
  grown?: number;
  roostReady?: boolean;
}

/** A trick shot on a curved path that passes through fruit (Boomerang Bookend, Paper Plane, Serpent Quill, Rolling Globe). */
export interface Flyer {
  id: number;
  kind: "boomerang" | "plane" | "quill" | "globe" | "sheet";
  /** Globe and sheet: the route of the fruit it was aimed at (they roll back along it). */
  route?: number;
  /** Printing Press sheet: px left to slide, and how long the ink it leaves lasts. */
  left?: number;
  inkTime?: number;
  /** Rolling Globe: where it lands, and the carpet waypoint it is rolling toward (toward the entrance). */
  lx?: number;
  ly?: number;
  wp?: number;
  /** Rolling Globe: true once it has landed and is rolling. */
  rolling?: boolean;
  x: number;
  y: number;
  /** Boomerang: where it was thrown from, the throw direction, distance, loop width and side. */
  ox: number;
  oy: number;
  ux: number;
  uy: number;
  dist: number;
  width: number;
  side: number;
  /** Seconds in the air, and how long it flies. */
  t: number;
  dur: number;
  /** Plane: heading in radians. */
  heading: number;
  dmg: number;
  /** Boomerang: fruit hit on this pass (0 out, 1 back). Plane: fruit and when they may be hit again. */
  hits: Map<number, number>;
  /** Recent positions, for the curved trail. */
  trail: Array<{ x: number; y: number }>;
  /** The tower that threw it (for its damage count). */
  owner?: number;
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
  orange: boolean;
  splash: number;
  element: "shot" | "fire" | "ice" | "mortar" | "seed" | "fly" | "ink" | "peel" | "worm" | "potion" | "vial";
  /** Upgrade on-hit effects (Juicy, Splatter, Electric) only fire from the classic cannons. */
  procs: boolean;
  /** Brass Telescope: ignores shells, husks and damp. */
  pierce?: boolean;
  /** The tower that fired it (for its damage count). */
  owner?: number;
  inkTime?: number;
  inkMul?: number;
  wormDps?: number;
  splashRatio: number;
  chill: number;
  freezeExtra: number;
  fireLife: number;
  fireBurn: number;
  /** Damage kept on each bounce (Card Catalogue chains lose some; plain bounces keep it all). */
  bounceRatio?: number;
  /** Pumpkin Trebuchet: push fruit this far back along the carpet. */
  knock?: number;
  /** Harvest Bombard: the giant pumpkin (its own hit, splash, shove and fire). */
  bombard?: boolean;
  /** Fruit this shot has killed so far, its chains included (Chain Reaction). */
  kills?: number;
  /** Quack-Liber rocket: everything in the burst is slowed this long (s); Blinded by the Light makes the target sticky this long (s); Ground Pound leaves a patch. */
  splashChill?: number;
  cover?: number;
  lock?: boolean;
}

interface Pool {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  hot: boolean;
  burn: number;
  /** R&D Cauldron puddle: damage per second to anything in it (it also slows). */
  toxic?: number;
  /** Honeyed Heel footprint: sticky (slows even husks), the way it points, and the tower that left it. */
  honey?: boolean;
  rot?: number;
  owner?: number;
  /** An explosion spread this puddle once already. */
  grown?: boolean;
  /** An explosion on this fire patch: seconds left burning harder. */
  flare?: number;
  /** Ground Pound (Quackarot): drawn as a cracked crater, not a puddle. */
  crater?: boolean;
  /** Vaelithra's own puddle (the Cauldron's or Unstoppered's): Deep sleep and Fumes work in it. */
  vael?: boolean;
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

/** Foot of the Law: the foot coming down on a spot of carpet. */
export interface Stomp {
  x: number;
  y: number;
  life: number;
  max: number;
}

/** Expanding rings (bell shush, compost payout). */
export interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  color: string;
  /** Area hit: a soft filled circle under the ring, so the splash area reads at a glance. */
  fill?: boolean;
}

/** A juice stain left on the floor where a fruit popped. */
export interface Stain {
  x: number;
  y: number;
  r: number;
  color: string;
  life: number;
  max: number;
  /** Fixed per stain so its droplets don't jump around between frames. */
  seed: number;
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
  /** Font size in px (default: the drawer's usual size). */
  size?: number;
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
  /** Sir Michael's armour for this night (null until he puts one on at the intro; always null for other keepers). */
  armour: ArmourId | null;
  /** Sir Michael's Dragon's Hoard: seeds saved for big things (Gate, Roost, feeding it, Great towers). 0 for everyone else. */
  hoard: number;
  /** Sir Michael's In the Zone: extra damage on his big towers right now (0.1 = +10%). */
  zone: number;
  /** The Dragon's Roost was fed this break (once between waves). */
  roostFed: boolean;
  branch: UpgradeId | null;
  map: MapId;
  build: TowerKind;
  /** Back-room upgrades bought tonight, for any tower kind. */
  shopVisits: number;
  /** The back-room upgrades each tower kind has tonight. Every tower of that kind has them, built now or later. */
  fitted: Partial<Record<TowerKind, ModId[]>>;
  /** The back-room side tab: the tower kind it is showing, or null when it is closed. */
  workshop: TowerKind | null;
  /** The back room: rings to draw while an upgrade is hovered, each tower's reach now and with it. */
  shopRings: Array<{ x: number; y: number; now: number; next: number }>;
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
  /** The Overflow: the current or next wave sends fruit up the chute (they walk the carpet backwards). */
  chuteWave: boolean;
  /** Room fruit seen so far tonight (each logs a line the first time; the room's tip shows once any has come). */
  nativesSeen: NativeId[];
  /** The Siege is open on Setup (the Overflow has been won at least once). */
  siegeOpen: boolean;
  /** The Siege: drop points the current or next wave lands paratroopers on (they glow). */
  dropWave: number[];
  /** The Siege: goose-and-cat fights tonight, and whether a paratrooper drop has started (for the one-time tips). */
  feuds: number;
  /** Status combos seen tonight (for their one-time tips): "shatter", "thermal", "mixed", "contagion". */
  comboTips: string[];
  dropSeen: boolean;
  /** Quack-Liber speed-up reach in px for the run in play (perks can widen it), for drawing it. */
  quackAura: number;
  /** Quackarot is golden (Over Nine Thousand Quacks): seconds left; every tower fires faster meanwhile. */
  golden: number;
  /** The Hall of Doors: the exit the signpost shuts for the next wave (null: none). Turned in prep, reset each wave. */
  shutExit: ExitId | null;
  /** The Compact Stacks: each bay's open aisle (a row), whether a crank was turned this break, and bays jammed this break. */
  aisles: number[];
  cranked: boolean;
  jammed: number[];
  /** The Flooded Basement: the water level now (0–3, a copy of World.water), and whether a Drain Gourd has plugged the drain (the water stays at 1 through the break). */
  water: number;
  plugged: boolean;
  /** Tag Team (Quackarot's perk): the line between two Quack-Libers slows fruit, so it's drawn crackling. */
  tagTeam: boolean;
  /** Anti-Geese Protocol went off this wave: it can't be rebuilt until the wave is over. */
  geeseSpent: boolean;
  /** Quackarot's power level: kills toward the Quack-Liber's full-power blast (`CANNON.quackKiNeed` fills it). */
  ki: number;
  /** Ooze's Copycat was put down this wave: free, so only once a wave (a sold one can't be rebuilt until the wave is over). */
  copycatPlaced: boolean;
  /** Asser's Sisu right now, in percent (0 for everyone else). */
  sisu: number;
  /** Keeper levels: XP and perk picks for every keeper. */
  keepers: KeeperProgress;
  /** The keeper's XP when this run started, and the XP earned in it. */
  xpStart: number;
  xpRun: number;
  /** The Overflow: late slips taken for this night (harder, more XP). */
  slips: SlipId[];
  /** Developer mode is on (everything unlocked; stats, bests and XP are not saved). */
  dev: boolean;
  /** The playing keeper's level when this night started (trick cannons open with it). */
  runLevel: number;
  /** Keeper towers not unlocked yet (see TOWER_GOALS). */
  lockedTowers: TowerKind[];
  /** The Heavy tab opens at wave 6, or once you have held 200 seeds tonight. */
  heavyOpen: boolean;
  /** Vaelithra's ladder: how many of her three later towers are open tonight, and fully upgraded towers on the board now. */
  vaelOpen: number;
  fullyUpgraded: number;
  /**
   * Dr. Samodovol's shelves: the "Doctor's pick" on the current shelf, an extra real upgrade from
   * further along the shelves (two with Second Opinion). Empty for everyone else.
   */
  pickCards: UpgradeId[];
  /** Every card taken this run, in pick order (`pick`: it was the Doctor's pick), for the checkout card. */
  cardPicks: Array<{ id: UpgradeId; pick: boolean }>;
  /** The checkout card (everything shaping this run) is open. */
  checkout: boolean;
  /** Grand Catalogue: achievements earned (id -> when), the lifetime ledger, and the ones earned this night. */
  shelves: Record<string, number>;
  ledger: Ledger;
  newShelves: string[];
  /** Grand Catalogue: rooms restored, fragments in hand and earned in all, keepers still locked, cosmetics in use. */
  rooms: RoomId[];
  fragments: number;
  fragmentsEarned: number;
  lockedKeepers: HeroId[];
  cosmetics: Cosmetics;
  /** What the night just ended paid, part by part (achievements included), and a room it can now afford. */
  nightFragments: Array<{ label: string; n: number }>;
  canRestore: RoomId | null;
  /** One-time note on the Title after the move to the Grand Catalogue. */
  catalogueNote: string;
  /** Tower kinds placed at least once this night (Vaelithra's first-of-a-kind premium). */
  builtKinds: TowerKind[];
  /** Setup has two pages: who holds the stacks, then the night (room, difficulty, bookmark, perks). */
  setupPage: "who" | "night";
  /** The guided first night: the step the player is on, or null when no guide is running. */
  guide: GuideStep | null;
  /** This night is Mynxi's tutorial (her tips carry on after the lessons). */
  tutorial: boolean;
  /** The guided first night is finished or skipped, so Setup is open. */
  guideDone: boolean;
}
/**
 * Mynxi's tutorial: the guided first night. Talk steps (GUIDE_TALK) wait for Next; the rest wait
 * for the player to do something: build a Damage cannon, build a Control or Support tower, start
 * the wave, take an upgrade card after wave 1, and open the back room before wave 2. The wave
 * can't start while a step before it is open. Leaving the back room opens Setup for good.
 */
export type GuideStep =
  | "welcome"
  | "carpet"
  | "seeds"
  | "damage"
  | "range"
  | "support"
  | "tabs"
  | "start"
  | "speed"
  | "combat"
  | "upgrade"
  | "backroom"
  | "sell";
export const GUIDE_STEPS: GuideStep[] = [
  "welcome",
  "carpet",
  "seeds",
  "damage",
  "range",
  "support",
  "tabs",
  "start",
  "speed",
  "combat",
  "upgrade",
  "backroom",
  "sell",
];
/** Steps where Mynxi only talks: the player presses Next (speed also moves on when the speed changes). */
export const GUIDE_TALK: GuideStep[] = ["welcome", "carpet", "seeds", "range", "tabs", "speed", "sell"];
/** Steps that hold the wave until they're done. */
export const GUIDE_HOLDS: GuideStep[] = ["welcome", "carpet", "seeds", "damage", "range", "support", "tabs", "backroom"];

export function readGuideDone(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) === "done";
  } catch {
    return false;
  }
}

export function writeGuideDone() {
  try {
    localStorage.setItem(GUIDE_KEY, "done");
  } catch {
    /* ignore */
  }
}

/** Developer mode: everything unlocked, nothing saved over the real progress. */
const DEV_KEY = "melongeddon-dev";
/** Seeds the developer button adds. */
export const DEV_SEEDS = 500;

export function readDev(): boolean {
  try {
    return localStorage.getItem(DEV_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDev(on: boolean) {
  try {
    if (on) localStorage.setItem(DEV_KEY, "1");
    else localStorage.removeItem(DEV_KEY);
  } catch {
    /* ignore */
  }
}

const BEST_KEY = "melongeddon-best-wave";
const ENDLESS_BEST_KEY = "melongeddon-endless-best";
/** The choices behind the last night started, so "same again" is one press. */
export interface SetupRecord {
  night: NightId;
  map: MapId;
  difficulty: Difficulty;
  bookmark: BookmarkId | null;
  hero: HeroId;
  /** Overflow late slips. */
  slips?: SlipId[];
}

const SETUP_KEY = "melongeddon-setup";
const NIGHTS: NightId[] = ["midnight", "overflow", "siege", "endless"];

export const DEFAULT_SETUP: SetupRecord = {
  night: "midnight",
  map: "stacks",
  difficulty: "normal",
  bookmark: null,
  hero: "mynxi",
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
 * `needsDoor` is always false (there is no door to answer any more). Kept for callers.
 */
export function validateSetup(
  saved: Partial<SetupRecord> | null | undefined,
  have: { maps: MapId[]; unlocked: BookmarkId[]; keepers?: HeroId[]; siege?: boolean },
): { setup: SetupRecord; notes: string[]; needsDoor: boolean } {
  const s = saved ?? {};
  const notes: string[] = [];
  let night = NIGHTS.includes(s.night as NightId) ? (s.night as NightId) : DEFAULT_SETUP.night;
  if (night === "siege" && have.siege === false) {
    notes.push("The Siege opens once you win the Overflow, so this starts on Midnight.");
    night = "midnight";
  }
  let hero = HEROES.includes(s.hero as HeroId) ? (s.hero as HeroId) : DEFAULT_SETUP.hero;
  if (have.keepers && !have.keepers.includes(hero)) {
    notes.push(`${KEEPER_NAMES[hero].name} is locked until ${roomFor("keeper", hero)?.name ?? "their room"} is restored, so ${KEEPER_NAMES.mynxi.name} holds the stacks.`);
    hero = "mynxi";
  }
  const difficulty = DIFFICULTIES.some((d) => d.id === s.difficulty) ? (s.difficulty as Difficulty) : DEFAULT_SETUP.difficulty;
  let map: MapId = DEFAULT_SETUP.map;
  if (night === "overflow") map = "overflow";
  else if (night === "siege") map = "courtyard";
  else if (s.map && s.map !== "overflow" && s.map !== "courtyard" && s.map in BOARDS) {
    if (have.maps.includes(s.map)) map = s.map;
    else notes.push(`${BOARDS[s.map].name} is locked, so this starts in ${BOARDS.stacks.name}.`);
  }
  let bookmark: BookmarkId | null = null;
  if (s.bookmark && s.bookmark in BOOKMARK) {
    if (have.unlocked.includes(s.bookmark)) bookmark = s.bookmark;
    else notes.push(`${BOOKMARK[s.bookmark].name} is locked, so no bookmark is equipped.`);
  }
  const slips = cleanSlips(s.slips);
  const setup: SetupRecord = { night, map, difficulty, bookmark, hero };
  if (slips.length) setup.slips = slips;
  return { setup, notes, needsDoor: false };
}

/** Shot speed in px per second (homing, so it only has to outlive the trip). */
const SHOT_SPEED = 280;

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
export type SfxKind = "fire" | "pop" | "bossPop" | "leak" | "build" | "sell" | "wave" | "clear" | "victory" | "defeat" | "boss" | "golden" | "creak" | "rumble" | "slosh";

/** The Flooded Basement: is this tile under water now? A Sump Pump keeps its own tile and the eight round it dry. */
export function floodedTile(world: Pick<World, "water" | "heights" | "towers">, c: number, r: number) {
  if (world.water <= 0) return false;
  const h = world.heights.get(`${c},${r}`);
  if (!h || !underWater(h, world.water)) return false;
  return !world.towers.some((t) => t.kind === "pump" && Math.abs(t.c - c) <= 1 && Math.abs(t.r - r) <= 1);
}

/** What turning a crank would do (api.crankPreview): whether it can turn, the path length before and after, the carpet-side towers that would go idle, and the carpet tiles the towers reach before and after. */
export interface CrankPreview {
  ok: boolean;
  why: string;
  from: number;
  to: number;
  idle: number[];
  cover: number;
  coverAfter: number;
  /** The new carpet's corners, for the ghost. */
  corners: Array<[number, number]>;
}
export interface Sfx {
  kind: SfxKind;
  tower?: TowerKind;
}

export interface World {
  hud: Hud;
  sfx: Sfx[];
  /** What happened in this night so far, for achievements (reset every run, never saved). */
  runLog: RunLog;
  hover: { c: number; r: number } | null;
  anim: number;
  enemies: Enemy[];
  towers: Tower[];
  shots: Shot[];
  pools: Pool[];
  sparks: Spark[];
  lines: Line[];
  rings: Ring[];
  stomps: Stomp[];
  /** Carpet cells the Unstoppered's spills have soaked ("c,r"), for the rest of the night. */
  wet: Set<string>;
  flyers: Flyer[];
  stains: Stain[];
  /** Drawing only: status trails and combo marks on the carpet (capped at STATUS_LOOK.maxMarks, cleared with the wave). */
  marks: StatusMark[];
  bits: Bit[];
  floaters: Floater[];
  shake: number;
  /** Vaelithra's Lights Out: seconds the board stays dimmed. */
  lightsOut?: number;
  pathCells: Set<string>;
  /** Tiles a diagonal stretch of carpet half-covers ("c,r"): nothing can be built there, and nothing else treats them as carpet. */
  vergeCells: Set<string>;
  /** Belts, stairs and growth beds on the carpet, by "c,r" (set with the map). */
  floors: Map<string, FloorTile>;
  /** The Bell Tower: seconds until the clock strikes (counted during waves), and seconds the towers stay quiet. */
  bell: { next: number; quiet: number } | null;
  /** Creeping Squash vines on the carpet ("c,r"): seconds left, and the squash that laid them. They heal like a bed. */
  vines: Map<string, { life: number; by: number; max: number }>;
  /** The Siege: paratrooper landings on the way (drop point index, seconds until they land), and goose-and-cat fights to draw. */
  landings: Array<{ drop: number; left: number }>;
  brawls: Array<{ x: number; y: number; life: number; max: number }>;
  /** Bookshelf cells: part of the room, so nothing can be built there. */
  shelfCells: Set<string>;
  points: Waypoint[];
  /** Corner pieces; `door`: a junction where that door's carpet comes in (no corner piece while it's open). */
  turns: Array<{ c: number; r: number; rot: number; door?: DoorId }>;
  /** What fruit walk: one route per door (the Rotunda), else just `points` (see routeOf). */
  routes: Waypoint[][];
  /** The carpet that's open, each tile once: each open door's own carpet, then the trunk (one-door boards: [points]). */
  segments: Waypoint[][];
  /** A board with doors: each door, whether it's open yet, its own tiles, and whether its lamp is lit. */
  doors: Array<{ id: DoorId; open: boolean; cells: Set<string>; lit: boolean; seg: Waypoint[] }>;
  /** A board with exits (the Hall of Doors): each exit, its cost, its own tiles and carpet, and whether its lamp is lit. */
  exits: Array<{ id: ExitId; cost: Exit["cost"]; bossOnly: boolean; cells: Set<string>; lit: boolean; seg: Waypoint[] }>;
  /** Route i's door and exit (indexes into doors and exits). One-route boards: [0] and []. */
  routeDoor: number[];
  routeExit: number[];
  /** The trunk: the carpet every door joins and every exit leaves (a one-door board: its carpet). */
  trunk: Waypoint[];
  /** The Compact Stacks: tiles a crank could put carpet on, and the cranks (nothing is built there). Empty elsewhere. */
  trackCells: Set<string>;
  /** Bookworm Queen cocoons: where, which carpet, and seconds until two Bookworm Gourds hatch. */
  cocoons: Array<{ x: number; y: number; wp: number; route?: number; left: number }>;
  /** A crank turning (for the slide): the bay, seconds left, and which way the aisle moved. */
  crankAnim: { bay: number; left: number; dir: number } | null;
  /** The Flooded Basement: each low or middle tile's height ("c,r"; others are high; empty on other boards). */
  heights: Map<string, Height>;
  /** The Flooded Basement's water level: 0 dry, 1 the low floor floods, 2 deeper, 3 the middle floor floods too. */
  water: number;
  /** Seconds left of the water spreading after it rises (drawing). */
  waterRise: number;
  /** Ice sheets a Freeze hit made on the water: where, how wide, seconds left, and how long each fruit has been held (bosses let go early). */
  ice: Array<{ x: number; y: number; r: number; left: number; max: number; held: Map<number, number>; noted?: boolean }>;
  /** The crank under the pointer in prep, and what turning it would do (drawn as a ghost path and a note). */
  crankHint: (CrankPreview & { bay: number }) | null;
  /** Board size in cells and world pixels (set with the map). */
  cols: number;
  rows: number;
  w: number;
  h: number;
  reduced: boolean;
}

export interface WorldOptions {
  /** Use these stats instead of the saved ones, and never save (simulator, tests). */
  meta?: MetaStats;
  /** Start from this saved setup instead of the stored one (tests). */
  setup?: Partial<SetupRecord> | null;
  /** Use these keeper levels instead of the saved ones, and never save them (simulator, tests). */
  keepers?: KeeperProgress;
  /** Developer mode (default: the saved switch, for the real game only). */
  dev?: boolean;
  /** The guided first night is still to do (default: from storage in the real game; done in tests and the simulator). */
  guide?: boolean;
  /** Every trick cannon can be built whatever the keeper's level (simulator, tests). */
  allTricks?: boolean;
  /** Grand Catalogue rooms restored (tests). Default: every room in tests, the simulator and dev mode; the save in the real game. */
  rooms?: RoomId[];
  /** Fragments in hand to start with (tests). */
  fragments?: number;
  /** The lifetime ledger to start from when nothing is saved (tests). */
  ledger?: Ledger;
  /** The Siege is open whatever the ledger says (simulator, previews). */
  siegeOpen?: boolean;
}

export function createWorld(
  onChange: () => void,
  options: WorldOptions = {},
): {
  world: World;
  pointer: (x: number, y: number, kind: "move" | "down") => void;
  startWave: () => void;
  /** The last-wave card's "Get ready first": back to the board between waves; the start button begins the finale. */
  prepareFinale: () => void;
  pickUpgrade: (id: UpgradeId) => void;
  chooseHero: (hero: HeroId) => void;
  chooseMap: (map: MapId) => void;
  chooseBuild: (kind: TowerKind) => void;
  /** Open the back-room side tab on `kind` (the selected tower's, or the last one shown, if left out). */
  openShop: (kind?: TowerKind) => void;
  /** Show another tower kind in the open back room. */
  shopKind: (kind: TowerKind) => void;
  /** Buy upgrade `id` for the tower kind the back room is showing (between waves only). */
  pickMod: (id: ModId) => void;
  closeShop: () => void;
  /** What the next back-room upgrade for `kind` costs. */
  shopPriceFor: (kind: TowerKind) => number;
  sellSelected: () => void;
  /** The selected tower's next (dir 1) or previous targeting mode, from the ones its kind offers (A). Free, any time. */
  cycleTarget: (dir?: 1 | -1) => void;
  /** Set the selected tower's targeting mode (one its kind offers). Free, any time. */
  setTarget: (mode: TargetMode) => void;
  /** A tower's targeting mode, the modes it can take and its recommended one; null if it doesn't aim. */
  targetOf: (towerId: number) => { mode: TargetMode; modes: TargetMode[]; recommended: TargetMode } | null;
  /** The Post (pamphlet): bind the selected one to the other straight its tile touches (between waves). */
  otherStraight: () => void;
  /** Anti-Geese Protocol (selected): fire on its own, or only on Engage. */
  setTrigger: (mode: "auto" | "manual") => void;
  /** Anti-Geese Protocol (selected): set it off now (needs a fruit in the ring). */
  engage: () => void;
  dismissSelection: () => void;
  nudgeSpeed: (dir: -1 | 1) => void;
  togglePause: () => void;
  setDifficulty: (id: Difficulty) => void;
  chooseNight: (night: NightId) => void;
  /** Setup, Overflow only: take or drop a late slip (up to three). */
  toggleSlip: (id: SlipId) => void;
  /** Developer mode: add DEV_SEEDS seeds (only while dev is on and a night is in play). */
  devSeeds: () => void;
  /** Title: skip the guided first night and open Setup. */
  skipGuide: () => void;
  /** Tutorial: Mynxi's Next button on a talk step. */
  guideNext: () => void;
  /** Title: play Mynxi's tutorial again (it doesn't lock Setup). */
  startTutorial: () => void;
  openSetup: () => void;
  beginNight: () => void;
  /** Intro, Sir Michael only: put on an armour and start the night (a locked one does nothing). */
  pickArmour: (armour: ArmourId) => void;
  /** The Hall of Doors, between waves: turn the signpost to shut the next exit for the next wave (none, then each in turn). */
  turnSign: () => void;
  /** The Compact Stacks, between waves: roll a bay's shelves to open its next aisle (once a break; not a jammed bay). */
  crank: (bay: number) => void;
  /** What turning that crank would do, without turning it. */
  crankPreview: (bay: number) => CrankPreview;
  /** @deprecated The oaths are gone: an old oath (or an armour) is mapped to an armour (ARMOUR_FOR_OATH) and put on. */
  pickOath: (oath: OathId | ArmourId) => void;
  /** Whether an armour is open for the playing keeper (keeper level, dev mode, or every tower open). */
  armourOpen: (armour: ArmourId) => boolean;
  /** Sir Michael: merge the selected tower with a matching neighbour into a Great tower. */
  makeGreat: () => void;
  /** Sir Michael: what merging this tower costs, and the neighbour it would take (null if it can't). */
  greatOffer: (towerId: number) => { cost: number; partner: number; why: string } | { cost: 0; partner: null; why: string };
  /** Sir Michael: feed the Dragon's Roost (once between waves): one more wave of growth. */
  feedRoost: () => void;
  /** The Dragon's Roost's stage (0 egg … 3 Great Dragon) and waves grown, for a tower id. */
  roostOf: (towerId: number) => { stage: number; grown: number; next: number | null } | null;
  /** Setup: pick the keeper (kept in the HUD so it survives a return to Setup). */
  pickKeeper: (hero: HeroId) => void;
  /** Setup: go to the keeper page or (with a keeper picked) the night page. */
  setupPage: (page: "who" | "night") => void;
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
  /** After a Midnight win: the Overflow, same keeper and difficulty. */
  continueOverflow: () => void;
  /** After an Overflow win: Setup for the Siege, same keeper and difficulty. */
  continueSiege: () => void;
  /** After a Siege win: Setup with Endless selected. */
  tryEndless: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  /** The checkout card: open it (pauses the board), close it (puts the pause back how it was). */
  openCheckout: () => void;
  closeCheckout: () => void;
  /** Grand Catalogue: spend fragments on a room (Title or Setup only). True if it was restored. */
  restoreRoom: (id: RoomId) => boolean;
  /** Grand Catalogue: choose cosmetics (only the ones restored rooms allow are kept). */
  setCosmetics: (c: Partial<Cosmetics>) => void;
  dismissCatalogueNote: () => void;
  menuSettings: (open: boolean) => void;
  /** Settings: default game speed (also applied now). Saved. */
  setSpeed: (speed: number) => void;
  /** Settings: reduce motion (no screen shake). Saved; overrides the system setting. */
  setReduced: (on: boolean) => void;
  /** Clear the run and go to Setup, keeping the choices. */
  reset: () => void;
  unlock: () => void;
  setBookmark: (id: BookmarkId | null) => void;
  /** Setup: choose perk `pick` (0 or 1) for the chosen keeper's tier `tier` (0-4). Saved. */
  setPerk: (tier: number, pick: 0 | 1) => void;
  /** Live stats for a placed tower (includes a Reading Lamp's boost). */
  statsOf: (towerId: number) => { dmg: number; range: number; interval: number; lit?: boolean; quick?: boolean; powered?: boolean; pierce?: number } | null;
  /**
   * The numbers a `kind` will have once built (on tile `at`, or anywhere): through the same `statsFor` a placed
   * tower uses, so fittings, perks, the dark, Close Reading and (on a tile) a lamp or the Quack-Liber all count.
   * `base` is the plain numbers (no fittings or perks); `why` says what moved each number.
   */
  previewStats: (kind: TowerKind, at?: { c: number; r: number }, extra?: ModId[]) => PreviewStats;
  /** The back room: hovering an upgrade (or null) shows the reach it would give each tower of the shown kind. */
  shopHover: (modId: ModId | null) => void;
  /** Wave `index` (0-based) as it will walk in: groups, notes, threat and flags (api.comingUp for the bar). */
  wavePreview: (index: number) => WavePreview;
  /** The Coming up bar: the next wave between waves; during one, what's still to come. */
  comingUp: () => WavePreview;
  /** Whether a tower stands in reach of drop point `index` (for the Coming up bar's warning). */
  dropCovered: (index: number) => boolean;
  /** What a placed tower reaches: carpet tiles it can hit (null if it doesn't hit fruit), or "all" for the whole board; and how many towers it helps. */
  reachOf: (towerId: number) => { tiles: number | "all" | null; towers: number } | null;
  /** What a placed tower has done this night: damage dealt, fruit popped, and its share of all the damage. */
  tallyOf: (towerId: number) => { dmg: number; pops: number; share: number; vs: Record<string, number> } | null;
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
      waveCount: nightLength("midnight"),
      waveName: WAVES[0].name,
      blurb: "Place melon cannons on the open floor. The carpet is the only road in.",
      upgrades: [],
      offer: [],
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
      armour: null,
      hoard: 0,
      zone: 0,
      roostFed: false,
      map: "stacks",
      build: "melon",
      shopVisits: 0,
      fitted: {},
      workshop: null,
      speed: 1,
      paused: false,
      menu: null,
      difficulty: "normal",
      night: "midnight",
      saved: false,
      setupNote: "",
      chuteWave: false,
      nativesSeen: [],
      siegeOpen: false,
      dropWave: [],
      feuds: 0,
      comboTips: [],
      shopRings: [],
      dropSeen: false,
      quackAura: CANNON.quackAura,
      golden: 0,
      shutExit: null,
      aisles: [],
      cranked: false,
      jammed: [],
      water: 0,
      plugged: false,
      tagTeam: false,
      geeseSpent: false,
      ki: 0,
      copycatPlaced: false,
      sisu: 0,
      keepers: emptyProgress(),
      xpStart: 0,
      xpRun: 0,
      slips: [],
      dev: false,
      guide: null,
      tutorial: false,
      guideDone: true,
      runLevel: 1,
      lockedTowers: [],
      heavyOpen: false,
      vaelOpen: 0,
      fullyUpgraded: 0,
      setupPage: "who",
      builtKinds: [],
      pickCards: [],
      cardPicks: [],
      checkout: false,
      shelves: {},
      ledger: emptyLedger(),
      newShelves: [],
      rooms: [...ALL_ROOMS],
      fragments: 0,
      fragmentsEarned: 0,
      lockedKeepers: [],
      cosmetics: { carpet: "crimson", frame: "plain", gilded: false },
      nightFragments: [],
      canRestore: null,
      catalogueNote: "",
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
    stomps: [],
    wet: new Set<string>(),
    flyers: [],
    stains: [],
    marks: [],
    bits: [],
    floaters: [],
    shake: 0,
    pathCells: STACKS.cells,
    vergeCells: STACKS.verge,
    floors: new Map(),
    bell: null,
    vines: new Map(),
    landings: [],
    brawls: [],
    shelfCells: shelfCells("stacks", STACKS.cells),
    points: STACKS.points,
    turns: STACKS.turns,
    routes: [STACKS.points],
    segments: [STACKS.points],
    doors: [],
    trackCells: new Set(),
    cocoons: [],
    crankAnim: null,
    crankHint: null,
    heights: new Map(),
    water: 0,
    waterRise: 0,
    ice: [],
    exits: [],
    routeDoor: [0],
    routeExit: [],
    trunk: STACKS.points,
    ...boardSize("stacks"),
    reduced: false,
    sfx: [],
    runLog: emptyRunLog(),
  };

  const cue = (kind: SfxKind, tower?: TowerKind) => {
    if (world.sfx.length < 48) world.sfx.push({ kind, tower });
  };

  let cleared = 0;
  /** A stack was lost this wave (Sir Michael's In the Zone only grows on clean waves). */
  let waveLost = false;
  /** The Loop's one-time note about the shortcut (once a night). */
  let shortcutNoted = false;
  /** Seconds of combat so far (trick-shot hit timing). */
  let clock = 0;
  let queue: QueueItem[] = [];
  /** The Bell Tower: a Chimer hurried the clock since the last strike. */
  let bellRushed = false;
  /** The Siege: paratroopers waiting to land (their queue item, health scale and landing time), and goose-cat pairs that have fought ("goose:cat"). */
  let drops: Array<{ q: QueueItem; scale: number; t: number }> = [];
  const fought = new Set<string>();
  let absurdDrops = 0;
  /** Has a Still been built this night? (The Unstoppered's unlock.) */
  let stillBuilt = false;
  /**
   * This night's damage and pops for each tower, by id. `credit` is the tower acting right now: its
   * shots, throws, puddles and burrows carry its id, and set it again when they hit later.
   */
  const tally = new Map<number, { dmg: number; pops: number; vs?: Record<string, number> }>();
  let credit: number | null = null;
  const tallyFor = (id: number) => {
    let t = tally.get(id);
    if (!t) tally.set(id, (t = { dmg: 0, pops: 0 }));
    return t;
  };
  let queueCursor = 0;
  let spawnClock = 0;
  let karlReward = false;
  /** Whether the board was paused before the checkout card opened. */
  let pausedBeforeCheckout = false;
  /**
   * History Lectern: the kind it noted and how many more waves it stays slow, the kind slowed this
   * wave, and how far each kind got this wave (0 = the entrance, 1 = leaked).
   */
  let lecture: { kind: EnemyKind; waves: number } | null = null;
  let lectureNow: EnemyKind | null = null;
  const reached = new Map<EnemyKind, number>();
  /** The route a fruit (or a globe or sheet rolling back along one) walks. */
  const routeOf = (e: { route?: number }) => world.routes[e.route ?? 0] ?? world.points;
  /** Px left along its own route to the stacks (the same scale on every route). */
  const toExit = (e: Enemy) => {
    const { along, total } = carpetAlong(routeOf(e), e.x, e.y, e.wp, e.reverse);
    return e.reverse ? along : total - along;
  };
  /**
   * "How far along" for targeting and ties (higher: further along). One-door boards keep the old score exactly;
   * a board with doors compares distance left to the stacks, which means the same on every route.
   */
  const progScore = (e: Enemy) =>
    world.routes.length > 1 ? -toExit(e) : e.wp * 1000 - Math.hypot(e.x - (world.points[e.wp]?.x ?? e.x), e.y - (world.points[e.wp]?.y ?? e.y));
  /** How far along its own way a fruit is (0 at its entrance, 1 at the stacks). */
  const progressOf = (e: Enemy) => {
    const pts = routeOf(e);
    let total = 0;
    const cum = [0];
    for (let k = 1; k < pts.length; k++) {
      total += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
      cum.push(total);
    }
    if (total <= 0) return 0;
    let along: number;
    if (e.reverse) {
      // Coming back up the chute: from the end toward the start.
      const k = Math.max(0, Math.min(pts.length - 1, e.wp + 1));
      along = cum[k] - Math.hypot(e.x - pts[k].x, e.y - pts[k].y);
      return Math.max(0, Math.min(1, 1 - along / total));
    }
    const k = Math.max(0, Math.min(pts.length - 1, e.wp - 1));
    along = cum[k] + Math.hypot(e.x - pts[k].x, e.y - pts[k].y);
    return Math.max(0, Math.min(1, along / total));
  };
  const noteReach = (e: Enemy, p: number) => reached.set(e.kind, Math.max(reached.get(e.kind) ?? 0, p));
  /**
   * Dr. Samodovol's shelf: after the three usual upgrades, the "Doctor's pick", a real upgrade from
   * further along the shelves (the next shelf's first, then any other he could be offered), marked
   * on the card. Footnote draws it from the last shelf first; Second Opinion adds a second pick.
   */
  const withDoctorsPick = (real: UpgradeDef[], step: 1 | 2 | 3): UpgradeDef[] => {
    world.hud.pickCards = [];
    if (world.hud.hero !== "scholar" || !real.length) return real;
    const taken = (id: string) => has(id as UpgradeId) || real.some((u) => u.id === id);
    const pool: UpgradeDef[] = [];
    const steps = (fx.footnote ? [3, 2, 1] : [Math.min(3, step + 1), 1, 2, 3]) as Array<1 | 2 | 3>;
    for (const s of steps)
      for (const u of buildOffer(world.hud.hero, s, world.hud.upgrades, world.hud.branch, builtKinds()))
        if (!taken(u.id) && !pool.some((p) => p.id === u.id)) pool.push(u);
    if (!pool.length) return real;
    const picks: UpgradeDef[] = [];
    for (let n = 0; n < 1 + fx.secondOpinion && pool.length; n++) {
      // From the front of the pool (the shelf it is drawn from), with a little variety.
      const u = pool.splice(Math.floor(Math.random() * Math.min(pool.length, 3)), 1)[0];
      picks.push(u);
    }
    world.hud.pickCards = picks.map((u) => u.id as UpgradeId);
    world.runLog.doctorOffered += picks.length;
    return [...real, ...picks];
  };
  /** Ooze Clues: leaks absorbed this wave (one a wave, more with perks). */
  let absorbed = 0;
  /** Asser: Material's first line has been said tonight; Second Wind has been used tonight. */
  let materialNoted = false;
  let windUsed = false;
  /** Over Nine Thousand Quacks has gone off tonight (once a night). */
  let goldenUsed = false;
  const has = (u: UpgradeId) => world.hud.upgrades.includes(u);

  const persistMeta = !options.meta && typeof window !== "undefined";
  const dev = options.dev ?? (persistMeta && !options.keepers && readDev());
  world.hud.dev = dev;
  world.hud.guideDone = options.guide !== undefined ? !options.guide : dev || !persistMeta ? true : readGuideDone();
  /** Lifetime stats and best waves are only saved outside developer mode. */
  const persistStats = persistMeta && !dev;
  const meta: MetaStats = dev
    ? { ...ALL_UNLOCKED }
    : options.meta
      ? { ...options.meta }
      : persistMeta
        ? loadMeta()
        : { ...EMPTY_META };
  /** Achievements: saved only when stats are (never in dev mode, tests or the simulator). */
  let shelfSave = persistStats ? loadAchievements(meta) : emptySave();
  world.hud.shelves = shelfSave.earned;
  world.hud.ledger = shelfSave.ledger;
  /** Tower id -> kind for every tower placed tonight (sold ones too), to credit kills. */
  const towerKinds = new Map<number, TowerKind>();
  /** The night's achievements were checked (once per run). */
  let nightDone = false;
  const resetRunLog = () => {
    world.runLog = emptyRunLog();
    towerKinds.clear();
    nightDone = false;
    world.hud.newShelves = [];
    world.hud.nightFragments = [];
    world.hud.canRestore = null;
  };
  // The Grand Catalogue: the real game moves old progress over once; tests, the simulator and dev
  // mode see every room restored (or the rooms a test asks for) and save nothing.
  if (persistStats && !shelfSave.migrated) {
    const keepers = loadProgress();
    const moved = migrate(shelfSave, meta, HEROES.filter((h) => (keepers[h]?.xp ?? 0) > 0));
    shelfSave = moved.save;
    world.hud.catalogueNote = moved.note;
    saveAchievements(shelfSave);
  }
  if (!persistStats)
    shelfSave = {
      ...shelfSave,
      rooms: options.rooms ? [...options.rooms] : [...ALL_ROOMS],
      fragments: options.fragments ?? 0,
      ...(options.ledger ? { ledger: options.ledger } : {}),
    };
  /** Everything the restored rooms open, onto the hud. */
  const applyRooms = () => {
    const rooms = shelfSave.rooms;
    world.hud.rooms = rooms;
    world.hud.fragments = shelfSave.fragments;
    world.hud.fragmentsEarned = shelfSave.fragmentsEarned;
    world.hud.shelves = shelfSave.earned;
    world.hud.ledger = shelfSave.ledger;
    world.hud.unlocked = unlockedIds(rooms);
    world.hud.maps = unlockedMaps(rooms);
    world.hud.lockedTowers = options.allTricks ? [] : lockedTowers(rooms);
    const open = openKeepers(rooms);
    world.hud.lockedKeepers = HEROES.filter((h) => !open.includes(h));
    world.hud.cosmetics = allowedCosmetics(shelfSave.cosmetics, rooms);
    // The Siege opens once the Overflow has been won (developer mode opens everything).
    world.hud.siegeOpen = options.siegeOpen ?? (dev || (shelfSave.ledger.winsByNight.overflow ?? 0) > 0);
  };
  applyRooms();
  {
    const stored = options.setup !== undefined ? options.setup : persistMeta ? loadSetup() : null;
    // The bookmark pick is saved whenever it changes, so it is newer than the setup record.
    const saved = persistMeta ? { ...(stored ?? {}), bookmark: loadPick() } : stored;
    const { setup, notes } = validateSetup(saved, {
      // Test rooms load from a setup only in developer mode (or with everything open, for previews and tests).
      maps: withLayouts(options.allTricks || world.hud.dev ? [...world.hud.maps, ...TEST_MAPS] : world.hud.maps),
      unlocked: world.hud.unlocked,
      keepers: HEROES.filter((h) => !world.hud.lockedKeepers.includes(h)),
      siege: world.hud.siegeOpen,
    });
    world.hud.saved = Boolean(stored);
    world.hud.setupNote = stored ? notes.join(" ") : "";
    world.hud.night = setup.night;
    world.hud.waveCount = nightLength(setup.night);
    world.hud.map = setup.map;
    world.hud.difficulty = setup.difficulty;
    world.hud.bookmark = setup.bookmark;
    world.hud.hero = stored ? setup.hero : null;
    world.hud.slips = setup.night === "overflow" ? cleanSlips(setup.slips) : [];
  }
  const persistKeepers = !options.keepers && !options.meta && !dev && typeof window !== "undefined";
  world.hud.keepers = options.keepers
    ? (Object.fromEntries(Object.entries(options.keepers).map(([h, r]) => [h, normalizeRecord(r)])) as KeeperProgress)
    : dev
      ? maxedProgress(0)
      : persistKeepers
        ? loadProgress()
        : emptyProgress();
  /** Perk effects for the run in play (set when a run starts). */
  let fx = perkFx(null, undefined);
  /** Is this the playing keeper's own tower? */
  const own = (kind: TowerKind) => world.hud.hero != null && KEEPER_TOWERS[world.hud.hero].includes(kind);
  /** Is this the playing keeper's signature (the tower their perks name)? */
  const ownSignature = (kind: TowerKind) => world.hud.hero != null && SIGNATURE[world.hud.hero] === kind;
  /** Give the playing keeper XP; say so if it brings a new level. */
  const giveXp = (amount: number) => {
    const hero = world.hud.hero;
    if (!hero || amount <= 0) return;
    const rec = world.hud.keepers[hero];
    const before = levelFor(rec.xp);
    const next = normalizeRecord({ xp: rec.xp + amount, picks: rec.picks });
    world.hud.keepers = { ...world.hud.keepers, [hero]: next };
    world.hud.xpRun += amount;
    if (persistKeepers) saveProgress(world.hud.keepers);
    const after = levelFor(next.xp);
    if (after > before) {
      const perk = (PERK_LEVELS as readonly number[]).includes(after) ? " A new perk is ready on the setup screen." : "";
      const trick = (Object.keys(TRICK_LEVEL) as TowerKind[]).filter((k) => TRICK_LEVEL[k]! > before && TRICK_LEVEL[k]! <= after);
      const opens = trick.length ? ` The ${trick.map((k) => TOWERS[k].name).join(" and the ")} opens from the next night.` : "";
      world.hud.log = `${world.hud.log} ${KEEPER_NAMES[hero].name} reached level ${after}.${perk}${opens}`.trim();
      cue("clear");
    }
  };
  const bm = (id: BookmarkId) => world.hud.bookmark === id;
  /** Is this late slip active? (Overflow only.) */
  const slip = (id: SlipId) => world.hud.night === "overflow" && world.hud.slips.includes(id);
  /** Update lifetime stats. (Maps, bookmarks and keeper towers open from Grand Catalogue rooms, not from these.) */
  const record = (change: (m: MetaStats) => void) => {
    change(meta);
    if (persistStats) saveMeta(meta);
  };
  /** The next back-room upgrade for `kind`: only that kind's own upgrades raise it. The tutorial's is free. */
  const roomPrice = (kind: TowerKind) =>
    world.hud.guide === "backroom"
      ? 0
      : backRoomPrice(world.hud.hero, world.hud.fitted[kind]?.length ?? 0, world.hud.shopVisits, world.hud.bookmark, fx.shopOff);
  /** Move the tutorial to `step`, skipping building steps the board already satisfies. */
  const guideTo = (step: GuideStep | null) => {
    const mine = world.towers.map((t) => groupOf(t.kind).id);
    let at = step;
    for (;;) {
      if (at === "damage" && mine.includes("damage")) at = "range";
      else if (at === "support" && (mine.includes("control") || mine.includes("support"))) at = "tabs";
      else break;
    }
    world.hud.guide = at;
  };
  const guideAfter = (step: GuideStep) => GUIDE_STEPS[GUIDE_STEPS.indexOf(step) + 1] ?? null;
  /** Tutorial: a building step is done once the board has what it asks for. */
  const syncGuide = () => {
    if (world.hud.guide === "damage") guideTo("damage");
    else if (world.hud.guide === "support") {
      guideTo("support");
      // The support lesson is done: pick the Melon cannon again, so the next floor tap (the lesson
      // before said another tap builds another) adds damage, not a second Still.
      if (world.hud.guide !== "support" && world.hud.build !== "melon") {
        world.hud.build = "melon";
        syncPrice();
        world.hud.log = `${world.hud.log} The Melon cannon is picked again.`.trim();
      }
    }
  };
  /** Tutorial: the wave has started or the speed changed, so move past the speed lesson. */
  const guideSpeed = () => {
    if (world.hud.guide === "speed") world.hud.guide = "combat";
  };
  /** A trick cannon the playing keeper's level hasn't opened yet. */
  const levelLocked = (kind: TowerKind) => !options.allTricks && (TRICK_LEVEL[kind] ?? 0) > world.hud.runLevel;
  /** Heavy cannons wait for wave 6, or for 200 seeds in hand at some point tonight. */
  const syncHeavy = () => {
    if (!world.hud.heavyOpen && (world.hud.wave >= HEAVY_WAVE || world.hud.seeds >= HEAVY_SEEDS)) world.hud.heavyOpen = true;
  };
  const heavyLocked = (kind: TowerKind) => {
    if (options.allTricks || !groupOf(kind) || groupOf(kind).id !== "heavy") return false;
    syncHeavy();
    return !world.hud.heavyOpen;
  };
  /** A keeper tower whose unlock goal hasn't been met. */
  const goalLocked = (kind: TowerKind) => world.hud.lockedTowers.includes(kind);
  /** The Reserve Desk has to sit right beside the carpet, so melons really do walk past it. */
  const offCarpet = (kind: TowerKind, c: number, r: number) =>
    kind === "pamphlet"
      ? bindLeg(legsNow(), c, r) < 0
      : (kind === "desk" || kind === "gourdgate") && !besideCarpet(world, c, r);
  /**
   * The carpet's straights for the current board (worked out once per board): every segment's, in order, so a
   * board with doors numbers each straight once. `routeLegs(i)` are route i's straights with each one's number here.
   */
  let legCache: { routes: World["routes"]; legs: ReturnType<typeof carpetLegs>; byRoute: Array<{ legs: ReturnType<typeof carpetLegs>; map: number[] }> } | null = null;
  const legsAll = () => {
    if (!legCache || legCache.routes !== world.routes) {
      const legs = boardLegs(world);
      const same = (a: Waypoint, b: Waypoint) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
      const byRoute = world.routes.map((r) => {
        const own = carpetLegs(r);
        return { legs: own, map: own.map((l) => legs.findIndex((g) => same(g.a, l.a) && same(g.b, l.b))) };
      });
      legCache = { routes: world.routes, legs, byRoute };
    }
    return legCache;
  };
  const legsNow = () => legsAll().legs;
  const routeLegs = (route: number) => legsAll().byRoute[route] ?? legsAll().byRoute[0];
  /** Why the guide won't let the wave start yet ("" when it will). */
  const guideHold = () => {
    const g = world.hud.guide;
    if (!g || !GUIDE_HOLDS.includes(g)) return "";
    if (g === "damage") return "First, build a Damage cannon: the Melon cannon is ready on the Damage tab.";
    if (g === "support") return "Now add a Control (W) or Support (E) tower.";
    if (g === "backroom") return "Open the back room (B) and buy an upgrade before the next wave. This one is free.";
    return "Mynxi isn't finished yet: press Next.";
  };
  /** The lessons are done: Setup opens for good, and Mynxi has one last word. */
  const finishGuide = () => {
    if (world.hud.guide == null) return;
    world.hud.guide = "sell";
    world.hud.guideDone = true;
    if (persistMeta) writeGuideDone();
    world.hud.log = `${world.hud.log} That's the basics: New night on the title screen is open now.`.trim();
  };
  /** Start the guided first night: Midnight, the Stacks, Mynxi, Normal, no bookmark. */
  const startGuide = () => {
    world.hud.night = "midnight";
    world.hud.waveCount = nightLength("midnight");
    world.hud.map = "stacks";
    world.hud.difficulty = "normal";
    world.hud.bookmark = null;
    world.hud.slips = [];
    applyBoard("stacks");
    api.chooseHero("mynxi");
    world.hud.guide = "welcome";
    tutorialStart();
    world.hud.build = "melon";
    syncPrice();
    notify();
  };

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
        if (!dev) writeBest(cleared, ENDLESS_BEST_KEY);
      }
      return;
    }
    if (cleared > world.hud.best) {
      world.hud.best = cleared;
      if (!dev) writeBest(cleared);
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
        life: 0.4 + Math.random() * 0.35,
        max: 0.75,
        color,
        s: 2.5 + Math.random() * 3,
      });
    }
    if (world.bits.length > 240) world.bits.splice(0, world.bits.length - 240);
  };

  /** Show a splash area: a soft circle and a ring at its real radius. */
  const splashFx = (x: number, y: number, r: number, color: string) => {
    if (world.cocoons.length) world.cocoons = world.cocoons.filter((k) => Math.hypot(k.x - x, k.y - y) > r + 6);
    world.rings.push({ x, y, r, life: 0.45, max: 0.45, color, fill: true });
    if (world.rings.length > 60) world.rings.splice(0, world.rings.length - 60);
  };

  /** Leave a juice stain on the floor that fades over a couple of seconds. */
  const stain = (x: number, y: number, r: number, color: string) => {
    world.stains.push({ x, y, r, color, life: 2.2, max: 2.2, seed: Math.floor(Math.random() * 1000) });
    if (world.stains.length > 40) world.stains.splice(0, world.stains.length - 40);
  };

  /** Drawing only: leave a status mark on the carpet (the oldest goes past the cap). */
  const addMark = (x: number, y: number, kind: StatusMark["kind"], life: number, rot = 0) => {
    world.marks.push({ x, y, kind, life, max: life, rot, seed: Math.random() });
    if (world.marks.length > STATUS_LOOK.maxMarks) world.marks.splice(0, world.marks.length - STATUS_LOOK.maxMarks);
  };

  const float = (x: number, y: number, text: string, color: string) => {
    world.floaters.push({ x, y, text, life: 0.8, color });
  };

  const cellCenter = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

  /** The tower on a tile: its own tile, or one an Unstoppered has spilled onto. */
  const towerAt = (c: number, r: number) =>
    world.towers.find(
      (t) => (t.c === c && t.r === r) || (t.great != null && t.great.c === c && t.great.r === r) || (t.spill?.some((s) => s.c === c && s.r === r) ?? false),
    );
  const occupied = (c: number, r: number) => towerAt(c, r) != null;

  const inMap = (c: number, r: number) => c >= 0 && r >= 0 && c < world.cols && r < world.rows;

  const placedCount = () => world.towers.length;
  /** Kinds the player has on the board, most-built first (for cannon upgrades). */
  const builtKinds = () => {
    const count = new Map<TowerKind, number>();
    for (const t of world.towers) count.set(t.kind, (count.get(t.kind) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  // All player tower stats come from towerReadout(), the same function the
  // inspector panel shows, so the numbers on screen are the numbers in play.
  /** Asser's Sisu: his towers hit harder for every stack he is missing right now (capped). */
  const sisuMul = () => {
    if (world.hud.hero !== "asser") return 1;
    const missing = Math.min(ASSER_VALUES.sisuCap + fx.sisuCap, Math.max(0, world.hud.maxLives - world.hud.lives));
    return 1 + missing * (ASSER_VALUES.sisuPerStack + fx.sisuPerStack);
  };
  const syncSisu = () => {
    world.hud.sisu = Math.round((sisuMul() - 1) * 100);
    if (world.hud.hero === "asser") {
      world.runLog.sisuPeak = Math.max(world.runLog.sisuPeak, world.hud.sisu);
      if (world.hud.maxLives - world.hud.lives >= ASSER_VALUES.sisuCap + fx.sisuCap) world.runLog.sisuCapped = true;
    }
  };
  /** Keeper perks on a tower's base stats. */
  const withPerks = <T extends { dmg: number; range: number; interval: number }>(kind: TowerKind, read: T): T => {
    if (PASSIVE.includes(kind)) return read;
    // Signature perks name one tower ("The Scales fire 25% faster"), so a keeper's extra towers skip them.
    const sig = ownSignature(kind);
    const dmgMul = fx.allDmg * (sig ? fx.sigDmg : 1) * sisuMul();
    const rangeMul = fx.allRange * (sig ? fx.sigRange : 1);
    return {
      ...read,
      dmg: dmgMul === 1 || read.dmg === 0 ? read.dmg : Math.max(1, Math.round(read.dmg * dmgMul)),
      range: read.range >= GLOBAL_RANGE ? read.range : Math.round(read.range * rangeMul),
      interval: sig ? read.interval * fx.sigPace : read.interval,
    };
  };
  /**
   * Unstoppered: every tile it covers drips like a Still, on its own timer. Each tile picks the
   * fruit farthest along in its reach, preferring one not already standing in a puddle.
   */
  const dripFlask = (tower: Tower, dt: number) => {
    const stats = statsFor(tower);
    const spread = hasMod(tower, "spread");
    const cling = hasMod(tower, "cling");
    // It drips from its own tile only: its spills wet the carpet instead of dripping (see spillFlask).
    void dt;
    const tiles: Array<{ x: number; y: number; cd: number; set: (cd: number) => void }> = [
      { x: tower.x, y: tower.y, cd: tower.cd, set: (cd) => (tower.cd = cd) },
    ];
    for (const tile of tiles) {
      if (tile.cd > 0) continue;
      let best: Enemy | null = null;
      let bestScore = -Infinity;
      for (const e of world.enemies) {
        if (e.hp <= 0 || Math.hypot(e.x - tile.x, e.y - tile.y) > stats.range) continue;
        const wet = world.pools.some((p) => !p.hot && Math.hypot(e.x - p.x, e.y - p.y) < p.r);
        const score = progScore(e) - (wet ? 1e6 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
      if (!best) continue;
      tile.set(stats.interval);
      addPool(best.x, best.y, spread, cling);
      world.pools[world.pools.length - 1].vael = true;
    }
  };

  /**
   * Unstoppered: after a wave, maybe spill onto a neighbouring floor tile (toward carpet it hasn't
   * soaked yet). Every carpet cell the new tile can reach is wet for the rest of the night.
   */
  const spillFlask = (tower: Tower): boolean => {
    const covered = [{ c: tower.c, r: tower.r }, ...(tower.spill ?? [])];
    if (covered.length >= CANNON.flaskMaxTiles || Math.random() >= CANNON.flaskSpillChance) return false;
    const range = statsFor(tower).range;
    const reach = (c: number, r: number) => {
      const p = cellCenter(c, r);
      const out: string[] = [];
      for (const key of world.pathCells) {
        const [pc, pr] = key.split(",").map(Number);
        const q = cellCenter(pc, pr);
        if (Math.hypot(q.x - p.x, q.y - p.y) <= range) out.push(key);
      }
      return out;
    };
    const have = new Set(covered.flatMap((t) => reach(t.c, t.r)));
    const options: Array<{ c: number; r: number; fresh: number }> = [];
    for (const t of covered)
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = t.c + dc;
        const r = t.r + dr;
        const key = `${c},${r}`;
        if (!inMap(c, r) || world.pathCells.has(key) || world.vergeCells.has(key) || world.shelfCells.has(key) || occupied(c, r)) continue;
        if (options.some((o) => o.c === c && o.r === r)) continue;
        const cells = reach(c, r);
        if (!cells.length) continue; // a tile that can't reach the carpet would be wasted
        options.push({ c, r, fresh: cells.filter((k) => !have.has(k)).length });
      }
    if (!options.length) return false;
    // Spill toward new carpet when it can; otherwise anywhere that still reaches it.
    const most = Math.max(...options.map((o) => o.fresh));
    const best = options.filter((o) => o.fresh === most);
    const pick = best[Math.floor(Math.random() * best.length)];
    const p = cellCenter(pick.c, pick.r);
    (tower.spill ??= []).push({ c: pick.c, r: pick.r, x: p.x, y: p.y, cd: 0.4 });
    for (const key of reach(pick.c, pick.r)) world.wet.add(key);
    float(p.x, p.y - 20, "spill!", "#9fd27a");
    world.rings.push({ x: p.x, y: p.y, r: 26, life: 0.6, max: 0.6, color: "120,180,90" });
    return true;
  };

  /** The Copycat's copy of `source`'s fittings: step kinds also get the hidden step. */
  const copyMods = (source: Tower): ModId[] => (COPY_STEP_KINDS.includes(source.kind) ? [...source.mods, "mimicstep"] : [...source.mods]);
  /**
   * The Copycat: copy the newest copyable tower right beside it (not on a corner), with its upgrades
   * (plus one hidden step for the step kinds; see COPY_STEP_KINDS). With nothing to copy it goes blank.
   * `refit` also picks up upgrades bought for the original since the copy was made (at each wave start).
   */
  const syncMimics = (refit = false) => {
    for (const m of world.towers) {
      if (m.kind !== "copycat") continue;
      let source: Tower | null = null;
      for (const t of world.towers) {
        if (!canCopy(t.kind) || Math.abs(t.c - m.c) + Math.abs(t.r - m.r) !== 1) continue;
        if (!source || t.id > source.id) source = t;
      }
      if (!source) {
        m.copy = undefined;
        m.copyFrom = undefined;
        continue;
      }
      if (m.copyFrom !== source.id || !m.copy) {
        m.copyFrom = source.id;
        // A fresh tower of the copied kind on the Copycat's tile and id (so its kills count for the Copycat).
        m.copy = {
          id: m.id, c: m.c, r: m.r, x: m.x, y: m.y, aim: m.aim, paid: 0, born: m.born,
          kind: source.kind, mods: copyMods(source), orange: source.orange, cd: 0.4, copied: true,
        };
      } else if (refit) {
        m.copy.mods = copyMods(source);
      }
    }
  };
  /** The towers that act this frame: a Copycat acts through its copy (and not at all while blank). */
  const actingTowers = () => world.towers.flatMap((t) => (t.kind === "copycat" ? (t.copy ? [t.copy] : []) : [t]));
  /** The mode each kind was last set to tonight: a new tower of that kind starts on it. */
  let lastMode: Partial<Record<TowerKind, TargetMode>> = {};
  /** A tower's targeting mode: its own, else its kind's recommended one. A Copycat's copy uses the Copycat's choice. */
  const modeOf = (tower: Tower): TargetMode => {
    const owner = tower.copied ? world.towers.find((t) => t.copy === tower) : undefined;
    const allowed = DEFAULT_TARGET[tower.kind];
    const chosen = owner ? owner.target : tower.target;
    return chosen && allowed?.modes.includes(chosen) ? chosen : (allowed?.default ?? "first");
  };

  /** Orrery: spin the planets and hit any fruit they sweep through. */
  const spinOrrery = (tower: Tower, dt: number) => {
    const stats = statsFor(tower);
    const speed = CANNON.orrerySpin * (0.9 / Math.max(0.2, stats.interval));
    tower.spin = ((tower.spin ?? Math.random() * Math.PI * 2) + speed * dt) % (Math.PI * 2);
    tower.orbit = stats.range;
    tower.orbitHits ??= new Map();
    const now = clock;
    for (let p = 0; p < CANNON.orreryPlanets; p++) {
      const ang = tower.spin + (p * Math.PI * 2) / CANNON.orreryPlanets;
      const px = tower.x + Math.cos(ang) * stats.range;
      const py = tower.y + Math.sin(ang) * stats.range;
      for (const e of world.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - px) ** 2 + (e.y - py) ** 2 > (e.r + 15) ** 2) continue;
        const key = `${p}:${e.id}`;
        if ((tower.orbitHits.get(key) ?? -1) > now) continue;
        tower.orbitHits.set(key, now + CANNON.orreryGap);
        hurt(e, null, stats.dmg);
        burst(px, py, "#e6c36a", 3);
        cue("fire", "orrery");
      }
    }
    if (tower.orbitHits.size > 200) {
      for (const [k, until] of tower.orbitHits) if (until <= now) tower.orbitHits.delete(k);
    }
  };

  /** Throw a boomerang or launch a paper plane at `target`. */
  const launchFlyer = (tower: Tower, target: Enemy, stats: { dmg: number; range: number; interval: number }) => {
    cue("fire", tower.kind);
    const dx = target.x - tower.x;
    const dy = target.y - tower.y;
    const d = Math.max(CELL, Math.hypot(dx, dy));
    const base = {
      id: id(),
      x: tower.x,
      y: tower.y,
      ox: tower.x,
      oy: tower.y,
      ux: dx / d,
      uy: dy / d,
      t: 0,
      dmg: stats.dmg,
      hits: new Map<number, number>(),
      trail: [] as Array<{ x: number; y: number }>,
      owner: tower.id,
    };
    if (tower.kind === "boomerang") {
      // Throw a little past the fruit so the loop sweeps through it; one bookend out at a time.
      const reach = Math.min(stats.range, d + CELL * 0.6);
      tower.cd = Math.max(stats.interval, CANNON.boomerangTime);
      world.flyers.push({
        ...base,
        kind: "boomerang",
        dist: reach,
        width: reach * CANNON.boomerangWidth,
        side: Math.random() < 0.5 ? -1 : 1,
        dur: CANNON.boomerangTime,
        heading: 0,
      });
    } else if (tower.kind === "quill") {
      // Writes a wavy line out past the fruit; one quill at a time per tower.
      tower.cd = stats.interval;
      const dist = stats.range * CANNON.quillReach;
      world.flyers.push({
        ...base,
        kind: "quill",
        dist,
        width: CANNON.quillWave,
        side: Math.random() < 0.5 ? -1 : 1,
        dur: dist / CANNON.quillSpeed,
        heading: Math.atan2(dy, dx),
      });
    } else if (tower.kind === "press") {
      // A pressed sheet lands on the fruit and slides back up the carpet toward the entrance.
      tower.cd = stats.interval;
      world.flyers.push({
        ...base,
        kind: "sheet",
        x: target.x,
        y: target.y,
        dist: 0,
        width: 0,
        side: 1,
        dur: 99,
        heading: 0,
        wp: target.reverse ? target.wp : target.wp - 1,
        route: target.route,
        rolling: true,
        left: CANNON.pressSheet * (hasMod(tower, "longsheet") ? 1.5 : 1),
        inkTime: CANNON.pressInkTime * (hasMod(tower, "wetink") ? 2 : 1),
      });
    } else if (tower.kind === "globe") {
      // Lob onto the carpet a little ahead of the fruit, then roll back toward the entrance.
      tower.cd = stats.interval;
      const tp = routeOf(target);
      const ahead = tp[target.reverse ? Math.max(0, target.wp - 1) : Math.min(tp.length - 1, target.wp)];
      const ad = Math.hypot(ahead.x - target.x, ahead.y - target.y);
      const lead = Math.min(ad, CELL);
      const lx = ad > 0 ? target.x + ((ahead.x - target.x) / ad) * lead : target.x;
      const ly = ad > 0 ? target.y + ((ahead.y - target.y) / ad) * lead : target.y;
      world.flyers.push({
        ...base,
        kind: "globe",
        dist: d,
        width: 0,
        side: 1,
        dur: CANNON.globeLob + CANNON.globeRoll,
        heading: 0,
        lx,
        ly,
        // Toward the entrance: forward walkers came from points[wp - 1]; chute walkers are heading to points[wp].
        wp: target.reverse ? target.wp : target.wp - 1,
        route: target.route,
        rolling: false,
      });
    } else {
      tower.cd = stats.interval;
      world.flyers.push({
        ...base,
        kind: "plane",
        dist: stats.range,
        width: 0,
        side: 1,
        dur: CANNON.planeLife,
        // Launch off to one side, so the first pass is already a curve.
        heading: Math.atan2(dy, dx) + (Math.random() < 0.5 ? -0.9 : 0.9),
      });
    }
  };

  const moveFlyer = (f: Flyer, dt: number) => {
    f.t += dt;
    credit = f.owner ?? null;
    if (f.kind === "boomerang") {
      // An elliptical loop: out along the throw, curving to one side, and back home.
      const p = Math.min(1, f.t / f.dur);
      const a = p * Math.PI * 2;
      const along = (f.dist * (1 - Math.cos(a))) / 2;
      const across = f.width * Math.sin(a) * f.side;
      f.x = f.ox + f.ux * along - f.uy * across;
      f.y = f.oy + f.uy * along + f.ux * across;
      const pass = p < 0.5 ? 0 : 1;
      for (const e of world.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (e.r + 12) ** 2) continue;
        if (f.hits.get(e.id) === pass) continue;
        f.hits.set(e.id, pass);
        hurt(e, null, f.dmg);
        burst(e.x, e.y, "#d8b878", 4);
      }
    } else if (f.kind === "quill") {
      // A sine wave along the throw: out to its full length, then gone.
      const along = CANNON.quillSpeed * f.t;
      const k = (Math.PI * 2) / CANNON.quillWavelength;
      const across = f.width * Math.sin(along * k) * f.side;
      f.x = f.ox + f.ux * along - f.uy * across;
      f.y = f.oy + f.uy * along + f.ux * across;
      // Face along the curve (for drawing).
      const slope = f.width * k * Math.cos(along * k) * f.side;
      f.heading = Math.atan2(f.uy + f.ux * slope, f.ux - f.uy * slope);
      for (const e of world.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (e.r + 11) ** 2) continue;
        if (f.hits.has(e.id)) continue;
        f.hits.set(e.id, 1);
        hurt(e, null, f.dmg);
        burst(e.x, e.y, "#3b4f8f", 4);
      }
    } else if (f.kind === "sheet") {
      // Slide back along the carpet, hitting and inking each fruit once, until the sheet runs out.
      let step = Math.min(CANNON.pressSpeed * dt, f.left ?? 0);
      f.left = (f.left ?? 0) - step;
      while (step > 0 && f.wp! >= 0) {
        const wp = routeOf(f)[f.wp!];
        const dx = wp.x - f.x;
        const dy = wp.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= step) {
          f.x = wp.x;
          f.y = wp.y;
          step -= dist;
          f.wp! -= 1;
        } else {
          f.x += (dx / dist) * step;
          f.y += (dy / dist) * step;
          f.heading = Math.atan2(dy, dx);
          step = 0;
        }
      }
      if (f.wp! < 0 || (f.left ?? 0) <= 0) f.t = f.dur;
      for (const e of world.enemies) {
        if (e.hp <= 0 || f.hits.has(e.id)) continue;
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (e.r + 18) ** 2) continue;
        f.hits.set(e.id, 1);
        e.ink = Math.max(e.ink ?? 0, f.inkTime ?? CANNON.pressInkTime);
        e.inkMul = Math.max(e.inkMul ?? 1, CANNON.pressInk);
        hurt(e, null, f.dmg);
        burst(e.x, e.y, "#2a2440", 4);
      }
    } else if (f.kind === "globe") {
      if (!f.rolling) {
        // In the air: a straight lob (the drawing adds the height).
        const p = Math.min(1, f.t / CANNON.globeLob);
        f.x = f.ox + (f.lx! - f.ox) * p;
        f.y = f.oy + (f.ly! - f.oy) * p;
        if (p >= 1) {
          f.rolling = true;
          world.shake = world.reduced ? 0 : Math.max(world.shake, 3);
          burst(f.x, f.y, "#c9a46a", 8);
          for (const e of world.enemies) {
            if (e.hp <= 0 || (e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (e.r + CANNON.globeThud) ** 2) continue;
            f.hits.set(e.id, 1);
            hurt(e, null, f.dmg);
          }
        }
      } else {
        // Roll back along the carpet, waypoint by waypoint, until it rolls out of the entrance.
        let step = CANNON.globeSpeed * dt;
        while (step > 0 && f.wp! >= 0) {
          const wp = routeOf(f)[f.wp!];
          const dx = wp.x - f.x;
          const dy = wp.y - f.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= step) {
            f.x = wp.x;
            f.y = wp.y;
            step -= dist;
            f.wp! -= 1;
          } else {
            f.x += (dx / dist) * step;
            f.y += (dy / dist) * step;
            f.heading = Math.atan2(dy, dx);
            step = 0;
          }
        }
        if (f.wp! < 0) f.t = f.dur;
        for (const e of world.enemies) {
          if (e.hp <= 0) continue;
          if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (e.r + 14) ** 2) continue;
          if (f.hits.has(e.id)) continue;
          f.hits.set(e.id, 1);
          hurt(e, null, f.dmg);
          burst(e.x, e.y, "#c9a46a", 5);
        }
      }
    } else {
      // Steer toward the nearest fruit, but only so fast: the plane swoops in wide arcs.
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const e of world.enemies) {
        if (e.hp <= 0) continue;
        const d = (e.x - f.x) ** 2 + (e.y - f.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best) {
        const want = Math.atan2(best.y - f.y, best.x - f.x);
        let diff = want - f.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = CANNON.planeTurn * dt;
        f.heading += Math.max(-turn, Math.min(turn, diff));
      }
      f.x += Math.cos(f.heading) * CANNON.planeSpeed * dt;
      f.y += Math.sin(f.heading) * CANNON.planeSpeed * dt;
      // Keep it over the room.
      if (f.x < 0 || f.y < 0 || f.x > world.w || f.y > world.h) f.heading += Math.PI * dt * 2;
      const now = clock;
      for (const e of world.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (e.r + 10) ** 2) continue;
        if ((f.hits.get(e.id) ?? -1) > now) continue;
        f.hits.set(e.id, now + CANNON.planeGap);
        hurt(e, null, f.dmg);
        burst(e.x, e.y, "#f3e2c4", 4);
      }
    }
    f.trail.push({ x: f.x, y: f.y });
    if (f.trail.length > 10) f.trail.shift();
  };

  /**
   * Quackarot's Quack-Liber: every other tower within its reach fires faster while it stands (the best one
   * counts; two don't stack). Quack-hameha: faster again for a moment after one of its kills.
   */
  /** Training arc: the aura's extra speed from the waves cleared tonight. */
  const trainingArc = () => Math.min(CANNON.quackArcMax, CANNON.quackArcPer * Math.max(0, world.hud.wave - 1));
  const quackHaste = (tower: Tower) => {
    if (tower.kind === "quackliber") return 1;
    const reach = CANNON.quackAura * fx.auraReach;
    let best = 1;
    for (const q of world.towers) {
      if (q.kind !== "quackliber" || soaked(q)) continue;
      if ((q.x - tower.x) ** 2 + (q.y - tower.y) ** 2 > reach * reach) continue;
      best = Math.max(best, (CANNON.quackHaste + fx.auraHaste + trainingArc()) * ((q.rally ?? 0) > 0 ? CANNON.quackRally : 1));
    }
    return best;
  };
  /** Sir Michael's big things: a Great tower, the Dragon Gate or the Dragon's Roost (In the Zone and Emberforged boost these). */
  const isBig = (tower: Tower) => world.hud.hero === "michael" && (tower.great != null || BIG_KINDS.includes(tower.kind));
  /** The Dragon's Roost: its stage now (0 egg … 3 Great Dragon). A tower that isn't standing yet starts where its armour says. */
  const roostStage = (tower: Tower) => roostStageFor(roostStageGrowth(tower));
  /** The Roost's growth so far (a placing ghost starts where its armour says). */
  const roostStageGrowth = (tower: Tower) => tower.grown ?? (world.hud.armour === "wyrm" ? DRAGON.roostGrow[ARMOUR_VALUES.wyrmStage - 1] : 0);
  /** What a big thing costs Sir Michael from his Hoard and from his seeds (the Hoard pays first). */
  const hoardSplit = (price: number) => {
    const fromHoard = world.hud.hero === "michael" ? Math.min(Math.floor(world.hud.hoard), price) : 0;
    return { fromHoard, fromSeeds: price - fromHoard };
  };
  /** Sir Michael's Hoard takes its share of seeds spent on ordinary things (towers that aren't big, back-room upgrades). */
  const feedHoard = (spent: number) => {
    if (world.hud.hero !== "michael" || spent <= 0) return;
    const share = world.hud.armour === "dragonscale" ? ARMOUR_VALUES.scaleShare : DRAGON.hoardShare;
    world.hud.hoard += spent * share;
  };
  /** The last three tiles before the door along a fruit's own carpet (the Anti-Geese Protocol's Auto trigger). */
  const nearDoor = (e: Enemy) => {
    const route = routeOf(e);
    const { along, total } = carpetAlong(route, e.x, e.y, e.wp, e.reverse);
    return total - along <= 3 * CELL;
  };
  /** Tag Team: with two Quack-Libers standing, fruit near the line between them walk slower. */
  const perimeterAt = (e: Enemy) => {
    if (!fx.perimeter) return 1;
    const qs = world.towers.filter((t) => t.kind === "quackliber");
    if (qs.length < 2) return 1;
    const [a, b] = qs;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy || 1;
    const k = Math.max(0, Math.min(1, ((e.x - a.x) * vx + (e.y - a.y) * vy) / len2));
    const d = Math.hypot(e.x - (a.x + vx * k), e.y - (a.y + vy * k));
    return d <= CANNON.quackLine + e.r ? CANNON.quackLineSlow : 1;
  };

  /** The floor tile a fruit stands on (belt, stairs or bed), if any. */
  const floorAt = (e: Enemy) => world.floors.get(`${Math.floor(e.x / CELL)},${Math.floor(e.y / CELL)}`);
  const tileOf = (e: { x: number; y: number }) => `${Math.floor(e.x / CELL)},${Math.floor(e.y / CELL)}`;
  /** The Flooded Basement: is this tile under water now (a Sump Pump keeps its own tile and the eight round it dry)? */
  const flooded = (c: number, r: number) => floodedTile(world, c, r);
  const floodedAt = (x: number, y: number) => flooded(Math.floor(x / CELL), Math.floor(y / CELL));
  /** A tower standing in the water: it doesn't act until its tile is dry again. */
  const soaked = (t: Tower) => world.water > 0 && flooded(t.c, t.r);
  /** Wading: fruit in water walk slower (bosses less so); the Water Melon swims faster. */
  const wade = (e: Enemy) => (!floodedAt(e.x, e.y) ? 1 : e.native === "watermelon" ? BASEMENT.snorkel : e.boss ? BASEMENT.wadeSlowBoss : BASEMENT.wadeSlow);
  /** Express Corn on a belt: nothing slows or stops it, and the belt carries it faster. */
  const expressOnBelt = (e: Enemy) => e.native === "express" && floorAt(e)?.kind === "belt";
  /** A fruit's floor pace, walking back (`back`) or on. */
  const paceOf = (e: Enemy, back: boolean) =>
    (expressOnBelt(e) ? (back ? 1 / NATIVES.expressBelt : NATIVES.expressBelt) : floorPace(floorAt(e)?.kind, back)) * (world.heights.size ? wade(e) : 1);
  /** The Flooded Basement: whether this wave reaches level 3, the level it started at (a plugged drain: 1), and whether a Drain Gourd got through. */
  let waterDeep = false;
  let waterStart = 0;
  let drainPlugged = false;
  /** Raise the water (it never falls during a wave). */
  const raiseWater = (level: number) => {
    if (level <= world.water) return;
    world.water = level;
    world.hud.water = level;
    world.waterRise = BASEMENT.riseTime;
    cue("slosh");
    world.hud.log = level >= 3 ? "The water's rising. The middle floor's going under." : "The water's rising.";
    notify();
  };
  /** The water during a wave: it rises with the share of the wave's fruit in, puts fires out, and its ice holds fruit fast. */
  const tickWater = (dt: number) => {
    raiseWater(waterFor(queue.length ? queueCursor / queue.length : 1, waterDeep, waterStart));
    world.waterRise = Math.max(0, world.waterRise - dt);
    world.runLog.towerTime += world.towers.length * dt;
    if (world.water > 0) world.runLog.soakedTime += world.towers.filter(soaked).length * dt;
    if (world.water > 0) {
      // Fire fizzles: patches on water go out, and a burning fruit that wades in stops burning.
      if (world.pools.some((p) => p.hot)) world.pools = world.pools.filter((p) => !(p.hot && floodedAt(p.x, p.y)));
      for (const e of world.enemies) if (e.hp > 0 && (e.burnT ?? 0) > 0 && floodedAt(e.x, e.y)) e.burnT = 0;
    }
    for (const ice of world.ice) {
      ice.left -= dt;
      for (const e of world.enemies) {
        if (e.hp <= 0 || Math.hypot(e.x - ice.x, e.y - ice.y) > ice.r) continue;
        const held = (ice.held.get(e.id) ?? 0) + dt;
        ice.held.set(e.id, held);
        if (e.boss && held > BASEMENT.iceHoldBoss) continue;
        e.stomped = Math.max(e.stomped ?? 0, dt * 1.5);
        if (!e.icedIn) {
          e.icedIn = true;
          // One note per sheet, so fruit iced in side by side don't stack their notes.
          if (!ice.noted) {
            ice.noted = true;
            float(ice.x, ice.y - ice.r * 0.7, "iced in", "#cfe8f5");
          }
        }
      }
    }
    if (world.ice.length) world.ice = world.ice.filter((i) => i.left > 0);
  };
  /** A Freeze hit on a fruit in water: the water round it freezes (a sheet already there just lasts longer). */
  const freezeWater = (x: number, y: number) => {
    const r = CELL * BASEMENT.iceRadius;
    const near = world.ice.find((i) => Math.hypot(i.x - x, i.y - y) < r / 2);
    if (near) near.left = near.max;
    else world.ice.push({ x, y, r, left: BASEMENT.iceTime, max: BASEMENT.iceTime, held: new Map() });
  };
  /** Fire on ice melts it at once. */
  const meltIce = (x: number, y: number) => {
    if (world.ice.length) world.ice = world.ice.filter((i) => Math.hypot(i.x - x, i.y - y) > i.r);
  };
  /** The end of a wave: the water drains, unless a Drain Gourd got through (it stays at 1 through the break and the next wave). */
  const drainWater = () => {
    const plugged = drainPlugged || world.enemies.some((e) => e.native === "draingourd" && e.hp > 0);
    drainPlugged = false;
    world.ice = [];
    world.hud.plugged = plugged;
    world.water = plugged ? 1 : 0;
    world.hud.water = world.water;
    if (plugged) world.runLog.plugs += 1;
  };
  /** Gargoyle Gourd: wide awake while the clock silences the towers. */
  const awake = (e: Enemy) => (e.native === "gargoyle" && (world.bell?.quiet ?? 0) > 0 ? NATIVES.gargoyleAwake : 1);
  /** The Bell Tower: count down to the strike during a wave; when it strikes, every tower goes quiet for a moment. */
  const tickBell = (dt: number) => {
    const bell = world.bell;
    const spot = BOARDS[world.hud.map].bell;
    if (!bell || !spot) return;
    if (bell.quiet > 0) {
      bell.quiet = Math.max(0, bell.quiet - dt);
      return;
    }
    // Each Chimer on the board runs the clock faster.
    const chimers = world.enemies.filter((e) => e.native === "chimer" && e.hp > 0).length;
    const rush = Math.min(NATIVES.chimerMax, 1 + NATIVES.chimerRush * chimers);
    if (rush > 1) bellRushed = true;
    bell.next -= dt * rush;
    if (bell.next > 0) return;
    bell.next = FLOOR.bellEvery;
    bell.quiet = FLOOR.bellQuiet;
    if (bellRushed) world.runLog.chimerEarly += 1;
    bellRushed = false;
    const x = (spot[0] + 1) * CELL;
    const y = (spot[1] + 1) * CELL;
    cue("fire", "bell");
    world.rings.push({ x, y, r: Math.max(world.w, world.h), life: 0.9, max: 0.9, color: "230,195,106" });
    world.shake = world.reduced ? 0 : Math.max(world.shake, 5);
    float(x, y - 40, "BONG", "#e6c36a");
    world.hud.log = "The clock strikes. Every tower stops to listen.";
  };

  /**
   * Sir Michael's towers on top of their plain numbers: a Great tower hits DRAGON.greatDmg harder and reaches
   * DRAGON.greatRange farther; the Dragon's Roost takes its stage's share, reach and pace; In the Zone and the
   * Emberforged Armour add damage to big things.
   */
  const dragonStats = <T extends { dmg: number; range: number; interval: number }>(tower: Tower, read: T): T => {
    if (world.hud.hero !== "michael") return read;
    let out = read;
    if (tower.kind === "bombard") {
      const st = DRAGON.roostStage[roostStage(tower)];
      out = {
        ...out,
        dmg: Math.round(out.dmg * st.dmg),
        range: st.range === 0 ? GLOBAL_RANGE : Math.round(CELL * st.range),
        interval: st.pace,
      };
    }
    if (tower.great) out = { ...out, dmg: Math.max(1, Math.round(out.dmg * DRAGON.greatDmg)), range: out.range >= GLOBAL_RANGE ? out.range : Math.round(out.range * DRAGON.greatRange) };
    if (isBig(tower) && out.dmg > 0) {
      const mul = (1 + world.hud.zone) * (world.hud.armour === "ember" ? ARMOUR_VALUES.emberDmg : 1);
      if (mul !== 1) out = { ...out, dmg: Math.max(1, Math.round(out.dmg * mul)) };
    }
    return out;
  };
  /** A tower's numbers: statsCore, plus how many fruit a Ballista's spear goes through. */
  const statsFor = (tower: Tower) => {
    const s = statsCore(tower);
    return tower.kind === "ballista" ? { ...s, pierce: ballistaPierce(tower.mods) } : s;
  };
  const statsCore = (tower: Tower) => {
    const plain = withPerks(tower.kind, towerReadout(world.hud.hero, tower.kind, tower.mods, world.hud.upgrades));
    // A Copycat's copy of a heavy cannon hits for a share of the original.
    const read = tower.copied && COPY_HEAVY_KINDS.includes(tower.kind) ? { ...plain, dmg: Math.max(1, Math.round(plain.dmg * CANNON.copyHeavyDmg)) } : plain;
    if (PASSIVE.includes(tower.kind)) return read;
    // Dr. Samodovol's Close Reading: each Doctor's pick taken tonight makes his cannons fire a little faster.
    const read2 = fx.closeReading ? Math.min(3, world.runLog.doctorTaken) * fx.closeReading : 0;
    const studied = read2 > 0 ? { ...read, interval: read.interval / (1 + read2) } : read;
    const aura = quackHaste(tower) * (world.hud.golden > 0 ? CANNON.overQuackHaste : 1);
    const haste = aura;
    const hasted = haste > 1 ? { ...studied, interval: studied.interval / haste, quick: true, powered: aura > 1 } : studied;
    // The aura adds punch, too: towers in it hit harder.
    const punched = CANNON.quackPunch > 0 && quackHaste(tower) > 1 ? { ...hasted, dmg: Math.round(hasted.dmg * (1 + CANNON.quackPunch)) } : hasted;
    const base = dragonStats(tower, punched);
    if (base.range >= GLOBAL_RANGE) return base;
    // Reading Lamp: the best lamp in reach boosts this cannon (lamps do not stack).
    let boost: { range: number; pace: number } | null = null;
    for (const lamp of world.towers) {
      if (lamp.kind !== "lantern" || lamp === tower || soaked(lamp)) continue;
      const reach = towerReadout(world.hud.hero, "lantern", lamp.mods, world.hud.upgrades).range;
      if ((lamp.x - tower.x) ** 2 + (lamp.y - tower.y) ** 2 > reach * reach) continue;
      const bright = lamp.mods.includes("bright");
      const b = { range: bright ? 1.25 : CANNON.lanternRange, pace: bright ? 0.78 : CANNON.lanternPace };
      if (!boost || b.range > boost.range) boost = b;
    }
    if (!boost) return dark() ? { ...base, range: Math.round(base.range * BALANCE.archiveDark) } : base;
    return { ...base, range: Math.round(base.range * boost.range), interval: base.interval * boost.pace, lit: true };
  };
  /** The Archive is dark: see statsFor. */
  const dark = () => Boolean(BOARDS[world.hud.map].dark);
  /** A kind's reach with no tile in mind: its back-room fittings (every new one gets them), the room's dark, no lamp. */
  const rangeFor = (kind: TowerKind) => previewStats(kind).range;
  /**
   * A not-yet-built `kind`'s numbers: a throwaway tower with this kind's back-room fittings, on tile `at` (its
   * neighbours count) or off the board (no neighbours), through the same statsFor a placed tower uses.
   */
  const previewStats = (kind: TowerKind, at?: { c: number; r: number }, extra: ModId[] = []): PreviewStats => {
    const mods = [...new Set([...(world.hud.fitted[kind] ?? []), ...extra])];
    const p = at ? cellCenter(at.c, at.r) : { x: -1e6, y: -1e6 };
    const ghost: Tower = { id: -1, c: at?.c ?? -1, r: at?.r ?? -1, x: p.x, y: p.y, cd: 0, aim: 0, orange: false, kind, mods, paid: 0 };
    const now: { dmg: number; range: number; interval: number; lit?: boolean; quick?: boolean; powered?: boolean; pierce?: number } = statsFor(ghost);
    const base = towerReadout(world.hud.hero, kind, [], world.hud.upgrades);
    const fitted = towerReadout(world.hud.hero, kind, mods, world.hud.upgrades);
    const perked = withPerks(kind, fitted);
    const why: PreviewStats["why"] = { dmg: [], range: [], interval: [] };
    const fittingNames = mods.map((id) => fittingName(kind, id)).join(", ");
    const tiles = (d: number) => `${d > 0 ? "+" : ""}${(d / CELL).toFixed(1)} tiles`;
    const pct = (a: number, b: number) => `${b > a ? "+" : ""}${Math.round((b / a - 1) * 100)}%`;
    const pace = (a: number, b: number) => `${b < a ? "+" : "−"}${Math.round(Math.abs(a / b - 1) * 100)}% pace`;
    // Stage by stage: fittings, then perks, then the room and the tile.
    if (fitted.dmg !== base.dmg) why.dmg.push(`${fittingNames} ${pct(base.dmg, fitted.dmg)}`);
    if (fitted.range !== base.range) why.range.push(`${fittingNames} ${tiles(fitted.range - base.range)}`);
    if (fitted.interval !== base.interval) why.interval.push(`${fittingNames} ${pace(base.interval, fitted.interval)}`);
    if (perked.dmg !== fitted.dmg) why.dmg.push(`keeper perks ${pct(fitted.dmg, perked.dmg)}`);
    if (perked.range !== fitted.range) why.range.push(`keeper perks ${tiles(perked.range - fitted.range)}`);
    if (perked.interval !== fitted.interval) why.interval.push(`keeper perks ${pace(fitted.interval, perked.interval)}`);
    if (now.range !== perked.range) why.range.push(`${now.lit ? "Reading Lamp nearby" : "the dark"} ${pct(perked.range, now.range)}`);
    if (now.interval !== perked.interval) {
      const from = [now.lit ? "Reading Lamp nearby" : "", now.powered ? (world.hud.golden > 0 ? "Quackarot golden" : "Quack-Liber aura") : "", fx.closeReading && world.runLog.doctorTaken ? "Close Reading" : ""].filter(Boolean).join(", ");
      why.interval.push(`${from || "nearby towers"} ${pace(perked.interval, now.interval)}`);
    }
    return { ...now, base, why };
  };
  const priceNext = () =>
    Math.max(
      0,
      buildCost(world.hud.hero, placedCount(), world.hud.build, world.hud.builtKinds) -
        (bm("discount") ? BOOKMARK_VALUES.discount : 0) -
        (ownSignature(world.hud.build) ? fx.sigCost : 0),
    );
  /** What the tower being placed costs in seeds: Sir Michael's Hoard pays first for his big towers. */
  const seedPrice = () => {
    const full = priceNext();
    return world.hud.hero === "michael" && BIG_KINDS.includes(world.hud.build) ? hoardSplit(full).fromSeeds : full;
  };
  /** A keeper tower can be built only by its keeper, and only one of each at a time. */
  /** A room tower (the Sump Pump) can only be built on its own map. */
  const roomLocked = (kind: TowerKind) => ROOM_TOWER_KINDS.includes(kind) && !(ROOM_TOWERS[world.hud.map] ?? []).includes(kind);
  const signatureBlocked = (kind: TowerKind) =>
    roomLocked(kind) ||
    (kind === "geese" && world.hud.geeseSpent) ||
    (kind === "copycat" && world.hud.copycatPlaced) ||
    isSignature(kind) &&
    (!own(kind) || world.towers.filter((t) => t.kind === kind).length >= 1 + (ownSignature(kind) ? fx.sigExtra : 0));
  const hasMod = (tower: Tower, id: ModId) => tower.mods.includes(id);
  /** What a tower reaches: a Copycat reaches what its copy does. */
  const towerRange = (tower: Tower) => statsFor(tower.kind === "copycat" && tower.copy ? tower.copy : tower).range;
  /**
   * The reach a `kind` built on tile (c, r) would have: the same numbers as once it's built (its fittings, any
   * Reading Lamp in reach, the Archive's dark), so the placing preview shows what it will really hit.
   */
  const rangeAt = (kind: TowerKind, c: number, r: number) => {
    const p = cellCenter(c, r);
    const ghost: Tower = { id: -1, c, r, x: p.x, y: p.y, cd: 0, aim: 0, orange: false, kind, mods: [...(world.hud.fitted[kind] ?? [])], paid: 0 };
    return towerRange(ghost);
  };
  /** Keep the drawn reach current: the selected tower's (lamps, upgrades and copies change it), or the one being placed. */
  const syncReach = () => {
    const picked = world.hud.selected != null ? world.towers.find((t) => t.id === world.hud.selected) : undefined;
    if (picked) world.hud.range = towerRange(picked);
    else if (world.hover) world.hud.range = world.hud.placeRange = rangeAt(world.hud.build, world.hover.c, world.hover.r);
  };
  const syncPrice = () => {
    world.hud.towerCost = seedPrice();
    world.hud.placeRange = rangeFor(world.hud.build);
    if (world.hud.selected == null) world.hud.range = world.hud.placeRange;
  };

  /** The difficulty's health and speed for wave `index` (waves cleared before it; default: the wave being played). */
  const tune = (index = cleared) => {
    const found = DIFFICULTIES.find((x) => x.id === world.hud.difficulty) ?? DIFFICULTIES[1];
    // A room may slow its fruit on a difficulty (BOARDS[map].pace). Health may climb over the night (difficultyHp).
    const d = { ...found, hp: difficultyHp(found, index, world.hud.waveCount), speed: found.speed * (BOARDS[world.hud.map].pace?.[found.id] ?? 1) };
    // Mynxi's tutorial night: much softer, slower fruit, whatever the difficulty says.
    return world.hud.tutorial ? { ...d, hp: d.hp * BALANCE.tutorialHp, speed: d.speed * BALANCE.tutorialSpeed } : d;
  };
  /** Mynxi's tutorial night starts with extra seeds and stacks. */
  const tutorialStart = () => {
    world.hud.tutorial = true;
    world.hud.seeds += BALANCE.tutorialSeeds;
    world.hud.lives += BALANCE.tutorialStacks;
    world.hud.maxLives += BALANCE.tutorialStacks;
    syncPrice();
  };
  const spawnEnemy = (
    kind: EnemyKind,
    bonusHp = 1,
    guard: Guard = "none",
    flags: {
      split?: boolean;
      raw?: boolean;
      chute?: boolean;
      pit?: boolean;
      gall?: boolean;
      borrower?: boolean;
      native?: NativeId | null;
      at?: { x: number; y: number; wp: number };
      siege?: SiegeVariant | null;
      line?: number;
      leader?: boolean;
      /** A board with doors: the route (door) it walks in by. */
      route?: number;
    } = {},
  ) => {
    const st = STATS[kind];
    const own = world.routes[flags.route ?? 0] ?? world.points;
    const start = own[0];
    const tuned = tune();
    const hp = Math.round(st.hp * bonusHp * tuned.hp * (BOARDS[world.hud.map].hp ?? 1));
    const chute = Boolean(flags.chute) && !flags.at;
    // It walks in from a tile before its entrance: off the left edge, or (a door, or a board that starts off the
    // left edge, like the Flooded Basement's cellar stairs) back the way its first straight runs.
    const along = (world.doors.length > 0 || start.x > CELL) && own.length > 1;
    const inX = along ? Math.sign(own[1].x - start.x) : 1;
    const inY = along ? Math.sign(own[1].y - start.y) : 0;
    let x = flags.at?.x ?? start.x - CELL * inX;
    let y = flags.at?.y ?? start.y - CELL * inY;
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
      shell: guard === "rind" ? CANNON.shellHits : 0,
      split: Boolean(flags.split),
      raw: Boolean(flags.raw),
      bread: false,
      reverse: chute,
    });
    const host = world.enemies[world.enemies.length - 1];
    if (flags.route) host.route = flags.route;
    if (kind === "goose" || kind === "cat") siegeSetup(host, flags.siege ?? null, bonusHp * tuned.hp * (BOARDS[world.hud.map].hp ?? 1), tuned.speed, flags);
    // A boss before its night's last wave comes as a mini-boss: 150% more health than an ordinary one of its kind,
    // and a little smaller. The finale's boss is the full one.
    if (host.boss && world.hud.night !== "endless" && cleared + 1 < nightLength(world.hud.night)) {
      const base = host.matriarch ? STATS.goose.hp : host.general ? STATS.cat.hp : STATS.pumpkin.hp;
      host.hp = host.maxHp = Math.max(1, Math.round(base * BALANCE.miniBossHp * bonusHp * tuned.hp * (BOARDS[world.hud.map].hp ?? 1)));
      host.mini = true;
      host.r = Math.round(host.r * 0.8);
    }
    if (flags.pit) host.pit = true;
    if (flags.native) {
      const native = flags.native;
      host.native = native;
      if (native === "parcel") host.wrapped = true;
      if (native === "sprout") {
        host.r = NATIVES.sproutR;
        host.bedTime = 0;
      }
      if (native === "squash") host.vineCd = NATIVES.vineEvery;
      if (native === "wormgourd" || native === "wormqueen") host.speed *= NATIVES.wormSpeed;
      if (native === "wormqueen") {
        host.r = NATIVES.queenR;
        host.hp = host.maxHp = Math.round(host.maxHp * NATIVES.queenHp);
      }
      if (!world.hud.nativesSeen.includes(native)) {
        world.hud.nativesSeen = [...world.hud.nativesSeen, native];
        world.hud.log = NATIVE_INFO[native].line;
      }
    }
    if (flags.borrower) {
      host.borrower = true;
      host.hp = host.maxHp = Math.max(1, Math.round(host.maxHp * 0.4));
      host.speed *= 1.35;
      host.gold = killReward(4);
      host.r = 10;
    }
    if (flags.gall) {
      // A small corn rides a step behind the host and heals it while both live.
      const rider = Math.max(1, Math.round(STATS.corn.hp * 0.45 * bonusHp * tuned.hp * (BOARDS[world.hud.map].hp ?? 1)));
      const spot = stepBehind(host, CANNON_GALL_GAP);
      world.enemies.push({
        id: id(),
        kind: "corn",
        x: spot.x,
        y: spot.y,
        hp: rider,
        maxHp: rider,
        speed: host.speed,
        slow: 1,
        gold: killReward(4),
        r: 8,
        wp: spot.wp,
        boss: false,
        chill: 0,
        freeze: 0,
        guard: "none",
        shell: 0,
        split: false,
        raw: false,
        bread: false,
        reverse: host.reverse,
        gall: true,
        mends: host.id,
        ...(host.route ? { route: host.route } : {}),
      });
    }
  };

  /** General Mittens' extra health on a cat (on), or taken off again (off), keeping its share of health. */
  const mitten = (e: Enemy, on: boolean) => {
    if (on === Boolean(e.mittened)) return;
    const k = on ? SIEGE.generalBonus : 1 / SIEGE.generalBonus;
    e.maxHp *= k;
    e.hp = Math.min(e.maxHp, e.hp * k);
    e.mittened = on;
  };
  /**
   * A goose or cat's variant: its own health, speed and size where it has them (`hpMul` is the wave, difficulty and
   * board scale), and its flags. Plain geese are Honkers; plain cats are Private Whiskers, with Nine Lives.
   */
  const siegeSetup = (host: Enemy, siege: SiegeVariant | null, hpMul: number, speedMul: number, flags: { line?: number; leader?: boolean }) => {
    const sized = (s: { hp: number; speed?: number; r: number; gold?: number }) => {
      host.hp = host.maxHp = Math.max(1, Math.round(s.hp * hpMul));
      if (s.speed) host.speed = s.speed * speedMul;
      host.r = s.r;
      if (s.gold) host.gold = killReward(s.gold);
    };
    if (host.kind === "goose") {
      if (siege === "gosling") {
        sized(flags.leader ? { ...SIEGE.gosling, ...SIEGE.leader } : SIEGE.gosling);
        host.gosling = true;
        host.line = flags.line ?? -1;
        host.leader = Boolean(flags.leader);
      } else if (siege === "matriarch") {
        sized(SIEGE.matriarch);
        host.matriarch = true;
        host.boss = true;
        host.rallyCd = SIEGE.rallyEvery;
        world.hud.log = "The Matriarch. Every goose on the carpet listens to her.";
      }
      return;
    }
    if (siege === "tank") {
      sized(SIEGE.tank);
      host.tank = true;
    } else if (siege === "general") {
      sized(SIEGE.general);
      host.general = true;
      host.boss = true;
      world.hud.log = "General Mittens takes the field. Every cat stands a little taller.";
    } else if (siege === "boxed") host.boxed = true;
    else if (siege === "para") {
      host.para = true;
      host.descend = SIEGE.dropFall;
    } else host.lives9 = true;
    // General Mittens: every cat has more health while she stands, the ones already on the board too.
    if (host.general) {
      for (const o of world.enemies) if (o !== host && o.kind === "cat" && o.hp > 0 && !o.general) mitten(o, true);
    } else if (world.enemies.some((o) => o.general && o.hp > 0)) mitten(host, true);
  };

  /** Where a drop point is: its tile's centre on the carpet, and the waypoint a cat landing there walks to next. */
  const dropSpot = (index: number) => {
    const cells = BOARDS[world.hud.map].drops ?? [];
    const cell = cells[index] ?? cells[0];
    if (!cell) return { x: world.points[0].x, y: world.points[0].y, wp: 1 };
    const leg = legsNow().findIndex((l) => l.tiles.some(([c, r]) => c === cell[0] && r === cell[1]));
    return { ...cellCenter(cell[0], cell[1]), wp: leg >= 0 ? leg + 1 : 1 };
  };
  /** The drop points wave `index` (0-based) lands paratroopers on (the Siege only). */
  const dropsFor = (index: number) =>
    world.hud.night === "siege" ? [...new Set(waveAt(index, "siege").spawns.filter((s) => s.para).map((s) => s.drop ?? 0))] : [];
  /** Clear the Siege's per-wave state (landings on the way, fights, which pairs have fought). */
  const clearSiegeWave = () => {
    drops = [];
    fought.clear();
    world.landings = [];
    world.brawls = [];
  };
  /** Stacks a leak costs: 2 for a tank, 3 for a boss, 1 for anything else (twice that at a "double" exit). */
  const leakOf = (e: Enemy) =>
    (e.tank ? SIEGE.tank.leak : e.matriarch ? SIEGE.matriarch.leak : e.general ? SIEGE.general.leak : e.boss ? 3 : 1) *
    (exitOfRoute(e.route)?.cost === "double" ? 2 : 1);
  /** A route's door and exit (a board with exits); one-route boards: door 0, no exit. */
  const doorIdx = (route?: number) => world.routeDoor[route ?? 0] ?? route ?? 0;
  const exitOfRoute = (route?: number) => world.exits[world.routeExit[route ?? 0] ?? -1];
  /** A fruit gets out: what its exit costs (the Kitchens take seeds while the purse can pay; else stacks). */
  const leakAt = (e: Enemy) => {
    if (e.native === "draingourd") drainPlugged = true;
    const exit = exitOfRoute(e.route);
    if (exit) world.runLog.leaksByExit[exit.id] = (world.runLog.leaksByExit[exit.id] ?? 0) + 1;
    if (exit?.cost === "seeds" && world.hud.seeds >= HALL.kitchenSeeds) {
      world.hud.seeds -= HALL.kitchenSeeds;
      waveLost = true;
      float(e.x, e.y - 16, `−${HALL.kitchenSeeds} seeds, pantry raided`, "#e6c36a");
      world.hud.log = `A fruit got out through the Kitchens and raided the pantry: −${HALL.kitchenSeeds} seeds.`;
      cue("leak");
      return;
    }
    loseLife(leakOf(e), e.x, e.y, e);
  };
  /** A Box Cat loses its box (splash, burn, a puddle, or a Reading Lamp's light): from now on it's an ordinary cat. */
  const unbox = (e: Enemy) => {
    if (!e.boxed) return;
    e.boxed = false;
    world.runLog.boxesOff += 1;
    burst(e.x, e.y, "#b8895a", 8);
    float(e.x, e.y - 22, "box off", "#d8b98a");
  };
  /** A Honker's first hit: HONK. Every tower within reach skips its next shot. */
  const honk = (e: Enemy) => {
    e.honked = true;
    for (const t of [...world.towers, ...actingTowers()])
      if ((t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= SIEGE.honkReach ** 2) t.honked = true;
    world.rings.push({ x: e.x, y: e.y, r: SIEGE.honkReach, life: 0.5, max: 0.5, color: "244,241,232" });
    world.floaters.push({ x: e.x, y: e.y - 26, text: "HONK!", life: 0.9, color: "#fff4d0", size: 20 });
  };
  /** Is point `p` ahead of `e` along the carpet (the way it is walking)? A Cardboard Tank's armour faces that way. */
  const ahead = (e: Enemy, p: { x: number; y: number }) => {
    const pts = routeOf(e);
    const k = Math.max(0, Math.min(pts.length - 1, e.wp));
    let dx = pts[k].x - e.x;
    let dy = pts[k].y - e.y;
    if (Math.hypot(dx, dy) < 1) {
      const n = pts[e.reverse ? k - 1 : k + 1];
      if (n) {
        dx = n.x - e.x;
        dy = n.y - e.y;
      }
    }
    return (p.x - e.x) * dx + (p.y - e.y) * dy > 0;
  };
  /** The feud: a goose and a cat that meet stop and fight (each pair once). Bosses never stop for it. */
  const tickFeud = () => {
    const geese = world.enemies.filter((e) => e.kind === "goose" && e.hp > 0 && !e.boss);
    if (!geese.length) return;
    const cats = world.enemies.filter((e) => e.kind === "cat" && e.hp > 0 && !e.boss && (e.descend ?? 0) <= 0);
    for (const g of geese) {
      for (const c of cats) {
        if (g.hp <= 0 || c.hp <= 0) continue;
        // One fight at a time: a goose or cat already fighting lets the next one walk past.
        if ((g.brawl ?? 0) > 0 || (c.brawl ?? 0) > 0) continue;
        if ((g.x - c.x) ** 2 + (g.y - c.y) ** 2 > SIEGE.feudReach ** 2) continue;
        const key = `${g.id}:${c.id}`;
        if (fought.has(key)) continue;
        fought.add(key);
        g.halt = Math.max(g.halt ?? 0, SIEGE.feudTime);
        c.halt = Math.max(c.halt ?? 0, SIEGE.feudTime);
        g.brawl = SIEGE.feudTime;
        c.brawl = SIEGE.feudTime;
        world.brawls.push({ x: (g.x + c.x) / 2, y: (g.y + c.y) / 2, life: SIEGE.feudTime, max: SIEGE.feudTime });
        if (world.brawls.length > 30) world.brawls.splice(0, world.brawls.length - 30);
        world.runLog.feuds += 1;
        world.hud.feuds += 1;
        credit = null;
        hurt(g, null, g.maxHp * SIEGE.feudHit, 0, "feud");
        hurt(c, null, c.maxHp * SIEGE.feudHit, 0, "feud");
      }
    }
  };

  /** Creeping Squash vines: count down, burn away under fire, and wither soon after their squash is gone. */
  const tickVines = (dt: number) => {
    if (!world.vines.size) return;
    for (const [key, vine] of world.vines) {
      const [c, r] = key.split(",").map(Number);
      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      if (world.pools.some((p) => p.hot && Math.hypot(p.x - cx, p.y - cy) <= p.r)) {
        world.vines.delete(key);
        continue;
      }
      if (!world.enemies.some((o) => o.id === vine.by && o.hp > 0)) vine.life = Math.min(vine.life, NATIVES.vineWither);
      vine.life -= dt;
      if (vine.life <= 0) world.vines.delete(key);
    }
  };

  /** A Sprout that stood long enough in the beds: a full melon, at the same share of its health. */
  const growSprout = (e: Enemy) => {
    const share = e.hp / e.maxHp;
    e.kind = "melon";
    e.maxHp = Math.max(1, Math.round((e.maxHp * STATS.melon.hp) / STATS.corn.hp));
    e.hp = e.maxHp * share;
    e.speed *= STATS.melon.speed / STATS.corn.speed;
    e.r = STATS.melon.r;
    e.native = undefined;
    e.grew = 0.5;
    world.runLog.sproutsGrown += 1;
    burst(e.x, e.y, "#8fdc6a", 10);
    float(e.x, e.y - 22, "grew!", "#8fdc6a");
  };

  /** A Parcel pops: the corn inside walk on from where it stood (they pay nothing). */
  const openParcel = (e: Enemy) => {
    const scale = hpScaleFor(world.hud.night, cleared);
    for (let i = 0; i < NATIVES.parcelContents; i++) {
      const spread = (i - (NATIVES.parcelContents - 1) / 2) * 10;
      spawnEnemy("corn", scale, "none", { at: { x: e.x + spread, y: e.y + spread * 0.5, wp: Math.min(e.wp, routeOf(e).length - 1) }, route: e.route });
      const corn = world.enemies[world.enemies.length - 1];
      corn.contents = true;
      corn.gold = 0;
      corn.reverse = e.reverse;
    }
    float(e.x, e.y - 24, "contents", "#d8b98a");
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
        wp: Math.min(parent.wp, routeOf(parent).length - 1),
        ...(parent.route ? { route: parent.route } : {}),
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

  /**
   * Wave `index`'s spawn queue, exactly as it will walk in: the wave, the late slips' extras, and the room's
   * own fruit swapped in. The wave start and the Coming up bar both build it here, so they can't disagree.
   */
  const queueFor = (index: number): QueueItem[] => {
    const extra: SpawnSpec[] = [];
    if (slip("heavy") && index >= SLIP_VALUES.heavyFrom && index <= SLIP_VALUES.heavyTo) {
      extra.push({ kind: "melon", count: SLIP_VALUES.heavyCount, every: 1.2, guard: "rind", chute: true });
    }
    if (slip("karl") && index === SLIP_VALUES.karlWave) extra.push({ kind: "karl", count: 1, every: 0.4 });
    const spec = waveAt(index, world.hud.night);
    // The room's own fruit take the place of some ordinary ones.
    const spawns = trimSpawns(spec.spawns, BOARDS[world.hud.map].trim, world.hud.difficulty, index + 1);
    const all = [...spawns, ...extra];
    // A board with doors: which door each fruit walks in by (each door keeps its own spacing). A board with exits:
    // which exit it leaves by too (the signpost's shut exit counts for the next wave only).
    const board = BOARDS[world.hud.map];
    const exitCount = board.exits?.length ?? 0;
    const routes = combineRoutes(assignDoors(all, board, index + 1), assignExits(all, board, index === cleared ? world.hud.shutExit : null), exitCount);
    const doorOfRoute = exitCount ? (r: number) => Math.floor(r / exitCount) : undefined;
    return assignNatives(waveQueue(all, routes, doorOfRoute), board.natives, index + 1, world.hud.difficulty);
  };
  const buildQueue = () => {
    queue = queueFor(cleared);
    queueCursor = 0;
    spawnClock = 0;
  };

  /** What one queued enemy will have when it spawns on wave `index`: health and speed (as spawnEnemy and siegeSetup work them out). */
  const spawnNumbers = (q: QueueItem, index: number) => {
    const st = STATS[q.kind];
    const tuned = tune(index);
    const mul = hpScaleFor(world.hud.night, index) * q.tough * tuned.hp * (BOARDS[world.hud.map].hp ?? 1);
    let hp = Math.round(st.hp * mul);
    let speed = st.speed * tuned.speed;
    const sized = (v: { hp: number; speed?: number }) => {
      hp = Math.max(1, Math.round(v.hp * mul));
      if (v.speed) speed = v.speed * tuned.speed;
    };
    if (q.siege === "gosling") sized(q.leader ? { ...SIEGE.gosling, ...SIEGE.leader } : SIEGE.gosling);
    else if (q.siege === "matriarch") sized(SIEGE.matriarch);
    else if (q.siege === "tank") sized(SIEGE.tank);
    else if (q.siege === "general") sized(SIEGE.general);
    const boss = Boolean(st.boss) || q.siege === "matriarch" || q.siege === "general";
    const mini = boss && world.hud.night !== "endless" && index + 1 < nightLength(world.hud.night);
    if (mini) {
      const base = q.siege === "matriarch" ? STATS.goose.hp : q.siege === "general" ? STATS.cat.hp : STATS.pumpkin.hp;
      hp = Math.max(1, Math.round(base * BALANCE.miniBossHp * mul));
    }
    if (q.borrower) {
      hp = Math.max(1, Math.round(hp * 0.4));
      speed *= 1.35;
    }
    return { hp, speed, boss, mini };
  };
  /** Queue items as groups of identical enemies, in spawn order. */
  const groupQueue = (items: QueueItem[], index: number): WaveGroup[] => {
    const out: WaveGroup[] = [];
    for (const q of items) {
      const n = spawnNumbers(q, index);
      const g: WaveGroup = {
        kind: q.kind,
        guard: q.guard,
        split: q.split,
        raw: q.raw,
        chute: q.chute,
        pit: q.pit,
        gall: q.gall,
        borrower: q.borrower,
        native: q.native,
        siege: q.siege,
        leader: q.leader,
        boss: n.boss,
        mini: n.mini,
        count: 1,
        hp: n.hp,
        speed: n.speed,
        ...(q.route != null && world.doors[doorIdx(q.route)] ? { door: world.doors[doorIdx(q.route)].id } : {}),
        ...(q.route != null && exitOfRoute(q.route) ? { exit: exitOfRoute(q.route)!.id } : {}),
      };
      const last = out[out.length - 1];
      const same = last && (Object.keys(g) as Array<keyof WaveGroup>).every((k) => k === "count" || last[k] === g[k]);
      if (same) last.count += 1;
      else out.push(g);
    }
    return out;
  };
  /** A wave's threat: health × speed, bosses and tanks counted by what a leak costs. */
  const threatOf = (groups: WaveGroup[]) =>
    groups.reduce((sum, g) => sum + g.count * g.hp * g.speed * (g.boss ? 3 : g.siege === "tank" ? 2 : 1), 0);
  /** The flags and notes for a wave's groups. */
  const flagsFor = (groups: WaveGroup[], drops: number[]) => {
    const has = (f: (g: WaveGroup) => boolean) => groups.some(f);
    const armoured = (g: WaveGroup) => g.guard === "rind" || g.guard === "husk" || g.guard === "damp" || g.pit;
    const front = groups.slice(0, 2);
    const flags = [
      has((g) => g.boss) ? "Boss" : "",
      has((g) => g.chute) ? "Up the chute" : "",
      drops.length ? "Paratroopers" : "",
      has((g) => g.siege === "boxed") ? "Box Cats (can't be aimed at)" : "",
      front.length && front.every(armoured) ? "Armoured front" : "",
      has((g) => g.gall) ? "Gall riders" : "",
      has((g) => g.borrower) ? "Borrowers take seeds" : "",
    ].filter(Boolean);
    return flags.slice(0, 3);
  };
  const notesFor = (groups: WaveGroup[], index: number, drops: number[]) => {
    const has = (f: (g: WaveGroup) => boolean) => groups.some(f);
    return [
      world.hud.night === "overflow" && index >= WAVE_COUNT - 2 ? "+1 shelled melon up the chute per 25 absurdity" : "",
      has((g) => g.split) ? "Split pumpkins crack into four melons" : "",
      has((g) => g.native === "parcel") ? "Parcels drop three corn" : "",
      has((g) => g.native === "sprout") ? "Sprouts grow into melons in the beds" : "",
      has((g) => g.gall) ? "A gall rides each gall pumpkin" : "",
      drops.length ? "Paratroopers land halfway" : "",
      has((g) => g.kind === "cat") && has((g) => g.siege === "general") ? "Cats have more health while General Mittens stands" : "",
    ].filter(Boolean);
  };
  /** Waves to rank a wave against: tonight's (Endless: the next ten). */
  const rankRange = (index: number) => {
    if (world.hud.night === "endless") return Array.from({ length: 10 }, (_, k) => index + k);
    return Array.from({ length: nightLength(world.hud.night) }, (_, k) => k);
  };
  const previewOf = (index: number, items: QueueItem[], drops: number[]): WavePreview => {
    const groups = groupQueue(items, index);
    const threat = threatOf(groups);
    const all = rankRange(index).map((i) => (i === index ? threat : threatOf(groupQueue(queueFor(i), i))));
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pips = hi > lo ? 1 + Math.round(((threat - lo) / (hi - lo)) * 4) : 3;
    const prev = index > 0 ? threatOf(groupQueue(queueFor(index - 1), index - 1)) : null;
    const trend = prev == null ? null : threat > prev * 1.05 ? "up" : threat < prev * 0.95 ? "down" : null;
    return {
      index,
      name: waveAt(index, world.hud.night).name,
      groups,
      notes: notesFor(groups, index, drops),
      threat,
      pips,
      trend,
      flags: flagsFor(groups, drops),
      drops,
    };
  };
  /** Wave `index`'s preview, as it will walk in. */
  const wavePreview = (index: number) => previewOf(index, queueFor(index), dropsFor(index));
  /** The Coming up bar: the next wave between waves; during one, what's still to come (paratroopers on the way included). */
  const comingUp = (): WavePreview => {
    if (world.hud.phase !== "combat") return wavePreview(cleared);
    const left = [...queue.slice(queueCursor), ...drops.map((d) => d.q)];
    return previewOf(cleared, left, world.hud.dropWave);
  };

  /** Bookworm fruit jamming a bay this wave (cranks jammed next break). */
  const jamNext = new Set<number>();
  const inBay = (bay: Bay, c: number, r: number) => c >= bay.cols[0] && c <= bay.cols[1] && r >= bay.rows[0] && r <= bay.rows[1];
  /** The bay a point is in (-1: none). */
  const bayAt = (x: number, y: number) => (BOARDS[world.hud.map].bays ?? []).findIndex((b) => inBay(b, Math.floor(x / CELL), Math.floor(y / CELL)));
  /** A Bookworm in the shelves: half hidden, so only area towers can aim at it or hurt it. */
  const burrowed = (e: Enemy) => (e.native === "wormgourd" || e.native === "wormqueen") && e.hp > 0 && bayAt(e.x, e.y) >= 0;
  /** Towers that must stand beside the carpet, and whether this one has lost it (a crank rolled it away). */
  const idleTower = (t: Tower) =>
    t.kind === "pamphlet" ? (t.leg ?? -1) < 0 : (t.kind === "gourdgate" || t.kind === "desk") && !besideCarpet(world, t.c, t.r);
  /**
   * The Compact Stacks: rebuild everything worked out from the carpet once (cells, verge, shelves, routes, the
   * tiles nothing may be built on), then refresh every cache that read it: Gates find their new spot, Posts bind
   * their straight again, Orreries reset their orbit, and carpet-side towers with no carpet beside them go idle.
   */
  const rebuildCarpet = () => {
    const board = BOARDS[world.hud.map];
    const built = buildRoutes({ ...board, corners: pathFor(board, world.hud.aisles) });
    world.pathCells = built.cells;
    world.vergeCells = built.verge;
    world.shelfCells = shelfCells(world.hud.map, built.cells, built.verge, world.hud.aisles);
    world.points = built.points;
    world.turns = built.turns;
    world.routes = built.routes;
    world.segments = built.segments;
    world.trunk = built.points;
    const tracks = trackCells(board);
    for (const k of built.cells) tracks.delete(k);
    world.trackCells = tracks;
    legCache = null;
    for (const t of world.towers) {
      t.gate = undefined;
      if (t.kind === "pamphlet") t.leg = bindLeg(legsNow(), t.c, t.r);
      if (t.kind === "orrery") t.orbit = statsFor(t).range;
      t.idle = idleTower(t);
    }
    world.crankHint = null;
    syncReach();
  };
  /** Carpet tiles within reach of the towers that aim (each tile once per tower), for a set of carpet cells. */
  const coverOf = (cells: Set<string>) => {
    let n = 0;
    for (const t of world.towers) {
      if (PASSIVE.includes(t.kind)) continue;
      const range = statsFor(t).range;
      for (const k of cells) {
        const [c, r] = k.split(",").map(Number);
        if ((c * CELL + CELL / 2 - t.x) ** 2 + (r * CELL + CELL / 2 - t.y) ** 2 <= range * range) n += 1;
      }
    }
    return n;
  };
  /** What turning bay `bay`'s crank would do, without turning it. */
  const crankPreview = (bay: number): CrankPreview => {
    const board = BOARDS[world.hud.map];
    const b = board.bays?.[bay];
    const from = world.pathCells.size;
    const none = { from, to: from, idle: [], cover: 0, coverAfter: 0, corners: [] as Array<[number, number]> };
    if (!b) return { ok: false, why: "There's no crank here.", ...none };
    const why =
      world.hud.phase !== "prep" || world.enemies.some((e) => e.hp > 0)
        ? "The shelves only roll between waves."
        : world.hud.cranked
          ? "One crank a break: you've turned one already."
          : world.hud.jammed.includes(bay)
            ? "Jammed: a bookworm in the works."
            : "";
    const aisles = [...world.hud.aisles];
    aisles[bay] = b.aisles[(b.aisles.indexOf(aisles[bay]) + 1) % b.aisles.length];
    const corners = pathFor(board, aisles);
    const next = buildRoutes({ ...board, corners });
    const legs = carpetLegs(next.points);
    const idle = world.towers
      .filter((t) =>
        t.kind === "pamphlet"
          ? bindLeg(legs, t.c, t.r) < 0
          : (t.kind === "gourdgate" || t.kind === "desk") && !besideCarpet({ pathCells: next.cells, vergeCells: next.verge }, t.c, t.r),
      )
      .map((t) => t.id);
    return { ok: !why, why, from, to: next.cells.size, idle, cover: coverOf(world.pathCells), coverAfter: coverOf(next.cells), corners };
  };
  /** Turn bay `bay`'s crank: its shelves roll and the next aisle opens (top, middle, bottom, then top again). */
  const crank = (bay: number) => {
    const board = BOARDS[world.hud.map];
    const b = board.bays?.[bay];
    if (!b) return;
    const p = crankPreview(bay);
    if (!p.ok) {
      world.hud.log = p.why;
      notify();
      return;
    }
    const before = world.hud.aisles[bay];
    const aisles = [...world.hud.aisles];
    aisles[bay] = b.aisles[(b.aisles.indexOf(before) + 1) % b.aisles.length];
    world.hud.aisles = aisles;
    world.hud.cranked = true;
    world.runLog.cranks += 1;
    rebuildCarpet();
    world.crankAnim = { bay, left: 0.5, dir: Math.sign(aisles[bay] - before) };
    world.shake = world.reduced ? 0 : 4;
    for (let c = b.cols[0]; c <= b.cols[1]; c++) burst(c * CELL + CELL / 2, aisles[bay] * CELL + CELL / 2, "#b9ab94", 2);
    const name = ["top", "middle", "bottom"][b.aisles.indexOf(aisles[bay])] ?? "next";
    const idled = world.towers.filter((t) => t.idle).length;
    world.hud.log = `Bay ${"AB"[bay]}: the ${name} aisle is open. Path ${p.from} → ${p.to} tiles.${idled ? ` ${idled === 1 ? "A tower has" : `${idled} towers have`} no carpet beside ${idled === 1 ? "it" : "them"} now.` : ""}`;
    cue("rumble");
    notify();
  };
  /** Bookworm Queen cocoons: two Bookworm Gourds hatch unless splash or fire gets there first. */
  const tickCocoons = (dt: number) => {
    if (!world.cocoons.length) return;
    // A fire patch burns a cocoon away.
    world.cocoons = world.cocoons.filter((k) => !world.pools.some((p) => (p.hot || (p.burn ?? 0) > 0) && Math.hypot(p.x - k.x, p.y - k.y) <= p.r + 6));
    const scale = hpScaleFor(world.hud.night, cleared);
    for (const k of world.cocoons) {
      k.left -= dt;
      if (k.left > 0) continue;
      for (let i = 0; i < NATIVES.cocoonHatch; i++) {
        const spread = (i - (NATIVES.cocoonHatch - 1) / 2) * 12;
        spawnEnemy("pumpkin", scale, "none", { at: { x: k.x + spread, y: k.y, wp: k.wp }, route: k.route, native: "wormgourd" });
      }
      float(k.x, k.y - 20, "hatched", "#8fc06a");
    }
    world.cocoons = world.cocoons.filter((k) => k.left > 0);
  };
  /**
   * The Hall of Doors' signpost, between waves: shut the next exit for the next wave (none, then each exit in turn;
   * the boss-only exit is skipped when the wave brings a boss). The lamps and the Coming up bar follow.
   */
  const turnSign = () => {
    const board = BOARDS[world.hud.map];
    if (!board.exits?.length || world.hud.phase !== "prep") return;
    const boss = queueFor(cleared).some((q) => Boolean(STATS[q.kind].boss) || q.siege === "matriarch" || q.siege === "general");
    const cycle: Array<ExitId | null> = [null, ...board.exits.filter((x) => !(x.bossOnly && boss)).map((x) => x.id)];
    const at = cycle.indexOf(world.hud.shutExit);
    world.hud.shutExit = cycle[(at + 1) % cycle.length];
    const shut = world.hud.shutExit;
    world.hud.log = shut
      ? `The ${EXIT_NAME[shut]}${shut === "restricted" ? " is" : shut === "kitchens" ? " are" : " is"} closed for the next wave.${shut === "kitchens" ? " Mind your stacks." : shut === "reading" ? " Mind the pantry." : ""}`
      : "Every exit is open for the next wave.";
    cue("creak");
    syncDoors();
    notify();
  };
  /**
   * A board with doors: which doors are open for wave `cleared + 1` (the open carpet follows), and the lamps
   * between waves (the next wave's first door). Called with the board and after every wave.
   */
  const syncDoors = () => {
    if (!world.doors.length) return;
    const board = BOARDS[world.hud.map];
    const wave = cleared + 1;
    world.doors.forEach((d, i) => (d.open = (board.doors?.[i]?.from ?? 1) <= wave));
    world.segments = [...world.doors.filter((d) => d.open).map((d) => d.seg), world.trunk, ...world.exits.map((x) => x.seg)];
    legCache = null;
    const first = queueFor(cleared)[0]?.route ?? 0;
    world.doors.forEach((d, i) => (d.lit = i === doorIdx(first)));
    world.exits.forEach((x, i) => (x.lit = i === (world.routeExit[first] ?? -1)));
  };
  const applyBoard = (map: MapId) => {
    const built = buildRoutes(BOARDS[map]);
    world.pathCells = built.cells;
    world.vergeCells = built.verge;
    world.shelfCells = shelfCells(map, built.cells, built.verge);
    world.points = built.points;
    world.turns = built.turns;
    world.routes = built.routes;
    world.segments = built.segments;
    world.doors = (BOARDS[map].doors ?? []).map((d, i) => ({ id: d.id, open: true, cells: built.doorCells[i], lit: false, seg: built.segments[i] }));
    world.routeDoor = built.routeDoor;
    world.routeExit = built.routeExit;
    world.trunk = built.segments[world.doors.length] ?? built.points;
    world.exits = (BOARDS[map].exits ?? []).map((x, i) => ({
      id: x.id,
      cost: x.cost,
      bossOnly: Boolean(x.bossOnly),
      cells: built.exitCells[i],
      lit: false,
      seg: built.segments[world.doors.length + 1 + i],
    }));
    world.hud.shutExit = null;
    if (world.doors.length) world.segments = [...built.segments];
    // The Compact Stacks: both bays back on their middle aisle every night.
    const bays = BOARDS[map].bays;
    world.hud.aisles = bays ? bays.map((b) => b.aisles[1]) : [];
    world.hud.cranked = false;
    world.hud.jammed = [];
    world.cocoons = [];
    world.crankAnim = null;
    world.crankHint = null;
    world.trackCells = new Set();
    legCache = null;
    world.heights = heightTiles(map);
    world.water = 0;
    world.waterRise = 0;
    world.ice = [];
    world.hud.water = 0;
    world.hud.plugged = false;
    world.floors = floorTiles(map);
    world.bell = BOARDS[map].bell ? { next: FLOOR.bellEvery, quiet: 0 } : null;
    world.vines = new Map();
    world.landings = [];
    world.brawls = [];
    Object.assign(world, boardSize(map));
    world.hud.map = map;
    if (bays) rebuildCarpet();
    syncDoors();
  };
  applyBoard(world.hud.map);

  /**
   * Clear everything a run built up (board, waves, picks, seeds, stacks) and keep the setup:
   * night, map, difficulty, bookmark and keeper. Speed is a
   * preference and is kept too.
   */
  const resetRunState = () => {
    resetRunLog();
    lastMode = {};
    world.wet = new Set();
    lecture = null;
    lectureNow = null;
    reached.clear();
    world.hud.vaelOpen = 0;
    world.hud.fullyUpgraded = 0;
    world.enemies = [];

    world.towers = [];
    world.shots = [];
    world.pools = [];
    world.ice = [];
    world.water = 0;
    world.waterRise = 0;
    drainPlugged = false;
    world.sparks = [];
    world.lines = [];
    world.rings = [];
    world.stomps = [];
    world.flyers = [];
    world.stains = [];
    world.marks = [];
    world.bits = [];
    world.floaters = [];
    world.shake = 0;
    world.hover = null;
    cleared = 0;
    queue = [];
    queueCursor = 0;
    spawnClock = 0;
    syncDoors();
    karlReward = false;
    absorbed = 0;
    materialNoted = false;
    windUsed = false;
    goldenUsed = false;
    world.hud.golden = 0;
    absurdDrops = 0;
    stillBuilt = false;
    tally.clear();
    clearSiegeWave();
    applyBoard(world.hud.map);
    const opening = waveAt(0, world.hud.night);
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
      absurdity: 0,
      selected: null,
      canPlace: false,
      towerCost: TOWERS.melon.cost,
      range: 132,
      placeRange: 132,
      left: 0,
      waveSize: 0,
      branch: null,
      armour: null,
      hoard: 0,
      zone: 0,
      roostFed: false,
      build: "melon",
      shopVisits: 0,
      fitted: {},
      workshop: null,
      heavyOpen: false,
      vaelOpen: 0,
      fullyUpgraded: 0,
      setupPage: "who",
      builtKinds: [],
      pickCards: [],
      cardPicks: [],
      checkout: false,
      newShelves: [],
      nightFragments: [],
      canRestore: null,
      paused: false,
      menu: null,
      waveCount: nightLength(world.hud.night),
      newUnlocks: [],
      newMaps: [],
      chuteWave: false,
      nativesSeen: [],
      dropWave: [],
      feuds: 0,
      comboTips: [],
      shopRings: [],
      dropSeen: false,
      quackAura: CANNON.quackAura,
      golden: 0,
      shutExit: null,
      aisles: BOARDS[world.hud.map].bays?.map((b) => b.aisles[1]) ?? [],
      water: 0,
      plugged: false,
      cranked: false,
      jammed: [],
      tagTeam: false,
      geeseSpent: false,
      ki: 0,
      copycatPlaced: false,
      sisu: 0,
    };
  };

  /** Does wave `index` (0-based) send anything up the Overflow's chute? */
  const usesChute = (index: number) =>
    world.hud.night === "overflow" &&
    (waveAt(index, world.hud.night).spawns.some((s) => s.chute) ||
      index >= WAVE_COUNT - 2 ||
      (slip("heavy") && index >= SLIP_VALUES.heavyFrom && index <= SLIP_VALUES.heavyTo));

  /** A borrower at the door: takes seeds, not a stack, and pays no kill gold. */
  const borrow = (e: Enemy) => {
    world.runLog.borrowersAtDoor += 1;
    if (world.hud.night !== "endless" && cleared === nightLength(world.hud.night) - 1) world.runLog.borrowersOnLastWave += 1;
    const took = Math.min(world.hud.seeds, BALANCE.borrowTake);
    world.hud.seeds -= took;
    e.hp = 0;
    float(e.x, e.y - 16, took > 0 ? `−${took} seeds` : "borrow", "#e6c36a");
    world.hud.log = took > 0 ? `A borrower reached the door and left with ${took} seeds.` : "A borrower reached the door. The purse was empty.";
  };
  const loseLife = (n: number, x: number, y: number, from?: Enemy) => {
    if (world.hud.hero === "ooze" && absorbed < 1 + fx.absorb && n === 1) {
      absorbed += 1;
      world.runLog.absorbed += 1;
      float(x, y, "absorbed", "#6fc6ef");
      world.rings.push({ x, y, r: 26, life: 0.5, max: 0.5, color: "111,198,239" });
      return;
    }
    const lost = Math.min(n, world.hud.lives);
    world.hud.lives = Math.max(0, world.hud.lives - n);
    // Sir Michael's In the Zone: a lost stack ends the run of clean waves.
    if (lost > 0 && world.hud.zone > 0) {
      world.hud.zone = 0;
      float(x, y - 14, "out of the zone", "#6fa8ef");
    }
    if (lost > 0) waveLost = true;
    const log = world.runLog;
    log.stacksLost += lost;
    if (from?.reverse) log.chuteStacksLost += lost;
    if (from && world.doors.length) {
      const door = world.doors[doorIdx(from.route)]?.id;
      if (door) log.leaksByDoor[door] = (log.leaksByDoor[door] ?? 0) + 1;
    }

    if (from?.kind === "karl") log.karlStacksLost += lost;
    log.minStacks = Math.min(log.minStacks, world.hud.lives);
    world.shake = world.reduced ? 0 : 8;
    if (world.hud.hero === "asser") {
      // Material: it all goes in the book. Every stack lost pays seeds.
      const pay = n * (ASSER_VALUES.materialSeeds + fx.material);
      world.hud.seeds += pay;
      float(x, y, `−${n} stack${n > 1 ? "s" : ""} · +${pay}`, "#e23b4a");
      if (!materialNoted) {
        materialNoted = true;
        world.hud.log = "Asser: “That one's going in the book.”";
      }
      // Rally: every Lion Blade swings at once, and harder (once per leak; rallies don't add up).
      for (const blade of world.towers) {
        if (blade.kind !== "lionblade") continue;
        blade.cd = 0;
        blade.bladeRally = true;
      }
      // Second Wind (perk): once a night, at 5 stacks or fewer, he gets 5 back.
      if (fx.secondWind && !windUsed && world.hud.lives <= 5) {
        windUsed = true;
        world.hud.lives = Math.min(world.hud.maxLives, world.hud.lives + 5);
        float(x, y - 18, "second wind", "#6fa8ef");
        world.hud.log = "Asser gets back up. “Not yet.”";
      }
      syncSisu();
    } else {
      float(x, y, n > 1 ? `−${n} stacks` : "Leak", "#e23b4a");
    }
    // Over Nine Thousand Quacks (perk): once a night, at 5 stacks or fewer, Quackarot goes golden.
    if (world.hud.hero === "quack" && fx.overQuack && !goldenUsed && world.hud.lives > 0 && world.hud.lives <= CANNON.overQuackAt) {
      goldenUsed = true;
      world.hud.golden = CANNON.overQuackTime;
      world.runLog.wentGolden = true;
      world.rings.push({ x: world.w / 2, y: world.h / 2, r: Math.max(world.w, world.h), life: 0.9, max: 0.9, color: "255,214,90", fill: true });
      world.floaters.push({ x: world.w / 2, y: world.h / 2 - 30, text: "POWER LEVEL: ABSURD", life: 1.8, color: "#ffd65a", size: 26 });
      world.hud.log = "Quackarot goes golden. “This isn't even my final post!” Every tower fires faster for a moment.";
      cue("golden");
    }
    cue("leak");
    if (world.hud.lives <= 0) {
      cue("defeat");
      world.hud.phase = "defeat";
      world.hud.log = `The stacks are pulp. ${world.hud.hero ? `${KEEPER_NAMES[world.hud.hero].short}: ${KEEPER_VOICE[world.hud.hero].lose}` : ""}`.trim();
      bumpBest();
      finishNight(false);
      notify();
    }
  };

  /** Is (x, y) on carpet the Unstoppered has soaked? */
  const wetAt = (x: number, y: number) => world.wet.has(`${Math.floor(x / CELL)},${Math.floor(y / CELL)}`);
  const addPool = (x: number, y: number, wide = false, cling = false, extra = 0) => {
    const sticky = has("sticky");
    const vial = has("vial") || has("distill");
    let life = sticky ? 3.2 : vial ? 2.6 : 1.8;
    let r = sticky ? 52 : vial ? 30 : 40;
    if (wide) r += 16;
    r += extra;
    if (cling) life += 1.2;
    if (wetAt(x, y)) life *= CANNON.wetPuddle;
    if (world.heights.size && floodedAt(x, y)) r *= BASEMENT.puddleWide;
    world.pools.push({ x, y, r, life, max: life, hot: false, burn: 0, owner: credit ?? undefined });
  };

  const addFire = (x: number, y: number, life = 2.4, burn = 22) => {
    if (world.heights.size) {
      // The Flooded Basement: fire melts any ice it lands on, and fizzles out on water.
      meltIce(x, y);
      if (floodedAt(x, y)) {
        world.rings.push({ x, y, r: 18, life: 0.4, max: 0.4, color: "220,225,230" });
        return;
      }
    }
    if (wetAt(x, y)) {
      life *= CANNON.wetFire;
      burn *= CANNON.wetFire;
    }
    world.pools.push({ x, y, r: 34, life, max: life, hot: true, burn, owner: credit ?? undefined });
  };

  /** Pumpkin Trebuchet: push a fruit back along the carpet, never past where it came in. */
  /** Where `e` would be `distance` px back along the carpet it came from (the same walk as pushBack, but `e` stays put). */
  const stepBehind = (e: Enemy, distance: number) => {
    const at = { x: e.x, y: e.y, wp: e.wp };
    let left = distance;
    for (let guard = 0; left > 0 && guard < 8; guard++) {
      const prevIdx = e.reverse ? at.wp + 1 : at.wp - 1;
      const prev = routeOf(e)[prevIdx];
      if (!prev) break;
      const d = Math.hypot(prev.x - at.x, prev.y - at.y);
      if (d <= left) {
        at.x = prev.x;
        at.y = prev.y;
        left -= d;
        at.wp = prevIdx;
      } else {
        at.x += ((prev.x - at.x) / d) * left;
        at.y += ((prev.y - at.y) / d) * left;
        left = 0;
      }
    }
    return at;
  };
  const pushBack = (e: Enemy, distance: number) => {
    let left = distance;
    for (let guard = 0; left > 0 && guard < 8; guard++) {
      const prevIdx = e.reverse ? e.wp + 1 : e.wp - 1;
      const prev = routeOf(e)[prevIdx];
      if (!prev) break;
      const d = Math.hypot(prev.x - e.x, prev.y - e.y);
      if (d <= left) {
        e.x = prev.x;
        e.y = prev.y;
        left -= d;
        e.wp = prevIdx;
      } else {
        e.x += ((prev.x - e.x) / d) * left;
        e.y += ((prev.y - e.y) / d) * left;
        left = 0;
      }
    }
  };

  /** Gourd Gate: the point on the carpet nearest the tower (worked out once). */
  const gateSpot = (tower: Tower) => {
    if (tower.gate) return tower.gate;
    // The same point the reach preview draws (gateStrip in rules.ts). A board with doors: on the nearest piece of carpet.
    if (world.routes.length > 1) {
      const near = nearestSegment(world.segments, tower.x, tower.y);
      tower.gate = { ...near.spot, seg: near.seg };
    } else tower.gate = nearestOnCarpet(world.points, tower.x, tower.y);
    return tower.gate;
  };
  /** Gourd Gate: every fruit on the carpet just short of the portcullis (from whichever way it walks). */
  const atGate = (tower: Tower) => {
    const g = gateSpot(tower);
    // How far along each route the portcullis is (null: that route doesn't pass it).
    const alongs = new Map<number, number | null>();
    const gateAlong = (e: Enemy) => {
      const ri = e.route ?? 0;
      if (!alongs.has(ri)) {
        if (world.routes.length <= 1) alongs.set(ri, g.along);
        else {
          const n = nearestOnCarpet(routeOf(e), g.x, g.y);
          alongs.set(ri, Math.hypot(n.x - g.x, n.y - g.y) < 1 ? n.along : null);
        }
      }
      return alongs.get(ri) ?? null;
    };
    return world.enemies.filter((e) => {
      if (e.hp <= 0) return false;
      const ga = gateAlong(e);
      if (ga == null) return false;
      const { along } = carpetAlong(routeOf(e), e.x, e.y, e.wp, e.reverse);
      return e.reverse ? along >= ga - 4 && along - ga <= CANNON.gateBand : along <= ga + 4 && ga - along <= CANNON.gateBand;
    });
  };
  /** Gourd Gate: drop the portcullis when fruit reach it (and it's ready), hold what's there, and shoot it. */
  const tickGate = (tower: Tower, dt: number) => {
    const g = gateSpot(tower);
    tower.gateDown = Math.max(0, (tower.gateDown ?? 0) - dt);
    tower.gateAge = (tower.gateAge ?? 0) + dt;
    const held = atGate(tower);
    if (tower.gateDown <= 0 && tower.cd <= 0 && held.length) {
      tower.gateDown = CANNON.gateHold;
      tower.gateAge = 0;
      tower.cd = statsFor(tower).interval;
      cue("fire", "gourdgate");
      world.shake = Math.max(world.shake, world.reduced ? 0 : 2);
      world.rings.push({ x: g.x, y: g.y, r: 26, life: 0.4, max: 0.4, color: "232,136,58" });
    }
    if (tower.gateDown <= 0) return;
    const dps = statsFor(tower).dmg;
    for (const e of held) {
      if (e.boss && tower.gateAge > CANNON.gateBossHold) continue;
      e.stomped = Math.max(e.stomped ?? 0, dt * 1.5);
      hurt(e, null, dps * dt);
    }
  };
  /**
   * The Post (pamphlet): armed, it goes off when a fruit on its straight reaches the straight's far end (in its
   * own walking direction) with at least `pamphletCrowd` living fruit there, that one included. Every one
   * of them takes one Post hit (towerReadout's pamphlet damage). Spent, it re-arms once fewer than that are on the straight.
   */
  const tickPamphlet = (tower: Tower, dt: number) => {
    tower.blast = Math.max(0, (tower.blast ?? 0) - dt);
    const legs = legsNow();
    const leg = legs[tower.leg ?? -1];
    if (!leg) return;
    const prev = tower.prevAlong ?? {};
    const next: Record<number, number> = {};
    const on: Enemy[] = [];
    const turning: Enemy[] = [];
    for (const e of world.enemies) {
      if (e.hp <= 0) continue;
      // Along its own route; its straights there are numbered as the board's (so each Post binds one straight).
      const own = routeLegs(e.route ?? 0);
      const legAt = (a: number) => own.map[legOf(own.legs, a, e.reverse)] ?? -1;
      const { along } = carpetAlong(routeOf(e), e.x, e.y, e.wp, e.reverse);
      next[e.id] = along;
      if (legAt(along) === tower.leg) {
        on.push(e);
        continue;
      }
      const mine = own.legs[own.map.indexOf(tower.leg ?? -1)];
      if (!mine) continue;
      // Just reached the far end this tick (a corner belongs to the leg it walks into, so it has left this one).
      const was = prev[e.id];
      const ended = e.reverse ? along <= mine.from : along >= mine.to;
      if (was !== undefined && legAt(was) === tower.leg && ended && !(e.driven && e.driven > 0)) turning.push(e);
    }
    tower.prevAlong = next;
    if (!tower.armed) {
      if (on.length < CANNON.pamphletCrowd) tower.armed = true;
      return;
    }
    if (!turning.length || on.length + turning.length < CANNON.pamphletCrowd) return;
    const dmg = statsFor(tower).dmg;
    for (const e of [...on, ...turning]) hurt(e, null, dmg, 0, "shot");
    tower.armed = false;
    tower.blast = 0.3;
    cue("fire", "pamphlet");
    world.shake = Math.max(world.shake, world.reduced ? 0 : 2);
  };
  /** Harvest Bombard: the fruit with the most others around it (ties go to the one furthest along). */
  const densest = (pool: Enemy[]) => {
    let best = pool[0];
    let score = -1;
    for (const e of pool) {
      let n = 0;
      for (const o of pool) if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= CANNON.bombardRadius ** 2) n++;
      const s = n * 1e6 + (world.routes.length > 1 ? -toExit(e) / 1000 : e.wp * 1000);
      if (s > score) {
        score = s;
        best = e;
      }
    }
    return best;
  };

  /** Anti-Geese Protocol on Auto: a crowd in the ring, or a fruit in the last three tiles before the door. */
  const geeseShouldFire = (inRange: Enemy[]) =>
    inRange.filter((e) => !e.boss).length >= CANNON.geeseCrowd ||
    inRange.some((e) => !e.boss && nearDoor(e));
  /** Anti-Geese Protocol: shove every non-boss fruit in the ring back down the carpet, then the tower is gone. */
  const fireGeese = (tower: Tower, inRange: Enemy[]) => {
    credit = tower.id;
    for (const e of inRange) {
      if (e.hp <= 0) continue;
      hurt(e, null, CANNON.geeseDamage);
      if (e.boss || e.hp <= 0) continue;
      // It finally means it: a goose is thrown twice as far, and panics.
      const goose = e.kind === "goose";
      pushBack(e, CANNON.geeseShove * (goose ? SIEGE.protocolThrow : 1));
      if (goose) {
        e.panic = SIEGE.protocolPanic;
        world.runLog.protocolGeese += 1;
        float(e.x, e.y - 22, "panic!", "#f3ce78");
      }
    }
    const range = statsFor(tower).range;
    world.rings.push({ x: tower.x, y: tower.y, r: range, life: 0.7, max: 0.7, color: "243,206,120" });
    world.rings.push({ x: tower.x, y: tower.y, r: range * 0.6, life: 0.5, max: 0.5, color: "255,240,200", fill: true });
    burst(tower.x, tower.y - 10, "#f4f1e8", 18);
    float(tower.x, tower.y - 28, "PROTOCOL", "#f3ce78");
    cue("fire", "trebuchet");
    world.shake = Math.max(world.shake, 0.25);
    const thrown = inRange.filter((e) => !e.boss).length;
    if (CANNON.geeseRecharge > 0) {
      // It recharges instead of being used up.
      tower.cd = CANNON.geeseRecharge;
      tower.geeseReady = world.anim + CANNON.geeseRecharge;
      world.hud.log = `Quackarot: “Anti-Geese Protocol, go!” ${thrown} thrown back. It recharges in ${CANNON.geeseRecharge} s.`;
      syncPrice();
      return;
    }
    world.towers = world.towers.filter((t) => t !== tower);
    if (world.hud.selected === tower.id) world.hud.selected = null;
    world.hud.geeseSpent = true;
    world.hud.log = `Quackarot: “Anti-Geese Protocol, go!” ${thrown} thrown back. It can be rebuilt after this wave.`;
    syncPrice();
  };

  /** How the last hit landed (set by hurt for onDeath; a swallow or other direct pop leaves it null). */
  let deathVia: string | null = null;
  const onDeath = (e: Enemy) => {
    {
      const log = world.runLog;
      const by = credit != null ? towerKinds.get(credit) : undefined;
      log.kills += 1;
      if (by) log.killsBy[by] = (log.killsBy[by] ?? 0) + 1;
      // Quackarot's power level: every kill while a Quack-Liber stands fills it.
      if (CANNON.quackKiNeed > 0 && world.hud.hero === "quack" && world.towers.some((t) => t.kind === "quackliber")) world.hud.ki = Math.min(CANNON.quackKiNeed, world.hud.ki + 1);
      if (e.kind === "karl") {
        log.karlKills += 1;
        if (by) log.karlKilledBy.push(by);
      }
      if (e.pit && by && (deathVia === "shot" || deathVia === "pierce")) log.pitDirectKills += 1;
      if (e.native === "express" && floorAt(e)?.kind === "belt") log.expressBeltKills += 1;
      if (e.native === "parcel" && e.wrapped) log.parcelWrappedKills += 1;
      if (e.native === "squash") log.squashKills += 1;
      if (e.native === "gargoyle" && (world.bell?.quiet ?? 0) > 0) log.gargoyleQuietKills += 1;
    }
    contagion(e);
    // What fell out of a Parcel pays nothing.
    if (!e.contents) world.hud.seeds += e.gold + (has("fines") ? 5 : 0) + (bm("latefee") ? BOOKMARK_VALUES.latefee : 0) + fx.killSeeds;
    if (e.native === "parcel") openParcel(e);
    if (e.native === "wormqueen") world.cocoons.push({ x: e.x, y: e.y, wp: e.wp, route: e.route, left: NATIVES.cocoonTime });
    world.hud.absurdity = Math.min(100, world.hud.absurdity + (e.boss ? 18 : 3));
    const juice =
      e.kind === "pumpkin" || e.kind === "karl"
        ? "#e8883a"
        : e.kind === "corn"
          ? "#e6c36a"
          : e.kind === "goose"
            ? "#f4f1e8"
            : e.kind === "cat"
              ? "#c89a5a"
              : "#e23b4a";
    burst(e.x, e.y, juice, e.boss ? 28 : 12);
    stain(e.x, e.y, e.boss ? e.r * 1.3 : e.r * 1.1, juice);
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
    // A Gosling Line's leader down: the rest of its line stand there for a moment.
    if (e.gosling && e.leader) {
      for (const o of world.enemies) if (o !== e && o.gosling && o.line === e.line && o.hp > 0) o.halt = Math.max(o.halt ?? 0, SIEGE.goslingStun);
      world.floaters.push({ x: e.x, y: e.y - 30, text: "LEADER DOWN", life: 0.9, color: "#f2d45c", size: 14 });
      world.rings.push({ x: e.x, y: e.y, r: e.r + 22, life: 0.4, max: 0.4, color: "242,212,92" });
    }
    // General Mittens down: every cat loses her bonus and scatters back down the carpet.
    if (e.general) {
      for (const o of world.enemies) {
        if (o === e || o.kind !== "cat" || o.hp <= 0) continue;
        mitten(o, false);
        if (!o.boss) o.driven = Math.max(o.driven ?? 0, SIEGE.scatter);
      }
    }
    if (e.boss && e.kind !== "karl") {
      // The Siege's bosses pay like Karl: +2 stacks.
      world.hud.lives = Math.min(world.hud.maxLives, world.hud.lives + 2);
      syncSisu();
      world.shake = world.reduced ? 0 : 14;
      world.hud.log = e.matriarch ? "The Matriarch is down. The geese have gone very quiet. +2 stacks." : "General Mittens has fallen. Her cats scatter. +2 stacks.";
    } else if (e.boss) {
      const second = karlReward;
      karlReward = true;
      world.hud.lives = Math.min(world.hud.maxLives, world.hud.lives + 2);
      syncSisu();
      world.shake = world.reduced ? 0 : 14;
      addPool(e.x, e.y);
      world.hud.log = second
        ? "Another Karl is pie. +2 stacks."
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

  // ── Status combos (COMBO) and afflictions (AFFLICT) ───────────────────────
  /** Frozen solid: a full frost meter, or held by a Freeze cannon's hit. */
  const frozen = (e: Enemy) => (e.iced ?? 0) > 0 || (e.frost ?? 0) >= COMBO.frostMax;
  const frostCap = (e: Enemy) => (e.boss ? COMBO.bossFrostMax : COMBO.frostMax);
  const drainTime = (e: Enemy) => COMBO.frostDrain * (e.guard === "damp" ? COMBO.dampDrain : 1);
  const inFirePatch = (e: Enemy) => world.pools.some((p) => p.hot && Math.hypot(e.x - p.x, e.y - p.y) <= p.r);
  const burningNow = (e: Enemy) => (e.burnT ?? 0) > 0 || inFirePatch(e);
  const fitted = (kind: TowerKind, id: ModId) => (world.hud.fitted[kind] ?? []).includes(id);
  /** Once per night: a combo's first time, for its one-time tip. */
  const comboSeen = (id: string) => {
    if (!world.hud.comboTips.includes(id)) world.hud.comboTips = [...world.hud.comboTips, id];
  };
  /** Fire, then ice: a freeze on a burning fruit puts the fire out. */
  const douse = (e: Enemy) => {
    if (!burningNow(e)) return;
    e.doused = COMBO.douseTime;
    e.burnT = 0;
    world.rings.push({ x: e.x, y: e.y, r: e.r + 10, life: 0.5, max: 0.5, color: "235,240,245", fill: true });
    float(e.x, e.y - 22, "doused", "#d5e4ee");
  };
  /** Add frost (husks and Express Corn on a belt shrug it off; bosses stop at two). A full meter freezes it solid. */
  const addFrost = (e: Enemy, n: number) => {
    if (!COMBO.on || e.hp <= 0 || e.guard === "husk" || expressOnBelt(e)) return;
    const was = e.frost ?? 0;
    // A chill (one stack) only builds frost to COMBO.chillCap; a Freeze cannon hit goes all the way.
    const cap = n <= COMBO.chillHit ? Math.min(frostCap(e), Math.max(was, COMBO.chillCap)) : frostCap(e);
    e.frost = Math.min(cap, was + n);
    e.frostT = drainTime(e);
    if (e.frost >= COMBO.frostMax && was < COMBO.frostMax) {
      // Frozen solid for today's freeze time, then back to two (see the tick).
      const hold = (e.boss ? 0.6 : 1.45) * (e.guard === "damp" ? 1.4 : 1);
      e.freeze = Math.max(e.freeze, hold);
      e.stunBy = undefined;
      douse(e);
    }
  };
  /** Asleep (Vaelithra's sleeping draught): stopped, and not by ice. */
  const sleeping = (e: Enemy) => e.freeze > 0 && e.stunBy === "sleep";
  /** Standing in one of her own puddles (the Cauldron's or Unstoppered's). */
  const inVaelPool = (e: Enemy) => world.pools.some((p) => p.vael && !p.hot && (p.x - e.x) ** 2 + (p.y - e.y) ** 2 < p.r * p.r);
  /** It nods off: a stop, not ice, then a rest before it can again. In her puddle with Unstoppered standing: Deep sleep. */
  const fallAsleep = (e: Enemy) => {
    let nap = e.boss ? DROWSY.sleepBoss : DROWSY.sleep;
    if (world.towers.some((t) => t.kind === "flask") && inVaelPool(e)) nap *= VAEL_VALUES.deepSleep;
    e.freeze = nap;
    e.stunBy = "sleep";
    e.restT = nap + DROWSY.rest;
    e.dozeHits = 0;
    e.nightmared = false;
    float(e.x, e.y - 22, "asleep", "#d6c8fa");
  };
  /** One doze hit (any of her hits, a Fumes tick, an intern's vial): drowsy, and the third while drowsy puts it to sleep. */
  const doze = (e: Enemy) => {
    if (world.hud.hero !== "vael" || e.guard === "husk" || expressOnBelt(e)) return;
    const was = (e.drowsy ?? 0) > 0;
    if (!was) float(e.x, e.y - 18, "drowsy", "#b9a2ea");
    e.dozeHits = was ? (e.dozeHits ?? 0) + 1 : 1;
    e.drowsy = Math.max(e.drowsy ?? 0, DROWSY.time * fx.chill * (e.boss ? DROWSY.boss : 1));
    if (e.dozeHits >= DROWSY.sleepHits && (e.restT ?? 0) <= 0 && e.freeze <= 0) fallAsleep(e);
  };
  /**
   * Vaelithra's ladder: a fully upgraded tower is one on the board whose kind has every back-room upgrade bought
   * tonight (kinds with none, and the Copycat, never count). At 2, 4 and 6 her next tower opens, for the night.
   */
  const syncVael = () => {
    if (world.hud.hero !== "vael") return;
    const full = (kind: TowerKind) => {
      if (kind === "copycat") return false;
      const all = fittingsFor(kind);
      const have = world.hud.fitted[kind] ?? [];
      return all.length > 0 && all.every((m) => have.includes(m.id));
    };
    const fulls = world.towers.filter((t) => full(t.kind));
    world.hud.fullyUpgraded = fulls.length;
    const lines = [
      "Vaelithra: “Unstoppered. Approved. Try not to slip.”",
      "Vaelithra: “Interns. Make yourselves useful.”",
      "Vaelithra: “The Nexus is online. Everyone else is off the clock.”",
    ];
    while (world.hud.vaelOpen < VAEL_LADDER.length && fulls.length >= VAEL_VALUES.unlocks[world.hud.vaelOpen]) {
      const kind = VAEL_LADDER[world.hud.vaelOpen];
      const tipped = fulls.reduce((a, b) => (b.id > a.id ? b : a));
      float(tipped.x, tipped.y - 34, `${TOWERS[kind].name} approved`, "#c9a6ff");
      world.hud.log = lines[world.hud.vaelOpen];
      world.hud.vaelOpen += 1;
      notify();
    }
  };
  /** What a locked card on her ladder says. */
  const vaelLockText = (kind: TowerKind) => vaelLockLine(kind, world.hud.fullyUpgraded);
  /**
   * The Nexus Spire: every `lightsOutEvery` s (Overtime: `overtimeEvery`) the lights go out and every drowsy fruit on
   * the board falls asleep at once (bosses for less). Husks, Express Corn on a belt and fruit still resting are left alone.
   */
  const tickSpire = (tower: Tower) => {
    const every = hasMod(tower, "overtime") ? VAEL_VALUES.overtimeEvery : VAEL_VALUES.lightsOutEvery;
    if (!tower.armed) {
      // Built: the first Lights Out comes a full cycle later.
      tower.armed = true;
      tower.cd = every;
    }
    if (tower.cd > 0) return;
    tower.cd = every;
    let n = 0;
    for (const e of world.enemies) {
      if (e.hp <= 0 || (e.drowsy ?? 0) <= 0 || e.guard === "husk" || expressOnBelt(e)) continue;
      if ((e.restT ?? 0) > 0 || e.freeze > 0) continue;
      fallAsleep(e);
      n++;
    }
    world.lightsOut = world.reduced ? 0 : 0.25;
    world.floaters.push({ x: world.w / 2, y: world.h * 0.3, text: "LIGHTS OUT", life: 1.1, color: "#c9a6ff", size: 22 });
    cue("fire", "spire");
    if (n) world.hud.log = "Vaelithra: “Lights out. Everyone take five. Forever.”";
  };
  /** One of Vaelithra's later towers that isn't open yet tonight. */

  const vaelLocked = (kind: TowerKind) => {
    const step = VAEL_LADDER.indexOf(kind);
    if (step < 0 || world.hud.hero !== "vael") return false;
    syncVael();
    return step >= world.hud.vaelOpen;
  };
  /** Fire wakes it: no longer drowsy, and a sleeping fruit gets up. */
  const wake = (e: Enemy) => {
    e.drowsy = 0;
    e.dozeHits = 0;
    if (e.freeze > 0 && e.stunBy === "sleep") e.freeze = 0;
  };
  /** Ice, then fire: thaw it now. */
  const thaw = (e: Enemy) => {
    e.frost = 0;
    e.iced = 0;
    e.freeze = 0;
    e.chill = 0;
    world.runLog.thermals += 1;
    comboSeen("thermal");
    world.rings.push({ x: e.x, y: e.y - 6, r: e.r + 14, life: 0.6, max: 0.6, color: "235,235,240", fill: true });
    world.floaters.push({ x: e.x, y: e.y - 28, text: "HISS", life: 0.7, color: "#eef0f2", size: 14 });
    addMark(e.x, e.y, "steam", STATUS_LOOK.steamLife);
  };
  const frosted = (e: Enemy) => frozen(e) || (e.frost ?? 0) >= 1;
  /** Stung: `n` stacks (up to AFFLICT.stingMax), refreshed. */
  const addSting = (e: Enemy, n: number) => {
    if (!COMBO.on || e.hp <= 0) return;
    e.sting = Math.min(AFFLICT.stingMax, (e.sting ?? 0) + n);
    e.stingT = fitted("hive", "barbs") ? AFFLICT.barbsTime : AFFLICT.stingTime;
    if (credit != null) e.stingBy = credit;
  };
  /** What's left of a fruit's stings, poison and fire, as damage (a shatter spends it all at once). */
  const afflictionLeft = (e: Enemy) =>
    (e.sting ?? 0) * AFFLICT.stingDps * Math.max(0, e.stingT ?? 0) +
    (e.poison ?? 0) * (e.poisonDps ?? 0) * Math.max(0, e.poisonT ?? 0) +
    (e.burnDps ?? 0) * Math.max(0, e.burnT ?? 0);
  const clearAfflictions = (e: Enemy) => {
    e.sting = 0;
    e.stingT = 0;
    e.poison = 0;
    e.poisonT = 0;
    e.burnT = 0;
    e.flamed = false;
  };
  /** How many different afflictions it carries (stung, poisoned, burning, burrowed, frost), for the achievements and the tip. */
  const noteAfflictions = (e: Enemy, burning: boolean) => {
    const kinds = [(e.sting ?? 0) > 0, (e.poison ?? 0) > 0, burning, (e.worm ?? 0) > 0, (e.frost ?? 0) >= 1].filter(Boolean).length;
    world.runLog.maxAfflictions = Math.max(world.runLog.maxAfflictions, kinds);
    world.runLog.maxStung = Math.max(world.runLog.maxStung, e.sting ?? 0);
    if (kinds >= 2) comboSeen("mixed");
  };
  /**
   * Afflictions tick: stings, poison and a fire of its own, added together (capped at AFFLICT.cap before Ink and
   * Honey), each credited to whoever applied the newest stack. `toxic` is the strongest Cauldron puddle it stands in.
   */
  const tickAfflictions = (e: Enemy, dt: number, toxic: { dps: number; by?: number } | null, fire: { dps: number; by?: number } | null) => {
    if (toxic) {
      // A stack straight away, then one a second while it stands in it.
      e.poisonCd = (e.poisonCd ?? 0) - dt;
      if (e.poisonCd <= 0) {
        e.poisonCd = AFFLICT.poisonEvery;
        e.poison = Math.min(fitted("cauldron", "virulent") ? AFFLICT.virulentMax : AFFLICT.poisonMax, (e.poison ?? 0) + 1);
        e.poisonBy = toxic.by;
      }
      e.poisonT = AFFLICT.poisonTime;
      e.poisonDps = Math.max(e.poisonDps ?? 0, toxic.dps * AFFLICT.poisonShare);
    } else e.poisonCd = 0;
    const left = (t: number | undefined) => Math.max(0, (t ?? 0) - dt);
    e.stingT = left(e.stingT);
    if (!e.stingT) e.sting = 0;
    e.poisonT = left(e.poisonT);
    if (!e.poisonT) {
      e.poison = 0;
      e.poisonDps = 0;
    }
    e.burnT = left(e.burnT);
    const sting = (e.sting ?? 0) * AFFLICT.stingDps;
    const poison = (e.poison ?? 0) * (e.poisonDps ?? 0);
    // Its own fire only counts away from a fire patch (the strongest fire wins, as ever); poison makes it hotter.
    const own = (e.burnT ?? 0) > 0 && !fire ? (e.burnDps ?? 0) * ((e.poison ?? 0) > 0 ? AFFLICT.flammable : 1) : 0;
    const total = sting + poison + own;
    if (total > 0) {
      const cap = Math.min(1, AFFLICT.cap / total);
      if (sting) {
        credit = e.stingBy ?? null;
        hurt(e, null, sting * cap * dt, 0, "sting");
      }
      if (poison && e.hp > 0) {
        credit = e.poisonBy ?? null;
        hurt(e, null, poison * cap * dt, 0, "poison");
      }
      if (own && e.hp > 0) {
        credit = e.burnBy ?? null;
        hurt(e, null, own * cap * dt, 0, "burn");
      }
      credit = null;
    }
    // Wildfire: burning and slowed (not frozen), it passes the fire to one neighbour a second.
    const burning = Boolean(fire) || (e.burnT ?? 0) > 0;
    if (burning && e.hp > 0 && e.slow > 0 && e.slow < COMBO.wildfireSpeed) {
      const damp = e.guard === "damp" || world.hud.map === "overflow" || BOARDS[world.hud.map].damp || wetAt(e.x, e.y);
      const rate = (fitted("fire", "wildfire") ? 2 : 1) * (damp ? COMBO.dampSpread : 1);
      e.wildAcc = (e.wildAcc ?? 0) + (dt / COMBO.spreadEvery) * rate;
      if (e.wildAcc >= 1) {
        // A husk catches it more easily: it counts as twice as close.
        let best: Enemy | null = null;
        let bestD = Infinity;
        for (const o of world.enemies) {
          if (o === e || o.hp <= 0 || (o.burnT ?? 0) > 0 || (o.doused ?? 0) > 0 || frozen(o)) continue;
          const d = Math.hypot(o.x - e.x, o.y - e.y);
          if (d > COMBO.spreadRadius) continue;
          const weight = o.guard === "husk" ? d / 2 : d;
          if (weight < bestD) {
            bestD = weight;
            best = o;
          }
        }
        if (best) {
          e.wildAcc -= 1;
          best.burnT = COMBO.spreadTime;
          best.burnDps = Math.max(best.burnDps ?? 0, fire?.dps ?? e.burnDps ?? 22);
          best.burnBy = fire?.by ?? e.burnBy;
          world.runLog.wildfires += 1;
          world.lines.push({ x: e.x, y: e.y - 6, x2: best.x, y2: best.y - 6, life: 0.35, max: 0.35, color: "255,150,60", width: 2.5 });
        } else e.wildAcc = Math.min(e.wildAcc, 1);
      }
    } else e.wildAcc = 0;
  };
  /** Contagion: a fruit dying with 3+ stacks of one affliction passes one stack of each to every fruit within a tile. */
  const contagion = (e: Enemy) => {
    if (!COMBO.on) return;
    const most = Math.max(e.sting ?? 0, e.poison ?? 0, Math.floor(e.frost ?? 0));
    if (most < AFFLICT.contagionStacks) return;
    const burning = burningNow(e);
    let spread = 0;
    for (const o of world.enemies) {
      if (o === e || o.hp <= 0 || Math.hypot(o.x - e.x, o.y - e.y) > AFFLICT.contagionRadius) continue;
      if ((e.sting ?? 0) > 0) {
        o.sting = Math.min(AFFLICT.stingMax, (o.sting ?? 0) + 1);
        o.stingT = Math.max(o.stingT ?? 0, AFFLICT.stingTime);
        o.stingBy = e.stingBy;
        spread += 1;
      }
      if ((e.poison ?? 0) > 0) {
        o.poison = Math.min(AFFLICT.virulentMax, (o.poison ?? 0) + 1);
        o.poisonT = Math.max(o.poisonT ?? 0, AFFLICT.poisonTime);
        o.poisonDps = Math.max(o.poisonDps ?? 0, e.poisonDps ?? 0);
        o.poisonBy = e.poisonBy;
        spread += 1;
      }
      if ((e.frost ?? 0) >= 1 && o.guard !== "husk") {
        addFrost(o, 1);
        spread += 1;
      }
      if (burning && (o.doused ?? 0) <= 0) {
        o.burnT = Math.max(o.burnT ?? 0, AFFLICT.contagionBurn);
        o.burnDps = Math.max(o.burnDps ?? 0, e.burnDps ?? 22);
        o.burnBy = e.burnBy;
        spread += 1;
      }
    }
    if (!spread) return;
    world.runLog.contagion += spread;
    comboSeen("contagion");
    world.rings.push({ x: e.x, y: e.y, r: AFFLICT.contagionRadius, life: 0.4, max: 0.4, color: "190,220,120" });
    world.floaters.push({ x: e.x, y: e.y - 30, text: "SPREAD", life: 0.8, color: "#c8e88a", size: 14 });
  };
  /** An explosion at (x, y): puddles in it spread out once, fire patches in it flare up. */
  const explode = (x: number, y: number, r: number) => {
    if (world.cocoons.length) world.cocoons = world.cocoons.filter((k) => Math.hypot(k.x - x, k.y - y) > r + 6);
    if (!COMBO.on) return;
    for (const pool of world.pools) {
      if (Math.hypot(pool.x - x, pool.y - y) > r + pool.r) continue;
      if (pool.hot) pool.flare = COMBO.flareTime;
      else if (!pool.honey && !pool.grown) {
        pool.r *= COMBO.puddleGrow;
        pool.grown = true;
      }
    }
  };
  /** Shards flying from a shatter: they're splash, but they don't shatter anything themselves. */
  let shardsFlying = false;

  const hurt = (
    e: Enemy,
    from: { id: number; x: number; y: number } | null,
    amount: number,
    radius = 0,
    via: "shot" | "splash" | "burn" | "pulp" | "worm" | "pierce" | "feud" | "sting" | "poison" | "shock" = "shot",
  ) => {
    if (radius > 0 && from) {
      if (e.id === from.id || e.hp <= 0) return;
      if (Math.hypot(e.x - from.x, e.y - from.y) > radius) return;
    }
    if (e.hp <= 0) return;
    // A Bookworm in the shelves: only area damage reaches it (splash, fire, puddles, poison, a brawl).
    if (burrowed(e) && via !== "splash" && via !== "burn" && via !== "pulp" && via !== "poison" && via !== "feud") return;
    // Shatter: the first splash on a fruit with 2+ frost does half again, throws ice shards at its neighbours,
    // ends the frost, and spends every affliction on it at once.
    let shards = 0;
    let shardFrom: { id: number; x: number; y: number } | null = null;
    if (COMBO.on && via === "splash" && !shardsFlying && amount > 0 && e.guard !== "husk" && (frozen(e) || (e.frost ?? 0) >= 2)) {
      const stacks = Math.min(COMBO.frostMax, Math.max(frozen(e) ? 2 : 0, Math.floor(e.frost ?? 0)));
      amount *= 1 + COMBO.shatterBonus;
      shards = amount * COMBO.shardShare[stacks];
      amount += afflictionLeft(e);
      clearAfflictions(e);
      e.frost = 0;
      e.iced = 0;
      e.freeze = 0;
      shardFrom = { id: e.id, x: e.x, y: e.y };
      world.runLog.shatters += 1;
      comboSeen("shatter");
      world.floaters.push({ x: e.x, y: e.y - 30, text: "SHATTER", life: 0.8, color: "#cfe9f5", size: 16 });
      addMark(e.x, e.y + e.r * 0.5, "star", STATUS_LOOK.starLife);
      world.rings.push({ x: e.x, y: e.y, r: e.r + 16, life: 0.35, max: 0.35, color: "207,233,245" });
      burst(e.x, e.y, "#d8f0fa", 8);
      const reach = COMBO.shardRadius * (fitted("freeze", "shrapnel") ? COMBO.shrapnelWide : 1);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        world.lines.push({ x: e.x, y: e.y, x2: e.x + Math.cos(a) * reach, y2: e.y + Math.sin(a) * reach, life: 0.25, max: 0.25, color: "200,232,246", width: 1.5 });
      }
    }
    // A Honker's first hit makes it honk (a fight with a cat doesn't count).
    if (e.kind === "goose" && !e.gosling && !e.boss && !e.honked && amount > 0 && via !== "feud") honk(e);
    // A fight is a fight: no armour, shell or ink changes it.
    if (via !== "feud") {
    // Splash, fire and puddles knock a Box Cat's box off.
    if (e.boxed && amount > 0 && (via === "splash" || via === "burn" || via === "pulp")) unbox(e);
    // A Cardboard Tank's front armour: a hit from ahead of it does half. Splash is judged from where the shot landed.
    if (e.tank && (via === "shot" || via === "splash")) {
      const src = radius > 0 && from ? from : credit != null ? world.towers.find((t) => t.id === credit) : undefined;
      if (src && ahead(e, src)) amount *= SIEGE.tankArmour;
    }
    if (slip("damp")) amount *= SLIP_VALUES.dampDamage;
    if (e.raw && via === "burn" && amount > 0) {
      e.raw = false;
      e.bread = true;
      e.speed *= 0.55;
      float(e.x, e.y - 18, "bread", "#e6c36a");
      return;
    }
    if (e.bread && via === "burn") return;
    if ((world.hud.map === "overflow" || BOARDS[world.hud.map].damp) && via === "burn") amount *= 0.55;
    if (e.guard === "rind" && e.shell > 0 && (via === "shot" || via === "splash") && amount >= 1) {
      if (credit != null) {
        const vs = (tallyFor(credit).vs ??= {});
        vs["#cracks"] = (vs["#cracks"] ?? 0) + 1;
      }
      e.shell -= 1;
      float(e.x, e.y - 16, e.shell > 0 ? "chip" : "crack", "#f3e2c4");
      return;
    }
    if (e.guard === "rind" && e.shell > 0 && (via === "burn" || via === "pulp")) amount *= 0.4;
    if (e.guard === "husk" && (via === "splash" || via === "burn")) amount *= 1.4;
    if (e.guard === "husk" && via === "shot") amount *= CANNON.huskShot;
    if (e.guard === "damp" && via === "burn") amount *= 0.15;
    if (e.guard === "damp" && via === "shot") amount *= 1.15;
    // A pit is stone: splash, fire and puddles barely touch it. Direct shots, pierce and worms do.
    if (e.pit && (via === "splash" || via === "burn" || via === "pulp")) amount *= BALANCE.pitResist;
    // A Parcel's paper: direct hits do half; any splash, burn or puddle tears it off.
    if (e.wrapped && amount > 0) {
      if (via === "splash" || via === "burn" || via === "pulp") {
        e.wrapped = false;
        float(e.x, e.y - 20, "unwrapped", "#d8b98a");
      } else if (via === "shot" || via === "pierce") amount *= NATIVES.parcelWrapped;
    }
    // A Gargoyle Gourd has stone skin until the clock strikes.
    if (e.native === "gargoyle" && (world.bell?.quiet ?? 0) <= 0) amount *= NATIVES.gargoyleSkin;
    if ((e.ink ?? 0) > 0) amount *= e.inkMul ?? CANNON.inkBonus;
    if ((e.honeyed ?? 0) > 0) amount *= CANNON.honeyAmp;
    // Rewind combo: a fruit the Instant Quackmission is walking back takes more from everything.
    if ((e.driven ?? 0) > 0 && world.hud.hero === "quack") amount *= CANNON.driverAmp;
    // A report filed by the Underlings: every tower is hers while she's the keeper.
    if ((e.reportT ?? 0) > 0 && world.hud.hero === "vael") amount *= VAEL_VALUES.reportAmp;
    // Black Ice (a Freeze cannon fitting): frozen fruit take more from everything.
    if (COMBO.on && (e.frost ?? 0) >= COMBO.frostMax && fitted("freeze", "blackice")) amount *= COMBO.blackIce;
    // Emberforged Armour: Sir Michael's Great towers and Roost leave blue fire on what they hit.
    if (world.hud.armour === "ember" && credit != null && (via === "shot" || via === "splash") && amount > 0) {
      const by = world.towers.find((t) => t.id === credit);
      if (by && isBig(by)) {
        e.burnT = Math.max(e.burnT ?? 0, 2);
        e.burnDps = Math.max(e.burnDps ?? 0, ARMOUR_VALUES.emberBurn);
        e.burnBy = by.id;
      }
    }
    }
    const before = e.hp;
    e.hp -= amount;
    if (amount >= 1) float(e.x, e.y - 10, String(Math.round(amount)), "#f3e2c4");
    // The shatter's shards: splash (so pits shrug them off), but they never shatter anything themselves.
    if (shardFrom && shards > 0) {
      const reach = COMBO.shardRadius * (fitted("freeze", "shrapnel") ? COMBO.shrapnelWide : 1);
      shardsFlying = true;
      for (const other of world.enemies) if (other !== e) hurt(other, shardFrom, shards, reach, "splash");
      shardsFlying = false;
    }
    if (credit != null) {
      const t = tallyFor(credit);
      const landed = Math.max(0, Math.min(amount, before));
      t.dmg += landed;
      // Who hurts what (the simulator's matchup table): by fruit kind and by the armour it wore when hit.
      const armour = e.guard === "rind" ? (e.shell > 0 ? "shell" : "cracked") : e.guard !== "none" ? e.guard : e.pit ? "pit" : e.wrapped ? "parcel" : "plain";
      const vs = (t.vs ??= {});
      vs[e.kind] = (vs[e.kind] ?? 0) + landed;
      vs[`~${armour}`] = (vs[`~${armour}`] ?? 0) + landed;
      if (e.hp <= 0 && !e.lives9) t.pops += 1;
    }
    // Private Whiskers' Nine Lives: the first time it would die it gets back up with a little health (what killed it
    // doesn't carry over). One hit from full health worth both lives at once kills it for good.
    if (e.hp <= 0 && e.lives9) {
      e.lives9 = false;
      if (before >= e.maxHp - 1e-6 && amount >= e.maxHp * SIEGE.oneLife) {
        world.runLog.oneLife += 1;
        if (credit != null) tallyFor(credit).pops += 1;
      } else {
        e.hp = e.maxHp * SIEGE.nineLives;
        float(e.x, e.y - 24, "8", "#f3e2c4");
        return;
      }
    }
    if (e.hp <= 0) {
      deathVia = via;
      onDeath(e);
      deathVia = null;
    }
  };

  /** Seconds a shot lives: the trip at SHOT_SPEED plus a second for a moving target, and never under 1.6. */
  const shotLife = (x: number, y: number, tx: number, ty: number) => Math.max(1.6, Math.hypot(tx - x, ty - y) / SHOT_SPEED + 1);

  const onShotHit = (shot: Shot, e: Enemy) => {
    // A fly can miss a fruit that's walking fast right now (slowed, frozen or stopped fruit are easy prey).
    if (shot.element === "fly" && Math.random() < flyMiss(e.speed * e.slow)) {
      float(e.x, e.y - 16, "miss", "#cfc9a8");
      return false;
    }
    if (shot.bombard) {
      // The giant pumpkin: the full hit on its target, half to everything near it, a one-tile shove
      // for everything hit but Karl, and a burning patch where it landed.
      const hit = world.enemies.filter((o) => o.hp > 0 && (o === e || Math.hypot(o.x - e.x, o.y - e.y) <= shot.splash));
      hurt(e, null, shot.dmg, 0, COMBO.on && e.guard !== "husk" && (frozen(e) || (e.frost ?? 0) >= 1) ? "splash" : "shot");
      for (const o of hit) if (o !== e) hurt(o, null, shot.dmg * shot.splashRatio, 0, "splash");
      for (const o of hit) if (!o.boss) pushBack(o, CELL);
      explode(e.x, e.y, shot.splash);
      addFire(e.x, e.y, CANNON.bombardFireLife, CANNON.bombardFireBurn);
      splashFx(e.x, e.y, shot.splash, "232,136,58");
      burst(e.x, e.y, "#e8883a", 16);
      world.shake = Math.max(world.shake, world.reduced ? 0 : 5);
      return false;
    }
    // Quack-hameha counts this rocket's kills.
    const popsBefore = shot.splashChill && shot.owner != null ? tallyFor(shot.owner).pops : null;
    if (shot.element === "seed" && e.guard === "rind" && e.shell > 0 && !CANNON.seedChip) {
      float(e.x, e.y - 16, "ping", "#d8c9a8");
      return false;
    }
    if (shot.element === "peel") {
      if ((e.guard === "rind" && e.shell > 0) || e.guard === "husk" || e.guard === "damp") {
        e.shell = 0;
        e.guard = "none";
        float(e.x, e.y - 18, "peeled", "#e8a35a");
      }
      // Bare fruit: takes more damage for a while (it shares the ink's mark, so the two don't stack).
      e.ink = Math.max(e.ink ?? 0, CANNON.peelExposeTime);
      e.inkMul = Math.max(e.inkMul ?? 1, CANNON.peelExpose);
    }
    if (shot.element === "ink") {
      for (const other of world.enemies) {
        if (other.hp <= 0 || Math.hypot(other.x - e.x, other.y - e.y) > 34) continue;
        other.ink = Math.max(other.ink ?? 0, shot.inkTime ?? CANNON.inkTime);
        other.inkMul = Math.max(other.inkMul ?? 1, shot.inkMul ?? CANNON.inkBonus);
      }
    }
    const wormShare = shot.element === "worm" ? (wormFavours(e) ? 1 : CANNON.wormOther) : 0;
    if (wormShare > 0) {
      if ((e.worm ?? 0) <= 0) float(e.x, e.y - 18, "burrow", "#e79ab0");
      e.worm = CANNON.wormTime;
      e.wormDps = Math.max(e.wormDps ?? 0, (shot.wormDps ?? CANNON.wormDps) * wormShare);
      e.wormBy = shot.owner;
    }
    const shelled = e.guard === "rind" && e.shell > 0;
    // Ice, then fire: a fire shot on a frosted fruit thaws it and bursts (not "burn": it doesn't bake a raw pumpkin).
    if (COMBO.on && shot.element === "fire" && e.guard !== "husk" && frosted(e) && (e.doused ?? 0) <= 0) {
      thaw(e);
      hurt(e, null, shot.dmg * COMBO.thermalBonus, 0, "shock");
    }
    // An explosive shot's own hit on a fruit with 2+ frost counts as the explosion, so it shatters it.
    const shatters = COMBO.on && shot.splash > 0 && e.guard !== "husk" && (frozen(e) || (e.frost ?? 0) >= 2);
    hurt(e, null, shot.dmg, 0, shatters || (shot.splash > 0 && burrowed(e)) ? "splash" : shot.pierce ? "pierce" : "shot");
    burst(e.x, e.y, "#3f9a5c", 6);
    // Stingers: a fly leaves one (Stinging Flies: two in a fruit already stung; a sticky fruit takes two).
    // A seed drives the ones already in deeper (Grit: two). A shell keeps them out until it cracks.
    if (COMBO.on && e.hp > 0 && !shelled) {
      if (shot.element === "fly") addSting(e, (e.honeyed ?? 0) > 0 || (has("stinging") && (e.sting ?? 0) > 0) ? 2 : 1);
      else if (shot.element === "seed" && (e.sting ?? 0) > 0) {
        const spitter = world.towers.find((t) => t.id === shot.owner);
        addSting(e, spitter?.mods.includes("grit") ? AFFLICT.gritStacks : AFFLICT.seedStacks);
      }
    }
    // Her keeper towers cash in on sleep: the Cauldron's Nightmare, the interns' report (both on a fruit already asleep).
    if (e.hp > 0 && sleeping(e)) {
      if (shot.element === "potion" && !e.nightmared && (e.poison ?? 0) > 0) {
        e.nightmared = true;
        const burst = (e.poison ?? 0) * (e.poisonDps ?? 0) * (e.poisonT ?? 0) * VAEL_VALUES.nightmareMul;
        e.poison = 0;
        e.poisonDps = 0;
        e.poisonT = 0;
        hurt(e, null, burst, 0, "poison");
        float(e.x, e.y - 30, "nightmare", "#a970ff");
        world.hud.log = "Vaelithra: “That's going in your performance review.”";
      }
      if (shot.element === "vial") {
        if ((e.reportT ?? 0) <= 0) float(e.x, e.y - 30, "report filed", "#c9a6ff");
        e.reportT = VAEL_VALUES.reportTime;
      }
    }
    // Vaelithra's sleeping draught: drowsy, not frosted (the third hit while drowsy puts it to sleep).
    if (e.hp > 0) doze(e);
    // Fire wakes a drowsy fruit (even her own fire), and a sleeping one.
    if (shot.element === "fire") wake(e);
    // Cold rind is ice: it adds frost (with combos off, the old chill slow instead).
    if (shot.chill > 0 && e.guard !== "husk") {
      if (COMBO.on) addFrost(e, COMBO.chillHit);
      else e.chill = Math.max(e.chill, shot.chill);
    }
    if (shot.element === "fire") addFire(e.x, e.y, shot.fireLife, shot.fireBurn);
    if (shot.element === "ice" && e.guard !== "husk") {
      const hold = (e.boss ? 0.6 : 1.45) + shot.freezeExtra;
      e.freeze = Math.max(e.freeze, e.guard === "damp" ? hold * 1.4 : hold);
      e.stunBy = undefined;
      float(e.x, e.y - 18, "frozen", "#d5e4ee");
      // The Flooded Basement: a Freeze hit on a fruit in water freezes the water round it.
      if (world.heights.size && floodedAt(e.x, e.y)) freezeWater(e.x, e.y);
      if (COMBO.on) {
        // Fire, then ice: it puts a fire out. Then it gains its frost as usual.
        douse(e);
        e.iced = Math.max(e.iced ?? 0, e.freeze);
        addFrost(e, fitted("freeze", "deepfreeze") ? COMBO.deepFreezeHit : COMBO.freezeHit);
      }
    }
    if (shot.element === "potion") {
      // Puddle upgrades (Alchemy) reach the cauldron: Sticky spreads it, Vial and Distilled make it bite.
      const life = CANNON.cauldronLife * (has("sticky") ? 1.4 : 1) * fx.poolLife * (wetAt(e.x, e.y) ? CANNON.wetPuddle : 1);
      world.pools.push({
        x: e.x,
        y: e.y,
        r: Math.round((CANNON.cauldronRadius + (has("sticky") ? 12 : 0)) * fx.poolWide * (world.heights.size && floodedAt(e.x, e.y) ? BASEMENT.puddleWide : 1)),
        life,
        max: life,
        hot: false,
        burn: 0,
        toxic: Math.round((CANNON.cauldronDps + (has("distill") ? 8 : has("vial") ? 4 : 0)) * fx.sigDmg),
        owner: credit ?? undefined,
        vael: true,
      });
    }
    if (shot.procs && has("juicy")) {
      for (const other of world.enemies) hurt(other, e, 8, 46, "splash");
      splashFx(e.x, e.y, 46, "226,59,74");
      explode(e.x, e.y, 46);
    }
    if (has("splatter") && shot.procs) {
      for (const other of world.enemies) hurt(other, e, 9, 40, "splash");
      splashFx(e.x, e.y, 40, "226,59,74");
      explode(e.x, e.y, 40);
    }
    if (shot.splash > 0) {
      if (!shot.knock) splashFx(e.x, e.y, shot.splash, "232,136,58");
      explode(e.x, e.y, shot.splash);
      for (const other of world.enemies)
        hurt(other, e, Math.max(6, Math.round(shot.dmg * shot.splashRatio)), shot.splash, "splash");
    }
    // Ki finisher: a ki blast also takes a share of its target's full health (bosses: less).
    if (shot.splashChill && CANNON.quackPct > 0 && e.hp > 0) hurt(e, null, e.maxHp * (e.boss ? CANNON.quackPctBoss : CANNON.quackPct), 0, "shot");
    if (shot.splashChill) {
      // Quack-Liber rocket: everything in the burst is slowed for a moment (husks shrug it off).
      for (const other of world.enemies) {
        if (other.hp <= 0 || other.guard === "husk") continue;
        if (Math.hypot(other.x - e.x, other.y - e.y) > shot.splash + other.r) continue;
        // A daze, not ice: slowed, no frost.
        other.chill = Math.max(other.chill, shot.splashChill);
      }
    }
    if (shot.cover && e.hp > 0) {
      if ((e.honeyed ?? 0) <= 0) float(e.x, e.y - 18, "blinded", "#ffd65a");
      e.honeyed = Math.max(e.honeyed ?? 0, shot.cover);
    }
    if (shot.lock) {
      const life = CANNON.quackLockLife * (wetAt(e.x, e.y) ? CANNON.wetPuddle : 1);
      world.pools.push({ x: e.x, y: e.y, r: CANNON.quackLockRadius, life, max: life, hot: false, burn: 0, owner: shot.owner, crater: true });
    }
    if (shot.owner != null && fx.confidence > 0 && popsBefore != null && tallyFor(shot.owner).pops > popsBefore) {
      const q = world.towers.find((t) => t.id === shot.owner);
      if (q) {
        q.rally = CANNON.quackRallyTime;
        // Quack-hameha: a charged beam flashes from the turret to the next fruit in line, and the aura flares.
        const next = world.enemies.find((o) => o.hp > 0 && o.id !== e.id && Math.hypot(o.x - q.x, o.y - q.y) <= statsFor(q).range);
        if (next) world.lines.push({ x: q.x, y: q.y - 18, x2: next.x, y2: next.y, life: 0.35, max: 0.35, color: "255,214,90", width: 5 });
        world.rings.push({ x: q.x, y: q.y, r: CANNON.quackAura * fx.auraReach, life: 0.45, max: 0.45, color: "255,200,80" });
      }
    }
    if (shot.knock) {
      for (const other of world.enemies) {
        if (other.hp <= 0 || other.boss) continue;
        if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) > shot.splash) continue;
        const was = { x: other.x, y: other.y };
        pushBack(other, shot.knock);
        if (Math.hypot(other.x - was.x, other.y - was.y) > 0.5) world.runLog.knocks += 1;
      }
      splashFx(e.x, e.y, shot.splash, "232,136,58");
    }
    if (has("electric") && shot.procs) {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const other of world.enemies) {
        if (other.id === e.id || other.hp <= 0) continue;
        const d = Math.hypot(other.x - e.x, other.y - e.y);
        // Ice conducts: the spark jumps farther to a fruit with frost.
        const reach =
          (COMBO.on && (other.frost ?? 0) >= 1 ? 92 * COMBO.sparkFrost : 92) *
          // The Flooded Basement: water carries the spark farther between two fruit both in it.
          (world.heights.size && floodedAt(e.x, e.y) && floodedAt(other.x, other.y) ? BASEMENT.chainReach : 1);
        if (d < bestD && d < reach) {
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
        shot.dmg = Math.max(1, Math.round(shot.dmg * (shot.bounceRatio ?? 1)));
        shot.target = next.id;
        shot.x = e.x;
        shot.y = e.y;
        shot.life = 1.4;
        return true;
      }
    }
    return false;
  };

  /**
   * The night is over (won, or out of stacks): add it to the achievements ledger and award what it
   * earned. Once per run; saved only when stats are.
   */
  const finishNight = (won: boolean) => {
    if (nightDone) return;
    nightDone = true;
    const base = {
      log: world.runLog,
      hero: world.hud.hero,
      night: world.hud.night,
      difficulty: world.hud.difficulty,
      map: world.hud.map,
      won,
      cleared,
      seeds: world.hud.seeds,
      stacks: world.hud.lives,
      slips: world.hud.night === "overflow" ? world.hud.slips : [],
    };
    const ledger = addNight(shelfSave.ledger, base);
    const endlessBest = Math.max(meta.endlessBest, world.hud.night === "endless" ? cleared : 0);
    // Fragments for the night itself, then achievements (each pays its tier).
    const parts = nightFragments({ night: base.night, difficulty: base.difficulty, won, cleared, karl: world.runLog.karlKills > 0 });
    const got = parts.reduce((n, p) => n + p.n, 0);
    shelfSave = { ...shelfSave, ledger, fragments: shelfSave.fragments + got, fragmentsEarned: shelfSave.fragmentsEarned + got };
    const settled = settle(shelfSave, { ...base, ledger, endlessBest, fragmentsEarned: shelfSave.fragmentsEarned, rooms: shelfSave.rooms });
    shelfSave = settled.save;
    const fromShelves = tierSum(settled.fresh);
    world.hud.newShelves = settled.fresh;
    world.hud.nightFragments = fromShelves
      ? [...parts, { label: `${settled.fresh.length} shelf${settled.fresh.length === 1 ? "" : "s"} restored`, n: fromShelves }]
      : parts;
    world.hud.canRestore = affordable(shelfSave.rooms, shelfSave.fragments)?.id ?? null;
    applyRooms();
    if (persistStats) saveAchievements(shelfSave);
  };

  /** Lifetime stats for a cleared wave (after the wave's own log line, so an unlock notice shows). */
  const recordWave = () => {
    const endless = world.hud.night === "endless";
    record((m) => {
      if (endless) m.endlessBest = Math.max(m.endlessBest, cleared);
      else m.bestWave = Math.max(m.bestWave, cleared);
      if (!endless && cleared >= nightLength(world.hud.night)) {
        m.wins += 1;
        if (world.hud.difficulty === "hard" || world.hud.difficulty === "overdue") m.hardWins += 1;
      }
    });
    const won = !endless && cleared >= nightLength(world.hud.night);
    const base = waveXp(world.hud.difficulty) + (won ? winXp(world.hud.difficulty) : 0);
    const bonus = world.hud.night === "overflow" ? slipXp(world.hud.slips) : 0;
    giveXp(Math.round(base * (1 + bonus)));
  };

  const endWave = () => {
    cleared += 1;
    world.hud.shutExit = null;
    if (BOARDS[world.hud.map].bays) {
      world.hud.cranked = false;
      world.hud.jammed = [...jamNext].sort();
      jamNext.clear();
      world.cocoons = [];
      if (world.hud.jammed.length) {
        world.runLog.jams += world.hud.jammed.length;
        world.hud.log = `${world.hud.jammed.map((b) => `Bay ${"AB"[b]}`).join(" and ")} jammed: a bookworm in the works. That crank won't turn this break.`;
      }
    }
    world.hud.geeseSpent = false;
    world.hud.copycatPlaced = false;
    world.hud.chuteWave = usesChute(cleared);
    world.hud.dropWave = dropsFor(cleared);
    clearSiegeWave();
    bumpBest();
    const endless = world.hud.night === "endless";
    world.hud.wave = endless ? cleared + 1 : Math.min(nightLength(world.hud.night), cleared + 1);
    syncDoors();
    world.enemies = [];
    world.shots = [];
    if (world.hud.lives <= 0) return;
    // Interest is worked out on the seeds held before any heap pays, so heaps don't compound.
    const interest = has("interest") ? Math.min(CANNON.interestCap, Math.floor(world.hud.seeds * CANNON.interestRate)) : 0;
    for (const heap of world.towers) {
      if (heap.kind !== "compost" || soaked(heap)) continue;
      const pay =
        Math.round(CANNON.compostSeeds * (heap.mods.includes("loam") ? 1.5 : 1)) + (has("interest") ? CANNON.interestBase + interest : 0);
      world.hud.seeds += pay;
      float(heap.x, heap.y - 24, `+${pay}`, "#e6c36a");
      world.rings.push({ x: heap.x, y: heap.y, r: 30, life: 0.6, max: 0.6, color: "120,170,90" });
    }
    if (fx.waveSeeds) world.hud.seeds += fx.waveSeeds;
    if (world.hud.hero === "michael") {
      // In the Zone: a wave cleared without losing a stack adds damage to his big towers, up to the cap.
      const cap = world.hud.armour === "wyrm" ? ARMOUR_VALUES.wyrmZoneCap : DRAGON.zoneCap;
      if (!waveLost && world.hud.zone < cap - 1e-9) {
        world.hud.zone = Math.min(cap, Math.round((world.hud.zone + DRAGON.zoneStep) * 100) / 100);
        world.runLog.zonePeak = Math.max(world.runLog.zonePeak, world.hud.zone);
      }
      // The Dragon's Roost grows with every wave it stood through.
      for (const roost of world.towers) {
        if (roost.kind !== "bombard" || !roost.roostReady) continue;
        const was = roostStage(roost);
        roost.grown = roostStageGrowth(roost) + 1;
        const now = roostStage(roost);
        world.runLog.roostPeak = Math.max(world.runLog.roostPeak, now);
        if (now > was) {
          float(roost.x, roost.y - 32, `${ROOST_STAGES[now]}!`, "#8fc0ff");
          world.rings.push({ x: roost.x, y: roost.y, r: 40, life: 0.8, max: 0.8, color: "111,168,239" });
          world.hud.log = now === 3 ? "The Great Dragon spreads its wings over the library." : `The egg in the Roost is a ${ROOST_STAGES[now]} now.`;
        }
      }
      world.hud.roostFed = false;
    }
    // Asser's Lion Blade: every blade that stood through the wave puts stacks back.
    let mended = 0;
    if (world.hud.hero === "asser") {
      for (const blade of world.towers) {
        if (blade.kind !== "lionblade" || !blade.mendReady) continue;
        const amount = ASSER_VALUES.bladeMend + (hasMod(blade, "dressing") ? 1 : 0);
        const before = world.hud.lives;
        world.hud.lives = Math.min(world.hud.maxLives, world.hud.lives + amount);
        const got = world.hud.lives - before;
        if (got > 0) float(blade.x, blade.y - 30, `+${got} stack${got > 1 ? "s" : ""}`, "#6fa8ef");
        mended += got;
      }
      world.runLog.mended += mended;
      syncSisu();
    }
    const mendLine = mended > 0 ? `The Lion Blade held its ground: ${mended} stack${mended > 1 ? "s" : ""} back.` : "";
    // Dr. Samodovol: the Lectern's note from this wave counts down, and if a lectern stands it notes
    // the kind that got furthest (one kind, the newest note wins).
    if (lectureNow && lecture) {
      lecture.waves -= 1;
      if (lecture.waves <= 0) lecture = null;
    }
    lectureNow = null;
    let lectureLine = "";
    if (world.towers.some((t) => t.kind === "lectern")) {
      const bar = fx.midpoint ? 0.5 : CANNON.lectureAt;
      let best: EnemyKind | null = null;
      let far = -1;
      for (const [kind, p] of reached) if (p >= bar && p > far) [best, far] = [kind, p];
      if (best) {
        lecture = { kind: best, waves: 1 + fx.carriedNote };
        const name = {
          melon: ["The melons", "They"],
          corn: ["The corn", "They"],
          pumpkin: ["The pumpkins", "They"],
          karl: ["Karl", "He"],
          goose: ["The geese", "They"],
          cat: ["The cats", "They"],
        }[best];
        lectureLine = `The Doctor: “${name[0]} got furthest. I've taken notes. ${name[1]} will be slower next time.”`;
      } else {
        lectureLine = "The Doctor: “Nothing got far. I have nothing to add.”";
      }
    }
    reached.clear();
    // The Unstoppered's spill line rides after whatever the wave-end message is, so it isn't lost.
    let spilled = false;
    for (const flask of world.towers) if (flask.kind === "flask" && spillFlask(flask)) spilled = true;
    for (const desk of world.towers) {
      if (desk.kind !== "desk" || desk.idle || soaked(desk)) continue;
      desk.bank = (desk.bank ?? 0) + CANNON.deskBank;
      float(desk.x, desk.y - 50, `+${CANNON.deskBank}`, "#e6c36a");
    }
    if (world.heights.size) drainWater();
    const beat = nextBeat(cleared, world.hud.night);
    const upcoming = waveAt(endless ? cleared : Math.min(cleared, nightLength(world.hud.night) - 1), world.hud.night);
    if (beat !== "victory") cue("clear");
    if (beat === "victory") {
      cue("victory");
      // The Reserve Desk pays out what it still holds.
      const paid = world.towers.reduce((sum, t) => sum + (t.kind === "desk" ? (t.bank ?? 0) : 0), 0);
      for (const t of world.towers) if (t.kind === "desk") t.bank = 0;
      world.hud.seeds += paid;
      world.hud.phase = "victory";
      world.hud.blurb =
        world.hud.night === "overflow"
          ? "Karl came up the chute anyway. The chute still closed."
          : world.hud.night === "siege"
            ? "The geese have gone home. The cats say it was their idea."
            : "The library holds.";
      world.hud.log = paid ? `${world.hud.blurb} The Reserve Desk pays out ${paid}.` : world.hud.blurb;
      recordWave();
      finishNight(true);
      if (!endless) {
        const brewed = world.hud.hero === "vael" && stillBuilt && (has("vial") || has("distill"));
        record((m) => {
          m.richest = Math.max(m.richest, world.hud.seeds);
          if (brewed) m.brews += 1;
        });
      }
      notify();
      return;
    }
    const step = cleared === 1 ? 1 : cleared === 2 ? 2 : 3;
    const offer =
      beat === "upgrade"
        ? withDoctorsPick(buildOffer(world.hud.hero, step, world.hud.upgrades, world.hud.branch, builtKinds()), step)
        : [];
    if (beat === "upgrade" && offer.length) {
      world.hud.offer = offer;
      world.hud.phase = "upgrade";
      if (world.hud.guide === "speed" || world.hud.guide === "combat") world.hud.guide = "upgrade";
      world.hud.log =
        endless && cleared > 6
          ? "Another shelf opens. The carpet keeps going."
          : world.hud.night === "midnight" && cleared === WAVE_COUNT
          ? "One more shelf. The fruit after this is not just thicker."
          : step === 3
          ? world.hud.night === "overflow"
            ? "One more shelf. Then the meter starts spending."
            : world.hud.night === "siege"
              ? "One more shelf. Then they come together."
              : "One more shelf. Then the last waves."
          : step === 1
            ? `${KEEPER_NAMES[world.hud.hero ?? "mynxi"].short}'s first shelf.`
            : "The last pick opened the next shelf.";
    } else if (beat === "consequence") {
      world.hud.phase = "consequence";
      world.hud.waveName = upcoming.name;
      world.hud.blurb = upcoming.blurb;
      world.hud.log =
        world.hud.night === "overflow"
          ? "Karl is not using the door."
          : world.hud.night === "siege"
            ? "Both of them, at once. They still hate each other."
            : "Everything left in the library is on the carpet.";
    } else {
      world.hud.phase = "prep";
      world.hud.blurb = upcoming.blurb;
      world.hud.waveName = upcoming.name;
      world.hud.log = `Wave ${cleared} cleared.`;
    }
    if (spilled) world.hud.log = `${world.hud.log} Vaelithra: “That was not in the notes.”`;
    if (world.hud.plugged) world.hud.log = `${world.hud.log} A Drain Gourd's plugged the drain.`;
    if (lectureLine) world.hud.log = `${world.hud.log} ${lectureLine}`;
    if (mendLine) world.hud.log = `${world.hud.log} ${mendLine}`;
    // A board with doors: a door opening in two waves is heard first; then it opens.
    for (const d of BOARDS[world.hud.map].doors ?? []) {
      if (d.id !== "stairs" || !d.from) continue;
      if (d.from === cleared + 2) world.hud.log = `${world.hud.log} Someone's taken the boards off the back stairs.`;
      if (d.from === cleared + 1) world.hud.log = `${world.hud.log} The back stairs are open.`;
    }
    recordWave();
    notify();
  };

  const tickCombat = (dt: number) => {
    if (world.hud.golden > 0) world.hud.golden = Math.max(0, world.hud.golden - dt);
    clock += dt;
    const scale = hpScaleFor(world.hud.night, cleared);
    spawnClock += dt;
    while (queueCursor < queue.length && spawnClock >= queue[queueCursor].t) {
      const q = queue[queueCursor];
      queueCursor += 1;
      // Paratroopers don't walk in: their drop point glows, and they land on it a few seconds later.
      if (q.siege === "para") {
        drops.push({ q, scale, t: clock + SIEGE.dropGlow });
        if (!world.hud.dropSeen) {
          world.hud.dropSeen = true;
          world.hud.log = "A chalk target is glowing on the carpet. Something is coming down.";
        }
        continue;
      }
      spawnEnemy(q.kind, scale * q.tough, q.guard, {
        split: q.split,
        raw: q.raw,
        chute: q.chute,
        pit: q.pit,
        gall: q.gall,
        borrower: q.borrower,
        native: q.native,
        siege: q.siege,
        line: q.line,
        leader: q.leader,
        route: q.route,
      });
    }
    if (world.heights.size) tickWater(dt);
    // Door lamps: a door glows for a moment before its next fruit walks in.
    if (world.doors.length) {
      world.doors.forEach((d) => (d.lit = false));
      world.exits.forEach((x) => (x.lit = false));
      for (let k = queueCursor; k < queue.length && queue[k].t - spawnClock <= 1.5; k++) {
        const d = world.doors[doorIdx(queue[k].route)];
        if (d) d.lit = true;
        const x = exitOfRoute(queue[k].route);
        if (x) x.lit = true;
      }
    }
    if (drops.length) {
      for (const d of drops) {
        if (d.t > clock) continue;
        const at = dropSpot(d.q.drop);
        spawnEnemy("cat", d.scale * d.q.tough, d.q.guard, { siege: "para", at });
        burst(at.x, at.y, "#d8c9a8", 6);
      }
      drops = drops.filter((d) => d.t > clock);
    }
    world.landings = drops.map((d) => ({ drop: d.q.drop, left: d.t - clock }));
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
    tickBell(dt);
    tickVines(dt);

    // Reading Lamps' light knocks a Box Cat's box off.
    const lamps = world.towers
      .filter((t) => t.kind === "lantern")
      .map((t) => ({ x: t.x, y: t.y, r: towerReadout(world.hud.hero, "lantern", t.mods, world.hud.upgrades).range }));
    for (const e of world.enemies) {
      // A paratrooper still coming down: nothing touches it and it doesn't walk yet.
      if ((e.descend ?? 0) > 0) {
        e.descend = Math.max(0, (e.descend ?? 0) - dt);
        continue;
      }
      if (e.boxed && lamps.some((l) => (l.x - e.x) ** 2 + (l.y - e.y) ** 2 <= l.r * l.r)) unbox(e);
      // The Matriarch rallies every goose on the board.
      if (e.matriarch && e.hp > 0) {
        e.rallyCd = (e.rallyCd ?? SIEGE.rallyEvery) - dt;
        if (e.rallyCd <= 0) {
          e.rallyCd += SIEGE.rallyEvery;
          for (const o of world.enemies) if (o.kind === "goose" && o.hp > 0) o.rallied = SIEGE.rallyTime;
          world.rings.push({ x: e.x, y: e.y, r: CELL * 2.5, life: 0.6, max: 0.6, color: "255,214,120" });
          world.floaters.push({ x: e.x, y: e.y - 34, text: "RALLY!", life: 0.9, color: "#ffd678", size: 18 });
        }
      }
      if ((e.rallied ?? 0) > 0) e.rallied = Math.max(0, (e.rallied ?? 0) - dt);
      if ((e.brawl ?? 0) > 0) e.brawl = Math.max(0, (e.brawl ?? 0) - dt);
      let slow = 1;
      let dot = 0;
      let burn = 0;
      let toxic: { dps: number; by?: number } | null = null;
      let dotBy: number | undefined;
      let burnBy: number | undefined;
      /** The deepest Still puddle it stands in (1: none). A husk still feels part of it. */
      let stillCrawl = 1;
      for (const pool of world.pools) {
        if (Math.hypot(e.x - pool.x, e.y - pool.y) > pool.r) continue;
        if (pool.honey) {
          // Honey doesn't slow: it sticks, and sticky fruit take more damage from everything.
          if ((e.honeyed ?? 0) <= 0) float(e.x, e.y - 18, "sticky", "#e8b84a");
          e.honeyed = CANNON.honeyTime;
          continue;
        }
        if (pool.hot) {
          // An explosion on the patch: it flares up for a moment.
          const hot = (pool.burn || 22) * (COMBO.on && (pool.flare ?? 0) > 0 ? COMBO.flare : 1);
          if (hot > burn) burnBy = pool.owner;
          burn = Math.max(burn, hot);
          continue;
        }
        if (pool.toxic) {
          slow = Math.min(slow, softenSlow(CANNON.cauldronSlow));
          if (COMBO.on) {
            if (!toxic || pool.toxic > toxic.dps) toxic = { dps: pool.toxic, by: pool.owner };
            continue;
          }
          if (pool.toxic > dot) dotBy = pool.owner;
          dot = Math.max(dot, pool.toxic);
          continue;
        }
        const crawl = has("distill") ? 0.38 : has("sticky") ? 0.45 : has("vial") ? 0.55 : 0.78;
        slow = Math.min(slow, softenSlow(crawl));
        stillCrawl = Math.min(stillCrawl, crawl);
        if (has("distill")) {
          if (16 > dot) dotBy = pool.owner;
          dot = Math.max(dot, 16);
        }
      }
      if (e.chill > 0) {
        e.chill -= dt;
        slow = Math.min(slow, softenSlow(has("distill") ? 0.48 : 0.62));
      }
      // Drowsy (Vaelithra): slowed until it wears off, or until fire wakes it.
      if ((e.restT ?? 0) > 0) e.restT = (e.restT ?? 0) - dt;
      if ((e.reportT ?? 0) > 0) e.reportT = Math.max(0, (e.reportT ?? 0) - dt);
      // Unstoppered's Fumes: a drowsy fruit standing in her puddle takes a doze hit every second.
      if ((e.drowsy ?? 0) > 0 && e.hp > 0 && !sleeping(e) && world.towers.some((t) => t.kind === "flask") && inVaelPool(e)) {
        e.fumeCd = (e.fumeCd ?? VAEL_VALUES.fumesEvery) - dt;
        if (e.fumeCd <= 0) {
          e.fumeCd = VAEL_VALUES.fumesEvery;
          doze(e);
        }
      } else e.fumeCd = undefined;
      if (((e.drowsy ?? 0) > 0 || (e.freeze > 0 && e.stunBy === "sleep")) && burningNow(e)) wake(e);
      if ((e.drowsy ?? 0) > 0) {
        e.drowsy = (e.drowsy ?? 0) - dt;
        slow = Math.min(slow, softenSlow(DROWSY.slow));
      }
      if (e.freeze > 0) {
        e.freeze -= dt;
        slow = 0;
      }
      if ((e.iced ?? 0) > 0) e.iced = Math.max(0, (e.iced ?? 0) - dt);
      // Frost: 1 stack slows a little, 2 slow hard, 3 is frozen solid (back to 2 when the freeze runs out).
      if (COMBO.on && (e.frost ?? 0) > 0) {
        if ((e.frost ?? 0) >= COMBO.frostMax && e.freeze <= 0) {
          e.frost = COMBO.frostMax - 1;
          e.frostT = drainTime(e);
        }
        slow = Math.min(slow, softenSlow(COMBO.frostSlow[Math.min(2, Math.floor(e.frost ?? 0))] ?? 1));
        // The drain waits while it's held frozen.
        if (e.freeze <= 0) e.frostT = (e.frostT ?? drainTime(e)) - dt;
        if ((e.frostT ?? 0) <= 0 && e.freeze <= 0) {
          e.frost = Math.max(0, (e.frost ?? 0) - 1);
          e.frostT = drainTime(e);
        }
      }
      if (e.guard === "husk") {
        e.chill = 0;
        e.drowsy = 0;
        e.freeze = 0;
        e.frost = 0;
        e.iced = 0;
        slow = stillCrawl < 1 ? softenSlow(1 - (1 - stillCrawl) * CANNON.stillHusk) : 1;
      }
      // Pinned under the Foot of the Law: the one stop a husk can't shrug off.
      if ((e.stomped ?? 0) > 0) {
        e.stomped = (e.stomped ?? 0) - dt;
        slow = 0;
      }
      // Standing still: a gosling whose leader fell, or a goose and a cat in a fight.
      if ((e.halt ?? 0) > 0) {
        e.halt = (e.halt ?? 0) - dt;
        slow = 0;
      }
      // Express Corn on a belt: no slow, stop, honey or walk-back takes hold.
      if (expressOnBelt(e)) {
        e.chill = 0;
        e.drowsy = 0;
        e.freeze = 0;
        e.frost = 0;
        e.iced = 0;
        e.stomped = 0;
        e.honeyed = 0;
        e.driven = 0;
        slow = 1;
      }
      e.slow = slow;
      credit = dotBy ?? null;
      if (dot) hurt(e, null, dot * dt, 0, "pulp");
      if ((e.ink ?? 0) > 0) e.ink = (e.ink ?? 0) - dt;
      if ((e.honeyed ?? 0) > 0) e.honeyed = (e.honeyed ?? 0) - dt;
      if ((e.worm ?? 0) > 0) {
        e.worm = (e.worm ?? 0) - dt;
        credit = e.wormBy ?? null;
        hurt(e, null, (e.wormDps ?? 0) * dt, 0, "worm");
      }
      // Doused fruit is still steaming: no fire damage, but a growth bed or vine doesn't heal it either.
      const steaming = COMBO.on && (e.doused ?? 0) > 0;
      if (COMBO.on && e.hp > 0) {
        if ((e.doused ?? 0) > 0) {
          // Fire, then ice: its fire is out for a moment, even standing in a patch.
          e.doused = Math.max(0, (e.doused ?? 0) - dt);
          burn = 0;
        } else if (burn > 0 && e.guard !== "husk" && frosted(e)) {
          // Ice, then fire: walking into fire with frost thaws it with a burst.
          thaw(e);
          credit = burnBy ?? null;
          hurt(e, null, burn * COMBO.thermalBonus, 0, "shock");
        }
        // Flammable: fire on a poisoned fruit burns hotter while the poison lasts; the poison is spent when the fire goes out.
        const onFire = burn > 0 || (e.burnT ?? 0) > 0;
        if (onFire && (e.poison ?? 0) > 0) {
          if (burn > 0) burn *= AFFLICT.flammable;
          if (!e.flamed) float(e.x, e.y - 22, "flare-up", "#ffb35a");
          e.flamed = true;
        } else if (!onFire && e.flamed) {
          e.flamed = false;
          e.poison = 0;
          e.poisonT = 0;
        }
        tickAfflictions(e, dt, toxic, burn > 0 ? { dps: burn, by: burnBy } : null);
        noteAfflictions(e, burn > 0 || (e.burnT ?? 0) > 0);
      }
      credit = burnBy ?? null;
      if (burn) hurt(e, null, burn * dt, 0, "burn");
      credit = null;
      // Drawing only: char builds while it burns; the healing glow fades; a trail is laid as it walks.
      {
        const burning = burn > 0 || (e.burnT ?? 0) > 0;
        e.charred = burning ? Math.min(STATUS_LOOK.charMax, (e.charred ?? 0) + dt) : Math.max(0, (e.charred ?? 0) - dt * 0.5);
        if ((e.healT ?? 0) > 0) e.healT = Math.max(0, (e.healT ?? 0) - dt);
        e.markCd = (e.markCd ?? 0) - dt;
        if (e.hp > 0 && e.slow > 0 && e.markCd <= 0) {
          const kind: StatusMark["kind"] | null = burning
            ? "scorch"
            : (e.poison ?? 0) > 0
              ? "drip"
              : (e.honeyed ?? 0) > 0
                ? "print"
                : COMBO.on ? ((e.frost ?? 0) >= 1 ? "frost" : null) : e.chill > 0 ? "frost" : null;
          if (kind) {
            const to = routeOf(e)[e.wp];
            addMark(e.x, e.y + e.r * 0.6, kind, STATUS_LOOK.trailLife, to ? Math.atan2(to.y - e.y, to.x - e.x) : 0);
            e.markCd = STATUS_LOOK.trailEvery;
          } else e.markCd = 0;
        }
      }
      // A growth bed (or a Creeping Squash's vine) heals whatever stands in it, unless it's burning (or doused: still steaming). Fire burns a vine away.
      const vine = world.vines.has(tileOf(e));
      if (burn && vine) world.vines.delete(tileOf(e));
      const onBed = floorAt(e)?.kind === "bed" || (vine && !burn);
      if (e.hp > 0 && !burn && !steaming && e.hp < e.maxHp && onBed) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * FLOOR.bedHeal * dt);
        e.healT = STATUS_LOOK.healGlow;
      }
      if (e.native === "sprout" && e.hp > 0 && !burn && !steaming && onBed) {
        e.bedTime = (e.bedTime ?? 0) + dt;
        if (e.bedTime >= NATIVES.sproutGrow) growSprout(e);
      }
      if ((e.grew ?? 0) > 0) e.grew = Math.max(0, (e.grew ?? 0) - dt);
      if (e.native === "squash" && e.hp > 0) {
        e.vineCd = (e.vineCd ?? NATIVES.vineEvery) - dt;
        if (e.vineCd <= 0) {
          e.vineCd += NATIVES.vineEvery;
          const key = tileOf(e);
          if (world.pathCells.has(key) && world.floors.get(key)?.kind !== "bed" && !world.vines.has(key)) {
            world.vines.set(key, { life: NATIVES.vineLife, by: e.id, max: NATIVES.vineLife });
          }
        }
      }
      // A gall rides its host: heals it and stays a step behind. With the host gone it is only a corn.
      if (e.gall && e.hp > 0) {
        const host = world.enemies.find((o) => o.id === e.mends && o.hp > 0);
        if (host) {
          host.hp = Math.min(host.maxHp, host.hp + host.maxHp * BALANCE.gallHeal * dt);
          if (host.hp < host.maxHp) host.healT = STATUS_LOOK.healGlow;
          const spot = stepBehind(host, CANNON_GALL_GAP);
          e.x = spot.x;
          e.y = spot.y;
          e.wp = spot.wp;
          continue;
        }
      }
      // Instant Quackmission: walk back toward the corner behind it for a while (wait at the carpet's start or the chute's end).
      // A goose the Anti-Geese Protocol threw panics too: it walks back a little further.
      if ((e.driven ?? 0) > 0 || (e.panic ?? 0) > 0) {
        const driven = (e.driven ?? 0) > 0;
        if (driven) e.driven = Math.max(0, (e.driven ?? 0) - dt);
        const backAt = e.reverse ? e.wp + 1 : e.wp - 1;
        const back = routeOf(e)[backAt];
        if (!back) e.panic = 0;
        if (back) {
          const bx = back.x - e.x;
          const by = back.y - e.y;
          const bd = Math.hypot(bx, by);
          const studiedBack = lectureNow === e.kind ? CANNON.lectureSlow - fx.lectureSlow : 1;
          const stepBack = e.speed * e.slow * studiedBack * perimeterAt(e) * paceOf(e, !e.reverse) * awake(e) * dt;
          if (!driven) e.panic = Math.max(0, (e.panic ?? 0) - stepBack);
          if (bd <= stepBack + 0.5) {
            e.x = back.x;
            e.y = back.y;
            e.wp = backAt;
          } else if (bd > 0) {
            e.x += (bx / bd) * stepBack;
            e.y += (by / bd) * stepBack;
          }
        }
        continue;
      }
      const route = routeOf(e);
      const wp = route[e.wp];
      if (!wp) continue;
      const dx = wp.x - e.x;
      const dy = wp.y - e.y;
      const dist = Math.hypot(dx, dy);
      // The History Lectern's note: the kind that got furthest last wave walks slower.
      const studied = lectureNow === e.kind ? CANNON.lectureSlow - fx.lectureSlow : 1;
      const rush = (e.rallied ?? 0) > 0 ? SIEGE.rallySpeed : 1;
      const step = e.speed * e.slow * studied * rush * perimeterAt(e) * paceOf(e, Boolean(e.reverse)) * awake(e) * dt;
      if (dist <= step + 0.5) {
        e.x = wp.x;
        e.y = wp.y;
        if (e.reverse) {
          e.wp -= 1;
          if (e.wp < 0) {
            noteReach(e, 1);
            if (e.borrower) borrow(e);
            else leakAt(e);
            e.hp = 0;
          }
        } else {
          e.wp += 1;
          // The Loop: at the end of the first lap, fast fruit and fruit nobody has hit cut across to the door.
          const cut = BOARDS[world.hud.map].shortcut;
          if (cut && (e.route ?? 0) === 0 && e.wp === cut.from + 1 && takesShortcut(e)) {
            e.route = 1;
            world.runLog.shortcuts += 1;
            float(e.x, e.y - 18, "shortcut!", "#e6c36a");
            if (!shortcutNoted) {
              shortcutNoted = true;
              world.hud.log = "A fruit cut across the middle. Fast fruit, and any fruit nobody has hit yet, skip the second lap.";
              notify();
            }
          }
          if (e.wp >= routeOf(e).length) {
            noteReach(e, 1);
            if (e.borrower) borrow(e);
            else leakAt(e);
            e.hp = 0;
          }
        }
      } else if (dist > 0) {
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
      }
      if (e.hp > 0) noteReach(e, progressOf(e));
      if (e.hp > 0 && (e.native === "wormgourd" || e.native === "wormqueen")) {
        // A Bookworm that walks out of a bay alive jams that bay's crank for the next break.
        const now = bayAt(e.x, e.y);
        if (e.bay != null && e.bay >= 0 && now !== e.bay) jamNext.add(e.bay);
        e.bay = now;
      }
    }

    tickFeud();
    tickCocoons(dt);

    // Reserve Desk: a melon that comes past eats whatever is banked.
    for (const desk of world.towers) {
      if (desk.kind !== "desk" || !desk.bank) continue;
      const thief = world.enemies.find(
        (e) => e.kind === "melon" && e.hp > 0 && Math.hypot(e.x - desk.x, e.y - desk.y) <= CANNON.deskReach,
      );
      if (!thief) continue;
      float(desk.x, desk.y - 24, `bank eaten −${desk.bank}`, "#e23b4a");
      world.hud.log = `A melon walked past the Reserve Desk and ate the bank: ${desk.bank} seeds. Mynxi: “That melon owes me.”`;
      desk.bank = 0;
    }

    syncMimics();
    // While the Bell Tower's clock strikes, no tower acts (shots already in the air still land).
    for (const tower of (world.bell?.quiet ?? 0) > 0 ? [] : actingTowers()) {
      credit = tower.id;
      // The Compact Stacks: a carpet-side tower whose carpet rolled away waits for it to come back.
      if (tower.idle) continue;
      // The Flooded Basement: a tower standing in the water waits for it to drop.
      if (soaked(tower)) continue;
      tower.cd -= dt;
      if (tower.rally) tower.rally = Math.max(0, tower.rally - dt);
      if (PASSIVE.includes(tower.kind)) continue;
      if (tower.kind === "orrery") {
        spinOrrery(tower, dt);
        continue;
      }
      if (tower.kind === "flask") {
        dripFlask(tower, dt);
        continue;
      }
      if (tower.kind === "spire") {
        tickSpire(tower);
        continue;
      }
      if (tower.kind === "gourdgate") {
        tickGate(tower, dt);
        continue;
      }
      if (tower.kind === "pamphlet") {
        tickPamphlet(tower, dt);
        continue;
      }
      let target: Enemy | null = null;
      let bestScore = -Infinity;
      let bestProg = -Infinity;
      const mode = modeOf(tower);
      const stats = statsFor(tower);
      const range = stats.range;
      const inRange: Enemy[] = [];
      // A Box Cat can't be aimed at; area towers still see it. A paratrooper in the air can't be reached at all.
      const seesBoxes = BOX_SEERS.includes(tower.kind);
      const seesBurrows = seesBoxes || BURROW_SEERS.includes(tower.kind);
      for (const e of world.enemies) {
        if (e.hp <= 0 || (e.descend ?? 0) > 0 || (e.boxed && !seesBoxes) || (!seesBurrows && burrowed(e))) continue;
        const d2 = (e.x - tower.x) ** 2 + (e.y - tower.y) ** 2;
        if (d2 > range * range) continue;
        inRange.push(e);
        const prog = progScore(e);
        // The tower's targeting mode (Settings in the inspector, A); the Mimic Chest keeps its own rule:
        // the first fruit that isn't a boss.
        // The Underlings throw at the drowsiest fruit: the most doze hits, then the longest drowsy, then the furthest along.
        const score =
          tower.kind === "mimic"
            ? prog + (e.boss ? 0 : 1e6)
            : tower.kind === "underlings"
              ? (e.dozeHits ?? 0) * 1e9 + Math.max(0, e.drowsy ?? 0) * 1e6 + prog
              : targetScore(mode, tower, e, prog, Math.sqrt(d2), world.pools);
        if (score > bestScore || (score === bestScore && prog > bestProg)) {
          bestScore = score;
          bestProg = prog;
          target = e;
        }
      }
      if (!target) {
        tower.aimAt = undefined;
        continue;
      }
      if (tower.kind === "hive") target = inRange[Math.floor(Math.random() * inRange.length)] ?? target;
      tower.aimAt = target.id;
      tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cd > 0) continue;
      // A honk close by: this one misses its next shot.
      if (tower.honked && tower.kind !== "geese") {
        tower.honked = false;
        tower.cd = stats.interval;
        float(tower.x, tower.y - 24, "?!", "#f4f1e8");
        continue;
      }
      if (tower.kind === "geese") {
        if ((tower.trigger ?? "auto") === "auto" && geeseShouldFire(inRange)) fireGeese(tower, inRange);
        continue;
      }
      // Full power: with the meter full, this Quack-Liber's next shot is one huge blast on everything around it.
      if (tower.kind === "quackliber" && CANNON.quackKiNeed > 0 && world.hud.ki >= CANNON.quackKiNeed) {
        world.hud.ki = 0;
        tower.cd = stats.interval;
        const reach = stats.range * CANNON.quackKiReach;
        credit = tower.id;
        for (const o of world.enemies) {
          if (o.hp <= 0 || Math.hypot(o.x - tower.x, o.y - tower.y) > reach + o.r) continue;
          hurt(o, null, o.maxHp * (o.boss ? CANNON.quackKiBoss : CANNON.quackKiShare), 0, "splash");
        }
        credit = null;
        world.rings.push({ x: tower.x, y: tower.y, r: reach, life: 0.8, max: 0.8, color: "255,214,90" });
        world.rings.push({ x: tower.x, y: tower.y, r: reach * 0.7, life: 0.6, max: 0.6, color: "255,240,200", fill: true });
        float(tower.x, tower.y - 30, "FULL POWER!", "#ffd65a");
        cue("fire", "trebuchet");
        world.shake = Math.max(world.shake, world.reduced ? 0 : 6);
        continue;
      }
      if (tower.kind === "driver") {
        // The fruit furthest along its own way, not one already walking back.
        let pick: Enemy | null = null;
        let best = -1;
        for (const e of inRange) {
          if ((e.driven ?? 0) > 0 || (e.driveReady ?? 0) > world.anim) continue;
          const p = progressOf(e);
          if (p > best) {
            best = p;
            pick = e;
          }
        }
        if (!pick) continue;
        tower.cd = stats.interval;
        tower.aim = Math.atan2(pick.y - tower.y, pick.x - tower.x);
        pick.driven = pick.boss ? CANNON.driverKarl : CANNON.driverTime;
        pick.driveReady = world.anim + pick.driven + CANNON.driverImmune;
        // Instant Quackmission: it blinks (a bright flash where it stood), no beam.
        world.rings.push({ x: pick.x, y: pick.y, r: pick.r + 12, life: 0.3, max: 0.3, color: "255,244,200", fill: true });
        cue("fire", "driver");
        continue;
      }
      if (tower.kind === "bombard") {
        // The Dragon's Roost: an egg just sits there.
        if (stats.dmg <= 0) continue;
        const aim = densest(inRange);
        tower.cd = stats.interval;
        tower.aim = Math.atan2(aim.y - tower.y, aim.x - tower.x);
        cue("fire", "bombard");
        world.shots.push({
          id: id(),
          x: tower.x,
          y: tower.y - 12,
          tx: aim.x,
          ty: aim.y,
          target: aim.id,
          dmg: stats.dmg,
          life: shotLife(tower.x, tower.y, aim.x, aim.y),
          bounces: 0,
          orange: true,
          splash: CANNON.bombardRadius,
          element: "mortar",
          procs: false,
          owner: tower.id,
          splashRatio: CANNON.bombardSplashRatio,
          chill: 0,
          freezeExtra: 0,
          fireLife: 0,
          fireBurn: 0,
          bombard: true,
        });
        continue;
      }
      if (tower.kind === "lionblade") {
        // Cleave: one sweep hits every fruit in reach for the same damage. A rally swing hits harder.
        const mul = tower.bladeRally ? (hasMod(tower, "scar") ? CANNON.bladeScar : CANNON.bladeRally) : 1;
        tower.bladeRally = false;
        tower.cd = stats.interval;
        cue("fire", "lionblade");
        for (const e of inRange) hurt(e, null, stats.dmg * mul);
        world.rings.push({ x: tower.x, y: tower.y, r: range, life: 0.3, max: 0.3, color: "111,168,239" });
        if (mul > 1) world.rings.push({ x: tower.x, y: tower.y, r: range * 0.7, life: 0.4, max: 0.4, color: "220,236,255", fill: true });
        continue;
      }
      if (tower.kind === "honey") {
        // Step onto the carpet a little ahead of the fruit, so it walks into the footprint.
        tower.cd = stats.interval;
        cue("fire", "honey");
        const tp = routeOf(target);
        const next = tp[target.reverse ? Math.max(0, target.wp - 1) : Math.min(tp.length - 1, target.wp)];
        const d = Math.hypot(next.x - target.x, next.y - target.y);
        const lead = Math.min(d, CELL * 0.75);
        const fx2 = d > 0 ? target.x + ((next.x - target.x) / d) * lead : target.x;
        const fy2 = d > 0 ? target.y + ((next.y - target.y) / d) * lead : target.y;
        const mine = world.pools.filter((p) => p.owner === tower.id);
        if (mine.length >= CANNON.honeyMax) world.pools = world.pools.filter((p) => p !== mine[0]);
        world.pools.push({
          x: fx2,
          y: fy2,
          r: CANNON.honeyRadius,
          life: CANNON.honeyLife,
          max: CANNON.honeyLife,
          hot: false,
          burn: 0,
          honey: true,
          rot: d > 0 ? Math.atan2(next.y - target.y, next.x - target.x) : 0,
          owner: tower.id,
        });
        continue;
      }
      if (tower.kind === "still") {
        tower.cd = stats.interval;
        addPool(target.x, target.y, hasMod(tower, "spread"), hasMod(tower, "cling"), hasMod(tower, "mimicstep") ? CANNON.mimicPuddle : 0);
        continue;
      }
      if (tower.kind === "organ") {
        // A chord: every fruit in reach is hit and slowed; every third chord (second, with the fitting) also stops them.
        tower.cd = stats.interval;
        tower.chord = (tower.chord ?? 0) + 1;
        const swell = tower.chord % (hasMod(tower, "crescendo") ? 2 : CANNON.organEvery) === 0;
        cue("fire", "organ");
        for (const e of inRange) {
          hurt(e, null, stats.dmg, 0, "splash");
          if (e.guard === "husk") continue;
          // The chord dazes (a slow, not ice); a crescendo stops it.
          e.chill = Math.max(e.chill, CANNON.organChill);
          if (swell && (e.organReady ?? 0) <= world.anim) {
            const stop = e.boss ? CANNON.organStunBoss : CANNON.organStun;
            e.freeze = Math.max(e.freeze, stop);
            e.stunBy = "organ";
            e.organReady = world.anim + stop + CANNON.organStunImmune;
          }
        }
        world.rings.push({ x: tower.x, y: tower.y, r: range, life: 0.5, max: 0.5, color: swell ? "230,195,106" : "170,130,210" });
        float(tower.x, tower.y - 28, swell ? "CRESCENDO" : "♪", swell ? "#e6c36a" : "#c9b2ec");
        continue;
      }
      if (tower.kind === "bell") {
        tower.cd = stats.interval;
        cue("fire", "bell");
        for (const e of inRange) {
          // A husk shrugs off most of the hush: it only stands still for a moment.
          if (e.guard === "husk") {
            e.halt = Math.max(e.halt ?? 0, CANNON.bellStun * CANNON.bellHusk);
            continue;
          }
          e.freeze = Math.max(e.freeze, (e.boss ? CANNON.bellStunBoss : CANNON.bellStun));
          e.stunBy = "bell";
        }
        world.rings.push({ x: tower.x, y: tower.y, r: range, life: 0.45, max: 0.45, color: "230,195,106" });
        float(tower.x, tower.y - 26, "SHHH", "#e6c36a");
        continue;
      }
      if (tower.kind === "mimic") {
        // Memec swallows one fruit whole, then digests. Karl is too big: he loses a bite.
        tower.cd = stats.interval;
        cue("fire", "mimic");
        if (target.boss) {
          hurt(target, null, CANNON.mimicBossBite);
          float(target.x, target.y - 22, "chomp", "#6fc6ef");
        } else {
          float(target.x, target.y - 22, "gulp", "#6fc6ef");
          world.runLog.swallows += 1;
          target.hp = 0;
          onDeath(target);
          world.hud.seeds += CANNON.mimicLoot + fx.loot;
        }
        world.lines.push({ x: tower.x, y: tower.y, x2: target.x, y2: target.y, life: 0.2, max: 0.2, color: "111,198,239", width: 6 });
        continue;
      }
      if (tower.kind === "stomp") {
        // Foot of the Law: land on the fruit with the most company, then pin and bruise everything under the sole.
        tower.cd = stats.interval;
        cue("fire", "stomp");
        let spot = target;
        let crowd = -1;
        for (const e of inRange) {
          let n = 0;
          for (const o of inRange) if (Math.hypot(o.x - e.x, o.y - e.y) <= CANNON.stompRadius) n++;
          if (n > crowd) {
            crowd = n;
            spot = e;
          }
        }
        const sx = spot.x;
        const sy = spot.y;
        for (const e of world.enemies) {
          if (e.hp <= 0 || Math.hypot(e.x - sx, e.y - sy) > CANNON.stompRadius) continue;
          e.stomped = Math.max(e.stomped ?? 0, e.boss ? CANNON.stompStunBoss : CANNON.stompStun);
          hurt(e, null, stats.dmg, 0, "splash");
        }
        world.stomps.push({ x: sx, y: sy, life: 0.45, max: 0.45 });
        world.rings.push({ x: sx, y: sy, r: CANNON.stompRadius, life: 0.4, max: 0.4, color: "201,162,90" });
        world.shake = world.reduced ? 0 : Math.max(world.shake, 4);
        float(sx, sy - 26, "STOMP", "#e6c36a");
        continue;
      }
      if (tower.kind === "scales") {
        // A share of the heaviest fruit's health, and a fee if the verdict kills it.
        tower.cd = stats.interval;
        cue("fire", "scales");
        const share = target.boss ? CANNON.scalesBossShare : CANNON.scalesShare + fx.share;
        hurt(target, null, stats.dmg + target.maxHp * share);
        if (target.hp <= 0) {
          const fee = CANNON.scalesFee + fx.fee;
          world.hud.seeds += fee;
          float(target.x, target.y - 26, `fee +${fee}`, "#e6c36a");
        }
        world.lines.push({ x: tower.x, y: tower.y, x2: target.x, y2: target.y, life: 0.25, max: 0.25, color: "230,195,106", width: 3 });
        burst(target.x, target.y, "#e6c36a", 8);
        continue;
      }
      if (tower.kind === "scope") {
        // Brass Telescope: an instant, armour-piercing shot (shells, husks and damp count for nothing).
        tower.cd = stats.interval;
        cue("fire", "scope");
        hurt(target, null, stats.dmg, 0, "pierce");
        // From the lens, roughly where the turned tube ends.
        world.lines.push({ x: tower.x + Math.cos(tower.aim) * 24, y: tower.y - 17 + Math.sin(tower.aim) * 14, x2: target.x, y2: target.y, life: 0.2, max: 0.2, color: "230,195,106", width: 2 });
        burst(target.x, target.y, "#e6c36a", 7);
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
          // The spear goes through the first few fruit on its line, nearest first (Through and through: more).
          const onLine: Array<{ e: Enemy; along: number }> = [];
          for (const e of world.enemies) {
            if (e.hp <= 0) continue;
            const rx = e.x - tower.x;
            const ry = e.y - tower.y;
            const along = rx * ux + ry * uy;
            if (along < 0 || along > range) continue;
            if (Math.abs(rx * uy - ry * ux) > e.r + 8) continue;
            onLine.push({ e, along });
          }
          onLine.sort((a, b) => a.along - b.along);
          for (const { e } of onLine.slice(0, ballistaPierce(tower.mods))) {
            if (has("barbed") && e.guard !== "husk") {
              // Hooks, not ice: slowed, no frost.
              e.chill = Math.max(e.chill, CANNON.barbedSlow);
            }
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
      if (tower.kind === "boomerang" || tower.kind === "plane" || tower.kind === "quill" || tower.kind === "globe" || tower.kind === "press") {
        launchFlyer(tower, target, stats);
        continue;
      }
      // A crowded board: past seven Fly Hives, every hive sends its flies a little less often.
      tower.cd = tower.kind === "hive" ? stats.interval / hiveCrowd(world.towers.filter((x) => x.kind === "hive").length) : stats.interval;
      const dmg = stats.dmg;
      cue("fire", tower.kind);
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
                        : tower.kind === "cauldron"
                          ? "potion"
                          : tower.kind === "underlings"
                            ? "vial"
                          : tower.kind === "trebuchet" || tower.kind === "quackliber"
                            ? "mortar"
                            : "shot";
      const flies = tower.kind === "hive" && hasMod(tower, "swarm") ? 2 : 1;
      // Quack-Liber: Ground Pound marks the carpet with every fourth rocket.
      const quack = tower.kind === "quackliber";
      if (quack) tower.volley = (tower.volley ?? 0) + 1;
      const lock = quack && fx.lockdown > 0 && (tower.volley ?? 0) % CANNON.quackLockEvery === 0;
      for (let f = 0; f < flies; f++) {
      const aimAt = f === 0 ? target : (inRange[Math.floor(Math.random() * inRange.length)] ?? target);
      world.shots.push({
        id: id(),
        owner: tower.id,
        x: tower.x,
        y: tower.y,
        tx: aimAt.x,
        ty: aimAt.y,
        target: aimAt.id,
        dmg,
        // Long enough to cross the board: hives and the Reader reach anywhere.
        life: shotLife(tower.x, tower.y, aimAt.x, aimAt.y),
        bounces:
          tower.kind === "catalogue"
            ? CANNON.catalogueChains + fx.chains
            : tower.kind === "hive" && has("stinging")
              ? 1
              : 0,
        bounceRatio: tower.kind === "catalogue" ? Math.max(CANNON.catalogueChainRatio, fx.chainRatio) : 1,
        knock: tower.kind === "trebuchet" ? CANNON.trebuchetKnock * fx.knock : 0,
        orange: tower.kind === "mortar" || tower.kind === "trebuchet" || quack || tower.orange,
        splash: tower.kind === "mortar" ? 46 + (hasMod(tower, "wide") ? 18 : 0) + (hasMod(tower, "mimicstep") ? CANNON.mimicSplash : 0) : tower.kind === "trebuchet" ? Math.round(CANNON.trebuchetSplash * fx.splash) : quack ? Math.round(CANNON.quackSplash * fx.splash) : 0,
        element,
        // Juicy, Splatter and Electric go off from Cannon-type towers only, and never the plain melon cannon.
        procs: TOWER_TYPE[tower.kind] === "cannon" && tower.kind !== "melon",
        inkTime: hasMod(tower, "indelible") ? CANNON.inkTime * 1.5 : CANNON.inkTime,
        inkMul: (hasMod(tower, "indelible") ? CANNON.inkBonus + 0.1 : CANNON.inkBonus) + (has("blot") ? CANNON.blotInkBonus : 0),
        wormDps: hasMod(tower, "venom") ? CANNON.wormDps * 1.5 : CANNON.wormDps,
        splashRatio: hasMod(tower, "heavy") || tower.kind === "trebuchet" ? 0.8 : quack ? CANNON.quackSplashRatio : 0.55,
        splashChill: quack ? CANNON.quackSlow : 0,
        cover: quack && fx.covering > 0 ? CANNON.quackCover : 0,
        lock,
        chill: hasMod(tower, "chill") && tower.kind !== "melon" ? 0.75 : 0,
        freezeExtra: (hasMod(tower, "hold") ? 0.55 : 0) + (hasMod(tower, "mimicstep") ? CANNON.mimicFreeze : 0),
        fireLife: (hasMod(tower, "lasting") ? 3.6 : 2.4) + (hasMod(tower, "mimicstep") ? CANNON.mimicBurn : 0),
        fireBurn: hasMod(tower, "hotter") ? 34 : 22,
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
      const step = SHOT_SPEED * dt;
      if (dist <= 12 || dist <= step) {
        shot.x = tx;
        shot.y = ty;
        if (target) {
          credit = shot.owner ?? null;
          const killsBefore = world.runLog.kills;
          const keep = onShotHit(shot, target);
          shot.kills = (shot.kills ?? 0) + world.runLog.kills - killsBefore;
          if (shot.owner != null && towerKinds.get(shot.owner) === "catalogue") world.runLog.chainBest = Math.max(world.runLog.chainBest, shot.kills);
          credit = null;
          if (!keep) shot.life = 0;
        } else shot.life = 0;
      } else {
        shot.x += (dx / dist) * step;
        shot.y += (dy / dist) * step;
      }
    }
    credit = null;
    world.shots = world.shots.filter((s) => s.life > 0);

    for (const f of world.flyers) moveFlyer(f, dt);
    credit = null;
    world.flyers = world.flyers.filter((f) => f.t < f.dur);

    world.enemies = world.enemies.filter((e) => e.hp > 0);
    {
      let slowed = 0;
      for (const e of world.enemies) if (e.chill > 0 || e.freeze > 0 || e.slow < 1) slowed += 1;
      if (slowed > world.runLog.maxSlowedAtOnce) world.runLog.maxSlowedAtOnce = slowed;
    }
    world.hud.left = world.enemies.length + Math.max(0, queue.length - queueCursor) + drops.length;

    if (world.hud.phase === "combat" && queueCursor >= queue.length && world.enemies.length === 0 && drops.length === 0 && world.cocoons.length === 0) {
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
    for (const st of world.stomps) st.life -= dt;
    world.stomps = world.stomps.filter((st) => st.life > 0);
    for (const st of world.stains) st.life -= dt;
    world.stains = world.stains.filter((st) => st.life > 0);
    for (const m of world.marks) m.life -= dt;
    world.marks = world.marks.filter((m) => m.life > 0);
    world.sparks = world.sparks.filter((s) => s.life > 0);
    for (const f of world.floaters) {
      f.life -= dt;
      f.y -= 18 * dt;
    }
    world.floaters = world.floaters.filter((f) => f.life > 0);
    for (const b of world.brawls) b.life -= dt;
    world.brawls = world.brawls.filter((b) => b.life > 0);
  };

  const api = {
    world,
    pointer(x: number, y: number, kind: "move" | "down") {
      const c = Math.floor(x / CELL);
      const r = Math.floor(y / CELL);
      if (!inMap(c, r)) {
        world.hover = null;
        world.crankHint = null;
        return;
      }
      world.hover = { c, r };
      // The Compact Stacks: on a crank in prep, show what turning it would do.
      const hoverCrank = (BOARDS[world.hud.map].bays ?? []).findIndex((b) => b.crank[0] === c && b.crank[1] === r);
      world.crankHint = hoverCrank >= 0 && world.hud.phase === "prep" ? { ...crankPreview(hoverCrank), bay: hoverCrank } : null;
      syncReach();
      const path = world.pathCells.has(`${c},${r}`);
      const verge = world.vergeCells.has(`${c},${r}`);
      const shelf = world.shelfCells.has(`${c},${r}`);
      const taken = occupied(c, r);
      world.hud.canPlace =
        world.hud.selected == null &&
        !path &&
        !verge &&
        !shelf &&
        !world.trackCells.has(`${c},${r}`) &&
        !taken &&
        !signatureBlocked(world.hud.build) &&
        !levelLocked(world.hud.build) &&
        !goalLocked(world.hud.build) &&
        !vaelLocked(world.hud.build) &&
        !heavyLocked(world.hud.build) &&
        !offCarpet(world.hud.build, c, r) &&
        world.hud.seeds >= world.hud.towerCost &&
        (world.hud.phase === "prep" || world.hud.phase === "combat");
      if (kind !== "down") return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      const sign = BOARDS[world.hud.map].signpost;
      if (sign && sign[0] === c && sign[1] === r && world.hud.selected == null) {
        turnSign();
        return;
      }
      if (taken) {
        const tower = towerAt(c, r);
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
      // With a tower selected, a click anywhere else just closes it. (It used to fall through and
      // build: a copy of the picked cannon if affordable, or nothing at all if not, which left the
      // old tower selected so the next click on it closed it instead of opening it.)
      if (world.hud.selected != null) {
        world.hud.selected = null;
        syncPrice();
        notify();
        return;
      }
      if (path) {
        world.hud.log = "That's the carpet: the fruit walk there. Build on the floor beside it.";
        notify();
        return;
      }
      if (verge) {
        world.hud.log = VERGE_NOTE;
        notify();
        return;
      }
      if (shelf) {
        world.hud.log = "That's a bookshelf. Build on the open floor.";
        notify();
        return;
      }
      // The Compact Stacks: a crank, or a tile a crank could put carpet on.
      const bayCrank = (BOARDS[world.hud.map].bays ?? []).findIndex((b) => b.crank[0] === c && b.crank[1] === r);
      if (bayCrank >= 0) {
        crank(bayCrank);
        return;
      }
      if (world.trackCells.has(`${c},${r}`)) {
        world.hud.log = "That's a shelf track: a crank could roll carpet over it. Build beside it.";
        notify();
        return;
      }
      const buildKind = world.hud.build;
      if (levelLocked(buildKind)) {
        const who = world.hud.hero ? KEEPER_NAMES[world.hud.hero].name : "Your keeper";
        world.hud.log = `The ${TOWERS[buildKind].name} opens when ${who} reaches level ${TRICK_LEVEL[buildKind]}.`;
        notify();
        return;
      }
      if (heavyLocked(buildKind)) {
        world.hud.log = `Heavy cannons open at wave ${HEAVY_WAVE}, or once you have ${HEAVY_SEEDS} seeds in hand.`;
        notify();
        return;
      }
      if (vaelLocked(buildKind)) {
        world.hud.log = vaelLockText(buildKind);
        notify();
        return;
      }
      if (goalLocked(buildKind)) {
        world.hud.log = `The ${TOWERS[buildKind].name} is locked. To open it: ${TOWER_GOALS[buildKind]?.goal}`;
        notify();
        return;
      }
      if (offCarpet(buildKind, c, r)) {
        world.hud.log =
          buildKind === "pamphlet"
            ? "The Post has to stand beside a straight."
            : `The ${TOWERS[buildKind].name} goes right beside the carpet.`;
        notify();
        return;
      }
      if (world.hud.seeds < world.hud.towerCost) {
        world.hud.log = `Not enough seeds: the ${TOWERS[buildKind].name} costs ${world.hud.towerCost}.`;
        notify();
        return;
      }
      if (signatureBlocked(buildKind)) {
        world.hud.log =
          buildKind === "geese" && world.hud.geeseSpent
            ? "The protocol is spent. Rebuild it after this wave."
            : buildKind === "copycat" && world.hud.copycatPlaced
            ? "The Copycat goes down once a wave. Place it again after this wave."
            : isSignature(buildKind)
              ? `Only one ${TOWERS[buildKind].name} at a time.`
              : world.hud.log;
        notify();
        return;
      }
      const p = cellCenter(c, r);
      const tower: Tower = {
        id: id(),
        c,
        r,
        x: p.x,
        y: p.y,
        cd: 0.15,
        aim: 0,
        orange: false,
        kind: buildKind,
        // Back-room upgrades belong to the kind, so a new tower arrives with them.
        mods: [...(world.hud.fitted[buildKind] ?? [])],
        paid: world.hud.towerCost,
        born: cleared,
        // The mode last set on this kind tonight, if any.
        target: lastMode[buildKind],
      };
      if (buildKind === "pamphlet") {
        tower.leg = bindLeg(legsNow(), c, r);
        tower.armed = true;
        tower.prevAlong = {};
      }
      world.towers.push(tower);
      towerKinds.set(tower.id, buildKind);
      world.runLog.built[buildKind] = (world.runLog.built[buildKind] ?? 0) + 1;
      world.runLog.peakTowers = Math.max(world.runLog.peakTowers, world.towers.length);
      if (buildKind === "copycat") world.hud.copycatPlaced = true;
      syncMimics();
      if (tower.kind === "orrery") tower.orbit = statsFor(tower).range;
      if (buildKind === "still") stillBuilt = true;
      cue("build", buildKind);
      world.hud.seeds -= world.hud.towerCost;
      if (world.hud.hero === "michael") {
        if (BIG_KINDS.includes(buildKind)) {
          // The Hoard paid first; the tower is worth its whole price when sold.
          const { fromHoard } = hoardSplit(priceNext());
          world.hud.hoard -= fromHoard;
          tower.paid += fromHoard;
          world.runLog.hoardSpent += fromHoard;
          if (fromHoard > 0) float(tower.x, tower.y - 30, `−${fromHoard} hoard`, "#8fc0ff");
        } else feedHoard(world.hud.towerCost);
        if (buildKind === "bombard") tower.grown = world.hud.armour === "wyrm" ? DRAGON.roostGrow[ARMOUR_VALUES.wyrmStage - 1] : 0;
      }
      if (!world.hud.builtKinds.includes(buildKind)) world.hud.builtKinds = [...world.hud.builtKinds, buildKind];
      // Stay in build mode with the same kind picked, so the next tap places another.
      // (Tap a built tower to open its stats.)
      world.hud.selected = null;
      world.hud.log = `${TOWERS[buildKind].name} set.`;
      // Vaelithra: a tower that tips her ladder says so after the usual line.
      syncVael();
      syncGuide();
      syncPrice();
      notify();
    },
    /** The last-wave card's "Get ready": back onto the board to build and upgrade; the start button begins the finale. */
    prepareFinale() {
      if (world.hud.phase !== "consequence" || world.hud.menu || world.hud.checkout) return;
      world.hud.phase = "prep";
      world.hud.log = `Last wave next: ${world.hud.waveName}. Build what you need, then start it when you're ready.`;
      notify();
    },
    startWave() {
      if (world.hud.menu || world.hud.checkout) return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "consequence") return;
      if (world.hud.menu) return;
      const hold = world.hud.phase === "prep" ? guideHold() : "";
      if (hold) {
        world.hud.log = hold;
        notify();
        return;
      }
      world.hud.paused = false;
      absorbed = 0;
      world.marks = [];
      // Lion Blades standing now will mend when this wave is cleared; ones built mid-wave won't.
      for (const blade of world.towers) if (blade.kind === "lionblade") blade.mendReady = true;
      // The same for the Dragon's Roost: one standing now grows when this wave is cleared.
      for (const roost of world.towers) if (roost.kind === "bombard") roost.roostReady = true;
      waveLost = false;
      lectureNow = lecture && lecture.waves > 0 ? lecture.kind : null;
      reached.clear();
      syncMimics(true);
      const spec = waveAt(cleared, world.hud.night);
      buildQueue();
      world.hud.waveSize = queue.length;
      world.hud.left = queue.length;
      world.hud.phase = "combat";
      // The Bell Tower's clock counts from the start of each wave.
      if (world.bell) world.bell = { next: FLOOR.bellEvery, quiet: 0 };
      bellRushed = false;
      world.vines = new Map();
      if (world.heights.size) {
        waterDeep = deepWave(cleared + 1, world.hud.night === "endless" ? null : nightLength(world.hud.night), world.hud.difficulty);
        waterStart = world.hud.plugged ? 1 : 0;
        world.hud.plugged = false;
        drainPlugged = false;
      }
      clearSiegeWave();
      world.hud.dropWave = dropsFor(cleared);
      cue(queue.some((q) => q.kind === "karl" || q.siege === "matriarch" || q.siege === "general") ? "boss" : "wave");
      world.hud.wave = cleared + 1;
      world.hud.waveName = spec.name;
      world.hud.blurb = spec.blurb;
      world.hud.log = `Wave ${cleared + 1}: ${spec.name}.`;
      if (world.hud.guide === "start") world.hud.guide = "speed";
      notify();
    },
    pickUpgrade(upgradeId: UpgradeId) {
      if (world.hud.phase !== "upgrade" || world.hud.checkout) return;
      if (!world.hud.offer.some((u) => u.id === upgradeId)) return;
      // The Doctor's pick is a real upgrade like any other; it is only counted (Close Reading, Annotated, achievements).
      const doctors = world.hud.pickCards.includes(upgradeId);
      world.hud.pickCards = [];
      world.runLog.picks += 1;
      if (doctors) {
        world.runLog.doctorTaken += 1;
        if (fx.annotated) world.hud.seeds += fx.annotated;
      }
      if (!has(upgradeId)) {
        world.hud.upgrades = [...world.hud.upgrades, upgradeId];
        world.hud.cardPicks = [...world.hud.cardPicks, { id: upgradeId, pick: doctors }];
      }
      // Cannon upgrades don't choose the keeper's path (see buildOffer).
      if (!world.hud.branch && !Object.values(CANNON_UPGRADES).includes(upgradeId)) world.hud.branch = upgradeId;
      if (upgradeId === "seeds") world.hud.seeds += 55;
      syncPrice();
      world.hud.offer = [];
      world.hud.phase = "prep";
      const next = waveAt(cleared, world.hud.night);
      world.hud.blurb = next.blurb;
      world.hud.waveName = next.name;
      world.hud.log = `${UPGRADES[upgradeId].name} locked in for this run.`;
      if (world.hud.guide === "upgrade" || world.hud.guide === "speed" || world.hud.guide === "combat") world.hud.guide = "backroom";
      notify();
    },
    otherStraight() {
      const tower = world.towers.find((t) => t.id === world.hud.selected);
      if (!tower || tower.kind !== "pamphlet" || world.hud.phase !== "prep") return;
      const options = legsTouching(legsNow(), tower.c, tower.r).map((o) => o.leg);
      if (options.length < 2) return;
      tower.leg = options[(options.indexOf(tower.leg ?? -1) + 1) % options.length];
      tower.armed = true;
      tower.prevAlong = {};
      cue("build");
      world.hud.log = "The Post watches the other straight now.";
      notify();
    },
    /** The selected tower's next (or previous) targeting mode, from the ones its kind offers. Free, any time. */
    cycleTarget(dir: 1 | -1 = 1) {
      const tower = world.towers.find((t) => t.id === world.hud.selected);
      if (!tower) return;
      // A Copycat aims as what it copies.
      const kind = tower.kind === "copycat" ? tower.copy?.kind : tower.kind;
      const allowed = kind ? DEFAULT_TARGET[kind] : null;
      if (!kind || !allowed) return;
      const now = tower.target && allowed.modes.includes(tower.target) ? tower.target : allowed.default;
      const next = allowed.modes[(allowed.modes.indexOf(now) + dir + allowed.modes.length) % allowed.modes.length];
      tower.target = next;
      if (tower.kind !== "copycat") lastMode[tower.kind] = next;
      cue("build");
      world.hud.log = `${TOWERS[tower.kind].name} aims: ${TARGET_LABEL[next]}${next === allowed.default ? " (recommended)" : ""}.`;
      notify();
    },
    setTarget(mode: TargetMode) {
      const tower = world.towers.find((t) => t.id === world.hud.selected);
      if (!tower) return;
      const kind = tower.kind === "copycat" ? tower.copy?.kind : tower.kind;
      const allowed = kind ? DEFAULT_TARGET[kind] : null;
      if (!allowed || !allowed.modes.includes(mode)) return;
      tower.target = mode;
      if (tower.kind !== "copycat") lastMode[tower.kind] = mode;
      cue("build");
      world.hud.log = `${TOWERS[tower.kind].name} aims: ${TARGET_LABEL[mode]}${mode === allowed.default ? " (recommended)" : ""}.`;
      notify();
    },
    /** The selected tower's targeting mode, the modes it can take and its recommended one (null: it doesn't aim). */
    targetOf(towerId: number) {
      const tower = world.towers.find((t) => t.id === towerId);
      const kind = tower ? (tower.kind === "copycat" ? tower.copy?.kind : tower.kind) : undefined;
      const allowed = kind ? DEFAULT_TARGET[kind] : null;
      if (!tower || !allowed) return null;
      const mode = tower.target && allowed.modes.includes(tower.target) ? tower.target : allowed.default;
      return { mode, modes: allowed.modes, recommended: allowed.default };
    },
    setTrigger(mode: "auto" | "manual") {
      const tower = world.towers.find((t) => t.id === world.hud.selected);
      if (!tower || tower.kind !== "geese" || (mode !== "auto" && mode !== "manual")) return;
      tower.trigger = mode;
      cue("build");
      world.hud.log = mode === "auto" ? "Anti-Geese Protocol: on Auto. It goes off when they crowd in or near the door." : "Anti-Geese Protocol: on Manual. Press Engage.";
      notify();
    },
    engage() {
      const tower = world.towers.find((t) => t.id === world.hud.selected);
      if (!tower || tower.kind !== "geese" || world.hud.phase !== "combat") return;
      const range = statsFor(tower).range;
      const inRange = world.enemies.filter((e) => e.hp > 0 && (e.x - tower.x) ** 2 + (e.y - tower.y) ** 2 <= range * range);
      if ((tower.geeseReady ?? 0) > world.anim) {
        world.hud.log = `Still recharging: ${Math.ceil((tower.geeseReady ?? 0) - world.anim)} s.`;
        notify();
        return;
      }
      if (!inRange.length) {
        world.hud.log = "Nothing in the ring yet. Wait for them.";
        notify();
        return;
      }
      fireGeese(tower, inRange);
      credit = null;
      notify();
    },
    sellSelected() {
      const sel = world.hud.selected;
      if (sel == null) return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      const tower = world.towers.find((t) => t.id === sel);
      if (!tower) return;
      world.runLog.sold += 1;
      world.towers = world.towers.filter((t) => t.id !== sel);
      syncVael();
      syncMimics();
      const refund = slip("norefund") ? 0 : refundFor(tower.kind, tower.paid);
      const bank = tower.bank ?? 0;
      cue("sell");
      world.hud.seeds += refund + bank;
      world.hud.selected = null;
      world.hud.log = bank
        ? `Desk sold for ${refund}, and the bank paid out ${bank}.`
        : tower.mods.length
          ? `Cannon sold for ${refund}. Its kind keeps its upgrades.`
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
      if (world.hud.lockedKeepers.includes(hero)) return;
      const overflow = world.hud.night === "overflow";
      if (!overflow) world.hud.slips = [];
      world.towers = [];
      world.enemies = [];
      world.hud.hero = hero;
      world.hud.armour = null;
      world.hud.hoard = 0;
      world.hud.zone = 0;
      world.hud.roostFed = false;
      world.hud.phase = "poster";
      world.hud.tutorial = false;
      fx = perkFx(hero, world.hud.keepers[hero]);
      world.hud.quackAura = CANNON.quackAura * fx.auraReach;
      world.hud.tagTeam = Boolean(fx.perimeter);
      world.hud.runLevel = levelFor(world.hud.keepers[hero].xp);
      world.hud.xpStart = world.hud.keepers[hero].xp;
      world.hud.xpRun = 0;
      stillBuilt = false;
      world.hud.wave = 1;
      world.hud.chuteWave = usesChute(0);
      world.hud.dropWave = dropsFor(0);
      world.hud.feuds = 0;
      world.hud.comboTips = [];
      world.hud.dropSeen = false;
      clearSiegeWave();
      const opening = waveAt(0, world.hud.night);
      world.hud.waveName = opening.name;
      world.hud.blurb = opening.blurb;
      resetRunLog();
      world.hud.upgrades = [];
      world.hud.cardPicks = [];
      world.hud.checkout = false;
      world.hud.offer = [];
      world.hud.branch = null;
      world.hud.absurdity = 0;
      world.hud.selected = null;
      absurdDrops = 0;
      materialNoted = false;
      shortcutNoted = false;
      windUsed = false;
      goldenUsed = false;
      world.hud.golden = 0;
      if (hero === "mynxi") {
        world.hud.seeds = 150;
        world.hud.lives = 12;
        world.hud.maxLives = 12;
      } else if (hero === "vael") {
        world.hud.seeds = 120;
        world.hud.lives = 11;
        world.hud.maxLives = 11;
      } else if (KEEPER_START[hero]) {
        const start = KEEPER_START[hero]!;
        world.hud.seeds = start.seeds;
        world.hud.lives = start.lives;
        world.hud.maxLives = start.lives;
      } else {
        world.hud.seeds = BALANCE.michaelSeeds;
        world.hud.lives = BALANCE.michaelLives;
        world.hud.maxLives = BALANCE.michaelLives;
        // No free cannon: he puts on an armour on the intro instead (pickArmour).
      }
      // The keeper's own first line, in their voice (keeperVoice.ts).
      world.hud.log = openingLine(hero, world.hud.night);
      if (overflow) {
        // Night two starts with a little extra. Added after the keeper's opening line, not over it.
        world.hud.seeds += BALANCE.overflowSeeds;
        world.hud.log = `${world.hud.log} The crates by the chute were never eaten: +${BALANCE.overflowSeeds} seeds.`.trim();
      }
      if (world.hud.night === "siege") {
        // Night three starts with a little extra too, after the keeper's opening line.
        world.hud.seeds += BALANCE.siegeSeeds;
        world.hud.log = `${world.hud.log} The stores by the back door: +${BALANCE.siegeSeeds} seeds.`.trim();
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
          ...(overflow && world.hud.slips.length ? { slips: world.hud.slips } : {}),
        });
      }
      if (bm("seedfund")) world.hud.seeds += BOOKMARK_VALUES.seedfund;
      if (bm("sparestack")) {
        world.hud.lives += BOOKMARK_VALUES.sparestack;
        world.hud.maxLives += BOOKMARK_VALUES.sparestack;
      }
      world.hud.seeds += fx.seeds;
      world.hud.lives += fx.lives;
      world.hud.maxLives += fx.lives;
      if (slip("short")) {
        world.hud.lives = Math.max(1, world.hud.lives - SLIP_VALUES.shortStacks);
        world.hud.maxLives = Math.max(1, world.hud.maxLives - SLIP_VALUES.shortStacks);
      }
      syncSisu();
      syncPrice();
      notify();
    },
    chooseMap(map: MapId) {
      if (world.hud.phase !== "select" || world.hud.night === "overflow" || world.hud.night === "siege") return;
      // Test rooms open only in developer mode (and for the simulator, which plays with everything open).
      const testRoom = TEST_MAPS.includes(map) && (world.hud.dev || options.allTricks === true);
      // A room's layout B is open whenever the room is.
      if (map === "overflow" || map === "courtyard" || (!world.hud.maps.includes(baseMap(map)) && !testRoom)) return;
      applyBoard(map);
      world.hud.log = BOARDS[map].blurb;
      notify();
    },
    chooseBuild(kind: TowerKind) {
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      if (isSignature(kind) && !own(kind)) return;
      if (roomLocked(kind)) return;
      world.hud.build = kind;
      world.hud.log = vaelLocked(kind) ? vaelLockText(kind) : TOWERS[kind].blurb;
      syncPrice();
      notify();
    },
    openShop(kind?: TowerKind) {
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      const picked = world.towers.find((t) => t.id === world.hud.selected);
      const shown =
        kind ??
        (picked && fittingsFor(picked.kind).length ? picked.kind : null) ??
        world.towers.find((t) => fittingsFor(t.kind).length)?.kind ??
        (fittingsFor(world.hud.build).length ? world.hud.build : "melon");
      world.hud.workshop = shown;
      notify();
    },
    shopKind(kind: TowerKind) {
      if (world.hud.workshop == null) return;
      world.hud.workshop = kind;
      world.hud.shopRings = [];
      notify();
    },
    shopPriceFor(kind: TowerKind) {
      return roomPrice(kind);
    },
    pickMod(modId: ModId) {
      const kind = world.hud.workshop;
      if (kind == null) return;
      const mod = fittingsFor(kind).find((m) => m.id === modId);
      const owned = world.hud.fitted[kind] ?? [];
      if (!mod || owned.includes(modId)) return;
      if (world.hud.phase !== "prep") {
        world.hud.log = "The back room only sells between waves.";
        notify();
        return;
      }
      const price = roomPrice(kind);
      if (world.hud.seeds < price) {
        world.hud.log = `Not enough seeds: ${mod.name} costs ${price}.`;
        notify();
        return;
      }
      world.hud.seeds -= price;
      feedHoard(price);
      world.hud.shopVisits += 1;
      world.hud.fitted = { ...world.hud.fitted, [kind]: [...owned, modId] };
      // Every tower of this kind gets it, and so does a Copycat copying one.
      const mine = world.towers.filter((t) => t.kind === kind);
      for (const t of mine) t.mods = [...(world.hud.fitted[kind] ?? [])];
      syncMimics(true);
      const name = TOWERS[kind].name;
      world.hud.log = mine.length
        ? `${mod.name}: every ${name} has it now${mine.length > 1 ? ` (all ${mine.length})` : ""}, and any you build tonight.`
        : `${mod.name}: every ${name} you build tonight will have it.`;
      record((m) => (m.fittings += 1));
      world.runLog.backRoomBuys += 1;
      syncVael();
      if (world.hud.guide === "backroom") finishGuide();
      syncPrice();
      const picked = world.towers.find((t) => t.id === world.hud.selected);
      if (picked) world.hud.range = towerRange(picked);
      notify();
    },
    closeShop() {
      if (world.hud.workshop == null) return;
      world.hud.workshop = null;
      world.hud.shopRings = [];
      if (world.hud.guide === "backroom") finishGuide();
      notify();
    },
    setSpeed(speed: number) {
      if (!SPEEDS.includes(speed)) return;
      world.hud.speed = speed;
      if (persistMeta) writePref(SPEED_KEY, String(speed));
      guideSpeed();
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
      guideSpeed();
      notify();
    },
    togglePause() {
      if (world.hud.menu || world.hud.checkout) return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      world.hud.paused = !world.hud.paused;
      guideSpeed();
      notify();
    },
    setDifficulty(id: Difficulty) {
      if (world.hud.phase !== "select") return;
      if (!DIFFICULTIES.some((d) => d.id === id)) return;
      world.hud.difficulty = id;
      notify();
    },
    chooseNight(night: NightId) {
      if (world.hud.phase !== "select" || !NIGHTS.includes(night)) return;
      if (night === "siege" && !world.hud.siegeOpen) {
        world.hud.log = "Win the Overflow first.";
        notify();
        return;
      }
      world.hud.night = night;
      world.hud.waveCount = nightLength(night);
      if (night === "overflow") {
        applyBoard("overflow");
        world.hud.log = "The returns come up the chute. Take late slips for more XP, or none.";
      } else if (night === "siege") {
        applyBoard("courtyard");
        world.hud.log = "The courtyard. No fruit tonight: geese, then cats, then both.";
      } else {
        if (world.hud.map === "overflow" || world.hud.map === "courtyard") applyBoard("stacks");
        world.hud.log =
          night === "endless"
            ? `No last wave. Best so far: ${world.hud.endlessBest} waves.`
            : "Choose who holds the stacks.";
      }
      notify();
    },
    devSeeds() {
      if (!dev || (world.hud.phase !== "prep" && world.hud.phase !== "combat")) return;
      world.hud.seeds += DEV_SEEDS;
      world.hud.log = `Developer mode: +${DEV_SEEDS} seeds.`;
      syncPrice();
      notify();
    },
    toggleSlip(id: SlipId) {
      if (world.hud.phase !== "select" || world.hud.night !== "overflow") return;
      const on = world.hud.slips.includes(id);
      const next = on ? world.hud.slips.filter((x) => x !== id) : cleanSlips([...world.hud.slips, id]);
      if (!on && next.length === world.hud.slips.length) {
        world.hud.log = "Three slips is the most the desk will stamp.";
        notify();
        return;
      }
      world.hud.slips = next;
      const bonus = Math.round(slipXp(next) * 100);
      world.hud.log = next.length ? `${next.length} late slip${next.length > 1 ? "s" : ""}: +${bonus}% keeper XP tonight.` : "No late slips. The usual XP.";
      notify();
    },
    openSetup() {
      if (world.hud.phase !== "coldopen" || !world.hud.guideDone) return;
      world.hud.phase = "select";
      world.hud.setupPage = "who";
      world.hud.log = "Choose who holds the stacks.";
      notify();
    },
    beginNight() {
      if (world.hud.phase !== "poster") return;
      // Sir Michael does not start until he has put on his armour.
      if (world.hud.hero === "michael" && world.hud.armour == null) return;
      world.hud.phase = "prep";
      notify();
    },
    pickArmour(armour: ArmourId) {
      wearArmour(armour, false);
    },
    turnSign() {
      turnSign();
    },
    crank(bay: number) {
      crank(bay);
    },
    crankPreview(bay: number) {
      return crankPreview(bay);
    },
    pickOath(oath: OathId | ArmourId) {
      // Scripts from the oath days (the simulator, old tests) skip the level check: no player reaches this.
      const armour = (ARMOURS as string[]).includes(oath) ? (oath as ArmourId) : ARMOUR_FOR_OATH[oath as OathId];
      if (armour) wearArmour(armour, true);
    },
    armourOpen(armour: ArmourId) {
      return options.allTricks === true || world.hud.dev || world.hud.runLevel >= ARMOUR_LEVEL[armour];
    },
    greatOffer(towerId: number) {
      const no = (why: string) => ({ cost: 0 as const, partner: null, why });
      const t = world.towers.find((x) => x.id === towerId);
      if (!t || world.hud.hero !== "michael") return no("");
      if (t.great) return no("Already Great.");
      if (!canBeGreat(t.kind)) return no("Only shared towers that shoot can be made Great.");
      const partner = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]
        .map(([a, b]) => world.towers.find((o) => o !== t && o.kind === t.kind && !o.great && o.c === t.c + a && o.r === t.r + b))
        .find(Boolean);
      if (!partner) return no(`Build another ${TOWERS[t.kind].name} right beside it to merge them.`);
      const cost = Math.round(TOWERS[t.kind].cost * DRAGON.greatCost * (world.hud.armour === "ember" ? ARMOUR_VALUES.emberMerge : 1));
      return { cost, partner: partner.id, why: "" };
    },
    makeGreat() {
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      const t = world.towers.find((x) => x.id === world.hud.selected);
      if (!t) return;
      const offer = api.greatOffer(t.id);
      if (offer.partner == null) {
        if (offer.why) world.hud.log = offer.why;
        notify();
        return;
      }
      const { fromHoard, fromSeeds } = hoardSplit(offer.cost);
      if (world.hud.seeds < fromSeeds) {
        world.hud.log = `Not enough: a Great ${TOWERS[t.kind].name} costs ${offer.cost} (${fromHoard} from the Hoard, ${fromSeeds} seeds).`;
        notify();
        return;
      }
      const p = world.towers.find((x) => x.id === offer.partner)!;
      world.hud.hoard -= fromHoard;
      world.hud.seeds -= fromSeeds;
      world.runLog.hoardSpent += fromHoard;
      world.runLog.greats += 1;
      world.towers = world.towers.filter((x) => x !== p);
      t.great = { c: p.c, r: p.r };
      t.x = (t.x + p.x) / 2;
      t.y = (t.y + p.y) / 2;
      t.paid += p.paid + offer.cost;
      if (t.kind === "orrery") t.orbit = statsFor(t).range;
      syncMimics(true);
      cue("build", t.kind);
      world.shake = Math.max(world.shake, world.reduced ? 0 : 3);
      world.rings.push({ x: t.x, y: t.y, r: 46, life: 0.7, max: 0.7, color: "111,168,239" });
      float(t.x, t.y - 34, "Great!", "#8fc0ff");
      world.hud.log = `Great ${TOWERS[t.kind].name}: two became one, twice the size.${fromHoard ? ` The Hoard paid ${fromHoard}.` : ""}`;
      world.hud.range = towerRange(t);
      syncPrice();
      notify();
    },
    feedRoost() {
      if (world.hud.hero !== "michael") return;
      const roost =
        world.towers.find((x) => x.id === world.hud.selected && x.kind === "bombard") ?? world.towers.find((x) => x.kind === "bombard");
      if (!roost) return;
      if (world.hud.phase !== "prep") {
        world.hud.log = "The dragon only eats between waves.";
        notify();
        return;
      }
      if (world.hud.roostFed) {
        world.hud.log = "It's had its dinner. Again after the next wave.";
        notify();
        return;
      }
      if (roostStage(roost) >= 3) {
        world.hud.log = "The Great Dragon is fully grown.";
        notify();
        return;
      }
      const { fromHoard, fromSeeds } = hoardSplit(DRAGON.roostFeed);
      if (world.hud.seeds < fromSeeds) {
        world.hud.log = `Not enough: feeding the dragon costs ${DRAGON.roostFeed} (${fromHoard} from the Hoard, ${fromSeeds} seeds).`;
        notify();
        return;
      }
      world.hud.hoard -= fromHoard;
      world.hud.seeds -= fromSeeds;
      world.runLog.hoardSpent += fromHoard;
      roost.paid += DRAGON.roostFeed;
      world.hud.roostFed = true;
      const was = roostStage(roost);
      roost.grown = roostStageGrowth(roost) + 1;
      const now = roostStage(roost);
      world.runLog.roostPeak = Math.max(world.runLog.roostPeak, now);
      float(roost.x, roost.y - 30, now > was ? `${ROOST_STAGES[now]}!` : "fed", "#8fc0ff");
      world.hud.log = now > was ? `Fed and grown: the Roost holds a ${ROOST_STAGES[now]} now.` : "The dragon eats. It'll grow sooner.";
      syncPrice();
      notify();
    },
    roostOf(towerId: number) {
      const t = world.towers.find((x) => x.id === towerId && x.kind === "bombard");
      if (!t) return null;
      const grown = roostStageGrowth(t);
      const stage = roostStageFor(grown);
      return { stage, grown, next: stage < 3 ? DRAGON.roostGrow[stage] : null };
    },
    setupPage(page: "who" | "night") {
      if (world.hud.phase !== "select") return;
      if (page === "night" && !world.hud.hero) return;
      world.hud.setupPage = page;
      notify();
    },
    pickKeeper(hero: HeroId) {
      if (world.hud.phase !== "select" || !HEROES.includes(hero)) return;
      if (world.hud.lockedKeepers.includes(hero)) {
        world.hud.log = `${KEEPER_NAMES[hero].name} is locked. ${restoreText("keeper", hero)}`;
        notify();
        return;
      }
      world.hud.hero = hero;
      notify();
    },
    continueRun() {
      if (world.hud.phase !== "coldopen") return;
      if (!world.hud.guideDone) return startGuide();
      api.chooseHero(world.hud.hero ?? DEFAULT_SETUP.hero);
    },
    skipGuide() {
      world.hud.guide = null;
      world.hud.tutorial = false;
      if (!world.hud.guideDone) {
        world.hud.guideDone = true;
        if (persistMeta) writeGuideDone();
      }
      notify();
    },
    guideNext() {
      const g = world.hud.guide;
      if (!g || !GUIDE_TALK.includes(g)) return;
      if (g === "sell") world.hud.guide = null;
      else if (g === "speed") world.hud.guide = "combat";
      else guideTo(guideAfter(g));
      notify();
    },
    startTutorial() {
      if (world.hud.phase !== "coldopen") return;
      startGuide();
    },
    backToTitle() {
      if (world.hud.phase !== "select") return;
      resetRunState();
      world.hud.phase = "coldopen";
      notify();
    },
    backToSetup() {
      if (world.hud.phase !== "poster") return;
      // Setup stays locked until the guided first night is done: back goes to the title instead.
      if (world.hud.guide != null && !world.hud.guideDone) return api.toTitle();
      resetRunState();
      world.hud.phase = "select";
      world.hud.setupPage = world.hud.hero ? "night" : "who";
      world.hud.log = "Choose who holds the stacks.";
      notify();
    },
    restartNight() {
      if (world.hud.phase === "coldopen" || world.hud.phase === "select") return;
      const hero = world.hud.hero ?? DEFAULT_SETUP.hero;
      const guided = world.hud.guide != null;
      const tutorial = world.hud.tutorial;
      resetRunState();
      world.hud.phase = "select";
      world.hud.setupPage = world.hud.hero ? "night" : "who";
      api.chooseHero(hero);
      // Restarting the tutorial skips the welcome talk and goes straight to building.
      if (tutorial) tutorialStart();
      if (guided) guideTo("damage");
    },
    toTitle() {
      world.hud.guide = null;
      world.hud.tutorial = false;
      resetRunState();
      world.hud.phase = "coldopen";
      world.hud.log = "The library is closed.";
      notify();
    },
    continueOverflow() {
      if (world.hud.phase !== "victory" || world.hud.night !== "midnight") return;
      const hero = world.hud.hero ?? DEFAULT_SETUP.hero;
      world.hud.night = "overflow";
      applyBoard("overflow");
      resetRunState();
      world.hud.phase = "select";
      world.hud.setupPage = world.hud.hero ? "night" : "who";
      world.hud.hero = hero;
      world.hud.log = "The returns come up the chute. Take late slips for more XP, or none.";
      notify();
    },
    continueSiege() {
      if (world.hud.phase !== "victory" || world.hud.night !== "overflow") return;
      const hero = world.hud.hero ?? DEFAULT_SETUP.hero;
      world.hud.night = "siege";
      applyBoard("courtyard");
      resetRunState();
      world.hud.phase = "select";
      world.hud.setupPage = world.hud.hero ? "night" : "who";
      world.hud.hero = hero;
      world.hud.log = "The courtyard. No fruit tonight: geese, then cats, then both.";
      notify();
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
      // One at a time: the menu takes over from the checkout card.
      if (world.hud.checkout) {
        world.hud.checkout = false;
        world.hud.paused = pausedBeforeCheckout;
      }
      world.hud.menu = "pause";
      world.hud.paused = true;
      notify();
    },
    openCheckout() {
      const p = world.hud.phase;
      if (p !== "prep" && p !== "combat" && p !== "upgrade" && p !== "consequence") return;
      if (world.hud.menu || world.hud.checkout) return;
      pausedBeforeCheckout = world.hud.paused;
      world.hud.checkout = true;
      world.hud.paused = true;
      world.hud.workshop = null;
      world.hud.selected = null;
      syncPrice();
      notify();
    },
    restoreRoom(id: RoomId) {
      const room = ROOM[id];
      if (world.hud.phase !== "coldopen" && world.hud.phase !== "select") return false;
      if (!room || shelfSave.rooms.includes(id) || shelfSave.fragments < room.cost) return false;
      shelfSave = { ...shelfSave, fragments: shelfSave.fragments - room.cost, rooms: [...shelfSave.rooms, id] };
      // Restorer and Archivist (and Fragment Collector, if a shelf pays) are earned here.
      const settled = settle(shelfSave, quietContext(shelfSave, meta.endlessBest));
      shelfSave = settled.save;
      applyRooms();
      if (persistStats) saveAchievements(shelfSave);
      cue("clear");
      notify();
      return true;
    },
    setCosmetics(c: Partial<Cosmetics>) {
      shelfSave = { ...shelfSave, cosmetics: allowedCosmetics({ ...world.hud.cosmetics, ...c }, shelfSave.rooms) };
      applyRooms();
      if (persistStats) saveAchievements(shelfSave);
      notify();
    },
    dismissCatalogueNote() {
      world.hud.catalogueNote = "";
      notify();
    },
    closeCheckout() {
      if (!world.hud.checkout) return;
      world.hud.checkout = false;
      world.hud.paused = pausedBeforeCheckout;
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
      if (!world.hud.guideDone) return api.toTitle();
      resetRunState();
      world.hud.phase = "select";
      world.hud.setupPage = world.hud.hero ? "night" : "who";
      world.hud.log = "Choose who holds the stacks.";
      notify();
    },
    unlock() {
      /* gesture hook reserved for audio in the component */
    },
    tallyOf(towerId: number) {
      if (!world.towers.some((t) => t.id === towerId)) return null;
      const mine = tally.get(towerId) ?? { dmg: 0, pops: 0 };
      let all = 0;
      for (const t of tally.values()) all += t.dmg;
      return { dmg: mine.dmg, pops: mine.pops, share: all > 0 ? mine.dmg / all : 0, vs: { ...(mine.vs ?? {}) } };
    },
    reachOf(towerId: number) {
      const tower = world.towers.find((t) => t.id === towerId);
      if (!tower) return null;
      const kind = tower.kind === "copycat" && tower.copy ? tower.copy.kind : tower.kind;
      const range = towerRange(tower.kind === "copycat" && tower.copy ? tower.copy : tower);
      const shape = reachShape(kind, range);
      const near = (r: number) =>
        world.towers.filter((t) => t !== tower && !PASSIVE.includes(t.kind) && (t.x - tower.x) ** 2 + (t.y - tower.y) ** 2 <= r * r).length;
      if (shape.mode === "none") return { tiles: null, towers: 0 };
      if (shape.mode === "towers") return { tiles: null, towers: near(range) };
      if (shape.mode === "gate") {
        const seg = world.segments[nearestSegment(world.segments, tower.x, tower.y).seg] ?? world.points;
        return { tiles: Math.round((gateStrip(seg, tower.x, tower.y, world.hud.map === "overflow").length / CELL) * 2) / 2, towers: 0 };
      }
      if (range >= GLOBAL_RANGE) return { tiles: "all" as const, towers: 0 };
      const { length } = carpetInReachAll(world.segments, tower.x, tower.y, shape.outer, shape.inner);
      return { tiles: Math.round((length / CELL) * 2) / 2, towers: shape.aura ? near(world.hud.quackAura) : 0 };
    },
    previewStats(kind: TowerKind, at?: { c: number; r: number }, extra?: ModId[]) {
      return previewStats(kind, at, extra);
    },
    shopHover(modId: ModId | null) {
      const kind = world.hud.workshop;
      if (!kind || !modId || (world.hud.fitted[kind] ?? []).includes(modId)) {
        world.hud.shopRings = [];
        return;
      }
      // Each tower of the kind (a Copycat copying one too): its reach now, and with the upgrade.
      const rings: World["hud"]["shopRings"] = [];
      for (const t of world.towers) {
        const own = t.kind === "copycat" && t.copy ? t.copy : t;
        if (own.kind !== kind) continue;
        const now = statsFor(own).range;
        const next = statsFor({ ...own, mods: [...new Set([...own.mods, modId])] }).range;
        rings.push({ x: t.x, y: t.y, now, next });
      }
      world.hud.shopRings = rings;
    },
    wavePreview(index: number) {
      return wavePreview(index);
    },
    comingUp() {
      return comingUp();
    },
    dropCovered(index: number) {
      const spot = dropSpot(index);
      return world.towers.some((t) => !PASSIVE.includes(t.kind) && Math.hypot(t.x - spot.x, t.y - spot.y) <= towerRange(t));
    },
    statsOf(towerId: number) {
      const tower = world.towers.find((t) => t.id === towerId);
      if (tower?.kind === "copycat") return tower.copy ? statsFor(tower.copy) : statsFor(tower);
      return tower ? statsFor(tower) : null;
    },
    setBookmark(id: BookmarkId | null) {
      if (world.hud.phase !== "select" && world.hud.phase !== "coldopen") return;
      if (id && !world.hud.unlocked.includes(id)) return;
      world.hud.bookmark = id;
      if (persistMeta) savePick(id);
      notify();
    },
    setPerk(tier: number, pick: 0 | 1) {
      if (world.hud.phase !== "select" && world.hud.phase !== "coldopen") return;
      const hero = world.hud.hero;
      if (!hero || tier < 0 || tier >= PERK_LEVELS.length || (pick !== 0 && pick !== 1)) return;
      const rec = world.hud.keepers[hero];
      if (levelFor(rec.xp) < PERK_LEVELS[tier]) return;
      if (pick >= PERKS[hero][tier].length) return;
      const picks = rec.picks.slice();
      picks[tier] = pick;
      world.hud.keepers = { ...world.hud.keepers, [hero]: normalizeRecord({ ...rec, picks }) };
      if (persistKeepers) saveProgress(world.hud.keepers);
      notify();
    },
  };

  /** Sir Michael puts on an armour on the intro and the night starts (`force`: skip the level check). */
  const wearArmour = (armour: ArmourId, force: boolean) => {
    if (world.hud.phase !== "poster" || world.hud.hero !== "michael" || !ARMOURS.includes(armour)) return;
    if (!force && !api.armourOpen(armour)) {
      world.hud.log = `The ${ARMOUR_TEXT[armour].name} opens when Sir Michael reaches level ${ARMOUR_LEVEL[armour]}.`;
      notify();
      return;
    }
    world.hud.armour = armour;
    world.runLog.armour = armour;
    world.hud.log = ARMOUR_TEXT[armour].log;
    if (armour === "azure") {
      world.hud.lives += ARMOUR_VALUES.azureLives;
      world.hud.maxLives += ARMOUR_VALUES.azureLives;
      world.hud.seeds = Math.max(0, world.hud.seeds - ARMOUR_VALUES.azureSeeds);
    }
    if (armour === "dragonscale") {
      world.hud.hoard = ARMOUR_VALUES.scaleHoard;
      world.hud.lives = Math.max(1, world.hud.lives - ARMOUR_VALUES.scaleLives);
      world.hud.maxLives = Math.max(1, world.hud.maxLives - ARMOUR_VALUES.scaleLives);
    }
    syncPrice();
    api.beginNight();
  };
  const loopTick = (dt: number) => {
    if (world.lightsOut) world.lightsOut = Math.max(0, world.lightsOut - dt);
    if (world.hud.hero === "vael" && (world.hud.phase === "prep" || world.hud.phase === "combat")) syncVael();
    if (!world.hud.heavyOpen && (world.hud.phase === "prep" || world.hud.phase === "combat")) {
      syncHeavy();
      if (world.hud.heavyOpen) notify();
    }
    tickFx(dt);
    if (world.crankAnim) {
      world.crankAnim.left -= dt;
      if (world.crankAnim.left <= 0) world.crankAnim = null;
    }
    if (world.hud.phase === "prep" || world.hud.phase === "combat") syncReach();
    if (world.hud.phase === "combat") tickCombat(dt);
  };

  (world as World & { step?: (dt: number) => void }).step = loopTick;

  return api;
}


/**
 * The board's straights, each once: every door's own carpet (open or not, so the numbering never shifts), then
 * the trunk; a one-door board's are its carpet's. A Post binds one of these by its number.
 */
export function boardLegs(world: Pick<World, "doors" | "segments" | "points"> & Partial<Pick<World, "trunk" | "exits">>) {
  if (!world.doors.length) return carpetLegs(world.points);
  const trunk = world.trunk ?? world.segments[world.segments.length - 1];
  return [...world.doors.map((d) => d.seg), trunk, ...(world.exits ?? []).map((x) => x.seg)].flatMap((s) => carpetLegs(s));
}

export function stepWorld(world: World, dt: number) {

  const fn = (world as World & { step?: (dt: number) => void }).step;
  fn?.(dt);
}
