/**
 * Late slips: optional challenges for the Overflow. Each one makes the night harder and
 * raises the keeper XP it pays. Take up to MAX_SLIPS before the night starts.
 */
export type SlipId = "heavy" | "damp" | "norefund" | "short" | "karl";

export interface Slip {
  id: SlipId;
  name: string;
  /** What gets harder. */
  blurb: string;
  /** Extra keeper XP, as a share (0.25 = +25%). */
  xp: number;
}

export const MAX_SLIPS = 3;

export const SLIPS: Slip[] = [
  { id: "heavy", name: "Heavy Returns", blurb: "The chute opens on wave 3, not 6.", xp: 0.15 },
  { id: "damp", name: "Damp Powder", blurb: "All your towers deal 20% less damage.", xp: 0.25 },
  { id: "norefund", name: "No Refunds", blurb: "Selling a tower gives no seeds back.", xp: 0.1 },
  { id: "short", name: "Short Shelf", blurb: "Start with 4 fewer stacks.", xp: 0.2 },
  { id: "karl", name: "Karl Is Early", blurb: "An extra Karl joins wave 8.", xp: 0.25 },
];

export const SLIP = Object.fromEntries(SLIPS.map((s) => [s.id, s])) as Record<SlipId, Slip>;

/** The numbers the engine uses. */
export const SLIP_VALUES = {
  /** Heavy Returns: rind melons sent up the chute on waves 3 to 5. */
  heavyCount: 5,
  heavyFrom: 2,
  heavyTo: 4,
  dampDamage: 0.8,
  shortStacks: 4,
  /** Karl Is Early: the 0-based wave he joins. */
  karlWave: 7,
} as const;

/** Keep only known slips, no repeats, at most MAX_SLIPS, in list order. */
export function cleanSlips(ids: unknown): SlipId[] {
  if (!Array.isArray(ids)) return [];
  return SLIPS.filter((s) => ids.includes(s.id))
    .map((s) => s.id)
    .slice(0, MAX_SLIPS);
}

/** Extra XP share for a set of slips (bonuses add). */
export function slipXp(ids: readonly SlipId[]): number {
  return ids.reduce((sum, id) => sum + (SLIP[id]?.xp ?? 0), 0);
}
