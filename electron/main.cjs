/**
 * Melongeddon desktop app (Electron).
 *
 *   npm run app         build the game and open it in a desktop window
 *   npm run installer   build dist/ and the Windows installer into release/installer/
 *
 * It loads the same build as the web version (dist/index.html). Saves live in the app's own
 * storage, separate from any browser.
 */
const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const path = require("node:path");

// One window: opening the app again focuses the existing one.
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

/**
 * Smoke test (CI and local checks): MELONGEDDON_SMOKE=1 loads the game without showing a window,
 * prints what the page sees as one JSON line, and exits 0 if the Title screen rendered.
 */
const SMOKE = process.env.MELONGEDDON_SMOKE === "1";

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: "#140e12",
    title: "Melongeddon",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  Menu.setApplicationMenu(null);
  if (!SMOKE) win.once("ready-to-show", () => win.show());
  if (SMOKE) {
    win.webContents.once("did-finish-load", async () => {
      await new Promise((r) => setTimeout(r, 2500));
      const seen = await win.webContents.executeJavaScript(`({
        title: document.title,
        desktop: Boolean(window.melongeddonDesktop),
        buttons: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter(Boolean),
        fonts: [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family))],
      })`);
      const ok = seen.title === "Melongeddon" && seen.buttons.includes("New night") && seen.buttons.includes("Quit");
      process.stdout.write(`MELONGEDDON_SMOKE ${JSON.stringify({ ok, ...seen })}\n`);
      app.exit(ok ? 0 : 1);
    });
    win.webContents.once("did-fail-load", (_e, code, desc) => {
      process.stdout.write(`MELONGEDDON_SMOKE ${JSON.stringify({ ok: false, code, desc })}\n`);
      app.exit(1);
    });
  }
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  // Links leave the app and open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  // The game asks before leaving a night in progress (a beforeunload prompt). A browser shows
  // its own dialog for that; Electron does not, so ask here, or the window would refuse to close.
  win.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: "question",
      buttons: ["Leave", "Keep playing"],
      defaultId: 1,
      cancelId: 1,
      title: "Leave the night?",
      message: "Leave the night?",
      detail: "This run's progress is lost. Your unlocks and setup are kept.",
    });
    if (choice === 0) event.preventDefault(); // allow the close
  });

  // F11 toggles fullscreen; Ctrl+R reloads (handy after an update), F12 opens dev tools.
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === "F12") {
      win.webContents.toggleDevTools();
      event.preventDefault();
    } else if (input.control && input.key.toLowerCase() === "r") {
      win.webContents.reload();
      event.preventDefault();
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.on("melongeddon:quit", () => {
  if (win) win.close(); // goes through the "Leave the night?" check
  else app.quit();
});

app.on("second-instance", () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
