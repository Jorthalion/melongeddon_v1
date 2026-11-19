/**
 * Achievements and the Grand Catalogue. Every achievement restores one shelf; shelves fill six
 * library sections. A progress picture only: nothing here changes seeds, stacks or perks.
 * Checked when a night ends (see finishNight in the engine). Saved under its own key, apart from
 * MetaStats, and never by dev mode, tests or the simulator.
 */
import { DIFFICULTIES, HEROES, KEEPER_TOWERS, OATHS, type Difficulty, type HeroId, type MapId, type NightId, type OathId, type TowerKind } from "./rules.ts";
import { PICKABLE_MAPS, type MetaStats } from "./meta.ts";
import { SLIPS, type SlipId } from "./slips.ts";
import { DEFAULT_COSMETICS, ROOM_IDS, START_ROOMS, legacyRooms, type Cosmetics, type RoomId } from "./catalogue.ts";

/** What happened in the night being played. Reset at the start of every run; never saved. */
export interface RunLog {
  /** Status combos tonight: shatters, thermal shocks, fires spread by wildfire, stacks spread by contagion,
   * the most stings on one fruit, and the most different afflictions on one fruit at once. */
  shatters: number;
  thermals: number;
  wildfires: number;
  contagion: number;
  maxStung: number;
  maxAfflictions: number;
  /** Every tower placed (sold ones too), by kind, and the most standing at once. */
  built: Partial<Record<TowerKind, number>>;
  peakTowers: number;
  sold: number;
  backRoomBuys: number;
  stacksLost: number;
  /** Stacks lost to fruit that came up the Overflow's chute. */
  chuteStacksLost: number;
  /** Leaks Ooze absorbed. */
  absorbed: number;
  /** Lowest stacks reached (Infinity until the first leak). */
  minStacks: number;
  /** Stacks lost to Karl reaching the door. */
  karlStacksLost: number;
  picks: number;
  /** Dr. Samodovol: Doctor's picks shown, and taken. */
  doctorOffered: number;
  doctorTaken: number;
  kills: number;
  /** The tower whose hit or effect landed each kill. */
  killsBy: Partial<Record<TowerKind, number>>;
  karlKills: number;
  /** The tower kind that landed each Karl kill (Karl can come more than once). */
  karlKilledBy: TowerKind[];
  /** Fruit a Trebuchet shove actually moved. */
  knocks: number;
  /** Fruit the Mimic Chest swallowed whole. */
  swallows: number;
  maxSlowedAtOnce: number;
  /** Most kills from one Card Catalogue shot (its chains included). */
  chainBest: number;
  /** Pits killed by a direct hit (shot or pierce), not splash, fire or puddles. */
  pitDirectKills: number;
  borrowersAtDoor: number;
  borrowersOnLastWave: number;
  /** Room fruit: Express Corn killed on a belt, Parcels killed still wrapped, Sprouts that grew, Creeping Squash killed,
   * Bell Tower strikes a Chimer hurried, and Gargoyle Gourds killed while the clock silenced the towers. */
  expressBeltKills: number;
  parcelWrappedKills: number;
  sproutsGrown: number;
  squashKills: number;
  chimerEarly: number;
  gargoyleQuietKills: number;
  oath: OathId | null;
  /** Asser: highest Sisu in percent, and whether it reached its cap. */
  sisuPeak: number;
  sisuCapped: boolean;
  /** Quackarot went golden tonight (Over Nine Thousand Quacks). */
  wentGolden: boolean;
  /** Stacks Asser's Lion Blades put back. */
  mended: number;
  /** The Siege: goose-and-cat fights, geese the Anti-Geese Protocol threw, boxes knocked off Box Cats, and Private
   * Whiskers killed in one hit before Nine Lives could bring them back. */
  feuds: number;
  protocolGeese: number;
  boxesOff: number;
  oneLife: number;
}

export function emptyRunLog(): RunLog {
  return {
    built: {},
    peakTowers: 0,
    sold: 0,
    backRoomBuys: 0,
    stacksLost: 0,
    chuteStacksLost: 0,
    absorbed: 0,
    minStacks: Infinity,
    karlStacksLost: 0,
    picks: 0,
    doctorOffered: 0,
    doctorTaken: 0,
    kills: 0,
    killsBy: {},
    karlKills: 0,
    karlKilledBy: [],
    knocks: 0,
    swallows: 0,
    maxSlowedAtOnce: 0,
    chainBest: 0,
    pitDirectKills: 0,
    borrowersAtDoor: 0,
    borrowersOnLastWave: 0,
    shatters: 0,
    thermals: 0,
    wildfires: 0,
    contagion: 0,
    maxStung: 0,
    maxAfflictions: 0,
    expressBeltKills: 0,
    parcelWrappedKills: 0,
    sproutsGrown: 0,
    squashKills: 0,
    chimerEarly: 0,
    gargoyleQuietKills: 0,
    oath: null,
    sisuPeak: 0,
    sisuCapped: false,
    wentGolden: false,
    mended: 0,
    feuds: 0,
    protocolGeese: 0,
    boxesOff: 0,
    oneLife: 0,
  };
}

