// Game rules and content: towers, upgrades, mods, maps, waves, enemy stats.
// Pure data and pure functions only. No DOM, no storage, no world state.

export const COLS = 16;
export const ROWS = 10;
export const CELL = 48;
export const MAP_W = COLS * CELL;
export const MAP_H = ROWS * CELL;

export type Phase =
  | "select"
  | "coldopen"
  | "poster"
  | "prep"
  | "combat"
  | "upgrade"
  | "consequence"
  | "victory"
  | "defeat";

export type HeroId = "mynxi" | "michael" | "vael" | "elf" | "ooze" | "scholar" | "quack" | "asser";

/** Keepers in Setup order (keys 1–8 pick in this order). */
export const HEROES: HeroId[] = ["mynxi", "vael", "michael", "elf", "ooze", "scholar", "quack", "asser"];

/** Names used in text. `short` is how the story cards address the keeper. */
export const KEEPER_NAMES: Record<HeroId, { name: string; short: string; role: string }> = {
  mynxi: { name: "Mynxi", short: "Mynxi", role: "Head librarian" },
  vael: { name: "Vaelithra", short: "Vael", role: "Potions division" },
  michael: { name: "Sir Michael", short: "Sir Michael", role: "Dragon Knight" },
  elf: { name: "Legal Elf", short: "The Legal Elf", role: "Legal advisor" },
  ooze: { name: "Ooze Clues", short: "Ooze", role: "Astral adventurer" },
  scholar: { name: "Dr. Samodovol", short: "The Doctor", role: "The Scholar" },
  quack: { name: "Quackarot", short: "Quackarot", role: "Duck of Destiny" },
  asser: { name: "Asser Mälkki", short: "Asser", role: "Author-Knight" },
};

/** Starting seeds and stacks for the newer keepers (the first three are set in the engine). */
export const KEEPER_START: Partial<Record<HeroId, { seeds: number; lives: number }>> = {
  elf: { seeds: 150, lives: 12 },
  ooze: { seeds: 140, lives: 13 },
  scholar: { seeds: 150, lives: 12 },
  quack: { seeds: 150, lives: 12 },
  asser: { seeds: 100, lives: 20 },
};

export type UpgradeId =
  | "juicy"
  | "rapid"
  | "seeds"
  | "sticky"
  | "bounce"
  | "electric"
  | "fines"
  | "caliber"
  | "lamp"
  | "splatter"
  | "vial"
  | "distill"
  | "barbed"
  | "footnotes"
  | "stinging"
  | "blot"
  | "interest";

/** The Siege brings two kinds that aren't fruit at all: geese and cats (every variant is a flag on one of them). */
export type EnemyKind = "melon" | "corn" | "pumpkin" | "karl" | "goose" | "cat";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  blurb: string;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  juicy: {
    id: "juicy",
    name: "Juicy Explosions",
    blurb: "Cannon hits burst, splashing everyone standing close.",
  },
  rapid: {
    id: "rapid",
    name: "Rapid Rind",
    blurb: "Cannon and Precision towers cycle 30% faster. The carpet gets louder.",
  },
  seeds: {
    id: "seeds",
    name: "Seed Cache",
    blurb: "Someone kicks over a crate. +55 seeds. No new tricks.",
  },
  sticky: {
    id: "sticky",
    name: "Sticky Pulp",
    blurb: "Pulp clings. Anyone in it crawls, and the puddle lasts longer.",
  },
  bounce: {
    id: "bounce",
    name: "Prize Melons",
    blurb: "Melon cannons hit 30% harder. Nothing fancy: just bigger melons.",
  },
  electric: {
    id: "electric",
    name: "Electrified Rounds",
    blurb: "Cannon impacts throw a spark into a nearby foe.",
  },
  fines: {
    id: "fines",
    name: "Overdue Fines",
    blurb: "The ledger. Every kill pays 5 extra seeds.",
  },
  caliber: {
    id: "caliber",
    name: "Heavy Caliber",
    blurb: "Cannons hit harder and reload slower.",
  },
  lamp: {
    id: "lamp",
    name: "Reading Lamp",
    blurb: "Someone marks the range. Cannon and Precision towers see farther down the carpet.",
  },
  splatter: {
    id: "splatter",
    name: "Knight's Splatter",
    blurb: "Each cannon hit chips everyone standing close to the target.",
  },
  vial: {
    id: "vial",
    name: "Trial Vial",
    blurb: "A measured puddle. It slows. It does not burn unless the formula says so.",
  },
  distill: {
    id: "distill",
    name: "Distilled Batch",
    blurb: "The puddle bites, and the slow goes mean.",
  },
  barbed: {
    id: "barbed",
    name: "Barbed Spears",
    blurb: "Shelf Ballistas fire faster, and everything the spear passes through is slowed.",
  },
  footnotes: {
    id: "footnotes",
    name: "Footnotes",
    blurb: "Long Readers fire faster, and each hit marks the target like ink.",
  },
  stinging: {
    id: "stinging",
    name: "Stinging Flies",
    blurb: "Fly Hives fire faster, and each fly stings a second fruit.",
  },
  blot: {
    id: "blot",
    name: "Ink Blot",
    blurb: "Ink Wells fire twice as fast and their marks sting more. A marked fruit that pops splashes ink on its neighbours.",
  },
  interest: {
    id: "interest",
    name: "Interest",
    blurb: "Each Compost Heap pays 20 more, plus 10% of your unspent seeds (up to 20).",
  },
};

/** Upgrades tied to one cannon. They are only offered once you have built that cannon. */
export const CANNON_UPGRADES: Partial<Record<TowerKind, UpgradeId>> = {
  ballista: "barbed",
  reader: "footnotes",
  hive: "stinging",
  ink: "blot",
  compost: "interest",
};
export const PAD: UpgradeId[] = ["sticky", "bounce", "electric", "seeds", "juicy", "rapid", "lamp", "splatter"];

export function signatureOf(hero: HeroId | null): UpgradeId {
  if (hero === "michael") return "splatter";
  if (hero === "vael") return "distill";
  return "lamp";
}

export function buildOffer(
  hero: HeroId | null,
  step: 1 | 2 | 3,
  owned: UpgradeId[],
  branch: UpgradeId | null,
  /** Cannon kinds the player has built, most-built first. */
  built: TowerKind[] = [],
  /** Extra choices from keeper perks. */
  extra = 0,
): UpgradeDef[] {
  const size = 3 + extra;
  const first: UpgradeId[] =
    hero === "michael" ? ["juicy", "rapid", "caliber"] : hero === "vael" ? ["juicy", "rapid", "vial"] : ["juicy", "rapid", "fines"];
  let wanted = first;
  if (step === 2) {
    const sig = signatureOf(hero);
    if (branch === "juicy") wanted = ["sticky", "electric", sig];
    else if (branch === "rapid") wanted = ["bounce", "seeds", sig];
    else if (branch === "fines") wanted = ["juicy", "rapid", "lamp"];
    else if (branch === "caliber") wanted = ["sticky", "bounce", "splatter"];
    else if (branch === "vial") wanted = ["sticky", "electric", "distill"];
    else wanted = ["sticky", "bounce", "electric"];
  } else if (step === 3) {
    wanted =
["juicy", "sticky", "seeds", "rapid", "electric", "bounce"];
  }
  const out: UpgradeId[] = [];
  for (const id of [...wanted, ...PAD]) {
    if (owned.includes(id) || out.includes(id)) continue;
    if (step === 1 && (id === "lamp" || id === "splatter" || id === "distill")) continue;
    out.push(id);
    if (out.length === size) break;
  }
  // From the second pick on, a cannon upgrade for something you built takes the middle
  // slot. The third slot holds the keeper's own pick, and the first pick sets the
  // keeper's path, so neither is displaced.
  const cannonPick = built.map((k) => CANNON_UPGRADES[k]).find((id): id is UpgradeId => !!id && !owned.includes(id));
  if (step > 1 && cannonPick && out.length >= 3 && !out.includes(cannonPick)) out[1] = cannonPick;
  return out.map((id) => UPGRADES[id]);
}
export type TowerKind =
  | "melon"
  | "mortar"
  | "still"
  | "fire"
  | "freeze"
  | "spitter"
  | "ballista"
  | "reader"
  | "bell"
  | "hive"
  | "lantern"
  | "ink"
  | "compost"
  | "peeler"
  | "bookworm"
  // Trick shots: curved flight paths that pass through fruit.
  | "boomerang"
  | "orrery"
  | "plane"
  | "quill"
  | "globe"
  // Heavy cannons: expensive, and each does two jobs.
  | "press"
  | "organ"
  | "scope"
  // Keeper towers: only that keeper can build them, one of each on the board at a time.
  | "catalogue"
  | "desk"
  | "cauldron"
  | "flask"
  | "trebuchet"
  | "scales"
  | "stomp"
  | "honey"
  | "mimic"
  | "copycat"
  | "lectern"
  | "quackliber"
  | "geese"
  | "lionblade"
  | "gourdgate"
  | "bombard"
  | "pamphlet"
  | "driver";

/**
 * What the Copycat can copy. Step kinds get the hidden "one step harder" (`mimicstep`); plain kinds
 * are copied exactly. Anything on neither list is never copied: keeper towers, another Copycat, and
 * the helpers (Reading Lamp, Compost Heap). List new shared towers here by hand when they're added.
 */
export const COPY_STEP_KINDS: TowerKind[] = ["melon", "mortar", "still", "fire", "freeze"];
export const COPY_PLAIN_KINDS: TowerKind[] = [
  "spitter", "ballista", "reader", "bell", "hive", "ink", "peeler", "bookworm",
  "boomerang", "orrery", "plane", "quill", "globe",
  "press", "organ", "scope",
];
/** Heavy cannons: a Copycat's copy of one hits for `CANNON.copyHeavyDmg`. */
export const COPY_HEAVY_KINDS: TowerKind[] = ["press", "organ", "scope"];
export const canCopy = (kind: TowerKind) => COPY_STEP_KINDS.includes(kind) || COPY_PLAIN_KINDS.includes(kind);

/** Each keeper's signature tower. */
export const SIGNATURE: Record<HeroId, TowerKind> = {
  mynxi: "catalogue",
  vael: "cauldron",
  michael: "trebuchet",
  elf: "scales",
  ooze: "mimic",
  scholar: "lectern",
  quack: "quackliber",
  asser: "lionblade",
};
/** Every tower in each keeper's own tab: the signature first, then any extras. */
export const KEEPER_TOWERS: Record<HeroId, TowerKind[]> = {
  mynxi: ["catalogue", "desk"],
  vael: ["cauldron", "flask"],
  michael: ["trebuchet", "gourdgate", "bombard"],
  elf: ["scales", "stomp", "honey"],
  ooze: ["mimic", "copycat"],
  scholar: ["lectern"],
  quack: ["quackliber", "geese", "pamphlet", "driver"],
  asser: ["lionblade"],
};
/** All keeper-only towers. */
export const SIGNATURE_KINDS: TowerKind[] = Object.values(KEEPER_TOWERS).flat();
export const isSignature = (kind: TowerKind) => SIGNATURE_KINDS.includes(kind);
/** The keeper a keeper-only tower belongs to. */
export const keeperOf = (kind: TowerKind): HeroId | null =>
  (Object.keys(KEEPER_TOWERS) as HeroId[]).find((h) => KEEPER_TOWERS[h].includes(kind)) ?? null;

export interface TowerGroup {
  id: "damage" | "control" | "support" | "trick" | "heavy" | "keeper";
  name: string;
  key: string;
  kinds: TowerKind[];
}

/** Build-bar tabs. Keys 1–5 pick within the open tab; Q / W / E switch tabs (R is the keeper's tab). */
export const TOWER_GROUPS: TowerGroup[] = [
  { id: "damage", name: "Damage", key: "q", kinds: ["melon", "mortar", "spitter", "ballista", "reader"] },
  { id: "control", name: "Control", key: "w", kinds: ["still", "fire", "freeze", "bell", "hive"] },
  { id: "support", name: "Support", key: "e", kinds: ["lantern", "ink", "peeler", "bookworm", "compost"] },
  { id: "trick", name: "Trick", key: "t", kinds: ["boomerang", "orrery", "plane", "quill", "globe"] },
  { id: "heavy", name: "Heavy", key: "y", kinds: ["press", "organ", "scope"] },
];

/** The keeper's own tab: their signature tower, plus any extras. */
export function keeperGroup(kinds: TowerKind[]): TowerGroup {
  return { id: "keeper", name: "Keeper", key: "r", kinds };
}

/** The tabs a keeper sees: the three shared ones plus their own. */
export function groupsFor(hero: HeroId | null): TowerGroup[] {
  if (!hero) return TOWER_GROUPS;
  // Tabs follow their keys: Q W E, then the keeper's R, then T for trick shots and Y for the heavy cannons.
  const shared = TOWER_GROUPS.filter((g) => g.id !== "trick" && g.id !== "heavy");
  const after = TOWER_GROUPS.filter((g) => g.id === "trick" || g.id === "heavy");
  return [...shared, keeperGroup(KEEPER_TOWERS[hero]), ...after];
}

export function groupOf(kind: TowerKind): TowerGroup {
  const keeper = keeperOf(kind);
  if (keeper) return keeperGroup(KEEPER_TOWERS[keeper]);
  return TOWER_GROUPS.find((g) => g.kinds.includes(kind)) ?? TOWER_GROUPS[0];
}

/**
 * Tower types. The build tabs (Damage / Control / Support) say what a tower is for;
 * the type says how it does damage, and decides which shared upgrades apply to it.
 */
export type TowerType = "cannon" | "precision" | "alchemy" | "creature" | "utility";

export const TOWER_TYPE: Record<TowerKind, TowerType> = {
  melon: "cannon",
  mortar: "cannon",
  fire: "cannon",
  freeze: "cannon",
  trebuchet: "cannon",
  quackliber: "cannon",
  geese: "utility",
  pamphlet: "utility",
  driver: "utility",
  lionblade: "precision",
  gourdgate: "utility",
  bombard: "cannon",
  spitter: "precision",
  ballista: "precision",
  reader: "precision",
  peeler: "precision",
  catalogue: "precision",
  scales: "precision",
  stomp: "utility",
  honey: "utility",
  still: "alchemy",
  ink: "alchemy",
  cauldron: "alchemy",
  flask: "alchemy",
  hive: "creature",
  bookworm: "creature",
  boomerang: "precision",
  orrery: "precision",
  plane: "precision",
  quill: "precision",
  globe: "precision",
  press: "cannon",
  organ: "utility",
  scope: "precision",
  mimic: "creature",
  copycat: "creature",
  bell: "utility",
  lantern: "utility",
  compost: "utility",
  lectern: "utility",
  desk: "utility",
};

export const TYPE_INFO: Record<TowerType, { name: string; blurb: string }> = {
  cannon: { name: "Cannon", blurb: "Barrels that fire a shot that flies and lands." },
  precision: { name: "Precision", blurb: "Aimed instruments: seeds, spears, scopes, blades." },
  alchemy: { name: "Alchemy", blurb: "Puddles, ink and potions." },
  creature: { name: "Creature", blurb: "Things that bite: flies, worms, and Memec." },
  utility: { name: "Utility", blurb: "No damage. Only their own fittings and upgrades change them." },
};

/**
 * Which tower types each shared upgrade affects. Upgrades not listed here are economy
 * (Seed Cache, Overdue Fines) or belong to one cannon (CANNON_UPGRADES).
 */
export const UPGRADE_TARGETS: Partial<Record<UpgradeId, TowerType[]>> = {
  rapid: ["cannon", "precision"],
  caliber: ["cannon"],
  lamp: ["cannon", "precision"],
  juicy: ["cannon"],
  splatter: ["cannon"],
  electric: ["cannon"],
  // Puddle upgrades: the still and cauldron.
  sticky: ["alchemy"],
  vial: ["alchemy"],
  distill: ["alchemy"],
};

/**
 * The melon cannon is the plain gun: upgrades only make it hit harder, fire faster or reach farther.
 * These cannon upgrades add an effect (a burst, a chip, a spark), so they skip it.
 */
export const MELON_SKIPS: UpgradeId[] = ["juicy", "splatter", "electric"];

/** Shared upgrades that belong to one tower rather than a type (Prize Melons is the melon cannon's). */
export const UPGRADE_KIND: Partial<Record<UpgradeId, TowerKind>> = { bounce: "melon" };

/** Does upgrade `id` change tower `kind`? */
export function upgradeAffects(id: UpgradeId, kind: TowerKind) {
  if (CANNON_UPGRADES[kind] === id || UPGRADE_KIND[id] === kind) return true;
  if (kind === "melon" && MELON_SKIPS.includes(id)) return false;
  return UPGRADE_TARGETS[id]?.includes(TOWER_TYPE[kind]) ?? false;
}

/**
 * What an upgrade card says it reaches, in player words, as one short chip on its title row
 * ("Melon cannons", "Cannons and precision", "The ledger").
 */
export const UPGRADE_SCOPE: Record<UpgradeId, string> = {
  juicy: "Cannons, not melons",
  rapid: "Cannons and precision",
  seeds: "Seeds, once",
  sticky: "Puddles",
  bounce: "Melon cannons",
  electric: "Cannons, not melons",
  fines: "The ledger",
  caliber: "Cannons",
  lamp: "Cannons and precision",
  splatter: "Cannons, not melons",
  vial: "Puddles",
  distill: "Puddles",
  barbed: "Ballistas",
  footnotes: "Long Readers",
  stinging: "Fly Hives",
  blot: "Ink Wells",
  interest: "Compost Heaps",
};

/** The upgrades that are a keeper's own: the first pick only they are offered, and their later one. */
export const KEEPER_UPGRADES: Partial<Record<HeroId, UpgradeId[]>> = {
  mynxi: ["fines", "lamp"],
  michael: ["caliber", "splatter"],
  vael: ["vial", "distill"],
};

/** Is upgrade `id` the playing keeper's own card? */
export function isKeeperUpgrade(hero: HeroId | null, id: UpgradeId) {
  return hero != null && (KEEPER_UPGRADES[hero]?.includes(id) ?? false);
}

/** Short "affects" label for an upgrade card. */
export function upgradeTargetLabel(id: UpgradeId) {
  const own = UPGRADE_KIND[id] ?? (Object.keys(CANNON_UPGRADES) as TowerKind[]).find((k) => CANNON_UPGRADES[k] === id);
  if (own) return TOWERS[own].name;
  const types = UPGRADE_TARGETS[id];
  if (!types) return "Seeds";
  return types.map((t) => TYPE_INFO[t].name).join(", ");
}

/** The Heavy tab opens at this wave, or once you hold this many seeds in a night. */
export const HEAVY_WAVE = 6;
export const HEAVY_SEEDS = 200;

/** Cannons that never shoot. */
export const PASSIVE: TowerKind[] = ["lantern", "compost", "lectern", "desk"];

/**
 * What an aiming tower picks among the fruit in reach. Ties go to First, so a mode that can't tell
 * fruit apart behaves like today.
 */
export type TargetMode = "first" | "last" | "strong" | "weak" | "close" | "armour" | "boss" | "fresh";
export const TARGET_LABEL: Record<TargetMode, string> = {
  first: "First",
  last: "Last",
  strong: "Strongest",
  weak: "Weakest",
  close: "Closest",
  armour: "Armoured",
  boss: "Boss",
  fresh: "First, not affected",
};
/** One line on what each mode picks, for the aim menu. */
export const TARGET_HINT: Record<TargetMode, string> = {
  first: "The fruit furthest along the carpet.",
  last: "The fruit furthest back.",
  strong: "The most health right now.",
  weak: "The least health: finish them off.",
  close: "The nearest one to this tower.",
  armour: "Shelled, husked or damp fruit first.",
  boss: "Karl and the other bosses first, then the toughest.",
  fresh: "The front fruit that hasn't got its effect yet.",
};
/** Status towers: they put something on a fruit, so "fresh" (one that hasn't got it yet) comes first. */
const STATUS_MODES: TargetMode[] = ["fresh", "first", "last", "strong", "close"];
/** Snipers: one big hit, so the strong, the bosses and the armoured come first. */
const SNIPER_MODES: TargetMode[] = ["strong", "boss", "armour", "first", "weak"];
const PLAIN_MODES: TargetMode[] = ["first", "last", "strong", "weak", "close", "armour", "boss"];
const aims = (def: TargetMode, modes: TargetMode[]) => ({ default: def, modes });

