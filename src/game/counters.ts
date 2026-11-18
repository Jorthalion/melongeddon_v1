import type { TowerKind } from "./engine.ts";

/**
 * What beats what: one table for the enemy hover card's "Beaten by" line and the Coming up bar's
 * "Your towers don't answer…" warning, so the two never disagree.
 */
export type CounterId = "shell" | "husk" | "damp" | "pit" | "boxed" | "gall" | "para" | "boss";

/** Your build, as the counters read it. */
export interface BuildInfo {
  /** Tower kinds standing (a Copycat counts as what it copies). */
  kinds: ReadonlySet<TowerKind>;
  /** Upgrade picks (Juicy Explosions and Knight's Splatter make every cannon splash). */
  upgrades: readonly string[];
  /** Whether every drop point this wave uses has a tower in reach. */
  dropsCovered: boolean;
}

const SPLASH: TowerKind[] = ["mortar", "trebuchet", "quackliber", "bombard", "organ", "stomp", "lionblade"];
const BURN: TowerKind[] = ["fire", "bombard"];
/** Towers that aim one shot at one fruit. */
const DIRECT: TowerKind[] = ["melon", "spitter", "ballista", "reader", "scope", "hive", "catalogue", "boomerang", "plane", "quill", "globe", "press", "peeler", "quackliber", "scales", "ink", "bookworm", "mortar", "trebuchet"];
/** Towers that work on an area: they see a Box Cat and knock its box off. */
const AREA: TowerKind[] = ["still", "organ", "bell", "stomp", "lionblade", "honey", "bombard", "geese", "lantern", "cauldron", "flask"];

const any = (b: BuildInfo, list: TowerKind[]) => list.some((k) => b.kinds.has(k));
const splash = (b: BuildInfo) => any(b, SPLASH) || b.upgrades.includes("juicy") || b.upgrades.includes("splatter");
const burn = (b: BuildInfo) => any(b, BURN);

export const COUNTERS: Record<CounterId, { label: string; beats: string; answers: (b: BuildInfo) => boolean }> = {
  shell: { label: "shells", beats: "a Peeler, splash, fire or the Telescope", answers: (b) => b.kinds.has("peeler") || b.kinds.has("scope") || splash(b) || burn(b) },
  husk: { label: "husks", beats: "splash or fire, or the Foot of the Law (freeze, slows and the Bell don't work)", answers: (b) => splash(b) || burn(b) || b.kinds.has("stomp") },
  damp: { label: "damp pumpkins", beats: "direct shots or the Telescope (fire barely works)", answers: (b) => any(b, DIRECT) },
  pit: { label: "stone pits", beats: "direct shots (splash, fire and puddles barely touch them)", answers: (b) => any(b, DIRECT) },
  boxed: { label: "Box Cats", beats: "splash, fire, a Still, a Reading Lamp by the carpet, or an area tower", answers: (b) => splash(b) || burn(b) || any(b, AREA) },
  gall: { label: "gall riders", beats: "anything that hits the small rider behind the pumpkin", answers: (b) => any(b, DIRECT) || splash(b) || burn(b) },
  para: { label: "paratroopers", beats: "a tower in reach of each drop point", answers: (b) => b.dropsCovered },
  boss: { label: "a boss", beats: "single-target damage", answers: (b) => any(b, DIRECT) },
};

/** The counters an enemy (or a wave group) needs, from its flags. */
export function countersFor(e: { guard?: string; shell?: number; pit?: boolean; boxed?: boolean; siege?: string | null; gall?: boolean; para?: boolean; boss?: boolean }): CounterId[] {
  const out: CounterId[] = [];
  if (e.guard === "rind" && (e.shell ?? 1) > 0) out.push("shell");
  if (e.guard === "husk") out.push("husk");
  if (e.guard === "damp") out.push("damp");
  if (e.pit) out.push("pit");
  if (e.boxed || e.siege === "boxed") out.push("boxed");
  if (e.gall) out.push("gall");
  if (e.para || e.siege === "para") out.push("para");
  if (e.boss) out.push("boss");
  return out;
}

/** "Your towers don't answer…": the counters a wave needs that the build has no answer to, in the table's order. */
export function unanswered(needs: CounterId[], build: BuildInfo): CounterId[] {
  return (Object.keys(COUNTERS) as CounterId[]).filter((id) => needs.includes(id) && !COUNTERS[id].answers(build));
}