/** Lifetime counters the achievements need (saved with them). */
export interface Ledger {
  kills: number;
  /** Only the kinds an achievement reads. */
  killsBy: { quackliber: number };
  pitDirectKills: number;
  /** Room fruit across nights: Express Corn killed on a belt, and Creeping Squash killed. */
  expressBeltKills: number;
  squashKills: number;
  winsByKeeper: Partial<Record<HeroId, number>>;
  winsByMap: Partial<Record<MapId, number>>;
  winsByDifficulty: Partial<Record<Difficulty, number>>;
  /** Story nights won, by night (an Overflow win opens the Siege). */
  winsByNight: Partial<Record<StoryNight, number>>;
  oathsWon: OathId[];
}

/** The nights with a last wave. */
export type StoryNight = Exclude<NightId, "endless">;
export const STORY_NIGHTS: StoryNight[] = ["midnight", "overflow", "siege"];

export function emptyLedger(): Ledger {
  return {
    kills: 0,
    killsBy: { quackliber: 0 },
    pitDirectKills: 0,
    expressBeltKills: 0,
    squashKills: 0,
    winsByKeeper: {},
    winsByMap: {},
    winsByDifficulty: {},
    winsByNight: {},
    oathsWon: [],
  };
}

export interface AchievementSave {
  /** id → when it was earned (ms timestamp). */
  earned: Record<string, number>;
  ledger: Ledger;
  /** Grand Catalogue: fragments in hand and earned in all, rooms restored (The Stacks always), cosmetics chosen. */
  fragments: number;
  fragmentsEarned: number;
  rooms: RoomId[];
  /** The one-time move from the old unlock goals has run. */
  migrated: boolean;
  cosmetics: Cosmetics;
}

export function emptySave(): AchievementSave {
  return { earned: {}, ledger: emptyLedger(), fragments: 0, fragmentsEarned: 0, rooms: [...START_ROOMS], migrated: false, cosmetics: { ...DEFAULT_COSMETICS } };
}

/** The finished night, as the checks see it. */
export interface NightContext {
  log: RunLog;
  hero: HeroId | null;
  night: NightId;
  difficulty: Difficulty;
  map: MapId;
  won: boolean;
  cleared: number;
  seeds: number;
  stacks: number;
  slips: SlipId[];
  /** Lifetime, already including this night. */
  ledger: Ledger;
  endlessBest: number;
  /** Grand Catalogue, after this night's fragments. */
  fragmentsEarned: number;
  rooms: RoomId[];
}

export type SectionId = "desk" | "staff" | "reference" | "workshop" | "atlas" | "restricted";

export const SECTIONS: Array<{ id: SectionId; name: string }> = [
  { id: "desk", name: "Circulation Desk" },
  { id: "staff", name: "Staff Room" },
  { id: "reference", name: "Reference" },
  { id: "workshop", name: "The Workshop" },
  { id: "atlas", name: "Atlas Room" },
  { id: "restricted", name: "Restricted Section" },
];

export interface Achievement {
  id: string;
  name: string;
  blurb: string;
  /** Its bookcase in the Grand Catalogue. */
  shelf: SectionId;
  /** A named set within its bookcase (the Atlas Room's "Courtyard" books). */
  set?: string;
  /** Fragments it will be worth (step 2): 1 common, 2 harder, 3 the hardest and the secrets. */
  tier: 1 | 2 | 3;
  secret?: boolean;
  /** A secret's nudge, shown while it's still hidden. */
  hint?: string;
  check: (ctx: NightContext) => boolean;
  /** For the catalogue: [have, need] where a counter exists. */
  progress?: (ledger: Ledger, endlessBest: number, catalogue: { fragmentsEarned: number; rooms: RoomId[] }) => [number, number];
}

const story = (c: NightContext) => c.night !== "endless";
const storyWin = (c: NightContext) => c.won && story(c);
const hardish = (d: Difficulty) => d === "hard" || d === "overdue";
const builtCount = (log: RunLog) => Object.values(log.built).reduce((n, v) => n + (v ?? 0), 0);
const minStacks = (c: NightContext) => Math.min(c.log.minStacks, c.stacks);

