/**
 * The Grand Catalogue's rooms and fragments. Fragments are earned at the end of a night (wins,
 * Karl, a long loss, Endless) and from achievements (their tier); they are spent restoring rooms,
 * and each room unlocks its rewards for good. Maps, bookmarks, keeper towers and most keepers are
 * unlocked here now; the old stat goals only survive for the one-time migration (LEGACY below).
 */
import type { Difficulty, HeroId, MapId, NightId, TowerKind } from "./rules.ts";
import type { BookmarkId, MetaStats } from "./meta.ts";

export type RoomId =
  | "stacks"
  | "mezzanine"
  | "rarebooks"
  | "archive"
  | "greathall"
  | "readingroom"
  | "sorting"
  | "rotunda"
  | "halldoors"
  | "greenhouse"
  | "belltower"
  | "bindery"
  | "restricted";

export type Reward =
  | { kind: "map"; id: MapId }
  | { kind: "keeper"; id: HeroId }
  | { kind: "bookmark"; id: BookmarkId }
  | { kind: "tower"; id: TowerKind }
  | { kind: "cosmetic"; id: CosmeticId };

export type CosmeticId = "carpets" | "frames" | "gilded" | "archivist";

export interface Room {
  id: RoomId;
  name: string;
  blurb: string;
  cost: number;
  rewards: Reward[];
}

/** Starting prices (tune with the simulator; see the README's balance note). */
export const ROOMS: Room[] = [
  {
    id: "stacks",
    name: "The Stacks",
    blurb: "Where every night starts. Never closed.",
    cost: 0,
    rewards: [
      { kind: "map", id: "stacks" },
      { kind: "map", id: "annex" },
      { kind: "keeper", id: "mynxi" },
      { kind: "keeper", id: "vael" },
      { kind: "keeper", id: "michael" },
    ],
  },
  {
    id: "mezzanine",
    name: "The Mezzanine",
    blurb: "Sweep the balcony and the Legal Elf moves back into his office.",
    cost: 3,
    rewards: [
      { kind: "map", id: "mezzanine" },
      { kind: "keeper", id: "elf" },
      { kind: "bookmark", id: "seedfund" },
    ],
  },
  {
    id: "rarebooks",
    name: "Rare Books",
    blurb: "Reglaze the cases. Ooze Clues has been waiting in one of them.",
    cost: 6,
    rewards: [
      { kind: "map", id: "rarebooks" },
      { kind: "keeper", id: "ooze" },
      { kind: "bookmark", id: "sparestack" },
    ],
  },
  {
    id: "archive",
    name: "The Archive",
    blurb: "Find the light switch. Dr. Samodovol has notes about the dark.",
    cost: 10,
    rewards: [
      { kind: "map", id: "archive" },
      { kind: "keeper", id: "scholar" },
      { kind: "bookmark", id: "discount" },
      { kind: "tower", id: "desk" },
    ],
  },
  {
    id: "greathall",
    name: "The Great Hall",
    blurb: "Rehang the banners. Quackarot has been powering up out here for three episodes.",
    cost: 15,
    rewards: [
      { kind: "map", id: "greathall" },
      { kind: "keeper", id: "quack" },
      { kind: "bookmark", id: "backroom" },
      { kind: "tower", id: "flask" },
    ],
  },
  {
    id: "readingroom",
    name: "The Reading Room",
    blurb: "Relight the green lamps. Asser has a chapter to finish.",
    cost: 20,
    rewards: [
      { kind: "map", id: "readingroom" },
      { kind: "keeper", id: "asser" },
      { kind: "bookmark", id: "latefee" },
    ],
  },
  // Beyond the library's own rooms: harder maps with floors of their own.
  {
    id: "sorting",
    name: "The Sorting Room",
    blurb: "Get the return belts running again. The fruit will ride them too.",
    cost: 14,
    rewards: [{ kind: "map", id: "sorting" }],
  },
  {
    id: "rotunda",
    name: "The Rotunda",
    blurb: "Unlock every door of the round reading room. The fruit will use all of them.",
    cost: 16,
    rewards: [{ kind: "map", id: "rotunda" }],
  },
  {
    id: "halldoors",
    name: "The Hall of Doors",
    blurb: "Rehang every door in the hall. The fruit are spoilt for choice.",
    cost: 18,
    rewards: [{ kind: "map", id: "halldoors" }],
  },

  {
    id: "greenhouse",
    name: "The Greenhouse",
    blurb: "Open the glasshouse on the roof. This is where the fruit came from.",
    cost: 18,
    rewards: [{ kind: "map", id: "greenhouse" }],
  },
  {
    id: "belltower",
    name: "The Bell Tower",
    blurb: "Wind the clock. Everyone stops to listen when it strikes, cannons included.",
    cost: 24,
    rewards: [{ kind: "map", id: "belltower" }],
  },
  {
    id: "bindery",
    name: "The Bindery",
    blurb: "New cloth and thread: carpet colours and keeper-card frames.",
    cost: 12,
    rewards: [
      { kind: "cosmetic", id: "carpets" },
      { kind: "cosmetic", id: "frames" },
    ],
  },
  {
    id: "restricted",
    name: "The Restricted Section",
    blurb: "The gilt comes out of storage: a gilded title screen and the Archivist's frame.",
    cost: 30,
    rewards: [
      { kind: "cosmetic", id: "gilded" },
      { kind: "cosmetic", id: "archivist" },
    ],
  },
];

