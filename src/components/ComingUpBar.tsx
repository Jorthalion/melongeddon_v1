import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Crown, TriangleAlert } from "lucide-react";
import { BOARDS, DOOR_LETTER, DOOR_NAME, EXIT_COLOR, EXIT_NAME, NATIVE_INFO, exitCostText, type WaveGroup } from "@/game/engine";
import { describeEnemy, fruitFromGroup } from "@/game/enemyInfo";
import { COUNTERS, countersFor, unanswered, type BuildInfo } from "@/game/counters";
import { enemySpriteSrc } from "@/game/draw";
import { EnemyCardBody } from "@/components/EnemyCard";
import { load, save } from "@/lib/storage";
import type { GameApi } from "@/components/ui";

/** Settings: the Coming up bar is on unless switched off. */
export const WAVEBAR_KEY = "melongeddon-wavebar";
const EVENT = "melongeddon:wavebar";
export const waveBarOn = () => load(WAVEBAR_KEY) !== "off";
export function setWaveBar(on: boolean) {
  save(WAVEBAR_KEY, on ? "" : "off");
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Stand-in colours (and a letter) while an enemy's painted sprite hasn't arrived yet. */
const STAND_IN: Record<string, { fill: string; letter: string }> = {
  melon: { fill: "#3f9a5c", letter: "M" },
  corn: { fill: "#e6c36a", letter: "C" },
  pumpkin: { fill: "#e8883a", letter: "P" },
  karl: { fill: "#c0502a", letter: "K" },
  goose: { fill: "#f4f1e8", letter: "G" },
  cat: { fill: "#d8954a", letter: "C" },
};

/** The chip's picture: the enemy's own sprite, or a drawn stand-in if it hasn't been painted yet. */
function ChipPicture({ src, kind }: { src: string; kind: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    const s = STAND_IN[kind] ?? { fill: "#c4aa96", letter: "?" };
    return (
      <span className="grid h-full w-full place-items-center rounded-full text-[0.6875rem] font-bold text-[#1a1014]" style={{ backgroundColor: s.fill }}>
        {s.letter}
      </span>
    );
  }
  return <img src={src} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} />;
}

/** A group's modifier badges: the marks the board draws on fruit, as short labels. */
function badges(g: WaveGroup): Array<{ text: string; title: string; tone: string }> {
  const out: Array<{ text: string; title: string; tone: string }> = [];
  if (g.guard === "rind") out.push({ text: "shell", title: "Shell: the first hit only cracks it", tone: "#f3e2c4" });
  if (g.guard === "husk") out.push({ text: "husk", title: "Husk: freeze, slows and the Bell don't work", tone: "#e6c36a" });
  if (g.guard === "damp") out.push({ text: "damp", title: "Damp: fire barely works", tone: "#8fbcd8" });
  if (g.split) out.push({ text: "split", title: "Split: cracks into four melons", tone: "#f3e2c4" });
  if (g.raw) out.push({ text: "raw", title: "Raw: the first burn bakes it into bread", tone: "#e8b56a" });
  if (g.pit) out.push({ text: "pit", title: "Stone: splash, fire and puddles barely touch it", tone: "#b0a896" });
  if (g.gall) out.push({ text: "gall", title: "A gall rides behind it and heals it", tone: "#6fbf4a" });
  if (g.borrower) out.push({ text: "seeds", title: "A borrower takes seeds at the door", tone: "#e6c36a" });
  if (g.chute) out.push({ text: "↩ chute", title: "Up the chute: comes in at the door and walks back", tone: "#8fbcd8" });
  if (g.siege === "para") out.push({ text: "drop", title: "Paratrooper: lands on a drop point halfway", tone: "#d8c9a8" });
  if (g.siege === "boxed") out.push({ text: "box", title: "Box Cat: aimed shots can't target it", tone: "#d8b98a" });
  if (g.native) out.push({ text: "room", title: `${NATIVE_INFO[g.native].name}: this room's own fruit`, tone: "#8fdc6a" });
  if (g.mini) out.push({ text: "mini", title: "Mini-boss: much less health than the finale's", tone: "#e6c36a" });
  return out;
}