const KEEPER_WIN: Array<[HeroId, string, string]> = [
  ["mynxi", "win-mynxi", "Mynxi's Favourite"],
  ["vael", "win-vael", "Cauldron Keeper"],
  ["michael", "win-michael", "Knight of the Stacks"],
  ["elf", "win-elf", "By the Book"],
  ["ooze", "win-ooze", "Ooze and Order"],
  ["scholar", "win-scholar", "Scholar's Victory"],
  ["quack", "win-quack", "Duck in the Library"],
  ["asser", "win-asser", "Sisu"],
];
const KEEPER_LABEL: Record<HeroId, string> = {
  mynxi: "Mynxi",
  vael: "Vaelithra",
  michael: "Sir Michael",
  elf: "the Legal Elf",
  ooze: "Ooze Clues",
  scholar: "Dr. Samodovol",
  quack: "Quackarot",
  asser: "Asser Mälkki",
};

const LIST: Array<Omit<Achievement, "tier">> = [
  // Circulation Desk
  { id: "first-night", name: "First Night", blurb: "Win any story night.", shelf: "desk", check: storyWin },
  { id: "librarian", name: "Librarian", blurb: "Win a night on Normal or harder.", shelf: "desk", check: (c) => storyWin(c) && c.difficulty !== "easy" },
  { id: "melongeddon", name: "Melongeddon Survivor", blurb: "Win a night on Melongeddon or harder.", shelf: "desk", check: (c) => storyWin(c) && hardish(c.difficulty) },
  { id: "overdue", name: "Overdue", blurb: "Win a night on Overdue.", shelf: "desk", check: (c) => storyWin(c) && c.difficulty === "overdue" },
  { id: "overflow", name: "The Chute Holds", blurb: "Win the Overflow.", shelf: "desk", check: (c) => c.won && c.night === "overflow" },
  {
    id: "endless-20",
    name: "Endless Reader",
    blurb: "Reach wave 20 in Endless.",
    shelf: "desk",
    check: (c) => c.endlessBest >= 20,
    progress: (_l, best) => [best, 20],
  },
  {
    id: "endless-30",
    name: "The Long Night",
    blurb: "Reach wave 30 in Endless.",
    shelf: "desk",
    check: (c) => c.endlessBest >= 30,
    progress: (_l, best) => [best, 30],
  },
  { id: "karl-hard", name: "Karl's Nightmare", blurb: "Pop Karl on Melongeddon or harder.", shelf: "desk", check: (c) => c.log.karlKills > 0 && hardish(c.difficulty) },

  // Staff Room
  ...KEEPER_WIN.map(
    ([hero, id, name]): Omit<Achievement, "tier"> => ({
      id,
      name,
      blurb: `Win a story night as ${KEEPER_LABEL[hero]}.`,
      shelf: "staff",
      check: (c) => storyWin(c) && c.hero === hero,
    }),
  ),
  {
    id: "full-staff",
    name: "Full Staff",
    blurb: "Win with every keeper.",
    shelf: "staff",
    check: (c) => HEROES.every((h) => (c.ledger.winsByKeeper[h] ?? 0) > 0),
    progress: (l) => [HEROES.filter((h) => (l.winsByKeeper[h] ?? 0) > 0).length, HEROES.length],
  },
  {
    id: "pet",
    name: "The Librarian's Pet",
    blurb: "Win 10 nights as the same keeper.",
    shelf: "staff",
    check: (c) => HEROES.some((h) => (c.ledger.winsByKeeper[h] ?? 0) >= 10),
    progress: (l) => [Math.max(0, ...HEROES.map((h) => l.winsByKeeper[h] ?? 0)), 10],
  },
  {
    id: "oaths",
    name: "Three Oaths",
    blurb: "Win as Sir Michael once with each oath.",
    shelf: "staff",
    check: (c) => OATHS.every((o) => c.ledger.oathsWon.includes(o)),
    progress: (l) => [l.oathsWon.length, OATHS.length],
  },
  {
    id: "well-read",
    name: "Well Read",
    blurb: "As Dr. Samodovol, win a night taking the Doctor's pick at least 3 times.",
    shelf: "staff",
    check: (c) => storyWin(c) && c.hero === "scholar" && c.log.doctorTaken >= 3,
  },
  {
    id: "off-the-shelf",
    name: "Off the Shelf",
    blurb: "As Dr. Samodovol, win a night without taking a single Doctor's pick.",
    shelf: "staff",
    check: (c) => storyWin(c) && c.hero === "scholar" && c.log.doctorOffered >= 3 && c.log.doctorTaken === 0,
  },
  {
    id: "power-level",
    name: "Power Level: Absurd",
    blurb: "As Quackarot, win a night after going golden.",
    shelf: "staff",
    check: (c) => storyWin(c) && c.hero === "quack" && c.log.wentGolden,
  },
  { id: "sisu-max", name: "Unbroken", blurb: "As Asser, win a night after Sisu reached its cap.", shelf: "staff", check: (c) => storyWin(c) && c.hero === "asser" && c.log.sisuCapped },
  { id: "mender", name: "Field Dressing", blurb: "As Asser, have the Lion Blade mend 20 stacks in one night.", shelf: "staff", check: (c) => c.hero === "asser" && c.log.mended >= 20 },

  // Reference: story nights, won.
  { id: "minimalist", name: "Minimalist", blurb: "Win a story night building 5 or fewer towers (sold ones count).", shelf: "reference", check: (c) => storyWin(c) && builtCount(c.log) <= 5 },
  {
    id: "no-signature",
    name: "No Signature",
    blurb: "Win a story night without building any of your keeper's own towers.",
    shelf: "reference",
    check: (c) => storyWin(c) && !!c.hero && KEEPER_TOWERS[c.hero].every((k) => !c.log.built[k]),
  },
  {
    id: "signature-only",
    name: "Signature Only",
    blurb: "Win a story night building nothing but your keeper's own towers and Melon cannons.",
    shelf: "reference",
    // At least one of the keeper's own: a melon-only night is not a signature night.
    check: (c) =>
      storyWin(c) &&
      !!c.hero &&
      KEEPER_TOWERS[c.hero].some((k) => (c.log.built[k] ?? 0) > 0) &&
      (Object.keys(c.log.built) as TowerKind[]).every((k) => !c.log.built[k] || k === "melon" || KEEPER_TOWERS[c.hero!].includes(k)),
  },
  { id: "hoarder", name: "Seed Hoarder", blurb: "Win a story night with 500 or more seeds in hand.", shelf: "reference", check: (c) => storyWin(c) && c.seeds >= 500 },
  {
    id: "stack-saver",
    name: "Stack Saver",
    blurb: "Win a story night without losing a stack (or having one absorbed).",
    shelf: "reference",
    check: (c) => storyWin(c) && c.log.stacksLost === 0 && c.log.absorbed === 0,
  },
  { id: "chute-master", name: "Overflow Master", blurb: "Win the Overflow without losing a stack to the chute.", shelf: "reference", check: (c) => c.won && c.night === "overflow" && c.log.chuteStacksLost === 0 },
  { id: "back-room-ban", name: "Back Room Ban", blurb: "Win a story night without buying a fitting.", shelf: "reference", check: (c) => storyWin(c) && c.log.backRoomBuys === 0 },
  { id: "still-standing", name: "Still Standing", blurb: "Win a story night after dropping to 1 stack.", shelf: "reference", check: (c) => storyWin(c) && minStacks(c) <= 1 },
  {
    id: "all-slips",
    name: "Chaos Librarian",
    blurb: "Win the Overflow with every late slip on.",
    shelf: "reference",
    // TODO: impossible today. There are five late slips and MAX_SLIPS lets you take three. The rule is kept as written.
    check: (c) => c.won && c.night === "overflow" && SLIPS.every((s) => c.slips.includes(s.id)),
  },
  {
    id: "perfect",
    name: "Perfect Night",
    blurb: "Win on Melongeddon or harder with no stack lost, nothing absorbed and no tower sold.",
    shelf: "reference",
    check: (c) => storyWin(c) && hardish(c.difficulty) && c.log.stacksLost === 0 && c.log.absorbed === 0 && c.log.sold === 0,
  },

  // The Workshop
  {
    id: "rockets",
    name: "Ki-mail",
    blurb: "The Quack-Liber's ki blasts get 100 kills, across all nights.",
    shelf: "workshop",
    check: (c) => c.ledger.killsBy.quackliber >= 100,
    progress: (l) => [l.killsBy.quackliber, 100],
  },
  { id: "shatter", name: "Cold Snap", blurb: "Shatter 25 frozen fruit in one night.", shelf: "workshop", check: (c) => c.log.shatters >= 25 },
  { id: "thermal", name: "Steam Engine", blurb: "Thaw 15 frozen fruit with fire in one night.", shelf: "workshop", check: (c) => c.log.thermals >= 15 },
  { id: "wildfire", name: "Brush Fire", blurb: "Fire spreads between fruit 30 times in one night.", shelf: "workshop", check: (c) => c.log.wildfires >= 30 },
  { id: "stung", name: "Hornet's Nest", blurb: "One fruit carries five stingers at once.", shelf: "workshop", check: (c) => c.log.maxStung >= 5 },
  { id: "cocktail", name: "House Special", blurb: "One fruit carries four different afflictions at once.", shelf: "workshop", check: (c) => c.log.maxAfflictions >= 4 },
  { id: "contagion", name: "Outbreak", blurb: "Contagion spreads 50 stacks in one night.", shelf: "workshop", check: (c) => c.log.contagion >= 50 },
  { id: "chain", name: "Chain Reaction", blurb: "One Card Catalogue shot kills 3 fruit.", shelf: "workshop", check: (c) => c.log.chainBest >= 3 },
  { id: "knockback", name: "Knockback King", blurb: "The Pumpkin Trebuchet moves 30 fruit in one night.", shelf: "workshop", check: (c) => c.log.knocks >= 30 },
  { id: "slow-cooker", name: "Slow Cooker", blurb: "Have 10 fruit slowed at the same moment.", shelf: "workshop", check: (c) => c.log.maxSlowedAtOnce >= 10 },
  { id: "justice", name: "Justice Served", blurb: "The Scales of Justice land the kill on Karl.", shelf: "workshop", check: (c) => c.log.karlKilledBy.includes("scales") },
  { id: "mimic", name: "Mimic Feast", blurb: "The Mimic Chest swallows 30 fruit in one night.", shelf: "workshop", check: (c) => c.log.swallows >= 30 },
  {
    id: "pits",
    name: "Stonecutter",
    blurb: "Kill 20 pits with direct hits, across all nights.",
    shelf: "workshop",
    check: (c) => c.ledger.pitDirectKills >= 20,
    progress: (l) => [l.pitDirectKills, 20],
  },
  {
    id: "borrowers",
    name: "Nothing Borrowed",
    blurb: "Win Midnight with no borrower reaching the door on the last wave.",
    shelf: "workshop",
    check: (c) => c.won && c.night === "midnight" && c.log.borrowersOnLastWave === 0,
  },
  {
    id: "express",
    name: "Return to Sender",
    blurb: "Kill 30 Express Corn while they're on a belt, across all nights.",
    shelf: "workshop",
    check: (c) => c.ledger.expressBeltKills >= 30,
    progress: (l) => [l.expressBeltKills, 30],
  },
  { id: "parcel", name: "Opened by Mistake", blurb: "Kill a Parcel before its wrapping comes off.", shelf: "workshop", check: (c) => c.log.parcelWrappedKills > 0 },
  {
    id: "sprout",
    name: "Weeded",
    blurb: "Win the Greenhouse without a single Sprout growing into a melon.",
    shelf: "workshop",
    check: (c) => c.won && c.map === "greenhouse" && c.log.sproutsGrown === 0,
  },
  {
    id: "squash",
    name: "Pruned",
    blurb: "Kill 10 Creeping Squash, across all nights.",
    shelf: "workshop",
    check: (c) => c.ledger.squashKills >= 10,
    progress: (l) => [l.squashKills, 10],
  },
  {
    id: "chimer",
    name: "Quiet Hours",
    blurb: "Win the Bell Tower with no strike coming early because of a Chimer.",
    shelf: "workshop",
    check: (c) => c.won && c.map === "belltower" && c.log.chimerEarly === 0,
  },
  {
    id: "gargoyle",
    name: "Caught Napping",
    blurb: "Kill a Gargoyle Gourd while the clock is silencing your towers.",
    shelf: "workshop",
    check: (c) => c.log.gargoyleQuietKills > 0,
  },

  // Atlas Room
  {
    id: "maps",
    name: "Map Explorer",
    blurb: "Win a night on every room you can pick.",
    shelf: "atlas",
    check: (c) => PICKABLE_MAPS.every((m) => (c.ledger.winsByMap[m] ?? 0) > 0),
    progress: (l) => [PICKABLE_MAPS.filter((m) => (l.winsByMap[m] ?? 0) > 0).length, PICKABLE_MAPS.length],
  },
  {
    id: "difficulties",
    name: "Difficulty Tour",
    blurb: "Win a night on every difficulty.",
    shelf: "atlas",
    check: (c) => DIFFICULTIES.every((d) => (c.ledger.winsByDifficulty[d.id] ?? 0) > 0),
    progress: (l) => [DIFFICULTIES.filter((d) => (l.winsByDifficulty[d.id] ?? 0) > 0).length, DIFFICULTIES.length],
  },
  { id: "massacre", name: "Produce Massacre", blurb: "1,000 kills across all nights.", shelf: "atlas", check: (c) => c.ledger.kills >= 1000, progress: (l) => [l.kills, 1000] },
  { id: "massacre-10k", name: "Compost Heap", blurb: "10,000 kills across all nights.", shelf: "atlas", check: (c) => c.ledger.kills >= 10000, progress: (l) => [l.kills, 10000] },
  {
    id: "fragments-10",
    name: "Fragment Collector",
    blurb: "Earn 10 fragments in total.",
    shelf: "atlas",
    check: (c) => c.fragmentsEarned >= 10,
    progress: (_l, _b, g) => [g.fragmentsEarned, 10],
  },
  {
    id: "restorer",
    name: "Restorer",
    blurb: "Restore your first room, other than The Stacks.",
    shelf: "atlas",
    check: (c) => c.rooms.some((r) => r !== "stacks"),
  },
  {
    id: "archivist",
    name: "Archivist",
    blurb: "Restore every room.",
    shelf: "atlas",
    check: (c) => ROOM_IDS.every((r) => c.rooms.includes(r)),
    progress: (_l, _b, g) => [g.rooms.length, ROOM_IDS.length],
  },
  // Atlas Room, the Courtyard set: the Siege.
  { id: "siege", name: "The Siege Holds", blurb: "Win the Siege.", shelf: "atlas", set: "Courtyard", check: (c) => c.won && c.night === "siege" },
  {
    id: "siege-hard",
    name: "Siege Breaker",
    blurb: "Win the Siege on Melongeddon or harder.",
    shelf: "atlas",
    set: "Courtyard",
    check: (c) => c.won && c.night === "siege" && hardish(c.difficulty),
  },
  { id: "feud", name: "Let Them Fight", blurb: "25 goose-and-cat fights in one night.", shelf: "atlas", set: "Courtyard", check: (c) => c.log.feuds >= 25 },
  {
    id: "protocol",
    name: "Protocol Engaged",
    blurb: "The Anti-Geese Protocol throws 10 geese in one night.",
    shelf: "atlas",
    set: "Courtyard",
    check: (c) => c.log.protocolGeese >= 10,
  },
  { id: "out-of-box", name: "Out of the Box", blurb: "Knock 20 boxes off Box Cats in one night.", shelf: "atlas", set: "Courtyard", check: (c) => c.log.boxesOff >= 20 },
  {
    id: "nine-lives",
    name: "Only One Life",
    blurb: "Kill a Private Whiskers with a single hit before Nine Lives can trigger.",
    shelf: "atlas",
    set: "Courtyard",
    check: (c) => c.log.oneLife > 0,
  },

  // Restricted Section (secret)
  { id: "karl-first-wave", name: "Early Karl", blurb: "Lose a stack to Karl and still win the night.", shelf: "restricted", secret: true, hint: "Karl doesn't have to be stopped cleanly.", check: (c) => c.won && c.log.karlStacksLost > 0 },
  { id: "penniless", name: "Penniless", blurb: "Win a night that ends with 0 seeds.", shelf: "restricted", secret: true, hint: "Spend everything you have.", check: (c) => c.won && c.seeds === 0 },
  { id: "one-tower", name: "One Good Tower", blurb: "Win a story night with exactly one tower ever built.", shelf: "restricted", secret: true, hint: "Sometimes less is more. Much less.", check: (c) => storyWin(c) && builtCount(c.log) === 1 },
];

