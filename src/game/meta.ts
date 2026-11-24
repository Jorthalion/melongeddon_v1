/**
 * Meta progression: lifetime stats saved in the browser, and the bookmarks they unlock.
 * A bookmark is a small perk; the player equips one per run on the setup screen.
 */
import { shopPrice, type HeroId, type MapId, type TowerKind } from "./rules.ts";
import { openBookmarks, openMaps, openTowers, restoreText, type RoomId } from "./catalogue.ts";

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
  /** Most seeds in hand at the end of a won story night. */
  richest: number;
  /** Nights Vaelithra won after building a Still and taking Trial Vial or Distilled Batch. */
  brews: number;
}

export interface Bookmark {
  id: BookmarkId;
  name: string;
  blurb: string;
  /** How to unlock it, shown while it is locked ("Restore <Room> in the Grand Catalogue."). */
  goal: string;
}

export const BOOKMARKS: Bookmark[] = [
  {
    id: "seedfund",
    name: "Seed Fund",
    blurb: "Start with 30 more seeds.",
    goal: restoreText("bookmark", "seedfund"),
  },
  {
    id: "sparestack",
    name: "Spare Stack",
    blurb: "Start with two more stacks.",
    goal: restoreText("bookmark", "sparestack"),
  },
  {
    id: "backroom",
    name: "Back-room Key",
    blurb: "Your first back-room upgrade each run is free.",
    goal: restoreText("bookmark", "backroom"),
  },
  {
    id: "discount",
    name: "Bulk Order",
    blurb: "Every cannon costs 5 seeds less.",
    goal: restoreText("bookmark", "discount"),
  },
  {
    id: "latefee",
    name: "Late Fees",
    blurb: "Every kill pays 1 more seed.",
    goal: restoreText("bookmark", "latefee"),
  },
];

export const BOOKMARK = Object.fromEntries(BOOKMARKS.map((b) => [b.id, b])) as Record<BookmarkId, Bookmark>;

/** Effect sizes, in one place for tuning. */
export const BOOKMARK_VALUES = { seedfund: 30, sparestack: 2, discount: 5, latefee: 1 };

export const EMPTY_META: MetaStats = { bestWave: 0, endlessBest: 0, karls: 0, fittings: 0, wins: 0, hardWins: 0, richest: 0, brews: 0 };
/** Everything unlocked (simulator and tests). */
export const ALL_UNLOCKED: MetaStats = { bestWave: 15, endlessBest: 99, karls: 99, fittings: 99, wins: 99, hardWins: 99, richest: 999, brews: 99 };

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

/** Bookmarks the restored rooms have opened. */
export function unlockedIds(rooms: readonly RoomId[]): BookmarkId[] {
  const open = openBookmarks(rooms);
  return BOOKMARKS.filter((b) => open.includes(b.id)).map((b) => b.id);
}

/** Keeper towers that start locked, with the room that opens them. The rest are open from the start. */
export const TOWER_GOALS: Partial<Record<TowerKind, { goal: string }>> = {
  desk: { goal: restoreText("tower", "desk") },
};

/** Keeper towers the restored rooms haven't opened yet. */
export function lockedTowers(rooms: readonly RoomId[]): TowerKind[] {
  const open = openTowers(rooms);
  return (Object.keys(TOWER_GOALS) as TowerKind[]).filter((k) => !open.includes(k));
}

/** Maps that start locked, with the room that opens them. The Stacks and the Annex are always open. */
export const MAP_GOALS: Partial<Record<MapId, { goal: string }>> = {
  mezzanine: { goal: restoreText("map", "mezzanine") },
  rarebooks: { goal: restoreText("map", "rarebooks") },
  archive: { goal: restoreText("map", "archive") },
  greathall: { goal: restoreText("map", "greathall") },
  readingroom: { goal: restoreText("map", "readingroom") },
  sorting: { goal: restoreText("map", "sorting") },
  rotunda: { goal: restoreText("map", "rotunda") },
  halldoors: { goal: restoreText("map", "halldoors") },
  compact: { goal: restoreText("map", "compact") },
  basement: { goal: restoreText("map", "basement") },
  greenhouse: { goal: restoreText("map", "greenhouse") },
  belltower: { goal: restoreText("map", "belltower") },
};

/** Maps the player can pick on the setup screen (the Overflow is night two's, never picked). */
export const PICKABLE_MAPS: MapId[] = ["stacks", "annex", "mezzanine", "rarebooks", "archive", "greathall", "readingroom", "sorting", "rotunda", "halldoors", "compact", "basement", "greenhouse", "belltower"];


/**
 * Test rooms: boards playable only in developer mode (Setup shows them in their own row) and in the simulator when
 * named (`--only <id>`), until they're confirmed. Empty for now: the bigger Archive and Mezzanine became their rooms'
 * layout B (`Board.variantOf`).
 */
export const TEST_MAPS: MapId[] = ["loop"];

/** Maps the restored rooms have opened. */
export function unlockedMaps(rooms: readonly RoomId[]): MapId[] {
  const open = openMaps(rooms);
  return PICKABLE_MAPS.filter((id) => !MAP_GOALS[id] || open.includes(id));
}

/**
 * Back-room price for the next upgrade to a tower kind that already has `owned` of them.
 * `visits` is upgrades bought tonight for any kind (the Back-room Key makes the first one free).
 */
export function backRoomPrice(hero: HeroId | null, owned: number, visits: number, bookmark: BookmarkId | null) {
  if (bookmark === "backroom" && visits === 0) return 0;
  return shopPrice(hero, owned, visits);
}