/**
 * Each aiming tower's recommended mode (the best choice for typical play) and the modes the inspector
 * offers it. null: it doesn't aim, or it picks by its own rule (the Fly Hive at random, the Mimic Chest
 * the first fruit that isn't a boss, the Harvest Bombard the thickest crowd, the Instant Quackmission the
 * fruit furthest along that isn't already walking back), so there's nothing to choose.
 */
export const DEFAULT_TARGET: Record<TowerKind, { default: TargetMode; modes: TargetMode[] } | null> = {
  melon: aims("first", PLAIN_MODES),
  mortar: aims("first", PLAIN_MODES),
  still: aims("fresh", STATUS_MODES),
  fire: aims("fresh", STATUS_MODES),
  freeze: aims("fresh", STATUS_MODES),
  spitter: aims("first", PLAIN_MODES),
  ballista: aims("first", SNIPER_MODES),
  reader: aims("strong", SNIPER_MODES),
  bell: null,
  hive: null,
  lantern: null,
  ink: aims("fresh", STATUS_MODES),
  compost: null,
  peeler: aims("fresh", STATUS_MODES),
  bookworm: aims("fresh", STATUS_MODES),
  boomerang: aims("first", PLAIN_MODES),
  orrery: null,
  plane: aims("first", PLAIN_MODES),
  quill: aims("first", PLAIN_MODES),
  globe: aims("first", PLAIN_MODES),
  press: aims("first", PLAIN_MODES),
  organ: null,
  scope: aims("boss", SNIPER_MODES),
  catalogue: aims("first", PLAIN_MODES),
  desk: null,
  cauldron: aims("fresh", STATUS_MODES),
  flask: null,
  trebuchet: aims("first", PLAIN_MODES),
  scales: aims("strong", PLAIN_MODES),
  stomp: aims("first", PLAIN_MODES),
  honey: aims("fresh", STATUS_MODES),
  mimic: null,
  copycat: null,
  lectern: null,
  quackliber: aims("first", PLAIN_MODES),
  geese: null,
  lionblade: null,
  gourdgate: null,
  bombard: null,
  pamphlet: null,
  driver: null,
};

/** Whole-board range: more than the diagonal of the largest board (22 x 14 cells is about 1250 px). */
export const GLOBAL_RANGE = 1400;

export const TOWERS: Record<TowerKind, { name: string; blurb: string; cost: number; role: string }> = {
  melon: {
    name: "Melon cannon",
    blurb: "A heavy shot at whoever is furthest along the carpet. No tricks: it just hits hard.",
    cost: 60,
    role: "Damage",
  },
  mortar: {
    name: "Pumpkin mortar",
    blurb: "Slow lob. The splash covers whoever is standing close. Its blast shatters a fruit with two frost.",
    cost: 75,
    role: "Splash",
  },
  still: {
    name: "Still",
    blurb: "No shot. On a timer it leaves a slow puddle.",
    cost: 45,
    role: "Support",
  },
  fire: {
    name: "Fire cannon",
    blurb: "The hit leaves fire on the carpet. Standing in it burns. Burns a frosted fruit for a burst. Slowed fruit pass the fire on.",
    cost: 70,
    role: "Burn",
  },
  freeze: {
    name: "Freeze cannon",
    blurb: "The hit stops them cold, melon or otherwise. Then they thaw. Frost builds up: shatter it with an explosion, or burn it for a burst.",
    cost: 65,
    role: "Slow",
  },
  spitter: {
    name: "Seed Spitter",
    blurb: "Rapid fire, tiny seeds, short reach. Shreds corn. Shelled melons shrug it off. Its seeds drive stingers in deeper.",
    cost: 50,
    role: "Rapid",
  },
  ballista: {
    name: "Shelf Ballista",
    blurb: "A bookend spear that goes through the first four fruit in a straight line.",
    cost: 80,
    role: "Pierce",
  },
  reader: {
    name: "Long Reader",
    blurb: "Sees the whole board. One huge, slow shot at the toughest thing on the carpet.",
    cost: 95,
    role: "Sniper",
  },
  bell: {
    name: "Shush Bell",
    blurb: "Every few seconds: SHHH. Everything nearby stops. Husks cannot hear it.",
    cost: 70,
    role: "Stun",
  },
  hive: {
    name: "Fly Hive",
    blurb: "Fruit flies that find anything, anywhere on the board. Small bites, never miss. Each fly leaves a stinger that keeps biting.",
    cost: 65,
    role: "Homing",
  },
  press: {
    name: "Printing Press",
    blurb: "Presses a sheet that slides back up the carpet, hitting every fruit along a long stretch. Everything it touches is inked: your other cannons hit it harder for a while.",
    cost: 200,
    role: "Line + ink",
  },
  organ: {
    name: "Pipe Organ",
    blurb: "Plays a chord that hits every fruit in a wide circle and slows them. Every third chord is a crescendo that stops them for a moment. Husks don't hear the slow or the stop.",
    cost: 220,
    role: "Area + control",
  },
  scope: {
    name: "Brass Telescope",
    blurb: "Very long reach. Aims for Karl, then armoured fruit, then the toughest. Its shots pierce armour: shells, husks and damp count for nothing.",
    cost: 250,
    role: "Pierce",
  },
  lantern: {
    name: "Reading Lamp",
    blurb: "No shot. Cannons next to it see farther and fire faster.",
    cost: 60,
    role: "Boost",
  },
  ink: {
    name: "Ink Well",
    blurb: "Splashes ink. Marked fruit takes a quarter more damage from everything.",
    cost: 55,
    role: "Mark",
  },
  desk: {
    name: "Reserve Desk",
    blurb: "Mynxi's second. No shot; builds beside the carpet. Banks 8 seeds after each wave you survive; sell it, or win the night, to collect. A melon that walks past the desk eats the bank.",
    cost: 30,
    role: "Savings",
  },
  compost: {
    name: "Compost Heap",
    blurb: "No shot. Pays seeds at the end of every wave.",
    cost: 70,
    role: "Seeds",
  },
  peeler: {
    name: "Peeler",
    blurb: "Strips shells, husks and damp, so the other cannons hit them normally.",
    cost: 60,
    role: "Strip",
  },
  bookworm: {
    name: "Bookworm",
    blurb: "Burrows into pumpkins and Karl for heavy damage over time. Bored by the rest. Also burrows into anything with three stingers in it.",
    cost: 75,
    role: "Pumpkins",
  },
  boomerang: {
    name: "Boomerang Bookend",
    blurb: "Throws a bookend in a wide loop out to the lead fruit and back. Hits everything it passes, both ways.",
    cost: 70,
    role: "Loop",
  },
  orrery: {
    name: "Orrery",
    blurb: "Three brass planets circle it all night and smack any fruit they sweep through. Best on a corner.",
    cost: 80,
    role: "Orbit",
  },
  plane: {
    name: "Paper Plane",
    blurb: "Launches a paper plane that swoops in wide arcs for a few seconds, cutting through fruit as it turns.",
    cost: 85,
    role: "Glide",
  },
  quill: {
    name: "Serpent Quill",
    blurb: "Flicks an enchanted quill that writes a wavy line through the fruit: it snakes out and back across the carpet, hitting each fruit it crosses.",
    cost: 75,
    role: "Wave",
  },
  globe: {
    name: "Rolling Globe",
    blurb: "Lobs a library globe onto the carpet ahead of the lead fruit. It lands with a thud and rolls back toward the entrance, flattening everything in its way.",
    cost: 100,
    role: "Roll",
  },
  catalogue: {
    name: "Card Catalogue",
    blurb: "Mynxi's own. Long reach, and every shot is cross-referenced into two more fruit.",
    cost: 90,
    role: "Chain",
  },
  flask: {
    name: "Unstoppered",
    blurb: "Vael's second. A tipped flask that drips a slow puddle from where it stands. After each wave it may spill onto a neighbouring floor tile (1 in 3, up to four tiles), and every stretch of carpet a spill can reach is wet for the rest of the night: fire there burns 40% weaker and shorter, and every other puddle lasts half again as long. Selling it doesn't dry the carpet. Sells for a flat 35.",
    cost: 150,
    role: "Spill",
  },
  cauldron: {
    name: "Bubbling Cauldron",
    blurb: "Vael's own. Lobs a potion that leaves a green puddle: it slows and it eats. Its poison stacks, and it catches fire.",
    cost: 85,
    role: "Poison",
  },
  trebuchet: {
    name: "Dragonfire Trebuchet",
    blurb: "Sir Michael's own. A huge, slow lob of a pumpkin wrapped in blue dragonfire that knocks fruit back down the carpet.",
    cost: 110,
    role: "Knockback",
  },
  scales: {
    name: "Scales of Justice",
    blurb: "The Legal Elf's own. Weighs the heaviest fruit in reach and takes a share of its health. Kills pay a fee.",
    cost: 95,
    role: "Heavy hitter",
  },
  honey: {
    name: "Honeyed Heel",
    blurb: "The Legal Elf's third. A big bare foot dipped in honey steps onto the carpet just ahead of the fruit and leaves a sticky footprint. Anything that walks through gets honey on it and takes 25% more damage from everything for 4 s. No damage of its own.",
    cost: 75,
    role: "Sticky",
  },
  stomp: {
    name: "Foot of the Law",
    blurb: "The Legal Elf's second. A giant foot stamps the busiest stretch of carpet in reach: a little damage, and everything under it stops. Even husks feel this one.",
    cost: 85,
    role: "Stomp",
  },
  copycat: {
    name: "The Copycat",
    blurb: "Ooze Clues' second. Free, and it goes down once a wave. Blank until it sits right beside a shared tower (corners don't count). Then it becomes a copy, upgrades and all. A Melon, Mortar, Still, Fire or Freeze copy is one step harder. A heavy cannon copy hits for 75%. It can't copy keeper towers or helpers.",
    cost: 0,
    role: "Copy",
  },
  mimic: {
    name: "Mimic Chest",
    blurb: "Ooze's friend Memec. Swallows a nearby fruit whole, then digests. Karl only loses a bite.",
    cost: 100,
    role: "Devour",
  },
  lectern: {
    name: "History Lectern",
    blurb: "The Doctor's own. No shot, and it helps no cannon. After each wave it notes which fruit got furthest along the carpet; next wave that kind walks slower. If nothing got far, it has nothing to add.",
    cost: 50,
    role: "Study",
  },
  quackliber: {
    name: "Quack-Liber",
    blurb: "Quackarot's own. A two-barrel backpack turret that charges up and fires glowing ki blasts: they burst over a small area and daze what they hit. Its power-up aura makes every other tower within three tiles fire 15% faster while it stands.",
    cost: 95,
    role: "Ki blasts",
  },
  pamphlet: {
    name: "The Post",
    blurb: "Quackarot's third. One bad take, and everything on the straight beside it gets ratioed. When the front fruit reaches that straight's corner with at least one more still on it, every fruit on the straight takes one big hit. Then it waits for the next group. Fruit that already turned the corner are safe.",
    cost: 70,
    role: "Line blast",
  },
  driver: {
    name: "Instant Quackmission",
    blurb: "Quackarot's fourth. Two feathers to the forehead: every 4 s the fruit furthest along in reach blinks and walks back the way it came for 2.5 s. Everything else keeps walking. Husks are steered too: this is not cold. Karl only turns for a moment. A fruit it has just turned can't be turned again for a few seconds.",
    cost: 50,
    role: "Blink back",
  },
  geese: {
    name: "Anti-Geese Protocol",
    blurb: "Quackarot's second. One use. It goes off on its own when fruit crowd into its ring or get near the door (or only when you press Engage, if you set it to Manual): every fruit within about two and a half tiles is thrown three tiles back down the carpet. Karl only takes the knock. Then it's gone, and it can be rebuilt after the wave. Geese are thrown twice as far, and panic.",

    cost: 60,
    role: "One shot",
  },
  gourdgate: {
    name: "The Dragon Gate",
    blurb: "Sir Michael's second, paid from his Hoard first. A gatehouse with a dragon's-head arch, built right beside the carpet. Every 4 s it slams its portcullis on the carpet next to it: nothing gets past for 3 s (Karl, 1 s; husks too), and its crossbows hit everything held there.",
    cost: 300,
    role: "Portcullis",
  },
  bombard: {
    name: "The Dragon's Roost",
    blurb: "Sir Michael's third, paid from his Hoard first. A great nest with a dragon egg in it. It grows with every wave it stands through: a Whelp after 2 (short blue breath), a Drake after 5 (a long burst), and a Great Dragon after 9 that strikes the biggest crowd anywhere on the board for 500, with 60% to everything near it, a one-tile shove (not Karl) and a burning patch. Feed it between waves to grow it faster.",
    cost: 200,
    role: "Dragon",
  },
  lionblade: {
    name: "Lion Blade",
    blurb: "Asser's own. A great longsword in a stone that sweeps every fruit in reach at once. When a stack is lost, it swings at once, and harder. After each wave it stands through, it puts 2 stacks back.",
    cost: 90,
    role: "Cleave",
  },
};

/**
 * Stat shape for the newer cannons, relative to a plain melon cannon:
 * dmg and pace multiply damage and time between shots; range multiplies reach (0 = whole board).
 */
const PROFILE: Partial<Record<TowerKind, { dmg: number; pace: number; range: number }>> = {
  spitter: { dmg: 0.35, pace: 0.3, range: 0.8 },
  ballista: { dmg: 1.6, pace: 2.1, range: 1.25 },
  reader: { dmg: 8, pace: 2.4, range: 0 },
  bell: { dmg: 0, pace: 4.4, range: 0.8 },
  hive: { dmg: 0.6, pace: 0.65, range: 0 },
  press: { dmg: 5, pace: 3.2, range: 1.1 },
  organ: { dmg: 4.2, pace: 2.8, range: 1.25 },
  scope: { dmg: 12, pace: 0.85, range: 3.2 },
  ink: { dmg: 0.3, pace: 1.2, range: 0.9 },
  peeler: { dmg: 0.6, pace: 1.1, range: 0.9 },
  bookworm: { dmg: 0.4, pace: 1.3, range: 1 },
  boomerang: { dmg: 0.8, pace: 1.45, range: 1.15 },
  // Orrery: range is the planets' orbit; pace sets how fast they spin.
  orrery: { dmg: 1.1, pace: 1, range: 0.62 },
  plane: { dmg: 0.85, pace: 2.5, range: 1.25 },
  // Serpent Quill: range is how far it aims; the quill itself writes on past the fruit (quillReach).
  quill: { dmg: 0.95, pace: 1.1, range: 1 },
  // Rolling Globe: slow, but every fruit on the carpet behind its landing spot is in the way.
  globe: { dmg: 1.5, pace: 3.4, range: 1.3 },
  catalogue: { dmg: 1.15, pace: 1.1, range: 1.4 },
  cauldron: { dmg: 0.5, pace: 1.7, range: 1.05 },
  trebuchet: { dmg: 1.5, pace: 2.8, range: 1.3 },
  scales: { dmg: 0.6, pace: 1.4, range: 1.15 },
  stomp: { dmg: 0.5, pace: 3.6, range: 1 },
  honey: { dmg: 0, pace: 3.6, range: 1.1 },
  mimic: { dmg: 0, pace: 4.5, range: 0.75 },
  quackliber: { dmg: 1.8, pace: 1.5, range: 1.1 },
  // Anti-Geese Protocol: range is the blast ring (about 2.5 tiles); it fires once, so pace doesn't matter.
  geese: { dmg: 0, pace: 1, range: 0.9 },
  // Lion Blade: a full-circle cleave about 1.5 tiles out (132 × 0.55 = 73 px), so it only works right by the carpet.
  lionblade: { dmg: 0.9, pace: 1.7, range: 0.55 },
  // Dragon Gate: dmg is its crossbows' damage per second to held fruit (140); pace sets a drop every 4 s; range just reaches the carpet beside it.
  gourdgate: { dmg: 10, pace: 4.45, range: 0.5 },
  // Dragon's Roost: the Great Dragon's numbers (500 a strike, every 3.34 s, whole board); younger stages take a share (DRAGON.roostStage).
  bombard: { dmg: 35.72, pace: 3.34, range: 0 },
  // Instant Quackmission: no damage, a plain melon's reach; its pace is CANNON.driverEvery.
  driver: { dmg: 0, pace: 1, range: 1 },
};

/** Tunable numbers for the newer cannons' special effects. */
/**
 * Vaelithra's sleeping draught. Her hits make fruit drowsy: a plain slow with no frost, so it never freezes
 * anything solid or sets up an ice combo. Fire wakes a fruit up; a shush or a crescendo keeps a drowsy fruit
 * stopped longer.
 */
export const DROWSY = {
  /** Seconds a hit keeps it drowsy (the Cold Hands perk stretches it), and its pace while drowsy. */
  time: 1.4,
  slow: 0.5,
  /** The third hit on a drowsy fruit puts it to sleep (stopped) this long, bosses `sleepBoss`; then it can't nod off again for `rest`. */
  sleepHits: 3,
  sleep: 1,
  sleepBoss: 0.3,
  rest: 2,
  /** Bosses shake it off sooner: this share of the time. */
  boss: 0.6,
  /** A Shush Bell or Organ crescendo stops a drowsy fruit this much longer. */
  stun: 1.5,
};