const TIER_1 = ["fragments-10", "restorer", "first-night", "librarian", "overflow", "endless-20", "minimalist", "no-signature", "hoarder", "back-room-ban", "slow-cooker", "massacre", "out-of-box", "nine-lives", "shatter", "stung"];
const TIER_3 = ["gargoyle", "archivist", "overdue", "endless-30", "full-staff", "pet", "still-standing", "all-slips", "perfect", "well-read", "maps", "difficulties", "massacre-10k", "siege-hard"];
const tierOf = (a: Omit<Achievement, "tier">): 1 | 2 | 3 =>
  a.secret || TIER_3.includes(a.id) ? 3 : TIER_1.includes(a.id) || a.id.startsWith("win-") ? 1 : 2;

export const ACHIEVEMENTS: Achievement[] = LIST.map((a) => ({ ...a, tier: tierOf(a) }));

export const ACHIEVEMENT = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, Achievement>;

/** Name and blurb as shown: secret ones are "???" until earned. */
export function shownAs(a: Achievement, earned: boolean): { name: string; blurb: string } {
  return a.secret && !earned ? { name: "???", blurb: "???" } : { name: a.name, blurb: a.blurb };
}

/** Add the finished night to the lifetime ledger (returns a new ledger). */
export function addNight(ledger: Ledger, c: Omit<NightContext, "ledger" | "endlessBest" | "fragmentsEarned" | "rooms">): Ledger {
  const out: Ledger = {
    ...ledger,
    kills: ledger.kills + c.log.kills,
    killsBy: { quackliber: ledger.killsBy.quackliber + (c.log.killsBy.quackliber ?? 0) },
    pitDirectKills: ledger.pitDirectKills + c.log.pitDirectKills,
    expressBeltKills: ledger.expressBeltKills + c.log.expressBeltKills,
    squashKills: ledger.squashKills + c.log.squashKills,
    winsByKeeper: { ...ledger.winsByKeeper },
    winsByMap: { ...ledger.winsByMap },
    winsByDifficulty: { ...ledger.winsByDifficulty },
    winsByNight: { ...ledger.winsByNight },
    oathsWon: [...ledger.oathsWon],
  };
  if (c.won && c.night !== "endless") {
    out.winsByNight[c.night] = (out.winsByNight[c.night] ?? 0) + 1;
    if (c.hero) out.winsByKeeper[c.hero] = (out.winsByKeeper[c.hero] ?? 0) + 1;
    out.winsByMap[c.map] = (out.winsByMap[c.map] ?? 0) + 1;
    out.winsByDifficulty[c.difficulty] = (out.winsByDifficulty[c.difficulty] ?? 0) + 1;
    if (c.hero === "michael" && c.log.oath && !out.oathsWon.includes(c.log.oath)) out.oathsWon.push(c.log.oath);
  }
  return out;
}

