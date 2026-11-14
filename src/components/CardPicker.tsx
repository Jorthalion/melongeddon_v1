import {
  CANNON_UPGRADES,
  UPGRADE_KIND,
  KEEPER_NAMES,
  UPGRADE_SCOPE,
  isKeeperUpgrade,
  type BookmarkId,
  type Hud,
  type MapId,
  type TowerKind,
  type UpgradeId,
  type World,
} from "@/game/engine";
import { BookOpen, Droplet, Droplets, Flame, FlaskConical, FlaskRound, Lamp, Package, Sparkles, Weight, Zap, type LucideIcon } from "lucide-react";
import { tone } from "@/game/audio";
import { Dialog } from "@/components/Dialog";
import { NewUnlocks } from "@/components/Bookmarks";
import { XpSummary } from "@/components/KeeperLevels";
import { TowerIcon } from "@/components/TowerIcon";
import type { GameApi } from "@/components/ui";

/**
 * The modal card over the board between waves: upgrade pick, the finale warning,
 * and victory or defeat.
 */
export function CardOverlay({
  hudPhase,
  api,
  onGesture,
}: {
  hudPhase: World["hud"]["phase"];
  api: GameApi;
  onGesture: () => void;
}) {
  const hud = api.world.hud;
  return (
    // While the pause menu sits on top, the card underneath is inert: one modal dialog at a time.
    <div className="absolute inset-0 flex items-center justify-center bg-ink/75 p-4" inert={hud.menu != null}>
      <Dialog key={hudPhase} labelledBy="card-title" className="max-h-full w-full max-w-md overflow-auto rounded-xl border border-line bg-panel p-5 outline-none">
        {hudPhase === "upgrade" ? (
          <>
            <h2 id="card-title" className="font-display text-2xl font-semibold">Between the waves</h2>
            <p className="mt-1 text-sm text-muted">
              {hud.night === "midnight" && hud.upgrades.length >= 3
                ? "One more shelf. The fruit after this is not just thicker."
                : hud.night === "overflow" && hud.upgrades.length >= 2
                ? "One more shelf. Then the meter starts spending."
                : hud.upgrades.length >= 2
                  ? "One more shelf. Then the last waves."
                  : hud.branch
                    ? "The last pick opened this shelf. It lasts the rest of the run."
                    : `${KEEPER_NAMES[hud.hero ?? "mynxi"].short} picks first. It lasts the rest of the run.`}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {hud.offer.map((u, i) => {
                const id = u.id as UpgradeId;
                const own = isKeeperUpgrade(hud.hero, id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`relative flex min-h-[4.5rem] items-center gap-3 rounded-xl border bg-panel-2 py-3 pr-9 pl-3 text-left outline-none hover:border-[#c6a15a] focus-visible:border-[#c6a15a] focus-visible:ring-1 focus-visible:ring-[#c6a15a] ${own ? "border-[#c6a15a]" : "border-line"}`}
                    onClick={() => {
                      onGesture();
                      tone(360, 0.09, "triangle", 0.04);
                      api.pickUpgrade(id);
                    }}
                  >
                    <UpgradeMark id={id} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-semibold">{u.name}</span>
                        {own ? (
                          <span className="text-xs font-semibold text-gold">{KEEPER_NAMES[hud.hero ?? "mynxi"].short}'s</span>
                        ) : null}
                        <span className="rounded-full border border-line/70 px-1.5 text-[11px] leading-4 text-muted">{UPGRADE_SCOPE[id]}</span>
                      </span>
                      <span className="mt-1 block text-sm text-muted">{u.blurb}</span>
                    </span>
                    {/* The hotkey: a keycap in the corner, so it doesn't read as a step number. */}
                    <kbd className="absolute top-2 right-2 hidden min-w-[1.25rem] rounded-[4px] border border-b-2 border-line bg-ink/40 px-1 text-center font-sans text-[10px] leading-4 text-muted sm:block">
                      {i + 1}
                    </kbd>
                    {/* Marginalia: the Doctor's own pencilled "sic" on a wrong book. Small, no tooltip, easy to miss. */}
                    {hud.sicCard === id ? (
                      <span className="pointer-events-none absolute bottom-1.5 right-2.5 font-display text-[10px] text-gold/70 italic" aria-hidden="true">
                        sic
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {hudPhase === "consequence" ? (
          <>
            <p className="text-xs tracking-wide text-gold uppercase">The last wave</p>
            <h2 id="card-title" className="mt-1 font-display text-2xl font-semibold">{hud.waveName}</h2>
            <p className="mt-3 text-sm text-muted">{hud.blurb}</p>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl bg-flesh px-4 py-3 font-semibold text-parchment"
              onClick={() => {
                onGesture();
                api.startWave();
              }}
            >
              Face it <span className="ml-1 hidden text-xs font-normal opacity-70 sm:inline">Enter</span>
            </button>
          </>
        ) : null}

        {hudPhase === "victory" ? (
          <EndCard
            title={hud.night === "overflow" ? "The chute holds." : "The stacks hold."}
            body={`${hud.blurb} Absurdity ${hud.absurdity}. ${
              hud.hero === "michael"
                ? "Sir Michael held the carpet. Barely."
                : hud.hero === "vael"
                  ? "Vael files the result. The formula held."
                  : hud.hero === "elf"
                    ? "Case closed. The Legal Elf bills the produce for his time."
                    : hud.hero === "ooze"
                      ? "Quest complete. Memec is still chewing."
                      : hud.hero === "scholar"
                        ? "The Doctor writes it down. History will remember this one."
                        : "Mynxi is filing this under accidents that worked."
            }`}
            action={hud.night === "midnight" ? "Continue to the Overflow" : hud.night === "overflow" ? "Set up Endless" : "Play again"}
            unlocks={hud.newUnlocks}
            maps={hud.newMaps}
            hud={hud}
            onAction={() => {
              onGesture();
              if (hud.night === "midnight") api.continueOverflow();
              else if (hud.night === "overflow") api.tryEndless();
              else api.restartNight();
            }}
            more={[
              ...(hud.night === "endless" ? [] : [{ label: "Play again", run: api.restartNight }]),
              { label: "Change setup", run: api.reset },
              { label: "Title", run: api.toTitle },
            ]}
            onGesture={onGesture}
          />
        ) : null}

        {hudPhase === "defeat" ? (
          <EndCard
            title="The carpet won."
            body={
              hud.night === "endless"
                ? `You held ${hud.wave - 1} wave${hud.wave === 2 ? "" : "s"}. Your endless best is ${hud.endlessBest}. The produce does not send condolences.`
                : `You cleared ${hud.best} wave${hud.best === 1 ? "" : "s"} at best. The produce does not send condolences.`
            }
            action="Try again"
            unlocks={hud.newUnlocks}
            maps={hud.newMaps}
            hud={hud}
            onAction={() => {
              onGesture();
              api.restartNight();
            }}
            more={[
              { label: "Change setup", run: api.reset },
              { label: "Title", run: api.toTitle },
            ]}
            onGesture={onGesture}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function EndCard({
  title,
  body,
  action,
  onAction,
  unlocks = [],
  maps = [],
  more = [],
  hud,
  onGesture,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  unlocks?: BookmarkId[];
  maps?: MapId[];
  /** Secondary buttons under the main one. */
  more?: Array<{ label: string; run: () => void }>;
  /** For the XP earned this run. */
  hud?: Hud;
  onGesture: () => void;
}) {
  return (
    <>
      <h2 id="card-title" role="status" className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
      {hud ? <XpSummary hud={hud} /> : null}
      <NewUnlocks ids={unlocks} maps={maps} />
      <button
        type="button"
        data-autofocus
        className="mt-4 min-h-11 w-full rounded-xl bg-rind px-4 py-3 font-semibold text-ink"
        onClick={onAction}
      >
        {action}
        <span className="ml-2 hidden text-xs font-normal opacity-70 sm:inline">Enter</span>
      </button>
      {more.length ? (
        <div className={`mt-2 grid gap-2 ${more.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {more.map((b) => (
            <button
              key={b.label}
              type="button"
              className="min-h-11 rounded-xl border border-line px-2 py-2 text-sm"
              onClick={() => {
                onGesture();
                b.run();
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** A drawn mark for upgrades that aren't one tower's: same 40px slot as the tower icon. */
const UPGRADE_GLYPH: Partial<Record<UpgradeId, LucideIcon>> = {
  juicy: Droplets,
  rapid: Flame,
  seeds: Package,
  sticky: Droplet,
  electric: Zap,
  fines: BookOpen,
  caliber: Weight,
  lamp: Lamp,
  splatter: Sparkles,
  vial: FlaskRound,
  distill: FlaskConical,
};

/** Every upgrade row's 40px mark: its tower's picture when it belongs to one, otherwise a drawn mark. */
function UpgradeMark({ id }: { id: UpgradeId }) {
  const kind = UPGRADE_KIND[id] ?? (Object.keys(CANNON_UPGRADES) as TowerKind[]).find((k) => CANNON_UPGRADES[k] === id);
  if (kind) return <TowerIcon kind={kind} className="size-10 shrink-0" />;
  const Glyph = UPGRADE_GLYPH[id] ?? Sparkles;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line/70 bg-ink/40 text-gold" aria-hidden="true">
      <Glyph className="size-5" strokeWidth={1.75} />
    </span>
  );
}
