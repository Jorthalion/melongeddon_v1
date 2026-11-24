import { useRef, useState } from "react";
import { GUIDE_STEPS, GUIDE_TALK, TOWERS, type GuideStep, type Hud } from "@/game/engine";
import { HEAVY_SEEDS, HEAVY_WAVE } from "@/game/rules";
import { asset } from "@/lib/asset";
import type { GameApi } from "@/components/ui";

/**
 * Mynxi's tutorial: a speech box over the board. During the lessons (hud.guide) she walks through
 * one step at a time; talk steps have a Next button, the rest wait for the player. After the
 * lessons, for the rest of the tutorial night, she chips in once when something new happens.
 */

/** Her expressions (art briefs in docs/art/MYNXI_PROMPTS.md). */
type Mood = "talk" | "point" | "cheer" | "worried";
const FACE: Record<Mood, string> = {
  talk: asset("sprites/mynxi-talk.webp"),
  point: asset("sprites/mynxi-point.webp"),
  cheer: asset("sprites/mynxi-cheer.webp"),
  worried: asset("sprites/mynxi-worried.webp"),
};

const LESSON: Record<GuideStep, { mood: Mood; title: string; text: string }> = {
  welcome: {
    mood: "talk",
    title: "Welcome to the Midnight Library",
    text: "I'm Mynxi, head librarian. Tonight the produce wants in, and I'd rather it didn't. Let me show you how we keep them out.",
  },
  carpet: {
    mood: "point",
    title: "The carpet is the only road in",
    text: "Fruit walk the red carpet from the entrance on the left to the door at the far end. Each one that gets through knocks over a stack of books: your stacks are the heart up top. Run out and the night is over.",
  },
  seeds: {
    mood: "talk",
    title: "Seeds pay for everything",
    text: "The coin up top is your seeds. Every fruit you pop pays more. My first cannon of the night only costs 40.",
  },
  damage: {
    mood: "point",
    title: "Build a Damage cannon",
    text: "The Melon cannon is already picked on the Damage tab (Q). Tap a floor tile right beside the carpet. The inside of a bend covers two stretches at once.",
  },
  range: {
    mood: "cheer",
    title: "Lovely",
    text: "The Melon cannon stays picked, so another tap on the floor builds another. Tap a cannon you've built to see its ring, its stats, sell it, or open its upgrades. Esc puts it down again.",
  },
  support: {
    mood: "talk",
    title: "Add a Control or Support tower",
    text: "One cannon won't hold a whole night. Open Control (W): a Still or Freeze slows fruit so your damage has time to work. Or Support (E): a Reading Lamp makes its neighbours reach farther.",
  },
  tabs: {
    mood: "talk",
    title: "Six tabs, six jobs",
    text: `Damage pops, Control slows, Support makes the rest better. R is my own Card Catalogue: long reach, and every shot chains into two more fruit. Trick cannons (T) open as I level up, and Heavy cannons (Y) at wave ${HEAVY_WAVE}, or once you hold ${HEAVY_SEEDS} seeds.`,
  },
  start: {
    mood: "point",
    title: "Start the wave",
    text: "Spend what you like, then press Start wave (Space). You can keep building while they walk.",
  },
  speed: {
    mood: "talk",
    title: "Here they come",
    text: "The − and + buttons up top change the speed, and P pauses so you can think. Try one, or press Next.",
  },
  combat: {
    mood: "talk",
    title: "Hold the carpet",
    text: "Every pop pays seeds, so build more if you can afford it. When the wave is cleared, you'll pick an upgrade.",
  },
  upgrade: {
    mood: "point",
    title: "Pick an upgrade",
    text: "One card, and it lasts the whole night. Each pick shapes the next. The small tag by the name says what it reaches: a cannon upgrade does nothing for a Still. A gold edge means it's my own pick.",
  },
  backroom: {
    mood: "point",
    title: "The back room",
    text: "Before wave two, open the Back room (B, or its button) and buy an upgrade. It goes on every cannon of that kind, even ones you build later. Each kind's next upgrade costs more. This first one is on the house.",
  },
  sell: {
    mood: "cheer",
    title: "That's the basics, filed",
    text: "Selling a cannon (S) gives back 70% of what it cost. New night on the title screen is open now. Finish this night with me? I'll chime in when something new turns up.",
  },
};