/** The ids newly earned by this night (each is earned once, forever). */
export function newlyEarned(save: AchievementSave, ctx: NightContext): string[] {
  return ACHIEVEMENTS.filter((a) => !save.earned[a.id] && a.check(ctx)).map((a) => a.id);
}

// ── Saving ─────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS_KEY = "melongeddon-achievements";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const counts = <K extends string>(raw: unknown, keys: readonly K[]): Partial<Record<K, number>> => {
  const out: Partial<Record<K, number>> = {};
  if (raw && typeof raw === "object") for (const k of keys) if (num((raw as Record<string, unknown>)[k])) out[k] = num((raw as Record<string, unknown>)[k]);
  return out;
};

/** Read a saved value defensively: unknown ids dropped, bad numbers become 0, anything corrupt is empty. */
export function parseSave(raw: unknown): AchievementSave {
  const out = emptySave();
  if (!raw || typeof raw !== "object") return out;
  const r = raw as { earned?: unknown; ledger?: Record<string, unknown> };
  if (r.earned && typeof r.earned === "object") {
    for (const [id, at] of Object.entries(r.earned as Record<string, unknown>)) if (ACHIEVEMENT[id] && num(at)) out.earned[id] = num(at);
  }
  const l = r.ledger;
  if (l && typeof l === "object") {
    out.ledger.kills = num(l.kills);
    out.ledger.killsBy.quackliber = num((l.killsBy as Record<string, unknown> | undefined)?.quackliber);
    out.ledger.pitDirectKills = num(l.pitDirectKills);
    out.ledger.expressBeltKills = num(l.expressBeltKills);
    out.ledger.squashKills = num(l.squashKills);
    out.ledger.winsByKeeper = counts(l.winsByKeeper, HEROES);
    out.ledger.winsByMap = counts(l.winsByMap, PICKABLE_MAPS);
    out.ledger.winsByDifficulty = counts(l.winsByDifficulty, DIFFICULTIES.map((d) => d.id));
    out.ledger.winsByNight = counts(l.winsByNight, STORY_NIGHTS);

    out.ledger.oathsWon = Array.isArray(l.oathsWon) ? OATHS.filter((o) => (l.oathsWon as unknown[]).includes(o)) : [];
  }
  // Saves from before the ledger counted nights: an Overflow win shows as a win on its map, or as its achievements.
  if (!out.ledger.winsByNight.overflow) {
    const onMap = num((l?.winsByMap as Record<string, unknown> | undefined)?.overflow);
    const earned = out.earned.overflow || out.earned["chute-master"] || out.earned["all-slips"] ? 1 : 0;
    if (onMap || earned) out.ledger.winsByNight.overflow = Math.max(onMap, earned);
  }
  const c = raw as { fragments?: unknown; fragmentsEarned?: unknown; rooms?: unknown; migrated?: unknown; cosmetics?: Partial<Cosmetics> };
  out.fragments = Math.floor(num(c.fragments));
  out.fragmentsEarned = Math.max(out.fragments, Math.floor(num(c.fragmentsEarned)));
  out.rooms = ROOM_IDS.filter((r) => r === "stacks" || (Array.isArray(c.rooms) && c.rooms.includes(r)));
  out.migrated = c.migrated === true;
  if (c.cosmetics && typeof c.cosmetics === "object") out.cosmetics = { ...DEFAULT_COSMETICS, ...c.cosmetics };
  return out;
}