export const CANNON = {
  /** Melon cannon: its damage over the shared cannon base (14). It has no element, pulp or status, so it simply hits harder.
   * 2.9: tuned in the simulator to win what it did when its pulp slowed and burned (Normal + Hard: 61% before; 1.3 gave 28%, 2.6 53%, 3.0 63%). */
  melonDmg: 2.9,
  /** Prize Melons (card): melon cannon damage ×. Ripe core (back room): melon cannon damage ×. */
  prizeMelon: 1.3,
  ripeMelon: 1.2,
  bellStun: 0.9,
  /** Printing Press: how far a sheet slides (px), how fast, and the ink it leaves (damage taken ×, seconds). */
  pressSheet: 220,
  pressSpeed: 300,
  pressInk: 1.25,
  pressInkTime: 4,
  /** Pipe Organ: the slow every chord leaves (s), which chord is the crescendo, and how long that stops fruit (Karl: less). */
  organChill: 1.2,
  organEvery: 3,
  organStun: 1,
  organStunBoss: 0.35,
  bellStunBoss: 0.35,
  /** Foot of the Law: how wide the foot lands, and how long what it lands on stays put (Karl: less). */
  stompRadius: 54,
  /** Honeyed Heel: footprint size (px) and life (s), how many it keeps down at once, and what walking through does: extra damage taken (1.25 = +25%) for this long (s). */
  honeyRadius: 30,
  honeyLife: 7,
  honeyMax: 3,
  honeyAmp: 1.25,
  honeyTime: 4,
  stompStun: 1.1,
  stompStunBoss: 0.4,
  lanternRadius: 72,
  lanternRange: 1.15,
  lanternPace: 0.85,
  inkTime: 4,
  inkBonus: 1.25,
  compostSeeds: 15,
  /** Reserve Desk: seeds banked per wave survived, and how close a melon must come to eat the bank (px). */
  deskBank: 8,
  /** Unstoppered: chance to spill onto one more tile after each wave, the most tiles it can cover, and its flat sell price. */
  flaskSpillChance: 1 / 3,
  flaskMaxTiles: 4,
  flaskRefund: 35,
  /** Unstoppered wet carpet: fire damage and duration there (×), and how much longer other puddles last (×). */
  wetFire: 0.6,
  wetPuddle: 1.5,
  /** Vaelithra pays this much more for the first tower of each kind she places in a night. */
  vaelFirstPremium: 20,
  /** The Copycat: the "one step harder" each copy gets. Melon reach (px), mortar splash (px), still puddle
   * radius (px) and drip time (×), fire patch life (s), freeze hold (s). */
  mimicReach: 30,
  mimicSplash: 16,
  mimicPuddle: 12,
  mimicDrip: 0.75,
  mimicBurn: 1.2,
  mimicFreeze: 0.4,
  /** The Copycat: a copy of a heavy cannon (Press, Organ, Telescope) deals this share of the original's damage. */
  copyHeavyDmg: 0.75,
  deskReach: 60,
  wormDps: 26,
  wormTime: 4,
  /** Cannon upgrades. */
  /** Interval multiplier for a cannon whose cannon upgrade you own (0.75 = fires a third faster). */
  upgradePace: 0.75,
  readerUpgradePace: 0.6,
  inkUpgradePace: 0.5,
  /** Ink Blot: extra damage taken on every ink mark (on top of inkBonus). */
  blotInkBonus: 0.2,
  /** Extra seeds per Compost Heap payout with Interest. */
  interestBase: 20,
  barbedSlow: 1.5,
  /** Shelf Ballista: the spear goes through this many fruit on its line, nearest first (Through and through: `ballistaPierceMore` more). */
  ballistaPierce: 4,
  ballistaPierceMore: 3,
  blotRadius: 64,
  interestRate: 0.1,
  interestCap: 20,
  /** Keeper signature towers. */
  catalogueChains: 2,
  catalogueChainRatio: 0.7,
  cauldronRadius: 40,
  cauldronLife: 3,
  cauldronDps: 18,
  cauldronSlow: 0.55,
  trebuchetSplash: 64,
  /**
   * Anti-Geese Protocol (Quackarot's second): one blast, then it's gone. Every non-boss fruit in the
   * ring is shoved `geeseShove` px back down the carpet and takes `geeseDamage`. On Auto it fires when
   * `geeseCrowd` fruit are in the ring, or one is within the last three tiles before the door.
   */
  geeseShove: 3 * CELL,
  geeseDamage: 10,
  geeseCrowd: 4,
  /** Lion Blade: a rally swing (after a lost stack) hits this much harder; with Battle Scar, bladeScar. */
  bladeRally: 1.5,
  bladeScar: 2,
  /** Dragon Gate: how long the portcullis holds (Karl only gateBossHold), and how near it a fruit is held. */
  gateHold: 3,
  gateBossHold: 1,
  gateBand: 36,
  /** Dragon's Roost: splash radius and share of a breath, and the burning patch it leaves (see DRAGON.roostStage for each stage). */
  bombardRadius: 72,
  bombardSplashRatio: 0.6,
  bombardFireLife: 3,
  bombardFireBurn: 25,
  /** Instant Quackmission: seconds between buzzes, how long a fruit walks back, and Karl's (shorter) turn. */
  driverEvery: 4,
  driverTime: 2.5,
  driverKarl: 0.6,
  /** Seconds after a fruit turns back round before the Driver can take it again (or a lone fruit would rock back and forth forever). */
  driverImmune: 4,
  /** The Post (pamphlet): living fruit that must be on its straight (the one at the corner included) for it to go off. */
  pamphletCrowd: 2,
  /** The Post (pamphlet)'s hit, as a share of the plain cannon base of 14 (2: tuned in the simulator, so the 70 seeds pay back). */
  pamphletHit: 2,
  /** How far a Trebuchet shove moves a fruit back along the carpet: one tile (times Heavier Pumpkins). */
  trebuchetKnock: CELL,
  /** Scales of Justice: extra damage as a share of the target's max health (Karl takes the boss share). */
  scalesShare: 0.12,
  scalesBossShare: 0.04,
  scalesFee: 5,
  /** Mimic Chest: damage to Karl instead of swallowing him, and seeds found in what it eats. */
  mimicBossBite: 120,
  mimicLoot: 3,
  /** History Lectern: the ring it draws (it boosts nothing). */
  lecternRadius: 80,
  /** History Lectern: a fruit this far along the carpet (or leaked) gets noted; its kind walks at this speed next wave. */
  lectureAt: 0.75,
  lectureSlow: 0.75,
  /** Dr. Samodovol's false book: next combat his cannons deal (1 - this) damage and take (1 + this) time between shots. */
  /** Quack-Liber: ki blast burst radius (px) and share of the hit it deals there, and how long what it hits stays slowed (s). */
  quackSplash: 44,
  quackSplashRatio: 0.6,
  quackSlow: 0.6,
  /** Quack-Liber: towers within this reach (px) fire this much faster (1.15 = +15% attack speed). */
  quackAura: 144,
  quackHaste: 1.15,
  /** Quack-hameha: after a Quack-Liber kill, its aura is this much faster again for this long (s). */
  quackRally: 1.2,
  quackRallyTime: 2,
  /** Ground Pound: every this many rockets, a suppression patch of this radius (px) and life (s) on the carpet. */
  quackLockEvery: 4,
  quackLockRadius: 34,
  quackLockLife: 3,
  /** Blinded by the Light: fruit a ki blast hits are sticky (honey's damage taken) for this long (s). */
  quackCover: 2,
  /** Tag Team: fruit this close (px) to the line between two Quack-Libers walk at this speed. */
  quackLine: 22,
  quackLineSlow: 0.7,
  /**
   * Over Nine Thousand Quacks: once a night, the first time his stacks drop to this many or fewer, every tower
   * fires this much faster (1.5 = +50%) for this many seconds of combat (left over at a wave's end, it carries on
   * into the next). Tuned in the simulator: it comes late in a losing night, so even huge numbers move little.
   */
  overQuackAt: 6,
  overQuackHaste: 1.5,
  overQuackTime: 10,
  /** Trick shots. */
  boomerangTime: 1.2,
  /** How wide the loop is, as a share of the throw distance. */
  boomerangWidth: 0.42,
  orreryPlanets: 3,
  /** How far either side of the orbit (px) a planet can touch a fruit (its own size plus a fruit's), for showing its reach. */
  orreryReach: 30,
  /** Radians per second at the base pace. */
  orrerySpin: 2.8,
  /** Seconds before the same planet can hit the same fruit again. */
  orreryGap: 0.5,
  planeSpeed: 210,
  /** Radians per second the plane can turn: low, so it swoops in wide arcs. */
  planeTurn: 4,
  planeLife: 3.5,
  planeGap: 0.45,
  /** Serpent Quill: it flies this many times its range, at this speed (px/s), weaving this far (px) to each side every quillWavelength px. */
  quillReach: 1.6,
  quillSpeed: 240,
  quillWave: 30,
  quillWavelength: 110,
  /** Rolling Globe: seconds in the air, then how long and how fast (px/s) it rolls; the landing thud's radius (px). */
  globeLob: 0.6,
  globeRoll: 3.2,
  globeSpeed: 150,
  globeThud: 34,
};

/**
 * Trick cannons open with the playing keeper's level (read when the night starts). Each keeper
 * levels separately, so a new keeper starts with the Trick tab locked again.
 */
export const TRICK_LEVEL: Partial<Record<TowerKind, number>> = { boomerang: 2, orrery: 3, plane: 5, quill: 7, globe: 9 };

/**
 * What the next tower of `kind` costs. Mynxi's first build of the night is 40. Vaelithra pays
 * `CANNON.vaelFirstPremium` more for the first of each kind she places tonight (`builtKinds` lists
 * the kinds already placed this night; selling one doesn't take it off the list).
 */
export function buildCost(hero: HeroId | null, placed: number, kind: TowerKind, builtKinds: readonly TowerKind[] = []) {
  if (hero === "mynxi" && placed === 0) return 40;
  if (hero === "vael" && !builtKinds.includes(kind)) return TOWERS[kind].cost + CANNON.vaelFirstPremium;
  return TOWERS[kind].cost;
}

export function towerReadout(hero: HeroId | null, kind: TowerKind, mods: ModId[], upgradesOwned: UpgradeId[]): { dmg: number; range: number; interval: number } {
  // The Post (pamphlet) hits each fruit on its straight for a share of the plain cannon base (14, Heavy Caliber 22), and has no reach circle.
  // It stays on the base, not the melon cannon's own boost, so its tuned hit didn't move when melons got stronger.
  if (kind === "pamphlet") return { dmg: Math.round((14 + (upgradesOwned.includes("caliber") ? 8 : 0)) * CANNON.pamphletHit), range: 0, interval: 0 };
  // The Unstoppered drips like a Still from its own tile (its spills wet the carpet instead).
  if (kind === "flask") return towerReadout(hero, "still", mods, upgradesOwned);
  // The Copycat itself does nothing; the copy it makes uses the copied kind's numbers.
  if (kind === "copycat") return { dmg: 0, range: 0, interval: 0 };
  // Only the upgrades that affect this tower's type count.
  const upgrades = upgradesOwned.filter((id) => upgradeAffects(id, kind));
  const lamp = upgrades.includes("lamp");
  if (kind === "lantern") {
    return { dmg: 0, range: CANNON.lanternRadius + (mods.includes("wick") ? 30 : 0), interval: 0 };
  }
  if (kind === "compost") return { dmg: 0, range: 0, interval: 0 };
  if (kind === "desk") return { dmg: 0, range: CANNON.deskReach, interval: 0 };
  if (kind === "lectern") return { dmg: 0, range: CANNON.lecternRadius, interval: 0 };
  const profile = PROFILE[kind];
  if (profile) {
    const base = hero === "mynxi" ? 176 : 132;
    const far = mods.some((id) => id === "reach" || id === "loud" || id === "bigpipes");
    const range = profile.range === 0 ? GLOBAL_RANGE : Math.round(base * profile.range) + (lamp ? 32 : 0) + (far ? 28 : 0);
    let pace = profile.pace;
    if (mods.includes("haste")) pace *= 0.85;
    // A cannon upgrade also speeds up the cannon it belongs to.
    const own = CANNON_UPGRADES[kind];
    if (own && upgrades.includes(own))
      pace *= kind === "reader" ? CANNON.readerUpgradePace : kind === "ink" ? CANNON.inkUpgradePace : CANNON.upgradePace;
    const interval = (upgrades.includes("rapid") ? 0.62 : 0.9) * (upgrades.includes("caliber") ? 1.22 : 1) * pace;
    let dmg = 14;
    if (upgrades.includes("caliber")) dmg += 8;
    dmg = profile.dmg === 0 ? 0 : Math.max(1, Math.round(dmg * profile.dmg * (mods.includes("whetstone") ? 1.25 : 1)));
    // The Instant Quackmission buzzes on its own clock (card upgrades don't touch a utility tower anyway).
    if (kind === "driver") return { dmg: 0, range, interval: CANNON.driverEvery };
    return { dmg, range, interval };
  }
  const farther = mods.some((id) => id === "reach" || id === "arc" || id === "flare" || id === "coldreach");
  const range =
    (kind === "still" ? (hero === "mynxi" ? 118 : 96) + (lamp ? 20 : 0) : (hero === "mynxi" ? 176 : 132) + (lamp ? 32 : 0)) +
    (farther ? 28 : 0) +
    (kind === "melon" && mods.includes("mimicstep") ? CANNON.mimicReach : 0);
  let pace = kind === "mortar" ? 1.8 : kind === "fire" ? 1.15 : kind === "freeze" ? 1.25 : 1;
  if (mods.includes("haste")) pace *= 0.85;
  let interval = ((upgrades.includes("rapid") ? 0.62 : 0.9) * (upgrades.includes("caliber") ? 1.22 : 1)) * pace;
  if (kind === "still") interval = (mods.includes("drip") ? 1 : 1.45) * (mods.includes("mimicstep") ? CANNON.mimicDrip : 1);
  let dmg = 14;
  if (upgrades.includes("caliber")) dmg += 8;
  if (kind === "melon") dmg = Math.round(dmg * CANNON.melonDmg * (upgrades.includes("bounce") ? CANNON.prizeMelon : 1) * (mods.includes("ripe") ? CANNON.ripeMelon : 1));
  if (kind === "mortar") dmg = Math.round(dmg * 0.8);
  if (kind === "fire") dmg = Math.round(dmg * 0.65);
  if (kind === "freeze") dmg = Math.round(dmg * (mods.includes("brittle") ? 0.7 : 0.45));
  if (kind === "still") dmg = 0;
  return { dmg, range, interval };
}

export type ModId =
  | "reach"
  | "chill"
  | "ripe"
  | "haste"
  | "wide"
  | "heavy"
  | "arc"
  | "drip"
  /** Hidden: the step The Copycat adds to whatever it copies. Never sold in the back room. */
  | "mimicstep"
  | "longsheet"
  | "wetink"
  | "bigpipes"
  | "crescendo"
  | "spread"
  | "cling"
  | "lasting"
  | "hotter"
  | "flare"
  | "hold"
  | "brittle"
  | "coldreach"
  | "loud"
  | "swarm"
  | "wick"
  | "bright"
  | "indelible"
  | "loam"
  | "venom"
  | "whetstone"
  | "dressing"
  | "scar"
  | "deepfreeze"
  | "blackice"
  | "shrapnel"
  | "wildfire"
  | "barbs"
  | "virulent"
  | "grit"
  | "pierce";

export interface ModDef {
  id: ModId;
  name: string;
  blurb: string;
  kinds: TowerKind[];
}

export const MODS: ModDef[] = [
  { id: "reach", name: "Longer barrel", blurb: "Reaches farther down the carpet.", kinds: ["melon", "spitter", "ballista", "ink", "peeler", "bookworm", "boomerang", "orrery", "plane", "quill", "globe", "press", "scope"] },
  { id: "chill", name: "Cold rind", blurb: "Its shot frosts whatever it hits.", kinds: ["spitter"] },
  { id: "ripe", name: "Ripe core", blurb: "Heavier melons. Hits 20% harder.", kinds: ["melon"] },
  {
    id: "haste",
    name: "Quick wick",
    blurb: "Cycles a little faster.",
    kinds: ["melon", "spitter", "ballista", "reader", "bell", "hive", "ink", "peeler", "bookworm", "boomerang", "orrery", "plane", "quill", "globe", "press", "organ", "scope"],
  },
  { id: "loud", name: "Louder bell", blurb: "The shush carries farther.", kinds: ["bell"] },
  { id: "longsheet", name: "Broadsheet", blurb: "Each sheet slides half again as far.", kinds: ["press"] },
  { id: "wetink", name: "Wet ink", blurb: "The ink stays on twice as long.", kinds: ["press"] },
  { id: "bigpipes", name: "Bigger pipes", blurb: "The chord carries farther.", kinds: ["organ"] },
  { id: "crescendo", name: "Crescendo stop", blurb: "Every second chord is a crescendo, not every third.", kinds: ["organ"] },
  { id: "swarm", name: "Bigger swarm", blurb: "Two flies leave the hive each time.", kinds: ["hive"] },
  { id: "wick", name: "Longer wick", blurb: "The lamp lights more of the room.", kinds: ["lantern"] },
  { id: "bright", name: "Brighter flame", blurb: "Cannons in its light get a bigger boost.", kinds: ["lantern"] },
  { id: "indelible", name: "Indelible ink", blurb: "The mark lasts longer and stings more.", kinds: ["ink"] },
  { id: "loam", name: "Rich loam", blurb: "The heap pays half again as much.", kinds: ["compost"] },
  { id: "venom", name: "Hungrier worms", blurb: "The burrowing does half again as much damage.", kinds: ["bookworm"] },
  { id: "whetstone", name: "Whetstone", blurb: "The blade hits 25% harder.", kinds: ["lionblade"] },
  { id: "dressing", name: "Field Dressing", blurb: "It puts 3 stacks back after each wave instead of 2.", kinds: ["lionblade"] },
  { id: "scar", name: "Battle Scar", blurb: "A rally swing hits 100% harder instead of 50%.", kinds: ["lionblade"] },
  { id: "wide", name: "Wide lob", blurb: "The splash covers more of the fold.", kinds: ["mortar"] },
  { id: "heavy", name: "Heavy lob", blurb: "The splash bites harder.", kinds: ["mortar"] },
  { id: "arc", name: "High arc", blurb: "Lobs farther.", kinds: ["mortar"] },
  { id: "drip", name: "Fast drip", blurb: "The still leaves puddles sooner.", kinds: ["still", "flask"] },
  { id: "spread", name: "Broad bowl", blurb: "Each puddle covers more carpet.", kinds: ["still", "flask"] },
  { id: "cling", name: "Thick mix", blurb: "The puddle stays on the carpet longer.", kinds: ["still", "flask"] },
  { id: "lasting", name: "Banked fire", blurb: "The fire on the carpet burns longer.", kinds: ["fire"] },
  { id: "hotter", name: "Hotter fire", blurb: "Anything standing in the patch burns faster.", kinds: ["fire"] },
  { id: "flare", name: "Long flare", blurb: "Throws the fire farther.", kinds: ["fire"] },
  { id: "hold", name: "Deeper frost", blurb: "The freeze holds for another beat.", kinds: ["freeze"] },
  { id: "brittle", name: "Brittle ice", blurb: "The frozen shot hits harder.", kinds: ["freeze"] },
  { id: "coldreach", name: "Long chill", blurb: "Freezes farther down the carpet.", kinds: ["freeze"] },
  { id: "deepfreeze", name: "Deep Freeze", blurb: "Its hits add three frost instead of two.", kinds: ["freeze"] },
  { id: "blackice", name: "Black Ice", blurb: "A fruit with three frost takes 15% more from everything.", kinds: ["freeze"] },
  { id: "shrapnel", name: "Shrapnel", blurb: "A shattered fruit's ice shards fly half as far again.", kinds: ["freeze"] },
  { id: "wildfire", name: "Wildfire", blurb: "Fire spreads between slowed fruit twice as often.", kinds: ["fire"] },
  { id: "barbs", name: "Barbed stingers", blurb: "Its stingers stay in for 5 seconds instead of 3.", kinds: ["hive"] },
  { id: "virulent", name: "Virulent", blurb: "Its poison stacks up to five times instead of three.", kinds: ["cauldron"] },
  { id: "grit", name: "Grit", blurb: "A seed drives two stingers deeper instead of one.", kinds: ["spitter"] },
  { id: "pierce", name: "Through and through", blurb: "The spear goes through 3 more fruit.", kinds: ["ballista"] },
];

/**
 * The back room's price for the next upgrade to one tower kind: 40, then 30 more for each upgrade
 * that kind already has. Other kinds' upgrades don't raise it. Mynxi's very first upgrade of the
 * night is 15.
 */
export function shopPrice(hero: HeroId | null, owned: number, visits: number, extraOff = 0) {
  if (hero === "mynxi" && visits === 0) return 15;
  // Vaelithra's formula is cheaper and climbs slower: 25, then 15 more per upgrade the kind has.
  if (hero === "vael") return Math.round((25 + owned * 15) * (1 - extraOff));
  const price = 40 + owned * 30;
  // The Legal Elf negotiates: the back room costs 30% less (more with his Hard Bargain perk).
  const rate = (hero === "elf" ? 0.7 : 1) - extraOff;
  return rate === 1 ? price : Math.round(price * rate);
}

/** The back-room upgrades a tower kind can have (the Copycat's hidden step is never one). */
/**
 * The shared reach and pace fittings ("reach", "haste") are named for what each tower is: an Orrery has no
 * barrel and a bell no wick. Same numbers everywhere; only the name and the line change.
 */
