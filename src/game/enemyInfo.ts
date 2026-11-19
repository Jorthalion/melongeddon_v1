import { AFFLICT, BALANCE, NATIVES, NATIVE_INFO, STATS, type WaveGroup, type World } from "./engine.ts";
import { COUNTERS, countersFor } from "./counters.ts";

type Fruit = World["enemies"][number];

/** What the hover card says about one fruit (or goose, or cat): its name, health, what it is, and what's on it now. */
export interface EnemyInfo {
  name: string;
  hp: number;
  maxHp: number;
  /** What it is: armour, marks and its own rules ("Split: pops into four small melons"). */
  traits: string[];
  /** What's happening to it right now ("Frozen", "Inked: takes 30% more damage"). */
  effects: string[];
  /** What beats it, from the shared counters table (counters.ts). */
  beats: string[];
}

/**
 * A not-yet-spawned enemy from a Coming up group, shaped like a fruit on the board so `describeEnemy` can
 * describe it (no effects on it yet).
 */
export function fruitFromGroup(g: WaveGroup): Fruit {
  return {
    id: -1,
    kind: g.kind,
    x: -1e6,
    y: -1e6,
    hp: g.hp,
    maxHp: g.hp,
    speed: g.speed,
    slow: 1,
    gold: 0,
    r: STATS[g.kind].r,
    wp: 0,
    boss: g.boss,
    mini: g.mini,
    chill: 0,
    freeze: 0,
    guard: g.guard,
    shell: g.guard === "rind" ? 1 : 0,
    split: g.split,
    raw: g.raw,
    bread: false,
    reverse: g.chute,
    pit: g.pit,
    borrower: g.borrower,
    native: g.native ?? undefined,
    wrapped: g.native === "parcel",
    matriarch: g.siege === "matriarch",
    general: g.siege === "general",
    gosling: g.siege === "gosling",
    leader: g.leader,
    tank: g.siege === "tank",
    boxed: g.siege === "boxed",
    para: g.siege === "para",
    lives9: g.kind === "cat" && !g.siege,
  } as Fruit;
}

const KIND_NAME: Record<string, string> = { melon: "Melon", corn: "Corn", pumpkin: "Pumpkin", karl: "Karl", goose: "Honker", cat: "Private Whiskers" };

function nameOf(e: Fruit) {
  if (e.matriarch) return "The Matriarch";
  if (e.general) return "General Mittens";
  if (e.gosling) return e.leader ? "Gosling (leader)" : "Gosling";
  if (e.tank) return "Cardboard Tank";
  if (e.boxed) return "Box Cat";
  if (e.para) return "Paratrooper";
  if (e.native) return NATIVE_INFO[e.native].name;
  if (e.pit) return "The Pit";
  if (e.gall) return "Gall";
  if (e.borrower) return "Borrower";
  return KIND_NAME[e.kind] ?? e.kind;
}

const secs = (s: number) => `${Math.max(0.1, s).toFixed(1)}s`;

