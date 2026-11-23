import createClient from "openapi-fetch";
import type { paths } from "./gerado/esquema";
import type { Problema } from "./tipos";

/** Front e API no mesmo domínio (contrato): `/api` relativo, cookie de sessão. */
export const api = createClient<paths>({
  baseUrl: `${typeof window === "undefined" ? "http://localhost" : window.location.origin}/api`,
  credentials: "include",
  // resolve o fetch na hora da chamada (permite interceptação nos testes)
  fetch: (pedido) => globalThis.fetch(pedido),
});

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly problema?: Partial<Problema>,
  ) {
    super(problema?.detail ?? problema?.title ?? `Erro ${status}`);
  }
  get conflito() {
    return this.status === 409;
  }
  get naoAutenticado() {
    return this.status === 401;
  }
  /** Erros por campo (validação). */
  get campos() {
    return this.problema?.campos ?? [];
  }
}

/** Devolve `data` ou lança ErroApi com o problem+json. */
export async function dados<T>(
  pedido: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await pedido;
  if (!response.ok) throw new ErroApi(response.status, error as Partial<Problema> | undefined);
  return data as T;
}

/** Limite máximo de página do contrato; listas do MVP cabem numa página. */
export const LIMITE = 100;
