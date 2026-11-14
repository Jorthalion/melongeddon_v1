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

export type HeroId = "mynxi" | "michael" | "vael" | "elf" | "ooze" | "scholar" | "quack";

/** Keepers in Setup order (keys 1–7 pick in this order). */
export const HEROES: HeroId[] = ["mynxi", "vael", "michael", "elf", "ooze", "scholar", "quack"];

/** Names used in text. `short` is how the story cards address the keeper. */
export const KEEPER_NAMES: Record<HeroId, { name: string; short: string; role: string }> = {
  mynxi: { name: "Mynxi", short: "Mynxi", role: "Head librarian" },
  vael: { name: "Vaelithra", short: "Vael", role: "Potions division" },
  michael: { name: "Sir Michael", short: "Sir Michael", role: "Pumpkin Knight" },
  elf: { name: "Legal Elf", short: "The Legal Elf", role: "Legal advisor" },
  ooze: { name: "Ooze Clues", short: "Ooze", role: "Astral adventurer" },
  scholar: { name: "Dr. Samodovol", short: "The Doctor", role: "The Scholar" },
  quack: { name: "Quackarot", short: "Quackarot", role: "Field strategist" },
};

/** Starting seeds and stacks for the newer keepers (the first three are set in the engine). */
export const KEEPER_START: Partial<Record<HeroId, { seeds: number; lives: number }>> = {
  elf: { seeds: 150, lives: 12 },
  ooze: { seeds: 140, lives: 13 },
  scholar: { seeds: 100, lives: 8 },
  quack: { seeds: 130, lives: 11 },
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

export type EnemyKind = "melon" | "corn" | "pumpkin" | "karl";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  blurb: string;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  juicy: {
    id: "juicy",
    name: "Juicy Explosions",
    blurb: "Cannon hits burst. The pulp pool burns anyone standing in it.",
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
    name: "Bouncing Melons",
    blurb: "Melon cannon shots ricochet into a second target.",
  },
  electric: {
    id: "electric",
    name: "Electrified Melons",
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
  | "quackliber";

/** Each keeper's signature tower. */
export const SIGNATURE: Record<HeroId, TowerKind> = {
  mynxi: "catalogue",
  vael: "cauldron",
  michael: "trebuchet",
  elf: "scales",
  ooze: "mimic",
  scholar: "lectern",
  quack: "quackliber",
};
/** Every tower in each keeper's own tab: the signature first, then any extras. */
export const KEEPER_TOWERS: Record<HeroId, TowerKind[]> = {
  mynxi: ["catalogue", "desk"],
  vael: ["cauldron", "flask"],
  michael: ["trebuchet"],
  elf: ["scales", "stomp", "honey"],
  ooze: ["mimic", "copycat"],
  scholar: ["lectern"],
  quack: ["quackliber"],
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
  // Puddle upgrades: the still and cauldron, and the pulp melon cannons leave.
  sticky: ["alchemy", "cannon"],
  vial: ["alchemy", "cannon"],
  distill: ["alchemy", "cannon"],
};

/** Shared upgrades that belong to one tower rather than a type (Bouncing Melons is the melon cannon's). */
export const UPGRADE_KIND: Partial<Record<UpgradeId, TowerKind>> = { bounce: "melon" };

/** Does upgrade `id` change tower `kind`? */
export function upgradeAffects(id: UpgradeId, kind: TowerKind) {
  if (CANNON_UPGRADES[kind] === id || UPGRADE_KIND[id] === kind) return true;
  return UPGRADE_TARGETS[id]?.includes(TOWER_TYPE[kind]) ?? false;
}

/**
 * What an upgrade card says it reaches, in player words, as one short chip on its title row
 * ("Melon cannons", "Cannons and precision", "The ledger").
 */
export const UPGRADE_SCOPE: Record<UpgradeId, string> = {
  juicy: "Cannons",
  rapid: "Cannons and precision",
  seeds: "Seeds, once",
  sticky: "Puddles",
  bounce: "Melon cannons",
  electric: "Cannons",
  fines: "The ledger",
  caliber: "Cannons",
  lamp: "Cannons and precision",
  splatter: "Cannons",
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
/** Whole-board range: more than the diagonal of the largest board (22 x 14 cells is about 1250 px). */
export const GLOBAL_RANGE = 1400;

export const TOWERS: Record<TowerKind, { name: string; blurb: string; cost: number; role: string }> = {
  melon: {
    name: "Melon cannon",
    blurb: "Steady shot at whoever is furthest along the carpet.",
    cost: 60,
    role: "Long range",
  },
  mortar: {
    name: "Pumpkin mortar",
    blurb: "Slow lob. The splash covers whoever is standing close.",
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
    blurb: "The hit leaves fire on the carpet. Standing in it burns.",
    cost: 70,
    role: "Burn",
  },
  freeze: {
    name: "Freeze cannon",
    blurb: "The hit stops them cold, melon or otherwise. Then they thaw.",
    cost: 65,
    role: "Slow",
  },
  spitter: {
    name: "Seed Spitter",
    blurb: "Rapid fire, tiny seeds, short reach. Shreds corn. Shelled melons shrug it off.",
    cost: 50,
    role: "Rapid",
  },
  ballista: {
    name: "Shelf Ballista",
    blurb: "A bookend spear that goes through everything in a straight line.",
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
    blurb: "Fruit flies that find anything, anywhere on the board. Small bites, never miss.",
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
    blurb: "Burrows into pumpkins and Karl for heavy damage over time. Bored by the rest.",
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
    blurb: "Vael's own. Lobs a potion that leaves a green puddle: it slows and it eats.",
    cost: 85,
    role: "Poison",
  },
  trebuchet: {
    name: "Pumpkin Trebuchet",
    blurb: "Sir Michael's own. A huge, slow lob that knocks fruit back down the carpet.",
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
    blurb: "Ooze Clues' second. Blank until it sits right beside a Melon, Mortar, Still, Fire or Freeze cannon (corners don't count). Then it becomes a copy, upgrades and all, one step harder: farther, wider, sooner, longer. Never more damage.",
    cost: 160,
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
    cost: 65,
    role: "Study",
  },
  quackliber: {
    name: "Quack-Liber",
    blurb: "Quackarot's own. A two-barrel backpack turret that fires orange rockets: they burst over a small area and slow what they hit. Every other tower within two tiles fires 10% faster while it stands. Once, after placing it, you can change what it aims at.",
    cost: 95,
    role: "Rockets",
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
  quackliber: { dmg: 1.1, pace: 1.7, range: 1.05 },
};

/** Tunable numbers for the newer cannons' special effects. */
export const CANNON = {
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
  trebuchetKnock: 34,
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
  lectureSlow: 0.85,
  /** Dr. Samodovol's false book: next combat his cannons deal (1 - this) damage and take (1 + this) time between shots. */
  misread: 0.15,
  /** Quack-Liber: rocket burst radius (px) and share of the hit it deals there, and how long what it hits stays slowed (s). */
  quackSplash: 44,
  quackSplashRatio: 0.6,
  quackSlow: 0.6,
  /** Quack-Liber: towers within this reach (px) fire this much faster (1.1 = +10% attack speed). */
  quackAura: 96,
  quackHaste: 1.1,
  /** Quiet Confidence: after a Quack-Liber kill, its aura is this much faster again for this long (s). */
  quackRally: 1.2,
  quackRallyTime: 2,
  /** Lane Lockdown: every this many rockets, a suppression patch of this radius (px) and life (s) on the carpet. */
  quackLockEvery: 4,
  quackLockRadius: 34,
  quackLockLife: 3,
  /** Covering Fire: fruit a rocket hits are sticky (honey's damage taken) for this long (s). */
  quackCover: 2,
  /** Defensive Perimeter: fruit this close (px) to the line between two Quack-Libers walk at this speed. */
  quackLine: 22,
  quackLineSlow: 0.7,
  /** Trick shots. */
  boomerangTime: 1.2,
  /** How wide the loop is, as a share of the throw distance. */
  boomerangWidth: 0.42,
  orreryPlanets: 3,
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

export function towerReadout(hero: HeroId | null, kind: TowerKind, mods: ModId[], upgradesOwned: UpgradeId[]) {
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
    let dmg = hero === "michael" ? BALANCE.michaelShot : 14;
    if (upgrades.includes("caliber")) dmg += 8;
    dmg = profile.dmg === 0 ? 0 : Math.max(1, Math.round(dmg * profile.dmg));
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
  let dmg = hero === "michael" ? BALANCE.michaelShot : 14;
  if (upgrades.includes("caliber")) dmg += 8;
  if (kind === "mortar") dmg = Math.round(dmg * 0.8);
  if (kind === "fire") dmg = Math.round(dmg * 0.65);
  if (kind === "freeze") dmg = Math.round(dmg * (mods.includes("brittle") ? 0.7 : 0.45));
  if (kind === "still") dmg = 0;
  return { dmg, range, interval };
}

export type ModId =
  | "reach"
  | "chill"
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
  | "venom";

export interface ModDef {
  id: ModId;
  name: string;
  blurb: string;
  kinds: TowerKind[];
}

export const MODS: ModDef[] = [
  { id: "reach", name: "Longer barrel", blurb: "Reaches farther down the carpet.", kinds: ["melon", "spitter", "ballista", "ink", "peeler", "bookworm", "boomerang", "orrery", "plane", "quill", "globe", "press", "scope"] },
  { id: "chill", name: "Cold rind", blurb: "Its shot slows whatever it hits, for a moment.", kinds: ["melon", "spitter"] },
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
export function fittingsFor(kind: TowerKind) {
  return MODS.filter((m) => m.kinds.includes(kind));
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

export type MapId = "stacks" | "annex" | "mezzanine" | "rarebooks" | "archive" | "greathall" | "readingroom" | "overflow";
export type NightId = "midnight" | "overflow" | "endless";

export interface Board {
  id: MapId;
  name: string;
  blurb: string;
  corners: Array<[number, number]>;
  /** Where Sir Michael's free melon cannon stands (kept clear of shelves on every board). */
  michaelCannon: [number, number];
  /** Dark room: cannons lose range unless a Reading Lamp reaches them. */
  dark?: boolean;
  /** Enemy health multiplier on this map (1 if unset). */
  hp?: number;
  /** Board size in cells (default COLS x ROWS). Bigger boards draw smaller so they still fit the screen. */
  cols?: number;
  rows?: number;
  /** Bookshelf cells: cannons can't be built on them (default: the classic layout). */
  shelves?: Array<[number, number]>;
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
 * carpet, outside the board, or on Sir Michael's cannon spot is left out.
 */
export function shelfCells(map: MapId, path: Set<string>): Set<string> {
  const b = BOARDS[map];
  const { cols, rows } = boardSize(map);
  const fixed = new Set([b.michaelCannon].map(([c, r]) => `${c},${r}`));
  const out = new Set<string>();
  for (const [c, r] of b.shelves ?? DEFAULT_SHELVES) {
    const key = `${c},${r}`;
    if (c < 0 || r < 0 || c >= cols || r >= rows || path.has(key) || fixed.has(key)) continue;
    out.add(key);
  }
  return out;
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

export function buildBoard(corners: Array<[number, number]>) {
  const cells = new Set<string>();
  const mark = (c: number, r: number) => cells.add(`${c},${r}`);
  for (let i = 0; i < corners.length - 1; i++) {
    const [c0, r0] = corners[i];
    const [c1, r1] = corners[i + 1];
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    let c = c0;
    let r = r0;
    mark(c, r);
    while (c !== c1 || r !== r1) {
      c += dc;
      r += dr;
      mark(c, r);
    }
  }
  const points = corners.map(([c, r]) => ({
    x: c * CELL + CELL / 2,
    y: r * CELL + CELL / 2,
  }));
  const turns = corners.slice(1, -1).map((corner, i) => ({
    c: corner[0],
    r: corner[1],
    rot: cornerRot(corners[i], corner, corners[i + 2]),
  }));
  return { cells, points, turns };
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
      { kind: "melon", count: 6, every: 0.75, guard: "rind" },
      { kind: "corn", count: 4, every: 0.6 },
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

export const WAVE_COUNT = 15;

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
  if (cleared >= WAVE_COUNT) return "victory";
  if (cleared === 1 || cleared === 2 || cleared === 6) return "upgrade";
  if (cleared === WAVE_COUNT - 1) return "consequence";
  return "prep";
}

export function waveAt(
  index: number,
  night: NightId = "midnight",
): { name: string; blurb: string; spawns: SpawnSpec[] } {
  if (night === "overflow") return OVERFLOW[Math.min(index, OVERFLOW.length - 1)];
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
  return waves[act] ?? waves[waves.length - 1];
}

/**
 * Global tuning knobs. Checked with the simulator (npm run sim).
 * enemyHp:   multiplier on every enemy's health.
 * hpPerWave: health growth per wave cleared.
 * hpCurve:   shape of that growth. 1 = straight line; 2 = gentle early, steep late.
 * killGold:  multiplier on seeds paid per kill.
 * pulpEvery: seconds between pulp puddles from one melon cannon (pulp upgrades).
 * slowPower: strength of puddle and chill slows (1 = as written, 0.5 = half as strong). Freeze is separate.
 * michaelSeeds / michaelLives: Sir Michael's starting seeds and stacks.
 */
export const BALANCE = {
  enemyHp: 1,
  hpPerWave: 0.55,
  hpCurve: 2,
  killGold: 1,
  pulpEvery: 2.5,
  slowPower: 1,
  /** Story nights: health steps per wave after wave 6 (0.375 = the 15th wave is as tough as the old 10th). */
  storyHpPace: 0.375,
  /** Endless only: enemy health growth per wave after wave 10 (1.15 = +15% a wave). */
  endlessGrowth: 1.15,
  /** The Overflow: extra starting seeds for night two. */
  overflowSeeds: 45,
  michaelSeeds: 110,
  michaelLives: 10,
  /** Sir Michael's base shot damage (everyone else: 14). */
  michaelShot: 28,
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
 * Story nights are 15 waves. Act one (waves 1-6) climbs the health curve as written;
 * each later wave climbs BALANCE.storyHpPace of a step.
 */
export function storyHpStep(cleared: number) {
  return cleared <= 6 ? cleared : 6 + (cleared - 6) * BALANCE.storyHpPace;
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
};
