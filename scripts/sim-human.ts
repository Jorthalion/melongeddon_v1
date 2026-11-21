/**
 * The "human" bot (`--strategies human`): plays like a decent regular player instead of following a fixed rotation.
 *
 * - Reads what's coming: before building it looks at this wave and the next (the Coming up bar) and builds an answer
 *   first: a Peeler for shells, husks and damp; a tower that can see Box Cats; a cannon on an uncovered paratrooper
 *   landing; cannons near the door for chute fruit; a Mortar for big crowds.
 * - Builds combos on purpose: cannons stay together, a Reading Lamp goes where it lights the most cannons, an Ink Well
 *   (or the Elf's Honey) where the most cannons overlap. A tile is scored by the carpet the cannon really covers there,
 *   lamp and aura included (api.previewStats on that tile).
 * - Saves: it keeps one shopping list. When the next thing on it costs too much, it waits for the seeds instead of
 *   buying something else. Back-room fittings are bought only when they are better value than another cannon, and
 *   it picks the fitting that adds the most damage.
 * - Uses each keeper's tools (KEEPER_PLAN below).
 * - Decent, not perfect: it takes one of the few best tiles at random (SKILL.near / SKILL.top) and looks two waves ahead.
 *
 * sim-core.ts drives the phases and counts the results; this file only decides what to build, where, and what to buy.
 */
import {
  BOARDS,
  BOX_SEERS,
  CELL,
  CANNON,
  GLOBAL_RANGE,
  KEEPER_TOWERS,
  PASSIVE,
  SIGNATURE,
  TOWERS,
  besideCarpet,
  canBeGreat,
  fittingsFor,
  type ModId,
  type TowerKind,
  type WavePreview,
  type World,
  type createWorld,
} from "../src/game/engine.ts";

type Api = ReturnType<typeof createWorld>;
type Tower = World["towers"][number];
type Spot = { c: number; r: number };

/** How well it plays. near: tiles within this share of the best count as "about as good"; top: it picks among this many. */
export const SKILL = { near: 0.92, top: 3, lookAhead: 2 };

/** Where a tower goes. */
export type Place =
  | "cover" // the most carpet, counting lamps and auras on that tile
  | "early" // the most carpet, early carpet counting more (a Peeler strips before the cannons fire)
  | "late" // the most carpet near the door (chute fruit, the Geese)
  | "lamp" // lights the most (and priciest) unlit cannons
  | "overlap" // where the most cannons already reach (Ink, Honey)
  | "aura" // carpet plus cannons in the Quack-Liber's aura
  | "drop" // reaches a paratrooper landing
  | "door" // the free tile nearest the door (Mynxi's Desk)
  | "useless" // the tile worst for shooting (the Lectern helps nobody)
  | "flask" // carpet, few free neighbours to spill onto, no Fire cannon beside it
  | "kit"; // the old bots' own spot finder (Copycat, Post, Quackmission)

export interface Want {
  kind: TowerKind;
  place: Place;
  /** Why it builds this, for the report ("shells ahead", "lamp", "keeper"...). */
  why: string;
  /** Needed for this very wave: it may build it during the wave too, before anything else. */
  urgent?: boolean;
  drop?: number;
}

export interface HumanKit {
  api: Api;
  world: World;
  rng: () => number;
  taken: (c: number, r: number) => boolean;
  /** Puts down the selected kind on a tile; true if a tower appeared. Books the seeds spent. */
  place: (kind: TowerKind, spot: Spot) => boolean;
  /** Books seeds spent on a kind (back room). */
  spend: (kind: TowerKind, before: number) => void;
  purse: () => number;
  /** The old bots' spot finder, for the Copycat, the Post and the Quackmission. */
  kitCell: (range: number, kind: TowerKind) => Spot | null;
  /** Sir Michael's merges and Roost feeding (the old bots' chores). */
  dragonChores: () => void;
  /** Tests: kinds it never builds, keeper extras' cannon thresholds instead of KEEPER_PLAN's, and no Great pairing. */
  avoid?: TowerKind[];
  keeperAt?: Partial<Record<TowerKind, number>>;
  noGreat?: boolean;
  /** Scenarios: towers to build first, in this order, each where it belongs (a lamp by the cannons...); --avoid doesn't stop them. */
  opener?: TowerKind[];
  /** Scenarios: never more towers than this on the board. */
  maxTowers?: number;
}

