/**
 * All sound is synthesized with Web Audio: no files to load.
 * - tone(): small UI blips.
 * - playSfx(): game cues raised by the engine (world.sfx).
 * - setMusicMode(): a quiet procedural harpsichord loop; "combat" adds a bass pulse.
 */
import type { Sfx, TowerKind } from "./engine.ts";
import { load, save } from "../lib/storage.ts";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;

let muted = load("melongeddon:muted") === "1";
let musicOn = load("melongeddon:music") !== "0";

export function isMuted() {
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  save("melongeddon:muted", next ? "1" : "0");
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.03);
}

export function isMusicOn() {
  return musicOn;
}

export function setMusicOn(next: boolean) {
  musicOn = next;
  save("melongeddon:music", next ? "1" : "0");
  if (musicBus && ctx) musicBus.gain.setTargetAtTime(next ? MUSIC_LEVEL : 0, ctx.currentTime, 0.2);
}

const MUSIC_LEVEL = 0.55;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? MUSIC_LEVEL : 0;
    musicBus.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  startMusic();
}

const ready = () => ctx && ctx.state === "running" && !muted;

// ---------- building blocks ----------

interface Voice {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
  attack?: number;
  bus?: GainNode | null;
}

function voice({ freq, to, dur, type = "triangle", gain = 0.05, at = 0, attack = 0.004, bus = sfxBus }: Voice) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss({ dur, gain = 0.05, at = 0, filter = "lowpass", freq = 900, q = 0.8, to }: {
  dur: number;
  gain?: number;
  at?: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  to?: number;
}) {
  if (!ctx || !sfxBus || !noise) return;
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const vary = (n: number, spread = 0.08) => n * (1 + (Math.random() * 2 - 1) * spread);

/** UI blip (buttons, menus). */
export function tone(freq: number, dur = 0.08, type: OscillatorType = "square", gain = 0.04) {
  if (!ready()) return;
  voice({ freq, dur, type, gain });
}

// ---------- game cues ----------

const lastPlayed = new Map<string, number>();
/** Minimum seconds between two plays of the same cue, so a big wave stays listenable. */
const GAP: Record<string, number> = { fire: 0.07, pop: 0.045, leak: 0.12, build: 0.05, sell: 0.05 };

function throttled(key: string, gap: number) {
  if (!ctx) return true;
  const now = ctx.currentTime;
  if (now - (lastPlayed.get(key) ?? -1) < gap) return true;
  lastPlayed.set(key, now);
  return false;
}

function fire(kind: TowerKind | undefined) {
  if (throttled(`fire:${kind}`, GAP.fire)) return;
  switch (kind) {
    case "mortar":
      voice({ freq: vary(130), to: 45, dur: 0.22, type: "sine", gain: 0.09 });
      hiss({ dur: 0.12, gain: 0.04, freq: 500 });
      break;
    case "fire":
      hiss({ dur: 0.22, gain: 0.05, filter: "bandpass", freq: 1400, to: 500, q: 1.2 });
      break;
    case "freeze":
      voice({ freq: vary(1700, 0.04), to: 1100, dur: 0.14, type: "sine", gain: 0.025 });
      voice({ freq: vary(2550, 0.04), dur: 0.1, type: "sine", gain: 0.012, at: 0.02 });
      break;
    case "still":
    case "lantern":
    case "compost":
      break;
    case "spitter":
      voice({ freq: vary(900, 0.12), to: 500, dur: 0.035, type: "square", gain: 0.012 });
      break;
    case "ballista":
      voice({ freq: vary(220), to: 110, dur: 0.18, type: "sawtooth", gain: 0.03 });
      hiss({ dur: 0.14, gain: 0.04, filter: "bandpass", freq: 2200, to: 800, q: 2 });
      break;
    case "reader":
      hiss({ dur: 0.09, gain: 0.08, filter: "highpass", freq: 1500 });
      voice({ freq: 1400, to: 300, dur: 0.18, type: "triangle", gain: 0.04 });
      break;
    case "bell":
      [1046, 1568, 2093].forEach((f, i) => voice({ freq: f, dur: 1.1 - i * 0.3, type: "sine", gain: 0.03 - i * 0.008 }));
      break;
    case "hive":
      voice({ freq: vary(190, 0.1), dur: 0.12, type: "sawtooth", gain: 0.008 });
      break;
    case "ink":
      voice({ freq: vary(300), to: 120, dur: 0.1, type: "sine", gain: 0.05 });
      break;
    case "peeler":
      hiss({ dur: 0.08, gain: 0.04, filter: "bandpass", freq: 3000, to: 1500, q: 3 });
      break;
    case "bookworm":
      voice({ freq: vary(160), to: 240, dur: 0.12, type: "triangle", gain: 0.03 });
      break;
    default:
      voice({ freq: vary(190), to: 75, dur: 0.1, type: "sine", gain: 0.06 });
      hiss({ dur: 0.05, gain: 0.02, freq: 1200 });
  }
}

export function playSfx(cue: Sfx) {
  if (!ready()) return;
  switch (cue.kind) {
    case "fire":
      fire(cue.tower);
      break;
    case "pop":
      if (throttled("pop", GAP.pop)) return;
      hiss({ dur: 0.08, gain: 0.06, freq: vary(1000, 0.2), to: 300 });
      voice({ freq: vary(420, 0.15), to: 140, dur: 0.07, type: "triangle", gain: 0.035 });
      break;
    case "bossPop":
      hiss({ dur: 0.5, gain: 0.12, freq: 900, to: 120 });
      voice({ freq: 160, to: 40, dur: 0.6, type: "sine", gain: 0.14 });
      [523, 659, 784].forEach((f, i) => voice({ freq: f, dur: 0.3, gain: 0.04, at: 0.25 + i * 0.09 }));
      break;
    case "leak":
      if (throttled("leak", GAP.leak)) return;
      voice({ freq: 110, to: 55, dur: 0.3, type: "square", gain: 0.035 });
      voice({ freq: 116, to: 58, dur: 0.3, type: "square", gain: 0.025 });
      break;
    case "build":
      if (throttled("build", GAP.build)) return;
      hiss({ dur: 0.04, gain: 0.05, filter: "bandpass", freq: 1800, q: 3 });
      voice({ freq: 330, dur: 0.08, gain: 0.05 });
      voice({ freq: 495, dur: 0.1, gain: 0.04, at: 0.06 });
      break;
    case "sell":
      if (throttled("sell", GAP.sell)) return;
      voice({ freq: 1320, dur: 0.08, type: "sine", gain: 0.035 });
      voice({ freq: 990, dur: 0.12, type: "sine", gain: 0.035, at: 0.07 });
      break;
    case "wave":
      voice({ freq: 196, dur: 0.28, type: "sawtooth", gain: 0.025, attack: 0.03 });
      voice({ freq: 294, dur: 0.45, type: "sawtooth", gain: 0.025, attack: 0.03, at: 0.22 });
      break;
    case "boss":
      [147, 139, 98].forEach((f, i) => voice({ freq: f, dur: 0.5, type: "sawtooth", gain: 0.035, attack: 0.04, at: i * 0.32 }));
      voice({ freq: 55, dur: 1.4, type: "sine", gain: 0.1, attack: 0.1 });
      break;
    case "clear":
      [392, 494, 587].forEach((f, i) => voice({ freq: f, dur: 0.22, gain: 0.045, at: i * 0.08 }));
      break;
    case "victory":
      [392, 494, 587, 784].forEach((f, i) => voice({ freq: f, dur: i === 3 ? 0.9 : 0.25, gain: 0.05, at: i * 0.14 }));
      voice({ freq: 196, dur: 1.2, type: "sine", gain: 0.06, at: 0.42 });
      break;
    case "defeat":
      [294, 277, 233, 147].forEach((f, i) => voice({ freq: f, dur: i === 3 ? 1.1 : 0.32, gain: 0.05, at: i * 0.22 }));
      break;
    case "turn":
      voice({ freq: 233, dur: 0.6, type: "sawtooth", gain: 0.03, attack: 0.02 });
      voice({ freq: 247, dur: 0.6, type: "sawtooth", gain: 0.03, attack: 0.02 });
      hiss({ dur: 0.4, gain: 0.08, freq: 600, to: 150 });
      break;
  }
}

// ---------- music ----------

type MusicMode = "off" | "calm" | "combat";
let mode: MusicMode = "off";
let timer: ReturnType<typeof setInterval> | null = null;
let nextNote = 0;
let step = 0;

// D minor, four bars: i – VI – III – VII, played as a harpsichord-ish arpeggio.
const CHORDS = [
  [146.83, 174.61, 220.0, 293.66], // Dm
  [116.54, 146.83, 174.61, 233.08], // Bb
  [130.81, 174.61, 220.0, 261.63], // F/C
  [130.81, 164.81, 196.0, 261.63], // C
];
const PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];
const EIGHTH = 60 / 84 / 2;

