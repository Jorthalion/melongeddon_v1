/**
 * Meta progression: lifetime stats saved in the browser, and the bookmarks they unlock.
 * A bookmark is a small perk; the player equips one per run on the keeper screen.
 */
import { shopPrice, type HeroId, type MapId } from "./rules.ts";

export type BookmarkId = "seedfund" | "sparestack" | "backroom" | "discount" | "latefee";

export interface MetaStats {
  /** Most waves cleared in any story night. */
  bestWave: number;
  /** Most waves cleared in an endless run. */
  endlessBest: number;
  karls: number;
  fittings: number;
  wins: number;
  hardWins: number;
}

export interface Bookmark {
  id: BookmarkId;
  name: string;
  blurb: string;
  /** How to unlock it, shown while it is locked. */
  goal: string;
  unlocked: (m: MetaStats) => boolean;
}

export const BOOKMARKS: Bookmark[] = [
  {
    id: "seedfund",
    name: "Seed Fund",
    blurb: "Start with 30 more seeds.",
    goal: "Clear wave 3.",
    unlocked: (m) => Math.max(m.bestWave, m.endlessBest) >= 3,
  },
  {
    id: "sparestack",
    name: "Spare Stack",
    blurb: "Start with two more stacks.",
    goal: "Pop Karl.",
    unlocked: (m) => m.karls >= 1,
  },
  {
    id: "backroom",
    name: "Back-room Key",
    blurb: "Your first fitting each run is free.",
    goal: "Buy 5 back-room fittings.",
    unlocked: (m) => m.fittings >= 5,
  },
  {
    id: "discount",
    name: "Bulk Order",
    blurb: "Every cannon costs 5 seeds less.",
    goal: "Win a night.",
    unlocked: (m) => m.wins >= 1,
  },
  {
    id: "latefee",
    name: "Late Fees",
    blurb: "Every kill pays 1 more seed.",
    goal: "Reach wave 15 in Endless.",
    unlocked: (m) => m.endlessBest >= 14,
  },
];

export const BOOKMARK = Object.fromEntries(BOOKMARKS.map((b) => [b.id, b])) as Record<BookmarkId, Bookmark>;

/** Effect sizes, in one place for tuning. */
export const BOOKMARK_VALUES = { seedfund: 30, sparestack: 2, discount: 5, latefee: 1 };

export const EMPTY_META: MetaStats = { bestWave: 0, endlessBest: 0, karls: 0, fittings: 0, wins: 0, hardWins: 0 };
/** Everything unlocked (simulator and tests). */
export const ALL_UNLOCKED: MetaStats = { bestWave: 15, endlessBest: 99, karls: 99, fittings: 99, wins: 99, hardWins: 99 };

const META_KEY = "melongeddon-meta";
const PICK_KEY = "melongeddon-bookmark";

export function loadMeta(): MetaStats {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) ?? "{}") as Partial<MetaStats>;
    const out = { ...EMPTY_META };
    for (const k of Object.keys(out) as Array<keyof MetaStats>) {
      const v = Number(raw[k]);
      if (Number.isFinite(v) && v > 0) out[k] = v;
    }
    return out;
  } catch {
    return { ...EMPTY_META };
  }
}

export function saveMeta(m: MetaStats) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* progress just won't persist */
  }
}

export function loadPick(): BookmarkId | null {
  try {
    const v = localStorage.getItem(PICK_KEY);
    return v && v in BOOKMARK ? (v as BookmarkId) : null;
  } catch {
    return null;
  }
}

export function savePick(id: BookmarkId | null) {
  try {
    if (id) localStorage.setItem(PICK_KEY, id);
    else localStorage.removeItem(PICK_KEY);
  } catch {
    /* ignore */
  }
}

export function unlockedIds(m: MetaStats): BookmarkId[] {
  return BOOKMARKS.filter((b) => b.unlocked(m)).map((b) => b.id);
}

/** Maps that start locked, with how to open them. The rest are always open. */
export const MAP_GOALS: Partial<Record<MapId, { goal: string; unlocked: (m: MetaStats) => boolean }>> = {
  mezzanine: { goal: "Clear wave 5.", unlocked: (m) => Math.max(m.bestWave, m.endlessBest) >= 5 },
  rarebooks: { goal: "Pop Karl.", unlocked: (m) => m.karls >= 1 },
  archive: { goal: "Win a night.", unlocked: (m) => m.wins >= 1 },
};

/** Maps the player can pick on the keeper screen (the Overflow is night two's, never picked). */
export const PICKABLE_MAPS: MapId[] = ["stacks", "annex", "mezzanine", "rarebooks", "archive"];

export function unlockedMaps(m: MetaStats): MapId[] {
  return PICKABLE_MAPS.filter((id) => MAP_GOALS[id]?.unlocked(m) ?? true);
}

/** Back-room price, with the Back-room Key's free first fitting. */
export function backRoomPrice(hero: HeroId | null, visits: number, bookmark: BookmarkId | null) {
  if (bookmark === "backroom" && visits === 0) return 0;
  return shopPrice(hero, visits);
}
