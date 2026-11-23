import type { Projeto } from "@/api/tipos";
import { DIAS_CONCLUIDO_RECENTE, DIAS_PRAZO_PROXIMO, diasAte } from "./formato";

const ABERTOS = new Set(["nao_iniciado", "em_andamento", "bloqueado", "pausado"]);

export function projetoAberto(p: Projeto) {
  return ABERTOS.has(p.status);
}

export function prazoProximo(p: Projeto, agora = Date.now()) {
  return (
    projetoAberto(p) && !!p.prazoPrevisto && diasAte(p.prazoPrevisto, agora) <= DIAS_PRAZO_PROXIMO
  );
}

export function resumoDoGrupo(projetos: Projeto[], agora = Date.now()) {
  const limiteConcluido = agora - DIAS_CONCLUIDO_RECENTE * 86_400_000;
  return {
    ativos: projetos.filter((p) => p.status === "em_andamento").length,
    bloqueados: projetos.filter((p) => p.status === "bloqueado").length,
    proximosDoPrazo: projetos.filter((p) => prazoProximo(p, agora)).length,
    concluidosRecentes: projetos.filter(
      (p) =>
        p.status === "concluido" &&
        new Date(p.concluidoEm ?? p.atualizadoEm).getTime() >= limiteConcluido,
    ).length,
  };
}
