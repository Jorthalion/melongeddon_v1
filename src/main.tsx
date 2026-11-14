import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MelonGame } from "@/components/MelonGame";
import { registerServiceWorker, watchInstallPrompt } from "@/lib/install";
import { migrateSaves } from "@/lib/saves";
import "./styles.css";

// Bring old saves up to date before anything reads them.
migrateSaves();
watchInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MelonGame />
  </StrictMode>,
);
