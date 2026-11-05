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
export type Difficulty = "easy" | "normal" | "hard";
export type Guard = "none" | "rind" | "husk" | "damp";

export const DIFFICULTIES: Array<{ id: Difficulty; name: string; blurb: string; hp: number; speed: number }> = [
  { id: "easy", name: "Story", blurb: "Thinner rinds. They walk a little slower.", hp: 0.75, speed: 0.9 },
  { id: "normal", name: "Stacks", blurb: "The library as written.", hp: 1, speed: 1 },
  { id: "hard", name: "Melongeddon", blurb: "Thicker fruit, and they do not stroll.", hp: 1.35, speed: 1.12 },
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

export const STATS: Record<EnemyKind, { hp: number; speed: number; gold: number; r: number; boss?: boolean }> = {
  melon: { hp: 32, speed: 46, gold: 8, r: 14 },
  corn: { hp: 18, speed: 78, gold: 10, r: 11 },
  pumpkin: { hp: 78, speed: 32, gold: 14, r: 17 },
  karl: { hp: 460, speed: 20, gold: 70, r: 28, boss: true },
};
