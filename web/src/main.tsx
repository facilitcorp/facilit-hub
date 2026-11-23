import "./configurar-zod";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

async function iniciar() {
  // Mocks com dados fictícios: só em desenvolvimento e só se pedido (VITE_MOCK=1).
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK === "1") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledFrame: "bypass" });
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void iniciar();
