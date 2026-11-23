// Cliente HTTP mínimo. Quando os tipos gerados existirem, troca-se por openapi-fetch
// sem mexer nos hooks (eles só dependem de `pedir`).

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly corpo?: unknown,
  ) {
    super(message);
  }
  get conflito() {
    return this.status === 409;
  }
  get naoAutenticado() {
    return this.status === 401;
  }
}

type Consulta = Record<string, string | number | undefined>;

export async function pedir<T>(
  metodo: "GET" | "POST" | "PATCH" | "DELETE",
  caminho: string,
  opcoes: { corpo?: unknown; consulta?: Consulta } = {},
): Promise<T> {
  const url = new URL(`/api${caminho}`, window.location.origin);
  for (const [k, v] of Object.entries(opcoes.consulta ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url, {
    method: metodo,
    credentials: "include",
    headers: opcoes.corpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  });
  if (resp.status === 204) return undefined as T;
  const corpo: unknown = await resp.json().catch(() => undefined);
  if (!resp.ok) {
    const msg =
      (corpo as { mensagem?: string; title?: string } | undefined)?.mensagem ??
      (corpo as { title?: string } | undefined)?.title ??
      `Erro ${resp.status}`;
    throw new ErroApi(resp.status, msg, corpo);
  }
  return corpo as T;
}
