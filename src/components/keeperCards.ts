import { asset } from "@/lib/asset";
import { BALANCE, KEEPER_START, type HeroId } from "@/game/engine";

/** Setup-screen cards for the six keepers: portrait, flavor and the three lines under it. */
export const KEEPERS: Array<{
  id: HeroId;
  name: string;
  role: string;
  flavor: string;
  toneHz: number;
  portrait: string;
  filter: string;
  traits: Array<{ icon: "coins" | "aim" | "heart"; text: string }>;
}> = [
  {
    id: "mynxi",
    name: "Mynxi",
    role: "Head librarian",
    flavor: "She files the disaster while it is still happening.",
    toneHz: 300,
    portrait: asset("sprites/portrait-mynxi.webp"),
    filter: "sepia(0.22) saturate(0.82) contrast(1.05)",
    traits: [
      { icon: "coins", text: "First build is 40 seeds" },
      { icon: "aim", text: "Cannons reach farther" },
      { icon: "heart", text: "12 stacks" },
    ],
  },
  {
    id: "vael",
    name: "Vaelithra",
    role: "Potions division",
    flavor: "The formula slows them. It does not apologize.",
    toneHz: 250,
    portrait: asset("sprites/portrait-vael.webp"),
    filter: "sepia(0.48) saturate(0.72) brightness(0.92) hue-rotate(-10deg)",
    traits: [
      { icon: "aim", text: "Shots slow the line" },
      { icon: "coins", text: "Damage stays ordinary" },
      { icon: "heart", text: "11 stacks, 120 seeds" },
    ],
  },
  {
    id: "michael",
    name: "Sir Michael",
    role: "Pumpkin Knight",
    flavor: "His cannon is already on the floor. So is his helmet.",
    toneHz: 220,
    portrait: asset("sprites/portrait-michael.webp"),
    filter: "sepia(0.28) saturate(0.78) brightness(0.96)",
    traits: [
      { icon: "aim", text: "One cannon already set" },
      { icon: "coins", text: "Shots hit harder" },
      { icon: "heart", text: `${BALANCE.michaelLives} stacks, ${BALANCE.michaelSeeds} seeds` },
    ],
  },
  {
    id: "elf",
    name: "Legal Elf",
    role: "Legal advisor",
    flavor: "Witty, confident, sharp. Objects to fruit on principle.",
    toneHz: 330,
    portrait: asset("sprites/portrait-elf.webp"),
    filter: "sepia(0.2) saturate(0.85) contrast(1.05)",
    traits: [
      { icon: "coins", text: "Back room costs 30% less" },
      { icon: "aim", text: "Ordinary shots" },
      { icon: "heart", text: `${KEEPER_START.elf!.lives} stacks, ${KEEPER_START.elf!.seeds} seeds` },
    ],
  },
  {
    id: "ooze",
    name: "Ooze Clues",
    role: "Astral adventurer",
    flavor: "The world is a game, and she is here to 100% it.",
    toneHz: 360,
    portrait: asset("sprites/portrait-ooze.webp"),
    filter: "sepia(0.22) saturate(0.8) contrast(1.04)",
    traits: [
      { icon: "heart", text: "First leak each wave is absorbed" },
      { icon: "aim", text: "Ordinary shots" },
      { icon: "coins", text: `${KEEPER_START.ooze!.lives} stacks, ${KEEPER_START.ooze!.seeds} seeds` },
    ],
  },
  {
    id: "scholar",
    name: "Dr. Samodovol",
    role: "The Scholar",
    flavor: "History is not a collection of victories. It is a collection of lessons.",
    toneHz: 200,
    portrait: asset("sprites/portrait-scholar.webp"),
    filter: "sepia(0.3) saturate(0.8) brightness(0.95)",
    traits: [
      { icon: "aim", text: "Upgrade picks show 4 choices" },
      { icon: "coins", text: "Ordinary shots" },
      { icon: "heart", text: `${KEEPER_START.scholar!.lives} stacks, ${KEEPER_START.scholar!.seeds} seeds` },
    ],
  },
];