export const ROOM = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, Room>;
export const ROOM_IDS: RoomId[] = ROOMS.map((r) => r.id);
/** Every room restored (dev mode, tests, the simulator). */
export const ALL_ROOMS: RoomId[] = [...ROOM_IDS];
export const START_ROOMS: RoomId[] = ["stacks"];

/** The room that unlocks a reward, or null if it is always open. */
export function roomFor(kind: Reward["kind"], id: string): Room | null {
  return ROOMS.find((r) => r.rewards.some((w) => w.kind === kind && w.id === id)) ?? null;
}
/** "Restore The Archive in the Grand Catalogue." */
export function restoreText(kind: Reward["kind"], id: string): string {
  const room = roomFor(kind, id);
  return room ? `Restore ${room.name} in the Grand Catalogue.` : "";
}
/**
 * How to unlock a reward that's still locked: the room that opens it and one clear line, with how
 * close the player is ("12 of 30 fragments", or "you have enough"). null if it's open already
 * (or no room opens it).
 */
export function unlockNote(kind: Reward["kind"], id: string, rooms: readonly RoomId[], fragments: number): { room: Room; ready: boolean; text: string } | null {
  const room = roomFor(kind, id);
  if (!room || rooms.includes(room.id)) return null;
  const ready = fragments >= room.cost;
  const text = ready
    ? `Restore ${room.name} in the Grand Catalogue. You have the ${room.cost} fragments it takes.`
    : `Restore ${room.name} in the Grand Catalogue (${fragments} of ${room.cost} fragments).`;
  return { room, ready, text };
}
const unlockedBy = (kind: Reward["kind"], rooms: readonly RoomId[]) =>
  ROOMS.filter((r) => rooms.includes(r.id)).flatMap((r) => r.rewards.filter((w) => w.kind === kind).map((w) => w.id));

export const openKeepers = (rooms: readonly RoomId[]) => unlockedBy("keeper", rooms) as HeroId[];
export const openMaps = (rooms: readonly RoomId[]) => unlockedBy("map", rooms) as MapId[];
export const openBookmarks = (rooms: readonly RoomId[]) => unlockedBy("bookmark", rooms) as BookmarkId[];
export const openTowers = (rooms: readonly RoomId[]) => unlockedBy("tower", rooms) as TowerKind[];
export const openCosmetics = (rooms: readonly RoomId[]) => unlockedBy("cosmetic", rooms) as CosmeticId[];

// ── Fragments ──────────────────────────────────────────────────────────────────

/** Every fragment number in one place. */
export const FRAGMENTS = {
  win: { easy: 1, normal: 2, hard: 3, overdue: 4 } as Record<Difficulty, number>,
  overflowBonus: 1,
  siegeBonus: 1,
  karl: 1,
  /** A lost story night that cleared at least `lossFrom` waves pays `loss`. */
  loss: 1,
  lossFrom: 10,
  /** Endless: one for every `endlessEvery` waves cleared. */
  endlessEvery: 10,
} as const;

/** What a finished night pays, as parts for the end card's breakdown. Achievements are added separately. */
export function nightFragments(n: { night: NightId; difficulty: Difficulty; won: boolean; cleared: number; karl: boolean }): Array<{ label: string; n: number }> {
  const parts: Array<{ label: string; n: number }> = [];
  if (n.night === "endless") {
    const e = Math.floor(n.cleared / FRAGMENTS.endlessEvery);
    if (e) parts.push({ label: `${n.cleared} Endless waves`, n: e });
  } else if (n.won) {
    parts.push({ label: "Night won", n: FRAGMENTS.win[n.difficulty] });
    if (n.night === "overflow") parts.push({ label: "The Overflow", n: FRAGMENTS.overflowBonus });
    if (n.night === "siege") parts.push({ label: "The Siege", n: FRAGMENTS.siegeBonus });

  } else if (n.cleared >= FRAGMENTS.lossFrom) {
    parts.push({ label: `Held ${n.cleared} waves`, n: FRAGMENTS.loss });
  }
  if (n.karl) parts.push({ label: "Karl popped", n: FRAGMENTS.karl });
  return parts;
}

