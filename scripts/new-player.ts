/**
 * New-player bot: plays Melongeddon in a real browser the way someone who has never seen it would,
 * and writes down where it got confused. It is not trying to win.
 *
 *   npm run sim:newplayer                     (starts its own dev server on a free port)
 *   npm run sim:newplayer -- --url http://localhost:5173/ --headed --waves 6 --seed 7
 *
 * Options: --url (use a running server), --out <dir> (default sim-results/new-player/<time>),
 * --waves <n> waves to play on the first night (default 4), --viewport 1366x768, --browser chrome|msedge,
 * --headed, --seed <n> (the learner's small random choices), --style curious|careful (default curious:
 * between instructions the learner pokes at things: taps its towers and sometimes sells one, taps the
 * board at random, browses tabs and locked cards, pauses, changes speed, opens the menu, mashes keys,
 * hovers fruit, looks in the Back room, tries to build what it can't afford, may hit Skip by mistake),
 * --curiosity 0..1 (how often it wanders off, default 0.4).
 *
 * Fresh profile: every run launches a new browser context, so storage starts empty and developer
 * mode is off. The context is thrown away at the end; the user's own browser save is never touched.
 *
 * Only what's on screen: the bot reads visible buttons, labels, tooltips, Mynxi's lessons, tips and
 * the log line. On the board (a canvas) it looks at the pixels to find the red carpet, like a player
 * looking at the picture. It never calls the engine. Hotkeys are only used once the UI has mentioned them.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------- options

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "1";
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = resolve(arg("out") ?? join("sim-results", "new-player", stamp));
const WAVES = Number(arg("waves") ?? 4);
const [VW, VH] = (arg("viewport") ?? "1366x768").split("x").map(Number);
const BROWSER = arg("browser") ?? "chrome";
const HEADED = arg("headed") != null;
/** curious (default): pokes at things between instructions, like a real learner. careful: only follows instructions. */
const STYLE = arg("style") === "careful" ? "careful" : "curious";
/** How often the curious learner wanders off (0..1, default 0.4). */
const CURIOSITY = Math.max(0, Math.min(1, Number(arg("curiosity") ?? 0.4)));
/** How likely a wander during the lessons is a slip onto Skip (relative weight; most runs keep the guide). */
const SKIP_WEIGHT = 0.3;
let seed = Number(arg("seed") ?? 1) >>> 0;
/** The learner's dice (mulberry32). */
function rand() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- the notebook

type Severity = "blocker" | "major" | "minor" | "note";
const RANK: Record<Severity, number> = { blocker: 0, major: 1, minor: 2, note: 3 };
interface Friction {
  severity: Severity;
  screen: string;
  title: string;
  tried: string;
  expected: string;
  saw: string;
  at: number;
  shot?: string;
}
interface Step {
  screen: string;
  what: string;
  ms: number;
  /** Words the player had to read here, and how long that takes at 200 words a minute. */
  words: number;
}
const frictions: Friction[] = [];
const steps: Step[] = [];
const screensSeen = new Map<string, number>();
const t0 = Date.now();
const secs = () => Math.round((Date.now() - t0) / 100) / 10;
let shotN = 0;
let page!: Page;

async function shot(label: string): Promise<string | undefined> {
  try {
    const name = `${String(++shotN).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40)}.png`;
    await page.screenshot({ path: join(OUT, name) });
    return name;
  } catch {
    return undefined;
  }
}

/** The same problem is written down once (title + screen). */
async function friction(f: Omit<Friction, "at" | "shot">, withShot = true) {
  if (frictions.some((x) => x.title === f.title && x.screen === f.screen)) return;
  const entry: Friction = { ...f, at: secs() };
  if (withShot && f.severity !== "note") entry.shot = await shot(f.title);
  frictions.push(entry);
  console.log(`  [${f.severity}] ${f.screen}: ${f.title}`);
}

function step(screen: string, what: string, started: number, words = 0) {
  steps.push({ screen, what, ms: Date.now() - started, words });
}

