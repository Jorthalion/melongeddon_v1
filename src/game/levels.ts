/**
 * Keeper levels: each keeper earns XP when played, levels 1 to 10, and unlocks a choice of
 * two perks at levels 2, 4, 6, 8 and 10. Picks can be changed on the setup screen before any
 * night, and apply from the next run.
 */
import type { Difficulty, HeroId } from "./rules.ts";
import { HEROES } from "./rules.ts";

export const MAX_LEVEL = 10;
/** Levels that open a perk choice. */
export const PERK_LEVELS = [2, 4, 6, 8, 10] as const;

/** XP for each wave cleared, and on top of that for winning a story night. */
export const XP_PER_WAVE = 10;
export const XP_WIN = 50;
export const XP_RATE: Record<Difficulty, number> = { easy: 0.5, normal: 1, hard: 1.5, overdue: 2 };

/** XP needed to go from `level` to the next one. */
export const xpToNext = (level: number) => 100 + 30 * (level - 1);

/** Total XP needed to reach `level`. */
export function xpForLevel(level: number) {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

export function levelFor(xp: number) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** Where `xp` sits inside its level, for the progress bar. `need` is 0 at the top level. */
export function levelProgress(xp: number) {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0 };
  return { level, into: xp - xpForLevel(level), need: xpToNext(level) };
}

/**
 * What a perk does. Every field is optional and neutral when missing.
 * "sig" is the keeper's own tower.
 */
export interface PerkFx {
  /** Extra seeds and stacks at the start of a run. */
  seeds?: number;
  lives?: number;
  /** Extra seeds for every kill, and after every wave cleared. */
  killSeeds?: number;
  waveSeeds?: number;
  /** Multipliers for every cannon you build (not allies). */
  allDmg?: number;
  allRange?: number;
  /** Keeper's own tower: damage, reach and time between shots multipliers, seeds off, extra copies. */
  sigDmg?: number;
  sigRange?: number;
  sigPace?: number;
  sigCost?: number;
  sigExtra?: number;
  /** Card Catalogue: extra fruit per chain, and damage kept per chain hit. */
  chains?: number;
  chainRatio?: number;
  /** Bubbling Cauldron: puddle lifetime and width multipliers. */
  poolLife?: number;
  poolWide?: number;
  /** Vaelithra: how long her slow lasts, multiplier. */
  chill?: number;
  /** Pumpkin Trebuchet: knockback and splash multipliers. */
  knock?: number;
  splash?: number;
  /** Back room: extra share off the price (0.1 = 10% more off). */
  shopOff?: number;
  /** Scales of Justice: extra share of health taken, and extra fee per kill. */
  share?: number;
  fee?: number;
  /** Ooze Clues: extra leaks absorbed each wave. */
  absorb?: number;
  /** Mimic Chest: extra seeds per meal. */
  loot?: number;
  /** Dr. Samodovol's pick: 1 = drawn from the last shelf (Footnote), seeds paid when he takes it (Annotated). */
  footnote?: number;
  annotated?: number;
  /** History Lectern: extra slow on the noted kind (Cited Edition), 1 = notes fruit past halfway (Midpoint), extra waves the note lasts (Carried Note). */
  lectureSlow?: number;
  midpoint?: number;
  carriedNote?: number;
  /** Doctor's pick: extra picks on each shelf (Second Opinion), faster firing per pick taken, up to 3 (Close Reading). */
  secondOpinion?: number;
  closeReading?: number;
  /** Quackarot: aura reach multiplier, extra attack speed in it (0.1 = +10% more), and 1 = on (Quack-hameha, Ground Pound, Blinded by the Light, Tag Team, Over Nine Thousand Quacks). */
  auraReach?: number;
  auraHaste?: number;
  confidence?: number;
  lockdown?: number;
  covering?: number;
  perimeter?: number;
  overQuack?: number;
  /** Asser: extra seeds per lost stack (Bitter Ink), extra stacks Sisu counts (Hard Lessons), 1 = Second Wind, extra Sisu per stack (Saga). */
  material?: number;
  sisuCap?: number;
  secondWind?: number;
  sisuPerStack?: number;
}

