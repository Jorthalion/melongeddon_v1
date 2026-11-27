import { useEffect, useState } from "react";
import { describeEnemy, type EnemyInfo } from "@/game/enemyInfo";
import { effectColor } from "@/game/drawStatus";
import type { GameApi } from "@/components/ui";
import { shortNumber } from "@/lib/format";

/** The fruit under the mouse, and where the mouse is inside the board area (CSS px). */
export interface EnemyHover {
  id: number;
  x: number;
  y: number;
  /** The width of the area the card is placed in (CSS px), measured when the mouse moved. */
  w?: number;
}

/** The card's contents: name, health, what it is, what's on it now, and what beats it. Shared with the Coming up bar. */
export function EnemyCardBody({ info, preview = false }: { info: EnemyInfo; preview?: boolean }) {
  return (
    <>
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-display text-base leading-tight font-semibold text-gold">{info.name}</span>
        <span className="shrink-0 text-[0.8125rem] text-parchment">{preview ? `${shortNumber(info.maxHp)} health` : `${shortNumber(info.hp)} / ${shortNumber(info.maxHp)}`}</span>
      </p>
      {preview ? null : (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full bg-flesh" style={{ width: `${Math.min(100, (info.hp / Math.max(1, info.maxHp)) * 100)}%` }} />
        </div>
      )}
      {info.traits.length ? (
        <ul className="mt-1.5 flex flex-col gap-0.5 text-[0.8125rem] text-parchment">
          {info.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[0.8125rem] text-muted">No armour or tricks.</p>
      )}
      {info.effects.length ? (
        <>
          <p className="mt-1.5 text-[0.6875rem] tracking-[0.16em] text-gold uppercase">Right now</p>
          <ul className="flex flex-col gap-0.5 text-[0.8125rem] text-[#9fd4f0]">
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
          <p className="mt-1.5 text-[0.6875rem] tracking-[0.16em] text-gold uppercase">Beaten by</p>
          <ul className="flex flex-col gap-0.5 text-[0.8125rem] text-[#b8e0a0]">
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
  // Keep the card on the board: flip to the left of the mouse near the right edge, and never past either
  // edge (on a narrow board the flipped card used to start off the left side).
  const areaW = hover.w ?? boxW;
  // 17rem, but never wider than the area (big interface sizes on a small screen).
  const cardW = Math.min(17 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16), areaW - 16);
  const flip = hover.x > areaW - cardW - 28;
  const left = Math.max(8, Math.min(flip ? hover.x - 16 - cardW : hover.x + 16, areaW - cardW - 8));
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-[17rem] max-w-[calc(100%-1rem)] rounded-lg border border-[#c6a15a]/70 bg-ink/95 px-3 py-2 text-left shadow-xl"
      style={{ left, top: Math.max(8, hover.y - 12) }}
    >
      <EnemyCardBody info={info} />
    </div>
  );
}