/** Towers that shoot fruit (and so count as a cannon to light, cover or overlap). */
const NOT_SHOOTERS: TowerKind[] = [...PASSIVE, "geese", "pamphlet", "driver", "flask", "bombard", "gourdgate"];
export const isShooter = (k: TowerKind) => !NOT_SHOOTERS.includes(k);
/** Towers whose hit has a splash or a puddle (a crowd answer; they also knock a Box Cat's box off). */
const SPLASHERS: TowerKind[] = ["mortar", "still", "fire", "organ", "cauldron", "lionblade", "quackliber", "press", "stomp", "bombard"];
/** The cannons a decent player cycles through when nothing else is needed. */
const CORE: TowerKind[] = ["melon", "mortar", "melon", "freeze", "melon", "fire", "melon", "melon"];

/** Each keeper's own tools: when (cannons on the floor) and where. The signature always comes at two cannons. */
const KEEPER_PLAN: Partial<Record<string, Array<{ kind: TowerKind; at: number; place: Place; waveMax?: number }>>> = {
  mynxi: [{ kind: "desk", at: 1, place: "door", waveMax: 5 }],
  vael: [{ kind: "flask", at: 6, place: "flask" }],
  michael: [
    { kind: "bombard", at: 5, place: "cover" },
    { kind: "gourdgate", at: 8, place: "cover" },
  ],
  elf: [
    { kind: "stomp", at: 4, place: "cover" },
    { kind: "honey", at: 6, place: "overlap" },
  ],
  ooze: [{ kind: "copycat", at: 3, place: "kit" }],
  quack: [
    { kind: "pamphlet", at: 6, place: "kit" },
    { kind: "driver", at: 7, place: "kit" },
  ],
};
const SIGNATURE_PLACE: Partial<Record<TowerKind, Place>> = { lectern: "useless", quackliber: "aura" };
/** Where any kind goes when it's on the list for its own sake (an opener). */
export const PLACE_OF: Partial<Record<TowerKind, Place>> = {
  ...SIGNATURE_PLACE,
  lantern: "lamp",
  ink: "overlap",
  honey: "overlap",
  peeler: "early",
  desk: "door",
  flask: "flask",
  geese: "late",
  copycat: "kit",
  pamphlet: "kit",
  driver: "kit",
};