export interface Perk {
  name: string;
  blurb: string;
  fx: PerkFx;
}

/** Per keeper: five tiers (levels 2, 4, 6, 8, 10), each a choice of two perks (Dr. Samodovol's last tier has one). */
export const PERKS: Record<HeroId, Array<[Perk, Perk] | [Perk]>> = {
  mynxi: [
    [
      { name: "Petty Cash", blurb: "Start with 30 more seeds.", fx: { seeds: 30 } },
      { name: "Late Returns", blurb: "Every kill pays 1 more seed.", fx: { killSeeds: 1 } },
    ],
    [
      { name: "Cross-Reference", blurb: "The Card Catalogue chains to one more fruit.", fx: { chains: 1 } },
      { name: "Long Desk", blurb: "The Card Catalogue reaches 20% farther.", fx: { sigRange: 1.2 } },
    ],
    [
      { name: "Quiet, Please", blurb: "All your cannons hit 8% harder.", fx: { allDmg: 1.08 } },
      { name: "Overdue Notices", blurb: "+10 seeds after every wave.", fx: { waveSeeds: 10 } },
    ],
    [
      { name: "Card Index", blurb: "The Card Catalogue hits 30% harder.", fx: { sigDmg: 1.3 } },
      { name: "Reserved Shelf", blurb: "The Card Catalogue costs 30 seeds less.", fx: { sigCost: 30 } },
    ],
    [
      { name: "Second Catalogue", blurb: "You can build two Card Catalogues.", fx: { sigExtra: 1 } },
      { name: "Dewey's Decree", blurb: "Catalogue chains lose no damage.", fx: { chainRatio: 1 } },
    ],
  ],
  vael: [
    [
      { name: "Pocket Money", blurb: "Start with 30 more seeds.", fx: { seeds: 30 } },
      { name: "Spare Flask", blurb: "Start with two more stacks.", fx: { lives: 2 } },
    ],
    [
      { name: "Slow Simmer", blurb: "Cauldron puddles last 50% longer.", fx: { poolLife: 1.5 } },
      { name: "Wide Pot", blurb: "Cauldron puddles are 30% wider.", fx: { poolWide: 1.3 } },
    ],
    [
      { name: "Cold Hands", blurb: "Drowsy lasts 60% longer.", fx: { chill: 1.6 } },
      { name: "Potent", blurb: "All your cannons hit 8% harder.", fx: { allDmg: 1.08 } },
    ],
    [
      { name: "Reduction", blurb: "The Cauldron hits 40% harder, puddles too.", fx: { sigDmg: 1.4 } },
      { name: "Quick Stir", blurb: "The Cauldron fires 25% faster.", fx: { sigPace: 0.75 } },
    ],
    [
      { name: "Second Cauldron", blurb: "You can build two Bubbling Cauldrons.", fx: { sigExtra: 1 } },
      { name: "Philosopher's Tip", blurb: "+15 seeds after every wave.", fx: { waveSeeds: 15 } },
    ],
  ],
  // Sir Michael already wins most nights, so his perks are a little smaller.
  michael: [
    [
      { name: "War Chest", blurb: "Start with 20 more seeds.", fx: { seeds: 20 } },
      { name: "Squire", blurb: "Start with one more stack.", fx: { lives: 1 } },
    ],
    [
      { name: "Heavier Pumpkins", blurb: "Trebuchet knockback is 50% stronger.", fx: { knock: 1.5 } },
      { name: "Wide Splat", blurb: "Trebuchet splash is 25% wider.", fx: { splash: 1.25 } },
    ],
    [
      { name: "Patrol Pay", blurb: "+6 seeds after every wave.", fx: { waveSeeds: 6 } },
      { name: "Steady Arm", blurb: "All your cannons hit 5% harder.", fx: { allDmg: 1.05 } },
    ],
    [
      { name: "Siege Crew", blurb: "The Trebuchet fires 20% faster.", fx: { sigPace: 0.8 } },
      { name: "Requisition", blurb: "The Trebuchet costs 30 seeds less.", fx: { sigCost: 30 } },
    ],
    [
      { name: "Second Trebuchet", blurb: "You can build two Dragonfire Trebuchets.", fx: { sigExtra: 1 } },
      { name: "Dragon's Tithe", blurb: "Every kill pays 1 more seed.", fx: { killSeeds: 1 } },
    ],
  ],
  elf: [
    [
      { name: "Signing Bonus", blurb: "Start with 30 more seeds.", fx: { seeds: 30 } },
      { name: "Indemnity", blurb: "Start with two more stacks.", fx: { lives: 2 } },
    ],
    [
      { name: "Hard Bargain", blurb: "The back room costs 40% less instead of 30%.", fx: { shopOff: 0.1 } },
      { name: "Billable Hours", blurb: "Scales fees pay 5 more seeds.", fx: { fee: 5 } },
    ],
    [
      { name: "Fine Print", blurb: "Every kill pays 1 more seed.", fx: { killSeeds: 1 } },
      { name: "Retainer", blurb: "+10 seeds after every wave.", fx: { waveSeeds: 10 } },
    ],
    [
      { name: "Precedent", blurb: "The Scales take 18% of health instead of 12%.", fx: { share: 0.06 } },
      { name: "Swift Ruling", blurb: "The Scales fire 25% faster.", fx: { sigPace: 0.75 } },
    ],
    [
      { name: "Second Scales", blurb: "You can build two Scales of Justice.", fx: { sigExtra: 1 } },
      { name: "Class Action", blurb: "All your cannons hit 12% harder.", fx: { allDmg: 1.12 } },
    ],
  ],
  ooze: [
    [
      { name: "Shiny Finds", blurb: "Start with 30 more seeds.", fx: { seeds: 30 } },
      { name: "Thick Skin", blurb: "Start with two more stacks.", fx: { lives: 2 } },
    ],
    [
      { name: "Gelatinous", blurb: "Absorbs two leaks each wave instead of one.", fx: { absorb: 1 } },
      { name: "Astral Sight", blurb: "All your cannons reach 10% farther.", fx: { allRange: 1.1 } },
    ],
    [
      { name: "Snack Budget", blurb: "Memec finds 4 more seeds in every meal.", fx: { loot: 4 } },
      { name: "Treasure Sense", blurb: "Every kill pays 1 more seed.", fx: { killSeeds: 1 } },
    ],
    [
      { name: "Big Appetite", blurb: "Memec eats 25% faster.", fx: { sigPace: 0.75 } },
      { name: "Long Tongue", blurb: "Memec reaches 35% farther.", fx: { sigRange: 1.35 } },
    ],
    [
      { name: "Second Mimic", blurb: "You can build two Mimic Chests.", fx: { sigExtra: 1 } },
      { name: "Bottomless", blurb: "Absorbs one more leak each wave.", fx: { absorb: 1 } },
    ],
  ],
  // Dr. Samodovol: his perks bend the Doctor's pick (the extra book on his shelves) and the Lectern.
  scholar: [
    [
      { name: "Footnote", blurb: "The Doctor's pick always comes from the last shelf: the strongest cards.", fx: { footnote: 1 } },
      { name: "Annotated", blurb: "Taking the Doctor's pick also pays 20 seeds.", fx: { annotated: 20 } },
    ],
    [
      { name: "Cited Edition", blurb: "The kind the Lectern remembers is 20% slower instead of 15%.", fx: { lectureSlow: 0.05 } },
      { name: "Midpoint", blurb: "The Lectern speaks if a fruit got halfway along the carpet.", fx: { midpoint: 1 } },
    ],
    [
      { name: "Carried Note", blurb: "The Lectern's slow lasts one extra wave.", fx: { carriedNote: 1 } },
      { name: "Second Opinion", blurb: "His shelves show two Doctor's picks.", fx: { secondOpinion: 1 } },
    ],
    [
      { name: "Lecture Notes", blurb: "The Lectern costs 25 seeds less.", fx: { sigCost: 25 } },
      { name: "Close Reading", blurb: "Each Doctor's pick he takes makes his cannons fire 4% faster tonight (up to three).", fx: { closeReading: 0.04 } },
    ],
    [{ name: "Second Lectern", blurb: "You can build two History Lecterns.", fx: { sigExtra: 1 } }],
  ],
  // Quackarot powers up the towers around him and dazes the carpet; his perks lean that way.
  quack: [
    [
      { name: "Bean Bag", blurb: "Start with 30 more seeds.", fx: { seeds: 30 } },
      { name: "Plot Armour", blurb: "Start with two more stacks.", fx: { lives: 2 } },
    ],
    [
      { name: "Big Aura", blurb: "The Quack-Liber's power-up aura reaches 30% farther.", fx: { auraReach: 1.3 } },
      { name: "Bigger Blasts", blurb: "Quack-Liber ki blasts burst 25% wider.", fx: { splash: 1.25 } },
    ],
    [
      { name: "Quack-hameha", blurb: "After each Quack-Liber kill, a charged beam flashes and its aura flares: the towers around it fire 20% faster again for 2 s.", fx: { confidence: 1 } },
      { name: "Ground Pound", blurb: "Every fourth ki blast leaves a cracked crater on the carpet for 3 s. Fruit in it crawl.", fx: { lockdown: 1 } },
    ],
    [
      { name: "Blinded by the Light", blurb: "Fruit a ki blast hits take 25% more damage from everything for 2 s.", fx: { covering: 1 } },
      { name: "Over Nine Thousand Quacks", blurb: "Once a night, the first time you drop to 6 stacks or fewer, he goes golden: every tower fires 50% faster for 10 s of fighting.", fx: { overQuack: 1 } },
    ],
    [
      { name: "Tag Team", blurb: "You can build two Quack-Libers. The line between them crackles with energy: fruit crossing it walk 30% slower.", fx: { sigExtra: 1, perimeter: 1 } },
      { name: "Focused Ki", blurb: "The Quack-Liber's power-up aura is 25% instead of 15%.", fx: { auraHaste: 0.1 } },
    ],
  ],
  // Asser is built to take hits; his perks make losing stacks pay more.
  asser: [
    [
      { name: "Thick Skin", blurb: "Start with three more stacks.", fx: { lives: 3 } },
      { name: "Royalty Advance", blurb: "Start with 25 more seeds.", fx: { seeds: 25 } },
    ],
    [
      { name: "Whetted Edge", blurb: "The Lion Blade hits 25% harder.", fx: { sigDmg: 1.25 } },
      { name: "Long Arms", blurb: "The Lion Blade reaches 20% farther.", fx: { sigRange: 1.2 } },
    ],
    [
      { name: "Bitter Ink", blurb: "Every lost stack pays 6 seeds instead of 4.", fx: { material: 2 } },
      { name: "Hard Lessons", blurb: "Sisu counts up to 19 missing stacks instead of 15.", fx: { sisuCap: 4 } },
    ],
    [
      { name: "Second Wind", blurb: "Once a night, the first time he drops to 5 stacks or fewer, he gets 5 back.", fx: { secondWind: 1 } },
      { name: "Field Notes", blurb: "The Lion Blade costs 25 seeds less.", fx: { sigCost: 25 } },
    ],
    [
      { name: "Second Blade", blurb: "You can build two Lion Blades.", fx: { sigExtra: 1 } },
      { name: "Saga", blurb: "Sisu is 3% a missing stack instead of 2%.", fx: { sisuPerStack: 0.01 } },
    ],
  ],
};

