import { useEffect, useState } from "react";
import { describeEnemy, type EnemyInfo } from "@/game/enemyInfo";
import { effectColor } from "@/game/drawStatus";
import type { GameApi } from "@/components/ui";

/** The fruit under the mouse, and where the mouse is inside the board area (CSS px). */
export interface EnemyHover {
  id: number;
  x: number;
  y: number;
}

/** The card's contents: name, health, what it is, what's on it now, and what beats it. Shared with the Coming up bar. */
export function EnemyCardBody({ info, preview = false }: { info: EnemyInfo; preview?: boolean }) {
  return (
    <>
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-display text-base leading-tight font-semibold text-gold">{info.name}</span>
        <span className="shrink-0 text-xs text-parchment">{preview ? `${info.maxHp} health` : `${info.hp} / ${info.maxHp}`}</span>
      </p>
      {preview ? null : (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full bg-flesh" style={{ width: `${Math.min(100, (info.hp / Math.max(1, info.maxHp)) * 100)}%` }} />
        </div>
      )}
      {info.traits.length ? (
        <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-parchment">
          {info.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-muted">No armour or tricks.</p>
      )}
      {info.effects.length ? (
        <>
          <p className="mt-1.5 text-[0.625rem] tracking-[0.16em] text-gold uppercase">Right now</p>
          <ul className="flex flex-col gap-0.5 text-xs text-[#9fd4f0]">
            {info.effects.map((t) => {
              const tone = effectColor(t);
              return (
                <li key={t} className="flex items-baseline gap-1.5" style={tone ? { color: tone } : undefined}>
                  <span aria-hidden="true" className="inline-block size-1.5 shrink-0 rounded-full" style={{ background: tone ?? "currentColor" }} />
                  {t}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {info.beats.length ? (
        <>
          <p className="mt-1.5 text-[0.625rem] tracking-[0.16em] text-gold uppercase">Beaten by</p>
          <ul className="flex flex-col gap-0.5 text-xs text-[#b8e0a0]">
            {info.beats.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/**
 * Hover card for a fruit on the board: its name, health, what it is (armour, marks, its own rules),
 * what's on it right now, and what beats it. Mouse only; it follows the fruit's numbers live while the mouse rests.
 */
export function EnemyCard({ api, hover, boxW }: { api: GameApi; hover: EnemyHover; boxW: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 150);
    return () => window.clearInterval(t);
  }, []);
  const e = api.world.enemies.find((f) => f.id === hover.id && f.hp > 0);
  if (!e) return null;
  const info = describeEnemy(e, api.world);
  // Keep the card on the board: flip to the left of the mouse near the right edge.
  const flip = hover.x > boxW - 300;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-[17rem] rounded-lg border border-[#c6a15a]/70 bg-ink/95 px-3 py-2 text-left shadow-xl"
      style={{ left: flip ? undefined : hover.x + 16, right: flip ? boxW - hover.x + 16 : undefined, top: Math.max(8, hover.y - 12) }}
    >
      <EnemyCardBody info={info} />
    </div>
  );
}
