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

export type HeroId = "mynxi" | "michael" | "vael";

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
  | "distill";

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
    blurb: "Mynxi kicks over a crate. +55 seeds. No new tricks.",
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
    blurb: "Mynxi's ledger. Every kill pays 5 extra seeds.",
  },
  caliber: {
    id: "caliber",
    name: "Heavy Caliber",
    blurb: "Sir Michael's shot hits harder. The cannon reloads slower.",
  },
  lamp: {
    id: "lamp",
    name: "Reading Lamp",
    blurb: "She marks the range. Cannons see farther down the carpet.",
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
};

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
  element: "shot" | "fire" | "ice" | "mortar";
  splashRatio: number;
  chill: number;
  freezeExtra: number;
  fireLife: number;
  fireBurn: number;
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
  hero: HeroId | null;
  branch: UpgradeId | null;
  map: MapId;
  build: TowerKind;
  shopVisits: number;
  modOffer: ModDef[];
  shopFor: number | null;
  speed: number;
  paused: boolean;
  difficulty: Difficulty;
  night: NightId;
}

const PAD: UpgradeId[] = ["sticky", "bounce", "electric", "seeds", "juicy", "rapid", "lamp", "splatter"];

function signatureOf(hero: HeroId | null): UpgradeId {
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
): UpgradeDef[] {
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
    if (out.length === 3) break;
  }
  return out.map((id) => UPGRADES[id]);
}
export type TowerKind = "melon" | "mortar" | "still" | "fire" | "freeze";

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
};

export function buildCost(hero: HeroId | null, placed: number, kind: TowerKind) {
  if (hero === "mynxi" && placed === 0) return 40;
  return TOWERS[kind].cost;
}