// ── Cosmetics ──────────────────────────────────────────────────────────────────

export type CarpetColour = "crimson" | "blue" | "green" | "black";
export type CardFrame = "plain" | "gold" | "ink" | "archivist";
export interface Cosmetics {
  carpet: CarpetColour;
  frame: CardFrame;
  gilded: boolean;
}
export const DEFAULT_COSMETICS: Cosmetics = { carpet: "crimson", frame: "plain", gilded: false };
export const CARPET_COLOURS: CarpetColour[] = ["crimson", "blue", "green", "black"];
/** The dye for each carpet colour (crimson = the room's own look). */
export const CARPET_DYE: Record<CarpetColour, string | null> = { crimson: null, blue: "#2f4fa8", green: "#1f7a4a", black: "#3a3a44" };
export const CARD_FRAMES: CardFrame[] = ["plain", "gold", "ink", "archivist"];

/** Keep only choices the restored rooms allow. */
export function allowedCosmetics(c: Partial<Cosmetics> | undefined, rooms: readonly RoomId[]): Cosmetics {
  const open = openCosmetics(rooms);
  const carpet = open.includes("carpets") && c?.carpet && CARPET_COLOURS.includes(c.carpet) ? c.carpet : "crimson";
  const frame =
    c?.frame === "archivist"
      ? open.includes("archivist")
        ? "archivist"
        : "plain"
      : open.includes("frames") && c?.frame && CARD_FRAMES.includes(c.frame)
        ? c.frame
        : "plain";
  return { carpet, frame, gilded: open.includes("gilded") && Boolean(c?.gilded) };
}

// ── Migration from the old goals ───────────────────────────────────────────────

/** The old stat goals, kept only to restore rooms a returning player had already reached. */
export const LEGACY = {
  maps: {
    mezzanine: (m: MetaStats) => Math.max(m.bestWave, m.endlessBest) >= 5,
    rarebooks: (m: MetaStats) => m.karls >= 1,
    archive: (m: MetaStats) => m.wins >= 1,
    greathall: (m: MetaStats) => m.wins >= 2,
    readingroom: (m: MetaStats) => m.hardWins >= 1,
  } as Partial<Record<MapId, (m: MetaStats) => boolean>>,
  bookmarks: {
    seedfund: (m: MetaStats) => Math.max(m.bestWave, m.endlessBest) >= 3,
    sparestack: (m: MetaStats) => m.karls >= 1,
    backroom: (m: MetaStats) => m.fittings >= 5,
    discount: (m: MetaStats) => m.wins >= 1,
    latefee: (m: MetaStats) => m.endlessBest >= 14,
  } as Record<BookmarkId, (m: MetaStats) => boolean>,
  towers: {
    desk: (m: MetaStats) => m.richest >= 200,
    flask: (m: MetaStats) => m.brews >= 1,
  } as Partial<Record<TowerKind, (m: MetaStats) => boolean>>,
};

/** Rooms a returning player already had something from under the old rules (plus The Stacks). */
export function legacyRooms(meta: MetaStats, playedKeepers: readonly HeroId[]): RoomId[] {
  const had = (w: Reward) =>
    w.kind === "map"
      ? LEGACY.maps[w.id]?.(meta) ?? false
      : w.kind === "bookmark"
        ? LEGACY.bookmarks[w.id]?.(meta) ?? false
        : w.kind === "tower"
          ? LEGACY.towers[w.id]?.(meta) ?? false
          : w.kind === "keeper"
            ? playedKeepers.includes(w.id)
            : false;
  return ROOMS.filter((r) => r.id === "stacks" || r.rewards.some(had)).map((r) => r.id);
}

/** The cheapest room not yet restored that the player can afford, if any. */
export function affordable(rooms: readonly RoomId[], fragments: number): Room | null {
  return ROOMS.filter((r) => !rooms.includes(r.id) && r.cost <= fragments).sort((a, b) => a.cost - b.cost)[0] ?? null;
}