/** A pick per tier: 0 or 1 for the two perks, null while the tier is still locked. */
export type PerkPicks = Array<0 | 1 | null>;

export interface KeeperRecord {
  xp: number;
  picks: PerkPicks;
  /** Dr. Samodovol: he has taken a wrong book at least once (kept across nights). */
  misread?: boolean;
}

export type KeeperProgress = Record<HeroId, KeeperRecord>;

const emptyRecord = (): KeeperRecord => ({ xp: 0, picks: PERK_LEVELS.map(() => null) });

export function emptyProgress(): KeeperProgress {
  return Object.fromEntries(HEROES.map((h) => [h, emptyRecord()])) as KeeperProgress;
}

/** Every keeper at the top level with the first perk of each tier (tests). */
export function maxedProgress(pick: 0 | 1 = 0): KeeperProgress {
  return Object.fromEntries(
    HEROES.map((h) => [h, { xp: xpForLevel(MAX_LEVEL), picks: PERK_LEVELS.map(() => pick) }]),
  ) as KeeperProgress;
}

/** Tiers open at the keeper's level get a pick (the first perk if none yet); locked tiers lose theirs. */
export function normalizeRecord(rec: KeeperRecord): KeeperRecord {
  const level = levelFor(rec.xp);
  return {
    xp: rec.xp,
    picks: PERK_LEVELS.map((at, i) => (level >= at ? (rec.picks[i] === 1 ? 1 : 0) : null)),
    ...(rec.misread ? { misread: true } : {}),
  };
}