export function towerReadout(hero: HeroId | null, kind: TowerKind, mods: ModId[], upgrades: UpgradeId[]) {
  const lamp = upgrades.includes("lamp");
  const farther = mods.some((id) => id === "reach" || id === "arc" || id === "flare" || id === "coldreach");
  const range =
    (kind === "still" ? (hero === "mynxi" ? 118 : 96) + (lamp ? 20 : 0) : (hero === "mynxi" ? 176 : 132) + (lamp ? 32 : 0)) +
    (farther ? 28 : 0);
  let pace = kind === "mortar" ? 1.8 : kind === "fire" ? 1.15 : kind === "freeze" ? 1.25 : 1;
  if (mods.includes("haste")) pace *= 0.85;
  let interval = ((upgrades.includes("rapid") ? 0.62 : 0.9) * (upgrades.includes("caliber") ? 1.22 : 1)) * pace;
  if (kind === "still") interval = mods.includes("drip") ? 1 : 1.45;
  let dmg = hero === "michael" ? 20 : 14;
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
  | "coldreach";

export interface ModDef {
  id: ModId;
  name: string;
  blurb: string;
  kinds: TowerKind[];
}

export const MODS: ModDef[] = [
  { id: "reach", name: "Longer barrel", blurb: "This cannon reaches farther down the carpet.", kinds: ["melon"] },
  { id: "chill", name: "Cold rind", blurb: "Its shot slows whatever it hits, for a moment.", kinds: ["melon"] },
  { id: "haste", name: "Quick wick", blurb: "This cannon cycles a little faster. The others do not.", kinds: ["melon"] },
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
  return 25 + visits * 15;
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
const BEST_KEY = "melongeddon-best-wave";
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

export function doorMemory(alliance: Alliance): string {
  if (alliance === "accept") {
    return "You let him in. His cannons are already at the chute, and the damp pumpkins live here.";
  }
  if (alliance === "betray") return "You shot first. He did not come to ask again. The husks were the greeting.";
  if (alliance === "reject") return "You sent him away. The west door is still shut. The chute is not.";
  return "The first night has not ended yet.";
}

export type MapId = "stacks" | "annex" | "overflow";
export type NightId = "midnight" | "overflow";

export interface Board {
  id: MapId;
  name: string;
  blurb: string;
  corners: Array<[number, number]>;
  allies: Array<[number, number]>;
  knight: [number, number];
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

function cornerRot(prev: [number, number], corner: [number, number], next: [number, number]) {
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

const STACKS = buildBoard(BOARDS.stacks.corners);

export type Difficulty = "easy" | "normal" | "hard";
export type Guard = "none" | "rind" | "husk" | "damp";

export const DIFFICULTIES: Array<{ id: Difficulty; name: string; blurb: string; hp: number; speed: number }> = [
  { id: "easy", name: "Story", blurb: "Thinner rinds. They walk a little slower.", hp: 0.75, speed: 0.9 },
  { id: "normal", name: "Stacks", blurb: "The library as written.", hp: 1, speed: 1 },
  { id: "hard", name: "Melongeddon", blurb: "Thicker fruit, and they do not stroll.", hp: 1.35, speed: 1.12 },
];

interface SpawnSpec {
  kind: EnemyKind;
  count: number;
  every: number;
  tough?: number;
  guard?: Guard;
  split?: boolean;
  raw?: boolean;
  chute?: boolean;
}

const WAVES: Array<{ name: string; blurb: string; spawns: SpawnSpec[] }> = [
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

const OVERFLOW: Array<{ name: string; blurb: string; spawns: SpawnSpec[] }> = [
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

export const WAVE_COUNT = 10;

export type Beat = "upgrade" | "alliance" | "betrayal" | "consequence" | "memory" | "victory" | "prep";

export function nextBeat(cleared: number, alliance: Alliance, night: NightId = "midnight"): Beat {
  if (cleared >= WAVE_COUNT) return "victory";
  if (night === "overflow") {
    if (cleared === 1 || cleared === 2 || cleared === 6) return "upgrade";
    if (cleared === 4) return "memory";
    if (cleared === 9) return "consequence";
    return "prep";
  }
  if (cleared === 1 || cleared === 2 || cleared === 6) return "upgrade";
  if (cleared === 4) return "alliance";
  if (cleared === 5 && alliance === "accept") return "betrayal";
  if (cleared === 9) return "consequence";
  return "prep";
}

export function waveAt(
  index: number,
  alliance: Alliance,
  night: NightId = "midnight",
): { name: string; blurb: string; spawns: SpawnSpec[] } {
  if (night === "overflow") return OVERFLOW[Math.min(index, OVERFLOW.length - 1)];
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
          { kind: "pumpkin" as const, count: 4, every: 0.8 },
          { kind: "pumpkin" as const, count: 2, every: 1.1, split: true },
          { kind: "corn" as const, count: 6, every: 0.35 },
        ],
      },
      {
        name: "The Grudge",
        blurb: "You shot first. He sent the grudge instead of a household.",
        spawns: [
          { kind: "corn" as const, count: 12, every: 0.32 },
          { kind: "pumpkin" as const, count: 5, every: 0.8 },
          { kind: "melon" as const, count: 6, every: 0.45 },
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

const STATS: Record<EnemyKind, { hp: number; speed: number; gold: number; r: number; boss?: boolean }> = {
  melon: { hp: 32, speed: 46, gold: 8, r: 14 },
  corn: { hp: 18, speed: 78, gold: 10, r: 11 },
  pumpkin: { hp: 78, speed: 32, gold: 14, r: 17 },
  karl: { hp: 460, speed: 20, gold: 70, r: 28, boss: true },
};

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export interface World {
  hud: Hud;
  hover: { c: number; r: number } | null;
  anim: number;
  enemies: Enemy[];
  towers: Tower[];
  shots: Shot[];
  pools: Pool[];
  sparks: Spark[];
  bits: Bit[];
  floaters: Floater[];
  shake: number;
  pathCells: Set<string>;
  points: Waypoint[];
  turns: Array<{ c: number; r: number; rot: number }>;
  reduced: boolean;
}

export function createWorld(onChange: () => void): {
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
  openLibrary: () => void;
  beginNight: () => void;
  reset: () => void;
  unlock: () => void;
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
      hero: null,
      branch: null,
      map: "stacks",
      build: "melon",
      shopVisits: 0,
      modOffer: [],
      shopFor: null,
      speed: 1,
      paused: false,
      difficulty: "normal",
      night: "midnight",
    },
    hover: null,
    anim: 0,
    enemies: [],
    towers: [],
    shots: [],
    pools: [],
    sparks: [],
    bits: [],
    floaters: [],
    shake: 0,
    pathCells: STACKS.cells,
    points: STACKS.points,
    turns: STACKS.turns,
    reduced: false,
  };

  let cleared = 0;
  let queue: Array<{ kind: EnemyKind; t: number; tough: number; guard: Guard; split: boolean; raw: boolean; chute: boolean }> = [];
  let absurdDrops = 0;
  let queueCursor = 0;
  let spawnClock = 0;
  let karlReward = false;
  const has = (u: UpgradeId) => world.hud.upgrades.includes(u);

  if (typeof window !== "undefined") {
    world.hud.best = readBest();
    world.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  const notify = () => onChange();

  const bumpBest = () => {
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
  // All player tower stats come from towerReadout(), the same function the
  // inspector panel shows, so the numbers on screen are the numbers in play.
  const ALLY_STATS = { dmg: 11, range: 150, interval: 1.05 };
  const statsFor = (tower: Tower) =>
    tower.ally ? ALLY_STATS : towerReadout(world.hud.hero, tower.kind, tower.mods, world.hud.upgrades);
  const rangeFor = (kind: TowerKind) => towerReadout(world.hud.hero, kind, [], world.hud.upgrades).range;
  const priceNext = () => buildCost(world.hud.hero, placedCount(), world.hud.build);
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
    const hp = Math.round(st.hp * bonusHp * tuned.hp);
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
      gold: st.gold,
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
    const hp = Math.round(st.hp * 0.55 * tuned.hp);
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
        gold: 4,
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
      world.towers.push({ id: id(), c, r, x: p.x, y: p.y, cd: 0.2, aim: 0, ally: true, orange: true, kind: "melon", mods: [] });
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

  const removeAllies = () => {
    world.towers = world.towers.filter((t) => !t.ally);
  };

  const loseLife = (n: number, x: number, y: number) => {
    world.hud.lives = Math.max(0, world.hud.lives - n);
    world.shake = world.reduced ? 0 : 8;
    float(x, y, n > 1 ? `−${n} stacks` : "Leak", "#e23b4a");
    if (world.hud.lives <= 0) {
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
    world.hud.seeds += e.gold + (has("fines") ? 5 : 0);
    world.hud.absurdity = Math.min(100, world.hud.absurdity + (e.boss ? 18 : 3));
    burst(e.x, e.y, e.kind === "pumpkin" || e.kind === "karl" ? "#e8883a" : "#e23b4a", e.boss ? 28 : 10);
    if (e.split) spill(e);
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
    via: "shot" | "splash" | "burn" | "pulp" = "shot",
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
    e.hp -= amount;
    if (amount >= 1) float(e.x, e.y - 10, String(Math.round(amount)), "#f3e2c4");
    if (e.hp <= 0) onDeath(e);
  };

  const onShotHit = (shot: Shot, e: Enemy) => {
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
    if (!shot.fromAlly && (has("juicy") || has("sticky") || has("vial") || has("distill"))) {
      addPool(e.x, e.y);
      if (has("juicy")) {
        for (const other of world.enemies) hurt(other, e, 8, 46, "splash");
      }
    }
    if (has("splatter") && !shot.fromAlly) {
      for (const other of world.enemies) hurt(other, e, 9, 40, "splash");
    }
    if (shot.splash > 0 && !shot.fromAlly) {
      for (const other of world.enemies)
        hurt(other, e, Math.max(6, Math.round(shot.dmg * shot.splashRatio)), shot.splash, "splash");
    }
    if (has("electric") && !shot.fromAlly) {
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

  const endWave = () => {
    cleared += 1;
    bumpBest();
    world.hud.wave = Math.min(WAVE_COUNT, cleared + 1);
    world.enemies = [];
    world.shots = [];
    if (world.hud.lives <= 0) return;
    const beat = nextBeat(cleared, world.hud.alliance, world.hud.night);
    const upcoming = waveAt(Math.min(cleared, WAVE_COUNT - 1), world.hud.alliance, world.hud.night);
    if (beat === "victory") {
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
      notify();
      return;
    }
    if (beat === "upgrade") {
      const step = cleared === 6 ? 3 : cleared === 1 ? 1 : 2;
      world.hud.offer = buildOffer(world.hud.hero, step, world.hud.upgrades, world.hud.branch, world.hud.alliance);
      world.hud.phase = "upgrade";
      world.hud.log =
        step === 3
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
    notify();
  };

  const tickCombat = (dt: number) => {
    const scale = 1 + cleared * 0.1;
    spawnClock += dt;
    while (queueCursor < queue.length && spawnClock >= queue[queueCursor].t) {
      spawnEnemy(queue[queueCursor].kind, scale * queue[queueCursor].tough, queue[queueCursor].guard, {
        split: queue[queueCursor].split,
        raw: queue[queueCursor].raw,
        chute: queue[queueCursor].chute,
      });
      queueCursor += 1;
    }
    if (world.hud.night === "overflow" && cleared >= 8) {
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
        slow = Math.min(slow, crawl);
        if (has("juicy") || has("distill")) dot = has("distill") ? 16 : 10;
      }
      if (e.chill > 0) {
        e.chill -= dt;
        slow = Math.min(slow, has("distill") ? 0.48 : 0.62);
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
      let target: Enemy | null = null;
      let bestProg = -1;
      const stats = statsFor(tower);
      const range = stats.range;
      for (const e of world.enemies) {
        if (e.hp <= 0) continue;
        const d2 = (e.x - tower.x) ** 2 + (e.y - tower.y) ** 2;
        if (d2 > range * range) continue;
        const prog = e.wp * 1000 - Math.hypot(e.x - (world.points[e.wp]?.x ?? e.x), e.y - (world.points[e.wp]?.y ?? e.y));
        if (prog > bestProg) {
          bestProg = prog;
          target = e;
        }
      }
      if (!target) continue;
      tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cd > 0) continue;
      if (tower.kind === "still") {
        tower.cd = stats.interval;
        addPool(target.x, target.y, hasMod(tower, "spread"), hasMod(tower, "cling"));
        continue;
      }
      tower.cd = stats.interval;
      const dmg = stats.dmg;
      world.shots.push({
        id: id(),
        x: tower.x,
        y: tower.y,
        tx: target.x,
        ty: target.y,
        target: target.id,
        dmg,
        life: 1.6,
        bounces: !tower.ally && tower.kind === "melon" && has("bounce") ? 1 : 0,
        fromAlly: tower.ally,
        orange: tower.kind === "mortar" || tower.orange,
        splash: tower.kind === "mortar" ? 46 + (hasMod(tower, "wide") ? 18 : 0) : 0,
        element: tower.kind === "fire" ? "fire" : tower.kind === "freeze" ? "ice" : tower.kind === "mortar" ? "mortar" : "shot",
        splashRatio: hasMod(tower, "heavy") ? 0.8 : 0.55,
        chill: hasMod(tower, "chill") ? 0.75 : 0,
        freezeExtra: hasMod(tower, "hold") ? 0.55 : 0,
        fireLife: hasMod(tower, "lasting") ? 3.6 : 2.4,
        fireBurn: hasMod(tower, "hotter") ? 34 : 22,
      });
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
      };
      world.towers.push(tower);
      world.hud.seeds -= world.hud.towerCost;
      world.hud.selected = tower.id;
      world.hud.log = `${TOWERS[buildKind].name} set.`;
      syncPrice();
      notify();
    },
    startWave() {
      if (world.hud.phase === "betrayal") {
        removeAllies();
        const cut = world.hud.hero === "michael" ? 4 : 2;
        world.hud.lives = Math.max(0, world.hud.lives - cut);
        world.shake = world.reduced ? 0 : 12;
        world.hud.log =
          cut === 4
            ? "They were his. They still turned. Four stacks are paste."
            : "He turned. Two stacks are paste. His pumpkins are already moving.";
        if (world.hud.lives <= 0) {
          world.hud.phase = "defeat";
          bumpBest();
          notify();
          return;
        }
      }
      if (world.hud.phase !== "prep" && world.hud.phase !== "betrayal" && world.hud.phase !== "consequence") return;
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
      if (!world.hud.branch) world.hud.branch = upgradeId;
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
        const alreadyBounce = has("bounce");
        if (!alreadyBounce) world.hud.upgrades = [...world.hud.upgrades, "bounce"];
        world.hud.seeds += alreadyBounce ? 40 : 55;
        world.hud.log = "You shot first. Bouncing melons, extra seeds, and a grudge.";
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
      world.hud.seeds += 35;
      world.hud.selected = null;
      world.hud.log = tower.mods.length ? "Cannon sold for 35. The fittings go with it." : "Cannon sold for 35 seeds.";
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
        world.hud.seeds = 90;
        world.hud.lives = 9;
        world.hud.maxLives = 9;
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
        });
        world.hud.log = overflow
          ? "His cannon is already set. Nine stacks, and the chute is not his door."
          : "His cannon is already set. Nine stacks, and the shots hit harder.";
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
      syncPrice();
      notify();
    },
    chooseMap(map: MapId) {
      if (world.hud.phase !== "select" || world.hud.night === "overflow") return;
      if (map === "overflow") return;
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
      const price = shopPrice(world.hud.hero, world.hud.shopVisits);
      if (world.hud.seeds < price) return;
      const offer = rollMods(tower.kind, tower.mods);
      if (offer.length === 0) return;
      world.hud.modOffer = offer;
      world.hud.shopFor = tower.id;
      world.hud.phase = "shop";
      world.hud.log = `${TOWERS[tower.kind].name}. ${price} seeds, and it stays on this cannon.`;
      notify();
    },
    pickMod(modId: ModId) {
      if (world.hud.phase !== "shop" || world.hud.shopFor == null) return;
      const tower = world.towers.find((t) => t.id === world.hud.shopFor && !t.ally);
      const mod = world.hud.modOffer.find((m) => m.id === modId);
      if (!tower || !mod || tower.mods.length >= 2 || tower.mods.includes(modId)) return;
      const price = shopPrice(world.hud.hero, world.hud.shopVisits);
      if (world.hud.seeds < price) return;
      world.hud.seeds -= price;
      world.hud.shopVisits += 1;
      tower.mods = [...tower.mods, modId];
      world.hud.phase = "prep";
      world.hud.modOffer = [];
      world.hud.shopFor = null;
      world.hud.range = towerRange(tower);
      world.hud.log = `${mod.name} fitted. It does not leave this cannon.`;
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
    nudgeSpeed(dir: -1 | 1) {
      const steps = [0.5, 1, 2, 3];
      const at = steps.indexOf(world.hud.speed);
      const next = Math.max(0, Math.min(steps.length - 1, (at < 0 ? 1 : at) + dir));
      world.hud.speed = steps[next];
      notify();
    },
    togglePause() {
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
        world.hud.log = "Choose who holds the stacks.";
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
    openLibrary() {
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
    reset() {
      world.enemies = [];
      world.towers = [];
      world.shots = [];
      world.pools = [];
      world.sparks = [];
      world.bits = [];
      world.floaters = [];
      world.shake = 0;
      world.hover = null;
      cleared = 0;
      queue = [];
      queueCursor = 0;
      karlReward = false;
      absurdDrops = 0;
      applyBoard("stacks");
      world.hud = {
        ...world.hud,
        phase: "select",
        seeds: 150,
        lives: 12,
        maxLives: 12,
        wave: 1,
        waveName: WAVES[0].name,
        blurb: WAVES[0].blurb,
        upgrades: [],
        offer: [],
        alliance: "none",
        log: "Choose who holds the stacks.",
        absurdity: 0,
        selected: null,
        canPlace: false,
        towerCost: TOWERS.melon.cost,
        range: 132,
        placeRange: 132,
        left: 0,
        waveSize: 0,
        hero: null,
        branch: null,
        build: "melon",
        shopVisits: 0,
        modOffer: [],
        shopFor: null,
        speed: 1,
        paused: false,
        night: "midnight",
        map: "stacks",
      };
      notify();
    },
    unlock() {
      /* gesture hook reserved for audio in the component */
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
