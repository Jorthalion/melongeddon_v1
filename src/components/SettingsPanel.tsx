import { useState } from "react";
import { SPEEDS, writeDev } from "@/game/engine";
import { HOTKEY_HELP } from "@/components/hotkeys";
import { CHUTE_TIP_KEY, TUTORIAL_KEY } from "@/components/TutorialHint";
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
      <MenuButton
        onClick={() => {
          onGesture();
          save(TUTORIAL_KEY, "");
          save(CHUTE_TIP_KEY, "");
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