export function setMusicMode(next: MusicMode) {
  mode = next;
}

function startMusic() {
  if (timer || !ctx) return;
  nextNote = ctx.currentTime + 0.1;
  timer = setInterval(scheduleMusic, 90);
}

function scheduleMusic() {
  if (!ctx || !musicBus || ctx.state !== "running") return;
  // Re-sync after the tab was hidden instead of firing a burst of late notes.
  if (nextNote < ctx.currentTime - 0.2) nextNote = ctx.currentTime + 0.05;
  while (nextNote < ctx.currentTime + 0.25) {
    if (mode !== "off" && musicOn && !muted) playStep(step, nextNote - ctx.currentTime);
    nextNote += EIGHTH;
    step = (step + 1) % (CHORDS.length * PATTERN.length);
  }
}

function playStep(s: number, at: number) {
  const chord = CHORDS[Math.floor(s / PATTERN.length)];
  const beat = s % PATTERN.length;
  const note = chord[PATTERN[beat]] * 2;
  voice({ freq: note, dur: 0.5, type: "triangle", gain: 0.03, at, bus: musicBus });
  voice({ freq: note * 2, dur: 0.18, type: "sine", gain: 0.006, at, bus: musicBus });
  if (beat === 0) {
    voice({ freq: chord[0] / 2, dur: EIGHTH * 8, type: "sine", gain: 0.035, attack: 0.3, at, bus: musicBus });
  }
  if (mode === "combat" && beat % 2 === 0) {
    voice({ freq: chord[0] / 2, to: chord[0] / 2.6, dur: 0.16, type: "square", gain: 0.012, at, bus: musicBus });
  }
}
