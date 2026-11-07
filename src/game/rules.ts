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
  | "alliance"
  | "betrayal"
  | "consequence"
  | "memory"
  | "shop"
  | "victory"
  | "defeat";

export type HeroId = "mynxi" | "michael" | "vael" | "elf" | "ooze" | "scholar";

/** Keepers in Setup order (keys 1–6 pick in this order). */
export const HEROES: HeroId[] = ["mynxi", "vael", "michael", "elf", "ooze", "scholar"];

/** Names used in text. `short` is how the story cards address the keeper. */
export const KEEPER_NAMES: Record<HeroId, { name: string; short: string; role: string }> = {
  mynxi: { name: "Mynxi", short: "Mynxi", role: "Head librarian" },
  vael: { name: "Vaelithra", short: "Vael", role: "Potions division" },
  michael: { name: "Sir Michael", short: "Sir Michael", role: "Pumpkin Knight" },
  elf: { name: "Legal Elf", short: "The Legal Elf", role: "Legal advisor" },
  ooze: { name: "Ooze Clues", short: "Ooze", role: "Astral adventurer" },
  scholar: { name: "Dr. Samodovol", short: "The Doctor", role: "The Scholar" },
};

/** Starting seeds and stacks for the newer keepers (the first three are set in the engine). */
export const KEEPER_START: Partial<Record<HeroId, { seeds: number; lives: number }>> = {
  elf: { seeds: 150, lives: 12 },
  ooze: { seeds: 140, lives: 13 },
  scholar: { seeds: 150, lives: 12 },
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

export type Alliance = "none" | "accept" | "betray" | "reject";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  blurb: string;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  juicy: {
    id: "juicy",
    name: "Juicy Explosions",
    blurb: "Melons burst. The pulp pool burns anyone standing in it.",
  },
  rapid: {
    id: "rapid",
    name: "Rapid Rind",
    blurb: "Cannons cycle 30% faster. The carpet gets louder.",
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
    blurb: "A shot ricochets into a second target.",
  },
  electric: {
    id: "electric",
    name: "Electrified Melons",
    blurb: "Impacts throw a spark into a nearby foe.",
  },
  fines: {
    id: "fines",
    name: "Overdue Fines",
    blurb: "The ledger. Every kill pays 5 extra seeds.",
  },
  caliber: {
    id: "caliber",
    name: "Heavy Caliber",
    blurb: "Sir Michael's shot hits harder. The cannon reloads slower.",
  },
  lamp: {
    id: "lamp",
    name: "Reading Lamp",
    blurb: "Someone marks the range. Cannons see farther down the carpet.",
  },
  splatter: {
    id: "splatter",
    name: "Knight's Splatter",
    blurb: "Each hit chips everyone standing close to the target.",
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
  alliance: Alliance = "none",
  /** Cannon kinds the player has built, most-built first. */
  built: TowerKind[] = [],
): UpgradeDef[] {
  const size = hero === "scholar" ? 4 : 3;
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
      alliance === "betray"
        ? ["bounce", "rapid", "electric", "juicy", "sticky", "seeds"]
        : alliance === "reject"
          ? ["juicy", "sticky", "seeds", "rapid", "electric", "bounce"]
          : ["electric", "sticky", "bounce", "juicy", "rapid", "seeds"];
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
  const extra = built.map((k) => CANNON_UPGRADES[k]).find((id): id is UpgradeId => !!id && !owned.includes(id));
  if (step > 1 && extra && out.length >= 3) out[1] = extra;
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
  // Keeper signature towers: one per keeper, only that keeper can build it, one on the board at a time.
  | "catalogue"
  | "cauldron"
  | "trebuchet"
  | "scales"
  | "mimic"
  | "lectern";

/** Each keeper's signature tower. */
export const SIGNATURE: Record<HeroId, TowerKind> = {
  mynxi: "catalogue",
  vael: "cauldron",
  michael: "trebuchet",
  elf: "scales",
  ooze: "mimic",
  scholar: "lectern",
};
export const SIGNATURE_KINDS: TowerKind[] = Object.values(SIGNATURE);
export const isSignature = (kind: TowerKind) => SIGNATURE_KINDS.includes(kind);

export interface TowerGroup {
  id: "damage" | "control" | "support" | "keeper";
  name: string;
  key: string;
  kinds: TowerKind[];
}

/** Build-bar tabs. Keys 1–5 pick within the open tab; Q / W / E switch tabs (R is the keeper's tab). */
export const TOWER_GROUPS: TowerGroup[] = [
  { id: "damage", name: "Damage", key: "q", kinds: ["melon", "mortar", "spitter", "ballista", "reader"] },
  { id: "control", name: "Control", key: "w", kinds: ["still", "fire", "freeze", "bell", "hive"] },
  { id: "support", name: "Support", key: "e", kinds: ["lantern", "ink", "peeler", "bookworm", "compost"] },
];

/** The keeper's own tab: just their signature tower. */
export function keeperGroup(kind: TowerKind): TowerGroup {
  return { id: "keeper", name: "Keeper", key: "r", kinds: [kind] };
}

/** The tabs a keeper sees: the three shared ones plus their own. */
export function groupsFor(hero: HeroId | null): TowerGroup[] {
  return hero ? [...TOWER_GROUPS, keeperGroup(SIGNATURE[hero])] : TOWER_GROUPS;
}

export function groupOf(kind: TowerKind): TowerGroup {
  if (isSignature(kind)) return keeperGroup(kind);
  return TOWER_GROUPS.find((g) => g.kinds.includes(kind)) ?? TOWER_GROUPS[0];
}

/** Cannons that never shoot. */
export const PASSIVE: TowerKind[] = ["lantern", "compost", "lectern"];
/** Whole-board range. */
export const GLOBAL_RANGE = 900;

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
  catalogue: {
    name: "Card Catalogue",
    blurb: "Mynxi's own. Long reach, and every shot is cross-referenced into two more fruit.",
    cost: 90,
    role: "Chain",
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
  mimic: {
    name: "Mimic Chest",
    blurb: "Ooze's friend Memec. Swallows a nearby fruit whole, then digests. Karl only loses a bite.",
    cost: 100,
    role: "Devour",
  },
  lectern: {
    name: "History Lectern",
    blurb: "The Doctor's own. No shot. Cannons near it hit harder, and more so every wave it stands.",
    cost: 65,
    role: "Study",
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
  hive: { dmg: 0.7, pace: 0.65, range: 0 },
  ink: { dmg: 0.3, pace: 1.2, range: 0.9 },
  peeler: { dmg: 0.6, pace: 1.1, range: 0.9 },
  bookworm: { dmg: 0.4, pace: 1.3, range: 1 },
  catalogue: { dmg: 1.15, pace: 1.1, range: 1.4 },
  cauldron: { dmg: 0.5, pace: 1.7, range: 1.05 },
  trebuchet: { dmg: 1.5, pace: 2.8, range: 1.3 },
  scales: { dmg: 0.6, pace: 1.4, range: 1.15 },
  mimic: { dmg: 0, pace: 4.5, range: 0.75 },
};

/** Tunable numbers for the newer cannons' special effects. */
export const CANNON = {
  bellStun: 0.9,
  bellStunBoss: 0.35,
  lanternRadius: 72,
  lanternRange: 1.15,
  lanternPace: 0.85,
  inkTime: 4,
  inkBonus: 1.25,
  compostSeeds: 15,
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
  /** History Lectern: damage boost to cannons in reach, growing per wave it has stood. */
  lecternRadius: 80,
  lecternBase: 0.25,
  lecternPerWave: 0.05,
  lecternMax: 0.6,
};

export function buildCost(hero: HeroId | null, placed: number, kind: TowerKind) {
  if (hero === "mynxi" && placed === 0) return 40;
  return TOWERS[kind].cost;
}

export function towerReadout(hero: HeroId | null, kind: TowerKind, mods: ModId[], upgrades: UpgradeId[]) {
  const lamp = upgrades.includes("lamp");
  if (kind === "lantern") {
    return { dmg: 0, range: CANNON.lanternRadius + (mods.includes("wick") ? 30 : 0), interval: 0 };
  }
  if (kind === "compost") return { dmg: 0, range: 0, interval: 0 };
  if (kind === "lectern") return { dmg: 0, range: CANNON.lecternRadius, interval: 0 };
  const profile = PROFILE[kind];
  if (profile) {
    const base = hero === "mynxi" ? 176 : 132;
    const far = mods.some((id) => id === "reach" || id === "loud");
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
    (farther ? 28 : 0);
  let pace = kind === "mortar" ? 1.8 : kind === "fire" ? 1.15 : kind === "freeze" ? 1.25 : 1;
  if (mods.includes("haste")) pace *= 0.85;
  let interval = ((upgrades.includes("rapid") ? 0.62 : 0.9) * (upgrades.includes("caliber") ? 1.22 : 1)) * pace;
  if (kind === "still") interval = mods.includes("drip") ? 1 : 1.45;
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
  { id: "reach", name: "Longer barrel", blurb: "This cannon reaches farther down the carpet.", kinds: ["melon", "spitter", "ballista", "ink", "peeler", "bookworm"] },
  { id: "chill", name: "Cold rind", blurb: "Its shot slows whatever it hits, for a moment.", kinds: ["melon", "spitter"] },
  {
    id: "haste",
    name: "Quick wick",
    blurb: "This cannon cycles a little faster. The others do not.",
    kinds: ["melon", "spitter", "ballista", "reader", "bell", "hive", "ink", "peeler", "bookworm"],
  },
  { id: "loud", name: "Louder bell", blurb: "The shush carries farther.", kinds: ["bell"] },
  { id: "swarm", name: "Bigger swarm", blurb: "Two flies leave the hive each time.", kinds: ["hive"] },
  { id: "wick", name: "Longer wick", blurb: "The lamp lights more of the room.", kinds: ["lantern"] },
  { id: "bright", name: "Brighter flame", blurb: "Cannons in its light get a bigger boost.", kinds: ["lantern"] },
  { id: "indelible", name: "Indelible ink", blurb: "The mark lasts longer and stings more.", kinds: ["ink"] },
  { id: "loam", name: "Rich loam", blurb: "The heap pays half again as much.", kinds: ["compost"] },
  { id: "venom", name: "Hungrier worms", blurb: "The burrowing does half again as much damage.", kinds: ["bookworm"] },
  { id: "wide", name: "Wide lob", blurb: "The splash covers more of the fold.", kinds: ["mortar"] },
  { id: "heavy", name: "Heavy lob", blurb: "The splash bites harder.", kinds: ["mortar"] },
  { id: "arc", name: "High arc", blurb: "This mortar lobs farther.", kinds: ["mortar"] },
  { id: "drip", name: "Fast drip", blurb: "The still leaves puddles sooner.", kinds: ["still"] },
  { id: "spread", name: "Broad bowl", blurb: "Each puddle covers more carpet.", kinds: ["still"] },
  { id: "cling", name: "Thick mix", blurb: "The puddle stays on the carpet longer.", kinds: ["still"] },
  { id: "lasting", name: "Banked fire", blurb: "The fire on the carpet burns longer.", kinds: ["fire"] },
  { id: "hotter", name: "Hotter fire", blurb: "Anything standing in the patch burns faster.", kinds: ["fire"] },
  { id: "flare", name: "Long flare", blurb: "This cannon throws the fire farther.", kinds: ["fire"] },
  { id: "hold", name: "Deeper frost", blurb: "The freeze holds for another beat.", kinds: ["freeze"] },
  { id: "brittle", name: "Brittle ice", blurb: "The frozen shot hits harder.", kinds: ["freeze"] },
  { id: "coldreach", name: "Long chill", blurb: "This cannon freezes farther down the carpet.", kinds: ["freeze"] },
];

export function shopPrice(hero: HeroId | null, visits: number) {
  if (hero === "mynxi" && visits === 0) return 15;
  const price = 25 + visits * 15;
  // The Legal Elf negotiates: the back room costs 30% less.
  return hero === "elf" ? Math.round(price * 0.7) : price;
}

/** Share of spent seeds returned when a tower is sold. */
export const SELL_PERCENT = 70;

export function sellValue(paid: number) {
  return Math.round((paid * SELL_PERCENT) / 100); // integer math: 45 * 0.7 would round to 31
}

export function rollMods(kind: TowerKind, owned: ModId[]) {
  const pool = MODS.filter((m) => m.kinds.includes(kind) && !owned.includes(m.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = pool[i];
    pool[i] = pool[j];
    pool[j] = swap;
  }
  return pool.slice(0, 3);
}
export type MapId = "stacks" | "annex" | "mezzanine" | "rarebooks" | "archive" | "overflow";
export type NightId = "midnight" | "overflow" | "endless";

export interface Board {
  id: MapId;
  name: string;
  blurb: string;
  corners: Array<[number, number]>;
  allies: Array<[number, number]>;
  knight: [number, number];
  /** Dark room: cannons lose range unless a Reading Lamp reaches them. */
  dark?: boolean;
  /** Enemy health multiplier on this map (1 if unset). */
  hp?: number;
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
    allies: [
      [4, 3],
      [8, 4],
      [10, 5],
    ],
    knight: [3, 6],
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
    allies: [
      [6, 6],
      [10, 3],
      [6, 2],
    ],
    knight: [2, 5],
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
    allies: [
      [5, 2],
      [14, 4],
      [8, 6],
    ],
    knight: [3, 2],
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
    allies: [
      [6, 2],
      [12, 4],
      [6, 6],
    ],
    knight: [2, 2],
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
    allies: [
      [6, 3],
      [11, 5],
      [2, 3],
    ],
    knight: [2, 5],
    dark: true,
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
    allies: [
      [12, 2],
      [13, 6],
    ],
    knight: [1, 5],
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
    name: "No visitor",
    blurb: "The west door stays shut. The produce did not get the message.",
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
  if (night !== "endless") return waveHpScale(storyHpStep(cleared));
  if (cleared <= 9) return waveHpScale(cleared);
  return waveHpScale(9) * BALANCE.endlessGrowth ** (cleared - 9);
}

export type Beat = "upgrade" | "alliance" | "betrayal" | "consequence" | "memory" | "victory" | "prep";

export function nextBeat(cleared: number, alliance: Alliance, night: NightId = "midnight"): Beat {
  if (night === "endless") {
    // No story and no last wave: a pick after waves 1, 2 and 6, then every fifth wave.
    if (cleared === 1 || cleared === 2 || cleared === 6) return "upgrade";
    if (cleared > 6 && (cleared - 6) % ENDLESS_PICK_EVERY === 0) return "upgrade";
    return "prep";
  }
  if (cleared >= WAVE_COUNT) return "victory";
  if (night === "overflow") {
    if (cleared === 1 || cleared === 2 || cleared === 6) return "upgrade";
    if (cleared === 4) return "memory";
    if (cleared === WAVE_COUNT - 1) return "consequence";
    return "prep";
  }
  if (cleared === 1 || cleared === 2) return "upgrade";
  // Betraying the knight pays out early (Bouncing Melons) instead of this pick.
  if (cleared === 6) return alliance === "betray" ? "prep" : "upgrade";
  if (cleared === 4) return "alliance";
  if (cleared === 5 && alliance === "accept") return "betrayal";
  if (cleared === WAVE_COUNT - 1) return "consequence";
  return "prep";
}

export function waveAt(
  index: number,
  alliance: Alliance,
  night: NightId = "midnight",
): { name: string; blurb: string; spawns: SpawnSpec[] } {
  if (night === "overflow") return OVERFLOW[Math.min(index, OVERFLOW.length - 1)];
  if (night === "endless") return endlessWave(index);
  if (index < WAVES.length) return WAVES[index];
  const act = index - WAVES.length;
  if (alliance === "betray") {
    const waves = [
      {
        name: "He remembers",
        blurb: "You shot first. The corn comes back like it took it personally.",
        spawns: [
          { kind: "corn" as const, count: 8, every: 0.4 },
          { kind: "melon" as const, count: 6, every: 0.5 },
        ],
      },
      {
        name: "Personal",
        blurb: "The grudge is not an army yet. It is already rude.",
        spawns: [
          { kind: "corn" as const, count: 4, every: 0.38 },
          { kind: "corn" as const, count: 4, every: 0.42, guard: "husk" as const },
          { kind: "pumpkin" as const, count: 4, every: 0.9, guard: "damp" as const },
        ],
      },
      {
        name: "No more courtesy",
        blurb: "He stopped pretending this was a visit.",
        spawns: [
          { kind: "pumpkin" as const, count: 4, every: 0.8, tough: 1.2 },
          { kind: "pumpkin" as const, count: 2, every: 1.1, split: true },
          { kind: "corn" as const, count: 6, every: 0.35, guard: "husk" as const },
        ],
      },
      {
        name: "Fines due",
        blurb: "Every melon you popped is on his list. He brought the list.",
        spawns: [
          { kind: "melon" as const, count: 8, every: 0.45, guard: "rind" as const },
          { kind: "corn" as const, count: 6, every: 0.35 },
        ],
      },
      {
        name: "Cold shoulder",
        blurb: "Wet pumpkins and husked corn. Nothing here burns easily.",
        spawns: [
          { kind: "pumpkin" as const, count: 5, every: 0.85, guard: "damp" as const },
          { kind: "corn" as const, count: 6, every: 0.38, guard: "husk" as const },
        ],
      },
      {
        name: "Old friends",
        blurb: "The household he would have brought, minus the manners.",
        spawns: [
          { kind: "karl" as const, count: 1, every: 0.4 },
          { kind: "corn" as const, count: 8, every: 0.32 },
          { kind: "melon" as const, count: 4, every: 0.5 },
        ],
      },
      {
        name: "Crumbs",
        blurb: "Pumpkins that break into four, and melons to fill the gaps.",
        spawns: [
          { kind: "pumpkin" as const, count: 4, every: 1, split: true },
          { kind: "melon" as const, count: 8, every: 0.4 },
        ],
      },
      {
        name: "Payback",
        blurb: "The grudge is close now. This is the part before it.",
        spawns: [
          { kind: "pumpkin" as const, count: 5, every: 0.8, tough: 1.3 },
          { kind: "pumpkin" as const, count: 3, every: 1.1, raw: true },
          { kind: "corn" as const, count: 8, every: 0.3, guard: "husk" as const },
        ],
      },
      {
        name: "The Grudge",
        blurb: "You shot first. He sent the grudge instead of a household.",
        spawns: [
          { kind: "corn" as const, count: 12, every: 0.32 },
          { kind: "pumpkin" as const, count: 6, every: 0.75, tough: 1.3 },
          { kind: "melon" as const, count: 6, every: 0.45, guard: "rind" as const },
        ],
      },
    ];
    return waves[act] ?? waves[waves.length - 1];
  }
  if (alliance === "reject") {
    const waves = [
      {
        name: "Unattended stacks",
        blurb: "No knight. The produce noticed the door was empty.",
        spawns: [
          { kind: "melon" as const, count: 8, every: 0.5 },
          { kind: "corn" as const, count: 6, every: 0.4 },
        ],
      },
      {
        name: "The binding splits",
        blurb: "Thicker than act one. Still no one wearing a helmet.",
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
        blurb: "Nobody is guarding the door, so everybody is using it.",
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
        blurb: "You sent him away. The produce comes alone, and thicker.",
        spawns: [
          { kind: "pumpkin" as const, count: 8, every: 0.7, tough: 1.35 },
          { kind: "corn" as const, count: 10, every: 0.32 },
          { kind: "melon" as const, count: 8, every: 0.4 },
        ],
      },
    ];
    return waves[act] ?? waves[waves.length - 1];
  }
  const waves = [
    {
      name: "Knuckles on the door",
      blurb: "He already turned. Some of the pumpkins are wet, and the melons are still shelled.",
      spawns: [
        { kind: "pumpkin" as const, count: 3, every: 0.85 },
        { kind: "pumpkin" as const, count: 3, every: 0.95, guard: "damp" as const },
        { kind: "melon" as const, count: 4, every: 0.5, guard: "rind" as const },
      ],
    },
    {
      name: "They kept the keys",
      blurb: "Allied cannons are gone. A few pumpkins crack, and a few will bake.",
      spawns: [
        { kind: "pumpkin" as const, count: 3, every: 0.8, tough: 1.25 },
        { kind: "pumpkin" as const, count: 2, every: 1.2, split: true },
        { kind: "pumpkin" as const, count: 2, every: 1.15, raw: true },
        { kind: "corn" as const, count: 5, every: 0.4 },
      ],
    },
    {
      name: "Orange majority",
      blurb: "The carpet is his color now.",
      spawns: [
        { kind: "pumpkin" as const, count: 7, every: 0.7 },
        { kind: "melon" as const, count: 5, every: 0.45 },
      ],
    },
    {
      name: "Squires",
      blurb: "His squires carry shields of rind. Crack them, then crack them again.",
      spawns: [
        { kind: "melon" as const, count: 8, every: 0.45, guard: "rind" as const },
        { kind: "pumpkin" as const, count: 3, every: 0.9 },
      ],
    },
    {
      name: "Siege ladders",
      blurb: "Husked corn up front, raw pumpkins behind.",
      spawns: [
        { kind: "corn" as const, count: 8, every: 0.35, guard: "husk" as const },
        { kind: "pumpkin" as const, count: 3, every: 1, raw: true },
        { kind: "melon" as const, count: 4, every: 0.5 },
      ],
    },
    {
      name: "The bannermen",
      blurb: "Wet ones that will not burn, and cracked ones that will not stay whole.",
      spawns: [
        { kind: "pumpkin" as const, count: 4, every: 0.9, guard: "damp" as const },
        { kind: "pumpkin" as const, count: 3, every: 1.1, split: true },
        { kind: "corn" as const, count: 6, every: 0.4 },
      ],
    },
    {
      name: "Cousin Karl",
      blurb: "Karl has a cousin. He is also called Karl.",
      spawns: [
        { kind: "karl" as const, count: 1, every: 0.4 },
        { kind: "pumpkin" as const, count: 4, every: 0.85, tough: 1.2 },
        { kind: "melon" as const, count: 5, every: 0.45, guard: "rind" as const },
      ],
    },
    {
      name: "Last watch",
      blurb: "Everything he has left that is not the household.",
      spawns: [
        { kind: "pumpkin" as const, count: 5, every: 0.8, tough: 1.25 },
        { kind: "corn" as const, count: 8, every: 0.32, guard: "husk" as const },
        { kind: "melon" as const, count: 6, every: 0.42, guard: "rind" as const },
      ],
    },
    {
      name: "The Household",
      blurb: "He already turned. The household comes back meaner, and taller.",
      spawns: [
        { kind: "pumpkin" as const, count: 4, every: 0.9 },
        { kind: "karl" as const, count: 1, every: 0.4 },
        { kind: "melon" as const, count: 4, every: 0.5 },
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
 * betraySeeds:    seeds for shooting the knight if you already have Bouncing Melons (otherwise you get them).
 * michaelSeeds / michaelLives: Sir Michael's starting seeds and stacks.
 * michaelTurnCut: stacks Sir Michael loses when his own men turn (other heroes lose 2).
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
  betraySeeds: 55,
  michaelSeeds: 110,
  michaelLives: 10,
  michaelTurnCut: 3,
  /** Sir Michael's base shot damage (everyone else: 14). */
  michaelShot: 28,
  /** The Archive: range multiplier for cannons no Reading Lamp reaches. */
  archiveDark: 0.8,
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