/** Fragments every earned achievement is worth (their tiers). */
export const tierSum = (ids: readonly string[]) => ids.reduce((n, id) => n + (ACHIEVEMENT[id]?.tier ?? 0), 0);

/** What the old lifetime stats already prove, for a first load. Nothing that can't be proved. */
export function backfill(meta: MetaStats, at = Date.now()): AchievementSave {
  const out = emptySave();
  const give = (id: string) => (out.earned[id] = at);
  if (meta.wins >= 1) give("first-night");
  if (meta.hardWins >= 1) {
    give("melongeddon");
    give("librarian");
  }
  if (meta.endlessBest >= 20) give("endless-20");
  if (meta.endlessBest >= 30) give("endless-30");
  return out;
}

export function loadAchievements(meta: MetaStats): AchievementSave {
  try {
    const text = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (text == null) {
      const first = backfill(meta);
      saveAchievements(first);
      return first;
    }
    return parseSave(JSON.parse(text));
  } catch {
    return emptySave();
  }
}

export function saveAchievements(save: AchievementSave) {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(save));
  } catch {
    /* achievements just won't persist */
  }
}

/**
 * Award everything the save now qualifies for, paying each its tier in fragments. Repeats while a
 * payment earns something more (Fragment Collector), at most a few times.
 */
