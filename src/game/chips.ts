import type { WaveGroup } from "./engine.ts";

/** A Coming up chip: every group of one identical enemy in the wave, however they're spread out. */
export type Chip = WaveGroup & {
  /** They don't walk in as one bunch: they come mixed in among the others (the Siege's feuds). */
  mixed: boolean;
};

/** Everything but how many: the same enemy, with the same marks, door and exit. */
const sameEnemy = (chip: Chip, g: WaveGroup) => {
  const keys = new Set([...Object.keys(chip), ...Object.keys(g)] as Array<keyof Chip>);
  keys.delete("count");
  keys.delete("mixed");
  return [...keys].every((k) => chip[k] === (g as Chip)[k]);
};

/**
 * The bar's chips: identical groups merged into one (at the first one's place), so a wave that alternates
 * cat, goose, cat, goose reads "cat ×7, goose ×7" rather than fourteen "×1" chips.
 */
export function chipsFor(groups: WaveGroup[]): Chip[] {
  const out: Chip[] = [];
  for (const g of groups) {
    const hit = out.find((c) => sameEnemy(c, g));
    if (hit) {
      hit.count += g.count;
      hit.mixed = true;
    } else out.push({ ...g, mixed: false });
  }
  return out;
}
