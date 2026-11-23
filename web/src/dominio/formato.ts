const DIA = 86_400_000;

export function dataCurta(iso?: string | null) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function haQuanto(iso: string, agora = Date.now()) {
  const dias = Math.floor((agora - new Date(iso).getTime()) / DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

/** Dias até o prazo (negativo = atrasado). */
export function diasAte(data: string, agora = Date.now()) {
  return Math.ceil((new Date(`${data}T23:59:59`).getTime() - agora) / DIA);
}

export const DIAS_NOTA_VELHA = 7;

export function notaVelha(iso: string | null | undefined, agora = Date.now()) {
  return !iso || agora - new Date(iso).getTime() > DIAS_NOTA_VELHA * DIA;
}

export function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * Só deixa passar http(s) ou caminho da própria API (logo/capa vêm como `/api/...`, D-013);
 * barra javascript:, data: e `//host` vindos de dado salvo.
 */
export function urlSegura(u?: string | null) {
  return u && /^(https?:\/\/|blob:|\/api\/)/i.test(u) ? u : undefined;
}

/** +5511999990000 → +55 11 99999-0000 (outros países ficam como vieram). */
export function telefone(e164: string) {
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  return m ? `+55 ${m[1]} ${m[2]}-${m[3]}` : e164;
}

/** Data local (AAAA-MM-DD) daqui a `dias` dias. */
export function dataDaqui(dias: number, agora = Date.now()) {
  const d = new Date(agora + dias * DIA);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function instanteAtras(dias: number, agora = Date.now()) {
  return new Date(agora - dias * DIA).toISOString();
}
