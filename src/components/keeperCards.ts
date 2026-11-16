import { asset } from "@/lib/asset";
import type { HeroId } from "@/game/engine";

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
    flavor: "She files the disaster while it is still happening.",
    line: "The first cannon is cheap, and all of them see farther.",
    toneHz: 300,
    portrait: asset("sprites/portrait-mynxi.webp"),
  },
  {
    id: "vael",
    name: "Vaelithra",
    role: "Potions division",
    flavor: "The formula slows them. It does not apologize.",
    line: "The glass costs more. The formula costs less.",
    toneHz: 250,
    portrait: asset("sprites/portrait-vael.webp"),
  },
  {
    id: "michael",
    name: "Sir Michael",
    role: "Pumpkin Knight",
    flavor: "He says where he stands. The other two plans stay on the table.",
    line: "Three oaths. He keeps one. Ordinary shots.",
    toneHz: 220,
    portrait: asset("sprites/portrait-michael.webp"),
  },
  {
    id: "elf",
    name: "Legal Elf",
    role: "Legal advisor",
    flavor: "Witty, confident, sharp. Objects to fruit on principle.",
    line: "The back room is cheaper. The Scales bill the biggest fruit.",
    toneHz: 330,
    portrait: asset("sprites/portrait-elf.webp"),
  },
  {
    id: "ooze",
    name: "Ooze Clues",
    role: "Astral adventurer",
    flavor: "The world is a game, and she is here to 100% it.",
    line: "The first leak each wave does not count. Her Copycat is free.",
    toneHz: 360,
    portrait: asset("sprites/portrait-ooze.webp"),
  },
  {
    id: "scholar",
    name: "Dr. Samodovol",
    role: "The Scholar",
    flavor: "History is not a collection of victories. It is a collection of lessons.",
    line: "Every shelf has one more book on it: the Doctor's pick.",
    toneHz: 200,
    portrait: asset("sprites/portrait-scholar.webp"),
  },
  {
    id: "quack",
    name: "Quackarot",
    role: "Field strategist",
    flavor: "Small duck. Big plan. Never raises his voice.",
    line: "His turret slows the carpet, and every tower beside it fires faster.",
    toneHz: 280,
    portrait: asset("sprites/portrait-quack.webp"),
  },
  {
    id: "asser",
    name: "Asser Mälkki",
    role: "Author-Knight",
    flavor: "Calm, very tall, and hard to knock down. He writes every hit into the book.",
    line: "Twenty-five stacks. Every one he loses pays seeds and makes his towers hit harder.",
    toneHz: 240,
    portrait: asset("sprites/portrait-asser.webp"),
  },
];

