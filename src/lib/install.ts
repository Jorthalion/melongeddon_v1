/**
 * "Install app" support.
 * - Web: Chrome / Edge / Android fire `beforeinstallprompt` when the game can be installed;
 *   we keep the event so the Title screen can offer an Install button.
 * - Desktop (Electron): electron/preload.cjs exposes window.melongeddonDesktop, which lets the
 *   Title screen show Quit.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    melongeddonDesktop?: { quit: () => void };
  }
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

export const isDesktopApp = () => typeof window !== "undefined" && Boolean(window.melongeddonDesktop);

/** Call once at startup, before the browser fires the event. */
export function watchInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    changed();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    changed();
  });
}

export const canInstall = () => deferred != null;

export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function promptInstall() {
  if (!deferred) return;
  const e = deferred;
  deferred = null;
  changed();
  await e.prompt();
}

/** Register the offline cache on real web hosting (not the dev server, not the desktop app). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || isDesktopApp() || !("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* offline play just won't be available */
    });
  });
}
