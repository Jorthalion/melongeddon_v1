import { useState } from "react";
import { CARD_FRAMES, CARPET_COLOURS, SPEEDS, openCosmetics, writeDev, type CardFrame, type CarpetColour } from "@/game/engine";
import { HOTKEY_HELP } from "@/components/hotkeys";
import { CHUTE_TIP_KEY, NATIVE_TIP_KEYS, SIEGE_TIP_KEYS, TUTORIAL_KEY } from "@/components/TutorialHint";
import { save } from "@/lib/storage";
import { MenuButton, type GameApi } from "@/components/ui";

/** One Settings panel for the Title and the pause menu. */
export function SettingsPanel({
  api,
  muted,
  music,
  onMute,
  onMusic,
  onGesture,
}: {
  api: GameApi;
  muted: boolean;
  music: boolean;
  onMute: () => void;
  onMusic: () => void;
  onGesture: () => void;
}) {
  const [tipsReset, setTipsReset] = useState(false);
  const speed = api.world.hud.speed;
  const reduced = api.world.reduced;
  const label = "mb-1 text-[10px] tracking-[0.22em] text-gold uppercase";
  return (
    <div className="flex flex-col gap-2.5 text-center">
      <MenuButton onClick={onMute}>{muted ? "Sound: off" : "Sound: on"}</MenuButton>
      <MenuButton onClick={onMusic}>{music ? "Music: on" : "Music: off"}</MenuButton>
      <div>
        <p className={label}>Game speed</p>
        <div className="grid grid-cols-4 overflow-hidden rounded-[5px] border border-[#e2c78a]/85" role="radiogroup" aria-label="Game speed">
          {SPEEDS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={speed === v}
              className={`min-h-10 text-sm font-semibold ${speed === v ? "bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] text-[#24160e]" : "bg-[#100c10]/80 text-[#f6efe2]"}`}
              onClick={() => {
                onGesture();
                api.setSpeed(v);
              }}
            >
              {v}×
            </button>
          ))}
        </div>
      </div>
      <MenuButton
        onClick={() => {
          onGesture();
          api.setReduced(!reduced);
        }}
      >
        {reduced ? "Reduce motion: on" : "Reduce motion: off"}
      </MenuButton>
      <Appearance api={api} onGesture={onGesture} label={label} />
      <MenuButton
        onClick={() => {
          onGesture();
          save(TUTORIAL_KEY, "");
          save(CHUTE_TIP_KEY, "");
          for (const key of Object.values(NATIVE_TIP_KEYS)) save(key, "");
          for (const key of Object.values(SIEGE_TIP_KEYS)) save(key, "");

          setTipsReset(true);
        }}
      >
        Show tips again
      </MenuButton>
      {tipsReset ? (
        <p className="text-xs text-gold" role="status">
          Tips will show on your next night.
        </p>
      ) : null}
      <MenuButton
        onClick={() => {
          onGesture();
          writeDev(!api.world.hud.dev);
          window.location.reload();
        }}
      >
        {api.world.hud.dev ? "Developer mode: on" : "Developer mode: off"}
      </MenuButton>
      <p className="-mt-1 text-xs text-muted">
        Unlocks every map, bookmark and perk to try. Your real progress is kept and nothing you do counts toward it. Reloads the game.
      </p>
      <p className="text-xs text-muted">Keys: {HOTKEY_HELP}</p>
    </div>
  );
}

const CARPET_SWATCH: Record<CarpetColour, string> = { crimson: "#8d2a32", blue: "#2f4fa8", green: "#1f7a4a", black: "#26262c" };
const FRAME_NAME: Record<CardFrame, string> = { plain: "Plain", gold: "Gold", ink: "Ink", archivist: "Archivist" };

/** Grand Catalogue cosmetics: only once The Bindery or The Restricted Section is restored. Never changes play. */
function Appearance({ api, onGesture, label }: { api: GameApi; onGesture: () => void; label: string }) {
  const hud = api.world.hud;
  const open = openCosmetics(hud.rooms);
  if (!open.length) return null;
  const frames = CARD_FRAMES.filter((f) => (f === "archivist" ? open.includes("archivist") : f === "plain" || open.includes("frames")));
  const seg = (on: boolean) =>
    `min-h-10 px-1 text-sm font-semibold ${on ? "bg-[linear-gradient(180deg,#f8ecc4_0%,#e6c87a_46%,#b89249_100%)] text-[#24160e]" : "bg-[#100c10]/80 text-[#f6efe2]"}`;
  return (
    <div className="flex flex-col gap-2.5 border-y border-[#e2c78a]/30 py-2.5">
      <p className="text-[10px] tracking-[0.22em] text-gold uppercase">Appearance</p>
      {open.includes("carpets") ? (
        <div>
          <p className={label}>Carpet</p>
          <div className="grid grid-cols-4 overflow-hidden rounded-[5px] border border-[#e2c78a]/85" role="radiogroup" aria-label="Carpet colour">
            {CARPET_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={hud.cosmetics.carpet === c}
                className={seg(hud.cosmetics.carpet === c)}
                onClick={() => {
                  onGesture();
                  api.setCosmetics({ carpet: c });
                }}
              >
                <span className="mr-1 inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: CARPET_SWATCH[c] }} aria-hidden="true" />
                {c === "crimson" ? "Room" : c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {frames.length > 1 ? (
        <div>
          <p className={label}>Keeper-card frame</p>
          <div className={`grid overflow-hidden rounded-[5px] border border-[#e2c78a]/85`} style={{ gridTemplateColumns: `repeat(${frames.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label="Keeper-card frame">
            {frames.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={hud.cosmetics.frame === f}
                className={seg(hud.cosmetics.frame === f)}
                onClick={() => {
                  onGesture();
                  api.setCosmetics({ frame: f });
                }}
              >
                {FRAME_NAME[f]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {open.includes("gilded") ? (
        <MenuButton
          onClick={() => {
            onGesture();
            api.setCosmetics({ gilded: !hud.cosmetics.gilded });
          }}
        >
          {hud.cosmetics.gilded ? "Gilded title: on" : "Gilded title: off"}
        </MenuButton>
      ) : null}
    </div>
  );
}
