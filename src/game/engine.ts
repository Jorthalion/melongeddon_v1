import {
  CELL, BOARDS, boardSize, CANNON_UPGRADES, DIFFICULTIES, STATS, TOWERS, UPGRADES, WAVES, WAVE_COUNT, nightLength, carpetInReach, reachShape,
  BALANCE, softenSlow, stacksWord, buildBoard, buildCost, killReward, hpScaleFor, buildOffer, CANNON, GLOBAL_RANGE, PASSIVE, HEAVY_WAVE, HEAVY_SEEDS, nextBeat, fittingsFor, refundFor, shopPrice, towerReadout, waveAt,
  type Difficulty, type EnemyKind, type Guard, type HeroId, type MapId,
  type ModId, type NightId, type Phase, type SpawnSpec, type TowerKind, type UpgradeDef, type UpgradeId,
  HEROES, KEEPER_NAMES, KEEPER_START, SIGNATURE, KEEPER_TOWERS, isSignature, TOWER_TYPE, groupOf, TRICK_LEVEL, shelfCells,
  OATHS, OATH_TEXT, OATH_VALUES, OATH_ZONE, ASSER_VALUES, carpetAlong, inOathZone, oathStretch, type OathId,
  nearestOnCarpet, gateStrip,
  carpetLegs, legOf, legsTouching, bindLeg, besideCarpet, VERGE_NOTE, DEFAULT_TARGET, TARGET_LABEL, type TargetMode, COPY_STEP_KINDS, COPY_HEAVY_KINDS, canCopy,
  FLOOR, floorTiles, floorPace, type FloorTile, COMBO, AFFLICT, fittingName, ballistaPierce,
  NATIVES, NATIVE_INFO, waveQueue, trimSpawns, assignNatives, type NativeId, type QueueItem,
  SIEGE, type SiegeVariant,
} from "./rules.ts";
import { GUIDE_KEY } from "../lib/saves.ts";
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
  /** Foot of the Law: seconds left pinned under the foot. Unlike freeze, husks feel it. */
  stomped?: number;
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
  /** Reverse Driver: seconds left walking back the way it came, and the world time it can be driven again. */
  driven?: number;
  driveReady?: number;
  pit?: boolean;
  gall?: boolean;
  mends?: number;
  borrower?: boolean;
  /** A room's own fruit (the Sorting Room, the Greenhouse, the Bell Tower). See NATIVES. */
  native?: NativeId;
  /** Parcel: still in its paper (direct hits do half). */
  wrapped?: boolean;
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
  stunBy?: "bell" | "organ";
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
  bookworm: (e) => (e.kind === "pumpkin" || e.kind === "karl" || (COMBO.on && (e.sting ?? 0) >= AFFLICT.wormStings)) && (e.worm ?? 0) < 1,
  peeler: (e) => armoured(e),
  honey: (e) => (e.honeyed ?? 0) <= 0,
  cauldron: (e, pools) => !standingIn(e, pools, (p) => Boolean(p.toxic)),
  // The Cold rind fitting: one not chilled yet.
  melon: (e, _p, t) => !t.mods.includes("chill") || e.chill <= 0,
  spitter: (e, _p, t) => !t.mods.includes("chill") || e.chill <= 0,
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
      return (!test || test(e, pools, tower) ? 1e9 : 0) + prog;
    }
  }
}

/** Towers that work on an area rather than aiming a shot: they can see a Box Cat (and their puddles, chords and stamps knock the box off). */
// The Cauldron and the Quack-Liber lob area shots (a puddle, a rocket's burst), so they see one too.
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
  /** Seconds until this cannon's shots can leave another pulp puddle. */
  pulpCd?: number;
  /** Waves cleared when it was built (the History Lectern grows with each wave since). */
  born?: number;
  /** Orrery: the planets' current angle and orbit radius. */
  spin?: number;
  orbit?: number;
  /** Orrery: per planet and fruit, the time it may hit again. */
  orbitHits?: Map<string, number>;
  /** What it aims at among the fruit in reach (unset = its kind's recommended mode, DEFAULT_TARGET). */
  target?: TargetMode;
  /** The fruit it aimed at last tick (drawn with a ring while the tower is selected). */
  aimAt?: number;
  /** Quack-Liber: rockets fired (Lane Lockdown counts them), and seconds left of Quiet Confidence. */
  volley?: number;
  rally?: number;
  /** Gourd Gate: the carpet point its portcullis drops on (with how far along the carpet that is), seconds it stays down, and seconds since it dropped. */
  gate?: { x: number; y: number; along: number; total: number };
  /** The Pamphlet: its straight (index into carpetLegs), whether it's armed, each fruit's place along the carpet last tick, and the shockwave's time left. */
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
  /** A Honker honked close by: this tower skips its next shot. */
  honked?: boolean;
}

