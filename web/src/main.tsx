import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

async function iniciar() {
  // Mocks com dados fictícios, só em desenvolvimento: VITE_MOCK=1 (tudo) ou
  // VITE_MOCK=parcial (só o que o back ainda não entrega; o resto vai para a API).
  const modo = import.meta.env.VITE_MOCK;
  if (import.meta.env.DEV && (modo === "1" || modo === "parcial")) {
    const { criarWorker } = await import("./mocks/browser");
    await criarWorker(modo).start({ onUnhandledFrame: "bypass" });
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void iniciar();