export const FITTING_NAMES: Partial<Record<TowerKind, Partial<Record<ModId, { name: string; blurb: string }>>>> = {
  melon: { haste: { name: "Oiled breech", blurb: "Loads a little faster." } },
  spitter: { reach: { name: "Long straw", blurb: "Spits farther down the carpet." }, haste: { name: "Deep breath", blurb: "Spits a little faster." } },
  ballista: { reach: { name: "Taut string", blurb: "Throws farther down the carpet." }, haste: { name: "Ratchet winch", blurb: "Winds back a little faster." } },
  reader: { haste: { name: "Speed reading", blurb: "Reads a little faster." } },
  bell: { haste: { name: "Lighter clapper", blurb: "Rings a little more often." } },
  hive: { haste: { name: "Queen bee", blurb: "Flies leave a little more often." } },
  ink: { reach: { name: "Long nib", blurb: "Marks farther down the carpet." }, haste: { name: "Fresh pot", blurb: "Marks a little more often." } },
  peeler: { reach: { name: "Long handle", blurb: "Peels farther down the carpet." }, haste: { name: "Sharp blade", blurb: "Peels a little faster." } },
  bookworm: { reach: { name: "Deep tunnels", blurb: "Burrows farther down the carpet." }, haste: { name: "Brood", blurb: "Sends worms a little more often." } },
  boomerang: { reach: { name: "Wider throw", blurb: "The bookend flies farther out." }, haste: { name: "Quick catch", blurb: "Throws again a little sooner." } },
  orrery: { reach: { name: "Wider orbit", blurb: "The planets circle farther out." }, haste: { name: "Spin faster", blurb: "The planets go round a little faster." } },
  plane: { reach: { name: "Longer wings", blurb: "Glides farther down the carpet." }, haste: { name: "Fold faster", blurb: "Launches a little more often." } },
  quill: { reach: { name: "Long stroke", blurb: "The line runs farther." }, haste: { name: "Quick hand", blurb: "Writes a little faster." } },
  globe: { reach: { name: "Heavier globe", blurb: "Lands farther down the carpet." }, haste: { name: "Quick spin", blurb: "Rolls one out a little sooner." } },
  press: { reach: { name: "Wide bed", blurb: "Prints farther down the carpet." }, haste: { name: "Steam press", blurb: "Prints a little faster." } },
  organ: { haste: { name: "Bellows", blurb: "Plays a little more often." } },
  scope: { reach: { name: "Long lens", blurb: "Sees farther down the carpet." }, haste: { name: "Steady hand", blurb: "Fires a little faster." } },
};

/** How many fruit a Shelf Ballista's spear goes through, with these fittings. */
export function ballistaPierce(mods: readonly ModId[]) {
  return CANNON.ballistaPierce + (mods.includes("pierce") ? CANNON.ballistaPierceMore : 0);
}

/** A fitting as `kind` calls it (its own name for the shared reach and pace fittings). */
export function fittingName(kind: TowerKind, id: ModId): string {
  return FITTING_NAMES[kind]?.[id]?.name ?? MODS.find((m) => m.id === id)?.name ?? id;
}

/**
 * What a back-room fitting does, with its numbers, for the back room's hover card. Reach and pace changes are
 * also shown there as before → after from the tower's own stats, so these lines say the rest.
 */
export function fittingDetail(kind: TowerKind, id: ModId): string {
  const tiles = (px: number) => `${+(px / CELL).toFixed(1)} tile${px === CELL ? "" : "s"}`;
  const reach = `${tiles(28)} more reach.`;
  switch (id) {
    case "reach":
      return kind === "orrery" ? `The planets circle ${tiles(28)} farther out.` : reach;
    case "haste":
      return "15% less time between shots.";
    case "ripe":
      return `Each melon hits ${Math.round((CANNON.ripeMelon - 1) * 100)}% harder. No element, no effect: just a heavier shot.`;
    case "chill":
      return COMBO.on
        ? "Every hit adds one frost: one frost slows a fruit to 80%, two to 55%, three freezes it solid."
        : "Every hit slows the fruit to about 62% speed for 0.75 seconds.";
    case "loud":
      return `The shush reaches ${tiles(28)} farther.`;
    case "bigpipes":
      return `The chord reaches ${tiles(28)} farther.`;
    case "longsheet":
      return `Each sheet slides ${tiles(CANNON.pressSheet * 1.5)} instead of ${tiles(CANNON.pressSheet)}.`;
    case "wetink":
      return `The sheet's ink stays on a fruit for ${CANNON.pressInkTime * 2} seconds instead of ${CANNON.pressInkTime}.`;
    case "crescendo":
      return `Every 2nd chord is a crescendo instead of every ${CANNON.organEvery === 3 ? "3rd" : `${CANNON.organEvery}th`}.`;
    case "swarm":
      return "Two flies leave the hive each time instead of one.";
    case "wick":
      return `The lamp's light reaches ${tiles(CANNON.lanternRadius + 30)} instead of ${tiles(CANNON.lanternRadius)}.`;
    case "bright":
      return `Cannons in its light reach 25% farther and wait 22% less between shots (instead of ${Math.round((CANNON.lanternRange - 1) * 100)}% and ${Math.round((1 - CANNON.lanternPace) * 100)}%).`;
    case "indelible":
      return `The mark lasts ${CANNON.inkTime * 1.5} seconds instead of ${CANNON.inkTime}, and a marked fruit takes ${Math.round((CANNON.inkBonus + 0.1 - 1) * 100)}% more damage instead of ${Math.round((CANNON.inkBonus - 1) * 100)}%.`;
    case "loam":
      return `The heap pays ${Math.round(CANNON.compostSeeds * 1.5)} seeds instead of ${CANNON.compostSeeds}.`;
    case "venom":
      return `The worms burrow for ${Math.round(CANNON.wormDps * 1.5)} damage a second instead of ${CANNON.wormDps}.`;
    case "whetstone":
      return "Every swing hits 25% harder, rally swings included.";
    case "dressing":
      return "It puts 3 stacks back after each wave it stood through, instead of 2.";
    case "scar":
      return `A rally swing (after you lose a stack) hits ${Math.round((CANNON.bladeScar - 1) * 100)}% harder instead of ${Math.round((CANNON.bladeRally - 1) * 100)}%.`;
    case "wide":
      return `The splash reaches ${tiles(64)} from where it lands instead of ${tiles(46)}.`;
    case "heavy":
      return "Fruit caught in the splash take 80% of the shot instead of 55%.";
    case "arc":
      return `Lobs ${tiles(28)} farther.`;
    case "flare":
      return `Throws the fire ${tiles(28)} farther.`;
    case "coldreach":
      return `Freezes ${tiles(28)} farther down the carpet.`;
    case "drip":
      return "A puddle every 1 second instead of every 1.45.";
    case "spread":
      return `Each puddle reaches ${tiles(16)} farther across.`;
    case "cling":
      return "Each puddle lasts 1.2 seconds longer.";
    case "lasting":
      return "The fire patch burns for 3.6 seconds instead of 2.4.";
    case "hotter":
      return "The fire patch burns for 34 damage a second instead of 22.";
    case "hold":
      return "The freeze holds a fruit 0.55 seconds longer.";
    case "brittle":
      return "The frozen shot hits for 70% of a cannon shot instead of 45%.";
    case "deepfreeze":
      return `Each hit adds ${COMBO.deepFreezeHit} frost instead of ${COMBO.freezeHit}, so one hit freezes a fruit solid.`;
    case "blackice":
      return `A fruit with ${COMBO.frostMax} frost takes ${Math.round((COMBO.blackIce - 1) * 100)}% more damage from everything.`;
    case "shrapnel":
      return `A shattered fruit's ice shards fly ${tiles(COMBO.shardRadius * COMBO.shrapnelWide)} instead of ${tiles(COMBO.shardRadius)}.`;
    case "wildfire":
      return "A burning, slowed fruit sets a neighbour alight every half second instead of every second.";
    case "barbs":
      return `Stingers stay in for ${AFFLICT.barbsTime} seconds instead of ${AFFLICT.stingTime}.`;
    case "virulent":
      return `Poison stacks up to ${AFFLICT.virulentMax} times instead of ${AFFLICT.poisonMax}.`;
    case "grit":
      return `A seed drives ${AFFLICT.gritStacks} stingers deeper into a stung fruit instead of ${AFFLICT.seedStacks}.`;
    case "pierce":
      return `The spear goes through ${CANNON.ballistaPierce + CANNON.ballistaPierceMore} fruit instead of ${CANNON.ballistaPierce}.`;
    default:
      return MODS.find((m) => m.id === id)?.blurb ?? "";
  }
}

/** The back-room fittings a kind takes, named as that kind calls them. */
export function fittingsFor(kind: TowerKind): ModDef[] {
  return MODS.filter((m) => m.kinds.includes(kind)).map((m) => {
    const own = FITTING_NAMES[kind]?.[m.id];
    return own ? { ...m, ...own } : m;
  });
}

/** Share of spent seeds returned when a tower is sold. */
export const SELL_PERCENT = 70;

/** What selling a tower returns: 70% of what it cost to build. The Unstoppered is a flat 35, however far it spilled. */
export function refundFor(kind: TowerKind, paid: number) {
  if (kind === "flask") return CANNON.flaskRefund;
  return sellValue(paid);
}

export function sellValue(paid: number) {
  return Math.round((paid * SELL_PERCENT) / 100); // integer math: 45 * 0.7 would round to 31
}

export type MapId =
  | "stacks"
  | "annex"
  | "mezzanine"
  | "rarebooks"
  | "archive"
  | "greathall"
  | "readingroom"
  | "sorting"
  | "greenhouse"
  | "belltower"
  | "overflow"
  | "courtyard"
  | "rotunda";

/** A board with more than one way in: each door's carpet runs to where it joins the board's own carpet (the trunk). */
export type DoorId = "north" | "west" | "stairs";
export interface Door {
  id: DoorId;
  /** From the door to the trunk corner it joins (that corner is the last point). */
  corners: Array<[number, number]>;
  /** The first wave (1-based) the door is open; open from the start if unset. */
  from?: number;
}
export const DOOR_NAME: Record<DoorId, string> = { north: "North door", west: "West door", stairs: "Back stairs" };
export const DOOR_LETTER: Record<DoorId, string> = { north: "N", west: "W", stairs: "S" };

/**
 * Floors that change the carpet: a belt carries fruit faster the way the carpet runs (and holds
 * back anything walking the other way), stairs are slow going up and fast coming down, and a
 * growth bed heals fruit standing on it (not while they burn).
 */
export type FloorKind = "belt" | "up" | "down" | "bed";
export interface FloorRun {
  kind: FloorKind;
  /** A straight run of carpet tiles, both ends included, listed in the carpet's own direction. */
  from: [number, number];
  to: [number, number];
}
/** Floor numbers (tune with the simulator). */
export const FLOOR = {
  /** Speed on a belt (the carpet's way); walking against it is 1 / this. */
  belt: 1.6,
  /** Speed going up stairs, and coming down (walking back up or down reverses them). */
  up: 0.7,
  down: 1.4,
  /** A growth bed heals this share of a fruit's health each second. */
  bedHeal: 0.05,
  /** The Bell Tower: seconds into each wave between strikes, how long the towers stay quiet, and the warning. */
  bellEvery: 24,
  bellQuiet: 2.5,
  bellWarn: 3,
};
/** One floor tile: what it is and which way the carpet runs across it. */
export interface FloorTile {
  kind: FloorKind;
  dc: number;
  dr: number;
}
/** A board's floor tiles by "c,r". */
export function floorTiles(map: MapId): Map<string, FloorTile> {
  const out = new Map<string, FloorTile>();
  for (const run of BOARDS[map].floors ?? []) {
    if (run.from[0] !== run.to[0] && run.from[1] !== run.to[1]) throw new Error(`${map}: a ${run.kind} floor has to run straight, not diagonally`);
    const dc = Math.sign(run.to[0] - run.from[0]);
    const dr = Math.sign(run.to[1] - run.from[1]);
    let [c, r] = run.from;
    for (;;) {
      out.set(`${c},${r}`, { kind: run.kind, dc, dr });
      if (c === run.to[0] && r === run.to[1]) break;
      c += dc;
      r += dr;
    }
  }
  return out;
}
/** How a floor tile changes a fruit's pace: `back` = walking toward the entrance. Beds don't. */
export function floorPace(kind: FloorKind | undefined, back: boolean) {
  const fwd = kind === "belt" ? FLOOR.belt : kind === "up" ? FLOOR.up : kind === "down" ? FLOOR.down : 1;
  return back ? 1 / fwd : fwd;
}
export type NightId = "midnight" | "overflow" | "siege" | "endless";

export interface Board {
  id: MapId;
  name: string;
  blurb: string;
  corners: Array<[number, number]>;
  /** A floor tile kept open on every board (no shelf). It was Sir Michael's free cannon spot; he has no free cannon now. */
  michaelCannon: [number, number];
  /** Dark room: cannons lose range unless a Reading Lamp reaches them. */
  dark?: boolean;
  /** Enemy health multiplier on this map (1 if unset). */
  hp?: number;
  /**
   * Fewer fruit on some difficulties: from wave `from` (1-based), every group of two or more has its count ×
   * `count` (rounded, at least 1). Bosses and single fruit are untouched. See `trimSpawns`.
   */
  trim?: Partial<Record<Difficulty, { from: number; count: number }>>;
  /** Slower fruit on some difficulties: their speed × this, on every wave (bosses too). Unlike `trim`, it costs no seeds. */
  pace?: Partial<Record<Difficulty, number>>;
  /** Board size in cells (default COLS x ROWS). Bigger boards draw smaller so they still fit the screen. */
  cols?: number;
  rows?: number;
  /** Bookshelf cells: cannons can't be built on them (default: the classic layout). */
  shelves?: Array<[number, number]>;
  /** Belts, stairs and growth beds on the carpet (see FloorKind). */
  floors?: FloorRun[];
  /** Damp air: burning does 45% less (as on the Overflow). */
  damp?: boolean;
  /** The Bell Tower's bell: its top-left cell (it fills a 2×2 block of shelf cells). It strikes during waves and every tower goes quiet. */
  bell?: [number, number];
  /** The room's own fruit, swapped into the ordinary waves (see NATIVES). */
  natives?: { common: NativeId; elite: NativeId };
  /** How the carpet draws: "tiles" (square tiles and corner pieces, the default) or "path" (one band with rounded turns). */
  carpet?: "tiles" | "path";
  /** The Siege: carpet tiles where paratrooper cats land (see SIEGE). Each glows before a wave that uses it. */
  drops?: Array<[number, number]>;
  /** The Courtyard's dry fountain: its top-left cell (it fills a 2×2 block of shelf cells, like the bell). */
  fountain?: [number, number];
  /** The Courtyard's statues (shelf cells drawn as statues; its other shelf cells are hedges). */
  statues?: Array<[number, number]>;
  /**
   * More than one way in (the Rotunda): each door's carpet joins `corners` (the trunk) at one of its corners.
   * Each door is a route of its own: its carpet, then the trunk from the join on. The first door is the one
   * bosses use. Without doors the board has one route, `corners`.
   */
  doors?: Door[];
  /** The Rotunda's desk, drawn where the first doors' carpets meet (a cell on the carpet; decoration only). */
  desk?: [number, number];
}

/** The classic bookshelf layout, used by boards that don't list their own. */
export const DEFAULT_SHELVES: Array<[number, number]> = [
  [1, 1],
  [2, 1],
  [3, 1],
  [8, 0],
  [9, 0],
  [10, 0],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [13, 1],
  [14, 1],
  [8, 8],
  [9, 8],
  [13, 4],
  [14, 4],
  [0, 2],
  [1, 2],
];

/**
 * The bookshelf cells on a board, as "c,r" keys. Cannons can't go there. A shelf listed on the
 * carpet, outside the board, or on the kept-open `michaelCannon` tile is left out.
 */
export function shelfCells(map: MapId, path: Set<string>, verge: Set<string> = new Set()): Set<string> {
  const b = BOARDS[map];
  const { cols, rows } = boardSize(map);
  const fixed = new Set([b.michaelCannon].map(([c, r]) => `${c},${r}`));
  const out = new Set<string>();
  for (const [c, r] of b.shelves ?? DEFAULT_SHELVES) {
    const key = `${c},${r}`;
    if (c < 0 || r < 0 || c >= cols || r >= rows || path.has(key) || verge.has(key) || fixed.has(key)) continue;
    out.add(key);
  }
  return out;
}

/** What the game says when you try to build on a verge (a tile a diagonal stretch of carpet half-covers). */
export const VERGE_NOTE = "Too close to the carpet.";

/** Whether tile (c, r) shares an edge with the carpet or with a verge tile beside a diagonal. */
export function besideCarpet(world: { pathCells: Set<string>; vergeCells?: Set<string> }, c: number, r: number) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
    const key = `${c + a},${r + b}`;
    return world.pathCells.has(key) || Boolean(world.vergeCells?.has(key));
  });
}

/** A board's size in cells and in world pixels. */
export function boardSize(map: MapId) {
  const b = BOARDS[map];
  const cols = b.cols ?? COLS;
  const rows = b.rows ?? ROWS;
  return { cols, rows, w: cols * CELL, h: rows * CELL };
}

