import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/** Rotas que o back ainda não entrega; com VITE_MOCK=parcial só elas ficam no mock. */
const PENDENTES_NO_BACK = ["/projetos", "/documentos", "/painel"];

export function criarWorker(modo: string) {
  const escolhidos =
    modo === "parcial"
      ? handlers.filter((h) => PENDENTES_NO_BACK.some((p) => String(h.info.header).includes(p)))
      : handlers;
  return setupWorker(...escolhidos);
}
