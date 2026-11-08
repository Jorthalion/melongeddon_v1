import { Lock } from "lucide-react";
import {
  KEEPER_NAMES,
  MAX_LEVEL,
  PERKS,
  PERK_LEVELS,
  createWorld,
  levelFor,
  levelProgress,
  slipXp,
  type Hud,
  type HeroId,
} from "@/game/engine";
import { tone } from "@/game/audio";

/** "Lv 3" badge for a keeper portrait. */
export function LevelBadge({ hud, hero }: { hud: Hud; hero: HeroId }) {
  const level = levelFor(hud.keepers[hero].xp);
  return (
    <span
      className="absolute top-1.5 right-1.5 rounded-md md:top-4 md:right-4 border border-[#c6a15a]/80 bg-ink/85 px-1.5 py-0.5 text-[11px] font-semibold text-gold"
      aria-hidden="true"
    >
      Lv {level}
    </span>
  );
}

/** Thin XP bar with "Level 3 · 40/160 XP". */
export function XpBar({ xp, label = true }: { xp: number; label?: boolean }) {
  const { level, into, need } = levelProgress(xp);
  const pct = need ? Math.round((into / need) * 100) : 100;
  return (
    <div>
      {label ? (
        <p className="flex justify-between text-xs text-muted">
          <span className="font-semibold text-parchment">Level {level}</span>
          <span>{need ? `${into}/${need} XP` : "Top level"}</span>
        </p>
      ) : null}
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/60"
        role="progressbar"
        aria-label={`Level ${level} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#9a7438,#d4b06a)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Setup: the chosen keeper's level and their five perk choices. */
export function PerkPicker({ api, onGesture }: { api: ReturnType<typeof createWorld>; onGesture: () => void }) {
  const hud = api.world.hud;
  const hero = hud.hero;
  const label = "text-[10px] tracking-[0.22em] text-gold uppercase";
  if (!hero) {
    return (
      <div>
        <p className={label}>Perks</p>
        <p className="mt-1.5 text-sm text-muted">Pick a keeper to see their level and perks.</p>
      </div>
    );
  }
  const rec = hud.keepers[hero];
  const level = levelFor(rec.xp);
  const open = PERK_LEVELS.filter((at) => level >= at).length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={label}>{KEEPER_NAMES[hero].name}'s perks</p>
        <p className="text-xs text-muted">
          {open}/{PERK_LEVELS.length} open · one per row
        </p>
      </div>
      <div className="mt-1.5 sm:max-w-xl">
        <XpBar xp={rec.xp} />
      </div>
      <div className="mt-2 grid gap-1.5">
        {PERKS[hero].map((pair, tier) => {
          const at = PERK_LEVELS[tier];
          const locked = level < at;
          const pick = rec.picks[tier];
          return (
            <div key={at} className="grid grid-cols-[3.25rem_1fr_1fr] items-stretch gap-1.5" role="radiogroup" aria-label={`Level ${at} perk`}>
              <span className={`flex items-center gap-1 text-xs font-semibold ${locked ? "text-muted" : "text-gold"}`}>
                {locked ? <Lock className="size-3 shrink-0" aria-hidden="true" /> : null}
                Lv {at}
              </span>
              {pair.map((perk, i) => {
                const on = !locked && pick === i;
                return (
                  <button
                    key={perk.name}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-disabled={locked}
                    title={locked ? `Opens at level ${at}. ${perk.blurb}` : perk.blurb}
                    className={`min-h-12 rounded-lg border px-2 py-1.5 text-left ${
                      on
                        ? "border-[#c6a15a] bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink"
                        : locked
                          ? "cursor-not-allowed border-line/40 bg-transparent text-muted/70"
                          : "border-line/70 bg-panel text-parchment"
                    }`}
                    onClick={() => {
                      if (locked) return;
                      onGesture();
                      tone(i ? 320 : 280, 0.06, "triangle", 0.03);
                      api.setPerk(tier, i as 0 | 1);
                    }}
                  >
                    <span className="block text-xs font-semibold">{perk.name}</span>
                    <span className={`mt-0.5 block text-[11px] leading-tight ${on ? "text-ink/80" : "text-muted"}`}>{perk.blurb}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {level >= MAX_LEVEL
          ? "Top level. Swap perks before any night."
          : "Keepers earn XP for every wave they clear, more on harder difficulties and for a win."}
      </p>
    </div>
  );
}

/** End-of-run: XP earned this run, the bar, and any level reached. */
export function XpSummary({ hud }: { hud: Hud }) {
  const hero = hud.hero;
  if (!hero || hud.xpRun <= 0) return null;
  const xp = hud.keepers[hero].xp;
  const from = levelFor(hud.xpStart);
  const to = levelFor(xp);
  const perks = PERK_LEVELS.filter((at) => at > from && at <= to);
  return (
    <div className="mt-3 rounded-lg border border-line/70 bg-panel/60 px-3 py-2">
      <p className="text-sm">
        <span className="font-semibold text-gold">+{hud.xpRun} XP</span>{" "}
        <span className="text-muted">
          for {KEEPER_NAMES[hero].name}
          {hud.night === "overflow" && hud.slips.length ? `, with +${Math.round(slipXp(hud.slips) * 100)}% from late slips` : ""}.
        </span>
        {to > from ? <span className="font-semibold text-parchment"> Level {to}!</span> : null}
      </p>
      <div className="mt-1">
        <XpBar xp={xp} />
      </div>
      {perks.length ? (
        <p className="mt-1 text-xs text-gold">
          New perk choice{perks.length > 1 ? "s" : ""} at level {perks.join(" and ")}. Pick on the setup screen (Change setup).
        </p>
      ) : null}
    </div>
  );
}