export const BOARDS: Record<MapId, Board> = {
  stacks: {
    id: "stacks",
    name: "The Stacks",
    blurb: "One carpet, four turns, and the door on the right.",
    corners: [
      [0, 5],
      [6, 5],
      [6, 2],
      [12, 2],
      [12, 7],
      [15, 7],
    ],
    michaelCannon: [3, 6],
  },
  annex: {
    id: "annex",
    name: "The Annex",
    blurb: "The carpet folds. A cannon in a pocket covers two stretches.",
    corners: [
      [0, 7],
      [4, 7],
      [4, 4],
      [8, 4],
      [8, 1],
      [12, 1],
      [12, 5],
      [15, 5],
    ],
    michaelCannon: [2, 5],
  },
  mezzanine: {
    id: "mezzanine",
    name: "The Mezzanine",
    blurb: "Along the balcony, down the stairs, back along the floor. Lots of room in the middle.",
    corners: [
      [0, 1],
      [13, 1],
      [13, 7],
      [1, 7],
    ],
    michaelCannon: [3, 2],
  },
  rarebooks: {
    id: "rarebooks",
    name: "Rare Books",
    blurb: "The carpet spirals in to a door in the middle. First-edition fruit: 25% tougher.",
    corners: [
      [0, 1],
      [11, 1],
      [11, 7],
      [4, 7],
      [4, 4],
      [8, 4],
    ],
    michaelCannon: [2, 2],
    hp: 1.25,
  },
  archive: {
    id: "archive",
    name: "The Archive",
    blurb: "Lights out. Cannons see 20% less far unless a Reading Lamp is close.",
    corners: [
      [0, 4],
      [4, 4],
      [4, 1],
      [9, 1],
      [9, 7],
      [13, 7],
      [13, 3],
      [15, 3],
    ],
    michaelCannon: [2, 5],
    dark: true,
  },
  greathall: {
    id: "greathall",
    name: "The Great Hall",
    blurb: "A big room and a long carpet that snakes up and down it. Fruit have 20% more health.",
    cols: 22,
    rows: 14,
    // The long carpet gives towers far more time; tougher fruit keep it close to the Stacks.
    hp: 1.2,
    corners: [
      [0, 2],
      [5, 2],
      [5, 6],
      [2, 6],
      [2, 11],
      [9, 11],
      [9, 4],
      [13, 4],
      [13, 11],
      [17, 11],
      [17, 2],
      [21, 2],
    ],
    michaelCannon: [4, 9],
    shelves: [
      [0, 0], [1, 0], [2, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [19, 0], [20, 0],
      [0, 13], [1, 13], [5, 13], [6, 13], [7, 13], [11, 13], [12, 13], [15, 13], [16, 13], [20, 13],
      [7, 2], [11, 2], [15, 5], [19, 6], [20, 6], [19, 9], [20, 9], [0, 8], [0, 9],
    ],
  },
  readingroom: {
    id: "readingroom",
    name: "The Reading Room",
    blurb: "Three long lanes between the tables. A cannon between two covers both. Fruit have 40% more health.",
    cols: 22,
    rows: 14,
    // Cannons between lanes hit fruit twice; tougher fruit keep it close to the Stacks.
    hp: 1.4,
    corners: [
      [0, 2],
      [19, 2],
      [19, 6],
      [2, 6],
      [2, 10],
      [21, 10],
    ],
    michaelCannon: [5, 8],
    shelves: [
      [1, 0], [2, 0], [3, 0], [7, 0], [8, 0], [9, 0], [13, 0], [14, 0], [15, 0], [20, 0],
      [0, 13], [1, 13], [5, 13], [6, 13], [7, 13], [12, 13], [13, 13], [14, 13], [19, 13], [20, 13],
      [21, 4], [21, 5], [0, 7], [0, 8], [7, 4], [13, 4], [7, 8], [13, 8], [21, 12],
    ],
  },
  sorting: {
    id: "sorting",
    name: "The Sorting Room",
    blurb: "Book-return belts run along the carpet: fruit ride them 60% faster. Three long columns, and no time to waste.",
    cols: 22,
    rows: 14,
    // Half the carpet is belt, so fruit cross it fast: weaker fruit keep it about as hard as the Stacks (tuned with the simulator).
    hp: 0.8,
    carpet: "path",
    corners: [
      [0, 3],
      [6, 3],
      [6, 10],
      [11, 10],
      [11, 3],
      [16, 3],
      [16, 10],
      [21, 10],
    ],
    floors: [
      { kind: "belt", from: [6, 4], to: [6, 9] },
      { kind: "belt", from: [11, 9], to: [11, 4] },
      { kind: "belt", from: [16, 4], to: [16, 9] },
    ],
    michaelCannon: [3, 7],
    natives: { common: "express", elite: "parcel" },
    // Sorting cages and mail sacks, mostly along the walls.
    shelves: [
      [1, 0], [2, 0], [3, 0], [7, 1], [8, 0], [9, 0], [12, 1], [13, 0], [14, 0], [18, 0], [19, 0], [20, 0],
      [0, 13], [1, 13], [4, 13], [5, 13], [9, 13], [10, 13], [14, 13], [15, 13], [19, 13], [20, 13], [0, 6], [0, 7],
      [0, 8], [21, 5], [21, 6], [21, 7], [8, 7], [9, 7], [13, 6], [14, 6], [18, 6], [19, 6], [2, 10], [3, 10],
    ],
  },
  greenhouse: {
    id: "greenhouse",
    name: "The Greenhouse",
    blurb: "Where the fruit grow. Growth beds heal anything standing in them, unless it's burning. The air is damp: fire burns 45% less.",
    cols: 22,
    rows: 14,
    // Nine bed tiles on a long walk heal a lot: slightly weaker fruit keep it about as hard as the Stacks (tuned with the simulator).
    hp: 0.85,
    // Story: three-quarters of the fruit from wave 9 (the beds made it the hardest room on Story, 71%).
    trim: { easy: { from: 9, count: 0.75 } },
    damp: true,
    carpet: "path",
    // The middle drop is a garden path running diagonally.
    corners: [
      [0, 11],
      [4, 11],
      [4, 2],
      [10, 2],
      [10, 5],
      [13, 8],
      [15, 8],
      [15, 3],
      [19, 3],
      [19, 12],
      [21, 12],
    ],
    floors: [
      { kind: "bed", from: [6, 2], to: [8, 2] },
      { kind: "bed", from: [13, 8], to: [14, 8] },
      { kind: "bed", from: [19, 6], to: [19, 9] },
    ],
    michaelCannon: [2, 8],
    natives: { common: "sprout", elite: "squash" },
    // Planters and potting benches, mostly along the walls.
    shelves: [
      [0, 0], [1, 0], [2, 0], [6, 0], [7, 0], [8, 0], [12, 0], [13, 0], [17, 0], [18, 0], [20, 0], [21, 0],
      [0, 13], [1, 13], [2, 13], [7, 13], [8, 13], [9, 13], [13, 13], [14, 13], [15, 13], [0, 4], [0, 5], [0, 6],
      [21, 5], [21, 6], [21, 7], [21, 9], [7, 5], [7, 6], [12, 4], [13, 4], [12, 11], [13, 11], [17, 6], [17, 7],
    ],
  },
  belltower: {
    id: "belltower",
    name: "The Bell Tower",
    blurb: "Up the stairs (slow), round the bell, and down the stairs (fast). When the clock strikes, every tower stops for a moment.",
    cols: 22,
    rows: 14,
    // A long carpet, but the clock silences every tower: its own fruit and the diagonals make it harder, so slightly weaker fruit keep it about as hard as the Stacks (tuned with the simulator).
    hp: 0.9,
    carpet: "path",
    // The dip under the bell is a V, like a bell rope.
    corners: [
      [0, 12],
      [3, 12],
      [3, 1],
      [7, 1],
      [10, 4],
      [11, 4],
      [14, 1],
      [18, 1],
      [18, 12],
      [21, 12],
    ],
    floors: [
      { kind: "up", from: [3, 11], to: [3, 2] },
      { kind: "down", from: [18, 2], to: [18, 11] },
    ],
    bell: [10, 8],
    michaelCannon: [5, 11],
    natives: { common: "chimer", elite: "gargoyle" },
    // The bell's frame, oak beams and the walls either side of the stairs.
    shelves: [
      [10, 8], [11, 8], [10, 9], [11, 9], [0, 2], [0, 3], [0, 5], [0, 6], [0, 8], [0, 9], [21, 2], [21, 3],
      [21, 5], [21, 6], [21, 8], [21, 9], [1, 0], [2, 0], [10, 0], [11, 0], [20, 0], [21, 0], [5, 13], [6, 13],
      [9, 13], [10, 13], [11, 13], [12, 13], [15, 13], [16, 13], [5, 3], [16, 3], [5, 9], [16, 9], [7, 10], [14, 10],
    ],
  },
  overflow: {
    id: "overflow",
    name: "The Overflow",
    blurb: "A shorter, wetter carpet. The returns come up the chute.",
    corners: [
      [0, 2],
      [3, 2],
      [3, 5],
      [7, 5],
      [7, 8],
      [11, 8],
      [11, 4],
      [14, 4],
    ],
    michaelCannon: [1, 5],
  },
  courtyard: {
    id: "courtyard",
    name: "The Courtyard",
    blurb: "The library's back courtyard: flagstones, hedges and a dry fountain, with the carpet runner laid across it to the back door. Geese and cats, no fruit.",
    cols: 22,
    rows: 14,
    // Story walks at 80% (fewer animals cost seeds and made the finale harder); Normal has fewer from wave 6. Was Story 82%, Normal 53%.
    pace: { easy: 0.8 },
    trim: { normal: { from: 6, count: 0.85 } },
    carpet: "path",
    // In past the hedges, down and back up beside the fountain, along the top and down to the back door. Two garden paths run at 45°.
    corners: [
      [0, 2],
      [5, 2],
      [5, 12],
      [8, 12],
      [8, 5],
      [11, 2],
      [15, 2],
      [15, 9],
      [18, 12],
      [21, 12],
    ],
    // Paratroopers land on these, partway along: the climb beside the fountain, and the long drop on the right.
    drops: [
      [8, 8],
      [15, 5],
    ],
    fountain: [10, 7],
    statues: [[2, 4], [12, 4], [19, 6], [12, 10], [3, 10], [19, 2]],
    michaelCannon: [3, 6],
    // Hedges along the walls, six statues, and the fountain in the middle: about 15% of the floor.
    shelves: [
      [0, 0], [1, 0], [2, 0], [3, 0], [7, 0], [8, 0], [9, 0], [13, 0], [14, 0], [18, 0], [19, 0], [20, 0], [21, 0],
      [0, 13], [1, 13], [2, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [0, 6], [0, 7], [0, 8], [0, 9],
      [21, 4], [21, 5], [21, 6], [21, 8], [21, 9], [2, 4], [12, 4], [19, 6], [12, 10], [3, 10], [19, 2],
      [10, 7], [11, 7], [10, 8], [11, 8],
    ],
  },
  rotunda: {
    id: "rotunda",
    name: "The Rotunda",
    blurb: "A round room with doors on every side. Two carpets meet at the desk; later, the back stairs open.",
    cols: 18,
    rows: 12,
    // Splitting a wave over two doors makes it harder than one carpet (tuned with the simulator).
    hp: 0.9,
    // The trunk: from the desk down, along, up the right-hand side and out of the east door.
    corners: [
      [10, 8],
      [10, 10],
      [14, 10],
      [14, 3],
      [17, 3],
    ],
    doors: [
      { id: "north", corners: [[5, 0], [5, 4], [10, 4], [10, 8]] },
      { id: "west", corners: [[0, 8], [10, 8]] },
      { id: "stairs", corners: [[2, 11], [2, 10], [10, 10]], from: 11 },
    ],
    desk: [10, 8],
    michaelCannon: [7, 2],
    // Shelves round the walls and a reading table or two: about 13% of the floor. Kept clear: the pocket
    // (cols 11-13, rows 4-9), row 9 between the west carpet and the stairs, and a tile beside each door.
    shelves: [
      [0, 0], [1, 0], [2, 0], [3, 0], [8, 0], [9, 0], [12, 0], [13, 0], [16, 0], [17, 0],
      [6, 11], [7, 11], [8, 11], [9, 11], [12, 11], [13, 11], [16, 11], [17, 11],
      [17, 6], [17, 7], [17, 8], [0, 2], [0, 3], [0, 4],
      [7, 6], [8, 6], [2, 6], [3, 6], [16, 1],
    ],
  },
};

export function cornerRot(prev: [number, number], corner: [number, number], next: [number, number]) {
  const inDc = Math.sign(corner[0] - prev[0]);
  const inDr = Math.sign(corner[1] - prev[1]);
  const outDc = Math.sign(next[0] - corner[0]);
  const outDr = Math.sign(next[1] - corner[1]);
  const from = inDc === 1 ? "w" : inDc === -1 ? "e" : inDr === 1 ? "n" : "s";
  const to = outDc === 1 ? "e" : outDc === -1 ? "w" : outDr === 1 ? "s" : "n";
  const connected = new Set([from, to]);
  const outer = (["e", "n", "s", "w"] as const).filter((s) => !connected.has(s)).sort();
  const rot: Record<string, number> = {
    en: 0,
    es: Math.PI / 2,
    sw: Math.PI,
    nw: -Math.PI / 2,
  };
  return rot[outer.join("")] ?? 0;
}

/**
 * The carpet from its corners. Each stretch runs straight or at exactly 45°. `cells` are the carpet tiles
 * (fruit walk them); `verge` are the tiles a diagonal half-covers beside each step: nothing can be built
 * there, and nothing else treats them as carpet.
 */
export function buildBoard(corners: Array<[number, number]>) {
  const cells = new Set<string>();
  const sides = new Set<string>();
  const mark = (c: number, r: number) => cells.add(`${c},${r}`);
  for (let i = 0; i < corners.length - 1; i++) {
    const [c0, r0] = corners[i];
    const [c1, r1] = corners[i + 1];
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    const diagonal = dc !== 0 && dr !== 0;
    if (diagonal && Math.abs(c1 - c0) !== Math.abs(r1 - r0))
      throw new Error(`The carpet from [${c0},${r0}] to [${c1},${r1}] has to run straight or at exactly 45°`);
    let c = c0;
    let r = r0;
    mark(c, r);
    while (c !== c1 || r !== r1) {
      if (diagonal) {
        sides.add(`${c + dc},${r}`);
        sides.add(`${c},${r + dr}`);
      }
      c += dc;
      r += dr;
      mark(c, r);
    }
  }
  const verge = new Set([...sides].filter((k) => !cells.has(k)));
  const points = corners.map(([c, r]) => ({
    x: c * CELL + CELL / 2,
    y: r * CELL + CELL / 2,
  }));
  const turns = corners.slice(1, -1).map((corner, i) => ({
    c: corner[0],
    r: corner[1],
    rot: cornerRot(corners[i], corner, corners[i + 2]),
  }));
  return { cells, verge, points, turns };
}
export type Difficulty = "easy" | "normal" | "hard" | "overdue";
export type Guard = "none" | "rind" | "husk" | "damp";

export const DIFFICULTIES: Array<{ id: Difficulty; name: string; blurb: string; hp: number; speed: number }> = [
  { id: "easy", name: "Story", blurb: "Thinner rinds. They walk a little slower.", hp: 0.75, speed: 0.9 },
  { id: "normal", name: "Normal", blurb: "The library as written.", hp: 1, speed: 1 },
  { id: "hard", name: "Melongeddon", blurb: "Thicker fruit, and they do not stroll.", hp: 1.2, speed: 1.12 },
  { id: "overdue", name: "Overdue", blurb: "Thicker still, and in a hurry. For when Melongeddon is too polite.", hp: 1.45, speed: 1.15 },
];

export interface SpawnSpec {
  kind: EnemyKind;
  count: number;
  every: number;
  tough?: number;
  guard?: Guard;
  split?: boolean;
  raw?: boolean;
  chute?: boolean;
  /** Act three. A pit is stone: splash, fire and puddles barely touch it (not a guard, so the Peeler leaves it). */
  pit?: boolean;
  /** Act three. Each one spawns its host plus a small corn rider that heals the host while it lives. */
  gall?: boolean;
  /** Act three. Fast and frail; at the door it takes seeds instead of a stack. */
  borrower?: boolean;
  /** The Siege (geese): a Gosling Line (spawned in lines of five, the first the leader), or the Matriarch. */
  gosling?: boolean;
  matriarch?: boolean;
  /** The Siege (cats): a Box Cat, a Paratrooper (lands on drop point `drop`), a Cardboard Tank, or General Mittens. */
  boxed?: boolean;
  para?: boolean;
  tank?: boolean;
  general?: boolean;
  /** Paratroopers: which of the board's drop points (default 0). */
  drop?: number;
}

/** The Siege's flagged variants (a plain goose is a Honker; a plain cat is a Private Whiskers). */
export type SiegeVariant = "gosling" | "matriarch" | "boxed" | "para" | "tank" | "general";
export const SIEGE_VARIANTS: SiegeVariant[] = ["gosling", "matriarch", "boxed", "para", "tank", "general"];

/**
 * The Siege's numbers (tune with the simulator). Every goose and cat variant reads from here. Variants
 * with their own health, speed and size have them here; plain ones use STATS.goose and STATS.cat.
 */
export const SIEGE = {
  /** Honker: the first hit HONKS, and every tower within this reach (px, 1.5 tiles) skips its next shot. */
  honkReach: 1.5 * CELL,
  /** Gosling Line: five to a line, small and quick; the leader is a little bigger. Killing it stops the rest this long (s). */
  goslingLine: 5,
  gosling: { hp: 8, speed: 70, r: 8, gold: 3 },
  leader: { hp: 12, r: 10 },
  goslingStun: 2,
  /** The Matriarch (boss): every `rallyEvery` s every goose walks `rallySpeed` times as fast for `rallyTime` s. */
  matriarch: { hp: 340, speed: 30, r: 26, gold: 60, leak: 3 },
  rallyEvery: 6,
  rallyTime: 3,
  rallySpeed: 1.5,
  /** Private Whiskers: Nine Lives brings it back once with this share of its health. One hit from full health worth
   * `oneLife` times its health (both lives at once) kills it outright. */
  nineLives: 0.3,
  oneLife: 1.3,
  /** Paratrooper: the drop point glows this long (s) before they land, and the parachute takes this long (s) to come down. */
  dropGlow: 3,
  dropFall: 0.6,
  /** Cardboard Tank: front armour (a hit from ahead does this share). */
  tank: { hp: 140, speed: 26, r: 20, gold: 22, leak: 2 },
  tankArmour: 0.5,
  /** General Mittens (boss): while she's alive every cat has this much health (×); when she dies they walk back `scatter` s. */
  general: { hp: 380, speed: 24, r: 26, gold: 70, leak: 3 },
  generalBonus: 1.25,
  scatter: 2,
  /** The feud: a goose and a cat this close (px) stop and fight this long (s), and each loses this share of its max health. */
  feudReach: CELL / 2,
  feudTime: 2,
  feudHit: 0.1,
  /** Anti-Geese Protocol against geese: thrown this many times as far, then they panic and walk back this far (px). */
  protocolThrow: 2,
  protocolPanic: 2 * CELL,
};

/**
 * The three newest rooms' own fruit. Each is a flag on an ordinary kind (its `base`), swapped into the
 * shared waves on its own room only: a common one from wave 4, an elite from wave 10 (not on Story).
 */
export type NativeId = "express" | "parcel" | "sprout" | "squash" | "chimer" | "gargoyle";
export const NATIVE_INFO: Record<NativeId, { name: string; base: EnemyKind; line: string }> = {
  express: { name: "Express Corn", base: "corn", line: "Express post. These ones don't stop on the belts." },
  parcel: { name: "Parcel", base: "pumpkin", line: "A parcel. Tear the paper off first: there's something inside." },
  sprout: { name: "Sprout", base: "corn", line: "Sprouts. Two seconds in the beds and they're melons." },
  squash: { name: "Creeping Squash", base: "pumpkin", line: "A creeping squash. The carpet behind it turns into a bed." },
  chimer: { name: "Chimer", base: "corn", line: "Chimers. Every one still walking hurries the clock." },
  gargoyle: { name: "Gargoyle Gourd", base: "pumpkin", line: "A gargoyle gourd. Stone until the clock strikes, then it runs." },
};
/** Room fruit numbers (tune with the simulator). */
export const NATIVES = {
  /** From this wave (1-based), every `commonEvery`th fruit of the common's base kind becomes the common. */
  commonFrom: 4,
  commonEvery: 4,
  /** From this wave the first fruit(s) of the elite's base kind become the elite: one, or two in act three. */
  eliteFrom: 10,
  actThreeFrom: 16,
  elites: 1,
  elitesActThree: 2,
  /** Express Corn: belt pace (instead of FLOOR.belt); on a belt nothing slows or stops it. */
  expressBelt: 2,
  /** Parcel: direct hits through the wrapping, and the corn inside. */
  parcelWrapped: 0.5,
  parcelContents: 3,
  /** Sprout: seconds on beds (or vines) to grow into a melon, and its radius until then. */
  sproutGrow: 2,
  sproutR: 9,
  /** Creeping Squash: a vine every this many seconds, lasting this long, withering this long after the squash dies. */
  vineEvery: 1.5,
  vineLife: 6,
  vineWither: 1,
  /** Chimer: each one alive runs the clock this much faster, up to `chimerMax` times. */
  chimerRush: 0.25,
  chimerMax: 2,
  /** Gargoyle Gourd: speed while the clock silences the towers, and damage taken the rest of the time. */
  gargoyleAwake: 3,
  gargoyleSkin: 0.75,
};

/** One fruit in a wave's spawn queue. */
export interface QueueItem {
  kind: EnemyKind;
  t: number;
  tough: number;
  guard: Guard;
  split: boolean;
  raw: boolean;
  chute: boolean;
  pit: boolean;
  gall: boolean;
  borrower: boolean;
  native: NativeId | null;
  /** The Siege: the variant flag, the drop point (paratroopers), the Gosling Line it walks in (-1: none), and whether it leads. */
  siege: SiegeVariant | null;
  drop: number;
  line: number;
  leader: boolean;
  /** A board with doors: the route (door) it walks in by. Unset on one-door boards. */
  route?: number;
}

/** A wave's spawns as one queue, in spawn order. */
/** A board's `trim` for this difficulty, applied to a wave's groups (wave is 1-based). */
export function trimSpawns(spawns: SpawnSpec[], trim: Board["trim"], difficulty: Difficulty, wave: number): SpawnSpec[] {
  const t = trim?.[difficulty];
  if (!t || wave < t.from) return spawns;
  return spawns.map((g) => (g.count >= 2 ? { ...g, count: Math.max(1, Math.round(g.count * t.count)) } : g));
}

export function waveQueue(spawns: SpawnSpec[], routes?: number[][]): QueueItem[] {
  const items: QueueItem[] = [];
  let t = 0.35;
  let lines = 0;
  // A board with doors: each door keeps its own spacing, so groups at different doors walk in together. A lone
  // group alternates doors fruit by fruit and keeps one clock, so it isn't twice as dense.
  const byDoor = new Map<number, number>();
  const lone = spawns.length === 1;
  spawns.forEach((group, gi) => {
    const siege = SIEGE_VARIANTS.find((v) => group[v]) ?? null;
    const first = lines;
    if (siege === "gosling") lines += Math.ceil(group.count / SIEGE.goslingLine);
    for (let i = 0; i < group.count; i++) {
      const route = routes?.[gi]?.[i];
      const at = route == null || lone ? t : (byDoor.get(route) ?? 0.35);
      items.push({
        kind: group.kind,
        t: at,
        tough: group.tough ?? 1,
        guard: group.guard ?? "none",
        split: Boolean(group.split),
        raw: Boolean(group.raw),
        chute: Boolean(group.chute),
        pit: Boolean(group.pit),
        gall: Boolean(group.gall),
        borrower: Boolean(group.borrower),
        native: null,
        siege,
        drop: group.drop ?? 0,
        line: siege === "gosling" ? first + Math.floor(i / SIEGE.goslingLine) : -1,
        leader: siege === "gosling" && i % SIEGE.goslingLine === 0,
        ...(route != null ? { route } : {}),
      });
      if (route != null && !lone) byDoor.set(route, at + group.every);
      t += group.every;
    }
  });
  return items.sort((a, b) => a.t - b.t);
}

/** The doors open on wave `wave` (1-based), as indexes into `board.doors`. */
export function openDoors(board: Board, wave: number): number[] {
  return (board.doors ?? []).flatMap((d, i) => ((d.from ?? 1) <= wave ? [i] : []));
}

/**
 * Which door each fruit of a wave walks in by (route indexes, per group and per fruit), on a board with doors;
 * undefined on a one-door board. Groups take the open doors in turn, in spawn order (north, west, then the
 * stairs once they're open), so the first door is always the first one listed and the stairs never open a
 * wave. Bosses always use the first door, the longest walk. A wave of one group alternates its fruit instead.
 */
export function assignDoors(spawns: SpawnSpec[], board: Board, wave: number): number[][] | undefined {
  if (!board.doors?.length) return undefined;
  const open = openDoors(board, wave);
  const boss = (g: SpawnSpec) => Boolean(STATS[g.kind].boss) || Boolean(g.matriarch) || Boolean(g.general);
  if (spawns.length === 1 && !boss(spawns[0])) return [Array.from({ length: spawns[0].count }, (_, i) => open[i % open.length])];
  let turn = 0;
  return spawns.map((g) => {
    if (boss(g)) return Array(g.count).fill(open[0]);
    const door = open[turn % open.length];
    turn += 1;
    return Array(g.count).fill(door);
  });
}

/**
 * A board's routes: one per door (its carpet, then the trunk from where it joins), or just the board's own
 * carpet. `segments` are the carpet pieces with nothing counted twice (each door's own carpet, then the
 * trunk): use them for anything about where carpet is. `doorOf[i]` is route i's door (null: no doors).
 * `doorCells[i]` are door i's own tiles (not the trunk's), for a door that isn't open yet.
 */
export function buildRoutes(board: Board) {
  const base = buildBoard(board.corners);
  if (!board.doors?.length) {
    return {
      ...base,
      turns: base.turns.map((t) => ({ ...t, door: undefined as DoorId | undefined })),
      routes: [base.points],
      segments: [base.points],
      doorOf: [null] as Array<DoorId | null>,
      doorCells: [] as Array<Set<string>>,
    };
  }
  const cells = new Set(base.cells);
  const verge = new Set(base.verge);
  const turns = base.turns.map((t) => ({ ...t, door: undefined as DoorId | undefined }));
  const routes: Array<Array<{ x: number; y: number }>> = [];
  const segments: Array<Array<{ x: number; y: number }>> = [];
  const doorCells: Array<Set<string>> = [];
  for (const door of board.doors) {
    const last = door.corners[door.corners.length - 1];
    const join = board.corners.findIndex(([c, r]) => c === last[0] && r === last[1]);
    if (join < 0) throw new Error(`The ${door.id} door's carpet has to end on a corner of the board's carpet`);
    const own = buildBoard(door.corners);
    doorCells.push(new Set([...own.cells].filter((k) => !base.cells.has(k))));
    for (const k of own.cells) cells.add(k);
    for (const k of own.verge) verge.add(k);
    for (const t of own.turns) turns.push({ ...t, door: undefined });
    // A trunk corner where this door comes in is a junction while the door is open: no corner piece there.
    const tj = turns.findIndex((t) => t.c === last[0] && t.r === last[1]);
    if (tj >= 0) turns[tj] = { ...turns[tj], door: door.id };
    segments.push(own.points);
    routes.push([...own.points, ...base.points.slice(join + 1)]);
  }
  segments.push(base.points);
  for (const k of cells) verge.delete(k);
  return { cells, verge, points: routes[0], turns, routes, segments, doorOf: board.doors.map((d) => d.id) as Array<DoorId | null>, doorCells };
}

/** `carpetInReach` over several pieces of carpet (a board's segments): each tile counted once. */
export function carpetInReachAll(segments: Array<Array<{ x: number; y: number }>>, x: number, y: number, outer: number, inner = 0) {
  const stretches: Stretch[] = [];
  let length = 0;
  for (const seg of segments) {
    const r = carpetInReach(seg, x, y, outer, inner);
    stretches.push(...r.stretches);
    length += r.length;
  }
  return { stretches, length };
}

/** The segment (index) whose centre line passes nearest (x, y), with `nearestOnCarpet` on it. */
export function nearestSegment(segments: Array<Array<{ x: number; y: number }>>, x: number, y: number) {
  let best = { seg: 0, spot: nearestOnCarpet(segments[0], x, y), d: Infinity };
  segments.forEach((seg, i) => {
    const spot = nearestOnCarpet(seg, x, y);
    const d = Math.hypot(spot.x - x, spot.y - y);
    if (d < best.d) best = { seg: i, spot, d };
  });
  return best;
}


/** A plain fruit of this kind: no Karl, no flag or guard, not up the chute. Only those become room fruit. */
const plainFruit = (q: QueueItem, kind: EnemyKind) =>
  q.kind === kind && q.kind !== "karl" && q.guard === "none" && !q.split && !q.raw && !q.chute && !q.pit && !q.gall && !q.borrower && !q.native && !q.siege;

/** Swap a room's own fruit into a wave's queue (in place): `wave` is 1-based. Story nights get no elites. */
export function assignNatives(items: QueueItem[], natives: Board["natives"], wave: number, difficulty: Difficulty): QueueItem[] {
  if (!natives) return items;
  if (wave >= NATIVES.eliteFrom && difficulty !== "easy") {
    let left = wave >= NATIVES.actThreeFrom ? NATIVES.elitesActThree : NATIVES.elites;
    for (const q of items) {
      if (left <= 0) break;
      if (!plainFruit(q, NATIVE_INFO[natives.elite].base)) continue;
      q.native = natives.elite;
      left -= 1;
    }
  }
  if (wave >= NATIVES.commonFrom) {
    let seen = 0;
    for (const q of items) {
      if (!plainFruit(q, NATIVE_INFO[natives.common].base)) continue;
      seen += 1;
      if (seen % NATIVES.commonEvery === 0) q.native = natives.common;
    }
  }
  return items;
}

export const WAVES: Array<{ name: string; blurb: string; spawns: SpawnSpec[] }> = [
  {
    name: "Melon lobbers",
    blurb: "The first shots are already in the air. Two cannons should hold the carpet.",
    spawns: [{ kind: "melon", count: 8, every: 0.85 }],
  },
  {
    name: "Rind rush",
    blurb: "The first hit only cracks the shell. Hold them, then hit them again.",
    spawns: [
      { kind: "melon", count: 5, every: 0.9, guard: "rind" },
      { kind: "corn", count: 4, every: 0.65 },
    ],
  },
  {
    name: "Pumpkin line",
    blurb: "Husks walk through a freeze. Splash and fire are what stop them.",
    spawns: [
      { kind: "pumpkin", count: 4, every: 1.05 },
      { kind: "corn", count: 5, every: 0.5, guard: "husk" },
    ],
  },
  {
    name: "Karl arrives",
    blurb: "A giant pumpkin is coming down the carpet. Do not let him reach the stacks.",
    spawns: [
      { kind: "pumpkin", count: 3, every: 1.1 },
      { kind: "karl", count: 1, every: 0.4 },
      { kind: "melon", count: 5, every: 0.7 },
    ],
  },
  {
    name: "Guest of the library",
    blurb: "Some pumpkins crack into four. Some bake, and then the fire is finished with them.",
    spawns: [
      { kind: "melon", count: 6, every: 0.55 },
      { kind: "pumpkin", count: 2, every: 1.4, split: true },
      { kind: "pumpkin", count: 2, every: 1.3, raw: true },
      { kind: "corn", count: 4, every: 0.5 },
    ],
  },
  {
    name: "Binding shuts",
    blurb: "Wet pumpkins. Fire sits on them and barely cooks.",
    spawns: [
      { kind: "pumpkin", count: 4, every: 0.9, guard: "damp" },
      { kind: "corn", count: 6, every: 0.4, guard: "husk" },
      { kind: "melon", count: 6, every: 0.5, guard: "rind" },
    ],
  },
];

export const OVERFLOW: Array<{ name: string; blurb: string; spawns: SpawnSpec[] }> = [
  {
    name: "Wet shelves",
    blurb: "A shorter carpet, and the floor is already wet. Fire will not do the work it did upstairs.",
    spawns: [{ kind: "melon", count: 8, every: 0.8 }],
  },
  {
    name: "Puddle line",
    blurb: "The puddles were here before you. A freeze still holds.",
    spawns: [
      { kind: "pumpkin", count: 3, every: 1.1, guard: "damp" },
      { kind: "melon", count: 6, every: 0.65 },
    ],
  },
  {
    name: "Tight crack",
    blurb: "The first pumpkin breaks in a small room. Four melons have nowhere to spread.",
    spawns: [
      { kind: "pumpkin", count: 2, every: 1.35, split: true },
      { kind: "corn", count: 4, every: 0.55 },
    ],
  },
  {
    name: "Night two",
    blurb: "The chute is damp and quiet. The produce did not get the message.",
    spawns: [
      { kind: "melon", count: 6, every: 0.6 },
      { kind: "corn", count: 5, every: 0.5 },
    ],
  },
  {
    name: "Bread downstairs",
    blurb: "Set a raw one alight if you want a loaf. The wet will not finish it.",
    spawns: [
      { kind: "pumpkin", count: 3, every: 1.15, raw: true },
      { kind: "melon", count: 5, every: 0.55 },
    ],
  },
  {
    name: "The chute",
    blurb: "Rinds are coming back up. Your cannons look at whoever is furthest along, and a return already is.",
    spawns: [
      { kind: "melon", count: 6, every: 0.6 },
      { kind: "melon", count: 3, every: 1.1, guard: "rind", chute: true },
    ],
  },
  {
    name: "Both ends",
    blurb: "One return for a handful at the door. Cover the chute, or the front walks in free.",
    spawns: [
      { kind: "corn", count: 6, every: 0.45 },
      { kind: "pumpkin", count: 3, every: 1 },
      { kind: "melon", count: 4, every: 0.9, guard: "rind", chute: true },
    ],
  },
  {
    name: "The returns",
    blurb: "They keep coming up. The front door does not wait.",
    spawns: [
      { kind: "melon", count: 6, every: 0.5 },
      { kind: "pumpkin", count: 1, every: 1.2, split: true },
      { kind: "melon", count: 5, every: 0.75, guard: "rind", chute: true },
    ],
  },
  {
    name: "Backwash",
    blurb: "The chute is busy before the door is.",
    spawns: [
      { kind: "melon", count: 5, every: 1, guard: "rind", chute: true },
      { kind: "corn", count: 6, every: 0.45 },
    ],
  },
  {
    name: "Low tide",
    blurb: "The water went down. The pumpkins did not dry out.",
    spawns: [
      { kind: "pumpkin", count: 5, every: 0.85, guard: "damp" },
      { kind: "melon", count: 6, every: 0.5 },
    ],
  },
  {
    name: "Sump pump",
    blurb: "Cracked pumpkins at the door, rinds up the chute, husks in between.",
    spawns: [
      { kind: "pumpkin", count: 3, every: 1.1, split: true },
      { kind: "melon", count: 3, every: 1.1, guard: "rind", chute: true },
      { kind: "corn", count: 4, every: 0.45, guard: "husk" },
    ],
  },
  {
    name: "Floodgate",
    blurb: "Karl took the stairs this time. He will not next time.",
    spawns: [
      { kind: "karl", count: 1, every: 0.4 },
      { kind: "pumpkin", count: 3, every: 1, guard: "damp" },
      { kind: "melon", count: 5, every: 0.55 },
    ],
  },
  {
    name: "High water",
    blurb: "Raw pumpkins down here only bake if you are patient.",
    spawns: [
      { kind: "corn", count: 8, every: 0.35 },
      { kind: "pumpkin", count: 3, every: 1.1, raw: true },
      { kind: "melon", count: 4, every: 0.9, guard: "rind", chute: true },
    ],
  },
  {
    name: "The meter spends",
    blurb: "Every 25 absurdity, the chute drops another rind.",
    spawns: [
      { kind: "pumpkin", count: 4, every: 0.95 },
      { kind: "corn", count: 4, every: 0.45, guard: "husk" },
      { kind: "melon", count: 3, every: 1, guard: "rind", chute: true },
    ],
  },
  {
    name: "Up the chute",
    blurb: "Karl is not using the door.",
    spawns: [
      { kind: "karl", count: 1, every: 0.4, chute: true },
      { kind: "pumpkin", count: 3, every: 1, guard: "damp" },
      { kind: "melon", count: 4, every: 0.55 },
    ],
  },
];

/**
 * Alternate geese and cats, one at a time, `pairs` of each: the feud's waves. The geese walk faster,
 * so a goose that arrives behind a cat catches it up on the carpet.
 */
function feud(cat: SpawnSpec, goose: SpawnSpec, pairs: number): SpawnSpec[] {
  const out: SpawnSpec[] = [];
  for (let i = 0; i < pairs; i++) out.push({ ...cat, count: 1 }, { ...goose, count: 1 });
  return out;
}

/** The Siege (night three, the Courtyard): geese, then cats, then both. No fruit at all. */
export const SIEGE_WAVES: Array<{ name: string; blurb: string; spawns: SpawnSpec[] }> = [
  // Act one: geese.
  {
    name: "Honkers",
    blurb: "Geese. The first hit makes one honk, and every tower close by misses its next shot. Spread your towers out.",
    spawns: [{ kind: "goose", count: 8, every: 0.85 }],
  },
  {
    name: "Single file",
    blurb: "Goslings walk in lines of five behind a leader. Pop the leader and the rest stand there for two seconds.",
    spawns: [
      { kind: "goose", count: 10, every: 0.32, gosling: true },
      { kind: "goose", count: 3, every: 0.9 },
    ],
  },
  {
    name: "Gaggle",
    blurb: "More honking. A tower that misses a shot to a honk still has the next one.",
    spawns: [
      { kind: "goose", count: 7, every: 0.7 },
      { kind: "goose", count: 5, every: 0.32, gosling: true },
    ],
  },
  {
    name: "Flyover",
    blurb: "Two lines of goslings, with the big ones in between.",
    spawns: [
      { kind: "goose", count: 5, every: 0.3, gosling: true },
      { kind: "goose", count: 6, every: 0.6 },
      { kind: "goose", count: 5, every: 0.3, gosling: true },
    ],
  },
  {
    name: "The Matriarch",
    blurb: "Every six seconds she honks for a rally and every goose on the carpet runs. She doesn't stop for anyone.",
    spawns: [
      { kind: "goose", count: 5, every: 0.6 },
      { kind: "goose", count: 1, every: 1.2, matriarch: true },
      { kind: "goose", count: 5, every: 0.3, gosling: true },
    ],
  },
  // Act two: cats.
  {
    name: "Private Whiskers",
    blurb: "Cats. The first time one goes down it gets back up, with a little health. Hit it twice.",
    spawns: [{ kind: "cat", count: 8, every: 0.8 }],
  },
  {
    name: "Special delivery",
    blurb: "Box cats. Nothing can aim at a box. Splash, fire, a puddle or a Reading Lamp's light knocks it off.",
    spawns: [
      { kind: "cat", count: 2, every: 0.9, boxed: true },
      { kind: "cat", count: 7, every: 0.7 },
    ],
  },
  {
    name: "Air drop",
    blurb: "Paratroopers. A chalk target on the carpet glows, and three seconds later the cats land on it, halfway in.",
    spawns: [
      { kind: "cat", count: 5, every: 0.7 },
      { kind: "cat", count: 4, every: 0.5, para: true, drop: 0 },
    ],
  },
  {
    name: "Cardboard division",
    blurb: "Tanks. The front is armoured: hit one from behind, after it has passed you.",
    spawns: [
      { kind: "cat", count: 4, every: 0.7 },
      { kind: "cat", count: 2, every: 2.4, tank: true },
      { kind: "cat", count: 2, every: 0.8, boxed: true },
    ],
  },
  {
    name: "General Mittens",
    blurb: "While she stands, every cat on the carpet is a quarter tougher. When she falls, they scatter.",
    spawns: [
      { kind: "cat", count: 5, every: 0.6 },
      { kind: "cat", count: 1, every: 1.2, general: true },
      { kind: "cat", count: 2, every: 0.8, boxed: true },
      { kind: "cat", count: 2, every: 0.5, para: true, drop: 1 },
    ],
  },
  // Act three: both. They arrive close together on purpose.
  {
    name: "Old grudges",
    blurb: "Geese and cats on the same carpet. When they meet they stop and fight, and both come off worse.",
    spawns: feud({ kind: "cat", count: 1, every: 0.55 }, { kind: "goose", count: 1, every: 0.75 }, 7),
  },
  {
    name: "Honk in a box",
    blurb: "Box cats with honkers behind them. A goose that catches a box cat fights it, box and all.",
    spawns: [
      ...feud({ kind: "cat", count: 1, every: 0.6, boxed: true }, { kind: "goose", count: 1, every: 0.8 }, 4),
      ...feud({ kind: "cat", count: 1, every: 0.6 }, { kind: "goose", count: 1, every: 0.8 }, 2),
    ],
  },
  {
    name: "Mixed company",
    blurb: "Goslings at the door, paratroopers in the middle, and nobody is sharing the carpet nicely.",
    spawns: [
      { kind: "goose", count: 10, every: 0.3, gosling: true },
      { kind: "cat", count: 3, every: 0.5, para: true, drop: 0 },
      ...feud({ kind: "cat", count: 1, every: 0.55 }, { kind: "goose", count: 1, every: 0.7 }, 4),
    ],
  },
  {
    name: "Armoured drop",
    blurb: "Tanks up the carpet and paratroopers on both targets.",
    spawns: [
      { kind: "cat", count: 2, every: 2, tank: true },
      { kind: "cat", count: 3, every: 0.5, para: true, drop: 0 },
      { kind: "cat", count: 3, every: 0.5, para: true, drop: 1 },
      { kind: "cat", count: 4, every: 0.6 },
    ],
  },
  {
    name: "Both of them",
    blurb: "Both of them, at once. They still hate each other.",
    spawns: [
      { kind: "goose", count: 5, every: 0.3, gosling: true },
      { kind: "goose", count: 1, every: 1, matriarch: true },
      { kind: "cat", count: 1, every: 1, general: true },
      ...feud({ kind: "cat", count: 1, every: 0.6, boxed: true }, { kind: "goose", count: 1, every: 0.3, gosling: true }, 3),
      ...feud({ kind: "cat", count: 1, every: 0.6 }, { kind: "goose", count: 1, every: 0.3, gosling: true }, 2),
    ],
  },
];

/**
 * The Overflow's length, the old Midnight finale index, and what the chute counts from.

 * How long a given night runs is `nightLength`.
 */
export const WAVE_COUNT = 15;
// ---------- reach on the carpet ----------

/** One stretch of carpet centre line, from (x1, y1) to (x2, y2). */
export type Stretch = { x1: number; y1: number; x2: number; y2: number };

/** Where along p0→p1 (0..1) a point is within `r` of (cx, cy), or null. */
function within(p0: { x: number; y: number }, p1: { x: number; y: number }, cx: number, cy: number, r: number): [number, number] | null {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const fx = p0.x - cx;
  const fy = p0.y - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return fx * fx + fy * fy <= r * r ? [0, 1] : null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t0 = Math.max(0, (-b - sq) / (2 * a));
  const t1 = Math.min(1, (-b + sq) / (2 * a));
  return t1 > t0 ? [t0, t1] : null;
}

/**
 * Exactly which stretches of carpet a tower at (x, y) can reach. Fruit walk the carpet's centre line
 * (the board's points) and a tower aims at any fruit whose centre is within `outer`, so this is the
 * whole answer, not a guess. `inner` cuts out a hole (the Orrery's planets only hit near their orbit).
 * `length` is in px; divide by CELL for tiles.
 */
/**
 * Sir Michael the Dragon Knight's armours. He puts one on before the night (on the intro, where the
 * oaths used to be): each gives a starting boost and has a cost. Two are open from the start; the
 * other two open with his keeper level (`ARMOUR_LEVEL`).
 */
export type ArmourId = "azure" | "dragonscale" | "ember" | "wyrm";
export const ARMOURS: ArmourId[] = ["azure", "dragonscale", "ember", "wyrm"];
/** The keeper level each armour opens at (1 = from the start). */
export const ARMOUR_LEVEL: Record<ArmourId, number> = { azure: 1, dragonscale: 1, ember: 3, wyrm: 5 };
/**
 * @deprecated The oaths are gone; old saves and scripts that still name one are mapped to an armour
 * (`ARMOUR_FOR_OATH`). Hold the door → Azure Plate, Meet them first → Emberforged, Bring one pumpkin → Wyrmrider.
 */
export type OathId = "door" | "mouth" | "sling";
/** @deprecated See `OathId`. */
export const OATHS: OathId[] = ["door", "mouth", "sling"];
export const ARMOUR_FOR_OATH: Record<OathId, ArmourId> = { door: "azure", mouth: "ember", sling: "wyrm" };
/** An armour id from anything a save or script might hold: an armour, an old oath, or junk (null). */
export function armourFrom(v: unknown): ArmourId | null {
  if (typeof v !== "string") return null;
  if ((ARMOURS as string[]).includes(v)) return v as ArmourId;
  if ((OATHS as string[]).includes(v)) return ARMOUR_FOR_OATH[v as OathId];
  return null;
}

/**
 * Sir Michael's numbers. All the Dragon Knight's rules read from here.
 * - The Dragon's Hoard: `hoardShare` of every seed he spends on ordinary towers and back-room
 *   upgrades also goes into the Hoard. The Hoard pays first for big things (the Dragon Gate, the
 *   Dragon's Roost, feeding the dragon, Great towers); seeds pay the rest.
 * - Great towers: two of the same shared tower side by side merge into one that covers both tiles,
 *   with `greatDmg` damage and `greatRange` reach. Merging costs `greatCost` of the tower's price.
 * - The Dragon's Roost: an egg that grows with the waves it stands through (`roostGrow`: waves to
 *   whelp, drake, Great Dragon). Feeding it (`roostFeed` seeds, once a break) counts as one more wave.
 *   Each stage's share of the full hit, reach in tiles (0 = the whole board) and seconds per breath.
 * - In the Zone: every wave cleared with no stack lost adds `zoneStep` damage to his big towers,
 *   up to `zoneCap`. A lost stack resets it.
 */
export const DRAGON = {
  hoardShare: 0.25,
  greatDmg: 2.5,
  greatRange: 1.25,
  greatCost: 0.6,
  roostGrow: [2, 5, 9] as const,
  roostFeed: 50,
  roostStage: [
    { dmg: 0, range: 0, pace: 1 },
    { dmg: 0.2, range: 2.2, pace: 1.5 },
    { dmg: 0.42, range: 4, pace: 2.1 },
    { dmg: 1, range: 0, pace: 3.34 },
  ] as const,
  zoneStep: 0.05,
  zoneCap: 0.2,
};
/** What each armour changes (see ARMOUR_TEXT for the words). */
export const ARMOUR_VALUES = {
  /** Azure Plate: more stacks, fewer seeds. */
  azureLives: 3,
  azureSeeds: 10,
  /** Dragonscale Mail: the Hoard starts full and takes a bigger share; two stacks down. */
  scaleHoard: 60,
  scaleShare: 0.3,
  scaleLives: 2,
  /** Emberforged Armour: Great towers and the Roost hit harder and leave blue fire; merging costs more. */
  emberDmg: 1.2,
  emberMerge: 1.25,
  emberBurn: 18,
  /** Wyrmrider Harness: the Roost starts a stage on; In the Zone stops lower. */
  wyrmStage: 1,
  wyrmZoneCap: 0.1,
};
/** Sir Michael's big towers: the Hoard pays for them first, and In the Zone and Emberforged boost them (with Great towers). */
export const BIG_KINDS: TowerKind[] = ["gourdgate", "bombard"];
/** The armour cards on Sir Michael's intro: name, what it looks like, what he says, the gain and the cost, and the log line. */
export const ARMOUR_TEXT: Record<ArmourId, { name: string; look: string; said: string; gain: string; cost: string; log: string }> = {
  azure: {
    name: "Azure Plate",
    look: "Heavy blue plate with a dragon-head helm.",
    said: "Plate today. I'm not moving.",
    gain: `+${ARMOUR_VALUES.azureLives} stacks`,
    cost: `−${ARMOUR_VALUES.azureSeeds} seeds`,
    log: "Sir Michael buckles on the Azure Plate. “Plate today. I'm not moving.”",
  },
  dragonscale: {
    name: "Dragonscale Mail",
    look: "Overlapping gold-edged scales.",
    said: "The hoard comes with me.",
    gain: `Hoard starts at ${ARMOUR_VALUES.scaleHoard} and takes ${Math.round(ARMOUR_VALUES.scaleShare * 100)}%`,
    cost: `−${ARMOUR_VALUES.scaleLives} stacks`,
    log: "Sir Michael shrugs into the Dragonscale Mail. “The hoard comes with me.”",
  },
  ember: {
    name: "Emberforged Armour",
    look: "Blackened steel, glowing blue at the seams.",
    said: "Fewer towers. Bigger fires.",
    gain: `Great towers and the Roost +${Math.round((ARMOUR_VALUES.emberDmg - 1) * 100)}% and blue fire`,
    cost: `Merging costs ${Math.round((ARMOUR_VALUES.emberMerge - 1) * 100)}% more`,
    log: "Sir Michael seals the Emberforged Armour. “Fewer towers. Bigger fires.”",
  },
  wyrm: {
    name: "Wyrmrider Harness",
    look: "Light riding leathers with a dragon saddle-cloak.",
    said: "The egg's already cracking.",
    gain: "The Roost starts as a Whelp",
    cost: `In the Zone tops out at +${Math.round(ARMOUR_VALUES.wyrmZoneCap * 100)}%`,
    log: "Sir Michael pulls on the Wyrmrider Harness. “The egg's already cracking.”",
  },
};
/** Roost stage names, egg to Great Dragon. */
export const ROOST_STAGES = ["Egg", "Whelp", "Drake", "Great Dragon"] as const;
/**
 * Which towers can be merged into a Great tower: the shared ones that shoot. Helpers (lamp, heap)
 * and every keeper tower can't.
 */
export function canBeGreat(kind: TowerKind) {
  return !isSignature(kind) && kind !== "lantern" && kind !== "compost" && kind !== "copycat";
}
/** How many waves' growth reach each Roost stage: 0 egg, 1 whelp, 2 drake, 3 Great Dragon. */
export function roostStageFor(grown: number) {
  let stage = 0;
  for (const need of DRAGON.roostGrow) if (grown >= need) stage++;
  return stage;
}

/**
 * Asser Mälkki. Material: every stack he loses pays `materialSeeds` seeds. Sisu: all his towers hit
 * `sisuPerStack` harder for every stack he is missing, up to `sisuCap` stacks. Lion Blade: each one
 * standing through a wave puts `bladeMend` stacks back when it's cleared.
 */
export const ASSER_VALUES = { materialSeeds: 4, sisuPerStack: 0.02, sisuCap: 15, bladeMend: 2 };

/**
 * How far along the carpet polyline a fruit is, in px from the first point. Negative before the
 * first point (walking in from off the board); more than the carpet's length past the last point
 * (a chute spawn). `wp` is the point the fruit is heading to; `reverse` fruit head toward the start.
 */
export function carpetAlong(points: Array<{ x: number; y: number }>, x: number, y: number, wp: number, reverse: boolean) {
  let total = 0;
  const cum = [0];
  for (let k = 1; k < points.length; k++) {
    total += Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y);
    cum.push(total);
  }
  if (!points.length) return { along: 0, total: 0 };
  const k = Math.max(0, Math.min(points.length - 1, wp));
  const d = Math.hypot(x - points[k].x, y - points[k].y);
  return { along: reverse ? cum[k] + d : cum[k] - d, total };
}

/**
 * The carpet's straights ("legs"): one between each pair of consecutive points, the last ending at the door.
 * `from`/`to` are how far along the carpet (px) the leg starts and ends; `tiles` are its board tiles, the
 * start corner included and the end corner not (a corner belongs to the leg a fruit walks into).
 */
export function carpetLegs(points: Array<{ x: number; y: number }>) {
  const legs: Array<{
    a: { x: number; y: number };
    b: { x: number; y: number };
    from: number;
    to: number;
    length: number;
    tiles: Array<[number, number]>;
    /** A diagonal's half-covered side tiles (none on a straight). */
    verge: Array<[number, number]>;
  }> = [];
  let run = 0;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const c0 = Math.floor(a.x / CELL);
    const r0 = Math.floor(a.y / CELL);
    const c1 = Math.floor(b.x / CELL);
    const r1 = Math.floor(b.y / CELL);
    // A diagonal steps both ways at once, so it has as many tiles as its longer side.
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    const tiles: Array<[number, number]> = [];
    const verge: Array<[number, number]> = [];
    for (let i = 0; i < steps; i++) {
      const c = c0 + dc * i;
      const r = r0 + dr * i;
      tiles.push([c, r]);
      if (dc && dr) verge.push([c + dc, r], [c, r + dr]);
    }
    legs.push({ a, b, from: run, to: run + length, length, tiles, verge });
    run += length;
  }
  return legs;
}

