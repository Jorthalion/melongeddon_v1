/**
 * The checkout card: everything "borrowed" for tonight's run (upgrade cards, keeper perks, the
 * bookmark, the keeper's own rules, late slips, fittings), as plain data for the panel and tests.
 * A view only: every total comes from the numbers the engine reads, never from blurb text.
 */
import { ASSER_VALUES, KEEPER_NAMES, OATH_TEXT, SIGNATURE, TOWERS, UPGRADES } from "./rules.ts";
import { activePerks, levelFor, perkFx } from "./levels.ts";
import { BOOKMARK, BOOKMARK_VALUES } from "./meta.ts";
import { SLIP, SLIP_VALUES } from "./slips.ts";
import type { Hud } from "./engine.ts";

export type CheckoutGroupId = "cards" | "perks" | "bookmark" | "keeper" | "slips" | "fittings";

export interface CheckoutEntry {
  name: string;
  blurb: string;
  tone: "buff" | "drawback" | "info";
  /** A small note beside the name (the Doctor's pick). */
  note?: string;
}

export interface CheckoutCard {
  totals: string[];
  groups: Array<{ id: CheckoutGroupId; title: string; entries: CheckoutEntry[] }>;
  /** Entries across cards, perks, bookmark and slips (the badge number). */
  count: number;
}

/** Shown while nothing is checked out. The pick waves are the same on every night (see nextBeat). */
export const CHECKOUT_EMPTY = "Nothing checked out yet. Cards come after waves 1, 2 and 6.";

const pct = (mul: number) => Math.round((mul - 1) * 100);
const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

/**
 * `keeperLine` is the keeper's one line from the setup card (components/keeperCards), used for
 * keepers without a live rule to show here.
 */
export function checkoutCard(hud: Hud, keeperLine?: string): CheckoutCard {
  const hero = hud.hero;
  // The engine reads perks as they were when the run started (XP earned tonight doesn't add any).
  const rec = hero ? { ...hud.keepers[hero], xp: hud.xpStart } : undefined;
  const fx = perkFx(hero, rec);
  const groups: CheckoutCard["groups"] = [];

  // Cards, in pick order (the Doctor's picks marked).
  const seen = new Set<string>();
  const cards: CheckoutEntry[] = [];
  for (const pick of hud.cardPicks) {
    if (seen.has(pick.id)) continue;
    seen.add(pick.id);
    const u = UPGRADES[pick.id];
    cards.push({ name: u.name, blurb: u.blurb, tone: "buff", ...(pick.pick ? { note: "Doctor's pick" } : {}) });
  }
  if (cards.length) groups.push({ id: "cards", title: "Cards", entries: cards });

  const perks = activePerks(hero, rec).map((p): CheckoutEntry => ({ name: p.name, blurb: p.blurb, tone: "buff" }));
  if (perks.length) groups.push({ id: "perks", title: `Perks (level ${levelFor(hud.xpStart)})`, entries: perks });

  const bookmark = hud.bookmark ? BOOKMARK[hud.bookmark] : null;
  if (bookmark) groups.push({ id: "bookmark", title: "Bookmark", entries: [{ name: bookmark.name, blurb: bookmark.blurb, tone: "buff" }] });

  // The keeper's own rules this run.
  const keeper: CheckoutEntry[] = [];
  let sisuMul = 1;
  if (hero === "michael") {
    const oath = hud.oath ? OATH_TEXT[hud.oath] : null;
    keeper.push(
      oath
        ? { name: oath.title, blurb: `“${oath.said}” ${oath.gain}. ${oath.cost}.`, tone: "buff" }
        : { name: "No oath yet", blurb: "He says where he stands before the night starts.", tone: "info" },
    );
  } else if (hero === "asser") {
    const cap = ASSER_VALUES.sisuCap + fx.sisuCap;
    const per = ASSER_VALUES.sisuPerStack + fx.sisuPerStack;
    const missing = Math.min(cap, Math.max(0, hud.maxLives - hud.lives));
    sisuMul = 1 + missing * per;
    keeper.push({
      name: `Sisu +${pct(sisuMul)}%`,
      blurb: `All his towers hit ${Math.round(per * 100)}% harder for every stack he is missing, up to ${cap}. Missing now: ${missing}.`,
      tone: missing > 0 ? "buff" : "info",
    });
  } else if (hero && keeperLine) {
    keeper.push({ name: KEEPER_NAMES[hero].name, blurb: keeperLine, tone: "info" });
  }
  if (keeper.length) groups.push({ id: "keeper", title: "Keeper", entries: keeper });

  const slips = hud.night === "overflow" ? hud.slips.map((id): CheckoutEntry => ({ name: SLIP[id].name, blurb: SLIP[id].blurb, tone: "drawback" })) : [];
  if (slips.length) groups.push({ id: "slips", title: "Late slips", entries: slips });

  const fitted = Object.values(hud.fitted).filter((mods) => mods && mods.length);
  const fittings = fitted.reduce((n, mods) => n + (mods?.length ?? 0), 0);
  if (fittings) {
    groups.push({
      id: "fittings",
      title: "Back room",
      entries: [
        {
          name: `${fittings} fitting${fittings === 1 ? "" : "s"} on ${fitted.length} kind${fitted.length === 1 ? "" : "s"} of tower`,
          blurb: "Tap a tower to see its own.",
          tone: "info",
        },
      ],
    });
  }

  // Totals: damage multiplies (perks × Sisu on the tower, then Damp Powder on every hit).
  const totals: string[] = [];
  const damp = hud.night === "overflow" && hud.slips.includes("damp") ? SLIP_VALUES.dampDamage : 1;
  const dmg = pct(fx.allDmg * sisuMul * damp);
  if (dmg) totals.push(`All cannons ${signed(dmg)}% damage`);
  const range = pct(fx.allRange);
  if (range) totals.push(`All cannons ${signed(range)}% reach`);
  if (hero) {
    const sig = TOWERS[SIGNATURE[hero]].name;
    if (pct(fx.sigDmg)) totals.push(`${sig} ${signed(pct(fx.sigDmg))}% more damage`);
    if (pct(fx.sigRange)) totals.push(`${sig} ${signed(pct(fx.sigRange))}% more reach`);
    if (fx.sigPace !== 1) totals.push(`${sig} fires ${Math.round((1 / fx.sigPace - 1) * 100)}% faster`);
    if (fx.sigCost) totals.push(`${sig} costs ${fx.sigCost} seeds less`);
  }
  const perKill = fx.killSeeds + (hud.bookmark === "latefee" ? BOOKMARK_VALUES.latefee : 0);
  if (perKill) totals.push(`+${perKill} seed${perKill === 1 ? "" : "s"} a kill`);
  if (fx.waveSeeds) totals.push(`+${fx.waveSeeds} seeds a wave`);
  if (hud.bookmark === "discount") totals.push(`Every cannon costs ${BOOKMARK_VALUES.discount} seeds less`);

  return { totals, groups, count: cards.length + perks.length + (bookmark ? 1 : 0) + slips.length };
}