/**
 * The Coming up bar: a slim strip over the board. Between waves, the next wave; during one, what's still to
 * come. One chip per group of identical enemies, in spawn order (tap or hover for the enemy card), threat
 * pips against tonight's other waves, up to three warnings, and a gentle line when nothing you've built
 * answers something in it. Never pauses the game or takes focus from the board.
 */
export function ComingUpBar({ api }: { api: GameApi }) {
  const hud = api.world.hud;
  const [on, setOn] = useState(waveBarOn);
  const [, setTick] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => setOn(waveBarOn());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  // During a wave the list counts down: look again a few times a second.
  useEffect(() => {
    if (hud.phase !== "combat") return;
    const t = window.setInterval(() => setTick((n) => n + 1), 400);
    return () => window.clearInterval(t);
  }, [hud.phase]);
  // Esc or a click elsewhere closes an open card.
  useEffect(() => {
    if (open == null) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      setOpen(null);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  if (!on) return null;
  const preview = api.comingUp();
  const between = hud.phase !== "combat";
  if (!preview.groups.length && !between) return null;

  // "Your towers don't answer…": between waves only, not in the tutorial's first two waves.
  const kinds = new Set(api.world.towers.map((t) => (t.kind === "copycat" && t.copy ? t.copy.kind : t.kind)));
  const build: BuildInfo = { kinds, upgrades: hud.upgrades, dropsCovered: preview.drops.every((d) => api.dropCovered(d)) };
  const needs = [...new Set(preview.groups.flatMap((g) => countersFor({ ...g, boss: g.boss, para: g.siege === "para" })))];
  const quiet = hud.tutorial && preview.index < 2;
  const missing = between && !quiet && api.world.towers.length > 0 ? unanswered(needs, build) : [];

  return (
    <div ref={box} data-board-controls className="relative z-10 shrink-0 border-b border-line/60 bg-ink/85 px-2 py-1 text-[0.8125rem]">
      <div className="flex items-center gap-2">
        <p className="shrink-0 text-[0.6875rem] leading-tight tracking-[0.14em] text-gold uppercase">
          {between ? `Next · wave ${preview.index + 1}` : "Still to come"}
          <span className="hidden normal-case tracking-normal text-muted sm:inline"> · {preview.name}</span>
        </p>
        <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5" aria-label="Enemies coming">
          {preview.groups.map((g, i) => {
            const marks = badges(g);
            const src = enemySpriteSrc(g);
            return (
              <li key={i} className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={open === i}
                  title={`${describeEnemy(fruitFromGroup(g), api.world).name} ×${g.count}${g.door ? ` · ${DOOR_NAME[g.door]}` : ""}${g.exit ? ` · out by the ${EXIT_NAME[g.exit]}` : ""}${marks.length ? ` · ${marks.map((m) => m.text).join(", ")}` : ""}`}
                  className={`flex items-center gap-1 rounded-md border px-1 py-0.5 ${g.boss ? "border-gold bg-[#3a242c]" : open === i ? "border-[#c6a15a] bg-[#2c1b21]" : "border-line/70 bg-panel/70"} hover:border-[#c6a15a]`}
                  onClick={() => setOpen(open === i ? null : i)}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setOpen(i);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") setOpen(null);
                  }}
                >
                  <span className={`relative grid shrink-0 place-items-center ${g.boss ? "size-7" : "size-6"}`}>
                    <ChipPicture key={src} src={src} kind={g.kind} />
                    {g.boss ? <Crown className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 text-gold" aria-hidden="true" /> : null}
                  </span>
                  <span className="font-semibold text-parchment">×{g.count}</span>
                  {/* A board with doors: which door this group comes in by. */}
                  {g.door ? (
                    <span className="rounded-sm border border-gold/60 px-0.5 text-[0.625rem] leading-tight font-semibold text-gold" aria-label={DOOR_NAME[g.door]}>
                      {DOOR_LETTER[g.door]}
                    </span>
                  ) : null}
                  {/* A board with exits: a small door in the colour of the exit this group leaves by. */}
                  {g.exit ? (
                    <span
                      className="inline-block h-3 w-2 rounded-t-sm border"
                      style={{ backgroundColor: EXIT_COLOR[g.exit], borderColor: `${EXIT_COLOR[g.exit]}` }}
                      aria-label={`Out by the ${EXIT_NAME[g.exit]}`}
                    />
                  ) : null}
                  {marks.length ? (
                    <span className="flex gap-0.5">
                      {marks.map((m) => (
                        <span key={m.text} title={m.title} className="hidden rounded px-0.5 text-[0.8125rem] leading-tight sm:inline" style={{ color: m.tone, border: `1px solid ${m.tone}55` }}>
                          {m.text}
                        </span>
                      ))}
                      {/* Phones: one dot per mark; the card has the detail. */}
                      {marks.map((m) => (
                        <span key={`${m.text}-dot`} className="size-1.5 rounded-full sm:hidden" style={{ backgroundColor: m.tone }} aria-hidden="true" />
                      ))}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          {!preview.groups.length ? <li className="text-muted">Nothing left to come.</li> : null}
        </ul>
        {/* Threat: pips against tonight's other waves, and against the wave before. */}
        <div className="flex shrink-0 items-center gap-1" title={`Threat ${preview.pips} of 5 against tonight's waves${preview.trend === "up" ? ", tougher than the last" : preview.trend === "down" ? ", a breather after the last" : ""}`}>
          <span className="flex gap-0.5" aria-label={`Threat ${preview.pips} of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`h-2.5 w-1.5 rounded-sm ${n <= preview.pips ? (preview.pips >= 4 ? "bg-flesh" : "bg-gold") : "bg-panel-2"}`} />
            ))}
          </span>
          {preview.trend === "up" ? <ArrowUp className="size-3 text-flesh" aria-label="Tougher" /> : preview.trend === "down" ? <ArrowDown className="size-3 text-[#8fdc6a]" aria-label="A breather" /> : null}
        </div>
      </div>
      {preview.flags.length || preview.notes.length || missing.length ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {preview.flags.map((f) => (
            <span key={f} className="rounded bg-flesh/15 px-1 text-[0.8125rem] font-semibold text-[#f2a0a8]">
              {f}
            </span>
          ))}
          {preview.notes.slice(0, 2).map((n) => (
            <span key={n} className="hidden text-[0.8125rem] text-muted sm:inline">
              {n}
            </span>
          ))}
          {missing.length ? (
            <span className="flex items-center gap-1 text-[0.8125rem] text-[#f2c86a]" role="status">
              <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
              Your towers don't answer {missing.map((id) => COUNTERS[id].label).join(", ")}: bring {missing.map((id) => COUNTERS[id].beats).join("; ")}.
            </span>
          ) : null}
        </div>
      ) : null}
      {open != null && preview.groups[open] ? (
        <div role="tooltip" className="absolute top-full left-2 z-30 mt-1 w-[17rem] rounded-lg border border-[#c6a15a]/70 bg-ink/95 px-3 py-2 text-left shadow-xl">
          <EnemyCardBody info={describeEnemy(fruitFromGroup(preview.groups[open]), api.world)} preview />
          <p className="mt-1.5 text-[0.8125rem] text-muted">
            ×{preview.groups[open].count} {between ? "next wave" : "still to come"}
            {BOARDS[hud.map].hp && BOARDS[hud.map].hp !== 1 ? " · this room's health included" : ""}
          </p>
          {(() => {
            const exitId = preview.groups[open].exit;
            const exit = exitId ? BOARDS[hud.map].exits?.find((x) => x.id === exitId) : undefined;
            return exit ? (
              <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-parchment">
                <span className="inline-block h-3 w-2 rounded-t-sm" style={{ backgroundColor: EXIT_COLOR[exit.id] }} aria-hidden="true" />
                {EXIT_NAME[exit.id]}: {exitCostText(exit)}
              </p>
            ) : null;
          })()}
        </div>
      ) : null}
    </div>
  );
}