/**
 * Where to draw something standing at (x, y) on a rounded ("path") carpet. Within reach of a turn it sits on
 * the quarter-circle (a 45° turn: a shorter arc) instead of the sharp corner; elsewhere it's unchanged. The
 * rules position stays on the straight lines: the two differ by at most a third of a tile.
 */
export function roundedSpot(points: Array<{ x: number; y: number }>, x: number, y: number, radius = CELL / 2) {
  for (let k = 1; k < points.length - 1; k++) {
    const p = points[k];
    if (Math.abs(x - p.x) > CELL || Math.abs(y - p.y) > CELL) continue;
    const a = points[k - 1];
    const b = points[k + 1];
    const la = Math.hypot(p.x - a.x, p.y - a.y);
    const lb = Math.hypot(b.x - p.x, b.y - p.y);
    if (!la || !lb) continue;
    const inX = (p.x - a.x) / la;
    const inY = (p.y - a.y) / la;
    const outX = (b.x - p.x) / lb;
    const outY = (b.y - p.y) / lb;
    const turn = Math.acos(Math.max(-1, Math.min(1, inX * outX + inY * outY)));
    if (turn < 1e-3) continue;
    const t = radius * Math.tan(turn / 2);
    const dx = x - p.x;
    const dy = y - p.y;
    const back = dx * inX + dy * inY;
    let s: number;
    if (back < -1e-6) {
      // On the way in: it must be on the incoming line.
      if (Math.abs(dx * inY - dy * inX) > 1) continue;
      s = back;
    } else {
      const fwd = dx * outX + dy * outY;
      if (Math.abs(dx * outY - dy * outX) > 1) continue;
      s = fwd;
    }
    if (Math.abs(s) >= t) continue;
    // The arc runs from the tangent point on the way in to the one on the way out.
    const side = inX * outY - inY * outX > 0 ? 1 : -1;
    const nX = -inY * side;
    const nY = inX * side;
    const cx = p.x - inX * t + nX * radius;
    const cy = p.y - inY * t + nY * radius;
    const start = Math.atan2(-nY, -nX);
    const ang = start + side * turn * ((s + t) / (2 * t));
    return { x: cx + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius };
  }
  return { x, y };
}