/** The perks a keeper has active. */
export function activePerks(hero: HeroId | null, rec: KeeperRecord | undefined): Perk[] {
  if (!hero || !rec) return [];
  const { picks } = normalizeRecord(rec);
  // A one-perk tier always gives its one perk.
  return picks.flatMap((p, i) => (p == null ? [] : [PERKS[hero][i][p] ?? PERKS[hero][i][0]]));
}

/** All active perk effects merged: multipliers multiply, everything else adds. */
export function perkFx(hero: HeroId | null, rec: KeeperRecord | undefined): Required<PerkFx> {
  const out: Required<PerkFx> = {
    seeds: 0,
    lives: 0,
    killSeeds: 0,
    waveSeeds: 0,
    allDmg: 1,
    allRange: 1,
    sigDmg: 1,
    sigRange: 1,
    sigPace: 1,
    sigCost: 0,
    sigExtra: 0,
    chains: 0,
    chainRatio: 0,
    poolLife: 1,
    poolWide: 1,
    chill: 1,
    knock: 1,
    splash: 1,
    shopOff: 0,
    share: 0,
    fee: 0,
    absorb: 0,
    loot: 0,
    footnote: 0,
    annotated: 0,
    lectureSlow: 0,
    midpoint: 0,
    carriedNote: 0,
    secondOpinion: 0,
    closeReading: 0,
    auraReach: 1,
    auraHaste: 0,
    confidence: 0,
    lockdown: 0,
    covering: 0,
    perimeter: 0,
    overQuack: 0,
    material: 0,
    sisuCap: 0,
    secondWind: 0,
    sisuPerStack: 0,
  };
  const MUL = new Set<keyof PerkFx>(["allDmg", "allRange", "sigDmg", "sigRange", "sigPace", "poolLife", "poolWide", "chill", "knock", "splash", "auraReach"]);
  for (const perk of activePerks(hero, rec)) {
    for (const [k, v] of Object.entries(perk.fx) as Array<[keyof PerkFx, number]>) {
      if (k === "chainRatio") out.chainRatio = Math.max(out.chainRatio, v);
      else if (MUL.has(k)) out[k] *= v;
      else out[k] += v;
    }
  }
  return out;
}

