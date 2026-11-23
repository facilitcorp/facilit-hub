import type { Projeto, StatusProjeto } from "@/api/tipos";
import { DIAS_PRAZO_PROXIMO, dataDaqui, diasAte, instanteAtras } from "./formato";

export const STATUS_ABERTOS: StatusProjeto[] = [
  "nao_iniciado",
  "em_andamento",
  "bloqueado",
  "pausado",
];

export function projetoAberto(p: Pick<Projeto, "status">) {
  return STATUS_ABERTOS.includes(p.status);
}

export function prazoProximo(p: Pick<Projeto, "status" | "prazoPrevisto">, agora = Date.now()) {
  return (
    projetoAberto(p) && !!p.prazoPrevisto && diasAte(p.prazoPrevisto, agora) <= DIAS_PRAZO_PROXIMO
  );
}

/** Filtros de `listarProjetos` equivalentes a cada número do painel (ver contrato `obterPainel`). */
export function filtrosDoPainel(
  janelaPrazoDias: number,
  janelaConcluidosDias: number,
  agora = Date.now(),
) {
  const qs = (o: Record<string, string | string[]>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) for (const x of [v].flat()) p.append(k, x);
    return `/projetos?${p}`;
  };
  return {
    ativos: qs({ status: "em_andamento" }),
    bloqueados: qs({ status: "bloqueado" }),
    proximosDoPrazo: qs({ status: STATUS_ABERTOS, prazoAte: dataDaqui(janelaPrazoDias, agora) }),
    concluidosRecentes: qs({
      status: "concluido",
      concluidoDesde: instanteAtras(janelaConcluidosDias, agora),
    }),
  };
}
