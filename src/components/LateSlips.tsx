import { Check } from "lucide-react";
import { MAX_SLIPS, SLIPS, createWorld, slipXp } from "@/game/engine";
import { tone } from "@/game/audio";

/** Setup, the Overflow: take up to three late slips. Harder night, more keeper XP. */
export function SlipPicker({ api, onGesture }: { api: ReturnType<typeof createWorld>; onGesture: () => void }) {
  const hud = api.world.hud;
  const taken = hud.slips;
  const full = taken.length >= MAX_SLIPS;
  const bonus = Math.round(slipXp(taken) * 100);
  const label = "text-[10px] tracking-[0.22em] text-gold uppercase";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={label}>Late slips</p>
        <p className="text-xs text-muted">
          {taken.length}/{MAX_SLIPS} taken{bonus ? ` · +${bonus}% XP` : ""}
        </p>
      </div>
      <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Late slips">
        {SLIPS.map((s) => {
          const on = taken.includes(s.id);
          const blocked = !on && full;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              aria-disabled={blocked}
              title={blocked ? `Three slips at most. ${s.blurb}` : s.blurb}
              className={`flex min-h-12 items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left ${
                on
                  ? "border-[#c6a15a] bg-[linear-gradient(180deg,#d4b06a_0%,#9a7438_100%)] text-ink"
                  : blocked
                    ? "cursor-not-allowed border-line/40 text-muted/70"
                    : "border-line/70 bg-panel text-parchment"
              }`}
              onClick={() => {
                if (blocked) return;
                onGesture();
                tone(on ? 260 : 340, 0.06, "triangle", 0.03);
                api.toggleSlip(s.id);
              }}
            >
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${on ? "border-ink/60 bg-ink/15" : "border-line"}`}
                aria-hidden="true"
              >
                {on ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold">{s.name}</span>
                  <span className={`text-[11px] font-semibold ${on ? "text-ink" : "text-gold"}`}>+{Math.round(s.xp * 100)}% XP</span>
                </span>
                <span className={`mt-0.5 block text-[11px] leading-tight ${on ? "text-ink/80" : "text-muted"}`}>{s.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-sm text-muted">Optional. Each slip makes tonight harder and pays your keeper more XP.</p>
    </div>
  );
}