/** XP a cleared wave is worth, and the bonus for a win, at this difficulty. */
export const waveXp = (difficulty: Difficulty) => Math.round(XP_PER_WAVE * XP_RATE[difficulty]);
export const winXp = (difficulty: Difficulty) => Math.round(XP_WIN * XP_RATE[difficulty]);

const KEEPERS_KEY = "melongeddon-keepers";

export function loadProgress(): KeeperProgress {
  const out = emptyProgress();
  try {
    const raw = JSON.parse(localStorage.getItem(KEEPERS_KEY) ?? "{}") as Record<string, Partial<KeeperRecord>>;
    for (const hero of HEROES) {
      const r = raw?.[hero];
      if (!r) continue;
      const xp = Number(r.xp);
      const picks = Array.isArray(r.picks) ? r.picks : [];
      out[hero] = normalizeRecord({
        xp: Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0,
        picks: PERK_LEVELS.map((_, i) => (picks[i] === 1 ? 1 : picks[i] === 0 ? 0 : null)),
        misread: r.misread === true,
      });
    }
  } catch {
    /* start fresh */
  }
  return out;
}

export function saveProgress(p: KeeperProgress) {
  try {
    localStorage.setItem(KEEPERS_KEY, JSON.stringify(p));
  } catch {
    /* progress just won't persist */
  }
}