export function settle(save: AchievementSave, ctx: NightContext): { save: AchievementSave; fresh: string[] } {
  let s = save;
  const all: string[] = [];
  for (let pass = 0; pass < 4; pass++) {
    const fresh = newlyEarned(s, { ...ctx, ledger: s.ledger, fragmentsEarned: s.fragmentsEarned, rooms: s.rooms });
    if (!fresh.length) break;
    const pay = tierSum(fresh);
    const at = Date.now();
    s = {
      ...s,
      earned: { ...s.earned, ...Object.fromEntries(fresh.map((id) => [id, at])) },
      fragments: s.fragments + pay,
      fragmentsEarned: s.fragmentsEarned + pay,
    };
    all.push(...fresh);
  }
  return { save: s, fresh: all };
}

/** A context with no night in it (restoring a room, the migration): only lifetime checks can pass. */
export function quietContext(save: AchievementSave, endlessBest: number): NightContext {
  return {
    log: emptyRunLog(),
    hero: null,
    night: "midnight",
    difficulty: "easy",
    map: "stacks",
    won: false,
    cleared: 0,
    seeds: 0,
    stacks: 0,
    slips: [],
    ledger: save.ledger,
    endlessBest,
    fragmentsEarned: save.fragmentsEarned,
    rooms: save.rooms,
  };
}

/**
 * The one-time move to the Grand Catalogue: restore for free every room with something the player
 * already had under the old goals (or a keeper they've played), and pay for achievements already
 * earned. A brand-new save comes out with The Stacks and nothing else. Returns the note for the title.
 */
export function migrate(save: AchievementSave, meta: MetaStats, playedKeepers: readonly HeroId[]): { save: AchievementSave; note: string } {
  if (save.migrated) return { save, note: "" };
  const rooms = ROOM_IDS.filter((r) => save.rooms.includes(r) || legacyRooms(meta, playedKeepers).includes(r));
  const paid = tierSum(Object.keys(save.earned));
  let s: AchievementSave = { ...save, rooms, fragments: save.fragments + paid, fragmentsEarned: save.fragmentsEarned + paid, migrated: true };
  s = settle(s, quietContext(s, meta.endlessBest)).save;
  const changed = rooms.length > START_ROOMS.length || s.fragments > 0;
  return {
    save: s,
    note: changed
      ? `The Grand Catalogue is open. Rooms you had already reached are restored, and you have ${s.fragments} fragment${s.fragments === 1 ? "" : "s"} to spend.`
      : "",
  };
}