export function makeHuman(kit: HumanKit) {
  const { api, world, rng } = kit;
  const hero = world.hud.hero ?? "mynxi"; // chosen before the first build
  const why: Record<string, number> = {};
  let coreBuilt = 0;
  let openerAt = 0;
  let livesAtWave = world.hud.lives;
  let lastPhase = world.hud.phase;

  // ---------- the carpet ----------
  /** Points along every open piece of carpet, each with how far along its piece it is (0 = entrance, 1 = door). */
  type Sample = { x: number; y: number; t: number };
  const line = (pts: Array<{ x: number; y: number }>) => {
    const out: Sample[] = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    let run = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d < len; d += 6) out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len, t: total ? (run + d) / total : 0 });
      run += len;
    }
    return out;
  };
  let samples: Sample[] = [];
  let doorSamples: Sample[][] = [];
  let sampledFor: unknown = null;
  const resample = () => {
    if (sampledFor === world.segments) return;
    sampledFor = world.segments;
    samples = world.segments.flatMap(line);
    doorSamples = world.doors.filter((d) => d.open).map((d) => line(d.seg));
  };

  const free = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < world.cols && r < world.rows && !world.pathCells.has(`${c},${r}`) && !world.vergeCells.has(`${c},${r}`) && !world.shelfCells.has(`${c},${r}`) && !kit.taken(c, r);
  const centre = (s: Spot) => ({ x: s.c * CELL + CELL / 2, y: s.r * CELL + CELL / 2 });
  const shooters = () => world.towers.filter((t) => isShooter(t.kind));
  const has = (k: TowerKind) => world.towers.some((t) => t.kind === k);
  const count = (k: TowerKind) => world.towers.filter((t) => t.kind === k).length;
  /** A standing tower's reach (a whole-board cannon counts as reaching everything). */
  const reach = (t: Tower) => api.statsOf(t.id)?.range ?? 0;

  // ---------- what's coming ----------
  const previews = new Map<number, WavePreview>();
  const preview = (i: number) => {
    if (!previews.has(i)) previews.set(i, api.wavePreview(i));
    return previews.get(i)!;
  };
  /** This wave (between waves: the next one) and the ones after it, up to SKILL.lookAhead. */
  const ahead = () => {
    const first = world.hud.phase === "prep" ? api.comingUp().index : world.hud.wave - 1;
    const out: WavePreview[] = [];
    for (let i = first; i < Math.min(world.hud.waveCount, first + SKILL.lookAhead); i++) out.push(preview(i));
    return out;
  };

  // ---------- scoring tiles ----------
  /** Carpet in reach of (x, y), each sample weighted. */
  const cover = (x: number, y: number, range: number, pool: Sample[], weight: (s: Sample) => number = () => 1) => {
    let v = 0;
    const r2 = range * range;
    for (const s of pool) if ((s.x - x) ** 2 + (s.y - y) ** 2 <= r2) v += weight(s);
    return v;
  };
  /** The carpet to score on: a door's own carpet while nothing that shoots reaches it, else all of it. */
  const pool = () => {
    resample();
    const sh = shooters();
    if (sh.length < 2) return samples;
    const bare = doorSamples.find((l) => !l.some((p) => sh.some((t) => (t.x - p.x) ** 2 + (t.y - p.y) ** 2 <= reach(t) ** 2)));
    return bare ?? samples;
  };
  const lampReach = () => api.previewStats("lantern").range;

  /** Every free tile's score for `want`; then one of the few best, the way a decent player eyeballs it. */
  const spotFor = (want: Want): Spot | null => {
    const kind = want.kind;
    if (want.place === "kit") {
      const r = api.previewStats(kind).range;
      return kit.kitCell(r >= GLOBAL_RANGE ? 132 : r, kind);
    }
    const carpet = pool();
    const sh = shooters();
    const offBoard = api.previewStats(kind);
    const lr = lampReach();
    // How many cannons already reach each sample (for Ink and Honey).
    const reached = want.place === "overlap" ? carpet.map((s) => sh.filter((t) => (t.x - s.x) ** 2 + (t.y - s.y) ** 2 <= reach(t) ** 2).length) : [];
    const lit = new Set(sh.filter((t) => api.statsOf(t.id)?.lit).map((t) => t.id));
    const door = world.points[world.points.length - 1];
    const drop = want.drop != null ? BOARDS[world.hud.map].drops?.[want.drop] : undefined;
    const dropAt = drop ? centre({ c: drop[0], r: drop[1] }) : null;
    const scored: Array<{ s: Spot; v: number }> = [];
    for (let c = 0; c < world.cols; c++)
      for (let r = 0; r < world.rows; r++) {
        if (!free(c, r)) continue;
        if ((kind === "gourdgate" || kind === "desk") && !besideCarpet(world, c, r)) continue;
        const { x, y } = centre({ c, r });
        const here = want.place === "useless" || want.place === "door" || want.place === "lamp" ? offBoard : api.previewStats(kind, { c, r });
        const range = here.range >= GLOBAL_RANGE ? 132 : here.range;
        // Faster here (a lamp, an aura) counts like covering more carpet.
        const pace = here.interval > 0 && offBoard.interval > 0 ? offBoard.interval / here.interval : 1;
        let v: number;
        switch (want.place) {
          case "early":
            v = cover(x, y, range, carpet, (s) => 1.5 - s.t) * pace;
            break;
          case "late":
            v = cover(x, y, range, carpet, (s) => 0.2 + 2 * s.t * s.t) * pace;
            break;
          case "lamp": {
            v = 0;
            for (const t of sh) if ((t.x - x) ** 2 + (t.y - y) ** 2 <= lr * lr) v += TOWERS[t.kind].cost * (lit.has(t.id) ? 0.25 : 1);
            v += cover(x, y, 132, carpet) * 0.01; // tie-break: closer to the action
            break;
          }
          case "overlap":
            v = 0;
            for (let i = 0; i < carpet.length; i++) if ((carpet[i].x - x) ** 2 + (carpet[i].y - y) ** 2 <= range * range) v += 1 + reached[i];
            break;
          case "aura": {
            const near = sh.filter((t) => (t.x - x) ** 2 + (t.y - y) ** 2 <= CANNON.quackAura ** 2).length;
            v = cover(x, y, range, carpet) * pace * (1 + 0.15 * Math.min(5, near));
            break;
          }
          case "drop":
            if (!dropAt || (dropAt.x - x) ** 2 + (dropAt.y - y) ** 2 > range * range) continue;
            v = cover(x, y, range, carpet) * pace + 1;
            break;
          case "door":
            v = 1e6 - Math.hypot(x - door.x, y - door.y);
            break;
          case "useless":
            v = 1e6 - cover(x, y, 132, carpet);
            break;
          case "flask": {
            if (world.towers.some((t) => t.kind === "fire" && Math.abs(t.c - c) + Math.abs(t.r - r) <= 2)) continue;
            const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => free(c + a, r + b)).length;
            v = cover(x, y, range, carpet) * (1 - 0.15 * open);
            break;
          }
          default: {
            v = cover(x, y, range, carpet) * pace;
            // Keep cannons together, so a lamp or an ink well can reach several later.
            if (isShooter(kind) && v > 0) {
              const friends = sh.filter((t) => (t.x - x) ** 2 + (t.y - y) ** 2 <= lr * lr).length;
              v *= 1 + 0.04 * Math.min(4, friends);
            }
          }
        }
        if (v > 0) scored.push({ s: { c, r }, v });
      }
    if (!scored.length) return null;
    scored.sort((a, b) => b.v - a.v);
    const best = scored[0].v;
    // Sir Michael: a second of a kind goes beside the first, when that's nearly as good, so the pair can be made Great.
    if (hero === "michael" && !kit.noGreat && canBeGreat(kind)) {
      const pair = scored.find((x) => x.v >= best * 0.75 && world.towers.some((t) => t.kind === kind && !t.great && Math.abs(t.c - x.s.c) + Math.abs(t.r - x.s.r) === 1));
      if (pair) return pair.s;
    }
    if (want.place === "door" || want.place === "useless") return scored[0].s;
    const near = scored.filter((x) => x.v >= best * SKILL.near).slice(0, SKILL.top);
    return near[Math.floor(rng() * near.length)].s;
  };

  // ---------- the shopping list ----------
  /** The first thing a decent player would buy now. `skip`: kinds that found no tile this time. */
  const nextWant = (skip: Set<TowerKind>): Want | null => {
    const ok = (w: Want | null) => (w && !skip.has(w.kind) ? w : null);
    const sh = shooters();
    const n = sh.length;
    const waves = ahead();
    const now = waves[0];
    const groups = waves.flatMap((p, i) => p.groups.map((g) => ({ g, soon: i === 0 })));
    const fruit = groups.reduce((a, x) => a + x.g.count, 0);
    // Two cannons first: nothing else matters with an empty floor.
    if (n < 2) return ok({ kind: "melon", place: "cover", why: "opening", urgent: true }) ?? ok({ kind: "mortar", place: "cover", why: "opening", urgent: true });

    const answers: Array<Want | null> = [];
    // Paratroopers about to land where nothing reaches.
    for (const d of now?.drops ?? []) if (!api.dropCovered(d)) answers.push({ kind: "melon", place: "drop", why: "paratroopers", urgent: true, drop: d });
    // Box Cats: only area towers (and splash) can touch them.
    const boxed = groups.filter((x) => x.g.siege === "boxed");
    if (boxed.length) {
      // Only BOX_SEERS aim at a box (a Mortar's splash knocks one off, but it can't aim at it).
      const seers = world.towers.filter((t) => BOX_SEERS.includes(t.kind)).length;
      const want = boxed.reduce((a, x) => a + x.g.count, 0) >= 6 ? 2 : 1;
      if (seers < want) {
        const own = KEEPER_TOWERS[hero].find((k) => BOX_SEERS.includes(k) && k !== "geese" && k !== "bombard" && !has(k));
        answers.push({ kind: own ?? "still", place: "cover", why: "box cats", urgent: boxed.some((x) => x.soon) });
      }
    }
    // Shells, husks and damp: a Peeler strips them for every cannon.
    const armoured = groups.filter((x) => x.g.guard !== "none").reduce((a, x) => a + x.g.count, 0);
    // With only a few cannons up it waits for the shells to be next (or a big share), and builds cannons first.
    const peelers = count("peeler");
    const shellsNext = groups.some((x) => x.soon && x.g.guard !== "none");
    if (fruit && armoured / fruit >= 0.25 && (n >= 4 || shellsNext || armoured / fruit >= 0.4) && peelers < (armoured / fruit >= 0.5 && n >= 8 ? 2 : 1))
      answers.push({ kind: "peeler", place: "early", why: "shells ahead", urgent: shellsNext });
    // Fruit up the chute walk in from the door: two cannons should reach the last stretch.
    if (groups.some((x) => x.g.chute)) {
      resample();
      const last = samples.filter((s) => s.t >= 0.85);
      const guards = sh.filter((t) => last.some((s) => (t.x - s.x) ** 2 + (t.y - s.y) ** 2 <= reach(t) ** 2)).length;
      if (guards < 2) answers.push({ kind: "melon", place: "late", why: "chute", urgent: groups.some((x) => x.soon && x.g.chute) });
    }
    // A big crowd wants a splash.
    const crowd = groups.some((x) => x.g.count >= 10) || fruit >= 30;
    if (crowd && !world.towers.some((t) => SPLASHERS.includes(t.kind))) answers.push({ kind: "mortar", place: "cover", why: "crowd" });
    for (const a of answers) if (ok(a)) return a;

    // The keeper's own tools.
    const sig = SIGNATURE[hero];
    if (n >= 2 && !has(sig)) {
      const w = ok({ kind: sig, place: SIGNATURE_PLACE[sig] ?? "cover", why: "keeper" });
      if (w) return w;
    }
    for (const step of KEEPER_PLAN[hero] ?? []) {
      if (n < (kit.keeperAt?.[step.kind] ?? step.at) || has(step.kind) || (step.waveMax && world.hud.wave > step.waveMax)) continue;
      if (step.kind === "copycat" && !has("mimic")) continue;
      if (step.kind === "flask" && has("fire")) continue;
      const w = ok({ kind: step.kind, place: step.place, why: "keeper" });
      if (w) return w;
    }
    // Quackarot's Anti-Geese Protocol before a boss or a top-threat wave.
    if (hero === "quack" && world.hud.phase === "prep" && n >= 5 && !has("geese") && !world.hud.geeseSpent && now && (now.groups.some((g) => g.boss) || now.pips >= 4)) {
      const w = ok({ kind: "geese", place: "late", why: "keeper" });
      if (w) return w;
    }

    // Combos: a lamp where it lights three or more cannons, an ink well over the busiest overlap.
    const lamps = count("lantern");
    if (n >= 3 && lamps < 1 + Math.floor(n / 6) && !skip.has("lantern")) {
      const lr = lampReach();
      const best = (() => {
        let most = 0;
        for (let c = 0; c < world.cols; c++)
          for (let r = 0; r < world.rows; r++) {
            if (!free(c, r)) continue;
            const { x, y } = centre({ c, r });
            const dark = sh.filter((t) => !api.statsOf(t.id)?.lit && (t.x - x) ** 2 + (t.y - y) ** 2 <= lr * lr).length;
            most = Math.max(most, dark);
          }
        return most;
      })();
      if (best >= 3) return { kind: "lantern", place: "lamp", why: "lamp" };
    }
    if (n >= 6 && world.hud.wave >= 5 && count("ink") < (n >= 12 ? 2 : 1) && !skip.has("ink")) return { kind: "ink", place: "overlap", why: "ink" };
    // A heavy cannon once the board is up and the seeds are there.
    if (n >= 8 && world.hud.wave >= 8 && !has("organ") && !skip.has("organ")) return { kind: "organ", place: "cover", why: "heavy" };

    return coreWant(skip);
  };

  /** The next cannon in the cycle (Vael, planning a Flask, keeps Fire off the wet carpet). */
  const coreWant = (skip: Set<TowerKind>): Want | null => {
    for (let i = 0; i < CORE.length; i++) {
      let k = CORE[(coreBuilt + i) % CORE.length];
      if (hero === "vael" && k === "fire") k = "still";
      if (!skip.has(k)) return { kind: k, place: "cover", why: "core" };
    }
    return null;
  };
  /** Cannons a decent player wants down before saving up for an extra: one more than the wave number, up to 8. */
  const thin = () => shooters().length < Math.min(8, 1 + world.hud.wave);

  /** Seeds a kind costs right now (keeper discounts and Sir Michael's Hoard included). */
  const priceOf = (kind: TowerKind) => {
    api.chooseBuild(kind);
    return world.hud.towerCost;
  };

  // ---------- the back room ----------
  /** The best fitting to buy now, if it beats another cannon for the seeds. */
  const bestFitting = (towerPrice: number) => {
    const sh = shooters();
    if (sh.length < 4) return null;
    const dmg = new Map<TowerKind, number>();
    let total = 0;
    for (const t of sh) {
      const d = api.tallyOf(t.id)?.dmg ?? 0;
      dmg.set(t.kind, (dmg.get(t.kind) ?? 0) + d);
      total += d;
    }
    let best: { kind: TowerKind; mod: ModId; price: number; perSeed: number } | null = null;
    for (const kind of new Set(sh.map((t) => t.kind))) {
      const left = fittingsFor(kind).filter((m) => !(world.hud.fitted[kind] ?? []).includes(m.id));
      if (!left.length) continue;
      const price = api.shopPriceFor(kind);
      const share = total > 0 ? (dmg.get(kind) ?? 0) / total : count(kind) / sh.length;
      const a = api.previewStats(kind);
      for (const m of left) {
        const b = api.previewStats(kind, undefined, [m.id]);
        const rate = (s: { dmg: number; interval: number }) => (s.interval > 0 ? s.dmg / s.interval : s.dmg);
        let gain = (rate(b) / Math.max(1e-6, rate(a))) * (a.range > 0 ? Math.min(1.5, b.range / a.range) : 1) - 1;
        if (gain <= 0.001) gain = 0.1; // an effect the numbers don't show (a slow, a frost, a longer puddle)
        const perSeed = (share * gain) / Math.max(1, price);
        if (!best || perSeed > best.perSeed) best = { kind, mod: m.id, price, perSeed };
      }
    }
    // Another cannon adds about one cannon's share of the damage.
    const cannonPerSeed = 1 / (sh.length + 1) / Math.max(1, towerPrice);
    return best && best.perSeed >= cannonPerSeed ? best : null;
  };

  const buyFitting = (f: { kind: TowerKind; mod: ModId; price: number }) => {
    const before = kit.purse();
    api.openShop(f.kind);
    api.pickMod(f.mod);
    api.closeShop();
    kit.spend(f.kind, before);
    if (kit.purse() < before) why["back room"] = (why["back room"] ?? 0) + 1;
    return kit.purse() < before;
  };

  // ---------- each check ----------
  const tryBuild = (want: Want) => {
    if (kit.maxTowers != null && world.towers.length >= kit.maxTowers) return "poor" as const;
    if (world.hud.seeds < priceOf(want.kind)) return "poor" as const;
    const spot = spotFor(want);
    if (!spot) return "nowhere" as const;
    api.dismissSelection();
    api.chooseBuild(want.kind);
    if (!kit.place(want.kind, spot)) return "nowhere" as const;
    why[want.why] = (why[want.why] ?? 0) + 1;
    if (want.why === "core") coreBuilt++;
    if (want.why === "opener") openerAt++;
    return "built" as const;
  };

  const build = () => {
    const phase = world.hud.phase;
    if (phase === "combat" && lastPhase !== "combat") livesAtWave = world.hud.lives;
    lastPhase = phase;
    // Sir Michael merges pairs into Great towers once the floor has enough cannons (merging early leaves carpet bare).
    if (shooters().length >= 5) kit.dragonChores();
    const skip = new Set<TowerKind>(kit.avoid ?? []);
    let mods = 0;
    for (let guard = 0; guard < (phase === "prep" ? 12 : 2); guard++) {
      const opening = kit.opener && openerAt < kit.opener.length ? kit.opener[openerAt] : null;
      const want: Want | null = opening ? { kind: opening, place: PLACE_OF[opening] ?? "cover", why: "opener" } : nextWant(skip);
      if (!want) break;
      // During a wave: urgent answers, or a cannon near the door once fruit have got through; otherwise keep saving.
      if (phase === "combat" && !want.urgent) {
        const leaking = world.hud.lives < livesAtWave;
        const price = priceOf(want.kind);
        if (leaking && world.hud.seeds >= priceOf("melon") && world.hud.seeds < price) {
          const r = tryBuild({ kind: "melon", place: "late", why: "leak" });
          if (r !== "built") break;
          continue;
        }
        if (world.hud.seeds < price) break;
      }
      // Between waves: a back-room fitting first, when it's better value than what's next on the list.
      if (phase === "prep" && !want.urgent && mods < 2) {
        const f = bestFitting(priceOf(want.kind));
        if (f && world.hud.seeds >= f.price && buyFitting(f)) {
          mods++;
          continue;
        }
      }
      const r = tryBuild(want);
      if (r === "poor") {
        // Save up for it, unless it's an extra and the floor is thin: then a plain cannon now.
        const core = !want.urgent && want.why !== "core" && thin() ? coreWant(skip) : null;
        if (core && tryBuild(core) === "built") continue;
        break;
      }
      if (r === "nowhere") {
        if (want.why === "opener") openerAt++; // no tile for it: the plan moves on
        else skip.add(want.kind);
      }
    }
    api.dismissSelection();
  };

  return { build, why };
}
