import type { HeroId } from "./rules.ts";

/**
 * The keeper sheet on Setup's Who page: what they start with, how forgiving they are, how they play
 * (their rules in a few lines, matching the guide), and who they suit. The starting numbers are
 * checked against a real night in tests/keeper-sheets.test.ts.
 */
export const KEEPER_SHEETS: Record<
  HeroId,
  { stacks: number; seeds: number; difficulty: "Gentle" | "Steady" | "Tricky" | "Hard"; rules: string[]; suits: string }
> = {
  mynxi: {
    stacks: 12,
    seeds: 150,
    difficulty: "Gentle",
    rules: [
      "Her first cannon of the night costs only 40 seeds.",
      "All her cannons see farther down the carpet.",
      "Card Catalogue: every shot chains into two more fruit. Reserve Desk: banks seeds every wave, until a melon walks past.",
    ],
    suits: "Your first nights. Long reach covers mistakes.",
  },
  vael: {
    stacks: 11,
    seeds: 120,
    difficulty: "Steady",
    rules: [
      "Her shots slow whatever they hit.",
      "The first tower of each kind costs her 20 more each night; her back-room upgrades cost less.",
      "Bubbling Cauldron: a slowing, poisoned puddle. Unstoppered: a flask that soaks the carpet so puddles last longer.",
    ],
    suits: "Players who like a few kinds of tower, upgraded deep.",
  },
  michael: {
    stacks: 11,
    seeds: 145,
    difficulty: "Steady",
    rules: [
      "Before each night he swears one oath: faster towers at the door, harder hits at the entrance, or a cheaper Trebuchet.",
      "His own shots are ordinary. The oath is the plan.",
      "Pumpkin Trebuchet knocks fruit back; later, the Gourd Gate (300) holds the carpet and the Harvest Bombard (400) shells the biggest crowd.",
    ],
    suits: "Players who like to commit to a plan and save for big towers.",
  },
  elf: {
    stacks: 12,
    seeds: 150,
    difficulty: "Steady",
    rules: [
      "Back-room upgrades cost him 30% less.",
      "Scales of Justice take a share of the heaviest fruit's health, and kills pay a fee.",
      "Foot of the Law stamps a stretch of carpet still; Honeyed Heel makes fruit take 25% more damage.",
    ],
    suits: "Upgrading a few towers hard, and big, armoured fruit.",
  },
  ooze: {
    stacks: 13,
    seeds: 140,
    difficulty: "Gentle",
    rules: [
      "The first fruit to leak each wave is absorbed: no stack lost.",
      "Mimic Chest (Memec) swallows a fruit whole every few seconds; Karl only loses a bite.",
      "The Copycat is free and copies the shared tower beside it, upgrades and all.",
    ],
    suits: "A forgiving start, and players who like a trick tower.",
  },
  scholar: {
    stacks: 8,
    seeds: 100,
    difficulty: "Hard",
    rules: [
      "Every upgrade shelf has a fourth card, the Doctor's pick: a real upgrade from further along the shelves.",
      "Fewer stacks and seeds than anyone. He is the hardest keeper, on purpose.",
      "History Lectern: the kind of fruit that got furthest walks slower next wave.",
    ],
    suits: "Experienced players who like choosing their upgrades with care.",
  },
  quack: {
    stacks: 11,
    seeds: 150,
    difficulty: "Tricky",
    rules: [
      "Every tower within three tiles of his Quack-Liber fires 15% faster.",
      "Quack-Liber rockets burst and slow. Anti-Geese Protocol throws a crowd back once a wave.",
      "Pamphlet blasts a whole straight when a group reaches its corner; Reverse Driver walks the lead fruit back.",
    ],
    suits: "Players who like placing towers in clusters and timing.",
  },
  asser: {
    stacks: 25,
    seeds: 100,
    difficulty: "Tricky",
    rules: [
      "Every stack he loses pays 4 seeds (Material).",
      "Every stack he is missing makes all his towers hit 2% harder, up to +30% (Sisu).",
      "Lion Blade sweeps every fruit beside it, swings harder when he loses a stack, and mends 2 stacks after each wave.",
    ],
    suits: "Players happy to let fruit through on purpose and hit back harder.",
  },
};
