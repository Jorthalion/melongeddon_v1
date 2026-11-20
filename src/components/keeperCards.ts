import { asset } from "@/lib/asset";
import { KEEPER_START, type HeroId } from "@/game/engine";

/**
 * Setup-screen faces for the seven keepers. Each gets one line: the thing you feel on wave one.
 * Stacks, seeds and the rest live in the guide. Portraits are shown in their own colours.
 */
export const KEEPERS: Array<{
  id: HeroId;
  name: string;
  role: string;
  flavor: string;
  /** The one line on the card. */
  line: string;
  toneHz: number;
  portrait: string;
}> = [
  {
    id: "mynxi",
    name: "Mynxi",
    role: "Head librarian",
    flavor: "“I'll file it under incidents once it stops moving.”",
    line: "Her first cannon costs 40, and every cannon she builds sees farther down the carpet.",
    toneHz: 300,
    portrait: asset("sprites/portrait-mynxi.webp"),
  },
  {
    id: "vael",
    name: "Vaelithra",
    role: "Potions division",
    flavor: "“Hold still. This only stings if you're a melon.”",
    line: "Her shots make fruit drowsy: slow and sleepy, but never frozen. Each new kind of tower costs her 20 more, but the back room costs her less.",
    toneHz: 250,
    portrait: asset("sprites/portrait-vael.webp"),
  },
  {
    id: "michael",
    name: "Sir Michael",
    role: "Dragon Knight",
    flavor: "“I'll tell you where I stand. Then I'll stand there.”",
    line: "Chooses his armour, then builds big: a Hoard for giant towers, Great merges, and a dragon that grows all night.",
    toneHz: 220,
    portrait: asset("sprites/portrait-michael.webp"),
  },
  {
    id: "elf",
    name: "Legal Elf",
    role: "Legal advisor",
    flavor: "“Objection. You're a pumpkin.”",
    line: "The back room gives him 30% off, and his Scales take a cut of the biggest fruit.",
    toneHz: 330,
    portrait: asset("sprites/portrait-elf.webp"),
  },
  {
    id: "ooze",
    name: "Ooze Clues",
    role: "Astral adventurer",
    flavor: "“This room has a secret. I can feel it.”",
    line: "The first fruit that gets past each wave doesn't count, and her Copycat costs nothing.",
    toneHz: 360,
    portrait: asset("sprites/portrait-ooze.webp"),
  },
  {
    id: "scholar",
    name: "Dr. Samodovol",
    role: "The Scholar",
    flavor: "“All of this has happened before. I wrote down how it ended.”",
    line: "Every upgrade shelf has one extra card on it: the Doctor's pick.",
    toneHz: 200,
    portrait: asset("sprites/portrait-scholar.webp"),
  },
  {
    id: "quack",
    name: "Quackarot",
    role: "Duck of Destiny",
    flavor: "“Small duck. Big hair. Posts first, plans later.”",
    line: "His aura powers up every tower beside him, and his ki blasts daze the carpet.",
    toneHz: 280,
    portrait: asset("sprites/portrait-quack.webp"),
  },
  {
    id: "asser",
    name: "Asser Mälkki",
    role: "Author-Knight",
    flavor: "“You lose a few. You write them down. You keep going.”",
    line: `He starts with ${KEEPER_START.asser?.lives ?? 20} stacks. Every one he loses pays seeds and makes his towers hit harder.`,
    toneHz: 240,
    portrait: asset("sprites/portrait-asser.webp"),
  },
];

