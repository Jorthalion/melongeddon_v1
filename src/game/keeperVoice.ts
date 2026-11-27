/**
 * What each keeper says out loud: when a night starts, when it's won, and when it's lost. Spoken lines, in
 * their own voice, so the log sounds like a person and not a feature list. Rules and numbers live elsewhere;
 * a line that quotes a number reads it from there.
 */
import { KEEPER_NAMES, KEEPER_START, type HeroId, type MapId, type NightId } from "./rules.ts";

interface Voice {
  /** The night's first log line (Sir Michael's is narration: he hasn't put his armour on yet). */
  open: string;
  /** On the Overflow and the Siege, if the usual line doesn't fit. */
  overflow?: string;
  siege?: string;
  win: string;
  /** A win with every stack still standing, when the usual line would be wrong (it says "barely"). */
  winClean?: string;
  lose: string;
}

const asserStacks = KEEPER_START.asser?.lives ?? 20;

export const KEEPER_VOICE: Record<HeroId, Voice> = {
  mynxi: {
    open: "“First cannon's forty seeds. And mine see further down the carpet than anyone's.”",
    overflow: "“Mind the puddles. I can still see all the way to the chute from here.”",
    siege: "“Geese. In my courtyard. I'm going to need a bigger form for this.”",
    win: "“Right. I'm filing that under accidents that worked.”",
    lose: "“I'm not speaking to you. I'm speaking to the carpet, and the carpet knows what it did.”",
  },
  vael: {
    open: "“Welcome to Potions. My shots make them drowsy; my towers do the rest. Upgrade properly and I'll approve more.”",
    overflow: "“A flooded floor. Facilities will hear about this. My puddles won't mind.”",
    siege: "“Geese and cats. Outside contractors. Nobody approved them.”",
    win: "“Quarterly targets met. Nobody take that as permission to relax.”",
    lose: "“This meeting never happened. We restructure and go again.”",
  },
  michael: {
    open: "Sir Michael is still choosing his armour.",
    win: "“Held. Barely. Please don't tell anyone how barely.”",
    winClean: "“Not one stack moved. I said I'd stand here, and I stood here.”",
    lose: "“I stood where I said I'd stand. It wasn't enough tonight.”",
  },
  elf: {
    open: "“Honey, then the foot, then the Scales pass sentence. Anything that gets to the door, I object to. Nothing I say is legal advice.” His towers are on the Keeper tab; Objection! is next to Pause (O).",
    overflow: "“Water damage. I'll be billing the plumbers. Objection's still next to Pause.”",
    siege: "“Geese have no standing in this court. Neither do cats.”",
    win: "“Case closed. Bill's in the mail.”",
    lose: "“We'll appeal.”",
  },
  ooze: {
    open: "“First one that gets past us each wave? I've got it, don't worry. Memec's on the Keeper tab, say hi.”",
    win: "“GG! Memec's still chewing, give him a minute.”",
    lose: "“Okay, that run was cursed. Again?”",
  },
  scholar: {
    open: "“You'll find an extra book on every shelf. My recommendation. The Lectern is on the Keeper tab.”",
    win: "“Write this one down. Someone will need it one day.”",
    lose: "“A lesson. An expensive one, but a lesson.”",
  },
  quack: {
    open: "“Powering up. This might take three episodes.” The Quack-Liber is on the Keeper tab: anything near it gets his aura.",
    overflow: "“Filler arc. Wet floor. Still powering up.”",
    siege: "“Geese. Of course it's geese. My power level was made for this.”",
    win: "“Posting about it. The post is doing numbers.”",
    lose: "“That was lag. That was definitely lag. Next episode.”",
  },
  asser: {
    open: `“I start with ${asserStacks} stacks. I'll lose some. Every one I lose pays for something, and the next swing lands harder.” The Lion Blade is on the Keeper tab.`,
    overflow: "“I've lost stacks before. I kept the notes.”",
    siege: "“I've lost stacks before. I kept the notes.”",
    win: "“I lost a few. It'll make a good chapter.”",
    lose: "“It all goes in the book. Even this.”",
  },
};

/** The Legal Elf in court: what he says when he objects, when there's nothing to object to, and so on. */
export const ELF_LINES = {
  /** Objection! (they take turns). */
  objection: ["Objection! You're a pumpkin.", "Objection! Leading the witness. And the carpet.", "Objection! Hearsay. I heard you say it.", "Objection! Nothing I say is legal advice."],
  /** Pressed with nothing near the door. */
  noGrounds: "No grounds for objection.",
  /** A second Objection in one wave (Sustained). */
  sustained: "Sustained. Again.",
  /** Prompt Drop's shelf. */
  promptDrop: "Prompt drop. One of these is unhinged. Read the fine print. Or don't, I'm not your lawyer.",
  /** Mynxi, his wife: a win on the Stacks. */
  mynxiWin: "“Mynxi's going to say she could've done it faster. She's right.”",
  /** Mynxi: a loss on the Stacks. */
  mynxiLose: "“Don't tell Mynxi. She'll say it was the feet. It was the feet.”",
};

/** The keeper's first line tonight. */
export function openingLine(hero: HeroId, night: NightId): string {
  const v = KEEPER_VOICE[hero];
  if (night === "overflow" && v.overflow) return v.overflow;
  if (night === "siege" && v.siege) return v.siege;
  return v.open;
}

/** "Mynxi: “…”" for the end cards. */
export const winLine = (hero: HeroId, map?: MapId, clean = false) =>
  `${KEEPER_NAMES[hero].short}: ${hero === "elf" && map === "stacks" ? ELF_LINES.mynxiWin : (clean && KEEPER_VOICE[hero].winClean) || KEEPER_VOICE[hero].win}`;
export const loseLine = (hero: HeroId, map?: MapId) =>
  `${KEEPER_NAMES[hero].short}: ${hero === "elf" && map === "stacks" ? ELF_LINES.mynxiLose : KEEPER_VOICE[hero].lose}`;
