import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MelonGame } from "@/components/MelonGame";
import { registerServiceWorker, watchInstallPrompt } from "@/lib/install";
import "./styles.css";

watchInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MelonGame />
  </StrictMode>,
);