/** A trick shot on a curved path that passes through fruit (Boomerang Bookend, Paper Plane, Serpent Quill, Rolling Globe). */
export interface Flyer {
  id: number;
  kind: "boomerang" | "plane" | "quill" | "globe" | "sheet";
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
  element: "shot" | "fire" | "ice" | "mortar" | "seed" | "fly" | "ink" | "peel" | "worm" | "potion";
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
  /** This shot leaves a pulp puddle where it lands. */
  pulp: boolean;
  /** Damage kept on each bounce (Card Catalogue chains lose some; plain bounces keep it all). */
  bounceRatio?: number;
  /** Pumpkin Trebuchet: push fruit this far back along the carpet. */
  knock?: number;
  /** Harvest Bombard: the giant pumpkin (its own hit, splash, shove and fire). */
  bombard?: boolean;
  /** Fruit this shot has killed so far, its chains included (Chain Reaction). */
  kills?: number;
  /** Quack-Liber rocket: everything in the burst is slowed this long (s); Covering Fire makes the target sticky this long (s); Lane Lockdown leaves a patch. */
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
  /** Bubbling Cauldron puddle: damage per second to anything in it (it also slows). */
  toxic?: number;
  /** Honeyed Heel footprint: sticky (slows even husks), the way it points, and the tower that left it. */
  honey?: boolean;
  rot?: number;
  owner?: number;
  /** An explosion spread this puddle once already. */
  grown?: boolean;
  /** An explosion on this fire patch: seconds left burning harder. */
  flare?: number;
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
  /** Sir Michael's oath for this night (null until he says it on the intro; always null for other keepers). */
  oath: OathId | null;
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
  /** Anti-Geese Protocol went off this wave: it can't be rebuilt until the wave is over. */
  geeseSpent: boolean;
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
export type SfxKind = "fire" | "pop" | "bossPop" | "leak" | "build" | "sell" | "wave" | "clear" | "victory" | "defeat" | "boss";
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
  turns: Array<{ c: number; r: number; rot: number }>;
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
  /** The Pamphlet: bind the selected one to the other straight its tile touches (between waves). */
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
  /** Intro, Sir Michael only: say one oath (door, mouth or sling) and start the night. */
  pickOath: (oath: OathId) => void;
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
  statsOf: (towerId: number) => { dmg: number; range: number; interval: number; lit?: boolean; quick?: boolean; pierce?: number } | null;
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
  tallyOf: (towerId: number) => { dmg: number; pops: number; share: number } | null;
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
      oath: null,
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
      geeseSpent: false,
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
    ...boardSize("stacks"),
    reduced: false,
    sfx: [],
    runLog: emptyRunLog(),
  };

  const cue = (kind: SfxKind, tower?: TowerKind) => {
    if (world.sfx.length < 48) world.sfx.push({ kind, tower });
  };

  let cleared = 0;
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
  const tally = new Map<number, { dmg: number; pops: number }>();
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
  /** How far along its own way a fruit is (0 at its entrance, 1 at the stacks). */
  const progressOf = (e: Enemy) => {
    const pts = world.points;
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
      maps: world.hud.maps,
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
    if (world.hud.guide === "damage" || world.hud.guide === "support") guideTo(world.hud.guide);
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
  /** The carpet's straights for the current board (worked out once per board). */
  let legCache: { points: World["points"]; legs: ReturnType<typeof carpetLegs> } | null = null;
  const legsNow = () => {
    if (!legCache || legCache.points !== world.points) legCache = { points: world.points, legs: carpetLegs(world.points) };
    return legCache.legs;
  };
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
    world.towers.find((t) => (t.c === c && t.r === r) || (t.spill?.some((s) => s.c === c && s.r === r) ?? false));
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
        const score = e.wp * 1000 - Math.hypot(e.x - (world.points[e.wp]?.x ?? e.x), e.y - (world.points[e.wp]?.y ?? e.y)) - (wet ? 1e6 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
      if (!best) continue;
      tile.set(stats.interval);
      addPool(best.x, best.y, spread, cling);
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
          kind: source.kind, mods: copyMods(source), orange: source.orange, cd: 0.4, pulpCd: 0, copied: true,
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
        rolling: true,
        left: CANNON.pressSheet * (hasMod(tower, "longsheet") ? 1.5 : 1),
        inkTime: CANNON.pressInkTime * (hasMod(tower, "wetink") ? 2 : 1),
      });
    } else if (tower.kind === "globe") {
      // Lob onto the carpet a little ahead of the fruit, then roll back toward the entrance.
      tower.cd = stats.interval;
      const ahead = world.points[target.reverse ? Math.max(0, target.wp - 1) : Math.min(world.points.length - 1, target.wp)];
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
        const wp = world.points[f.wp!];
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
          const wp = world.points[f.wp!];
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
   * counts; two don't stack). Quiet Confidence: faster again for a moment after one of its kills.
   */
  const quackHaste = (tower: Tower) => {
    if (tower.kind === "quackliber") return 1;
    const reach = CANNON.quackAura * fx.auraReach;
    let best = 1;
    for (const q of world.towers) {
      if (q.kind !== "quackliber") continue;
      if ((q.x - tower.x) ** 2 + (q.y - tower.y) ** 2 > reach * reach) continue;
      best = Math.max(best, (CANNON.quackHaste + fx.auraHaste) * ((q.rally ?? 0) > 0 ? CANNON.quackRally : 1));
    }
    return best;
  };
  /** Sir Michael's door oath: a tower whose reach touches the last three tiles of carpet fires faster. */
  const doorHaste = (tower: Tower, range: number) => {
    if (world.hud.oath !== "door") return 1;
    if (range >= GLOBAL_RANGE) return OATH_VALUES.doorHaste;
    return carpetInReach(oathStretch(world.points, "door"), tower.x, tower.y, range).length > 0 ? OATH_VALUES.doorHaste : 1;
  };
  /** Defensive Perimeter: with two Quack-Libers standing, fruit near the line between them walk slower. */
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
  /** Express Corn on a belt: nothing slows or stops it, and the belt carries it faster. */
  const expressOnBelt = (e: Enemy) => e.native === "express" && floorAt(e)?.kind === "belt";
  /** A fruit's floor pace, walking back (`back`) or on. */
  const paceOf = (e: Enemy, back: boolean) =>
    expressOnBelt(e) ? (back ? 1 / NATIVES.expressBelt : NATIVES.expressBelt) : floorPace(floorAt(e)?.kind, back);
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
    const haste = quackHaste(tower) * doorHaste(tower, studied.range);
    const base = haste > 1 ? { ...studied, interval: studied.interval / haste, quick: true } : studied;
    if (base.range >= GLOBAL_RANGE) return base;
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
    const now: { dmg: number; range: number; interval: number; lit?: boolean; quick?: boolean; pierce?: number } = statsFor(ghost);
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
      const from = [now.lit ? "Reading Lamp nearby" : "", now.quick ? "Quack-Liber nearby" : "", fx.closeReading && world.runLog.doctorTaken ? "Close Reading" : ""].filter(Boolean).join(", ");
      why.interval.push(`${from || "nearby towers"} ${pace(perked.interval, now.interval)}`);
    }
    return { ...now, base, why };
  };
  const priceNext = () =>
    Math.max(
      0,
      buildCost(world.hud.hero, placedCount(), world.hud.build, world.hud.builtKinds) -
        (bm("discount") ? BOOKMARK_VALUES.discount : 0) -
        (ownSignature(world.hud.build) ? fx.sigCost : 0) -
        (world.hud.oath === "sling" && world.hud.build === "trebuchet" ? OATH_VALUES.slingDiscount : 0) -
        (world.hud.oath === "sling" && world.hud.build === "bombard" ? CANNON.bombardSlingDiscount : 0),
    );
  /** A keeper tower can be built only by its keeper, and only one of each at a time. */
  const signatureBlocked = (kind: TowerKind) =>
    (kind === "geese" && world.hud.geeseSpent) ||
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
    world.hud.towerCost = priceNext();
    world.hud.placeRange = rangeFor(world.hud.build);
    if (world.hud.selected == null) world.hud.range = world.hud.placeRange;
  };

  const tune = () => {
    const found = DIFFICULTIES.find((x) => x.id === world.hud.difficulty) ?? DIFFICULTIES[1];
    // A room may slow its fruit on a difficulty (BOARDS[map].pace).
    const d = { ...found, speed: found.speed * (BOARDS[world.hud.map].pace?.[found.id] ?? 1) };
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
    } = {},
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
    const host = world.enemies[world.enemies.length - 1];
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
  /** Stacks a leak costs: 2 for a tank, 3 for a boss, 1 for anything else. */
  const leakOf = (e: Enemy) =>
    e.tank ? SIEGE.tank.leak : e.matriarch ? SIEGE.matriarch.leak : e.general ? SIEGE.general.leak : e.boss ? 3 : 1;
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
    const pts = world.points;
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
      spawnEnemy("corn", scale, "none", { at: { x: e.x + spread, y: e.y + spread * 0.5, wp: Math.min(e.wp, world.points.length - 1) } });
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
    return assignNatives(waveQueue([...spawns, ...extra]), BOARDS[world.hud.map].natives, index + 1, world.hud.difficulty);
  };
  const buildQueue = () => {
    queue = queueFor(cleared);
    queueCursor = 0;
    spawnClock = 0;
  };

  /** What one queued enemy will have when it spawns on wave `index`: health and speed (as spawnEnemy and siegeSetup work them out). */
  const spawnNumbers = (q: QueueItem, index: number) => {
    const st = STATS[q.kind];
    const tuned = tune();
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

  const applyBoard = (map: MapId) => {
    const built = buildBoard(BOARDS[map].corners);
    world.pathCells = built.cells;
    world.vergeCells = built.verge;
    world.shelfCells = shelfCells(map, built.cells, built.verge);
    world.points = built.points;
    world.turns = built.turns;
    world.floors = floorTiles(map);
    world.bell = BOARDS[map].bell ? { next: FLOOR.bellEvery, quiet: 0 } : null;
    world.vines = new Map();
    world.landings = [];
    world.brawls = [];
    Object.assign(world, boardSize(map));
    world.hud.map = map;
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
    world.enemies = [];
    world.towers = [];
    world.shots = [];
    world.pools = [];
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
    karlReward = false;
    absorbed = 0;
    materialNoted = false;
    windUsed = false;
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
      oath: null,
      build: "melon",
      shopVisits: 0,
      fitted: {},
      workshop: null,
      heavyOpen: false,
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
      geeseSpent: false,
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
    const log = world.runLog;
    log.stacksLost += lost;
    if (from?.reverse) log.chuteStacksLost += lost;
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
        world.hud.log = "Asser writes it down.";
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
        world.hud.log = "Asser gets back up.";
      }
      syncSisu();
    } else {
      float(x, y, n > 1 ? `−${n} stacks` : "Leak", "#e23b4a");
    }
    cue("leak");
    if (world.hud.lives <= 0) {
      cue("defeat");
      world.hud.phase = "defeat";
      world.hud.log = "The stacks are pulp. Mynxi is not speaking to you.";
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
    world.pools.push({ x, y, r, life, max: life, hot: false, burn: 0, owner: credit ?? undefined });
  };

  const addFire = (x: number, y: number, life = 2.4, burn = 22) => {
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
      const prev = world.points[prevIdx];
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
      const prev = world.points[prevIdx];
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
    // The same point the reach preview draws (gateStrip in rules.ts).
    tower.gate = nearestOnCarpet(world.points, tower.x, tower.y);
    return tower.gate;
  };
  /** Gourd Gate: every fruit on the carpet just short of the portcullis (from whichever way it walks). */
  const atGate = (tower: Tower) => {
    const g = gateSpot(tower);
    return world.enemies.filter((e) => {
      if (e.hp <= 0) return false;
      const { along } = carpetAlong(world.points, e.x, e.y, e.wp, e.reverse);
      return e.reverse ? along >= g.along - 4 && along - g.along <= CANNON.gateBand : along <= g.along + 4 && g.along - along <= CANNON.gateBand;
    });
  };
  /** Gourd Gate: drop the portcullis when fruit reach it (and it's ready), hold what's there, and shoot it. */
  const tickGate = (tower: Tower, dt: number) => {
    const g = gateSpot(tower);
    tower.gateDown = Math.max(0, (tower.gateDown ?? 0) - dt);
    tower.gateAge = (tower.gateAge ?? 0) + dt;
    const held = atGate(tower);
    if (tower.gateDown <= 0 && tower.cd <= 0 && held.length) {
      const zone = world.hud.oath === "door" ? g.total - g.along <= OATH_ZONE : world.hud.oath === "mouth" ? g.along <= OATH_ZONE : false;
      tower.gateDown = zone ? CANNON.gateHoldOath : CANNON.gateHold;
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
   * The Pamphlet: armed, it goes off when a fruit on its straight reaches the straight's far end (in its
   * own walking direction) with at least `pamphletCrowd` living fruit there, that one included. Every one
   * of them takes a fresh melon's direct hit. Spent, it re-arms once fewer than that are on the straight.
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
      const { along } = carpetAlong(world.points, e.x, e.y, e.wp, e.reverse);
      next[e.id] = along;
      if (legOf(legs, along, e.reverse) === tower.leg) {
        on.push(e);
        continue;
      }
      // Just reached the far end this tick (a corner belongs to the leg it walks into, so it has left this one).
      const was = prev[e.id];
      const ended = e.reverse ? along <= leg.from : along >= leg.to;
      if (was !== undefined && legOf(legs, was, e.reverse) === tower.leg && ended && !(e.driven && e.driven > 0)) turning.push(e);
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
      const s = n * 1e6 + e.wp * 1000;
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
    inRange.some((e) => !e.boss && inOathZone(world.points, "door", e));
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
    world.towers = world.towers.filter((t) => t !== tower);
    if (world.hud.selected === tower.id) world.hud.selected = null;
    world.hud.geeseSpent = true;
    world.hud.log = `Anti-Geese Protocol: ${inRange.filter((e) => !e.boss).length} fruit thrown back. It can be rebuilt after this wave.`;
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
      e.shell = 0;
      float(e.x, e.y - 16, "crack", "#f3e2c4");
      return;
    }
    if (e.guard === "rind" && e.shell > 0 && (via === "burn" || via === "pulp")) amount *= 0.4;
    if (e.guard === "husk" && (via === "splash" || via === "burn")) amount *= 1.4;
    if (e.guard === "husk" && via === "shot") amount *= 0.75;
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
    // Black Ice (a Freeze cannon fitting): frozen fruit take more from everything.
    if (COMBO.on && (e.frost ?? 0) >= COMBO.frostMax && fitted("freeze", "blackice")) amount *= COMBO.blackIce;
    // Sir Michael's mouth oath: fruit on the first three tiles take more from everything.
    if (world.hud.oath === "mouth" && inOathZone(world.points, "mouth", e)) amount *= OATH_VALUES.mouthAmp;
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
      t.dmg += Math.max(0, Math.min(amount, before));
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
    // Quiet Confidence counts this rocket's kills.
    const popsBefore = shot.splashChill && shot.owner != null ? tallyFor(shot.owner).pops : null;
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
    if (shot.element === "worm" && (e.kind === "pumpkin" || e.kind === "karl" || (COMBO.on && (e.sting ?? 0) >= AFFLICT.wormStings))) {
      if ((e.worm ?? 0) <= 0) float(e.x, e.y - 18, "burrow", "#e79ab0");
      e.worm = CANNON.wormTime;
      e.wormDps = Math.max(e.wormDps ?? 0, shot.wormDps ?? CANNON.wormDps);
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
    hurt(e, null, shot.dmg, 0, shatters ? "splash" : shot.pierce ? "pierce" : "shot");
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
    if (world.hud.hero === "vael" && e.guard !== "husk") {
      e.chill = Math.max(e.chill, 1.15 * fx.chill);
      addFrost(e, COMBO.chillHit);
    }
    if (shot.chill > 0 && e.guard !== "husk") {
      e.chill = Math.max(e.chill, shot.chill);
      addFrost(e, COMBO.chillHit);
    }
    if (shot.element === "fire") addFire(e.x, e.y, shot.fireLife, shot.fireBurn);
    if (shot.element === "ice" && e.guard !== "husk") {
      const hold = (e.boss ? 0.6 : 1.45) + shot.freezeExtra;
      e.freeze = Math.max(e.freeze, e.guard === "damp" ? hold * 1.4 : hold);
      e.stunBy = undefined;
      float(e.x, e.y - 18, "frozen", "#d5e4ee");
      if (COMBO.on) {
        // Fire, then ice: it puts a fire out. Then it gains its frost as usual.
        douse(e);
        e.iced = Math.max(e.iced ?? 0, e.freeze);
        addFrost(e, fitted("freeze", "deepfreeze") ? COMBO.deepFreezeHit : COMBO.freezeHit);
      }
    }
    if (shot.pulp) {
      addPool(e.x, e.y);
      shot.pulp = false; // a bounce does not leave a second puddle
    }
    if (shot.element === "potion") {
      // Puddle upgrades (Alchemy) reach the cauldron: Sticky spreads it, Vial and Distilled make it bite.
      const life = CANNON.cauldronLife * (has("sticky") ? 1.4 : 1) * fx.poolLife * (wetAt(e.x, e.y) ? CANNON.wetPuddle : 1);
      world.pools.push({
        x: e.x,
        y: e.y,
        r: Math.round((CANNON.cauldronRadius + (has("sticky") ? 12 : 0)) * fx.poolWide),
        life,
        max: life,
        hot: false,
        burn: 0,
        toxic: Math.round((CANNON.cauldronDps + (has("distill") ? 8 : has("vial") ? 4 : 0)) * fx.sigDmg),
        owner: credit ?? undefined,
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
    if (shot.splashChill) {
      // Quack-Liber rocket: everything in the burst is slowed for a moment (husks shrug it off).
      for (const other of world.enemies) {
        if (other.hp <= 0 || other.guard === "husk") continue;
        if (Math.hypot(other.x - e.x, other.y - e.y) > shot.splash + other.r) continue;
        other.chill = Math.max(other.chill, shot.splashChill);
        addFrost(other, COMBO.chillHit);
      }
    }
    if (shot.cover && e.hp > 0) {
      if ((e.honeyed ?? 0) <= 0) float(e.x, e.y - 18, "covered", "#e8883a");
      e.honeyed = Math.max(e.honeyed ?? 0, shot.cover);
    }
    if (shot.lock) {
      const life = CANNON.quackLockLife * (wetAt(e.x, e.y) ? CANNON.wetPuddle : 1);
      world.pools.push({ x: e.x, y: e.y, r: CANNON.quackLockRadius, life, max: life, hot: false, burn: 0, owner: shot.owner });
    }
    if (shot.owner != null && fx.confidence > 0 && popsBefore != null && tallyFor(shot.owner).pops > popsBefore) {
      const q = world.towers.find((t) => t.id === shot.owner);
      if (q) q.rally = CANNON.quackRallyTime;
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
        const reach = COMBO.on && (other.frost ?? 0) >= 1 ? 92 * COMBO.sparkFrost : 92;
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
    world.hud.geeseSpent = false;
    world.hud.chuteWave = usesChute(cleared);
    world.hud.dropWave = dropsFor(cleared);
    clearSiegeWave();
    bumpBest();
    const endless = world.hud.night === "endless";
    world.hud.wave = endless ? cleared + 1 : Math.min(nightLength(world.hud.night), cleared + 1);
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
    if (fx.waveSeeds) world.hud.seeds += fx.waveSeeds;
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
    const mendLine = mended > 0 ? `The Lion Blade puts ${mended} stack${mended > 1 ? "s" : ""} back.` : "";
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
        lectureLine = `${name[0]} got furthest. ${name[1]} will be slower.`;
      } else {
        lectureLine = "Nothing reached the stacks. I have nothing to add.";
      }
    }
    reached.clear();
    // The Unstoppered's spill line rides after whatever the wave-end message is, so it isn't lost.
    let spilled = false;
    for (const flask of world.towers) if (flask.kind === "flask" && spillFlask(flask)) spilled = true;
    for (const desk of world.towers) {
      if (desk.kind !== "desk") continue;
      desk.bank = (desk.bank ?? 0) + CANNON.deskBank;
      float(desk.x, desk.y - 50, `+${CANNON.deskBank}`, "#e6c36a");
    }
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
    if (spilled) world.hud.log = `${world.hud.log} That was not in the notes.`;
    if (lectureLine) world.hud.log = `${world.hud.log} ${lectureLine}`;
    if (mendLine) world.hud.log = `${world.hud.log} ${mendLine}`;
    recordWave();
    notify();
  };

  const tickCombat = (dt: number) => {
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
      });
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
        if (has("juicy") || has("distill")) {
          const pulp = has("distill") ? 16 : 10;
          if (pulp > dot) dotBy = pool.owner;
          dot = Math.max(dot, pulp);
        }
      }
      if (e.chill > 0) {
        e.chill -= dt;
        slow = Math.min(slow, softenSlow(has("distill") ? 0.48 : 0.62));
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
        e.freeze = 0;
        e.frost = 0;
        e.iced = 0;
        slow = 1;
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
            const to = world.points[e.wp];
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
      // Reverse Driver: walk back toward the corner behind it for a while (wait at the carpet's start or the chute's end).
      // A goose the Anti-Geese Protocol threw panics too: it walks back a little further.
      if ((e.driven ?? 0) > 0 || (e.panic ?? 0) > 0) {
        const driven = (e.driven ?? 0) > 0;
        if (driven) e.driven = Math.max(0, (e.driven ?? 0) - dt);
        const backAt = e.reverse ? e.wp + 1 : e.wp - 1;
        const back = world.points[backAt];
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
      const wp = world.points[e.wp];
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
            else loseLife(leakOf(e), e.x, e.y, e);
            e.hp = 0;
          }
        } else {
          e.wp += 1;
          if (e.wp >= world.points.length) {
            noteReach(e, 1);
            if (e.borrower) borrow(e);
            else loseLife(leakOf(e), e.x, e.y, e);
            e.hp = 0;
          }
        }
      } else if (dist > 0) {
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
      }
      if (e.hp > 0) noteReach(e, progressOf(e));
    }

    tickFeud();

    // Reserve Desk: a melon that comes past eats whatever is banked.
    for (const desk of world.towers) {
      if (desk.kind !== "desk" || !desk.bank) continue;
      const thief = world.enemies.find(
        (e) => e.kind === "melon" && e.hp > 0 && Math.hypot(e.x - desk.x, e.y - desk.y) <= CANNON.deskReach,
      );
      if (!thief) continue;
      float(desk.x, desk.y - 24, `bank eaten −${desk.bank}`, "#e23b4a");
      world.hud.log = `A melon walked past the Reserve Desk and ate the bank (${desk.bank} seeds).`;
      desk.bank = 0;
    }

    syncMimics();
    // While the Bell Tower's clock strikes, no tower acts (shots already in the air still land).
    for (const tower of (world.bell?.quiet ?? 0) > 0 ? [] : actingTowers()) {
      credit = tower.id;
      tower.cd -= dt;
      tower.pulpCd = (tower.pulpCd ?? 0) - dt;
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
      for (const e of world.enemies) {
        if (e.hp <= 0 || (e.descend ?? 0) > 0 || (e.boxed && !seesBoxes)) continue;
        const d2 = (e.x - tower.x) ** 2 + (e.y - tower.y) ** 2;
        if (d2 > range * range) continue;
        inRange.push(e);
        const prog = e.wp * 1000 - Math.hypot(e.x - (world.points[e.wp]?.x ?? e.x), e.y - (world.points[e.wp]?.y ?? e.y));
        // The tower's targeting mode (Settings in the inspector, A); the Mimic Chest keeps its own rule:
        // the first fruit that isn't a boss.
        const score = tower.kind === "mimic" ? prog + (e.boss ? 0 : 1e6) : targetScore(mode, tower, e, prog, Math.sqrt(d2), world.pools);
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
        world.lines.push({ x: tower.x, y: tower.y - 14, x2: pick.x, y2: pick.y, life: 0.35, max: 0.35, color: "200,255,215", width: 2 });
        cue("fire", "driver");
        continue;
      }
      if (tower.kind === "bombard") {
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
          pulp: false,
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
        const next = world.points[target.reverse ? Math.max(0, target.wp - 1) : Math.min(world.points.length - 1, target.wp)];
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
          e.chill = Math.max(e.chill, CANNON.organChill);
          addFrost(e, COMBO.chillHit);
          if (swell) {
            e.freeze = Math.max(e.freeze, e.boss ? CANNON.organStunBoss : CANNON.organStun);
            e.stunBy = "organ";
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
          if (e.guard === "husk") continue;
          e.freeze = Math.max(e.freeze, e.boss ? CANNON.bellStunBoss : CANNON.bellStun);
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
              e.chill = Math.max(e.chill, CANNON.barbedSlow);
              addFrost(e, COMBO.chillHit);
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
      tower.cd = stats.interval;
      const dmg = stats.dmg;
      // Pulp upgrades: only melon cannons leave puddles, and at most one per cannon every few seconds.
      const pulp =
        tower.kind === "melon" &&
        (tower.pulpCd ?? 0) <= 0 &&
        (has("juicy") || has("sticky") || has("vial") || has("distill"));
      if (pulp) tower.pulpCd = BALANCE.pulpEvery;
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
                          : tower.kind === "trebuchet" || tower.kind === "quackliber"
                            ? "mortar"
                            : "shot";
      const flies = tower.kind === "hive" && hasMod(tower, "swarm") ? 2 : 1;
      // Quack-Liber: Lane Lockdown marks the carpet with every fourth rocket.
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
            : (tower.kind === "melon" && has("bounce")) || (tower.kind === "hive" && has("stinging"))
              ? 1
              : 0,
        bounceRatio: tower.kind === "catalogue" ? Math.max(CANNON.catalogueChainRatio, fx.chainRatio) : 1,
        knock: tower.kind === "trebuchet" ? CANNON.trebuchetKnock * fx.knock : 0,
        orange: tower.kind === "mortar" || tower.kind === "trebuchet" || quack || tower.orange,
        splash: tower.kind === "mortar" ? 46 + (hasMod(tower, "wide") ? 18 : 0) + (hasMod(tower, "mimicstep") ? CANNON.mimicSplash : 0) : tower.kind === "trebuchet" ? Math.round(CANNON.trebuchetSplash * fx.splash) : quack ? Math.round(CANNON.quackSplash * fx.splash) : 0,
        element,
        // Juicy, Splatter and Electric go off from Cannon-type towers only.
        procs: TOWER_TYPE[tower.kind] === "cannon",
        inkTime: hasMod(tower, "indelible") ? CANNON.inkTime * 1.5 : CANNON.inkTime,
        inkMul: (hasMod(tower, "indelible") ? CANNON.inkBonus + 0.1 : CANNON.inkBonus) + (has("blot") ? CANNON.blotInkBonus : 0),
        wormDps: hasMod(tower, "venom") ? CANNON.wormDps * 1.5 : CANNON.wormDps,
        splashRatio: hasMod(tower, "heavy") || tower.kind === "trebuchet" ? 0.8 : quack ? CANNON.quackSplashRatio : 0.55,
        splashChill: quack ? CANNON.quackSlow : 0,
        cover: quack && fx.covering > 0 ? CANNON.quackCover : 0,
        lock,
        chill: hasMod(tower, "chill") ? 0.75 : 0,
        freezeExtra: (hasMod(tower, "hold") ? 0.55 : 0) + (hasMod(tower, "mimicstep") ? CANNON.mimicFreeze : 0),
        fireLife: (hasMod(tower, "lasting") ? 3.6 : 2.4) + (hasMod(tower, "mimicstep") ? CANNON.mimicBurn : 0),
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

    if (world.hud.phase === "combat" && queueCursor >= queue.length && world.enemies.length === 0 && drops.length === 0) {
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
        return;
      }
      world.hover = { c, r };
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
        !taken &&
        !signatureBlocked(world.hud.build) &&
        !levelLocked(world.hud.build) &&
        !goalLocked(world.hud.build) &&
        !heavyLocked(world.hud.build) &&
        !offCarpet(world.hud.build, c, r) &&
        world.hud.seeds >= world.hud.towerCost &&
        (world.hud.phase === "prep" || world.hud.phase === "combat");
      if (kind !== "down") return;
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
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
      if (path) return;
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
      if (goalLocked(buildKind)) {
        world.hud.log = `The ${TOWERS[buildKind].name} is locked. To open it: ${TOWER_GOALS[buildKind]?.goal}`;
        notify();
        return;
      }
      if (offCarpet(buildKind, c, r)) {
        world.hud.log =
          buildKind === "pamphlet"
            ? "The Pamphlet has to stand beside a straight."
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
      syncMimics();
      if (tower.kind === "orrery") tower.orbit = statsFor(tower).range;
      if (buildKind === "still") stillBuilt = true;
      cue("build", buildKind);
      world.hud.seeds -= world.hud.towerCost;
      if (!world.hud.builtKinds.includes(buildKind)) world.hud.builtKinds = [...world.hud.builtKinds, buildKind];
      // Stay in build mode with the same kind picked, so the next tap places another.
      // (Tap a built tower to open its stats.)
      world.hud.selected = null;
      world.hud.log = `${TOWERS[buildKind].name} set.`;
      syncGuide();
      syncPrice();
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
      world.hud.log = "The Pamphlet watches the other straight now.";
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
      world.hud.oath = null;
      world.hud.phase = "poster";
      world.hud.tutorial = false;
      fx = perkFx(hero, world.hud.keepers[hero]);
      world.hud.quackAura = CANNON.quackAura * fx.auraReach;
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
      windUsed = false;
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
      } else if (KEEPER_START[hero]) {
        const start = KEEPER_START[hero]!;
        world.hud.seeds = start.seeds;
        world.hud.lives = start.lives;
        world.hud.maxLives = start.lives;
        world.hud.log =
          hero === "elf"
            ? "The back room takes his retainer: upgrades cost less. The Scales are on the Keeper tab."
            : hero === "ooze"
              ? "The first fruit to leak each wave gets absorbed. Memec is on the Keeper tab."
              : hero === "asser"
                ? overflow
                  ? "He has lost stacks before. He kept the notes."
                  : "Twenty-five stacks. He expects to lose some. Every one he loses pays seeds and makes his towers hit harder. The Lion Blade is on the Keeper tab."
                : "Every shelf has one more book: the Doctor's pick. The Lectern is on the Keeper tab.";
      } else {
        world.hud.seeds = BALANCE.michaelSeeds;
        world.hud.lives = BALANCE.michaelLives;
        world.hud.maxLives = BALANCE.michaelLives;
        // No free cannon: he picks an oath on the intro instead (pickOath).
        world.hud.log = "He has not said where he stands.";
      }
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
      if (map === "overflow" || map === "courtyard" || !world.hud.maps.includes(map)) return;
      applyBoard(map);
      world.hud.log = BOARDS[map].blurb;
      notify();
    },
    chooseBuild(kind: TowerKind) {
      if (world.hud.phase !== "prep" && world.hud.phase !== "combat") return;
      if (isSignature(kind) && !own(kind)) return;
      world.hud.build = kind;
      world.hud.log = TOWERS[kind].blurb;
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
      // Sir Michael does not start until he has said his oath.
      if (world.hud.hero === "michael" && world.hud.oath == null) return;
      world.hud.phase = "prep";
      notify();
    },
    pickOath(oath: OathId) {
      if (world.hud.phase !== "poster" || world.hud.hero !== "michael" || !OATHS.includes(oath)) return;
      world.hud.oath = oath;
      world.runLog.oath = oath;
      world.hud.log = OATH_TEXT[oath].log;
      if (oath === "door") {
        world.hud.lives = Math.max(1, world.hud.lives - OATH_VALUES.doorStacks);
        world.hud.maxLives = Math.max(1, world.hud.maxLives - OATH_VALUES.doorStacks);
      }
      if (oath === "mouth") world.hud.seeds = Math.max(0, world.hud.seeds - OATH_VALUES.mouthSeeds);
      syncPrice();
      api.beginNight();
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
      return { dmg: mine.dmg, pops: mine.pops, share: all > 0 ? mine.dmg / all : 0 };
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
      if (shape.mode === "gate") return { tiles: Math.round((gateStrip(world.points, tower.x, tower.y, world.hud.map === "overflow").length / CELL) * 2) / 2, towers: 0 };
      if (range >= GLOBAL_RANGE) return { tiles: "all" as const, towers: 0 };
      const { length } = carpetInReach(world.points, tower.x, tower.y, shape.outer, shape.inner);
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

  const loopTick = (dt: number) => {
    if (!world.hud.heavyOpen && (world.hud.phase === "prep" || world.hud.phase === "combat")) {
      syncHeavy();
      if (world.hud.heavyOpen) notify();
    }
    tickFx(dt);
    if (world.hud.phase === "prep" || world.hud.phase === "combat") syncReach();
    if (world.hud.phase === "combat") tickCombat(dt);
  };

  (world as World & { step?: (dt: number) => void }).step = loopTick;

  return api;
}


export function stepWorld(world: World, dt: number) {
  const fn = (world as World & { step?: (dt: number) => void }).step;
  fn?.(dt);
}