/** The leg a fruit is on (index), or -1 while it's still walking in from off the board or past the end. */
export function legOf(legs: ReturnType<typeof carpetLegs>, along: number, reverse: boolean) {
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i];
    if (reverse ? along > l.from && along <= l.to : along >= l.from && along < l.to) return i;
  }
  return -1;
}

/** The legs with a carpet tile (or, on a diagonal, a verge tile) sharing an edge with tile (c, r), with how many touch. */
export function legsTouching(legs: ReturnType<typeof carpetLegs>, c: number, r: number) {
  const out: Array<{ leg: number; touch: number }> = [];
  legs.forEach((l, i) => {
    const near = [...l.tiles, ...l.verge].filter(([lc, lr]) => Math.abs(lc - c) + Math.abs(lr - r) === 1);
    const touch = new Set(near.map(([lc, lr]) => `${lc},${lr}`)).size;
    if (touch) out.push({ leg: i, touch });
  });
  return out;
}

/** The Post (pamphlet)'s straight from tile (c, r): the leg with the most tiles touching it; a tie goes downstream. -1 if none. */
export function bindLeg(legs: ReturnType<typeof carpetLegs>, c: number, r: number) {
  let best = -1;
  let most = 0;
  for (const { leg, touch } of legsTouching(legs, c, r)) {
    if (touch > most || (touch === most && leg > best)) {
      best = leg;
      most = touch;
    }
  }
  return best;
}

export function carpetInReach(points: Array<{ x: number; y: number }>, x: number, y: number, outer: number, inner = 0) {
  const stretches: Stretch[] = [];
  let length = 0;
  const add = (p0: { x: number; y: number }, p1: { x: number; y: number }, t0: number, t1: number) => {
    if (t1 - t0 < 1e-6) return;
    const s = { x1: p0.x + (p1.x - p0.x) * t0, y1: p0.y + (p1.y - p0.y) * t0, x2: p0.x + (p1.x - p0.x) * t1, y2: p0.y + (p1.y - p0.y) * t1 };
    stretches.push(s);
    length += Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  };
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const out = within(p0, p1, x, y, outer);
    if (!out) continue;
    const hole = inner > 0 ? within(p0, p1, x, y, inner) : null;
    if (!hole || hole[1] <= out[0] || hole[0] >= out[1]) {
      add(p0, p1, out[0], out[1]);
      continue;
    }
    add(p0, p1, out[0], Math.max(out[0], hole[0]));
    add(p0, p1, Math.min(out[1], hole[1]), out[1]);
  }
  return { stretches, length };
}

/**
 * How to show a tower's reach. "carpet": the stretch of carpet it can hit (fruit centres between `inner` and
 * `outer`; `outer` is its range except for the Orrery). "towers": it helps towers, not fruit (Reading Lamp), so show
 * the towers in reach. "gate": the Gourd Gate holds fruit only on a short strip before the carpet point nearest it
 * (see `gateStrip`). "none": nothing to show. `aura` adds the towers a Quack-Liber speeds up. `beyond` is for towers
 * whose hits land outside the circle they aim with: a second, fainter circle (`radius`) and/or a short note.
 */
export function reachShape(
  kind: TowerKind,
  range: number,
): { mode: "carpet" | "towers" | "gate" | "none"; inner: number; outer: number; aura: boolean; beyond?: { radius?: number; note: string } } {
  if (range <= 0 || kind === "compost" || kind === "lectern") return { mode: "none", inner: 0, outer: 0, aura: false };
  if (kind === "lantern") return { mode: "towers", inner: 0, outer: range, aura: false };
  if (kind === "gourdgate") return { mode: "gate", inner: 0, outer: range, aura: false };
  // Orrery planets touch a fruit within about a fruit's width of their orbit, on either side of it.
  if (kind === "orrery") return { mode: "carpet", inner: Math.max(0, range - CANNON.orreryReach), outer: range + CANNON.orreryReach, aura: false };
  const shape = { mode: "carpet" as const, inner: 0, outer: range, aura: kind === "quackliber" };
  if (kind === "quill") return { ...shape, beyond: { radius: Math.round(range * CANNON.quillReach), note: "writes on past it" } };
  if (kind === "stomp") return { ...shape, beyond: { radius: range + CANNON.stompRadius, note: "the foot lands wider" } };
  if (kind === "press") return { ...shape, beyond: { note: "the sheet slides back past it" } };
  if (kind === "globe") return { ...shape, beyond: { note: "it rolls back to the entrance" } };
  if (kind === "plane") return { ...shape, beyond: { note: "the plane chases anywhere" } };
  return shape;
}

/** The point on the carpet's centre line nearest (x, y), with how far along the carpet it is and the carpet's length. */
export function nearestOnCarpet(points: Array<{ x: number; y: number }>, x: number, y: number) {
  let best = { x, y, along: 0, d: Infinity };
  let run = 0;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (len * len)));
    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    const d = Math.hypot(px - x, py - y);
    if (d < best.d) best = { x: px, y: py, along: run + len * t, d };
    run += len;
  }
  return { x: best.x, y: best.y, along: best.along, total: run };
}

/** The stretch of the carpet's centre line from `from` to `to` px along it, as stretches. */
export function carpetSlice(points: Array<{ x: number; y: number }>, from: number, to: number): Stretch[] {
  const out: Stretch[] = [];
  let run = 0;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const t0 = Math.max(0, (from - run) / (len || 1));
    const t1 = Math.min(1, (to - run) / (len || 1));
    if (len > 0 && t1 > t0) out.push({ x1: a.x + (b.x - a.x) * t0, y1: a.y + (b.y - a.y) * t0, x2: a.x + (b.x - a.x) * t1, y2: a.y + (b.y - a.y) * t1 });
    run += len;
  }
  return out;
}

/**
 * Where a Gourd Gate at (x, y) works: its portcullis drops on the carpet point nearest it, and it holds fruit within
 * `CANNON.gateBand` before that point (`chute`: also just past it, for fruit walking the carpet backwards).
 */
export function gateStrip(points: Array<{ x: number; y: number }>, x: number, y: number, chute = false) {
  const spot = nearestOnCarpet(points, x, y);
  const stretches = carpetSlice(points, spot.along - CANNON.gateBand, spot.along + (chute ? CANNON.gateBand : 0));
  const length = stretches.reduce((n, s) => n + Math.hypot(s.x2 - s.x1, s.y2 - s.y1), 0);
  return { spot, stretches, length };
}

