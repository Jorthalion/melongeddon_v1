/**
 * The only bridge between the game page and the desktop app: lets the Title screen show
 * Quit, and close the window. Nothing else from Node or Electron reaches the page.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("melongeddonDesktop", {
  quit: () => ipcRenderer.send("melongeddon:quit"),
});
