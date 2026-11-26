import type { HeroId } from "./rules.ts";

/**
 * The keeper sheet on Setup's Who page: what they start with, how forgiving they are, how they play
 * (their rules in a few lines, matching the guide), and who they suit. The starting numbers are
 * checked against a real night in tests/keeper-sheets.test.ts.
 */
export const KEEPER_SHEETS: Record<
  HeroId,
  { stacks: number; seeds: number; difficulty: "Easy" | "Medium" | "Advanced" | "Expert"; rules: string[]; suits: string }
> = {
  mynxi: {
    stacks: 12,
    seeds: 150,
    difficulty: "Easy",
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
    difficulty: "Medium",
    rules: [
      "Her shots make fruit drowsy: half speed for a moment, and the third hit puts one to sleep for a second. Not ice, so no frost; fire wakes them.",
      "The first tower of each kind costs her 20 more each night; her back-room upgrades cost less.",
      "R&D Cauldron: a slowing, poisoned puddle. Its potion on a sleeping fruit sets the poison off at once (Nightmare).",
      "Her other towers open during the night: Unstoppered with 2 fully upgraded towers, the Underlings with 4, the Nexus Spire with 6. A fully upgraded tower has every back-room upgrade for its kind.",
      "Unstoppered: fruit asleep in her puddles sleep longer, and its fumes put drowsy fruit to sleep. The Underlings: interns throw sleeping draughts; a sleeping fruit they hit takes 30% more. The Spire: every 15 s, every drowsy fruit falls asleep.",
    ],
    suits: "Players who like a few kinds of tower, upgraded deep.",
  },
  michael: {
    stacks: 11,
    seeds: 145,
    difficulty: "Medium",
    rules: [
      "Before each night he chooses his armour: more stacks, a fuller Hoard, fiercer Great towers, or a Roost that starts hatched.",
      "The Dragon's Hoard: a fifth of what he spends on ordinary towers is saved, and pays first for his big things.",
      "Two of the same tower side by side can merge into one Great tower: two and a half times the damage, farther reach.",
      "The Dragon's Roost (200) grows from an egg into a Great Dragon over the night; the Dragon Gate (300) holds the carpet. Waves with no stack lost put him In the Zone.",
    ],
    suits: "Players who like to save up and build big.",
  },
  elf: {
    stacks: 12,
    seeds: 150,
    difficulty: "Medium",
    rules: [
      "Objection! (once a wave, O): every fruit on the last 3 tiles before the door is thrown back 3 tiles and honeyed (bosses: 1 tile). They walk 10% faster for 3 s after.",
      "The court: Honeyed Heel makes fruit sticky; Foot of the Law holds a sticky fruit twice as long and spreads the honey; the Scales take 20% from a stopped or honeyed fruit instead of 12%, and double the fee.",
      "Billable Steps: every fruit the Foot of the Law stomps pays 1 seed, up to 3 a stomp.",
    ],
    suits: "Timing one big save a wave, and big, armoured fruit.",
  },
  ooze: {
    stacks: 13,
    seeds: 140,
    difficulty: "Easy",
    rules: [
      "The first fruit to leak each wave is absorbed: no stack lost.",
      "Mimic Chest (Memec) swallows a fruit whole every few seconds; Karl only loses a bite.",
      "The Copycat is free and copies the shared tower beside it, upgrades and all. It goes down once a wave.",
    ],
    suits: "A forgiving start, and players who like a trick tower.",
  },
  scholar: {
    stacks: 12,
    seeds: 150,
    difficulty: "Expert",
    rules: [
      "Every upgrade shelf has a fourth card, the Doctor's pick: a real upgrade from further along the shelves.",
      "No cannon of his own to start with. He is the hardest keeper, on purpose.",
      "History Lectern (35): the kind of fruit that got furthest walks a quarter slower next wave. Two waves in it publishes, and every kind it noted stays slower.",
      "The Study (90) marks his best nearby tower each wave; the Dig (60) turns up a find every third wave.",
    ],
    suits: "Experienced players who like choosing their upgrades with care.",
  },
  quack: {
    stacks: 12,
    seeds: 150,
    difficulty: "Advanced",
    rules: [
      "His Quack-Liber's power-up aura makes every tower within three tiles fire 15% faster.",
      "Quack-Liber ki blasts burst and daze. Anti-Geese Protocol throws a crowd back once a wave.",
      "The Post ratios a whole straight when a group reaches its corner; Instant Quackmission blinks the lead fruit back.",
    ],
    suits: "Players who like placing towers in clusters and timing.",
  },
  asser: {
    stacks: 20,
    seeds: 100,
    difficulty: "Advanced",
    rules: [
      "Every stack he loses pays 4 seeds (Material).",
      "Every stack he is missing makes all his towers hit 2% harder, up to +30% (Sisu).",
      "Lion Blade sweeps every fruit beside it, swings harder when he loses a stack, and mends 2 stacks after each wave.",
    ],
    suits: "Players happy to let fruit through on purpose and hit back harder.",
  },
};