/** Midnight has a third act: six more waves after Unchaperoned. */
export const MIDNIGHT_WAVES = 21;

/** Waves in a night: Midnight 21, the Overflow and the Siege 15, endless 0 (no last wave). */
export function nightLength(night: NightId): number {
  if (night === "endless") return 0;
  return night === "midnight" ? MIDNIGHT_WAVES : WAVE_COUNT;
}

// ---------- endless ----------

export const ENDLESS_PICK_EVERY = 5;

const ENDLESS_NAMES = [
  ["Late returns", "Everything that was checked out is coming back at once."],
  ["Overdue", "The fines are not the scary part anymore."],
  ["Reshelving", "Someone sorted the produce by size. Large first."],
  ["Night shift", "The candles are short. The queue is not."],
  ["Inventory", "Count what is left of the carpet. Then count again."],
  ["Clearance", "Everything must go. Through you, ideally not."],
  ["Restock", "The cellar refilled while you were reloading."],
  ["Closing time", "The library closed hours ago. Nobody told the harvest."],
] as const;

/**
 * Endless waves: act one as written, then generated waves that cycle four themes
 * and grow by count and armour. Karl comes every fifth wave, and brings company later.
 * Deterministic: wave N is always the same, so runs are comparable.
 */
export function endlessWave(index: number): { name: string; blurb: string; spawns: SpawnSpec[] } {
  if (index < WAVES.length) return WAVES[index];
  const n = index + 1; // wave number shown to the player
  const k = index - WAVES.length; // 0 on wave 7
  const grow = Math.floor(k / 2);
  const armour = k >= 6; // guards from wave 13
  const theme = k % 4;
  const spawns: SpawnSpec[] = [];
  if (theme === 0) {
    spawns.push(
      { kind: "corn", count: 10 + grow * 2, every: 0.3 },
      { kind: "corn", count: 2 + grow, every: 0.36, guard: armour ? "husk" : undefined },
      { kind: "melon", count: 4 + grow, every: 0.45 },
    );
  } else if (theme === 1) {
    spawns.push(
      { kind: "melon", count: 8 + grow * 2, every: 0.42, guard: "rind" },
      { kind: "pumpkin", count: 2 + Math.floor(grow / 2), every: 0.9 },
    );
  } else if (theme === 2) {
    spawns.push(
      { kind: "pumpkin", count: 4 + grow, every: 0.75, tough: 1.15 },
      { kind: "pumpkin", count: 2 + Math.floor(grow / 2), every: 1, split: true },
      { kind: "pumpkin", count: armour ? 2 + Math.floor(grow / 2) : 0, every: 1, guard: "damp" },
    );
  } else {
    spawns.push(
      { kind: "corn", count: 6 + grow, every: 0.34 },
      { kind: "melon", count: 5 + grow, every: 0.44, guard: armour ? "rind" : undefined },
      { kind: "pumpkin", count: 3 + Math.floor(grow / 2), every: 0.8, raw: armour },
    );
  }
  if (n % 5 === 0) spawns.push({ kind: "karl", count: 1 + Math.floor(n / 20), every: 3 });
  const [name, blurb] = ENDLESS_NAMES[k % ENDLESS_NAMES.length];
  return {
    name: n % 5 === 0 ? `${name}, with Karl` : name,
    blurb: n % 5 === 0 ? `${blurb} Karl is back. Karl is always back.` : blurb,
    spawns: spawns.filter((sp) => sp.count > 0),
  };
}

/** Enemy health multiplier. Endless follows the original curve to wave 10, then grows by a steady rate. */
export function hpScaleFor(night: NightId, cleared: number) {
  if (night === "overflow") return waveHpScale(storyHpStep(cleared)) * BALANCE.overflowHp;
  if (night !== "endless") return waveHpScale(storyHpStep(cleared));
  if (cleared <= 9) return waveHpScale(cleared);
  return waveHpScale(9) * BALANCE.endlessGrowth ** (cleared - 9);
}

export type Beat = "upgrade" | "consequence" | "victory" | "prep";

export function nextBeat(cleared: number, night: NightId = "midnight"): Beat {
  if (night === "endless") {
    // No story and no last wave: a pick after waves 1, 2 and 6, then every fifth wave.
    if (cleared === 1 || cleared === 2 || cleared === 6) return "upgrade";
    if (cleared > 6 && (cleared - 6) % ENDLESS_PICK_EVERY === 0) return "upgrade";
    return "prep";
  }
  const length = nightLength(night);
  if (cleared >= length) return "victory";
  if (cleared === 1 || cleared === 2 || cleared === 6) return "upgrade";
  // Midnight's fourth shelf, before act three.
  if (night === "midnight" && cleared === WAVE_COUNT) return "upgrade";
  if (cleared === length - 1) return "consequence";
  return "prep";
}

export function waveAt(
  index: number,
  night: NightId = "midnight",
): { name: string; blurb: string; spawns: SpawnSpec[] } {
  if (night === "overflow") return OVERFLOW[Math.min(index, OVERFLOW.length - 1)];
  if (night === "siege") return SIEGE_WAVES[Math.min(index, SIEGE_WAVES.length - 1)];
  if (night === "endless") return endlessWave(index);
  if (index < WAVES.length) return WAVES[index];
  const act = index - WAVES.length;
  const waves = [
    {
      name: "After hours",
      blurb: "Act two. The lamps are low and the produce has stopped pretending to browse.",
      spawns: [
        { kind: "melon" as const, count: 8, every: 0.5 },
        { kind: "corn" as const, count: 6, every: 0.4 },
      ],
    },
    {
      name: "The binding splits",
      blurb: "Thicker than act one, and some of it arrives wet.",
      spawns: [
        { kind: "pumpkin" as const, count: 4, every: 0.85 },
        { kind: "pumpkin" as const, count: 2, every: 1, guard: "damp" as const },
        { kind: "melon" as const, count: 5, every: 0.45, guard: "rind" as const },
      ],
    },
    {
      name: "Thicker",
      blurb: "The carpet was not built for this much fruit.",
      spawns: [
        { kind: "pumpkin" as const, count: 4, every: 0.8, tough: 1.2 },
        { kind: "pumpkin" as const, count: 2, every: 1.1, raw: true },
        { kind: "corn" as const, count: 6, every: 0.35 },
      ],
    },
    {
      name: "Open house",
      blurb: "Corn by the armful, and melons with their rinds on.",
      spawns: [
        { kind: "corn" as const, count: 10, every: 0.32 },
        { kind: "melon" as const, count: 5, every: 0.45, guard: "rind" as const },
      ],
    },
    {
      name: "Self-checkout",
      blurb: "They are letting themselves in and taking what they like.",
      spawns: [
        { kind: "pumpkin" as const, count: 3, every: 1.1, split: true },
        { kind: "pumpkin" as const, count: 3, every: 0.95, guard: "damp" as const },
        { kind: "melon" as const, count: 6, every: 0.5 },
      ],
    },
    {
      name: "Nobody at the desk",
      blurb: "Karl did not need an invitation.",
      spawns: [
        { kind: "karl" as const, count: 1, every: 0.4 },
        { kind: "melon" as const, count: 6, every: 0.45 },
        { kind: "corn" as const, count: 5, every: 0.4, guard: "husk" as const },
      ],
    },
    {
      name: "Late fees",
      blurb: "Raw pumpkins and husked corn. Bake the first, crack the second.",
      spawns: [
        { kind: "pumpkin" as const, count: 4, every: 1, raw: true },
        { kind: "corn" as const, count: 8, every: 0.33, guard: "husk" as const },
      ],
    },
    {
      name: "Full shelves",
      blurb: "There is not much carpet left that is not fruit.",
      spawns: [
        { kind: "pumpkin" as const, count: 6, every: 0.75, tough: 1.3 },
        { kind: "melon" as const, count: 8, every: 0.4, guard: "rind" as const },
        { kind: "corn" as const, count: 6, every: 0.35 },
      ],
    },
    {
      name: "Unchaperoned",
      blurb: "Nobody is keeping an eye on the produce. It comes all at once, and thicker.",
      spawns: [
        { kind: "pumpkin" as const, count: 8, every: 0.7, tough: 1.35 },
        { kind: "corn" as const, count: 10, every: 0.32 },
        { kind: "melon" as const, count: 8, every: 0.4 },
      ],
    },
  ];
  if (act < waves.length) return waves[act];
  return ACT_THREE[Math.min(act - waves.length, ACT_THREE.length - 1)];
}

/** Midnight, act three (waves 16 to 21): one lesson each leads, with a climbing mix behind it (storyHpStep keeps growing). */
const ACT_THREE: Array<{ name: string; blurb: string; spawns: SpawnSpec[] }> = [
  {
    name: "Stone fruit",
    blurb: "Pits in the crowd. Splash, fire and puddles roll off them. A direct shot is what cracks a pit.",
    spawns: [
      { kind: "melon", count: 7, every: 0.5 },
      { kind: "melon", count: 4, every: 0.7, pit: true },
      { kind: "corn", count: 5, every: 0.4 },
    ],
  },
  {
    name: "The aisle",
    blurb: "Ordinary fruit. The stone ones are not in this wave.",
    spawns: [
      { kind: "corn", count: 9, every: 0.34, guard: "husk" },
      { kind: "melon", count: 6, every: 0.5, guard: "rind" },
      { kind: "pumpkin", count: 3, every: 0.9, tough: 1.2 },
    ],
  },
  {
    name: "The gall",
    blurb: "A small thing rides behind each pumpkin and keeps it alive. Shoot the rider, not the front.",
    spawns: [
      { kind: "pumpkin", count: 4, every: 1, gall: true },
      { kind: "corn", count: 6, every: 0.42 },
      { kind: "melon", count: 5, every: 0.5, guard: "rind" },
    ],
  },
  {
    name: "Damp again",
    blurb: "No riders. These pumpkins are wet, and fire will not do the work.",
    spawns: [
      { kind: "pumpkin", count: 5, every: 0.85, guard: "damp" },
      { kind: "melon", count: 7, every: 0.45 },
      { kind: "corn", count: 6, every: 0.36, guard: "husk" },
    ],
  },
  {
    name: "Borrowers",
    blurb: "Fast, and frail. One that reaches the door takes seeds. It does not cost a stack.",
    spawns: [
      { kind: "corn", count: 5, every: 0.7, borrower: true },
      { kind: "melon", count: 8, every: 0.45 },
      { kind: "pumpkin", count: 4, every: 0.8, tough: 1.3 },
      { kind: "melon", count: 3, every: 0.7, guard: "rind" },
    ],
  },
  {
    name: "The stacks, again",
    blurb: "Karl is back. The borrowers are ahead of him, and they still want the seeds.",
    spawns: [
      { kind: "corn", count: 4, every: 0.55, borrower: true },
      { kind: "karl", count: 1, every: 1.2 },
      { kind: "melon", count: 6, every: 0.45, guard: "rind" },
    ],
  },
];

/**
 * Global tuning knobs. Checked with the simulator (npm run sim).
 * enemyHp:   multiplier on every enemy's health.
 * hpPerWave: health growth per wave cleared.
 * hpCurve:   shape of that growth. 1 = straight line; 2 = gentle early, steep late.
 * killGold:  multiplier on seeds paid per kill.
 * slowPower: strength of puddle and chill slows (1 = as written, 0.5 = half as strong). Freeze is separate.
 * michaelSeeds / michaelLives: Sir Michael's starting seeds and stacks.
 */
export const BALANCE = {
  enemyHp: 1,
  hpPerWave: 0.55,
  hpCurve: 2,
  killGold: 1,
  slowPower: 1,
  /** A boss before its night's last wave is a mini-boss: this many times the health of an ordinary one of its kind
   * (a pumpkin for Karl, a goose for the Matriarch, a cat for General Mittens), so 2.5 = 150% more. */
  miniBossHp: 2.5,
  /** Story nights: health steps per wave after wave 6 (0.375 = the 15th wave is as tough as the old 10th). */
  storyHpPace: 0.375,
  /** Midnight's act three (waves 16-21): health steps per wave past 15, so the act climbs into Karl. */
  actThreeHpPace: 0.3,
  /** Endless only: enemy health growth per wave after wave 10 (1.15 = +15% a wave). */
  endlessGrowth: 1.15,
  /** Act three: a pit takes this share of splash, burn and pulp damage; a gall heals its host this share of max health a second; a borrower at the door takes this many seeds. */
  pitResist: 0.12,
  gallHeal: 0.06,
  borrowTake: 12,
  /** The Overflow: extra starting seeds for night two. */
  overflowSeeds: 45,
  /** The Siege: extra starting seeds for night three (the stores by the back door). */
  siegeSeeds: 60,
  michaelSeeds: 145,
  michaelLives: 11,
  /** The Archive: range multiplier for cannons no Reading Lamp reaches. */
  archiveDark: 0.8,
  /** The Overflow (night two): enemy health multiplier on top of the story curve (1.4: about as winnable as Midnight; 1.0 was 96% on Normal). */
  overflowHp: 1.4,
  /** Mynxi's tutorial night is very easy: fruit health and speed multipliers, and extra seeds and stacks at the start. */
  tutorialHp: 0.3,
  tutorialSpeed: 0.8,
  tutorialSeeds: 80,
  tutorialStacks: 8,
};

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
/** "Four", "Nine"... for story text that quotes a tuned number. */
export function stacksWord(n: number) {
  return NUMBER_WORDS[n] ?? String(n);
}

/** Apply slowPower to a speed multiplier (0.45 = crawl at 45% speed). */
export function softenSlow(speed: number) {
  return 1 - (1 - speed) * BALANCE.slowPower;
}

/**
 * Story health. Act one (waves 1-6) climbs the curve as written; each later wave climbs
 * BALANCE.storyHpPace of a step, up to wave 15. Midnight's act three (waves 16-21, the only
 * story waves past 15) keeps climbing, slower: BALANCE.actThreeHpPace of a step a wave.
 */
export function storyHpStep(cleared: number) {
  const c = Math.min(cleared, WAVE_COUNT - 1);
  const late = Math.max(0, cleared - (WAVE_COUNT - 1));
  return (c <= 6 ? c : 6 + (c - 6) * BALANCE.storyHpPace) + late * BALANCE.actThreeHpPace;
}

/** Health multiplier for enemies spawned after `cleared` waves. */
export function waveHpScale(cleared: number) {
  return BALANCE.enemyHp * (1 + BALANCE.hpPerWave * cleared ** BALANCE.hpCurve);
}

/** Seeds paid for a kill, before upgrades like Overdue Fines. */
export function killReward(base: number) {
  return Math.max(1, Math.round(base * BALANCE.killGold));
}

export const STATS: Record<EnemyKind, { hp: number; speed: number; gold: number; r: number; boss?: boolean }> = {
  melon: { hp: 32, speed: 46, gold: 8, r: 14 },
  corn: { hp: 18, speed: 78, gold: 10, r: 11 },
  pumpkin: { hp: 78, speed: 32, gold: 14, r: 17 },
  karl: { hp: 460, speed: 20, gold: 70, r: 28, boss: true },
  // The Siege. Variants with their own health and size (goslings, tanks, the bosses) are in SIEGE.
  goose: { hp: 36, speed: 60, gold: 9, r: 13 },
  cat: { hp: 45, speed: 52, gold: 10, r: 13 },
};

/**
 * Status combos, part one: ice, fire and explosions. `on: false` turns combos and afflictions off (the simulator
 * compares with and without). Bots don't plan combos, so the sim undersells them: tune by playing too.
 */
export const COMBO = {
  on: true,
  // ── Frost: a meter of 0–3 stacks beside the old freeze and chill timers (they still say "held" and "slowed").
  frostMax: 3,
  /** Bosses never go above this. */
  bossFrostMax: 2,
  /** Seconds after the last stack before one drains (damp fruit: ×`dampDrain`). */
  frostDrain: 1.2,
  dampDrain: 2,
  /** Stacks a Freeze cannon hit adds (Deep Freeze: `deepFreezeHit`), and a Cold rind hit. Only ice adds frost. */
  freezeHit: 2,
  deepFreezeHit: 3,
  chillHit: 1,
  /** Cold rind alone can build frost only this high (a Freeze cannon hit fills the rest). */
  chillCap: 3,
  /** Pace at 0, 1 and 2 stacks (3 is frozen solid). */
  frostSlow: [1, 0.8, 0.55] as number[],
  // ── Shatter: the first splash on a fruit with 2+ frost.
  shatterBonus: 0.5,
  /** Ice shards: this share of the shattering hit to every other fruit within `shardRadius`, by stacks (they're splash). */
  shardShare: [0, 0, 0.25, 0.4] as number[],
  shardRadius: 48,
  /** Shrapnel: shard reach ×. Black Ice: a fruit with 3 frost takes × from everything. */
  shrapnelWide: 1.5,
  blackIce: 1.15,
  // ── Thermal shock.
  /** Ice, then fire: fire on a frosted fruit thaws it and bursts for this share of the fire hit (a patch: of a second's burn). */
  thermalBonus: 0.6,
  /** Fire, then ice: a Freeze hit on a burning fruit puts the fire out for this long. */
  douseTime: 1.5,
  // ── Wildfire: a burning fruit slowed (not frozen) passes its fire on.
  /** "Slowed": moving under this share of its pace (one frost, a chill, any slowing puddle; frozen doesn't count). */
  wildfireSpeed: 0.95,
  /** One neighbour within `spreadRadius` catches fire every `spreadEvery` s (Wildfire fitting: twice as often), for `spreadTime` s. */
  spreadEvery: 1,
  spreadRadius: 40,
  spreadTime: 2,
  /** Damp guards, damp rooms and wet carpet: spread rate ×. Husks catch it more easily: preferred, and twice as likely. */
  dampSpread: 0.5,
  // ── Explosions.
  /** A splash in a puddle grows it ×, once. */
  puddleGrow: 1.5,
  /** A splash in a fire patch: burn × `flare` for `flareTime` s. */
  flareTime: 1,
  flare: 2,
  /** Electrified Rounds: the spark reaches × as far to a fruit with frost. */
  sparkFrost: 2,
};

/**
 * Status combos, part two: afflictions, damage over time that stacks. Different afflictions add together;
 * the same one adds a stack (up to its max) and refreshes. Ticks go through `hurt`, so Ink, Honey and guards apply.
 */
export const AFFLICT = {
  /** Stung (Fly Hive hits): damage a second per stack, most stacks, seconds (Barbed stingers: `barbsTime`). */
  stingDps: 3,
  stingMax: 5,
  stingTime: 3,
  barbsTime: 5,
  /** A Spitter seed on a stung fruit drives in this many more (Grit: `gritStacks`). */
  seedStacks: 1,
  gritStacks: 2,
  /**
   * Poisoned (each second in a Cauldron puddle): stacks up to `poisonMax` (Virulent: `virulentMax`), each a third of
   * the puddle's damage, so three stacks are today's puddle. Lasts `poisonTime` s after the last.
   */
  poisonMax: 3,
  virulentMax: 5,
  poisonShare: 1 / 3,
  poisonTime: 3,
  poisonEvery: 1,
  /** Flammable: fire on a poisoned fruit burns × while the poison lasts; the poison is spent when the fire goes out. */
  flammable: 1.5,
  /** The Bookworm also burrows into a fruit with this many stings. */
  wormStings: 3,
  /** Contagion: a fruit dying with 3+ stacks of one affliction passes one stack of each to every fruit within this. */
  contagionStacks: 3,
  contagionRadius: 48,
  /** Burning passed on by contagion lasts this long. */
  contagionBurn: 2,
  /** Most affliction damage a second on one fruit, before Ink and Honey. */
  cap: 60,
};
