import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MelonGame } from "@/components/MelonGame";
import { registerServiceWorker, watchInstallPrompt } from "@/lib/install";
import { migrateSaves } from "@/lib/saves";
import { applyUiSize, readUiSize } from "@/lib/layout";
import { watchInput } from "@/lib/inputMode";
import "./styles.css";

// Bring old saves up to date before anything reads them.
migrateSaves();
// Settings -> Interface size.
applyUiSize(readUiSize(typeof localStorage === "undefined" ? null : localStorage));
// Clicked board buttons don't keep keyboard focus; dialogs closed by a click don't hand it back.
watchInput();
watchInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MelonGame />
  </StrictMode>,
);