const wordsIn = (s: string) => (s.match(/[A-Za-z0-9'’]+/g) ?? []).length;
const readSecs = (words: number) => Math.round((words / 200) * 60);

// ---------------------------------------------------------------- what's on screen

interface Btn {
  name: string;
  enabled: boolean;
  tip: string;
  role: string;
}
interface Seen {
  screen: string;
  text: string;
  buttons: Btn[];
  headings: string[];
  mynxi?: { lesson: string; title: string; text: string; action: string };
  seeds?: number;
  lives?: string;
  log: string;
  tooltip: string;
}

async function look(scope?: string): Promise<Seen> {
  const raw = await page.evaluate((scope) => {
    const root: ParentNode = (scope && document.querySelector(scope)) || document;
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    const buttons = [...root.querySelectorAll("button, [role=button], [role=tab], [role=radio], a[href]")]
      .filter(vis)
      .map((b) => ({
        name: ((b as HTMLElement).innerText || b.getAttribute("aria-label") || b.getAttribute("title") || "").replace(/\s+/g, " ").trim(),
        enabled: !(b as HTMLButtonElement).disabled && b.getAttribute("aria-disabled") !== "true",
        tip: b.getAttribute("title") ?? "",
        role: b.getAttribute("role") ?? b.tagName.toLowerCase(),
      }));
    const headings = [...document.querySelectorAll("h1, h2, h3, .font-display")]
      .filter(vis)
      .map((h) => (h as HTMLElement).innerText.trim())
      .filter((t) => t && !/^\d/.test(t));
    const status = [...document.querySelectorAll("[role=status]")].filter(vis).map((s) => (s as HTMLElement).innerText);
    const mynxiText = status.find((s) => /^MYNXI|^Mynxi/i.test(s.trim()));
    const header = document.querySelector("header");
    const nums = header ? [...header.querySelectorAll(".font-display")].map((e) => (e as HTMLElement).innerText.trim()) : [];
    // The game's message line: the footer, or the build column's last line on wide screens (not the tips column).
    const footerLog = [...document.querySelectorAll("footer > p, aside p")]
      .filter((p) => vis(p) && !p.closest('[aria-label="Back room column"], [data-tip-dock], [role=status]'))
      .map((p) => (p as HTMLElement).innerText.trim());
    const tooltip = [...document.querySelectorAll("[role=tooltip]")].filter(vis).map((t) => (t as HTMLElement).innerText.trim()).join(" ");
    return {
      text: document.body.innerText,
      buttons,
      headings,
      mynxiText,
      seeds: nums.find((n) => /^\d+$/.test(n)),
      lives: header?.innerText.match(/\b\d+\/\d+\b/)?.[0],
      log: footerLog.at(-1) ?? "",
      tooltip,
      hasCanvas: !!document.querySelector("canvas") && vis(document.querySelector("canvas")!),
      dialogs: [...document.querySelectorAll("[aria-label]")].filter(vis).map((d) => d.getAttribute("aria-label")!),
      /** The title of an open modal dialog (role=dialog with aria-modal or aria-labelledby), if any. */
      modal: (() => {
        const d = [...document.querySelectorAll("[role=dialog]")].filter(vis).find((e) => e.getAttribute("aria-modal") === "true" || e.hasAttribute("aria-labelledby"));
        if (!d) return "";
        const id = d.getAttribute("aria-labelledby");
        return ((id && document.getElementById(id)?.innerText) || d.getAttribute("aria-label") || "dialog").trim();
      })(),
    };
  }, scope);
  let mynxi: Seen["mynxi"];
  if (raw.mynxiText) {
    const lines = raw.mynxiText.split("\n").map((l) => l.trim()).filter(Boolean);
    const action = lines.find((l) => /^(Next|Let's go|Got it|Your move)$/.test(l)) ?? "";
    mynxi = {
      lesson: lines[0].match(/lesson \d+ of \d+/i)?.[0] ?? "tip",
      title: lines[1] ?? "",
      text: lines[2] ?? "",
      action,
    };
  }
  const has = (re: RegExp) => raw.buttons.some((b) => re.test(b.name));
  const text = raw.text;
  let screen = "Unknown";
  if (raw.buttons.some((b) => b.name === "How to play") && raw.buttons.some((b) => b.name === "Grand Catalogue")) screen = "Title";
  else if (raw.dialogs.includes("How to play")) screen = "Title › How to play";
  else if (raw.dialogs.includes("Settings") && /Settings/.test(text) && !has(/^Leave to title/)) screen = "Settings";
  else if (raw.dialogs.includes("Grand Catalogue")) screen = "Grand Catalogue";
  else if (has(/^(To the carpet|Cover the chute|Hold the courtyard)$/)) screen = "Room poster";
  else if (has(/^Leave to title$/) || raw.headings.includes("Paused") && has(/^Resume$/)) screen = "Pause menu";
  else if (raw.modal === "Settings") screen = "Settings (from the menu)";
  else if (/Between the waves/.test(text)) screen = "Upgrade pick";
  else if (raw.dialogs.includes("Back room") && raw.headings.includes("Back room")) screen = "Back room";
  else if (raw.dialogs.includes("Keeper") || raw.dialogs.includes("Night") || raw.dialogs.includes("Difficulty")) screen = "Setup";
  else if (/\b(Victory|held|Defeat|The carpet won)\b/i.test(raw.headings.join(" ")) && !has(/^Start wave/)) screen = "Night over";
  else if (raw.modal) screen = `Dialog: ${raw.modal.slice(0, 40)}`;
  else if (raw.hasCanvas && (has(/^Start (wave|the last wave)/) || /Wave \d+\/\d+/.test(text))) screen = has(/^Start (wave|the last wave)/) ? "Board (between waves)" : "Board (wave running)";
  if (!screensSeen.has(screen)) screensSeen.set(screen, secs());
  return {
    screen,
    text,
    buttons: raw.buttons,
    headings: raw.headings,
    mynxi,
    seeds: raw.seeds ? Number(raw.seeds) : undefined,
    lives: raw.lives,
    log: raw.log,
    tooltip: raw.tooltip,
  };
}

/** What changes when something happens, minus the numbers that tick on their own. */
async function signature() {
  return page.evaluate(() => {
    const sel = [...document.querySelectorAll("[aria-selected=true], [aria-checked=true], [aria-pressed=true]")].map((e) => e.textContent).join("|");
    return document.body.innerText.replace(/\d+/g, "#") + "§" + sel + "§" + document.querySelectorAll("*").length;
  });
}

// ---------------------------------------------------------------- reading like a newcomer

/** Words a newcomer meets that need explaining somewhere. Where it was first seen, and first explained. */
const TERMS: Array<{ term: string; re: RegExp }> = [
  { term: "stacks", re: /\bstacks?\b(?! library)/i },
  { term: "seeds", re: /\bseeds?\b/i },
  { term: "Absurdity", re: /\babsurdity\b/i },
  { term: "keeper", re: /\bkeepers?\b/i },
  { term: "bookmark", re: /\bbookmarks?\b/i },
  { term: "Catalogue Fragments", re: /\bfragments?\b/i },
  { term: "Back room", re: /\bback room\b/i },
  { term: "fittings", re: /\bfittings?\b/i },
  { term: "late slips", re: /\blate slips?\b/i },
  { term: "keeper level", re: /\bkeeper level|level \d\b/i },
  { term: "Trick cannons", re: /\btrick\b/i },
  { term: "Heavy cannons", re: /\bheavy\b/i },
  { term: "armour", re: /\barmou?r(ed)?\b/i },
  { term: "Checkout card", re: /\bcheckout\b/i },
];
const termSeen = new Map<string, { screen: string; at: number }>();
const termExplained = new Map<string, { where: string; at: number }>();
/** Keys the UI has told us about. */
const knownKeys = new Set<string>();
/** Text the player has read so far (Mynxi, tips, hover hints, How to play). */
const readSoFar: string[] = [];

function noticeTerms(seen: Seen) {
  // How to play lists everything; what counts is meeting a word while playing.
  if (seen.screen === "Title › How to play") return;
  for (const { term, re } of TERMS) {
    if (!termSeen.has(term) && re.test(seen.text)) termSeen.set(term, { screen: seen.screen, at: secs() });
  }
}

/** Reading a paragraph meant to teach: any term in it counts as explained from here on, and its keys are learned. */
function read(where: string, text: string) {
  if (!text) return;
  readSoFar.push(text);
  for (const { term, re } of TERMS) if (!termExplained.has(term) && re.test(text)) termExplained.set(term, { where, at: secs() });
  for (const m of text.matchAll(/\((?:press )?([A-Z]|Space|Esc|Enter)\)|press ([A-Z]|Space|Esc)\b|\b([A-Z]|Esc) (?:pauses|puts|cycles|is my)/g)) {
    knownKeys.add(m[1] ?? m[2] ?? m[3]);
  }
}

/** Things a hint tells us to use, checked against what's on screen. */
async function checkHintRefs(seen: Seen, source: string, text: string) {
  const refs: Array<{ label: string; re: RegExp }> = [];
  for (const m of text.matchAll(/\b(?:open |the |press |on the )?([A-Z][a-z]+(?: [a-z]+)?) \(([A-Z]|Space)\b/g)) {
    const name = m[1].replace(/^(Open|The|Press) /, "");
    if (/^(Or|My|And|It)$/.test(name)) continue;
    refs.push({ label: name, re: new RegExp(`^${name.split(" ")[0]}`, "i") });
  }
  for (const m of text.matchAll(/press ([A-Z][a-z]+(?: [a-z]+)*?) \(/g)) refs.push({ label: m[1], re: new RegExp(`^${m[1]}`, "i") });
  const NUM: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  const tabsSaid = text.match(/(two|three|four|five|six|seven)\s+tabs\b/i)?.[1]?.toLowerCase();
  const tabs = seen.buttons.filter((b) => b.role === "tab");
  if (tabsSaid && tabs.length && NUM[tabsSaid] !== tabs.length)
    await friction({
      severity: "major",
      screen: seen.screen,
      title: `${source} says "${tabsSaid} tabs" but ${tabs.length} are on screen`,
      tried: `Read "${text.slice(0, 120)}…" and counted the tabs.`,
      expected: `${NUM[tabsSaid]} tabs, each explained.`,
      saw: `Tabs on screen: ${tabs.map((t) => t.name).join(", ")}.`,
    });
  if (/the − and \+ buttons/.test(text)) refs.push({ label: "− / + speed buttons", re: /^(Slow down|Speed up)$/ });
  for (const r of refs) {
    const hit = seen.buttons.find((b) => r.re.test(b.name));
    if (!hit) {
      await friction({
        severity: "major",
        screen: seen.screen,
        title: `${source} names "${r.label}", but nothing on screen is called that`,
        tried: `Read: "${text.slice(0, 160)}${text.length > 160 ? "…" : ""}" and looked for a button or tab called "${r.label}".`,
        expected: `A visible "${r.label}" button or tab.`,
        saw: `Visible buttons: ${seen.buttons.map((b) => b.name).filter(Boolean).slice(0, 14).join(", ")}`,
      });
    }
  }
}

// ---------------------------------------------------------------- doing things

/** Click the first visible control whose name matches; report if it doesn't exist or nothing visibly happens. */
async function press(
  re: RegExp,
  why: string,
  opts: { expectChange?: boolean; quietIfMissing?: boolean; wait?: number; scope?: string } = {},
): Promise<boolean> {
  let seen = await look(opts.scope);
  let target = seen.buttons.find((b) => re.test(b.name) && b.enabled) ?? seen.buttons.find((b) => re.test(b.name));
  if (!target) {
    // Not in view: scroll to it if it's on the page at all (inside a scrolling panel).
    const hidden = (opts.scope ? page.locator(opts.scope).first() : page.locator("body")).getByRole("button", { name: re }).first();
    if ((await hidden.count().catch(() => 0)) && (await hidden.scrollIntoViewIfNeeded({ timeout: 2000 }).then(() => true, () => false))) {
      await page.waitForTimeout(250);
      const scrolled = await look(opts.scope);
      target = scrolled.buttons.find((b) => re.test(b.name));
      if (target)
        await friction(
          {
            severity: "minor",
            screen: seen.screen,
            title: `"${target.name}" is below the fold: I had to scroll to find it`,
            tried: why,
            expected: `"${target.name}" in view without scrolling (it's how you leave this screen).`,
            saw: `Not visible at ${VW}×${VH} until the panel was scrolled.`,
          },
          false,
        );
      seen = scrolled;
    }
  }
  if (!target) {
    if (!opts.quietIfMissing)
      await friction({
        severity: "major",
        screen: seen.screen,
        title: `Couldn't find "${re.source}"`,
        tried: why,
        expected: `A visible control matching ${re}.`,
        saw: `Visible buttons: ${seen.buttons.map((b) => b.name).filter(Boolean).slice(0, 14).join(", ")}`,
      });
    return false;
  }
  const started = Date.now();
  const before = await signature();
  // Find the exact element again by its name.
  const all = await (opts.scope ? page.locator(opts.scope).first() : page.locator("body")).locator("button, [role=button], [role=tab], [role=radio], a[href]").filter({ visible: true }).all();
  let clicked = false;
  for (const el of all) {
    const name = ((await el.innerText().catch(() => "")) || (await el.getAttribute("aria-label")) || (await el.getAttribute("title")) || "")
      .replace(/\s+/g, " ")
      .trim();
    if (name === target.name) {
      await el.hover().catch(() => {});
      await page.waitForTimeout(250);
      clicked = await el.click({ timeout: 3000, force: !target.enabled }).then(() => true, () => false);
      if (!clicked) {
        // Something sits over it (an overlay): a person couldn't click it either.
        steps.push({ screen: seen.screen, what: `couldn't click "${target.name}" (covered)`, ms: Date.now() - started, words: 0 });
        return false;
      }
      break;
    }
  }
  if (!clicked) return false;
  await page.waitForTimeout(opts.wait ?? 500);
  const after = await signature();
  const changed = before !== after;
  step(seen.screen, `click "${target.name}"`, started);
  if (!changed && opts.expectChange !== false) {
    const why2 = target.enabled ? "" : " (it is disabled)";
    await friction({
      severity: target.enabled ? "major" : "minor",
      screen: seen.screen,
      title: `"${target.name}" gave no visible feedback${why2}`,
      tried: why,
      expected: "Something on screen to change, or a line saying why not.",
      saw: target.tip ? `Nothing changed. Its tooltip (on hover) says: "${target.tip}"` : "Nothing changed, and there is no tooltip.",
    });
  }
  return changed;
}

async function key(k: string, why: string) {
  if (!knownKeys.has(k)) return false;
  const before = await signature();
  await page.keyboard.press(k === "Space" ? " " : k === "Esc" ? "Escape" : k.length === 1 ? k.toLowerCase() : k);
  await page.waitForTimeout(400);
  const changed = before !== (await signature());
  steps.push({ screen: (await look()).screen, what: `key ${k} (${why})`, ms: 400, words: 0 });
  return changed;
}

// ---------------------------------------------------------------- the board (pixels only)

interface Spot {
  x: number;
  y: number;
  score: number;
}
/**
 * Look at the board picture: find the red carpet and score floor spots by how much carpet is near them
 * (the inside of a bend scores best, which is what Mynxi says). Coordinates are page pixels.
 */
async function floorSpots(): Promise<{ spots: Spot[]; carpet: Spot[]; tile: number; hidden: number }> {
  return page.evaluate(() => {
    const c = document.querySelector("canvas") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width;
    const sy = c.height / r.height;
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    const STEP = 8;
    const cols = Math.floor(r.width / STEP);
    const rows = Math.floor(r.height / STEP);
    const carpet: boolean[] = new Array(cols * rows).fill(false);
    const dark: boolean[] = new Array(cols * rows).fill(false);
    let hiddenCarpet = 0;
    let shownCarpet = 0;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const px = Math.floor((i * STEP + STEP / 2) * sx);
        const py = Math.floor((j * STEP + STEP / 2) * sy);
        const k = (py * c.width + px) * 4;
        const R = img[k], G = img[k + 1], B = img[k + 2];
        carpet[j * cols + i] = R > 80 && R > G * 1.9 && R > B * 1.9;
        dark[j * cols + i] = R + G + B < 45; // the empty margin around the board
        // Only what the player can see: a spot under a lesson box, tip or panel doesn't count.
        if (document.elementFromPoint(r.left + i * STEP + STEP / 2, r.top + j * STEP + STEP / 2) !== c) {
          if (carpet[j * cols + i]) hiddenCarpet++;
          carpet[j * cols + i] = false;
          dark[j * cols + i] = true;
        } else if (carpet[j * cols + i]) shownCarpet++;
      }
    // Carpet band width ≈ one tile: the median vertical run length of carpet.
    const runs: number[] = [];
    for (let i = 0; i < cols; i += 3) {
      let run = 0;
      for (let j = 0; j < rows; j++) {
        if (carpet[j * cols + i]) run++;
        else if (run) (runs.push(run), (run = 0));
      }
    }
    runs.sort((a, b) => a - b);
    const tileCells = Math.max(4, Math.min(20, runs[Math.floor(runs.length * 0.3)] ?? 9));
    const tile = tileCells * STEP;
    const spots: Array<{ x: number; y: number; score: number }> = [];
    const carpetPts: Array<{ x: number; y: number; score: number }> = [];
    const reach = Math.round(tileCells * 1.6);
    const near = Math.round(tileCells * 0.9);
    for (let j = 0; j < rows; j += 2)
      for (let i = 0; i < cols; i += 2) {
        const at = j * cols + i;
        if (dark[at]) continue;
        if (carpet[at]) {
          carpetPts.push({ x: r.left + i * STEP + STEP / 2, y: r.top + j * STEP + STEP / 2, score: 0 });
          continue;
        }
        // Not on the carpet, but right beside it, and not too close to its edge (half a tile off).
        let close = false;
        let cover = 0;
        let edge = false;
        for (let dj = -reach; dj <= reach; dj++)
          for (let di = -reach; di <= reach; di++) {
            const ii = i + di, jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue;
            if (!carpet[jj * cols + ii]) continue;
            const d = Math.hypot(di, dj);
            if (d <= reach) cover++;
            if (d <= near) close = true;
            if (d < tileCells * 0.45) edge = true;
          }
        if (close && !edge) spots.push({ x: r.left + i * STEP + STEP / 2, y: r.top + j * STEP + STEP / 2, score: cover });
      }
    spots.sort((a, b) => b.score - a.score);
    return { spots, carpet: carpetPts, tile, hidden: hiddenCarpet / Math.max(1, hiddenCarpet + shownCarpet) };
  });
}

const tried = new Set<string>();
/** Tap a floor spot beside the carpet (a good one, with a little noise), avoiding spots already used. */
async function tapFloor(why: string, opts: { onCarpet?: boolean } = {}) {
  const { spots, carpet, tile, hidden } = await floorSpots();
  if (hidden > 0.12) {
    const seen = await look();
    await friction({
      severity: "major",
      screen: seen.screen,
      title: `Something covers ${Math.round(hidden * 100)}% of the carpet while I'm meant to build`,
      tried: `Looked at the board to ${why}.`,
      expected: "The whole carpet visible while choosing where to build.",
      saw: seen.mynxi ? `Mynxi's lesson box ("${seen.mynxi.title}") sits over the top of the board.` : "A panel or tip sits over the board.",
    });
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    let pick: Spot | undefined;
    if (opts.onCarpet) pick = carpet[Math.floor(carpet.length * 0.3)];
    else {
      const fresh = spots.filter(
        (s) =>
          ![...tried].some((k) => {
            const [x, y] = k.split(",").map(Number);
            return Math.hypot(x - s.x, y - s.y) < tile * 0.9;
          }),
      );
      const top = fresh.slice(0, Math.max(1, Math.floor(fresh.length * 0.05)));
      pick = top[Math.floor(rand() * Math.min(top.length, 6))];
    }
    if (!pick) return { ok: false, log: "", why: "no floor spot found by looking at the board" };
    tried.add(`${pick.x},${pick.y}`);
    const before = await look();
    await page.mouse.move(pick.x, pick.y);
    await page.waitForTimeout(150);
    await page.mouse.click(pick.x, pick.y);
    await page.waitForTimeout(450);
    const after = await look();
    steps.push({ screen: before.screen, what: `tap board at ${Math.round(pick.x)},${Math.round(pick.y)} (${why})`, ms: 600, words: 0 });
    const spent = before.seeds != null && after.seeds != null && after.seeds < before.seeds;
    if (spent) {
      // What the tap really built: the build card marked as picked (falls back to what the learner believes).
      const onScreen = await page.evaluate(() => {
        const card = [...document.querySelectorAll("button[aria-pressed=true][title]")].find((e) => / \(\d\) · /.test(e.getAttribute("title") ?? ""));
        return card ? (card.getAttribute("title") ?? "").split(" (")[0] : null;
      });
      built.push(onScreen ?? picked);
      builtAt.push({ x: pick.x, y: pick.y, kind: onScreen ?? picked });
      return { ok: true, log: after.log !== before.log ? after.log : "", why: "" };
    }
    // Tapped a tower that's already there: its card opened. Close it and try somewhere else.
    if (!opts.onCarpet && after.buttons.some((b) => /^Sell \d/.test(b.name)) && !before.buttons.some((b) => /^Sell \d/.test(b.name))) {
      steps.push({ screen: after.screen, what: "that was an existing tower (its card opened): closed it", ms: 0, words: 0 });
      await press(/^Close \(Esc\)$/, "Closed the tower card.", { quietIfMissing: true, expectChange: false });
      continue;
    }
    return { ok: false, log: after.log !== before.log ? after.log : "", why: "" };
  }
  return { ok: false, log: "", why: "every spot tried was taken" };
}

/** What the learner last picked to build (they don't re-check it), and what each tap built. */
let picked = "Melon cannon";
const built: string[] = [];
/** Where the learner's towers are (page pixels), for tapping them later. */
const builtAt: Array<{ x: number; y: number; kind: string }> = [];

// ---------------------------------------------------------------- phases

async function readScreen(seen: Seen, label: string) {
  const started = Date.now();
  const words = wordsIn(seen.text);
  noticeTerms(seen);
  step(seen.screen, `read ${label}`, started, words);
}

/** Title: look around, hover every button, try the locked one, peek into the side menus. */
async function titleTour() {
  let seen = await look();
  await shot("title");
  await readScreen(seen, "the title screen");
  // Hover each menu button and read what it says.
  for (const b of seen.buttons.filter((b) => b.name && b.role === "button")) {
    const el = page.getByRole("button", { name: b.name, exact: true }).first();
    await el.hover().catch(() => {});
    await page.waitForTimeout(300);
    const tip = (await look()).tooltip;
    if (tip) read(`Title hover: ${b.name}`, tip);
    else if (b.name !== "")
      await friction({ severity: "note", screen: "Title", title: `"${b.name}" has no hover hint`, tried: `Hovered "${b.name}".`, expected: "A line saying what it does, like the other menu buttons.", saw: "No hint." }, false);
  }
  // The unnamed button (top-left, no text, no label) is the first thing a screen reader or a curious mouse finds.
  const nameless = seen.buttons.filter((b) => !b.name);
  if (nameless.length)
    await friction({
      severity: "minor",
      screen: "Title",
      title: `${nameless.length} button(s) with no text, label or tooltip`,
      tried: "Looked at every button on the title screen.",
      expected: "Every button says what it is (text, aria-label or tooltip).",
      saw: "A clickable button with no name at all.",
    });
  // The locked New night: a newcomer clicks it anyway.
  if (seen.buttons.some((b) => /^New night/.test(b.name) && !b.enabled)) {
    await press(/^New night/, "Clicked the greyed-out New night to see what it does.");
  }
  // How to play.
  if (await press(/^How to play$/, "Opened How to play before starting, to learn the controls.")) {
    seen = await look();
    await shot("how-to-play");
    const words = wordsIn(seen.text);
    // Nobody reads 1,800 words before their first night: only the opening lines count as read.
    read("How to play", seen.text.split(/\s+/).slice(0, 150).join(" "));
    noticeTerms(seen);
    steps.push({ screen: seen.screen, what: "read How to play", ms: 0, words });
    if (words > 600)
      await friction({
        severity: "minor",
        screen: seen.screen,
        title: `How to play is a wall of text (${words} words, ~${Math.round(readSecs(words) / 60)} min to read)`,
        tried: "Opened How to play to learn the basics before the first night.",
        expected: "A short page: what to do, the five or six things to know, the keys.",
        saw: `${words} words in one scrolling card, with every keeper, keeper tower and room listed, most of which a new player can't use yet.`,
      });
    await press(/^Back$/, "Closed How to play.");
  }
  // Settings.
  if (await press(/^Settings$/, "Opened Settings to check the sound and speed.")) {
    seen = await look();
    await shot("settings");
    read("Settings", seen.text);
    noticeTerms(seen);
    await press(/^Back$/, "Closed Settings.");
  }
  // Grand Catalogue.
  if (await press(/^Grand Catalogue$/, "Opened the Grand Catalogue to see what it is.")) {
    seen = await look();
    await shot("catalogue");
    noticeTerms(seen);
    const words = wordsIn(seen.text);
    steps.push({ screen: seen.screen, what: "read the Grand Catalogue", ms: 0, words });
    const usable = seen.buttons.filter((b) => b.enabled && !/^Back$/.test(b.name));
    if (/0\s*(fragments|Catalogue Fragments)/i.test(seen.text) || usable.length === 0)
      await friction({
        severity: "note",
        screen: seen.screen,
        title: "The Grand Catalogue is all locked on a first run",
        tried: "Opened it from the title, before playing.",
        expected: "Either a teaser of what's coming or a line saying 'play a night to earn Fragments'.",
        saw: `Enabled controls besides Back: ${usable.map((b) => b.name).slice(0, 8).join(", ") || "none"}.`,
      }, false);
    await press(/^Back$/, "Closed the Grand Catalogue.");
  }
}

/** The guided first night: follow Mynxi, read everything, do what she says, note where it doesn't line up. */
async function guidedNight() {
  const start = Date.now();
  await press(/^(Start|Continue)$/, "Pressed the big gold Start button.");
  let seen = await look();
  if (seen.screen === "Room poster") {
    await shot("poster");
    await readScreen(seen, "the room poster");
    if (/Absurdity/.test(seen.text) && !termExplained.has("Absurdity"))
      await friction({
        severity: "minor",
        screen: seen.screen,
        title: "\"Absurdity 0\" shows in the top bar with no explanation",
        tried: "Read the top bar on the room poster.",
        expected: "Either no Absurdity counter yet, or a tooltip saying what it is.",
        saw: `Top bar: ${seen.text.split("\n").slice(0, 6).join(" · ")}`,
      });
    // Curious: the poster's way back. During the guide it should say (and go to) the title.
    if (seen.buttons.some((b) => /^Back to title$/.test(b.name))) {
      await press(/^Back to title$/, "Curious: clicked Back to title on the first-night poster.");
      const back = await look();
      if (back.screen !== "Title")
        await friction({
          severity: "major",
          screen: "Room poster",
          title: `"Back to title" on the first night goes to ${back.screen}`,
          tried: "Clicked Back to title on the poster of the guided first night.",
          expected: "The title screen.",
          saw: `Landed on: ${back.screen}.`,
        });
      else await press(/^(Start|Continue)$/, "Pressed Start again.");
    } else if (seen.buttons.some((b) => /^Back to setup$/.test(b.name))) {
      await press(/^Back to setup$/, "Curious: clicked Back to setup on the first-night poster.");
      const back = await look();
      if (back.screen !== "Setup") {
        await friction({
          severity: "minor",
          screen: "Room poster",
          title: `"Back to setup" on the first night goes to ${back.screen}, not a setup screen`,
          tried: "Clicked Back to setup on the poster of the guided first night.",
          expected: "A setup screen (the button says so), or no such button while setup is still locked.",
          saw: `Landed on: ${back.screen}. Buttons: ${back.buttons.map((b) => b.name).filter(Boolean).slice(0, 8).join(", ")}`,
        });
        if (back.screen === "Title") await press(/^(Start|Continue)$/, "Pressed Start again.");
      } else {
        await friction({
          severity: "major",
          screen: "Room poster",
          title: "\"Back to setup\" on the guided first night opens the full Setup that the title says is locked",
          tried: "Clicked Back to setup on the first-night poster (the title said New night opens after your first night).",
          expected: "No Back to setup during the guide, or a way back to the title only.",
          saw: `Setup opened with every unlocked keeper, room and night to pick: ${back.headings.slice(0, 3).join(" / ")}`,
        });
        // Find the way home with Back, then start the guide again.
        for (let i = 0; i < 4 && (await look()).screen !== "Title"; i++) await press(/^Back$/, "Pressed Back to get out of setup.", { quietIfMissing: true });
        const home = await look();
        if (home.screen !== "Title")
          await friction({ severity: "major", screen: home.screen, title: "Back from setup doesn't reach the title", tried: "Pressed Back up to four times.", expected: "The title screen.", saw: home.buttons.map((b) => b.name).slice(0, 10).join(", ") });
        await press(/^(Start|Continue)$/, "Pressed Start again.", { quietIfMissing: true });
      }
    }
    seen = await look();
    await press(/^(To the carpet|Cover the chute|Hold the courtyard)$/, "Clicked the gold button on the room poster.");
  }

  let lastLesson = "";
  let lessonStart = Date.now();
  let attempts = 0;
  let madeCarpetMistake = false;
  let triedWrongTab = false;
  for (let guard = 0; guard < 120; guard++) {
    seen = await look();
    noticeTerms(seen);
    const m = seen.mynxi;
    if (!m || m.lesson === "tip") break;
    const id = `${m.lesson}: ${m.title}`;
    if (id !== lastLesson) {
      if (lastLesson) step("Mynxi", `finish "${lastLesson}" (${attempts} tries)`, lessonStart, 0);
      lastLesson = id;
      lessonStart = Date.now();
      attempts = 0;
      const words = wordsIn(`${m.title} ${m.text}`);
      steps.push({ screen: seen.screen, what: `Mynxi ${m.lesson}: "${m.title}"`, ms: 0, words });
      console.log(`  Mynxi ${m.lesson}: ${m.title} [${m.action}]`);
      await shot(`mynxi-${m.title}`);
      read(`Mynxi ${m.lesson}`, `${m.title}. ${m.text}`);
      await checkHintRefs(seen, `Mynxi (${m.lesson})`, `${m.title}. ${m.text}`);
      if (words > 55)
        await friction({
          severity: "minor",
          screen: seen.screen,
          title: `Lesson "${m.title}" is long for a speech box (${words} words)`,
          tried: "Read the lesson before acting.",
          expected: "One idea per lesson, ~35 words or fewer.",
          saw: m.text,
        }, false);
      // Terms the lesson leans on before any lesson explained them.
      for (const { term, re } of TERMS) {
        const ex = termExplained.get(term);
        if (re.test(m.text) && ex && ex.where === `Mynxi ${m.lesson}` && termSeen.get(term) && termSeen.get(term)!.at < ex.at - 20)
          await friction({
            severity: "note",
            screen: seen.screen,
            title: `"${term}" was on screen for ${Math.round(ex.at - termSeen.get(term)!.at)} s before a lesson explained it`,
            tried: "Read the screen, then the lessons.",
            expected: "New words explained when they first show up.",
            saw: `First seen on ${termSeen.get(term)!.screen}; explained in ${ex.where}.`,
          }, false);
      }
    }
    attempts++;
    if (attempts > 8) {
      await friction({
        severity: "blocker",
        screen: seen.screen,
        title: `Stuck on Mynxi's "${m.title}"`,
        tried: `Tried ${attempts} times to do what the lesson says.`,
        expected: "The lesson moves on once I've done what it asked.",
        saw: `Lesson text: "${m.text}". Log line: "${seen.log}"`,
      });
      // Way out, like a frustrated player.
      await press(/^Skip$/, "Gave up and pressed Skip on the lesson.", { quietIfMissing: true });
      break;
    }
    // Curious: wander off for a moment before doing what she says (never on the upgrade pick).
    if (seen.screen !== "Upgrade pick") {
      await curiousPoke(seen.screen === "Board (wave running)" ? "combat" : "guide");
      const again = await look();
      if (!again.mynxi || again.mynxi.lesson === "tip" || `${again.mynxi.lesson}: ${again.mynxi.title}` !== id) continue;
    }
    if (m.action === "Next" || m.action === "Let's go") {
      // On the speed lesson, try what it says first.
      if (/− and \+ buttons/.test(m.text) && attempts === 1) {
        await press(/^Speed up$/, "Mynxi said to try + to change the speed.", { quietIfMissing: true });
      }
      await press(/^(Next|Let's go)$/, `Read "${m.title}" and pressed ${m.action}.`);
      continue;
    }
    // "Your move": work out from the words what she wants.
    const t = `${m.title} ${m.text}`;
    if (seen.screen === "Upgrade pick") {
      await pickCard(seen, "Mynxi asked for an upgrade pick.");
    } else if (seen.screen === "Board (wave running)" && !/Start wave|Start the wave/i.test(t)) {
      // She's waiting for the wave to end. Build more if the lesson says so and seeds allow, else watch.
      if (/build more/i.test(t) && seen.seeds != null && seen.seeds >= 70 && attempts % 3 === 1) await tapFloor("build more during the wave");
      await page.waitForTimeout(2000);
      attempts = Math.min(attempts, 3); // waiting for the wave isn't being stuck
      continue;
    } else if (/Start wave|Start the wave/i.test(t)) {
      await press(/^Start (wave|the last wave)/, `Mynxi said: press Start wave.`);
    } else if (/back room/i.test(t)) {
      await backRoom("Mynxi asked to buy an upgrade in the Back room.");
    } else if (/Control \(W\)|Support \(E\)/.test(t)) {
      // Open Control, see what's there, pick the first affordable tower.
      if (!triedWrongTab) {
        triedWrongTab = true;
        await press(/^Control/, "Mynxi said to open Control (W).");
      }
      const cards = (await look()).buttons.filter((b) => b.enabled && /\d|Free/.test(b.name) && b.tip && !/locked|opens at/i.test(b.tip) && b.role === "button" && /\(\d\)/.test(b.tip));
      const choice = cards.find((c) => /Still|Freeze|Lamp/i.test(c.name)) ?? cards[0];
      if (choice) {
        await press(new RegExp(`^${escapeRe(choice.name)}$`), `Picked ${choice.name.split(" ")[0]} on the Control tab.`, { expectChange: false });
        picked = choice.name.replace(/^\d+\s*/, "").split(/ \d| No /)[0];
      }
      const r = await tapFloor("place the Control/Support tower");
      if (!r.ok)
        await friction({
          severity: "minor",
          screen: seen.screen,
          title: "Tapped beside the carpet for a Control tower and nothing was built",
          tried: "Picked a tower on the Control tab and tapped a floor tile next to the carpet.",
          expected: "The tower appears and seeds go down, or a line saying why not.",
          saw: r.log ? `The log line now says: "${r.log}"` : "No change to seeds and no message.",
        });
    } else if (/tap a floor tile|build/i.test(t)) {
      // The classic first mistake: tap the carpet itself.
      if (!madeCarpetMistake) {
        madeCarpetMistake = true;
        const r = await tapFloor("tap on the carpet (newcomer mistake)", { onCarpet: true });
        if (!r.ok && !r.log)
          await friction({
            severity: "major",
            screen: seen.screen,
            title: "Tapping the carpet says nothing",
            tried: "Tapped the red carpet itself (a common first guess).",
            expected: "A short line: you can't build on the carpet, build beside it.",
            saw: "No message and nothing built.",
          });
        else if (!r.ok) steps.push({ screen: seen.screen, what: `carpet tap answered: "${r.log}"`, ms: 0, words: wordsIn(r.log) });
      }
      // The lesson says the Melon cannon is picked; a learner who wandered off to other tabs goes back to it.
      if (/Melon cannon/.test(t) && picked !== "Melon cannon") await pickMelon();
      const r = await tapFloor("build beside the carpet");
      if (!r.ok) {
        const msg = r.log || "";
        await friction({
          severity: attempts >= 3 ? "major" : "minor",
          screen: seen.screen,
          title: "Tapped a floor tile beside the carpet and nothing was built",
          tried: "Tapped the wooden floor right next to the carpet, as the lesson says.",
          expected: "A cannon appears and the seeds go down.",
          saw: msg ? `Log line: "${msg}"` : "Nothing changed and nothing explained why (maybe a shelf or a spot that isn't a tile).",
        });
      }
    } else {
      // Nothing recognisable: wait a moment (a wave may be running), then look again.
      await page.waitForTimeout(1500);
      if (attempts === 4)
        await friction({
          severity: "minor",
          screen: seen.screen,
          title: `Lesson "${m.title}" says "Your move" but doesn't say what to do`,
          tried: "Read the lesson and looked for an instruction.",
          expected: "A clear action (a button or key to press).",
          saw: m.text,
        });
    }
    await page.waitForTimeout(300);
  }
  if (lastLesson) step("Mynxi", `finish "${lastLesson}" (${attempts} tries)`, lessonStart, 0);
  step("Mynxi", "the whole guided lesson set", start, 0);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function pickCard(_seen: Seen, why: string) {
  // The upgrade cards: the enabled buttons in the pick dialog besides navigation.
  const seen = await look("[role=dialog]");
  const cards = seen.buttons.filter((b) => b.enabled && b.name.length > 25 && !/^(Skip|Back|Next|Menu)/.test(b.name));
  if (!cards.length) {
    await friction({
      severity: "major",
      screen: seen.screen,
      title: "Asked to pick an upgrade, but no card to click",
      tried: why,
      expected: "Upgrade cards to choose from.",
      saw: seen.buttons.map((b) => b.name).slice(0, 10).join(", "),
    });
    return;
  }
  const card = cards[Math.floor(rand() * cards.length)];
  read("Upgrade card", card.name);
  await press(new RegExp(`^${escapeRe(card.name)}$`), `${why} Picked "${card.name.slice(0, 40)}…".`, { scope: "[role=dialog]" });
}

const BACK_ROOM = 'aside[aria-label="Back room"]';
async function backRoom(why: string) {
  let seen = await look();
  if (seen.screen !== "Back room") {
    await press(/^Back room/, why);
    seen = await look();
  }
  const inside = await look(BACK_ROOM);
  if (seen.screen === "Back room") await shot("back-room");
  readSoFar.push(seen.text);
  // Buy the first thing that looks buyable (a price or "free").
  const items = inside.buttons.filter((b) => b.enabled && /free|\b\d{2,}\b/i.test(b.name) && !/^Back room$/.test(b.name) && b.name.length > 8);
  if (!items.length) {
    await friction({
      severity: "major",
      screen: seen.screen,
      title: "In the Back room, nothing looks buyable",
      tried: why,
      expected: "A list of upgrades with prices, one marked free.",
      saw: inside.buttons.map((b) => b.name).slice(0, 12).join(", "),
    });
    return;
  }
  const free = items.find((b) => /free/i.test(b.name)) ?? items[0];
  await press(new RegExp(`^${escapeRe(free.name)}$`), `Bought "${free.name.slice(0, 40)}" in the Back room.`, { scope: BACK_ROOM });
  // Close it again.
  const closed = await press(/^(Close|Close \(Esc\))$/i, "Closed the Back room.", { quietIfMissing: true, expectChange: false, scope: BACK_ROOM });
  if (!closed && knownKeys.has("Esc")) await key("Esc", "close the Back room");
}

// ---------------------------------------------------------------- curious learner (--style curious)

/** What a curious newcomer pokes at between the things they're told to do, and what came of it. */
interface Poke {
  at: number;
  screen: string;
  what: string;
  result: string;
}
const pokes: Poke[] = [];
const pokesDone = new Set<string>();
let skippedGuide = false;

function noted(screen: string, what: string, result: string) {
  pokes.push({ at: secs(), screen, what, result });
  steps.push({ screen, what: `curious: ${what} → ${result}`, ms: 0, words: 0 });
}

const onBoard = (s: string) => s.startsWith("Board");
const cardOpen = (s: Seen) => s.buttons.some((b) => /^Sell \d/.test(b.name));

/** Find the way back to the board from wherever the poke left us. A person would use Close, Back, Resume or Esc. */
async function recover(after: string) {
  for (let i = 0; i < 5; i++) {
    const seen = await look();
    if (onBoard(seen.screen) && !cardOpen(seen)) return true;
    if (["Upgrade pick", "Night over", "Title", "Room poster"].includes(seen.screen)) return true;
    if (cardOpen(seen) && (await press(/^Close \(Esc\)$/, "Closed the tower card.", { quietIfMissing: true, expectChange: false }))) continue;
    if (/Settings/.test(seen.headings.join(" ")) && (await press(/^Back$/, "Left Settings.", { quietIfMissing: true, expectChange: false }))) continue;
    if (seen.buttons.some((b) => /^Resume$/.test(b.name)) && (await press(/^Resume$/, "Resumed.", { quietIfMissing: true, expectChange: false }))) continue;
    if (seen.screen === "Back room" && (await press(/^(Close|Close \(Esc\))$/i, "Closed the Back room.", { quietIfMissing: true, expectChange: false, scope: BACK_ROOM }))) continue;
    // Last resort, the key everyone tries.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  const seen = await look();
  if (onBoard(seen.screen) && !cardOpen(seen)) return true;
  await friction({
    severity: "major",
    screen: seen.screen,
    title: `Couldn't get back to the board after: ${after}`,
    tried: "Close, Back, Resume and Esc, five times.",
    expected: "An obvious way back to the night.",
    saw: `Buttons: ${seen.buttons.map((b) => b.name).filter(Boolean).slice(0, 12).join(", ")}`,
  });
  return false;
}

/** The colour under a page point on the board: carpet, margin (outside the board), covered, or floor/shelf. */
async function pixelAt(x: number, y: number) {
  return page.evaluate(([x, y]) => {
    const c = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!c) return "none";
    const r = c.getBoundingClientRect();
    if (document.elementFromPoint(x, y) !== c) return "covered";
    const d = c.getContext("2d")!.getImageData(Math.floor(((x - r.left) * c.width) / r.width), Math.floor(((y - r.top) * c.height) / r.height), 1, 1).data;
    if (d[0] + d[1] + d[2] < 70) return "margin"; // the canvas fill around the board is #140e12
    return d[0] > 80 && d[0] > d[1] * 1.9 && d[0] > d[2] * 1.9 ? "carpet" : "floor or shelf";
  }, [x, y] as const);
}

const pickMelon = async () => {
  await press(/^Damage/, "Back to the Damage tab.", { quietIfMissing: true, expectChange: false });
  const melon = (await look()).buttons.find((b) => /^Melon\b/.test(b.name));
  if (melon) {
    await press(new RegExp(`^${escapeRe(melon.name)}$`), "Picked the Melon cannon again.", { expectChange: false });
    picked = "Melon cannon";
  }
};

/** Tap something already built, read its card, then do what a curious person does with it. */
async function pokeTower() {
  if (!builtAt.length) return false;
  const t = builtAt[Math.floor(rand() * builtAt.length)];
  const before = await look();
  await page.mouse.click(t.x, t.y);
  await page.waitForTimeout(450);
  const card = await look();
  const sell = card.buttons.find((b) => /^Sell \d/.test(b.name));
  if (!sell) {
    noted(before.screen, `tapped my ${t.kind}`, card.log !== before.log ? `log: "${card.log}"` : "no card opened");
    await recover("tapping a tower");
    return true;
  }
  read("Tower card", card.text.slice(0, 600));
  const extra = card.buttons.filter(
    (b) => b.enabled && b.role === "button" && b.name.length > 2 && !/^(Sell \d|Close)/.test(b.name) && !/^(Slow down|Speed up|Pause|Resume|Menu|Start wave|Back room|Mute|Unmute|Checkout)/.test(b.name) && !/^\d+$/.test(b.name) && b.name !== "−" && b.name !== "+" && !/\(\d\) · /.test(b.tip),
  );
  const roll = rand();
  if (roll < 0.2) {
    // The classic slip: Sell instead of Upgrade.
    const seeds = card.seeds ?? 0;
    await press(new RegExp(`^${escapeRe(sell.name)}$`), `Curious (or a slip): pressed "${sell.name}" on my ${t.kind}.`);
    const after = await look();
    const back = (after.seeds ?? 0) - seeds;
    builtAt.splice(builtAt.indexOf(t), 1);
    noted(before.screen, `sold my ${t.kind}`, back > 0 ? `got ${back} seeds back${after.log !== card.log ? `, log: "${after.log}"` : ""}` : "seeds didn't go up");
    if (back <= 0)
      await friction({ severity: "major", screen: before.screen, title: "Selling a tower gave nothing back", tried: `Pressed "${sell.name}".`, expected: "The seeds it says.", saw: `Seeds ${seeds} → ${after.seeds}.` });
    if (!pokesDone.has("sell-note")) {
      pokesDone.add("sell-note");
      if (!after.buttons.some((b) => /^Undo/i.test(b.name)))
        await friction(
          {
            severity: "note",
            screen: before.screen,
            title: "Sell happens on one tap, with no undo",
            tried: "Opened a tower's card and pressed Sell (the button sits right in the card).",
            expected: "A newcomer who meant Upgrade gets a way back, or Sell asks once.",
            saw: `The ${t.kind} was gone at once; ${back} seeds back.`,
          },
          false,
        );
    }
  } else if (roll < 0.5 && extra.length) {
    const b = extra[Math.floor(rand() * extra.length)];
    const ok = await press(new RegExp(`^${escapeRe(b.name)}$`), `Curious: pressed "${b.name.slice(0, 40)}" on a tower's card.`);
    const after = await look();
    noted(before.screen, `pressed "${b.name.slice(0, 40)}" on my ${t.kind}'s card`, ok ? `changed${after.log !== card.log ? `; log: "${after.log}"` : ""} (now on ${after.screen})` : "nothing changed");
  } else if (roll < 0.75 && knownKeys.has("Esc")) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    const closed = !cardOpen(await look());
    noted(before.screen, `opened my ${t.kind}'s card, read it, pressed Esc`, closed ? "card closed" : "card stayed open");
    if (!closed)
      await friction({ severity: "minor", screen: before.screen, title: "Esc didn't close a tower's card", tried: "Opened a tower's card and pressed Esc (lesson 5 says Esc puts it down).", expected: "The card closes.", saw: "Still open." });
  } else {
    // Tap somewhere else on the board to close it, like any other app.
    const { spots } = await floorSpots();
    const s = spots[spots.length - 1 - Math.floor(rand() * Math.min(10, spots.length))];
    if (s) {
      await page.mouse.click(s.x, s.y);
      await page.waitForTimeout(400);
      const after = await look();
      noted(before.screen, `opened my ${t.kind}'s card, then tapped elsewhere`, `${cardOpen(after) ? "card stayed open" : "card closed"}${after.seeds !== card.seeds ? `; seeds ${card.seeds} → ${after.seeds} (it built something)` : ""}`);
    }
  }
  await recover(`poking my ${t.kind}`);
  return true;
}

/** Tap a random point on the board: carpet, shelf, wall, margin. Every tap that lands on the board should answer. */
async function pokeRandomTap() {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) return false;
  const x = box.x + 8 + rand() * (box.width - 16);
  const y = box.y + 8 + rand() * (box.height - 16);
  const kind = await pixelAt(x, y);
  if (kind === "covered" || kind === "none") return false;
  const before = await look();
  const sig = await signature();
  await page.mouse.click(x, y);
  await page.waitForTimeout(450);
  const after = await look();
  const changed = sig !== (await signature());
  const spent = (before.seeds ?? 0) > (after.seeds ?? 0);
  if (spent) builtAt.push({ x, y, kind: picked });
  const said = after.log !== before.log ? `log: "${after.log}"` : "";
  noted(before.screen, `tapped the board at random (${kind})`, spent ? `built something (${before.seeds} → ${after.seeds} seeds)` : said || (changed ? "something changed" : "nothing happened"));
  // A repeated reply ("Not enough seeds", "Only one … at a time") leaves the screen the same but still answers.
  if (!changed && kind !== "margin" && !/carpet|shelf|floor|seeds|track|build|opens|close|only one|too close/i.test(after.log))
    await friction({
      severity: "minor",
      screen: before.screen,
      title: `A tap on the ${kind === "carpet" ? "carpet" : "board"} got no answer`,
      tried: `Tapped a random ${kind} spot.`,
      expected: "Something built, or a line saying why not.",
      saw: `Nothing changed. Log line: "${after.log}"`,
    });
  await recover("a random tap");
  return true;
}

/** Click a random tab and a random card in it (locked ones too), read what it says, maybe try to build it. */
async function pokeTabs() {
  const seen = await look();
  const tabs = seen.buttons.filter((b) => b.role === "tab" && b.enabled);
  if (!tabs.length) return false;
  const tab = tabs[Math.floor(rand() * tabs.length)];
  await press(new RegExp(`^${escapeRe(tab.name)}$`), `Curious: opened the ${tab.name} tab.`, { expectChange: false });
  const now = await look();
  const cards = now.buttons.filter((b) => b.role === "button" && b.tip && (/\(\d\) · /.test(b.tip) || /locked|opens at|opens when|opens once/i.test(b.tip)));
  if (!cards.length) {
    noted(seen.screen, `opened the ${tab.name} tab`, "no cards I could read");
    return true;
  }
  const card = cards[Math.floor(rand() * cards.length)];
  read(`Card hover: ${card.name}`, card.tip);
  const locked = /locked|opens at|opens when|opens once/i.test(card.tip);
  await press(new RegExp(`^${escapeRe(card.name)}$`), `Curious: picked "${card.name.slice(0, 30)}" on ${tab.name}.`, { expectChange: false });
  const after = await look();
  if (after.screen === "Grand Catalogue") {
    noted(seen.screen, `picked a locked card (${card.name.slice(0, 30)}) on ${tab.name}`, "it opened the Grand Catalogue");
    await press(/^Back$/, "Closed the Catalogue.", { scope: '[aria-label="Grand Catalogue"]', quietIfMissing: true });
    await recover("a locked card's Catalogue page");
    return true;
  }
  picked = card.name.replace(/^\d+\s*/, "").split(/ \d| No /)[0];
  let result = locked ? `locked; hover says: "${card.tip.slice(0, 90)}"` : "picked";
  // Half the time, try to build it right away.
  if (rand() < 0.5 && onBoard(after.screen)) {
    const r = await tapFloor(`build the ${picked} I just picked`);
    result += r.ok ? `; built one${r.log ? ` (log: "${r.log}")` : ""}` : `; tapped the floor: ${r.log ? `log: "${r.log}"` : "nothing built, nothing said"}`;
    if (!r.ok && !r.log)
      await friction({
        severity: locked ? "major" : "minor",
        screen: seen.screen,
        title: `Tried to build a ${locked ? "locked" : "picked"} card and nothing said why not`,
        tried: `Picked ${picked} on the ${tab.name} tab and tapped the floor beside the carpet.`,
        expected: "It builds, or a line says why not (locked, not enough seeds).",
        saw: "No tower, no message.",
      });
  }
  noted(seen.screen, `picked "${card.name.slice(0, 30)}" on ${tab.name}`, result);
  // Half the time the learner goes back to their trusty first cannon.
  if (rand() < 0.5) await pickMelon();
  return true;
}

/** Pause, speed up, slow down: the header buttons. */
async function pokeSpeed() {
  const seen = await look();
  const what = ["Pause", "Speed up", "Slow down"][Math.floor(rand() * 3)];
  if (!seen.buttons.some((b) => b.name === what)) return false;
  await press(new RegExp(`^${what}$`), `Curious: pressed ${what}.`);
  const after = await look();
  if (what === "Pause") {
    noted(seen.screen, "pressed Pause", /\bPaused\b/.test(after.text) ? "the board says Paused" : "paused, but nothing on the board says so");
    await page.waitForTimeout(800);
    if (!(await press(/^Resume$/, "Pressed the same button again to resume.", { quietIfMissing: true })))
      await friction({ severity: "major", screen: seen.screen, title: "After Pause, no Resume button", tried: "Paused from the top bar.", expected: "The same button turns into Resume.", saw: after.buttons.map((b) => b.name).filter(Boolean).slice(0, 10).join(", ") });
  } else noted(seen.screen, `pressed ${what}`, "speed changed");
  return true;
}

/** The menu, Settings inside it, and back. */
async function pokeMenu() {
  const seen = await look();
  if (!(await press(/^Menu$/, "Curious: opened the Menu.", { quietIfMissing: true }))) return false;
  const menu = await look();
  read("Pause menu", menu.text.slice(0, 400));
  let result = `menu has: ${menu.buttons.map((b) => b.name).filter(Boolean).slice(0, 8).join(", ")}`;
  if (rand() < 0.5 && (await press(/^Settings$/, "Opened Settings from the menu.", { quietIfMissing: true }))) {
    result += "; opened Settings";
    await press(/^Back$/, "Back from Settings.", { quietIfMissing: true });
  }
  noted(seen.screen, "opened the Menu mid-night", result);
  await recover("the menu");
  return true;
}

/** Mash a key a gamer would try. Keys nothing has mentioned that do something are noted. */
async function pokeKeys() {
  const seen = await look();
  const pool = ["1", "2", "3", "4", "5", "Escape", " ", "p", "b", "q", "w", "e", "r", "t", "y", "s", "Enter", "h", "m", "u", "Tab"];
  const k = pool[Math.floor(rand() * pool.length)];
  const name = k === " " ? "Space" : k === "Escape" ? "Esc" : k.length === 1 ? k.toUpperCase() : k;
  const sig = await signature();
  await page.keyboard.press(k);
  await page.waitForTimeout(400);
  const after = await look();
  const changed = sig !== (await signature());
  noted(seen.screen, `mashed ${name}`, changed ? `something changed (now ${after.screen}${after.log !== seen.log ? `, log: "${after.log}"` : ""})` : "nothing");
  // Only between waves: during a wave the screen changes by itself.
  if (changed && seen.screen === "Board (between waves)" && after.screen === seen.screen && !knownKeys.has(name) && !/^[1-9]$/.test(name) && !["Tab", "Enter"].includes(name) && !pokesDone.has(`key-${name}`)) {
    pokesDone.add(`key-${name}`);
    await friction(
      {
        severity: "note",
        screen: seen.screen,
        title: `Key ${name} does something nothing told me about`,
        tried: `Pressed ${name} out of habit.`,
        expected: "Keys that do things are mentioned somewhere I'd read early (a lesson or a tooltip).",
        saw: `Screen after: ${after.screen}. Log: "${after.log}"`,
      },
      false,
    );
  }
  await recover(`pressing ${name}`);
  return true;
}

/** Hover over the carpet during a wave to see what the fruit are. */
async function pokeHoverFruit() {
  const { carpet } = await floorSpots();
  if (!carpet.length) return false;
  const seen = await look();
  for (let i = 0; i < 14; i++) {
    const p = carpet[Math.floor(rand() * carpet.length)];
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(120);
    const tip = (await look()).tooltip;
    if (tip) {
      read("Fruit card (hover)", tip);
      noted(seen.screen, "hovered the fruit on the carpet", `a card: "${tip.slice(0, 90)}"`);
      return true;
    }
  }
  noted(seen.screen, "hovered the fruit on the carpet", "no fruit card caught (fruit move fast)");
  return true;
}

/** Look around the Back room without buying, then leave. */
async function pokeBackRoom() {
  const seen = await look();
  if (!(await press(/^Back room/, "Curious: opened the Back room just to look.", { quietIfMissing: true }))) return false;
  const inside = await look(BACK_ROOM);
  read("Back room", inside.text.slice(0, 500));
  const tabs = inside.buttons.filter((b) => (b.role === "tab" || b.role === "radio") && b.enabled);
  if (tabs.length) {
    const t = tabs[Math.floor(rand() * tabs.length)];
    await press(new RegExp(`^${escapeRe(t.name)}$`), `Looked at ${t.name} in the Back room.`, { scope: BACK_ROOM, expectChange: false });
  }
  const viaEsc = rand() < 0.5;
  if (viaEsc) await page.keyboard.press("Escape");
  else await press(/^(Close|Close \(Esc\))$/i, "Closed the Back room.", { scope: BACK_ROOM, quietIfMissing: true, expectChange: false });
  await page.waitForTimeout(400);
  const after = await look();
  noted(seen.screen, `browsed the Back room and left with ${viaEsc ? "Esc" : "Close"}`, after.screen === "Back room" ? "still open" : "closed");
  if (viaEsc && after.screen === "Back room")
    await friction({ severity: "minor", screen: "Back room", title: "Esc didn't close the Back room", tried: "Pressed Esc to leave the Back room.", expected: "It closes, like the tower card.", saw: "Still open." });
  await recover("the Back room");
  return true;
}

/** Without the seeds for it, pick the priciest card and try to build it anyway. */
async function pokeBroke() {
  const seen = await look();
  const cards = seen.buttons
    .filter((b) => b.role === "button" && /\(\d\) · /.test(b.tip))
    .map((b) => ({ b, cost: Number(b.name.match(/(\d+)(?!.*\d)/)?.[1] ?? 0) }))
    .filter((c) => c.cost > (seen.seeds ?? 0));
  if (!cards.length) return false;
  const c = cards.sort((a, b) => b.cost - a.cost)[0];
  await press(new RegExp(`^${escapeRe(c.b.name)}$`), `Picked ${c.b.name.slice(0, 20)} though I can't afford it.`, { expectChange: false });
  picked = c.b.name.replace(/^\d+\s*/, "").split(/ \d| No /)[0];
  const r = await tapFloor(`build the ${picked} I can't afford`);
  noted(seen.screen, `tried to build ${picked} (${c.cost}) with ${seen.seeds} seeds`, r.ok ? "it built (!)" : r.log ? `log: "${r.log}"` : "nothing built, nothing said");
  if (!r.ok && !r.log)
    await friction({ severity: "major", screen: seen.screen, title: "Building without enough seeds says nothing", tried: `Picked a ${c.cost}-seed card with ${seen.seeds} seeds and tapped the floor.`, expected: '"Not enough seeds" or similar.', saw: "No message." });
  await pickMelon();
  return true;
}

/** Hit Skip on a lesson by accident (it's right there in the box). */
async function pokeSkip() {
  const seen = await look();
  if (skippedGuide || !seen.mynxi || seen.mynxi.lesson === "tip") return false;
  skippedGuide = true;
  await press(/^Skip$/, `Slip: tapped Skip on lesson "${seen.mynxi.title}".`);
  const after = await look();
  const gone = !after.mynxi || after.mynxi.lesson === "tip";
  noted(seen.screen, `tapped Skip on "${seen.mynxi.title}"`, gone ? "the whole guide ended at once" : "a confirmation or the next lesson");
  if (gone)
    await friction({
      severity: "minor",
      screen: seen.screen,
      title: "One tap on Skip ends the whole guide, with no confirm",
      tried: `Tapped Skip on lesson ${seen.mynxi.lesson} (it sits by the lesson title).`,
      expected: "Skip asks once, or there's a way to bring the lessons back mid-night.",
      saw: `Mynxi's lessons were gone. ${after.buttons.some((b) => /Mynxi|tutorial|lesson/i.test(b.name)) ? "A replay button is on screen." : "Nothing on the board brings them back."}`,
    });
  return true;
}

type PokeFn = () => Promise<boolean>;
/** Now and then, one random poke that fits this moment. */
async function curiousPoke(context: "guide" | "prep" | "combat") {
  if (STYLE !== "curious" || rand() > CURIOSITY) return;
  const choices: Array<[PokeFn, number]> = [
    [pokeTower, 3],
    [pokeRandomTap, 3],
    [pokeKeys, 2],
    [pokeMenu, 1],
  ];
  if (context !== "combat") choices.push([pokeTabs, 3], [pokeBroke, 1]);
  if (context === "prep") choices.push([pokeBackRoom, 1]);
  if (context === "combat") choices.push([pokeSpeed, 2], [pokeHoverFruit, 2]);
  if (context === "guide") choices.push([pokeSkip, SKIP_WEIGHT]);
  const total = choices.reduce((s, [, w]) => s + w, 0);
  let roll = rand() * total;
  for (const [fn, w] of choices) {
    if ((roll -= w) > 0) continue;
    try {
      await fn();
    } catch (e) {
      noted((await look()).screen, `poke ${fn.name}`, `bot error: ${String(e).slice(0, 120)}`);
      await recover(fn.name);
    }
    return;
  }
}

/** The rest of the first night: what a newcomer does once Mynxi lets go. */
async function freePlay() {
  const started = Date.now();
  let lastWave = 0;
  const guideBuilds = built.length;
  let idle = 0;
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    const seen = await look();
    noticeTerms(seen);
    const wave = Number(seen.text.match(/Start wave (\d+)/)?.[1] ?? seen.text.match(/Wave (\d+)\/\d+/)?.[1] ?? 0);
    if (seen.mynxi && seen.mynxi.action === "Got it") {
      read("Mynxi tip", `${seen.mynxi.title}. ${seen.mynxi.text}`);
      console.log(`  Mynxi tip: ${seen.mynxi.title}`);
      await checkHintRefs(seen, "Mynxi tip", seen.mynxi.text);
      if (/press R/.test(seen.mynxi.text)) {
        knownKeys.add("R");
        await key("R", "Mynxi said press R");
        const r = await tapFloor("place the Card Catalogue");
        if (!r.ok)
          await friction({
            severity: "minor",
            screen: seen.screen,
            title: "Pressed R and tapped the floor, but no Card Catalogue went down",
            tried: "Did what the tip said: press R and put it where it covers the most carpet.",
            expected: "The keeper tower appears.",
            saw: r.log ? `Log: "${r.log}"` : "No change.",
          });
      }
      if ((await look()).mynxi?.action === "Got it") await press(/^Got it$/, "Read the tip and pressed Got it.");
      else steps.push({ screen: seen.screen, what: "the tip closed itself once I did what it said", ms: 0, words: 0 });
      continue;
    }
    if (seen.screen === "Upgrade pick") {
      await pickCard(seen, "Wave cleared: picked an upgrade card.");
      continue;
    }
    if (seen.screen === "Night over") {
      await shot("night-over");
      readSoFar.push(seen.text);
      break;
    }
    if (seen.screen === "Back room") {
      await press(/^(Close|Close \(Esc\))$/i, "Closed the Back room.", { quietIfMissing: true });
      continue;
    }
    if (seen.screen === "Board (between waves)") {
      if (wave > WAVES) break;
      // Spend: build cannons while seeds last (a learner builds 1-2 per wave).
      for (let n = 0; n < 2; n++) {
        const now = await look();
        const cheapest = Math.min(
          ...now.buttons.filter((b) => b.enabled && /\(\d\)/.test(b.tip)).map((b) => Number(b.name.match(/(\d+)(?!.*\d)/)?.[1] ?? 9999)),
        );
        if (now.seeds == null || now.seeds < cheapest) break;
        const r = await tapFloor(`spend seeds before wave ${wave}`);
        if (!r.ok) break;
      }
      await curiousPoke("prep");
      if ((await look()).screen !== "Board (between waves)") continue;
      if (wave !== lastWave) {
        lastWave = wave;
        console.log(`  wave ${wave}: seeds ${seen.seeds}, stacks ${seen.lives}`);
      }
      if (knownKeys.has("Space") && rand() < 0.5) await key("Space", "start the wave");
      else await press(/^Start (wave|the last wave)/, `Started wave ${wave}.`);
      continue;
    }
    if (seen.screen === "Board (wave running)") {
      idle++;
      if (idle % 6 === 0 && seen.seeds != null && seen.seeds >= 60) await tapFloor("build mid-wave");
      else if (idle % 3 === 0) await curiousPoke("combat");
      await page.waitForTimeout(1000);
      continue;
    }
    // Something else is up: an unknown overlay. Look for an obvious way on.
    idle++;
    if (idle > 20) {
      await friction({
        severity: "major",
        screen: seen.screen,
        title: "No clear next step",
        tried: "Looked for the obvious button for 20 seconds.",
        expected: "One button that moves the night on.",
        saw: seen.buttons.map((b) => b.name).filter(Boolean).slice(0, 12).join(", "),
      });
      break;
    }
    await page.waitForTimeout(1000);
  }
  step("Board", `free play to wave ${lastWave}`, started);
  // The selection never changes by itself: did the learner keep building what the last lesson picked?
  const after = built.slice(guideBuilds);
  const same = after.filter((k) => k === picked).length;
  if (after.length >= 3 && same === after.length && !/cannon|mortar|spitter|ballista|reader/i.test(picked))
    await friction({
      severity: "major",
      screen: "Board (between waves)",
      title: `After the Control lesson the ${picked} stays picked: my next ${same} taps all built it`,
      tried: "Kept tapping the floor to build, as lesson 5 taught (another tap builds another).",
      expected: "Lesson 5 said the Melon cannon stays picked; after lesson 6 I expected to be building cannons again, or a reminder of what's picked.",
      saw: `${same} × ${picked} built after the lessons (it does no damage on its own), and nothing on the board says what the next tap builds.`,
    });
}

/** After the first night: back to the title and into the full Setup. */
async function setupTour() {
  let seen = await look();
  if (seen.screen !== "Title") {
    if (!(await press(/^Menu$/, "Opened the menu to leave the night.", { quietIfMissing: true })) && knownKeys.has("Esc")) await key("Esc", "open the menu");
    seen = await look();
    await shot("pause-menu");
    await press(/^Leave to title$/, "Pressed Leave to title.", { quietIfMissing: true });
    seen = await look();
    // A confirmation, if any.
    const confirm = seen.buttons.find((b) => /^(Leave|Yes|Leave to title|Leave the night)/i.test(b.name) && b.enabled);
    if (confirm) await press(new RegExp(`^${escapeRe(confirm.name)}$`), "Confirmed leaving.");
    seen = await look();
  }
  if (seen.screen !== "Title") {
    await friction({
      severity: "major",
      screen: seen.screen,
      title: "Couldn't find the way back to the title",
      tried: "Menu → Leave to title.",
      expected: "The title screen.",
      saw: seen.buttons.map((b) => b.name).filter(Boolean).slice(0, 12).join(", "),
    });
    return;
  }
  await shot("title-after-first-night");
  const nn = seen.buttons.find((b) => /^New night/.test(b.name));
  if (!nn?.enabled) {
    await friction({
      severity: "major",
      screen: "Title",
      title: "New night is still locked after the guided first night",
      tried: "Mynxi said New night on the title screen is open now.",
      expected: "New night enabled.",
      saw: nn ? `"${nn.name}" is disabled.` : "No New night button.",
    });
    return;
  }
  await press(/^New night$/, "Opened New night to set up my own night.");
  for (let depth = 0; depth < 6; depth++) {
    seen = await look();
    noticeTerms(seen);
    if (seen.screen === "Room poster") {
      await shot("poster-from-setup");
      await press(/^Back to setup$/, "Checked Back to setup from the poster.");
      break;
    }
    await shot(`setup-${depth}`);
    const words = wordsIn(seen.text);
    steps.push({ screen: seen.screen, what: `read setup page ${depth + 1}`, ms: 0, words });
    if (words > 250)
      await friction({
        severity: "minor",
        screen: seen.screen,
        title: `Setup page ${depth + 1} has a lot to read (${words} words)`,
        tried: "Read the setup page before choosing.",
        expected: "A few choices with short lines.",
        saw: `${words} words of text on one page.`,
      }, false);
    const locked = seen.buttons.filter((b) => !b.enabled || /locked/i.test(b.name));
    if (locked.length && depth === 0) {
      // A curious newcomer taps a locked keeper to see what it takes.
      const l = locked.find((b) => b.role === "radio" || /locked/i.test(b.name)) ?? locked[0];
      await press(new RegExp(`^${escapeRe(l.name)}$`), `Tapped a locked option ("${l.name.slice(0, 40)}") to see what it needs.`, { quietIfMissing: true });
      const after = await look();
      if (after.screen === "Grand Catalogue") {
        steps.push({ screen: after.screen, what: "locked option opened the Grand Catalogue", ms: 0, words: 0 });
        await shot("locked-keeper-catalogue");
        await press(/^Back$/, "Closed the Catalogue.", { scope: '[aria-label="Grand Catalogue"]' });
      }
    }
    // Forward: the button that looks like it moves on.
    const fwd = (await look()).buttons.find((b) => b.enabled && /^(Next|Continue|Choose|Play|Begin|To the)|→$/i.test(b.name) && !/^Back/.test(b.name));
    if (!fwd) {
      await friction({
        severity: "minor",
        screen: seen.screen,
        title: `No obvious "next" button on setup page ${depth + 1}`,
        tried: "Looked for a button that moves on.",
        expected: "One clearly primary button.",
        saw: seen.buttons.filter((b) => b.enabled).map((b) => b.name).filter(Boolean).slice(0, 14).join(", "),
      });
      break;
    }
    await press(new RegExp(`^${escapeRe(fwd.name)}$`), `Pressed "${fwd.name}" to move on.`);
  }
}

// ---------------------------------------------------------------- report

function report(meta: Record<string, string>) {
  const sorted = [...frictions].sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.at - b.at);
  const count = (s: Severity) => frictions.filter((f) => f.severity === s).length;
  const L: string[] = [];
  L.push(`# New-player walkthrough`);
  L.push("");
  L.push(`Run ${meta.when}, ${meta.browser}, ${VW}×${VH}, seed ${meta.seed}, ${meta.duration} s. Fresh browser profile (no save, developer mode off). Style: ${STYLE}${STYLE === "curious" ? ` (curiosity ${CURIOSITY})` : ""}.`);
  L.push("");
  L.push(`**Friction:** ${count("blocker")} blocker, ${count("major")} major, ${count("minor")} minor, ${count("note")} notes.`);
  L.push("");
  L.push(`Screens reached (first time, seconds in): ${[...screensSeen].map(([s, t]) => `${s} (${t})`).join(", ")}.`);
  L.push("");
  L.push(`Keys the UI taught: ${[...knownKeys].sort().join(", ") || "none"}.`);
  L.push("");
  L.push("## Friction, worst first");
  L.push("");
  for (const [i, f] of sorted.entries()) {
    L.push(`### ${i + 1}. [${f.severity}] ${f.title}`);
    L.push("");
    L.push(`- **Screen:** ${f.screen} (at ${f.at} s)`);
    L.push(`- **Tried:** ${f.tried}`);
    L.push(`- **Expected:** ${f.expected}`);
    L.push(`- **Saw:** ${f.saw}`);
    if (f.shot) L.push(`\n![${f.title}](${f.shot})`);
    L.push("");
  }
  if (pokes.length) {
    L.push(`## Curious pokes (${pokes.length})`);
    L.push("");
    L.push("| At | Screen | What I tried | What happened |");
    L.push("|---|---|---|---|");
    for (const p of pokes) L.push(`| ${p.at} s | ${p.screen} | ${p.what.replace(/\|/g, "/")} | ${p.result.replace(/\|/g, "/")} |`);
    L.push("");
  }
  L.push("## Words met before they were explained");
  L.push("");
  L.push("| Term | First on screen | First explained | Gap |");
  L.push("|---|---|---|---|");
  for (const { term } of TERMS) {
    const s = termSeen.get(term);
    if (!s) continue;
    const e = termExplained.get(term);
    L.push(`| ${term} | ${s.screen} (${s.at} s) | ${e ? `${e.where} (${e.at} s)` : "**never**"} | ${e ? `${Math.max(0, Math.round(e.at - s.at))} s` : "—"} |`);
  }
  L.push("");
  L.push("## Timeline");
  L.push("");
  L.push("| Screen | What | Bot time | Words | Human reading time |");
  L.push("|---|---|---|---|---|");
  for (const s of steps) L.push(`| ${s.screen} | ${s.what.replace(/\|/g, "/")} | ${(s.ms / 1000).toFixed(1)} s | ${s.words || ""} | ${s.words ? `~${readSecs(s.words)} s` : ""} |`);
  L.push("");
  const md = L.join("\n");
  writeFileSync(join(OUT, "report.md"), md);
  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify({ meta, style: STYLE, curiosity: CURIOSITY, frictions: sorted, pokes, steps, screens: Object.fromEntries(screensSeen), terms: { seen: Object.fromEntries(termSeen), explained: Object.fromEntries(termExplained) }, keys: [...knownKeys] }, null, 2),
  );
  return sorted;
}

// ---------------------------------------------------------------- server and browser

async function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const s = createServer();
    s.listen(0, () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => ok(p));
    });
    s.on("error", fail);
  });
}

