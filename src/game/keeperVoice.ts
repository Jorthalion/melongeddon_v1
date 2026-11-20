/**
 * What each keeper says out loud: when a night starts, when it's won, and when it's lost. Spoken lines, in
 * their own voice, so the log sounds like a person and not a feature list. Rules and numbers live elsewhere;
 * a line that quotes a number reads it from there.
 */
import { KEEPER_NAMES, KEEPER_START, type HeroId, type NightId } from "./rules.ts";

interface Voice {
  /** The night's first log line (Sir Michael's is narration: he hasn't put his armour on yet). */
  open: string;
  /** On the Overflow and the Siege, if the usual line doesn't fit. */
  overflow?: string;
  siege?: string;
  win: string;
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
    open: "“My shots slow them down. They don't hit any harder, so don't ask.”",
    overflow: "“The damp won't bother my mixture. It'll bother everything else.”",
    siege: "“Geese and cats. Neither of them has read my notes on slowing agents.”",
    win: "“The formula held. I'll write it up properly later.”",
    lose: "“Interesting. Wrong, but interesting.”",
  },
  michael: {
    open: "Sir Michael is still choosing his armour.",
    win: "“Held. Barely. Please don't tell anyone how barely.”",
    lose: "“I stood where I said I'd stand. It wasn't enough tonight.”",
  },
  elf: {
    open: "“I've had a word with the back room. Upgrades are cheaper now, you're welcome. The Scales are on the Keeper tab.”",
    win: "“Case closed. I'll be billing the produce for my time.”",
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

/** The keeper's first line tonight. */
export function openingLine(hero: HeroId, night: NightId): string {
  const v = KEEPER_VOICE[hero];
  if (night === "overflow" && v.overflow) return v.overflow;
  if (night === "siege" && v.siege) return v.siege;
  return v.open;
}

/** "Mynxi: “…”" for the end cards. */
export const winLine = (hero: HeroId) => `${KEEPER_NAMES[hero].short}: ${KEEPER_VOICE[hero].win}`;
export const loseLine = (hero: HeroId) => `${KEEPER_NAMES[hero].short}: ${KEEPER_VOICE[hero].lose}`;
