import { createContext, useContext, useState, type ReactNode } from "react";
import { createWorld } from "@/game/engine";
import { HOTKEY_HELP } from "@/components/hotkeys";
import { load, save } from "@/lib/storage";

/** Where the tips are docked: "full" shows the whole text (the wide layout's side column); "line" one line with a "more" toggle. */
export const TipFit = createContext<"full" | "line">("line");

/**
 * One tip box. Tips never sit on the board: they live in the tip dock (MelonGame), under the Coming up
 * bar, above the build bar on phones, or in the side column of the wide layout.
 */
export function TipCard({
  border,
  color,
  title,
  body,
  action,
  onAction,
}: {
  border: string;
  color: string;
  title: ReactNode;
  body: ReactNode;
  action: string;
  onAction: () => void;
}) {
  const fit = useContext(TipFit);
  const [more, setMore] = useState(false);
  const line = fit === "line" && !more;
  return (
    <div
      role="status"
      data-tip
      className="flex w-full items-start gap-2 rounded-lg border bg-ink/95 px-3 py-1.5 shadow-lg"
      style={{ borderColor: `${border}b3` }}
    >
      <p className={`min-w-0 flex-1 text-sm leading-snug text-parchment ${line ? "truncate" : ""}`}>
        <span className="font-display font-semibold" style={{ color }}>
          {title}
        </span>{" "}
        {body}
      </p>
      {fit === "line" ? (
        <button type="button" aria-expanded={more} className="shrink-0 rounded px-1.5 py-0.5 text-sm text-muted underline" onClick={() => setMore((m) => !m)}>
          {more ? "less" : "more"}
        </button>
      ) : null}
      <button type="button" className="shrink-0 rounded px-1.5 py-0.5 text-sm text-muted underline" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

/** Every tip that's showing, for the tip dock. Each one decides for itself whether it shows. */
export function Tips({ api, tutorial }: { api: ReturnType<typeof createWorld>; tutorial: boolean }) {
  const phase = api.world.hud.phase;
  if (phase !== "prep" && phase !== "combat") return null;
  return (
    <>
      {tutorial ? <TutorialHint api={api} /> : null}
      <ChuteTip api={api} />
      <SiegeTip api={api} />
      <ComboTip api={api} />
      <NativesTip api={api} />
    </>
  );
}

export const TUTORIAL_KEY = "melongeddon:tutorial";
const KEY = TUTORIAL_KEY;

/** Hints for a player's first two waves. Reads game state each render; dismiss once and it stays gone. */
export function TutorialHint({ api }: { api: ReturnType<typeof createWorld> }) {
  const [done, setDone] = useState(() => load(KEY) === "done");
  if (done) return null;

  const { hud, towers } = api.world;
  const built = towers.length;
  const finish = () => {
    save(KEY, "done");
    setDone(true);
  };

  let title = "";
  let body = "";
  if (hud.phase === "prep" && hud.wave === 1 && built === 0) {
    title = "Build on the floor";
    body = "Produce walks the carpet. Tap a floor tile beside it to set a melon cannon. Anything that reaches the far end costs a stack.";
  } else if (hud.phase === "prep" && hud.wave === 1) {
    title = "Then start the wave";
    body = "Spend what you like, then press Start wave. You can keep building during the wave, too.";
  } else if (hud.phase === "combat" && hud.wave === 1) {
    title = "Kills pay seeds";
    body = "Tap a cannon to see its stats or sell it. Between waves, the Back room upgrades every cannon of a kind.";
  } else if (hud.phase === "prep" && hud.wave === 2) {
    title = "Mix your cannons";
    body = `Mortars splash crowds, freeze holds, fire burns, the still slows. Keys: ${HOTKEY_HELP}.`;
  } else if (hud.wave >= 2) {
    // Past the basics: retire the hints for good.
    save(KEY, "done");
    return null;
  } else {
    return null;
  }

  return (
    <TipCard
      border="#c6a15a"
      color="#c6a15a"
      title={title}
      body={body}
      action="Hide tips"
      onAction={finish}
    />
  );
}

export const CHUTE_TIP_KEY = "melongeddon:chute-tip";
/** One-time combo tips: the first shatter, thermal shock, fruit with two afflictions, and contagion. */
export const COMBO_TIP_KEYS = {
  shatter: "melongeddon:combo-tip:shatter",
  thermal: "melongeddon:combo-tip:thermal",
  mixed: "melongeddon:combo-tip:mixed",
  contagion: "melongeddon:combo-tip:contagion",
} as const;
const COMBO_TIPS: Record<keyof typeof COMBO_TIP_KEYS, { title: string; body: string }> = {
  shatter: { title: "Frozen fruit shatter.", body: "Hit them with something that explodes: a fruit with two frost takes half again, and its ice flies into its neighbours." },
  thermal: { title: "Ice first, then fire.", body: "Fire on a frosted fruit thaws it with a burst. Freezing a burning fruit puts the fire out instead." },
  mixed: { title: "Damage over time adds up.", body: "Stings, poison and fire all stack on the same fruit. The little shapes under it show what it's carrying, and how many." },
  contagion: { title: "A fruit that dies loaded spreads it.", body: "With three of anything on it, it passes one of each to the fruit around it." },
};

/** One-time tips the first time each combo happens. "Got it" hides it for good. */
export function ComboTip({ api }: { api: ReturnType<typeof createWorld> }) {
  const { hud } = api.world;
  const [done, setDone] = useState<Record<string, boolean>>({});
  if (hud.phase !== "prep" && hud.phase !== "combat") return null;
  const which = (Object.keys(COMBO_TIP_KEYS) as Array<keyof typeof COMBO_TIP_KEYS>).find(
    (k) => hud.comboTips.includes(k) && !done[k] && load(COMBO_TIP_KEYS[k]) !== "done",
  );
  if (!which) return null;
  const tip = COMBO_TIPS[which];
  return (
    <TipCard
      border="#bfe3f5"
      color="#d8eef8"
      title={tip.title}
      body={tip.body}
      action="Got it"
      onAction={() => {
            save(COMBO_TIP_KEYS[which], "done");
            setDone((d) => ({ ...d, [which]: true }));
          }}
    />
  );
}

/** The Siege's one-time tips: the first goose-and-cat fight, and the first paratrooper drop. "Show tips again" clears them. */
export const SIEGE_TIP_KEYS = { feud: "melongeddon:siege-tip:feud", drop: "melongeddon:siege-tip:drop" } as const;

const SIEGE_TIPS: Record<keyof typeof SIEGE_TIP_KEYS, { title: string; body: string }> = {
  feud: {
    title: "Geese and cats hate each other. Let them meet.",
    body: "When a goose and a cat get close they stop and fight for two seconds, and both lose a tenth of their health. Bosses don't stop for it.",
  },
  drop: {
    title: "Paratroopers",
    body: "Cats in parachutes land on the chalk targets halfway along the carpet. The target glows for three seconds first: keep a tower on each one.",
  },
};

/** One-time tips on the Siege: the first fight between a goose and a cat, and the first paratrooper drop. */
export function SiegeTip({ api }: { api: ReturnType<typeof createWorld> }) {
  const { hud } = api.world;
  const [done, setDone] = useState<Record<string, boolean>>({});
  if (hud.night !== "siege" || (hud.phase !== "prep" && hud.phase !== "combat")) return null;
  const which = (["feud", "drop"] as const).find(
    (k) => (k === "feud" ? hud.feuds > 0 : hud.dropSeen) && !done[k] && load(SIEGE_TIP_KEYS[k]) !== "done",
  );
  if (!which) return null;
  const tip = SIEGE_TIPS[which];
  return (
    <TipCard
      border="#f3ce78"
      color="#f6e2ae"
      title={tip.title}
      body={tip.body}
      action="Got it"
      onAction={() => {
            save(SIEGE_TIP_KEYS[which], "done");
            setDone((d) => ({ ...d, [which]: true }));
          }}
    />
  );
}


/** One-time tips for each room's own fruit, by map. "Show tips again" clears them. */
export const NATIVE_TIP_KEYS = {
  sorting: "melongeddon:natives-tip:sorting",
  greenhouse: "melongeddon:natives-tip:greenhouse",
  belltower: "melongeddon:natives-tip:belltower",
} as const;

const NATIVE_TIPS: Record<keyof typeof NATIVE_TIP_KEYS, { title: string; body: string }> = {
  sorting: {
    title: "The Sorting Room has its own fruit",
    body: "Express Corn (red stamp) can't be slowed or stopped on a belt, and the belt carries it at double speed: hit it before or after. A Parcel shrugs off half of every direct shot until splash, fire or a puddle tears the paper; when it pops, three corn walk out.",
  },
  greenhouse: {
    title: "The Greenhouse has its own fruit",
    body: "A Sprout that spends two seconds in the beds grows into a full melon, unless it's burning. A Creeping Squash leaves vines behind it that heal like a bed for a few seconds; fire burns them away.",
  },
  belltower: {
    title: "The Bell Tower has its own fruit",
    body: "Every Chimer (with a little bell) still walking makes the clock strike sooner. A Gargoyle Gourd is stone skin between strikes and runs three times as fast while your towers are silent.",
  },
};

/** One-time tip the first time a room's own fruit come out. "Got it" hides it for good. */
export function NativesTip({ api }: { api: ReturnType<typeof createWorld> }) {
  const { hud } = api.world;
  const room = hud.map in NATIVE_TIP_KEYS ? (hud.map as keyof typeof NATIVE_TIP_KEYS) : null;
  const [done, setDone] = useState<Record<string, boolean>>({});
  if (!room || !hud.nativesSeen.length || (hud.phase !== "prep" && hud.phase !== "combat")) return null;
  if (done[room] || load(NATIVE_TIP_KEYS[room]) === "done") return null;
  const tip = NATIVE_TIPS[room];
  return (
    <TipCard
      border="#8fdc6a"
      color="#cfeebf"
      title={tip.title}
      body={tip.body}
      action="Got it"
      onAction={() => {
            save(NATIVE_TIP_KEYS[room], "done");
            setDone((d) => ({ ...d, [room]: true }));
          }}
    />
  );
}

/**
 * One-time tip on the Overflow: the first time a wave uses the returns chute, explain that fruit
 * come in at the far end and walk the carpet backwards. "Got it" hides it for good.
 */
export function ChuteTip({ api }: { api: ReturnType<typeof createWorld> }) {
  const [done, setDone] = useState(() => load(CHUTE_TIP_KEY) === "done");
  const { hud } = api.world;
  if (done || hud.map !== "overflow" || !hud.chuteWave || (hud.phase !== "prep" && hud.phase !== "combat")) return null;
  return (
    <TipCard
      border="#6fc6ef"
      color="#bfe6f7"
      title={"Returns come up the chute"}
      body={"Shelled melons climb in at the far end (marked CHUTE) and walk the carpet backwards. One that reaches the entrance costs a stack. Cover both ends; a Peeler strips their shells."}
      action="Got it"
      onAction={() => {
            save(CHUTE_TIP_KEY, "done");
            setDone(true);
          }}
    />
  );
}