async function startServer(): Promise<{ url: string; proc: ChildProcess }> {
  const port = await freePort();
  const proc = spawn(`npx vite --port ${port} --strictPort`, { stdio: ["ignore", "ignore", "ignore"], shell: true });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return { url, proc };
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error("dev server did not start");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  let server: { url: string; proc: ChildProcess } | undefined;
  const url = arg("url") ?? (server = await startServer()).url;
  console.log(`New-player bot: ${url} → ${OUT}`);
  let browser: Browser | undefined;
  const errors: string[] = [];
  try {
    browser = await chromium.launch({ channel: BROWSER === "chromium" ? undefined : BROWSER, headless: !HEADED });
    // A brand-new context: empty localStorage, no developer mode, nothing shared with the user's browser.
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
    page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
    page.on("dialog", (d) => void d.dismiss());
    // A cold dev server pre-bundles on the first load, which can take a minute.
    await page.goto(url, { timeout: 180_000 });
    await page.getByRole("button", { name: /^(Start|Continue)$/ }).waitFor({ timeout: 180_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const storage = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("melongeddon")));
    if (storage.some((k) => /dev|guide/.test(k))) throw new Error(`profile isn't fresh: ${storage.join(", ")}`);
    await page.waitForTimeout(800);

    console.log("Title screen");
    await titleTour();
    console.log("Guided first night");
    await guidedNight();
    console.log("Free play");
    await freePlay();
    console.log("Setup");
    await setupTour();
  } catch (e) {
    await friction({
      severity: "blocker",
      screen: page ? (await look().catch(() => ({ screen: "?" }) as Seen)).screen : "start",
      title: "The bot crashed",
      tried: "Running the walkthrough.",
      expected: "To reach the end.",
      saw: String((e as Error).stack ?? e).slice(0, 600),
    });
  } finally {
    for (const e of [...new Set(errors)].slice(0, 8))
      frictions.push({ severity: "major", screen: "(console)", title: "Error in the browser console", tried: "Played normally.", expected: "No errors.", saw: e.slice(0, 400), at: secs() });
    for (const { term } of TERMS) {
      const seenAt = termSeen.get(term);
      if (seenAt && !termExplained.has(term) && !frictions.some((f) => f.title.includes(`"${term}`)))
        frictions.push({
          severity: "minor",
          screen: seenAt.screen,
          title: `"${term}" shows up in play but nothing I read explains it`,
          tried: "Read the lessons, tips, hover hints and the top of How to play.",
          expected: `A line somewhere in play saying what "${term}" means.`,
          saw: `First on screen at ${seenAt.at} s (${seenAt.screen}); never explained by the end of the run.`,
          at: seenAt.at,
        });
    }
    const sorted = report({
      when: new Date().toISOString().slice(0, 16).replace("T", " "),
      browser: BROWSER,
      seed: String(arg("seed") ?? 1),
      duration: String(secs()),
      url,
    });
    await browser?.close();
    if (server) {
      if (process.platform === "win32" && server.proc.pid) spawn("taskkill", ["/pid", String(server.proc.pid), "/T", "/F"], { stdio: "ignore" });
      else server.proc.kill();
    }
    console.log(`\n${sorted.length} friction points. Report: ${join(OUT, "report.md")}`);
    for (const f of sorted.slice(0, 10)) console.log(`  [${f.severity}] ${f.screen}: ${f.title}`);
  }
}

await main();
