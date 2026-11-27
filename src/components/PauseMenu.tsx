import { useState } from "react";
import { DEV_SEEDS } from "@/game/engine";
import { Dialog } from "@/components/Dialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { MenuButton, nightAndRoom, type GameApi } from "@/components/ui";

/** Resume / Settings / Restart night / Leave to title. Restart and Leave ask first. */
export function PauseMenu({
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
  const hud = api.world.hud;
  const [confirm, setConfirm] = useState<"restart" | "leave" | null>(null);
  const view = hud.menu === "settings" ? "settings" : confirm ?? "pause";
  const wave = hud.waveCount ? `Wave ${Math.min(hud.wave, hud.waveCount)} of ${hud.waveCount}` : `Wave ${hud.wave}`;

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink/80 p-4 backdrop-blur-[2px]">
      <Dialog
        key={view}
        labelledBy="pause-title"
        className="max-h-full w-full max-w-xs overflow-y-auto rounded-md border border-[#d7b56a]/70 bg-[#100c0e]/95 px-4 py-5 text-center shadow-[inset_0_0_0_1px_rgba(215,181,106,0.22)] outline-none"
      >
        {view === "pause" ? (
          <>
            <p id="pause-title" className="font-display text-2xl font-semibold text-[#f6e7b4]">Paused</p>
            <p className="mt-1 text-sm text-muted">
              {nightAndRoom(hud)} · {wave}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <MenuButton gold onClick={() => { onGesture(); api.closeMenu(); }}>
                Resume
              </MenuButton>
              <MenuButton onClick={() => { onGesture(); api.menuSettings(true); }}>Settings</MenuButton>
              {hud.dev && (hud.phase === "prep" || hud.phase === "combat") ? (
                <MenuButton onClick={() => { onGesture(); api.devSeeds(); }}>Dev: +{DEV_SEEDS} seeds</MenuButton>
              ) : null}
              <MenuButton onClick={() => { onGesture(); setConfirm("restart"); }}>Restart night</MenuButton>
              <MenuButton onClick={() => { onGesture(); setConfirm("leave"); }}>Leave to title</MenuButton>
            </div>
          </>
        ) : null}

        {view === "restart" || view === "leave" ? (
          <>
            <p id="pause-title" className="font-display text-2xl font-semibold text-[#f6e7b4]">
              {view === "restart" ? "Restart from wave 1?" : "Leave to the title?"}
            </p>
            <p className="mt-2 text-sm text-[#f4ead8]">This run's progress is lost. Your setup is kept.</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <MenuButton onClick={() => { onGesture(); setConfirm(null); }}>
                Keep playing
              </MenuButton>
              <MenuButton
                gold
                onClick={() => {
                  onGesture();
                  if (view === "restart") api.restartNight();
                  else api.toTitle();
                }}
              >
                {view === "restart" ? "Restart night" : "Leave to title"}
              </MenuButton>
            </div>
          </>
        ) : null}

        {view === "settings" ? (
          <>
            <p id="pause-title" className="font-display text-2xl font-semibold text-[#f6e7b4]">Settings</p>
            <div className="mt-3">
              <SettingsPanel api={api} muted={muted} music={music} onMute={onMute} onMusic={onMusic} onGesture={onGesture} />
            </div>
            {/* Pinned to the bottom of the scrolling panel, so the way out is in view on a short screen. */}
            <div className="sticky -bottom-5 -mx-4 mt-4 -mb-5 border-t border-[#d7b56a]/25 bg-[#100c0e] px-4 pt-3 pb-5">
              <MenuButton onClick={() => { onGesture(); api.menuSettings(false); }}>Back</MenuButton>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