/** One-off remarks for the rest of the tutorial night. The first that applies is shown until dismissed. */
const TIPS: Array<{ id: string; mood: Mood; title: string; text: string; when: (hud: Hud, api: GameApi) => boolean }> = [
  {
    id: "victory",
    mood: "cheer",
    title: "Filed under accidents that worked",
    text: "We held! From here it's your library: New night has every room, keeper and difficulty you've earned. My level goes up with every wave, and my perks with it.",
    when: (h) => h.phase === "victory",
  },
  {
    id: "defeat",
    mood: "worried",
    title: "The carpet won this time",
    text: "It happens to the best librarians. Try again, or pick Story difficulty from New night. More cannons near the bends next time.",
    when: (h) => h.phase === "defeat",
  },
  {
    id: "karl",
    mood: "worried",
    title: "That's Karl",
    text: "Slow, very tough, and three stacks if he gets through. Pop him and you get two back. Focus everything on him.",
    when: (h, api) => h.phase === "combat" && api.world.enemies.some((e) => e.kind === "karl"),
  },
  {
    id: "leak",
    mood: "worried",
    title: "A leak!",
    text: "Look for a stretch of carpet nothing reaches and build there. Corners are gold.",
    when: (h) => (h.phase === "prep" || h.phase === "combat") && h.lives < h.maxLives,
  },
  {
    id: "keeper",
    mood: "point",
    title: "My Card Catalogue",
    text: `You can afford it now: press R and put it where its long reach covers the most carpet. One at a time.`,
    when: (h, api) =>
      h.phase === "prep" &&
      h.wave >= 3 &&
      h.seeds >= TOWERS.catalogue.cost &&
      !api.world.towers.some((t) => t.kind === "catalogue"),
  },
  {
    id: "spend",
    mood: "point",
    title: "Seeds in your pocket don't pop fruit",
    text: "You've saved up plenty. Build another cannon or two before the next wave: the later waves bring more fruit, and a Mortar's splash is lovely on crowds.",
    when: (h) => h.phase === "prep" && h.wave >= 4 && h.seeds >= 150,
  },
  {
    id: "spend-again",
    mood: "worried",
    title: "More cannons, please",
    text: "The last waves are the busiest. If you have the seeds, fill a bend that nothing covers yet.",
    when: (h) => h.phase === "prep" && h.wave >= 9 && h.seeds >= 150,
  },
];

/**
 * `docked` (phones): the box sits in the layout above the board instead of over it, so the board
 * shrinks to fit below and the carpet stays in sight while a lesson waits for a tap.
 */
export function MynxiTutor({ api, onGesture, docked = false }: { api: GameApi; onGesture: () => void; docked?: boolean }) {
  const hud = api.world.hud;
  const seen = useRef(new Set<string>());
  const [, setTick] = useState(0);
  if (!hud.tutorial && !hud.guide) return null;

  const step = hud.guide;
  const tip = step ? null : TIPS.find((t) => !seen.current.has(t.id) && t.when(hud, api));
  const line = step ? LESSON[step] : tip;
  if (!line) return null;
  const talk = step != null && GUIDE_TALK.includes(step);
  const at = step ? GUIDE_STEPS.indexOf(step) : -1;

  return (
    <div
      className={
        docked
          ? "relative z-30 flex shrink-0 justify-center px-2 pb-1.5"
          : "pointer-events-none absolute inset-x-0 top-[3.75rem] z-30 flex justify-center px-3"
      }
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-xl border border-[#c6a15a]/80 bg-[#140c10]/95 p-3 shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
      >
        <img
          src={FACE[line.mood]}
          alt="Mynxi"
          className={`${docked ? "size-12" : "size-16 sm:size-20"} shrink-0 rounded-lg border border-[#c6a15a]/60 object-cover object-[center_18%]`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] tracking-[0.22em] text-gold uppercase">
            Mynxi{step ? ` · lesson ${at + 1} of ${GUIDE_STEPS.length}` : ""}
          </p>
          <p className="mt-0.5 font-display text-base leading-tight font-semibold text-[#f6e7b4]">{line.title}</p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-parchment sm:text-sm">{line.text}</p>
          <div className="mt-2 flex items-center gap-2">
            {step ? (
              <div className="flex flex-1 gap-0.5" aria-hidden="true">
                {GUIDE_STEPS.map((s, i) => (
                  <span key={s} className={`h-1 flex-1 rounded-full ${i < at ? "bg-gold" : i === at ? "bg-gold/60" : "bg-line"}`} />
                ))}
              </div>
            ) : (
              <span className="flex-1" />
            )}
            {talk || tip ? (
              <button
                type="button"
                className="min-h-8 shrink-0 rounded-md bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] px-3 text-sm font-semibold text-ink"
                onClick={() => {
                  onGesture();
                  if (tip) {
                    seen.current.add(tip.id);
                    setTick((n) => n + 1);
                  } else api.guideNext();
                }}
              >
                {tip ? "Got it" : step === "sell" ? "Let's go" : "Next"}
              </button>
            ) : (
              <span className="shrink-0 text-[0.8125rem] text-muted italic">Your move</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded px-1.5 py-0.5 text-[0.8125rem] text-muted underline"
          onClick={() => {
            onGesture();
            api.skipGuide();
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