/** The hover card for `e`. `world` is read for burning (hot pools under it) and the beds and vines it stands on. */
export function describeEnemy(e: Fruit, world: Pick<World, "pools" | "floors" | "vines">): EnemyInfo {
  const traits: string[] = [];
  const effects: string[] = [];
  const base = e.matriarch ? "goose" : e.general ? "cat" : "pumpkin";

  // What it is.
  if (e.mini) traits.push(`Mini-boss: ${Math.round((BALANCE.miniBossHp - 1) * 100)}% more health than a ${base}. The full boss comes on the last wave.`);
  else if (e.boss) traits.push("Boss: leaking it costs 3 stacks.");
  if (e.guard === "rind" && e.shell > 0) traits.push("Shell: the first hit only cracks it.");
  if (e.guard === "husk") traits.push("Husk: slows, freezes and stuns don't work; splash and fire hurt it more.");
  if (e.guard === "damp") traits.push("Damp: fire barely hurts it; freezes last longer.");
  if (e.raw && !e.bread) traits.push("Raw: the first burn bakes it into bread instead of hurting it.");
  if (e.bread) traits.push("Baked into bread: crawls slowly, and fire can't hurt it.");
  if (e.split) traits.push("Split (the X): when popped it breaks into four small melons.");
  if (e.pit) traits.push("Stone: splash, fire and puddles barely touch it. Use direct hits.");
  if (e.gall) traits.push("Gall: heals the fruit it rides while both are alive.");
  if (e.borrower) traits.push("Borrower: at the door it takes seeds, not a stack.");
  if (e.reverse) traits.push("Came up the chute: walking back toward the start.");
  if (e.native === "express") traits.push("On a belt nothing slows or stops it, and the belt carries it at double speed.");
  if (e.native === "parcel" && e.wrapped) traits.push("Wrapped: direct hits do half until splash, fire or a puddle tears the paper.");
  if (e.native === "parcel") traits.push("Three corn walk out when it pops.");
  if (e.native === "sprout") traits.push(`Grows into a melon after ${NATIVES.sproutGrow}s in the beds, unless it's burning.`);
  if (e.native === "squash") traits.push("Leaves healing vines behind it. Fire burns them away.");
  if (e.native === "chimer") traits.push("Every Chimer still walking makes the clock strike sooner.");
  if (e.native === "gargoyle") traits.push("Stone skin between strikes; runs three times as fast while the towers are silent.");
  if (e.kind === "goose" && !e.gosling && !e.matriarch && !e.honked) traits.push("Honks when first hit: towers close by skip a shot.");
  if (e.leader) traits.push("Leader: if it falls, its line stops for a moment.");
  if (e.matriarch) traits.push("Rallies every goose on the board to walk faster.");
  if (e.lives9) traits.push("Nine Lives: gets back up once, at 30% health.");
  if (e.boxed) traits.push("In a box: aimed shots can't target it. Splash, fire, puddles or a Reading Lamp knock the box off.");
  if (e.tank) traits.push("Front armour: half damage from towers ahead of it.");
  if (e.general) traits.push("Every cat has more health while she stands. When she falls they scatter.");

  // What's on it now.
  if (e.freeze > 0) effects.push(e.stunBy === "sleep" ? `Asleep (${secs(e.freeze)})` : e.stunBy ? `Stunned (${secs(e.freeze)})` : `Frozen (${secs(e.freeze)})`);
  else if ((e.stomped ?? 0) > 0) effects.push(`Pinned under the Foot (${secs(e.stomped!)})`);
  else if ((e.halt ?? 0) > 0) effects.push((e.brawl ?? 0) > 0 ? "Fighting" : "Stopped");
  if ((e.drowsy ?? 0) > 0) effects.push(`Drowsy: slowed (${secs(e.drowsy!)})`);
  if (e.chill > 0) effects.push(`Dazed: slowed (${secs(e.chill)})`);
  if (e.slow < 0.999 && e.chill <= 0 && (e.drowsy ?? 0) <= 0) effects.push(`Slowed to ${Math.round(e.slow * 100)}%`);
  if (world.pools.some((p) => p.hot && Math.hypot(e.x - p.x, e.y - p.y) < p.r)) effects.push("Burning");
  if ((e.ink ?? 0) > 0) effects.push(`Inked: takes ${Math.round(((e.inkMul ?? 1) - 1) * 100)}% more damage`);
  if ((e.honeyed ?? 0) > 0) effects.push(`Honeyed: takes more damage (${secs(e.honeyed!)})`);
  if ((e.worm ?? 0) > 0) effects.push(`Bookworm burrowing (${secs(e.worm!)})`);
  if ((e.driven ?? 0) > 0) effects.push(`Walking back (${secs(e.driven!)})`);
  if ((e.panic ?? 0) > 0) effects.push("Panicking");
  // Status combos: frost stacks, afflictions, a doused or flaring fire.
  const frost = Math.floor(e.frost ?? 0);
  if (frost > 0) effects.push(`Frost ${frost}/3${frost >= 2 ? ": an explosion shatters it" : ""}`);
  if ((e.sting ?? 0) > 0) effects.push(`Stung ×${e.sting}: ${(e.sting ?? 0) * AFFLICT.stingDps} damage a second (seeds drive them deeper)`);
  if ((e.poison ?? 0) > 0) effects.push(`Poisoned ×${e.poison}: ${Math.round((e.poison ?? 0) * (e.poisonDps ?? 0))} damage a second (fire burns it hotter)`);
  if ((e.burnT ?? 0) > 0) effects.push(`On fire (${secs(e.burnT!)})`);
  if (e.flamed) effects.push("Flaring up: the poison caught fire");
  if ((e.doused ?? 0) > 0) effects.push(`Fire doused by ice (${secs(e.doused!)})`);
  if ((e.rallied ?? 0) > 0) effects.push("Rallied: walking faster");
  if (e.mittened) effects.push("General Mittens' extra health");
  const key = `${Math.floor(e.x / 48)},${Math.floor(e.y / 48)}`;
  if (world.floors.get(key)?.kind === "bed" || world.vines.has(key)) effects.push("Healing on a bed");

  const beats = countersFor(e).map((id) => COUNTERS[id].beats);
  return { name: nameOf(e) + (e.mini ? " (mini)" : ""), hp: Math.max(0, Math.ceil(e.hp)), maxHp: e.maxHp, traits, effects, beats };
}
